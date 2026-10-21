const cache = new WeakMap();

function geometry(navigation) {
  let result = cache.get(navigation);
  if (!result) {
    const rings = [navigation.outer, ...(navigation.holes ?? [])];
    const edges = rings.flatMap((ring) => ring.map((a, index) => {
      const b = ring[(index + 1) % ring.length];
      return { a, b, minX: Math.min(a[0], b[0]), maxX: Math.max(a[0], b[0]), minY: Math.min(a[1], b[1]), maxY: Math.max(a[1], b[1]) };
    }));
    result = { rings, edges };
    cache.set(navigation, result);
  }
  return result;
}

function insideRing(ring, x, y) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [ax, ay] = ring[i];
    const [bx, by] = ring[j];
    if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) inside = !inside;
  }
  return inside;
}

function closestPoint(x, y, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const squaredLength = dx * dx + dy * dy;
  const t = squaredLength === 0 ? 0 : Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / squaredLength));
  return { x: a[0] + t * dx, y: a[1] + t * dy };
}

function squaredDistance(x, y, a, b) {
  const point = closestPoint(x, y, a, b);
  return (x - point.x) ** 2 + (y - point.y) ** 2;
}

function intersects(a, b, c, d) {
  const cross = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  const overlaps = Math.max(a[0], b[0]) >= Math.min(c[0], d[0]) && Math.min(a[0], b[0]) <= Math.max(c[0], d[0]) &&
    Math.max(a[1], b[1]) >= Math.min(c[1], d[1]) && Math.min(a[1], b[1]) <= Math.max(c[1], d[1]);
  // Include vertex crossings, even for synthetic point-sized actors.
  return overlaps && cross(a, b, c) * cross(a, b, d) <= 0 && cross(c, d, a) * cross(c, d, b) <= 0;
}

/** The foot circle must fit completely inside the outer ring and outside all holes. */
export function polygonAllowsPoint(navigation, x, y, footprint = 0) {
  const { rings, edges } = geometry(navigation);
  if (!insideRing(rings[0], x, y) || rings.slice(1).some((ring) => insideRing(ring, x, y))) return false;
  const squaredRadius = footprint * footprint;
  return !edges.some(({ a, b, minX, maxX, minY, maxY }) =>
    x >= minX - footprint && x <= maxX + footprint && y >= minY - footprint && y <= maxY + footprint &&
    squaredDistance(x, y, a, b) < squaredRadius - 1e-10);
}

/** Exact swept-circle check: valid endpoints alone cannot jump across a narrow island. */
export function polygonAllowsSegment(navigation, from, to, footprint = 0) {
  if (!polygonAllowsPoint(navigation, from.x, from.y, footprint) || !polygonAllowsPoint(navigation, to.x, to.y, footprint)) return false;
  const a = [from.x, from.y];
  const b = [to.x, to.y];
  const minX = Math.min(from.x, to.x) - footprint;
  const maxX = Math.max(from.x, to.x) + footprint;
  const minY = Math.min(from.y, to.y) - footprint;
  const maxY = Math.max(from.y, to.y) + footprint;
  return !geometry(navigation).edges.some((edge) => {
    if (maxX < edge.minX || minX > edge.maxX || maxY < edge.minY || minY > edge.maxY) return false;
    if (intersects(a, b, edge.a, edge.b)) return true;
    const distance = Math.min(
      squaredDistance(from.x, from.y, edge.a, edge.b), squaredDistance(to.x, to.y, edge.a, edge.b),
      squaredDistance(...edge.a, a, b), squaredDistance(...edge.b, a, b),
    );
    return distance < footprint * footprint - 1e-10;
  });
}

/** The tangent is independent of the normal's sign, including the boundary of a hole. */
export function polygonContactNormal(navigation, point) {
  let nearest = null;
  let shortest = Infinity;
  for (const { a, b } of geometry(navigation).edges) {
    const closest = closestPoint(point.x, point.y, a, b);
    const x = point.x - closest.x;
    const y = point.y - closest.y;
    const distance = Math.hypot(x, y);
    if (distance < shortest) {
      const edgeLength = Math.hypot(b[0] - a[0], b[1] - a[1]);
      nearest = distance > 1e-10 ? { x: x / distance, y: y / distance } : edgeLength > 0 ? { x: -(b[1] - a[1]) / edgeLength, y: (b[0] - a[0]) / edgeLength } : null;
      shortest = distance;
    }
  }
  return nearest;
}
