(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9AiBrokerAuth = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const tokens = new Map();
  const encode = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/gu, "-").replace(/\//gu, "_").replace(/=+$/gu, "");
  async function authenticate(configuration) {
    const key = `${configuration.clientId}:${configuration.scope}`;
    const cached = tokens.get(key);
    if (cached?.expiresAt > Date.now() + 60000) return cached.accessToken;
    const bytes = size => { const value = new Uint8Array(size);
      crypto.getRandomValues(value); return encode(value); };
    const verifier = bytes(48); const state = bytes(24);
    const challenge = encode(await crypto.subtle.digest("SHA-256",
      new TextEncoder().encode(verifier)));
    const redirectUri = chrome.identity.getRedirectURL("ai-analysis");
    const authorization = new URL(`https://login.microsoftonline.com/${encodeURIComponent(
      configuration.tenantId)}/oauth2/v2.0/authorize`);
    authorization.search = new URLSearchParams({ client_id: configuration.clientId,
      response_type: "code", redirect_uri: redirectUri, response_mode: "query",
      scope: configuration.scope, state, code_challenge: challenge,
      code_challenge_method: "S256" });
    const response = new URL(await chrome.identity.launchWebAuthFlow({
      url: authorization.toString(), interactive: true }));
    if (response.searchParams.get("state") !== state) throw Object.assign(
      new Error("AI broker authentication state validation failed."),
      { category: "authentication-failed" });
    const code = response.searchParams.get("code");
    if (!code) throw Object.assign(new Error("AI broker sign-in was not completed."),
      { category: "authentication-failed" });
    const tokenResponse = await fetch(`https://login.microsoftonline.com/${encodeURIComponent(
      configuration.tenantId)}/oauth2/v2.0/token`, { method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: configuration.clientId,
        grant_type: "authorization_code", code, redirect_uri: redirectUri,
        code_verifier: verifier, scope: configuration.scope }) });
    if (!tokenResponse.ok) throw Object.assign(new Error("AI broker token exchange failed."),
      { category: "authentication-failed", status: tokenResponse.status });
    const payload = await tokenResponse.json();
    tokens.set(key, { accessToken: payload.access_token,
      expiresAt: Date.now() + Math.min(Number(payload.expires_in || 3600), 3600) * 1000 });
    return payload.access_token;
  }
  function clear() { tokens.clear(); }
  return { authenticate, clear };
});
