const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");

function copyFile(source, target) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

function copyDir(source, target) {
  fs.mkdirSync(target, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const src = path.join(source, entry.name);
    const dst = path.join(target, entry.name);
    if (entry.isDirectory()) copyDir(src, dst);
    else copyFile(src, dst);
  }
}

const engineSource = path.join(root, "src", "engine");
const engineTarget = path.join(dist, "engine");
fs.rmSync(engineTarget, { recursive: true, force: true });
copyDir(engineSource, engineTarget);

const packsSource = path.join(root, "src", "knowledge-packs");
const packsTarget = path.join(dist, "knowledge-packs");
if (fs.existsSync(packsSource)) {
  fs.rmSync(packsTarget, { recursive: true, force: true });
  copyDir(packsSource, packsTarget);
}


const reviewSource = path.join(root, "src", "review");
const reviewTarget = path.join(dist, "review");
if (fs.existsSync(reviewSource)) {
  fs.rmSync(reviewTarget, { recursive: true, force: true });
  copyDir(reviewSource, reviewTarget);
}

console.log("Build complete:", dist);
