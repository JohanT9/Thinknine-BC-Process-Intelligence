const fs = require("fs");
const path = require("path");
const analysis = require("../src/review/process-improvement-analysis");

function run(filePath) {
  const resolved = path.resolve(filePath || "");
  const dataset = JSON.parse(fs.readFileSync(resolved, "utf8"));
  const report = analysis.analyze(dataset);
  return { report, markdown: analysis.markdown(report) };
}

if (require.main === module) {
  const input = process.argv[2];
  if (!input) {
    console.error("Usage: npm run analyze:process-improvement -- <dataset.json>");
    process.exitCode = 1;
  } else {
    try { process.stdout.write(run(input).markdown); }
    catch (error) { console.error(error.message); process.exitCode = 1; }
  }
}

module.exports = { ...analysis, run };
