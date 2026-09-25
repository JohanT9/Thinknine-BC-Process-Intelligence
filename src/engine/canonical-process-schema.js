(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.BCProcessSchema = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const SCHEMA_VERSION = 1;
  const id = { type: "string", minLength: 1, pattern: "\\S" };
  const nullable = definition => ({ anyOf: [definition, { type: "null" }] });
  const list = items => ({ type: "array", items });
  const ids = { ...list(id), uniqueItems: true };
  const choice = (...values) => ({ enum: values });
  const record = properties => ({ type: "object", properties,
    required: Object.keys(properties), additionalProperties: true });
  const bag = { type: "object" };
  const reference = record({ eventId: id,
    pointer: { type: "string", pattern: "^(?:/(?:[^~/]|~[01])*)*$" } });
  const manualRef = record({ changeId: id, revisionId: id });
  const confidence = record({ score: nullable({ type: "number", minimum: 0, maximum: 1 }),
    method: id, calibrationVersion: nullable(id) });
  const candidate = record({ candidateId: id,
    businessDomainId: nullable(id), businessProcessId: nullable(id),
    bcProcessId: nullable(id), processStepId: nullable(id),
    businessActionId: nullable(id), businessEntityId: nullable(id),
    provenance: record({ method: choice("metadata", "rule", "manual", "ai"),
      sourceEventIds: ids, knowledgeEntryId: nullable(id),
      knowledgeReleaseId: nullable(id), ruleVersion: nullable(id) }), confidence });
  const objectRef = record({ appId: nullable(id), publisher: nullable(id),
    objectType: nullable(id), objectId: nullable({ type: "string", pattern: "^[0-9]+$" }),
    appVersion: nullable(id) });
  const controlRef = record({ controlId: nullable(id), automationId: nullable(id),
    fieldId: nullable({ type: "string", pattern: "^[0-9]+$" }) });
  const step = record({ stepId: id, sequence: { type: "integer", minimum: 1 },
    origin: choice("observed", "manual"),
    kind: choice("navigation", "field-change", "selection", "action", "dialog", "information", "unknown"),
    sourceRefs: record({ eventIds: ids, normalizedEventIds: ids,
      stepGroupIds: ids, semanticActionIds: ids, assetIds: ids }),
    target: record({ objectRef: nullable(objectRef), controlRef: nullable(controlRef),
      capturedCaption: nullable({ type: "string" }) }),
    observation: record({ operation: nullable(id), valueRef: nullable(reference),
      previousValueRef: nullable(reference), result: record({
        status: choice("unknown", "observed-success", "observed-error"),
        evidenceEventIds: ids, messageRef: nullable(reference) }) }),
    interpretation: record({ status: choice("resolved", "ambiguous", "unresolved"),
      selectedCandidateId: nullable(id), candidates: list(candidate) }),
    extensions: { ...bag, properties: { "bc-process-studio": {
      ...bag, properties: { manualChangeRef: manualRef } } } } });
  const relation = record({ relationId: id, fromStepId: id, toStepId: id,
    type: choice("sequence", "conditional", "return", "unknown"),
    basis: choice("observed", "inferred", "manual"), sourceEventIds: ids,
    conditionRef: nullable({ anyOf: [reference, manualRef] }) });
  const diagnostic = record({ code: id, severity: choice("info", "warning", "error"),
    subjectRef: nullable(id), details: bag });
  const schema = { $schema: "https://json-schema.org/draft/2020-12/schema",
    title: "BC Process Studio Canonical Process v1",
    description: "Structural contract. validateProcess additionally checks semantic and source integrity.",
    ...record({ schemaVersion: { const: SCHEMA_VERSION }, processId: id, revisionId: id,
      recordingRef: record({ recordingId: id, revisionId: id }),
      derivation: record({ normalizerVersion: id, adapterVersion: id,
        knowledgeReleaseId: nullable(id), inputDigest: id }),
      context: record({ sourceLanguage: nullable(id), bcVersion: nullable(id),
        installedApps: nullable(list(record({ appId: id, publisher: nullable(id),
          appVersion: nullable(id) }))) }),
      steps: list(step), relations: list(relation), diagnostics: list(diagnostic), extensions: bag }) };

  const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
  const isObject = value => value !== null && typeof value === "object" && !Array.isArray(value);
  const escape = value => String(value).replace(/~/g, "~0").replace(/\//g, "~1");
  const freeze = value => {
    if (value && typeof value === "object" && !Object.isFrozen(value)) {
      Object.values(value).forEach(freeze); Object.freeze(value);
    }
    return value;
  };

  // Deliberately implements only the keywords used by the exported schema.
  // This is not a general JSON Schema evaluator or an input coercion layer.
  function structure(value, definition, path, report) {
    if (definition.anyOf) {
      if (!definition.anyOf.some(branch => {
        let valid = true;
        structure(value, branch, path, () => { valid = false; });
        return valid;
      })) report("process-invalid-shape", path);
      return;
    }
    const matches = type => type === "null" ? value === null :
      type === "object" ? isObject(value) : type === "array" ? Array.isArray(value) :
      type === "integer" ? Number.isInteger(value) :
      type === "number" ? typeof value === "number" && Number.isFinite(value) : typeof value === type;
    if (definition.type && !matches(definition.type)) {
      report("process-invalid-type", path); return;
    }
    if (own(definition, "const") && value !== definition.const) report("process-invalid-constant", path);
    if (definition.enum && !definition.enum.includes(value)) report("process-invalid-enum", path);
    if (typeof value === "string") {
      if (definition.minLength && [...value].length < definition.minLength) report("process-empty-string", path);
      if (definition.pattern && !new RegExp(definition.pattern, "u").test(value)) report("process-invalid-format", path);
    }
    if (typeof value === "number" && (value < definition.minimum || value > definition.maximum)) {
      report("process-out-of-range", path);
    }
    if (isObject(value)) {
      for (const key of definition.required || []) {
        if (!own(value, key)) report("process-required-field", `${path}/${escape(key)}`);
      }
      for (const [key, child] of Object.entries(definition.properties || {})) {
        if (own(value, key)) structure(value[key], child, `${path}/${escape(key)}`, report);
      }
    }
    if (Array.isArray(value)) {
      if (definition.uniqueItems && new Set(value).size !== value.length) report("process-duplicate-reference", path);
      if (definition.items) value.forEach((item, index) => structure(item, definition.items, `${path}/${index}`, report));
    }
  }

  // Guard the JSON data boundary, including extension fields. Never serialize input
  // for diagnostics: it may contain customer values, cycles or non-finite numbers.
  function jsonData(value, path, report, ancestors = new Set(), depth = 0) {
    if (depth > 100) { report("process-data-too-deep", path); return; }
    if (value === null || typeof value === "string" || typeof value === "boolean") return;
    if (typeof value === "number" && Number.isFinite(value)) return;
    if (typeof value !== "object") { report("process-non-json-value", path); return; }
    if (ancestors.has(value)) { report("process-cyclic-data", path); return; }
    if (!Array.isArray(value) && ![Object.prototype, null].includes(Object.getPrototypeOf(value))) {
      report("process-non-json-value", path); return;
    }
    ancestors.add(value);
    const keys = Array.isArray(value) ? Array.from({ length: value.length }, (_, i) => String(i)) : Object.keys(value);
    for (const key of keys) jsonData(value[key], `${path}/${escape(key)}`, report, ancestors, depth + 1);
    ancestors.delete(value);
  }

  function validateProcess(process, options = {}) {
    const diagnostics = [];
    const report = (code, path, severity = "error") => diagnostics.push({
      code, severity, subjectRef: path || "/", details: {} });
    if (isObject(process) && own(process, "schemaVersion") && process.schemaVersion !== SCHEMA_VERSION) {
      report("process-unsupported-schema", "/schemaVersion"); return diagnostics;
    }
    jsonData(process, "", report);
    if (diagnostics.length) return diagnostics;
    structure(process, schema, "", report);
    if (diagnostics.length) return diagnostics;

    const unique = (items, key, path) => {
      const seen = new Set();
      items.forEach((item, index) => {
        if (seen.has(item[key])) report("process-duplicate-id", `${path}/${index}/${key}`);
        seen.add(item[key]);
      });
      return seen;
    };
    const stepIds = unique(process.steps, "stepId", "/steps");
    unique(process.relations, "relationId", "/relations");
    const recording = options.recording;
    const derivedIndexes = {};
    for (const [name, key, path] of [["normalized", "normalizedEventId", "/normalizedEvents"],
      ["groups", "stepGroupId", "/stepGroups"], ["actions", "actionId", "/semanticActions"]]) {
      const supplied = options[name === "normalized" ? "normalizedEvents" : name === "groups" ? "stepGroups" : "semanticActions"];
      if (supplied === undefined) derivedIndexes[name] = null;
      else if (!Array.isArray(supplied) || supplied.some(item => !isObject(item) || typeof item[key] !== "string")) {
        report("process-invalid-derived-context", path);
        derivedIndexes[name] = new Set();
      } else {
        const index = new Set();
        supplied.forEach((item, position) => {
          if (index.has(item[key])) report("process-duplicate-derived-id", `${path}/${position}/${key}`);
          index.add(item[key]);
        });
        derivedIndexes[name] = index;
      }
    }
    let events = null, assets = null;
    if (recording === undefined) {
      report("process-recording-not-checked", "/recordingRef", "warning");
    } else if (!isObject(recording) || !Array.isArray(recording.events) ||
        !Array.isArray(recording.assets) || recording.events.some(event => !isObject(event) || typeof event.id !== "string") ||
        recording.assets.some(asset => !isObject(asset) || typeof asset.id !== "string")) {
      report("process-invalid-recording-context", "/recordingRef");
    } else {
      if (recording.schemaVersion !== 1) report("process-unsupported-recording-schema", "/recordingRef");
      if (recording.id !== process.recordingRef.recordingId) report("process-recording-mismatch", "/recordingRef/recordingId");
      const revision = recording.revisionId || options.recordingRevisionId;
      if (!revision) report("process-recording-revision-not-checked", "/recordingRef/revisionId", "warning");
      else if (revision !== process.recordingRef.revisionId) report("process-recording-revision-mismatch", "/recordingRef/revisionId");
      unique(recording.events, "id", "/recording/events");
      unique(recording.assets, "id", "/recording/assets");
      events = new Map(recording.events.map(event => [event.id, event]));
      assets = new Set(recording.assets.map(asset => asset.id));
    }
    const checkEvents = (values, path, scope) => values.forEach((eventId, index) => {
      if (events && !events.has(eventId)) report("process-missing-event", `${path}/${index}`);
      if (scope && !scope.includes(eventId)) report("process-event-outside-step", `${path}/${index}`);
    });
    const checkPointer = (ref, path, scope) => {
      if (!ref || !own(ref, "eventId")) return;
      checkEvents([ref.eventId], `${path}/eventId`, scope);
      if (!events || !events.has(ref.eventId)) return;
      let value = events.get(ref.eventId);
      const parts = ref.pointer === "" ? [] : ref.pointer.slice(1).split("/").map(part => part.replace(/~1/g, "/").replace(/~0/g, "~"));
      for (const part of parts) {
        if (value === null || typeof value !== "object" || !own(value, part) ||
            (Array.isArray(value) && !/^(0|[1-9][0-9]*)$/.test(part))) {
          report("process-missing-value", `${path}/pointer`); return;
        }
        value = value[part];
      }
    };
    process.steps.forEach((step, index) => {
      const path = `/steps/${index}`;
      const source = step.sourceRefs.eventIds;
      if (step.sequence !== index + 1) report("process-sequence-mismatch", `${path}/sequence`);
      if (step.origin === "observed" && !source.length) report("process-observation-without-source", `${path}/sourceRefs/eventIds`);
      const manual = step.extensions["bc-process-studio"]?.manualChangeRef;
      if (step.origin === "manual" && !manual) report("process-manual-change-required", `${path}/extensions`);
      checkEvents(source, `${path}/sourceRefs/eventIds`);
      step.sourceRefs.assetIds.forEach((assetId, i) => {
        if (assets && !assets.has(assetId)) report("process-missing-asset", `${path}/sourceRefs/assetIds/${i}`);
      });
      for (const key of ["valueRef", "previousValueRef"]) checkPointer(step.observation[key], `${path}/observation/${key}`, source);
      for (const [field, index, label] of [["normalizedEventIds", derivedIndexes.normalized, "normalized"],
        ["stepGroupIds", derivedIndexes.groups, "groups"], ["semanticActionIds", derivedIndexes.actions, "actions"]]) {
        step.sourceRefs[field].forEach((id, position) => {
          if (index && !index.has(id)) report(`process-missing-${label}-reference`, `${path}/sourceRefs/${field}/${position}`);
        });
        if (step.sourceRefs[field].length && index === null) {
          report(`process-${label}-references-not-checked`, `${path}/sourceRefs/${field}`, "warning");
        }
      }
      const result = step.observation.result;
      checkEvents(result.evidenceEventIds, `${path}/observation/result/evidenceEventIds`, source);
      checkPointer(result.messageRef, `${path}/observation/result/messageRef`, result.evidenceEventIds);
      if (result.status !== "unknown") {
        if (!result.evidenceEventIds.length) report("process-result-without-evidence", `${path}/observation/result`);
        // Structural references cannot prove business success. The adapter must
        // later supply verified result semantics; do not imply that we checked it.
        else report("process-result-semantics-not-checked", `${path}/observation/result`, "warning");
      }
      const interpretation = step.interpretation;
      const candidates = unique(interpretation.candidates, "candidateId", `${path}/interpretation/candidates`);
      if (interpretation.status === "resolved" && !candidates.has(interpretation.selectedCandidateId)) report("process-selected-candidate-missing", `${path}/interpretation`);
      if (interpretation.status !== "resolved" && interpretation.selectedCandidateId !== null) report("process-unexpected-selection", `${path}/interpretation`);
      if (interpretation.status === "ambiguous" && candidates.size < 2) report("process-ambiguity-needs-candidates", `${path}/interpretation`);
      interpretation.candidates.forEach((candidate, i) => {
        const p = `${path}/interpretation/candidates/${i}/provenance`;
        const provenance = candidate.provenance;
        checkEvents(provenance.sourceEventIds, `${p}/sourceEventIds`, source);
        if (provenance.method === "rule" && (!provenance.knowledgeEntryId || !provenance.knowledgeReleaseId || !provenance.ruleVersion)) report("process-rule-provenance-required", p);
        if (provenance.knowledgeReleaseId !== null && provenance.knowledgeReleaseId !== process.derivation.knowledgeReleaseId) report("process-knowledge-release-mismatch", p);
        if (provenance.method === "manual" && !manual) report("process-manual-change-required", p);
      });
    });
    process.relations.forEach((relation, index) => {
      const path = `/relations/${index}`;
      for (const key of ["fromStepId", "toStepId"]) {
        if (!stepIds.has(relation[key])) report("process-missing-step", `${path}/${key}`);
      }
      checkEvents(relation.sourceEventIds, `${path}/sourceEventIds`);
      checkPointer(relation.conditionRef, `${path}/conditionRef`, relation.sourceEventIds);
      if (relation.basis === "observed" && !relation.sourceEventIds.length) report("process-relation-without-source", path);
      if (relation.type === "conditional" && !relation.conditionRef) report("process-condition-required", path);
      if (relation.conditionRef && own(relation.conditionRef, "changeId") && relation.basis !== "manual") report("process-manual-condition-basis", path);
    });
    if (process.derivation.knowledgeReleaseId !== null) {
      // Release entry/concept validation belongs to the stage-2 repository contract.
      report("process-knowledge-references-not-checked", "/derivation/knowledgeReleaseId", "warning");
    }
    return diagnostics;
  }
  return { SCHEMA_VERSION, schema: freeze(schema), validateProcess };
});
