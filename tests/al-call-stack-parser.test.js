const assert = require("assert");
const fs = require("fs");
const parser = require("../src/bug-report/al-call-stack-parser");
const technical = require("../src/bug-report/technical-diagnostics");
const canonical = require("../src/engine/canonical-recording");
const service = require("../src/bug-report/bug-report-service");
const corpus = require("./fixtures/al-call-stacks.json");

assert.strictEqual(parser.PARSER_VERSION, "1.0.0");
const rawBefore = corpus.standard;
const standard = parser.parseAlCallStack(rawBefore, {
  rawCallStackReference: "error:standard" });
assert.strictEqual(corpus.standard, rawBefore);
assert.strictEqual(standard.status, "parsed");
assert.strictEqual(standard.frames.length, 2);
assert.deepStrictEqual(standard.frames.map(frame => frame.objectId), [80, 36]);
assert.deepStrictEqual(standard.frames.map(frame => frame.objectName),
["Sales-Post", "Sales Header"]);
assert.strictEqual(standard.frames[0].objectType, "Codeunit");
assert.strictEqual(standard.frames[0].triggerName, "OnRun");
assert.strictEqual(standard.frames[0].classification, "trigger");
assert.strictEqual(standard.frames[0].lineNumber, 12);
assert.strictEqual(standard.frames[0].extensionName, "Base Application");
assert.strictEqual(standard.frames[0].extensionPublisher, "Microsoft");
assert.strictEqual(standard.frames[0].extensionVersion, "26.0.0.0");
assert.strictEqual(standard.frames[0].rawText, corpus.standard.split("\n")[0]);
assert.strictEqual(standard.rawCallStackReference, "error:standard");

const alternate = parser.parseAlCallStack(corpus.alternate);
assert.strictEqual(alternate.frames[0].objectType, "Page");
assert.strictEqual(alternate.frames[0].objectId, 42);
assert.strictEqual(alternate.frames[0].methodName, "OnOpenPage");
const extension = parser.parseAlCallStack(corpus.extension).frames[0];
assert.strictEqual(extension.classification, "event-subscriber");
assert.strictEqual(extension.eventName, "OnAfterPost");
assert.strictEqual(extension.subscriberName, "Post Handler");
assert.strictEqual(extension.appId, "11111111-1111-1111-1111-111111111111");
const publisher = parser.parseAlCallStack(corpus.publisher).frames[0];
assert.strictEqual(publisher.classification, "event-publisher");
assert.strictEqual(publisher.publisherName, "Event Source");
const source = parser.parseAlCallStack(corpus.source).frames[0];
assert.strictEqual(source.sourceFile, "src/Helper.Codeunit.al");
assert.strictEqual(source.lineNumber, 19);
assert.strictEqual(parser.parseAlCallStack(corpus.localized).frames[0].lineNumber, 21);

const partial = parser.parseAlCallStack(corpus.partial);
assert.strictEqual(partial.status, "partially-parsed");
assert.strictEqual(partial.unparsedSegments[0].rawText,
"Future stack syntax without recognized tokens");
assert(partial.warnings.some(item => item.code === "unknown-frame-format"));
assert.strictEqual(parser.parseAlCallStack(corpus.unknown).status, "unparsed");
assert.strictEqual(parser.parseAlCallStack(corpus.malformed).status, "unparsed");
assert.strictEqual(parser.parseAlCallStack(corpus.empty).status, "not-available");
const multiline = parser.parseAlCallStack(corpus.multiline);
assert.strictEqual(multiline.frames.length, 1);
assert(multiline.frames[0].rawText.includes("continuation metadata"));
const truncated = parser.parseAlCallStack(corpus.truncated);
assert.strictEqual(truncated.truncated, true);
assert(truncated.warnings.some(item => item.code === "truncated-call-stack"));
const future = parser.parseAlCallStack(corpus.futureObjectType);
assert.strictEqual(future.frames[0].parseStatus, "parsed");
assert(future.warnings.some(item => item.code === "unknown-object-type"));

const diagnostic = technical.derive({ errorEvidenceId: "error:technical",
  rawCallStack: corpus.duplicateObject,
  structuredDiagnostics: { clientActivityId: "sanitized" } });
assert.strictEqual(diagnostic.summary.frameCount, 2);
assert.strictEqual(diagnostic.summary.parsedFrameCount, 2);
assert.strictEqual(diagnostic.summary.uniqueObjectCount, 1);
assert.strictEqual(diagnostic.firstFrame.methodName, "First");
assert.strictEqual(diagnostic.lastFrame.methodName, "Second");
assert.strictEqual(diagnostic.identifiedObjects.length, 1);
assert.strictEqual(technical.derive({ errorEvidenceId: "error:app",
  rawCallStack: corpus.extension }).summary.explicitExtensionCount, 1);

let recording = canonical.create({ id: "bug-parser", startedAt: "2026-08-24T10:00:00Z",
  recordingPurpose: "bug-report" });
recording = canonical.finish(recording, "2026-08-24T10:01:00Z");
const evidence = { errorEvidenceId: "error:integration",
  rawCallStack: corpus.standard, callStackAvailable: true,
  structuredDiagnostics: {} };
const report = service.createBugReportFromRecording(recording, [], {
  errorEvidence: [evidence], now: "2026-08-24T10:01:00Z" });
assert.strictEqual(report.callStack.parserVersion, parser.PARSER_VERSION);
assert.strictEqual(report.callStack.frames.length, 2);
assert.strictEqual(report.technicalDiagnostics[0].authorship, "derived");
const reparsed = service.reparseTechnicalDiagnostics(report, [{ ...evidence,
  rawCallStack: corpus.alternate }]);
assert.strictEqual(reparsed.callStack.frames[0].objectId, 42);
assert.strictEqual(evidence.rawCallStack, corpus.standard);
const regenerated = service.regenerate(report, recording, [], {});
assert.strictEqual(regenerated.callStack.frames.length, 2);
assert.strictEqual(regenerated.technicalDiagnostics[0].summary.frameCount, 2);

const parserSource = fs.readFileSync("src/bug-report/al-call-stack-parser.js", "utf8");
const backgroundSource = fs.readFileSync("src/recorder/background.js", "utf8");
for (const forbidden of ["chrome.", "document.", "docx", "eval(", "fetch(",
  "OpenAI", "ApplicationInsights"]) assert(!parserSource.includes(forbidden));
assert(!parserSource.includes("rootCause"));
assert(backgroundSource.includes("T9_REPARSE_BUG_REPORT_TECHNICAL_DIAGNOSTICS"));
console.log("AL call-stack parser and Technical Diagnostics tests passed.");
