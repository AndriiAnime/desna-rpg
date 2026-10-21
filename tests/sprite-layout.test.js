import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spriteLayout, frameOriginPixels } from "../src/domain/sprite-layout.js";

test("uneven uniform sheets retain edge pixels and one stable registration size", () => {
  const layout = spriteLayout({ columns: 2, rows: 2 }, 11, 9);
  assert.deepEqual(layout.frameRects, [
    { x: 0, y: 0, width: 5, height: 4 }, { x: 5, y: 0, width: 6, height: 4 },
    { x: 0, y: 4, width: 5, height: 5 }, { x: 5, y: 4, width: 6, height: 5 },
  ]);
  const actor = { ...layout, origin: [0.5, 1] };
  assert.deepEqual(frameOriginPixels(actor, 0), frameOriginPixels(actor, 3));
});

test("hero atlas uses individual crops and keeps each row registered to a stable baseline", () => {
  const manifest = JSON.parse(readFileSync(new URL("../public/assets/map-sprites/manifest.json", import.meta.url)));
  const hero = manifest.actors.find((actor) => actor.id === "hero");
  const png = readFileSync(new URL(`../public/assets/map-sprites/${hero.file}`, import.meta.url));
  const layout = spriteLayout(hero, png.readUInt32BE(16), png.readUInt32BE(20));
  assert.equal(layout.explicitFrames, true);
  for (const frames of Object.values(hero.animations)) {
    const baseline = layout.frameRects[frames[0]].y + frameOriginPixels({ ...hero, ...layout }, frames[0])[1];
    for (const frame of frames) {
      const rect = layout.frameRects[frame];
      const [, originY] = frameOriginPixels({ ...hero, ...layout }, frame);
      assert.ok(Math.abs(rect.y + originY - baseline) < 0.01);
    }
  }
});

test("invalid atlas crops are rejected before Phaser attempts to render them", () => {
  assert.throws(() => spriteLayout({ columns: 1, rows: 1,
    frameRects: [{ x: 5, y: 0, width: 8, height: 8 }] }, 10, 10), /Кадр/);
  assert.throws(() => spriteLayout({ columns: 2, rows: 1, frameRects: [] }, 10, 10), /Кадр/);
});

test("new idle sheets decode to their declared crop bounds and animation frame references", () => {
  const manifest = JSON.parse(readFileSync(new URL('../public/assets/map-sprites/idle-candidates-v1.json',import.meta.url)));
  for(const config of Object.values(manifest.entries)) {
    const png=readFileSync(new URL(`../public/assets/${config.file}`,import.meta.url));
    const width=png.readUInt32BE(16),height=png.readUInt32BE(20);
    assert.equal(width,config.width);assert.equal(height,config.height);
    const layout=spriteLayout(config,width,height);
    for(const frames of Object.values(config.animations))for(const frame of frames){
      assert.ok(layout.frameRects[frame]);
      assert.ok(frameOriginPixels({...config,...layout},frame).every(Number.isFinite));
    }
    if(config.frameDurationsMs){assert.equal(config.frameDurationsMs.length,config.animations.idle.length);assert.ok(config.frameDurationsMs.every(ms=>ms>0));}
  }
});
