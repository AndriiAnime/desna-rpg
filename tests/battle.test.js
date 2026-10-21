import test from 'node:test';
import assert from 'node:assert/strict';
import { createBattleState, chooseEnemyMove, resolveBattleRound } from '../src/domain/battle.js';

test('battle starts with three HP each and validates setup', () => {
  assert.deepEqual(createBattleState(), { heroHp: 3, enemyHp: 3, maxHp: 3, round: 0, suddenDeath: false, outcome: null });
  assert.throws(() => createBattleState({ hp: 0 }), RangeError);
});

test('enemy independently draws attack and defence without knowing player choice', () => {
  const values = [0, 0.9999]; let calls = 0;
  assert.deepEqual(chooseEnemyMove(() => values[calls++]), { attack: 'head', defend: 'body' });
  assert.equal(calls, 2);
  assert.throws(() => chooseEnemyMove(() => 1), RangeError);
});

test('blocked attacks deal no damage and state/decisions are not mutated', () => {
  const state = Object.freeze(createBattleState());
  const hero = Object.freeze({ attack: 'head', defend: 'body' });
  const enemy = Object.freeze({ attack: 'body', defend: 'head' });
  const result = resolveBattleRound(state, hero, enemy);
  assert.equal(result.heroHit, false); assert.equal(result.enemyHit, false);
  assert.equal(result.state.heroHp, 3); assert.equal(result.state.enemyHp, 3);
  assert.equal(result.state.round, 1); assert.equal(state.round, 0);
});

test('both hits are simultaneous even when the first hit would kill', () => {
  const state = { ...createBattleState(), heroHp: 1, enemyHp: 1 };
  const result = resolveBattleRound(state, { attack: 'head', defend: 'body' }, { attack: 'head', defend: 'body' });
  assert.equal(result.state.heroHp, 0); assert.equal(result.state.enemyHp, 0);
  assert.equal(result.state.outcome, null); assert.equal(result.state.suddenDeath, true);
});

test('a one-sided lethal hit wins without negative HP', () => {
  const state = { ...createBattleState(), enemyHp: 1 };
  const result = resolveBattleRound(state, { attack: 'head', defend: 'head' }, { attack: 'head', defend: 'body' });
  assert.equal(result.state.outcome, 'victory'); assert.equal(result.state.heroHp, 3); assert.equal(result.state.enemyHp, 0);
  assert.throws(() => resolveBattleRound(result.state, result.hero, result.enemy), /already over/);
});

test('a one-sided enemy lethal hit loses', () => {
  const state = { ...createBattleState(), heroHp: 1 };
  const result = resolveBattleRound(state, { attack: 'head', defend: 'body' }, { attack: 'head', defend: 'head' });
  assert.equal(result.state.outcome, 'defeat'); assert.equal(result.state.enemyHp, 3);
});

test('sudden death repeats on two hits or two blocks and resolves only an unequal result', () => {
  let state = { ...createBattleState(), heroHp: 0, enemyHp: 0, suddenDeath: true };
  state = resolveBattleRound(state, { attack: 'head', defend: 'body' }, { attack: 'head', defend: 'body' }).state;
  assert.equal(state.outcome, null);
  state = resolveBattleRound(state, { attack: 'head', defend: 'body' }, { attack: 'body', defend: 'head' }).state;
  assert.equal(state.outcome, null); assert.equal(state.heroHp, 0); assert.equal(state.enemyHp, 0);
  const victory = resolveBattleRound(state, { attack: 'head', defend: 'head' }, { attack: 'head', defend: 'body' });
  const defeat = resolveBattleRound(state, { attack: 'head', defend: 'body' }, { attack: 'head', defend: 'head' });
  assert.equal(victory.state.outcome, 'victory'); assert.equal(defeat.state.outcome, 'defeat');
});

test('missing or invalid choices cannot consume a round', () => {
  const state = createBattleState();
  assert.throws(() => resolveBattleRound(state, { attack: 'legs', defend: 'head' }, { attack: 'head', defend: 'head' }), TypeError);
  assert.equal(state.round, 0);
});
