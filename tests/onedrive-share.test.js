"use strict";
const assert = require("assert");
const share = require("../src/document/onedrive-share.js");

const OWNER = "tenant:user";
const LINK = "https://contoso-my.sharepoint.com/:w:/g/personal/anna/EaBc";
const blob = new Blob(["docx"]);
const ok = (body, status = 200) => ({ ok: status < 300, status, json: async () => body });

function client(responses, { token = "token" } = {}) {
  const calls = [];
  const scopes = [];
  const api = share.create({
    authenticate: async scope => { scopes.push(scope); return token; },
    fetcher: async (url, options) => {
      calls.push({ url, method: options.method, body: options.body, headers: options.headers });
      const next = responses.shift();
      if (next instanceof Error) throw next;
      return next;
    },
    now: () => "2026-11-18T10:00:00.000Z"
  });
  return { api, calls, scopes };
}

(async () => {
  // File names OneDrive accepts.
  assert.equal(share.fileName("Skapa: inköpsorder?"), "Skapa inköpsorder.docx");
  assert.equal(share.fileName("Order.docx"), "Order.docx");
  assert.equal(share.fileName("  ..  "), "BC Process Studio.docx");
  assert.equal(share.safeLink(LINK), LINK);
  assert.equal(share.safeLink("http://contoso.sharepoint.com/x"), null);
  assert.equal(share.safeLink("https://evil.example/x"), null);
  assert.equal(share.safeLink("https://sharepoint.com.evil.example/x"), null);

  // First share: a new file in the folder, never replacing another file, then a view link
  // for the organization.
  {
    const { api, calls, scopes } = client([ok({ id: "item1", name: "Order.docx" }, 201),
      ok({ id: "perm1", link: { webUrl: LINK } })]);
    const steps = [];
    const result = await api.share({ blob, name: "Order", owner: OWNER, revision: "r1",
      onProgress: step => steps.push(step) });
    assert.deepEqual(steps, ["signin", "upload", "link"]);
    assert.deepEqual(scopes, ["https://graph.microsoft.com/Files.ReadWrite"]);
    assert.equal(calls[0].method, "PUT");
    assert.equal(calls[0].url, "https://graph.microsoft.com/v1.0/me/drive/root:/BC%20Process%20Studio/Order.docx:/content?@microsoft.graph.conflictBehavior=rename");
    assert.equal(calls[0].headers.Authorization, "Bearer token");
    assert.equal(calls[1].url, "https://graph.microsoft.com/v1.0/me/drive/items/item1/createLink");
    assert.deepEqual(JSON.parse(calls[1].body), { type: "view", scope: "organization" });
    assert.deepEqual(result, { owner: OWNER, itemId: "item1", permissionId: "perm1", link: LINK,
      fileName: "Order.docx", folder: "BC Process Studio", sharedAt: "2026-11-18T10:00:00.000Z",
      revision: "r1", firstSharedAt: "2026-11-18T10:00:00.000Z", linkChanged: false });
  }

  // Sharing again replaces the same file, so the link stays the same.
  {
    const previous = { owner: OWNER, itemId: "item1", permissionId: "perm1", link: LINK,
      sharedAt: "2026-11-01T00:00:00.000Z", revision: "r1" };
    const { api, calls } = client([ok({ id: "item1", name: "Order.docx" }),
      ok({ id: "perm1", link: { webUrl: LINK } })]);
    const result = await api.share({ blob, name: "Order", owner: OWNER, revision: "r2", previous });
    assert.equal(calls[0].url, "https://graph.microsoft.com/v1.0/me/drive/items/item1/content");
    assert.equal(result.linkChanged, false);
    assert.equal(result.revision, "r2");
    assert.equal(result.firstSharedAt, "2026-11-01T00:00:00.000Z");
  }

  // The file was removed in OneDrive: a new file and a new link, and the user is told.
  {
    const previous = { owner: OWNER, itemId: "gone", permissionId: "perm1", link: LINK, revision: "r1" };
    const other = "https://contoso-my.sharepoint.com/:w:/g/personal/anna/Xyz";
    const { api, calls } = client([ok({}, 404), ok({ id: "item2", name: "Order.docx" }, 201),
      ok({ id: "perm2", link: { webUrl: other } })]);
    const result = await api.share({ blob, name: "Order", owner: OWNER, revision: "r2", previous });
    assert.match(calls[1].url, /root:\/BC%20Process%20Studio\/Order\.docx:\/content/u);
    assert.equal(result.itemId, "item2");
    assert.equal(result.linkChanged, true);
  }

  // A share made by another account is never touched.
  {
    const previous = { owner: "other:account", itemId: "item1", link: LINK };
    const { api, calls } = client([ok({ id: "item9" }, 201), ok({ id: "p", link: { webUrl: LINK } })]);
    await api.share({ blob, name: "Order", owner: OWNER, revision: "r1", previous });
    assert.match(calls[0].url, /root:/u);
    const stopped = client([]);
    assert.deepEqual(await stopped.api.stop({ previous, owner: OWNER }), { stopped: true });
    assert.equal(stopped.calls.length, 0);
  }

  // Failures say what the user can do.
  const code = async (responses, options = {}) => {
    const { api } = client(responses, options);
    try { await api.share({ blob, name: "Order", owner: OWNER, revision: "r1" }); }
    catch (error) { return error.shareCode; }
    return "none";
  };
  assert.equal(await code([ok({}, 401)]), "consent");
  assert.equal(await code([ok({}, 403)]), "denied");
  assert.equal(await code([ok({ id: "i" }, 201), ok({}, 403)]), "policy");
  assert.equal(await code([ok({}, 507)]), "quota");
  assert.equal(await code([ok({}, 503)]), "busyService");
  assert.equal(await code([new Error("offline")]), "network");
  assert.equal(await code([ok({ id: "i" }, 201), ok({ id: "p", link: { webUrl: "https://evil.example/x" } })]), "failed");
  assert.equal(await code([], { token: null }), "consent");
  {
    const { api } = client([]);
    await assert.rejects(api.share({ blob: new Blob([]), name: "x", owner: OWNER }), /failed/u);
    await assert.rejects(api.share({ blob: { size: share.MAX_BYTES + 1 }, name: "x", owner: OWNER }), /size/u);
  }
  // One share at a time.
  {
    let release;
    const { api } = client([]);
    const slow = share.create({ authenticate: () => new Promise(resolve => { release = resolve; }),
      fetcher: async () => ok({ id: "i", link: { webUrl: LINK } }) });
    const first = slow.share({ blob, name: "x", owner: OWNER });
    await assert.rejects(slow.share({ blob, name: "x", owner: OWNER }), /busy/u);
    release("t");
    await first;
    assert.ok(api);
  }

  // Stop sharing removes the link and keeps the file.
  {
    const previous = { owner: OWNER, itemId: "item1", permissionId: "perm1", link: LINK };
    const { api, calls } = client([ok({}, 204)]);
    assert.deepEqual(await api.stop({ previous, owner: OWNER }), { stopped: true });
    assert.equal(calls[0].method, "DELETE");
    assert.equal(calls[0].url, "https://graph.microsoft.com/v1.0/me/drive/items/item1/permissions/perm1");
    const gone = client([ok({}, 404)]);
    assert.deepEqual(await gone.api.stop({ previous, owner: OWNER }), { stopped: true });
    const denied = client([ok({}, 403)]);
    await assert.rejects(denied.api.stop({ previous, owner: OWNER }), error => error.shareCode === "denied");
    // Without a kept permission id, the link is found among the file's permissions.
    const lookup = client([ok({ value: [{ id: "x", link: { webUrl: "https://contoso-my.sharepoint.com/other" } },
      { id: "perm7", link: { webUrl: LINK } }] }), ok({}, 204)]);
    await lookup.api.stop({ previous: { ...previous, permissionId: "" }, owner: OWNER });
    assert.match(lookup.calls[1].url, /permissions\/perm7$/u);
  }

  // A shared version is older once the document changes.
  assert.equal(share.isOutdated({ sharedAt: "2026-11-18T10:00:00.000Z" }, "2026-11-18T11:00:00.000Z"), true);
  assert.equal(share.isOutdated({ sharedAt: "2026-11-18T10:00:00.000Z" }, "2026-11-18T10:00:00.000Z"), false);
  assert.equal(share.isOutdated({ sharedAt: "2026-11-18T10:00:00.000Z" }, ""), false);
  assert.equal(share.isOutdated(null, "2026-11-18T11:00:00.000Z"), false);

  console.log("OneDrive share tests passed.");
})().catch(error => { console.error(error); process.exitCode = 1; });
