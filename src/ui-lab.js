import './ui-fonts.css';
import './ui-lab.css';
import { battleFeedbackMarkup, battleTurnMarkup } from './battle-feedback.js';
import { createBattle } from './battle.js';

const asset = (file) => `${import.meta.env.BASE_URL}assets/${file}`;
const ART = asset('title/ps2-allies-title-space-v1.png');
const MAP = asset('map-sprites/map-v8.png');
const FOREST = asset('battle/forest-muted-a-v1.png');
const LUCKY = asset('portraits/lucky-dialogue-v1.png');
const HERO = asset('battle/hero-v1.png');
const BLUD = asset('battle/blud-v1.png');

const fonts = ['condensed', 'clean', 'classic', 'hybrid'];
const palettes = ['reference', 'muted', 'outline'];
const types = ['critical', 'miss', 'guard', 'weak', 'resist', 'block'];
const params = new URLSearchParams(location.search);
const state = {
  language: params.get('lang') === 'en' ? 'en' : 'uk',
  font: fonts.includes(params.get('font')) ? params.get('font') : 'hybrid',
  palette: palettes.includes(params.get('feedback')) ? params.get('feedback') : 'outline',
  demoRunning: false,
  demoGeneration: 0,
};
const COPY = {
  uk: {
    title: 'Майстерня інтерфейсу', chapter: 'Невідспівані / Альтернативна версія',
    intro: 'Один світ. Різні голоси.', description: 'Порівняй назви, діалоги й повідомлення бою. Обрана комбінація відкривається в грі.',
    game: 'Спробувати в грі', typography: 'Типографіка', palette: 'Повідомлення', language: 'Мова',
    titleStudy: 'Назва, що задає тон', titleNote: 'Те саме зображення й текст — чотири різні гарнітурні рішення.',
    selected: 'Обрано', choose: 'Обрати цей напрям', fontNote: 'Доступні аналоги, а не оригінальні шрифти ігор. Roboto та Roboto Condensed збережені локально; Georgia використовує системну гарнітуру. Усі основні варіанти — без курсиву.',
    franchise: 'Невідспівані', subtitle: 'Прах над Десною', start: 'Почати гру',
    fontNames: { condensed: 'Вузький ритм', clean: 'Чистий голос', classic: 'Тиха класика', hybrid: 'Спільна мова' },
    fontDescriptions: {
      condensed: 'Roboto Condensed · компактний, виразний ритм за мотивами SMT V.',
      clean: 'Roboto · спокійна геометрія й відкриті форми для малого екрана.',
      classic: 'Georgia · літературний тон і контраст штрихів для діалогового напряму Persona 2.',
      hybrid: 'Roboto Condensed у назві + Roboto у діалогах. Вузький заголовок, вільний рядок.',
    },
    dialogueStudy: 'Два способи почати розмову', dialogueNote: 'Мапа — портрет і вікно з характером Persona 2. Перед боєм — простір сцени та стриманий рядок SMT V.',
    mapDialogue: 'На мапі', prebattle: 'Перед боєм', lucky: 'Лакі', blud: 'Блуд',
    mapLine: 'Тут не пройти. Хоча можеш переконати камінь посунутися.',
    battleLine: 'Ти вже проходив цією стежкою. Чи це було завтра?',
    continue: 'Далі', location: 'Наддеснянська галявина', time: 'Перед світанком',
    reactionStudy: 'Кожен удар має бути зрозумілим', reactionNote: 'Одна форма — три палітри. Українська й англійська поруч.',
    paletteNames: { reference: '01 / Яскравий референс', muted: '02 / Лісова палітра', outline: '03 / Білий + контур' },
    paletteDescriptions: { reference: 'Насичені кольори та нахил як у наданому прикладі.', muted: 'Стриманий зелений, бузковий і мідний. Пряме накреслення.', outline: 'Білі літери, кольоровий контур. Пряме накреслення.' },
    paletteChoose: 'Обрати палітру', exampleOnly: 'Критичний удар, слабкість та інші стани тут — приклади оформлення. Поточні правила гри використовують влучання і блок.',
    pacing: 'Ритм одного обміну', pacingNote: 'Хід героя → результат удару → хід ворога → результат. Час відведено і на читання, і на реакцію.',
    play: 'Відтворити обмін', replay: 'Повторити обмін', playing: 'Триває обмін…',
    ready: 'Герой атакує, Блуд втрачає 1 HP. Потім герой блокує відповідь.',
    heroTurn: 'Хід героя', heroHit: 'Удар героя влучив. Блуд втрачає 1 HP.', enemyTurn: 'Хід ворога', blocked: 'Удар Блуда заблоковано. Здоров’я героя без змін.', done: 'Обмін завершено. Час знову обирати дію.',
    hero: 'Герой', enemy: 'Блуд', finish: 'Твій варіант готовий до перевірки',
    liveBattle: 'Спробувати справжній бій', liveNote: 'Розмова, вибір удару й захисту та весь обмін — без подорожі мапою.', closeBattle: 'Закрити бій',
    finishNote: 'Шрифт, палітра та мова перейдуть у гру за посиланням. Поточний збережений варіант залишається окремо.',
  },
  en: {
    title: 'Interface workshop', chapter: 'The Unmourned / Alternative edition',
    intro: 'One world. Different voices.', description: 'Compare titles, dialogue and battle messages. Open the game with your chosen combination.',
    game: 'Try it in the game', typography: 'Typography', palette: 'Feedback', language: 'Language',
    titleStudy: 'A title sets the tone', titleNote: 'The same illustration and words — four typographic directions.',
    selected: 'Selected', choose: 'Choose this direction', fontNote: 'Accessible alternatives, not the original game fonts. Roboto and Roboto Condensed are stored locally; Georgia uses the system font. All main directions use upright lettering.',
    franchise: 'The Unmourned', subtitle: 'Ashes over the Desna', start: 'Begin game',
    fontNames: { condensed: 'Condensed rhythm', clean: 'A clear voice', classic: 'Quiet classic', hybrid: 'Common ground' },
    fontDescriptions: {
      condensed: 'Roboto Condensed · a compact, expressive rhythm inspired by SMT V.',
      clean: 'Roboto · calm geometry and open shapes for a small screen.',
      classic: 'Georgia · a literary voice and contrasting strokes for the Persona 2 dialogue direction.',
      hybrid: 'Roboto Condensed for titles + Roboto for dialogue. Compact headings, relaxed reading.',
    },
    dialogueStudy: 'Two ways to begin a conversation', dialogueNote: 'On the map: a portrait and a Persona 2-inspired window. Before battle: room for the scene and restrained SMT V-style text.',
    mapDialogue: 'On the map', prebattle: 'Before battle', lucky: 'Lucky', blud: 'Blud',
    mapLine: 'No way through here. Unless you can persuade the rock to move.',
    battleLine: 'You have walked this path before. Or was that tomorrow?',
    continue: 'Continue', location: 'The Desna Clearing', time: 'Before dawn',
    reactionStudy: 'Every strike should be clear', reactionNote: 'One shape — three palettes. Ukrainian and English side by side.',
    paletteNames: { reference: '01 / Bright reference', muted: '02 / Forest palette', outline: '03 / White + outline' },
    paletteDescriptions: { reference: 'Saturated colours and slanted lettering, as in your reference.', muted: 'Restrained green, mauve and copper. Upright lettering.', outline: 'White lettering with a coloured outline. Upright lettering.' },
    paletteChoose: 'Choose palette', exampleOnly: 'Critical hits, weaknesses and other states are visual examples here. The current game rules use hits and blocks.',
    pacing: 'The rhythm of an exchange', pacingNote: 'Hero Turn → impact → Enemy Turn → response. There is time to read and react.',
    play: 'Play an exchange', replay: 'Play again', playing: 'Exchange in progress…',
    ready: 'The hero strikes, costing Blud 1 HP. The hero then blocks the response.',
    heroTurn: 'Hero Turn', heroHit: 'The hero’s attack lands. Blud loses 1 HP.', enemyTurn: 'Enemy Turn', blocked: 'Blud’s attack is blocked. The hero’s health is unchanged.', done: 'Exchange complete. Time to choose the next action.',
    hero: 'Hero', enemy: 'Blud', finish: 'Your combination is ready to try',
    liveBattle: 'Try the real battle', liveNote: 'Dialogue, attack and guard choices, and the full exchange — without walking across the map.', closeBattle: 'Close battle',
    finishNote: 'The link carries your type, palette and language into the game. The saved previous edition remains separate.',
  },
};

const app = document.querySelector('#ui-lab');
function gameLink() {
  return `./?${new URLSearchParams({ font: state.font, feedback: state.palette, lang: state.language })}`;
}
function sectionHeading(number, title, note) {
  return `<div class="lab-section-heading"><span class="lab-section-number">${number}</span><div><h2>${title}</h2><p>${note}</p></div></div>`;
}
function titleCard(font, index) {
  const t = COPY[state.language];
  return `<article class="lab-font-card ${font === state.font ? 'is-selected' : ''}" data-ui-font="${font}">
    <div class="lab-font-caption"><span>0${index + 1}</span><h3>${t.fontNames[font]}</h3><span class="lab-font-mark">${font === state.font ? '●' : '○'}</span></div>
    <div class="lab-title-art" style="--title-art: url('${ART}')"><div class="lab-title-lockup"><p class="lab-franchise" lang="${state.language}">${t.franchise}</p><p class="lab-subtitle">${t.subtitle}</p><span class="lab-start-sample">${t.start}<span aria-hidden="true"> ›</span></span></div></div>
    <p class="lab-font-description">${t.fontDescriptions[font]}</p>
    <div class="lab-bilingual-lines"><div lang="uk"><span class="lab-lang-tag">УКР</span><p>Тут не пройти.<br>До світанку ще є час.</p></div><div lang="en"><span class="lab-lang-tag">ENG</span><p>No way through.<br>There is still time before dawn.</p></div></div>
    <p class="lab-glyphs">Ґ ґ · Є є · І і · Ї ї · ’ · 0123456789</p>
    <button class="lab-select" data-font="${font}" aria-pressed="${font === state.font}">${font === state.font ? t.selected : t.choose}<span aria-hidden="true">↗</span></button>
  </article>`;
}
function dialogueCard(kind, language) {
  const t = COPY[language];
  const map = kind === 'map';
  return `<article class="lab-dialogue-frame lab-dialogue-frame--${kind}" lang="${language}" style="--scene-art: url('${map ? MAP : FOREST}')">
    <div class="lab-scene-meta"><span>${map ? t.mapDialogue : t.prebattle}</span><span>${language === 'uk' ? 'УКР' : 'ENG'}</span></div>
    ${map ? `<div class="lab-scene-location"><span class="lab-moon" aria-hidden="true"></span>${t.location}</div><img class="lab-lucky-portrait" src="${LUCKY}" alt="${t.lucky}" loading="lazy">` : `<img class="lab-scene-hero" src="${HERO}" alt="${t.hero}" loading="lazy"><img class="lab-scene-blud" src="${BLUD}" alt="${t.blud}" loading="lazy">`}
    <div class="lab-dialogue-panel"><div class="lab-speaker">${map ? t.lucky : t.blud}</div><p>${map ? t.mapLine : t.battleLine}</p><span class="lab-dialogue-next">${t.continue}<span aria-hidden="true"> ▸</span></span></div>
  </article>`;
}
function paletteCard(palette) {
  const t = COPY[state.language];
  return `<article class="lab-palette-card ${palette === state.palette ? 'is-selected' : ''}"><h3>${t.paletteNames[palette]}</h3><p>${t.paletteDescriptions[palette]}</p><div class="lab-feedback-head"><span>УКР</span><span>ENG</span></div><div class="lab-feedback-list">${types.map((type) => `<div class="lab-feedback-pair"><div lang="uk">${battleFeedbackMarkup({ type, language: 'uk', variant: palette })}</div><div lang="en">${battleFeedbackMarkup({ type, language: 'en', variant: palette })}</div></div>`).join('')}</div><button class="lab-select" data-palette="${palette}" aria-pressed="${palette === state.palette}">${palette === state.palette ? t.selected : t.paletteChoose}<span aria-hidden="true">↗</span></button></article>`;
}
function render(focusSelector) {
  stopDemo();
  const t = COPY[state.language];
  document.documentElement.lang = state.language;
  document.documentElement.dataset.uiFont = state.font;
  document.title = `${t.title} · ${t.franchise}`;
  app.innerHTML = `<header class="lab-header"><a class="lab-brand" href="./">${t.franchise}<span>${t.subtitle}</span></a><a class="lab-game-link" href="${gameLink()}">${t.game}<span aria-hidden="true">↗</span></a></header>
    <main class="lab-main">
      <section class="lab-intro"><p class="lab-eyebrow">${t.chapter}</p><h1>${t.intro}</h1><p class="lab-lead">${t.description}</p><div class="lab-intro-line" aria-hidden="true"></div></section>
      <nav class="lab-controls" aria-label="${t.title}"><label>${t.typography}<select name="font">${fonts.map((font) => `<option value="${font}" ${state.font === font ? 'selected' : ''}>${t.fontNames[font]}</option>`).join('')}</select></label><label>${t.palette}<select name="palette">${palettes.map((palette) => `<option value="${palette}" ${state.palette === palette ? 'selected' : ''}>${t.paletteNames[palette]}</option>`).join('')}</select></label><div class="lab-language"><span>${t.language}</span><div role="group" aria-label="${t.language}"><button data-language="uk" aria-pressed="${state.language === 'uk'}">УКР</button><button data-language="en" aria-pressed="${state.language === 'en'}">ENG</button></div></div></nav>
      <section class="lab-section" id="typography">${sectionHeading('01', t.titleStudy, t.titleNote)}<div class="lab-font-grid">${fonts.map(titleCard).join('')}</div><p class="lab-note">${t.fontNote}</p></section>
      <section class="lab-section" id="dialogues">${sectionHeading('02', t.dialogueStudy, t.dialogueNote)}<div class="lab-dialogue-grid">${['map', 'prebattle'].map((kind) => ['uk', 'en'].map((lang) => dialogueCard(kind, lang)).join('')).join('')}</div></section>
      <section class="lab-section" id="feedback">${sectionHeading('03', t.reactionStudy, t.reactionNote)}<div class="lab-palette-grid">${palettes.map(paletteCard).join('')}</div><p class="lab-note">${t.exampleOnly}</p></section>
      <section class="lab-section" id="pacing">${sectionHeading('04', t.pacing, t.pacingNote)}
        <div class="lab-demo-frame" style="--scene-art: url('${FOREST}')"><div class="lab-demo-hp lab-demo-hp--hero"><span>${t.hero}</span><strong data-hp="hero">3 / 3</strong><i></i></div><div class="lab-demo-hp lab-demo-hp--enemy"><span>${t.enemy}</span><strong data-hp="enemy">3 / 3</strong><i></i></div><div class="lab-demo-turn" aria-live="off"></div><div class="lab-demo-actor lab-demo-actor--hero"><span class="lab-actor-shadow"></span><img src="${HERO}" alt="${t.hero}" loading="lazy"><div class="lab-demo-impact"></div></div><div class="lab-demo-actor lab-demo-actor--enemy"><span class="lab-actor-shadow"></span><img src="${BLUD}" alt="${t.enemy}" loading="lazy"><div class="lab-demo-impact"></div></div><div class="lab-demo-status"><p aria-live="polite">${t.ready}</p><button data-play>${t.play}<span aria-hidden="true"> ▶</span></button></div></div>
        <ol class="lab-timeline"><li data-timeline="0"><span>01</span>${t.heroTurn}</li><li data-timeline="1"><span>02</span>−1 HP</li><li data-timeline="2"><span>03</span>${t.enemyTurn}</li><li data-timeline="3"><span>04</span>${state.language === 'uk' ? 'Блок' : 'Block'}</li></ol>
        <div class="lab-live-entry"><p>${t.liveNote}</p><button data-live-battle>${t.liveBattle}<span aria-hidden="true"> ↗</span></button></div>
      </section>
      <footer class="lab-footer"><div><p class="lab-eyebrow">${t.franchise}</p><h2>${t.finish}</h2><p>${t.finishNote}</p></div><a class="lab-primary-link" href="${gameLink()}">${t.game}<span aria-hidden="true">↗</span></a></footer>
    </main>`;
  if (focusSelector) app.querySelector(focusSelector)?.focus({ preventScroll: true });
}

function setChoice(key, value, focusSelector) {
  state[key] = value;
  const url = new URL(location.href);
  url.searchParams.set('font', state.font);
  url.searchParams.set('feedback', state.palette);
  url.searchParams.set('lang', state.language);
  history.replaceState(null, '', url);
  render(focusSelector);
}
function stopDemo() {
  state.demoGeneration += 1;
  state.demoRunning = false;
  const button = app.querySelector('[data-play]');
  if (button) {
    button.disabled = false;
    button.textContent = COPY[state.language].play;
    app.querySelector('.lab-demo-status p').textContent = COPY[state.language].ready;
    app.querySelector('.lab-demo-turn').replaceChildren();
    app.querySelectorAll('.lab-demo-impact').forEach((impact) => impact.replaceChildren());
    app.querySelectorAll('.lab-demo-actor').forEach((actor) => actor.classList.remove('is-striking', 'is-hit'));
    app.querySelectorAll('[data-timeline]').forEach((item) => item.classList.remove('is-active'));
    const enemyHp = app.querySelector('[data-hp="enemy"]');
    enemyHp.textContent = '3 / 3';
    enemyHp.parentElement.style.setProperty('--health', '100%');
  }
}
function openLiveBattle(trigger) {
  stopDemo();
  const t = COPY[state.language];
  const dialog = document.createElement('dialog');
  dialog.className = 'lab-live-dialog';
  dialog.setAttribute('aria-label', t.liveBattle);
  dialog.innerHTML = `<div class="lab-live-toolbar"><span>${t.prebattle} / ${t.enemy}</span><button type="button" data-close-live>${t.closeBattle}<span aria-hidden="true"> ×</span></button></div><div class="lab-live-host"></div>`;
  document.body.append(dialog);
  const battle = createBattle({
    host: dialog.querySelector('.lab-live-host'),
    language: state.language,
    feedback: state.palette,
    intro: true,
    onComplete: () => dialog.close(),
  });
  dialog.querySelector('[data-close-live]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    battle.destroy();
    dialog.remove();
    trigger.focus({ preventScroll: true });
  }, { once: true });
  dialog.showModal();
  void battle.start();
}
async function playDemo() {
  if (state.demoRunning) return;
  const generation = ++state.demoGeneration;
  state.demoRunning = true;
  const t = COPY[state.language];
  const button = app.querySelector('[data-play]');
  const status = app.querySelector('.lab-demo-status p');
  const turn = app.querySelector('.lab-demo-turn');
  const hero = app.querySelector('.lab-demo-actor--hero');
  const enemy = app.querySelector('.lab-demo-actor--enemy');
  const enemyHp = app.querySelector('[data-hp="enemy"]');
  const timeline = [...app.querySelectorAll('[data-timeline]')];
  button.disabled = true;
  button.textContent = t.playing;
  enemyHp.textContent = '3 / 3';
  enemyHp.parentElement.style.setProperty('--health', '100%');
  const pause = (ms) => new Promise((resolve) => setTimeout(() => resolve(generation === state.demoGeneration), ms));
  const active = (index, text) => { timeline.forEach((item, i) => item.classList.toggle('is-active', i === index)); status.textContent = text; };
  active(0, t.heroTurn);
  turn.innerHTML = battleTurnMarkup({ side: 'hero', language: state.language, variant: state.palette });
  if (!await pause(1600)) return;
  turn.replaceChildren();
  hero.classList.add('is-striking');
  if (!await pause(350)) return;
  active(1, t.heroHit);
  enemy.classList.add('is-hit');
  enemy.querySelector('.lab-demo-impact').innerHTML = battleFeedbackMarkup({ type: 'hit', language: state.language, variant: state.palette, amount: 1 });
  enemyHp.textContent = '2 / 3';
  enemyHp.parentElement.style.setProperty('--health', '66.667%');
  if (!await pause(1800)) return;
  hero.classList.remove('is-striking');
  enemy.classList.remove('is-hit');
  enemy.querySelector('.lab-demo-impact').replaceChildren();
  active(2, t.enemyTurn);
  turn.innerHTML = battleTurnMarkup({ side: 'enemy', language: state.language, variant: state.palette });
  if (!await pause(1600)) return;
  turn.replaceChildren();
  enemy.classList.add('is-striking');
  if (!await pause(350)) return;
  active(3, t.blocked);
  hero.querySelector('.lab-demo-impact').innerHTML = battleFeedbackMarkup({ type: 'block', language: state.language, variant: state.palette });
  if (!await pause(1800)) return;
  enemy.classList.remove('is-striking');
  hero.querySelector('.lab-demo-impact').replaceChildren();
  status.textContent = t.done;
  button.disabled = false;
  button.textContent = `${t.replay} ↻`;
  state.demoRunning = false;
}

app.addEventListener('click', (event) => {
  const target = event.target.closest('button');
  if (!target) return;
  if (target.dataset.font) setChoice('font', target.dataset.font, `[data-font="${target.dataset.font}"]`);
  else if (target.dataset.palette) setChoice('palette', target.dataset.palette, `[data-palette="${target.dataset.palette}"]`);
  else if (target.dataset.language) setChoice('language', target.dataset.language, `[data-language="${target.dataset.language}"]`);
  else if (target.hasAttribute('data-play')) playDemo();
  else if (target.hasAttribute('data-live-battle')) openLiveBattle(target);
});
app.addEventListener('change', (event) => {
  if (event.target.name === 'font') setChoice('font', event.target.value, '[name="font"]');
  if (event.target.name === 'palette') setChoice('palette', event.target.value, '[name="palette"]');
});
window.addEventListener('pagehide', stopDemo);
render();
