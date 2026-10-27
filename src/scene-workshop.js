import './ui-fonts.css';
import './scene-workshop.css';
import './scene-revision-v2.css';
import './scene-revision-v3.css';
import './scene-loading.css';
import { mountExploration } from './scene-exploration.js';
import { mountMapSprites, preloadMapSprites } from './scene-map-sprites.js';
import { createAssetPreloader } from './asset-preloader.js';
import { SCENE_ASSETS, MAP_ASSET_GROUPS, assetGroupForScene } from './scene-assets.js';
import { mountStarTitleBackground } from './star-title-background.js';
import { CHAPTERS, SPEAKERS, RIDDLES, LIBRARY_ENTRIES, FOLKLORE_SOURCE, NG_PLUS_DIALOGUES } from './content/campaign-scenes.js';
import { dialogueSkinMarkup } from './dialogue-skins.js';
import { sceneVisualMarkup, sceneAsset, sheetSprite, allyPortrait, grandfather, escapeHTML as esc } from './scene-visuals.js';
import { mountSceneBattle } from './scene-battle-demo.js';
import { battleChoiceIcon } from './battle-icons.js';
import { createAudio } from './audio.js';

const query = new URLSearchParams(location.search);
const playerMode = document.documentElement.dataset.mode === 'player';
const completionKey = playerMode ? 'desna.campaign.completed.v3' : 'desna.scene-workshop.completed.v1';
let spriteMode = query.get('sprites') === 'painted' ? 'painted' : 'map';
let language = query.get('lang') === 'en' ? 'en' : 'uk';
let skin = ['veil','drift','orbit'].includes(query.get('dialogue')) ? query.get('dialogue') : 'drift';
let chapterIndex = Math.max(0,CHAPTERS.findIndex(chapter => chapter.id === query.get('chapter'))), beatIndex = 0;
let typingTimer, printed = 0, fullText = '', pendingTimer, transitionTimer, battle, sceneController, busy = false, mode = 'scene';
let completed = false, newGamePlus = false, soundStarted = false;
let riddlesSolved = 0, disposeMapSprites, titleBackground;
let rockHintSeen = false, resumeRockWalk;
const sceneImages = createAssetPreloader();
let mapAssetsReady = false;
const approachedNPCs = new Set();
const locationTheme = () => chapterIndex >= 7 && chapterIndex <= 9 ? 'mountain' : chapterIndex >= 4 && chapterIndex <= 6 ? 'river' : 'clearing';
const musicMode = () => currentChapter().id === 'smith' && beatIndex >= 1 && beatIndex <= 7 ? 'comedy' : currentChapter().id === 'intro' ? 'title' : locationTheme();
const chapterEquipment = index => ({lucky:index>=4,weight:index>=6,charm:index>=6,tail:index>=7,heal:index>=8});
let unlocks = chapterEquipment(chapterIndex);
try { completed = localStorage.getItem(completionKey) === 'true'; } catch { /* local preview also works without storage */ }
const audio = createAudio();
const app = document.querySelector('#scene-workshop');
const t = (uk,en) => language === 'en' ? en : uk;
const translated = value => value?.[language] ?? value?.uk ?? value ?? '';
const currentChapter = () => CHAPTERS[chapterIndex];
const ngPlusSkippedBeats = new Set(['movement-try','movement-enemy','lucky-gift-rule','rusalka-tail-gift','mountain-elder-refusal','mountain-barrier','mountain-apprentice']);
const chapterBeats = () => currentChapter().beats.filter(beat => !newGamePlus || !ngPlusSkippedBeats.has(beat.id));
const currentBeat = () => chapterBeats()[beatIndex];
const names = value => translated(SPEAKERS[value]) || value;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

function shell({ menu = playerMode } = {}) {
  document.documentElement.lang = language;
  document.body.classList.toggle('player-mode',playerMode);
  document.title = t('Невідспівані — майстерня сцен','The Unmourned — scene workshop');
  app.innerHTML = `<header class="workshop-header"><a class="workshop-wordmark" href="./?lang=${language}">${t('Невідспівані','The Unmourned')}<small>${t('Прах над Десною','Ashes over the Desna')}</small></a><div class="workshop-header-actions"><a href="./ui-lab.html?lang=${language}&font=heritage&feedback=reference">UI Kit ↗</a><button data-action="language" aria-label="${t('Switch to English','Перемкнути українською')}">${language === 'uk' ? 'EN' : 'УКР'}</button><button data-action="audio" aria-pressed="false" aria-label="${t('Увімкнути музику','Enable music')}">♪</button></div></header><main class="workshop-layout"><aside class="chapter-sidebar"><p class="section-kicker">${t('МАЙСТЕРНЯ СЦЕН · 03','SCENE WORKSHOP · 03')}</p><h1>${t('До світанку','Before dawn')}</h1><p class="workshop-intro">${t('Пройди історію або відкрий окремий епізод. Тут обираємо композицію, репліки й ритм.','Play the story or open an individual episode. Explore the composition, dialogue, and pacing.')}</p><nav class="chapter-nav" aria-label="${t('Сцени','Scenes')}">${CHAPTERS.map((chapter,index) => `<button data-chapter="${chapter.id}"><span>${String(index+1).padStart(2,'0')}</span>${esc(translated(chapter.title))}</button>`).join('')}</nav><button class="workshop-menu-link" data-action="menu">${t('Головне меню ↗','Title menu ↗')}</button><p class="preview-disclaimer">${t('Окремий прототип сцен. Прогрес майстерні не змінює збереження гри.','A separate scene prototype. Workshop progress does not change your game save.')}</p></aside><section class="workshop-main"><div class="stage-heading"><div><p class="section-kicker" id="chapter-number"></p><h2 id="chapter-title"></h2></div><span id="beat-counter"></span></div><div class="scene-stage" tabindex="0" aria-label="${t('Інтерактивний перегляд сцени','Interactive scene preview')}"></div><div class="stage-toolbar"><div><button data-action="previous" aria-label="${t('Попередня репліка','Previous line')}">←</button><button data-action="replay">↶ ${t('Повторити сцену','Replay scene')}</button></div><label>${t('Вікно перед боєм','Pre-battle panel')}<select id="dialogue-skin"><option value="veil">01 · ${t('Тиха геометрія','Quiet geometry')}</option><option value="drift">02 · ${t('Жива текстура','Living texture')}</option><option value="orbit">03 · ${t('Одна сфера','Single orbit')}</option></select></label></div><div class="scene-context"><p id="chapter-summary"></p><div class="talisman-strip" aria-label="${t('Отримані талісмани','Acquired talismans')}"></div></div><p class="workshop-footnote">${t('Назва — Georgia · підназва й репліки — Roboto. Мапа: портретна композиція Persona 2. Перед боєм: три інтерпретації SMT V. Усі ефекти ударів — яскрава палітра 01.','Title: Georgia · subtitle and dialogue: Roboto. Map: Persona 2 portrait composition. Before battle: three SMT V interpretations. Battle feedback: bright palette 01.')}</p><details class="music-review" id="music-review"><summary>${t('Прослухати нові музичні теми','Listen to the new music themes')}</summary><div class="music-review-grid">${[['title',t('Головне меню','Title menu')],['clearing',t('Наддеснянська галявина','Desna Glade')],['river',t('Берег Десни','Desna riverbank')],['mountain',t('Стежка до кургану','Mountain path')],['comedy',t('Непереборний шарм','Irresistible charm')],['battle',t('Бій із Блудом','Battle with Blud')]].map(([track,label])=>`<label>${label}<audio controls preload="none" src="${sceneAsset(`audio-v3/${track}-preview.wav`)}"></audio></label>`).join('')}</div></details></section></main>`;
  if (!playerMode) {
    app.querySelector('.stage-toolbar').insertAdjacentHTML('beforeend', `<label>${t('Спрайти бою','Battle sprites')}<select id="battle-sprites"><option value="map">${t('Спрайти мапи · збільшені','Enlarged map sprites')}</option><option value="painted">${t('Спрайти бою · мальовані','Painted battle sprites')}</option></select></label><button data-action="skip-battle" disabled>${t('Пропуск битви','Skip battle')}</button><span class="skip-status" aria-live="polite"></span>`);
    const selector=app.querySelector('#battle-sprites');selector.value=spriteMode;
    selector.addEventListener('change',event=>{spriteMode=event.target.value;battle?.setSpriteMode(spriteMode);updateURL();});
  }
  app.querySelector('#dialogue-skin').value = skin;
  app.querySelector('#dialogue-skin').addEventListener('change', event => {skin=event.target.value;updateURL();if(mode==='scene')renderBeat();});
  app.querySelectorAll('.music-review audio').forEach(player=>player.addEventListener('play',()=>{app.querySelectorAll('.music-review audio').forEach(other=>{if(other!==player)other.pause();});audio.setMuted(true).then(updateSoundButton);}));
  updateSoundButton();
  if(menu)renderMenu();else renderBeat();
}
function updateSoundButton() {
  const enabled=soundStarted&&!audio.muted,button=app.querySelector('[data-action="audio"]');
  if(!button)return;
  button.setAttribute('aria-pressed',String(enabled));
  button.setAttribute('aria-label',enabled?t('Вимкнути музику','Mute music'):t('Увімкнути музику','Enable music'));
  button.textContent=enabled?'♫':'♪';
}
function updateURL() {
  const url = new URL(location.href); url.searchParams.set('lang',language);url.searchParams.set('chapter',currentChapter().id);url.searchParams.set('dialogue',skin);url.searchParams.set('sprites',spriteMode);history.replaceState(null,'',url);
}
function cleanup() {
  resumeRockWalk = undefined;
  clearInterval(typingTimer);clearTimeout(pendingTimer);clearTimeout(transitionTimer);
  sceneController?.abort();titleBackground?.destroy();titleBackground=null;disposeMapSprites?.();disposeMapSprites=null;battle?.destroy();battle=null;busy=false;const skip=app.querySelector('[data-action=skip-battle]');if(skip)skip.disabled=true;const status=app.querySelector('.skip-status');if(status)status.textContent='';
}

async function prepareStage(group, signal, retry) {
  const files = SCENE_ASSETS[group].map(sceneAsset);
  const needsMap = MAP_ASSET_GROUPS.has(group);
  if (sceneImages.ready(files) && (!needsMap || mapAssetsReady)) { sceneImages.retain(files); return true; }
  const stage = app.querySelector('.scene-stage');
  stage.className = 'scene-stage is-loading';
  stage.setAttribute('aria-busy', 'true');
  const label = { intro:t('До світанку','Before dawn'), clearing:t('Наддеснянська галявина','Desna Glade'), river:t('Берег Десни','Desna riverbank'), mountain:t('Курган предків','Ancestral mound'), credits:t('Після світанку','After dawn'), library:t('Бібліотека','Library') }[group];
  stage.innerHTML = `<div class="scene-loader" role="status"><span class="scene-loader__mark" aria-hidden="true">✧</span><h3>${label}</h3><p>${t('Готуємо зображення…','Preparing the scene…')}</p><progress max="100" value="0" aria-label="${t('Завантаження','Loading')}"></progress><span class="scene-loader__count" aria-hidden="true">0%</span></div>`;
  let imageCount = 0, mapCount = 0, finished = false;
  const total = files.length + (needsMap ? 1 : 0);
  const update = () => {
    if(signal.aborted||finished)return;
    const percentage = Math.floor((imageCount + mapCount) / total * 100);
    stage.querySelector('progress').value = percentage;
    stage.querySelector('.scene-loader__count').textContent = `${percentage}%`;
  };
  try {
    await Promise.all([
      sceneImages.prepare(files, {signal,onProgress:done=>{imageCount=done;update();}}),
      needsMap ? preloadMapSprites().then(()=>{mapAssetsReady=true;mapCount=1;update();}) : Promise.resolve(),
    ]);
    finished=true;
    if(signal.aborted)return false;
    sceneImages.retain(files);
    stage.setAttribute('aria-busy','false');
    return true;
  } catch(error) {
    finished=true;
    if(signal.aborted)return false;
    console.error('Scene assets could not load',error);
    stage.setAttribute('aria-busy','false');
    stage.innerHTML=`<div class="scene-loader" role="alert"><span class="scene-loader__mark" aria-hidden="true">✧</span><h3>${label}</h3><p>${t('Не вдалося завантажити всі зображення. Перевір підключення й спробуй ще раз.','Some images could not be loaded. Check your connection and try again.')}</p><button type="button" data-asset-retry>${t('Спробувати ще раз','Try again')}</button></div>`;
    stage.querySelector('[data-asset-retry]').addEventListener('click',event=>{event.stopPropagation();retry();},{once:true,signal});
    return false;
  }
}
function updateHeader() {
  app.querySelector('#chapter-number').textContent = `${t('СЦЕНА','SCENE')} ${String(chapterIndex+1).padStart(2,'0')}`;
  app.querySelector('#chapter-title').textContent = translated(currentChapter().title);
  app.querySelector('#beat-counter').textContent = `${beatIndex+1} / ${chapterBeats().length}`;
  app.querySelector('#chapter-summary').textContent = translated(currentChapter().summary);
  app.querySelectorAll('[data-chapter]').forEach(button => button.setAttribute('aria-current',String(button.dataset.chapter === currentChapter().id)));
  app.querySelector('[data-action="previous"]').disabled = beatIndex===0;
  app.querySelector('.talisman-strip').innerHTML = [['lucky','✧',t('Лакі','Lucky')],['weight','▣','100 kg'],['tail','≋',t('Русалка','Rusalka')],['heal','✦',t('Учень','Apprentice')]].map(([key,icon,label]) => `<span class="${unlocks[key] ? 'unlocked' : ''}">${icon} ${label}<small>${unlocks[key] ? (key === 'weight' ? '✓' : '1×') : '—'}</small></span>`).join('');
}
function typeText(text) {
  clearInterval(typingTimer); fullText=text;printed=0;
  const stage = app.querySelector('.scene-stage'), target = stage.querySelector('.scene-dialogue-text');
  if(!target)return;
  target.setAttribute('aria-label',text);target.textContent='';stage.classList.add('is-speaking');
  const reveal = () => {printed=Math.min(fullText.length,printed+2);target.textContent=fullText.slice(0,printed);audio.sound('type');if(printed>=fullText.length)finishText();};
  if(reducedMotion)finishText();else typingTimer=setInterval(reveal,17);
}
function finishText() {
  clearInterval(typingTimer);printed=fullText.length;
  const stage=app.querySelector('.scene-stage');stage?.classList.remove('is-speaking');
  const target=stage?.querySelector('.scene-dialogue-text');if(target)target.textContent=fullText;
}
function portrait(speaker) {
  if(speaker==='lucky')return `<img src="${sceneAsset('portraits/lucky-dialogue-v1.png')}" alt="${names(speaker)}">`;
  if(speaker==='hero')return `<img src="${sceneAsset('battle/hero-v1.png')}" alt="${names(speaker)}">`;
  if(['smith','lesovyk','apprentice'].includes(speaker))return allyPortrait(speaker);
  return speaker==='rusalka' ? `<img src="${sceneAsset('scenes/v2/rusalka-win.png')}" alt="${names(speaker)}">` : '';
}
async function renderBeat() {
  cleanup();mode='loading';busy=true;sceneController=new AbortController();
  const signal=sceneController.signal;
  updateHeader();updateURL();
  if(currentChapter().id==='menu'){renderMenu();return;}
  if(!await prepareStage(assetGroupForScene(currentChapter().id,currentBeat().visual),signal,renderBeat)||signal.aborted)return;
  mode='scene';busy=false;
  const beat=currentBeat();
  if(beat.unlock)unlocks[beat.unlock]=true;
  if(beat.unlock==='weight')unlocks.charm=true;
  if(beat.action==='completion') { completed=true;try{localStorage.setItem(completionKey,'true');}catch{} }
  updateHeader();updateURL();
  if(currentChapter().id==='menu'){renderMenu();return;}
  const stage=app.querySelector('.scene-stage');stage.className='scene-stage';
  const gateRusalka=beat.action==='battle'&&beat.enemy==='rusalka'&&!approachedNPCs.has(beat.id);
  let visual=beat.action==='clear-barrier' ? 'apprentice' : gateRusalka ? 'river' : beat.visual;
  let visualMarkup=sceneVisualMarkup(visual,language,{tail:unlocks.tail,minion:beat.id!=='tutorial-done',knockbackTargets:beat.targets});
  if(beat.action==='battle' && ['blud','rusalka','upyr'].includes(beat.enemy)&&!gateRusalka)visualMarkup=`<div class="scene-visual scene-visual--forest"><div class="scene-backdrop" style="background-image:url('${sceneAsset(beat.enemy==='upyr'?'scenes/v3/mountain-battle.png':'battle/forest-muted-a-v1.png')}')"></div><div class="scene-art"><img class="scene-hero battle-portrait-hero" src="${sceneAsset('battle/hero-v1.png')}" alt="${names('hero')}"><img class="scene-boss" src="${sceneAsset(beat.enemy==='blud'?'battle/blud-v1.png':beat.enemy==='rusalka'?'scenes/v3/rusalka-battle.png':'scenes/upyr-cloaked-elder-v1.png')}" alt="${names(beat.enemy)}"></div></div>`;
  const isIntro=currentChapter().id==='intro'||['lucky-finale','sequel'].includes(visual), isBoard=visualMarkup.includes('scene-visual--whiteboard');
  stage.dataset.beat=beat.id;
  const mapDialogue=!isIntro && !isBoard && beat.action!=='battle' && !['tutorial-arena','smith-proud','smith-flirt','smith-bruised','rusalka-closeup','rusalka-win','baseball','proposal','sequel','menu'].includes(visual);
  const nextLabel=beat.action==='battle' ? t('Почати бій','Begin battle') : beat.action==='riddles' ? t('Відповісти','Answer') : t('Далі','Continue');
  stage.innerHTML=`${visualMarkup}<div class="stage-location"><span>◒ ${t('ДО СВІТАНКУ','BEFORE DAWN')}</span>${!isIntro?`<span>${esc(translated(currentChapter().title))}</span>`:''}</div>${beat.diagram ? `<div class="combat-diagram"><span>${battleChoiceIcon('attack','head')} ${t('Удар','Strike')}</span><b>↔</b><span>${battleChoiceIcon('defend','body')} ${t('Захист','Guard')}</span><small>${t('Різні зони → −1 HP','Different zones → −1 HP')}</small></div>` : ''}<div class="dialogue-dock ${mapDialogue || isIntro || isBoard ? 'persona-dialogue' : 'prebattle-dialogue'}">${mapDialogue ? `<div class="map-dialogue-portrait">${portrait(beat.speaker)}</div>` : visual==='tutorial-arena'&&beat.speaker==='lucky' ? `<div class="briefing-portrait">${portrait('lucky')}</div>` : ''}${dialogueSkinMarkup({variant:mapDialogue || isIntro || isBoard ? 'veil' : skin,speaker:names(beat.speaker),text:'',language,nextLabel,location:locationTheme()})}<button class="dialogue-advance" data-action="advance" aria-label="${nextLabel}"></button></div>`;
  if(beat.action==='follow-smith')stage.querySelector('.scene-art')?.classList.add('walk-to-pier');

  stage.dataset.rockHintSeen=String(rockHintSeen);
  disposeMapSprites=mountMapSprites(stage,{rockHintSeen});
  audio.setMode(musicMode());
  if(visual==='rusalka-dive')audio.sound('dive');
  if(beat.action==='knockback')audio.sound('hit');
  let text=translated(beat.text);
  if(newGamePlus && ['movement-welcome','smith-boast','rusalka-ready','mountain-riddles-intro','lucky-gift-praise','mountain-heal'].includes(beat.id))text=translated(NG_PLUS_DIALOGUES[beat.speaker])||text;
  if(beat.action==='approach-blud'){startFreeMap('clearing',[{id:'blud',selector:'.blud-map',x:1106,y:826,label:names('blud')}],{x:834,y:432},()=>{busy=false;transitionTo(nextBeat);});return;}
  if(beat.action==='approach-altar'){startAltar();return;}
  if(beat.id==='river-find-help'){startFreeMap('river',[{id:'smith',selector:'.smith-map',x:350,y:435,label:names('smith')}],{x:600,y:665},()=>{busy=false;nextBeat();});return;}
  if(gateRusalka){startFreeMap('river',[{id:'rusalka',selector:'.rusalka-map',x:1080,y:330,label:names('rusalka')}],{x:350,y:435},()=>{busy=false;approachedNPCs.add(beat.id);renderBeat();});return;}
  if(beat.action==='approach-smith'&&!approachedNPCs.has(beat.id)){startNPCApproach(text);return;}
  typeText(text);
}
function transitionTo(next) {
  if(busy)return;busy=true;finishText();app.querySelector('.scene-stage').classList.add('scene-exit');
  transitionTimer=setTimeout(() => {busy=false;next();},reducedMotion?0:320);
}
function nextBeat() {
  const leavingIntro = currentChapter().id === 'intro' && beatIndex === chapterBeats().length - 1;
  const proceed = async () => {
    if(beatIndex<chapterBeats().length-1)beatIndex++;
    else {
      chapterIndex=Math.min(CHAPTERS.length-1,chapterIndex+1);beatIndex=0;
      while(newGamePlus && ['tutorial','river','smith'].includes(currentChapter().id))chapterIndex++;
    }
    await renderBeat();
    if(leavingIntro&&!reducedMotion&&mode==='scene')app.querySelector('.scene-stage').classList.add('scene-enter');
  };
  if(leavingIntro)transitionTo(proceed);else proceed();
}
function startFreeMap(world,targets,start,onArrive) {
  const stage=app.querySelector('.scene-stage');finishText();fullText='';printed=0;busy=true;
  stage.querySelector('.dialogue-dock').hidden=true;
  return mountExploration(stage,{world,targets,start,onArrive,language,signal:sceneController.signal,rockHintSeen,onRock:(_position,resume)=>{
    rockHintSeen=true;stage.dataset.rockHintSeen='true';busy=false;
    const dock=stage.querySelector('.dialogue-dock');
    dock.className='dialogue-dock persona-dialogue';
    const nextLabel=t('Далі','Continue');
    dock.innerHTML=`<div class="map-dialogue-portrait">${portrait('lucky')}</div>${dialogueSkinMarkup({speaker:names('lucky'),language,nextLabel,location:'clearing'})}<button class="dialogue-advance" data-action="advance" aria-label="${nextLabel}"></button>`;
    dock.hidden=false;
    resumeRockWalk=()=>{dock.hidden=true;fullText='';printed=0;busy=true;resume();};
    typeText(t('Тут не пройти.','We cannot get through here.'));
  }});
}
function startNPCApproach(text,onlyRusalka=false) {
  const targets=[{id:'rusalka',selector:'.rusalka-map',x:1080,y:330,label:names('rusalka')}];
  if(!onlyRusalka)targets.push({id:'smith',selector:'.smith-map',x:350,y:435,label:names('smith')});
  startFreeMap('river',targets,onlyRusalka?{x:350,y:475}:undefined,id=>{
    busy=false;approachedNPCs.add(currentBeat().id);
    if(id==='smith'){app.querySelector('.dialogue-dock').hidden=false;typeText(text);}
    else nextBeat();
  });
}
function startAltar(){
  const stage=app.querySelector('.scene-stage');
  startFreeMap('mountain',[{id:'altar',selector:'.altar-target',x:1110,y:185,label:t('Вівтар','Altar'),position:false}],{x:900,y:440},()=>{
    stage.classList.add('altar-ritual');audio.sound('heal');
    pendingTimer=setTimeout(()=>{busy=false;nextBeat();},reducedMotion?400:4200);
  });
}
function advance() {
  if(mode!=='scene'||busy)return;
  if(printed<fullText.length){finishText();return;}
  if(resumeRockWalk){const resume=resumeRockWalk;resumeRockWalk=undefined;resume();return;}
  const beat=currentBeat();
  if(beat.action==='battle'){
    cleanup();busy=true;audio.setMode('battle');
    const stage=app.querySelector('.scene-stage');stage.className='scene-stage';stage.innerHTML='<div class="battle-demo-host"></div>';
    battle=mountSceneBattle(stage.firstElementChild,{enemy:beat.enemy,language,unlocks,spriteMode,onSound:type=>audio.sound(type),onVictory:()=>{busy=false;nextBeat();}});const skip=app.querySelector('[data-action=skip-battle]');if(skip)skip.disabled=false;return;
  }
  if(beat.action==='approach-smith'){startNPCApproach(translated(beat.text),true);return;}
  if(beat.action==='riddles'&&!newGamePlus){startRiddles();return;}
  if(['movement','approach'].includes(beat.action)){startMovement(beat.action==='approach');return;}
  nextBeat();
}
function startMovement() {
  startFreeMap('clearing',[{id:'tutorial',selector:'.tutorial-map',x:798,y:505,label:t('Прихвостень Блуда','Blud’s minion')}],{x:730,y:285},()=>{busy=false;transitionTo(nextBeat);});
}
function startRiddles() {
  finishText();busy=true;
  const stage=app.querySelector('.scene-stage');stage.querySelector('.dialogue-dock').hidden=true;
  if(riddlesSolved>=RIDDLES.length){busy=false;nextBeat();return;}
  const panel=document.createElement('section');panel.className='riddle-panel';stage.append(panel);let index=riddlesSolved;
  function renderRiddle(){const riddle=RIDDLES[index];panel.innerHTML=`<p class="section-kicker">${names('lesovyk')} · ${index+1}/3</p><h3>${esc(translated(riddle.question))}</h3><div>${riddle.options.map(option=>`<button data-answer="${option.id}">${esc(translated(option.text))}</button>`).join('')}</div><p class="riddle-response" aria-live="polite"></p>`;}
  panel.addEventListener('click',event=>{const button=event.target.closest('[data-answer]');if(!button)return;const riddle=RIDDLES[index],message=panel.querySelector('.riddle-response');if(button.dataset.answer!==riddle.answer){message.textContent=t('Придивись до підказок. Спробуй ще раз.','Look at the clues. Try again.');button.disabled=true;return;}message.textContent=translated(riddle.explanation);riddlesSolved=index+1;panel.querySelectorAll('button').forEach(b=>b.disabled=true);pendingTimer=setTimeout(()=>{index++;if(index===RIDDLES.length){busy=false;nextBeat();}else renderRiddle();},1400);},{signal:sceneController.signal});renderRiddle();
}
function selectChapter(id) {
  const index=CHAPTERS.findIndex(chapter=>chapter.id===id);if(index<0)return;
  cleanup();chapterIndex=index;beatIndex=0;
  // Direct review includes the equipment earned in preceding story chapters.
  if(!newGamePlus)unlocks=chapterEquipment(index);
  renderBeat();
}
function renderMenu() {
  cleanup();mode='menu';audio.setMode('title');const stage=app.querySelector('.scene-stage');stage.className='scene-stage';
  stage.setAttribute('aria-busy','false');
  stage.innerHTML=`<div class="star-title-background"></div><div class="preview-title-menu"><h2>${t('Невідспівані','The Unmourned')}</h2><p>${t('Прах над Десною','Ashes over the Desna')}</p><div class="title-menu-options"><button data-menu="start">${t('Почати гру','Start game')} <span>→</span></button><button data-menu="plus" aria-disabled="${!completed}">${t('Нова гра+','New Game+')} <span>${completed?'→':'♙'}</span></button><button data-menu="library" aria-disabled="${!completed}">${t('Бібліотека','Library')} <span>${completed?'→':'♙'}</span></button></div><p class="menu-hint" aria-live="polite">${completed?t('Доступ відкрито після проходження.','Unlocked after completing the journey.'):t('Нова гра+ та бібліотека відкриються після проходження.','New Game+ and the Library unlock after completion.')}</p></div>`;
  titleBackground=mountStarTitleBackground(stage.querySelector('.star-title-background'),{visibilityHost:stage});
  stage.querySelectorAll('[aria-disabled="true"]').forEach(button=>{button.title=t('Ця опція стане доступна після проходження гри.','This option becomes available after completing the game.');button.addEventListener('focus',()=>stage.querySelector('.menu-hint').textContent=button.title);});
  stage.querySelectorAll('[data-menu]').forEach(button=>button.addEventListener('click',()=>{
    if(button.getAttribute('aria-disabled')==='true'){stage.querySelector('.menu-hint').textContent=button.title;return;}
    if(button.dataset.menu==='library'){renderLibrary();return;}
    newGamePlus=button.dataset.menu==='plus';riddlesSolved=0;rockHintSeen=false;unlocks=newGamePlus?{lucky:true,tail:true,heal:true,weight:true,charm:true}:{lucky:false,tail:false,heal:false,weight:false,charm:false};approachedNPCs.clear();chapterIndex=newGamePlus?3:0;beatIndex=0;renderBeat();
  }));
}
function libraryArt(id, early=false) {
  const files={hero:'battle/hero-v1.png',lucky:early?'portraits/lucky-dialogue-v1.png':'moth-narrator-v1.png',blud:`scenes/designs/blud${early?'-early':''}.png`,rusalka:`scenes/designs/rusalka${early?'-early':''}.png`,upyr:`scenes/designs/upyr${early?'-early':''}.png`,smith:'scenes/designs/smith.png'};
  if(early && ['hero','smith','lesovyk','apprentice'].includes(id))return `<img src="${sceneAsset('scenes/designs/cast-first.png')}" alt="${t('Перший ескіз персонажів','First character lineup')}">`;
  if(['lesovyk','apprentice'].includes(id))return `<div class="library-ally">${allyPortrait(id)}</div>`;
  if(files[id])return `<img src="${sceneAsset(files[id])}" alt="${names(id)}">`;
  if(id==='grandfather')return grandfather(early?0:2);
  return sheetSprite(id==='lesovyk'?'elder':id);
}
async function renderLibrary(id='hero',early=false) {
  cleanup();mode='loading';busy=true;sceneController=new AbortController();const signal=sceneController.signal;
  if(!await prepareStage('library',signal,()=>renderLibrary(id,early))||signal.aborted)return;
  mode='library';busy=false;const entry=LIBRARY_ENTRIES.find(item=>item.id===id)||LIBRARY_ENTRIES[0],stage=app.querySelector('.scene-stage');stage.className='scene-stage library-stage';
  stage.innerHTML=`<section class="scene-library"><div class="library-topline"><span>${t('БІБЛІОТЕКА','LIBRARY')}</span><button data-library-menu>← ${t('Меню','Menu')}</button></div><nav class="library-nav">${LIBRARY_ENTRIES.map(item=>`<button data-library-id="${item.id}" aria-current="${item.id===entry.id}">${esc(translated(item.name))}</button>`).join('')}</nav><div class="library-detail"><div class="library-art">${libraryArt(entry.id,early)}</div><div class="library-copy"><p class="section-kicker">${t('ІСТОРІЯ ОБРАЗУ','BEHIND THE CHARACTER')}</p><h2>${esc(translated(entry.name))}</h2><h3>${t('Фольклорне джерело','Folklore source')}</h3><p>${esc(translated(entry.folklore))}</p><h3>${t('Наша інтерпретація','Our interpretation')}</h3><p>${esc(translated(entry.adaptation))}</p>${entry.source?`<a href="${entry.source.url}" target="_blank" rel="noopener">${translated(entry.source.author)}, ${entry.source.year} · ${t('с.','pp.')} ${entry.source.pages} ↗</a>`:''}<button data-library-version>${early?t('Поточний образ','Current design'):t('Ранній образ / варіант','Early design / variant')}</button></div></div><details class="library-cast"><summary>${t('Перші ескізи персонажів','First character sketches')}</summary><img src="${sceneAsset('scenes/designs/cast-first.png')}" alt="${t('Перший склад персонажів на лінійованому тлі','First character lineup on a ruled background')}"><img src="${sceneAsset('scenes/designs/cast-full.png')}" alt="${t('Розширений склад персонажів','Expanded character lineup')}"></details><p class="library-source">${esc(translated(FOLKLORE_SOURCE.context))}</p></section>`;
  stage.querySelector('[data-library-menu]').addEventListener('click',renderMenu);stage.querySelector('[data-library-version]').addEventListener('click',()=>renderLibrary(entry.id,!early));stage.querySelectorAll('[data-library-id]').forEach(button=>button.addEventListener('click',()=>renderLibrary(button.dataset.libraryId)));
}
app.addEventListener('click',event=>{
  if(event.target.closest('button,[role=button]')&&!event.target.closest('.demo-battle'))audio.sound('click');
  const chapter=event.target.closest('[data-chapter]');if(chapter){selectChapter(chapter.dataset.chapter);return;}
  const action=event.target.closest('[data-action]')?.dataset.action;
  if(!action){
    if(event.target.closest('.scene-stage')&&!event.target.closest('button,select,a,[role=button],.demo-battle')&&mode==='scene'&&!busy){unlockSound();advance();}
    return;
  }
  if(action==='skip-battle'&&!playerMode&&battle){battle.armQuickWin();app.querySelector('.skip-status').textContent=t('Наступний удар завершить бій.','The next strike will finish the battle.');event.target.disabled=true;return;}

  if(action==='advance'){unlockSound();advance();}
  if(action==='previous'&&beatIndex>0){cleanup();beatIndex--;renderBeat();}
  if(action==='replay'){cleanup();approachedNPCs.clear();beatIndex=0;if(currentChapter().id==='mountain')riddlesSolved=0;renderBeat();}
  if(action==='menu')renderMenu();
  if(action==='language'){const wasMenu=mode==='menu';cleanup();language=language==='uk'?'en':'uk';shell({menu:wasMenu});}
  if(action==='audio'){app.querySelectorAll('.music-review audio').forEach(player=>player.pause());const shouldMute=soundStarted&&!audio.muted;soundStarted=true;audio.setMuted(shouldMute).then(updateSoundButton);}
});
function unlockSound(){if(!soundStarted){soundStarted=true;audio.unlock().then(updateSoundButton);}}
document.addEventListener('keydown',event=>{
  if(['Space','Enter','KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.code)&&!event.repeat&&mode==='scene'&&!busy&&!event.target.closest('select,input,textarea,a')&&(!event.target.closest('button')||event.target.closest('.dialogue-advance'))){event.preventDefault();unlockSound();advance();}
});
window.addEventListener('pagehide',()=>{cleanup();audio.destroy();});
shell();
