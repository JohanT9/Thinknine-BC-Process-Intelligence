const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = relativePath => fs.readFileSync(path.join(root, relativePath), "utf8");
const packageJson = JSON.parse(read("package.json"));
const dashboard = read("dist/dashboard.js");
const content = read("dist/content.js");
const background = read("dist/background.js");
const dashboardHtml = read("dist/dashboard.html");

assert.ok(!dashboard.includes("__APP_VERSION__"));
assert.ok(!background.includes("__APP_VERSION__"));
assert.ok(dashboard.includes(`recorderVersion: "${packageJson.version}"`));
assert.ok(background.includes(`const VERSION = "${packageJson.version}"`));
assert.ok(dashboard.includes('const CONTEXT_BUILDER_VERSION = "1.0.0"'));
assert.ok(dashboard.includes(
  'const KNOWLEDGE_PACK_FRAMEWORK_VERSION = "2.0.0"'
));
assert.ok(content.includes('version: "2.1.0"'));
assert.ok(fs.existsSync(path.join(root, "dist/capture-focus-session.js")));
assert.ok(fs.existsSync(path.join(root, "dist/capture-surface-mode.js")));
assert.ok(fs.existsSync(path.join(root,
  "dist/review/process-improvement-dataset.js")));
assert.ok(fs.existsSync(path.join(root,
  "dist/review/process-improvement-service.js")));
assert(dashboardHtml.indexOf('review/correction-feedback.js') <
  dashboardHtml.indexOf('review/process-improvement-dataset.js') &&
  dashboardHtml.indexOf('review/process-improvement-dataset.js') <
  dashboardHtml.indexOf('review/review-studio.js'));
assert(background.indexOf('review/process-improvement-dataset.js') <
  background.indexOf('review/process-improvement-service.js'));
assert(background.includes('T9_GET_PROCESS_IMPROVEMENT_DATASET'));
assert.ok(fs.existsSync(path.join(root,
  "dist/engine/business-central-url-context.js")));
assert.ok(fs.existsSync(path.join(root,
  "dist/engine/process-decision-code-registry.js")));
assert.ok(fs.existsSync(path.join(root,
  "dist/engine/process-quality-guard.js")));
assert.ok(fs.existsSync(path.join(root,
  "dist/engine/process-contradiction-engine.js")));
assert.ok(fs.existsSync(path.join(root,
  "dist/engine/process-analysis-model.js")));
assert(background.indexOf('engine/process-decision-code-registry.js') <
  background.indexOf('engine/process-quality-guard.js') &&
  background.indexOf('engine/process-quality-guard.js') <
  background.indexOf('engine/process-contradiction-engine.js') &&
  background.indexOf('engine/process-contradiction-engine.js') <
  background.indexOf('engine/process-analysis-model.js') &&
  background.indexOf('engine/process-analysis-model.js') <
  background.indexOf('engine/session-interpretation-pipeline.js'));
assert.ok(fs.existsSync(path.join(root, "dist/bc-error-detector.js")));
assert.ok(fs.existsSync(path.join(root,
  "dist/bug-report/al-call-stack-parser.js")));
assert.ok(fs.existsSync(path.join(root,
  "dist/bug-report/technical-diagnostics.js")));
assert.ok(fs.existsSync(path.join(root,
  "dist/bug-report/error-evidence-model.js")));
assert.ok(fs.existsSync(path.join(root,
  "dist/bug-report/error-analysis-rules.js")));
assert.ok(fs.existsSync(path.join(root,
  "dist/bug-report/error-code-registry.js")));
assert.ok(fs.existsSync(path.join(root,
  "dist/bug-report/error-diagnosis-engine.js")));
assert.ok(fs.existsSync(path.join(root,
  "dist/bug-report/error-incident-correlator.js")));
assert.ok(fs.existsSync(path.join(root,
  "dist/bug-report/error-privacy-classifier.js")));
assert(background.indexOf('bug-report/error-evidence-model.js') <
  background.indexOf('bug-report/error-analysis-rules.js') &&
  background.indexOf('bug-report/error-analysis-rules.js') <
  background.indexOf('bug-report/error-code-registry.js') &&
  background.indexOf('bug-report/error-code-registry.js') <
  background.indexOf('bug-report/error-diagnosis-engine.js') &&
  background.indexOf('bug-report/error-diagnosis-engine.js') <
  background.indexOf('bug-report/error-incident-correlator.js') &&
  background.indexOf('bug-report/error-incident-correlator.js') <
  background.indexOf('bug-report/error-privacy-classifier.js') &&
  background.indexOf('bug-report/error-privacy-classifier.js') <
  background.indexOf('bug-report/error-analysis-engine.js'),
"ErrorEvidence must load before the analysis engine.");
assert.ok(fs.existsSync(path.join(root,
  "dist/bug-report/error-analysis-engine.js")));
assert.ok(fs.existsSync(path.join(root,
  "dist/bug-report/bug-report-generator.js")));
assert.ok(fs.existsSync(path.join(root, "dist/technical-report.html")));
assert.ok(fs.existsSync(path.join(root, "dist/license-status.html")));
assert.ok(fs.existsSync(path.join(root, "dist/license-status.js")));
assert.ok(fs.existsSync(path.join(root, "dist/technical-report.js")));
assert.ok(fs.existsSync(path.join(root, "dist/design-system.css")));
assert.ok(fs.existsSync(path.join(root,
  "dist/bug-report/application-insights-provider.js")));
assert.ok(fs.existsSync(path.join(root,
  "dist/bug-report/technical-analysis-provider.js")));
assert.ok(fs.existsSync(path.join(root, "dist/bug-report/issue-package.js")));
assert.ok(fs.existsSync(path.join(root,
  "dist/bug-report/azure-devops-adapter.js")));
assert.ok(fs.existsSync(path.join(root,
  "dist/bug-report/github-issue-adapter.js")));
const localScripts = [...dashboardHtml.matchAll(/<script\s+src="([^"]+)"/g)]
  .map(match => match[1]).filter(source => !/^https?:/i.test(source));
assert(localScripts.length > 0);
localScripts.forEach(source => assert.ok(fs.existsSync(path.join(root, "dist", source)),
  `Built dashboard dependency is missing: ${source}`));

console.log("Generated build version integrity tests passed.");
