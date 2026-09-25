(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.BCKnowledgeMcpAdapter = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const TOOL_OBJECT = "bc_process_resolve_object";
  const TOOL_ACTION = "bc_process_resolve_action";
  const OBJECT_TYPES = new Set(["page", "table", "report", "codeunit", "enum", "unknown"]);
  const validId = value => typeof value === "string" && value.length <= 160 &&
    /^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(value);
  const shortText = value => typeof value === "string" && value.trim().length <= 160
    ? value.trim() : "";
  const safeCaption = value => shortText(value).replace(/https?:\/\/\S+|\b[^\s@]+@[^\s@]+\.[^\s@]+|\b\d{5,}\b/giu, "");
  const record = value => value && typeof value === "object" && !Array.isArray(value);
  const localeTag = value => {
    const result = shortText(value);
    return /^[a-z]{2,3}-[A-Z]{2}$/.test(result) ? result : null;
  };

  function validInputSchema(schema, required, properties) {
    if (!record(schema) || schema.type !== "object" || schema.additionalProperties !== false ||
        !record(schema.properties) || (schema.required !== undefined && !Array.isArray(schema.required)) ||
        (required.length > 0 && !Array.isArray(schema.required))) return false;
    const actualRequired = [...new Set(Array.isArray(schema.required) ? schema.required : [])].sort();
    if (JSON.stringify(actualRequired) !== JSON.stringify([...required].sort())) return false;
    const names = Object.keys(schema.properties);
    const expectedNames = Object.keys(properties);
    if (names.length !== expectedNames.length || names.some(name =>
      !Object.prototype.hasOwnProperty.call(properties, name))) return false;
    if (required.some(name => !Object.prototype.hasOwnProperty.call(schema.properties, name))) return false;
    return names.every(name => {
      const expected = properties[name];
      const actual = schema.properties[name];
      return expected.type === "object"
        ? validInputSchema(actual, expected.required, expected.properties)
        : record(actual) && actual.type === "string" &&
          (!expected.maxLength || actual.maxLength == null ||
            (Number.isInteger(actual.maxLength) && actual.maxLength >= expected.maxLength)) &&
          (!expected.enum || (Array.isArray(actual.enum) && expected.enum.every(value => actual.enum.includes(value))));
    });
  }

  const toolInputSchemas = Object.freeze({
    [TOOL_OBJECT]: Object.freeze({ required: ["objectType", "objectId", "productFamily"], properties: {
      objectType: { type: "string", maxLength: 32,
        enum: ["page", "table", "report", "codeunit", "enum", "unknown"] },
      objectId: { type: "string", maxLength: 160 },
      appId: { type: "string", maxLength: 160 }, appVersion: { type: "string", maxLength: 160 },
      productFamily: { type: "string", maxLength: 160,
        enum: ["business-central", "aptean-food-and-beverage", "unknown"] },
      locale: { type: "string", maxLength: 8 }
    } }),
    [TOOL_ACTION]: Object.freeze({ required: ["objectRef", "controlRef", "context"], properties: {
      objectRef: { type: "object", required: ["objectType", "objectId"], properties: {
        objectType: { type: "string", maxLength: 32,
          enum: ["page", "table", "report", "codeunit", "enum", "unknown"] },
        objectId: { type: "string", maxLength: 160 },
        appId: { type: "string", maxLength: 160 }, appVersion: { type: "string", maxLength: 160 }
      } },
      controlRef: { type: "object", required: [], properties: {
        controlId: { type: "string", maxLength: 160 }, automationId: { type: "string", maxLength: 160 }
      } },
      context: { type: "object", required: [], properties: {
        pageCaption: { type: "string", maxLength: 160 },
        actionCaption: { type: "string", maxLength: 160 },
        fieldCaption: { type: "string", maxLength: 160 }
      } },
      locale: { type: "string", maxLength: 8 }
    } })
  });

  function unresolved(reason) {
    return { status: "unresolved", candidates: [], reason };
  }

  function validateCandidate(kind, item) {
    if (!record(item) || !validId(item.candidateId) || !record(item.provenance) ||
        !shortText(item.provenance.sourceId) || !shortText(item.provenance.sourceVersion)) return null;
    const confidence = Number(item.confidence);
    if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) return null;
    let sourceUri = null;
    try {
      const parsed = new URL(shortText(item.provenance.sourceUri));
      if (parsed.protocol === "https:" && !parsed.username && !parsed.password) {
        sourceUri = `${parsed.origin}${parsed.pathname}`.slice(0, 160);
      }
    } catch { /* Source URIs are optional. */ }
    const source = { sourceId: item.provenance.sourceId.trim(),
      sourceVersion: item.provenance.sourceVersion.trim(),
      sourceUri };
    if (kind === "object") {
      const ref = item.objectRef;
      if (!record(ref) || !OBJECT_TYPES.has(ref.objectType) ||
          !validId(String(ref.objectId || ""))) return null;
      return { candidateId: item.candidateId, objectRef: {
        appId: validId(ref.appId) ? ref.appId : null,
        publisher: shortText(ref.publisher) || null, objectType: ref.objectType,
        objectId: String(ref.objectId), appVersion: shortText(ref.appVersion) || null },
        confidence: Math.min(confidence, 0.69), provenance: source };
    }
    if (!record(item.action) || !validId(item.action.taskType) ||
        !validId(item.action.semanticAction) || typeof item.action.entity !== "string" ||
        item.action.entity.length > 120) return null;
    return { candidateId: item.candidateId, action: {
      taskType: item.action.taskType, semanticAction: item.action.semanticAction,
      entity: item.action.entity }, confidence: Math.min(confidence, 0.69), provenance: source };
  }

  function parseToolResult(kind, response) {
    const value = response?.structuredContent;
    if (!record(value) || !["resolved", "ambiguous", "unresolved"].includes(value.status) ||
        !Array.isArray(value.candidates) || value.candidates.length > 10) {
      return unresolved("invalid-mcp-response");
    }
    const candidates = value.candidates.map(item => validateCandidate(kind, item));
    if (candidates.some(item => !item)) return unresolved("invalid-mcp-candidate");
    const unique = [...new Map(candidates.map(item => [item.candidateId, item])).values()];
    const status = value.status === "resolved" && unique.length !== 1 ? "ambiguous" : value.status;
    return { status: "suggested", remoteStatus: status, candidates: unique,
      selectedCandidateId: null, requiresReview: true, source: "mcp-unverified" };
  }

  function createMcpKnowledgeAdapter({ client, repository, consent = false } = {}) {
    const allowedTools = new Set([TOOL_OBJECT, TOOL_ACTION]);
    const listTools = async () => {
      if (!client || typeof client.listTools !== "function") return new Set();
      const result = await client.listTools();
      const tools = Array.isArray(result) ? result : result?.tools;
      return new Set((Array.isArray(tools) ? tools : [])
        .filter(item => allowedTools.has(item?.name) &&
          validInputSchema(item?.inputSchema,
            toolInputSchemas[item.name].required, toolInputSchemas[item.name].properties))
        .map(item => item.name));
    };
    const call = async (name, args, kind) => {
      if (consent !== true) return unresolved("external-lookup-not-approved");
      if (!client || typeof client.callTool !== "function") return unresolved("mcp-client-unavailable");
      try {
        if (!(await listTools()).has(name)) return unresolved("mcp-tool-unavailable");
        return parseToolResult(kind, await client.callTool({ name, arguments: args }));
      } catch {
        return unresolved("mcp-call-failed");
      }
    };
    const resolveObject = async ({ objectRef = {}, productFamily = "business-central",
      locale = null } = {}) => {
      const local = repository?.lookupObject?.(objectRef);
      if (local?.status === "resolved" || local?.status === "ambiguous") return local;
      const objectId = String(objectRef.objectId || objectRef.pageObjectId || "");
      if (!validId(objectId)) return unresolved("object-identity-required");
      const objectType = objectRef.objectType || "page";
      if (!OBJECT_TYPES.has(objectType)) return unresolved("invalid-object-type");
      const args = { objectType, objectId,
        productFamily: productFamily === "business-central" || productFamily === "aptean-food-and-beverage"
          ? productFamily : "unknown",
        ...(validId(objectRef.appId) ? { appId: objectRef.appId } : {}),
        ...(shortText(objectRef.appVersion) ? { appVersion: shortText(objectRef.appVersion) } : {}),
        ...(localeTag(locale) ? { locale: localeTag(locale) } : {}) };
      return call(TOOL_OBJECT, args, "object");
    };
    const resolveAction = async ({ objectRef = {}, controlRef = {}, context = {},
      locale = null } = {}) => {
      const local = repository?.resolveAction?.({ objectRef, controlRef, context, language: locale });
      if (local?.status === "resolved" || local?.status === "ambiguous") return local;
      const objectId = String(objectRef.objectId || objectRef.pageObjectId || "");
      if (!validId(objectId)) return unresolved("object-identity-required");
      const objectType = objectRef.objectType || "page";
      if (!OBJECT_TYPES.has(objectType)) return unresolved("invalid-object-type");
      return call(TOOL_ACTION, { objectRef: { objectType, objectId,
        ...(validId(objectRef.appId) ? { appId: objectRef.appId } : {}),
        ...(shortText(objectRef.appVersion) ? { appVersion: shortText(objectRef.appVersion) } : {}) },
        controlRef: { ...(validId(controlRef.controlId) ? { controlId: controlRef.controlId } : {}),
          ...(shortText(controlRef.automationId) ? { automationId: shortText(controlRef.automationId) } : {}) },
        context: { pageCaption: safeCaption(context.pageCaption),
          actionCaption: safeCaption(context.actionCaption),
          fieldCaption: safeCaption(context.fieldCaption) },
        ...(localeTag(locale) ? { locale: localeTag(locale) } : {}) }, "action");
    };
    return Object.freeze({ resolveObject, resolveAction });
  }

  return { TOOL_OBJECT, TOOL_ACTION, TOOL_INPUT_SCHEMAS: toolInputSchemas,
    createMcpKnowledgeAdapter, parseToolResult, validInputSchema };
});
