(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ApplicationInsightsTransport = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const ENDPOINT = "https://api.applicationinsights.io";
  async function query(configuration, token, kql) {
    const response = await fetch(`${ENDPOINT}/v1/apps/${encodeURIComponent(
      configuration.applicationId)}/query`, { method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query: kql }) });
    if (!response.ok) throw Object.assign(new Error("Application Insights query failed."),
      { status: response.status });
    return response.json();
  }
  return { ENDPOINT, query };
});
