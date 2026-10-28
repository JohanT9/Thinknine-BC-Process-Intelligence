// Capture quality corpus: real or lab recordings with the steps a person expects.
//   npm run quality:capture             report and compare with the baseline
//   npm run quality:capture -- --update store the current result as the new baseline
//   npm run quality:capture -- --verbose list every step with its outcome
const fs = require("fs");
const path = require("path");
const { replay, enabledKnowledgePacks } = require("./replay");
const { score } = require("./score");
const { translateInstruction } = require("../../src/document/document-language");

const root = path.resolve(__dirname, "../..");
const corpusDir = path.join(root, "tests/fixtures/capture-quality/recordings");
const baselinePath = path.join(root, "tests/fixtures/capture-quality/baseline.json");
const COUNTS = ["expected", "produced", "correct", "wrong", "duplicates", "extras", "missing"];
// A higher value is worse for these counts; fewer correct steps is worse too.
const WORSE_WHEN_HIGHER = ["wrong", "duplicates", "extras", "missing"];

function validate(entry, file) {
  const problems = [];
  if (entry.schemaVersion !== 1) problems.push("schemaVersion must be 1");
  if (!entry.id) problems.push("id is required");
  if (!Array.isArray(entry.events) && !entry.eventsFrom) problems.push("events or eventsFrom is required");
  if (!Array.isArray(entry.expectedSteps) || !entry.expectedSteps.length) problems.push("expectedSteps is required");
  (entry.expectedSteps || []).forEach((step, index) => {
    if (!step?.target) problems.push(`expectedSteps[${index}].target is required`);
  });
  if (problems.length) throw new TypeError(`${file}: ${problems.join("; ")}`);
  return entry;
}

function loadCorpus(dir = corpusDir) {
  return fs.readdirSync(dir).filter(file => file.endsWith(".json")).sort().map(file => {
    const entry = validate(JSON.parse(fs.readFileSync(path.join(dir, file), "utf8")), file);
    const events = entry.events || JSON.parse(fs.readFileSync(
      path.join(root, entry.eventsFrom), "utf8")).events;
    return { ...entry, events, file };
  });
}

function evaluate(corpus = loadCorpus(), knowledgePacks = enabledKnowledgePacks()) {
  const recordings = corpus.map(entry => {
    const documentLanguage = entry.documentLanguage || "en-US";
    const { tasks } = replay(entry.events, { id: entry.id, documentLanguage, knowledgePacks });
    // Report each step as the document shows it in the recording's document language.
    const shown = tasks.map(task => ({ ...task,
      instruction: translateInstruction(task.instruction, documentLanguage) }));
    return { id: entry.id, reviewed: entry.reviewed === true,
      ...score(entry.expectedSteps, shown) };
  });
  const totals = Object.fromEntries(COUNTS.map(key =>
    [key, recordings.reduce((sum, item) => sum + item[key], 0)]));
  totals.precision = totals.produced ? totals.correct / totals.produced : 1;
  totals.recall = totals.expected ? totals.correct / totals.expected : 1;
  return { recordings, totals };
}

const countsOf = item => Object.fromEntries(COUNTS.map(key => [key, item[key]]));

function compare(result, baseline) {
  const regressions = []; const improvements = [];
  const previous = new Map((baseline?.recordings || []).map(item => [item.id, item]));
  for (const item of result.recordings) {
    const before = previous.get(item.id);
    if (!before) { improvements.push(`${item.id}: new recording, not in the baseline`); continue; }
    for (const key of [...WORSE_WHEN_HIGHER, "correct"]) {
      const worse = key === "correct" ? item[key] < before[key] : item[key] > before[key];
      const better = key === "correct" ? item[key] > before[key] : item[key] < before[key];
      if (worse) regressions.push(`${item.id}: ${key} ${before[key]} -> ${item[key]}`);
      if (better) improvements.push(`${item.id}: ${key} ${before[key]} -> ${item[key]}`);
    }
  }
  for (const id of previous.keys()) {
    if (!result.recordings.some(item => item.id === id)) regressions.push(`${id}: removed from the corpus`);
  }
  return { regressions, improvements };
}

function readBaseline() {
  return fs.existsSync(baselinePath) ? JSON.parse(fs.readFileSync(baselinePath, "utf8")) : null;
}

function writeBaseline(result) {
  fs.writeFileSync(baselinePath, `${JSON.stringify({ schemaVersion: 1,
    recordings: result.recordings.map(item => ({ id: item.id, ...countsOf(item) })) },
  null, 2)}\n`);
}

const percent = value => `${Math.round(value * 1000) / 10}%`;

function report(result, { verbose = false } = {}) {
  const lines = [];
  const header = ["recording", ...COUNTS, "precision", "recall"];
  const rows = result.recordings.map(item => [`${item.id}${item.reviewed ? "" : " (draft)"}`,
    ...COUNTS.map(key => String(item[key])), percent(item.precision), percent(item.recall)]);
  rows.push(["TOTAL", ...COUNTS.map(key => String(result.totals[key])),
    percent(result.totals.precision), percent(result.totals.recall)]);
  const widths = header.map((title, index) =>
    Math.max(title.length, ...rows.map(row => row[index].length)));
  const format = row => row.map((cell, index) => cell.padEnd(widths[index])).join("  ");
  lines.push(format(header), ...rows.map(format));
  if (verbose) {
    for (const item of result.recordings) {
      lines.push("", `${item.id}:`);
      item.steps.forEach((step, index) => lines.push(
        `  ${String(index + 1).padStart(2)} ${step.outcome.padEnd(9)} ${step.instruction}`));
      item.missingSteps.forEach(step => lines.push(
        `     missing   ${step.target}${step.value ? ` = ${step.value}` : ""}`));
    }
  }
  return lines.join("\n");
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const result = evaluate();
  console.log(report(result, { verbose: args.includes("--verbose") }));
  if (args.includes("--update")) {
    writeBaseline(result);
    console.log(`\nBaseline updated: ${path.relative(root, baselinePath)}`);
  } else {
    const { regressions, improvements } = compare(result, readBaseline());
    improvements.forEach(line => console.log(`improved  ${line}`));
    regressions.forEach(line => console.error(`WORSE     ${line}`));
    if (improvements.length && !regressions.length) {
      console.log("\nStore the improvement with: npm run quality:capture -- --update");
    }
    if (regressions.length) process.exitCode = 1;
  }
}

module.exports = { baselinePath, compare, corpusDir, evaluate, loadCorpus, readBaseline,
  report, validate, writeBaseline };
