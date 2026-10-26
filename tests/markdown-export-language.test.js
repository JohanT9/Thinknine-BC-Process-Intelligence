const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const dashboard = fs.readFileSync(path.join(__dirname, "../src/ui/dashboard.js"), "utf8");
function slice(startMarker, endMarker) {
  const start = dashboard.indexOf(startMarker);
  const end = dashboard.indexOf(endMarker, start);
  assert(start >= 0 && end > start, `${startMarker} must exist in dashboard.js`);
  return dashboard.slice(start, end);
}
const source = [
  slice("const PROFILE_TEXT = {", "function applyProfile("),
  slice("const MARKDOWN_TEXT = {", "function createDiagnostics(")
].join("\n");

const registry = require("../src/engine/language-registry");
const documentLanguage = require("../src/document/document-language");
const context = {
  globalThis: { T9LanguageRegistry: registry, T9DocumentLanguage: documentLanguage },
  DEFAULTS: { defaultExpectedResult: "Stegen beskriver det observerade arbetsflödet. " +
    "Kontrollera dokumentets status och bekräfta om processen kräver bokföring i Business Central." },
  loadedKnowledgePacks: [], APP_VERSION: "test"
};
vm.createContext(context);
vm.runInContext(`${source}\nthis.render = createTaskDocumentationMarkdown;`, context);

const swedishSystemText = /Förutsättningar|Arbetsgång|Förväntat resultat|Genererad av|Kontrollera dokumentets status/u;
for (const { locale } of registry.supported("document")) {
  const markdown = context.render({ name: "Order <1033>", purpose: "Kundens eget syfte.",
    settings: { documentLanguage: locale, documentationProfile: "customer" } },
  [{ taskNo: 1, instruction: "Välj **1033** i **Kundnr**.", screenshot: "s.png" }], 87);
  assert.ok(markdown.startsWith("# Order <1033>"), `${locale} keeps the session name`);
  assert.ok(markdown.includes("Kundens eget syfte."), `${locale} keeps user-authored purpose`);
  assert.ok(markdown.includes("1033") && markdown.includes("Kundnr"),
    `${locale} preserves captured values and labels`);
  assert.ok(markdown.includes("**87 %**"));
  if (locale !== "sv-SE") {
    assert.doesNotMatch(markdown, swedishSystemText, `${locale} has no Swedish system text`);
  } else {
    assert.match(markdown, /## Förutsättningar/u);
    assert.match(markdown, /Kundspecifik manual/u);
  }
}
const english = context.render({ name: "N", settings: { documentLanguage: "en-US" } }, [], 0);
assert.match(english, /## Purpose\n\nNot specified/u);
assert.match(english, /No documentable business tasks could be identified\./u);
assert.match(english, /Generic manual/u, "the generic profile is the default");
assert.ok(!dashboard.includes("function createDocumentationMarkdown("),
  "the unused Swedish-only Markdown generator stays removed");

console.log("Markdown export language tests passed.");
