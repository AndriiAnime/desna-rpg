const ZONES = Object.freeze(['head', 'body']);
const ENEMIES = Object.freeze({ tutorial: 1, blud: 3, rusalka: 3, upyr: 2 });
const ABILITIES = Object.freeze(['lucky', 'tail', 'heal', 'charm']);

/** A fresh attempt also refreshes every unlocked once-per-battle ability. */
export function createBattleDemo({ enemy = 'blud', unlocks = {} } = {}) {
  if (!Object.hasOwn(ENEMIES, enemy)) throw new RangeError(`Unknown enemy: ${enemy}`);
  return {
    enemy, heroHp: 3, heroMaxHp: 3, enemyHp: ENEMIES[enemy], enemyMaxHp: ENEMIES[enemy],
    phase: 1, round: 1, status: 'active',
    unlocks: Object.fromEntries(ABILITIES.map(key => [key, Boolean(unlocks[key] || key === 'charm' && unlocks.weight)])),
    used: { lucky: false, tail: false, heal: false, charm: false },
  };
}

function validateChoice(state, choice, enemyChoice) {
  if (state.status !== 'active') return 'battle-finished';
  if (!choice || !['head', 'body', 'tail', 'heal', 'charm'].includes(choice.attack)) return 'invalid-attack';
  if (!enemyChoice || !ZONES.includes(enemyChoice.attack) || !ZONES.includes(enemyChoice.guard)) return 'invalid-enemy-choice';
  if (choice.attack === 'heal') {
    // Healing is a free action, separate from the attack/guard decisions.
    if (choice.guard != null) return 'heal-has-no-guard';
  } else if (!['head', 'body', 'lucky'].includes(choice.guard)) return 'invalid-guard';
  if (state.enemy === 'tutorial' && (choice.attack !== 'head' || choice.guard !== 'body')) return 'tutorial-choice-locked';
  const requested = [choice.attack, choice.guard].filter(value => ABILITIES.includes(value));
  for (const ability of requested) {
    if (!state.unlocks[ability]) return `${ability}-locked`;
    if (state.used[ability]) return `${ability}-used`;
  }
  return null;
}

/**
 * Hero-first resolution. A defeated form cannot retaliate.
 * Enemy choices are supplied independently of the player's selection.
 * Healing is immediate and leaves the round and opponent's choice untouched.
 * Returns the identical state object on an invalid action.
 */
export function resolveDemoRound(state, choice, enemyChoice = { attack: 'head', guard: 'body' }, { quickWin = false } = {}) {
  const opponent = state.enemy === 'tutorial' ? { attack: 'body', guard: 'body' } : enemyChoice;
  const error = validateChoice(state, choice, opponent);
  if (error) return { state, events: [], error };

  const next = { ...state, used: { ...state.used }, unlocks: { ...state.unlocks } };
  const events = [];
  if (choice.attack === 'heal') {
    next.heroHp = state.heroMaxHp;
    next.used.heal = true;
    events.push({ type: 'heal', target: 'hero', amount: state.heroMaxHp - state.heroHp, hp: state.heroMaxHp, ability: 'heal' });
    return { state: next, events, error: null };
  }

  next.round += 1;
  if (choice.attack === 'charm') {
    next.used.charm = true;
    events.push({ type: 'charm', target: 'enemy', ability: 'charm', reaction: state.enemy === 'rusalka' ? 'anger' : 'hearts', amount: 0 });
    events.push({ type: 'enemy-skip', target: 'enemy', ability: 'charm' });
    return { state: next, events, error: null };
  }

  const heroHit = quickWin || choice.attack === 'tail' || choice.attack !== opponent.guard;
  if (choice.attack === 'tail') next.used.tail = true;
  if (heroHit) {
    const amount = quickWin ? state.enemyHp : 1;
    next.enemyHp = Math.max(0, state.enemyHp - amount);
    events.push({ type: 'hero-hit', target: 'enemy', amount, zone: choice.attack, ability: choice.attack === 'tail' ? 'tail' : null });
  } else {
    events.push({ type: 'block', target: 'enemy', zone: opponent.guard, ability: null });
  }
  if (next.enemyHp === 0) {
    if (state.enemy === 'upyr' && state.phase === 1 && !quickWin) {
      next.phase = 2;
      next.enemyHp = 2;
      next.enemyMaxHp = 2;
      events.push({ type: 'phase-change', enemy: 'upyr', phase: 2, hp: 2 });
    } else {
      next.status = 'victory';
      events.push({ type: 'victory' });
    }
    return { state: next, events, error: null };
  }

  // Lucky is spent only when it actually intercepts a surviving enemy's strike.
  const enemyHit = choice.guard !== 'lucky' && choice.guard !== opponent.attack;
  if (choice.guard === 'lucky') next.used.lucky = true;
  if (enemyHit) {
    next.heroHp = Math.max(0, state.heroHp - 1);
    events.push({ type: 'enemy-hit', target: 'hero', amount: 1, zone: opponent.attack });
  } else events.push({ type: 'block', target: 'hero', zone: choice.guard, ability: choice.guard === 'lucky' ? 'lucky' : null });
  if (next.heroHp === 0) {
    next.status = 'defeat';
    events.push({ type: 'defeat' });
  }
  return { state: next, events, error: null };
}
