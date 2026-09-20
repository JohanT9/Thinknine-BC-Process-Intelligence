const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const registrySource = fs.readFileSync(path.join(root,
  "src/engine/language-registry.js"), "utf8");
const source = fs.readFileSync(path.join(root, "src/ui/i18n.js"), "utf8");
const context = { globalThis: {}, CustomEvent: class CustomEvent {} };
vm.runInNewContext(fs.readFileSync(path.join(root, "src/engine/locale-catalogs.js"), "utf8"), context);
vm.runInNewContext(registrySource, context);
vm.runInNewContext(source, context);
const i18n = context.globalThis.T9UiI18n;

assert.deepStrictEqual([...i18n.SUPPORTED_LOCALES], ["sv-SE", "en-US", "fr-FR", "de-DE", "es-ES", "da-DK", "fi-FI", "nb-NO"]);
assert.equal(i18n.normalizeLocale(), "en-US");
assert.equal(i18n.normalizeLocale("en-GB"), "en-US");
assert.equal(i18n.normalizeLocale("sv"), "sv-SE");
assert.equal(i18n.normalizeLocale("da-DK"), "da-DK");
assert.equal(i18n.translate("settings.language", "sv-SE"), "Gränssnittsspråk");
assert.equal(i18n.translate("settings.language", "en-US"), "Interface language");
assert.equal(i18n.translate("missing.key", "en-US"), "missing.key");
assert.equal(i18n.format("library.manyShown", { count: 4 }, "en-US"),
  "4 documents shown.");
assert.equal(i18n.translateStaticText("Spara", "en-US"), "Save");
assert.equal(i18n.translateStaticText("Save", "sv-SE"), "Spara");
assert.equal(i18n.translateStaticText(
  "Include technical details in description", "sv-SE"),
"Inkludera tekniska detaljer i beskrivningen");
assert.equal(i18n.translate("technical.included", "sv-SE"), "inkluderat");

const dashboardHtml = fs.readFileSync(path.join(root,
  "src/ui/dashboard.html"), "utf8");
const popupHtml = fs.readFileSync(path.join(root, "src/ui/popup.html"), "utf8");
const dashboard = fs.readFileSync(path.join(root, "src/ui/dashboard.js"), "utf8");
const popup = fs.readFileSync(path.join(root, "src/ui/popup.js"), "utf8");
const background = fs.readFileSync(path.join(root,
  "src/recorder/background.js"), "utf8");
const debugHtml = fs.readFileSync(path.join(root, "src/ui/debug.html"), "utf8");
const debug = fs.readFileSync(path.join(root, "src/ui/debug.js"), "utf8");
const technicalHtml = fs.readFileSync(path.join(root,
  "src/ui/technical-report.html"), "utf8");
const technical = fs.readFileSync(path.join(root,
  "src/ui/technical-report.js"), "utf8");
const licenseHtml = fs.readFileSync(path.join(root,
  "src/ui/license-status.html"), "utf8");
const license = fs.readFileSync(path.join(root,
  "src/ui/license-status.js"), "utf8");
const content = fs.readFileSync(path.join(root,
  "src/recorder/content.js"), "utf8");
const build = fs.readFileSync(path.join(root, "scripts/build.js"), "utf8");

assert.match(dashboardHtml, /id="uiLocale"[\s\S]*value="sv-SE"[\s\S]*value="en-US"/);
assert.match(dashboardHtml, /id="documentLanguage"[\s\S]*value="sv-SE"[\s\S]*value="en-US"/);
assert.match(dashboardHtml, /id="reviewDocumentLanguage"/);
assert.match(dashboardHtml, /document\/document-language\.js/);
assert.match(dashboardHtml, /<script src="i18n\.js"><\/script>/);
assert.match(popupHtml, /<script src="i18n\.js"><\/script>/);
assert.match(dashboard, /uiLocale: "en-US"/);
assert.match(dashboard, /documentLanguage: "en-US"/);
assert.match(dashboard, /activeDocumentLanguage/);
assert.match(dashboard, /T9UiI18n\.apply\(settings\.uiLocale\)/);
assert.match(dashboard, /T9UiI18n\.observe/);
assert.match(dashboard, /uiTf\("document\.page"/);
assert.match(dashboard, /type: "T9_SAVE_UI_LOCALE", uiLocale/);
assert.match(popup, /T9_GET_SETTINGS/);
assert.match(popupHtml, /id="languageSwitch"/);
assert.match(popupHtml, /id="recordingDocumentLanguage"[\s\S]*value="sv-SE"[\s\S]*value="en-US"/);
assert.match(dashboardHtml, /id="libraryLanguageFilter"/);
assert.match(dashboardHtml, /data-i18n="process\.overview"/);
assert.match(dashboardHtml, /data-i18n="process\.overviewHelp"/);
assert.match(dashboardHtml,
  /<label for="libraryLanguageFilter">\s*<span data-i18n="library\.documentLanguage">[\s\S]*?<select id="libraryLanguageFilter"/);
assert.doesNotMatch(dashboardHtml,
  /<label[^>]*data-i18n="library\.documentLanguage"[^>]*>[\s\S]*?<select id="libraryLanguageFilter"/);
assert.match(dashboard, /storedRecord\.documentLanguage/);
assert.match(dashboard, /updateDocumentLibraryRecord\(activeReviewSession\.id/);
assert.doesNotMatch(popupHtml, /id="languageFlag"/);
assert.match(popup, /T9_SAVE_UI_LOCALE/);
assert.match(popup, /function switchUiLocale\(event\)/);
assert.equal(i18n.translate("language.switchToEnglish", "sv-SE"),
  "Byt språk till engelska");
assert.equal(i18n.translate("language.switchToSwedish", "en-US"),
  "Switch language to Swedish");
assert.match(popup, /T9UiI18n\.observe/);
assert.match(source, /#documentWorkspace, #reviewList, #annotationStage/);
assert.match(background, /uiLocale: "sv-SE"/);
assert.match(background, /case "T9_SAVE_UI_LOCALE"/);
assert.match(build, /"i18n\.js"/);
assert.match(debugHtml, /<script src="i18n\.js"><\/script>/);
assert.match(debug, /T9_GET_SETTINGS/);
assert.match(technicalHtml, /<script src="i18n\.js"><\/script>/);
assert.match(technical, /technical\.issueCopied/);
assert.match(technical, /technical\.sensitiveCategories/);
assert.match(technicalHtml, /data-i18n-aria-label="technical\.closeSharing"/);
assert.match(licenseHtml, /<script src="i18n\.js"><\/script>/);
assert.match(licenseHtml, /data-i18n="license\.pageTitle"/);
assert.equal(i18n.translate("license.pageTitle", "en-US"), "License information");
assert.match(license, /T9_GET_SETTINGS/);
assert.match(license, /Intl\.DateTimeFormat\(currentUiLocale/);
assert.match(content, /uiText\("Inspelning pågår", "Recording in progress"\)/);
assert.match(content, /changes\.t9_settings/);
assert.match(source, /\[data-i18n-aria-label\]/);
assert.match(dashboard, /uiTf\("a11y\.editInstruction"/);
assert.equal(i18n.translateStaticText("Anslutning till BC", "en-US"),
  "BC connection");

const decode = value => value.replaceAll("&aring;", "å").replaceAll("&auml;", "ä")
  .replaceAll("&ouml;", "ö").replaceAll("&Aring;", "Å")
  .replaceAll("&Auml;", "Ä").replaceAll("&Ouml;", "Ö");
for (const file of ["dashboard.html", "popup.html", "debug.html",
  "technical-report.html", "license-status.html"]) {
  const html = fs.readFileSync(path.join(root, "src/ui", file), "utf8");
  const visible = /<(button|summary|legend|option|th|dt|label|h2|h3|h4)(?:\s[^>]*)?>([^<]+)<\/\1>/gsi;
  for (const match of html.matchAll(visible)) {
    if (match[0].includes("data-i18n")) continue;
    const value = decode(match[2].replace(/\s+/g, " ").trim());
    if (!/[åäöÅÄÖ]|\b(?:Visa|Öppna|Spara|Välj|Använd|Nästa|Tillbaka|Ta bort|Inköp|Lager|Försäljning|Dokument|Licensinformation|Stoppa)\b/u.test(value)) continue;
    assert.notEqual(i18n.translateStaticText(value, "en-US"), value,
      `${file} contains untranslated interface text: ${value}`);
  }
}

console.log("UI localization foundation tests passed.");

// Empty language filters must survive initialization and locale reapplication.
for (const locale of i18n.SUPPORTED_LOCALES) {
  const filter = {
    value: "", options: [],
    dataset: { languageSelect: "document", languageAllLabel: "library.allLanguages" },
    replaceChildren() { this.options = []; },
    appendChild(option) { this.options.push(option); }
  };
  const preference = { ...filter, dataset: { languageSelect: "document" } };
  const target = {
    documentElement: { lang: locale, setAttribute() {} },
    querySelectorAll(selector) {
      return selector === "[data-language-select]" ? [filter, preference] : [];
    },
    createElement() { return {}; }
  };
  i18n.apply(locale, target);
  assert.equal(filter.value, "", `${locale}: opening must show all languages`);
  assert.equal(preference.value, "en-US", "New preferences still default to English");
  assert.equal(filter.options[0].textContent, i18n.translate("library.allLanguages", locale));
  for (const selected of i18n.SUPPORTED_LOCALES) {
    filter.value = selected;
    i18n.apply(locale, target);
    assert.equal(filter.value, selected, "Explicit language filter must survive refresh");
  }
  filter.value = "";
  i18n.apply(locale, target);
  i18n.apply(locale, target);
  assert.equal(filter.value, "", "Reset must remain all languages after refresh");
}

// Exercise the real asynchronous popup handler, including failed saves.
(async () => {
  const handler = popup.slice(popup.indexOf("async function switchUiLocale("),
    popup.indexOf("async function send("));
  for (const locale of i18n.SUPPORTED_LOCALES.filter(value => value !== "en-US")) {
    for (const fails of [false, true]) {
      const controls = { languageSwitch: { disabled: false },
        defaultDocumentLanguage: { disabled: false }, languageSettingsStatus: {} };
      const sandbox = {
        currentUiLocale: "en-US", $: id => controls[id],
        T9LanguageRegistry: context.globalThis.T9LanguageRegistry,
        T9UiI18n: { apply: value => value }, updateLanguageSwitch() {},
        t: key => key, refresh: async () => {},
        send: async message => {
          assert.equal(controls.languageSwitch.disabled, true);
          assert.equal(controls.defaultDocumentLanguage.disabled, true);
          if (fails) throw Error("Save failed");
          return { ok: true, uiLocale: message.uiLocale };
        }
      };
      vm.runInNewContext(handler, sandbox);
      await sandbox.switchUiLocale({ currentTarget: { value: locale } });
      assert.equal(sandbox.currentUiLocale, fails ? "en-US" : locale);
      assert.equal(controls.languageSwitch.disabled, false);
      assert.equal(controls.defaultDocumentLanguage.disabled, false);
      if (fails) assert.equal(controls.languageSettingsStatus.textContent, "Save failed");
    }
  }
  console.log("Popup language changes restore both selectors after success and failure.");
})().catch(error => { console.error(error); process.exitCode = 1; });
