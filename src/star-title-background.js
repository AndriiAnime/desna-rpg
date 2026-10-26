import './star-title-background.css';

const asset = file => `${import.meta.env.BASE_URL}assets/title/${file}`;
const sources = Object.fromEntries(['landscape', 'portrait'].map(format => [format, {
  poster: asset(`shooting-star-${format}-poster-v1.webp`),
  movie: asset(`shooting-star-${format}-v1.mp4`),
}]));

// A poster is always behind the movie. It stays visible until the decoder has
// presented a frame, including on slow connections and after an aspect change.
export function mountStarTitleBackground(host, { visibilityHost = host.parentElement, presentationHost = visibilityHost } = {}) {
  const controller = new AbortController();
  const { signal } = controller;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const poster = document.createElement('img');
  const video = document.createElement('video');
  poster.className = 'star-title-background__poster';
  poster.alt = '';
  poster.decoding = 'async';
  poster.fetchPriority = 'high';
  video.className = 'star-title-background__video';
  video.muted = true;
  video.defaultMuted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.setAttribute('muted', '');
  video.setAttribute('playsinline', '');
  video.setAttribute('aria-hidden', 'true');
  video.tabIndex = -1;
  host.classList.add('star-title-background');
  host.setAttribute('aria-hidden', 'true');
  presentationHost?.classList.add('star-title-screen');
  host.replaceChildren(poster, video);

  let disposed = false, currentFormat, frameCallback, changeId = 0, intersecting = true;
  const canPlay = () => !disposed && !reducedMotion.matches && !document.hidden && !visibilityHost?.hidden && host.isConnected && intersecting;
  function cancelFrame() {
    if (frameCallback != null) video.cancelVideoFrameCallback?.(frameCallback);
    frameCallback = undefined;
  }
  function showPoster() {
    cancelFrame();
    host.classList.remove('is-playing');
  }
  function revealFrame() {
    if (!canPlay() || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
    cancelFrame();
    if (video.requestVideoFrameCallback) {
      frameCallback = video.requestVideoFrameCallback(() => {
        frameCallback = undefined;
        if (canPlay()) host.classList.add('is-playing');
      });
    } else {
      host.classList.add('is-playing');
    }
  }
  async function play() {
    if (!canPlay() || !video.getAttribute('src')) { video.pause(); return; }
    try {
      await video.play();
      if (canPlay()) revealFrame();
      else video.pause();
    } catch {
      // Mobile autoplay restrictions leave the illustrated menu fully usable.
      if (!disposed) showPoster();
    }
  }
  function syncVisibility() {
    if (canPlay()) void play();
    else video.pause();
  }
  function startMovie() {
    if (!currentFormat || reducedMotion.matches || disposed) return;
    const url = sources[currentFormat].movie;
    if (video.getAttribute('src') !== url) {
      showPoster();
      video.src = url;
      video.poster = sources[currentFormat].poster;
      video.load();
    }
    void play();
  }
  async function chooseFormat() {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height || disposed) return;
    const format = width / height < .85 ? 'portrait' : 'landscape';
    if (format === currentFormat) return;
    currentFormat = format;
    host.dataset.format = format;
    const id = ++changeId;
    video.pause();
    showPoster();
    const next = new Image();
    next.src = sources[format].poster;
    // The CSS fallback covers first paint while this image is decoding.
    if (!poster.getAttribute('src')) poster.src = next.src;
    try { await next.decode(); } catch { /* CSS poster remains behind the image. */ }
    if (disposed || id !== changeId) return;
    poster.src = next.src;
    startMovie();
  }
  video.addEventListener('loadeddata', () => void play(), { signal });
  video.addEventListener('playing', revealFrame, { signal });
  video.addEventListener('error', () => { video.pause(); showPoster(); }, { signal });
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) { video.pause(); showPoster(); }
    else startMovie();
  }, { signal });
  document.addEventListener('visibilitychange', syncVisibility, { signal });
  host.addEventListener('pointerdown', () => void play(), { signal });
  // A gesture on the menu can also unlock muted playback on stricter browsers.
  presentationHost?.addEventListener('pointerdown', () => void play(), { signal });
  const resize = new ResizeObserver(() => void chooseFormat());
  resize.observe(host);
  const visibility = new MutationObserver(syncVisibility);
  if (visibilityHost) visibility.observe(visibilityHost, { attributes: true, attributeFilter: ['hidden'] });
  const intersection = new IntersectionObserver(([entry]) => {
    intersecting = entry.isIntersecting;
    syncVisibility();
  });
  intersection.observe(host);
  void chooseFormat();

  return {
    destroy() {
      disposed = true;
      ++changeId;
      controller.abort();
      cancelFrame();
      resize.disconnect();
      visibility.disconnect();
      intersection.disconnect();
      video.pause();
      video.removeAttribute('src');
      video.load();
      host.replaceChildren();
      host.classList.remove('star-title-background', 'is-playing');
      presentationHost?.classList.remove('star-title-screen');
    },
  };
}
