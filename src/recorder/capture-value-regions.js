(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9CaptureValueRegions = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  // Where a screenshot shows values a bug report may mask: amounts, names and contact
  // details. They are recognized by the field caption or column header in the interface
  // languages Business Central is used in; codes, groups, numbers and percentages are not
  // amounts. A report covers these regions only when it masks values.
  const KINDS = Object.freeze([
    ["contact", /e-?mail|e-post|courriel|correo|sähköposti|phone|telefon|téléphone|teléfono|puhelin|mobil/iu],
    ["amount", /amount|price|cost|balance|total|\bvat\b|discount|belopp|\bpris|kostnad|saldo|summa|\bmoms|rabatt|betrag|preis|kosten|mwst|\bust\b|montant|prix|coût|solde|remise|\btva\b|importe|precio|coste|descuento|\biva\b|beløb|beløp|rabat|\bmva\b|hinta|kustannus|alennus|\balv\b/iu],
    ["name", /\bname\b|namn|\bnom\b|nombre|\bnavn\b|\bnimi\b|contact|kontakt|contacto|yhteyshenkilö/iu]]);
  const NOT_AMOUNT = /group|code|posting|grupp|kod|gruppe|groupe|grupo|ryhmä|koodi|%|\bno\.|\bnr\b|number|nummer|numéro|número|numero|identifier|registration/iu;
  function kindOf(caption) {
    const text = String(caption || "").replace(/\s+/gu, " ").trim();
    if (!text) return null;
    for (const [kind, pattern] of KINDS) {
      if (!pattern.test(text)) continue;
      if (kind === "amount" && NOT_AMOUNT.test(text)) continue;
      return kind;
    }
    return null;
  }

  const FIELDS = 'input:not([type=checkbox]):not([type=radio]):not([type=hidden]):not([type=button]):not([type=submit]):not([type=image]),textarea,select,[role="textbox"],[role="gridcell"],[aria-labelledby]';
  const clean = value => String(value || "").replace(/\s+/gu, " ").trim();
  function valueOf(element) {
    if ("value" in element && typeof element.value === "string" &&
      ["INPUT", "TEXTAREA", "SELECT"].includes(element.tagName)) return clean(element.value);
    return clean(element.innerText ?? element.textContent);
  }
  function labelledText(element, doc) {
    return clean((element.getAttribute("aria-labelledby") || "").split(/\s+/u).filter(Boolean)
      .map(id => doc.getElementById(id)).filter(Boolean)
      .map(node => node.getAttribute?.("aria-label") || node.textContent).join(" "));
  }
  // A grid cell's caption is its column header.
  function columnCaption(element) {
    const cell = element.closest?.('[role="gridcell"],td');
    if (!cell) return "";
    const colIndex = cell.getAttribute("aria-colindex");
    const grid = cell.closest('[role="grid"],table');
    if (!grid) return "";
    let header = colIndex ? grid.querySelector(`[role="columnheader"][aria-colindex="${colIndex}"]`) : null;
    if (!header && Number.isInteger(cell.cellIndex) && cell.cellIndex >= 0) {
      const headers = grid.querySelectorAll('thead th,[role="columnheader"]');
      header = headers[cell.cellIndex] || null;
    }
    return header ? clean(header.getAttribute("title") || header.getAttribute("aria-label") ||
      header.getAttribute("abbr") || header.textContent) : "";
  }
  function captionOf(element, doc) {
    const column = columnCaption(element);
    if (column) return column;
    let label = "";
    if (element.id) {
      try { label = clean(doc.querySelector(`label[for="${CSS.escape(element.id)}"]`)?.textContent); }
      catch { label = ""; }
    }
    // A value read from its own aria-label would be the value, not its caption.
    return labelledText(element, doc) || label || clean(element.getAttribute("title"));
  }
  // The record caption in a page header names the customer or vendor ("101252 · Liba Bröd AB").
  function recordCaptions(doc) {
    return [...doc.querySelectorAll('[role="heading"],h1,h2')].filter(node =>
      /\s[·•–-]\s\S/u.test(clean(node.textContent)) && clean(node.textContent).length < 160);
  }
  // Commands, menus, lists and popups are not values, even when labelled like a field.
  const NOT_VALUES = '[data-t9-ignore],[data-bcps-overlay],button,a[href],[role="button"],[role="link"],' +
    '[role="menu"],[role="menubar"],[role="menuitem"],[role="toolbar"],[role="tab"],[role="tablist"],' +
    '[role="listbox"],[role="option"],[role="tooltip"],[role="columnheader"],[role="img"],img,label';
  const CONTROLS = ["INPUT", "TEXTAREA", "SELECT"];
  // An element the user can see: popups, lists and callouts that are kept on the page but
  // hidden with opacity or visibility still have a position.
  function shown(element) {
    if (typeof element.checkVisibility === "function") {
      return element.checkVisibility({ opacityProperty: true, visibilityProperty: true,
        contentVisibilityAuto: true });
    }
    return true;
  }
  // A value of the kind the caption names. An amount is a number; a name or contact detail is
  // one short line. Anything else under such a caption (a tile, a list, a description) is not.
  function valueFits(kind, value) {
    if (!value || value.length > 80 || /\n/u.test(value)) return false;
    if (kind === "amount") return /\d/u.test(value) && /^[-−+(]?[\d\s\u00a0\u202f.,'’]+\)?(\s?[A-Z]{3}|\s?%)?$/u.test(value);
    return /[\p{L}\d@]/u.test(value);
  }
  // Regions larger than a field would cover more than the value; they are left to the user.
  const fieldSized = bounds => bounds.width <= 0.45 && bounds.height <= 0.08;
  // Regions as shares of the tab's viewport, measured by the caller's viewport function.
  function collect(doc, measure, limit = 400) {
    const regions = [], seen = new Set();
    const add = (element, kind) => {
      if (regions.length >= limit || seen.has(element)) return;
      seen.add(element);
      const bounds = measure(element);
      if (!bounds || !(bounds.width > 0) || !(bounds.height > 0) || !fieldSized(bounds)) return;
      if (bounds.x >= 1 || bounds.y >= 1 || bounds.x + bounds.width <= 0 ||
        bounds.y + bounds.height <= 0) return;
      const overlap = region => Math.max(0, Math.min(region.x + region.width, bounds.x + bounds.width) -
        Math.max(region.x, bounds.x)) * Math.max(0, Math.min(region.y + region.height,
        bounds.y + bounds.height) - Math.max(region.y, bounds.y));
      if (regions.some(region => overlap(region) >= 0.8 * bounds.width * bounds.height)) return;
      regions.push({ x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height, kind });
    };
    for (const element of doc.querySelectorAll(FIELDS)) {
      if (element.closest?.(NOT_VALUES)) continue;
      const control = CONTROLS.includes(element.tagName);
      // A cell or labelled group holding a field is measured through that field; a
      // labelled element that holds other elements is a group, not a value.
      if (!control && element.querySelector(FIELDS)) continue;
      if (!control && element.getAttribute("role") !== "gridcell" &&
        element.getAttribute("role") !== "textbox" && element.children?.length > 1) continue;
      const value = valueOf(element);
      if (!value || !shown(element)) continue;
      const caption = captionOf(element, doc);
      // A caption is a field name; a long text is a description or a group, and an element
      // labelled by its own text is a caption, not a value.
      if (!caption || caption.length > 60 || caption === value) continue;
      const kind = kindOf(caption);
      if (kind && valueFits(kind, value)) add(element, kind);
    }
    for (const heading of recordCaptions(doc)) add(heading, "name");
    return regions;
  }
  return { kindOf, collect, captionOf };
});
