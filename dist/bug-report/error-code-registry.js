(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ErrorCodeRegistry = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const REGISTRY_VERSION = "1.0.0";
  const CODE_PATTERN = /^BCPS-[A-Z]+(?:-[A-Z]+)*-\d{3}$/u;
  const entries = [
    { code: "BCPS-VALIDATION-001", classification: "data-validation",
      domain: "business-central", status: "active" },
    { code: "BCPS-PERMISSION-001", classification: "permission",
      domain: "security", status: "active" },
    { code: "BCPS-AL-RUNTIME-001", classification: "al-runtime",
      domain: "business-central", status: "active" },
    { code: "BCPS-BC-RUNTIME-001", classification: "business-central-runtime",
      domain: "business-central", status: "active" },
    { code: "BCPS-POSTING-001", classification: "business-central-posting",
      domain: "business-central", status: "active" },
    { code: "BCPS-NETWORK-001", classification: "integration-network",
      domain: "integration", status: "active" },
    { code: "BCPS-CLIENT-001", classification: "client-technical",
      domain: "client", status: "active" },
    { code: "BCPS-UNKNOWN-001", classification: "unclassified-error",
      domain: "unknown", status: "active" }
  ];
  const aliases = Object.freeze({ unknown: "unclassified-error" });
  const deepFreeze = value => {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.values(value).forEach(deepFreeze);
    return Object.freeze(value);
  };
  function validate(values) {
    if (!Array.isArray(values) || !values.length) {
      throw new TypeError("At least one error-code entry is required.");
    }
    const codes = new Set();
    const classifications = new Set();
    for (const entry of values) {
      if (!CODE_PATTERN.test(String(entry?.code || "")) ||
          !entry?.classification || !entry?.domain || entry?.status !== "active") {
        throw new TypeError("Invalid error-code registry entry.");
      }
      if (codes.has(entry.code)) throw new TypeError(`Duplicate error code: ${entry.code}`);
      if (classifications.has(entry.classification)) {
        throw new TypeError(`Duplicate error classification: ${entry.classification}`);
      }
      codes.add(entry.code);
      classifications.add(entry.classification);
    }
    return true;
  }
  function createRegistry(values = entries) {
    validate(values);
    const list = values.map(entry => deepFreeze({ ...entry,
      registryVersion: REGISTRY_VERSION }));
    const byClassification = new Map(list.map(entry =>
      [entry.classification, entry]));
    const byCode = new Map(list.map(entry => [entry.code, entry]));
    return Object.freeze({ version: REGISTRY_VERSION,
      list: Object.freeze(list),
      resolve(classification) {
        const normalized = aliases[String(classification || "")] ||
          String(classification || "unclassified-error");
        return byClassification.get(normalized) ||
          byClassification.get("unclassified-error");
      },
      find(code) { return byCode.get(String(code || "")) || null; }
    });
  }
  const registry = createRegistry();
  return { CODE_PATTERN, ENTRIES: registry.list, REGISTRY_VERSION,
    createRegistry, find: registry.find, resolve: registry.resolve, validate };
});
