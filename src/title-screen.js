import "./title-screen.css";

const UK_TITLES = {
  unmourned: { name: "Невідспівані", lines: ["Невідспівані"] },
  rebirth: { name: "Друге народження богів", lines: ["Друге народження", "богів"] },
};

const EN_TITLES = {
  unmourned: { name: "The Unmourned", lines: ["The Unmourned"] },
  rebirth: { name: "The Second Birth of the Gods", lines: ["The Second Birth", "of the Gods"] },
};

export function mountTitleScreen(host, { language = "uk" } = {}) {
  const TITLES = language === "en" ? EN_TITLES : UK_TITLES;
  const subtitle = language === "en" ? "Ashes over the Desna" : "Прах над Десною";
  host.querySelector(".start-screen__subtitle").textContent = subtitle;
  host.querySelector(".start-screen__variants").setAttribute("aria-label", language === "en" ? "Game title variant" : "Варіант назви гри");
  const heading = host.querySelector("#game-title");
  const buttons = [...host.querySelectorAll("[data-title-option]")];
  const controller = new AbortController();

  function selectTitle(variant, updateURL = false) {
    const key = Object.hasOwn(TITLES, variant) ? variant : "unmourned";
    const title = TITLES[key];
    host.dataset.titleVariant = key;
    heading.replaceChildren(...title.lines.map((line, index) => {
      const span = document.createElement("span");
      span.className = "start-screen__title-line";
      span.textContent = line + (index < title.lines.length - 1 ? " " : "");
      return span;
    }));
    document.title = `${title.name}: ${subtitle}`;
    for (const button of buttons) {
      button.textContent = TITLES[button.dataset.titleOption].name;
      button.setAttribute("aria-pressed", String(button.dataset.titleOption === key));
    }
    if (updateURL) {
      const url = new URL(window.location.href);
      if (key === "unmourned") url.searchParams.delete("title");
      else url.searchParams.set("title", key);
      window.history.replaceState(null, "", url);
      window.scrollTo(0, 0);
    }
  }

  const syncURL = () => selectTitle(new URL(window.location.href).searchParams.get("title"));
  syncURL();
  for (const button of buttons) {
    button.addEventListener("click", () => selectTitle(button.dataset.titleOption, true), { signal: controller.signal });
  }
  for (const button of host.querySelectorAll("[data-language]")) {
    button.setAttribute("aria-pressed", String(button.dataset.language === language));
    button.addEventListener("click", () => {
      if (button.dataset.language === language) return;
      const url = new URL(window.location.href);
      url.searchParams.set("lang", button.dataset.language);
      window.location.assign(url);
    }, { signal: controller.signal });
  }
  window.addEventListener("popstate", syncURL, { signal: controller.signal });
  return { destroy: () => controller.abort() };
}
