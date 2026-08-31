(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ObservedState = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const VERSION = "1.1.0";
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  function freeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.values(value).forEach(freeze);
    return Object.freeze(value);
  }
  function unique(values) { return [...new Set(values.filter(Boolean).map(String))]; }
  function sourceIds(event) {
    return unique(event?.sourceEventIds || [event?.sourceEventId]);
  }
  function pageValue(event) {
    const page = event?.pageIdentification || {};
    const identity = page.pageIdentity || page.pageObjectId || page.id ||
      page.pageId || page.legacyPageId || "";
    const caption = page.pageCaption || page.caption || page.name || "";
    return identity || caption ? { identity: String(identity || ""), caption } : null;
  }
  function controlValue(event) {
    const control = event?.controlIdentification || {};
    const identity = control.controlIdentity || control.identity?.value ||
      control.controlId || control.fieldId || control.caption || "";
    const caption = control.caption || control.name || "";
    return identity || caption ? { identity: String(identity || ""), caption } : null;
  }
  function fact(kind, key, value, event) {
    return freeze({ kind, key, value: clone(value),
      normalizedEventId: event?.normalizedEventId || null,
      sourceEventIds: sourceIds(event) });
  }
  function add(target, value) {
    if (!value) return;
    const index = target.findIndex(item => item.key === value.key);
    if (index >= 0) target[index] = value;
    else target.push(value);
  }
  function addFirst(target, value) {
    if (!value || target.some(item => item.key === value.key)) return;
    target.push(value);
  }
  function valueOf(model) {
    return model && Object.prototype.hasOwnProperty.call(model, "normalized")
      ? clone(model.normalized) : undefined;
  }
  function capture(events, interaction, outcomes) {
    const values = Array.isArray(events) ? events : [];
    const resultEvents = Array.isArray(outcomes) ? outcomes : [];
    const before = []; const after = [];
    const beforePage = pageValue(interaction || values[0]);
    if (beforePage) add(before, fact("page", "page", beforePage,
      interaction || values[0]));
    const pageOutcome = [...resultEvents].reverse().find(event =>
      ["navigation", "dialog-open", "dialog-close"].includes(event?.kind));
    const afterPage = pageValue(pageOutcome || interaction || values.at(-1));
    if (afterPage) add(after, fact("page", "page", afterPage,
      pageOutcome || interaction || values.at(-1)));

    resultEvents.forEach(event => {
      const control = controlValue(event);
      const selected = event?.selection?.value ?? event?.selection?.key ??
        event?.selection?.caption;
      const currentValue = selected !== undefined ? clone(selected) :
        valueOf(event?.value);
      const previousValue = valueOf(event?.previousValue);
      if (event?.kind !== "toggle-change" && control &&
          (currentValue !== undefined || previousValue !== undefined)) {
        const kind = selected !== undefined ? "control-selection" : "control-value";
        const key = `control:${control.identity}:${selected !== undefined
          ? "selection" : "value"}`;
        if (previousValue !== undefined) addFirst(before, fact(kind, key,
          { control, value: previousValue }, event));
        if (currentValue !== undefined) add(after, fact(kind, key,
          { control, value: currentValue }, event));
      }
      if (event?.kind === "toggle-change" && event?.state?.checked != null) {
        const key = `control:${control?.identity || "unknown"}:checked`;
        if (typeof previousValue === "boolean") addFirst(before,
          fact("toggle-state", key, { control, checked: previousValue }, event));
        add(after, fact("toggle-state", key,
          { control, checked: Boolean(event.state.checked) }, event));
      }
      if (["dialog-open", "dialog-close"].includes(event?.kind)) {
        const page = pageValue(event);
        const identity = page?.identity || page?.caption || "unknown";
        add(after, fact("dialog-visibility", `dialog:${identity}:visibility`,
          { page, visible: event.kind === "dialog-open" }, event));
      }
      if (["status-message", "error-outcome"].includes(event?.kind)) {
        add(after, fact("outcome", `outcome:${event.kind}`,
          { outcome: event.kind, observed: true }, event));
      }
    });

    const beforeByKey = new Map(before.map(item => [item.key, item]));
    const changes = after.flatMap(afterFact => {
      const beforeFact = beforeByKey.get(afterFact.key);
      if (!beforeFact || JSON.stringify(beforeFact.value) ===
          JSON.stringify(afterFact.value)) return [];
      return [freeze({ key: afterFact.key, kind: afterFact.kind,
        before: clone(beforeFact.value), after: clone(afterFact.value),
        sourceEventIds: unique([...beforeFact.sourceEventIds,
          ...afterFact.sourceEventIds]) })];
    });
    const status = changes.length ? "changed" : before.length && after.length
      ? "observed" : before.length || after.length ? "partial" : "unavailable";
    const coverage = {
      beforeFactCount: before.length, afterFactCount: after.length,
      changedFactCount: changes.length,
      observedKinds: unique([...before, ...after].map(item => item.kind))
    };
    return freeze({ version: VERSION, status,
      before: { facts: before }, after: { facts: after }, changes,
      coverage,
      sourceEventIds: unique([...before, ...after].flatMap(item =>
        item.sourceEventIds)) });
  }
  return { VERSION, capture };
});
