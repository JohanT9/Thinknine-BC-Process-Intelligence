(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ApplicationInsightsAuth = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const tokens = new Map();
  const encode = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/gu, "-").replace(/\//gu, "_").replace(/=+$/gu, "");
  const random = size => { const value = new Uint8Array(size);
    crypto.getRandomValues(value); return encode(value); };
  async function challenge(verifier) {
    return encode(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)));
  }
  function scrub(error) {
    const status = Number(error?.status || 0);
    return { category: status === 401 || status === 403 ? "unauthorized" :
      status >= 500 ? "unavailable" : error?.category || "query-failed",
    message: status ? `Microsoft endpoint returned HTTP ${status}.` :
      String(error?.message || "Microsoft authentication failed.")
        .replace(/Bearer\s+\S+/giu, "Bearer [redacted]").slice(0, 300) };
  }
  async function authenticate(configuration) {
    const cached = tokens.get(configuration.clientId);
    if (cached && cached.expiresAt > Date.now() + 60000) return cached.accessToken;
    const verifier = random(48); const state = random(24);
    const redirectUri = chrome.identity.getRedirectURL("application-insights");
    const authorize = new URL(`https://login.microsoftonline.com/${encodeURIComponent(
      configuration.tenantId)}/oauth2/v2.0/authorize`);
    authorize.search = new URLSearchParams({ client_id: configuration.clientId,
      response_type: "code", redirect_uri: redirectUri,
      response_mode: "query", scope: "https://api.applicationinsights.io/.default",
      state, code_challenge: await challenge(verifier), code_challenge_method: "S256" });
    const responseUrl = await chrome.identity.launchWebAuthFlow({
      url: authorize.toString(), interactive: true });
    const response = new URL(responseUrl);
    if (response.searchParams.get("state") !== state) throw Object.assign(
      new Error("Authentication state validation failed."), { category: "unauthorized" });
    const code = response.searchParams.get("code");
    if (!code) throw Object.assign(new Error(response.searchParams.get("error_description") ||
      "Microsoft sign-in did not return an authorization code."), { category: "unauthorized" });
    const tokenResponse = await fetch(`https://login.microsoftonline.com/${encodeURIComponent(
      configuration.tenantId)}/oauth2/v2.0/token`, { method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: configuration.clientId,
        grant_type: "authorization_code", code, redirect_uri: redirectUri,
        code_verifier: verifier, scope: "https://api.applicationinsights.io/.default" }) });
    if (!tokenResponse.ok) throw Object.assign(new Error("Microsoft token exchange failed."),
      { status: tokenResponse.status });
    const payload = await tokenResponse.json();
    if (!payload.access_token) throw Object.assign(new Error("Microsoft did not return an access token."),
      { category: "unauthorized" });
    tokens.set(configuration.clientId, { accessToken: payload.access_token,
      expiresAt: Date.now() + Math.min(Number(payload.expires_in || 3600), 3600) * 1000 });
    return payload.access_token;
  }
  function clear() { tokens.clear(); }
  return { authenticate, clear, scrub };
});
