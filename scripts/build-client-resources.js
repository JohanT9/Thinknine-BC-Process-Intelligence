#!/usr/bin/env node
"use strict";
// Writes tests/fixtures/bc-client-resources.json: the Business Central web client's own captions
// for the buttons and texts the client adds to every page (New, Edit, Delete, Yes, No, Back,
// Close, Show more...), in every registered language, from the web client's language resources
// (WebPublish/wwwroot/Resources/Lang/<culture>/Microsoft.Dynamics.Framework.Resource.js in the
// platform artifact). tests/bc-client-resources.test.js checks the core knowledge rules,
// engine/bc-client-captions.js and document/bc-caption-translation.js against it, so a client
// caption is never guessed and a changed one is noticed.
//
// usage: node scripts/build-client-resources.js <client folder> <platform version>
//   scripts/update-bc-tables.js fetches the files into <work folder>/<version>/client and runs this.
const fs = require("fs");
const path = require("path");

const LOCALES = ["en-US", "sv-SE", "fr-FR", "de-DE", "es-ES", "da-DK", "fi-FI", "nb-NO"];
// The resource keys of the client's own buttons, by what uses them.
const KEYS = Object.freeze({
  "Core.CreateNew": ["CreateActionCaption", "New_Title"],
  "Core.EditRecord": ["EditContextMenucaption"],
  "Core.DeleteRecord": ["Delete", "DeleteContextMenucaption"],
  "Core.ConfirmYes": ["ConfirmYes", "Yes"],
  "Core.ConfirmNo": ["ConfirmNo", "No"],
  "Core.NavigateBack": ["Back_Title", "HelpPaneBackButton"],
  "Core.SearchAndOpenPage": ["SearchPlaceholderCaption", "MobileAppPageSearch"],
  close: ["CloseButton", "DetailsPageExitAction", "PdfControl_Close", "DatePickerCloseText"],
  scroll: ["ScrollLeft", "ScrollRight"],
  display: ["ShowMoreFields", "ShowLess", "CommandBar_ShowWrappedItemsInContextMenu_Tooltip",
    "CommandBar_ShowMore_Tooltip", "CommandBar_ShowLess_Tooltip"],
  history: ["Back_Title", "HelpPaneBackButton", "HelpPaneForwardButton"],
  tellMe: ["ProductMenuBar_PageSearch"],
  create: ["CreateActionCaption"],
  confirmYes: ["ConfirmYes"]
});

function readResources(file) {
  const textValue = fs.readFileSync(file, "utf8");
  return JSON.parse(textValue.slice(textValue.indexOf("{"), textValue.lastIndexOf("}") + 1));
}

function main() {
  const [folder, version] = process.argv.slice(2);
  if (!folder || !/^\d+\.\d+\.\d+\.\d+$/u.test(version || "")) {
    throw new Error("usage: node scripts/build-client-resources.js <client folder> <platform version>");
  }
  const resources = Object.fromEntries(LOCALES.map(locale =>
    [locale, readResources(path.join(folder, `${locale}.js`))]));
  const keys = [...new Set(Object.values(KEYS).flat())].sort();
  const texts = {};
  // A key this client version no longer has is listed, so its use can be reviewed.
  const missing = [];
  for (const key of keys) {
    if (LOCALES.some(locale => typeof resources[locale][key] !== "string" || !resources[locale][key])) {
      missing.push(key);
      continue;
    }
    texts[key] = Object.fromEntries(LOCALES.map(locale => [locale, resources[locale][key]]));
  }
  const data = { source: "Business Central web client language resources " +
    "(WebPublish/wwwroot/Resources/Lang/<culture>/Microsoft.Dynamics.Framework.Resource.js)",
  version, uses: KEYS, missing, texts };
  const out = path.join(__dirname, "..", "tests", "fixtures", "bc-client-resources.json");
  fs.writeFileSync(out, `${JSON.stringify(data, null, 1)}\n`);
  console.log(`Wrote ${path.relative(path.join(__dirname, ".."), out)}: ${keys.length - missing.length} resource keys${missing.length ? `, not in this version: ${missing.join(", ")}` : ""}.`);
}

try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
