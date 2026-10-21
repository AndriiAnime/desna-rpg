import test from "node:test";
import assert from "node:assert/strict";
import { CLEARING } from "../src/content/clearing.js";
import { createClearingState, attemptClearingMove, attemptClearingMoveTo, isWalkable, findPath, planRoute } from "../src/domain/clearing.js";
import { DIRECTION_VECTORS, MOVE_SPEED, movementDuration } from "../src/content/movement.js";

function followPath(world, path, initial = createClearingState(world)) {
  let state = initial;
  const events = [];
  for (const target of path) {
    const dx = target.x - state.position.x;
    const dy = target.y - state.position.y;
    assert.ok(Math.hypot(dx, dy) <= world.step * Math.SQRT2 + 1e-8, "Each waypoint stays within one lattice segment");
    const result = attemptClearingMoveTo(state, target, world);
    events.push(...result.events);
    state = result.state;
  }
  return { state, events };
}

test("spawn and road junctions are usable; grass, forest, river, and rock are not", () => {
  for (const point of [CLEARING.spawn, { x: 834, y: 432 }, { x: 994, y: 762 }, { x: 336, y: 944 }]) {
    assert.ok(isWalkable(CLEARING, point.x, point.y), JSON.stringify(point));
  }
  for (const [x, y] of [[-1, 0], [1403, 700], [600, 500], [500, 200], [1220, 990], [1095, 458], [NaN, 438]]) {
    assert.equal(isWalkable(CLEARING, x, y), false, `${x},${y}`);
  }
});

test("the boulder blocks the upper shortcut and the lower loop reaches its far side", () => {
  const target = { x: 1194, y: 522 };
  const path = findPath(CLEARING, CLEARING.spawn, target);
  assert.ok(path.length > 0);
  assert.ok(path.some(({ x, y }) => x < 300 && y > 800), "Detour must take the western end of the lower loop");
  const result = followPath(CLEARING, path);
  assert.ok(result.events.every(({ type }) => type === "moved"));
  assert.deepEqual(result.state.position, target);
  const withoutRock = { ...CLEARING, rock: null };
  const shortPath = findPath(withoutRock, withoutRock.spawn, target);
  assert.ok(shortPath.length < path.length / 2, "Removing the stone opens a real shortcut");
});

test("the shortest available route to the enemy uses the lower loop and ends with an encounter", () => {
  const path = findPath(CLEARING, CLEARING.spawn, CLEARING.enemy);
  assert.ok(path.length > 0);
  assert.ok(path.some(({ x, y }) => x < 300 && y > 800));
  const result = followPath(CLEARING, path);
  assert.ok(result.events.slice(0, -1).every(({ type }) => type === "moved"));
  assert.deepEqual(result.events.at(-1), { type: "encounter", entityId: "blud" });
  assert.deepEqual(result.state.position, path.at(-2), "Hero stays outside the enemy");
  assert.equal(result.state.steps, path.length - 1);
  const repeated = followPath(CLEARING, [path.at(-1)], result.state);
  assert.deepEqual(repeated.events, [{ type: "encounter", entityId: "blud" }]);
  assert.deepEqual(repeated.state.position, result.state.position);
});

test("the bridge beyond the enemy is inaccessible until its encounter volume is removed", () => {
  const bridgeEnd = { x: 1230, y: 894 };
  assert.deepEqual(findPath(CLEARING, CLEARING.spawn, bridgeEnd), []);
  const withoutEnemy = { ...CLEARING, enemy: null };
  const route = findPath(withoutEnemy, withoutEnemy.spawn, bridgeEnd);
  assert.ok(route.length > 0);
  assert.ok(followPath(withoutEnemy, route).events.every(({ type }) => type === "moved"));
});

test("invalid clicks never snap to a nearby road and valid clicks retain their exact destination", () => {
  const world = {
    width: 200, height: 100, step: 12, footprint: 0,
    spawn: { x: 30, y: 50 }, enemy: null, rock: null, clickSnapRadius: 45,
    roads: [{ radius: 10, points: [[20, 50], [180, 50]] }],
  };
  const invalid = { x: 45, y: 38 };
  assert.equal(isWalkable(world, invalid.x, invalid.y), false);
  assert.deepEqual(planRoute(world, world.spawn, invalid), { status: "invalid", path: [], target: invalid, encounter: false });
  const destination = { x: 77.3, y: 55.4 };
  const plan = planRoute(world, world.spawn, destination);
  assert.equal(plan.status, "accepted");
  assert.deepEqual(plan.target, destination);
  assert.deepEqual(plan.path.at(-1), destination);
  const result = followPath(world, plan.path);
  assert.ok(result.events.every(({ type }) => type === "moved"));
  assert.ok(Math.hypot(result.state.position.x - destination.x, result.state.position.y - destination.y) < 1e-8);
  assert.equal(planRoute(CLEARING, CLEARING.spawn, { x: 200, y: 100 }).status, "invalid");
});

test("movement sweeps the whole step and cannot tunnel through a narrow rock or terrain gap", () => {
  const world = {
    width: 200, height: 100, step: 12, footprint: 0,
    spawn: { x: 30, y: 50 }, enemy: null,
    roads: [{ radius: 10, points: [[20, 50], [100, 50]] }],
    rock: { x: 36, y: 50, radiusX: 1, radiusY: 20 },
  };
  assert.ok(isWalkable(world, 30, 50));
  assert.ok(isWalkable(world, 42, 50));
  assert.deepEqual(attemptClearingMove(createClearingState(world), "right", world).events, [{ type: "blocked", reason: "rock" }]);
  const gapWorld = { ...world, rock: null, roads: [
    { radius: 1, points: [[20, 50], [30, 50]] },
    { radius: 1, points: [[42, 50], [100, 50]] },
  ] };
  assert.ok(isWalkable(gapWorld, 30, 50));
  assert.ok(isWalkable(gapWorld, 42, 50));
  assert.deepEqual(attemptClearingMove(createClearingState(gapWorld), "right", gapWorld).events, [{ type: "blocked", reason: "terrain" }]);
});

test("movement is deterministic, preserves inputs, and validates directions", () => {
  const initial = createClearingState(CLEARING);
  Object.freeze(initial.position);
  Object.freeze(initial);
  const first = attemptClearingMove(initial, "right", CLEARING);
  assert.deepEqual(first, attemptClearingMove(initial, "right", CLEARING));
  assert.deepEqual(initial, createClearingState(CLEARING));
  assert.notStrictEqual(first.state.position, initial.position);
  assert.deepEqual(first.state.position, { x: 942, y: 438 });
  assert.equal(first.state.steps, 1);
  for (const invalid of ["north", "toString", "", undefined, null]) {
    assert.throws(() => attemptClearingMove(initial, invalid, CLEARING), RangeError);
  }
});

const diagonalWorld = {
  width: 220, height: 220, step: 12, footprint: 0,
  spawn: { x: 52, y: 40 }, enemy: null, rock: null,
  roads: [{ radius: 10, points: [[20, 20], [180, 180]] }],
};

function assertSweptWalkable(world, from, to) {
  for (let index = 0; index <= 100; index += 1) {
    const t = index / 100;
    const x = from.x + (to.x - from.x) * t;
    const y = from.y + (to.y - from.y) * t;
    assert.ok(isWalkable(world, x, y), `Movement crosses blocked ground at ${x},${y}`);
  }
}

test("holding a cardinal direction slides continuously along an angled road boundary", () => {
  let state = createClearingState(diagonalWorld);
  const initial = structuredClone(state);
  assert.equal(attemptClearingMove(state, "right", diagonalWorld, { slide: false }).events[0].type, "blocked");
  for (let index = 0; index < 12; index += 1) {
    const result = attemptClearingMove(state, "right", diagonalWorld, { slide: true });
    assert.equal(result.events[0].type, "moved");
    assert.ok(result.state.position.x > state.position.x + 5, "The pressed direction keeps making progress");
    assert.ok(result.state.position.y > state.position.y, "The blocked component becomes tangent movement");
    assert.ok(Math.hypot(result.state.position.x - state.position.x, result.state.position.y - state.position.y) <= diagonalWorld.step);
    assertSweptWalkable(diagonalWorld, state.position, result.state.position);
    state = result.state;
  }
  assert.deepEqual(initial, createClearingState(diagonalWorld));
});

test("a head-on wall stops the hero without choosing an arbitrary sideways detour", () => {
  const world = { ...diagonalWorld, spawn: { x: 60, y: 50 }, roads: [{ radius: 10, points: [[20, 50], [180, 50]] }] };
  const approached = attemptClearingMove(createClearingState(world), "up", world, { slide: true });
  assert.equal(approached.events[0].type, "moved");
  assert.equal(approached.state.position.x, world.spawn.x);
  assert.ok(approached.state.position.y >= 40 && approached.state.position.y < 41);
  const stopped = attemptClearingMove(approached.state, "up", world, { slide: true });
  assert.deepEqual(stopped.state.position, approached.state.position);
  assert.deepEqual(stopped.events, [{ type: "blocked", reason: "terrain" }]);
});

test("an oblique collision slides around the rock while every rendered straight step stays outside it", () => {
  const world = {
    width: 200, height: 200, step: 12, footprint: 2,
    spawn: { x: 80, y: 90 }, enemy: null,
    rock: { x: 100, y: 100, radiusX: 12, radiusY: 12 },
    roads: [{ radius: 80, points: [[20, 100], [180, 100]] }],
  };
  let state = createClearingState(world);
  for (let index = 0; index < 5; index += 1) {
    const result = attemptClearingMove(state, "right", world, { slide: true });
    assert.equal(result.events[0].type, "moved");
    assert.ok(result.state.position.x > state.position.x);
    assertSweptWalkable(world, state.position, result.state.position);
    state = result.state;
  }
  assert.ok(state.position.x > world.rock.x + world.rock.radiusX);
  assert.ok(state.position.y < world.spawn.y);
});

test("sliding cannot cross the actual boulder shortcut or escape through grass", () => {
  let state = createClearingState(CLEARING);
  for (let index = 0; index < 40; index += 1) {
    const result = attemptClearingMove(state, "right", CLEARING, { slide: true });
    assertSweptWalkable(CLEARING, state.position, result.state.position);
    state = result.state;
  }
  assert.ok(state.position.x < CLEARING.rock.x);
  assert.equal(attemptClearingMove(state, "right", CLEARING, { slide: true }).events[0].type, "blocked");
});

test("the exact road sweep detects a subpixel gap between valid endpoints", () => {
  const world = {
    width: 200, height: 100, step: 12, footprint: 0,
    spawn: { x: 30, y: 50 }, enemy: null, rock: null,
    roads: [
      { radius: 0.1, points: [[20, 50], [35.4, 50]] },
      { radius: 0.1, points: [[35.7, 50], [100, 50]] },
    ],
  };
  assert.ok(isWalkable(world, 30, 50));
  assert.ok(isWalkable(world, 42, 50));
  assert.deepEqual(attemptClearingMove(createClearingState(world), "right", world).events, [{ type: "blocked", reason: "terrain" }]);
  const result = attemptClearingMove(createClearingState(world), "right", world, { slide: true });
  assert.ok(result.state.position.x < 35.5);
  assert.equal(result.state.position.y, 50);
});

test("encounters sweep the actual sliding segment, not the blocked original direction", () => {
  const world = { ...diagonalWorld, enemy: { id: "guard", x: 55.5, y: 42.5, radius: 0.5 } };
  const state = createClearingState(world);
  const result = attemptClearingMove(state, "right", world, { slide: true });
  assert.deepEqual(result.events, [{ type: "encounter", entityId: "guard" }]);
  assert.deepEqual(result.state.position, state.position);
  const missWorld = { ...world, enemy: { ...world.enemy, x: 60, y: 40 } };
  assert.equal(attemptClearingMove(state, "right", missWorld, { slide: true }).events[0].type, "moved");
});

test("click navigation remains deterministic from a fractional slide and reaches the exact destination", () => {
  const world = { ...diagonalWorld, clickSnapRadius: 20 };
  const state = attemptClearingMove(createClearingState(world), "right", world, { slide: true }).state;
  assert.ok(!Number.isInteger(state.position.x));
  const target = { x: 140, y: 140 };
  const path = findPath(world, state.position, target);
  assert.ok(path.length > 0);
  assert.deepEqual(path, findPath(world, state.position, target));
  const result = followPath(world, path, state);
  assert.ok(result.events.every(({ type }) => type === "moved"));
  assert.ok(Math.hypot(result.state.position.x - target.x, result.state.position.y - target.y) < 1e-8);
});

test("the drawn borders open the selected shoulders while keeping the central vegetation blocked", () => {
  const previous = { ...CLEARING, navigation: null, roads: CLEARING.roads.map((road) => ({ ...road, radius: road.radius / 1.2 })) };
  for (const [x, y] of [[800, 440], [600, 640], [200, 760], [260, 840], [1240, 860]]) {
    assert.equal(isWalkable(previous, x, y), false, `Old corridor must exclude ${x},${y}`);
    assert.equal(isWalkable(CLEARING, x, y), true, `Annotated shoulder must include ${x},${y}`);
  }
  for (const [x, y] of [[600, 760], [800, 680], [1200, 970], [1000, 400]]) {
    assert.equal(isWalkable(CLEARING, x, y), false, `Scenery must stay blocked at ${x},${y}`);
  }
});

test("the widened shortcut is sealed across its entire annotated cross-section by the boulder", () => {
  const withoutRock = { ...CLEARING, rock: null };
  let blockedWidth = 0;
  for (let y = 350; y <= 560; y += 0.25) {
    if (!isWalkable(withoutRock, CLEARING.rock.x, y)) continue;
    blockedWidth += 0.25;
    assert.equal(isWalkable(CLEARING, CLEARING.rock.x, y), false, `No gap beside the rock at ${y}`);
  }
  assert.ok(blockedWidth > 30, "The test spans a real walkable road, not an empty cross-section");
});

test("the encounter covers the full width of the widened bridge approach", () => {
  let checked = 0;
  // A perpendicular cut through the hero's approach, including both shoulders.
  for (let distance = -100; distance <= 100; distance += 0.25) {
    const x = CLEARING.enemy.x - distance / 2;
    const y = CLEARING.enemy.y + distance * Math.sqrt(0.75);
    if (!isWalkable(CLEARING, x, y)) continue;
    checked += 1;
    assert.ok(Math.abs(distance) <= CLEARING.enemy.radius, `Enemy can be bypassed at offset ${distance}`);
  }
  assert.ok(checked > 100);
});

test("polygon navigation sweeps narrow holes and vertex crossings between valid endpoints", () => {
  const world = {
    width: 200, height: 100, step: 12, footprint: 0, spawn: { x: 30, y: 50 }, enemy: null, rock: null,
    navigation: { outer: [[10, 10], [190, 10], [190, 90], [10, 90]], holes: [[[35.5, 50], [36, 49], [36.5, 50], [36, 51]]] },
  };
  assert.ok(isWalkable(world, 30, 50));
  assert.ok(isWalkable(world, 42, 50));
  assert.deepEqual(attemptClearingMove(createClearingState(world), "right", world).events, [{ type: "blocked", reason: "terrain" }]);
  const slid = attemptClearingMove(createClearingState(world), "right", world, { slide: true });
  assertSweptWalkable(world, world.spawn, slid.state.position);
  const withFeet = { ...world, footprint: 3 };
  assert.equal(isWalkable(withFeet, 34, 50), false, "Footprint cannot overlap the island");
  assert.equal(isWalkable(withFeet, 11, 40), false, "Footprint cannot overhang the map edge");
});

test("wall sliding also follows a polygon boundary and supports click navigation afterwards", () => {
  const world = {
    width: 220, height: 220, step: 12, footprint: 2, clickSnapRadius: 20,
    spawn: { x: 52, y: 40 }, enemy: null, rock: null,
    navigation: { outer: [[10, 10], [30, 10], [190, 170], [170, 190], [10, 30]], holes: [] },
  };
  let state = createClearingState(world);
  for (let index = 0; index < 10; index += 1) {
    const result = attemptClearingMove(state, "right", world, { slide: true });
    assert.equal(result.events[0].type, "moved");
    assert.ok(result.state.position.x > state.position.x);
    assertSweptWalkable(world, state.position, result.state.position);
    state = result.state;
  }
  assert.ok(state.position.y > world.spawn.y + 30);
  const path = findPath(world, state.position, { x: 150, y: 150 });
  assert.ok(path.length > 0);
  assert.ok(followPath(world, path, state).events.every(({ type }) => type === "moved"));
});

test("all eight manual directions travel the same distance at the shared speed including the additional 30 percent increase", () => {
  const world = {
    width: 200, height: 200, step: 12, footprint: 0,
    spawn: { x: 100, y: 100 }, enemy: null, rock: null,
    navigation: { outer: [[10, 10], [190, 10], [190, 190], [10, 190]], holes: [] },
  };
  for (const direction of Object.keys(DIRECTION_VECTORS)) {
    const result = attemptClearingMove(createClearingState(world), direction, world);
    assert.equal(result.events[0].type, "moved", direction);
    const distance = Math.hypot(result.state.position.x - world.spawn.x, result.state.position.y - world.spawn.y);
    assert.ok(Math.abs(distance - 12) < 1e-8, direction);
    assert.ok(Math.abs(movementDuration(world.spawn, result.state.position) - 110 / 1.2 / 1.3) < 1e-8, direction);
  }
  assert.equal(MOVE_SPEED, (12 / 0.110) * 1.2 * 1.3);
});

test("a diagonal cannot cut a scenery corner even when its endpoints are walkable", () => {
  const world = {
    width: 200, height: 200, step: 12, footprint: 0,
    spawn: { x: 50, y: 50 }, enemy: null, rock: null,
    navigation: {
      outer: [[10, 10], [190, 10], [190, 190], [10, 190]],
      holes: [[[54, 54], [56, 54], [56, 56], [54, 56]]],
    },
  };
  const target = { x: 62, y: 62 };
  assert.ok(isWalkable(world, target.x, target.y));
  assert.deepEqual(attemptClearingMoveTo(createClearingState(world), target, world).events, [{ type: "blocked", reason: "terrain" }]);
  assert.deepEqual(attemptClearingMove(createClearingState(world), "down-right", world).events, [{ type: "blocked", reason: "terrain" }]);
  const plan = planRoute(world, world.spawn, target);
  assert.equal(plan.status, "accepted");
  const result = followPath(world, plan.path);
  assert.ok(result.events.every(({ type }) => type === "moved"));
  for (const event of result.events) assertSweptWalkable(world, event.from, event.to);
});

test("route planning distinguishes blocked terrain from a valid but unreachable destination", () => {
  const world = {
    width: 200, height: 100, step: 12, footprint: 0,
    spawn: { x: 30, y: 50 }, enemy: null, rock: null,
    roads: [
      { radius: 10, points: [[20, 50], [60, 50]] },
      { radius: 10, points: [[120, 50], [180, 50]] },
    ],
  };
  assert.equal(planRoute(world, world.spawn, { x: 150, y: 50 }).status, "unreachable");
  assert.equal(planRoute(world, world.spawn, { x: 90, y: 50 }).status, "invalid");
  assert.deepEqual(planRoute(world, world.spawn, world.spawn).path, []);
  assert.equal(planRoute(world, world.spawn, world.spawn).status, "accepted");
});

test("open-ground click routes use diagonals with distance-based duration", () => {
  const world = {
    width: 200, height: 200, step: 12, footprint: 0,
    spawn: { x: 50, y: 50 }, enemy: null, rock: null,
    navigation: { outer: [[10, 10], [190, 10], [190, 190], [10, 190]], holes: [] },
  };
  const plan = planRoute(world, world.spawn, { x: 98, y: 98 });
  assert.equal(plan.status, "accepted");
  assert.equal(plan.path.length, 4);
  const result = followPath(world, plan.path);
  const duration = result.events.reduce((sum, { from, to }) => sum + movementDuration(from, to), 0);
  assert.ok(Math.abs(duration - Math.hypot(48, 48) / MOVE_SPEED * 1000) < 1e-8);
});
