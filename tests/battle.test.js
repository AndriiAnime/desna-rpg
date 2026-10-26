import test from 'node:test';
import assert from 'node:assert/strict';
import { createBattleState, chooseEnemyMove, resolveBattleRound } from '../src/domain/battle.js';

test('battle starts with three HP each and validates setup', () => {
  assert.deepEqual(createBattleState(), { heroHp: 3, enemyHp: 3, maxHp: 3, round: 0, outcome: null });
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

test('a lethal hero hit wins before the enemy can land its own lethal hit', () => {
  const state = { ...createBattleState(), heroHp: 1, enemyHp: 1 };
  const result = resolveBattleRound(state, { attack: 'head', defend: 'body' }, { attack: 'head', defend: 'body' });
  assert.equal(result.state.heroHp, 1); assert.equal(result.state.enemyHp, 0);
  assert.equal(result.state.outcome, 'victory'); assert.equal(result.enemyActed, false);
  assert.equal(result.enemyHit, false);
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

test('nonlethal hits still allow the enemy reply and double blocks preserve health', () => {
  const state = createBattleState();
  const exchange = resolveBattleRound(state, { attack: 'head', defend: 'body' }, { attack: 'head', defend: 'body' });
  assert.equal(exchange.state.heroHp, 2); assert.equal(exchange.state.enemyHp, 2);
  assert.equal(exchange.enemyActed, true); assert.equal(exchange.enemyHit, true);
  const blocked = resolveBattleRound(exchange.state, { attack: 'head', defend: 'body' }, { attack: 'body', defend: 'head' });
  assert.equal(blocked.state.heroHp, 2); assert.equal(blocked.state.enemyHp, 2);
  assert.equal(blocked.enemyActed, true); assert.equal(blocked.enemyHit, false);
  assert.equal(blocked.state.outcome, null);
});

test('missing or invalid choices cannot consume a round', () => {
  const state = createBattleState();
  assert.throws(() => resolveBattleRound(state, { attack: 'legs', defend: 'head' }, { attack: 'head', defend: 'head' }), TypeError);
  assert.equal(state.round, 0);
});
