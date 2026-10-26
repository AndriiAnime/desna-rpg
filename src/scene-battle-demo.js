import { createBattleDemo, resolveDemoRound } from './domain/campaign-demo.js';
import { battleChoiceIcon } from './battle-icons.js';
import { battleFeedbackMarkup, battleTurnMarkup } from './battle-feedback.js';
import { sceneAsset, sheetSprite } from './scene-visuals.js';
import { dialogueSkinMarkup } from './dialogue-skins.js';
import { amuletMarkup } from './location-amulets.js';
import { mapHeroMarkup, mountMapSprites } from './scene-map-sprites.js';
import { ABILITY_ART } from './scene-assets.js';
import './scene-battle-v2.css';

/** Cancellable presentation of the same hero-first rules used by the game. */
export function mountSceneBattle(host, { enemy = 'blud', unlocks = {}, language = 'uk', spriteMode = 'painted', onVictory = () => {}, onSound = () => {} } = {}) {
  const t = (uk, en) => language === 'en' ? en : uk;
  const location = enemy === 'upyr' ? 'mountain' : enemy === 'rusalka' ? 'river' : 'clearing';
  let state = createBattleDemo({ enemy, unlocks }), attack = null, busy = false, disposed = false, outcomeAdvanced = false;
  let activeSpriteMode = spriteMode === 'map' ? 'map' : 'painted', pendingSpriteMode = null, quickWinArmed = false;
  let disposeMapSprites = () => {};
  let enemyChoice = rollEnemy();
  const controller = new AbortController();
  const pauses = new Map();
  const wait = ms => new Promise(resolve => { const id = setTimeout(() => { pauses.delete(id); resolve(); }, ms); pauses.set(id, resolve); });
  const names = { tutorial: t('Прихвостень Блуда', 'Blud’s minion'), blud: t('Блуд', 'Blud'), rusalka: t('Русалка', 'Rusalka'), upyr: t('Упир', 'Upyr') };
  const zone = value => ({ head: t('Голова', 'Head'), body: t('Корпус', 'Body'), tail: t('Удар русалки', 'Rusalka’s tail'), heal: t('Допомога учня', 'Apprentice’s help'), lucky: t('Суперблок Лакі', 'Lucky’s superblock'), charm: t('Шарм Коваля', 'Blacksmith’s charm') })[value];
  function sound(type) { try { onSound(type); } catch { /* Optional audio cannot interrupt a turn. */ } }
  function rollEnemy() { return { attack: Math.random() < .5 ? 'head' : 'body', guard: Math.random() < .5 ? 'head' : 'body' }; }
  function enemyArt() {
    if (activeSpriteMode === 'map' && !(enemy === 'upyr' && state.phase === 1)) {
      if (enemy === 'tutorial') return `<span class="demo-map-enemy minion-map-sprite" role="img" aria-label="${names[enemy]}"></span>`;
      return sheetSprite(enemy, 'demo-map-enemy');
    }
    const source = enemy === 'tutorial' ? 'scenes/v2/minion-battle.png' : enemy === 'rusalka' ? 'scenes/v3/rusalka-battle.png' : enemy === 'upyr'
      ? (state.phase === 1 ? 'scenes/upyr-cloaked-elder-v1.png' : 'scenes/upyr-revealed-v1.png') : 'battle/blud-v1.png';
    return `<img src="${sceneAsset(source)}" alt="${names[enemy]}" draggable="false">`;
  }
  function heroArt() {
    const figure = activeSpriteMode === 'map'
      ? `<span class="battle-map-hero map-actor" data-facing="SE">${mapHeroMarkup()}</span>`
      : `<img src="${sceneAsset('battle/hero-v1.png')}" alt="${t('Герой', 'Hero')}" draggable="false">`;
    return `${figure}${state.unlocks.tail ? `<div class="battle-belt-charm"><img src="${sceneAsset('scenes/v2/rusalka-charm.png')}" alt="${t('Талісман покровительки води', 'Water guardian charm')}"></div>` : ''}`;
  }
  function renderSprites() {
    disposeMapSprites();
    host.querySelector('.demo-battle').dataset.spriteMode = activeSpriteMode;
    host.querySelector('.demo-hero .demo-fighter-art').innerHTML = heroArt();
    host.querySelector('.demo-enemy .demo-fighter-art').innerHTML = enemyArt();
    disposeMapSprites = mountMapSprites(host);
  }
  function applyPendingSpriteMode() {
    if (pendingSpriteMode == null) return;
    activeSpriteMode = pendingSpriteMode; pendingSpriteMode = null; renderSprites();
  }
  function health(side, value, max) {
    const label = side === 'hero' ? t('Герой', 'Hero') : names[enemy];
    return `<div class="demo-health" data-health="${side}" role="img" aria-label="${label}: ${value} / ${max} HP"><span class="demo-health-name">${label}${side === 'enemy' && enemy === 'upyr' ? ` · ${state.phase}/2` : ''}</span><span class="demo-hp-segments" aria-hidden="true">${Array.from({ length: max }, (_, i) => `<i class="${i < value ? 'is-full' : ''}"></i>`).join('')}</span><small aria-hidden="true">${value} / ${max}</small></div>`;
  }
  function updateHealth(side, value, max) {
    const current = host.querySelector(`[data-health="${side}"]`);
    if (current) current.outerHTML = health(side, value, max);
  }
  function button(value, defend = false) {
    const special = ['lucky', 'tail', 'heal', 'charm'].includes(value);
    const disabled = enemy === 'tutorial' ? value !== (defend ? 'body' : 'head') : special && (!state.unlocks[value] || state.used[value]);
    const detail = state.used[value] ? t('Використано', 'Used') : ['heal', 'charm'].includes(value) ? '' : t('Раз за бій', 'Once per battle');
    return `<button type="button" class="battle-choice" data-choice="${value}" ${disabled ? 'disabled' : ''}>${special ? `<span class="ability-icon" aria-hidden="true">${{ lucky: '✧', tail: '≋', heal: '✦', charm: '✧' }[value]}</span>` : battleChoiceIcon(defend ? 'defend' : 'attack', value)}<span>${zone(value)}${special && detail ? `<small>${detail}</small>` : ''}</span></button>`;
  }
  function render() {
    disposeMapSprites();
    host.innerHTML = `<div class="demo-battle demo-battle-v2" data-enemy="${enemy}" data-phase="${state.phase}" data-sprite-mode="${activeSpriteMode}"><div class="demo-battle-background" style="background-image:url('${sceneAsset(enemy === 'upyr' ? 'scenes/v3/mountain-battle.png' : 'battle/forest-muted-a-v1.png')}')"></div><div class="demo-fighter demo-hero"><div class="demo-fighter-art">${heroArt()}</div>${health('hero', state.heroHp, state.heroMaxHp)}<div class="fighter-feedback"></div></div><div class="demo-fighter demo-enemy"><div class="demo-fighter-art">${enemyArt()}</div>${health('enemy', state.enemyHp, state.enemyMaxHp)}<div class="fighter-feedback"></div></div><div class="demo-turn" aria-live="polite"></div><div class="demo-cutin" hidden aria-live="polite"></div><div class="demo-declaration" aria-live="polite"></div><div class="demo-commands"></div></div>`;
    disposeMapSprites = mountMapSprites(host);
    commands();
  }
  function commands() {
    const controls = host.querySelector('.demo-commands');
    controls.classList.toggle('demo-commands--outcome', state.status !== 'active');
    controls.classList.toggle('demo-commands--tutorial', enemy === 'tutorial' && state.status === 'active');
    if (state.status !== 'active') {
      const won = state.status === 'victory';
      const next = won ? t('Далі', 'Continue') : t('Повторити бій', 'Retry battle');
      controls.innerHTML = `<div class="battle-victory-portrait"><img src="${sceneAsset(won ? 'scenes/v2/lucky-victory.png' : 'portraits/lucky-dialogue-v1.png')}" alt="${t('Лакі', 'Lucky')}"></div>${dialogueSkinMarkup({ variant: 'veil', location, speaker: t('Лакі', 'Lucky'), text: won ? t('Перемога. Чудова робота.', 'Victory. Great work.') : t('Не здавайся, малий. Спробуємо ще раз.', 'Don’t give up, kid. Let’s try again.'), language, nextLabel: next })}<button class="demo-outcome-advance" type="button" data-battle-action="${won ? 'continue' : 'retry'}" aria-label="${next}"></button>`;
      return;
    }
    const heading = attack ? t('Що захистити?', 'What will you guard?') : t('Куди вдарити?', 'Where will you strike?');
    const hint = enemy === 'tutorial'
      ? (attack ? t('Обери, що захищати — корпус.', 'Choose what to guard — the body.') : t('Обери удар у голову.', 'Choose a strike to the head.'))
      : t('Обери дію. Захист завершує вибір.', 'Choose an action. Guard confirms the round.');
    controls.innerHTML = `<div class="demo-command-surface" aria-hidden="true"><i></i>${amuletMarkup(location)}</div>${enemy === 'tutorial' ? `<div class="demo-tutorial-guide" aria-live="polite"><img src="${sceneAsset('portraits/lucky-dialogue-v1.png')}" alt="${t('Лакі', 'Lucky')}"><div><span>${t('Лакі', 'Lucky')}</span><p>${hint}</p></div></div>` : ''}<div class="demo-step"><span aria-hidden="true">${attack ? '02' : '01'}</span><div><strong>${heading}</strong>${enemy !== 'tutorial' ? `<small>${hint}</small>` : ''}</div>${attack ? `<button type="button" class="back-choice" data-battle-action="back">↶ ${t('Змінити удар', 'Change attack')}</button>` : ''}</div><div class="demo-choice-list">${button('head', !!attack)}${button('body', !!attack)}${attack ? (state.unlocks.lucky ? button('lucky', true) : '') : `${state.unlocks.tail ? button('tail') : ''}${state.unlocks.charm ? button('charm') : ''}${state.unlocks.heal ? button('heal') : ''}`}</div>`;
  }
  function showSummon(ability, label = '') {
    const summon = host.querySelector('.demo-cutin');
    const art = `<img src="${sceneAsset(ABILITY_ART[ability])}" alt="${zone(ability)}">`;
    const title = label || (ability === 'lucky' ? t('ЗАБЛОКОВАНО', 'BLOCKED') : zone(ability));
    summon.innerHTML = `<div class="demo-cutin-shade"></div><div class="demo-cutin-art">${art}${ability === 'charm' ? '<span class="cutin-sparkles" aria-hidden="true"><i>✦</i><i>✧</i><i>✦</i><i>✧</i><i>✦</i></span>' : ''}</div><strong class="demo-cutin-label">${title}</strong>`;
    summon.className = `demo-cutin cutin-${ability}`; summon.hidden = false;
    host.querySelector('.demo-battle').dataset.cutin = ability;
  }
  function clearSummon() {
    const summon = host.querySelector('.demo-cutin');
    summon.innerHTML = ''; summon.className = 'demo-cutin'; summon.hidden = true;
    delete host.querySelector('.demo-battle').dataset.cutin;
  }
  async function turn(side, effect, previous, lethal = false) {
    if (disposed || !effect) return;
    const label = host.querySelector('.demo-turn');
    label.innerHTML = battleTurnMarkup({ side, language, variant: 'reference', duration: 1500 });
    await wait(1550); if (disposed) return;
    label.innerHTML = '';
    const actor = host.querySelector(side === 'hero' ? '.demo-hero' : '.demo-enemy');
    const target = host.querySelector(effect.target === 'hero' ? '.demo-hero' : '.demo-enemy');
    if (effect.type === 'charm') {
      showSummon('charm'); sound('charm');
      const reaction = effect.reaction === 'anger'
        ? `<svg class="manga-anger" viewBox="0 0 60 60" role="img" aria-label="${t('Русалка розлючена', 'Rusalka is angry')}"><path d="M8 22Q22 22 22 8M38 8Q38 22 52 22M52 38Q38 38 38 52M22 52Q22 38 8 38"/></svg>`
        : `<span class="manga-hearts" role="img" aria-label="${t('Ворог зачарований', 'The enemy is charmed')}">♥<i>♥</i>♥</span>`;
      host.querySelector('.demo-cutin').insertAdjacentHTML('beforeend', `<div class="cutin-reaction" data-reaction="${effect.reaction}">${reaction}</div>`);
      await wait(1850); if (disposed) return;
      clearSummon();
      return;
    }
    actor.classList.add(side === 'hero' ? 'lunge-hero' : 'lunge-enemy');
    if (effect.ability) showSummon(effect.ability);
    await wait(300); if (disposed) return;
    const blocked = effect.type === 'block';
    sound(blocked ? 'block' : lethal ? 'finisher' : 'hit');
    const feedback = target.querySelector('.fighter-feedback');
    feedback.innerHTML = battleFeedbackMarkup({ type: blocked ? 'block' : 'hit', amount: blocked ? 0 : effect.amount, language, variant: 'reference' });
    if (!blocked) target.classList.add('take-hit');
    if (side === 'hero') updateHealth('enemy', Math.max(0, previous.enemyHp - (blocked ? 0 : effect.amount)), previous.enemyMaxHp);
    else updateHealth('hero', state.heroHp, state.heroMaxHp);
    await wait(1300); if (disposed) return;
    feedback.innerHTML = ''; actor.classList.remove('lunge-hero', 'lunge-enemy'); target.classList.remove('take-hit');
    clearSummon();
    await wait(250);
  }
  async function heal() {
    const result = resolveDemoRound(state, { attack: 'heal' }, enemyChoice);
    if (result.error || busy || disposed) return;
    busy = true; state = result.state;
    // Instant support: no turn banner, no opponent reroll, no round advancement.
    commands(); host.querySelectorAll('.demo-commands button').forEach(button => { button.disabled = true; });
    updateHealth('hero', state.heroHp, state.heroMaxHp);
    showSummon('heal', `+${result.events[0].amount} HP`); sound('heal');
    const feedback = host.querySelector('.demo-hero .fighter-feedback');
    feedback.innerHTML = `<span class="healing-label">+${result.events[0].amount} HP</span>`;
    await wait(1500); if (disposed) return;
    feedback.innerHTML = ''; clearSummon(); busy = false; applyPendingSpriteMode(); commands();
  }
  async function resolve(choice) {
    const previous = state;
    const result = resolveDemoRound(state, choice, enemyChoice, { quickWin: quickWinArmed });
    if (result.error || busy || disposed) return;
    if (result.events.some(event => event.type === 'hero-hit')) quickWinArmed = false;
    busy = true; state = result.state;
    host.querySelectorAll('.demo-commands button').forEach(button => { button.disabled = true; });
    host.querySelector('.demo-declaration').textContent = `${choice.attack === 'charm' ? zone('charm') : `${t('Б’ю', 'Strike')}: ${zone(choice.attack)}`} · ${t('Захищаю', 'Guard')}: ${zone(choice.guard)}`;
    await wait(1500); if (disposed) return;
    const heroEffect = result.events.find(event => event.target === 'enemy');
    const enemyEffect = result.events.find(event => event.target === 'hero');
    const phaseChange = result.events.find(event => event.type === 'phase-change');
    await turn('hero', heroEffect, previous, state.status === 'victory' || !!phaseChange); if (disposed) return;
    if (enemyEffect) { await turn('enemy', enemyEffect, previous, state.status === 'defeat'); if (disposed) return; }
    if (phaseChange) {
      host.querySelector('.demo-declaration').textContent = t('Плащ падає. Це ще не кінець…', 'The cloak falls. This is not over…');
      const art = host.querySelector('.demo-enemy .demo-fighter-art');
      art.classList.add('cloak-falls');
      await wait(1200); if (disposed) return;
      art.innerHTML = enemyArt(); art.classList.remove('cloak-falls');
      host.querySelector('.demo-battle').dataset.phase = String(state.phase);
      updateHealth('enemy', state.enemyHp, state.enemyMaxHp);
      await wait(1100); if (disposed) return;
    }
    if (state.status !== 'active') {
      const defeated = host.querySelector(state.status === 'victory' ? '.demo-enemy' : '.demo-hero');
      defeated.classList.add('defeated');
      await wait(950); if (disposed) return;
      defeated.hidden = true;
      if (state.status === 'victory') sound('victory');
    }
    attack = null; busy = false; enemyChoice = rollEnemy(); applyPendingSpriteMode();
    host.querySelector('.demo-declaration').textContent = '';
    updateHealth('hero', state.heroHp, state.heroMaxHp); updateHealth('enemy', state.enemyHp, state.enemyMaxHp);
    commands();
  }
  function canAdvanceOutcome() {
    return !disposed && !busy && !outcomeAdvanced && state.status === 'victory'
      && !!host.querySelector('.demo-commands--outcome [data-battle-action="continue"]:not(:disabled)');
  }
  function advanceOutcome(event) {
    // This message is rendered in full; the scene player's typewriter is not active here.
    // Stop before onVictory mounts the next scene, so this input cannot advance it too.
    event.preventDefault(); event.stopPropagation();
    outcomeAdvanced = true; sound('click'); onVictory();
  }
  host.addEventListener('click', event => {
    if (busy || disposed) return;
    if (canAdvanceOutcome()) { advanceOutcome(event); return; }
    const target = event.target.closest('button'); if (!target || target.disabled) return;
    const action = target.dataset.battleAction, choice = target.dataset.choice;
    if (!action && !choice) return;
    sound('click');
    if (action === 'continue') return;
    if (action === 'retry') { state = createBattleDemo({ enemy, unlocks }); attack = null; quickWinArmed = false; outcomeAdvanced = false; enemyChoice = rollEnemy(); render(); return; }
    if (action === 'back') { attack = null; commands(); return; }
    if (choice === 'heal') void heal();
    else if (!attack) { attack = choice; commands(); }
    else void resolve({ attack, guard: choice });
  }, { signal: controller.signal });
  document.addEventListener('keydown', event => {
    if (!canAdvanceOutcome() || event.defaultPrevented || event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
    if (!['Space', 'Enter', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) return;
    const target = event.target;
    if (target.closest?.('select,input,textarea,a,[contenteditable="true"]')) return;
    const button = target.closest?.('button,[role="button"]');
    if (button && !button.matches('[data-battle-action="continue"]')) return;
    advanceOutcome(event);
  }, { capture: true, signal: controller.signal });
  render();
  return {
    // Explicit workshop hook; no query parameter, keyboard shortcut or UI is added here.
    armQuickWin() { if (disposed || state.status !== 'active') return false; quickWinArmed = true; return true; },
    setSpriteMode(mode) {
      if (disposed || !['map', 'painted'].includes(mode)) return false;
      if (busy) pendingSpriteMode = mode;
      else { activeSpriteMode = mode; renderSprites(); }
      return true;
    },
    destroy() { disposed = true; disposeMapSprites(); controller.abort(); for (const [id, resolve] of pauses) { clearTimeout(id); resolve(); } pauses.clear(); },
  };
}
