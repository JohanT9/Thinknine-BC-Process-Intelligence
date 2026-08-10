(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9BCUIIdentification = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const SCHEMA_VERSION = 1;
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  function freeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.values(value).forEach(freeze);
    return Object.freeze(value);
  }
  function text(value) { return typeof value === "string" ? value.trim() : ""; }
  function evidence(source, value) {
    const normalized = text(value);
    return normalized ? { source, value: normalized } : null;
  }
  function identity(raw) {
    for (const [source, value] of [
      ["data-automation-id", raw.automationId],
      ["data-control-id", raw.dataControlId],
      ["data-control-name", raw.dataControlName],
      ["name", raw.nameAttribute],
      ["id", raw.elementId]
    ]) if (text(value)) return {
      value: text(value), source,
      stability: source === "name" || source === "id" ? "session" : "explicit"
    };
    return null;
  }
  function controlType(raw) {
    const explicit = text(raw.controlKind);
    if (explicit) return { value: explicit, quality: "exact", source: "explicit-control-kind" };
    const role = text(raw.role).toLowerCase();
    const tag = text(raw.controlType).toLowerCase();
    const input = text(raw.inputType).toLowerCase();
    if (input === "checkbox") return { value: "checkbox", quality: "exact", source: "input-type" };
    if (input === "radio" || tag === "select") return { value: "option", quality: "strong", source: input ? "input-type" : "element-name" };
    if (input === "date") return { value: "dateInput", quality: "exact", source: "input-type" };
    if (tag === "input" && /^(?:yyyy|mm|dd)[-/.]/i.test(text(raw.placeholder))) return { value: "dateInput", quality: "partial", source: "placeholder-shape" };
    if (role === "button" || role === "menuitem" || tag === "button") return { value: "button", quality: "strong", source: role ? "role" : "element-name" };
    if (role === "link" || tag === "a") return { value: "link", quality: "strong", source: role ? "role" : "element-name" };
    if (role === "tab") return { value: "tab", quality: "exact", source: "role" };
    if (role === "row") return { value: "listRow", quality: "strong", source: "role" };
    if (role === "gridcell") return { value: "repeaterCell", quality: "strong", source: "role" };
    if (raw.ariaHasPopup === "listbox" || raw.ariaHasPopup === "grid") return { value: "lookup", quality: "strong", source: "aria-haspopup" };
    if (["input", "textarea"].includes(tag) || role === "textbox") return { value: "field", quality: "strong", source: role ? "role" : "element-name" };
    return { value: "unknownInteractiveControl", quality: "unknown", source: "fallback" };
  }
  function identify(raw = {}, options = {}) {
    const eventId = options.eventId || raw.id || "";
    const allEvidence = [];
    const page = {};
    if (text(raw.pageId)) { page.id = text(raw.pageId); allEvidence.push(evidence("route-page-parameter", raw.pageId)); }
    if (text(raw.pageName)) { page.name = text(raw.pageName); allEvidence.push(evidence("explicit-page-name", raw.pageName)); }
    if (text(raw.pageCaption)) { page.caption = text(raw.pageCaption); allEvidence.push(evidence("observed-page-caption", raw.pageCaption)); }
    if (text(raw.frameUrl)) page.route = text(raw.frameUrl);

    const technicalIdentity = identity(raw);
    const classified = controlType(raw);
    const caption = text(raw.accessibleName || raw.fieldName || raw.label);
    const control = { type: classified.value };
    if (technicalIdentity) { control.identity = technicalIdentity; allEvidence.push(evidence(technicalIdentity.source, technicalIdentity.value)); }
    if (text(raw.fieldId)) control.fieldId = text(raw.fieldId);
    if (text(raw.controlId)) control.controlId = text(raw.controlId);
    if (caption) control.caption = caption;
    if (text(raw.accessibleName || raw.label)) control.accessibleName = text(raw.accessibleName || raw.label);
    if (text(raw.role)) control.role = text(raw.role);
    if (text(raw.nameAttribute)) control.name = text(raw.nameAttribute);
    if (raw.readOnly != null) control.readOnly = Boolean(raw.readOnly);
    if (raw.disabled != null) control.enabled = !raw.disabled;
    if (raw.checked != null) control.checked = Boolean(raw.checked);
    if (raw.selected != null) control.selected = Boolean(raw.selected);
    allEvidence.push(evidence(classified.source, classified.value));
    allEvidence.push(evidence(raw.accessibleNameSource || "observed-caption", caption));

    const hierarchy = Array.isArray(raw.uiHierarchy) ? clone(raw.uiHierarchy) : [];
    hierarchy.forEach(item => allEvidence.push(evidence("bounded-ancestor", `${item.type}${item.caption ? `:${item.caption}` : ""}`)));
    const container = hierarchy.length ? clone(hierarchy.at(-1)) : null;
    const actionLike = raw.category === "action" || ["button", "link"].includes(classified.value);
    const action = actionLike ? {
      caption: caption || undefined,
      identity: technicalIdentity || undefined,
      enabled: raw.disabled == null ? undefined : !raw.disabled,
      invocation: text(raw.inputSource) || (raw.type === "click" ? "pointer" : undefined)
    } : null;
    const dialog = hierarchy.find(item => item.type === "dialog");
    if (dialog) { page.modal = true; page.dialogCaption = dialog.caption || undefined; }

    const pageQuality = page.id || page.name ? "exact" : page.caption ? "strong" : "unknown";
    const technicalQuality = technicalIdentity?.stability === "explicit" ? "exact" : technicalIdentity ? "strong" : null;
    const controlQuality = control.fieldId || control.controlId ? "exact" : technicalQuality || classified.quality;
    const actionQuality = !action ? "unknown" : action.identity?.stability === "explicit" ? "exact" : action.identity ? "strong" : action.caption ? "strong" : "partial";
    const lookupContext = classified.value === "lookup" ? {
      kind: "trigger", controlIdentity: clone(technicalIdentity)
    } : dialog ? {
      kind: raw.role === "row" || raw.role === "gridcell" ? "result" : "dialog",
      dialogCaption: dialog.caption || undefined
    } : null;
    return freeze({
      schemaVersion: SCHEMA_VERSION,
      eventId,
      page,
      control,
      action,
      container,
      hierarchy,
      lookupContext,
      frameContext: {
        frameId: raw.sourceFrameId || undefined,
        frameUrl: raw.frameUrl || undefined,
        topUrl: raw.topUrl || undefined,
        depth: raw.frameDepth ?? undefined,
        controlAddIn: Boolean(raw.controlAddIn)
      },
      confidence: { page: pageQuality, control: controlQuality, action: actionQuality },
      evidence: allEvidence.filter(Boolean)
    });
  }
  function normalize(value) {
    if (!value || Number(value.schemaVersion) !== SCHEMA_VERSION) throw new Error("Unsupported BC UI identification schema.");
    return freeze(clone(value));
  }
  return { SCHEMA_VERSION, identify, normalize };
});
