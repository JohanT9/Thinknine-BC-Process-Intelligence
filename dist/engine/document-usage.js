(function(root,factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.T9DocumentUsage = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function() {
  const KEY = "bcDocumentUsageV1";
  function create({ storage, account, send, digest, now = () => new Date().toISOString() }) {
    let operations = Promise.resolve();
    let sending = null;
    function serial(action) { const next = operations.then(action); operations = next.catch(() => {}); return next; }
    const owner = profile => profile?.tenantId && profile?.objectId
      ? profile.tenantId + ":" + profile.objectId : null;
    async function enqueue(kind, id) {
      const profile = await account();
      const user = owner(profile);
      if (!user || !id) return;
      const documentId = await digest(String(id));
      await serial(async () => {
        const entries = (await storage.get(KEY))[KEY] || {};
        const key = kind + ":" + documentId;
        if (!entries[key]) { entries[key] = { owner: user, pending: true,
          event: { kind, documentId, createdAt: now() } }; await storage.set({ [KEY]: entries }); }
      });
    }
    function flush() {
      if (sending) return sending;
      sending = (async () => {
        await operations;
        const user = owner(await account());
        if (!user) return;
        const entries = (await storage.get(KEY))[KEY] || {};
        for (const [key, item] of Object.entries(entries)) {
          if (!item.pending || item.owner !== user) continue;
          if (owner(await account()) !== user) return;
          await send(item.event, user);
          await serial(async () => {
            const current = (await storage.get(KEY))[KEY] || {};
            if (current[key]?.owner === user) {
              current[key] = { owner: user, pending: false };
              await storage.set({ [KEY]: current });
            }
          });
        }
      })().finally(() => { sending = null; });
      return sending;
    }
    return { enqueue, flush };
  }
  return { create };
});
