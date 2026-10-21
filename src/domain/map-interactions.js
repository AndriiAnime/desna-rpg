import { isWalkable, planRoute } from './clearing.js';

export function bludNoticeRadius(world) {
  return Math.hypot(world.spawn.x - world.enemy.x, world.spawn.y - world.enemy.y) * .3;
}

export function noticesHero(world, position, alreadyAlert = false) {
  const radius = bludNoticeRadius(world) + (alreadyAlert ? world.step : 0);
  return Math.hypot(position.x - world.enemy.x, position.y - world.enemy.y) <= radius;
}

export function nearRock(world, position) {
  const rock = world.rock;
  return Math.hypot((position.x - rock.x) / (rock.radiusX + 32),
    (position.y - rock.y) / (rock.radiusY + 28)) <= 1;
}

/** An object click ends at a reachable interaction point, never on the obstacle. */
export function planRockApproach(world, from) {
  if (nearRock(world, from)) return { status: 'accepted', path: [], target: { ...from }, interaction: 'rock' };
  const rock = world.rock;
  const candidates = Array.from({ length: 48 }, (_, index) => {
    const angle = index * Math.PI * 2 / 48;
    return { x: rock.x + Math.cos(angle) * (rock.radiusX + world.footprint + 12),
      y: rock.y + Math.sin(angle) * (rock.radiusY + world.footprint + 12) };
  }).filter(point => isWalkable(world, point.x, point.y) && nearRock(world, point));
  candidates.sort((a,b) => Math.hypot(a.x-from.x,a.y-from.y) - Math.hypot(b.x-from.x,b.y-from.y));
  for (const point of candidates) {
    const route = planRoute(world, from, point);
    if (route.status === 'accepted') return { ...route, interaction: 'rock' };
  }
  return { status: 'unreachable', path: [], target: { x: rock.x, y: rock.y }, interaction: 'rock' };
}
