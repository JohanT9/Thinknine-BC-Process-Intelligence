(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9AiBrokerTransport = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  function validateConfiguration(value = {}) {
    const errors = [];
    if (!value.enabled) errors.push("AI analysis is disabled by configuration.");
    for (const field of ["tenantId", "clientId", "scope", "brokerUrl", "model"]) {
      if (!String(value[field] || "").trim()) errors.push(`${field} is required.`);
    }
    try { if (new URL(value.brokerUrl).protocol !== "https:") {
      errors.push("AI broker must use HTTPS.");
    } } catch { errors.push("AI broker URL is invalid."); }
    return { valid: errors.length === 0, errors };
  }
  async function invoke(configuration, token, request) {
    const validation = validateConfiguration(configuration);
    if (!validation.valid) throw Object.assign(new Error(validation.errors.join(" ")),
      { category: "not-configured" });
    const response = await fetch(new URL("analysis/technical-bug", configuration.brokerUrl), {
      method: "POST", headers: { Authorization: `Bearer ${token}`,
        "Content-Type": "application/json" }, body: JSON.stringify(request) });
    if (!response.ok) throw Object.assign(new Error(
      response.status === 429 ? "AI provider rate limit reached." :
        "AI broker request failed."), { category: response.status === 429
        ? "rate-limited" : response.status === 401 || response.status === 403
          ? "authentication-failed" : "provider-failed", status: response.status });
    return response.json();
  }
  return { invoke, validateConfiguration };
});
