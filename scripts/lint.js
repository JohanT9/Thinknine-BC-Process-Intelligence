const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const roots = ["src", "dist", "scripts", "tests"];
const extensions = new Set([".js", ".json", ".html", ".md", ".txt"]);
const errors = [];

function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else files.push(full);
  }
  return files;
}

for (const relativeRoot of roots) {
  for (const file of walk(path.join(root, relativeRoot))) {
    if (!extensions.has(path.extname(file).toLowerCase())) continue;

    const content = fs.readFileSync(file, "utf8");
    const relative = path.relative(root, file);

    if (content.includes("\t")) {
      errors.push(`${relative}: contains tab characters`);
    }

    if (!content.endsWith("\n")) {
      errors.push(`${relative}: missing final newline`);
    }

    const lines = content.split(/\r?\n/);
    lines.forEach((line, index) => {
      if (/[ \t]+$/.test(line)) {
        errors.push(`${relative}:${index + 1}: trailing whitespace`);
      }
    });
  }
}

if (errors.length) {
  console.error("Lint failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Lint passed.");
