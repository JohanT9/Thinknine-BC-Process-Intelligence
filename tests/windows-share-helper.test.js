const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const read = file => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
const manifest = JSON.parse(read("src/ui/manifest.json"));
assert.ok(manifest.permissions.includes("nativeMessaging"));
assert.match(read("src/recorder/background.js"), /connectNative\("com\.thinknine\.bcprocessstudio\.share"/);
assert.match(read("src/recorder/background.js"), /windowsSharePorts\.add\(port\)/);
assert.match(read("src/ui/technical-report.js"), /T9_SHARE_BUG_REPORT_WINDOWS/);
assert.match(read("src/ui/dashboard.html"), /id="bugReportEmailMode"/);
assert.match(read("native/windows-share/ShareForm.cs"), /SetStorageItems/);
assert.match(read("native/windows-share/Program.cs"), /MaxBytes = 24 \* 1024 \* 1024/);
assert.match(read("native/windows-share/Register-Helper.ps1"), /ValidateOnly/);
assert.ok(!read("native/windows-share/Register-Helper.ps1").includes("HKLM:"));
if (process.env.T9_DOTNET) {
  const dll = path.join(__dirname, "../native/windows-share/bin/Release/net8.0-windows10.0.19041.0/BCProcessStudio.Share.dll");
  const result = spawnSync(process.env.T9_DOTNET, [dll, "--self-test"], { timeout: 20000 });
  assert.strictEqual(result.status, 0, result.stderr?.toString());
  assert.strictEqual(result.stdout.readUInt32LE(0), result.stdout.length - 4);
  assert.deepStrictEqual(JSON.parse(result.stdout.subarray(4).toString()), { ok: true, tests: 7 });
}
async function testBridge() {
  const background = read("src/recorder/background.js");
  const start = background.indexOf('case "T9_SHARE_BUG_REPORT_WINDOWS":');
  const end = background.indexOf('case "T9_DOWNLOAD_FILE":', start);
  const run = new Function("message", "sender", "chrome", "windowsSharePorts", "sendResponse",
    "setTimeout", "clearTimeout", `return (async () => { switch (message.type) {
      ${background.slice(start, end)} } })();`);
  const ports = new Set(); let result; let disconnected = false;
  const listeners = {};
  const port = {
    onMessage: { addListener: fn => { listeners.message = fn; } },
    onDisconnect: { addListener: fn => { listeners.disconnect = fn; } },
    postMessage: () => listeners.message({ ok: true, status: "helperReady" }),
    disconnect: () => { disconnected = true; listeners.disconnect(); }
  };
  const chromeMock = { runtime: { id: "studio", getURL: file => `chrome-extension://studio/${file}`,
    connectNative: name => { assert.strictEqual(name, "com.thinknine.bcprocessstudio.share"); return port; } } };
  const sender = { id: "studio", url: "chrome-extension://studio/technical-report.html?bugReportId=test" };
  const message = { type: "T9_SHARE_BUG_REPORT_WINDOWS", payload: { schemaVersion: 1,
    action: "shareBugReport", reportJson: "{}", markdown: "# Test" } };
  const invoke = (request = message, origin = sender) => run(request, origin, chromeMock,
    ports, value => { result = value; }, () => 1, () => {});
  await invoke();
  assert.deepStrictEqual(result, { ok: true, status: "helperReady" });
  assert.strictEqual(ports.size, 1, "Keep helper alive while the sharing UI is used");
  assert.strictEqual(disconnected, false);
  port.disconnect(); assert.strictEqual(ports.size, 0);
  await assert.rejects(invoke(message, { id: "studio", url: "https://businesscentral.dynamics.com/" }));
  await assert.rejects(invoke({ ...message, payload: { ...message.payload, schemaVersion: 2 } }));
  await assert.rejects(invoke({ ...message, payload: { ...message.payload,
    reportJson: "x".repeat(25 * 1024 * 1024) } }));
  port.postMessage = () => { chromeMock.runtime.lastError = { message: "Host missing" }; listeners.disconnect(); };
  await assert.rejects(invoke(), /Installera och registrera/);
  assert.strictEqual(ports.size, 0);
}
testBridge().then(() => console.log(
  "Windows share helper contracts and bridge tests passed; Outlook GUI verification is a manual gate."
)).catch(error => { console.error(error); process.exitCode = 1; });
