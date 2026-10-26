const abortError = () => new DOMException('Loading cancelled', 'AbortError');

/** Keep a decoded Image alive, including CSS backgrounds and sprite atlases. */
export function loadDecodedImage(src, { createImage = () => new Image(), timeout = 30000 } = {}) {
  return new Promise((resolve, reject) => {
    const image = createImage();
    let settled = false;
    const finish = (error) => {
      if (settled) return;
      settled = true; clearTimeout(timer); image.onload = null; image.onerror = null;
      if (error) reject(error); else resolve(image);
    };
    const timer = setTimeout(() => finish(new Error(`Image timed out: ${src}`)), timeout);
    image.decoding = 'async';
    image.onload = async () => {
      try {
        if (image.decode) await image.decode();
        if (!image.naturalWidth) throw new Error(`Empty image: ${src}`);
        finish();
      } catch (error) { finish(error); }
    };
    image.onerror = () => finish(new Error(`Image could not load: ${src}`));
    image.src = src;
  });
}

/** A shared bounded queue, so rapid chapter switches cannot flood the connection. */
export function createAssetPreloader({ load = loadDecodedImage, concurrency = 4 } = {}) {
  const cache = new Map(), queue = [];
  let active = 0;
  function pump() {
    while (active < concurrency && queue.length) {
      const job = queue.shift(); active++;
      Promise.resolve().then(() => load(job.url)).then(value => {
        job.entry.ready = true; job.entry.value = value;
        if (job.entry.discard && cache.get(job.url) === job.entry) cache.delete(job.url);
        job.resolve(value);
      }, error => {
        if (cache.get(job.url) === job.entry) cache.delete(job.url);
        job.reject(error);
      }).finally(() => { active--; pump(); });
    }
  }
  function image(url) {
    if (cache.has(url)) {
      const entry = cache.get(url); entry.discard = false;
      return entry.promise;
    }
    const entry = { ready: false };
    entry.promise = new Promise((resolve, reject) => queue.push({ url, entry, resolve, reject }));
    cache.set(url, entry); pump();
    return entry.promise;
  }
  return {
    image,
    ready(urls) { return urls.every(url => cache.get(url)?.ready); },
    async prepare(urls, { signal, onProgress = () => {} } = {}) {
      const unique = [...new Set(urls)];
      let complete = 0;
      if (signal?.aborted) throw abortError();
      onProgress(0, unique.length);
      await Promise.all(unique.map(async url => {
        await image(url);
        if (signal?.aborted) throw abortError();
        onProgress(++complete, unique.length);
      }));
    },
    // Keep only the active location's decoded artwork; map atlases have their own
    // small lifetime cache. The HTTP cache can still serve a revisited location.
    retain(urls) {
      const keep = new Set(urls);
      for (const [url, entry] of cache) {
        entry.discard = !keep.has(url);
        if (entry.ready && entry.discard) cache.delete(url);
      }
    },
  };
}
