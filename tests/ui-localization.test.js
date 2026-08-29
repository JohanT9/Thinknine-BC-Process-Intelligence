const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "src/ui/i18n.js"), "utf8");
const context = { globalThis: {}, CustomEvent: class CustomEvent {} };
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
const build = fs.readFileSync(path.join(root, "scripts/build.js"), "utf8");

assert.match(dashboardHtml, /id="uiLocale"[\s\S]*value="sv-SE"[\s\S]*value="en-US"/);
assert.match(dashboardHtml, /<script src="i18n\.js"><\/script>/);
assert.match(popupHtml, /<script src="i18n\.js"><\/script>/);
assert.match(dashboard, /uiLocale: "sv-SE"/);
assert.match(dashboard, /T9UiI18n\.apply\(settings\.uiLocale\)/);
assert.match(dashboard, /T9UiI18n\.observe/);
assert.match(dashboard, /uiTf\("document\.page"/);
assert.match(dashboard, /type: "T9_SAVE_UI_LOCALE", uiLocale/);
assert.match(popup, /T9_GET_SETTINGS/);
assert.match(popup, /T9UiI18n\.observe/);
assert.match(source, /#documentWorkspace, #reviewList, #annotationStage/);
assert.match(background, /uiLocale: "sv-SE"/);
assert.match(background, /case "T9_SAVE_UI_LOCALE"/);
assert.match(build, /"i18n\.js"/);
assert.match(debugHtml, /<script src="i18n\.js"><\/script>/);
assert.match(debug, /T9_GET_SETTINGS/);
assert.match(technicalHtml, /<script src="i18n\.js"><\/script>/);
assert.match(technical, /technical\.reportCopied/);
assert.match(dashboard, /uiTf\("a11y\.editInstruction"/);
assert.equal(i18n.translateStaticText("Anslutning till BC", "en-US"),
  "BC connection");

console.log("UI localization foundation tests passed.");
