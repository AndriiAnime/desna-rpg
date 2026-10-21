import test from "node:test";
import assert from "node:assert/strict";
import { advanceWalkCycle, HERO_WALK_ANIMATION_RATE, walkFrame } from "../src/domain/walk-cycle.js";

const initial = () => ({ distance: 0, position: { x: 0, y: 0 } });

test("gait phase depends on distance rather than render frequency", () => {
  let fast = initial();
  for (let x = 1; x <= 48; x++) fast = advanceWalkCycle(fast, { x, y: 0 }, true);
  let slow = initial();
  for (let x = 12; x <= 48; x += 12) slow = advanceWalkCycle(slow, { x, y: 0 }, true);
  assert.equal(fast.distance, slow.distance);
  assert.equal(walkFrame([0, 1, 2, 3], fast.distance), 3);
});

test("turning on a staircase route retains the opposite-foot phase", () => {
  let gait = initial();
  for (const position of [{ x: 8, y: 0 }, { x: 8, y: 8 }, { x: 16, y: 8 }, { x: 16, y: 16 }]) {
    gait = advanceWalkCycle(gait, position, true);
  }
  assert.equal(walkFrame([0, 1, 2, 3], gait.distance), 2);
  assert.equal(walkFrame([4, 5, 6, 7], gait.distance), 6, "New direction uses the same gait phase");
});

test("standing at a wall cannot advance a walking frame; reset does not count as walking", () => {
  const before = advanceWalkCycle(initial(), { x: 20, y: 0 }, true);
  let atWall = before;
  for (let frame = 0; frame < 100; frame++) atWall = advanceWalkCycle(atWall, atWall.position, true);
  assert.equal(atWall.distance, before.distance);
  const reset = advanceWalkCycle(atWall, { x: 930, y: 438 }, false);
  assert.equal(reset.distance, 0);
  assert.equal(advanceWalkCycle(reset, { x: 933, y: 442 }, true).distance, 5);
});

test("a 30 percent slower gait preserves travel distance and phase across directions", () => {
  const gait = advanceWalkCycle(initial(), { x: 48, y: 0 }, true);
  assert.equal(HERO_WALK_ANIMATION_RATE, 0.7);
  assert.equal(gait.distance, 48);
  for (const frames of [[0, 1, 2, 3], [4, 5, 6, 7], [8, 9, 10, 11], [12, 13, 14, 15]]) {
    assert.equal(walkFrame(frames, gait.distance), frames[3]);
    assert.equal(walkFrame(frames, gait.distance, 64, HERO_WALK_ANIMATION_RATE), frames[2]);
    assert.equal(walkFrame(frames, 64 / HERO_WALK_ANIMATION_RATE + 0.001, 64, HERO_WALK_ANIMATION_RATE), frames[0]);
  }
  assert.deepEqual(gait, { distance: 48, position: { x: 48, y: 0 } }, "Animation sampling never alters travel");
});
