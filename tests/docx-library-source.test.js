const assert = require("assert");
const fs = require("fs");
const path = require("path");

const exporter = fs.readFileSync(
  path.join(__dirname, "../src/exporters/word-exporter-docx.mjs"),
  "utf8"
);
const adapter = fs.readFileSync(
  path.join(__dirname, "../src/exporters/word-document-adapter.mjs"),
  "utf8"
);
const build = fs.readFileSync(
  path.join(__dirname, "../scripts/build.js"),
  "utf8"
);
const html = fs.readFileSync(
  path.join(__dirname, "../src/ui/dashboard.html"),
  "utf8"
);
const packageJson = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "../package.json"),
    "utf8"
  )
);

assert.strictEqual(packageJson.dependencies.docx, "9.7.1");
assert.ok(packageJson.devDependencies.esbuild);
assert.ok(exporter.includes('from "./word-document-adapter.mjs"'));
assert.ok(adapter.includes('from "docx"'));
assert.ok(adapter.includes("Packer.toBlob"));
assert.ok(adapter.includes("new Document"));
assert.ok(adapter.includes("new ImageRun"));
assert.ok(!adapter.includes("review.tasks"));
assert.ok(!adapter.includes("T9Review"));
assert.ok(!adapter.includes("ThemeRegistry"));
assert.ok(build.includes("bundleWordExporter"));
assert.ok(build.includes("word-exporter-docx.bundle.js"));
assert.ok(
  html.includes("exporters/word-exporter-docx.bundle.js")
);
assert.ok(html.includes("exporters/word-export-pipeline.js"));
assert.ok(html.includes("document/document-components.js"));
assert.ok(html.includes("document/document-component-registry.js"));
assert.ok(html.includes("document/document-component-validation.js"));
assert.ok(html.includes("document/document-quality.js"));
assert.ok(html.includes("document/document-quality-rules.js"));
assert.ok(html.includes("document/document-quality-validation.js"));
assert.ok(
  !html.includes('src="exporters/word-exporter.js"')
);
assert.ok(!html.includes('src="engine/documentation-engine.js"'));

console.log("docx library source tests passed.");
