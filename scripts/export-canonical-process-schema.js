const fs = require("fs");
const path = require("path");
const { schema } = require("../src/engine/canonical-process-schema");
const target = path.join(__dirname, "../src/engine/canonical-process.schema.json");
const content = JSON.stringify(schema, null, 2) + "\n";
if (process.argv.includes("--write")) fs.writeFileSync(target, content);
else if (!fs.existsSync(target) || fs.readFileSync(target, "utf8") !== content) {
  throw new Error("Canonical Process schema snapshot differs; run this script with --write.");
}
console.log("Canonical Process JSON Schema snapshot verified.");
