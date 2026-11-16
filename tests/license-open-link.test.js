// The page a link in an assignment email opens on the license service: in the browser's
// language, without script, without echoing the link, and served for GET and HEAD only.
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { createService } = require("../services/licensing/server.js");
const { language, openPage, OPEN_LANGUAGES } = require("../services/licensing/open-link.js");
const registry = require("../src/engine/language-registry.js");

async function main() {
  // Every registered language of the extension has the page's texts.
  const codes = registry.DEFAULT_DEFINITIONS.filter(item => item.ui).map(item => item.locale.split("-")[0].toLowerCase());
  assert.ok(codes.length >= 8, "the registry lists the languages");
  for (const code of codes) assert.ok(OPEN_LANGUAGES.includes(code), `the page speaks ${code}`);

  assert.equal(language("sv-SE,sv;q=0.9,en;q=0.8"), "sv");
  assert.equal(language("de-CH"), "de");
  assert.equal(language("nn-NO"), "nb", "Norwegian of either kind reads Bokmål");
  assert.equal(language("ja,fi;q=0.5"), "fi", "the first language the page has");
  assert.equal(language("en;q=0.2,da;q=0.9"), "da", "by preference");
  assert.equal(language("xx"), "en");
  assert.equal(language(""), "en");
  assert.ok(!/<script/iu.test(openPage("sv")), "the page runs no script");

  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "t9-open-link-"));
  await fs.writeFile(path.join(directory, "tenants.json"), "{}");
  const server = await createService({ dataDirectory: directory, now: () => Date.parse("2026-11-16T12:00:00Z"),
    entraValidator: async () => { throw Object.assign(new Error("unauthorized"), { status: 401 }); } });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const link = `${base}/open?suite=suite-<b>x</b>&test=run-1`;
    const swedish = await fetch(link, { headers: { "Accept-Language": "sv-SE" } });
    assert.equal(swedish.status, 200);
    assert.match(swedish.headers.get("content-type"), /^text\/html/u);
    assert.match(swedish.headers.get("content-security-policy"), /default-src 'none'/u);
    assert.equal(swedish.headers.get("referrer-policy"), "no-referrer");
    assert.equal(swedish.headers.get("cache-control"), "no-store");
    const page = await swedish.text();
    assert.match(page, /<html lang="sv">/u);
    assert.match(page, /Öppna testet i BC Process Studio/u);
    assert.ok(!page.includes("suite-") && !page.includes("run-1"), "the link is not written into the page");
    const english = await (await fetch(link)).text();
    assert.match(english, /Open the test in BC Process Studio/u);
    const head = await fetch(link, { method: "HEAD" });
    assert.equal(head.status, 200);
    const post = await fetch(link, { method: "POST" });
    assert.equal(post.status, 405);
    assert.equal(post.headers.get("allow"), "GET, HEAD");
    assert.equal((await fetch(`${base}/opener`)).status, 404, "only the exact path");
  } finally {
    server.close();
    await fs.rm(directory, { recursive: true, force: true });
  }
  console.log("License service open-link page tests passed.");
}
main().catch(error => { console.error(error); process.exit(1); });
