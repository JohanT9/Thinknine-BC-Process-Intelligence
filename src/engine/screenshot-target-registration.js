(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ScreenshotTargetRegistration = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  async function register(options = {}) {
    const targets = Array.isArray(options.targets) ? options.targets : [];
    if (typeof options.saveAsset !== "function" ||
        typeof options.associate !== "function") {
      throw new TypeError("Screenshot asset and event registration callbacks are required.");
    }
    let saved = 0;
    const failures = [];
    for (const target of targets) {
      try {
        await options.saveAsset(target);
      } catch (error) {
        failures.push({ target, stage: "asset-write", error });
        continue;
      }
      // Canonical association failures are more serious than optional image
      // storage failures and must keep the recording's existing integrity gate,
      // but should not discard the remaining screenshot queue.
      try {
        await options.associate(target);
      } catch (error) {
        failures.push({ target, stage: "canonical-association", error });
        continue;
      }
      saved += 1;
    }
    return { saved, failures };
  }

  return Object.freeze({ register });
});
