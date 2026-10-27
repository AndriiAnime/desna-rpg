import test from 'node:test';
import assert from 'node:assert/strict';
import { SCENE_WORLDS } from '../src/scene-exploration.js';
import { isWalkable, planRoute, attemptClearingMoveTo } from '../src/domain/clearing.js';

// Story approach coordinates are intentional fixtures: changing a road must not
// strand an NPC or a hero returned by a cutscene, even if the road itself is valid.
const approaches = [
  ['clearing', 'intro spawn → tutorial minion', null, { x: 798, y: 505 }],
  ['clearing', 'post-tutorial junction → Blud', { x: 834, y: 432 }, { x: 1106, y: 826 }],
  ['river', 'entrance → blacksmith', null, { x: 350, y: 435 }],
  ['river', 'entrance → Rusalka on the pier', null, { x: 1080, y: 330 }],
  ['river', 'tail knockback → blacksmith', { x: 600, y: 665 }, { x: 350, y: 435 }],
  ['river', 'blacksmith → Rusalka', { x: 350, y: 435 }, { x: 1080, y: 330 }],
  ['river', 'blacksmith cutscene return → Rusalka', { x: 350, y: 475 }, { x: 1080, y: 330 }],
  ['mountain', 'entrance → ancestor altar', null, { x: 1110, y: 185 }],
  ['mountain', 'forest guardian branch → ancestor altar', { x: 370, y: 620 }, { x: 1110, y: 185 }],
  ['mountain', 'victory return → ancestor altar', { x: 900, y: 440 }, { x: 1110, y: 185 }],
];

function walkPlannedRoute(world, from, target) {
  assert.ok(isWalkable(world, from.x, from.y), 'The story spawn is on usable ground');
  assert.ok(isWalkable(world, target.x, target.y), 'The NPC/altar approach is on usable ground');
  const plan = planRoute(world, from, target);
  assert.equal(plan.status, 'accepted');
  assert.equal(plan.encounter, false, 'Scene NPC arrival is handled by exploration, not the Alpha 2 enemy collider');
  assert.ok(plan.path.length > 0);
  assert.deepEqual(plan.path.at(-1), target, 'The click reaches its exact location rather than snapping');
  let state = { position: { ...from }, facing: 'down', steps: 0 };
  for (const waypoint of plan.path) {
    const start = state.position;
    const distance = Math.hypot(waypoint.x - start.x, waypoint.y - start.y);
    assert.ok(distance <= world.step * Math.SQRT2 + 1e-8, 'Waypoints remain within a navigable lattice step');
    // Inspect the full swept segment, not only its valid endpoints: diagonal
    // corner cuts can otherwise cross water, the boulder or mountain scenery.
    const samples = Math.max(1, Math.ceil(distance / 2));
    for (let i = 0; i <= samples; i++) {
      const x = start.x + (waypoint.x - start.x) * i / samples;
      const y = start.y + (waypoint.y - start.y) * i / samples;
      assert.ok(isWalkable(world, x, y), `Route crosses blocked ground at ${x}, ${y}`);
    }
    const move = attemptClearingMoveTo(state, waypoint, world);
    assert.deepEqual(move.events.map(event => event.type), ['moved'], 'The collision engine accepts each planned segment');
    state = move.state;
  }
  assert.deepEqual(state.position, target);
  return plan;
}

for (const [location, label, start, target] of approaches) {
  test(`scene exploration: ${label} is reachable without leaving ${location} roads`, () => {
    const world = SCENE_WORLDS[location];
    const plan = walkPlannedRoute(world, start || world.spawn, target);
    if (location === 'clearing' && target.x === 1106) {
      assert.ok(plan.path.some(point => point.x < 300 && point.y > 800), 'Blud still requires the lower loop around the boulder');
    }
  });
}

test('scene exploration rejects water, scenery, the clearing boulder and off-map clicks without snapping', () => {
  const forbidden = {
    clearing: [{ x: 1105, y: 455 }, { x: 600, y: 500 }, { x: 500, y: 200 }],
    river: [{ x: 1200, y: 550 }, { x: 1000, y: 50 }, { x: 750, y: 150 }],
    mountain: [{ x: 1080, y: 600 }, { x: 500, y: 300 }, { x: 1240, y: 185 }],
  };
  for (const [location, world] of Object.entries(SCENE_WORLDS)) {
    const outside = [{ x: -1, y: 100 }, { x: world.width + 1, y: 100 }, { x: 100, y: -1 }, { x: 100, y: world.height + 1 }];
    for (const target of [...forbidden[location], ...outside]) {
      assert.equal(isWalkable(world, target.x, target.y), false, `${location}: ${JSON.stringify(target)}`);
      assert.deepEqual(planRoute(world, world.spawn, target), { status: 'invalid', path: [], target, encounter: false });
      const state = { position: { ...world.spawn }, facing: 'down', steps: 0 };
      const move = attemptClearingMoveTo(state, target, world);
      assert.equal(move.events[0].type, 'blocked');
      assert.deepEqual(move.state.position, state.position, 'Direct movement cannot bypass forbidden terrain');
      assert.equal(move.state.steps, 0);
    }
  }
});

test('scene exploration cannot shortcut the river branch or mountain bends between valid endpoints', () => {
  for (const [location, from, to] of [
    ['river', { x: 350, y: 435 }, { x: 1080, y: 330 }],
    ['mountain', { x: 370, y: 620 }, { x: 1110, y: 185 }],
  ]) {
    const world = SCENE_WORLDS[location];
    assert.ok(isWalkable(world, from.x, from.y) && isWalkable(world, to.x, to.y));
    const state = { position: from, facing: 'down', steps: 0 };
    const direct = attemptClearingMoveTo(state, to, world);
    assert.deepEqual(direct.events, [{ type: 'blocked', reason: 'terrain' }]);
    assert.deepEqual(direct.state.position, from);
    assert.equal(planRoute(world, from, to).status, 'accepted', 'The road detour remains available');
  }
});

import { mountExploration, sceneBludAlert } from '../src/scene-exploration.js';
import { nearRock } from '../src/domain/map-interactions.js';

function explorationHarness({start={x:834,y:432},world='clearing',onRock,rockHintSeen=false,scale=1}={}) {
  class Element extends EventTarget {
    constructor(){super();this.style={};this.dataset={};this.children=[];this.classes=new Set();this.classList={add:x=>this.classes.add(x),remove:x=>this.classes.delete(x),contains:x=>this.classes.has(x),toggle:(x,on)=>on?this.classes.add(x):this.classes.delete(x)};}
    append(child){child.parent=this;this.children.push(child);}
    remove(){if(this.parent)this.parent.children=this.parent.children.filter(child=>child!==this);}
    setAttribute(){} focus(){} closest(){return null;}
    querySelectorAll(){return [];}
  }
  const stage=new Element(),art=new Element(),hero=new Element(),blud=new Element(),win=new Element();
  stage.querySelector=selector=>selector==='.scene-art'?art:selector==='.blud-map'?blud:null;
  art.querySelector=selector=>selector==='.hero-map'?hero:null;
  art.getBoundingClientRect=()=>({left:0,top:0,width:SCENE_WORLDS[world].width*scale,height:SCENE_WORLDS[world].height*scale});
  let now=performance.now(),id=0;const frames=new Map();
  const saved=Object.fromEntries(['window','document','requestAnimationFrame','cancelAnimationFrame'].map(key=>[key,globalThis[key]]));
  Object.assign(globalThis,{window:win,document:{createElement:()=>new Element()},requestAnimationFrame:callback=>{frames.set(++id,callback);return id;},cancelAnimationFrame:key=>frames.delete(key)});
  const signal=new AbortController();
  const controller=mountExploration(stage,{world,start,targets:[{id:'blud',selector:'.blud-map',x:1106,y:826}],onArrive(){},onRock,rockHintSeen,signal:signal.signal});
  return {stage,art,blud,controller,
    key(code){const event=new Event('keydown',{cancelable:true});Object.defineProperty(event,'code',{value:code});win.dispatchEvent(event);},
    tick(ms=16){now+=ms;const [key,callback]=frames.entries().next().value||[];if(callback){frames.delete(key);callback(now);}},
    close(){signal.abort();for(const [key,value] of Object.entries(saved)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}}};
}

test('Blud starts calm and beckons after 30% of the straight approach, with a stable boundary',()=>{
  const start={x:0,y:0},enemy={x:1000,y:0};
  assert.equal(sceneBludAlert(start,start,enemy),false);
  assert.equal(sceneBludAlert({x:299,y:0},start,enemy),false);
  assert.equal(sceneBludAlert({x:300,y:0},start,enemy),true);
  assert.equal(sceneBludAlert({x:290,y:0},start,enemy,true),true);
  assert.equal(sceneBludAlert({x:270,y:0},start,enemy,true),false);
});

test('the rock click reaches accessible ground, pauses once, and leaves Lucky after resuming',async()=>{
  let calls=0,resume;
  const h=explorationHarness({onRock:(position,continueWalking)=>{calls++;resume=continueWalking;assert.ok(nearRock(SCENE_WORLDS.clearing,position));assert.ok(isWalkable(SCENE_WORLDS.clearing,position.x,position.y));}});
  try{
    const rock=h.art.children.find(child=>child.className==='rock-interaction');assert.ok(rock);
    rock.dispatchEvent(new Event('click'));
    for(let i=0;i<500&&!calls;i++)h.tick();
    assert.equal(calls,1,JSON.stringify(h.controller.position()));assert.equal(h.stage.dataset.rockHintSeen,'true');
    const stopped=h.controller.position();h.controller.go({x:834,y:432});h.tick();assert.deepEqual(h.controller.position(),stopped);
    resume();h.key('KeyD');await Promise.resolve();h.tick();assert.deepEqual(h.controller.position(),stopped,'The dismissal key does not leak into map movement');
    h.controller.go({x:834,y:432});for(let i=0;i<100;i++)h.tick();
    assert.equal(calls,1,JSON.stringify(h.controller.position()));assert.equal(h.stage.dataset.rockHintSeen,'true');
    assert.equal(h.art.children.some(child=>child.className==='rock-interaction'),false);
    h.controller.dispose();const disposed=h.controller.position();h.key('KeyD');h.tick();assert.deepEqual(h.controller.position(),disposed);
  }finally{h.close();}
});

test('walking near the rock triggers the same secret without a rock click, and seen state suppresses it',()=>{
  let calls=0;
  const h=explorationHarness({start:{x:975,y:438},onRock:()=>calls++});
  try{h.key('KeyD');for(let i=0;i<20&&!calls;i++)h.tick();assert.equal(calls,1);}finally{h.close();}
  const seen=explorationHarness({start:{x:975,y:438},rockHintSeen:true,onRock:()=>calls++});
  try{seen.key('KeyD');for(let i=0;i<20;i++)seen.tick();assert.equal(calls,1);assert.equal(seen.art.children.some(child=>child.className==='rock-interaction'),false);}finally{seen.close();}
});

test('small-screen click travel spends the entire movement budget across route tiles',()=>{
  const h=explorationHarness({start:{x:930,y:438},scale:.15});
  try{
    h.controller.go({x:990,y:438});h.tick();const from=h.controller.position();h.tick();const to=h.controller.position();
    const moved=Math.hypot(to.x-from.x,to.y-from.y)*.15;
    assert.ok(Math.abs(moved-210*.016)<.04,`Expected 210 screen px/s, got ${moved/.016}`);
  }finally{h.close();}
});
