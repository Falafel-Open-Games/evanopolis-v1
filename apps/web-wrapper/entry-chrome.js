/*
  Shared behavior for the player-facing entry pages:
  - the language menu and translation of static page text (entry-i18n.js);
  - the light/dark theme toggle, remembered per browser;
  - the mobile header menu;
  - mirroring option buttons into their native <select>;
  - publishing the room card height for the docked card on short windows.
  Loaded in <head> so a remembered theme applies before the first paint.
*/
const EntryThemeStorageKey = "evanopolis.entry.theme";

applyStoredEntryTheme();
document.addEventListener("DOMContentLoaded", installEntryChrome);

function installEntryChrome() {
  installLanguageMenu(document.getElementById("entry-language-button"), document.getElementById("entry-language-menu"));
  translateStaticText();
  installThemeToggle(document.getElementById("entry-theme-toggle"));
  installMenu(document.getElementById("entry-topbar"), document.getElementById("entry-menu-button"));
  installRoomCardHeight(document.querySelector(".room-entry-shell"), document.querySelector(".entry-room-card"));
}

// Theme

function applyStoredEntryTheme() {
  const storedTheme = readStoredEntryTheme();
  if (storedTheme !== null) {
    document.documentElement.dataset.theme = storedTheme;
  }
}

function readStoredEntryTheme() {
  try {
    const value = window.localStorage.getItem(EntryThemeStorageKey);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

function currentEntryTheme() {
  const explicitTheme = document.documentElement.dataset.theme;
  if (explicitTheme === "light" || explicitTheme === "dark") {
    return explicitTheme;
  }

  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function installThemeToggle(themeToggle) {
  renderThemeToggle(themeToggle);
  themeToggle.addEventListener("click", () => {
    const nextTheme = currentEntryTheme() === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = nextTheme;
    try {
      window.localStorage.setItem(EntryThemeStorageKey, nextTheme);
    } catch {
      // Without storage the choice still applies to this page view.
    }
    renderThemeToggle(themeToggle);
  });
  window.matchMedia("(prefers-color-scheme: light)").addEventListener("change", () => {
    renderThemeToggle(themeToggle);
  });
}

function renderThemeToggle(themeToggle) {
  const theme = currentEntryTheme();
  themeToggle.dataset.theme = theme;
  themeToggle.setAttribute("aria-label", theme === "light" ? t("Switch to dark theme") : t("Switch to light theme"));
}

// Language

function installLanguageMenu(languageButton, languageMenu) {
  const setMenuOpen = (isOpen) => {
    languageMenu.hidden = !isOpen;
    languageButton.setAttribute("aria-expanded", String(isOpen));
  };

  languageButton.addEventListener("click", () => {
    setMenuOpen(languageMenu.hidden);
  });
  languageMenu.addEventListener("click", (event) => {
    const option = event.target.closest("[data-language]");
    if (option === null) {
      return;
    }
    setMenuOpen(false);
    setEntryLanguage(option.dataset.language);
    languageButton.focus();
  });
  document.addEventListener("click", (event) => {
    if (!languageMenu.hidden && !event.target.closest(".entry-language")) {
      setMenuOpen(false);
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !languageMenu.hidden) {
      setMenuOpen(false);
      languageButton.focus();
    }
  });
  document.addEventListener(EntryLanguageChangeEvent, translateStaticText);
}

/*
  Translates the static page text marked in the HTML: [data-i18n] elements
  (text content), [data-i18n-aria-label] and [data-i18n-placeholder]
  attributes, and the document title. The English source is read once from
  the markup and kept in a data attribute, so switching back and forth
  always translates from English.
*/
function translateStaticText() {
  const language = entryLanguage();
  document.documentElement.lang = EntryLanguages[language].htmlLang;
  document.title = t(rememberedSource(document.documentElement, "titleSource", document.title));

  for (const element of document.querySelectorAll("[data-i18n]")) {
    element.textContent = t(rememberedSource(element, "i18nSource", element.textContent.trim()));
  }
  for (const element of document.querySelectorAll("[data-i18n-aria-label]")) {
    element.setAttribute("aria-label", t(rememberedSource(element, "i18nAriaLabel", element.getAttribute("aria-label"))));
  }
  for (const element of document.querySelectorAll("[data-i18n-placeholder]")) {
    element.placeholder = t(rememberedSource(element, "i18nPlaceholder", element.placeholder));
  }

  renderLanguageMenu(language);
  renderThemeToggle(document.getElementById("entry-theme-toggle"));
}

function rememberedSource(element, key, currentValue) {
  if (element.dataset[key] === undefined) {
    element.dataset[key] = currentValue;
  }
  return element.dataset[key];
}

function renderLanguageMenu(language) {
  document.getElementById("entry-language-code").textContent = EntryLanguages[language].code;
  document.getElementById("entry-language-flag").dataset.language = language;
  document.getElementById("entry-language-button").setAttribute("aria-label", t("Language"));
  document.getElementById("entry-language-menu").setAttribute("aria-label", t("Language"));
  for (const option of document.querySelectorAll("#entry-language-menu [data-language]")) {
    option.setAttribute("aria-checked", String(option.dataset.language === language));
  }
}

// Mobile menu

function installMenu(topbar, menuButton) {
  menuButton.addEventListener("click", () => {
    const isOpen = topbar.dataset.menuOpen === "true";
    topbar.dataset.menuOpen = String(!isOpen);
    menuButton.setAttribute("aria-expanded", String(!isOpen));
  });
}

// Option buttons

// Mirrors a segmented or tier button choice into its native <select>, which
// stays the single source of truth for the form value.
function mirrorOptionToSelect(event, select) {
  const option = event.target.closest("button[data-value]");
  if (option === null || option.disabled) {
    return;
  }

  select.value = option.dataset.value;
  select.dispatchEvent(new Event("change"));
}

// Room card height

// Exposes the room card height as --room-card-height so the sticky dock can
// pin a card taller than the viewport by its bottom edge.
function installRoomCardHeight(shell, card) {
  const observer = new ResizeObserver(([entry]) => {
    const height = entry.borderBoxSize[0].blockSize;
    shell.style.setProperty("--room-card-height", `${Math.ceil(height)}px`);
  });
  observer.observe(card);
}
