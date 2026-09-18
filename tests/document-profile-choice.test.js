const assert = require("assert");
const fs = require("fs");
const vm = require("vm");
const source = fs.readFileSync("src/ui/dashboard.js", "utf8");
const profiles = require("../src/document/document-profile").BUILT_IN_PROFILES;
const helper = source.slice(source.indexOf("function activeDocumentThemeId()"),
  source.indexOf("function renderDocumentProfileChoice()"));
const handler = source.slice(source.indexOf('$("reviewDocumentProfile").addEventListener'),
  source.indexOf('$("reviewDocumentLanguage").addEventListener'));
async function test(fail) {
  const elements = {};
  let callback;
  let patch;
  const context = {
    activeDocumentProfileId: "business-process", activeReview: {},
    activeReviewSession: { id: "s" }, documentLibraryRecords: [],
    T9DocumentThemeRegistry: { list: () => [{ themeId: "minimal" }, { themeId: "corporate" }] },
    documentProfiles: () => profiles, uiT: x => x,
    $: id => elements[id] ||= { textContent: "", addEventListener: (_, fn) => { callback = fn; } },
    updateDocumentLibraryRecord: async (id, value) => {
      assert.strictEqual(id, "s");
      if (fail) throw Error("Storage failed");
      patch = value;
      context.documentLibraryRecords = [{ projectId: id, ...value }];
    },
    invalidateDocumentWorkspace() {}, renderReviewContent() {},
    synchronizeDocumentWorkspace: async () => {}, renderDocumentProfileChoice() {}
  };
  vm.createContext(context);
  vm.runInContext(helper + handler, context);
  const select = { value: "quick-reference", disabled: false };
  await callback({ currentTarget: select });
  assert.strictEqual(select.disabled, false);
  assert.strictEqual(context.activeDocumentProfileId, fail ? "business-process" : "quick-reference");
  if (fail) assert.strictEqual(elements.reviewDocumentProfileStatus.textContent, "Storage failed");
  else {
    assert.strictEqual(patch.theme.themeId, "minimal");
    assert.strictEqual(vm.runInContext("activeDocumentThemeId()", context), "minimal");
    context.documentLibraryRecords[0].theme.themeId = "missing";
    assert.strictEqual(vm.runInContext("activeDocumentThemeId()", context), "minimal");
  }
}
Promise.resolve().then(() => test(false)).then(() => test(true))
  .then(() => console.log("Document profile choice tests passed."))
  .catch(error => { console.error(error); process.exitCode = 1; });
