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

// The theme still follows a document's own theme, then its saved profile.
const helper = source.slice(source.indexOf("function activeDocumentThemeId()"),
  source.indexOf("function documentProfiles()"));
const context = {
  activeDocumentProfileId: "quick-reference", activeReviewSession: { id: "s" },
  documentLibraryRecords: [{ projectId: "s", theme: { themeId: "missing" } }],
  T9DocumentThemeRegistry: { list: () => [{ themeId: "minimal" }, { themeId: "corporate" }] },
  documentProfiles: () => profiles
};
context.globalThis = context;
vm.createContext(context);
vm.runInContext(helper, context);
assert.strictEqual(vm.runInContext("activeDocumentThemeId()", context), "minimal");
context.documentLibraryRecords[0].theme.themeId = "corporate";
assert.strictEqual(vm.runInContext("activeDocumentThemeId()", context), "corporate");
console.log("Document profile choice tests passed.");
