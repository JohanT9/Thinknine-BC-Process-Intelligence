const fs = require("node:fs/promises");
const path = require("node:path");
const JSZip = require("jszip");
const esbuild = require("esbuild");
async function main() {
  const root = path.resolve(__dirname, "..");
  const version = JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf8")).version;
  const zip = new JSZip();
  const bundled = await esbuild.build({ entryPoints: [path.join(root, "services/licensing/server.js")],
    bundle: true, platform: "node", target: "node24", format: "cjs", write: false,
    logLevel: "warning" });
  zip.file("server.js", bundled.outputFiles[0].contents);
  for (const file of ["package.json", "admin.html", "admin-ui.js", "admin.css"]) {
    zip.file(file, await fs.readFile(path.join(root, "services/licensing", file)));
  }
  const bytes = await zip.generateAsync({ type: "nodebuffer" });
  const outputDirectory = path.join(root, "release");
  const outputs = [path.join(outputDirectory, "bc-license-service.zip"),
    path.join(outputDirectory, `bc-license-service-${version}.zip`),
    path.join(outputDirectory, `bc-license-service-${version}-consultant-registration.zip`),
    path.join(outputDirectory, `bc-license-service-${version}-entra-compatible.zip`),
    path.join(outputDirectory, `bc-license-service-${version}-entra-email.zip`),
    path.join(outputDirectory, `bc-license-service-${version}-tenant-users.zip`),
    path.join(outputDirectory, `bc-license-service-${version}-company-hierarchy.zip`),
    path.join(outputDirectory, `bc-license-service-${version}-notifications.zip`),
    path.join(outputDirectory, `bc-license-service-${version}-audit-log.zip`),
    path.join(outputDirectory, `bc-license-service-${version}-admin-dashboard.zip`),
    path.join(outputDirectory, `bc-license-service-${version}-entra-admin.zip`),
    path.join(outputDirectory, `bc-license-service-${version}-table-storage.zip`)];
  await fs.mkdir(outputDirectory, { recursive: true });
  for (const output of outputs) {
    await fs.writeFile(output, bytes);
    console.log(output);
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
