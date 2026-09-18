const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const registrySource = fs.readFileSync(path.join(root,
  "src/engine/language-registry.js"), "utf8");
const source = fs.readFileSync(path.join(root, "src/ui/i18n.js"), "utf8");
const context = { globalThis: {}, CustomEvent: class CustomEvent {} };
vm.runInNewContext(registrySource, context);
vm.runInNewContext(source, context);
const i18n = context.globalThis.T9UiI18n;

assert.deepStrictEqual([...i18n.SUPPORTED_LOCALES], ["sv-SE", "en-US"]);
assert.equal(i18n.normalizeLocale(), "sv-SE");
assert.equal(i18n.normalizeLocale("en-GB"), "en-US");
assert.equal(i18n.normalizeLocale("sv"), "sv-SE");
assert.equal(i18n.normalizeLocale("da-DK"), "sv-SE");
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
assert.match(dashboard, /uiLocale: "sv-SE"/);
assert.match(dashboard, /documentLanguage: "sv-SE"/);
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
assert.match(popup, /function switchUiLocale\(\)/);
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
