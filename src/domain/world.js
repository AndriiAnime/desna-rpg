const DIRECTIONS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

function isInside(world, x, y) {
  return (
    Number.isInteger(x) &&
    Number.isInteger(y) &&
    x >= 0 &&
    y >= 0 &&
    x < world.width &&
    y < world.height
  );
}

/** Checks terrain only; entities are handled separately as interactions. */
export function isWalkable(world, x, y) {
  if (!isInside(world, x, y)) return false;

  const tile = world.tiles[y]?.[x];
  return world.tileLegend[tile]?.walkable === true;
}

export function createWorldState(world) {
  return {
    position: { ...world.spawn },
    facing: "down",
    steps: 0,
  };
}

/** Resolves exactly one grid step without changing the supplied state or world. */
export function attemptMove(state, direction, world) {
  if (typeof direction !== "string" || !Object.hasOwn(DIRECTIONS, direction)) {
    throw new RangeError(`Unknown movement direction: ${String(direction)}`);
  }

  const offset = DIRECTIONS[direction];
  const target = {
    x: state.position.x + offset.x,
    y: state.position.y + offset.y,
  };
  const nextState = {
    ...state,
    position: { ...state.position },
    facing: direction,
  };

  if (!isWalkable(world, target.x, target.y)) {
    return {
      state: nextState,
      events: [
        {
          type: "blocked",
          reason: isInside(world, target.x, target.y) ? "terrain" : "boundary",
          position: target,
        },
      ],
    };
  }

  const entity = world.entities.find(
    ({ x, y }) => x === target.x && y === target.y,
  );
  if (entity) {
    return {
      state: nextState,
      events: [{ type: "interaction", entityId: entity.id }],
    };
  }

  return {
    state: { ...nextState, position: target, steps: state.steps + 1 },
    events: [{ type: "moved", from: { ...state.position }, to: { ...target } }],
  };
}
