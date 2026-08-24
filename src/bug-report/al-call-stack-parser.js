(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9AlCallStackParser = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const SCHEMA_VERSION = 1;
  const PARSER_VERSION = "1.0.0";
  const KNOWN_TYPES = new Set(["codeunit", "page", "table", "tableextension",
    "pageextension", "report", "query", "xmlport", "enum", "interface"]);
  const TRIGGERS = new Set(["onrun", "onvalidate", "oninsert", "onmodify",
    "ondelete", "onopenpage", "onaction"]);
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const warning = (code, frameIndex) => ({ code, ...(frameIndex == null
    ? {} : { frameIndex }) });

  function sourceFields(text) {
    const result = {};
    const source = text.match(/\b(?:at|in|source)\s+([^\r\n]+?)\s+(?:line|rad|linje)\s+(\d+)\b/iu);
    const line = text.match(/\b(?:line|rad|linje)\s+(\d+)\b/iu);
    if (source) {
      result.sourceFile = source[1].trim();
      result.sourceLocation = source[0];
      result.lineNumber = Number(source[2]);
    } else if (line) result.lineNumber = Number(line[1]);
    return result;
  }

  function appFields(text) {
    const result = {};
    const app = text.match(/\s+-\s+(.+?)\s+by\s+(.+?)\s+version\s+([\w.+-]+)(?:\s+\(([0-9a-f-]{36})\))?\s*$/iu) ||
      text.match(/\s+-\s+(.+?)\s+by\s+(.+?)\s*$/iu);
    if (app) {
      result.extensionName = app[1].trim();
      result.extensionPublisher = app[2].trim();
      if (app[3]) result.extensionVersion = app[3];
      if (app[4]) result.appId = app[4];
    }
    return result;
  }

  function classify(methodName, context) {
    if (/subscriber/iu.test(context)) return "event-subscriber";
    if (/publisher/iu.test(context)) return "event-publisher";
    if (TRIGGERS.has(String(methodName || "").toLocaleLowerCase())) return "trigger";
    return methodName ? "procedure" : "unknown";
  }

  function parseFrame(rawText, frameIndex) {
    const first = rawText.split(/\r?\n/u)[0].trim();
    const patterns = [
      /^"([^"]+)"\s*\(([A-Za-z][\w ]*)\s+(\d+)\)\.([^\s(]+)(?:\(([^)]*)\))?/u,
      /^([A-Za-z][\w ]*)\s+(\d+)\s+"([^"]+)"\.([^\s(]+)(?:\(([^)]*)\))?/u
    ];
    let match = first.match(patterns[0]);
    let values;
    if (match) values = { objectName: match[1], objectType: match[2].trim(),
      objectId: Number(match[3]), methodName: match[4], context: match[5] || "" };
    else {
      match = first.match(patterns[1]);
      if (match) values = { objectType: match[1].trim(), objectId: Number(match[2]),
        objectName: match[3], methodName: match[4], context: match[5] || "" };
    }
    if (!values) return { frameIndex, rawText, classification: "unknown",
      parseStatus: "unparsed" };
    const frame = { frameIndex, rawText, ...values, ...sourceFields(rawText),
      ...appFields(rawText) };
    if (/trigger/iu.test(values.context) || TRIGGERS.has(
      values.methodName.toLocaleLowerCase())) frame.triggerName = values.methodName;
    const event = values.context.match(/(?:publisher|subscriber)\s*[:=]\s*([^,]+)/iu);
    if (event) frame.eventName = event[1].trim();
    if (/publisher/iu.test(values.context)) frame.publisherName = values.objectName;
    if (/subscriber/iu.test(values.context)) frame.subscriberName = values.objectName;
    frame.classification = classify(values.methodName, values.context);
    frame.parseStatus = "parsed";
    return frame;
  }

  function frameBlocks(raw) {
    const blocks = [];
    let current = [];
    for (const line of raw.split(/\r?\n/u)) {
      const startsFrame = /^\s*(?:"[^"]+"\s*\([A-Za-z]|[A-Za-z][\w ]*\s+\d+\s+")/u.test(line);
      const startsUnknownSegment = current.length && line.trim() &&
        !startsFrame && !/^\s/u.test(line);
      if ((startsFrame || startsUnknownSegment) && current.length) {
        blocks.push(current.join("\n"));
        current = [];
      }
      if (line.trim() || current.length) current.push(line);
    }
    if (current.length) blocks.push(current.join("\n"));
    return blocks;
  }

  function parseAlCallStack(rawCallStack, options = {}) {
    const raw = typeof rawCallStack === "string" ? rawCallStack : "";
    const rawReference = options.rawCallStackReference || null;
    if (!raw.trim()) return { schemaVersion: SCHEMA_VERSION,
      parserVersion: PARSER_VERSION, status: "not-available",
      rawCallStackReference: rawReference, frames: [], unparsedSegments: [],
      warnings: [], truncated: false };
    const blocks = frameBlocks(raw);
    const frames = blocks.map((block, index) => parseFrame(block, index));
    const unparsedSegments = frames.filter(frame => frame.parseStatus === "unparsed")
      .map(frame => ({ frameIndex: frame.frameIndex, rawText: frame.rawText }));
    const warnings = unparsedSegments.map(item => warning("unknown-frame-format",
      item.frameIndex));
    frames.forEach(frame => {
      if (frame.parseStatus !== "parsed") return;
      if (!KNOWN_TYPES.has(frame.objectType.toLocaleLowerCase())) warnings.push(
        warning("unknown-object-type", frame.frameIndex));
    });
    const truncated = /(?:\.\.\.|truncated|avkortad|afkortet)\s*$/iu.test(raw.trim());
    if (truncated) warnings.push(warning("truncated-call-stack"));
    const parsedCount = frames.length - unparsedSegments.length;
    return { schemaVersion: SCHEMA_VERSION, parserVersion: PARSER_VERSION,
      status: parsedCount === frames.length ? "parsed" : parsedCount
        ? "partially-parsed" : "unparsed",
      rawCallStackReference: rawReference, frames, unparsedSegments, warnings,
      truncated };
  }

  return { SCHEMA_VERSION, PARSER_VERSION, parseAlCallStack, parseFrame,
    KNOWN_TYPES: [...KNOWN_TYPES] };
});
