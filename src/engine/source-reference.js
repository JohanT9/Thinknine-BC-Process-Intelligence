(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9SourceReference = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const FIELDS = ["sourceEventIds", "normalizedEventIds", "stepGroupIds",
    "semanticActionIds"];
  const unique = values => [...new Set((values || []).filter(value =>
    value !== undefined && value !== null && String(value).trim() !== "")
    .map(String))];
  function normalize(value = {}) {
    const result = {};
    if (value.recordingId != null && String(value.recordingId).trim()) {
      result.recordingId = String(value.recordingId);
    }
    for (const field of FIELDS) {
      const values = unique(value[field]);
      if (values.length) result[field] = values;
    }
    const legacy = unique(value.legacyEventNos || value.sourceEventNos);
    if (legacy.length) result.legacyEventNos = legacy;
    return result;
  }
  function merge(...values) {
    const normalized = values.map(normalize);
    return normalize({
      recordingId: normalized.map(item => item.recordingId).find(Boolean),
      ...Object.fromEntries(FIELDS.map(field => [field,
        normalized.flatMap(item => item[field] || [])])),
      legacyEventNos: normalized.flatMap(item => item.legacyEventNos || [])
    });
  }
  function stableIdentity(value = {}, fallback = "untraced") {
    const ref = normalize(value);
    for (const field of ["semanticActionIds", "stepGroupIds",
      "normalizedEventIds", "sourceEventIds", "legacyEventNos"]) {
      if (ref[field]?.length) return `${field}:${ref[field].map(id =>
        `${id.length}:${id}`).join("|")}`;
    }
    return String(fallback);
  }
  return { FIELDS, merge, normalize, stableIdentity };
});
