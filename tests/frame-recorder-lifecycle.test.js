const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const frameCapture = require("../src/recorder/frame-capture");

const listeners = new Map();
const messages = [];
const timers = [];
let stateCallback;
let runtimeListener;
let observed = 0;
let disconnected = 0;

class Element {
  constructor(attributes = {}) {
    this.attributes = attributes;
    this.nodeType = 1;
    this.dataset = {};
    this.id = "";
    this.tagName = "DIV";
    this.innerText = "";
    this.textContent = "";
  }
  getAttribute(name) { return this.attributes[name] ?? null; }
  hasAttribute(name) { return this.attributes[name] !== undefined; }
  closest() { return this; }
  matches() { return true; }
  getBoundingClientRect() {
    return { x: 5, y: 6, width: 70, height: 20 };
  }
  getRootNode() { return {}; }
}
class HTMLInputElement extends Element {
  constructor() {
    super({ "aria-label": "Antal" });
    this.tagName = "INPUT";
    this.type = "text";
    this.value = "500";
  }
}
class HTMLTextAreaElement extends Element {}
class HTMLSelectElement extends Element {}
class MutationObserver {
  observe() { observed += 1; }
  disconnect() { disconnected += 1; }
}

const documentValue = {
  title: "Business Central",
  referrer: "",
  documentElement: {},
  addEventListener(type, listener, options) {
    listeners.set(type, { listener, options });
  },
  querySelectorAll() { return []; },
  querySelector() { return null; },
  getElementById() { return null; }
};
const locationValue = {
  href: "https://businesscentral.dynamics.com/controladdin",
  origin: "https://businesscentral.dynamics.com"
};
const windowValue = { location: locationValue, devicePixelRatio: 1,
  visualViewport: { scale: 1 } };
windowValue.top = windowValue;
windowValue.parent = windowValue;

const context = {
  AbortController,
  CSS: { escape: value => value },
  Element,
  HTMLInputElement,
  HTMLSelectElement,
  HTMLTextAreaElement,
  MutationObserver,
  URL,
  atob,
  chrome: { runtime: {
    lastError: null,
    sendMessage(message, callback) {
      messages.push(message);
      if (message.type === "T9_GET_STATE") stateCallback = callback;
      else callback?.({ ok: true });
    },
    onMessage: { addListener(listener) { runtimeListener = listener; } }
  } },
  clearTimeout(id) { if (id) id.cancelled = true; },
  crypto: { randomUUID: () => "frame-runtime" },
  document: documentValue,
  globalThis: null,
  location: locationValue,
  requestAnimationFrame(callback) { callback(); },
  setInterval() { return 1; },
  setTimeout(callback) {
    const timer = { callback, cancelled: false };
    timers.push(timer);
    return timer;
  },
  window: windowValue
};
context.globalThis = context;
context.T9FrameCapture = frameCapture;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname,
  "../src/recorder/content.js"), "utf8"), context);

stateCallback({ state: { recording: false, sessionId: null } });
assert.strictEqual(listeners.size, 0, "standby frames must not observe interaction");
runtimeListener({ type: "T9_STATE_CHANGED", recording: true,
  sessionId: "session-1" }, {}, () => {});
assert.deepStrictEqual([...listeners.keys()],
  ["click", "input", "change", "focusout", "keydown"]);
assert.strictEqual(observed, 1);

const input = new HTMLInputElement();
listeners.get("input").listener({ target: input,
  composedPath: () => [input] });
timers.at(-1).callback();
const captured = messages.find(message =>
  message.type === frameCapture.MESSAGE_TYPES.EVENT);
assert.strictEqual(captured.sessionId, "session-1");
assert.strictEqual(captured.event.value, "500");
assert.strictEqual(captured.event.fieldName, "Antal");
assert.strictEqual(JSON.stringify(captured.event.localBounds),
  JSON.stringify({ x: 5, y: 6, width: 70, height: 20 }));

runtimeListener({ type: "T9_STATE_CHANGED", recording: false,
  sessionId: null }, {}, () => {});
assert.strictEqual(disconnected, 1);
for (const value of listeners.values()) {
  assert.strictEqual(value.options.signal.aborted, true);
}

runtimeListener({ type: "T9_STATE_CHANGED", recording: true,
  sessionId: "session-2" }, {}, () => {});
assert.strictEqual(observed, 2, "resume installs one fresh observer lifecycle");
assert.strictEqual(listeners.size, 5, "resume replaces rather than duplicates listeners");

console.log("Frame recorder lifecycle behaviour tests passed.");
