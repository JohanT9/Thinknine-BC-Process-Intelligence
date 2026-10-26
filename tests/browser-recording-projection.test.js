const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const dist = path.resolve(__dirname, "../dist");
for (const page of ["dashboard.html", "technical-report.html"]) {
  const scripts = [...fs.readFileSync(path.join(dist, page), "utf8")
    .matchAll(/<script\s+src="([^"]+)"/g)].map(match => match[1]);
  scripts.forEach(script => assert(fs.existsSync(path.join(dist, script)), script));
  const context = vm.createContext({ console });
  const modules = ["locale-catalogs", "language-registry", "page-identity",
    "process-taxonomy-schema", "canonical-semantic-model", "canonical-recording"];
  for (const script of scripts.filter(script => modules.some(name =>
    script === `engine/${name}.js`))) {
    vm.runInContext(fs.readFileSync(path.join(dist, script), "utf8"), context,
      { filename: script });
  }
  assert.strictEqual(typeof context.T9CanonicalRecording?.fromLegacyProjection, "function");
  for (const language of context.T9LanguageRegistry.languages) {
    const session = { id: "projection-test", startedAt: 1,
      settings: { documentLanguage: language.locale } };
    const events = [{ eventNo: 1, type: "click", canonicalSourceEventId: "event-1",
      canonicalScreenshotAssetId: "asset-1", fieldName: "Åäö — utilisateur" }];
    const snapshot = JSON.stringify(events);
    const recording = context.T9CanonicalRecording.fromLegacyProjection(
      { id: session.id, schemaVersion: 1 }, session, events);
    assert.strictEqual(recording.events.length, 1);
    assert.strictEqual(recording.events[0].id, "event-1");
    assert.strictEqual(recording.events[0].screenshotAssetId, "asset-1");
    assert.strictEqual(JSON.stringify(events), snapshot);
  }
  console.log(`${page}: browser recording projection passed in all registered languages.`);
}
