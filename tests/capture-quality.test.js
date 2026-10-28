const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { score } = require("../scripts/capture-quality/score");
const quality = require("../scripts/capture-quality/run");
const importer = require("../scripts/capture-quality/import-recording");
const { replay } = require("../scripts/capture-quality/replay");
const zipWriter = require("../src/exporters/zip-writer");

// Scoring: every produced step is correct, wrong, a duplicate or extra; expected steps
// without a produced step are missing.
const task = (actionCaption, selectedCaption = "", instruction = actionCaption) =>
  ({ actionCaption, fieldCaption: actionCaption, selectedCaption, instruction });
const expected = [{ target: "New" }, { target: "Customer Name", value: "Adatum" },
  { target: "Quantity", value: "5" }, { target: "Post..." }];

const perfect = score(expected, [task("New"), task("Customer Name", "Adatum"),
  task("Quantity", "5"), task("Post…")]);
assert.deepStrictEqual([perfect.correct, perfect.wrong, perfect.duplicates, perfect.extras,
  perfect.missing, perfect.precision, perfect.recall], [4, 0, 0, 0, 0, 1, 1]);

// The duplicates the recorder used to produce: a typed fragment and a repeated field step.
const noisy = score(expected, [task("New"), task("Customer Name", "Ada"),
  task("Customer Name", "Adatum"), task("Customer Name", "Adatum"), task("Enable Quantity"),
  task("Quantity", "5")]);
assert.deepStrictEqual([noisy.correct, noisy.wrong, noisy.duplicates, noisy.extras,
  noisy.missing], [3, 0, 2, 1, 1]);
// Which of two identical steps counts as correct does not matter; the fragment never does.
assert.strictEqual(noisy.steps[1].outcome, "duplicate");
assert.strictEqual(noisy.steps[4].outcome, "extra");
assert.deepStrictEqual(noisy.missingSteps, [{ target: "Post..." }]);

const wrongValue = score(expected.slice(0, 3), [task("New"), task("Customer Name", "Alpine"),
  task("Quantity", "5")]);
assert.deepStrictEqual([wrongValue.correct, wrongValue.wrong, wrongValue.missing], [2, 1, 0]);
// Order matters: a step after its place in the process cannot stand in for it.
const reordered = score([{ target: "Release" }, { target: "Post..." }],
  [task("Post..."), task("Release")]);
assert.strictEqual(reordered.correct, 1);
assert.strictEqual(reordered.missing, 1);
assert.strictEqual(reordered.extras, 1);

// Corpus entries are validated.
assert.throws(() => quality.validate({ schemaVersion: 1, id: "x", events: [] }, "x.json"),
  /expectedSteps is required/u);
assert.throws(() => quality.validate({ schemaVersion: 1, id: "x", events: [],
  expectedSteps: [{ value: "1" }] }, "x.json"), /target is required/u);

// The corpus is no worse than its stored baseline, and the lab recording is perfect.
const result = quality.evaluate();
const { regressions } = quality.compare(result, quality.readBaseline());
assert.deepStrictEqual(regressions, []);
const lab = result.recordings.find(item => item.id === "lab-sales-order-typeahead");
assert.deepStrictEqual([lab.expected, lab.correct, lab.duplicates, lab.extras, lab.missing],
  [10, 10, 0, 0, 0]);
assert(quality.report(result, { verbose: true }).includes("TOTAL"));

// A worse result is reported as a regression.
const worse = { recordings: result.recordings.map(item => item.id === lab.id
  ? { ...item, correct: 9, duplicates: 1 } : item) };
assert.deepStrictEqual(quality.compare(worse, quality.readBaseline()).regressions.sort(),
  [`${lab.id}: correct 10 -> 9`, `${lab.id}: duplicates 0 -> 1`]);

// Import: an exported recording ZIP becomes a draft entry without customer values, URLs or
// company, and pseudonymization does not change which steps the recording produces.
const labEvents = JSON.parse(fs.readFileSync(path.join(__dirname,
  "fixtures/capture-lab/sales-order-typeahead.json"), "utf8")).events;
const exportedEvents = labEvents.map((event, index) => ({ ...event, eventNo: index + 1,
  companyName: "Real Customer Ltd", identification: { stale: true },
  topUrl: "https://businesscentral.dynamics.com/0f0e1d2c-3b4a-5968-7766-554433221100/Production?company=Real%20Customer&page=42&bookmark=abc",
  ...(index === 0 ? { note: "Sent by anna.svensson@example.com" } : {}) }));
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "capture-quality-"));
const zipPath = path.join(dir, "export.zip");
const encode = value => new TextEncoder().encode(JSON.stringify(value));
fs.writeFileSync(zipPath, zipWriter.create([
  { name: "Sales order/session.json", data: encode({ id: "s1", documentLanguage: "sv-SE" }) },
  { name: "Sales order/events.json", data: encode(exportedEvents) }]));
const { entry, pseudonymized } = importer.importRecording(zipPath, { id: "imported" });
fs.rmSync(dir, { recursive: true, force: true });
const text = JSON.stringify(entry.events);
for (const secret of ["Adatum", "PO-1001", "Real Customer", "anna.svensson", "bookmark",
  "0f0e1d2c-3b4a", "tenant-demo"]) {
  assert(!text.includes(secret), `removed: ${secret}`);
}
assert(pseudonymized >= 2);
assert(text.includes("page=42"), "the page number is kept");
assert(entry.events.every(event => !("identification" in event) && !("eventNo" in event)));
assert.strictEqual(entry.documentLanguage, "sv-SE");
assert.strictEqual(entry.reviewed, false);
// Captions, numbers and dates stay; a typed fragment stays a prefix of the chosen value.
for (const caption of ["Customer Name", "External Document No.", "Quantity", "1896-S", "2026-10-27"]) {
  assert(text.includes(caption), `kept: ${caption}`);
}
const chosen = entry.events.find(event => event.type === "field-change" &&
  event.fieldName === "Customer Name" && event.inputSource === "change").value;
const typed = entry.events.filter(event => event.type === "field-change" &&
  event.fieldName === "Customer Name" && event.inputSource === "input").map(event => event.value);
assert(typed.length && typed.every(value => chosen.startsWith(value)), "typed prefixes kept");
assert.notStrictEqual(chosen, "Adatum Corporation");

const original = replay(labEvents, { documentLanguage: "sv-SE" }).tasks;
const sanitized = replay(entry.events, { documentLanguage: "sv-SE" }).tasks;
assert.deepStrictEqual(sanitized.map(item => item.taskType), original.map(item => item.taskType));
assert.strictEqual(entry.expectedSteps.length, original.length);
assert.strictEqual(entry.expectedSteps[1].value, chosen);

console.log(`Capture quality tests passed (${result.recordings.length} corpus recordings, ` +
  `precision ${Math.round(result.totals.precision * 100)}%, recall ${Math.round(result.totals.recall * 100)}%).`);
