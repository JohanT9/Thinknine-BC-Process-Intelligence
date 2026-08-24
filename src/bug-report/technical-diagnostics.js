(function (root, factory) {
  const parser = typeof module === "object" && module.exports
    ? require("./al-call-stack-parser") : root.T9AlCallStackParser;
  const api = factory(parser);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9TechnicalDiagnostics = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (parser) {
  "use strict";
  const uniqueBy = (values, key) => [...new Map(values.map(value =>
    [key(value), value])).values()];

  function derive(errorEvidence = {}) {
    const callStack = parser.parseAlCallStack(errorEvidence.rawCallStack, {
      rawCallStackReference: errorEvidence.errorEvidenceId || null
    });
    const parsedFrames = callStack.frames.filter(frame =>
      frame.parseStatus === "parsed");
    const identifiedObjects = uniqueBy(parsedFrames.map(frame => ({
      objectType: frame.objectType, objectId: frame.objectId,
      objectName: frame.objectName
    })), item => `${item.objectType}|${item.objectId}|${item.objectName}`);
    const explicitExtensions = uniqueBy(parsedFrames.filter(frame =>
      frame.extensionName).map(frame => ({ extensionName: frame.extensionName,
      extensionPublisher: frame.extensionPublisher,
      extensionVersion: frame.extensionVersion, appId: frame.appId })),
    item => `${item.extensionName}|${item.extensionPublisher}|${item.extensionVersion || ""}|${item.appId || ""}`);
    return { schemaVersion: 1, authorship: "derived",
      errorEvidenceId: errorEvidence.errorEvidenceId || null,
      identifiers: { ...(errorEvidence.structuredDiagnostics || {}) },
      callStack, summary: { callStackAvailable: Boolean(
        errorEvidence.rawCallStack), parseStatus: callStack.status,
      frameCount: callStack.frames.length, parsedFrameCount: parsedFrames.length,
      unknownFrameCount: callStack.frames.length - parsedFrames.length,
      uniqueObjectCount: identifiedObjects.length,
      explicitExtensionCount: explicitExtensions.length }, identifiedObjects,
    explicitExtensions, firstFrame: callStack.frames[0] || null,
    lastFrame: callStack.frames.at(-1) || null,
    warnings: callStack.warnings.map(item => ({ ...item })) };
  }

  function safelyDerive(errorEvidence = {}) {
    try { return derive(errorEvidence); }
    catch (error) {
      return { schemaVersion: 1, authorship: "derived",
        errorEvidenceId: errorEvidence.errorEvidenceId || null,
        callStack: { parserVersion: parser.PARSER_VERSION,
          status: "unparsed", frames: [], unparsedSegments: [],
          warnings: [{ code: "parser-failure" }] },
        summary: { callStackAvailable: Boolean(errorEvidence.rawCallStack),
          parseStatus: "unparsed", frameCount: 0, parsedFrameCount: 0,
          unknownFrameCount: 0, uniqueObjectCount: 0,
          explicitExtensionCount: 0 }, identifiedObjects: [],
        explicitExtensions: [], firstFrame: null, lastFrame: null,
        warnings: [{ code: "parser-failure",
          message: String(error?.message || error).slice(0, 200) }] };
    }
  }

  return { derive, safelyDerive };
});
