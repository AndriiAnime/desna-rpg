import './review-workshop.css';
import { createBattle, mountBattlePreview, preloadBattleAssets, DEFAULT_BATTLE_BACKGROUND } from './battle.js';
import { spriteLayout, frameOriginPixels } from './domain/sprite-layout.js';

const ASSETS = `${import.meta.env.BASE_URL}assets/`;
const BACKGROUNDS = [
  ['base', 'База · виправлене дерево', 'forest-v2.png'],
  ['a', 'А · похмурий день · обрано', 'forest-muted-a-v1.png'],
  ['b', 'Б · холодний туман', 'forest-mist-b-v1.png'],
  ['c', 'В · старий ліс', 'forest-uncanny-c-v1.png'],
];
const FRAMINGS = [['full', 'Повний зріст'], ['waist', 'До пояса'], ['close', 'Ближній план']];
const loadJSON = async (path) => { const response=await fetch(`${ASSETS}${path}`); if(!response.ok)throw new Error(`Asset ${path}: ${response.status}`); return response.json(); };
const loadImage = (url) => new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error(`Image ${url}`));image.src=url;});

export function mountReviewWorkshop({host,onOpen=()=>{},onClose=()=>{},onSound=()=>{},canOpen=()=>true}) {
  let background=DEFAULT_BATTLE_BACKGROUND, previews=[], destroyed=false, trial=null, paused=false, visible=false, raf=0, started=false, trialSession=0;
  const animations=[];
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  const aborter=new AbortController();
  const listen=(element,event,handler)=>element.addEventListener(event,handler,{signal:aborter.signal});
  host.innerHTML=`<header class="review-heading"><p class="eyebrow">МАЙСТЕРНЯ · ВАРІАНТИ ДЛЯ ПОРІВНЯННЯ</p><h2>Той самий бій. Інший погляд.</h2><p>Обраний фон — «Похмурий день». У грі розмова показана до пояса, потім бій переходить на повний зріст. Інші варіанти збережено для порівняння.</p></header>
    <div class="review-backgrounds" role="group" aria-label="Фон для порівняння">${BACKGROUNDS.map(([id,label,file])=>`<button type="button" data-background="${id}" aria-pressed="${id==='a'}"><img src="${ASSETS}battle/${file}" alt="" loading="lazy"><span>${label}</span></button>`).join('')}</div>
    <div class="review-framings">${FRAMINGS.map(([id,label])=>`<article class="review-card"><header><h3>${label}</h3><span>${id==='full'?'Блуд на 20% вищий':'Кандидат'}</span></header><div class="review-battle-preview" data-framing="${id}"></div><button type="button" class="review-try" data-try="${id}">${id==='full'?'Діалог → бій ↗':'Спробувати кадрування ↗'}</button></article>`).join('')}</div>
    <header class="review-idle-heading"><div><p class="eyebrow">РУХ У СПОКОЇ</p><h2>Герой та Лакі</h2><p>У грі герой випадково обирає спокійний idle, а через 5 с тупотить ногою. Лакі сидить спокійно й раз на 10 с озирається. Попередні рухи збережено для порівняння.</p></div><button class="review-pause" type="button" aria-pressed="false">Пауза анімацій</button></header>
    <div class="review-idles" aria-live="polite"><p class="review-loading">Готуємо анімації…</p></div>
    <dialog class="review-trial" aria-label="Тест кадрування бою"><div class="review-trial-header"><strong>Порівняння · <span data-trial-title></span></strong><button type="button" class="review-trial-close" aria-label="Закрити тест бою">Закрити ×</button></div><div class="review-trial-stage"></div></dialog>`;
  const modal=host.querySelector('.review-trial');
  const redrawPreviews=()=>{
    previews.forEach(preview=>preview.destroy());
    previews=FRAMINGS.map(([framing])=>mountBattlePreview({host:host.querySelector(`[data-framing="${framing}"]`),framing,background}));
  };
  redrawPreviews();
  listen(host,'click',async event=>{
    const selection=event.target.closest('[data-background]');
    if(selection){
      background=`${ASSETS}battle/${BACKGROUNDS.find(([id])=>id===selection.dataset.background)[2]}`;
      host.querySelectorAll('[data-background]').forEach(button=>button.setAttribute('aria-pressed',String(button===selection)));
      redrawPreviews();
    }
    const test=event.target.closest('[data-try]');
    if(test && !modal.open && canOpen()){
      const session=++trialSession, selectedBackground=background;
      host.querySelector('[data-trial-title]').textContent=FRAMINGS.find(([id])=>id===test.dataset.try)[1];
      modal.showModal();onOpen();
      const stage=host.querySelector('.review-trial-stage');
      stage.textContent='Готуємо бій…';
      try{
        await preloadBattleAssets({background:selectedBackground});
        if(destroyed||!modal.open||session!==trialSession)return;
        stage.textContent='';
        const currentTrial=createBattle({host:stage,framing:test.dataset.try,background:selectedBackground,language:'uk',onSound,intro:test.dataset.try==='full'});
        trial=currentTrial;
        await currentTrial.start();
        if(!destroyed&&modal.open&&session===trialSession)modal.close();
      }catch(error){ if(session===trialSession&&!destroyed){console.error(error);stage.textContent='Не вдалося завантажити бій. Закрий вікно та спробуй ще раз.';} }
    }
  });
  listen(host.querySelector('.review-trial-close'),'click',()=>modal.close());
  listen(modal,'close',()=>{trialSession++;trial?.destroy();trial=null;onClose();});
  listen(host.querySelector('.review-pause'),'click',event=>{
    paused=!paused;event.currentTarget.setAttribute('aria-pressed',String(paused));
    event.currentTarget.textContent=paused?'Продовжити анімації':'Пауза анімацій';
  });
  function render(now){
    if(destroyed)return;
    for(const actor of animations){
      if(!visible||document.hidden)continue;
      if(!paused&&!motion.matches)actor.elapsed+=Math.min(now-(actor.last||now),100);
      actor.last=now;
      let index=Math.floor(actor.elapsed*(actor.config.frameRate||4)/1000)%actor.frames.length;
      if(actor.config.frameDurationsMs){
        let phase=actor.elapsed%actor.config.frameDurationsMs.reduce((total,ms)=>total+ms,0);
        index=0;
        while(index<actor.frames.length-1&&phase>=actor.config.frameDurationsMs[index])phase-=actor.config.frameDurationsMs[index++];
      }
      const frame=actor.frames[index];
      const rect=actor.config.frameRects[frame],origin=frameOriginPixels(actor.config,frame);
      const scale=actor.config.displayHeight/(actor.config.referenceFrameHeight||actor.config.frameHeight)*1.65*(actor.config.frameScaleMultipliers?.[frame]||1)*(actor.size||1);
      const offset=actor.config.frameOffsets?.[frame]||actor.config.offset||[0,0];
      const ctx=actor.ctx;ctx.clearRect(0,0,320,230);
      ctx.fillStyle='#07100b55';ctx.beginPath();ctx.ellipse(160,205,actor.size?28:38,7,0,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='#80917d33';ctx.beginPath();ctx.moveTo(24,205);ctx.lineTo(296,205);ctx.stroke();
      ctx.drawImage(actor.image,rect.x,rect.y,rect.width,rect.height,160+(offset[0]-origin[0])*scale,205+(offset[1]-origin[1])*scale,rect.width*scale,rect.height*scale);
    }
    raf=requestAnimationFrame(render);
  }
  async function mountIdles(){
    const grid=host.querySelector('.review-idles');
    try{
      const [manifest,states,candidates]=await Promise.all([loadJSON('map-sprites/manifest.json'),loadJSON('map-sprites/character-states-v1.json'),loadJSON('map-sprites/idle-candidates-v1.json')]);
      const walking=manifest.actors.find(a=>a.id==='hero'),lucky=manifest.actors.find(a=>a.id==='moth');
      const entries=[
        ['Ходьба · еталон пропорцій','Для порівняння голови та зросту.',{...walking,file:`map-sprites/${walking.file}`},'SE'],
        ['Попередній idle · збережено','Знайомий рух до правки пропорцій.',states.entries.heroIdle,'SE'],
        ['Idle · виправлені пропорції','Менша голова, плащ уздовж тіла.',candidates.entries.heroIdleCorrected,'SE'],
        ['Герой · спокійне очікування','Ледь помітне дихання й кліпання.',candidates.entries.heroQuiet,'SE'],
        ['Герой · нетерпляча нога','Коротке постукування ногою.',candidates.entries.heroTap,'SE'],
        ['Лакі · попередній рух','Помахи крил; збережено для порівняння.',{...lucky,file:`map-sprites/${lucky.file}`},'idle',.768],
        ['Лакі · сидить спокійно','Складені крила, очі та вусики.',candidates.entries.luckyPerched,'idle',.768],
        ['Лакі · цікавий погляд','Невеликий нахил голови.',candidates.entries.luckyCurious,'idle',.768],
      ].filter(([, ,entry])=>entry);
      const loaded=await Promise.all(entries.map(async([title,description,config,direction,size])=>{
        const image=await loadImage(`${ASSETS}${config.file}`);
        return{title,description,config:{...config,...spriteLayout(config,image.width,image.height)},image,direction,size};
      }));
      if(destroyed)return;
      grid.replaceChildren();
      for(const actor of loaded){
        const card=document.createElement('article');card.className='review-idle-card';
        const canvas=document.createElement('canvas');canvas.width=640;canvas.height=460;canvas.setAttribute('role','img');canvas.setAttribute('aria-label',actor.title);
        const title=document.createElement('h3');title.textContent=actor.title;
        const description=document.createElement('p');description.textContent=actor.description;
        card.append(canvas,title,description);grid.append(card);
        const ctx=canvas.getContext('2d');ctx.scale(2,2);ctx.imageSmoothingEnabled=false;
        const frames=actor.config.animations[actor.direction]||actor.config.animations.idle||Object.values(actor.config.animations)[0];
        animations.push({...actor,ctx,frames,elapsed:0,last:0});
      }
      raf=requestAnimationFrame(render);
    }catch(error){console.error(error);grid.textContent='Не вдалося завантажити порівняння анімацій. Онови сторінку, щоб спробувати ще раз.';}
  }
  const observer=new IntersectionObserver(([entry])=>{
    visible=entry.isIntersecting;
    if(visible&&!started){started=true;mountIdles();}
  },{rootMargin:'160px'});
  observer.observe(host.querySelector('.review-idles'));
  return{
    setTrialEnabled(enabled){host.querySelectorAll('[data-try]').forEach(button=>{button.disabled=!enabled;button.title=enabled?'':'Заверши поточний бій, щоб відкрити тест.';});},
    destroy(){destroyed=true;observer.disconnect();aborter.abort();cancelAnimationFrame(raf);trial?.destroy();previews.forEach(preview=>preview.destroy());host.replaceChildren();}
  };
}
