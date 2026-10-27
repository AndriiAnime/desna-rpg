import { mapHeroMarkup } from './scene-map-sprites.js';
const A = `${import.meta.env.BASE_URL}assets/`;
export const sceneAsset = file => `${A}${file}`;
export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
export function sheetSprite(character, className = '') {
  return `<span class="sheet-sprite sheet-${character} ${className}" role="img" aria-label="${character}" style="background-image:url('${A}map-sprites/${character}-idle-v1.png')"></span>`;
}
export function grandfather(cell = 0) {
  return `<span class="reaction-cell grandfather-cell" style="--cell:${cell}" role="img" aria-label="${['Grandfather','Restless ghost','Happy grandfather'][cell]}"></span>`;
}
export function allyPortrait(character) {
  const index = {smith:0,lesovyk:1,apprentice:2}[character];
  return `<span class="ally-portrait ally-portrait--${character}" style="--portrait-cell:${index}" role="img" aria-label="${character}"></span>`;
}
const art = (file, className = '', alt = '') => `<img class="${className}" src="${A}scenes/v2/${file}.png" alt="${alt}">`;
const moth = (extra = '') => `<img class="narrator-moth ${extra}" src="${A}moth-narrator-v1.png" alt="Лакі / Lucky">`;
const hero = (extra = '') => `<img class="scene-hero ${extra}" src="${A}battle/hero-v1.png" alt="Герой / Hero">`;
const mapHero = extra => `<div class="map-actor hero-map ${extra || ''}">${mapHeroMarkup()}</div>`;
const dawn = '<svg class="dawn-clock" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="43"/><path d="M16 63h68M28 63a22 22 0 0 1 44 0M50 15v12M18 33l10 10M82 33L72 43M50 50V34m0 16 15 8"/></svg>';
const pentagram = '<svg class="grandfather-pentagram" viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="54"/><path d="m60 8 31 94-81-58h100l-81 58Z"/></svg>';
const routeSigns = [
  '<path d="M8 78h84M28 75V30M15 52l13-27 14 27ZM57 75V21M42 46l15-29 16 29Z"/>',
  '<path d="M7 45q14-16 28 0t28 0t28 0M7 62q14-16 28 0t28 0t28 0M7 79q14-16 28 0t28 0t28 0"/>',
  '<path d="m8 82 43-64 41 64ZM35 43l16 8 14-8M42 12h19M51 4v15"/>',
];
function board(content, extra = '') {
  return `${art('lucky-teacher','narrator-moth teacher-moth','Лакі з вказівкою / Lucky with a pointer')}<div class="marker-board ${extra}"><div class="marker-board-content">${content}</div><div class="marker-tray"><i></i><i></i><i></i></div></div>`;
}
function barrier(clear = false) {
  return `<div class="flame-barrier ${clear ? 'barrier-clear' : ''}" role="img" aria-label="Магічний бар’єр / Magic barrier"><svg viewBox="0 0 360 140" aria-hidden="true">${Array.from({length:12},(_,i)=>`<g style="--flame-delay:${i*-.17}s"><path class="flame-outer" d="M${i*30} 135q-10-28 5-45l-3-23 15-19-2-34 13 27-4 25 14 19q-15 25-8 50Z"/><path class="flame-inner" d="M${i*30+8} 135q-8-23 8-39l-1-24 13 24-6 18 9 21Z"/></g>`).join('')}</svg></div>`;
}

/** Art and layout only. Input, typewriting and story state belong to the player. */
export function sceneVisualMarkup(visual = 'lucky', language = 'uk', { tail = false, minion = true, knockbackTargets = ['hero'] } = {}) {
  const t = (uk,en) => language === 'en' ? en : uk;
  let body = '', background = 'battle/forest-muted-a-v1.png', style = 'forest';
  const map = name => { background = name === 'clearing' ? 'map-sprites/map-v8.png' : `scenes/${name}-map-v1.png`; style = `map map-${name}`; };
  switch (visual) {
    case 'lucky': body = moth('large-moth'); style = 'intro'; break;
    case 'diagram-death':
      body = board(`<figure class="board-single">${grandfather(0)}<figcaption>${t('дід мертвий','grandpa: deceased')}</figcaption></figure>`); style = 'whiteboard'; break;
    case 'diagram-dawn':
      body = board(`<div class="board-equation"><figure>${grandfather(0)}</figure><b>+</b><figure>${dawn}<figcaption>${t('до світанку','before dawn')}</figcaption></figure><b>→</b><figure class="ghost-summoning">${pentagram}${grandfather(1)}<figcaption>${t('неупокоєний дух','restless spirit')}</figcaption></figure></div>`); style = 'whiteboard'; break;
    case 'diagram-urn':
      body = board(`<div class="board-equation urn-equation"><figure>${grandfather(0)}<figcaption>${t('дід мертвий','grandpa: deceased')}</figcaption></figure><b>→</b><figure>${art('grandfather-urn','','Глечик із портретом діда / Grandpa’s urn')}<figcaption>${t('дід прахіфікований','grandpa: ash-ified')}</figcaption></figure><b>→</b><figure>${grandfather(2)}<figcaption>${t('дід відспіваний','grandpa: laid to rest')}</figcaption></figure></div>`); style = 'whiteboard'; break;
    case 'diagram-route':
      body = board(`<div class="route-waypoints">${[t('Наддеснянська галявина','Desna Glade'),t('Берег Десни','Desna riverbank'),t('Курган предків','Ancestral mound')].map((label,i)=>`<figure class="route-stop"><svg viewBox="0 0 100 100" aria-hidden="true">${routeSigns[i]}</svg><figcaption>${label}</figcaption></figure>${i<2?'<span class="route-dashes">···➜</span>':''}`).join('')}${art('lucky-hiker','route-hiker','Лакі в дорозі / Lucky hiking')}</div>`,'route-marker-board'); style = 'whiteboard'; break;
    case 'tutorial-arena':
      body = `${hero('arena-dialogue-hero')}<img class="arena-dialogue-minion" src="${A}scenes/v2/minion-battle.png" alt="${t('Прихвостень Блуда','Blud’s minion')}">`; style='tutorial-arena'; break;
    case 'blud-map':
      map('clearing'); body = `${mapHero()}<div class="map-actor blud-map">${sheetSprite('blud')}</div>`;break;
    case 'clearing': case 'tutorial':
      map('clearing'); body = `${mapHero()}${minion?`<div class="map-actor tutorial-map"><span class="minion-map-sprite" role="img" aria-label="${t('Прихвостень Блуда','Blud’s minion')}"></span></div>`:''}`; break;
    case 'lucky-shield':
      style = 'whiteboard'; body = board(`${art('lucky-shield-diagram','board-wide-art',t('Лакі захищає героя','Lucky shields the hero'))}<span class="board-once">${t('Я ЗАБЛОКУЮ БУДЬ-ЯКИЙ УДАР','I WILL BLOCK ANY STRIKE')}</span>`); break;
    case 'river': case 'river-empty': case 'rusalka-dive': case 'knockback':
      map('river'); body = `${mapHero(visual==='knockback' && knockbackTargets.includes('hero')?'map-knockback':'')}<div class="map-actor smith-map ${visual === 'knockback' && knockbackTargets.includes('smith') ? 'map-knockback' : ''}">${sheetSprite('smith')}</div><div class="map-actor rusalka-map ${visual === 'rusalka-dive' ? 'rusalka-diving' : ''}">${visual==='river-empty'?'':visual==='rusalka-dive'?'<span class="rusalka-dive-frames" role="img" aria-label="Русалка пірнає / Rusalka diving"></span>':sheetSprite('rusalka')}</div><div class="river-ripples"></div>`; break;
    case 'smith-proud': case 'smith-flirt': case 'smith-bruised':
      map('river'); body = `<div class="reaction-cell smith-cell" style="--cell:${{'smith-proud':0,'smith-flirt':1,'smith-bruised':2}[visual]}" role="img" aria-label="${t('Коваль','Blacksmith')}"></div>${visual === 'smith-flirt' ? `<div class="flirt-rusalka"><img src="${A}scenes/v3/rusalka-battle.png" alt="${t('Русалка','Rusalka')}"></div>` : ''}`; break;
    case 'rusalka-closeup': background = 'scenes/rusalka-shocked-v1.png'; style = 'closeup'; break;
    case 'rusalka-win': background = 'scenes/v2/rusalka-win.png'; style='closeup'; break;
    case 'weight': style = 'whiteboard'; body = board(`<img class="board-wide-art" src="${A}scenes/v3/weight-wind-diagram.png" alt="${t('Герой тримається за гирю, поки Русалка дме','The hero holds the weight while the rusalka blows')}"><span class="board-once">${t('ТАЛІСМАН ПЕРЕКОНЛИВОСТІ · 100 КГ','A PERSUASIVE TALISMAN · 100 KG')}</span>`); break;
    case 'tail': style = 'whiteboard'; body = board(`<div class="tail-diagram">${art('rusalka-charm','tail-charm','Талісман Русалки / Rusalka charm')}<span class="tail-swoosh">⤴</span><div class="tail-target">${sheetSprite('blud')}</div><span class="once-seal">${t('ІГНОРУЄ ЗАХИСТ · 1 × ЗА БІЙ','IGNORES GUARD · 1 × PER BATTLE')}</span></div>`); break;
    case 'mountain': case 'barrier': case 'elder': case 'apprentice':
      map('mountain'); body = `${mapHero(visual==='barrier'?'map-knockback':'')}<div class="map-actor elder-map">${sheetSprite('elder')}</div>${visual === 'apprentice' ? `<div class="map-actor apprentice-map">${sheetSprite('apprentice')}</div>` : ''}${barrier(visual==='apprentice')}`; break;
    case 'upyr-cloak': background = 'scenes/mountain-map-v1.png'; body = `<div class="prebattle-hero-wrap">${hero('battle-portrait-hero')}${tail?art('rusalka-charm','satchel-charm','Талісман Русалки / Rusalka charm'):''}</div><img class="scene-boss" src="${A}scenes/upyr-cloaked-elder-v1.png" alt="${t('Старець у капюшоні','A hooded elder')}">`; break;
    case 'upyr-reveal': background = 'scenes/mountain-map-v1.png'; body = `<img class="revealed-upyr" src="${A}scenes/upyr-revealed-v1.png" alt="Упир / Upyr">`; break;
    case 'altar': case 'altar-rest':
      map('mountain');body=`${mapHero()}<button class="altar-target" aria-label="${t('Вівтар','Altar')}"></button><div class="altar-urn-map"></div><div class="altar-ghost-map"></div><div class="ash-particles"></div>`;break;
    case 'lucky-finale': case 'sequel': background='scenes/v3/mountain-battle.png'; style='intro';body=moth('large-moth');break;
    case 'sunrise': background='scenes/v3/credits-sunrise.png';style='credits';break;
    case 'baseball': background = 'scenes/credits-baseball-v1.png'; style = 'credits'; break;
    case 'proposal': background = 'scenes/credits-proposal-v1.png'; style = 'credits'; break;
    case 'menu': background = 'title/ps2-allies-title-space-v1.png'; style = 'title'; break;
    default: body = moth('large-moth'); style = 'intro';
  }
  // CSS custom properties resolve URLs where they are consumed; in a Pages
  // build that stylesheet lives in assets/. Keep this URL document-relative.
  const backdrop = new URL(`${A}${background}`, document.baseURI).href;
  return `<div class="scene-visual scene-visual--${style.replaceAll(' ',' scene-visual--')}" data-visual="${escapeHTML(visual)}" style="--scene-backdrop:url('${backdrop}')"><div class="scene-backdrop" style="background-image:url('${A}${background}')"></div><div class="scene-art">${body}</div></div>`;
}
