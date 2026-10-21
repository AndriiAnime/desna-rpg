export const HERO_WALK_ANIMATION_RATE = 0.7;

/** A cycle advances with world-space travel, not wall-clock time or direction. */
export function advanceWalkCycle(cycle, position, active) {
  const distance = active
    ? cycle.distance + Math.hypot(position.x - cycle.position.x, position.y - cycle.position.y)
    : 0;
  return { distance, position: { ...position } };
}

export function walkFrame(frames, distance, strideDistance = 64, rate = 1) {
  return frames[Math.floor(distance / strideDistance * frames.length * rate) % frames.length];
}
