import test from 'node:test';
import assert from 'node:assert/strict';
import {
  advanceHeroIdle, advanceLuckyIdle, animationDuration, animationFrameAt,
  createHeroIdle, createLuckyIdle,
} from '../src/domain/idle-behavior.js';

test('hero starts in either calm variant and taps only after five stationary seconds', () => {
  assert.equal(createHeroIdle(() => 0).variant, 'heroIdleCorrected');
  assert.equal(createHeroIdle(() => 0.9).variant, 'heroQuiet');
  let state = advanceHeroIdle(createHeroIdle(() => 0.9), 4999);
  assert.equal(state.variant, 'heroQuiet');
  state = advanceHeroIdle(state, 1);
  assert.equal(state.variant, 'heroTap');
  assert.equal(state.animationMs, 0);
  state = advanceHeroIdle(state, 2000);
  assert.equal(state.variant, 'heroTap');
  assert.equal(state.animationMs, 2000);
});

test('hero selects a new calm clip once per complete stop, never per movement update', () => {
  let choices = 0;
  const random = () => ++choices % 2 ? 0 : 0.9;
  let state = createHeroIdle(random);
  for (let frame = 0; frame < 100; frame += 1) {
    state = advanceHeroIdle(state, 16, { moving: true, activity: true }, random);
  }
  assert.equal(choices, 1);
  assert.equal(state.idleMs, 0);
  state = advanceHeroIdle(state, 16, {}, random);
  assert.equal(choices, 2);
  assert.equal(state.variant, 'heroQuiet');
  state = advanceHeroIdle(state, 16, {}, random);
  assert.equal(choices, 2);
});

test('blocked input resets inactivity without rerolling or freezing the calm animation', () => {
  let choices = 0;
  const random = () => { choices += 1; return 0; };
  let state = advanceHeroIdle(createHeroIdle(random), 4900, {}, random);
  for (let frame = 0; frame < 100; frame += 1) {
    state = advanceHeroIdle(state, 16, { activity: true }, random);
  }
  assert.equal(state.idleMs, 0);
  assert.equal(state.animationMs, 6500);
  assert.equal(state.variant, 'heroIdleCorrected');
  assert.equal(choices, 1);
  state = advanceHeroIdle(state, 4999, {}, random);
  assert.notEqual(state.variant, 'heroTap');
  assert.equal(advanceHeroIdle(state, 1, {}, random).variant, 'heroTap');
});

test('input during impatience immediately returns to calm and starts a fresh wait', () => {
  let state = advanceHeroIdle(createHeroIdle(() => 0), 6000);
  state = advanceHeroIdle(state, 16, { activity: true }, () => 0.9);
  assert.equal(state.variant, 'heroQuiet');
  assert.equal(state.idleMs, 0);
  assert.equal(state.animationMs, 0);
  assert.equal(advanceHeroIdle(state, 4999).variant, 'heroQuiet');
});

test('a pause freezes hero timing and does not consume random choices', () => {
  const state = advanceHeroIdle(createHeroIdle(() => 0), 4500);
  assert.equal(advanceHeroIdle(state, 10000, { active: false, activity: true }, () => {
    throw new Error('Paused actors must not consume random choices.');
  }), state);
  assert.equal(advanceHeroIdle(state, 499).variant, 'heroIdleCorrected');
  assert.equal(advanceHeroIdle(state, 500).variant, 'heroTap');
});

test('hero timing is independent of render frequency and does not mutate the previous state', () => {
  const initial = createHeroIdle(() => 0);
  let smallSteps = initial;
  for (let frame = 0; frame < 400; frame += 1) smallSteps = advanceHeroIdle(smallSteps, 16);
  assert.deepEqual(smallSteps, advanceHeroIdle(initial, 6400));
  assert.equal(initial.idleMs, 0);
});

test('Lucky plays one curious cycle at ten seconds and returns to calm immediately after it', () => {
  let state = advanceLuckyIdle(createLuckyIdle(), 9999);
  assert.equal(state.variant, 'luckyPerched');
  state = advanceLuckyIdle(state, 1);
  assert.equal(state.variant, 'luckyCurious');
  assert.equal(state.animationMs, 0);
  state = advanceLuckyIdle(state, 3049);
  assert.equal(state.variant, 'luckyCurious');
  assert.equal(state.animationMs, 3049);
  state = advanceLuckyIdle(state, 1);
  assert.equal(state.variant, 'luckyPerched');
  assert.equal(state.animationMs, 0);
  state = advanceLuckyIdle(state, 6949);
  assert.equal(state.variant, 'luckyPerched');
  state = advanceLuckyIdle(state, 1);
  assert.equal(state.variant, 'luckyCurious');
  assert.equal(state.elapsedMs, 20000);
});

test('Lucky cadence uses start-to-start intervals and stays consistent across long frames', () => {
  const once = advanceLuckyIdle(createLuckyIdle(), 21500);
  let repeated = createLuckyIdle();
  for (let frame = 0; frame < 215; frame += 1) repeated = advanceLuckyIdle(repeated, 100);
  assert.deepEqual(once, repeated);
  assert.equal(once.variant, 'luckyCurious');
  assert.equal(once.animationMs, 1500);
});

test('Lucky pause freezes the current look and hiding him resets the whole cycle', () => {
  const curious = advanceLuckyIdle(createLuckyIdle(), 11500);
  assert.equal(advanceLuckyIdle(curious, 20000, { active: false }), curious);
  const hidden = advanceLuckyIdle(curious, 20000, { active: false, visible: false });
  assert.deepEqual(hidden, createLuckyIdle());
  const visible = advanceLuckyIdle(hidden, 500);
  assert.equal(visible.variant, 'luckyPerched');
  assert.equal(visible.elapsedMs, 500);
});

test('nonuniform animation duration and boundaries preserve breathing and blink holds', () => {
  const frames = [0, 1, 2, 3];
  const config = { frameRate: 4, frameDurationsMs: [1400, 400, 450, 800] };
  assert.equal(animationDuration(frames, config), 3050);
  const positions = [0, 1399, 1400, 1799, 1800, 2249, 2250, 3049, 3050, 6100];
  assert.deepEqual(positions.map((ms) => animationFrameAt(frames, config, ms)), [0, 0, 1, 1, 2, 2, 3, 3, 0, 0]);
  assert.equal(animationFrameAt(frames, config, 3050, { loop: false }), 3);
  assert.equal(animationFrameAt(frames, config, 60000, { loop: false }), 3);
});

test('animation frame selection uses atlas ids and falls back to the configured frame rate', () => {
  assert.equal(animationDuration([4, 5], { frameRate: 2 }), 1000);
  assert.equal(animationFrameAt([4, 5], { frameRate: 2 }, 500), 5);
  const config = { frameRate: 2, frameDurationsMs: [100, 200, 300, 400] };
  assert.equal(animationDuration([3, 1], config), 600);
  assert.equal(animationFrameAt([3, 1], config, 399), 3);
  assert.equal(animationFrameAt([3, 1], config, 400), 1);
  assert.equal(animationFrameAt([3, 1], config, -50), 3);
});
