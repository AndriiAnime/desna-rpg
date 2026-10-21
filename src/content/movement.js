/** One world-space speed for keyboard, touch buttons, and click routes. */
export const MOVEMENT_STEP = 12;
export const MOVE_SPEED = (MOVEMENT_STEP / 0.110) * 1.2 * 1.3;
export const STEP_INTERVAL_MS = (MOVEMENT_STEP / MOVE_SPEED) * 1000;

export const DIRECTION_VECTORS = Object.freeze({
  up: Object.freeze({ x: 0, y: -1 }),
  down: Object.freeze({ x: 0, y: 1 }),
  left: Object.freeze({ x: -1, y: 0 }),
  right: Object.freeze({ x: 1, y: 0 }),
  "up-left": Object.freeze({ x: -1, y: -1 }),
  "up-right": Object.freeze({ x: 1, y: -1 }),
  "down-left": Object.freeze({ x: -1, y: 1 }),
  "down-right": Object.freeze({ x: 1, y: 1 }),
});

export function directionVector(direction) {
  if (typeof direction !== "string" || !Object.hasOwn(DIRECTION_VECTORS, direction)) {
    throw new RangeError(`Unknown movement direction: ${String(direction)}`);
  }
  const { x, y } = DIRECTION_VECTORS[direction];
  const length = Math.hypot(x, y);
  return { x: x / length, y: y / length };
}

/** Eight facing sectors; null means no movement. */
export function directionFromVector(x, y) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  if (Math.hypot(x, y) < 1e-8) return null;
  const sectors = ["right", "down-right", "down", "down-left", "left", "up-left", "up", "up-right"];
  const sector = Math.round(Math.atan2(y, x) / (Math.PI / 4));
  return sectors[(sector + 8) % 8];
}

export function movementDuration(from, to) {
  return (Math.hypot(to.x - from.x, to.y - from.y) / MOVE_SPEED) * 1000;
}
