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
