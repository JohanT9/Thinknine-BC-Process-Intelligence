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
assert.ok(!dashboard.includes('<select id="documentationProfile">'));
assert.ok(dashboard.includes('<input id="documentationProfile" type="hidden" value="generic">'));
assert.ok(dashboard.includes('aria-controls="advancedPanel" hidden'));
assert.ok(dashboard.includes('<div id="advancedPanel" class="advanced" hidden>'));
assert.ok(dashboard.includes('id="environmentName"'));
assert.ok(dashboard.includes('id="companyName"'));
assert.ok(dashboard.includes('id="defaultExpectedResult"'));
assert.ok(dashboard.includes('aria-describedby="defaultExpectedResultHelp"'));
assert.ok(dashboard.includes("#defaultExpectedResult{width:380px;max-width:100%;box-sizing:border-box;resize:vertical}"));
assert.ok(dashboard.includes(".library-toggle-row label{display:inline-flex;align-items:center;gap:8px;margin:0}"));

assert.ok(css.includes("prefers-reduced-motion: reduce"));
assert.ok(css.includes("forced-colors: active"));
assert.ok(css.includes(":focus-visible"));
assert.ok(css.includes("[hidden] { display: none !important; }"));
assert.ok(css.includes("header:not(.app-shell-bar) h1"));
assert.ok(css.includes("button.library-favourite"));
assert.ok(css.includes(".library-card-heading h4{padding-top:1px}"));
assert.ok(css.includes(".library-card-heading .library-favourite{align-self:flex-start;transform:translateY(-6px)}"));
assert.ok(css.includes("border-color: transparent !important"));
assert.ok(css.includes('input:not([type="checkbox"]):not([type="radio"])'));
assert.ok(css.includes('input[type="checkbox"], input[type="radio"]'));
assert.ok(css.includes("accent-color: var(--colorBrandPrimary)"));
assert.ok(css.includes("@media (max-width: 700px)"));
assert.ok(css.includes("--colorBrandPrimary: #008489"));
assert.ok(css.includes("--colorBrandInformation: #b7e8eb"));
assert.ok(!css.includes("--colorBrandPrimary: #0f6cbd"));

const build = read("scripts/build.js");
assert.ok(build.includes('"design-system.css"'), "production build must include the shared theme");
assert.ok(build.includes('path.join(src, "ui", "icons")'), "production build must include product icons");

const manifest = JSON.parse(read("src/ui/manifest.json"));
for (const size of ["16", "32", "48", "128"]) {
  assert.strictEqual(manifest.icons[size], `icons/icon${size}.png`);
  assert.ok(fs.existsSync(path.join(root, "src", "ui", manifest.icons[size])), `missing ${size}px product icon`);
}
assert.strictEqual(manifest.action.default_icon["16"], "icons/icon16.png");
assert.strictEqual(manifest.action.default_icon["32"], "icons/icon32.png");

console.log("Design system contract tests passed.");
