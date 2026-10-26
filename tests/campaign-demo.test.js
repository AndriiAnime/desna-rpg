import test from 'node:test';
import assert from 'node:assert/strict';
import { createBattleDemo, resolveDemoRound } from '../src/domain/campaign-demo.js';
import { CHAPTERS, RIDDLES, LIBRARY_ENTRIES, CAMPAIGN_RULES } from '../src/content/campaign-scenes.js';

const all = { lucky: true, tail: true, heal: true, charm: true };
const move = { attack: 'head', guard: 'body' };
const enemy = { attack: 'head', guard: 'body' };
const frozen = state => Object.freeze({ ...state, used: Object.freeze({ ...state.used }), unlocks: Object.freeze({ ...state.unlocks }) });

test('tutorial locks both choices and the prescribed round wins without harming hero', () => {
  const state = createBattleDemo({ enemy: 'tutorial' });
  for (const choice of [{ attack: 'body', guard: 'body' }, { attack: 'head', guard: 'head' }]) {
    const result = resolveDemoRound(state, choice);
    assert.equal(result.error, 'tutorial-choice-locked');
    assert.equal(result.state, state);
    assert.deepEqual(result.events, []);
  }
  const result = resolveDemoRound(state, move, { attack: 'head', guard: 'head' });
  assert.equal(result.state.status, 'victory');
  assert.equal(result.state.enemyHp, 0);
  assert.equal(result.state.heroHp, 3);
  assert.deepEqual(result.events.map(event => event.type), ['hero-hit', 'victory']);
});

test('Lucky covers either zone, once; invalid reuse neither attacks nor consumes anything', () => {
  for (const zone of ['head', 'body']) {
    const initial = frozen(createBattleDemo({ unlocks: all }));
    const first = resolveDemoRound(initial, { attack: 'head', guard: 'lucky' }, { attack: zone, guard: 'body' });
    assert.equal(first.state.heroHp, 3);
    assert.equal(first.state.enemyHp, 2);
    assert.equal(first.state.used.lucky, true);
    assert.equal(initial.used.lucky, false);
    const again = resolveDemoRound(first.state, { attack: 'tail', guard: 'lucky' }, enemy);
    assert.equal(again.error, 'lucky-used');
    assert.equal(again.state, first.state);
    assert.equal(again.state.used.tail, false);
    assert.deepEqual(again.events, []);
  }
});

test('tail bypasses either enemy guard but a locked or spent tail cannot be used', () => {
  const locked = createBattleDemo();
  assert.equal(resolveDemoRound(locked, { attack: 'tail', guard: 'head' }, enemy).error, 'tail-locked');
  for (const guard of ['head', 'body']) {
    const first = resolveDemoRound(createBattleDemo({ unlocks: all }), { attack: 'tail', guard: 'head' }, { attack: 'head', guard });
    assert.equal(first.state.enemyHp, 2);
    assert.equal(first.state.used.tail, true);
    assert.equal(first.events[0].ability, 'tail');
    const again = resolveDemoRound(first.state, { attack: 'tail', guard: 'head' }, enemy);
    assert.equal(again.error, 'tail-used');
    assert.equal(again.state, first.state);
  }
});

test('healing freely restores 1→3 without advancing a round or triggering either attack', () => {
  const initial = frozen({ ...createBattleDemo({ unlocks: all }), heroHp: 1 });
  const result = resolveDemoRound(initial, { attack: 'heal' }, { attack: 'body', guard: 'head' });
  assert.equal(result.error, null);
  assert.equal(result.state.heroHp, 3);
  assert.equal(result.state.enemyHp, 3);
  assert.deepEqual(result.state.used, { lucky: false, tail: false, heal: true, charm: false });
  assert.deepEqual(result.events.map(event => event.type), ['heal']);
  assert.equal(result.state.round, initial.round);
  assert.equal(result.events[0].hp, 3);
  assert.equal(result.events[0].amount, 2);
  assert.equal(initial.heroHp, 1);
  assert.equal(resolveDemoRound(result.state, { attack: 'heal' }, enemy).error, 'heal-used');
  const followup = resolveDemoRound(result.state, move, enemy);
  assert.equal(followup.state.round, initial.round + 1);
  assert.equal(followup.state.heroHp, 2);
  assert.equal(followup.state.enemyHp, 2);
});

test('healing never accepts a guard, including a stale Lucky guard; locked heal remains locked', () => {
  const state = createBattleDemo({ unlocks: all });
  for (const guard of ['head', 'body', 'lucky']) {
    const result = resolveDemoRound(state, { attack: 'heal', guard }, enemy);
    assert.equal(result.error, 'heal-has-no-guard');
    assert.equal(result.state, state);
    assert.deepEqual(result.state.used, { lucky: false, tail: false, heal: false, charm: false });
  }
  assert.equal(resolveDemoRound(createBattleDemo(), { attack: 'heal' }, enemy).error, 'heal-locked');
});

test('all unlocked abilities refresh for a new attempt after defeat', () => {
  const lost = { ...createBattleDemo({ unlocks: all }), status: 'defeat', heroHp: 0, used: { lucky: true, tail: true, heal: true, charm: true } };
  const retry = createBattleDemo({ enemy: lost.enemy, unlocks: lost.unlocks });
  assert.deepEqual(retry.used, { lucky: false, tail: false, heal: false, charm: false });
  assert.deepEqual(retry.unlocks, all);
  assert.equal(retry.heroHp, 3);
  assert.equal(retry.status, 'active');
});

test('Upyr transforms after 2 hits and keeps hero health and spent abilities', () => {
  let state = createBattleDemo({ enemy: 'upyr', unlocks: all });
  state = resolveDemoRound(state, { attack: 'tail', guard: 'lucky' }, enemy).state;
  const transformed = resolveDemoRound(state, move, enemy);
  assert.equal(transformed.state.phase, 2);
  assert.equal(transformed.state.enemyHp, 2);
  assert.equal(transformed.state.heroHp, 3);
  assert.deepEqual(transformed.state.used, { lucky: true, tail: true, heal: false, charm: false });
  assert.equal(transformed.state.status, 'active');
  assert.ok(transformed.events.some(event => event.type === 'phase-change'));
  state = resolveDemoRound(transformed.state, { attack: 'head', guard: 'head' }, enemy).state;
  state = resolveDemoRound(state, { attack: 'head', guard: 'head' }, enemy).state;
  assert.equal(state.status, 'victory');
});

test('breaking the first Upyr form cancels its lethal reply and waits until next round', () => {
  const state = { ...createBattleDemo({ enemy: 'upyr' }), heroHp: 1, enemyHp: 1 };
  const result = resolveDemoRound(state, move, enemy);
  assert.equal(result.state.status, 'active');
  assert.equal(result.state.phase, 2);
  assert.equal(result.state.heroHp, 1);
  assert.equal(result.state.enemyHp, 2);
  assert.deepEqual(result.events.map(event => event.type), ['hero-hit', 'phase-change']);
  const reply = resolveDemoRound(result.state, move, enemy);
  assert.equal(reply.state.status, 'defeat');
  assert.equal(reply.state.heroHp, 0);
});

test('lethal hero strike wins immediately even if the enemy would also kill', () => {
  const state = { ...createBattleDemo(), heroHp: 1, enemyHp: 1 };
  const win = resolveDemoRound(state, move, enemy);
  assert.equal(win.state.status, 'victory');
  assert.equal(win.state.heroHp, 1);
  assert.equal(win.state.enemyHp, 0);
  assert.deepEqual(win.events.map(event => event.type), ['hero-hit', 'victory']);
});

test('a surviving enemy replies; a blocked hero strike can still end in defeat', () => {
  const state = frozen({ ...createBattleDemo(), heroHp: 1, enemyHp: 1 });
  const loss = resolveDemoRound(state, move, { attack: 'head', guard: 'head' });
  assert.equal(loss.state.status, 'defeat');
  assert.equal(loss.state.heroHp, 0);
  assert.equal(loss.state.enemyHp, 1);
  assert.deepEqual(loss.events.map(event => event.type), ['block', 'enemy-hit', 'defeat']);
});

test('a lethal hit does not spend Lucky when there is no strike left to intercept', () => {
  const state = { ...createBattleDemo({ enemy: 'upyr', unlocks: all }), enemyHp: 1 };
  const result = resolveDemoRound(state, { attack: 'tail', guard: 'lucky' }, enemy);
  assert.deepEqual(result.state.used, { lucky: false, tail: true, heal: false, charm: false });
  assert.equal(result.state.phase, 2);
  assert.deepEqual(result.events.map(event => event.type), ['hero-hit', 'phase-change']);
});

test('the blacksmith gift unlocks charm; charm causes no damage and skips retaliation', () => {
  const initial = frozen({ ...createBattleDemo({ unlocks: { weight: true, lucky: true } }), heroHp: 1 });
  assert.equal(initial.unlocks.charm, true);
  const result = resolveDemoRound(initial, { attack: 'charm', guard: 'lucky' }, enemy);
  assert.equal(result.error, null);
  assert.equal(result.state.heroHp, 1);
  assert.equal(result.state.enemyHp, 3);
  assert.equal(result.state.round, initial.round + 1);
  assert.equal(result.state.used.charm, true);
  assert.equal(result.state.used.lucky, false);
  assert.equal(initial.used.charm, false);
  assert.deepEqual(result.events.map(event => event.type), ['charm', 'enemy-skip']);
  assert.equal(result.events[0].reaction, 'hearts');
  const reused = resolveDemoRound(result.state, { attack: 'charm', guard: 'head' }, enemy);
  assert.equal(reused.error, 'charm-used');
  assert.equal(reused.state, result.state);
  assert.deepEqual(reused.events, []);
});

test('Rusalka reacts with anger but skips the same response; charm still requires guard', () => {
  const initial = createBattleDemo({ enemy: 'rusalka', unlocks: all });
  const result = resolveDemoRound(initial, { attack: 'charm', guard: 'body' }, enemy);
  assert.equal(result.events[0].reaction, 'anger');
  assert.equal(result.state.heroHp, 3);
  assert.equal(result.state.enemyHp, 3);
  assert.equal(resolveDemoRound(initial, { attack: 'charm' }, enemy).error, 'invalid-guard');
  assert.equal(resolveDemoRound(createBattleDemo(), { attack: 'charm', guard: 'body' }, enemy).error, 'charm-locked');
});

test('workshop quick win bypasses guard and every remaining Upyr phase only on a strike', () => {
  for (const enemyId of ['blud', 'rusalka', 'upyr']) {
    const initial = frozen({ ...createBattleDemo({ enemy: enemyId, unlocks: all }), heroHp: 1 });
    const result = resolveDemoRound(initial, { attack: 'head', guard: 'body' }, { attack: 'head', guard: 'head' }, { quickWin: true });
    assert.equal(result.state.status, 'victory');
    assert.equal(result.state.enemyHp, 0);
    assert.equal(result.state.heroHp, 1);
    assert.deepEqual(result.events.map(event => event.type), ['hero-hit', 'victory']);
    assert.equal(result.events[0].amount, initial.enemyHp);
    assert.equal(initial.status, 'active');
  }
  const state = createBattleDemo({ enemy: 'upyr', unlocks: all });
  const heal = resolveDemoRound(state, { attack: 'heal' }, enemy, { quickWin: true });
  assert.equal(heal.state.status, 'active');
  assert.equal(heal.state.round, state.round);
  const charm = resolveDemoRound(state, { attack: 'charm', guard: 'body' }, enemy, { quickWin: true });
  assert.equal(charm.state.status, 'active');
  assert.equal(charm.state.enemyHp, 2);
});

test('invalid and terminal choices do not mutate state, advance rounds or consume abilities', () => {
  const initial = frozen(createBattleDemo({ unlocks: all }));
  for (const [choice, opponent] of [[{ attack: 'feet', guard: 'head' }, enemy], [move, { attack: 'feet', guard: 'head' }], [{ attack: 'tail' }, enemy]]) {
    const result = resolveDemoRound(initial, choice, opponent);
    assert.ok(result.error);
    assert.equal(result.state, initial);
    assert.deepEqual(result.events, []);
  }
  const terminal = frozen({ ...initial, status: 'victory' });
  const result = resolveDemoRound(terminal, move, enemy);
  assert.equal(result.error, 'battle-finished');
  assert.equal(result.state, terminal);
  assert.throws(() => createBattleDemo({ enemy: 'unknown' }), RangeError);
});

test('story contracts provide bilingual unique beats, valid three riddles, and bounded source claims', () => {
  const ids = CHAPTERS.flatMap(item => item.beats.map(entry => entry.id));
  assert.equal(new Set(ids).size, ids.length);
  for (const item of CHAPTERS) {
    assert.ok(item.title.uk && item.title.en && item.summary.uk && item.summary.en);
    for (const entry of item.beats) {
      assert.ok(entry.visual && entry.speaker);
      if (['approach-blud', 'approach-altar'].includes(entry.action)) {
        assert.equal(entry.text.uk, '');
        assert.equal(entry.text.en, '');
      } else assert.ok(entry.text.uk && entry.text.en);
    }
  }
  assert.equal(RIDDLES.length, CAMPAIGN_RULES.riddleAnswersRequired);
  for (const riddle of RIDDLES) assert.equal(riddle.options.filter(option => option.id === riddle.answer).length, 1);
  assert.equal(CAMPAIGN_RULES.realTimer, false);
  assert.equal(CAMPAIGN_RULES.abilityUsesPerBattle, 1);
  for (const id of ['blud', 'rusalka', 'lesovyk']) assert.ok(LIBRARY_ENTRIES.find(entry => entry.id === id).source.url.startsWith('https://nz.lviv.ua/'));
  for (const id of ['hero', 'lucky', 'smith', 'apprentice']) assert.equal(LIBRARY_ENTRIES.find(entry => entry.id === id).source, null);
  assert.equal(LIBRARY_ENTRIES.find(entry => entry.id === 'upyr').sourceStatus, 'needs-additional-source');
});
