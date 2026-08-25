(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9BusinessCentralUrlContext = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function clean(value) {
    return String(value || "").trim().replace(/\s+/g, " ");
  }

  function isBusinessCentralHost(hostname) {
    const host = clean(hostname).toLowerCase();
    return host === "businesscentral.dynamics.com" ||
      host.endsWith(".businesscentral.dynamics.com");
  }

  function parseBusinessCentralUrl(value) {
    let url;
    try {
      url = new URL(String(value || ""));
    } catch {
      return Object.freeze({});
    }
    if (!isBusinessCentralHost(url.hostname)) return Object.freeze({});

    const segments = url.pathname.split("/").filter(Boolean).map(segment => {
      try { return decodeURIComponent(segment); } catch { return segment; }
    });
    const environmentName = clean(segments[1] || "");
    const companyName = clean(url.searchParams.get("company"));
    const result = {};
    if (environmentName) result.environmentName = environmentName;
    if (companyName) result.companyName = companyName;
    return Object.freeze(result);
  }

  function displayName(context, fallback = "") {
    const environmentName = clean(context?.environmentName);
    const companyName = clean(context?.companyName);
    if (environmentName && companyName) return `${environmentName} — ${companyName}`;
    return environmentName || companyName || clean(fallback);
  }

  return Object.freeze({ displayName, isBusinessCentralHost, parseBusinessCentralUrl });
});
