(function (root, factory) {
  const pageIdentityContract = typeof module === "object" && module.exports
    ? require("./page-identity") : root.T9PageIdentity;
  const pageIdentificationEngine = typeof module === "object" && module.exports
    ? require("./page-identification-engine") : root.T9PageIdentificationEngine;
  const api = factory(pageIdentityContract, pageIdentificationEngine);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9BCUIIdentification = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (
  pageIdentityContract, pageIdentificationEngine
) {
  "use strict";
  const SCHEMA_VERSION = 1;
  const ACTION_RULES = {
    createpick: { actionType: "CreatePick", captions: /^(skapa (lager)?plockning|create pick)$/i },
    registerpick: { actionType: "RegisterPick", captions: /^(registrera plockning|register pick)$/i },
    registerputaway: { actionType: "RegisterPutAway",
      captions: /^(registrera (lager)?inlagring|register put-?away)$/i },
    postshipment: { actionType: "PostShipment",
      captions: /^(bokför (lager)?utleverans|post shipment|ship)$/i },
    postreceipt: { actionType: "PostReceipt",
      captions: /^(bokför (lager)?inleverans|post receipt|receive)$/i },
    postinvoice: { actionType: "PostInvoice",
      captions: /^(bokför faktura|post invoice|invoice)$/i },
    postconsumption: { actionType: "PostConsumption",
      captions: /^(bokför förbrukning|post consumption|consume)$/i },
    postoutput: { actionType: "PostOutput",
      captions: /^(bokför utflöde|post output|output)$/i },
    reopen: { actionType: "ReopenDocument", captions: /^(öppna igen|reopen|genåbn)$/i },
    release: { actionType: "ReleaseDocument", captions: /^(släpp|frisläpp|release|frigiv)$/i },
    post: { actionType: "PostDocument", captions: /^(bokför|post|bogfør)$/i },
    search: { actionType: "SearchAndOpenPage", captions: /^(sök|search|søg)$/i },
    confirmyes: { actionType: "ConfirmYes", captions: /^(ja|yes|oui)$/i },
    confirmno: { actionType: "ConfirmNo", captions: /^(nej|no|non)$/i },
    open: { actionType: "OpenRecord", captions: /open record|öppna post|åbn post/i },
    back: { actionType: "NavigateBack", captions: /^(tillbaka|back|tilbage)$/i },
    new: { actionType: "CreateNew", captions: /^(ny|new|ny post)$/i },
    edit: { actionType: "EditRecord", captions: /^(redigera|edit|rediger)$/i },
    delete: { actionType: "DeleteRecord", captions: /^(ta bort|delete|slet)$/i }
  };
  const FIELD_RULES = [
    { hint: "ShipmentDate", ids: /shipmentdate/i,
      captions: /^(utleveransdatum|shipment date|leveringsdato)$/i },
    { hint: "Customer", ids: /customer(no|name)/i,
      captions: /^(kundnr\.?|kundens namn|customer no\.?|customer name|kundenr\.?)$/i },
    { hint: "Item", ids: /itemno/i,
      captions: /^(artikelnr\.?|item no\.?|varenr\.?)$/i },
    { hint: "Vendor", ids: /vendor(no|name)/i,
      captions: /^(leverantörsnr\.?|leverantörens namn|vendor no\.?|vendor name|leverandørnr\.?)$/i },
    { hint: "Quantity", ids: /(^|[^a-z])(quantity|qty)([^a-z]|$)/i,
      captions: /^(antal|quantity|qty\.?|mængde)$/i },
    { hint: "Location", ids: /locationcode/i,
      captions: /^(lagerställekod|location code|lokationskode)$/i },
    { hint: "Bin", ids: /bincode/i,
      captions: /^(lagerplatskod|bin code|placeringskode)$/i },
    { hint: "PostingDate", ids: /postingdate/i,
      captions: /^(bokföringsdatum|posting date|bogføringsdato)$/i },
    { hint: "DocumentNo", ids: /document(no|number)/i,
      captions: /^(dokumentnr\.?|document no\.?|bilagsnr\.?)$/i },
    { hint: "UnitOfMeasure", ids: /unitofmeasure(code)?/i,
      captions: /^(enhetskod|unit of measure code|måleenhedskode)$/i },
    { hint: "Variant", ids: /variantcode/i,
      captions: /^(variantkod|variant code|variantkode)$/i },
    { hint: "LotNumber", ids: /lot(no|number)/i,
      captions: /^(partinr\.?|lot no\.?|lot number|lotnr\.?)$/i },
    { hint: "SerialNumber", ids: /serial(no|number)/i,
      captions: /^(serienr\.?|serial no\.?|serial number)$/i },
    { hint: "ExpirationDate", ids: /expirationdate/i,
      captions: /^(utgångsdatum|expiration date|udløbsdato)$/i }
  ];
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
  function identifyPage(raw = {}, options = {}) {
    const pageId = text(raw.pageId);
    const pageObjectId = pageIdentityContract.observedPageObjectId(raw);
    const caption = text(raw.pageName || raw.pageCaption);
    const resolved = pageIdentificationEngine.identifyPage({ pageObjectId,
      legacyPageId: pageId, pageCaption: caption,
      documentTitle: raw.documentTitle, frameUrl: raw.frameUrl,
      topUrl: raw.topUrl, locale: raw.locale }, options);
    return {
      pageIdentity: resolved.pageIdentity,
      pageId: pageId || null,
      pageObjectId,
      pageType: resolved.pageType || null,
      caption: caption || null,
      entity: resolved.entity || null,
      tableId: resolved.tableId || null,
      recordType: resolved.recordType || null,
      documentType: resolved.documentType || null,
      source: resolved.source,
      provider: resolved.provider || null,
      ruleId: resolved.ruleId || null,
      confidence: resolved.confidence,
      diagnostics: clone(resolved.diagnostics || []),
      documentTitle: text(raw.documentTitle) || null,
      evidence: [evidence("route-page-parameter", pageObjectId),
        evidence("observed-page-caption", caption)].filter(Boolean)
    };
  }
  function identifyControl(raw = {}) {
    const technical = identity(raw);
    const classified = controlType(raw);
    const caption = text(raw.accessibleName || raw.fieldName || raw.label);
    const stableField = text(raw.fieldId || raw.automationId || raw.dataControlId);
    const fieldRule = FIELD_RULES.find(rule => rule.ids.test(stableField)) ||
      FIELD_RULES.find(rule => rule.captions.test(caption));
    return {
      controlIdentity: technical ? `bc:control:${technical.value}` : null,
      controlId: text(raw.controlId || raw.dataControlId) || null,
      automationId: text(raw.automationId) || null,
      controlType: classified.value,
      role: text(raw.role) || null,
      caption: caption || null,
      fieldSemanticHint: fieldRule?.hint || text(raw.fieldId) || null,
      source: technical?.source || classified.source,
      evidence: [technical && evidence(technical.source, technical.value),
        evidence(classified.source, classified.value),
        evidence(raw.accessibleNameSource || "observed-caption", caption)].filter(Boolean)
    };
  }
  function identifyField(raw = {}) {
    const classified = controlType(raw); const technical = identity(raw);
    const caption = text(raw.accessibleName || raw.fieldName || raw.label);
    const stableField = text(raw.fieldId || raw.automationId || raw.dataControlId);
    const rule = FIELD_RULES.find(item => item.ids.test(stableField)) ||
      FIELD_RULES.find(item => item.captions.test(caption));
    const fieldLike = ["field", "dateInput", "option", "checkbox", "lookup",
      "repeaterCell"].includes(classified.value) || Boolean(text(raw.fieldId));
    return {
      fieldIdentity: fieldLike && technical ? `bc:field:${technical.value}` : null,
      fieldId: text(raw.fieldId || raw.dataControlId) || null,
      automationId: text(raw.automationId) || null,
      semanticHint: rule?.hint || text(raw.fieldId) || null,
      caption: caption || null,
      source: fieldLike ? technical?.source || (rule ? "semantic-field-rule" : null) : null,
      evidence: fieldLike ? [technical && evidence(technical.source, technical.value),
        evidence("observed-field-caption", caption)].filter(Boolean) : []
    };
  }
  function technicalAction(raw) {
    const value = text(raw.automationId || raw.dataControlId || raw.dataControlName);
    if (!value) return null;
    const normalized = value.replace(/[^a-z]/gi, "").toLowerCase();
    for (const [key, rule] of Object.entries(ACTION_RULES)) {
      if (normalized.includes(key)) return { ...rule, key, source: "technical-action-id" };
    }
    return null;
  }
  function identifyAction(raw = {}) {
    const caption = text(raw.accessibleName || raw.label || raw.fieldName);
    const technical = technicalAction(raw);
    let fallback = null;
    if (!technical) for (const [key, rule] of Object.entries(ACTION_RULES)) {
      if (rule.captions.test(caption)) { fallback = { ...rule, key,
        source: "caption-fallback" }; break; }
    }
    const match = technical || fallback;
    const automationId = text(raw.automationId || raw.dataControlId);
    return {
      actionIdentity: automationId ? `bc:action:${automationId}` : null,
      automationId: automationId || null,
      actionType: match?.actionType || null,
      caption: caption || null,
      source: match?.source || null,
      evidence: [evidence("data-automation-id", automationId),
        evidence("observed-action-caption", caption)].filter(Boolean)
    };
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
    if (raw.reactInteractive === true) return { value: "interactiveSurface",
      quality: "strong", source: "observed-react-interactive-surface" };
    if (raw.pointerTarget === true && text(raw.accessibleName || raw.label)) {
      return { value: "interactiveSurface", quality: "partial",
        source: "observed-named-pointer-target" };
    }
    if (raw.ariaHasPopup === "listbox" || raw.ariaHasPopup === "grid") return { value: "lookup", quality: "strong", source: "aria-haspopup" };
    if (["input", "textarea"].includes(tag) || role === "textbox") return { value: "field", quality: "strong", source: role ? "role" : "element-name" };
    return { value: "unknownInteractiveControl", quality: "unknown", source: "fallback" };
  }
  function identify(raw = {}, options = {}) {
    const eventId = options.eventId || raw.id || "";
    const allEvidence = [];
    const pageIdentity = identifyPage(raw, options);
    const controlIdentity = identifyControl(raw);
    const fieldIdentity = identifyField(raw);
    const actionIdentity = identifyAction(raw);
    const page = {};
    if (text(raw.pageId)) { page.id = text(raw.pageId); allEvidence.push(evidence("route-page-parameter", raw.pageId)); }
    if (pageIdentity.pageObjectId) page.pageObjectId = pageIdentity.pageObjectId;
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
    const actionLike = raw.category === "action" ||
      ["button", "link", "interactiveSurface"].includes(classified.value);
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
      pageIdentity,
      controlIdentity,
      fieldIdentity,
      actionIdentity,
      entityContext: { entity: pageIdentity.entity,
        source: pageIdentity.source, evidence: clone(pageIdentity.evidence) },
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
  return { SCHEMA_VERSION, identify, identifyAction, identifyControl, identifyField,
    identifyPage, normalize };
});
