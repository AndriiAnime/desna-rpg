import Phaser from "phaser";
import "./sprite-preview.css";
import { spriteLayout, frameOriginPixels } from "./domain/sprite-layout.js";

const $ = (selector) => document.querySelector(selector);
const ASSET_ROOT = `${import.meta.env.BASE_URL}assets/map-sprites/`;
const mapViews = [
  { id: "primary", parent: "sprite-map", defaults: { spriteScale: 1.95, cameraZoom: 1 } },
  { id: "camera", parent: "sprite-map-camera", defaults: { spriteScale: 1.65, cameraZoom: 1.5 } },
].map((view) => ({ ...view, ...view.defaults, scene: null }));
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const directionRows = ["SW", "SE", "NW", "NE"];
const fallbackPositions = {
  hero: [340, 900], moth: [410, 825], apprentice: [480, 690],
  elder: [780, 550], smith: [1000, 755], blud: [1120, 835],
  rusalka: [1265, 930], upyr: [1090, 480],
};
const state = { actors: [], selected: null, playing: !reducedMotion.matches, speed: 1, zoom: 1 };
const inspector = $("#sprite-inspector");
const context = inspector.getContext("2d");
const games = [];

function assetURL(file) {
  if (typeof file !== "string" || !/^[a-zA-Z0-9_.-]+$/.test(file)) {
    throw new Error("У переліку ресурсів є некоректне ім’я файлу.");
  }
  return `${ASSET_ROOT}${file}`;
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const timeout = setTimeout(() => {
      image.onload = image.onerror = null;
      image.src = "";
      reject(new Error(`Не вдалося завантажити ${file}.`));
    }, 20000);
    image.onload = () => { clearTimeout(timeout); resolve(image); };
    image.onerror = () => { clearTimeout(timeout); reject(new Error(`Не вдалося завантажити ${file}.`)); };
    image.src = assetURL(file);
  });
}

function framesFor(actor) {
  if (actor.id !== "hero") return actor.animations.idle;
  const direction = actor.direction || "SW";
  return actor.animations[`walk-${direction}`] ||
    actor.animations[`walk${direction}`] ||
    actor.animations[`walk_${direction.toLowerCase()}`] ||
    actor.animations[direction] ||
    Array.from({ length: actor.columns }, (_, index) => directionRows.indexOf(direction) * actor.columns + index);
}

function prepareActor(config, image) {
  const columns = config.columns || (config.id === "hero" ? 4 : 2);
  const rows = config.rows || (config.id === "hero" ? 4 : 2);
  if (!Number.isInteger(columns) || columns < 1 || !Number.isInteger(rows) || rows < 1 ||
      image.naturalWidth < columns || image.naturalHeight < rows) {
    throw new Error(`«${config.name}»: розміри аркуша не відповідають кількості кадрів.`);
  }
  // Generated dimensions need not divide evenly. Explicit rectangles retain every
  // pixel; one common logical cell size keeps the scale and anchor unchanged.
  const layout = spriteLayout({ ...config, columns, rows }, image.naturalWidth, image.naturalHeight);
  const { frameWidth, frameHeight, frameRects } = layout;
  const animations = config.animations || { idle: [0, 1, 2, 3] };
  for (const frames of Object.values(animations)) {
    if (!Array.isArray(frames) || !frames.length ||
        frames.some((frame) => !Number.isInteger(frame) || frame < 0 || frame >= rows * columns)) {
      throw new Error(`«${config.name}»: некоректна послідовність кадрів.`);
    }
  }
  if (config.id !== "hero" && !animations.idle) {
    throw new Error(`«${config.name}»: відсутня анімація очікування.`);
  }
  const actor = {
    ...config, image, columns, rows, ...layout, animations,
    frameRate: Number(config.frameRate) > 0 ? Number(config.frameRate) : 5,
    origin: config.origin || [0.5, 0.88],
    position: config.position || fallbackPositions[config.id] || [700, 700],
    displayHeight: Number(config.displayHeight) > 0 ? Number(config.displayHeight) : 145,
    elapsed: 0, frameIndex: 0, direction: "SW",
  };
  actor.scale = actor.displayHeight / frameHeight;
  return actor;
}

function actorOffset(actor, frame) {
  const offset = actor.frameOffsets?.[frame] || actor.offset || [0, 0];
  return [Number(offset[0]) || 0, Number(offset[1]) || 0];
}

function drawInspector() {
  context.clearRect(0, 0, inspector.width, inspector.height);
  const actor = state.selected;
  if (!actor) return;
  const frame = framesFor(actor)[actor.frameIndex];
  const rect = actor.frameRects[frame];
  const origin = frameOriginPixels(actor, frame);
  const scale = actor.scale * state.zoom;
  const anchorX = inspector.width / 2;
  const anchorY = inspector.height - 48;
  const [offsetX, offsetY] = actorOffset(actor, frame);
  context.strokeStyle = "#c9b77e66";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(20, anchorY + 0.5);
  context.lineTo(inspector.width - 20, anchorY + 0.5);
  context.stroke();
  context.imageSmoothingEnabled = false;
  context.drawImage(
    actor.image,
    rect.x, rect.y, rect.width, rect.height,
    anchorX - origin[0] * scale + offsetX * scale,
    anchorY - origin[1] * scale + offsetY * scale,
    rect.width * scale, rect.height * scale,
  );
  context.fillStyle = "#ead18f";
  context.fillRect(anchorX - 2, anchorY - 2, 4, 4);
}

function refreshFrameControls() {
  const actor = state.selected;
  if (!actor) return;
  const frames = framesFor(actor);
  $("#frame-slider").max = String(frames.length - 1);
  $("#frame-slider").value = String(actor.frameIndex);
  $("#frame-label").textContent = `${actor.frameIndex + 1} / ${frames.length}`;
  $("#frame-slider").setAttribute("aria-valuetext", `Кадр ${actor.frameIndex + 1} із ${frames.length}`);
  drawInspector();
}

function applyActorFrame(actor) {
  for (const view of mapViews) view.scene?.applyFrame(actor);
  if (actor === state.selected) refreshFrameControls();
}

function setPlaying(playing) {
  state.playing = playing;
  $("#play-toggle").textContent = playing ? "Пауза" : "Відтворити";
  $("#play-toggle").setAttribute("aria-pressed", String(playing));
}

function selectActor(id) {
  const actor = state.actors.find((item) => item.id === id);
  if (!actor) return;
  state.selected = actor;
  $("#actor-select").value = id;
  $("#inspector-heading").textContent = actor.name;
  $("#animation-label").textContent = actor.id === "hero" ? "Ходьба" : "Очікування";
  $("#hero-directions").hidden = actor.id !== "hero";
  $("#hero-direction").value = actor.direction;
  inspector.setAttribute("aria-label", `Крупний план: ${actor.name}`);
  for (const button of $("#cast-list").querySelectorAll("button")) {
    button.setAttribute("aria-pressed", String(button.dataset.actor === id));
  }
  for (const view of mapViews) {
    view.scene?.selectionRing.setPosition(...actor.position).setVisible(true);
    view.scene?.focusActor();
  }
  refreshFrameControls();
}

function scrubFrame(index) {
  const actor = state.selected;
  if (!actor) return;
  setPlaying(false);
  const count = framesFor(actor).length;
  actor.frameIndex = (index + count) % count;
  actor.elapsed = actor.frameIndex * 1000 / actor.frameRate;
  applyActorFrame(actor);
}

class SpritePreviewScene extends Phaser.Scene {
  constructor(map, manifest, view) {
    super(`SpritePreview-${view.id}`);
    this.mapImage = map;
    this.manifest = manifest;
    this.view = view;
    this.actorSprites = new Map();
    this.panGesture = null;
  }

  create() {
    this.textures.addImage("preview-map", this.mapImage);
    this.add.image(0, 0, "preview-map").setOrigin(0).setDisplaySize(this.manifest.width, this.manifest.height);
    for (const actor of state.actors) {
      const key = `preview-${actor.id}`;
      const texture = this.textures.addImage(key, actor.image);
      actor.frameRects.forEach((rect, index) => texture.add(index, 0, rect.x, rect.y, rect.width, rect.height));
      const shadow = this.add.ellipse(
        actor.position[0], actor.position[1], Math.min(54, actor.displayHeight * 0.3), 11, 0x0b1411, 0.28,
      ).setDepth(1);
      const sprite = this.add.sprite(...actor.position, key, framesFor(actor)[0])
        .setDisplayOrigin(...frameOriginPixels(actor, framesFor(actor)[0]))
        .setDepth(actor.position[1] + 10);
      this.actorSprites.set(actor.id, { sprite, shadow });
      sprite.setInteractive({ pixelPerfect: true, alphaTolerance: 32 });
      sprite.on("pointerup", () => {
        if (this.panGesture && !this.panGesture.moved) selectActor(actor.id);
      });
    }
    this.selectionRing = this.add.ellipse(0, 0, 46, 18)
      .setStrokeStyle(2, 0xe3c986, 0.95).setDepth(2).setVisible(false);
    this.view.scene = this;
    this.cameras.main.setBounds(0, 0, this.manifest.width, this.manifest.height);
    this.updateSpriteScale();
    this.updateCameraZoom();
    this.enableCameraDrag();
    if (!state.selected) selectActor(state.actors[0].id);
    else {
      this.selectionRing.setPosition(...state.selected.position).setVisible(true);
      this.focusActor();
    }
    $("#preview-controls").disabled = false;
    $(`#${this.view.id}-scale-controls`).disabled = false;
    updateViewControls(this.view);
    setPlaying(state.playing);
  }

  applyFrame(actor) {
    const { sprite } = this.actorSprites.get(actor.id);
    const frame = framesFor(actor)[actor.frameIndex];
    const [offsetX, offsetY] = actorOffset(actor, frame);
    const origin = frameOriginPixels(actor, frame);
    const scale = actor.scale * this.view.spriteScale;
    sprite.setFrame(frame)
      .setDisplayOrigin(...origin)
      .setPosition(actor.position[0] + offsetX * scale, actor.position[1] + offsetY * scale);
  }

  updateSpriteScale() {
    for (const actor of state.actors) {
      const { sprite, shadow } = this.actorSprites.get(actor.id);
      sprite.setScale(actor.scale * this.view.spriteScale);
      shadow.setScale(this.view.spriteScale);
      this.applyFrame(actor);
    }
    this.selectionRing.setScale(this.view.spriteScale / 1.95);
  }

  updateCameraZoom() {
    const camera = this.cameras.main;
    const wasFullMap = camera.zoom === 1;
    const centerX = camera.scrollX + camera.width / 2;
    const centerY = camera.scrollY + camera.height / 2;
    camera.setZoom(this.view.cameraZoom).centerOn(centerX, centerY);
    if (wasFullMap && this.view.cameraZoom > 1) this.focusActor();
    $(`#${this.view.parent}`).classList.toggle("is-zoomed", this.view.cameraZoom > 1);
  }

  focusActor() {
    if (!state.selected) return;
    const actor = state.selected;
    // Frame the whole figure, not just the anchor at its feet. Bounds clamp
    // the camera near map edges, and zoom 1 always returns to the full map.
    this.cameras.main.centerOn(
      actor.position[0], actor.position[1] - actor.displayHeight * this.view.spriteScale * 0.4,
    );
  }

  enableCameraDrag() {
    const host = $(`#${this.view.parent}`);
    const stop = () => { this.panGesture = null; host.classList.remove("is-panning"); };
    this.input.on("pointerdown", (pointer) => {
      this.panGesture = {
        pointerId: pointer.id, x: pointer.x, y: pointer.y, moved: false,
        scrollX: this.cameras.main.scrollX, scrollY: this.cameras.main.scrollY,
      };
    });
    this.input.on("pointermove", (pointer) => {
      const drag = this.panGesture;
      if (!drag || pointer.id !== drag.pointerId) return;
      if (!pointer.isDown) { stop(); return; }
      const dx = pointer.x - drag.x;
      const dy = pointer.y - drag.y;
      if (Math.hypot(dx, dy) > 8) drag.moved = true;
      if (!drag.moved || this.view.cameraZoom <= 1) return;
      const camera = this.cameras.main;
      camera.setScroll(
        camera.clampX(drag.scrollX - dx / camera.zoom),
        camera.clampY(drag.scrollY - dy / camera.zoom),
      );
      host.classList.add("is-panning");
    });
    this.input.on("pointerup", stop);
    this.input.on("pointerupoutside", stop);
  }

  update(_time, delta) {
    // One clock drives both previews so speed, direction and frame scrubbing
    // remain identical even though the maps use separate Phaser canvases.
    if (this.view.id !== "primary" || !state.playing || document.hidden) return;
    for (const actor of state.actors) {
      actor.elapsed += Math.min(delta, 100) * state.speed;
      const next = Math.floor(actor.elapsed * actor.frameRate / 1000) % framesFor(actor).length;
      if (next !== actor.frameIndex) {
        actor.frameIndex = next;
        applyActorFrame(actor);
      }
    }
  }
}

function fillActorControls(configs, failures) {
  for (const config of configs) {
    const available = state.actors.some((actor) => actor.id === config.id);
    const option = document.createElement("option");
    option.value = config.id;
    option.textContent = available ? config.name : `${config.name} · недоступно`;
    option.disabled = !available;
    $("#actor-select").append(option);
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.actor = config.id;
    button.textContent = config.name;
    button.disabled = !available;
    button.setAttribute("aria-pressed", "false");
    button.addEventListener("click", () => selectActor(config.id));
    $("#cast-list").append(button);
  }
  $("#cast-count").textContent = `${state.actors.length} із ${configs.length} персонажів`;
  const status = $("#load-status");
  status.textContent = failures.length
    ? `Мапа готова. Не завантажилися: ${failures.join(", ")}.`
    : "Увесь склад на мапі. Виберіть персонажа, щоб роздивитися його рух.";
  status.classList.toggle("error", failures.length > 0);
  $("#retry").hidden = failures.length === 0;
}

async function boot() {
  try {
    const response = await fetch(`${ASSET_ROOT}manifest.json`, { cache: "no-store", signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error("Перелік спрайтів ще не завантажений.");
    const manifest = await response.json();
    if (!Array.isArray(manifest.actors) || !manifest.actors.length ||
        !Number.isFinite(manifest.width) || manifest.width <= 0 ||
        !Number.isFinite(manifest.height) || manifest.height <= 0) {
      throw new Error("Перелік спрайтів не містить потрібних даних.");
    }
    const ids = manifest.actors.map((actor) => actor.id);
    if (new Set(ids).size !== ids.length || ids.some((id) => typeof id !== "string" || !/^[a-z0-9-]+$/.test(id))) {
      throw new Error("У переліку повторюються або відсутні персонажі.");
    }
    const map = await loadImage(manifest.map);
    const results = await Promise.allSettled(manifest.actors.map(async (config) => prepareActor(config, await loadImage(config.file))));
    const failures = [];
    results.forEach((result, index) => {
      if (result.status === "fulfilled") state.actors.push(result.value);
      else {
        failures.push(manifest.actors[index].name);
        console.warn(result.reason);
      }
    });
    if (!state.actors.length) throw new Error("Спрайти ще не завантажені. Спробуйте оновити перегляд трохи пізніше.");
    fillActorControls(manifest.actors, failures);
    for (const view of mapViews) {
      $(`#${view.parent}`).style.setProperty("--map-ratio", `${manifest.width} / ${manifest.height}`);
      games.push(new Phaser.Game({
        type: Phaser.AUTO,
        parent: view.parent,
        width: manifest.width,
        height: manifest.height,
        backgroundColor: "#060c0b",
        pixelArt: false,
        roundPixels: true,
        antialias: true,
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
        scene: [new SpritePreviewScene(map, manifest, view)],
        input: { keyboard: false },
        banner: false,
        callbacks: { postBoot: (instance) => instance.canvas.setAttribute("aria-hidden", "true") },
      }));
    }
  } catch (error) {
    $("#load-status").textContent = `Перегляд поки недоступний. ${error.message}`;
    $("#load-status").classList.add("error");
    $("#retry").hidden = false;
    console.error(error);
  }
}

function updateViewControls(view) {
  for (const [suffix, value] of [["sprite-scale", view.spriteScale], ["camera-zoom", view.cameraZoom]]) {
    const formatted = `${value.toFixed(2).replace(".", ",")}×`;
    $(`#${view.id}-${suffix}`).value = String(value);
    $(`#${view.id}-${suffix}`).setAttribute("aria-valuetext", formatted);
    $(`#${view.id}-${suffix}-value`).value = formatted;
  }
}

for (const view of mapViews) {
  $(`#${view.id}-sprite-scale`).addEventListener("input", (event) => {
    view.spriteScale = Number(event.target.value);
    view.scene?.updateSpriteScale();
    updateViewControls(view);
  });
  $(`#${view.id}-camera-zoom`).addEventListener("input", (event) => {
    view.cameraZoom = Number(event.target.value);
    view.scene?.updateCameraZoom();
    updateViewControls(view);
  });
  $(`#${view.id}-reset`).addEventListener("click", () => {
    Object.assign(view, view.defaults);
    view.scene?.updateSpriteScale();
    view.scene?.updateCameraZoom();
    view.scene?.focusActor();
    updateViewControls(view);
  });
  $(`#${view.id}-focus`).addEventListener("click", () => view.scene?.focusActor());
}

$("#actor-select").addEventListener("change", (event) => selectActor(event.target.value));
$("#play-toggle").addEventListener("click", () => setPlaying(!state.playing));
$("#frame-slider").addEventListener("input", (event) => scrubFrame(Number(event.target.value)));
$("#previous-frame").addEventListener("click", () => scrubFrame(state.selected.frameIndex - 1));
$("#next-frame").addEventListener("click", () => scrubFrame(state.selected.frameIndex + 1));
$("#speed-select").addEventListener("change", (event) => { state.speed = Number(event.target.value); });
$("#hero-direction").addEventListener("change", (event) => {
  const hero = state.actors.find((actor) => actor.id === "hero");
  if (!hero) return;
  hero.direction = event.target.value;
  hero.elapsed = hero.frameIndex = 0;
  applyActorFrame(hero);
});
for (const button of document.querySelectorAll("[data-zoom]")) {
  button.addEventListener("click", () => {
    state.zoom = Number(button.dataset.zoom);
    for (const zoomButton of document.querySelectorAll("[data-zoom]")) {
      zoomButton.setAttribute("aria-pressed", String(zoomButton === button));
    }
    drawInspector();
  });
}
$("#retry").addEventListener("click", () => location.reload());
function updateMotionNote() {
  $("#motion-note").textContent = reducedMotion.matches
    ? "Увімкнено зменшення руху: анімація стартує лише після натискання «Відтворити»."
    : "Пауза зупиняє весь склад. Вибір кадру змінює лише обраного персонажа.";
}
reducedMotion.addEventListener("change", () => {
  if (reducedMotion.matches) setPlaying(false);
  updateMotionNote();
});
window.addEventListener("pagehide", (event) => {
  if (!event.persisted) for (const game of games) game.destroy(true);
});
updateMotionNote();
boot();
