(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9KnowledgeCaptions = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  // What Business Central itself calls the pages, actions and fields of a knowledge rule, in every
  // registered language, and their AL names, which are the same in every language.
  //
  // A rule's hand-written patterns name a page, action or field in some languages. Its captions
  // here come from a caption table (the shape of document/bc-captions.json: locales, rows of
  // captions in locale order, and keys p|Page, a|Page|Action and f|Page|Field):
  // the keys whose English caption the rule's whole-caption patterns (^...$) match, or whose
  // captions they match in at least half of the languages. Actions and fields are looked for on
  // the rule's own pages and their subform; a rule without pages looks on every page and keeps
  // only the translations Business Central uses for at least a quarter of those captions, so a
  // rare translation on one page does not widen the rule. Nothing is translated by hand.
  //
  // scripts/build-knowledge-captions.js writes Microsoft's captions for every rule to
  // knowledge-packs/generated/bc-rule-captions.json; the apps a user adds under Settings (their .app files)
  // give captions for partner pages the same way when the packs are loaded.
  const VERSION = "1.0.0";
  const KINDS = Object.freeze([["page", "pagePatterns", "p"], ["action", "actionPatterns", "a"],
    ["field", "fieldPatterns", "f"]]);
  const MAX_PAGES = 25;
  const text = value => typeof value === "string" ? value : value == null ? "" : String(value);
  // Captions are compared without letter case, repeated spaces, an ampersand access key or a
  // closing period or ellipsis, as Business Central shows the same caption in different places.
  const comparable = value => text(value).replace(/&(?=\S)/gu, "").replace(/\s+/gu, " ").trim()
    .replace(/(?:\.\.\.|…|\.)$/u, "").trim().toLocaleLowerCase();
  const wholeCaption = pattern => typeof pattern === "string" && pattern.length > 2 &&
    pattern.startsWith("^") && pattern.endsWith("$") && !pattern.endsWith("\\$");
  const compile = patterns => (Array.isArray(patterns) ? patterns : []).filter(wholeCaption)
    .map(pattern => { try { return new RegExp(pattern, "iu"); } catch { return null; } })
    .filter(Boolean);

  // The table's keys by kind and page, built once per table.
  const indexes = new WeakMap();
  function indexOf(table) {
    if (!table || !Array.isArray(table.locales) || !Array.isArray(table.rows) ||
        !table.keys || typeof table.keys !== "object") return null;
    if (indexes.has(table)) return indexes.get(table);
    const index = { english: Math.max(0, table.locales.indexOf("en-US")), pages: new Map(),
      byPage: { a: new Map(), f: new Map() }, all: { a: [], f: [] } };
    for (const [key, row] of Object.entries(table.keys)) {
      const parts = key.split("|");
      const captions = table.rows[row];
      if (!Array.isArray(captions)) continue;
      if (parts[0] === "p" && parts.length === 2) index.pages.set(parts[1], captions);
      else if ((parts[0] === "a" || parts[0] === "f") && parts.length === 3) {
        const entry = { key, page: parts[1], name: parts[2], captions };
        const list = index.byPage[parts[0]];
        if (!list.has(parts[1])) list.set(parts[1], []);
        list.get(parts[1]).push(entry);
        index.all[parts[0]].push(entry);
      }
    }
    indexes.set(table, index);
    return index;
  }

  function matches(captions, patterns, english) {
    if (!patterns.length) return false;
    if (captions[english] && patterns.some(pattern => pattern.test(captions[english]))) return true;
    const present = captions.filter(Boolean);
    const found = present.filter(value => patterns.some(pattern => pattern.test(value))).length;
    return present.length > 1 && found * 2 >= present.length;
  }

  const unique = values => [...new Set(values.filter(Boolean))];

  // The captions and keys of one rule in one table, or null when the table names none of them.
  function ruleCaptions(rule, table) {
    const index = indexOf(table);
    const match = rule?.match;
    if (!index || !match) return null;
    const result = {};
    // A pattern that matches many pages, such as ^.+$, names no page of its own.
    const pagePatterns = compile(match.pagePatterns).filter(pattern => {
      let count = 0;
      for (const captions of index.pages.values()) {
        if (pattern.test(captions[index.english] || "") && ++count > MAX_PAGES) return false;
      }
      return true;
    });
    const pages = [];
    for (const [name, captions] of index.pages) {
      if (matches(captions, pagePatterns, index.english)) pages.push(name);
    }
    if (pages.length) {
      result.page = { keys: pages.map(name => `p|${name}`),
        captions: unique(pages.flatMap(name => index.pages.get(name))),
        pairs: pages.map(name => [`p|${name}`, index.pages.get(name)]) };
    }
    // A rule's actions and fields are on its pages and their subform (the lines).
    const scope = pages.length ? unique(pages.flatMap(name => [name, `${name} Subform`])) : null;
    for (const [kind, field, prefix] of KINDS.slice(1)) {
      const patterns = compile(match[field]);
      if (!patterns.length) continue;
      const candidates = scope
        ? scope.flatMap(name => index.byPage[prefix].get(name) || []) : index.all[prefix];
      const found = candidates.filter(entry => matches(entry.captions, patterns, index.english));
      if (!found.length) continue;
      if (scope) {
        result[kind] = { keys: unique(found.map(entry => entry.key)),
          captions: unique(found.flatMap(entry => entry.captions)),
          pairs: found.map(entry => [entry.key, entry.captions]) };
        continue;
      }
      // On every page: the AL names, and per language the translations Business Central uses
      // for at least a quarter of the found captions.
      const captions = [];
      table.locales.forEach((locale, position) => {
        const counts = new Map();
        for (const entry of found) {
          const value = entry.captions[position];
          if (value) counts.set(value, (counts.get(value) || 0) + 1);
        }
        for (const [value, count] of counts) if (count * 4 >= found.length) captions.push(value);
      });
      // An AL name stands for the rule on any page only when it has the rule's caption on every
      // page it is on: Action21 or Type is something else on other pages.
      const names = unique(found.map(entry => entry.name)).filter(name =>
        index.all[prefix].every(entry => entry.name !== name ||
          matches(entry.captions, patterns, index.english)));
      result[kind] = { keys: names.map(name => `${prefix}|*|${name}`),
        captions: unique(captions), pairs: [["*", unique(captions)]] };
    }
    return Object.keys(result).length ? result : null;
  }

  // Every rule's captions in a table, compact: { captions: { key: row }, rules: { packId:
  // { ruleId: { page: { keys } , action: { keys, captions? } } } } }. A page's, action's or
  // field's captions are kept once under its key; only captions found on every page are kept with
  // the rule itself.
  function packCaptions(packs, table) {
    const index = indexOf(table);
    const rules = {};
    const used = new Set();
    for (const pack of Array.isArray(packs) ? packs : []) {
      for (const rule of Array.isArray(pack?.rules) ? pack.rules : []) {
        const found = ruleCaptions(rule, table);
        if (!found) continue;
        const compact = {};
        for (const [kind, item] of Object.entries(found)) {
          const wildcard = !item.keys.length || item.keys.some(key => key.includes("|*|"));
          compact[kind] = wildcard ? { keys: item.keys, captions: item.captions } : { keys: item.keys };
          if (!wildcard) item.keys.forEach(key => used.add(key));
        }
        (rules[pack.packId] ||= {})[rule.ruleId] = compact;
      }
    }
    const captions = {};
    if (index) for (const key of [...used].sort()) captions[key] = table.rows[table.keys[key]];
    return { captions, rules };
  }

  // A rule's captions from the compact file, with every key's captions filled in.
  function expand(item, captions) {
    if (!item || typeof item !== "object") return null;
    const result = {};
    for (const [kind] of KINDS) {
      const entry = item[kind];
      if (!entry || !Array.isArray(entry.keys)) continue;
      const own = Array.isArray(entry.captions) ? entry.captions.map(text) : [];
      const pairs = entry.keys.filter(key => !String(key).includes("|*|"))
        .map(key => [text(key), Array.isArray(captions?.[key]) ? captions[key].map(text) : []]);
      if (own.length) pairs.push(["*", own]);
      result[kind] = { keys: entry.keys.map(text),
        captions: unique([...own, ...pairs.flatMap(([, values]) => values)]), pairs };
    }
    return Object.keys(result).length ? result : null;
  }

  const merge = (left, right) => {
    if (!left) return right;
    if (!right) return left;
    const result = { ...left };
    for (const [kind] of KINDS) {
      if (!right[kind]) continue;
      result[kind] = { keys: unique([...(left[kind]?.keys || []), ...right[kind].keys]),
        captions: unique([...(left[kind]?.captions || []), ...right[kind].captions]),
        pairs: [...(left[kind]?.pairs || []), ...(right[kind].pairs || [])] };
    }
    return result;
  };

  // The packs with each rule's captions attached as rule.bcCaptions (Microsoft's, from the built
  // file) and rule.appCaptions (from the user's own apps). The packs given are not changed.
  function attach(packs, { microsoft = null, apps = [] } = {}) {
    const tables = (Array.isArray(apps) ? apps : []).map(app => app?.captions).filter(Boolean);
    const generated = microsoft?.rules && typeof microsoft.rules === "object" ? microsoft.rules : {};
    return (Array.isArray(packs) ? packs : []).map(pack => {
      if (!pack || !Array.isArray(pack.rules)) return pack;
      const own = generated[pack.packId] || {};
      let changed = false;
      const rules = pack.rules.map(rule => {
        const official = expand(own[rule?.ruleId], microsoft?.captions);
        const fromApps = tables.reduce((found, table) => merge(found, ruleCaptions(rule, table)), null);
        if (!official && !fromApps) return rule;
        changed = true;
        return { ...rule, ...(official ? { bcCaptions: official } : {}),
          ...(fromApps ? { appCaptions: fromApps } : {}) };
      });
      return changed ? { ...pack, rules } : pack;
    });
  }

  // Lookup sets per rule, built once per rule object.
  const lookups = new WeakMap();
  function lookupOf(rule) {
    if (lookups.has(rule)) return lookups.get(rule);
    const lookup = {};
    for (const [kind] of KINDS) {
      const sources = [rule.bcCaptions?.[kind], rule.appCaptions?.[kind]].filter(Boolean);
      if (!sources.length) continue;
      // Each caption with the pages it is Business Central's caption on ("*": any page). A line's
      // subform counts as its document's page.
      const pagesOf = new Map();
      for (const [key, values] of sources.flatMap(item => item.pairs ||
        [["*", item.captions || []]])) {
        const page = key === "*" ? "*" : pageOfKey(key);
        for (const value of values || []) {
          const caption = comparable(value);
          if (!caption) continue;
          if (!pagesOf.has(caption)) pagesOf.set(caption, new Set());
          pagesOf.get(caption).add(page);
        }
      }
      lookup[kind] = { keys: new Set(sources.flatMap(item => item.keys || [])), pagesOf };
    }
    lookups.set(rule, lookup);
    return lookup;
  }

  const pageOfKey = key => String(key).split("|")[1]?.replace(/ Subform$/u, "") || "*";

  // Whether a recorded caption is one of Business Central's own captions for the rule's page,
  // action or field, in any registered language. An action's or field's caption counts only on
  // the pages it belongs to, when the step's page is one of the rule's (pages, from taskPages):
  // in German, Lagerkommissionierung erstellen is Create Inventory Pick on the project card but
  // Create Warehouse Pick on the project list.
  function captionMatches(rule, kind, caption, pages = null) {
    if (!rule || typeof rule !== "object" || !text(caption).trim()) return false;
    const found = lookupOf(rule)[kind]?.pagesOf.get(comparable(caption));
    if (!found) return false;
    if (kind === "page" || !pages?.size || found.has("*")) return true;
    return [...found].some(page => pages.has(page));
  }

  // The rule's pages a step was recorded on: by its page's AL name, else by its page caption.
  function taskPages(rule, task, pageCaption) {
    const pages = new Set();
    const lookup = rule && typeof rule === "object" ? lookupOf(rule).page : null;
    if (!lookup) return pages;
    const key = taskKeys(task, "page")[0];
    if (key && lookup.keys.has(key)) pages.add(pageOfKey(key));
    else for (const page of lookup.pagesOf.get(comparable(pageCaption)) || []) pages.add(page);
    return pages;
  }

  // Whether the AL identity a step was recorded with (its caption keys, such as
  // a|Sales Order|Release) is the rule's page, action or field, in whatever language.
  function keyMatches(rule, kind, keys) {
    if (!rule || typeof rule !== "object") return false;
    const known = lookupOf(rule)[kind]?.keys;
    if (!known?.size) return false;
    return (Array.isArray(keys) ? keys : [keys]).some(key => {
      const value = text(key);
      if (!value) return false;
      if (known.has(value)) return true;
      const parts = value.split("|");
      return parts.length === 3 && known.has(`${parts[0]}|*|${parts[2]}`);
    });
  }

  // The caption keys of a recorded step (document/bc-caption-translation.js keysFromEvents).
  function taskKeys(task, kind) {
    const keys = task?.semanticActionModel?.captionKeys || task?.captionKeys || {};
    if (kind === "action") return [keys.action, ...(Array.isArray(keys.actions) ? keys.actions : [])];
    return [keys[kind]];
  }

  // The apps the user added under Settings, with their caption tables (bug-report/app-errors.js
  // readUserApp), from the extension's local storage. None when storage cannot be read.
  const APPS_KEY = () => globalThis.T9StorageKeys?.KNOWN_APP_ERRORS_KEY || "t9_known_app_errors";
  async function loadUserApps(storage = globalThis.chrome?.storage?.local) {
    if (!storage?.get) return [];
    try {
      const stored = await storage.get(APPS_KEY());
      const apps = stored?.[APPS_KEY()]?.apps;
      return Array.isArray(apps) ? apps.filter(app => app?.captions?.keys) : [];
    } catch {
      return [];
    }
  }

  return Object.freeze({ VERSION, comparable, ruleCaptions, packCaptions, attach, captionMatches,
    keyMatches, taskKeys, taskPages, loadUserApps, appsStorageKey: APPS_KEY });
});
