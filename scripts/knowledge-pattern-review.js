#!/usr/bin/env node
"use strict";
// Writes docs/KNOWLEDGE_PATTERN_REVIEW.md: the knowledge rules' whole-caption patterns (^...$) that
// match no caption Business Central itself shows, for review. A pattern is accounted for when it
// matches a page, action or field caption of Microsoft's apps in any registered language
// (src/document/bc-captions.json), or a button of the web client (tests/fixtures/
// bc-client-resources.json). Partner packs are listed apart: their captions come from the
// partner's .app file, which the user adds under Settings. Patterns that are not whole captions
// (parts of words, alternatives with wildcards) are counted, not checked. The others are compared
// with the Base Application of older versions (tests/fixtures/knowledge-pattern-versions.json,
// scripts/compare-older-captions.js). Nothing is removed here.
//
// usage: node scripts/knowledge-pattern-review.js [--check]
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "docs", "KNOWLEDGE_PATTERN_REVIEW.md");
const KINDS = [["pagePatterns", "p", "page"], ["actionPatterns", "a", "action"], ["fieldPatterns", "f", "field"]];
const PARTNER = /^aptean-/u;

function build() {
  const read = file => JSON.parse(fs.readFileSync(path.join(ROOT, file), "utf8"));
  const table = read("src/document/bc-captions.json");
  const client = read("tests/fixtures/bc-client-resources.json");
  const index = read("src/knowledge-packs/index.json");
  const generated = read("src/knowledge-packs/generated/bc-rule-captions.json").rules;
  const byKind = { p: new Set(), a: new Set(), f: new Set() };
  for (const [key, row] of Object.entries(table.keys)) {
    for (const caption of table.rows[row]) if (caption) byKind[key[0]].add(caption);
  }
  const clientTexts = new Set(Object.values(client.texts).flatMap(texts => Object.values(texts)));
  const captionLists = Object.fromEntries(Object.entries(byKind).map(([kind, set]) => [kind, [...set]]));
  const clientList = [...clientTexts];
  const cell = value => value.replace(/\|/gu, "\\|");
  // Captions of Business Central 28.1, from Microsoft's translation files.
  const older = read("tests/fixtures/knowledge-localized-captions.json");
  const olderVersion = /\d+\.\d+/u.exec(older.source)?.[0] || "28.1";
  const olderList = [...new Set(older.cases.flatMap(item =>
    [item.pageCaption, item.actionCaption, item.fieldCaption]).filter(Boolean))];
  // The versions in which the Base Application has a caption a pattern matches, from every caption
  // of its translation files (scripts/compare-older-captions.js).
  const compared = read("tests/fixtures/knowledge-pattern-versions.json");
  const shortVersion = version => version.split(".").slice(0, 2).join(".");
  const byVersion = (a, b) => a.split(".").map(Number).reduce((order, part, at) => order || part - Number(b.split(".")[at]), 0);
  const comparedVersions = compared.versions.map(shortVersion).sort(byVersion);
  const range = `${comparedVersions[0]}–${comparedVersions.at(-1)}`;
  const whole = pattern => pattern.length > 2 && pattern.startsWith("^") && pattern.endsWith("$");
  const totals = { whole: 0, microsoft: 0, client: 0, older: 0, guess: 0, open: 0, notCompared: 0, partner: 0, broad: 0 };
  const groups = { older: new Map(), guess: new Map(), open: new Map(), notCompared: new Map(), partner: new Map() };
  for (const entry of index.packs.filter(item => item.enabled)) {
    const pack = read(path.join("src", entry.file));
    for (const rule of pack.rules || []) {
      for (const [field, kind, label] of KINDS) {
        const lists = {};
        for (const pattern of rule.match?.[field] || []) {
          if (!whole(pattern)) { totals.broad += 1; continue; }
          totals.whole += 1;
          let regex;
          try { regex = new RegExp(pattern, "iu"); } catch { regex = null; }
          if (regex && captionLists[kind].some(caption => regex.test(caption))) { totals.microsoft += 1; continue; }
          if (regex && kind !== "p" && clientList.some(caption => regex.test(caption))) { totals.client += 1; continue; }
          const versions = [...new Set(Object.keys(compared.patterns[pattern] || {}).map(shortVersion))];
          if (regex && !versions.includes(olderVersion) && olderList.some(caption => regex.test(caption))) versions.push(olderVersion);
          let group;
          if (PARTNER.test(pack.packId)) group = "partner";
          else if (versions.length) group = "older";
          else if (!(pattern in compared.patterns)) group = "notCompared";
          else group = generated[pack.packId]?.[rule.ruleId]?.[label] ? "guess" : "open";
          totals[group] += 1;
          (lists[group] ||= []).push(group === "older"
            ? `\`${cell(pattern)}\` (${versions.sort(byVersion).join(", ")})` : `\`${cell(pattern)}\``);
        }
        for (const [group, patterns] of Object.entries(lists)) {
          if (!groups[group].has(pack.packId)) groups[group].set(pack.packId, []);
          groups[group].get(pack.packId).push({ rule: rule.ruleId, kind: label, patterns });
        }
      }
    }
  }
  const section = (map, heading = "Patterns") => [...map].sort(([a], [b]) => a.localeCompare(b)).flatMap(([packId, items]) => [
    `### ${packId}`, "",
    `| Rule | Kind | ${heading} |`, "| --- | --- | --- |",
    ...items.map(item => `| ${item.rule} | ${item.kind} | ${item.patterns.join(" ")} |`), ""]);
  const lines = [
    "# Knowledge pattern review", "",
    "Generated by `node scripts/knowledge-pattern-review.js`; do not edit by hand.", "",
    `The knowledge rules' whole-caption patterns compared with what Business Central itself shows: Microsoft's page, action and field captions in every registered language (\`src/document/bc-captions.json\`, ${table.source} ${table.version}), the web client's own buttons (\`tests/fixtures/bc-client-resources.json\`, web client ${client.version}) and every caption in the Base Application's translation files of versions ${comparedVersions.join(", ")} in every registered language (\`tests/fixtures/knowledge-pattern-versions.json\`, written by \`scripts/compare-older-captions.js\`).`, "",
    "Rules do not depend on these patterns for the languages Business Central is translated to: each rule also knows Microsoft's captions of its pages, actions and fields in every registered language and their AL names (`src/knowledge-packs/generated/bc-rule-captions.json`, see [BC_PUBLIC_KNOWLEDGE_CATALOG.md](BC_PUBLIC_KNOWLEDGE_CATALOG.md)). Never replace a pattern with a guessed translation.", "",
    "| | Patterns |", "| --- | ---: |",
    `| Whole-caption patterns | ${totals.whole} |`,
    `| Match a caption of Microsoft's apps in ${shortVersion(table.version)} | ${totals.microsoft} |`,
    `| Match a button of the web client | ${totals.client} |`,
    `| Match a caption of an older version of the Base Application (${range}) | ${totals.older} |`,
    `| Found in no version, the rule knows Microsoft's captions: probably guessed | ${totals.guess} |`,
    `| Found in no version, the rule has nothing else: to review | ${totals.open} |`,
    `| Not compared with the older versions yet | ${totals.notCompared} |`,
    `| Partner packs: captions come from the partner's .app file | ${totals.partner} |`,
    `| Parts of captions or wildcards, not checked | ${totals.broad} |`, "",
    "## Found in no version: probably guessed", "",
    `These patterns match no caption of the Base Application in any compared version (${range}) and language, no caption of Microsoft's other apps in ${shortVersion(table.version)} and no button of the web client, while the rule knows Microsoft's captions of the same page, action or field. They are most likely earlier guesses of the wording, such as Godkänna for Godkänn. Not covered by the comparison: Microsoft's other apps in older versions, versions before ${comparedVersions[0]} and country localizations outside the registered languages.`, "",
    ...(groups.guess.size ? section(groups.guess) : ["None. The patterns found in no version were removed on 2026-11-19, and the tests now use Microsoft's captions.", ""]),
    "## Found in no version: to review", "",
    "For these rules the pattern is all the rule knows of that page, action or field: a caption of another Microsoft app in an older version, of a dialog, of a localization or a text seen in a recording. Find the source or keep it as observed.", "",
    ...section(groups.open),
    "## Captions of older versions", "",
    "These patterns name a caption the Base Application had in the versions listed, but not in the current one. They are kept for the installations that still run those versions.", "",
    ...section(groups.older, "Patterns (versions with the caption)"),
    ...(groups.notCompared.size ? ["## Not compared yet", "",
      "Patterns added after the last comparison. Run `scripts/compare-older-captions.js` again.", "",
      ...section(groups.notCompared)] : []),
    "## Partner packs", "",
    "Partner apps are not in Microsoft's artifacts. When a user adds the partner's .app file under Settings → Bug reports → Your own apps, the rules of the partner packs also know the app's captions in every language the app is translated to (`src/document/app-captions.js`).", "",
    ...section(groups.partner)];
  return `${lines.join("\n").replace(/\n+$/u, "")}\n`;
}

const markdown = build();
if (process.argv.includes("--check")) {
  const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8").replace(/\r\n/gu, "\n") : "";
  if (current !== markdown) {
    console.error("docs/KNOWLEDGE_PATTERN_REVIEW.md is out of date. Run node scripts/knowledge-pattern-review.js.");
    process.exit(1);
  }
  console.log("Knowledge pattern review is up to date.");
} else {
  fs.writeFileSync(OUT, markdown);
  console.log(`Wrote ${path.relative(ROOT, OUT)}.`);
}
