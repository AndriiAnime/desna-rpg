import { CLEARING } from './content/clearing.js';
import { planRoute, attemptClearingMoveTo, attemptClearingMove } from './domain/clearing.js';
import { directionFromVector } from './content/movement.js';
import { nearRock, planRockApproach } from './domain/map-interactions.js';

export const MAP_MOVEMENT_SPEED = 210;

// After covering 30% of the start-to-Blud line, enter his remaining 70% radius.
export function sceneBludAlert(position, start, enemy, alreadyAlert = false) {
  const radius = Math.hypot(start.x - enemy.x, start.y - enemy.y) * .7 + (alreadyAlert ? 12 : 0);
  return Math.hypot(position.x - enemy.x, position.y - enemy.y) <= radius;
}

const road = (points, radius = 48) => ({ points, radius });
export const SCENE_WORLDS = {
  clearing: { ...CLEARING, enemy: null, spawn: { x: 730, y: 285 } },
  river: { width:1402, height:1122, step:12, footprint:5, spawn:{x:280,y:840}, roads:[
    road([[60,990],[280,840],[450,730],[590,650],[700,630],[830,550],[940,470],[1040,370],[1130,280],[1260,135]],42),
    road([[590,650],[510,570],[430,490],[350,435],[270,425]],58),
  ] },
  mountain: { width:1402,height:1122,step:12,footprint:5,spawn:{x:300,y:880},roads:[
    road([[60,1030],[300,880],[440,820],[600,720],[760,640],[830,540],[900,440],[950,340],[1100,250],[1150,180],[1110,120]],42),
    road([[600,720],[490,650],[370,620]],62),
  ] },
};
const keyVectors = {KeyW:[0,-1],ArrowUp:[0,-1],KeyS:[0,1],ArrowDown:[0,1],KeyA:[-1,0],ArrowLeft:[-1,0],KeyD:[1,0],ArrowRight:[1,0]};
const facing = (x,y) => x < 0 ? (y < 0 ? 'NW':'SW') : (y < 0 ? 'NE':'SE');

/** Same collision/path planner as Alpha 2, rendered against each scene's map surface. */
export function mountExploration(stage, { world='clearing', start, targets=[], signal, onArrive, language='uk', rockHintSeen=false, onRock }) {
  const geometry = SCENE_WORLDS[world];
  const art = stage.querySelector('.scene-art'), hero=art.querySelector('.hero-map');
  let state={position:{...(start || geometry.spawn)},facing:'down',steps:0};
  let path=[], raf=0, disposed=false, done=false, paused=false, last=performance.now(), invalidTimer;
  let rockSeen=rockHintSeen, bludAlert=false;
  const startingPosition={...state.position}, listeners=new AbortController(), listenerSignal=listeners.signal;
  const blud=stage.querySelector('.blud-map'), bludTarget=targets.find(target=>target.id==='blud');
  stage.dataset.rockHintSeen=String(rockSeen);
  const updateBlud=()=>{if(blud&&bludTarget){bludAlert=sceneBludAlert(state.position,startingPosition,bludTarget,bludAlert);blud.dataset.alert=String(bludAlert);}};
  updateBlud();
  const keys=new Set();
  const marker=document.createElement('div');marker.className='map-destination';marker.hidden=true;art.append(marker);
  const controls=document.createElement('div');controls.className='preview-dpad';
  controls.innerHTML=['↖','↑','↗','←','•','→','↙','↓','↘'].map((label,i)=>`<button data-move="${i}" aria-label="${label}" ${i===4?'disabled':''}>${label}</button>`).join('');stage.append(controls);
  stage.classList.add('exploring'); hero.style.transition='none';
  let rockTarget;
  if(geometry.rock && onRock && !rockSeen){
    const rock=geometry.rock;rockTarget=document.createElement('button');rockTarget.type='button';rockTarget.className='rock-interaction';
    rockTarget.setAttribute('aria-label',language==='uk'?'Оглянути камінь':'Inspect the rock');
    rockTarget.style.cssText=`position:absolute;left:${rock.x/geometry.width*100}%;top:${(rock.y-24)/geometry.height*100}%;width:${174/geometry.width*100}%;height:${148/geometry.height*100}%;transform:translate(-50%,-50%);background:transparent;border:0;border-radius:50%;padding:0;z-index:6;cursor:url('${import.meta.env?.BASE_URL || '/'}assets/ui/cursor-question.svg') 4 3,help`;
    art.append(rockTarget);
    rockTarget.addEventListener('click',event=>{event.stopPropagation();if(disposed||done||paused)return;const result=planRockApproach(geometry,state.position);showMarker(result.target,result.status==='accepted');if(result.status==='accepted'){path=result.path;keys.clear();checkRock();}},{signal:listenerSignal});
    rockTarget.addEventListener('keydown',event=>{if(event.code==='Enter'||event.code==='Space')event.stopPropagation();},{signal:listenerSignal});
  }
  const render=()=>{hero.style.left=`${state.position.x/geometry.width*100}%`;hero.style.top=`${state.position.y/geometry.height*100}%`;};render();
  const checkRock=()=>{
    if(!geometry.rock||rockSeen||!onRock||!nearRock(geometry,state.position))return false;
    rockSeen=true;paused=true;path=[];keys.clear();marker.hidden=true;hero.classList.remove('preview-moving');
    stage.dataset.rockHintSeen='true';rockTarget?.remove();controls.hidden=true;
    onRock({...state.position},()=>{
      // The key/click that dismisses the line must not also start a new journey.
      queueMicrotask(()=>{if(disposed)return;keys.clear();paused=false;controls.hidden=false;last=performance.now();stage.focus({preventScroll:true});});
    });
    return true;
  };
  const reached=()=>{
    const target=targets.find(t=>Math.hypot(state.position.x-t.x,state.position.y-t.y)<(t.radius||52));
    if(target&&!done){done=true;dispose();onArrive(target.id,state.position);return true;}return false;
  };
  const showMarker=(point,valid)=>{clearTimeout(invalidTimer);marker.style.left=`${point.x/geometry.width*100}%`;marker.style.top=`${point.y/geometry.height*100}%`;marker.dataset.valid=String(valid);marker.hidden=false;if(!valid)invalidTimer=setTimeout(()=>marker.hidden=true,650);};
  const go=point=>{if(done||disposed||paused)return;const result=planRoute(geometry,state.position,point);showMarker(point,result.status==='accepted');if(result.status==='accepted'){path=result.path;keys.clear();}};
  for(const target of targets){
    const npc=stage.querySelector(target.selector);if(!npc)continue;
    npc.classList.add('approach-target');npc.setAttribute('role','button');npc.tabIndex=0;npc.setAttribute('aria-label',target.label||target.id);
    // Targets are anchored at their walkable approach point, never at the portrait's head.
    if(target.position!==false){npc.style.left=`${target.x/geometry.width*100}%`;npc.style.top=`${target.y/geometry.height*100}%`;}
    npc.addEventListener('click',event=>{event.stopPropagation();go(target);},{signal:listenerSignal});
    npc.addEventListener('keydown',event=>{if(event.code==='Enter'||event.code==='Space'){event.preventDefault();event.stopPropagation();go(target);}},{signal:listenerSignal});
  }
  stage.addEventListener('click',event=>{if(event.target.closest('button,[role=button],.dialogue-dock'))return;const bounds=art.getBoundingClientRect();go({x:(event.clientX-bounds.left)/bounds.width*geometry.width,y:(event.clientY-bounds.top)/bounds.height*geometry.height});},{signal:listenerSignal});
  const keydown=event=>{if(disposed||done||paused||!keyVectors[event.code]||event.target.closest('select,input,textarea'))return;event.preventDefault();keys.add(event.code);path=[];marker.hidden=true;};
  const keyup=event=>keys.delete(event.code);
  window.addEventListener('keydown',keydown,{signal:listenerSignal});window.addEventListener('keyup',keyup,{signal:listenerSignal});
  window.addEventListener('blur',()=>keys.clear(),{signal:listenerSignal});
  controls.querySelectorAll('[data-move]').forEach(button=>{
    const i=+button.dataset.move, vector=[i%3-1,Math.floor(i/3)-1];
    button.addEventListener('pointerdown',event=>{event.preventDefault();if(disposed||done||paused)return;button.setPointerCapture(event.pointerId);keys.clear();keys.add(`pad:${vector}`);path=[];marker.hidden=true;},{signal:listenerSignal});
    for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,()=>keys.clear(),{signal:listenerSignal});
  });
  function tick(now){
    if(disposed)return;if(paused){last=now;raf=requestAnimationFrame(tick);return;}const dt=Math.min((now-last)/1000,.05);last=now;
    let dx=0,dy=0;for(const key of keys){const v=key.startsWith('pad:')?key.slice(4).split(',').map(Number):keyVectors[key];dx+=v[0];dy+=v[1];}
    const from=state.position;
    if(dx||dy){const magnitude=Math.hypot(dx,dy), direction=directionFromVector(dx,dy);const bounds=art.getBoundingClientRect();
      // Convert a constant on-screen speed to artwork units for every direction.
      const pixelDistance=MAP_MOVEMENT_SPEED*dt; const step=pixelDistance/Math.hypot(dx/magnitude*bounds.width/geometry.width,dy/magnitude*bounds.height/geometry.height);
      state=attemptClearingMove(state,direction,{...geometry,step},{slide:true}).state;
    }else if(path.length){
      const bounds=art.getBoundingClientRect();let remaining=MAP_MOVEMENT_SPEED*dt;
      // Spend the same screen-space distance across every small route segment;
      // small mobile tiles must not cap point-and-click movement at one tile/frame.
      while(path.length&&remaining>.0001){
        const target=path[0],from=state.position,rx=target.x-from.x,ry=target.y-from.y;
        const screenDistance=Math.hypot(rx*bounds.width/geometry.width,ry*bounds.height/geometry.height);
        if(screenDistance<.001){path.shift();continue;}
        const fraction=Math.min(1,remaining/screenDistance);
        state=attemptClearingMoveTo(state,{x:from.x+rx*fraction,y:from.y+ry*fraction},geometry).state;
        if(fraction===1)path.shift();
        remaining-=Math.max(screenDistance*fraction,.001);
        if(state.position.x===from.x&&state.position.y===from.y){path=[];break;}
      }
    }
    const moved=Math.hypot(state.position.x-from.x,state.position.y-from.y)>.01;hero.classList.toggle('preview-moving',moved);
    if(moved){hero.dataset.facing=facing(state.position.x-from.x,state.position.y-from.y);render();updateBlud();if(checkRock()){raf=requestAnimationFrame(tick);return;}if(reached())return;}
    if(!path.length&&marker.dataset.valid==='true')marker.hidden=true;
    raf=requestAnimationFrame(tick);
  }
  function dispose(){if(disposed)return;disposed=true;listeners.abort();cancelAnimationFrame(raf);clearTimeout(invalidTimer);hero.classList.remove('preview-moving');controls.remove();marker.remove();rockTarget?.remove();stage.classList.remove('exploring');}
  signal.addEventListener('abort',dispose,{once:true});if(signal.aborted)dispose();else raf=requestAnimationFrame(tick);stage.focus({preventScroll:true});
  return {dispose,go,position:()=>({...state.position})};
}
