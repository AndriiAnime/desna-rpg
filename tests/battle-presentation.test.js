import test from 'node:test';
import assert from 'node:assert/strict';
import { createBattleState, resolveBattleRound } from '../src/domain/battle.js';
import { BATTLE_BASELINE_ROUND_MS, BATTLE_ROUND_MS, BATTLE_TIMING, createRoundPresentation, BATTLE_FEEDBACK_TYPES, BATTLE_FEEDBACK_LABELS } from '../src/content/battle-presentation.js';

const doubleHit = { attack: 'head', defend: 'body' };
test('the alternative exchange lasts three times the baseline with room to read each turn', () => {
  assert.equal(BATTLE_ROUND_MS, BATTLE_BASELINE_ROUND_MS * 3);
  const before = createBattleState();
  const events = createRoundPresentation(before, resolveBattleRound(before, doubleHit, doubleHit));
  assert.equal(events.at(-1).at, 8400);
  assert.deepEqual(events.filter(e => e.type === 'turn').map(e => e.side), ['hero', 'enemy']);
  for (const side of ['hero', 'enemy']) {
    const turn = events.find(e => e.type === 'turn' && e.side === side);
    const strike = events.find(e => e.type === 'strike' && e.attacker === side);
    const impact = events.find(e => e.type === 'impact' && e.attacker === side);
    assert.equal(strike.at - turn.at, BATTLE_TIMING.turn);
    assert.equal(impact.at - strike.at, BATTLE_TIMING.impact);
  }
});
test('HP display changes at each impact without prematurely applying the second hit', () => {
  const before = Object.freeze(createBattleState());
  const result = resolveBattleRound(before, doubleHit, doubleHit);
  const impacts = createRoundPresentation(before, result).filter(e => e.type === 'impact');
  assert.deepEqual(impacts.map(e => e.hp), [{ heroHp: 3, enemyHp: 2 }, { heroHp: 2, enemyHp: 2 }]);
  assert.deepEqual(impacts.map(e => e.damage), [1, 1]);
  assert.equal(before.heroHp, 3);
});
test('a lethal first hit skips the enemy turn, strike and feedback entirely', () => {
  const before = { ...createBattleState(), heroHp: 1, enemyHp: 1 };
  const result = resolveBattleRound(before, doubleHit, doubleHit);
  const events = createRoundPresentation(before, result);
  assert.equal(events.find(e => e.type === 'turn' && e.side === 'enemy'), undefined);
  assert.equal(events.find(e => e.type === 'strike' && e.attacker === 'enemy'), undefined);
  assert.equal(events.filter(e => e.type === 'impact').length, 1);
  assert.equal(events.at(-1).outcome, 'victory');
  assert.deepEqual(events.find(e => e.type === 'impact').hp, { heroHp: 1, enemyHp: 0 });
  assert.equal(events.at(-1).at, BATTLE_TIMING.declaration + BATTLE_TIMING.turn + BATTLE_TIMING.strike + BATTLE_TIMING.hold);
});
test('blocks show no lost HP while a surviving enemy still receives a turn', () => {
  const before = createBattleState();
  const result = resolveBattleRound(before, { attack: 'head', defend: 'head' }, { attack: 'head', defend: 'head' });
  const impacts = createRoundPresentation(before, result).filter(e => e.type === 'impact');
  assert.deepEqual(impacts.map(e => [e.feedback, e.damage]), [['block', 0], ['block', 0]]);
  assert.equal(result.state.outcome, null);
});
test('all studied feedback has Ukrainian and English labels without adding combat mechanics', () => {
  for (const type of BATTLE_FEEDBACK_TYPES) {
    assert.ok(BATTLE_FEEDBACK_LABELS.uk[type]);
    assert.ok(BATTLE_FEEDBACK_LABELS.en[type]);
  }
  const before = createBattleState();
  const events = createRoundPresentation(before, resolveBattleRound(before, doubleHit, doubleHit));
  assert.ok(events.filter(e => e.type === 'impact').every(e => ['hit', 'block'].includes(e.feedback)));
});
