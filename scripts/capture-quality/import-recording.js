// Turns an exported recording (the ZIP from Export recording, or its unpacked folder) into a
// capture quality corpus entry. Everything stays on this computer.
//   npm run quality:import -- <export.zip|folder> [--id name] [--keep-values]
// Field values, chosen records and text that repeats them are replaced by pseudonyms of the
// same shape (a typed prefix stays a prefix of the chosen value). Business Central captions,
// numbers and dates are kept. URLs keep only the page number; e-mail addresses and the
// company name are removed, and GUIDs are replaced consistently. --keep-values keeps values,
// for demo companies such as CRONUS.
// The expected steps start as a draft copied from today's result: correct them and set
// "reviewed": true before relying on the entry.
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const crypto = require("crypto");
const { rawEvent, replay } = require("./replay");
const { corpusDir } = require("./run");

function readZip(file) {
  const buffer = fs.readFileSync(file);
  let end = buffer.length - 22;
  while (end >= 0 && buffer.readUInt32LE(end) !== 0x06054b50) end -= 1;
  if (end < 0) throw new Error(`${file} is not a ZIP file.`);
  const entries = new Map();
  let offset = buffer.readUInt32LE(end + 16);
  for (let index = buffer.readUInt16LE(end + 10); index > 0; index -= 1) {
    const method = buffer.readUInt16LE(offset + 10);
    const size = buffer.readUInt32LE(offset + 20);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extra = buffer.readUInt16LE(offset + 30) + buffer.readUInt16LE(offset + 32);
    const local = buffer.readUInt32LE(offset + 42);
    const name = buffer.toString("utf8", offset + 46, offset + 46 + nameLength);
    const start = local + 30 + buffer.readUInt16LE(local + 26) + buffer.readUInt16LE(local + 28);
    const data = buffer.subarray(start, start + size);
    entries.set(name, () => method === 8 ? zlib.inflateRawSync(data) : data);
    offset += 46 + nameLength + extra;
  }
  return name => {
    const key = [...entries.keys()].find(item => item === name || item.endsWith(`/${name}`));
    return key ? JSON.parse(entries.get(key)().toString("utf8")) : null;
  };
}

function readFolder(dir) {
  return name => {
    const direct = path.join(dir, name);
    if (fs.existsSync(direct)) return JSON.parse(fs.readFileSync(direct, "utf8"));
    const nested = fs.readdirSync(dir).map(item => path.join(dir, item, name)).find(fs.existsSync);
    return nested ? JSON.parse(fs.readFileSync(nested, "utf8")) : null;
  };
}

const DATA_FIELDS = ["value", "previousValue", "enteredValue", "selectedValue", "selectedCaption"];
const COMPANY_FIELDS = ["companyName", "company"];
const TITLE_FIELDS = ["pageCaption", "documentTitle"];
const DATA_ROLES = new Set(["option", "row", "gridcell", "cell", "listitem", "treeitem"]);
const hasLetter = text => /\p{L}/u.test(text);

// Same length and character classes, so formats and typed prefixes survive.
function pseudonymFor(text) {
  const bytes = crypto.randomBytes(text.length);
  return [...text].map((character, index) => {
    if (/\p{Lu}/u.test(character)) return String.fromCharCode(65 + bytes[index] % 26);
    if (/\p{Ll}/u.test(character)) return String.fromCharCode(97 + bytes[index] % 26);
    return character;
  }).join("");
}

const TOKEN = /[\p{L}\p{N}]+/gu;
const wordsOf = text => String(text ?? "").match(TOKEN) || [];

// Words of field values and chosen records. Words that are also control captions (an option
// such as Item or Released) are Business Central captions, not customer data, and a typed
// fragment of a longer word is handled as a prefix of that word.
function collectDataWords(events) {
  const values = [];
  for (const event of events) {
    DATA_FIELDS.forEach(field => values.push(event[field]));
    // Business Central can show the company name as the page caption, so its words go too.
    COMPANY_FIELDS.forEach(field => values.push(event[field]));
    // A card's title names its record after "∙", as in "Purchase Order - 1001 ∙ Fabrikam".
    TITLE_FIELDS.forEach(field => values.push(String(event[field] || "").split("∙").slice(1).join(" ")));
    if (event.type === "click" && DATA_ROLES.has(event.role)) values.push(event.label, event.accessibleName);
  }
  const captionWords = new Set(events.filter(event => !DATA_ROLES.has(event.role))
    .flatMap(event => [event.fieldName, event.label, event.accessibleName])
    .filter(text => !values.includes(text)).flatMap(wordsOf).map(word => word.toLowerCase()));
  const words = new Set(values.flatMap(wordsOf).map(word => word.toLowerCase())
    .filter(word => word.length >= 2 && hasLetter(word) && !captionWords.has(word)));
  return [...words].filter(word => ![...words].some(other =>
    other !== word && other.startsWith(word))).sort((left, right) => right.length - left.length);
}

// Applies the letter case of the original word to its pseudonym.
const withCase = (original, pseudonym) => [...pseudonym].map((character, index) =>
  /\p{Lu}/u.test(original[index] || "") ? character.toUpperCase() : character).join("");

function sanitizeUrl(text) {
  return text.replace(/https?:\/\/[^\s"']+/gu, url => {
    try {
      const parsed = new URL(url); const page = parsed.searchParams.get("page");
      return `${parsed.origin}/tenant/environment${page ? `?page=${page}` : ""}`;
    } catch { return "https://redacted.invalid/"; }
  });
}

function sanitizeEvents(events, { keepValues = false } = {}) {
  const words = keepValues ? [] : collectDataWords(events);
  const pseudonyms = new Map(words.map(word => [word, pseudonymFor(word)]));
  const replaced = new Set();
  const guids = new Map();
  const pseudonymizeToken = (token, isValue) => {
    const lower = token.toLowerCase();
    if (pseudonyms.has(lower)) { replaced.add(lower); return withCase(token, pseudonyms.get(lower)); }
    if (!hasLetter(token)) return token;
    // A typed fragment in a value becomes the same fragment of the word's pseudonym.
    const whole = isValue && words.find(word => word.startsWith(lower));
    if (whole) { replaced.add(whole); return withCase(token, pseudonyms.get(whole).slice(0, token.length)); }
    // A data word inside an identifier, such as optAdatum.
    let result = token;
    for (const word of words.filter(item => item.length >= 4)) {
      const index = result.toLowerCase().indexOf(word);
      if (index >= 0) {
        replaced.add(word);
        result = result.slice(0, index) + withCase(result.slice(index, index + word.length),
          pseudonyms.get(word)) + result.slice(index + word.length);
      }
    }
    return result;
  };
  const sanitizeString = (text, key) => {
    if (COMPANY_FIELDS.includes(key)) return "";
    const result = sanitizeUrl(text)
      .replace(/[\p{L}\p{N}._%+-]+@[\p{L}\p{N}.-]+\.\p{L}{2,}/gu, "user@example.invalid")
      // The same GUID gets the same replacement, so events stay linked to their interaction.
      .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/giu, guid => {
        const key = guid.toLowerCase();
        if (!guids.has(key)) guids.set(key, crypto.randomUUID());
        return guids.get(key);
      });
    return words.length ? result.replace(TOKEN, token =>
      pseudonymizeToken(token, DATA_FIELDS.includes(key))) : result;
  };
  const walk = (value, key) => {
    if (typeof value === "string") return sanitizeString(value, key);
    if (Array.isArray(value)) return value.map(item => walk(item, key));
    if (value && typeof value === "object") {
      return Object.fromEntries(Object.entries(value).map(([field, item]) =>
        [field, walk(item, field)]));
    }
    return value;
  };
  return { events: events.map(event => walk(rawEvent(event))), pseudonymized: replaced.size };
}

function draftExpectedSteps(tasks) {
  return tasks.map(task => {
    const step = { target: task.actionCaption || task.fieldCaption || "" };
    if (task.selectedCaption) step.value = task.selectedCaption;
    step.note = task.instruction;
    return step;
  });
}

function importRecording(source, { id, keepValues = false } = {}) {
  const read = fs.statSync(source).isDirectory() ? readFolder(source) : readZip(source);
  const events = read("events.json");
  if (!Array.isArray(events) || !events.length) throw new Error("The export contains no events.json with events.");
  const session = read("session.json") || {};
  const documentLanguage = session.documentLanguage || session.settings?.documentLanguage || "en-US";
  const sanitized = sanitizeEvents(events, { keepValues });
  const entryId = id || `recording-${new Date().toISOString().slice(0, 10)}-` +
    crypto.randomBytes(3).toString("hex");
  const { tasks } = replay(sanitized.events, { id: entryId, documentLanguage });
  return {
    entry: { schemaVersion: 1, id: entryId, source: "recording-export",
      provenance: keepValues
        ? "Exported recording; URLs, e-mail addresses and company removed, GUIDs replaced, values kept."
        : "Exported recording; values pseudonymized; URLs, e-mail addresses and company removed, GUIDs replaced.",
      documentLanguage, reviewed: false,
      expectedSteps: draftExpectedSteps(tasks), events: sanitized.events },
    pseudonymized: sanitized.pseudonymized
  };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const option = name => { const index = args.indexOf(name); return index >= 0 ? args[index + 1] : undefined; };
  const source = args.find((arg, index) => !arg.startsWith("--") && args[index - 1] !== "--id");
  if (!source) {
    console.error("Usage: npm run quality:import -- <export.zip|folder> [--id name] [--keep-values]");
    process.exit(2);
  }
  const { entry, pseudonymized } = importRecording(source, { id: option("--id"),
    keepValues: args.includes("--keep-values") });
  const target = path.join(corpusDir, `${entry.id}.json`);
  if (fs.existsSync(target)) throw new Error(`${target} already exists.`);
  fs.writeFileSync(target, `${JSON.stringify(entry, null, 2)}\n`);
  console.log(`Wrote ${path.relative(process.cwd(), target)}: ${entry.events.length} events, ` +
    `${entry.expectedSteps.length} draft steps, ${pseudonymized} values pseudonymized.`);
  console.log("Correct expectedSteps, review the events for remaining customer data, then set \"reviewed\": true.");
}

module.exports = { collectDataWords, draftExpectedSteps, importRecording, pseudonymFor, readZip,
  sanitizeEvents, sanitizeUrl };
