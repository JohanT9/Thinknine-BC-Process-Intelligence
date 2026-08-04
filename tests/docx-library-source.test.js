const assert = require("assert");
const fs = require("fs");
const path = require("path");

const exporter = fs.readFileSync(
  path.join(__dirname, "../src/exporters/word-exporter-docx.mjs"),
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
assert.ok(exporter.includes('from "docx"'));
assert.ok(exporter.includes("Packer.toBlob"));
assert.ok(exporter.includes("new Document"));
assert.ok(exporter.includes("new ImageRun"));
assert.ok(build.includes("bundleWordExporter"));
assert.ok(build.includes("word-exporter-docx.bundle.js"));
assert.ok(
  html.includes("exporters/word-exporter-docx.bundle.js")
);
assert.ok(
  !html.includes('src="exporters/word-exporter.js"')
);

console.log("docx library source tests passed.");
