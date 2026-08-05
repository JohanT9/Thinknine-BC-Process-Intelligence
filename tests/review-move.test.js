const assert = require("assert");
const move = require("../src/review/review-move");

const tasks = ["a", "b", "c", "d", "e"].map(taskId => ({ taskId }));
const ids = result => result.map(task => task.taskId);

assert.deepStrictEqual(ids(move.moveTo(tasks, ["b"], "d", "before")), [
  "a", "c", "b", "d", "e"
]);
assert.deepStrictEqual(ids(move.moveTo(tasks, ["b", "c"], "e", "after")), [
  "a", "d", "e", "b", "c"
]);
assert.deepStrictEqual(ids(move.moveTo(tasks, ["c", "b"], "e", "before")), [
  "a", "d", "b", "c", "e"
]);
assert.deepStrictEqual(ids(move.moveTo(tasks, ["b", "c"], "c", "after")), ids(tasks));
assert.deepStrictEqual(ids(move.moveByOffset(tasks, ["b", "c"], -1)), [
  "b", "c", "a", "d", "e"
]);
assert.deepStrictEqual(ids(move.moveByOffset(tasks, ["b", "c"], 1)), [
  "a", "d", "b", "c", "e"
]);
assert.deepStrictEqual(ids(move.moveByOffset(tasks, ["a"], -1)), ids(tasks));
assert.deepStrictEqual(ids(move.moveByOffset(tasks, ["e"], 1)), ids(tasks));
assert.deepStrictEqual(ids(tasks), ["a", "b", "c", "d", "e"]);

function classes(initial = []) {
  const values = new Set(initial);
  return {
    add(...names) {
      names.forEach(name => values.add(name));
    },
    remove(...names) {
      names.forEach(name => values.delete(name));
    },
    contains(name) {
      return values.has(name);
    }
  };
}

const listeners = {};
const removed = {};
const sourceCard = {
  dataset: { reviewTaskId: "b" },
  classList: classes(),
  getBoundingClientRect: () => ({ top: 0, height: 100 })
};
const targetCard = {
  dataset: { reviewTaskId: "d" },
  classList: classes(),
  getBoundingClientRect: () => ({ top: 100, height: 100 })
};
const handle = {
  closest(selector) {
    if (selector === "[data-drag-handle]") return this;
    if (selector === "[data-review-task-id]") return sourceCard;
    return null;
  }
};
const target = {
  closest(selector) {
    return selector === "[data-review-task-id]" ? targetCard : null;
  }
};
const container = {
  addEventListener(type, listener) {
    listeners[type] = listener;
  },
  removeEventListener(type, listener) {
    removed[type] = listener;
  },
  querySelectorAll(selector) {
    if (selector === ".drop-before, .drop-after") return [targetCard];
    if (selector === ".dragging") return [sourceCard];
    return [];
  }
};
const moves = [];
const unbind = move.bind(container, { move: command => moves.push(command) });
const transfer = {
  setData(type, value) {
    this[type] = value;
  }
};
listeners.dragstart({ target: handle, dataTransfer: transfer });
assert.strictEqual(sourceCard.classList.contains("dragging"), true);
assert.strictEqual(transfer["text/plain"], "b");

let prevented = false;
listeners.dragover({
  target,
  clientY: 175,
  dataTransfer: transfer,
  preventDefault() {
    prevented = true;
  }
});
assert.strictEqual(prevented, true);
assert.strictEqual(targetCard.classList.contains("drop-after"), true);
listeners.drop({ target, preventDefault() {} });
assert.deepStrictEqual(moves, [
  { draggedId: "b", targetId: "d", position: "after" }
]);
listeners.dragend();
assert.strictEqual(sourceCard.classList.contains("dragging"), false);
unbind();
assert.strictEqual(removed.dragstart, listeners.dragstart);
assert.strictEqual(removed.drop, listeners.drop);

let animation;
const animatedCard = {
  dataset: { reviewTaskId: "a" },
  getBoundingClientRect: () => ({ left: 10, top: 20 }),
  animate(frames, options) {
    animation = { frames, options };
  }
};
move.animatePositions(
  { querySelectorAll: () => [animatedCard] },
  new Map([["a", { left: 30, top: 50 }]])
);
assert.deepStrictEqual(animation.frames[0], {
  transform: "translate(20px, 30px)"
});
assert.strictEqual(animation.options.duration, 180);

console.log("Review move behaviour tests passed.");
