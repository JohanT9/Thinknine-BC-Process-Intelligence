(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9OutlookDraft = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const GRAPH = "https://graph.microsoft.com/v1.0/me/messages";
  const DRAFTS = "https://outlook.office.com/mail/drafts";
  const SCOPE = "https://graph.microsoft.com/Mail.ReadWrite";
  function safeLink(value) {
    try {
      const url = new URL(value);
      return url.protocol === "https:" && !url.username && !url.password &&
        ["outlook.office.com", "outlook.office365.com", "outlook.live.com"].includes(url.hostname)
        ? url.href : null;
    } catch { return null; }
  }
  const failure = code => Object.assign(new Error(code), { outlookCode: code });
  function create({ identity, fetcher, clientId, cryptoApi = globalThis.crypto,
    now = Date.now, locks = globalThis.navigator?.locks, sessionStorage = null,
    getAccount = async () => ({}) }) {
    let token = null;
    let busy = false;
    let sessionKey = null;
    async function clearToken() {
      token = null;
      if (sessionStorage && sessionKey) {
        try { await sessionStorage.remove(sessionKey); } catch { /* Memory cache is already cleared. */ }
      }
    }
    const encode = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes)))
      .replace(/\+/gu, "-").replace(/\//gu, "_").replace(/=+$/gu, "");
    const random = size => encode(cryptoApi.getRandomValues(new Uint8Array(size)));
    const digest = async text => encode(await cryptoApi.subtle.digest("SHA-256",
      new TextEncoder().encode(text)));
    async function authenticate() {
      const account = await getAccount();
      const owner = String(account.tenantId || "") + ":" + String(account.objectId || "");
      sessionKey = "t9OutlookAuthSessionV1:" + await digest(clientId + ":" + owner);
      if (token?.owner === owner && token.expiresAt > now() + 60000) return token.value;
      token = null;
      if (sessionStorage) {
        try {
          const cached = (await sessionStorage.get(sessionKey))[sessionKey];
          if (cached?.owner === owner && cached.clientId === clientId &&
              typeof cached.value === "string" && cached.value &&
              Number.isFinite(cached.expiresAt) && cached.expiresAt > now() + 60000 &&
              cached.expiresAt <= now() + 3600000) {
            token = cached;
            return token.value;
          }
        } catch { /* Continue with Entra if the session cache is unavailable. */ }
      }
      if (!clientId) throw failure("configuration");
      const verifier = random(48), state = random(24);
      // Reuse the application's already registered Entra redirect, not its license token.
      const redirect = identity.getRedirectURL("entra");
      const url = new URL("https://login.microsoftonline.com/organizations/oauth2/v2.0/authorize");
      url.search = new URLSearchParams({ client_id: clientId, response_type: "code",
        redirect_uri: redirect, response_mode: "query", scope: SCOPE,
        state, code_challenge: await digest(verifier), code_challenge_method: "S256" });
      if (account.email) url.searchParams.set("login_hint", account.email);
      async function authorize(interactive) {
        const request = new URL(url.href);
        if (!interactive) request.searchParams.set("prompt", "none");
        let redirected;
        try { redirected = await identity.launchWebAuthFlow({ url: request.href, interactive,
          ...(!interactive ? { abortOnLoadForNonInteractive: false,
            timeoutMsForNonInteractive: 8000 } : {}) }); }
        catch { if (!interactive) return null; throw failure("consent"); }
        let response;
        try { response = new URL(redirected); } catch { throw failure("consent"); }
        const expected = new URL(redirect);
        if (response.origin !== expected.origin || response.pathname !== expected.pathname ||
            response.searchParams.get("state") !== state) throw failure("consent");
        const error = response.searchParams.get("error");
        if (!interactive && ["login_required", "interaction_required", "consent_required",
          "account_selection_required"].includes(error)) return null;
        const code = response.searchParams.get("code");
        if (!code || error) throw failure("consent");
        return code;
      }
      const code = await authorize(false) || await authorize(true);
      let result;
      try { result = await fetcher("https://login.microsoftonline.com/organizations/oauth2/v2.0/token", {
        method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
        signal: AbortSignal.timeout(15000),
        body: new URLSearchParams({ client_id: clientId, grant_type: "authorization_code",
          code, redirect_uri: redirect, code_verifier: verifier, scope: SCOPE }) }); }
      catch { throw failure("consent"); }
      if (!result.ok) throw failure("consent");
      const payload = await result.json();
      if (!payload.access_token || !Number.isFinite(Number(payload.expires_in)) ||
          Number(payload.expires_in) <= 0) throw failure("consent");
      token = { value: payload.access_token, owner, clientId,
        expiresAt: now() + Math.min(Number(payload.expires_in), 3600) * 1000 };
      if (sessionStorage) {
        try { await sessionStorage.set({ [sessionKey]: token }); }
        catch { /* Keep working with the page memory cache. */ }
      }
      return token.value;
    }
    async function createDraft({ reportKey, email }) {
      if (busy) throw failure("busy");
      busy = true;
      try {
        if (!reportKey || !email?.to || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/u.test(email.to)) {
          throw failure("configuration");
        }
        const attachments = email.attachments || [];
        if (!attachments.length || attachments.some(item => item.mediaType !== "application/pdf" ||
            !/^[A-Za-z0-9+/]+={0,2}$/u.test(item.base64) || item.base64.length % 4 !== 0 ||
            item.base64.length * 3 / 4 >= 3 * 1024 * 1024)) throw failure("size");
        const body = JSON.stringify({ subject: email.subject, importance: email.importance,
          body: { contentType: "HTML", content: email.htmlBody },
          toRecipients: [{ emailAddress: { address: email.to } }],
          attachments: attachments.map(item => ({ "@odata.type": "#microsoft.graph.fileAttachment",
            name: item.fileName, contentType: item.mediaType, contentBytes: item.base64 })) });
        if (new TextEncoder().encode(body).length > 3800000) throw failure("size");
        const accessToken = await authenticate();
        const headers = { Authorization: "Bearer " + accessToken };
        async function openExisting(id) {
          if (!id || typeof id !== "string") return { webLink: DRAFTS, reused: true, recovery: true };
          let existing;
          try { existing = await fetcher(GRAPH + "/" + encodeURIComponent(id) + "?$select=id,isDraft,webLink", {
            method: "GET", headers, signal: AbortSignal.timeout(15000) }); }
          catch { return { webLink: DRAFTS, reused: true, recovery: true }; }
          if (existing.status === 401) { await clearToken(); throw failure("consent"); }
          if (!existing.ok) return { webLink: DRAFTS, reused: true, recovery: true };
          let message;
          try { message = await existing.json(); }
          catch { return { webLink: DRAFTS, reused: true, recovery: true }; }
          if (message.id !== id || message.isDraft !== true) {
            return { webLink: DRAFTS, reused: true, recovery: true };
          }
          const webLink = safeLink(message.webLink);
          if (!webLink) return { webLink: DRAFTS, reused: true, recovery: true };
          const composeLink = new URL("/mail/deeplink/compose/" + encodeURIComponent(id), webLink);
          composeLink.search = new URLSearchParams({ ItemID: id, exvsurl: "1" });
          return { webLink: composeLink.href, reused: true };
        }
        let result;
        try { result = await fetcher(GRAPH, { method: "POST",
          headers: { Authorization: "Bearer " + accessToken, "Content-Type": "application/json" },
          body, signal: AbortSignal.timeout(30000) }); }
        catch { throw failure("uncertain"); }
        if (!result.ok) {
          if (result.status >= 500 || result.status === 408) throw failure("uncertain");
          if (result.status === 401) await clearToken();
          throw failure([401, 403].includes(result.status) ? "consent" : "failed");
        }
        let created;
        try { created = await result.json(); } catch { throw failure("uncertain"); }
        if (!created.id || created.isDraft !== true) throw failure("uncertain");
        const opened = await openExisting(created.id);
        return { webLink: opened.webLink, recovery: Boolean(opened.recovery) };
      } finally { busy = false; }
    }
    async function draft(request) {
      if (!locks) return createDraft(request);
      const lockKey = "bc-outlook-draft:" + await digest(clientId + ":" +
        request.reportKey + ":" + request.email?.to);
      return locks.request(lockKey, () => createDraft(request));
    }
    return { draft, clearToken };
  }
  return { create, safeLink, SCOPE };
});
