#!/usr/bin/env node
"use strict";
// Builds src/knowledge-packs/generated/bc-rule-captions.json: for every knowledge rule, what Microsoft's
// Business Central calls its pages, actions and fields in every registered language, and their AL
// names (engine/knowledge-captions.js), from src/document/bc-captions.json.
//
// Run after build-bc-captions.js (scripts/update-bc-tables.js runs both), or after changing a
// knowledge pack: node scripts/build-knowledge-captions.js. With --check it only reports whether
// the file is up to date.
const fs = require("fs");
const path = require("path");
const knowledgeCaptions = require("../src/engine/knowledge-captions");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "src", "knowledge-packs", "generated", "bc-rule-captions.json");

function build() {
  const table = JSON.parse(fs.readFileSync(path.join(ROOT, "src", "document", "bc-captions.json"), "utf8"));
  const index = JSON.parse(fs.readFileSync(path.join(ROOT, "src", "knowledge-packs", "index.json"), "utf8"));
  const packs = index.packs.filter(item => item.enabled)
    .map(item => JSON.parse(fs.readFileSync(path.join(ROOT, "src", item.file), "utf8")));
  const { captions, rules } = knowledgeCaptions.packCaptions(packs, table);
  const data = { schema: 1, source: table.source, version: table.version, locales: table.locales,
    captions, rules };
  return { data, packs, json: `${JSON.stringify(data, null, 1)}\n` };
}

if (require.main === module) {
  const { data, packs, json } = build();
  if (process.argv.includes("--check")) {
    const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8").replace(/\r\n/gu, "\n") : "";
    if (current !== json) {
      console.error("src/knowledge-packs/generated/bc-rule-captions.json is out of date: run node scripts/build-knowledge-captions.js");
      process.exit(1);
    }
    console.log("Knowledge rule captions are up to date.");
  } else {
    fs.writeFileSync(OUT, json);
    const total = packs.reduce((sum, pack) => sum + (pack.rules || []).length, 0);
    const covered = Object.values(data.rules).reduce((sum, item) => sum + Object.keys(item).length, 0);
    console.log(`Wrote ${path.relative(ROOT, OUT)}: ${covered} of ${total} rules, ${(json.length / 1024).toFixed(0)} KB.`);
  }
}

module.exports = { build, OUT };
