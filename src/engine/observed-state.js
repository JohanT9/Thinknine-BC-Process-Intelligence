(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ObservedState = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const VERSION = "1.0.0";
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

    const valueBeforeEvent = resultEvents.find(event =>
      valueOf(event?.previousValue) !== undefined);
    const valueAfterEvent = [...resultEvents].reverse().find(event =>
      valueOf(event?.value) !== undefined || event?.selection?.value != null);
    const valueControl = controlValue(valueAfterEvent || valueBeforeEvent);
    const valueKey = valueControl ? `control:${valueControl.identity}:value` : null;
    if (valueBeforeEvent && valueKey) add(before, fact("control-value", valueKey,
      { control: valueControl, value: valueOf(valueBeforeEvent.previousValue) },
      valueBeforeEvent));
    if (valueAfterEvent && valueKey) {
      const selected = valueAfterEvent.selection?.value ??
        valueAfterEvent.selection?.key ?? valueAfterEvent.selection?.caption;
      const afterValue = selected !== undefined ? clone(selected) :
        valueOf(valueAfterEvent.value);
      add(after, fact("control-value", valueKey,
        { control: valueControl, value: afterValue }, valueAfterEvent));
    }

    const toggleAfterEvent = [...resultEvents].reverse().find(event =>
      event?.kind === "toggle-change" && event?.state?.checked != null);
    if (toggleAfterEvent) {
      const control = controlValue(toggleAfterEvent);
      const key = `control:${control?.identity || "unknown"}:checked`;
      const prior = valueOf(toggleAfterEvent.previousValue);
      if (typeof prior === "boolean") add(before, fact("toggle-state", key,
        { control, checked: prior }, toggleAfterEvent));
      add(after, fact("toggle-state", key,
        { control, checked: Boolean(toggleAfterEvent.state.checked) },
        toggleAfterEvent));
    }

    const dialogOutcome = [...resultEvents].reverse().find(event =>
      ["dialog-open", "dialog-close"].includes(event?.kind));
    if (dialogOutcome) add(after, fact("dialog-visibility", "dialog:visibility",
      { page: pageValue(dialogOutcome), visible: dialogOutcome.kind === "dialog-open" },
      dialogOutcome));

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
    return freeze({ version: VERSION, status,
      before: { facts: before }, after: { facts: after }, changes,
      sourceEventIds: unique([...before, ...after].flatMap(item =>
        item.sourceEventIds)) });
  }
  return { VERSION, capture };
});
