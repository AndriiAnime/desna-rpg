/** Atlas rectangles can be explicit when generated artwork is not a uniform grid. */
export function spriteLayout(config, width, height) {
  const { columns, rows } = config;
  if (!Number.isInteger(columns) || !Number.isInteger(rows) || columns < 1 || rows < 1) {
    throw new Error(`Некоректна сітка спрайтів: ${config.id}.`);
  }
  const frameWidth = Math.ceil(width / columns);
  const frameHeight = Math.ceil(height / rows);
  const explicitFrames = Array.isArray(config.frameRects);
  const frameRects = explicitFrames ? config.frameRects : Array.from({ length: columns * rows }, (_, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const x = Math.floor(column * width / columns);
    const y = Math.floor(row * height / rows);
    return { x, y, width: Math.floor((column + 1) * width / columns) - x, height: Math.floor((row + 1) * height / rows) - y };
  });
  if (frameRects.length !== columns * rows || frameRects.some((rect) =>
    ![rect.x, rect.y, rect.width, rect.height].every(Number.isInteger) ||
    rect.x < 0 || rect.y < 0 || rect.width < 1 || rect.height < 1 ||
    rect.x + rect.width > width || rect.y + rect.height > height)) {
    throw new Error(`Кадр виходить за межі спрайт-листа: ${config.id}.`);
  }
  return { frameWidth, frameHeight, frameRects, explicitFrames };
}

export function frameOriginPixels(actor, frame) {
  const origin = actor.frameOrigins?.[frame] || actor.origin || [0.5, 0.92];
  const size = actor.explicitFrames ? actor.frameRects[frame] : { width: actor.frameWidth, height: actor.frameHeight };
  return [size.width * origin[0], size.height * origin[1]];
}
