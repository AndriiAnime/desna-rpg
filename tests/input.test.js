import test from "node:test";
import assert from "node:assert/strict";
import { bindMovement } from "../src/input.js";
import { STEP_INTERVAL_MS } from "../src/content/movement.js";

function dispatch(target, type, properties = {}) {
  const event = Object.assign(new Event(type, { cancelable: true }), properties);
  target.dispatchEvent(event);
  return event;
}

function createHarness(t, { onMove } = {}) {
  const window = new EventTarget();
  const document = Object.assign(new EventTarget(), { hidden: false });
  const button = Object.assign(new EventTarget(), {
    dataset: { direction: "right" },
    classList: {
      values: new Set(),
      add(value) { this.values.add(value); },
      remove(value) { this.values.delete(value); },
      contains(value) { return this.values.has(value); },
    },
    setPointerCapture(pointerId) { this.capturedPointer = pointerId; },
  });
  let now = 0;
  let nextFrameId = 0;
  let allowed = true;
  let movementReady = true;
  let moveAttempts = 0;
  let input;
  const frames = new Map();
  const moves = [];
  const replacements = {
    window,
    document,
    performance: { now: () => now },
    requestAnimationFrame(callback) {
      frames.set(++nextFrameId, callback);
      return nextFrameId;
    },
    cancelAnimationFrame(id) { frames.delete(id); },
  };
  const originals = new Map(Object.keys(replacements).map((key) => [
    key, Object.getOwnPropertyDescriptor(globalThis, key),
  ]));
  t.after(() => {
    input?.destroy();
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
  for (const [key, value] of Object.entries(replacements)) {
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  }
  input = bindMovement({
    buttons: [button],
    canMove: () => allowed && !document.hidden,
    move: (direction) => {
      moveAttempts += 1;
      if (!movementReady) return false;
      moves.push(direction);
      onMove?.(input);
      return true;
    },
  });

  return {
    window, document, button, moves, input,
    setAllowed(value) { allowed = value; },
    setMovementReady(value) { movementReady = value; },
    get moveAttempts() { return moveAttempts; },
    advance(milliseconds) {
      now += milliseconds;
      const callbacks = [...frames.values()];
      frames.clear();
      callbacks.forEach((callback) => callback(now));
    },
    keyDown(code = "ArrowRight", repeat = false) {
      return dispatch(window, "keydown", { code, repeat });
    },
    keyUp(code = "ArrowRight") { dispatch(window, "keyup", { code }); },
    pointerDown() { return dispatch(button, "pointerdown", { button: 0, pointerId: 7 }); },
    pointerEnd(type = "pointerup") { dispatch(button, type, { pointerId: 7 }); },
  };
}

test("closing a modal cannot revive a direction still physically held", (t) => {
  const h = createHarness(t);
  h.keyDown();
  assert.deepEqual(h.moves, ["right"]);

  h.setAllowed(false);
  h.input.releaseAll();
  h.keyDown("ArrowRight", true);
  h.advance(500);
  assert.deepEqual(h.moves, ["right"], "Movement stays locked while the modal is open");

  h.setAllowed(true);
  h.input.releaseAll();
  h.keyDown("ArrowRight", true);
  h.advance(500);
  assert.deepEqual(h.moves, ["right"], "A native repeat after closing must not act as a fresh press");

  h.keyUp();
  h.keyDown();
  assert.deepEqual(h.moves, ["right", "right"], "Releasing and pressing again restores movement");
});

test("blur stops a held key and native repeat cannot resume it", (t) => {
  const h = createHarness(t);
  h.keyDown("KeyW");
  h.advance(250);
  assert.deepEqual(h.moves, ["up", "up"]);

  dispatch(h.window, "blur");
  h.advance(500);
  h.keyDown("KeyW", true);
  h.advance(500);
  assert.deepEqual(h.moves, ["up", "up"]);

  h.keyUp("KeyW");
  h.keyDown("KeyW");
  assert.deepEqual(h.moves, ["up", "up", "up"]);
});

test("keyboard holding uses scheduled movement without duplicating native repeats", (t) => {
  const h = createHarness(t);
  assert.equal(h.keyDown().defaultPrevented, true);
  h.keyDown("ArrowRight", true);
  h.keyDown("ArrowRight", true);
  assert.deepEqual(h.moves, ["right"]);

  h.advance(250);
  assert.deepEqual(h.moves, ["right", "right"]);
  h.keyUp();
  h.advance(500);
  assert.deepEqual(h.moves, ["right", "right"]);
});

test("D-pad moves immediately, repeats while held, and stops on release", (t) => {
  const h = createHarness(t);
  assert.equal(h.pointerDown().defaultPrevented, true);
  assert.equal(h.button.capturedPointer, 7);
  assert.equal(h.button.classList.contains("pressed"), true);
  assert.deepEqual(h.moves, ["right"]);

  h.advance(250);
  assert.deepEqual(h.moves, ["right", "right"]);
  h.pointerEnd();
  dispatch(h.button, "click", { detail: 1 });
  h.advance(500);
  assert.deepEqual(h.moves, ["right", "right"], "The pointer click must not add a duplicate step");
  assert.equal(h.button.classList.contains("pressed"), false);
});

for (const releaseEvent of ["pointercancel", "lostpointercapture"]) {
  test(`D-pad stops repeating after ${releaseEvent}`, (t) => {
    const h = createHarness(t);
    h.pointerDown();
    h.pointerEnd(releaseEvent);
    h.advance(500);
    assert.deepEqual(h.moves, ["right"]);
    assert.equal(h.button.classList.contains("pressed"), false);
  });
}

test("keyboard activation of a D-pad button makes one step and respects a modal lock", (t) => {
  const h = createHarness(t);
  dispatch(h.button, "click", { detail: 0 });
  h.advance(500);
  assert.deepEqual(h.moves, ["right"]);

  h.setAllowed(false);
  dispatch(h.button, "click", { detail: 0 });
  h.pointerDown();
  h.keyDown("KeyW");
  h.advance(500);
  assert.deepEqual(h.moves, ["right"]);
  assert.equal(h.button.classList.contains("pressed"), false);
});

test("hiding the document clears a held direction until a fresh press", (t) => {
  const h = createHarness(t);
  h.keyDown();
  h.document.hidden = true;
  dispatch(h.document, "visibilitychange");
  h.advance(500);
  h.document.hidden = false;
  dispatch(h.document, "visibilitychange");
  h.keyDown("ArrowRight", true);
  h.advance(500);
  assert.deepEqual(h.moves, ["right"]);

  h.keyUp();
  h.keyDown();
  assert.deepEqual(h.moves, ["right", "right"]);
});

for (const [first, second] of [["KeyW", "KeyA"], ["ArrowUp", "ArrowLeft"], ["KeyW", "ArrowLeft"]]) {
  test(`${first} + ${second} produces a diagonal without an extra immediate step`, (t) => {
    const h = createHarness(t);
    h.keyDown(first);
    h.keyDown(second);
    assert.deepEqual(h.moves, ["up"]);
    h.advance(100);
    assert.deepEqual(h.moves, ["up", "up-left"]);
    h.keyUp(first);
    h.advance(100);
    assert.deepEqual(h.moves, ["up", "up-left", "left"]);
  });
}

test("opposite directions cancel, including duplicate WASD and arrow aliases", (t) => {
  const h = createHarness(t);
  h.keyDown("KeyW");
  h.keyDown("ArrowUp");
  h.keyDown("ArrowDown");
  h.advance(200);
  assert.deepEqual(h.moves, ["up"]);
  h.keyDown("KeyD");
  h.advance(100);
  assert.deepEqual(h.moves, ["up", "right"]);
  h.keyUp("ArrowDown");
  h.advance(100);
  assert.deepEqual(h.moves, ["up", "right", "up-right"]);
});

test("diagonal touch buttons repeat the same combined direction", (t) => {
  const h = createHarness(t);
  h.button.dataset.direction = "down-left";
  h.pointerDown();
  h.advance(100);
  assert.deepEqual(h.moves, ["down-left", "down-left"]);
  h.pointerEnd();
  h.advance(100);
  assert.deepEqual(h.moves, ["down-left", "down-left"]);
});

test("browser keyboard shortcuts cannot start movement", (t) => {
  const h = createHarness(t);
  for (const modifier of ["altKey", "ctrlKey", "metaKey"]) {
    const event = dispatch(h.window, "keydown", { code: "ArrowLeft", [modifier]: true });
    assert.equal(event.defaultPrevented, false);
  }
  h.advance(200);
  assert.deepEqual(h.moves, []);
});

test("a busy tween does not consume the repeat clock and retries on the very next frame", (t) => {
  const h = createHarness(t);
  h.keyDown();
  h.setMovementReady(false);
  h.advance(100);
  assert.equal(h.moveAttempts, 2);
  assert.deepEqual(h.moves, ["right"]);
  h.setMovementReady(true);
  h.advance(16);
  assert.equal(h.moveAttempts, 3, "Ready movement is retried without another full repeat delay");
  assert.deepEqual(h.moves, ["right", "right"]);
});

test("tween completion chains the current held diagonal immediately and prevents a duplicate RAF step", (t) => {
  const h = createHarness(t);
  h.keyDown("KeyW");
  h.keyDown("KeyA");
  h.advance(STEP_INTERVAL_MS - 2);
  assert.equal(h.input.getHeldDirection(), "up-left");
  assert.equal(h.input.continueHeld(), true);
  assert.deepEqual(h.moves, ["up", "up-left"]);
  h.advance(2);
  assert.deepEqual(h.moves, ["up", "up-left"], "Completion resets the ordinary repeat clock");
  h.keyUp("KeyW");
  assert.equal(h.input.getHeldDirection(), "left");
  h.input.releaseAll();
  assert.equal(h.input.getHeldDirection(), null);
  assert.equal(h.input.continueHeld(), false);
  assert.deepEqual(h.moves, ["up", "up-left"]);
});

test("synchronous completion cannot recursively move forever or bypass the repeat duration", (t) => {
  const h = createHarness(t, { onMove: (input) => input.continueHeld() });
  h.keyDown();
  assert.deepEqual(h.moves, ["right"]);
  h.advance(16);
  assert.deepEqual(h.moves, ["right"]);
  h.advance(100);
  assert.deepEqual(h.moves, ["right", "right"]);
});

test("completion callbacks cannot resume input during a modal lock", (t) => {
  const h = createHarness(t);
  h.keyDown();
  h.setAllowed(false);
  assert.equal(h.input.getHeldDirection(), null);
  assert.equal(h.input.continueHeld(), false);
  h.input.releaseAll();
  h.setAllowed(true);
  assert.equal(h.input.continueHeld(), false);
  assert.deepEqual(h.moves, ["right"]);
});
