// Which steps of a test a recording shows as done: the same kind of action on the same page
// and field or button, in order, with values free to differ.
const assert = require("assert");
const matcher = require("../src/document/test-recording-match");

const task = (taskType, pageObjectId, fieldId, extra = {}) => ({ taskType, pageObjectId,
  knowledgeObjectRef: { objectId: pageObjectId }, knowledgeControlRef: { fieldId },
  pageCaption: extra.pageCaption || "", fieldCaption: extra.fieldCaption || "",
  actionCaption: extra.actionCaption || "", ...extra });
const documented = [
  task("SearchAndOpenPage", "9307", "", { actionCaption: "Inköpsorder" }),
  task("CreateRecord", "50", "Control-New", { actionCaption: "Ny" }),
  task("FillField", "50", "Field-Buy-from Vendor No.", { fieldCaption: "Leverantörsnr" }),
  task("FillField", "54", "Field-Quantity", { fieldCaption: "Antal" }),
  task("RunAction", "50", "Control-Post", { actionCaption: "Bokför" })
];
const steps = documented.map((value, index) => ({ stepId: `block:step:${index + 1}`,
  signature: matcher.signature(value) }));

// The same process with other values, and in English: ids decide, so captions may differ.
const english = [
  task("SearchAndOpenPage", "9307", "", { actionCaption: "Purchase Orders" }),
  task("CreateRecord", "50", "Control-New", { actionCaption: "New" }),
  task("FillField", "50", "Field-Buy-from Vendor No.", { fieldCaption: "Vendor No.", value: "20000" }),
  task("FillField", "54", "Field-Quantity", { fieldCaption: "Quantity", value: "7" }),
  task("RunAction", "50", "Control-Post", { actionCaption: "Post" })
];
let result = matcher.match(steps, english);
assert.deepStrictEqual(result.steps.map(step => step.state),
  ["done", "done", "done", "done", "done"],
  "opening the same page is the same step, whatever was typed to find it");
assert.deepStrictEqual(result.steps.map(step => step.taskIndex), [0, 1, 2, 3, 4]);
assert.strictEqual(result.steps[0].score, 0.94);
assert.ok(result.steps.slice(1).every(step => step.score === 1));
assert.deepStrictEqual(result.additional, []);

// A skipped step is not found; a detour is additional; order is kept.
const detour = [english[1], task("FillField", "50", "Field-Posting Date", { fieldCaption: "Posting Date" }),
  english[2], english[4]];
result = matcher.match(steps, detour);
assert.deepStrictEqual(result.steps.map(step => step.state),
  ["not-found", "done", "done", "not-found", "done"]);
assert.deepStrictEqual(result.additional, [1]);

// Steps done in another order: the pairing keeps the order, so the best in-order pairing wins.
result = matcher.match(steps.slice(1, 4), [english[3], english[1], english[2]]);
assert.deepStrictEqual(result.steps.map(step => step.state), ["done", "done", "not-found"]);

// A repeated action is paired once; a recorded step counts for one test step only.
result = matcher.match([steps[2], steps[2]], [english[2]]);
assert.deepStrictEqual(result.steps.map(step => step.state), ["done", "not-found"]);

// Without ids, captions decide, and a page that differs rules a pair out.
const byCaption = value => ({ taskType: value.taskType, pageCaption: value.page, fieldCaption: value.field });
const captionStep = { stepId: "s", signature: matcher.signature(byCaption({ taskType: "FillField",
  page: "Inköpsorder", field: "Antal" })) };
assert.strictEqual(matcher.match([captionStep], [byCaption({ taskType: "FillField", page: " inköpsorder ",
  field: "ANTAL" })]).steps[0].state, "done", "captions are compared without case and spacing");
assert.strictEqual(matcher.match([captionStep], [byCaption({ taskType: "FillField", page: "Försäljningsorder",
  field: "Antal" })]).steps[0].state, "not-found");
// The same field on the same page interpreted as another kind of action is still the step,
// with a lower score; with neither page nor control known it is not enough.
assert.strictEqual(matcher.match([captionStep], [byCaption({ taskType: "SelectOption", page: "Inköpsorder",
  field: "Antal" })]).steps[0].score, 0.68, "another kind of action on the same field and page");
assert.strictEqual(matcher.match([{ stepId: "s", signature: matcher.signature({ taskType: "FillField",
  fieldCaption: "Antal" }) }], [{ taskType: "SelectOption", fieldCaption: "Antal" }]).steps[0].state,
  "not-found", "another kind of action on a field without a known page");
assert.strictEqual(matcher.score(matcher.signature(task("RunAction", "99000831", "Control-Change Status")),
  matcher.signature(task("ChangeProductionOrderStatus", "99000831", "Control-Change Status"))), 0.75,
  "the same button on the same page, interpreted more precisely");

// A step made before signatures were kept cannot be compared and says so.
result = matcher.match([{ stepId: "old" }], english);
assert.deepStrictEqual(result.steps, [{ stepId: "old", state: "unknown" }]);
assert.deepStrictEqual(matcher.match([], []), { steps: [], additional: [] });

// Larger inputs stay quick: 200 steps against 400 recorded steps.
const many = Array.from({ length: 400 }, (_, index) => task("FillField", "50", `Field-${index % 37}`));
const started = Date.now();
matcher.match(Array.from({ length: 200 }, (_, index) => ({ stepId: `s${index}`,
  signature: matcher.signature(many[index * 2]) })), many);
assert.ok(Date.now() - started < 1000);
console.log("Test recording match tests passed.");

// A test made from a document keeps each step's signature, so a later recording can be
// compared with it; a step without one is kept as before.
const script = require("../src/document/test-script");
const documentWith = interactions => ({ metadata: { title: "Inköp", documentLanguage: "sv-SE" },
  sections: [{ kind: "workflow", blocks: interactions.map((interaction, index) => ({ kind: "step",
    blockId: `block:step:${index + 1}`, interaction, blocks: [{ kind: "paragraph",
      blockId: `block:instruction:${index + 1}`, text: `Steg ${index + 1}` }] })) }] });
const created = script.create(documentWith([documented[2], { taskType: "Unclassified" }]),
  { testRunId: "run", sessionId: "rec" });
assert.deepStrictEqual(created.steps[0].signature, matcher.signature(documented[2]));
assert.ok(!("signature" in created.steps[1]), "a step that cannot be compared has no signature");
const again = script.rerun(script.normalize(created), { testRunId: "run-2" });
assert.deepStrictEqual(again.steps[0].signature, created.steps[0].signature, "a new run keeps it");
assert.deepStrictEqual(matcher.match(again.steps, english).steps.map(step => step.state),
  ["done", "unknown"]);
console.log("Test recording match: signatures in test runs passed.");

// What the run keeps: a suggestion per step, with what was recorded for a step found in the
// recording. It never sets a result; approving the suggested steps passes only steps without
// one. A new run starts without suggestions.
const NOW = "2026-11-10T10:00:00.000Z";
const timed = english.map((value, index) => ({ ...value, instruction: `Recorded ${index + 1}`,
  at: `2026-11-10T09:0${index}:00.000Z` }));
const check = matcher.check(created.steps, [timed[2], task("FillField", "50", "Field-Posting Date",
  { instruction: "Set Posting Date" })]);
assert.deepStrictEqual(check, { recordedSteps: 2, steps: [{ stepId: "block:step:1", state: "done",
  taskIndex: 0, score: 1, instruction: "Recorded 3", at: "2026-11-10T09:02:00.000Z" },
  { stepId: "block:step:2", state: "unknown" }], additional: ["Set Posting Date"],
  recorded: [{ instruction: "Recorded 3", stepId: "block:step:1" },
    { instruction: "Set Posting Date", stepId: "" }] });
let checked = script.applyRecordingCheck(created, check, NOW);
assert.deepStrictEqual(checked.steps[0].recordingSuggestion, { state: "done",
  instruction: "Recorded 3", at: "2026-11-10T09:02:00.000Z" });
assert.deepStrictEqual(checked.steps[1].recordingSuggestion, { state: "unknown" });
assert.deepStrictEqual(checked.recordingCheck, { checkedAt: NOW, recordedSteps: 2,
  additional: ["Set Posting Date"], recorded: check.recorded });
assert.ok(checked.steps.every(step => step.status === "not-run"), "a suggestion is not a result");
assert.deepStrictEqual(script.suggestedPasses(checked), ["block:step:1"]);
const decided = script.updateStep(checked, "block:step:1", { status: "failed" }, NOW);
assert.deepStrictEqual(script.suggestedPasses(decided), [], "the tester's own result is kept");
// A later check replaces the earlier one, step by step.
checked = script.applyRecordingCheck(checked, { steps: [{ stepId: "block:step:1", state: "not-found" }] }, NOW);
assert.deepStrictEqual(checked.steps[0].recordingSuggestion, { state: "not-found" });
assert.ok(!("recordingSuggestion" in checked.steps[1]));
assert.deepStrictEqual(script.suggestedPasses(checked), []);
// A failed comparison keeps the recording's id and the earlier suggestions.
const failed = script.recordingCheckFailed(checked, "rec-test", NOW);
assert.deepStrictEqual(failed.recordingCheck, { checkedAt: NOW, recordedSteps: 0, additional: [],
  recorded: [], failed: true, recordingId: "rec-test", failedAt: NOW });
assert.deepStrictEqual(failed.steps[0].recordingSuggestion, { state: "not-found" });
const next = script.rerun(failed, { testRunId: "run-3", now: NOW });
assert.ok(!("recordingCheck" in next) && next.steps.every(step => !("recordingSuggestion" in step)),
  "a new run starts without the earlier recording's suggestions");
assert.deepStrictEqual(next.steps[0].signature, created.steps[0].signature);
// A step after which Business Central showed an error is suggested as failed, with the
// message as Business Central wrote it; it is not among the steps to approve, and failing it
// adds the message to the tester's comment once.
const failedCheck = matcher.check(created.steps, [{ ...timed[2], failed: true,
  error: "Leverantören 20000 är spärrad." }]);
assert.deepStrictEqual(failedCheck.steps[0], { stepId: "block:step:1", state: "failed", taskIndex: 0,
  score: 1, instruction: "Recorded 3", at: "2026-11-10T09:02:00.000Z", error: "Leverantören 20000 är spärrad." });
assert.deepStrictEqual(failedCheck.recorded, [{ instruction: "Recorded 3", stepId: "block:step:1",
  failed: true, error: "Leverantören 20000 är spärrad." }]);
let withError = script.applyRecordingCheck(created, failedCheck, NOW);
assert.deepStrictEqual(withError.steps[0].recordingSuggestion, { state: "failed",
  instruction: "Recorded 3", at: "2026-11-10T09:02:00.000Z", error: "Leverantören 20000 är spärrad." });
assert.strictEqual(withError.steps[0].status, "not-run", "an error is a suggestion, not a result");
assert.deepStrictEqual(script.suggestedPasses(withError), [], "a step with an error is not approved with the rest");
assert.deepStrictEqual(script.failureFromSuggestion(withError.steps[0]),
  { status: "failed", comment: "Leverantören 20000 är spärrad." });
withError = script.updateStep(withError, "block:step:1", { comment: "Spärrad." }, NOW);
assert.deepStrictEqual(script.failureFromSuggestion(withError.steps[0]),
  { status: "failed", comment: "Spärrad.\nLeverantören 20000 är spärrad." });
withError = script.updateStep(withError, "block:step:1", script.failureFromSuggestion(withError.steps[0]), NOW);
assert.strictEqual(script.failureFromSuggestion(withError.steps[0]).comment, withError.steps[0].comment,
  "the message is added only once");
// A screenshot from a recording says so; the tester's own do not.
let shot = script.addScreenshot(created, "block:step:1", { screenshotId: "shot-rec", capturedAt: NOW,
  source: "recording" }, NOW);
shot = script.addScreenshot(shot, "block:step:1", { screenshotId: "shot-own", capturedAt: NOW, source: "other" }, NOW);
assert.deepStrictEqual(script.normalize(shot).steps[0].screenshots, [
  { screenshotId: "shot-rec", capturedAt: NOW, source: "recording" }, { screenshotId: "shot-own", capturedAt: NOW }]);
console.log("Test recording match: suggestions in test runs passed.");

// The whole way, with events captured by the real content script: the recording is
// interpreted, made into a document and a test, and a later recording of the same process
// with other values, interpreted in another document language, is compared with the test.
const fs = require("fs");
const path = require("path");
const readJson = file => JSON.parse(fs.readFileSync(path.join(__dirname, "..", file), "utf8"));
const canonical = require("../src/engine/canonical-recording");
const identify = require("../src/engine/bc-ui-identification");
const normalization = require("../src/engine/event-normalization");
const grouping = require("../src/engine/event-step-grouping");
const pipeline = require("../src/engine/session-interpretation-pipeline");
const projector = require("../src/document/review-document-projector");
const knowledgePacks = readJson("src/knowledge-packs/index.json").packs.filter(pack => pack.enabled)
  .map(pack => readJson(`src/${pack.file}`));
function interpreted(events, locale) {
  let recording = canonical.create({ id: "lab", name: "Lab" });
  const sourceEvents = [];
  events.forEach((raw, index) => {
    recording = canonical.addEvent(recording, raw, identify.identify(raw, { eventId: `lab:event:${index}` }));
    sourceEvents.push({ ...raw, eventNo: index + 1, canonicalSourceEventId: recording.events.at(-1).id });
  });
  const normalized = normalization.normalizeRecording(recording);
  const grouped = grouping.group(normalized);
  return pipeline.interpret({ session: { id: "lab", name: "Lab", settings: { documentLanguage: locale } },
    events: sourceEvents, normalizedEvents: normalized.events, stepGroups: grouped.groups,
    supportingEvents: grouped.supportingEvents, groupingDiagnostics: grouped.diagnostics,
    imagePaths: {}, knowledgePacks }).businessTasks;
}
const labEvents = readJson("tests/fixtures/capture-lab/sales-order-typeahead.json").events;
const documentedTasks = interpreted(labEvents, "sv-SE");
const labDocument = projector.project({ sessionId: "lab", sessionName: "Lab", tasks: documentedTasks },
  { session: { id: "lab", settings: { documentLanguage: "sv-SE" } } }).document;
const labRun = script.create(labDocument, { testRunId: "lab-run", sessionId: "lab" });
assert.ok(labRun.steps.length >= 8 && labRun.steps.every(step => step.signature),
  "every step of the recorded process can be compared");
const retested = interpreted(labEvents.map(event => typeof event.value === "string" && event.value
  ? { ...event, value: `${event.value}9` } : event), "en-US");
let labCheck = matcher.check(labRun.steps, retested);
assert.ok(labCheck.steps.every(step => step.state === "done"), "the same process with other values");
assert.deepStrictEqual(labCheck.additional, []);
// A step left out of the test session is not found; the others still are.
labCheck = matcher.check(labRun.steps, retested.filter((_, index) => index !== 2));
assert.deepStrictEqual(labCheck.steps.map(step => step.state).filter(state => state !== "done"), ["not-found"]);
assert.strictEqual(labCheck.steps[2].state, "not-found");
console.log("Test recording match: captured process passed.");
// The recorded instruction is kept as plain text, without the document's marks.
assert.strictEqual(matcher.check(created.steps, [{ ...documented[2],
  instruction: "Ange __20000__ i **Leverantörsnr**." }]).steps[0].instruction, "Ange 20000 i Leverantörsnr.");

// A Business Central error captured after a recorded action belongs to that action: the
// step it was paired with is suggested as failed. The background reads the message from the
// error evidence the event names (testRecordingErrors).
const withBcError = labEvents.slice();
const postClick = withBcError[38];
withBcError.splice(39, 0, { type: "bc-error", category: "diagnostic", label: "Business Central error",
  errorEvidenceId: "err-1", interactionId: postClick.interactionId, timestamp: postClick.timestamp,
  frameId: postClick.frameId });
const erroredTasks = interpreted(withBcError, "sv-SE");
const erroredIndex = erroredTasks.findIndex(item => item.resultVerification?.status === "error");
assert.strictEqual(erroredIndex, erroredTasks.length - 1, "the error belongs to the posting step");
const errorEvent = erroredTasks[erroredIndex].resultVerification.outcomes
  .find(item => item.kind === "error-outcome").sourceEventIds;
assert.deepStrictEqual(errorEvent.length, 1);
const markedTasks = erroredTasks.map((item, index) => index === erroredIndex
  ? { ...item, failed: true, error: "Det finns inget att bokföra." } : item);
labCheck = matcher.check(labRun.steps, markedTasks);
assert.deepStrictEqual(labCheck.steps.map(step => step.state),
  [...Array(labRun.steps.length - 1).fill("done"), "failed"]);
assert.strictEqual(labCheck.steps.at(-1).error, "Det finns inget att bokföra.");
console.log("Test recording match: Business Central errors passed.");

// The same record chosen another way. In the captured process the customer is chosen by name;
// in the test it is chosen by number, in another field. That is the same step.
const byNumber = interpreted(JSON.parse(JSON.stringify(labEvents).split("Customer Name")
  .join("Customer No.").split("Adatum Corporation").join("10000")), "sv-SE");
assert.strictEqual(byNumber[1].fieldCaption, "Customer No.");
labCheck = matcher.check(labRun.steps, byNumber);
assert.ok(labCheck.steps.every(step => step.state === "done"), "customer chosen by number instead of name");
assert.strictEqual(labCheck.steps[1].score, 0.87);

// Choosing a record: the kind of record decides, not the field it was typed in.
const vendorBy = (taskType, controlId, fieldCaption) => ({ taskType, pageObjectId: "50",
  knowledgeControlRef: { controlId }, fieldCaption, actionCaption: fieldCaption });
const vendorStep = [{ stepId: "v", signature: matcher.signature(vendorBy("SelectVendor",
  "Control-Buy-from Vendor No.", "Leverantörsnr.")) }];
assert.strictEqual(matcher.match(vendorStep, [vendorBy("SelectVendor", "Control-Buy-from Vendor Name",
  "Leverantörsnamn")]).steps[0].score, 0.91, "vendor by name instead of number");
assert.strictEqual(matcher.match(vendorStep, [vendorBy("SelectItem", "Control-No.", "Nr")]).steps[0].state,
  "not-found", "an item is not a vendor");
assert.strictEqual(matcher.match(vendorStep, [vendorBy("SelectVendor", "Control-x", "Leverantörsnamn")
  ].map(item => ({ ...item, pageObjectId: "51" }))).steps[0].state, "not-found", "on another page");
// The same field family without a known kind: number and name of the same thing, in every
// language's way of writing it; other fields are not of the family.
for (const [a, b] of [["Vendor No.", "Vendor Name"], ["Buy-from Vendor No.", "Buy-from Vendor Name"],
  ["Leverantörsnr.", "Leverantörsnamn"], ["Leverantörsnr.", "Leverantör"], ["Kreditorennr.", "Kreditorenname"],
  ["Kreditornr.", "Kreditornavn"], ["Leverandørnr.", "Leverandørnavn"], ["Toimittajan nro", "Toimittajan nimi"],
  ["N° fournisseur", "Nom fournisseur"], ["N.º de proveedor", "Nombre del proveedor"]]) {
  const field = caption => ({ taskType: "EnterFieldValue", pageObjectId: "50", fieldCaption: caption });
  assert.strictEqual(matcher.match([{ stepId: "f", signature: matcher.signature(field(a)) }],
    [field(b)]).steps[0].score, 0.88, `${a} / ${b}`);
}
for (const [a, b] of [["Document No.", "Posting Date"], ["No.", "Name"], ["Buy-from Vendor No.",
  "Pay-to Vendor No."], ["Quantity", "Unit Price"], ["Description", "Description 2"]]) {
  const field = caption => ({ taskType: "EnterFieldValue", pageObjectId: "50", fieldCaption: caption });
  assert.strictEqual(matcher.match([{ stepId: "f", signature: matcher.signature(field(a)) }],
    [field(b)]).steps[0].state, "not-found", `${a} / ${b}`);
}
console.log("Test recording match: records chosen another way passed.");
