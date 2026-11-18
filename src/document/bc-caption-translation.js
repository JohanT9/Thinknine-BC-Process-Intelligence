(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9BCCaptionTranslation = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  // Business Central's own names of pages, fields and actions in another language.
  //
  // A step keeps the AL identity of the field, action and page it was recorded on (captionKeys,
  // from the recording's events), and bc-captions.json (scripts/build-bc-captions.js) holds what
  // Microsoft's Base Application calls each of them in every registered language. A recorded
  // caption is replaced only when it is that field's, action's or page's caption in one of those
  // languages: a caption the table does not know, a page changed by an extension or a field
  // personalized by the user keeps what Business Central showed.
  // Actions the Business Central client adds to every page, which are not in the Base
  // Application: their captions from the web client's language resources
  // (Microsoft.Dynamics.Framework.Resource.js, as in engine/bc-client-captions.js).
  const CLIENT_ACTIONS = Object.freeze({
    // CreateActionCaption: the action that starts a new record.
    New: Object.freeze({ "en-US": "New", "sv-SE": "Ny", "fr-FR": "Créer", "de-DE": "Neu",
      "es-ES": "Nuevo", "da-DK": "Ny", "fi-FI": "Uusi", "nb-NO": "Ny" })
  });
  let table = null;
  let localeIndex = new Map();
  // The rows of a field's or action's AL name on any page ("f|Direct Unit Cost"), for a control on
  // a page the table does not have, such as a partner app's dialog showing a standard field.
  let byName = new Map();

  function load(data) {
    if (!data || data.schema !== 1 || !Array.isArray(data.locales) || !Array.isArray(data.rows) ||
        !data.keys || typeof data.keys !== "object") {
      table = null; localeIndex = new Map(); byName = new Map();
      return false;
    }
    table = data;
    localeIndex = new Map(data.locales.map((locale, index) => [locale, index]));
    byName = new Map();
    for (const [key, row] of Object.entries(data.keys)) {
      const match = /^([fa])\|[^|]*\|(.+)$/u.exec(key);
      if (!match) continue;
      const name = `${match[1]}|${match[2]}`;
      if (!byName.has(name)) byName.set(name, new Set());
      byName.get(name).add(row);
    }
    return true;
  }

  const loaded = () => Boolean(table);
  // Captions are compared as Business Central shows them, letter case included: the record type
  // inköpsorder in a sentence is not the page Inköpsorder.
  const comparable = value => String(value ?? "").replace(/\s+/gu, " ").trim();

  // The AL identity of a recorded event as caption keys: the page the control is on (the
  // innermost page of its path), and the field or action.
  function keysFromIdentity(identity) {
    if (!identity || typeof identity !== "object" || !Array.isArray(identity.path)) return {};
    const page = [...identity.path].reverse().map(entry => entry?.page)
      .find(value => typeof value === "string" && value && !value.startsWith("lookup:"));
    if (!page) return {};
    const result = { page: `p|${page}` };
    // A field: focused or changed, its lookup button, or a row of its lines.
    if (["field", "control", "row"].includes(identity.kind) && identity.field) {
      result.field = `f|${page}|${identity.field}`;
    }
    // An action, or a group of actions such as a promoted category or a menu.
    if (["action", "menu"].includes(identity.kind) && identity.action) {
      result.action = `a|${page}|${identity.action}`;
    }
    // New is the client's own action on every page (Control_New, or a system action).
    if (["action", "system"].includes(identity.kind) && CLIENT_ACTIONS[identity.operation]) {
      result.action = `c|${identity.operation}`;
    }
    return result;
  }

  // The caption keys of a step from the events it was recorded from: the last field and the
  // last action named, and the page of the last of them.
  function keysFromEvents(events = []) {
    const result = {};
    const actions = [];
    for (const event of events) {
      const identity = event?.alIdentity || event?.raw?.alIdentity;
      const keys = keysFromIdentity(identity);
      // A value chosen in a field's lookup list ("lookup:Buy-from Vendor No.") is that field's, on
      // the page the field is on.
      const lookup = Array.isArray(identity?.path) && /^lookup:(.+)$/u.exec(identity.path[0]?.page || "");
      if (lookup && result.page) result.field = `f|${result.page.slice(2)}|${lookup[1]}`;
      if (keys.field) result.field = keys.field;
      if (keys.action) { result.action = keys.action; if (!actions.includes(keys.action)) actions.push(keys.action); }
      if (keys.page) result.page = keys.page;
    }
    // Every action of a step that went through a menu (Line, then Manual Price).
    if (actions.length > 1) result.actions = actions;
    return result;
  }

  // The caption in the language, or the recorded caption itself when it is not the known
  // caption of that key in any language.
  function translate(recorded, key, locale) {
    const text = String(recorded ?? "");
    if (!key || !text.trim()) return text;
    const wanted = comparable(text);
    const client = /^c\|/u.test(key) ? CLIENT_ACTIONS[key.slice(2)] : null;
    if (client) {
      return client[locale] && Object.values(client).some(caption => comparable(caption) === wanted)
        ? client[locale] : text;
    }
    if (!table) return text;
    const target = localeIndex.get(locale);
    if (target === undefined) return text;
    const known = table.keys[key];
    if (known !== undefined) {
      const row = table.rows[known];
      return row[target] && row.some(caption => caption && comparable(caption) === wanted) ? row[target] : text;
    }
    // A control the table does not have on this page: the same AL name on Microsoft's pages, when
    // every one of them that shows this caption names it the same way in the language.
    const name = /^([fa])\|[^|]*\|(.+)$/u.exec(key);
    const rows = name ? [...(byName.get(`${name[1]}|${name[2]}`) || [])].map(index => table.rows[index])
      .filter(row => row[target] && row.some(caption => caption && comparable(caption) === wanted)) : [];
    const targets = new Set(rows.map(row => row[target]));
    return targets.size === 1 ? [...targets][0] : text;
  }

  // A described step (engine/step-text.js) with its captions in the language. Only the slots
  // that name a Business Central control are translated; values and records never are.
  function translateDescriptor(descriptor, captionKeys, locale) {
    if (!table || !descriptor || !captionKeys || typeof captionKeys !== "object") return descriptor;
    const result = { ...descriptor };
    let changed = false;
    const swap = (slot, key) => {
      if (typeof result[slot] !== "string" || !key) return;
      const translated = translate(result[slot], key, locale);
      if (translated !== result[slot]) { result[slot] = translated; changed = true; }
    };
    swap("field", captionKeys.field);
    swap("action", captionKeys.action);
    swap("page", captionKeys.page);
    if (Array.isArray(result.path) && result.path.length && captionKeys.action) {
      const last = translate(result.path.at(-1), captionKeys.action, locale);
      if (last !== result.path.at(-1)) { result.path = [...result.path.slice(0, -1), last]; changed = true; }
    }
    return changed ? result : descriptor;
  }

  return Object.freeze({ load, loaded, keysFromIdentity, keysFromEvents, translate, translateDescriptor });
});
