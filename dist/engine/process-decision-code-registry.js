(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ProcessDecisionCodeRegistry = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const REGISTRY_VERSION = "1.0.0";
  const entry = value => Object.freeze(value);
  const ENTRIES = Object.freeze([
    entry({ id: "task-projected", code: "BCPS-PROCESS-INCLUDE-001",
      domain: "projection", outcome: "included" }),
    entry({ id: "events-consolidated", code: "BCPS-PROCESS-MERGE-001",
      domain: "consolidation", outcome: "included" }),
    entry({ id: "supporting-evidence", code: "BCPS-PROCESS-SUPPORT-001",
      domain: "evidence", outcome: "supporting" }),
    entry({ id: "explicitly-ignored", code: "BCPS-PROCESS-FILTER-001",
      domain: "filtering", outcome: "excluded" }),
    entry({ id: "hidden-semantic-action", code: "BCPS-PROCESS-FILTER-002",
      domain: "filtering", outcome: "excluded" }),
    entry({ id: "action-not-projected", code: "BCPS-PROCESS-PROJECT-001",
      domain: "projection", outcome: "unresolved" }),
    entry({ id: "group-not-interpreted", code: "BCPS-PROCESS-INTERPRET-001",
      domain: "interpretation", outcome: "unresolved" }),
    entry({ id: "event-unassigned", code: "BCPS-PROCESS-TRACE-001",
      domain: "traceability", outcome: "unresolved" })
  ]);
  const byId = new Map(ENTRIES.map(item => [item.id, item]));
  const reasonIds = Object.freeze({
    "process-group-produced-task": "task-projected",
    "process-group-explicitly-ignored": "explicitly-ignored",
    "process-action-hidden": "hidden-semantic-action",
    "process-action-not-projected": "action-not-projected",
    "process-group-not-interpreted": "group-not-interpreted",
    "process-event-unassigned": "event-unassigned"
  });
  const outcomeFallback = Object.freeze({ included: "task-projected",
    supporting: "supporting-evidence", excluded: "explicitly-ignored",
    unresolved: "event-unassigned" });

  function validate(entries = ENTRIES) {
    const ids = new Set(); const codes = new Set();
    entries.forEach(item => {
      if (!item?.id || !/^BCPS-PROCESS-[A-Z]+-\d{3}$/u.test(item.code || "") ||
          !item.domain || !item.outcome) throw new TypeError("Invalid process decision code.");
      if (ids.has(item.id)) throw new TypeError(`Duplicate process decision id: ${item.id}`);
      if (codes.has(item.code)) throw new TypeError(`Duplicate process decision code: ${item.code}`);
      ids.add(item.id); codes.add(item.code);
    });
    return true;
  }
  function resolve(reasonCode, outcome) {
    const id = reasonIds[reasonCode] ||
      (outcome === "supporting" ? "supporting-evidence" : outcomeFallback[outcome]) ||
      "event-unassigned";
    return byId.get(id);
  }
  function assign(reasonCode, outcome, context = {}) {
    const primary = resolve(reasonCode, outcome);
    const values = [primary];
    if (outcome === "included" && context.subjectType === "step-group" &&
        Number(context.normalizedEventCount) > 1) values.push(byId.get("events-consolidated"));
    return Object.freeze(values.map(item => Object.freeze({ ...item,
      registryVersion: REGISTRY_VERSION })));
  }
  validate();
  return { ENTRIES, REGISTRY_VERSION, assign, resolve, validate };
});
