"use strict";

const assert = require("assert");
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const root = path.resolve(__dirname, "..");
const fixtureRoot = path.join(__dirname, "fixtures", "control-addin-browser");
const edgeCandidates = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"
];

function edgePath() {
  if (process.env.T9_EDGE_PATH && fs.existsSync(process.env.T9_EDGE_PATH)) {
    return process.env.T9_EDGE_PATH;
  }
  return edgeCandidates.find(value => fs.existsSync(value)) || "";
}

function serveFile(response, file, contentType) {
  response.writeHead(200, { "content-type": `${contentType}; charset=utf-8`,
    "cache-control": "no-store" });
  response.end(fs.readFileSync(file));
}

function browserOutput(edge, url, profile) {
  return new Promise((resolve, reject) => {
    const child = spawn(edge, ["--headless=new", "--disable-gpu",
      "--use-gl=swiftshader", "--enable-unsafe-swiftshader",
      "--disable-gpu-compositing", "--no-first-run", "--disable-extensions", "--dump-dom",
      "--virtual-time-budget=2500", `--user-data-dir=${profile}`, url],
    { windowsHide: true });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", value => { stdout += value; });
    child.stderr.on("data", value => { stderr += value; });
    child.on("error", reject);
    child.on("close", code => code === 0 ? resolve(stdout) : reject(
      new Error(`Edge browser validation failed (${code}): ${stderr}`)));
  });
}

(async () => {
  const edge = edgePath();
  if (!edge) {
    console.log("Control add-in browser validation skipped: Edge unavailable.");
    return;
  }
  const server = http.createServer((request, response) => {
    const routes = {
      "/": [path.join(fixtureRoot, "harness.html"), "text/html"],
      "/frame": [path.join(fixtureRoot, "frame.html"), "text/html"],
      "/capture-focus-session.js": [path.join(root, "src", "recorder",
        "capture-focus-session.js"), "text/javascript"],
      "/capture-surface-mode.js": [path.join(root, "src", "recorder",
        "capture-surface-mode.js"), "text/javascript"],
      "/bc-error-detector.js": [path.join(root, "src", "recorder",
        "bc-error-detector.js"), "text/javascript"],
      "/content.js": [path.join(root, "src", "recorder", "content.js"),
        "text/javascript"]
    };
    const route = routes[new URL(request.url, "http://localhost").pathname];
    if (!route) { response.writeHead(404); response.end(); return; }
    serveFile(response, ...route);
  });
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "t9-addin-validation-"));
  try {
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address();
    const dom = await browserOutput(edge, `http://127.0.0.1:${port}/`, profile);
    const encoded = dom.match(/<pre id="validation-report">([^<]+)<\/pre>/u)?.[1];
    assert(encoded && encoded !== "pending", "browser scenario did not finish");
    const captured = JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));
    const events = captured.map(value => value.event);
    const topEvents = captured.filter(value => value.frame === "top");
    const frameEvents = captured.filter(value => value.frame === "addin");

    assert(topEvents.some(value => value.event.type === "click" &&
      value.event.label === "Production order 1001" &&
      value.event.captureSurface?.mode === "control-addin"));
    assert(topEvents.some(value => value.event.type === "field-change" &&
      value.event.fieldName === "Posting date" &&
      value.event.value === "2026-09-02"));
    assert(topEvents.some(value => value.event.type === "field-change" &&
      value.event.fieldName === "Print label" && value.event.checked === true));
    const addInClick = frameEvents.find(value => value.event.type === "click" &&
      value.event.label === "Apply changes");
    const dialog = frameEvents.find(value => value.event.type === "dialog-open");
    assert(addInClick, "nested Control Add-in click was not captured");
    assert(dialog, "nested Control Add-in result dialog was not captured");
    assert.strictEqual(dialog.event.interactionId, addInClick.event.interactionId,
      "result evidence must retain the initiating interaction identity");
    assert(events.every(event => event.sourceEventId && event.sourceFrameId));
    console.log(`Control add-in browser validation: ${events.length} events ` +
      "captured from top and nested-frame React-shaped DOM.");
  } finally {
    await new Promise(resolve => server.close(resolve));
    fs.rmSync(profile, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
