// Document profiles are no longer chosen in the interface: they made almost no visible
// difference. A profile already saved on a document is kept and still gives it the same
// appearance, so no existing document changes; new documents use the standard profile.
const assert = require("assert");
const fs = require("fs");
const vm = require("vm");
const source = fs.readFileSync("src/ui/dashboard.js", "utf8");
const html = fs.readFileSync("src/ui/dashboard.html", "utf8");
const profiles = require("../src/document/document-profile").BUILT_IN_PROFILES;

for (const id of ["reviewDocumentProfile", "libraryProfileFilter", "libraryGroupProfiles",
  "libraryBatchProfile", "libraryBatchUseProfile", "libraryBatchProfileValue"]) {
  assert(!html.includes(`id="${id}"`), `${id} is not shown`);
  assert(!source.includes(`"${id}"`), `${id} is not used`);
}
assert(!html.includes('<option value="profile">'), "the library is not sorted by profile");
assert(!source.includes("renderDocumentProfileChoice"));
assert.match(source, /activeDocumentProfileId = documentProfiles\(\)\.some\(profile =>\s+profile\.profileId === assignedProfileId\s+\) \? assignedProfileId : "business-process";/u,
  "a saved profile is still used for the document; otherwise the standard profile");

// The look follows the document's own template (its saved theme), whatever its profile; a
// template that is not here gives the default template, and the document keeps naming it.
const helper = source.slice(source.indexOf("function documentTemplateFor("),
  source.indexOf("// Settings → Documents → Document templates.")) +
  source.slice(source.indexOf("// What a template looks like, for caches"),
    source.indexOf("function documentProfiles()"));
const context = {
  activeDocumentProfileId: "quick-reference", activeReviewSession: { id: "s" },
  documentLibraryRecords: [{ projectId: "s", theme: { themeId: "missing" } }],
  documentTemplates: [{ templateId: "acme", name: "Acme", builtIn: false, updatedAt: "1" }],
  defaultDocumentTemplateId: "acme",
  T9DocumentTemplate: require("../src/document/document-template"),
  uiT: key => key,
  documentProfiles: () => profiles
};
context.globalThis = context;
vm.createContext(context);
vm.runInContext(helper, context);
assert.strictEqual(vm.runInContext("activeDocumentTemplate().templateId", context), "acme");
assert.deepStrictEqual({ ...vm.runInContext("documentTemplateAssignment({ themeId: 'missing', displayName: 'Old' })", context) },
  { themeId: "missing", displayName: "Old" }, "a missing template stays named on the document");
context.documentLibraryRecords[0].theme.themeId = "corporate";
assert.strictEqual(vm.runInContext("activeDocumentTemplate().templateId", context), "corporate");
assert.strictEqual(vm.runInContext("templateCacheKey(activeDocumentTemplate())", context), "corporate:");
context.documentLibraryRecords[0].theme.themeId = "acme";
assert.strictEqual(vm.runInContext("templateCacheKey(activeDocumentTemplate())", context), "acme:1");
assert.deepStrictEqual({ ...vm.runInContext("documentTemplateAssignment(null)", context) },
  { themeId: "acme", displayName: "Acme" }, "a new document gets the default template");
console.log("Document profile choice tests passed.");
