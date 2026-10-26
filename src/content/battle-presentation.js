/** Presentation alone is sequential. Domain round resolution remains simultaneous. */
export const BATTLE_BASELINE_ROUND_MS = 2800;
export const BATTLE_TIMING = Object.freeze({ declaration: 1800, turn: 1100, strike: 700, impact: 220, hold: 1500 });
export const BATTLE_ROUND_MS = BATTLE_TIMING.declaration + 2 * (BATTLE_TIMING.turn + BATTLE_TIMING.strike + BATTLE_TIMING.hold);

/** Data-only timeline, also used by QA to verify HP/result ordering and sudden death. */
export function createRoundPresentation(previous, result) {
  const events = [];
  const hp = { heroHp: previous.heroHp, enemyHp: previous.enemyHp };
  let time = BATTLE_TIMING.declaration;
  for (const [attacker, defender] of [['hero', 'enemy'], ['enemy', 'hero']]) {
    const hit = result[`${attacker}Hit`];
    events.push({ at: time, type: 'turn', side: attacker, committedReply: attacker === 'enemy' && hp.enemyHp === 0 && !previous.suddenDeath });
    time += BATTLE_TIMING.turn;
    events.push({ at: time, type: 'strike', attacker });
    hp[`${defender}Hp`] = result.state[`${defender}Hp`];
    events.push({ at: time + BATTLE_TIMING.impact, type: 'impact', attacker, defender, hit, feedback: hit ? 'hit' : 'block', damage: previous[`${defender}Hp`] - hp[`${defender}Hp`], hp: { ...hp } });
    time += BATTLE_TIMING.strike + BATTLE_TIMING.hold;
    events.push({ at: time, type: 'clear', defender });
  }
  events.push({ at: time, type: 'settle', outcome: result.state.outcome });
  return events;
}

export const BATTLE_FEEDBACK_TYPES = Object.freeze(['hit', 'critical', 'miss', 'guard', 'weak', 'resist', 'block']);
export const BATTLE_FEEDBACK_VARIANTS = Object.freeze(['reference', 'muted', 'outline']);
export const BATTLE_FEEDBACK_LABELS = Object.freeze({
  uk: Object.freeze({ hit: 'ВЛУЧАННЯ', critical: 'КРИТИЧНО', miss: 'ПРОМАХ', guard: 'ЗАХИСТ', weak: 'СЛАБКІСТЬ', resist: 'ОПІР', block: 'БЛОК', heroTurn: 'Хід героя', enemyTurn: 'Хід ворога' }),
  en: Object.freeze({ hit: 'HIT', critical: 'CRITICAL', miss: 'MISS', guard: 'GUARD', weak: 'WEAK', resist: 'RESIST', block: 'BLOCK', heroTurn: 'Hero Turn', enemyTurn: 'Enemy Turn' }),
});
