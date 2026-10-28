const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

// Dark is the default appearance; light and system are explicit choices shared by every page.
const read = file => fs.readFileSync(path.join(__dirname, "..", file), "utf8");

// appearance.js: default dark, explicit light, system follows the operating system.
function runAppearance(stored) {
  const attributes = {};
  const storage = new Map(stored ? [["t9.appearance", stored]] : []);
  const context = {
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
    document: { documentElement: {
      setAttribute: (name, value) => { attributes[name] = value; },
      removeAttribute: name => { delete attributes[name]; } } },
    addEventListener() {}
  };
  context.globalThis = context;
  vm.runInNewContext(read("src/ui/appearance.js"), context);
  return { attributes, storage, appearance: context.T9Appearance };
}
assert.strictEqual(runAppearance().attributes["data-theme"], "dark", "a new installation is dark");
assert.strictEqual(runAppearance("light").attributes["data-theme"], "light");
assert.strictEqual(runAppearance("system").attributes["data-theme"], undefined,
  "system leaves the theme to prefers-color-scheme");
assert.strictEqual(runAppearance("unknown").attributes["data-theme"], "dark");
const changed = runAppearance();
changed.appearance.set("system");
assert.strictEqual(changed.storage.get("t9.appearance"), "system");
assert.strictEqual(changed.attributes["data-theme"], undefined);

// Every page applies the appearance before painting and loads the colour variables.
const pages = ["dashboard", "popup", "technical-report", "license-status", "knowledge-admin", "debug"];
for (const page of pages) {
  const html = read(`src/ui/${page}.html`);
  assert.match(html, /<meta charset="utf-8">\s*<script src="appearance\.js"><\/script>\s*<link rel="stylesheet" href="theme\.css">/u,
    `${page}.html applies the appearance first`);
}
const build = read("scripts/build.js");
assert.ok(build.includes('"theme.css"') && build.includes('"appearance.js"'), "the build ships both files");

// No literal colours remain in page styles, except the document paper that matches Word.
const PAPER = /document-workspace-(page|section|metadata|paragraph|image|heading|callout|step-title)|forced-colors/u;
const theme = read("src/ui/theme.css");
const lightBlock = theme.slice(theme.indexOf(":root {"), theme.indexOf(':root[data-theme="dark"]'));
const darkBlock = theme.slice(theme.indexOf(':root[data-theme="dark"]'), theme.indexOf("@media"));
const systemBlock = theme.slice(theme.indexOf("@media (prefers-color-scheme: dark)"));
assert.match(darkBlock, /color-scheme: dark;/u);
assert.match(systemBlock, /:root:not\(\[data-theme\]\) \{\s+color-scheme: dark;/u);
const styles = pages.map(page => [...read(`src/ui/${page}.html`).matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gu)]
  .map(match => match[1]).join("\n")).join("\n") + read("src/ui/design-system.css");
const literal = [];
for (const [, selector, declarations] of styles.matchAll(/([^{}]+)\{([^{}]*)\}/gu)) {
  if (PAPER.test(selector)) continue;
  for (const [declaration] of declarations.matchAll(/(?:^|;)\s*(?!--)[-\w]+\s*:[^;]*#[0-9a-fA-F]{3,6}\b[^;]*/gu)) {
    literal.push(`${selector.trim().slice(0, 60)} { ${declaration.trim().slice(0, 80)} }`);
  }
}
assert.deepStrictEqual(literal, [], "page colours use theme variables");
for (const [, name] of styles.matchAll(/var\((--c-[a-z]+-[0-9a-f]{6})\)/gu)) {
  assert.ok(lightBlock.includes(`${name}:`) && darkBlock.includes(`${name}:`) && systemBlock.includes(`${name}:`),
    `${name} has light and dark values`);
}

// White text on the dark theme's brand colour keeps at least 4.5:1 contrast.
const luminance = hex => {
  const [r, g, b] = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(c => c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const brand = darkBlock.match(/--colorBrandPrimary: #([0-9a-f]{6});/u)[1];
assert.match(darkBlock, /--colorTextOnBrand: #ffffff;/u);
assert.ok((1.05) / (luminance(brand) + 0.05) >= 4.5, "white on the dark brand colour is readable");

// The setting offers dark, system and light in every interface language.
const dashboard = read("src/ui/dashboard.html");
assert.match(dashboard, /<fieldset id="appearance" class="settings-segmented" aria-describedby="appearanceHelp">\s*<legend data-i18n="settings\.appearance">Utseende<\/legend>\s*<div class="settings-segmented-options">\s*<label><input type="radio" name="appearance" value="dark"> <span data-i18n="settings\.appearanceDark">Mörkt<\/span><\/label>\s*<label><input type="radio" name="appearance" value="system"> <span data-i18n="settings\.appearanceSystem">Följ systemet<\/span><\/label>\s*<label><input type="radio" name="appearance" value="light"> <span data-i18n="settings\.appearanceLight">Ljust<\/span><\/label>/u);
globalThis.T9LanguageRegistry = require("../src/engine/language-registry");
globalThis.T9LocaleCatalogs = require("../src/engine/locale-catalogs");
require("../src/ui/i18n");
const locales = globalThis.T9LanguageRegistry.supported("ui").map(item => item.locale);
for (const key of ["settings.appearance", "settings.appearanceDark", "settings.appearanceSystem",
  "settings.appearanceLight", "settings.appearanceHelp"]) {
  for (const locale of locales) {
    assert.notStrictEqual(globalThis.T9UiI18n.translate(key, locale), key, `${key} in ${locale}`);
  }
}

console.log("Appearance and theme tests passed.");
