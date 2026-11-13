// Reads the AL identity of what the user points at or focuses in Business Central, so that a
// recording can be turned into a Page Scripting file (document/page-script-export.js).
//
// The web client keeps the AL names of pages, parts, repeaters, fields and actions in its own
// JavaScript objects, not in the HTML, so this script runs in the page's own world
// (manifest: "world": "MAIN"). On pointerdown, focusin and Enter/Space it reads, without
// calling any function of the client and without changing anything:
//   - the control behind the element: element._adapter.$logicalControl and its _parent chain
//     (designName is the AL name; name can be a number);
//   - for an action, the client's control registry entry named by the React prop
//     data-control-id, or by the ribbon's telemetry name; an action reference (actionref) names
//     the action it points to in actionReference.targetName;
//   - for a dialog, the identifier of its form (attachedForm.controlIdentifier).
// The result is handed to the content script as a string in a CustomEvent on the element,
// which is synchronous, so it is there before the content script records the click or the
// field change. These are internal structures of the client: anything not found is left out,
// and every failure is swallowed, so Business Central works exactly as without the extension.
(function () {
  "use strict";
  const MARK = "__bcProcessStudioAlIdentity";
  if (window[MARK]) return;
  try { Object.defineProperty(window, MARK, { value: true }); } catch { return; }

  const EVENT = "bcps-al-identity";
  const VERSION = 1;
  const GUID = /^\{?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\}?$/iu;
  const NUMERIC = /^\d+$/u;

  // Own data properties only: getters are never run.
  function own(object, key) {
    if (!object || (typeof object !== "object" && typeof object !== "function")) return undefined;
    try {
      const property = Object.getOwnPropertyDescriptor(object, key);
      return property && "value" in property ? property.value : undefined;
    } catch { return undefined; }
  }
  const unbox = value => { const inner = own(value, "value_"); return inner !== undefined ? inner : value; };
  const text = value => typeof value === "string" ? value.slice(0, 200) : "";
  const kindOf = object => { try { return String(object?.constructor?.name || ""); } catch { return ""; } };
  // The AL name: designName unless it is a number or a GUID, which system controls carry.
  const alName = control => {
    const name = text(own(control, "designName"));
    return name && !NUMERIC.test(name) && !GUID.test(name) ? name : "";
  };
  const captionOf = control => text(unbox(own(control, "_rawCaption"))).replace(/&/gu, "").trim();

  function ancestry(control) {
    const list = [];
    for (let current = control, n = 0; current && typeof current === "object" && n < 24;
      current = unbox(own(current, "_parent")), n += 1) list.push(current);
    return list;
  }

  // Page Scripting addresses a control from the outside in: page › part › page › repeater.
  // A form is the root of the chain or an object of the root's kind with an AL name; the
  // control holding a nested form is its part; the control above a repeater row is the
  // repeater. Groups, FastTabs and command bars are not part of the address.
  function container(chain) {
    const root = chain[chain.length - 1];
    const rootKind = kindOf(root);
    const isForm = control => control === root || (Boolean(rootKind) && kindOf(control) === rootKind &&
      Boolean(alName(control)) && own(control, "actionReference") === undefined);
    const rowLike = control => control && /RepeaterRow/iu.test(
      `${text(own(control, "name"))} ${text(own(control, "designName"))} ${kindOf(control)}`);
    const path = [];
    for (let index = chain.length - 1; index >= 1; index -= 1) {
      const control = chain[index];
      const inner = chain[index - 1];
      if (isForm(control)) path.push({ page: alName(control) || null });
      else if (inner && isForm(inner)) path.push({ part: alName(control) || text(own(control, "designName")) });
      else if (rowLike(inner)) path.push({ repeater: text(own(control, "designName")) || alName(control) });
    }
    return path;
  }
  const trace = chain => chain.slice(0, 10).map(control => ({ d: text(own(control, "designName")),
    n: text(own(control, "name")), k: kindOf(control) }));

  function logicalControlOf(element) {
    for (let current = element, level = 0; current && current.nodeType === 1 && level < 30;
      current = current.parentElement, level += 1) {
      const control = own(own(current, "_adapter"), "$logicalControl");
      if (control) return { control, element: current };
    }
    return null;
  }

  // The client's registry of controls, from any control in this document.
  const registries = new WeakMap();
  function registryOf(doc, near) {
    const fromControl = control => own(own(own(control, "_context"), "controlRegistry"), "controlLookupById");
    const nearby = near ? fromControl(near) : undefined;
    if (nearby) return nearby;
    if (registries.has(doc)) return registries.get(doc);
    let found = null;
    const elements = doc.getElementsByTagName("*");
    for (let index = 0; index < elements.length && index < 20000 && !found; index += 1) {
      found = fromControl(own(own(elements[index], "_adapter"), "$logicalControl")) || null;
    }
    if (found) registries.set(doc, found);
    return found;
  }
  // Every registry in the document: each open page may keep its own.
  function registriesOf(doc) {
    const fromControl = control => own(own(own(control, "_context"), "controlRegistry"), "controlLookupById");
    const found = new Set();
    const elements = doc.getElementsByTagName("*");
    for (let index = 0; index < elements.length && index < 20000 && found.size < 20; index += 1) {
      const registry = fromControl(own(own(elements[index], "_adapter"), "$logicalControl"));
      if (registry) found.add(registry);
    }
    return [...found];
  }
  const registryGet = (registry, id) => registry instanceof Map ? registry.get(id) : own(registry, id);
  function registryFind(registry, name) {
    const values = registry instanceof Map ? registry.values()
      : Object.getOwnPropertyNames(registry).map(key => own(registry, key));
    for (const control of values) if (control && own(control, "name") === name) return control;
    return null;
  }

  // What the React components above the element say about it.
  function reactHints(element) {
    const hints = { controlId: "", telemetry: null };
    for (let current = element, level = 0; current && current.nodeType === 1 && level < 8;
      current = current.parentElement, level += 1) {
      const attribute = current.getAttribute?.("data-control-id");
      if (attribute && !hints.controlId) hints.controlId = attribute;
      let keys = [];
      try { keys = Object.getOwnPropertyNames(current); } catch {}
      for (const key of keys) {
        if (!key.startsWith("__reactFiber$")) continue;
        for (let fiber = own(current, key), up = 0; fiber && up < 40; fiber = own(fiber, "return"), up += 1) {
          const props = own(fiber, "pendingProps");
          const id = own(props, "data-control-id");
          if (typeof id === "string" && id && !hints.controlId) hints.controlId = id;
          const telemetry = own(own(props, "keytipProps"), "telemetryData");
          if (telemetry && !hints.telemetry) hints.telemetry = telemetry;
          if (hints.controlId && hints.telemetry) return hints;
        }
      }
    }
    return hints;
  }

  // A system action (New line, Delete line) has a GUID for a name. Its plain properties are
  // kept so the operation can be recognised.
  function plainProperties(control) {
    const out = {};
    let count = 0;
    let keys = [];
    try { keys = Object.getOwnPropertyNames(control); } catch {}
    for (const key of keys) {
      const value = unbox(own(control, key));
      if (value === null || ["string", "number", "boolean"].includes(typeof value)) {
        out[key] = typeof value === "string" ? value.slice(0, 80) : value;
        if (++count >= 40) break;
      }
    }
    return out;
  }
  function operationOf(properties) {
    for (const [key, value] of Object.entries(properties)) {
      if (!/system|operation|actiontype|invoke/iu.test(key)) continue;
      const word = String(value);
      for (const operation of ["New", "Delete", "Edit", "View", "Refresh"]) {
        if (word.toLowerCase() === operation.toLowerCase()) return operation;
      }
    }
    return "";
  }

  // A menu item that names no control, such as a line's own ⋯ menu: the registry's action
  // with exactly this caption, in the lines the user pointed at last when there are several.
  let lastLines = "";
  function byCaption(registry, element) {
    const item = element.closest?.('[role="menuitem"],[role="menuitemcheckbox"]');
    const label = (item?.getAttribute?.("aria-label") || item?.textContent || "").replace(/\s+/gu, " ").trim();
    if (!item || !label) return null;
    const values = registry instanceof Map ? [...registry.values()]
      : Object.getOwnPropertyNames(registry).map(key => own(registry, key));
    const found = values.filter(control => control && captionOf(control) === label &&
      !own(control, "_children")?.length);
    if (!found.length) return null;
    const inLines = found.filter(control => JSON.stringify(container(ancestry(control))) === lastLines);
    const choice = inLines.length ? inLines : found;
    const names = new Set(choice.map(control => text(own(control, "name"))));
    return names.size === 1 ? choice[0] : null;
  }

  function actionIdentity(element, near) {
    const hints = reactHints(element);
    const registry = registryOf(element.ownerDocument, near);
    if (!registry) return null;
    let control = hints.controlId ? registryGet(registry, hints.controlId) : null;
    const telemetryName = text(own(hints.telemetry, "Control name"));
    if (!control && telemetryName) control = registryFind(registry, telemetryName);
    let matchedBy = "";
    if (!control) {
      // The registry of the page used last first, then every other one in the document.
      for (const candidate of [registry, ...registriesOf(element.ownerDocument).filter(item => item !== registry)]) {
        control = byCaption(candidate, element);
        if (control) { matchedBy = "caption"; break; }
      }
    }
    if (!control) return null;
    const reference = own(control, "actionReference");
    const chain = ancestry(control);
    const name = text(own(reference, "targetName")) || alName(control);
    const opensMenu = Boolean(element.closest?.('[aria-haspopup="true"],[aria-haspopup="menu"]')) ||
      text(own(hints.telemetry, "Control type name")) === "GroupControl";
    const identity = { kind: "action", path: container(chain), caption: captionOf(control),
      trace: trace(chain), ...(matchedBy ? { matchedBy } : {}) };
    if (opensMenu && !reference) return { ...identity, kind: "menu", action: name };
    if (name) {
      identity.action = name;
      if (name === "Control_New") identity.operation = "New";
      return identity;
    }
    const properties = plainProperties(control);
    return { ...identity, kind: "system", operation: operationOf(properties), properties };
  }

  // A dialog: its form's identifier, title and the button pressed.
  const BUTTONS = [
    ["Yes", /^(ja|yes|oui|sí|si|kyllä)$/iu], ["No", /^(nej|no|non|nein|ei|nei)$/iu],
    ["OK", /^(ok|aceptar)$/iu], ["Cancel", /^(avbryt|cancel|annuler|abbrechen|cancelar|annuller|peruuta|stäng|close)$/iu]];
  function dialogIdentity(element, dialog) {
    let form = null;
    const candidates = [];
    for (let current = element; current && current !== dialog.parentElement; current = current.parentElement) {
      candidates.push(current);
    }
    const inside = dialog.getElementsByTagName("*");
    for (let index = 0; index < inside.length && index < 400; index += 1) candidates.push(inside[index]);
    for (const candidate of candidates) {
      const children = own(own(own(candidate, "_adapter"), "$buildController"), "_childAdapters");
      const items = own(children, "items") || (Array.isArray(children) ? children : []);
      for (const item of Array.isArray(items) ? items : []) {
        const attached = own(own(item, "containerController"), "attachedForm");
        if (own(attached, "controlIdentifier")) { form = attached; break; }
      }
      if (form) break;
    }
    if (!form) return null;
    const button = element.closest?.("button,[role=button]");
    const label = (button?.getAttribute?.("aria-label") || button?.textContent || "").trim();
    const operation = BUTTONS.find(([, pattern]) => pattern.test(label))?.[0] || "";
    const heading = dialog.querySelector?.('[role="heading"],h1,h2')?.textContent?.trim() || "";
    return { kind: "dialog", page: alName(form) || null, automationId: text(own(form, "controlIdentifier")),
      caption: captionOf(form) || heading.slice(0, 120), operation, button: label.slice(0, 60) };
  }

  function rowIndexOf(element) {
    const row = element.closest?.('tr,[role="row"]');
    if (!row?.parentElement) return undefined;
    const rows = [...row.parentElement.children].filter(item =>
      item.matches?.('tr,[role="row"]') && !item.querySelector?.('th,[role="columnheader"]'));
    const index = rows.indexOf(row);
    return index >= 0 ? index : undefined;
  }

  let lastNear = null; // the control used last, for a menu item that has none of its own
  const EDITABLE = 'input,textarea,select,[contenteditable="true"],[role="textbox"],[role="combobox"],[role="spinbutton"]';
  function identify(element) {
    const dialog = element.closest?.('[role="dialog"],[role="alertdialog"],[aria-modal="true"]');
    const found = logicalControlOf(element);
    const near = found?.control || lastNear;
    if (found) lastNear = found.control;
    const clickable = element.closest?.('button,a,[role="button"],[role="menuitem"],[role="menuitemcheckbox"],[role="link"]');
    if (dialog && clickable && !element.closest?.(EDITABLE)) {
      const fromDialog = dialogIdentity(element, dialog);
      const action = actionIdentity(element, near);
      if (action && action.kind === "action" && !GUID.test(action.action || "")) return action;
      if (fromDialog) return fromDialog;
    }
    if (clickable && !element.closest?.(EDITABLE)) {
      const action = actionIdentity(element, near);
      if (action) return action;
    }
    if (!found) return null;
    const chain = ancestry(found.control);
    const editable = Boolean(element.closest?.(EDITABLE)) || element.matches?.(EDITABLE);
    const field = alName(found.control);
    const identity = { path: container(chain), trace: trace(chain), caption: captionOf(found.control) };
    if (editable && field) return { ...identity, kind: "field", field };
    const rowIndex = rowIndexOf(element);
    if (rowIndex !== undefined) {
      // The value in the cell clicked, such as the number of the record chosen in a lookup.
      const cell = element.closest?.('td,[role="gridcell"]');
      const value = (cell?.textContent || "").replace(/s+/gu, " ").trim().slice(0, 120);
      return { ...identity, kind: "row", field, rowIndex, ...(value ? { value } : {}) };
    }
    return field ? { ...identity, kind: "control", field } : { ...identity, kind: "control" };
  }

  function announce(element) {
    if (!element || element.nodeType !== 1) return;
    let identity = null;
    try { identity = identify(element); } catch { identity = null; }
    if (!identity) return;
    if (Array.isArray(identity.path) && identity.path.some(entry => "repeater" in entry)) {
      lastLines = JSON.stringify(identity.path.filter(entry => !("repeater" in entry)));
    }
    try {
      element.dispatchEvent(new CustomEvent(EVENT, { detail: JSON.stringify({ v: VERSION, ...identity }) }));
    } catch {}
  }

  window.addEventListener("pointerdown", event => {
    if (event.button === 0) announce(event.composedPath?.()[0] || event.target);
  }, true);
  window.addEventListener("focusin", event => announce(event.target), true);
  window.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") announce(document.activeElement);
  }, true);
})();
