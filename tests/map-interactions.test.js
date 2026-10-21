import test from 'node:test';
import assert from 'node:assert/strict';
import { CLEARING } from '../src/content/clearing.js';
import { createClearingState, attemptClearingMoveTo, isWalkable } from '../src/domain/clearing.js';
import { bludNoticeRadius, noticesHero, nearRock, planRockApproach } from '../src/domain/map-interactions.js';

test('Blud starts calm and notices only the final 30 percent of the initial straight-line distance', () => {
  const radius = bludNoticeRadius(CLEARING);
  assert.ok(radius > 127 && radius < 129);
  assert.equal(noticesHero(CLEARING, CLEARING.spawn), false);
  assert.equal(noticesHero(CLEARING, {x:CLEARING.enemy.x-100,y:CLEARING.enemy.y}), true);
  assert.equal(noticesHero(CLEARING, {x:CLEARING.enemy.x-150,y:CLEARING.enemy.y}), false);
});
test('notice hysteresis avoids switching poses on every small boundary step', () => {
  const point={x:CLEARING.enemy.x-bludNoticeRadius(CLEARING)-6,y:CLEARING.enemy.y};
  assert.equal(noticesHero(CLEARING,point),false);
  assert.equal(noticesHero(CLEARING,point,true),true);
});
test('clicking the boulder approaches a legal nearby point and never walks onto it', () => {
  let state=createClearingState(CLEARING);
  const route=planRockApproach(CLEARING,state.position);
  assert.equal(route.status,'accepted');
  assert.ok(route.path.length>0);
  for(const point of route.path){
    const result=attemptClearingMoveTo(state,point,CLEARING);
    assert.equal(result.events[0].type,'moved');
    state=result.state;
    assert.ok(isWalkable(CLEARING,state.position.x,state.position.y));
  }
  assert.ok(nearRock(CLEARING,state.position));
  assert.deepEqual(planRockApproach(CLEARING,state.position).path,[]);
});
test('rock interaction works from the other side of the obstacle without crossing it', () => {
  const world={...CLEARING,enemy:null};
  const from={x:1191,y:518};
  assert.ok(isWalkable(world,from.x,from.y));
  const route=planRockApproach(world,from);
  assert.equal(route.status,'accepted');
  assert.ok(nearRock(world,route.target));
});
