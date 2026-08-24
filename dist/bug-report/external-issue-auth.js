(function (root, factory) { const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ExternalIssueAuth = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const tokens = new Map();
  const encode = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/gu, "-").replace(/\//gu, "_").replace(/=+$/gu, "");
  const random = size => { const data = new Uint8Array(size);
    crypto.getRandomValues(data); return encode(data); };
  const challenge = async verifier => encode(await crypto.subtle.digest("SHA-256",
    new TextEncoder().encode(verifier)));
  async function authenticate(configuration, purpose = "external-issue") {
    const key = `${configuration.tenantId}:${configuration.clientId}:${configuration.scope}`;
    const cached = tokens.get(key); if (cached?.expiresAt > Date.now() + 60000) {
      return cached.accessToken;
    }
    const verifier = random(48); const state = random(24);
    const redirectUri = chrome.identity.getRedirectURL(purpose);
    const authorize = new URL(`https://login.microsoftonline.com/${encodeURIComponent(
      configuration.tenantId)}/oauth2/v2.0/authorize`);
    authorize.search = new URLSearchParams({ client_id: configuration.clientId,
      response_type: "code", redirect_uri: redirectUri, response_mode: "query",
      scope: configuration.scope, state, code_challenge: await challenge(verifier),
      code_challenge_method: "S256" });
    const responseUrl = await chrome.identity.launchWebAuthFlow({
      url: authorize.toString(), interactive: true });
    const response = new URL(responseUrl);
    if (response.searchParams.get("state") !== state) throw Object.assign(
      new Error("Authentication state validation failed."), { category: "unauthorized" });
    const code = response.searchParams.get("code");
    if (!code) throw Object.assign(new Error("Microsoft sign-in was not completed."),
      { category: "unauthorized" });
    const tokenResponse = await fetch(`https://login.microsoftonline.com/${
      encodeURIComponent(configuration.tenantId)}/oauth2/v2.0/token`, {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: configuration.clientId,
        grant_type: "authorization_code", code, redirect_uri: redirectUri,
        code_verifier: verifier, scope: configuration.scope }) });
    if (!tokenResponse.ok) throw Object.assign(new Error("Microsoft token exchange failed."),
      { status: tokenResponse.status });
    const payload = await tokenResponse.json();
    if (!payload.access_token) throw Object.assign(new Error("No access token was returned."),
      { category: "unauthorized" });
    tokens.set(key, { accessToken: payload.access_token,
      expiresAt: Date.now() + Math.min(Number(payload.expires_in || 3600), 3600) * 1000 });
    return payload.access_token;
  }
  function clear() { tokens.clear(); }
  return { authenticate, clear };
});

