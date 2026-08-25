const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");
const css = read("src/ui/design-system.css");

for (const token of [
  "--colorBackgroundCanvas",
  "--colorTextPrimary",
  "--colorBrandPrimary",
  "--colorFocusIndicator",
  "--colorStatusRecording",
  "--colorStatusApproved",
  "--fontFamilyBase",
  "--space8",
  "--controlHeight"
]) {
  assert.ok(css.includes(token), `missing design token ${token}`);
}

for (const file of [
  "src/ui/dashboard.html",
  "src/ui/popup.html",
  "src/ui/debug.html",
  "src/ui/technical-report.html"
]) {
  assert.ok(read(file).includes('href="design-system.css"'), `${file} must load the shared theme`);
}

const dashboard = read("src/ui/dashboard.html");
assert.ok(!dashboard.includes("BC Process Maps</a>"), "unimplemented modules must not be exposed");

assert.ok(css.includes("prefers-reduced-motion: reduce"));
assert.ok(css.includes("forced-colors: active"));
assert.ok(css.includes(":focus-visible"));
assert.ok(css.includes("[hidden] { display: none !important; }"));
assert.ok(css.includes("header:not(.app-shell-bar) h1"));
assert.ok(css.includes("button.library-favourite"));
assert.ok(css.includes("border-color: transparent !important"));
assert.ok(css.includes("@media (max-width: 700px)"));

const build = read("scripts/build.js");
assert.ok(build.includes('"design-system.css"'), "production build must include the shared theme");

console.log("Design system contract tests passed.");
