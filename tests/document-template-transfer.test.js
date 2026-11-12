// Document templates moving between computers (phase 3 of document/document-template.js):
// with exported documents, through the synchronized folder and as a file of their own.
const assert = require("node:assert/strict");
const keys = require("../src/engine/storage-keys");
const model = require("../src/document/document-template");
const transfer = require("../src/document/library-transfer");
const sync = require("../src/document/library-sync");
const folderModel = require("../src/document/document-folders");
const library = require("../src/document/document-library");

function storage() {
  const data = new Map();
  const area = {
    data, sets: 0, failAt: 0,
    async getKeys() { return [...data.keys()]; },
    async get(request) {
      if (request === null) return Object.fromEntries(data);
      const list = Array.isArray(request) ? request : [request];
      return Object.fromEntries(list.filter(key => data.has(key))
        .map(key => [key, JSON.parse(JSON.stringify(data.get(key)))]));
    },
    async set(values) {
      area.sets += 1;
      if (area.sets === area.failAt) throw new Error("QUOTA_BYTES");
      for (const [key, value] of Object.entries(values)) data.set(key, JSON.parse(JSON.stringify(value)));
    },
    async remove(request) { (Array.isArray(request) ? request : [request]).forEach(key => data.delete(key)); }
  };
  return area;
}

function addDocument(area, id) {
  area.data.set(`t9_session_${id}`, { id, name: `Order ${id}`, status: "completed" });
  area.data.set(`t9_review_${id}`, { sessionId: id, tasks: [{ taskId: "t1", title: "Steg" }] });
}
const record = (id, themeId) => library.normalize({ projectId: id, sessionId: id, title: `Order ${id}`,
  modifiedAt: "2026-11-01T08:00:00.000Z", theme: { themeId, displayName: "Acme" } });

const logo = { dataUrl: "data:image/png;base64,iVBORw0KGgo=", width: 40, height: 20 };
const acme = model.create(model.builtIn("corporate"), { templateId: "template-acme", name: "Acme AB",
  now: "2026-11-10T08:00:00.000Z" });
const acmeStyled = model.update(acme, { company: "Acme AB", color: "#5b2a86", logo,
  sections: { toc: true, prerequisites: false }, purposeText: "Så här arbetar vi på Acme." },
"2026-11-10T09:00:00.000Z");
const other = model.create(model.builtIn("minimal"), { templateId: "template-other", name: "Annan",
  now: "2026-11-10T08:00:00.000Z" });

async function exportText(area, items, templates) {
  const list = [];
  for await (const line of transfer.exportLines({ storage: area, keys, items, templates,
    exportedAt: "2026-11-12T10:00:00.000Z", appVersion: "4.7.256" })) list.push(line);
  return list.join("\n") + "\n";
}
async function* chunks(text) { for (let i = 0; i < text.length; i += 41) yield text.slice(i, i + 41); }
const lines = text => transfer.splitLines(chunks(text));

async function importInto(area, text, { templates = [], records = [] } = {}) {
  const inspection = await transfer.read(lines(text), keys);
  const local = await transfer.localDigests(area, keys, inspection.items.map(item => item.id));
  const planned = transfer.plan({ inspection, local, records, tree: folderModel.empty(), templates });
  const change = transfer.changes(planned, { records, tree: folderModel.empty(), normalize: library.normalize });
  let saved = null;
  const meta = await transfer.apply({ storage: area, keys, lines: lines(text), change, fileName: "x.bcps",
    saveLibrary: async (tree, nextRecords) => { saved = { tree, records: nextRecords }; } });
  return { planned, change, meta, saved };
}
const storedTemplates = async area => (await model.list(area, keys)).templates;

(async () => {
  // A template file holds the whole template, the logo too, and reads back the same.
  const text = model.fileText(acmeStyled, { exportedAt: "2026-11-12T10:00:00.000Z", appVersion: "4.7.256" });
  const back = model.readFile(text);
  assert.deepEqual(back.template, acmeStyled);
  assert.equal(model.readFile(`\uFEFF${text}`).template.templateId, "template-acme");
  assert.equal(model.fileName(acmeStyled), "BC-Process-Studio-Acme-AB.bcpt");
  assert.throws(() => model.readFile("not json"), error => error.code === "notTemplate");
  assert.throws(() => model.readFile(JSON.stringify({ format: "other" })), error => error.code === "notTemplate");
  assert.throws(() => model.readFile(JSON.stringify({ format: model.FILE_FORMAT, formatVersion: 2, template: acme })),
    error => error.code === "newerVersion");
  assert.throws(() => model.readFile(JSON.stringify({ format: model.FILE_FORMAT, formatVersion: 1,
    template: { ...acme, schemaVersion: 2 } })), error => error.code === "newerVersion");
  assert.throws(() => model.readFile(JSON.stringify({ format: model.FILE_FORMAT, formatVersion: 1,
    template: { ...acme, templateId: "thinknine" } })), error => error.code === "notTemplate");

  // What taking in templates does: added, kept, or replaced by a later version only.
  const later = model.update(acmeStyled, { color: "#a4262c" }, "2026-11-11T08:00:00.000Z");
  const earlier = model.update(acmeStyled, { color: "#107c10" }, "2026-11-09T08:00:00.000Z");
  const status = (values, local) => model.incoming(values, local).items.map(item => item.status);
  assert.deepEqual(status([acmeStyled], []), ["new"]);
  assert.deepEqual(status([{ ...acmeStyled, updatedAt: "2030-01-01T00:00:00.000Z" }], [acmeStyled]), ["same"]);
  assert.deepEqual(status([later], [acmeStyled]), ["newer"]);
  assert.deepEqual(status([earlier], [acmeStyled]), ["older"]);
  const unreadable = model.incoming([{ templateId: "thinknine" }, { ...acme, schemaVersion: 9 }, acme], []);
  assert.equal(unreadable.unreadable, 2);
  assert.equal(unreadable.writes.length, 1);
  assert.deepEqual(model.usedBy([acmeStyled, other], [record("d1", "template-acme"), record("d2", "corporate")])
    .map(item => item.templateId), ["template-acme"]);

  // An export carries the templates its documents name, and only those.
  const a = storage();
  addDocument(a, "d1");
  addDocument(a, "d2");
  const exported = await exportText(a, [{ id: "d1", record: record("d1", "template-acme") },
    { id: "d2", record: record("d2", "minimal") }], [acmeStyled, other]);
  const header = JSON.parse(exported.split("\n")[0]);
  assert.deepEqual(header.templates.map(item => item.templateId), ["template-acme"]);
  assert.equal(header.templates[0].logo.dataUrl, logo.dataUrl);
  const plain = await exportText(a, [{ id: "d2", record: record("d2", "minimal") }], [acmeStyled]);
  assert.equal(Object.hasOwn(JSON.parse(plain.split("\n")[0]), "templates"), false,
    "A file without templates of the user's own looks as before, for earlier versions.");

  // Imported on another computer: the template is added with its id, so the document follows it.
  const b = storage();
  let run = await importInto(b, exported);
  assert.deepEqual(run.planned.templates.writes.map(item => item.status), ["new"]);
  assert.deepEqual((await storedTemplates(b)).map(item => item.templateId), ["template-acme"]);
  assert.deepEqual((await storedTemplates(b))[0], acmeStyled);
  assert.equal(model.resolve(await storedTemplates(b), run.saved.records
    .find(item => item.projectId === "d1").theme.themeId).company, "Acme AB");
  // Undoing the import removes the template it added.
  await transfer.undo({ storage: b, keys, records: run.saved.records, tree: folderModel.empty(),
    normalize: library.normalize, saveLibrary: async () => {} });
  assert.deepEqual(await storedTemplates(b), []);

  // Importing again where a template is older: it is updated, and undo puts the older one back.
  await model.save(b, keys, earlier);
  run = await importInto(b, exported, { templates: [earlier] });
  assert.deepEqual(run.planned.templates.writes.map(item => item.status), ["newer"]);
  assert.equal((await storedTemplates(b))[0].color, acmeStyled.color);
  await transfer.undo({ storage: b, keys, records: run.saved.records, tree: folderModel.empty(),
    normalize: library.normalize, saveLibrary: async () => {} });
  assert.equal((await storedTemplates(b))[0].color, earlier.color);

  // A template here that was changed later is kept.
  await model.save(b, keys, later);
  run = await importInto(b, exported, { templates: [later] });
  assert.equal(run.change.templates.length, 0);
  assert.equal((await storedTemplates(b))[0].color, later.color);

  // A template changed after the import is not undone.
  const c = storage();
  run = await importInto(c, exported);
  const editedAfter = model.update((await storedTemplates(c))[0], { footer: "Internt" }, "2026-11-12T12:00:00.000Z");
  await model.save(c, keys, editedAfter);
  await transfer.undo({ storage: c, keys, records: run.saved.records, tree: folderModel.empty(),
    normalize: library.normalize, saveLibrary: async () => {} });
  assert.equal((await storedTemplates(c))[0].footer, "Internt");

  // Only templates to take in, no new documents: they are written and can be undone.
  const d = storage();
  addDocument(d, "d1");
  addDocument(d, "d2");
  await model.save(d, keys, earlier);
  const sameDocs = await transfer.localDigests(d, keys, ["d1", "d2"]);
  assert.equal(sameDocs.size, 2);
  run = await importInto(d, exported, { templates: [earlier],
    records: [record("d1", "template-acme"), record("d2", "minimal")] });
  assert.equal(run.change.written.length, 0);
  assert.equal(run.change.templates.length, 1);
  assert.equal((await storedTemplates(d))[0].color, acmeStyled.color);
  assert.equal(run.meta.templates.written[0].templateId, "template-acme");

  // An import that fails while writing leaves the templates as they were.
  const e = storage();
  await model.save(e, keys, earlier);
  const failing = await transfer.read(lines(exported), keys);
  const failPlan = transfer.plan({ inspection: failing, local: new Map(), records: [],
    tree: folderModel.empty(), templates: [earlier] });
  const failChange = transfer.changes(failPlan, { records: [], tree: folderModel.empty() });
  await assert.rejects(transfer.apply({ storage: e, keys, lines: lines(exported), change: failChange,
    saveLibrary: async () => { throw new Error("library could not be saved"); } }));
  assert.equal((await storedTemplates(e))[0].color, earlier.color);
  assert.equal([...e.data.keys()].some(key => key.startsWith("t9_session_")), false);

  // Synchronizing: the manifest lists each computer's templates.
  const files = new Map();
  let clock = Date.parse("2026-11-12T08:00:00.000Z");
  const dir = {
    name: "OneDrive",
    async list(prefix) {
      return [...files].filter(([key]) => key.startsWith(`${prefix}/`))
        .map(([key, value]) => ({ path: key, lastModified: value.lastModified, size: value.text.length }));
    },
    async readText(key) { return files.get(key).text; },
    async readLines(key) { return transfer.splitLines(chunks(files.get(key).text)); },
    async writeText(key, value) { files.set(key, { text: value, lastModified: clock += 1000 }); },
    async writeLines(key, list) {
      const out = [];
      for await (const line of list) out.push(line);
      files.set(key, { text: out.join("\n") + "\n", lastModified: clock += 1000 });
    },
    async remove(key) { files.delete(key); }
  };
  let tick = 0;
  const at = () => new Date(Date.parse("2026-11-12T09:00:00.000Z") + (tick += 60000)).toISOString();
  function computer() {
    const self = { area: storage(), records: [], state: null, tree: folderModel.empty() };
    self.sync = async () => {
      const templates = await storedTemplates(self.area);
      const prepared = await sync.prepare({ dir, storage: self.area, keys, records: self.records,
        state: self.state, tree: self.tree, templates });
      return sync.commit({ prepared, dir, storage: self.area, keys, records: self.records, tree: self.tree,
        state: self.state, now: at(), normalize: library.normalize,
        saveLibrary: async (tree, records) => { self.tree = tree; self.records = records; },
        saveState: async state => { self.state = state; } });
    };
    return self;
  }
  const one = computer();
  const two = computer();
  one.state = sync.connect(null, "OneDrive", at());
  two.state = sync.connect(null, "OneDrive", at());
  addDocument(one.area, "s1");
  one.records = [record("s1", "template-acme")];
  await model.save(one.area, keys, acmeStyled);
  await model.save(one.area, keys, other);
  let result = await one.sync();
  const manifest = JSON.parse(files.get(`devices/${one.state.deviceId}.json`).text);
  assert.deepEqual(manifest.templates.map(item => item.templateId), ["template-acme", "template-other"]);
  assert.equal(result.templatesPulled, 0);

  // The other computer gets the document and its templates.
  result = await two.sync();
  assert.equal(result.pulled, 1);
  assert.equal(result.templatesPulled, 2);
  assert.deepEqual(await storedTemplates(two.area), [acmeStyled, other]);
  assert.equal((await two.sync()).templatesPulled, 0, "Nothing is fetched again when nothing changed.");

  // A change on one computer reaches the other; the older version does not come back.
  const recolored = model.update(acmeStyled, { color: "#0f6cbd" }, at());
  await model.save(two.area, keys, recolored);
  await two.sync();
  result = await one.sync();
  assert.equal(result.templatesPulled, 1);
  assert.equal((await storedTemplates(one.area)).find(item => item.templateId === "template-acme").color, "#0f6cbd");
  assert.equal((await two.sync()).templatesPulled, 0);

  // Changed on both: the later change counts on both computers.
  await model.save(one.area, keys, model.update(recolored, { footer: "Ettan" }, at()));
  await model.save(two.area, keys, model.update(recolored, { footer: "Tvåan" }, at()));
  await one.sync();
  await two.sync();
  await one.sync();
  const footers = async area => (await storedTemplates(area)).find(item => item.templateId === "template-acme").footer;
  assert.equal(await footers(one.area), "Tvåan");
  assert.equal(await footers(two.area), "Tvåan");

  // A template removed on one computer is not fetched again, and stays on the other.
  await model.remove(two.area, keys, "template-other");
  await two.sync();
  await one.sync();
  assert.equal((await two.sync()).templatesPulled, 0);
  assert.equal((await two.sync()).templatesPulled, 0, "It stays removed on later synchronizations too.");
  assert.ok((await storedTemplates(one.area)).some(item => item.templateId === "template-other"));
  // It comes back when it is changed on the other computer afterwards.
  await model.save(one.area, keys, model.update(other, { company: "Ny" }, at()));
  await one.sync();
  result = await two.sync();
  assert.equal(result.templatesPulled, 1);
  assert.equal((await storedTemplates(two.area)).find(item => item.templateId === "template-other").company, "Ny");

  // A manifest from an earlier version has no templates; nothing is fetched or lost.
  const oldManifest = JSON.parse(files.get(`devices/${one.state.deviceId}.json`).text);
  delete oldManifest.templates;
  files.set(`devices/${one.state.deviceId}.json`, { text: JSON.stringify(oldManifest), lastModified: clock += 1000 });
  result = await two.sync();
  assert.equal(result.templatesPulled, 0);
  assert.equal((await storedTemplates(two.area)).length, 2);

  console.log("Document template transfer tests passed.");
})().catch(error => {
  console.error(error);
  process.exit(1);
});
