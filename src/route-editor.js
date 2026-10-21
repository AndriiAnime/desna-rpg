import "./route-editor.css";
import { CLEARING } from "./content/clearing.js";
import { isWalkable } from "./domain/clearing.js";

const MAP_SOURCE = `${import.meta.env.BASE_URL}assets/map-sprites/map-v8.png`;
// Retain the original coordinate-registration key so the user's nine strokes
// remain available for comparison with the new artwork and collision polygon.
const MAP_ID = "map-v6-1402x1122";
const DRAFT_KEY = `desna.route-annotation.v1.${MAP_ID}`;
const CORAL = "#ff795c";
const canvas = document.querySelector("#route-canvas");
const context = canvas.getContext("2d");
const viewport = document.querySelector("#map-viewport");
const status = document.querySelector("#map-status");
const draftStatus = document.querySelector("#draft-status");
const controls = Object.fromEntries([
  "pen-tool", "pan-tool", "pen-width", "width-value", "undo", "clear", "export-png", "export-json",
  "show-area", "area-opacity", "opacity-value", "show-centerlines", "map-zoom", "zoom-value", "fit-map",
].map((id) => [id, document.getElementById(id)]));

let strokes = restoreDraft();
let activeStroke = null;
let pointer = null;
let tool = "pen";
let ready = false;
let zoom = 1;
let mask;
let renderPending = false;
const mapImage = new Image();

function restoreDraft() {
  try {
    const draft = JSON.parse(localStorage.getItem(DRAFT_KEY));
    if (draft?.mapId !== MAP_ID || !Array.isArray(draft.strokes)) return [];
    return draft.strokes.filter((stroke) => Number.isFinite(stroke.width) && stroke.width >= 1 && stroke.width <= 100 &&
      Array.isArray(stroke.points) && stroke.points.length && stroke.points.every((point) =>
        Array.isArray(point) && point.length === 2 && point.every(Number.isFinite) &&
        point[0] >= 0 && point[0] <= CLEARING.width && point[1] >= 0 && point[1] <= CLEARING.height));
  } catch {
    return [];
  }
}

function saveDraft() {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ version: 1, mapId: MAP_ID, strokes }));
    draftStatus.textContent = strokes.length ? `Збережено у браузері · штрихів: ${strokes.length}` : "Чернетка порожня";
  } catch {
    draftStatus.textContent = "Браузер не зберіг чернетку — збережи PNG або JSON";
  }
  updateButtons();
}

function updateButtons() {
  controls.undo.disabled = strokes.length === 0;
  controls.clear.disabled = strokes.length === 0;
  controls["export-png"].disabled = !ready;
  controls["export-json"].disabled = !ready;
}

/** One-pixel sampling of the real collision query, cached independently of UI controls. */
function buildWalkableMask() {
  const layer = document.createElement("canvas");
  layer.width = CLEARING.width;
  layer.height = CLEARING.height;
  const layerContext = layer.getContext("2d", { willReadFrequently: true });
  // A broad candidate region avoids querying distant scenery. The final decision
  // for each candidate pixel still comes from the game's isWalkable function.
  layerContext.strokeStyle = "white";
  layerContext.fillStyle = "white";
  layerContext.lineCap = "round";
  layerContext.lineJoin = "round";
  if (CLEARING.navigation) {
    layerContext.beginPath();
    for (const ring of [CLEARING.navigation.outer, ...CLEARING.navigation.holes]) {
      ring.forEach(([x, y], index) => index ? layerContext.lineTo(x, y) : layerContext.moveTo(x, y));
      layerContext.closePath();
    }
    layerContext.fill("evenodd");
  } else for (const road of CLEARING.roads) {
    layerContext.lineWidth = road.radius * 2 + 4;
    layerContext.beginPath();
    road.points.forEach(([x, y], index) => index ? layerContext.lineTo(x, y) : layerContext.moveTo(x, y));
    layerContext.stroke();
  }
  const pixels = layerContext.getImageData(0, 0, layer.width, layer.height);
  for (let y = 0; y < layer.height; y += 1) {
    for (let x = 0; x < layer.width; x += 1) {
      const offset = (y * layer.width + x) * 4;
      if (!pixels.data[offset + 3]) continue;
      const allowed = isWalkable(CLEARING, x + .5, y + .5);
      pixels.data[offset] = 72;
      pixels.data[offset + 1] = 223;
      pixels.data[offset + 2] = 208;
      pixels.data[offset + 3] = allowed ? 255 : 0;
    }
  }
  layerContext.putImageData(pixels, 0, 0);
  return layer;
}

function drawMarkers() {
  context.save();
  const footprint = CLEARING.footprint ?? 0;
  const { rock, enemy, spawn } = CLEARING;
  context.lineWidth = 3;
  context.strokeStyle = "#f5737c";
  context.fillStyle = "#f5737c22";
  context.beginPath();
  context.ellipse(rock.x, rock.y, rock.radiusX + footprint, rock.radiusY + footprint, 0, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.strokeStyle = "#ffd170";
  context.fillStyle = "#ffd17018";
  context.setLineDash([8, 6]);
  context.beginPath();
  context.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.setLineDash([]);
  context.fillStyle = "#f5f2de";
  context.strokeStyle = "#15251c";
  context.lineWidth = 3;
  context.beginPath();
  context.arc(spawn.x, spawn.y, 7, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.font = "bold 17px Arial, sans-serif";
  context.lineWidth = 5;
  context.strokeStyle = "#0b120c";
  for (const [label, x, y, color] of [
    ["СТАРТ", spawn.x + 15, spawn.y - 10, "#f5f2de"],
    ["КАМІНЬ", rock.x - 39, rock.y - rock.radiusY - footprint - 12, "#ff9da4"],
    ["БІЙ", enemy.x - 15, enemy.y + enemy.radius + 24, "#ffd170"],
  ]) {
    context.strokeText(label, x, y);
    context.fillStyle = color;
    context.fillText(label, x, y);
  }
  context.restore();
}

function drawStroke(stroke) {
  context.save();
  context.strokeStyle = CORAL;
  context.fillStyle = CORAL;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.lineWidth = stroke.width;
  context.shadowColor = "#331b13";
  context.shadowBlur = 2;
  context.beginPath();
  stroke.points.forEach(([x, y], index) => index ? context.lineTo(x, y) : context.moveTo(x, y));
  context.stroke();
  if (stroke.points.length === 1) {
    context.beginPath();
    context.arc(stroke.points[0][0], stroke.points[0][1], stroke.width / 2, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
}

function render() {
  renderPending = false;
  if (!ready) return;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(mapImage, 0, 0, canvas.width, canvas.height);
  if (controls["show-area"].checked) {
    context.save();
    context.globalAlpha = Number(controls["area-opacity"].value) / 100;
    context.drawImage(mask, 0, 0);
    context.restore();
  }
  if (controls["show-centerlines"].checked) {
    context.save();
    context.strokeStyle = "#f3f6b4";
    context.lineWidth = 2;
    context.setLineDash([9, 7]);
    for (const road of CLEARING.roads) {
      context.beginPath();
      road.points.forEach(([x, y], index) => index ? context.lineTo(x, y) : context.moveTo(x, y));
      context.stroke();
    }
    context.restore();
  }
  drawMarkers();
  strokes.forEach(drawStroke);
  if (activeStroke) drawStroke(activeStroke);
}

function scheduleRender() {
  if (renderPending) return;
  renderPending = true;
  requestAnimationFrame(render);
}

function mapPoint(event) {
  const bounds = canvas.getBoundingClientRect();
  return [
    Math.max(0, Math.min(canvas.width, (event.clientX - bounds.left) * canvas.width / bounds.width)),
    Math.max(0, Math.min(canvas.height, (event.clientY - bounds.top) * canvas.height / bounds.height)),
  ].map((value) => Math.round(value * 10) / 10);
}

function finishPointer(event) {
  if (!pointer || (event && event.pointerId !== pointer.id)) return;
  if (activeStroke) {
    strokes.push(activeStroke);
    activeStroke = null;
    saveDraft();
  }
  const pointerId = pointer.id;
  pointer = null;
  if (canvas.hasPointerCapture(pointerId)) canvas.releasePointerCapture(pointerId);
  canvas.classList.remove("panning");
  scheduleRender();
}

canvas.addEventListener("pointerdown", (event) => {
  if (!ready || pointer || event.button !== 0) return;
  event.preventDefault();
  pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, scrollX: viewport.scrollLeft, scrollY: viewport.scrollTop };
  canvas.setPointerCapture(event.pointerId);
  if (tool === "pen") {
    activeStroke = { width: Number(controls["pen-width"].value), points: [mapPoint(event)] };
    scheduleRender();
  } else canvas.classList.add("panning");
});

canvas.addEventListener("pointermove", (event) => {
  if (!pointer || event.pointerId !== pointer.id) return;
  if (activeStroke) {
    const events = event.getCoalescedEvents?.() ?? [event];
    for (const sample of events.length ? events : [event]) {
      const point = mapPoint(sample);
      const previous = activeStroke.points.at(-1);
      if (Math.hypot(point[0] - previous[0], point[1] - previous[1]) >= .8) activeStroke.points.push(point);
    }
    scheduleRender();
  } else {
    viewport.scrollLeft = pointer.scrollX - (event.clientX - pointer.x);
    viewport.scrollTop = pointer.scrollY - (event.clientY - pointer.y);
  }
});
canvas.addEventListener("pointerup", finishPointer);
canvas.addEventListener("pointercancel", finishPointer);
canvas.addEventListener("lostpointercapture", finishPointer);
window.addEventListener("blur", () => finishPointer());

function selectTool(next) {
  finishPointer();
  tool = next;
  controls["pen-tool"].classList.toggle("selected", next === "pen");
  controls["pan-tool"].classList.toggle("selected", next === "pan");
  controls["pen-tool"].setAttribute("aria-pressed", String(next === "pen"));
  controls["pan-tool"].setAttribute("aria-pressed", String(next === "pan"));
  canvas.classList.toggle("pan-mode", next === "pan");
}

function setZoom(next, fit = false) {
  finishPointer();
  const centerX = (viewport.scrollLeft + viewport.clientWidth / 2) / zoom;
  const centerY = (viewport.scrollTop + viewport.clientHeight / 2) / zoom;
  zoom = next;
  canvas.style.width = `${canvas.width * zoom}px`;
  canvas.style.height = `${canvas.height * zoom}px`;
  controls["map-zoom"].value = Math.round(zoom * 100);
  controls["zoom-value"].value = `${Math.round(zoom * 100)}%`;
  viewport.scrollLeft = fit ? 0 : centerX * zoom - viewport.clientWidth / 2;
  viewport.scrollTop = fit ? 0 : centerY * zoom - viewport.clientHeight / 2;
}

function fitMap() {
  const availableHeight = parseFloat(getComputedStyle(viewport).maxHeight) || viewport.clientHeight;
  const fit = Math.min(1, viewport.clientWidth / canvas.width, availableHeight / canvas.height);
  controls["map-zoom"].min = Math.min(20, Math.floor(fit * 100));
  setZoom(fit, true);
}

function downloadBlob(blob, filename) {
  if (!blob) {
    status.textContent = "Не вдалося підготувати файл. Спробуй ще раз.";
    return;
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

controls["pen-tool"].addEventListener("click", () => selectTool("pen"));
controls["pan-tool"].addEventListener("click", () => selectTool("pan"));
controls["pen-width"].addEventListener("input", () => { controls["width-value"].value = controls["pen-width"].value; });
controls["show-area"].addEventListener("change", scheduleRender);
controls["show-centerlines"].addEventListener("change", scheduleRender);
controls["area-opacity"].addEventListener("input", () => {
  controls["opacity-value"].value = `${controls["area-opacity"].value}%`;
  scheduleRender();
});
controls["map-zoom"].addEventListener("input", () => setZoom(Number(controls["map-zoom"].value) / 100));
controls["fit-map"].addEventListener("click", fitMap);
controls.undo.addEventListener("click", () => {
  finishPointer();
  strokes.pop();
  saveDraft();
  scheduleRender();
});
controls.clear.addEventListener("click", () => {
  finishPointer();
  strokes = [];
  saveDraft();
  scheduleRender();
});
controls["export-png"].addEventListener("click", () => {
  finishPointer();
  render();
  canvas.toBlob((blob) => downloadBlob(blob, "desna-route-annotation.png"), "image/png");
  status.textContent = "PNG підготовлено з поточними видимими шарами, у повному розмірі 1402 × 1122.";
});
controls["export-json"].addEventListener("click", () => {
  finishPointer();
  const document = {
    version: 1, mapId: MAP_ID, map: MAP_SOURCE, width: canvas.width, height: canvas.height,
    coordinateSystem: "image pixels, origin top-left", exportedAt: new Date().toISOString(),
    currentNavigation: CLEARING, strokes,
  };
  downloadBlob(new Blob([JSON.stringify(document, null, 2)], { type: "application/json" }), "desna-route-annotation.json");
  status.textContent = "JSON підготовлено: штрихи та координати поточних маршрутів.";
});

mapImage.addEventListener("load", () => {
  // Let the loading status paint before the one-time geometry calculation.
  requestAnimationFrame(() => requestAnimationFrame(() => {
    mask = buildWalkableMask();
    ready = true;
    fitMap();
    render();
    updateButtons();
    if (strokes.length) draftStatus.textContent = `Відновлено чернетку · штрихів: ${strokes.length}`;
    status.textContent = "Мапа готова. Намалюй маршрут кораловою лінією; кожен штрих можна скасувати.";
  }));
});
mapImage.addEventListener("error", () => {
  status.textContent = "Не вдалося завантажити мапу. Онови сторінку після запуску гри.";
});
mapImage.src = MAP_SOURCE;
