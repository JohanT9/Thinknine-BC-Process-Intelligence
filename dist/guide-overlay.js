// Visa mig in Business Central: outlines the field or button of the guide's current step and
// tells the guide panel (ui/guide-panel.js) when the user has done the step.
//
// The panel connects to every frame of the Business Central tab and names the step's target.
// Each frame looks for it: a field by the AL name Business Central writes in the attribute
// controlname, an action through recorder/al-identity-capture.js (which marks its button), and
// the recorded caption as a fallback. A frame that finds it draws a ring around it, which does
// not take clicks, and reports every second whether it sees it. A click on the button, or a new
// value in the field, completes the step. Nothing in Business Central is changed or clicked.
(function () {
  "use strict";
  if (globalThis.__bcProcessStudioGuide) return;
  globalThis.__bcProcessStudioGuide = true;

  const PORT = "t9-guide";
  const FIND = "bcps-guide-find";
  const MARK = "data-bcps-guide";
  const IDENTITY = "bcps-al-identity";
  const EDITABLE = 'input,textarea,select,[contenteditable="true"],[role="textbox"],[role="combobox"],[role="spinbutton"],[role="checkbox"],[role="switch"]';
  const CLICKABLE = 'button,a,[role="button"],[role="menuitem"],[role="menuitemcheckbox"],[role="tab"]';
  // A field's lookup list, a page of its own whose columns can share a field's AL name (the
  // vendor list's Nr is No., as the item number on a line).
  const LOOKUP = '[controlname^="Lookupform"]';
  const inLookup = item => Boolean(item?.closest?.(LOOKUP));
  const frame = Math.random().toString(36).slice(2);
  let port = null;
  let step = null;      // { token, target }
  let element = null;   // what is outlined
  let ring = null;
  let timer = 0;
  let lastActionSearch = 0;
  let editing = null;   // { element, value } of the step's field while it has focus
  let watching = null;  // { element, value } of the outlined field when it was found
  let touched = false;  // whether the user has typed or clicked here since the step was shown

  const clean = value => String(value || "").replace(/&/gu, "").replace(/\s+/gu, " ").trim().toLocaleLowerCase();
  function shown(item) {
    if (!item?.isConnected) return false;
    try {
      const box = item.getBoundingClientRect();
      return box.width > 0 && box.height > 0 && (item.checkVisibility?.() ?? true) &&
        (ignoreCover || !covered(item, box));
    } catch { return false; }
  }
  let ignoreCover = false; // set while looking for a target beneath an open window
  // Whether something else lies on top of it, as the card Business Central opens over the list
  // it came from: the list's buttons and fields stay in the page beneath the card. Only what is
  // inside the window can be tested; a field further down the page counts as shown.
  function covered(item, box) {
    const points = [[box.left + box.width / 2, box.top + box.height / 2], [box.left + Math.min(8, box.width / 2), box.top + box.height / 2]]
      .filter(([x, y]) => x >= 0 && y >= 0 && x < innerWidth && y < innerHeight);
    if (!points.length || typeof document.elementFromPoint !== "function") return false;
    return points.every(([x, y]) => {
      const hit = document.elementFromPoint(x, y);
      return hit && !item.contains(hit) && !hit.contains(item);
    });
  }
  const named = (item, name) => item?.getAttribute?.("controlname") === name;
  // The AL names around an element, from the inside out, as in the recording.
  function namesAround(item) {
    const names = [];
    for (let node = item?.closest?.("[controlname]"); node && names.length < 12;
      node = node.parentElement?.closest?.("[controlname]")) names.push(node.getAttribute("controlname"));
    return names;
  }
  const valueOf = item => item ? String(item.value ?? item.getAttribute?.("aria-checked") ??
    item.textContent ?? "") : "";
  const editableIn = item => item?.matches?.(EDITABLE) ? item : item?.querySelector?.(EDITABLE) || null;

  function findField(target) {
    let found = [];
    if (target.field) {
      try { found = [...document.querySelectorAll(`[controlname="${CSS.escape(target.field)}"]`)]; } catch {}
      found = found.filter(item => !item.querySelector("[controlname]") && !inLookup(item))
        .map(item => editableIn(item) || item).filter(shown);
      // On the step's page first, then the row being worked on, as with several lines.
      const onPage = found.filter(item => !target.page || namesAround(item).includes(target.page));
      if (onPage.length) found = onPage;
      const active = found.find(item => item.contains(document.activeElement) ||
        item.closest?.('tr,[role="row"]')?.contains(document.activeElement));
      if (active) return active;
      found = preferred(found);
    }
    // Without an AL name: the field whose label is one of the step's captions, as Business
    // Central names it in its aria-label, its label element or the element that labels it.
    const wanted = (target.captions || [target.caption]).map(clean).filter(Boolean);
    if (!found.length && wanted.length) {
      const names = item => [item.getAttribute("aria-label"), item.getAttribute("title"),
        ...[...(item.labels || [])].map(labelElement => labelElement.textContent),
        ...String(item.getAttribute("aria-labelledby") || "").split(/\s+/u).filter(Boolean)
          .map(id => document.getElementById(id)?.textContent)].map(clean);
      for (const caption of wanted) {
        found = [...document.querySelectorAll(EDITABLE)].filter(item => shown(item) && !inLookup(item) &&
          names(item).includes(caption));
        if (found.length) break;
      }
      const active = found.find(item => item.closest?.('tr,[role="row"]')?.contains(document.activeElement));
      if (active) return active;
      found = preferred(found);
    }
    return found[0] || null;
  }

  // Of several fields of the same name, the one the user is looking at: in the dialog opened
  // last (Business Central shows it on top), then one inside the window, in the page's order.
  // A field of the same name further down the page, beneath the dialog, comes last.
  function preferred(items) {
    const dialogs = [...document.querySelectorAll('[role="dialog"],[aria-modal="true"]')].filter(shown);
    const top = dialogs.at(-1);
    const inView = item => {
      const box = item.getBoundingClientRect();
      return box.bottom > 0 && box.right > 0 && box.top < innerHeight && box.left < innerWidth;
    };
    const rank = item => (top && top.contains(item) ? 0 : 2) + (inView(item) ? 0 : 1);
    return items.map((item, index) => ({ item, index, rank: rank(item) }))
      .sort((left, right) => left.rank - right.rank || left.index - right.index).map(entry => entry.item);
  }

  function findAction(target) {
    const marked = document.querySelector(`[${MARK}="${CSS.escape(step.token)}"]`);
    if (marked && shown(marked)) return marked;
    // The client's registry is searched at most every second and a half.
    if ((target.action || target.operation) && Date.now() - lastActionSearch > 1500) {
      lastActionSearch = Date.now();
      document.dispatchEvent(new CustomEvent(FIND, { detail: JSON.stringify({ token: step.token,
        action: target.action || "", operation: target.operation || "" }) }));
      const fresh = document.querySelector(`[${MARK}="${CSS.escape(step.token)}"]`);
      if (fresh && shown(fresh)) return fresh;
    }
    if (!target.caption) return null;
    const wanted = clean(target.caption);
    return [...document.querySelectorAll(CLICKABLE)].find(item => shown(item) &&
      (clean(item.getAttribute("aria-label")) === wanted || clean(item.textContent) === wanted)) || null;
  }

  // Business Central's search: its open search box, or the button in the navigation bar, which
  // names its shortcut Alt+Q in every language.
  // Business Central's search, in three stages as the user goes: the page in the results (its
  // row starts with the page's name, as "Inköpsorder Listor"), the search box of the open search
  // dialog, and the search button in the navigation bar, named as the recording saw it or by
  // Business Central's word for search. The button is not outlined while the search is open.
  const SEARCH_NAMES = ["sök", "search", "rechercher", "suchen", "buscar", "søg", "hae", "haku", "søk"];
  const SEARCH_BOX = '[role="dialog"] input[type="text"],[role="dialog"] input:not([type]),[role="dialog"] input[type="search"],[role="dialog"] [role="searchbox"]';
  const RESULT = '[role="dialog"] [role="gridcell"],[role="dialog"] [role="option"],[role="dialog"] [role="link"],[role="dialog"] a';
  let searchStage = "";
  function searchResult(doc, caption) {
    const wanted = clean(caption);
    if (!wanted) return null;
    return [...doc.querySelectorAll(RESULT)].find(item => {
      const words = clean(item.textContent);
      return (words === wanted || words.startsWith(`${wanted} `)) && shown(item);
    }) || null;
  }
  const searchBox = doc => [...doc.querySelectorAll(SEARCH_BOX)].find(shown) || null;
  // Whether the search is open in a frame inside this one (the client's frame, same origin).
  function searchOpenBelow() {
    for (const frameElement of document.querySelectorAll("iframe")) {
      try { if (frameElement.contentDocument && searchBox(frameElement.contentDocument)) return true; } catch {}
    }
    return false;
  }
  function findSearch(target) {
    const result = searchResult(document, target.result);
    if (result) { searchStage = "result"; return result; }
    const box = searchBox(document);
    if (box) { searchStage = "box"; return box; }
    searchStage = "button";
    // The search button is in Business Central's navigation bar, in the tab's own page. In the
    // client's frame below it, a button of the page could share the recorded name.
    if (window !== window.top || searchOpenBelow()) return null;
    const names = [clean(target.caption), ...SEARCH_NAMES].filter(Boolean);
    return [...document.querySelectorAll(CLICKABLE)].find(item => shown(item) &&
      names.includes(clean(item.getAttribute("aria-label") || item.getAttribute("title") || item.textContent))) ||
      [...document.querySelectorAll('[aria-label*="Alt+Q" i],[title*="Alt+Q" i],[aria-keyshortcuts*="Alt+Q" i]')]
        .map(item => item.closest(CLICKABLE) || item).find(shown) || null;
  }
  const pageShown = page => {
    if (!page) return false;
    try { return [...document.querySelectorAll(`[controlname="${CSS.escape(page)}"]`)].some(shown); } catch { return false; }
  };

  function drawRing() {
    if (!element || !shown(element)) { ring?.remove(); ring = null; return; }
    if (!ring) {
      ring = document.createElement("div");
      ring.setAttribute("aria-hidden", "true");
      ring.setAttribute("data-bcps-guide-ring", "");
      const style = ring.style;
      style.setProperty("position", "fixed", "important");
      style.setProperty("pointer-events", "none", "important");
      style.setProperty("z-index", "2147483646", "important");
      style.setProperty("border", "3px solid #e8590c", "important");
      style.setProperty("border-radius", "6px", "important");
      style.setProperty("box-shadow", "0 0 0 4px rgba(232,89,12,.28)", "important");
      style.setProperty("box-sizing", "border-box", "important");
      style.setProperty("margin", "0", "important");
      style.setProperty("padding", "0", "important");
    }
    if (!ring.isConnected) (document.body || document.documentElement).append(ring);
    // Five pixels around it, but inside the window, as for the search button at its top edge.
    const box = element.getBoundingClientRect();
    const left = Math.max(box.left - 5, 0);
    const top = Math.max(box.top - 5, 0);
    const right = Math.min(box.right + 5, document.documentElement.clientWidth || innerWidth || Infinity);
    const bottom = Math.min(box.bottom + 5, document.documentElement.clientHeight || innerHeight || Infinity);
    Object.assign(ring.style, { left: `${left}px`, top: `${top}px`,
      width: `${Math.max(right - left, 0)}px`, height: `${Math.max(bottom - top, 0)}px` });
  }

  function report() {
    if (!port || !step) return;
    // A heartbeat every second; the panel forgets a frame it has not heard from.
    // Whether the step's page is shown here, so the panel names the page only when it is not.
    const onPage = pageShown(step.target?.page);
    // Not found, but there beneath a window that is open on top, as the card's Släpp while
    // Tillämpat inköpspris och rabatt is still open: the user closes the window first.
    const beneath = !element && beneathWindow(step.target);
    // For a search, which of its parts is outlined, so the panel says what to do with it.
    const stage = step.target?.kind === "search" && element ? searchStage : "";
    try { port.postMessage({ type: "status", token: step.token, frame, found: Boolean(element), onPage, stage, beneath }); } catch {}
  }

  // A field or button of the step that is on the page but covered: by its AL name for a field,
  // by its caption for a button (the client's registry is not asked again here).
  function beneathWindow(target) {
    if (!target || !["field", "action"].includes(target.kind)) return false;
    ignoreCover = true;
    try {
      const wanted = clean(target.caption);
      const item = target.kind === "field" ? findField(target)
        : wanted ? [...document.querySelectorAll(CLICKABLE)].find(node => shown(node) &&
          (clean(node.getAttribute("aria-label")) === wanted || clean(node.textContent) === wanted)) : null;
      if (!item) return false;
      ignoreCover = false;
      return !shown(item);
    } catch { return false; } finally { ignoreCover = false; }
  }

  // Whether the field's lookup list is open: the combo box says so (aria-expanded), or the list
  // it names (aria-controls, aria-owns) is shown.
  function listOpen(item) {
    const box = [item, item?.closest?.('[role="combobox"]')].find(node => node?.hasAttribute?.("aria-expanded"));
    if (box?.getAttribute("aria-expanded") === "true") return true;
    const ids = [item, box].flatMap(node => String(node?.getAttribute?.("aria-controls") || "") + " " +
      String(node?.getAttribute?.("aria-owns") || "")).join(" ").split(/\s+/u).filter(Boolean);
    if (ids.some(id => { const list = document.getElementById(id); return Boolean(list && shown(list)); })) return true;
    // Business Central's lookup list is a page of its own, named Lookupform… (as
    // Lookupform27_Item), shown below a field that has a popup.
    return Boolean(item?.closest?.("[aria-haspopup]") || item?.hasAttribute?.("aria-haspopup")) &&
      [...document.querySelectorAll(LOOKUP)].some(shown);
  }

  function scan() {
    if (!step) return;
    const target = step.target || {};
    // A search step is done when the page it opens is shown.
    if (target.kind === "search" && pageShown(target.page)) { done(); return; }
    if (!element || !shown(element) || target.kind === "search") {
      element = target.kind === "field" ? findField(target)
        : target.kind === "action" ? findAction(target)
          : target.kind === "search" ? findSearch(target) : null;
    }
    // While the field's lookup list is open, what is typed only filters the list: the value
    // counts once the list has closed, also when the field keeps the focus after the choice.
    if (editing && listOpen(editing.element)) editing.opened = true;
    else if (editing && (editing.opened || !editing.element.contains(document.activeElement))) {
      // A value chosen in the field's lookup list arrives after the field has lost focus.
      const value = valueOf(editing.element);
      if (value !== editing.value && value.trim()) { done(); return; }
    }
    // Business Central may fill the field itself from another field the user filled, as the
    // vendor's name from its number. That counts once the user has done something here.
    if (target.kind === "field" && element) {
      if (watching?.element !== element) watching = { element, value: valueOf(element) };
      else if (touched && !listOpen(element) && !element.contains(document.activeElement)) {
        const value = valueOf(element);
        if (value !== watching.value && value.trim()) { done(); return; }
      }
    }
    drawRing();
    report();
  }

  function clear() {
    step = null;
    element = null;
    editing = null;
    watching = null;
    touched = false;
    clearInterval(timer);
    timer = 0;
    ring?.remove();
    ring = null;
    document.querySelectorAll(`[${MARK}]`).forEach(item => item.removeAttribute(MARK));
  }

  function done() {
    if (!step || !port) return;
    const token = step.token;
    clear();
    try { port.postMessage({ type: "done", token, frame }); } catch {}
  }

  function show(next) {
    clear();
    if (!next?.token || !next.target) return;
    step = { token: String(next.token), target: next.target };
    lastActionSearch = 0;
    scan();
    // The field may already have focus, as when the user moved straight on from the last step.
    const field = stepField(document.activeElement);
    if (field) editing = { element: field, value: valueOf(field) };
    timer = setInterval(scan, 1000);
  }

  chrome.runtime.onConnect.addListener(next => {
    if (next.name !== PORT) return;
    if (port && port !== next) { try { port.disconnect(); } catch {} }
    port = next;
    next.onMessage.addListener(message => {
      if (message?.type === "show") show(message);
      else if (message?.type === "clear") clear();
    });
    next.onDisconnect.addListener(() => {
      if (port !== next) return;
      port = null;
      clear();
    });
  });

  // The ring follows the field or button when the page scrolls or changes size.
  let frameRequest = 0;
  const follow = () => {
    if (!ring || frameRequest) return;
    frameRequest = requestAnimationFrame(() => { frameRequest = 0; drawRing(); });
  };
  window.addEventListener("scroll", follow, true);
  window.addEventListener("resize", follow);

  // The step's button: a click on it, or the same action chosen another way.
  const inTarget = node => Boolean(element && node && (node === element || element.contains(node)));
  window.addEventListener("click", event => {
    if (step?.target?.kind === "action" && inTarget(event.target)) done();
    // The page chosen in the search results opens it.
    if (step?.target?.kind === "search" && searchStage === "result" && inTarget(event.target)) setTimeout(done, 0);
  }, true);
  // Enter in the search box opens the page shown first in the results.
  window.addEventListener("keydown", event => {
    if (event.key !== "Enter" || step?.target?.kind !== "search" || searchStage !== "box") return;
    if (searchResult(document, step.target.result)) setTimeout(done, 0);
  }, true);
  window.addEventListener(IDENTITY, event => {
    if (step?.target?.kind !== "action") return;
    let identity = null;
    try { identity = JSON.parse(String(event.detail || "")); } catch { return; }
    const target = step.target;
    if ((target.operation && identity?.operation === target.operation) ||
      (target.action && ["action", "menu"].includes(identity?.kind) && identity.action === target.action)) {
      // The click itself completes the step, so the button is not left without its ring first.
      setTimeout(done, 0);
    }
  }, true);

  // The step's field: a new value when the user leaves it or confirms it. Another row's field
  // of the same name counts too, as when the guide outlined the first line.
  const stepField = node => {
    if (step?.target?.kind !== "field" || !node?.closest || inLookup(node)) return null;
    if (inTarget(node)) return node;
    const owner = node.closest("[controlname]");
    // Another line's field of the same name, on the step's page.
    const page = step.target.page;
    return step.target.field && named(owner, step.target.field) &&
      (!page || namesAround(node).includes(page)) ? node : null;
  };
  window.addEventListener("focusin", event => {
    const field = stepField(event.target);
    // Back in the same field, as after a choice in its lookup list, the value before is kept.
    if (field && editing?.element !== field) editing = { element: field, value: valueOf(field) };
  }, true);
  const changed = event => {
    if (!editing || !(event.target === editing.element || editing.element.contains?.(event.target))) return;
    // Enter with the lookup list open filters the list, and leaving the field for the list
    // chooses from it: the choice is seen when the list has closed (scan).
    if (listOpen(editing.element)) { editing.opened = true; return; }
    const value = valueOf(editing.element);
    if (value !== editing.value && value.trim()) done();
  };
  window.addEventListener("change", changed, true);
  window.addEventListener("focusout", changed, true);
  window.addEventListener("keydown", event => { if (event.key === "Enter") changed(event); }, true);
  // Whether the user has typed or clicked in this frame since the step was shown.
  for (const type of ["keydown", "input", "change", "click"]) {
    window.addEventListener(type, () => { if (step) touched = true; }, true);
  }
  // A check box or switch is done when it is turned.
  window.addEventListener("click", event => {
    const field = stepField(event.target);
    if (field?.matches?.('input[type="checkbox"],[role="checkbox"],[role="switch"]')) setTimeout(done, 0);
  }, true);
})();
