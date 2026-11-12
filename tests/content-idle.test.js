// A Business Central frame does no work of its own outside a recording: it neither watches the
// page nor polls its address nor keeps pinging the extension. A recording starts that work and
// stopping it ends it again.
const assert = require("assert");
const fs = require("fs");
const vm = require("vm");

const source = fs.readFileSync("src/recorder/content.js", "utf8");
const intervals = new Map();
let nextTimer = 1;
const observers = [];
const sent = [];
const listeners = { message: [], storage: [] };
const element = () => ({ querySelectorAll: () => [], querySelector: () => null,
  getAttribute: () => null, closest: () => null, appendChild() {}, append() {}, remove() {},
  setAttribute() {}, removeAttribute() {}, attachShadow: () => element(), getElementById: () => element(), dataset: {},
  classList: { add() {}, remove() {}, toggle() {} }, style: { setProperty() {} },
  addEventListener() {}, removeEventListener() {}, textContent: "", innerText: "" });
const documentStub = { ...element(), documentElement: element(), body: element(), head: element(),
  title: "Inköpsorder", createElement: element, addEventListener() {}, removeEventListener() {} };
const context = {
  console, URL, Date, Math, JSON, Promise, Map, Set, WeakMap, WeakSet, Object, Array, String,
  Number, Boolean, RegExp, Error, Symbol, Element: function Element() {},
  crypto: { randomUUID: () => "frame-1" },
  location: { href: "https://businesscentral.dynamics.com/tenant/Sandbox?page=50", hostname: "businesscentral.dynamics.com" },
  document: documentStub,
  addEventListener() {}, removeEventListener() {},
  requestAnimationFrame: callback => callback(),
  setTimeout: () => 0, clearTimeout() {},
  setInterval(callback, ms) { const id = nextTimer++; intervals.set(id, { callback, ms }); return id; },
  clearInterval(id) { intervals.delete(id); },
  MutationObserver: class {
    constructor(callback) { this.callback = callback; this.active = false; observers.push(this); }
    observe() { this.active = true; }
    disconnect() { this.active = false; }
  },
  chrome: { runtime: { id: "ext", lastError: null, getURL: path => `chrome-extension://ext/${path}`,
    sendMessage(message, callback) { sent.push(message.type);
      if (message.type === "T9_GET_STATE") callback?.({ state: { recording: false } });
      else callback?.({}); },
    onMessage: { addListener: listener => listeners.message.push(listener) } },
  storage: { local: { get: async () => ({}) },
    onChanged: { addListener: listener => listeners.storage.push(listener) } } }
};
context.T9CaptureDelivery = { create: () => ({ deliver() {} }) };
context.window = context;
context.globalThis = context;
context.top = context;
context.self = context;
vm.createContext(context);
vm.runInContext(source, context, { filename: "content.js" });

const pageObserver = () => observers.find(observer => observer.active);
const pollers = () => [...intervals.values()].filter(timer => timer.ms === 400 || timer.ms === 5000);
assert.strictEqual(pageObserver(), undefined, "an idle frame must not watch the page");
assert.deepStrictEqual(pollers(), [], "an idle frame must not poll its address or ping");
assert.strictEqual(sent.filter(type => type === "T9_PING").length, 1,
  "an idle frame reports once that it is there");

const state = recording => listeners.message.forEach(listener => listener(
  { type: "T9_STATE_CHANGED", recording, sessionId: recording ? "session-1" : null },
  {}, () => {}));
state(true);
assert(pageObserver(), "a recording watches the page");
assert.deepStrictEqual(pollers().map(timer => timer.ms).sort(), [400, 5000]);
state(false);
assert.strictEqual(pageObserver(), undefined, "stopping ends the page watch");
assert.deepStrictEqual(pollers(), [], "stopping ends address polling and pings");
console.log("Content script idle tests passed.");
