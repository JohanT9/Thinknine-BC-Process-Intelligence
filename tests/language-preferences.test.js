const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const source = fs.readFileSync(path.join(__dirname, "../src/recorder/background.js"), "utf8");
const defaults = source.slice(source.indexOf("const DEFAULT_SETTINGS ="), source.indexOf('const STATE_KEY ='));
const install = source.slice(source.indexOf("chrome.runtime.onInstalled.addListener"), source.indexOf("chrome.runtime.onStartup.addListener"));
async function verify(stored) {
  let installed;
  const writes = [];
  const context = { SETTINGS_KEY: "settings", chrome: { storage: { local: {
    get: async () => ({ settings: stored }), set: async value => writes.push(value)
  } }, runtime: { onInstalled: { addListener: callback => { installed = callback; } } } },
  getState: async () => ({}), setState: async () => {}, registerRecorderContentScript: async () => {}, setDebug: async () => {} };
  vm.runInNewContext(defaults + install, context);
  await installed();
  const resolved = vm.runInNewContext("resolveSettings(" + JSON.stringify(stored) + ")", context);
  return { writes, resolved };
}
(async () => {
  const fresh = await verify(undefined);
  assert.equal(fresh.writes.length, 1);
  assert.equal(fresh.writes[0].settings.uiLocale, "en-US");
  assert.equal(fresh.writes[0].settings.documentLanguage, "en-US");
  assert.equal(fresh.resolved.uiLocale, "en-US");
  const existing = await verify({ uiLocale: "fr-FR", documentLanguage: "de-DE", companyName: "Original company" });
  assert.equal(existing.writes.length, 0);
  assert.equal(existing.resolved.uiLocale, "fr-FR");
  assert.equal(existing.resolved.documentLanguage, "de-DE");
  assert.equal(existing.resolved.companyName, "Original company");
  const legacy = await verify({ companyName: "Legacy company" });
  assert.equal(legacy.writes.length, 0);
  assert.equal(legacy.resolved.uiLocale, "sv-SE");
  assert.equal(legacy.resolved.documentLanguage, "sv-SE");
  console.log("Fresh installation defaults and existing/legacy language preferences passed.");
})().catch(error => { console.error(error); process.exitCode = 1; });
