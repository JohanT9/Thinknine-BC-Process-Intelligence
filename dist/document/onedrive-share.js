(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9OneDriveShare = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  // Sharing a process document as a link: the Word file is put in the user's own OneDrive, in
  // the folder BC Process Studio, and a view-only link for people in the user's organization is
  // made for it. Recipients read it in Word for the web. Sharing again replaces the same file,
  // so the link stays the same and shows the new version; OneDrive keeps the earlier versions.
  // Nothing is stored by BC Process Studio outside the user's own Microsoft 365.
  //
  // Delegated Files.ReadWrite is the least permission that can upload to the user's own drive
  // and make a link for it. It is asked for only when the user shares.
  const SCOPE = "https://graph.microsoft.com/Files.ReadWrite";
  const DRIVE = "https://graph.microsoft.com/v1.0/me/drive";
  const FOLDER = "BC Process Studio";
  const WORD_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  // Graph uploads a file in one request up to 250 MB.
  const MAX_BYTES = 250 * 1024 * 1024;

  const failure = code => Object.assign(new Error(code), { shareCode: code });

  // A link Graph made for the user's own drive: https on SharePoint, nothing else.
  function safeLink(value) {
    try {
      const url = new URL(value);
      return url.protocol === "https:" && !url.username && !url.password &&
        (url.hostname === "sharepoint.com" || url.hostname.endsWith(".sharepoint.com"))
        ? url.href : null;
    } catch { return null; }
  }

  // A file name OneDrive accepts: no characters it refuses, no leading or trailing dots or
  // spaces, and always ending in .docx.
  function fileName(value) {
    const base = String(value || "").replace(/\.docx$/iu, "")
      .replace(/["*:<>?/\\|#%\u0000-\u001f]/gu, " ").replace(/\s+/gu, " ")
      .replace(/^[\s.]+|[\s.]+$/gu, "").slice(0, 120).trim();
    return (base || "BC Process Studio") + ".docx";
  }

  // The share kept for a document, if it is one this account made and still looks whole.
  function ownShare(share, owner) {
    return share && typeof share === "object" && share.owner === owner &&
      typeof share.itemId === "string" && share.itemId && safeLink(share.link) ? share : null;
  }

  // Whether the document has changed since it was shared: changedAt is when it last changed.
  function isOutdated(share, changedAt) {
    const changed = Date.parse(changedAt), shared = Date.parse(share?.sharedAt);
    return Number.isFinite(changed) && Number.isFinite(shared) && changed > shared;
  }

  function create({ authenticate, fetcher, now = () => new Date().toISOString() }) {
    if (typeof authenticate !== "function" || typeof fetcher !== "function") {
      throw new Error("authenticate and fetcher are required");
    }
    let busy = false;

    async function call(url, options, { timeout = 30000 } = {}) {
      let response;
      try { response = await fetcher(url, { ...options, signal: AbortSignal.timeout(timeout) }); }
      catch { throw failure("network"); }
      return response;
    }
    // What a refused request means for the user.
    function refused(response, step) {
      if (response.status === 401) return failure("consent");
      if (response.status === 403) return failure(step === "link" ? "policy" : "denied");
      if (response.status === 507) return failure("quota");
      if (response.status === 413) return failure("size");
      if (response.status === 429 || response.status >= 500 || response.status === 408) return failure("busyService");
      return failure("failed");
    }
    async function json(response) {
      try { return await response.json(); } catch { throw failure("failed"); }
    }

    async function upload(token, blob, name, itemId) {
      const url = itemId
        ? `${DRIVE}/items/${encodeURIComponent(itemId)}/content`
        // A new file never replaces another file of the same name: OneDrive adds a number.
        : `${DRIVE}/root:/${encodeURIComponent(FOLDER)}/${encodeURIComponent(name)}:/content` +
          "?@microsoft.graph.conflictBehavior=rename";
      const response = await call(url, { method: "PUT",
        headers: { Authorization: "Bearer " + token, "Content-Type": WORD_TYPE }, body: blob },
      { timeout: 120000 });
      if (itemId && response.status === 404) return null;
      if (!response.ok) throw refused(response, "upload");
      const item = await json(response);
      if (!item?.id || typeof item.id !== "string") throw failure("failed");
      return item;
    }

    async function link(token, itemId) {
      // Graph returns the existing link when one of this kind is already there.
      const response = await call(`${DRIVE}/items/${encodeURIComponent(itemId)}/createLink`, {
        method: "POST", headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
        body: JSON.stringify({ type: "view", scope: "organization" }) });
      if (!response.ok) throw refused(response, "link");
      const permission = await json(response);
      const webUrl = safeLink(permission?.link?.webUrl);
      if (!webUrl) throw failure("failed");
      return { permissionId: typeof permission.id === "string" ? permission.id : "", link: webUrl };
    }

    // Shares the Word file, or replaces the file of an earlier share. onProgress gets
    // "signin", "upload" and "link" as each step starts. The result is the share to keep.
    async function share({ blob, name, owner, revision, previous = null, onProgress = () => {} }) {
      if (busy) throw failure("busy");
      busy = true;
      try {
        if (!blob || !Number.isFinite(blob.size) || blob.size <= 0) throw failure("failed");
        if (blob.size > MAX_BYTES) throw failure("size");
        onProgress("signin");
        const token = await authenticate(SCOPE);
        if (!token) throw failure("consent");
        const earlier = ownShare(previous, owner);
        onProgress("upload");
        let item = await upload(token, blob, fileName(name), earlier?.itemId);
        // The earlier file is gone, for example removed in OneDrive: a new file gets a new link.
        const relinked = Boolean(earlier && !item);
        if (!item) item = await upload(token, blob, fileName(name), "");
        onProgress("link");
        const made = await link(token, item.id);
        return { owner, itemId: item.id, permissionId: made.permissionId, link: made.link,
          fileName: typeof item.name === "string" && item.name ? item.name : fileName(name),
          folder: FOLDER, sharedAt: now(), revision: String(revision || ""),
          firstSharedAt: earlier?.firstSharedAt || earlier?.sharedAt || now(),
          linkChanged: relinked || Boolean(earlier && earlier.link !== made.link) };
      } finally {
        busy = false;
      }
    }

    // Removes the link. The file stays in the user's OneDrive; only the user removes it there.
    async function stop({ previous, owner }) {
      const earlier = ownShare(previous, owner);
      if (!earlier) return { stopped: true };
      if (busy) throw failure("busy");
      busy = true;
      try {
        const token = await authenticate(SCOPE);
        if (!token) throw failure("consent");
        const headers = { Authorization: "Bearer " + token };
        let permissionId = earlier.permissionId;
        if (!permissionId) {
          const response = await call(`${DRIVE}/items/${encodeURIComponent(earlier.itemId)}/permissions`,
            { method: "GET", headers });
          if (response.status === 404) return { stopped: true };
          if (!response.ok) throw refused(response, "stop");
          const list = await json(response);
          permissionId = (Array.isArray(list?.value) ? list.value : [])
            .find(entry => safeLink(entry?.link?.webUrl) === earlier.link)?.id || "";
          if (!permissionId) return { stopped: true };
        }
        const response = await call(`${DRIVE}/items/${encodeURIComponent(earlier.itemId)}/permissions/` +
          encodeURIComponent(permissionId), { method: "DELETE", headers });
        if (response.status === 404 || response.ok) return { stopped: true };
        throw refused(response, "stop");
      } finally {
        busy = false;
      }
    }

    return { share, stop };
  }

  return { create, safeLink, fileName, ownShare, isOutdated, SCOPE, FOLDER, MAX_BYTES };
});
