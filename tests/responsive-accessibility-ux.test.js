const assert = require("assert");
const fs = require("fs");

const dashboard = fs.readFileSync("src/ui/dashboard.html", "utf8");
const popup = fs.readFileSync("src/ui/popup.html", "utf8");
const design = fs.readFileSync("src/ui/design-system.css", "utf8");

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
assert(popup.includes(
  'aria-describedby="nameDialogHelp documentLanguageHelp"'));
assert(popup.includes('id="documentLanguageHelp"'));

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
