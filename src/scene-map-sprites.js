import { createHeroIdle, advanceHeroIdle, animationFrameAt } from './domain/idle-behavior.js';
import { loadDecodedImage } from './asset-preloader.js';

const root = `${import.meta.env.BASE_URL}assets/`;
let assetsPromise;
const loadImage = loadDecodedImage;
async function loadConfig(file) {
  const response = await fetch(root + file, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`Sprite configuration could not load: ${file}`);
  return response.json();
}
function assets() {
  return assetsPromise ||= Promise.all([
    loadConfig('map-sprites/manifest.json'),
    loadConfig('map-sprites/idle-candidates-v1.json'),
    loadConfig('map-sprites/character-states-v1.json'),
  ]).then(async ([manifest, idle, states]) => {
    const walk = manifest.actors.find(a => a.id === 'hero');
    const configs = { heroWalk: { ...walk, file: `map-sprites/${walk.file}`, frameRate: 4.9 },
      heroWalkNE: { ...states.entries.heroWalkNE, frameRate: 4.9 }, ...idle.entries };
    const entries = await Promise.all(Object.entries(configs).filter(([id]) => id.startsWith('hero')).map(async ([id, config]) => [id, { ...config, image: await loadImage(root + config.file) }]));
    return Object.fromEntries(entries);
  }).catch(error => { assetsPromise = undefined; throw error; });
}

export const preloadMapSprites = () => assets();

export const mapHeroMarkup = () => '<canvas class="map-hero-pixel" width="112" height="120" role="img" aria-label="Герой / Hero"></canvas>';

/** Reuses the approved game atlas, foot anchors and 5-second idle behavior. */
export function mountMapSprites(host) {
  let cancelled = false, raf = 0;
  const canvases = [...host.querySelectorAll('.map-hero-pixel')];
  if (!canvases.length) return () => {};
  assets().then(configs => {
    if (cancelled) return;
    const actors = canvases.map(canvas => ({ canvas, state: createHeroIdle(), walkMs: 0 }));
    let previous = performance.now();
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    function draw(now) {
      if (cancelled) return;
      const delta = Math.min(100, now - previous); previous = now;
      for (const actor of actors) {
        const moving = actor.canvas.closest('.map-actor').classList.contains('preview-moving');
        actor.state = advanceHeroIdle(actor.state, delta, { moving });
        if (moving) actor.walkMs += delta; else actor.walkMs = 0;
        const direction = actor.canvas.closest('.map-actor').dataset.facing || 'SE';
        const config = configs[moving ? (direction === 'NE' ? 'heroWalkNE' : 'heroWalk') : actor.state.variant];
        const frames = config.animations[direction] || config.animations.SE || config.animations.idle;
        const frame = animationFrameAt(frames, config, reduced ? 0 : moving ? actor.walkMs : actor.state.animationMs);
        const rect = config.frameRects[frame], origin = config.frameOrigins?.[frame] || [.5, .98];
        const quiet = ['heroQuiet', 'heroTap'].includes(actor.state.variant) && !moving;
        const reference = config.referenceFrameHeight || Math.ceil(config.image.height / config.rows);
        let scale = config.displayHeight / reference * (config.frameScaleMultipliers?.[frame] || 1);
        if (quiet) scale = 85.52950558213716 / rect.height;
        // Draw the original atlas directly at the displayed resolution. The old
        // 112px intermediate surface discarded details before CSS enlarged it.
        const bounds = actor.canvas.getBoundingClientRect();
        const density = Math.min(window.devicePixelRatio || 1, 3);
        const width = Math.max(112, Math.round(bounds.width * density));
        const height = Math.max(120, Math.round(bounds.height * density));
        if (actor.canvas.width !== width || actor.canvas.height !== height) {
          actor.canvas.width = width; actor.canvas.height = height;
        }
        const context = actor.canvas.getContext('2d');
        context.setTransform(1, 0, 0, 1, 0, 0); context.clearRect(0, 0, width, height);
        context.imageSmoothingEnabled = true; context.imageSmoothingQuality = 'high';
        const fit = Math.min(width / 112, height / 120);
        context.setTransform(fit, 0, 0, fit, (width - 112 * fit) / 2, (height - 120 * fit) / 2);
        context.save();
        const flip = quiet && ['SW', 'NW'].includes(direction);
        context.translate(56, 111); if (flip) context.scale(-1, 1);
        context.drawImage(config.image, rect.x, rect.y, rect.width, rect.height, -rect.width * origin[0] * scale, -rect.height * origin[1] * scale, rect.width * scale, rect.height * scale);
        context.restore(); actor.canvas.dataset.animation = moving ? 'walk' : actor.state.variant;
      }
      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);
  }).catch(error => { if (!cancelled) console.error('Map sprite could not load', error); });
  return () => { cancelled = true; cancelAnimationFrame(raf); };
}
