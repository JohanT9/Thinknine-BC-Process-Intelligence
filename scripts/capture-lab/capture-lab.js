// Capture lab: runs the real content script in headless Edge against a Business Central-shaped
// page, drives it with trusted mouse and keyboard input, feeds the captured events through the
// real service worker and interprets them with the dashboard pipeline.
// Needs Microsoft Edge and a built dist/ (npm run build). Usage: npm run capture:lab
// Writes the captured events to tests/fixtures/capture-lab/ and prints the interpreted steps.
const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawn } = require("child_process");
const repo = path.resolve(__dirname, "../..");
const outDir = path.join(repo, "tests/fixtures/capture-lab");
const edge = process.env.EDGE_PATH ||
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const port = 9334;
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "bcps-lab-"));
const dist = path.join(repo, "dist");
const child = spawn(edge, ["--headless=new", "--disable-gpu", "--no-first-run",
  `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
  `--load-extension=${dist}`, `--disable-extensions-except=${dist}`,
  "--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost", "about:blank"], { stdio: "ignore" });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function json(url) {
  for (let i = 0; i < 50; i += 1) { try { return await (await fetch(url)).json(); } catch { await sleep(200); } }
  throw new Error(`no response from ${url}`);
}
function connect(wsUrl) {
  const ws = new WebSocket(wsUrl); let id = 0; const pending = new Map();
  ws.onmessage = event => { const msg = JSON.parse(event.data);
    if (pending.has(msg.id)) { const { resolve, reject } = pending.get(msg.id); pending.delete(msg.id);
      msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result); } };
  const ready = new Promise(resolve => { ws.onopen = resolve; });
  return { ready, close: () => ws.close(), send(method, params = {}, sessionId) {
    const msg = { id: ++id, method, params }; if (sessionId) msg.sessionId = sessionId;
    ws.send(JSON.stringify(msg));
    return new Promise((resolve, reject) => pending.set(msg.id, { resolve, reject })); } };
}

(async () => {
  try {
    const version = await json(`http://127.0.0.1:${port}/json/version`);
    const cdp = connect(version.webSocketDebuggerUrl); await cdp.ready;
    let extensionId = null;
    for (let i = 0; i < 50 && !extensionId; i += 1) {
      const { targetInfos } = await cdp.send("Target.getTargets");
      const worker = targetInfos.find(t => t.type === "service_worker" && new URL(t.url).pathname === "/background.js");
      if (worker) extensionId = new URL(worker.url).host; else await sleep(200);
    }
    const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
    const { sessionId: s } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
    const page = (method, params) => cdp.send(method, params, s);
    await page("Page.enable");
    await page("Emulation.setDeviceMetricsOverride", { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
    const evaluate = async expression => {
      const r = await page("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 600));
      return r.result.value;
    };
    await page("Page.navigate", { url: "file:///" + path.join(__dirname, "bc-mock.html").replace(/\\/g, "/") });
    await sleep(800);
    // A minimal extension runtime for the content script; messages are collected.
    await evaluate(`window.__messages = []; window.__handlers = [];
      window.chrome = { runtime: { lastError: null, id: "lab",
        sendMessage(message, callback) { window.__messages.push(JSON.parse(JSON.stringify(message)));
          if (callback) setTimeout(() => callback({ ok: true }), 0); },
        onMessage: { addListener(handler) { window.__handlers.push(handler); } },
        getURL: value => value },
        storage: { onChanged: { addListener() {} }, local: { get: async () => ({}) } } }; 1`);
    for (const file of ["engine/business-central-version-capture.js", "capture-field-privacy.js",
      "capture-focus-session.js", "capture-surface-mode.js", "bc-error-detector.js",
      "capture-indicator-i18n.js", "content.js"]) {
      await evaluate(fs.readFileSync(path.join(dist, file), "utf8") + "\n;1");
    }
    await evaluate(`window.__handlers.forEach(h => h({ type: "T9_STATE_CHANGED", recording: true,
      sessionId: "lab-session", recordingPurpose: "documentation" }, {}, () => {})); 1`);

    const center = async selector => evaluate(`(() => { const r = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();
      return { x: r.left + Math.min(r.width / 2, 40), y: r.top + r.height / 2 }; })()`);
    const click = async selector => {
      const { x, y } = await center(selector);
      await page("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
      await page("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 });
      await sleep(60);
      await page("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 });
      await sleep(500);
    };
    const key = async (name, code, keyCode, text) => {
      await page("Input.dispatchKeyEvent", { type: "keyDown", key: name, code, windowsVirtualKeyCode: keyCode, ...(text ? { text } : {}) });
      await page("Input.dispatchKeyEvent", { type: "keyUp", key: name, code, windowsVirtualKeyCode: keyCode });
      await sleep(400);
    };
    const type = async (value, delay = 140) => {
      for (const ch of value) {
        await page("Input.dispatchKeyEvent", { type: "keyDown", key: ch, text: ch });
        await page("Input.dispatchKeyEvent", { type: "keyUp", key: ch });
        await sleep(delay);
      }
    };
    const selectAll = async () => {
      await page("Input.dispatchKeyEvent", { type: "keyDown", key: "a", code: "KeyA", windowsVirtualKeyCode: 65, modifiers: 2, commands: ["selectAll"] });
      await page("Input.dispatchKeyEvent", { type: "keyUp", key: "a", code: "KeyA", windowsVirtualKeyCode: 65, modifiers: 2 });
    };
    const tab = () => key("Tab", "Tab", 9);
    const enter = () => key("Enter", "Enter", 13, "\r");
    const steps = [];
    const mark = label => steps.push({ label, at: Date.now() });

    mark("1 New"); await click("#actNew"); await sleep(600);
    mark("2 Customer Name: type Ada, pick Adatum Corporation, Tab"); await click("#custName"); await type("Ada", 700); await click("#optAdatum"); await tab();
    mark("3 External Document No. = PO-1001, Enter"); await click("#extDoc"); await type("PO-1001"); await enter();
    mark("4 Posting Date = 2026-10-27 (reformatted), Tab"); await click("#postDate"); await selectAll(); await type("2026-10-27"); await tab();
    mark("5 Line No. = 1896-s, Tab to Quantity"); await click('#lines input[data-k="no"]'); await type("1896"); await tab();
    mark("6 Quantity = 5 (slow typing), Enter"); await type("5", 900); await enter();
    mark("7 Quantity again = 6, Tab"); await click('#lines input[data-k="qty"]'); await selectAll(); await type("6"); await tab();
    mark("8 Release"); await click("#actRelease");
    mark("9 Post... and OK"); await click("#actPost"); await click("#dlgOk"); await sleep(800);

    const messages = await evaluate("window.__messages");
    const events = messages.filter(m => m.type === "T9_RECORD_EVENT").map(m => m.event);
    // The page is a local file; recorded URLs are replaced by a Business Central URL.
    const bcUrl = "https://businesscentral.dynamics.com/tenant-demo/Production?company=CRONUS";
    const fixtureEvents = events.map(event => Object.fromEntries(Object.entries(event)
      .map(([name, value]) => [name, typeof value === "string" && value.startsWith("file:")
        ? bcUrl : value])));
    fs.writeFileSync(path.join(outDir, "sales-order-typeahead.json"), JSON.stringify({
      schemaVersion: 1,
      provenance: "Captured by the real content script in headless Edge from " +
        "scripts/capture-lab/bc-mock.html (a Business Central-shaped page); no customer data.",
      userActions: steps.map(step => step.label), events: fixtureEvents }, null, 1) + "\n");
    console.log("captured events", events.length);
    console.log(events.map(e => `${e.type}${e.inputSource ? "/" + e.inputSource : ""} ${e.fieldName || e.accessibleName || e.label || ""} ${e.value !== undefined ? JSON.stringify(e.value) : ""} [${String(e.interactionId || "").slice(-6)}]`).join("\n"));

    // Real service worker: record the captured events into a session.
    const { targetInfos } = await cdp.send("Target.getTargets");
    const worker = targetInfos.find(t => t.url.startsWith(`chrome-extension://${extensionId}/`) && t.type === "service_worker");
    const { sessionId: sw } = await cdp.send("Target.attachToTarget", { targetId: worker.targetId, flatten: true });
    await cdp.send("Runtime.enable", {}, sw);
    const feed = `(async () => {
      const events = ${JSON.stringify(events)};
      const bcUrl = "https://businesscentral.dynamics.com/tenant-demo/Production?company=CRONUS&page=42";
      requireRecordingLicense = async () => {}; requireActiveTenantLicense = async () => {};
      ensureContentScript = async () => true;
      pingContentScript = async () => { const st = await getState(); return { ok: true, recording: Boolean(st.recording), sessionId: st.sessionId, observedContext: {} }; };
      const realGet = chrome.tabs.get.bind(chrome.tabs);
      chrome.tabs.get = async id => id === 4242 ? { id, url: bcUrl, windowId: 1, active: true } : realGet(id);
      chrome.tabs.sendMessage = async () => ({ ok: true });
      chrome.tabs.captureVisibleTab = async () => { const c = new OffscreenCanvas(64, 36); const b = await c.convertToBlob({ type: "image/png" });
        const bytes = new Uint8Array(await b.arrayBuffer()); let s = ""; for (const x of bytes) s += String.fromCharCode(x); return "data:image/png;base64," + btoa(s); };
      const session = await startSession({ name: "Capture lab", purpose: "Lab" }, 4242);
      await setState({ recording: true, sessionId: session.id, tabId: 4242 });
      for (const event of events) await recordEvent({ ...event, recordingId: session.id,
        sourceEventId: event.sourceEventId.replace("lab-session", session.id) },
        { tabId: 4242, frameId: 0, origin: "https://businesscentral.dynamics.com" });
      await new Promise(r => setTimeout(r, 1500));
      await stopSession("Capture lab", "en-US");
      return session.id; })()`;
    const fed = await cdp.send("Runtime.evaluate", { expression: feed, awaitPromise: true, returnByValue: true }, sw);
    const recordingId = fed.result.value;
    console.log("session", recordingId || JSON.stringify(fed.exceptionDetails).slice(0, 400));

    // Dashboard pipeline: the steps a user would review.
    await page("Page.navigate", { url: `chrome-extension://${extensionId}/dashboard.html` });
    await sleep(3500);
    const model = await evaluate(`(async () => {
      const session = documentLibrarySessions.get(${JSON.stringify(recordingId)});
      const model = await prepareSessionModel(session);
      return { normalized: model.normalizedEvents.map(e => ({ kind: e.kind, subtype: e.subtype, raw: e.rawEventType,
          caption: e.controlIdentification?.caption || e.actionIdentification?.caption || "",
          value: e.value?.normalized, sources: e.sourceEventIds.length, interaction: e.interactionId })),
        groups: model.stepGroups.map(g => ({ kind: g.kind, events: g.normalizedEventIds.length, reasons: g.reasons })),
        tasks: model.businessTasks.map(t => ({ type: t.taskType, instruction: t.instruction, sources: (t.sourceEventIds || []).length })),
        compatibilityMode: model.compatibilityMode || "" }; })()`);
    console.log("\nnormalized", model.normalized.length, "groups", model.groups.length, "tasks", model.tasks.length, model.compatibilityMode);
    console.log(model.tasks.map((t, i) => `${i + 1}. [${t.type}] ${t.instruction}`).join("\n"));
    cdp.close();
  } catch (error) { console.error(error.stack || error.message); process.exitCode = 1; }
  finally { child.kill(); }
})();
