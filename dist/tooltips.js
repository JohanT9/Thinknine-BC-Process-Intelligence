(function (root, factory) {
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9Tooltips = api;
  if (root.document) root.queueMicrotask(() => api.bind(root.document));
})(typeof globalThis !== "undefined" ? globalThis : this, function (root) {
  "use strict";

  const TARGET_SELECTOR = "button, summary, [data-tooltip], [aria-keyshortcuts]";
  const TOOLTIP_ID = "t9GlobalTooltip";
  const bindings = new WeakMap();

  const KEY_LABELS = Object.freeze({
    Control: "Ctrl", Meta: "Cmd", Escape: "Esc", Space: "Space",
    ArrowUp: "↑", ArrowDown: "↓", ArrowLeft: "←", ArrowRight: "→"
  });

  function shortcutText(target) {
    const shortcuts = target?.getAttribute?.("aria-keyshortcuts")?.trim();
    if (!shortcuts) return "";
    return shortcuts.split(/\s+/u).map(shortcut => shortcut.split("+")
      .map(key => KEY_LABELS[key] || key).join("+")).join(" / ");
  }

  function tooltipText(target) {
    if (!target) return "";
    const explicit = target.getAttribute?.("data-tooltip") ||
      target.getAttribute?.("aria-label") || target.getAttribute?.("title");
    const heading = target.querySelector?.("strong")?.textContent?.trim();
    const text = explicit?.trim() || heading || String(target.textContent || "")
      .replace(/\s+/gu, " ").trim();
    const shortcut = shortcutText(target);
    return [text, shortcut ? `(${shortcut})` : ""].filter(Boolean).join(" ");
  }

  function bind(documentValue) {
    if (!documentValue?.body || bindings.has(documentValue)) return () => {};
    const tooltip = documentValue.createElement("div");
    tooltip.id = TOOLTIP_ID;
    tooltip.className = "t9-tooltip";
    tooltip.setAttribute("role", "tooltip");
    tooltip.hidden = true;
    documentValue.body.appendChild(tooltip);
    let activeTarget = null;
    let previousDescription = null;

    function position(target) {
      const rect = target.getBoundingClientRect();
      const margin = 8;
      const width = tooltip.offsetWidth;
      const height = tooltip.offsetHeight;
      let left = rect.left + (rect.width - width) / 2;
      left = Math.max(margin, Math.min(left, root.innerWidth - width - margin));
      let top = rect.bottom + margin;
      if (top + height > root.innerHeight - margin) {
        top = Math.max(margin, rect.top - height - margin);
      }
      tooltip.style.left = `${Math.round(left)}px`;
      tooltip.style.top = `${Math.round(top)}px`;
    }

    function show(target) {
      const text = tooltipText(target);
      if (!text) return;
      if (activeTarget === target) {
        position(target);
        return;
      }
      if (activeTarget && activeTarget !== target) hide();
      activeTarget = target;
      previousDescription = target.getAttribute("aria-describedby");
      const descriptions = new Set((previousDescription || "").split(/\s+/u)
        .filter(Boolean));
      descriptions.add(TOOLTIP_ID);
      target.setAttribute("aria-describedby", [...descriptions].join(" "));
      if (target.hasAttribute("title")) {
        target.dataset.tooltipNativeTitle = target.getAttribute("title");
        target.removeAttribute("title");
      }
      tooltip.textContent = text;
      tooltip.hidden = false;
      position(target);
    }

    function hide() {
      if (!activeTarget) return;
      if (previousDescription) {
        activeTarget.setAttribute("aria-describedby", previousDescription);
      } else {
        activeTarget.removeAttribute("aria-describedby");
      }
      if (activeTarget.dataset.tooltipNativeTitle) {
        activeTarget.setAttribute("title",
          activeTarget.dataset.tooltipNativeTitle);
        delete activeTarget.dataset.tooltipNativeTitle;
      }
      activeTarget = null;
      previousDescription = null;
      tooltip.hidden = true;
    }

    function targetFrom(event) {
      return event.target?.closest?.(TARGET_SELECTOR) || null;
    }
    function onPointerOver(event) {
      const target = targetFrom(event);
      if (target && !target.contains(event.relatedTarget)) show(target);
    }
    function onPointerOut(event) {
      if (activeTarget && !activeTarget.contains(event.relatedTarget)) hide();
    }
    function onFocusIn(event) {
      const target = targetFrom(event);
      if (target) show(target);
    }
    function onFocusOut(event) {
      if (activeTarget && !activeTarget.contains(event.relatedTarget)) hide();
    }
    function onKeydown(event) {
      if (event.key === "Escape") hide();
    }

    documentValue.addEventListener("pointerover", onPointerOver);
    documentValue.addEventListener("pointerout", onPointerOut);
    documentValue.addEventListener("focusin", onFocusIn);
    documentValue.addEventListener("focusout", onFocusOut);
    documentValue.addEventListener("keydown", onKeydown);
    root.addEventListener?.("scroll", hide, true);
    root.addEventListener?.("resize", hide);

    const unbind = () => {
      hide();
      documentValue.removeEventListener("pointerover", onPointerOver);
      documentValue.removeEventListener("pointerout", onPointerOut);
      documentValue.removeEventListener("focusin", onFocusIn);
      documentValue.removeEventListener("focusout", onFocusOut);
      documentValue.removeEventListener("keydown", onKeydown);
      root.removeEventListener?.("scroll", hide, true);
      root.removeEventListener?.("resize", hide);
      tooltip.remove();
      bindings.delete(documentValue);
    };
    bindings.set(documentValue, unbind);
    return unbind;
  }

  return { TARGET_SELECTOR, TOOLTIP_ID, bind, shortcutText, tooltipText };
});
