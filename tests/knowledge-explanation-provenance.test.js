const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

// Renders the Review knowledge-explanation panel from dashboard.js in isolation.
const dashboard = fs.readFileSync(path.join(__dirname, "../src/ui/dashboard.js"), "utf8");
function slice(startMarker, endMarker) {
  const start = dashboard.indexOf(startMarker);
  const end = dashboard.indexOf(endMarker, start);
  assert(start >= 0 && end > start, `${startMarker} must exist in dashboard.js`);
  return dashboard.slice(start, end);
}
const source = [
  slice("function escapeHtml(value) {", "\n}\n") + "\n}\n",
  slice("const KNOWLEDGE_EXPLANATION_TEXT = {", "function updateInstructionPreview(")
].join("\n");
const registry = require("../src/engine/language-registry");
const context = { language: "en-US" };
context.activeDocumentLanguage = () => context.language;
vm.createContext(context);
vm.runInContext(`${source}\nthis.render = knowledgeExplanationMarkup;`, context);

const locales = registry.supported("document").map(item => item.locale);
const explanations = Object.fromEntries(locales.map(locale => [locale, `Explanation ${locale}`]));
const vendorTask = { contextualExplanationRuleId: "AptWeighScale.GetWeight",
  contextualExplanationBasis: "vendor-documentation", contextualExplanations: explanations,
  contextualExplanationSources: [{ sourceId: "aptean-wsc-registration-2026",
    title: "Aptean Weigh Scale — Weigh scale registration",
    sourceUri: "https://erpdocs.apteancloud.com/bc/docs/WSC/weigh-scale-registration/" }] };
const notes = new Set();
for (const locale of locales) {
  context.language = locale;
  const html = context.render(vendorTask);
  assert.ok(html.includes(`Explanation ${locale}`), `${locale} shows the vendor-documented explanation`);
  const note = html.match(/class="review-knowledge-basis">([^<]+)</u)?.[1];
  assert.ok(note && /Microsoft Learn/u.test(note), `${locale} states that it is not Microsoft Learn`);
  notes.add(note);
  assert.ok(html.includes('href="https://erpdocs.apteancloud.com/bc/docs/WSC/weigh-scale-registration/"'),
    `${locale} links the Aptean article`);
}
assert.equal(notes.size, locales.length, "the provenance note is translated for every language");

context.language = "sv-SE";
const observed = context.render({ ...vendorTask, contextualExplanationRuleId: "Observed.Warehouse.RegisterWeight",
  contextualExplanationBasis: "observed-workflow" });
assert.match(observed, /Grundad på det inspelade arbetsflödet; inte Microsoft Learn\./u);

const untrusted = context.render({ ...vendorTask, contextualExplanationBasis: "microsoft-learn",
  contextualExplanationSources: [{ title: "Blog", sourceUri: "https://example.com/post" }] });
assert.equal(untrusted, "", "an explanation without an official source is not shown");

const edited = context.render({ ...vendorTask, contextualExplanationOverrides: { "sv-SE": "Egen text" } });
assert.ok(edited.includes("Egen text") && !edited.includes("review-knowledge-basis"),
  "a user-edited explanation is not labelled with the generated text's provenance");

console.log("Knowledge explanation provenance tests passed.");
