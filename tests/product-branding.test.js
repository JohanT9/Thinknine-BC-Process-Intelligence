const assert = require("assert");
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const brand = require("../src/engine/product-brand");
const manifest = JSON.parse(read("src/ui/manifest.json"));
const pkg = JSON.parse(read("package.json"));

assert.deepStrictEqual(brand, {
  productName: "BC Process Studio",
  companyAttribution: "",
  descriptor: "Business Process Intelligence for Microsoft Dynamics 365 Business Central",
  primaryTagline: "Turn Business Central processes into knowledge.",
  supportingMessage: "Capture. Document. Improve.",
  modules: {
    recorder: "BC Process Recorder",
    reviewStudio: "BC Review Studio",
    documentGenerator: "BC Document Generator",
    processMaps: "BC Process Maps",
    knowledgeBase: "BC Knowledge Base",
    processAI: "BC Process AI"
  }
});
assert.strictEqual(pkg.version, "4.7.0");
assert.strictEqual(pkg.name, "thinknine-bc-process-intelligence",
  "Stable technical package identity must remain compatible.");
assert.strictEqual(manifest.name, brand.productName);
assert.strictEqual(manifest.version, pkg.version);

const primarySurfaces = ["src/ui/popup.html", "src/ui/dashboard.html",
  "src/ui/debug.html", "src/ui/manifest.json", "INSTALLERA.txt"]
  .map(read).join("\n");
for (const obsolete of ["Thinknine BC Process Intelligence",
  "Thinknine BC Recorder", "Documentation Excellence"]) {
  assert(!primarySurfaces.includes(obsolete), `Obsolete visible brand: ${obsolete}`);
}
for (const expected of [brand.productName, brand.companyAttribution,
  brand.modules.recorder, brand.modules.reviewStudio,
  brand.modules.documentGenerator, brand.modules.knowledgeBase]) {
  assert(primarySurfaces.includes(expected), `Missing current brand: ${expected}`);
}
assert(!primarySurfaces.includes("BC Process Maps"),
  "Future Process Maps must not appear as available navigation.");
assert(!primarySurfaces.includes("BC Process AI"),
  "Future Process AI must not appear as available navigation.");
console.log("BC Process Studio branding and compatibility tests passed.");

const visibleBrandSurfaces = ["src/ui/popup.html", "src/ui/dashboard.html",
  "src/engine/product-brand.js", "src/engine/documentation-engine.js",
  "src/exporters/word-exporter.js", "src/document/document-planner.js"];
for (const file of visibleBrandSurfaces) {
  assert(!/thinknine|\bT9\b/i.test(read(file)), `Removed branding remains in ${file}`);
}
