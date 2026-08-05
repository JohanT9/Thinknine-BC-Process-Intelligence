const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const src = path.join(root, "src");
const dist = path.join(root, "dist");
const packageJson = JSON.parse(
  fs.readFileSync(path.join(root, "package.json"), "utf8")
);
const version = packageJson.version;

function copyFile(source, target) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

function copyDir(source, target) {
  fs.mkdirSync(target, { recursive: true });

  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);

    if (entry.isDirectory()) {
      copyDir(sourcePath, targetPath);
    } else {
      copyFile(sourcePath, targetPath);
    }
  }
}

function replaceVersionInFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  let content = fs.readFileSync(filePath, "utf8");

  content = content
    .replace(/v\d+\.\d+\.\d+/g, `v${version}`)
    .replace(/\b\d+\.\d+\.\d+\b/g, version);

  fs.writeFileSync(filePath, content, "utf8");
}


function bundleWordExporter() {
  let esbuild;

  try {
    esbuild = require("esbuild");
  } catch {
    throw new Error(
      "esbuild saknas. Kör npm install innan npm run build."
    );
  }

  esbuild.buildSync({
    entryPoints: [
      path.join(src, "exporters", "word-exporter-docx.mjs")
    ],
    outfile: path.join(
      dist,
      "exporters",
      "word-exporter-docx.bundle.js"
    ),
    bundle: true,
    format: "iife",
    platform: "browser",
    target: ["chrome120", "edge120"],
    minify: false,
    sourcemap: false,
    legalComments: "eof",
  });
}

function syncManifest() {
  const sourceManifest = path.join(src, "ui", "manifest.json");
  const targetManifest = path.join(dist, "manifest.json");

  const manifest = JSON.parse(
    fs.readFileSync(sourceManifest, "utf8")
  );

  manifest.version = version;

  fs.writeFileSync(
    sourceManifest,
    JSON.stringify(manifest, null, 2) + "\n",
    "utf8"
  );

  fs.writeFileSync(
    targetManifest,
    JSON.stringify(manifest, null, 2) + "\n",
    "utf8"
  );
}

function cleanRuntimeFolders() {
  for (const folder of [
    "docs", "document", "engine", "review", "exporters", "knowledge-packs"
  ]) {
    fs.rmSync(path.join(dist, folder), {
      recursive: true,
      force: true
    });
  }
}

fs.mkdirSync(dist, { recursive: true });
cleanRuntimeFolders();

copyDir(path.join(src, "engine"), path.join(dist, "engine"));
copyDir(path.join(src, "document"), path.join(dist, "document"));
copyDir(path.join(src, "review"), path.join(dist, "review"));
copyDir(path.join(src, "exporters"), path.join(dist, "exporters"));
copyDir(
  path.join(src, "knowledge-packs"),
  path.join(dist, "knowledge-packs")
);
copyDir(path.join(root, "docs"), path.join(dist, "docs"));
copyFile(path.join(root, "README.md"), path.join(dist, "README.md"));
copyFile(path.join(root, "CHANGELOG.md"), path.join(dist, "CHANGELOG.md"));
copyFile(path.join(root, "INSTALLERA.txt"), path.join(dist, "INSTALLERA.txt"));

copyFile(
  path.join(src, "recorder", "background.js"),
  path.join(dist, "background.js")
);
copyFile(
  path.join(src, "recorder", "content.js"),
  path.join(dist, "content.js")
);

for (const file of [
  "dashboard.html",
  "dashboard.js",
  "debug.html",
  "debug.js",
  "popup.html",
  "popup.js"
]) {
  copyFile(
    path.join(src, "ui", file),
    path.join(dist, file)
  );
}

bundleWordExporter();

syncManifest();

for (const file of [
  "background.js",
  "dashboard.js",
  "debug.js",
  "dashboard.html",
  "popup.html"
]) {
  replaceVersionInFile(path.join(dist, file));
}

const versionText =
  "Thinknine BC Process Intelligence\n" +
  `Version ${version}\n` +
  "Edge development folder: dist\n";

fs.writeFileSync(
  path.join(dist, "VERSION.txt"),
  versionText,
  "utf8"
);

console.log(`Build complete: ${dist}`);
console.log(`Manifest version: ${version}`);
console.log("Load this folder in Edge:");
console.log(dist);
