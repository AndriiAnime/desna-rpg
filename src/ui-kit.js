import "./ui-kit.css";

// Preview-only strings and preference: the current game keeps its own state.
const messages = {
  uk: {
    pageTitle: "Десна · Проба інтерфейсу",
    brand: "ПРАХ НАД ДЕСНОЮ",
    candidate: "ПРОБА ІНТЕРФЕЙСУ · 01",
    title: "Голос із лісу",
    lead: "Два вікна Persona 2. Стриманий ритм тексту SMT V. Ледь помітний зелений у сірому.",
    language: "Мова перегляду",
    languageNote: "Мова змінюється лише в цьому перегляді.",
    returnGame: "До гри",
    lightTitle: "Світле вікно · діалог",
    lightNote: "Силует локації над рамкою",
    darkTitle: "Темне вікно · повідомлення",
    darkNote: "Ті самі зрізані кути й дрібні позначки",
    location: "НАДДЕСНЯНСЬКА ГАЛЯВИНА",
    forest: "Ліс",
    mountains: "Гори",
    scenery: "Силует локації",
    narrator: "Твій супутник",
    next: "Далі",
    again: "Ще раз",
    continueLabel: "Наступна репліка Lucky",
    line: "Репліка",
    dialogue: [
      "У мене є для тебе дві новини: погана і ще гірша.",
      "Погана — твій дід помер.",
      "Ще гірша: якщо до світанку не упокоїти його душу, вона стане неспокійним духом.",
      "Віднеси прах до кургану над Десною. Я буду поруч. Так, я теж іду.",
    ],
    event: "ЗУСТРІЧ НА СТЕЖЦІ",
    encounter: "Почався бій",
    encounterText: "Біля мосту на тебе чекає Блуд. Далі доведеться пройти крізь нього.",
    close: "Закрити",
    closed: "Повідомлення закрито",
    reopen: "Показати повідомлення",
    typeLabel: "ТИПОГРАФІКА",
    typeTitle: "Одна гарнітура. Дві мови.",
    typeNote: "Roboto · пряме накреслення · 400 / 500 / 600",
    glyphs: "Ґрунт · Єдність · Їжак · Історія · Пам’ять",
    alphabet: "АБВГҐДЕЄЖЗИІЇЙКЛМНОПРСТУФХЦЧШЩЬЮЯ",
    bottomNote: "Кандидат для обговорення. Ігрові вікна поки без змін.",
    keyboard: "Tab — вибір · Enter — дія",
  },
  en: {
    pageTitle: "Desna · Interface study",
    brand: "ASHES OVER DESNA",
    candidate: "INTERFACE STUDY · 01",
    title: "A voice in the woods",
    lead: "Two Persona 2 windows. The restrained text rhythm of SMT V. A trace of green in the gray.",
    language: "Preview language",
    languageNote: "The language changes in this preview only.",
    returnGame: "Back to game",
    lightTitle: "Light window · dialogue",
    lightNote: "The location silhouette rises above the frame",
    darkTitle: "Dark window · message",
    darkNote: "Matching clipped corners and small ornaments",
    location: "THE DESNA CLEARING",
    forest: "Forest",
    mountains: "Mountains",
    scenery: "Location silhouette",
    narrator: "Your companion",
    next: "Next",
    again: "Again",
    continueLabel: "Next line from Lucky",
    line: "Line",
    dialogue: [
      "I have two pieces of news for you: bad, and even worse.",
      "The bad news: your grandfather is dead.",
      "Even worse: unless you lay his soul to rest before dawn, it will become a restless spirit.",
      "Take his ashes to the burial mound by the Desna. I’ll be right beside you. Yes, I’m coming too.",
    ],
    event: "AN ENCOUNTER ON THE PATH",
    encounter: "Battle has begun",
    encounterText: "Blud is waiting by the bridge. You’ll have to get past him to go any farther.",
    close: "Close",
    closed: "Message closed",
    reopen: "Show message",
    typeLabel: "TYPOGRAPHY",
    typeTitle: "One typeface. Two languages.",
    typeNote: "Roboto · upright · 400 / 500 / 600",
    glyphs: "The clearing · A last journey · Before dawn",
    alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    bottomNote: "A candidate for review. The game’s windows are unchanged.",
    keyboard: "Tab to select · Enter to act",
  },
};

const preferenceKey = "desna-ui-kit-language";
let language = "uk";
try {
  if (localStorage.getItem(preferenceKey) === "en") language = "en";
} catch { /* The preview also works with storage disabled. */ }
let dialogueIndex = 0;
let scenery = "forest";
let messageOpen = true;

const forest = `<svg viewBox="0 0 1000 120" preserveAspectRatio="none" aria-hidden="true">
  <path d="M0 120V106H16V100H23V88H29V100H40V105H60V97H70V101H94V92H107V96H130V103H150V89H161V82H167V88H173V79H181V94H204V101H222V109H251V102H271V94H283V101H309V90H323V83H336V94H353V103H375V97H392V85H410V94H427V105H450V101H466V88H479V91H489V99H508V107H537V97H555V88H570V94H590V103H612V98H623V88H634V97H652V105H678V97H690V87H701V78H708V91H726V104H749V95H762V92H782V100H800V105H826V97H839V85H848V97H861V104H885V92H899V97H916V105H938V96H951V91H963V102H981V105H1000V120Z"/>
  <path d="M84 116V68H78V63H57V54H49V42H57V28H72V21H81V12H100V17H109V25H122V39H128V53H119V62H99V68H94V116Z M86 72L67 56L71 52L88 62L105 45L110 49L94 71Z"/>
  <path d="M222 111V68H215V64H198V53H189V39H199V29H212V18H225V23H239V33H250V50H241V60H231V112Z M225 75L209 57L211 54L227 65L238 48L242 51Z"/>
  <path d="M343 114V94H316L332 80H320L339 62H329L347 43L360 62H351L369 80H357L375 94H352V114Z"/>
  <path d="M446 115V69H434V62H419V53H414V39H424V28H434V19H450V13H465V22H481V37H489V51H479V62H458V115Z M449 76L431 55L436 52L450 66L469 44L473 48L458 76Z"/>
  <path d="M594 115V88H570L584 75H573L594 54L610 75H601L618 88H602V115Z"/>
  <path d="M675 115V57H660V50H650V36H657V23H669V15H679V2H695V12H710V22H722V35H714V47H695V56H686V115Z M679 68L661 47L665 44L680 57L698 37L702 41L686 67Z"/>
  <path d="M798 116V73H787V68H773V59H767V45H778V35H788V28H803V32H817V44H828V58H819V69H808V116Z M801 82L785 62L788 59L801 71L814 56L817 60L808 79Z"/>
  <path d="M917 117V95H894L909 78H900L921 53L939 78H930L947 95H927V117Z"/>
</svg>`;

const mountains = `<svg viewBox="0 0 1000 120" preserveAspectRatio="none" aria-hidden="true"><path d="M0 120V110L52 88L87 94L150 47L183 68L219 26L276 79L316 58L351 72L409 19L434 40L454 10L521 81L552 64L592 88L647 42L676 65L714 32L765 78L799 66L838 91L885 52L932 90L965 81L1000 104V120Z"/><path class="mountain-cut" d="M219 26L207 54L220 48L232 60L240 52Z M454 10L437 47L455 39L468 50L480 40Z M714 32L701 57L714 51L727 61L736 54Z"/></svg>`;

const ornaments = `<span class="corner-dots corner-dots--top" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></span><span class="corner-dots corner-dots--bottom" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></span>`;
const arrow = `<svg class="action-arrow" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 2L12 8L3 14Z"/></svg>`;

function render(focusTarget) {
  const t = messages[language];
  document.documentElement.lang = language;
  document.title = t.pageTitle;
  document.querySelector("#ui-kit").innerHTML = `
    <header class="preview-header">
      <a class="wordmark" href="./">${t.brand}</a>
      <div class="language-group" role="group" aria-label="${t.language}">
        <button type="button" data-language="uk" lang="uk" aria-pressed="${language === "uk"}">УКР</button>
        <span aria-hidden="true">/</span>
        <button type="button" data-language="en" lang="en" aria-pressed="${language === "en"}">ENG</button>
      </div>
    </header>
    <main>
      <section class="intro" aria-labelledby="study-title">
        <p class="eyebrow">${t.candidate}</p>
        <h1 id="study-title">${t.title}</h1>
        <p class="intro-copy">${t.lead}</p>
      </section>

      <section class="window-study" aria-labelledby="light-title">
        <div class="study-heading"><div><h2 id="light-title"><span class="study-index">01</span>${t.lightTitle}</h2><p>${t.lightNote}</p></div>
          <div class="scenery-control" role="group" aria-label="${t.scenery}"><button type="button" data-scenery="forest" aria-pressed="${scenery === "forest"}">${t.forest}</button><button type="button" data-scenery="mountains" aria-pressed="${scenery === "mountains"}">${t.mountains}</button></div>
        </div>
        <div class="dialogue-stage">
          <div class="location-caption"><span class="location-marker" aria-hidden="true"></span>${t.location}</div>
          <div class="light-dialogue">
            <div class="location-silhouette">${scenery === "forest" ? forest : mountains}</div>
            <div class="message-window message-window--light"><div class="frame-middle"><div class="frame-surface">
              ${ornaments}
              <div class="dialogue-content">
                <div class="moth-portrait"><img src="./assets/moth-narrator-v1.png" alt="Lucky" width="1280" height="1280" /></div>
                <div class="dialogue-writing"><div class="speaker"><strong>Lucky</strong><span>${t.narrator}</span></div>
                  <p id="lucky-line" class="dialogue-line" aria-live="polite">${t.dialogue[dialogueIndex]}</p>
                  <div class="dialogue-footer"><span class="line-count" aria-label="${t.line} ${dialogueIndex + 1} / ${t.dialogue.length}">${String(dialogueIndex + 1).padStart(2, "0")} <span>/ ${String(t.dialogue.length).padStart(2, "0")}</span></span><button type="button" class="text-action" data-action="advance" aria-label="${t.continueLabel}">${dialogueIndex === t.dialogue.length - 1 ? t.again : t.next}${arrow}</button></div>
                </div>
              </div>
            </div></div></div>
          </div>
        </div>
      </section>

      <section class="window-study" aria-labelledby="dark-title">
        <div class="study-heading"><div><h2 id="dark-title"><span class="study-index">02</span>${t.darkTitle}</h2><p>${t.darkNote}</p></div></div>
        <div class="dark-stage">
          <div class="dark-message-slot">
            ${messageOpen ? `<div class="message-window message-window--dark"><div class="frame-middle"><div class="frame-surface">${ornaments}<div class="system-message"><p class="eyebrow">${t.event}</p><h3>${t.encounter}</h3><p class="system-copy">${t.encounterText}</p><button type="button" class="text-action" data-action="close">${t.close}${arrow}</button></div></div></div></div>` : `<div class="closed-message"><p role="status">${t.closed}</p><button class="plain-button" type="button" data-action="reopen">${t.reopen}${arrow}</button></div>`}
          </div>
          <div class="dark-stage-caption"><span class="location-marker" aria-hidden="true"></span>${t.location}</div>
        </div>
      </section>

      <section class="type-study" aria-labelledby="type-title">
        <div><p class="eyebrow">${t.typeLabel}</p><h2 id="type-title">${t.typeTitle}</h2><p class="type-meta">${t.typeNote}</p></div>
        <div class="type-sample"><p class="sample-words" lang="${language}">${t.glyphs}</p><p class="sample-alphabet">${t.alphabet}</p><p class="sample-numbers">0123456789 · ! ? — ’ « »</p></div>
      </section>
      <footer class="preview-footer"><p>${t.bottomNote}<br /><span>${t.languageNote}</span></p><a href="./">${t.returnGame} ↗</a><p class="keyboard-help">${t.keyboard}</p></footer>
    </main>`;

  if (focusTarget) document.querySelector(focusTarget)?.focus({ preventScroll: true });
}

document.querySelector("#ui-kit").addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  if (button.dataset.language) {
    language = button.dataset.language;
    try { localStorage.setItem(preferenceKey, language); } catch { /* Optional preference. */ }
    render(`[data-language="${language}"]`);
  } else if (button.dataset.scenery) {
    scenery = button.dataset.scenery;
    render(`[data-scenery="${scenery}"]`);
  } else if (button.dataset.action === "advance") {
    dialogueIndex = (dialogueIndex + 1) % messages[language].dialogue.length;
    // Keep the live region mounted so screen readers receive the next line.
    document.querySelector("#lucky-line").textContent = messages[language].dialogue[dialogueIndex];
    const count = document.querySelector(".line-count");
    count.innerHTML = `${String(dialogueIndex + 1).padStart(2, "0")} <span>/ ${String(messages[language].dialogue.length).padStart(2, "0")}</span>`;
    count.setAttribute("aria-label", `${messages[language].line} ${dialogueIndex + 1} / ${messages[language].dialogue.length}`);
    button.innerHTML = `${dialogueIndex === messages[language].dialogue.length - 1 ? messages[language].again : messages[language].next}${arrow}`;
  } else if (button.dataset.action === "close") {
    messageOpen = false;
    render('[data-action="reopen"]');
  } else if (button.dataset.action === "reopen") {
    messageOpen = true;
    render('[data-action="close"]');
  }
});

render();
