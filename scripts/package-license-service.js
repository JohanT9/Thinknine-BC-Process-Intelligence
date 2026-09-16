const fs = require("node:fs/promises");
const path = require("node:path");
const JSZip = require("jszip");
async function main() {
  const root = path.resolve(__dirname, "..");
  const zip = new JSZip();
  for (const file of ["server.js", "package.json", "admin.js", "admin.html",
    "admin-ui.js", "admin.css"]) {
    zip.file(file, await fs.readFile(path.join(root, "services/licensing", file)));
  }
  const output = path.join(root, "release", "bc-license-service.zip");
  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, await zip.generateAsync({ type: "nodebuffer" }));
  console.log(output);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
