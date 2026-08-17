const assert = require("assert");
const fs = require("fs");
const path = require("path");

const dashboard = fs.readFileSync(path.join(__dirname, "../src/ui/dashboard.js"),
  "utf8");
const html = fs.readFileSync(path.join(__dirname, "../src/ui/dashboard.html"),
  "utf8");
const renderBody = dashboard.slice(
  dashboard.indexOf("function renderDocumentLibrary()"),
  dashboard.indexOf("function rebuildDocumentLibraryIndex()")
);
assert(!renderBody.includes("T9DocumentLibrary.create"),
  "selection and filter rendering must reuse the metadata index");
assert(dashboard.includes("function renderDocumentLibrarySelection()") &&
  dashboard.includes("T9DocumentLibraryView.applySelection"));
assert(dashboard.includes('event.key !== "/"') &&
  dashboard.includes('event.key !== "Escape"'));
assert(dashboard.includes('event.key.toLowerCase() === "s"') &&
  html.includes('aria-keyshortcuts="Control+S Meta+S"'));
assert(html.includes('aria-keyshortcuts="/ Escape"'));
assert(html.includes("Inspelningar och tekniska verktyg") &&
  html.includes('id="sessionTools" class="session-tools"'));
assert(html.includes(">Granskning</button>") &&
  html.includes(">Dokumentvy</button>"));
assert(html.includes("Fler åtgärder") && html.includes("Ta bort permanent"));
assert(dashboard.includes('setAttribute("aria-busy", "true")') &&
  dashboard.includes('setAttribute("aria-busy", "false")'));
assert(html.includes("@media(prefers-reduced-motion:reduce){*"));
assert(dashboard.includes("const previous = documentLibraryRecords") &&
  dashboard.includes("documentLibraryRecords = previous"));
assert(dashboard.includes("{ render: false }") &&
  dashboard.includes("options.render !== false"),
"opening a document must retain its connected return-focus control");
assert(dashboard.includes('if (!$("sessionTools").open) return;') &&
  dashboard.includes('$("sessions").replaceChildren()'),
"collapsed raw-session tools must not retain unnecessary table DOM");
assert(dashboard.includes('document.querySelector("dialog[open]")'),
  "global search shortcut must not move focus behind a modal dialog");
assert(dashboard.includes("reviewInstructionHtml(task)") &&
  dashboard.includes("review-instruction-preview"),
"Review must render structured value emphasis outside the plain-text editor");
console.log("Workflow polish regression tests passed.");
