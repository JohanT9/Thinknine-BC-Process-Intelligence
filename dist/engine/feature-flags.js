(function (root, factory) {
  const api = factory(root.BC_PROCESS_STUDIO_FEATURE_FLAGS || {});
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9FeatureFlags = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (configured) {
  const DEFAULTS = Object.freeze({ processIntelligence: false });
  const flags = Object.freeze({ ...DEFAULTS, ...configured });

  function isEnabled(name) {
    return flags[name] === true;
  }

  function apply(target) {
    if (!target?.querySelectorAll) return;
    target.querySelectorAll("[data-feature]").forEach(element => {
      element.hidden = !isEnabled(element.dataset.feature);
    });
  }

  return Object.freeze({ DEFAULTS, isEnabled, apply });
});
