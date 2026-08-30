(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9CaptureSurfaceMode = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const VERSION = "1.1.0";
  const STANDARD = "standard-bc";
  const ENHANCED = "control-addin";
  const ENHANCED_ROLES = Object.freeze(["switch", "treeitem", "slider",
    "combobox", "presentation"]);

  function detect(input = {}) {
    const signals = [];
    const frameDepth = Number(input.frameDepth) || 0;
    if (frameDepth > 0) signals.push("nested-frame");
    if (input.controlAddIn === true) signals.push("control-addin-marker");
    if (input.controlAddInPath === true) signals.push("control-addin-frame-path");
    if (input.reactRoot === true) signals.push("react-root-marker");
    if (input.materialUi === true) signals.push("material-ui-marker");
    if (input.automationMetadata === true) signals.push("automation-metadata");
    if (supportsEnhancedRole(input.enhancedRole)) {
      signals.push("enhanced-aria-role");
    }
    const enhanced = signals.includes("control-addin-marker") ||
      signals.includes("control-addin-frame-path") ||
      signals.includes("react-root-marker") || signals.includes("material-ui-marker") ||
      signals.includes("enhanced-aria-role") ||
      (signals.includes("nested-frame") && signals.includes("automation-metadata"));
    return Object.freeze({ version: VERSION, mode: enhanced ? ENHANCED : STANDARD,
      enhanced, signals: Object.freeze(signals), confidence: enhanced ? 0.9 : 1 });
  }

  function supportsEnhancedRole(role) {
    return ENHANCED_ROLES.includes(String(role || "").toLowerCase());
  }
  function eventFamily(type) {
    return ["pointerdown", "click", "input", "change", "focusin", "focusout",
      "keydown"].includes(type) ? "delegated-capture" : "unsupported";
  }
  return { VERSION, STANDARD, ENHANCED, ENHANCED_ROLES, detect,
    supportsEnhancedRole, eventFamily };
});
