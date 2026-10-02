const assert = require("assert");
const fs = require("fs");

const dashboard = fs.readFileSync("src/ui/dashboard.html", "utf8");
const popup = fs.readFileSync("src/ui/popup.html", "utf8");
const design = fs.readFileSync("src/ui/design-system.css", "utf8");
const technicalReport = fs.readFileSync("src/ui/technical-report.html", "utf8");

assert(dashboard.includes(
  '<meta name="viewport" content="width=device-width,initial-scale=1">'),
"Dashboard responsive breakpoints require an explicit viewport");
assert(popup.includes("max-height:calc(100dvh - 16px);overflow:auto"),
  "popup dialogs must remain operable in short browser windows");
assert(popup.includes("html{width:390px;min-width:390px}"),
  "the extension popup must establish its own stable viewport width");
assert(!popup.includes("body{width:100vw}"),
  "a viewport-relative body width collapses extension popups before layout");
assert(popup.includes("@media(max-height:540px)"));
assert(technicalReport.includes("max-height:calc(100dvh - 24px)"),
  "bug-report sharing must remain operable in short browser windows");
assert(technicalReport.includes("width:min(960px,calc(100vw - 24px))"),
  "bug-report sharing must not overflow a narrow viewport");
assert(technicalReport.includes(".reproduction-editor-row{grid-template-columns:1fr}"));
assert(technicalReport.includes(".primary-actions{flex-wrap:wrap}"));
assert(technicalReport.includes("dialog select{box-sizing:border-box;width:100%}"));
assert(popup.includes(
  'aria-describedby="nameDialogHelp documentLanguageHelp"'));
assert(popup.includes('id="documentLanguageHelp"'));
assert(popup.indexOf('id="startBug"') < popup.indexOf('id="licenseCard"'),
  "license information follows the process and bug recording choices");
assert(popup.includes("#startPanel > .hint{display:none}"),
  "the redundant popup tagline is hidden to keep its primary actions in view");
assert(popup.includes('<section id="licenseCard" class="license-card"'),
  "license status is displayed in a static information panel, not a dropdown");
assert(popup.includes('class="license-summary"') && popup.includes('id="licenseCardStatus"') &&
  popup.includes('id="licenseCardType"') && popup.includes('id="licenseCardExpiry"'),
  "license status, type and expiry remain visible in the disclosure summary");
assert(popup.includes(".status{display:flex;align-items:center;gap:8px;padding:0"),
  "recording state appears as a compact indicator instead of a competing block");
assert(popup.includes(".mode-card{text-align:left;padding:12px 13px;background:#fff"),
  "recording choices retain a consistent card layout");
assert(popup.includes('id="startProcess" class="primary mode-card"'),
  "the process recording choice uses the shared primary teal and white button style");

assert(design.includes("@media (pointer: coarse)"));
assert(design.includes("--controlHeight:44px;--targetSize:44px"));
assert(design.includes(".review-approve-action{min-height:44px}"));
assert(design.includes("@media (prefers-contrast: more)"));
assert(design.includes("@media (prefers-reduced-motion: reduce)"));
assert(design.includes("@media (forced-colors: active)"));
assert(design.includes('.process-overview-action[aria-current="step"]'));
assert(design.includes(".workspace-tabs{overflow-x:auto"));
assert(design.includes("overflow-wrap:anywhere"));
assert(design.includes("background:Canvas;color:CanvasText"));

console.log("Responsive accessibility UX tests passed.");
