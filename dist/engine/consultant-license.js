(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ConsultantLicense = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const KEY = "t9ConsultantLicenseV1";
  const encoder = new TextEncoder();
  const base64url = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  function tokenProfile(token) {
    try {
      const claims = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
      return { tenantId: String(claims.tid || ""), objectId: String(claims.oid || ""),
        name: String(claims.name || ""), email: String(claims.preferred_username || claims.email || "") };
    } catch { return {}; }
  }
  function create({ storage, fetcher, identity, config, version, now = Date.now }) {
    async function state() { return (await storage.get(KEY))[KEY] || {}; }
    async function signIn() {
      if (!config?.enabled || !config.clientId || !config.scope) throw new Error("Konsultinloggning är inte konfigurerad ännu.");
      const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)));
      const challenge = base64url(await crypto.subtle.digest("SHA-256", encoder.encode(verifier)));
      const stateValue = crypto.randomUUID();
      const redirectUri = identity.getRedirectURL("entra");
      const authorize = new URL("https://login.microsoftonline.com/organizations/oauth2/v2.0/authorize");
      authorize.search = new URLSearchParams({ client_id: config.clientId, response_type: "code",
        redirect_uri: redirectUri, response_mode: "query", scope: `openid profile offline_access ${config.scope}`,
        code_challenge: challenge, code_challenge_method: "S256", state: stateValue, prompt: "select_account" });
      const redirected = await identity.launchWebAuthFlow({ url: authorize.href, interactive: true });
      const response = new URL(redirected);
      if (response.searchParams.get("state") !== stateValue || !response.searchParams.get("code")) throw new Error("Entra-inloggningen kunde inte verifieras.");
      const tokenResponse = await fetcher("https://login.microsoftonline.com/organizations/oauth2/v2.0/token", {
        method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ client_id: config.clientId, grant_type: "authorization_code",
          code: response.searchParams.get("code"), redirect_uri: redirectUri,
          code_verifier: verifier, scope: `openid profile offline_access ${config.scope}` }) });
      if (!tokenResponse.ok) throw new Error("Entra-inloggningen kunde inte slutföras.");
      const tokens = await tokenResponse.json();
      const value = { accessToken: tokens.access_token, refreshToken: tokens.refresh_token,
        expiresAt: now() + Number(tokens.expires_in || 0) * 1000,
        profile: tokenProfile(tokens.id_token || "") };
      await storage.set({ [KEY]: value }); return value;
    }
    async function signOut() { await storage.remove(KEY); }
    async function accessToken() {
      const value = await state();
      if (value.accessToken && value.expiresAt > now() + 60000) return value.accessToken;
      if (!value.refreshToken) throw new Error("Logga in med din konsultlicens.");
      const response = await fetcher("https://login.microsoftonline.com/organizations/oauth2/v2.0/token", {
        method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ client_id: config.clientId, grant_type: "refresh_token",
          refresh_token: value.refreshToken, scope: `openid profile offline_access ${config.scope}` }) });
      if (!response.ok) { await signOut(); throw new Error("Konsultinloggningen har gått ut. Logga in igen."); }
      const tokens = await response.json();
      const updated = { accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || value.refreshToken,
        expiresAt: now() + Number(tokens.expires_in || 0) * 1000,
        profile: value.profile || tokenProfile(tokens.id_token || "") };
      await storage.set({ [KEY]: updated }); return updated.accessToken;
    }
    async function check(tenantId, installationId) {
      if (!config?.enabled) return { allowed: false, configured: false };
      const token = await accessToken();
      const response = await fetcher(config.endpoint, { method: "POST", credentials: "omit",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ installationId, tenantId, version }) });
      if (response.status === 401) { await signOut(); throw new Error("Konsultinloggningen behöver förnyas."); }
      if (!response.ok) throw new Error("Konsultlicensen kunde inte kontrolleras.");
      return response.json();
    }
    return Object.freeze({ signIn, signOut, check, state,
      configured: () => Boolean(config?.enabled && config.clientId && config.scope) });
  }
  return Object.freeze({ create });
});
