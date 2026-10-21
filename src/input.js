import { DIRECTION_VECTORS, directionFromVector, STEP_INTERVAL_MS } from "./content/movement.js";

const KEY_DIRECTIONS = {
  ArrowUp: "up",
  KeyW: "up",
  ArrowDown: "down",
  KeyS: "down",
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
};

/** One input adapter for keyboard and pointer; the domain only sees directions. */
export function bindMovement({ buttons, canMove, move, repeatMs = STEP_INTERVAL_MS }) {
  const held = new Map();
  let lastStep = 0;
  let frame;
  let dispatching = false;
  const releaseAll = () => {
    held.clear();
    buttons.forEach((button) => button.classList.remove("pressed"));
  };
  const heldDirection = () => {
    // Distinct directions prevent W + ArrowUp from outweighing a held Down.
    const directions = new Set(held.values());
    const axes = { left: false, right: false, up: false, down: false };
    for (const direction of directions) {
      const vector = DIRECTION_VECTORS[direction];
      if (!vector) continue;
      if (vector.x < 0) axes.left = true;
      if (vector.x > 0) axes.right = true;
      if (vector.y < 0) axes.up = true;
      if (vector.y > 0) axes.down = true;
    }
    return directionFromVector(Number(axes.right) - Number(axes.left), Number(axes.down) - Number(axes.up));
  };
  const step = (direction) => {
    if (!direction || !canMove() || dispatching) return false;
    const now = performance.now();
    let accepted;
    dispatching = true;
    try {
      // false means temporarily busy: keep this step due and retry next RAF.
      // An accepted domain attempt (including a wall) consumes one repeat.
      accepted = move(direction) !== false;
    } finally {
      dispatching = false;
    }
    if (accepted) lastStep = now;
    return accepted;
  };
  const press = (id, direction) => {
    if (!canMove() || held.has(id)) return;
    const wasHeld = held.size > 0;
    held.set(id, direction);
    // Adding the second axis changes the next scheduled step, not its speed.
    if (!wasHeld) step(heldDirection());
  };
  const onKeyDown = (event) => {
    const direction = KEY_DIRECTIONS[event.code];
    if (
      !direction ||
      !canMove() ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey
    )
      return;
    event.preventDefault();
    // RAF supplies repetition. Native repeats must not revive a key cleared by a modal.
    if (event.repeat) return;
    press(event.code, direction);
  };
  const onKeyUp = (event) => held.delete(event.code);
  const onVisibility = () => {
    if (document.hidden) releaseAll();
  };
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", releaseAll);
  document.addEventListener("visibilitychange", onVisibility);
  buttons.forEach((button) => {
    button.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || !canMove()) return;
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      button.classList.add("pressed");
      press(`pointer-${event.pointerId}`, button.dataset.direction);
    });
    const release = (event) => {
      held.delete(`pointer-${event.pointerId}`);
      button.classList.remove("pressed");
    };
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("lostpointercapture", release);
    // Native keyboard activation of an accessible button has no pointerdown.
    button.addEventListener("click", (event) => {
      if (event.detail === 0) step(button.dataset.direction);
    });
  });
  const tick = (now) => {
    if (!canMove()) releaseAll();
    else if (held.size && now - lastStep >= repeatMs)
      step(heldDirection());
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
  return {
    releaseAll,
    getHeldDirection: () => canMove() ? heldDirection() : null,
    // A tween owns the duration of an accepted move. Its completion can chain
    // the next held direction immediately, without a second input-clock delay.
    // The dispatch guard leaves synchronous completions to the normal RAF timer.
    continueHeld: () => step(heldDirection()),
    destroy() {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", releaseAll);
      document.removeEventListener("visibilitychange", onVisibility);
    },
  };
}
