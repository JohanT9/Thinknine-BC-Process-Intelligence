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
        name: String(claims.name || ""), email: String(claims.preferred_username || claims.email ||
          claims.upn || claims.unique_name || "") };
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
    const ownerOf = profile => profile?.tenantId + ":" + profile?.objectId;
    async function accessToken(expectedOwner) {
      const value = await state();
      if (expectedOwner && ownerOf(value.profile) !== expectedOwner) throw new Error("Account changed");
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
      if (ownerOf((await state()).profile) !== ownerOf(value.profile)) throw new Error("Account changed");
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
      const license = await response.json();
      const value = await state(); await storage.set({ [KEY]: { ...value, license } });
      return license;
    }
    async function register(installationId) {
      const token = await accessToken();
      const response = await fetcher(config.endpoint.replace(/\/check$/, "/register"), {
        method: "POST", credentials: "omit",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ installationId, version }) });
      if (!response.ok) {
        let detail = "";
        try { detail = String((await response.json())?.error || ""); } catch { /* Ignore non-JSON errors. */ }
        if (response.status === 404) throw new Error("Licenstjänsten saknar stöd för konsultregistrering. Distribuera den senaste tjänste-ZIP-filen.");
        if (response.status === 401) throw new Error("Licenstjänsten avvisade Microsoft-inloggningen. Kontrollera LICENSE_ENTRA_AUDIENCE och LICENSE_ENTRA_SCOPE i Azure.");
        if (response.status === 503 && detail === "consultant-auth-not-configured") {
          throw new Error("Microsoft-autentisering är inte konfigurerad i licenstjänsten.");
        }
        throw new Error(`Konsultregistreringen kunde inte skapas (HTTP ${response.status}${detail ? `: ${detail}` : ""}).`);
      }
      const license = await response.json();
      const value = await state(); await storage.set({ [KEY]: { ...value, license } });
      return license;
    }
    async function registerTenantUser(tenantId, installationId) {
      const token = await accessToken();
      const response = await fetcher(config.endpoint.replace(/\/consultant\/check$/, "/user/register"), {
        method: "POST", credentials: "omit",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ installationId, tenantId, version }) });
      if (response.status === 401) throw new Error("Microsoft-inloggningen avvisades av licenstjänsten.");
      if (!response.ok) throw new Error(`Användaren kunde inte registreras (HTTP ${response.status}).`);
      return response.json();
    }
    async function recordUsage(event, owner) {
      const token = await accessToken(owner);
      const profile = (await state()).profile;
      if (profile?.tenantId + ":" + profile?.objectId !== owner) throw new Error("Account changed");
      const response = await fetcher(config.endpoint.replace(/\/consultant\/check$/, "/usage"), {
        method: "POST", credentials: "omit", signal: AbortSignal.timeout(10000),
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify(event) });
      if (!response.ok) throw new Error("Usage statistics could not be synchronized");
      const result = await response.json();
      if (!result.accepted) throw new Error("Usage statistics were not accepted");
    }
    async function hasApplicationAdminRole() {
      if (!config?.adminAccessEndpoint) return false;
      try {
        const token = await accessToken();
        const response = await fetcher(config.adminAccessEndpoint, { method: "GET",
          credentials: "omit", headers: { Authorization: `Bearer ${token}` } });
        if (!response.ok) return false;
        return (await response.json()).authorized === true;
      } catch { return false; }
    }
    return Object.freeze({ signIn, signOut, check, register, registerTenantUser, recordUsage,
      hasApplicationAdminRole, state,
      configured: () => Boolean(config?.enabled && config.clientId && config.scope) });
  }
  return Object.freeze({ create });
});
