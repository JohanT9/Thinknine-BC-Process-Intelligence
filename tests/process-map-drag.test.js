const assert = require("assert");
const drag = require("../src/ui/process-map-drag");
const listeners = {}; const removed = {};
const classes = () => { const values = new Set(); return { add: value => values.add(value),
  remove: (...valuesToRemove) => valuesToRemove.forEach(value => values.delete(value)),
  contains: value => values.has(value) }; };
const source = { dataset: { processNodeId: "a" }, classList: classes() };
const target = { dataset: { processNodeId: "b" }, classList: classes(),
  getBoundingClientRect: () => ({ left: 100, top: 20, width: 200, height: 100 }) };
const handle = { getAttribute: () => "true", closest: selector =>
  selector === "[data-process-drag-handle]" ? handle : source };
const targetChild = { closest: () => target };
const container = { addEventListener: (type, listener) => { listeners[type] = listener; },
  removeEventListener: (type, listener) => { removed[type] = listener; },
  querySelectorAll: () => [source, target] };
const moves = []; const transfer = { setData(type, value) { this[type] = value; } };
const unbind = drag.bind(container, { move: command => moves.push(command) });
listeners.dragstart({ target: handle, dataTransfer: transfer });
assert.strictEqual(transfer["text/plain"], "a");
listeners.dragover({ target: targetChild, clientX: 280, clientY: 50, dataTransfer: transfer,
  preventDefault() {} });
listeners.drop({ target: targetChild, preventDefault() {} });
assert.deepStrictEqual(moves, [{ draggedId: "a", targetId: "b", position: "after" }]);
listeners.dragend(); unbind();
assert.strictEqual(removed.drop, listeners.drop);
console.log("Process map drag reorder tests passed.");
