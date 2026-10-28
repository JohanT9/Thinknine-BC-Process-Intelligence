const assert = require("assert");
const fs = require("fs");
const path = require("path");

// Client controls that are not business steps. Only observed captions are listed; the other
// registered languages are documented gaps rather than guessed translations.
const captions = require("../src/engine/bc-client-captions");
const locales = require("../src/engine/language-registry").supported("document")
  .map(item => item.locale);

for (const [caption, category] of [["Stäng", "close"], ["Close", "close"], ["Dismiss", "close"],
  ["Rulla åt höger", "scroll"], ["Scroll to the left", "scroll"], ["Visa resten", "display"],
  ["Show less", "display"], ["Tillbaka", "history"], ["Forward", "history"],
  ["Berätta vad du vill göra", "tellMe"], ["Tell me what you want to do", "tellMe"],
  ["Värdet i det här fältet är obligatoriskt", "fieldHint"],
  ["Press Alt+I to get a suggestion for this field", "fieldHint"]]) {
  assert(captions.matches(category, caption), `${category}: ${caption}`);
}
for (const caption of ["Release", "Post...", "Statistics", "Close Order", "Show Document", ""]) {
  assert(!Object.keys(captions.CAPTIONS).some(category => captions.matches(category, caption)),
    `not a client control: ${caption}`);
}

// Every category has Swedish and English captions; the documented gaps match the catalog.
for (const [category, byLocale] of Object.entries(captions.CAPTIONS)) {
  assert(byLocale["sv-SE"]?.length && byLocale["en-US"]?.length, category);
}
const doc = fs.readFileSync(path.join(__dirname, "../docs/EVENT_STEP_GROUPING.md"), "utf8");
const gaps = captions.gaps(locales);
const gapLocales = [...new Set(gaps.map(gap => gap.locale))];
const gapCategories = [...new Set(gaps.map(gap => gap.category))];
for (const value of [...gapLocales, ...gapCategories]) {
  assert(doc.includes(value), `documented gap: ${value}`);
}

// The engines use the shared catalog instead of their own caption lists.
for (const file of ["src/engine/event-step-grouping.js", "src/engine/event-normalization.js",
  "src/engine/noise-filter.js", "src/document/semantic-interaction-engine.js"]) {
  const source = fs.readFileSync(path.join(__dirname, "..", file), "utf8");
  assert(source.includes("bc-client-captions"), file);
  assert(!/berätta vad du vill göra|visa resten|rulla\|scroll/iu.test(source), `${file} keeps no own list`);
}
const background = fs.readFileSync(path.join(__dirname, "../src/recorder/background.js"), "utf8");
assert(background.indexOf('"engine/bc-client-captions.js"') <
  background.indexOf('"engine/event-normalization.js"'));
const dashboard = fs.readFileSync(path.join(__dirname, "../src/ui/dashboard.html"), "utf8");
assert(dashboard.indexOf("engine/bc-client-captions.js") < dashboard.indexOf("engine/noise-filter.js"));

console.log("Business Central client caption tests passed.");
