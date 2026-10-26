import test from 'node:test';
import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { createAssetPreloader, loadDecodedImage } from '../src/asset-preloader.js';
import { SCENE_ASSETS, ABILITY_ART, assetGroupForScene } from '../src/scene-assets.js';

const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const tick = () => new Promise(resolve => setImmediate(resolve));

test('an image and its group remain unready until decoding finishes', async () => {
  const decoded = deferred();
  const image = { naturalWidth: 128, decode: () => decoded.promise };
  const loader = createAssetPreloader({ load: src => loadDecodedImage(src, { createImage: () => image }) });
  let finished = false;
  const preparation = loader.prepare(['hero.png']).then(() => { finished = true; });
  await tick();
  assert.equal(image.src, 'hero.png');
  const onload = image.onload();
  await tick();
  assert.equal(loader.ready(['hero.png']), false);
  assert.equal(finished, false);
  decoded.resolve();
  await onload;
  await preparation;
  assert.equal(loader.ready(['hero.png']), true);
  assert.equal(finished, true);
  assert.equal(image.onload, null);
  assert.equal(image.onerror, null);
});

test('decode failures and empty images reject instead of revealing an incomplete scene', async () => {
  const broken = { naturalWidth: 128, decode: async () => { throw new Error('decode failed'); } };
  const brokenLoad = loadDecodedImage('broken.png', { createImage: () => broken });
  const brokenCheck = assert.rejects(brokenLoad, /decode failed/);
  await broken.onload();
  await brokenCheck;

  const empty = { naturalWidth: 0, decode: async () => {} };
  const emptyLoad = loadDecodedImage('empty.png', { createImage: () => empty });
  const emptyCheck = assert.rejects(emptyLoad, /Empty image/);
  await empty.onload();
  await emptyCheck;
});

test('overlapping groups share requests and stay within the concurrency limit', async () => {
  const pending = new Map(), calls = [];
  let active = 0, peak = 0;
  const loader = createAssetPreloader({ concurrency: 2, load: async url => {
    calls.push(url); active++; peak = Math.max(peak, active);
    const job = deferred(); pending.set(url, job);
    try { return await job.promise; } finally { active--; }
  } });
  const progress = [];
  const first = loader.prepare(['hero', 'hero', 'enemy', 'background'], { onProgress: (...counts) => progress.push(counts) });
  const second = loader.prepare(['enemy', 'portrait']);
  await tick();
  assert.deepEqual(calls, ['hero', 'enemy']);
  pending.get('hero').resolve({}); await tick();
  assert.deepEqual(calls, ['hero', 'enemy', 'background']);
  pending.get('enemy').resolve({}); await tick();
  assert.deepEqual(calls, ['hero', 'enemy', 'background', 'portrait']);
  pending.get('background').resolve({}); pending.get('portrait').resolve({});
  await Promise.all([first, second]);
  assert.equal(peak, 2);
  assert.deepEqual(progress, [[0, 3], [1, 3], [2, 3], [3, 3]]);
  assert.equal(loader.ready(['hero', 'enemy', 'background', 'portrait']), true);
});

test('a rejected request is evicted and retry reuses already successful images', async () => {
  const calls = new Map();
  const loader = createAssetPreloader({ load: async url => {
    const attempt = (calls.get(url) || 0) + 1; calls.set(url, attempt);
    if (url === 'enemy' && attempt === 1) throw new Error('offline');
    return { url };
  } });
  await assert.rejects(loader.prepare(['hero', 'enemy']), /offline/);
  assert.equal(loader.ready(['hero']), true);
  assert.equal(loader.ready(['enemy']), false);
  await loader.prepare(['hero', 'enemy']);
  assert.equal(calls.get('hero'), 1);
  assert.equal(calls.get('enemy'), 2);
  assert.equal(loader.ready(['hero', 'enemy']), true);
});

test('an already aborted group neither queues work nor reports progress', async () => {
  const controller = new AbortController(); controller.abort();
  let loads = 0, reports = 0;
  const loader = createAssetPreloader({ load: async () => { loads++; return {}; } });
  await assert.rejects(loader.prepare(['hero'], { signal: controller.signal, onProgress: () => { reports++; } }), { name: 'AbortError' });
  assert.equal(loads, 0);
  assert.equal(reports, 0);
});

test('cancelling a group suppresses late progress while a new group reuses its in-flight request', async () => {
  const job = deferred(), controller = new AbortController();
  let loads = 0;
  const loader = createAssetPreloader({ load: () => { loads++; return job.promise; } });
  const staleProgress = [], currentProgress = [];
  const stale = loader.prepare(['shared'], { signal: controller.signal, onProgress: (...counts) => staleProgress.push(counts) });
  const rejected = assert.rejects(stale, { name: 'AbortError' });
  await tick(); controller.abort();
  const current = loader.prepare(['shared'], { onProgress: (...counts) => currentProgress.push(counts) });
  job.resolve({});
  await Promise.all([current, rejected]);
  assert.equal(loads, 1);
  assert.deepEqual(staleProgress, [[0, 1]]);
  assert.deepEqual(currentProgress, [[0, 1], [1, 1]]);
  assert.equal(loader.ready(['shared']), true);
});

test('retaining the current group releases decoded images belonging to previous locations', async () => {
  const calls = [];
  const loader = createAssetPreloader({ load: async url => { calls.push(url); return { url }; } });
  await loader.prepare(['forest', 'river', 'hero']);
  loader.retain(['river', 'hero']);
  assert.equal(loader.ready(['forest']), false);
  assert.equal(loader.ready(['river', 'hero']), true);
  await loader.prepare(['forest', 'hero']);
  assert.deepEqual(calls, ['forest', 'river', 'hero', 'forest']);
});

test('every declared scene asset exists and each battle location prepares all ability cut-ins', async () => {
  const all = new Set(Object.values(SCENE_ASSETS).flat());
  await Promise.all([...all].map(file => access(new URL(`../public/assets/${file}`, import.meta.url))));
  for (const group of ['clearing', 'river', 'mountain']) {
    for (const ability of Object.values(ABILITY_ART)) assert.ok(SCENE_ASSETS[group].includes(ability), `${group} needs ${ability}`);
  }
  assert.equal(assetGroupForScene('lucky-gift', 'river'), 'river', 'the post-Blud farewell already displays the next location');
  assert.equal(assetGroupForScene('ending', 'lucky-finale'), 'mountain');
  assert.equal(assetGroupForScene('credits', 'sunrise'), 'credits');
});

test('late assets from a cancelled location are released after the current location is retained', async () => {
  const old = deferred();
  const loader = createAssetPreloader({load: url => url === 'old' ? old.promise : Promise.resolve({url})});
  const controller = new AbortController();
  const stale = loader.prepare(['old'], {signal:controller.signal});
  const rejected = assert.rejects(stale, {name:'AbortError'});
  controller.abort();
  await loader.prepare(['current']);
  loader.retain(['current']);
  old.resolve({});
  await rejected;
  assert.equal(loader.ready(['old']), false);
  assert.equal(loader.ready(['current']), true);
});
