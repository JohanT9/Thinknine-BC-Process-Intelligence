const fs = require("node:fs/promises");
const path = require("node:path");
const JSZip = require("jszip");
async function main() {
  const root = path.resolve(__dirname, "..");
  const version = JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf8")).version;
  const zip = new JSZip();
  for (const file of ["server.js", "entra-validator.js", "package.json", "admin.js", "admin.html",
    "admin-ui.js", "admin.css"]) {
    zip.file(file, await fs.readFile(path.join(root, "services/licensing", file)));
  }
  const bytes = await zip.generateAsync({ type: "nodebuffer" });
  const outputDirectory = path.join(root, "release");
  const outputs = [path.join(outputDirectory, "bc-license-service.zip"),
    path.join(outputDirectory, `bc-license-service-${version}.zip`)];
  await fs.mkdir(outputDirectory, { recursive: true });
  for (const output of outputs) {
    await fs.writeFile(output, bytes);
    console.log(output);
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
