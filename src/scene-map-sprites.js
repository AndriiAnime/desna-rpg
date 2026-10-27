import { createHeroIdle, advanceHeroIdle, createLuckyIdle, advanceLuckyIdle, animationDuration, animationFrameAt } from './domain/idle-behavior.js';
import { CLEARING } from './content/clearing.js';
import { spriteLayout } from './domain/sprite-layout.js';
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
      heroWalkNE: { ...states.entries.heroWalkNE, frameRate: 4.9 }, ...idle.entries,
      blud: {...manifest.actors.find(a=>a.id==='blud'),file:'map-sprites/blud-idle-v1.png'},bludCalm:states.entries.bludCalm };
    const wanted = id => id.startsWith('hero') || ['blud','bludCalm','luckyPerched','luckyCurious'].includes(id);
    const entries = await Promise.all(Object.entries(configs).filter(([id]) => wanted(id)).map(async ([id, config]) => {const image=await loadImage(root+config.file);return [id,{...config,...spriteLayout(config,image.width,image.height),image}];}));
    return Object.fromEntries(entries);
  }).catch(error => { assetsPromise = undefined; throw error; });
}

export const preloadMapSprites = () => assets();

export const mapHeroMarkup = () => '<canvas class="map-hero-pixel" width="112" height="120" role="img" aria-label="Герой / Hero"></canvas>';

/** Reuses the approved game atlas, foot anchors and 5-second idle behavior. */
export function mountMapSprites(host, {rockHintSeen=false} = {}) {
  let cancelled = false, raf = 0;
  host.dataset.rockHintSeen=String(rockHintSeen);
  const bludHost=host.querySelector('.blud-map');
  let bludCanvas, luckyCanvas, luckyHost;
  if(bludHost){
    bludCanvas=document.createElement('canvas');bludCanvas.className='map-blud-pixel';bludCanvas.setAttribute('role','img');bludCanvas.setAttribute('aria-label','Блуд / Blud');
    bludCanvas.style.cssText='display:block;width:100%;height:100%;pointer-events:none';bludHost.replaceChildren(bludCanvas);
  }
  const clearingArt=host.querySelector('.scene-visual--map-clearing .scene-art');
  if(clearingArt){
    luckyHost=document.createElement('div');luckyHost.className='map-actor lucky-rock-map';
    luckyHost.style.cssText=`position:absolute;left:${(CLEARING.rock.x-3)/CLEARING.width*100}%;top:${(CLEARING.rock.y-54)/CLEARING.height*100}%;width:10%;height:15%;pointer-events:none;z-index:4`;
    luckyCanvas=document.createElement('canvas');luckyCanvas.className='map-lucky-pixel';luckyCanvas.setAttribute('role','img');luckyCanvas.setAttribute('aria-label','Лакі на камені / Lucky on the rock');
    luckyCanvas.style.cssText='display:block;width:100%;height:100%';luckyHost.append(luckyCanvas);luckyHost.hidden=!rockHintSeen;clearingArt.append(luckyHost);
  }
  const canvases = [...host.querySelectorAll('.map-hero-pixel')];
  if (!canvases.length && !bludCanvas && !luckyCanvas) return () => {};
  assets().then(configs => {
    if (cancelled) return;
    const actors = canvases.map(canvas => ({ canvas, state: createHeroIdle(), walkMs: 0 }));
    let previous = performance.now(), bludTime=0, bludVariant='bludCalm', luckyState=createLuckyIdle();
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    function draw(now) {
      if (cancelled) return;
      const delta = Math.min(100, now - previous); previous = now;
      if(bludCanvas){
        const variant=bludHost.dataset.alert==='true'?'blud':'bludCalm';
        bludTime=variant===bludVariant?bludTime+delta:0;bludVariant=variant;
        const config=configs[variant],frame=animationFrameAt(config.animations.idle,config,reduced?0:bludTime);
        drawMapNPC(bludCanvas,config,frame,{width:112,height:141,foot:135});bludCanvas.dataset.animation=variant;
      }
      if(luckyCanvas){
        const visible=host.dataset.rockHintSeen==='true';luckyHost.hidden=!visible;
        const curious=configs.luckyCurious;
        luckyState=advanceLuckyIdle(luckyState,delta,{visible},animationDuration(curious.animations.idle,curious));
        if(visible){const config=configs[luckyState.variant],frame=animationFrameAt(config.animations.idle,config,reduced?0:luckyState.animationMs,{loop:luckyState.variant!=='luckyCurious'});drawMapNPC(luckyCanvas,config,frame,{width:80,height:80,foot:77,size:.768});luckyCanvas.dataset.animation=luckyState.variant;}
      }
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

function drawMapNPC(canvas, config, frame, {width:baseWidth,height:baseHeight,foot,size=1}) {
  const bounds=canvas.getBoundingClientRect(),density=Math.min(window.devicePixelRatio||1,3);
  const width=Math.max(baseWidth,Math.round(bounds.width*density)),height=Math.max(baseHeight,Math.round(bounds.height*density));
  if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
  const context=canvas.getContext('2d');context.setTransform(1,0,0,1,0,0);context.clearRect(0,0,width,height);
  context.imageSmoothingEnabled=true;context.imageSmoothingQuality='high';
  const fit=Math.min(width/baseWidth,height/baseHeight);context.setTransform(fit,0,0,fit,(width-baseWidth*fit)/2,(height-baseHeight*fit)/2);
  const rect=config.frameRects[frame],origin=config.frameOrigins?.[frame]||config.origin||[.5,.98];
  const scale=config.displayHeight/(config.referenceFrameHeight||config.frameHeight)*size;
  const offset=config.frameOffsets?.[frame]||config.offset||[0,0];
  context.drawImage(config.image,rect.x,rect.y,rect.width,rect.height,baseWidth/2-rect.width*origin[0]*scale+offset[0]*scale,foot-rect.height*origin[1]*scale+offset[1]*scale,rect.width*scale,rect.height*scale);
}
