import { polygonAllowsPoint, polygonAllowsSegment, polygonContactNormal } from "./polygon-navigation.js";
import { DIRECTION_VECTORS, directionVector, directionFromVector } from "../content/movement.js";

function distanceToSegment(x, y, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / lengthSquared));
  return Math.hypot(x - ax - t * dx, y - ay - t * dy);
}

function insideWorld(world, x, y) {
  const radius = world.footprint ?? 0;
  return Number.isFinite(x) && Number.isFinite(y) &&
    x >= radius && y >= radius && x <= world.width - radius && y <= world.height - radius;
}

function intersectsRock(world, from, to = from) {
  if (!world.rock) return false;
  const { x, y, radiusX, radiusY } = world.rock;
  const rx = radiusX + (world.footprint ?? 0);
  const ry = radiusY + (world.footprint ?? 0);
  // Transform the ellipse into a unit circle so the entire step is checked.
  return distanceToSegment(0, 0, (from.x - x) / rx, (from.y - y) / ry, (to.x - x) / rx, (to.y - y) / ry) <= 1;
}

function circleInterval(from, to, x, y, radius) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const px = from.x - x;
  const py = from.y - y;
  const a = dx * dx + dy * dy;
  const c = px * px + py * py - radius * radius;
  if (a === 0) return c <= 0 ? [0, 1] : null;
  const b = 2 * (px * dx + py * dy);
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return null;
  const root = Math.sqrt(discriminant);
  const start = Math.max(0, (-b - root) / (2 * a));
  const end = Math.min(1, (-b + root) / (2 * a));
  return start <= end ? [start, end] : null;
}

function rectangleInterval(from, to, ax, ay, bx, by, radius) {
  const length = Math.hypot(bx - ax, by - ay);
  if (length === 0) return null;
  const ux = (bx - ax) / length;
  const uy = (by - ay) / length;
  const px = from.x - ax;
  const py = from.y - ay;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  let start = 0;
  let end = 1;
  for (const [origin, delta, min, max] of [
    [px * ux + py * uy, dx * ux + dy * uy, 0, length],
    [-px * uy + py * ux, -dx * uy + dy * ux, -radius, radius],
  ]) {
    if (Math.abs(delta) < 1e-12) {
      if (origin < min || origin > max) return null;
      continue;
    }
    const t1 = (min - origin) / delta;
    const t2 = (max - origin) / delta;
    start = Math.max(start, Math.min(t1, t2));
    end = Math.min(end, Math.max(t1, t2));
    if (start > end) return null;
  }
  return [start, end];
}

/** The union of capsule intervals covers the swept segment, including subpixel gaps. */
function staysOnRoad(world, from, to) {
  if (world.navigation) return polygonAllowsSegment(world.navigation, from, to, world.footprint ?? 0);
  const intervals = [];
  for (const { points, radius } of world.roads) {
    const usableRadius = radius - (world.footprint ?? 0);
    if (usableRadius < 0) continue;
    for (let index = 1; index < points.length; index += 1) {
      const [ax, ay] = points[index - 1];
      const [bx, by] = points[index];
      for (const interval of [
        circleInterval(from, to, ax, ay, usableRadius),
        circleInterval(from, to, bx, by, usableRadius),
        rectangleInterval(from, to, ax, ay, bx, by, usableRadius),
      ]) {
        if (interval) intervals.push(interval);
      }
    }
  }
  intervals.sort((a, b) => a[0] - b[0]);
  let covered = 0;
  for (const [start, end] of intervals) {
    if (start > covered + 1e-10) return false;
    covered = Math.max(covered, end);
    if (covered >= 1) return true;
  }
  return false;
}

/** Terrain only: encounter volumes are handled by movement, not this query. */
export function isWalkable(world, x, y) {
  if (!insideWorld(world, x, y) || intersectsRock(world, { x, y })) return false;
  if (world.navigation) return polygonAllowsPoint(world.navigation, x, y, world.footprint ?? 0);
  return world.roads.some(({ points, radius }) => points.slice(1).some(([bx, by], index) => {
    const [ax, ay] = points[index];
    return distanceToSegment(x, y, ax, ay, bx, by) <= radius - (world.footprint ?? 0);
  }));
}

function blockedReason(world, from, to) {
  if (!insideWorld(world, to.x, to.y)) return "boundary";
  if (intersectsRock(world, from, to)) return "rock";
  if (!staysOnRoad(world, from, to)) return "terrain";
  return null;
}

function contactNormal(world, point, reason) {
  if (reason === "rock") {
    const rx = world.rock.radiusX + (world.footprint ?? 0);
    const ry = world.rock.radiusY + (world.footprint ?? 0);
    const x = (point.x - world.rock.x) / (rx * rx);
    const y = (point.y - world.rock.y) / (ry * ry);
    const length = Math.hypot(x, y);
    return { x: x / length, y: y / length };
  }
  if (reason === "boundary") {
    const radius = world.footprint ?? 0;
    if (point.x < radius || point.x > world.width - radius) return { x: 1, y: 0 };
    return { x: 0, y: 1 };
  }
  if (world.navigation) return polygonContactNormal(world.navigation, point);
  let nearest = null;
  let distance = Infinity;
  for (const { points, radius } of world.roads) {
    for (let index = 1; index < points.length; index += 1) {
      const [ax, ay] = points[index - 1];
      const [bx, by] = points[index];
      const dx = bx - ax;
      const dy = by - ay;
      const lengthSquared = dx * dx + dy * dy;
      const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((point.x - ax) * dx + (point.y - ay) * dy) / lengthSquared));
      const x = point.x - ax - dx * t;
      const y = point.y - ay - dy * t;
      const length = Math.hypot(x, y);
      const edgeDistance = length - radius + (world.footprint ?? 0);
      if (edgeDistance < distance && length > 0) {
        nearest = { x: x / length, y: y / length };
        distance = edgeDistance;
      }
    }
  }
  return nearest;
}

function firstContact(world, from, to) {
  let clear = 0;
  let blocked = 1;
  for (let index = 0; index < 24; index += 1) {
    const t = (clear + blocked) / 2;
    const point = { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
    if (blockedReason(world, from, point)) blocked = t;
    else clear = t;
  }
  const point = { x: from.x + (to.x - from.x) * blocked, y: from.y + (to.y - from.y) * blocked };
  return { fraction: clear, normal: contactNormal(world, point, blockedReason(world, from, point)) };
}

function slideAlongBoundary(world, from, offset) {
  let position = { ...from };
  let remaining = { x: offset.x * world.step, y: offset.y * world.step };
  // A small inset avoids numerical sticking at the exact collision boundary.
  const clearance = 0.05;
  for (let index = 0; index < 4; index += 1) {
    const length = Math.hypot(remaining.x, remaining.y);
    if (length < clearance) break;
    const target = { x: position.x + remaining.x, y: position.y + remaining.y };
    if (!blockedReason(world, position, target)) {
      position = target;
      break;
    }
    const contact = firstContact(world, position, target);
    const fraction = Math.max(0, contact.fraction - clearance / length);
    position = { x: position.x + remaining.x * fraction, y: position.y + remaining.y * fraction };
    remaining = { x: remaining.x * (1 - fraction), y: remaining.y * (1 - fraction) };
    if (!contact.normal) break;
    const normalSpeed = remaining.x * contact.normal.x + remaining.y * contact.normal.y;
    remaining.x -= normalSpeed * contact.normal.x;
    remaining.y -= normalSpeed * contact.normal.y;
    // Sliding preserves the pressed direction; a head-on wall cannot choose a side.
    if (remaining.x * offset.x + remaining.y * offset.y < clearance) break;
  }
  // The renderer uses one straight tween per step, so its chord must also be clear.
  if (blockedReason(world, from, position)) {
    const length = Math.hypot(position.x - from.x, position.y - from.y);
    const fraction = Math.max(0, firstContact(world, from, position).fraction - clearance / length);
    position = { x: from.x + (position.x - from.x) * fraction, y: from.y + (position.y - from.y) * fraction };
  }
  return position;
}

function reachesEnemy(world, from, to) {
  if (!world.enemy) return false;
  return distanceToSegment(world.enemy.x, world.enemy.y, from.x, from.y, to.x, to.y) <= world.enemy.radius;
}

export function createClearingState(world) {
  return { position: { ...world.spawn }, facing: "down", steps: 0 };
}

function attemptStep(state, direction, world, offset, slide) {
  const from = state.position;
  let to = { x: from.x + offset.x * world.step, y: from.y + offset.y * world.step };
  const nextState = { ...state, position: { ...from }, facing: direction };
  const reason = blockedReason(world, from, to);
  if (reason) {
    if (!slide || !isWalkable(world, from.x, from.y)) return { state: nextState, events: [{ type: "blocked", reason }] };
    to = slideAlongBoundary(world, from, offset);
    if ((to.x - from.x) * offset.x + (to.y - from.y) * offset.y < 0.05) {
      return { state: nextState, events: [{ type: "blocked", reason }] };
    }
  }
  if (reachesEnemy(world, from, to)) return { state: nextState, events: [{ type: "encounter", entityId: world.enemy.id }] };
  return {
    state: { ...nextState, position: to, steps: state.steps + 1 },
    events: [{ type: "moved", from: { ...from }, to: { ...to } }],
  };
}

/** Every manual direction covers the same distance, including diagonals. */
export function attemptClearingMove(state, direction, world, { slide = false } = {}) {
  return attemptStep(state, direction, world, directionVector(direction), slide);
}

/** Routes keep exact waypoints; sweep the whole segment and never slide off-route. */
export function attemptClearingMoveTo(state, target, world) {
  if (!Number.isFinite(target?.x) || !Number.isFinite(target?.y)) {
    throw new RangeError("A route waypoint must contain finite x and y coordinates");
  }
  const dx = target.x - state.position.x;
  const dy = target.y - state.position.y;
  const direction = directionFromVector(dx, dy);
  if (!direction) return { state, events: [] };
  return attemptStep(state, direction, world, { x: dx / world.step, y: dy / world.step }, false);
}

function reconstruct(nodes, index) {
  const path = [];
  for (let current = index; nodes[current].parent !== -1; current = nodes[current].parent) {
    path.push({ ...nodes[current].position });
  }
  return path.reverse();
}

class MinHeap {
  entries = [];
  push(entry) {
    const entries = this.entries;
    let index = entries.length;
    entries.push(entry);
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (entries[parent].priority <= entry.priority) break;
      entries[index] = entries[parent];
      index = parent;
    }
    entries[index] = entry;
  }
  pop() {
    const entries = this.entries;
    if (!entries.length) return null;
    const first = entries[0];
    const last = entries.pop();
    if (!entries.length) return first;
    let index = 0;
    while (index * 2 + 1 < entries.length) {
      const left = index * 2 + 1;
      const right = left + 1;
      const child = right < entries.length && entries[right].priority < entries[left].priority ? right : left;
      if (last.priority <= entries[child].priority) break;
      entries[index] = entries[child];
      index = child;
    }
    entries[index] = last;
    return first;
  }
}

/**
 * Strict point-and-click navigation: no snapping from forbidden ground.
 * A* uses integer lattice keys (even after a fractional slide), eight neighbours,
 * and Euclidean edge costs. The last segment reaches the exact clicked point.
 * Sweeping each segment prevents diagonal corner cutting through scenery/rock.
 */
export function planRoute(world, from, to) {
  const target = { x: to?.x, y: to?.y };
  const wantsEncounter = Boolean(world.enemy && Number.isFinite(to?.x) && Number.isFinite(to?.y) &&
    Math.hypot(to.x - world.enemy.x, to.y - world.enemy.y) <= world.enemy.radius);
  const result = (status, path = []) => ({ status, path, target, encounter: wantsEncounter });
  if (!Number.isFinite(to?.x) || !Number.isFinite(to?.y) || (!wantsEncounter && !isWalkable(world, to.x, to.y))) {
    return result("invalid");
  }
  if (!isWalkable(world, from.x, from.y)) return result("unreachable");
  const distanceToGoal = (point) => {
    const distance = Math.hypot(point.x - to.x, point.y - to.y);
    return wantsEncounter ? Math.max(0, distance - world.enemy.radius) : distance;
  };
  const nodes = [{ position: { ...from }, column: 0, row: 0, parent: -1, cost: 0 }];
  const bestCost = new Map([["0,0", 0]]);
  const frontier = new MinHeap();
  frontier.push({ index: 0, priority: distanceToGoal(from) });
  const maxLastSegment = world.step * Math.SQRT2 + 1e-8;
  let current;
  while ((current = frontier.pop())) {
    const index = current.index;
    const node = nodes[index];
    const { position } = node;
    if (node.cost > bestCost.get(`${node.column},${node.row}`) + 1e-8) continue;
    const distance = Math.hypot(position.x - to.x, position.y - to.y);
    if (!wantsEncounter && distance < 1e-8) return result("accepted", reconstruct(nodes, index));
    if (!wantsEncounter && distance <= maxLastSegment && !blockedReason(world, position, to) && !reachesEnemy(world, position, to)) {
      return result("accepted", [...reconstruct(nodes, index), { ...target }]);
    }
    for (const offset of Object.values(DIRECTION_VECTORS)) {
      const column = node.column + offset.x;
      const row = node.row + offset.y;
      const next = { x: from.x + column * world.step, y: from.y + row * world.step };
      const key = `${column},${row}`;
      const cost = node.cost + world.step * Math.hypot(offset.x, offset.y);
      if (cost >= (bestCost.get(key) ?? Infinity) - 1e-8 || blockedReason(world, position, next)) continue;
      if (reachesEnemy(world, position, next)) {
        if (wantsEncounter) return result("accepted", [...reconstruct(nodes, index), next]);
        continue;
      }
      bestCost.set(key, cost);
      const nextIndex = nodes.length;
      nodes.push({ position: next, column, row, parent: index, cost });
      frontier.push({ index: nextIndex, priority: cost + distanceToGoal(next) });
    }
  }
  return result("unreachable");
}

/** Compatibility helper for consumers that only need waypoints. */
export function findPath(world, from, to) {
  return planRoute(world, from, to).path;
}
