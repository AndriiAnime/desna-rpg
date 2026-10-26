import { CLEARING } from './content/clearing.js';
import { isWalkable, planRoute, attemptClearingMoveTo, attemptClearingMove } from './domain/clearing.js';
import { directionFromVector } from './content/movement.js';

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
export function mountExploration(stage, { world='clearing', start, targets=[], signal, onArrive, language='uk' }) {
  const geometry = SCENE_WORLDS[world];
  const art = stage.querySelector('.scene-art'), hero=art.querySelector('.hero-map');
  let state={position:{...(start || geometry.spawn)},facing:'down',steps:0};
  let path=[], raf=0, disposed=false, done=false, last=performance.now(), invalidTimer;
  const keys=new Set();
  const marker=document.createElement('div');marker.className='map-destination';marker.hidden=true;art.append(marker);
  const controls=document.createElement('div');controls.className='preview-dpad';
  controls.innerHTML=['↖','↑','↗','←','•','→','↙','↓','↘'].map((label,i)=>`<button data-move="${i}" aria-label="${label}" ${i===4?'disabled':''}>${label}</button>`).join('');stage.append(controls);
  stage.classList.add('exploring'); hero.style.transition='none';
  const render=()=>{hero.style.left=`${state.position.x/geometry.width*100}%`;hero.style.top=`${state.position.y/geometry.height*100}%`;};render();
  const reached=()=>{
    const target=targets.find(t=>Math.hypot(state.position.x-t.x,state.position.y-t.y)<(t.radius||52));
    if(target&&!done){done=true;dispose();onArrive(target.id,state.position);return true;}return false;
  };
  const showMarker=(point,valid)=>{clearTimeout(invalidTimer);marker.style.left=`${point.x/geometry.width*100}%`;marker.style.top=`${point.y/geometry.height*100}%`;marker.dataset.valid=String(valid);marker.hidden=false;if(!valid)invalidTimer=setTimeout(()=>marker.hidden=true,650);};
  const go=point=>{if(done)return;const result=planRoute(geometry,state.position,point);showMarker(point,result.status==='accepted');if(result.status==='accepted'){path=result.path;keys.clear();}};
  for(const target of targets){
    const npc=stage.querySelector(target.selector);if(!npc)continue;
    npc.classList.add('approach-target');npc.setAttribute('role','button');npc.tabIndex=0;npc.setAttribute('aria-label',target.label||target.id);
    // Targets are anchored at their walkable approach point, never at the portrait's head.
    if(target.position!==false){npc.style.left=`${target.x/geometry.width*100}%`;npc.style.top=`${target.y/geometry.height*100}%`;}
    npc.addEventListener('click',event=>{event.stopPropagation();go(target);},{signal});
    npc.addEventListener('keydown',event=>{if(event.code==='Enter'||event.code==='Space'){event.preventDefault();event.stopPropagation();go(target);}},{signal});
  }
  stage.addEventListener('click',event=>{if(event.target.closest('button,[role=button],.dialogue-dock'))return;const bounds=art.getBoundingClientRect();go({x:(event.clientX-bounds.left)/bounds.width*geometry.width,y:(event.clientY-bounds.top)/bounds.height*geometry.height});},{signal});
  const keydown=event=>{if(!keyVectors[event.code]||event.target.closest('select,input,textarea'))return;event.preventDefault();keys.add(event.code);path=[];marker.hidden=true;};
  const keyup=event=>keys.delete(event.code);
  window.addEventListener('keydown',keydown,{signal});window.addEventListener('keyup',keyup,{signal});
  window.addEventListener('blur',()=>keys.clear(),{signal});
  controls.querySelectorAll('[data-move]').forEach(button=>{
    const i=+button.dataset.move, vector=[i%3-1,Math.floor(i/3)-1];
    button.addEventListener('pointerdown',event=>{event.preventDefault();button.setPointerCapture(event.pointerId);keys.clear();keys.add(`pad:${vector}`);path=[];marker.hidden=true;},{signal});
    for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,()=>keys.clear(),{signal});
  });
  function tick(now){
    if(disposed)return;const dt=Math.min((now-last)/1000,.05);last=now;
    let dx=0,dy=0;for(const key of keys){const v=key.startsWith('pad:')?key.slice(4).split(',').map(Number):keyVectors[key];dx+=v[0];dy+=v[1];}
    const from=state.position;
    if(dx||dy){const magnitude=Math.hypot(dx,dy), direction=directionFromVector(dx,dy);const bounds=art.getBoundingClientRect();
      // Convert a constant on-screen speed to artwork units for every direction.
      const pixelDistance=175*dt; const step=pixelDistance/Math.hypot(dx/magnitude*bounds.width/geometry.width,dy/magnitude*bounds.height/geometry.height);
      state=attemptClearingMove(state,direction,{...geometry,step},{slide:true}).state;
    }else if(path.length){const target=path[0],rx=target.x-from.x,ry=target.y-from.y;const bounds=art.getBoundingClientRect();const screenDistance=Math.hypot(rx*bounds.width/geometry.width,ry*bounds.height/geometry.height);const fraction=Math.min(1,175*dt/Math.max(screenDistance,.001));
      state=attemptClearingMoveTo(state,{x:from.x+rx*fraction,y:from.y+ry*fraction},geometry).state;
      if(fraction===1)path.shift();
    }
    const moved=Math.hypot(state.position.x-from.x,state.position.y-from.y)>.01;hero.classList.toggle('preview-moving',moved);
    if(moved){hero.dataset.facing=facing(state.position.x-from.x,state.position.y-from.y);render();if(reached())return;}
    if(!path.length&&marker.dataset.valid==='true')marker.hidden=true;
    raf=requestAnimationFrame(tick);
  }
  function dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(raf);clearTimeout(invalidTimer);hero.classList.remove('preview-moving');controls.remove();marker.remove();stage.classList.remove('exploring');}
  signal.addEventListener('abort',dispose,{once:true});raf=requestAnimationFrame(tick);stage.focus({preventScroll:true});
  return {dispose,go,position:()=>({...state.position})};
}
