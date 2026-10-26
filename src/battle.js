import './battle.css';
import { BATTLE_ZONES, createBattleState, chooseEnemyMove, resolveBattleRound } from './domain/battle.js';
import { battleChoiceIcon } from './battle-icons.js';
import { BLUD_ENCOUNTER } from './content/blud-encounter.js';
import { BATTLE_TIMING, createRoundPresentation } from './content/battle-presentation.js';
import { battleFeedbackMarkup, battleTurnMarkup, checkedFeedbackVariant } from './battle-feedback.js';

const asset = (file) => `${import.meta.env.BASE_URL}assets/battle/${file}`;
export const DEFAULT_BATTLE_BACKGROUND = asset('forest-muted-a-v1.png');
const ASSETS = [DEFAULT_BATTLE_BACKGROUND, asset('hero-v1.png'), asset('blud-v1.png')];
const assetPromises = new Map();
let battleCounter = 0;
export const BATTLE_DECLARATION_MS = BATTLE_TIMING.declaration;
export const BATTLE_FRAMINGS = Object.freeze(['full', 'waist', 'close']);

export function preloadBattleAssets({ background = ASSETS[0] } = {}) {
  return Promise.all([background, ...ASSETS.slice(1)].map((url) => {
    if (!assetPromises.has(url)) assetPromises.set(url, new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = resolve;
      image.onerror = () => { assetPromises.delete(url); reject(new Error(`Could not load battle art: ${url}`)); };
      image.src = url;
    }));
    return assetPromises.get(url);
  }));
}

const COPY = {
  uk: {
    scene: 'Бій із Блудом', hero: 'Герой', enemy: 'Блуд', head: 'Голова', body: 'Корпус',
    attack: 'Куди вдарити?', defend: 'Що захистити?', back: 'Змінити удар',
    choose: 'Обери зону удару.', chooseGuard: 'Тепер обери захист — і почнеться обмін ударами.',
    attackSelected: 'Обраний удар', declaring: 'Дії обрано. Приготуйся до удару.',
    rules: 'Удар у незахищену зону забирає 1 HP. Герой б’є першим. Переможений ворог не відповідає.',
    round: 'Раунд',
    resolving: 'Обмін ударами…', victory: 'Перемога', defeat: 'Поразка',
    victoryLine: 'Блуд відступає. Шлях до мосту вільний.', defeatLine: 'Блуд відкинув тебе назад. Можна спробувати ще раз.',
    return: 'Повернутися на мапу', hit: '−1 HP', blocked: 'БЛОК',
    heroHit: 'Твій удар влучив.', heroBlocked: 'Блуд заблокував твій удар.',
    enemyHit: 'Удар Блуда влучив.', enemyBlocked: 'Ти заблокував удар Блуда.',
    enemyAttack: 'Удар Блуда', enemyDefend: 'Захист Блуда', hp: 'Здоров’я',
    strikeHead: 'Б’є в голову', strikeBody: 'Б’є в корпус', guardHead: 'Захищає голову', guardBody: 'Захищає корпус',
    stepAttack: '1 · Удар', stepDefend: '2 · Захист',
    conversation: 'Розмова перед боєм', next: 'Далі', fight: 'До бою',
    heroTurn: 'Хід героя', enemyTurn: 'Хід ворога', roundCommitment: 'Спочатку б’є герой. Ворог відповість, лише якщо вистоїть.',
  },
  en: {
    scene: 'Battle with Blud', hero: 'Hero', enemy: 'Blud', head: 'Head', body: 'Body',
    attack: 'Where to strike?', defend: 'What to guard?', back: 'Change attack',
    choose: 'Choose an attack zone.', chooseGuard: 'Now choose a guard — the exchange starts automatically.',
    attackSelected: 'Selected attack', declaring: 'Moves chosen. Prepare for the exchange.',
    rules: 'An unblocked hit deals 1 HP. The hero strikes first. A defeated enemy cannot retaliate.',
    round: 'Round',
    resolving: 'Exchanging blows…', victory: 'Victory', defeat: 'Defeat',
    victoryLine: 'Blud retreats. The path to the bridge is clear.', defeatLine: 'Blud pushed you back. You can try again.',
    return: 'Return to the map', hit: '−1 HP', blocked: 'BLOCK',
    heroHit: 'Your attack hit.', heroBlocked: 'Blud blocked your attack.',
    enemyHit: 'Blud’s attack hit.', enemyBlocked: 'You blocked Blud’s attack.',
    enemyAttack: 'Blud attacked', enemyDefend: 'Blud guarded', hp: 'Health',
    strikeHead: 'Strikes the head', strikeBody: 'Strikes the body', guardHead: 'Guards the head', guardBody: 'Guards the body',
    stepAttack: '1 · Attack', stepDefend: '2 · Guard',
    conversation: 'Before the battle', next: 'Continue', fight: 'Begin battle',
    heroTurn: 'Hero Turn', enemyTurn: 'Enemy Turn', roundCommitment: 'The hero strikes first. The enemy only replies if it survives.',
  },
};
const copyFor = (language) => COPY[language || document.documentElement.lang] || COPY.uk;
const checkedFraming = (framing) => BATTLE_FRAMINGS.includes(framing) ? framing : 'full';

function stageMarkup(t) {
  const actor = (side, source) => `<div class="battle-figure battle-figure--${side}" data-ref="${side}Figure"><span class="battle-ground-shadow" aria-hidden="true"></span><div class="battle-art"><img data-ref="${side}Image" src="${source}" alt="${t[side]}" draggable="false"></div><span class="battle-feedback" data-ref="${side}Feedback" hidden aria-hidden="true"></span></div><div class="battle-declaration battle-declaration--${side}" data-ref="${side}Declaration" hidden><span class="battle-declaration-name">${t[side]}</span><span data-ref="${side}Attack"></span><span data-ref="${side}Guard"></span></div>`;
  return `<div class="battle-stage"><div class="battle-backdrop-blur" aria-hidden="true"></div><div class="battle-backdrop" aria-hidden="true"></div><div class="battle-stage-shade" aria-hidden="true"></div>${['hero', 'enemy'].map((side) => `<div class="battle-health battle-health--${side}"><span>${t[side]}</span><strong data-ref="${side}Hp">3 / 3</strong><div class="battle-hp-pips" data-ref="${side}Pips" aria-hidden="true"><i class="is-full"></i><i class="is-full"></i><i class="is-full"></i></div></div>`).join('')}${actor('hero', ASSETS[1])}${actor('enemy', ASSETS[2])}<div class="battle-turn-banner" data-ref="turnBanner" hidden aria-live="polite"></div><span class="battle-turn-indicator" data-ref="turnIndicator" hidden></span></div><p class="battle-commitment" data-ref="commitment" hidden>${t.roundCommitment}</p>`;
}
function windowMarkup(contents) {
  return `<div class="battle-window"><div class="battle-window-inset"><div class="battle-window-body">${contents}</div></div></div>`;
}
function choiceButtons(action, t) {
  return BATTLE_ZONES.map((zone) => `<button type="button" class="battle-choice" data-action="${action}" data-zone="${zone}">${battleChoiceIcon(action, zone)}<span>${t[zone]}</span><span class="battle-choice-arrow" aria-hidden="true">▸</span></button>`).join('');
}
function setBackground(root, background = DEFAULT_BATTLE_BACKGROUND) {
  if (background) root.querySelectorAll('.battle-backdrop, .battle-backdrop-blur').forEach(layer => { layer.style.backgroundImage = `url(${JSON.stringify(background)})`; });
}

/** Static comparison of the exact battle framing and command styling. No game state is created. */
export function mountBattlePreview({ host, framing = 'full', background, language = 'uk', feedback = 'muted' }) {
  if (!(host instanceof HTMLElement)) throw new TypeError('Preview host must be an element');
  const t = copyFor(language);
  const root = document.createElement('section');
  root.className = `desna-battle battle-preview battle-framing--${checkedFraming(framing)}`;
  root.setAttribute('aria-label', t.scene);
  root.dataset.feedback = checkedFeedbackVariant(feedback);
  root.innerHTML = stageMarkup(t) + windowMarkup(`<div class="battle-window-heading"><h2>${t.attack}</h2><span class="battle-location">ДЕСНА · DESNA</span></div><div class="battle-choices">${choiceButtons('attack', t)}</div>`);
  setBackground(root, background);
  host.append(root);
  return { destroy() { root.remove(); } };
}

/** The owner pauses world input; start resolves when the result's return button is pressed. */
export function createBattle({ host, onComplete = () => {}, onSound = () => {}, language, random = Math.random, framing = 'full', background, intro = false, feedback, feedbackPalette } = {}) {
  if (!(host instanceof HTMLElement)) throw new TypeError('Battle host must be an element');
  const t = copyFor(language);
  const locale = COPY[language || document.documentElement.lang] ? (language || document.documentElement.lang) : 'uk';
  const palette = checkedFeedbackVariant(feedback || feedbackPalette || document.documentElement.dataset.feedback);
  const id = `battle-${++battleCounter}`;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let state = createBattleState();
  let root, promise, settle, selectedAttack = null;
  let finished = false, busy = false, destroyed = false;
  let phase = intro ? 'dialogue' : 'combat', dialogueIndex = 0;
  const lines = BLUD_ENCOUNTER[language || document.documentElement.lang] || BLUD_ENCOUNTER.uk;
  const animations = new Set();
  const timers = new Map();
  const refs = {};

  function wait(ms) {
    if (destroyed) return Promise.resolve();
    return new Promise((resolve) => {
      const timer = setTimeout(() => { timers.delete(timer); resolve(); }, ms);
      timers.set(timer, resolve);
    });
  }
  function animate(element, keyframes, options) {
    if (destroyed || reducedMotion || !element.animate) return Promise.resolve();
    const animation = element.animate(keyframes, options);
    animations.add(animation);
    return animation.finished.catch(() => {}).finally(() => animations.delete(animation));
  }
  function renderHp(display = state) {
    for (const side of ['hero', 'enemy']) {
      const hp = display[`${side}Hp`];
      refs[`${side}Hp`].textContent = `${hp} / ${state.maxHp}`;
      refs[`${side}Hp`].setAttribute('aria-label', `${t[side]}: ${t.hp} ${hp} / ${state.maxHp}`);
      refs[`${side}Pips`].innerHTML = Array.from({ length: state.maxHp }, (_, i) => `<i class="${i < hp ? 'is-full' : ''}"></i>`).join('');
    }
  }
  function renderRound() {
    refs.round.textContent = `${t.round} ${state.round + 1}`;
    refs.rules.textContent = t.rules;
  }
  function sound(type) {
    try { onSound(type); } catch { /* Optional audio must not stop the exchange. */ }
  }
  function complete(outcome) {
    if (finished) return;
    finished = true;
    const result = { outcome, rounds: state.round };
    settle?.(result);
    onComplete(result);
  }
  function showChoice(action, focus = true) {
    refs.attackStep.hidden = action !== 'attack';
    refs.defendStep.hidden = action !== 'defend';
    refs.selectedAttack.hidden = action !== 'defend';
    refs.back.hidden = action !== 'defend';
    refs.selectedAttack.textContent = selectedAttack ? `${t.attackSelected}: ${t[selectedAttack]}` : '';
    refs.status.textContent = action === 'attack' ? t.choose : t.chooseGuard;
    refs.attackProgress.classList.toggle('is-active', action === 'attack');
    refs.defendProgress.classList.toggle('is-active', action === 'defend');
    refs.form.dataset.step = action;
    if (focus) refs[`${action}Step`].querySelector('button').focus({ preventScroll: true });
  }
  function showDialogueLine() {
    const line = lines[dialogueIndex];
    refs.dialogueSpeaker.textContent = t[line.speaker];
    refs.dialogueText.textContent = line.text;
    refs.dialogueCount.textContent = `${dialogueIndex + 1} / ${lines.length}`;
    refs.dialogueNext.textContent = dialogueIndex === lines.length - 1 ? `${t.fight} →` : `${t.next} →`;
    root.dataset.speaker = line.speaker;
    refs.dialogueNext.focus({ preventScroll: true });
  }
  async function advanceDialogue() {
    if (destroyed || phase !== 'dialogue') return;
    sound('click');
    if (++dialogueIndex < lines.length) { showDialogueLine(); return; }
    phase = 'reframing';
    const figures = [refs.heroFigure, refs.enemyFigure];
    const previous = figures.map(figure => figure.getBoundingClientRect());
    refs.dialogueNext.disabled = true;
    refs.introContent.hidden = true; refs.combatContent.hidden = false;
    root.classList.remove('is-dialogue', 'battle-framing--waist');
    root.classList.add(`battle-framing--${checkedFraming(framing)}`);
    root.setAttribute('aria-label', t.scene); root.dataset.phase = phase;
    root.querySelectorAll('.battle-health').forEach(health => { health.hidden = false; });
    refs.form.querySelectorAll('button').forEach(button => { button.disabled = true; });
    // Animate between actual rendered rectangles so the crop can change without
    // relying on transitions between CSS auto/percentage positioning values.
    await Promise.all(figures.map((figure, index) => {
      const before = previous[index], after = figure.getBoundingClientRect();
      return animate(figure, [
        { transformOrigin: '0 0', transform: `translate(${before.left-after.left}px,${before.top-after.top}px) scale(${before.width/after.width},${before.height/after.height})` },
        { transformOrigin: '0 0', transform: 'translate(0,0) scale(1)' },
      ], { duration: 500, easing: 'cubic-bezier(.2,.7,.2,1)' });
    }));
    if (destroyed) return;
    phase = 'combat'; root.dataset.phase = phase;
    refs.form.querySelectorAll('button').forEach(button => { button.disabled = false; });
    showChoice('attack');
  }
  function declare(side, choice) {
    refs[`${side}Attack`].textContent = choice.attack === 'head' ? t.strikeHead : t.strikeBody;
    refs[`${side}Guard`].textContent = choice.defend === 'head' ? t.guardHead : t.guardBody;
    refs[`${side}Declaration`].hidden = false;
  }
  function hideDeclarations() {
    refs.heroDeclaration.hidden = true;
    refs.enemyDeclaration.hidden = true;
  }
  function playStrike(attacker) {
    const direction = attacker === 'hero' ? 1 : -1;
    const distance = Math.min(72, refs.stage.clientWidth * .065);
    sound('attack');
    void animate(refs[`${attacker}Image`], [
      { transform: 'translateX(0)', offset: 0 },
      { transform: `translateX(${direction * distance}px)`, offset: BATTLE_TIMING.impact / BATTLE_TIMING.strike },
      { transform: 'translateX(0)', offset: 1 },
    ], { duration: BATTLE_TIMING.strike, easing: 'cubic-bezier(.2,.7,.3,1)' });
  }
  function showImpact(event) {
    const { defender, hit, damage, hp } = event;
    const feedbackElement = refs[`${defender}Feedback`];
    feedbackElement.innerHTML = battleFeedbackMarkup({ type: event.feedback, language: locale, variant: palette, amount: damage });
    feedbackElement.hidden = false;
    renderHp(hp);
    sound(hit && hp[`${defender}Hp`] === 0 ? 'finisher' : hit ? 'hit' : 'block');
    refs.status.textContent = event.attacker === 'hero'
      ? (hit ? t.heroHit : t.heroBlocked)
      : (hit ? t.enemyHit : t.enemyBlocked);
    void animate(feedbackElement, [
      { opacity: 0, transform: 'translate(-50%, 10px) scale(.8)' },
      { opacity: 1, transform: 'translate(-50%, 0) scale(1)' },
    ], { duration: 230, easing: 'cubic-bezier(.15,.7,.2,1)' });
    if (hit) {
      const distance = Math.min(46, refs.stage.clientWidth * .042) * (defender === 'hero' ? -1 : 1);
      void animate(refs[`${defender}Image`], [
        { transform: 'translateX(0)', filter: 'brightness(1)', offset: 0 },
        { transform: `translateX(${distance}px)`, filter: 'brightness(1.55)', offset: .28 },
        { transform: 'translateX(0)', filter: 'brightness(1)', offset: 1 },
      ], { duration: 480, easing: 'ease-out' });
    }
  }
  async function presentRound(previous, result) {
    let previousTime = 0;
    for (const event of createRoundPresentation(previous, result)) {
      await wait(event.at - previousTime);
      if (destroyed) return;
      previousTime = event.at;
      if (event.type === 'turn') {
        hideDeclarations();
        refs.turnBanner.innerHTML = battleTurnMarkup({ side: event.side, language: locale, variant: palette });
        refs.turnBanner.hidden = false;
        refs.turnIndicator.textContent = t[`${event.side}Turn`];
        refs.turnIndicator.hidden = false;
        refs.status.textContent = t[`${event.side}Turn`];
        refs.commitment.textContent = t.roundCommitment;
        root.dataset.turn = event.side;
        void animate(refs.turnBanner, [
          { opacity: 0, transform: 'translateX(-12px)' },
          { opacity: 1, transform: 'translateX(0)' },
        ], { duration: 260, easing: 'ease-out' });
      } else if (event.type === 'strike') {
        refs.turnBanner.hidden = true;
        playStrike(event.attacker);
      } else if (event.type === 'impact') {
        showImpact(event);
      } else if (event.type === 'clear') {
        refs[`${event.defender}Feedback`].hidden = true;
      }
    }
    delete root.dataset.turn;
    refs.turnIndicator.hidden = true;
  }
  async function submitRound(defend) {
    if (phase !== 'combat' || busy || state.outcome || destroyed || !BATTLE_ZONES.includes(selectedAttack) || !BATTLE_ZONES.includes(defend)) return;
    busy = true;
    const hero = { attack: selectedAttack, defend };
    // Independent enemy decisions are revealed only after both player decisions are committed.
    const result = resolveBattleRound(state, hero, chooseEnemyMove(random));
    refs.form.querySelectorAll('button').forEach((button) => { button.disabled = true; });
    root.focus({ preventScroll: true });
    refs.status.textContent = t.declaring;
    refs.form.dataset.step = 'committed';
    refs.defendStep.querySelector(`[data-zone="${defend}"]`).classList.add('is-selected');
    declare('hero', result.hero); declare('enemy', result.enemy);
    root.classList.add('is-resolving');
    refs.commitment.hidden = false;
    await presentRound(state, result);
    if (destroyed) return;
    refs.commitment.hidden = true;
    state = result.state;
    renderHp();
    root.classList.remove('is-resolving');
    refs.last.textContent = `${result.heroHit ? t.heroHit : t.heroBlocked}${result.enemyActed ? ` ${result.enemyHit ? t.enemyHit : t.enemyBlocked}` : ''}`;
    refs.enemyChoice.textContent = `${t.enemyAttack}: ${t[result.enemy.attack]}. ${t.enemyDefend}: ${t[result.enemy.defend]}.`;
    refs.previous.hidden = false;
    if (state.outcome) {
      const defeated = state.outcome === 'victory' ? 'enemy' : 'hero';
      sound(state.outcome);
      await animate(refs[`${defeated}Figure`], [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(.35)', opacity: 0 }], { duration: 650, easing: 'ease-in', fill: 'forwards' });
      if (destroyed) return;
      refs[`${defeated}Figure`].style.opacity = '0';
      refs.form.hidden = true;
      refs.rules.hidden = true;
      refs.status.textContent = t[`${state.outcome}Line`];
      refs.round.textContent = t[state.outcome];
      refs.exit.hidden = false;
      refs.exit.focus({ preventScroll: true });
    } else {
      busy = false; selectedAttack = null;
      refs.form.querySelectorAll('button').forEach((button) => { button.disabled = false; button.classList.remove('is-selected'); });
      renderRound(); showChoice('attack');
    }
  }
  function choose(event) {
    const button = event.target.closest('button[data-action]');
    if (!button || phase !== 'combat' || busy || destroyed || state.outcome) return;
    const { action, zone } = button.dataset;
    if (action === 'back') { selectedAttack = null; showChoice('attack'); return; }
    if (!BATTLE_ZONES.includes(zone)) return;
    if (action === 'attack' && refs.form.dataset.step === 'attack') {
      selectedAttack = zone; sound('click'); showChoice('defend');
    } else if (action === 'defend' && refs.form.dataset.step === 'defend') {
      sound('click'); void submitRound(zone);
    }
  }
  function mount() {
    root = document.createElement('section');
    root.className = `desna-battle battle-framing--${intro ? 'waist' : checkedFraming(framing)}${intro ? ' is-dialogue' : ''}`;
    root.dataset.feedback = palette;
    root.dataset.phase = phase;
    root.tabIndex = -1;
    root.setAttribute('role', 'region');
    root.setAttribute('aria-label', intro ? t.conversation : t.scene);
    root.innerHTML = stageMarkup(t) + windowMarkup(`
      <div class="battle-intro" data-ref="introContent"${intro ? '' : ' hidden'}>
        <div class="battle-window-heading"><h2 data-ref="dialogueSpeaker"></h2><span class="battle-location">${t.conversation}</span></div>
        <p class="battle-dialogue-line" data-ref="dialogueText" aria-live="polite"></p>
        <div class="battle-dialogue-footer"><span class="battle-dialogue-count" data-ref="dialogueCount"></span><button type="button" class="battle-dialogue-next" data-ref="dialogueNext">${t.next}</button></div>
      </div>
      <div data-ref="combatContent"${intro ? ' hidden' : ''}>
      <div class="battle-window-heading"><h2 data-ref="round"></h2><span class="battle-location">ДЕСНА · DESNA</span></div>
      <p class="battle-status" data-ref="status" role="status" aria-live="polite">${t.choose}</p>
      <div class="battle-command-form" data-ref="form" aria-describedby="${id}-rules">
        <div class="battle-choice-progress" aria-hidden="true"><span data-ref="attackProgress">${t.stepAttack}</span><span class="battle-progress-arrow">›</span><span data-ref="defendProgress">${t.stepDefend}</span></div>
        <p class="battle-selected-attack" data-ref="selectedAttack" hidden></p>
        ${['attack', 'defend'].map((action) => `<fieldset data-ref="${action}Step"${action === 'defend' ? ' hidden' : ''}><legend>${t[action]}</legend><div class="battle-choices">${choiceButtons(action, t)}</div></fieldset>`).join('')}
        <button class="battle-back" data-ref="back" data-action="back" type="button" hidden>‹ ${t.back}</button>
      </div>
      <p class="battle-rules" data-ref="rules" id="${id}-rules"></p>
      <div class="battle-previous" data-ref="previous" hidden><span data-ref="last"></span><small data-ref="enemyChoice"></small></div>
      <button class="battle-exit" data-ref="exit" type="button" hidden>${t.return}<span aria-hidden="true">▸</span></button></div>`);
    root.querySelectorAll('[data-ref]').forEach((el) => { refs[el.dataset.ref] = el; });
    refs.stage = root.querySelector('.battle-stage');
    setBackground(root, background);
    refs.form.addEventListener('click', choose);
    refs.exit.addEventListener('click', () => complete(state.outcome));
    refs.dialogueNext.addEventListener('click', advanceDialogue);
    host.append(root);
    renderHp(); renderRound(); showChoice('attack', !intro);
    if (intro) {
      root.querySelectorAll('.battle-health').forEach(health => { health.hidden = true; });
      showDialogueLine();
    }
  }
  return {
    start() {
      if (destroyed) return Promise.resolve({ outcome: 'cancelled', rounds: state.round });
      if (!promise) { promise = new Promise((resolve) => { settle = resolve; }); mount(); }
      return promise;
    },
    destroy() {
      destroyed = true;
      for (const [timer, resolve] of timers) { clearTimeout(timer); resolve(); }
      timers.clear();
      for (const animation of animations) animation.cancel();
      animations.clear();
      root?.remove();
      if (!finished) { finished = true; settle?.({ outcome: 'cancelled', rounds: state.round }); }
    },
  };
}
