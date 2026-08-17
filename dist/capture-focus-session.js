(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9CaptureFocusSession = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function create() {
    const sessions = new WeakMap();
    return {
      start(element, value) {
        sessions.set(element, { initialValue: value, committed: false,
          committedValue: undefined });
      },
      commit(element, value) {
        const current = sessions.get(element);
        if (current) sessions.set(element, { ...current, committed: true,
          committedValue: value });
      },
      previous(element) {
        return sessions.get(element)?.initialValue;
      },
      finish(element, finalValue) {
        const current = sessions.get(element);
        sessions.delete(element);
        if (!current) return { emit: false, reason: "missing-focus-session" };
        if (current.initialValue === finalValue) {
          return { emit: false, reason: "unchanged-focus-session" };
        }
        if (current.committed && current.committedValue === finalValue) {
          return { emit: false, reason: "equivalent-native-commit" };
        }
        return { emit: true, reason: "changed-value-on-focusout-fallback",
          previousValue: current.initialValue, value: finalValue };
      }
    };
  }

  return { create };
});
