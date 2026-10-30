const assert = require("node:assert/strict");
const { startKeepWarm, keepWarmUrl } = require("../services/licensing/server.js");

async function main() {
  const host = "thinknine-bc-license.azurewebsites.net";
  assert.equal(keepWarmUrl({}), "");
  assert.equal(keepWarmUrl({ WEBSITE_HOSTNAME: host }), `https://${host}/health`);
  assert.equal(keepWarmUrl({ WEBSITE_HOSTNAME: host, LICENSE_KEEP_WARM: "false" }), "");
  assert.equal(keepWarmUrl({ WEBSITE_HOSTNAME: host, LICENSE_KEEP_WARM_URL: "https://example.test/health" }),
    "https://example.test/health");

  const calls = [];
  const logged = [];
  const log = { log: text => logged.push(["log", text]), error: text => logged.push(["error", text]) };
  let ok = false;
  const stop = startKeepWarm({ url: "https://example.test/health", intervalMs: 5, log,
    fetcher: async url => { calls.push(url); return { ok, status: ok ? 200 : 503 }; } });
  await new Promise(resolve => setTimeout(resolve, 40));
  // Repeated failures are logged once, and so is the recovery.
  assert.ok(calls.length >= 2);
  assert.equal(logged.filter(([kind]) => kind === "error").length, 1);
  ok = true;
  await new Promise(resolve => setTimeout(resolve, 30));
  stop();
  const count = calls.length;
  assert.equal(logged.filter(([kind]) => kind === "log").length, 1);
  await new Promise(resolve => setTimeout(resolve, 30));
  assert.equal(calls.length, count);
  assert.equal(typeof startKeepWarm({ url: "" }), "function");
  console.log("License service keep-warm tests passed.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
