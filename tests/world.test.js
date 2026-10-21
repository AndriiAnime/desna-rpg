import test from "node:test";
import assert from "node:assert/strict";
import { WORLD, WALKABLE_TILES } from "../src/content/world.js";
import {
  createWorldState,
  attemptMove,
  isWalkable,
} from "../src/domain/world.js";

const DIRECTIONS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

function freezeDeep(value) {
  Object.freeze(value);
  for (const child of Object.values(value)) {
    if (child && typeof child === "object" && !Object.isFrozen(child))
      freezeDeep(child);
  }
  return value;
}

function reachablePositions(world) {
  const visited = new Set([`${world.spawn.x},${world.spawn.y}`]);
  const pending = [{ ...world.spawn }];

  for (let index = 0; index < pending.length; index += 1) {
    const position = pending[index];
    for (const direction of Object.keys(DIRECTIONS)) {
      const { state, events } = attemptMove(
        { position, facing: "down", steps: 0 },
        direction,
        world,
      );
      const key = `${state.position.x},${state.position.y}`;
      if (events[0].type === "moved" && !visited.has(key)) {
        visited.add(key);
        pending.push(state.position);
      }
    }
  }

  return visited;
}

test("the authored map has consistent dimensions and known terrain", () => {
  assert.equal(WORLD.tiles.length, WORLD.height);
  for (const row of WORLD.tiles) {
    assert.equal(row.length, WORLD.width);
    for (const tile of row)
      assert.ok(Object.hasOwn(WORLD.tileLegend, tile), `Unknown tile: ${tile}`);
  }

  for (const [tile, { walkable }] of Object.entries(WORLD.tileLegend)) {
    assert.equal(WALKABLE_TILES.has(tile), walkable);
  }
});

test("the hero and every entity occupy distinct, walkable terrain", () => {
  const occupants = [WORLD.spawn, ...WORLD.entities];
  const positions = occupants.map(({ x, y }) => `${x},${y}`);

  assert.equal(new Set(positions).size, positions.length);
  assert.equal(
    new Set(WORLD.entities.map(({ id }) => id)).size,
    WORLD.entities.length,
  );
  for (const { x, y } of occupants) assert.ok(isWalkable(WORLD, x, y));
});

test("both interactions are reachable and Blud guards the only river crossing", () => {
  const reachable = reachablePositions(WORLD);
  for (const entity of WORLD.entities) {
    const canApproach = Object.values(DIRECTIONS).some(({ x, y }) =>
      reachable.has(`${entity.x + x},${entity.y + y}`),
    );
    assert.ok(canApproach, `${entity.name} must be reachable from the village`);
    assert.ok(
      !reachable.has(`${entity.x},${entity.y}`),
      "Entities cannot be crossed",
    );
  }

  assert.ok(!reachable.has("20,8"), "Blud blocks access to the bridge");
  assert.ok(!reachable.has("22,8"), "The eastern bank has no bypass");
  const withoutBlud = {
    ...WORLD,
    entities: WORLD.entities.filter(({ id }) => id !== "blud"),
  };
  assert.ok(
    reachablePositions(withoutBlud).has("22,8"),
    "The bridge joins both banks",
  );
});

test("initial states copy the spawn and do not share their position", () => {
  const first = createWorldState(WORLD);
  const second = createWorldState(WORLD);
  assert.deepEqual(first, { position: WORLD.spawn, facing: "down", steps: 0 });
  assert.notStrictEqual(first.position, WORLD.spawn);
  assert.notStrictEqual(first.position, second.position);
});

test("every direction moves exactly one cell, updates facing, and counts one step", () => {
  for (const [direction, offset] of Object.entries(DIRECTIONS)) {
    const initial = { position: { x: 9, y: 10 }, facing: "down", steps: 6 };
    const target = { x: 9 + offset.x, y: 10 + offset.y };
    const result = attemptMove(initial, direction, WORLD);
    assert.deepEqual(result.state, {
      position: target,
      facing: direction,
      steps: 7,
    });
    assert.deepEqual(result.events, [
      { type: "moved", from: initial.position, to: target },
    ]);
  }
});

test("trees, rocks, and water block movement while preserving the step count", () => {
  const cases = [
    { position: { x: 3, y: 7 }, target: { x: 4, y: 7 } },
    { position: { x: 15, y: 12 }, target: { x: 16, y: 12 } },
    { position: { x: 19, y: 7 }, target: { x: 20, y: 7 } },
  ];

  for (const { position, target } of cases) {
    const result = attemptMove(
      { position, facing: "up", steps: 4 },
      "right",
      WORLD,
    );
    assert.deepEqual(result.state, { position, facing: "right", steps: 4 });
    assert.deepEqual(result.events, [
      { type: "blocked", reason: "terrain", position: target },
    ]);
  }
});

test("the world boundary blocks movement and updates facing", () => {
  const initial = { position: { x: 23, y: 8 }, facing: "down", steps: 8 };
  const result = attemptMove(initial, "right", WORLD);

  assert.deepEqual(result.state, { ...initial, facing: "right" });
  assert.deepEqual(result.events, [
    { type: "blocked", reason: "boundary", position: { x: 24, y: 8 } },
  ]);
});

test("enemy and NPC collisions emit interactions without moving or adding steps", () => {
  for (const entity of WORLD.entities) {
    const initial = {
      position: { x: entity.x - 1, y: entity.y },
      facing: "up",
      steps: 10,
    };
    const result = attemptMove(initial, "right", WORLD);

    assert.deepEqual(result.state, { ...initial, facing: "right" });
    assert.deepEqual(result.events, [
      { type: "interaction", entityId: entity.id },
    ]);
  }
});

test("movement, blocking, and interactions leave frozen inputs unchanged", () => {
  const world = freezeDeep(structuredClone(WORLD));
  const positions = [world.spawn, { x: 19, y: 7 }, { x: 18, y: 8 }];

  for (const position of positions) {
    const initial = freezeDeep({
      position: { ...position },
      facing: "up",
      steps: 2,
    });
    const before = structuredClone(initial);
    const result = attemptMove(initial, "right", world);
    assert.deepEqual(initial, before);
    assert.notStrictEqual(result.state, initial);
    assert.notStrictEqual(result.state.position, initial.position);
  }
  assert.deepEqual(world, WORLD);
});

test("out-of-bounds and noninteger coordinates are not walkable", () => {
  for (const [x, y] of [
    [-1, 8],
    [24, 8],
    [4, -1],
    [4, 16],
    [4.5, 12],
    [4, NaN],
  ]) {
    assert.equal(isWalkable(WORLD, x, y), false);
  }
});

test("invalid movement directions fail explicitly and leave the state unchanged", () => {
  const initial = freezeDeep(createWorldState(WORLD));
  for (const direction of ["north", "", "toString", null, undefined, 1]) {
    assert.throws(() => attemptMove(initial, direction, WORLD), RangeError);
  }
  assert.deepEqual(initial, createWorldState(WORLD));
});
