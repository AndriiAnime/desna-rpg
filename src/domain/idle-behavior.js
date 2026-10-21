export const HERO_IMPATIENT_AFTER_MS = 5000;
export const LUCKY_CURIOUS_EVERY_MS = 10000;

const elapsed = (deltaMs) => Number.isFinite(deltaMs) ? Math.max(0, deltaMs) : 0;
const calmHero = (random) => random() < 0.5 ? 'heroIdleCorrected' : 'heroQuiet';

export function createHeroIdle(random = Math.random) {
  return { variant: calmHero(random), idleMs: 0, animationMs: 0, moving: false };
}

/** `moving` describes the whole journey, including adjacent route segments. */
export function advanceHeroIdle(state, deltaMs, { moving = false, active = true, activity = false } = {}, random = Math.random) {
  if (!active) return state;
  const delta = elapsed(deltaMs);
  if (moving) return { ...state, idleMs: 0, animationMs: 0, moving: true };

  const freshRest = state.moving || (activity && state.variant === 'heroTap');
  const variant = freshRest ? calmHero(random) : state.variant;
  const idleMs = activity ? 0 : (state.moving ? 0 : state.idleMs) + delta;
  if (idleMs >= HERO_IMPATIENT_AFTER_MS) {
    return { variant: 'heroTap', idleMs, animationMs: idleMs - HERO_IMPATIENT_AFTER_MS, moving: false };
  }
  return {
    variant,
    idleMs,
    animationMs: freshRest ? (activity ? 0 : delta) : state.animationMs + delta,
    moving: false,
  };
}

export function createLuckyIdle() {
  return { variant: 'luckyPerched', elapsedMs: 0, animationMs: 0, visible: false };
}

/** Curious starts at 10, 20, 30… active visible seconds, then returns to perched. */
export function advanceLuckyIdle(state, deltaMs, { active = true, visible = true } = {}, curiousDurationMs = 3050) {
  if (!visible) return createLuckyIdle();
  if (!active) return state;
  const elapsedMs = (state.visible ? state.elapsedMs : 0) + elapsed(deltaMs);
  const phaseMs = elapsedMs % LUCKY_CURIOUS_EVERY_MS;
  const duration = Math.min(LUCKY_CURIOUS_EVERY_MS, Math.max(0, curiousDurationMs));
  const hasReachedFirstCycle = elapsedMs >= LUCKY_CURIOUS_EVERY_MS;
  const curious = hasReachedFirstCycle && phaseMs < duration;
  return {
    variant: curious ? 'luckyCurious' : 'luckyPerched',
    elapsedMs,
    animationMs: curious ? phaseMs : hasReachedFirstCycle ? phaseMs - duration : elapsedMs,
    visible: true,
  };
}

function frameDurations(frames, config) {
  if (!Array.isArray(frames) || frames.length === 0) throw new Error('Idle animation needs at least one frame.');
  const rate = Number.isFinite(config.frameRate) && config.frameRate > 0 ? config.frameRate : 4;
  return frames.map((frame) => {
    const duration = config.frameDurationsMs?.[frame];
    return Number.isFinite(duration) && duration > 0 ? duration : 1000 / rate;
  });
}

/** Durations are keyed by atlas frame number, so directional subsets remain valid. */
export function animationDuration(frames, config = {}) {
  return frameDurations(frames, config).reduce((total, duration) => total + duration, 0);
}

/** Returns the atlas frame, with an optional clamp for a single play-through. */
export function animationFrameAt(frames, config = {}, elapsedMs = 0, { loop = true } = {}) {
  const durations = frameDurations(frames, config);
  const duration = durations.reduce((total, frameMs) => total + frameMs, 0);
  let position = elapsed(elapsedMs);
  if (!loop && position >= duration) return frames.at(-1);
  position %= duration;
  for (let index = 0; index < frames.length; index += 1) {
    if (position < durations[index]) return frames[index];
    position -= durations[index];
  }
  return frames.at(-1);
}
