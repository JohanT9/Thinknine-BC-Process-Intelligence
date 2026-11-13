#!/usr/bin/env node
// Spike: can a BC Process Studio recording be exported to Microsoft's Page Scripting?
//
// Page Scripting points at a control by the page's name, the control's AL name (Code,
// Control1, Control_New) and a short runtime reference (runtimeRef). This script reads a
// Page Scripting recording (.yml) and a BC Process Studio library export (.bcps) of the same
// flow, recorded at the same time, and reports for each name and runtimeRef in the YAML
// where in the BC Process Studio recording it occurs, if anywhere.
//
//   node scripts/compare-page-scripting.js <recording.yml> <export.bcps> [--out report.md]
//        [--snippet snippet.js]
//
// --snippet writes a script to paste in the browser console on the Business Central page.
// It looks for the same names in every attribute of the page, which tells whether the web
// client shows them at all, even in attributes the recorder does not keep.
// The script only reads both files; it changes nothing.
"use strict";

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const YAML = require("yaml");

const args = process.argv.slice(2);
function option(name) {
  const index = args.indexOf(name);
  if (index < 0) return null;
  const value = args[index + 1];
  args.splice(index, 2);
  return value;
}
const outFile = option("--out");
const snippetFile = option("--snippet");
if (args.length !== 2) {
  console.error("Usage: node scripts/compare-page-scripting.js <recording.yml> <export.bcps> " +
    "[--out report.md] [--snippet snippet.js]");
  process.exit(2);
}
const [yamlFile, bcpsFile] = args;

// ---- Page Scripting: every target part, value and runtimeRef --------------------------------

// Target parts are single-key maps: {page: "Sales Order", runtimeRef: "b9ee"}, {field: "Code"},
// {repeater: "Control1"}, {action: "Control_New"}. Included scripts are read as well.
function readScript(file, seen = new Set()) {
  const full = path.resolve(file);
  if (seen.has(full)) return [];
  seen.add(full);
  const doc = YAML.parse(fs.readFileSync(full, "utf8")) || {};
  const out = [];
  (function walk(steps) {
    for (const [index, step] of (Array.isArray(steps) ? steps : []).entries()) {
      if (!step || typeof step !== "object") continue;
      if (step.type === "include" && typeof step.file === "string") {
        out.push(...readScript(path.join(path.dirname(full), step.file), seen));
        continue;
      }
      out.push({ file: path.basename(full), index, step });
      for (const value of Object.values(step)) {
        if (Array.isArray(value) && value.some(item => item && item.type)) walk(value);
      }
    }
  })(doc.steps);
  return out;
}

const KINDS = ["page", "field", "action", "repeater", "part", "control", "systemAction"];
function targetsOf(steps) {
  const targets = new Map();
  function add(kind, value, step) {
    if (typeof value !== "string" && typeof value !== "number") return;
    const text = String(value).trim();
    if (!text) return;
    const key = `${kind}\u0000${text}`;
    if (!targets.has(key)) targets.set(key, { kind, value: text, steps: [] });
    targets.get(key).steps.push(`${step.file}#${step.index + 1} ${step.step.type || ""}`.trim());
  }
  for (const step of steps) {
    for (const part of Array.isArray(step.step.target) ? step.step.target : []) {
      if (!part || typeof part !== "object") continue;
      for (const [kind, value] of Object.entries(part)) {
        if (KINDS.includes(kind) || kind === "runtimeRef") add(kind, value, step);
        else add(`other:${kind}`, value, step);
      }
    }
    const value = step.step.value;
    if (value != null && !String(value).startsWith("=")) add("value", value, step);
  }
  return [...targets.values()];
}

// ---- BC Process Studio: every string in the recording's entries -----------------------------

function readExport(file) {
  let text = fs.readFileSync(file);
  if (text[0] === 0x1f && text[1] === 0x8b) text = zlib.gunzipSync(text);
  const strings = [];
  let entries = 0;
  for (const line of text.toString("utf8").split(/\r?\n/u)) {
    if (!line.trim()) continue;
    let row;
    try { row = JSON.parse(line); } catch { continue; }
    if (row.type !== "entry") continue;
    // Screenshot images are large and hold no control names.
    if (/^t9_(screenshot_blob|screenshot_asset|test_screenshot)/u.test(row.key || "")) continue;
    entries++;
    (function walk(value, pointer) {
      if (typeof value === "string") {
        if (value.length < 4000 && !value.startsWith("data:")) strings.push({ key: row.key, pointer, value });
      } else if (typeof value === "number") {
        strings.push({ key: row.key, pointer, value: String(value) });
      } else if (Array.isArray(value)) {
        value.forEach((item, index) => walk(item, `${pointer}/${index}`));
      } else if (value && typeof value === "object") {
        for (const [name, item] of Object.entries(value)) walk(item, `${pointer}/${name}`);
      }
    })(row.value, "");
  }
  return { strings, entries };
}

// Where a name occurs: exactly as a whole value, or as a word inside a longer value.
function find(target, strings) {
  const exact = [];
  const inside = [];
  const word = new RegExp(`(^|[^\\p{L}\\p{N}_])${target.value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}($|[^\\p{L}\\p{N}_])`, "u");
  for (const item of strings) {
    if (item.value === target.value) exact.push(item);
    else if (target.value.length >= 3 && word.test(item.value)) inside.push(item);
  }
  return { exact, inside };
}

// The attribute a hit sits in, without array indexes: /events/12/target/automationId -> target/automationId.
const field = item => item.pointer.replace(/\/\d+/gu, "").replace(/^\//u, "") || "(värde)";
function summary(hits) {
  const counts = new Map();
  for (const item of hits) counts.set(field(item), (counts.get(field(item)) || 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1]).slice(0, 4)
    .map(([name, count]) => `\`${name}\` (${count})`).join(", ");
}

const steps = readScript(yamlFile);
const targets = targetsOf(steps);
const { strings, entries } = readExport(bcpsFile);

const rows = targets.map(target => ({ target, ...find(target, strings) }));
const LABEL = {
  page: "Sida", field: "Fält (AL-namn)", action: "Åtgärd (AL-namn)", repeater: "Lista (AL-namn)",
  part: "Del (AL-namn)", control: "Kontroll", systemAction: "Systemåtgärd",
  runtimeRef: "runtimeRef", value: "Värde"
};
const critical = rows.filter(row => ["field", "action", "repeater", "part", "control", "runtimeRef"].includes(row.target.kind));
const foundExact = critical.filter(row => row.exact.length);

const lines = [];
lines.push("# Page Scripting mot BC Process Studio", "");
lines.push(`- Page Scripting: \`${path.basename(yamlFile)}\`, ${steps.length} steg, ${targets.length} unika mål och värden`);
lines.push(`- BC Process Studio: \`${path.basename(bcpsFile)}\`, ${entries} poster, ${strings.length} värden genomsökta`, "");
lines.push("## Resultat", "");
if (!critical.length) {
  lines.push("YAML-filen innehåller inga fält-, åtgärds- eller runtimeRef-mål. Kontrollera att rätt fil är vald.");
} else {
  lines.push(`**${foundExact.length} av ${critical.length}** AL-namn och runtimeRef finns exakt i BC Process Studios inspelning.`, "");
  lines.push(foundExact.length === critical.length
    ? "Alla mål finns. En export till Page Scripting ser genomförbar ut; nästa steg är att se om attributen är desamma på andra sidor och efter en omkompilering."
    : foundExact.length
      ? "En del mål finns. Se tabellen för vilka som saknas, och kör konsolskriptet på samma sida för att se om webbklienten visar dem i attribut som inspelaren inte sparar."
      : "Inga mål finns. Kör konsolskriptet på samma sida. Visar webbklienten inte heller namnen där, går en direkt export inte, och importvägen (Page Scripting in i BC Process Studio) är den som återstår.");
}
lines.push("", "## Per mål", "");
lines.push("| Typ | Page Scripting | Exakt träff | Ingår i längre värde | Steg |", "|---|---|---|---|---|");
for (const row of rows) {
  lines.push(`| ${LABEL[row.target.kind] || row.target.kind} | \`${row.target.value}\` | ` +
    `${row.exact.length ? `ja: ${summary(row.exact)}` : "**nej**"} | ` +
    `${row.inside.length ? summary(row.inside) : "–"} | ${row.target.steps.slice(0, 3).join(", ")}${row.target.steps.length > 3 ? " …" : ""} |`);
}
lines.push("", "Värden som BC Process Studio har maskerat visas som `[maskerat]` och kan inte matcha.");
const report = lines.join("\n") + "\n";

if (outFile) {
  fs.writeFileSync(outFile, report, "utf8");
  console.log(`Rapport skriven: ${outFile}`);
} else {
  process.stdout.write(report);
}

if (snippetFile) {
  const names = [...new Set(critical.map(row => row.target.value))];
  const snippet = `// Klistra in i konsolen (F12) på Business Central-sidan, i ramen som visar sidan.
// Letar efter Page Scriptings namn i alla attribut och id:n på sidan. Ändrar ingenting.
(() => {
  const names = ${JSON.stringify(names)};
  const docs = [document, ...[...document.querySelectorAll("iframe")].map(f => { try { return f.contentDocument; } catch { return null; } }).filter(Boolean)];
  const result = [];
  for (const name of names) {
    const hits = [];
    for (const doc of docs) for (const el of doc.querySelectorAll("*")) {
      for (const attr of el.attributes) {
        if (attr.value === name || attr.value.split(/[\\s,;|:]+/).includes(name)) {
          hits.push(el.tagName.toLowerCase() + " [" + attr.name + "]");
        }
      }
    }
    result.push({ namn: name, träffar: hits.length, exempel: [...new Set(hits)].slice(0, 5).join(", ") });
  }
  console.table(result);
  return result;
})();
`;
  fs.writeFileSync(snippetFile, snippet, "utf8");
  console.log(`Konsolskript skrivet: ${snippetFile}`);
}
