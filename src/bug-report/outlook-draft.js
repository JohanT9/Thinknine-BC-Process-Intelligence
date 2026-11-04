(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9OutlookDraft = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const GRAPH = "https://graph.microsoft.com/v1.0/me/messages";
  const DRAFTS = "https://outlook.office.com/mail/drafts";
  const SCOPE = "https://graph.microsoft.com/Mail.ReadWrite";
  // Sending directly is a separate permission, asked for only when the user sends directly,
  // so drafts keep working where it has not been approved.
  const SEND_SCOPE = "https://graph.microsoft.com/Mail.Send";
  const SEND_MAIL = "https://graph.microsoft.com/v1.0/me/sendMail";
  // Recipient suggestions from the people Microsoft 365 ranks as relevant to the user.
  const PEOPLE_SCOPE = "https://graph.microsoft.com/People.Read";
  const PEOPLE = "https://graph.microsoft.com/v1.0/me/people";
  function safeLink(value) {
    try {
      const url = new URL(value);
      return url.protocol === "https:" && !url.username && !url.password &&
        ["outlook.office.com", "outlook.office365.com", "outlook.live.com"].includes(url.hostname)
        ? url.href : null;
    } catch { return null; }
  }
  const ADDRESS = /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/u;
  // Several addresses separated by commas, semicolons or spaces, without repeats; invalid
  // entries are returned separately so that the sender can correct them.
  function addresses(value) {
    const valid = [], invalid = [], seen = new Set();
    for (const entry of String(value || "").split(/[\s,;]+/u).filter(Boolean)) {
      if (!ADDRESS.test(entry)) { invalid.push(entry); continue; }
      if (seen.has(entry.toLowerCase())) continue;
      seen.add(entry.toLowerCase());
      valid.push(entry);
    }
    return { valid, invalid };
  }
  const failure = code => Object.assign(new Error(code), { outlookCode: code });
  function create({ identity, fetcher, clientId, cryptoApi = globalThis.crypto,
    now = Date.now, locks = globalThis.navigator?.locks, sessionStorage = null,
    getAccount = async () => ({}) }) {
    // One access token per permission, in memory and in the browser session.
    const tokens = new Map();
    const sessionKeys = new Map();
    let busy = false;
    async function clearToken() {
      tokens.clear();
      if (sessionStorage) {
        for (const key of sessionKeys.values()) {
          try { await sessionStorage.remove(key); } catch { /* Memory cache is already cleared. */ }
        }
      }
    }
    const encode = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes)))
      .replace(/\+/gu, "-").replace(/\//gu, "_").replace(/=+$/gu, "");
    const random = size => encode(cryptoApi.getRandomValues(new Uint8Array(size)));
    const digest = async text => encode(await cryptoApi.subtle.digest("SHA-256",
      new TextEncoder().encode(text)));
    // Without interactive, only silent sign-in is tried and null means the user is needed.
    async function authenticate(scope = SCOPE, { interactive = true } = {}) {
      const account = await getAccount();
      const owner = String(account.tenantId || "") + ":" + String(account.objectId || "");
      // The draft permission keeps its existing session key.
      const sessionKey = "t9OutlookAuthSessionV1:" + await digest(clientId + ":" + owner +
        (scope === SCOPE ? "" : ":" + scope));
      sessionKeys.set(scope, sessionKey);
      let token = tokens.get(scope) || null;
      if (token?.owner === owner && token.expiresAt > now() + 60000) return token.value;
      token = null;
      tokens.delete(scope);
      if (sessionStorage) {
        try {
          const cached = (await sessionStorage.get(sessionKey))[sessionKey];
          if (cached?.owner === owner && cached.clientId === clientId &&
              typeof cached.value === "string" && cached.value &&
              Number.isFinite(cached.expiresAt) && cached.expiresAt > now() + 60000 &&
              cached.expiresAt <= now() + 3600000) {
            tokens.set(scope, cached);
            return cached.value;
          }
        } catch { /* Continue with Entra if the session cache is unavailable. */ }
      }
      if (!clientId) throw failure("configuration");
      const verifier = random(48), state = random(24);
      // Reuse the application's already registered Entra redirect, not its license token.
      const redirect = identity.getRedirectURL("entra");
      const url = new URL("https://login.microsoftonline.com/organizations/oauth2/v2.0/authorize");
      url.search = new URLSearchParams({ client_id: clientId, response_type: "code",
        redirect_uri: redirect, response_mode: "query", scope,
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
      const code = await authorize(false) || (interactive ? await authorize(true) : null);
      if (!code) return null;
      let result;
      try { result = await fetcher("https://login.microsoftonline.com/organizations/oauth2/v2.0/token", {
        method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
        signal: AbortSignal.timeout(15000),
        body: new URLSearchParams({ client_id: clientId, grant_type: "authorization_code",
          code, redirect_uri: redirect, code_verifier: verifier, scope }) }); }
      catch { throw failure("consent"); }
      if (!result.ok) throw failure("consent");
      const payload = await result.json();
      if (!payload.access_token || !Number.isFinite(Number(payload.expires_in)) ||
          Number(payload.expires_in) <= 0) throw failure("consent");
      token = { value: payload.access_token, owner, clientId,
        expiresAt: now() + Math.min(Number(payload.expires_in), 3600) * 1000 };
      tokens.set(scope, token);
      if (sessionStorage) {
        try { await sessionStorage.set({ [sessionKey]: token }); }
        catch { /* Keep working with the page memory cache. */ }
      }
      return token.value;
    }
    // The message as Graph takes it, with the PDF attached; Graph accepts up to about 4 MB.
    function graphMessage(email) {
      const attachments = email.attachments || [];
      if (!attachments.length || attachments.some(item => item.mediaType !== "application/pdf" ||
          !/^[A-Za-z0-9+/]+={0,2}$/u.test(item.base64) || item.base64.length % 4 !== 0 ||
          item.base64.length * 3 / 4 >= 3 * 1024 * 1024)) throw failure("size");
      return { subject: email.subject, importance: email.importance,
        body: { contentType: "HTML", content: email.htmlBody },
        toRecipients: recipients(email.to),
        ...(email.cc ? { ccRecipients: recipients(email.cc) } : {}),
        attachments: attachments.map(item => ({ "@odata.type": "#microsoft.graph.fileAttachment",
          name: item.fileName, contentType: item.mediaType, contentBytes: item.base64 })) };
    }
    const recipients = value => addresses(value).valid.map(address => ({ emailAddress: { address } }));
    // At least one recipient, and no address that Graph would have to guess at.
    const validRequest = ({ reportKey, email }) => {
      const to = addresses(email?.to), cc = addresses(email?.cc);
      return Boolean(reportKey && to.valid.length && !to.invalid.length && !cc.invalid.length);
    };
    async function createDraft({ reportKey, email }) {
      if (busy) throw failure("busy");
      busy = true;
      try {
        if (!validRequest({ reportKey, email })) throw failure("configuration");
        const body = JSON.stringify(graphMessage(email));
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
          // Graph's own link opens the draft; Outlook on the web's compose link does not open
          // an existing draft and shows the mailbox. Graph names outlook.office365.com, where
          // the browser has a sign-in of its own; work accounts use outlook.office.com.
          const draftLink = new URL(webLink);
          if (draftLink.hostname === "outlook.office365.com") draftLink.hostname = "outlook.office.com";
          return { webLink: draftLink.href, reused: true };
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
    // Sends the email from the user's mailbox; Graph keeps a copy in Sent Items. A request
    // without a confirmed answer may still have been sent, so it is reported as uncertain and
    // never repeated here.
    async function sendDirect({ reportKey, email }) {
      if (busy) throw failure("busy");
      busy = true;
      try {
        if (!validRequest({ reportKey, email })) throw failure("configuration");
        const body = JSON.stringify({ message: graphMessage(email), saveToSentItems: true });
        if (new TextEncoder().encode(body).length > 3800000) throw failure("size");
        const accessToken = await authenticate(SEND_SCOPE);
        let result;
        try { result = await fetcher(SEND_MAIL, { method: "POST",
          headers: { Authorization: "Bearer " + accessToken, "Content-Type": "application/json" },
          body, signal: AbortSignal.timeout(30000) }); }
        catch { throw failure("uncertain"); }
        if (result.status === 202 || result.ok) return { sent: true };
        if (result.status >= 500 || result.status === 408 || result.status === 429) {
          throw failure("uncertain");
        }
        if (result.status === 401) await clearToken();
        throw failure([401, 403].includes(result.status) ? "consent" : "failed");
      } finally { busy = false; }
    }
    async function send(request) {
      if (!locks) return sendDirect(request);
      const lockKey = "bc-outlook-send:" + await digest(clientId + ":" +
        request.reportKey + ":" + request.email?.to);
      return locks.request(lockKey, () => sendDirect(request));
    }
    // Up to eight people matching the text, each with a valid address. Typing never opens a
    // sign-in window: without interactive the result is null when sign-in needs the user.
    async function people(query, { interactive = false } = {}) {
      const term = String(query || "").replace(/["\\]/gu, "").trim().slice(0, 64);
      const accessToken = await authenticate(PEOPLE_SCOPE, { interactive });
      if (!accessToken) return null;
      if (!term) return [];
      const url = new URL(PEOPLE);
      url.search = new URLSearchParams({ $search: `"${term}"`, $top: "8",
        $select: "displayName,scoredEmailAddresses" });
      let result;
      try { result = await fetcher(url.href, { method: "GET",
        headers: { Authorization: "Bearer " + accessToken }, signal: AbortSignal.timeout(10000) }); }
      catch { throw failure("failed"); }
      if (result.status === 401) { await clearToken(); return null; }
      if (result.status === 403) throw failure("consent");
      if (!result.ok) throw failure("failed");
      let payload;
      try { payload = await result.json(); } catch { throw failure("failed"); }
      const found = [], seen = new Set();
      for (const person of Array.isArray(payload?.value) ? payload.value : []) {
        for (const item of Array.isArray(person?.scoredEmailAddresses) ? person.scoredEmailAddresses : []) {
          const address = String(item?.address || "");
          if (!ADDRESS.test(address) || seen.has(address.toLowerCase())) continue;
          seen.add(address.toLowerCase());
          found.push({ name: String(person.displayName || ""), address });
        }
      }
      return found.slice(0, 8);
    }
    async function draft(request) {
      if (!locks) return createDraft(request);
      const lockKey = "bc-outlook-draft:" + await digest(clientId + ":" +
        request.reportKey + ":" + request.email?.to);
      return locks.request(lockKey, () => createDraft(request));
    }
    return { draft, send, people, clearToken };
  }
  return { create, safeLink, addresses, SCOPE, SEND_SCOPE, PEOPLE_SCOPE };
});
