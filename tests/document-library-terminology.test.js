const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = relativePath => fs.readFileSync(path.join(root, relativePath), "utf8");
const popupHtml = read("src/ui/popup.html");
const popupScript = read("src/ui/popup.js");
const dashboardHtml = read("src/ui/dashboard.html");
const libraryView = read("src/ui/document-library-view.js");

assert(popupHtml.includes(
  '<button id="dashboard" class="secondary">Öppna Dokumentbibliotek</button>'
));
assert(!popupHtml.includes("Öppna Documentation Excellence"));
assert(popupScript.includes('$("dashboard").addEventListener("click"') &&
  popupScript.includes("chrome.runtime.openOptionsPage()"),
"renaming must preserve popup navigation");
assert(dashboardHtml.includes(
  "<title>Dokumentbibliotek – Thinknine BC Recorder</title>"
));
assert(dashboardHtml.includes('<h2 id="documentLibraryTitle">Dokumentbibliotek</h2>'));
assert(dashboardHtml.includes('aria-label="Filter för Dokumentbibliotek"'));
assert(dashboardHtml.includes('aria-label="Dokument i Dokumentbiblioteket"'));
assert(dashboardHtml.includes('<h2 id="reviewTitle">Granskning</h2>'));
assert(dashboardHtml.includes('aria-label="Stäng granskning"'));
assert(!dashboardHtml.includes("Documentation Excellence"));
assert(libraryView.includes(
  "Det finns inga dokument i Dokumentbiblioteket som matchar sökningen och filtren."
));

console.log("Dokumentbibliotek terminology and accessibility tests passed.");
