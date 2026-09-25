const fs = require("fs");
const path = require("path");
const repository = require("../src/engine/knowledge-repository");

const root = path.resolve(__dirname, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "src/knowledge-packs/index.json"), "utf8"));
const packs = manifest.packs.filter(item => item.enabled).map(descriptor => ({
  packId: descriptor.packId,
  pack: JSON.parse(fs.readFileSync(path.join(root, "src", descriptor.file), "utf8"))
}));
const result = repository.importRelease(manifest, packs);
if (!result.ok) {
  console.error(JSON.stringify(result.diagnostics, null, 2));
  process.exitCode = 1;
} else {
  const snapshot = result.snapshot;
  console.log(JSON.stringify({ status: "validated", releaseId: snapshot.release.releaseId,
    packCount: snapshot.packs.length, ruleCount: snapshot.rules.length,
    objectCount: snapshot.objects.length, controlCount: snapshot.controls.length,
    conceptCount: snapshot.concepts.length, aliasCount: snapshot.aliases.length,
    sourceCount: snapshot.sources.length,
    warnings: result.diagnostics.map(item => item.code) }, null, 2));
}
