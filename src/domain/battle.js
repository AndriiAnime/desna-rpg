export const BATTLE_ZONES = Object.freeze(['head', 'body']);

export function createBattleState({ hp = 3 } = {}) {
  if (!Number.isInteger(hp) || hp < 1) throw new RangeError('HP must be a positive integer');
  return { heroHp: hp, enemyHp: hp, maxHp: hp, round: 0, outcome: null };
}

function validChoice(choice) {
  return choice && BATTLE_ZONES.includes(choice.attack) && BATTLE_ZONES.includes(choice.defend);
}

/** The enemy receives no player decision: the two draws are independent. */
export function chooseEnemyMove(random = Math.random) {
  const choose = () => {
    const value = random();
    if (!Number.isFinite(value) || value < 0 || value >= 1) throw new RangeError('RNG must return [0, 1)');
    return BATTLE_ZONES[Math.floor(value * BATTLE_ZONES.length)];
  };
  return { attack: choose(), defend: choose() };
}

/** Pure hero-first resolution: a lethal first hit cancels the enemy's reply. */
export function resolveBattleRound(state, hero, enemy) {
  if (state.outcome) throw new Error('The battle is already over');
  if (!validChoice(hero) || !validChoice(enemy)) throw new TypeError('Choose a valid attack and defence');
  const heroHit = hero.attack !== enemy.defend;
  const next = { ...state, round: state.round + 1 };
  next.enemyHp = Math.max(0, state.enemyHp - Number(heroHit));
  const enemyActed = next.enemyHp > 0;
  const enemyHit = enemyActed && enemy.attack !== hero.defend;
  next.heroHp = Math.max(0, state.heroHp - Number(enemyHit));
  if (next.enemyHp === 0) next.outcome = 'victory';
  else if (next.heroHp === 0) next.outcome = 'defeat';
  return { state: next, hero: { ...hero }, enemy: { ...enemy }, heroHit, enemyHit, enemyActed };
}
