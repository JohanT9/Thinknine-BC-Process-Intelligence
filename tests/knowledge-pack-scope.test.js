const assert = require("assert");
const fs = require("fs");
const path = require("path");

// Packs for third-party apps apply only to what the app adds. A rule must not take over a
// standard Business Central page through a standard action such as New or Post, because the
// recording does not show that the app is installed.
const read = file => JSON.parse(fs.readFileSync(path.join(__dirname, "..", file), "utf8"));
const knowledge = require("../src/engine/knowledge-domain");
const manifest = read("src/knowledge-packs/index.json");
const packs = manifest.packs.map(entry => ({ ...entry, pack: read(`src/${entry.file}`) }));
const THIRD_PARTY = /^aptean-/u;
const standardPages = new Set(packs.filter(entry => !THIRD_PARTY.test(entry.packId))
  .flatMap(entry => (entry.pack.rules || []).flatMap(rule => rule.match?.pagePatterns || []))
  .map(pattern => /^\^(.+)\$$/u.exec(pattern)?.[1]?.replace(/\\(.)/gu, "$1"))
  .filter(Boolean));
const STANDARD_ACTIONS = ["New", "Post", "Post...", "Release", "Reopen", "Delete", "Edit",
  "View", "Open", "OK", "Print", "Process"];
const matches = (pattern, value) => new RegExp(pattern, "iu").test(value);

const violations = [];
for (const entry of packs.filter(item => THIRD_PARTY.test(item.packId))) {
  for (const rule of entry.pack.rules || []) {
    const pages = (rule.match?.pagePatterns || []).filter(pattern =>
      [...standardPages].some(page => matches(pattern, page)));
    const actions = (rule.match?.actionPatterns || []).filter(pattern => pattern &&
      STANDARD_ACTIONS.some(action => matches(pattern, action)));
    if (pages.length && actions.length) {
      violations.push(`${rule.ruleId}: ${actions.join(", ")} on ${pages.join(", ")}`);
    }
  }
}
assert.deepStrictEqual(violations, [], "third-party rules must not take over standard actions");

// New on a sales order creates a sales order; a quality check needs the app's own action.
const allPacks = packs.filter(entry => entry.enabled).map(entry => entry.pack);
for (const pageCaption of ["Sales Order", "Purchase Order", "Warehouse Receipt", "Transfer Order"]) {
  const task = knowledge.apply([{ taskId: "new", taskType: "CreateNew",
    pageIdentificationConfidence: 1, pageCaption, actionCaption: "New",
    language: "en-US" }], allPacks).tasks[0];
  assert.notStrictEqual(task.taskType, "CreateQualityCheck", pageCaption);
  assert.notStrictEqual(task.knowledgeRule, "Aptean.CreateQCCheck", pageCaption);
}
const appAction = knowledge.apply([{ taskId: "qc", taskType: "RunAction",
  pageIdentificationConfidence: 1, pageCaption: "Sales Order",
  actionCaption: "Create Quality Control Check", language: "en-US" }], allPacks).tasks[0];
assert.strictEqual(appAction.knowledgeRule, "Aptean.CreateQCCheck",
  "the app's own action is still recognized");

console.log("Knowledge pack scope tests passed.");
