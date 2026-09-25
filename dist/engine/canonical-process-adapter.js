(function (root, factory) {
  const schema = typeof module === "object" && module.exports
    ? require("./canonical-process-schema") : root.BCProcessSchema;
  const api = factory(schema);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.BCProcessAdapter = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (schemaApi) {
  "use strict";
  const ADAPTER_VERSION = "1.0.0";
  const NORMALIZER_VERSION = "1.0.0";
  const own = (value, key) => Object.prototype.hasOwnProperty.call(value || {}, key);
  const text = value => value == null || String(value).trim() === "" ? null : String(value).trim();
  const unique = values => [...new Set((Array.isArray(values) ? values : [])
    .filter(value => value !== null && value !== undefined && String(value) !== "")
    .map(String))];
  const obj = value => value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const list = value => Array.isArray(value) ? value : [];

  function canonical(value) {
    if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
    if (value && typeof value === "object") return `{${Object.keys(value).sort()
      .map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
    return JSON.stringify(value);
  }

  // Stable content fingerprint, not a cryptographic authenticity signature.
  // Two independently seeded 64-bit FNV streams make IDs compact and repeatable
  // in both current browsers and the Node 20 CI runtime.
  function digest(value) {
    const input = canonical(value);
    const hash = seed => {
      let state = seed;
      for (let index = 0; index < input.length; index += 1) {
        state ^= BigInt(input.charCodeAt(index));
        state = BigInt.asUintN(64, state * 1099511628211n);
      }
      return state.toString(16).padStart(16, "0");
    };
    return `fnv1a64:${hash(14695981039346656037n)}${hash(7809847782465536322n)}`;
  }

  function mergeDiagnostics(...groups) {
    const seen = new Set();
    return groups.flat().filter(item => {
      const key = `${item.code}|${item.severity}|${item.subjectRef}`;
      if (seen.has(key)) return false;
      seen.add(key); return true;
    });
  }

  function taskIds(task) {
    const model = obj(task.semanticActionModel);
    return {
      eventIds: unique(task.sourceEventIds || model.sourceEventIds),
      normalizedEventIds: unique(task.normalizedEventIds || model.normalizedEventIds),
      stepGroupIds: unique(task.stepGroupIds || model.stepGroupIds || list(task.stepGroups).map(group => group.stepGroupId)),
      semanticActionIds: unique(model.actionId ? [model.actionId] : task.semanticActionIds),
      preferredEventId: text(model.preferredSourceEventId || task.preferredSourceEventId)
    };
  }

  function stepKind(task) {
    const type = String(task.taskType || task.semanticAction || "").toLowerCase();
    const action = String(task.actionType || task.semanticActionModel?.actionType || "").toLowerCase();
    if (/dialog/.test(type) || /dialog/.test(action)) return "dialog";
    if (/navigate|navigation|openpage/.test(type) || /navigation/.test(action)) return "navigation";
    if (/select|lookup|choose|row/.test(type)) return "selection";
    if (/field|value|toggle|check|enter|edit/.test(type)) return "field-change";
    if (/information|note/.test(type)) return "information";
    if (/action|post|release|create|delete|run|confirm|unclassified/.test(type)) return "action";
    return "unknown";
  }

  function canonicalPageObject(task, sources) {
    const page = obj(task.pageIdentification || task.pageContext || task.semanticActionModel?.pageIdentification);
    const pageId = text(page.pageObjectId || page.pageId || page.id || task.pageObjectId || task.pageId ||
      sources.map(event => event.page?.pageObjectId || event.page?.id).find(Boolean));
    const caption = text(page.pageCaption || page.caption || page.name || task.pageCaption ||
      sources.map(event => event.page?.caption || event.page?.name).find(Boolean));
    const entity = text(page.entity || task.entity);
    if (!pageId && !entity) return null;
    return { appId: text(page.appId || page.applicationId || sources.map(event => event.raw?.appId).find(Boolean)),
      publisher: text(page.publisher || sources.map(event => event.raw?.publisher).find(Boolean)),
      objectType: text(page.objectType || (pageId ? "page" : null)),
      objectId: pageId && /^\d+$/.test(pageId) ? pageId : null,
      appVersion: text(page.appVersion || sources.map(event => event.raw?.appVersion).find(Boolean)) };
  }

  function pointerFor(event, keys) {
    const raw = obj(event?.raw);
    const key = keys.find(item => own(raw, item));
    return key ? { eventId: String(event.id), pointer: `/raw/${key}` } : null;
  }

  function knowledgeCandidates(task, sourceEventIds, releaseId, report, subject) {
    const model = obj(task.semanticActionModel);
    const ruleId = text(task.knowledgeRule || model.knowledgeRule);
    const packId = text(task.knowledgePackId || model.knowledgePackId);
    const packVersion = text(task.knowledgePackVersion || model.knowledgePackVersion);
    if (ruleId) {
      if (!releaseId) {
        report("process-knowledge-release-required", subject, "error");
        return [];
      }
      if (!packId || !packVersion) {
        report("process-incomplete-knowledge-provenance", subject, "error");
        return [];
      }
      const id = `rule:${packId}:${ruleId}`;
      return [{ candidateId: id, businessDomainId: null, businessProcessId: null,
        bcProcessId: null, processStepId: null, businessActionId: null,
        businessEntityId: null,
        provenance: { method: "rule", sourceEventIds, knowledgeEntryId: id,
          knowledgeReleaseId: releaseId, ruleVersion: packVersion },
        confidence: { score: Number.isFinite(task.confidence) ? task.confidence : null,
          method: "legacy-rule-score", calibrationVersion: null } }];
    }
    return [];
  }

  function interpretation(task, recording, eventIds, releaseId, subject, report) {
    const semantic = obj(recording.semanticInterpretation);
    const classes = list(semantic.classifications).filter(item =>
      list(item.sourceEventIds).some(id => eventIds.includes(String(id))));
    const candidates = classes.map(item => {
      const source = item.classificationSource === "AI" ? "ai" :
        ["metadata", "rule", "manual"].includes(item.classificationSource)
          ? item.classificationSource : "metadata";
      const metadata = obj(item.classificationMetadata || item.metadata);
      if (source === "manual" && (!metadata.changeId || !metadata.revisionId)) {
        report("process-manual-change-required", subject, "error");
        return null;
      }
      let knowledgeId = text(metadata.knowledgeReleaseId || releaseId);
      const entryId = text(metadata.knowledgeEntryId || metadata.ruleId || item.classificationId);
      const ruleVersion = text(metadata.ruleVersion || metadata.packVersion || item.modelVersion);
      if (source === "rule" && (!knowledgeId || !entryId || !ruleVersion)) {
        report("process-incomplete-knowledge-provenance", subject, "error");
        return null;
      }
      return { candidateId: String(item.classificationId),
        businessDomainId: text(item.businessDomain?.id), businessProcessId: text(item.businessProcess?.id),
        bcProcessId: text(item.bcProcess?.id), processStepId: text(item.processStep?.id),
        businessActionId: text(item.businessAction?.id), businessEntityId: text(item.businessEntity?.id),
        provenance: { method: source, sourceEventIds: unique(item.sourceEventIds).filter(id => eventIds.includes(id)),
          knowledgeEntryId: source === "manual" ? null : entryId,
          knowledgeReleaseId: source === "manual" ? null : knowledgeId,
          ruleVersion: source === "rule" ? ruleVersion : null },
        confidence: { score: item.confidence ?? null,
          method: source === "rule" ? "legacy-rule-score" : source,
          calibrationVersion: text(metadata.calibrationVersion) },
        ...(source === "manual" ? { manualChangeRef: { changeId: String(metadata.changeId),
          revisionId: String(metadata.revisionId) } } : {}) };
    }).filter(Boolean);
    const knowledge = knowledgeCandidates(task, eventIds, releaseId, report, subject);
    for (const value of knowledge) {
      if (!candidates.some(item => item.candidateId === value.candidateId)) candidates.push(value);
    }
    const distinct = [...new Map(candidates.map(item => [item.candidateId, item])).values()];
    const explicit = classes.find(item => item.classificationSource === "manual");
    const manualCandidate = explicit && distinct.find(item => item.candidateId === String(explicit.classificationId));
    if (manualCandidate) {
      return { status: "resolved", selectedCandidateId: manualCandidate.candidateId,
        candidates: distinct, manualChangeRef: manualCandidate.manualChangeRef };
    }
    if (distinct.length > 1) return { status: "ambiguous", selectedCandidateId: null, candidates: distinct };
    if (distinct.length === 1) return { status: "resolved", selectedCandidateId: distinct[0].candidateId, candidates: distinct };
    return { status: "unresolved", selectedCandidateId: null, candidates: [] };
  }

  function normalizeProcess(input = {}) {
    const failures = [];
    const report = (code, subjectRef = "/", severity = "error") => failures.push({ code, severity, subjectRef, details: {} });
    const recording = input.recording;
    const interpretationModel = input.interpretation;
    if (!recording || typeof recording !== "object" || Array.isArray(recording)) report("process-recording-required", "/recording");
    if (!interpretationModel || typeof interpretationModel !== "object" || Array.isArray(interpretationModel)) report("process-interpretation-required", "/interpretation");
    if (failures.length) return { ok: false, process: null, diagnostics: failures };
    if (!text(recording.id)) report("process-recording-id-required", "/recording/id");
    if (Number(recording.schemaVersion) !== 1) report("process-unsupported-recording-schema", "/recording/schemaVersion");
    if (Array.isArray(recording.events) && recording.events.some(event => !event?.id)) report("process-recording-event-id-required", "/recording/events");
    const events = list(recording.events);
    const byEventId = new Map(events.map(event => [String(event.id), event]));
    const normalizedEnvelope = input.normalizedRecording ||
      (!Array.isArray(input.normalizedEvents) ? input.normalizedEvents : null);
    const normalizedEvents = list(Array.isArray(input.normalizedEvents)
      ? input.normalizedEvents : normalizedEnvelope?.events);
    const groups = list(input.stepGroups?.groups || input.stepGroups);
    const tasks = list(interpretationModel.businessTasks || interpretationModel.tasks);
    if (!tasks.length) report("process-interpretation-has-no-tasks", "/interpretation/businessTasks", "warning");
    const releaseId = text(input.knowledgeReleaseId);
    const inputDigest = digest({ recording, interpretation: interpretationModel,
      normalizedEvents, stepGroups: groups, normalizerVersion: input.normalizerVersion || null,
      knowledgeReleaseId: releaseId });
    const recordingRevision = text(input.recordingRevisionId || recording.revisionId) ||
      `recording:${digest(recording)}`;
    const process = { schemaVersion: schemaApi.SCHEMA_VERSION,
      processId: `process:${String(recording.id)}`,
      revisionId: `revision:${inputDigest}`,
      recordingRef: { recordingId: String(recording.id), revisionId: recordingRevision },
      derivation: { normalizerVersion: text(input.normalizerVersion || normalizedEvents[0]?.normalizationVersion ||
        normalizedEnvelope?.normalizationVersion || NORMALIZER_VERSION),
        adapterVersion: ADAPTER_VERSION, knowledgeReleaseId: releaseId, inputDigest },
      context: { sourceLanguage: text(recording.metadata?.sourceLanguage || recording.metadata?.interfaceLanguage),
        bcVersion: text(recording.metadata?.businessCentral?.version || recording.metadata?.businessCentral?.bcVersion),
        installedApps: Array.isArray(recording.metadata?.businessCentral?.apps)
          ? recording.metadata.businessCentral.apps.map(app => ({ appId: String(app.appId || app.id || "unknown-app"),
            publisher: text(app.publisher), appVersion: text(app.appVersion || app.version) })) : null },
      steps: [], relations: [], diagnostics: [], extensions: {} };
    if (!recordingRevision || !inputDigest) report("process-recording-revision-required", "/recordingRef/revisionId");

    const stepByTask = new Map();
    const usedStepIds = new Set();
    for (const [index, task] of tasks.entries()) {
      const path = `/steps/${index}`;
      if (!task || typeof task !== "object" || Array.isArray(task)) { report("process-invalid-task", path); continue; }
      const refs = taskIds(task);
      const sourceEventIds = refs.eventIds.filter(id => byEventId.has(id));
      if (!refs.eventIds.length && refs.normalizedEventIds.length) {
        report("process-canonical-event-lineage-missing", `${path}/sourceRefs/eventIds`);
        continue;
      }
      if (sourceEventIds.length !== refs.eventIds.length) {
        report("process-canonical-event-lineage-missing", `${path}/sourceRefs/eventIds`);
        continue;
      }
      if (!sourceEventIds.length) { report("process-observation-without-source", `${path}/sourceRefs/eventIds`); continue; }
      const anchor = refs.preferredEventId && sourceEventIds.includes(refs.preferredEventId)
        ? refs.preferredEventId : sourceEventIds[0];
      let stepId = `step:${digest({ recordingId: String(recording.id), anchor }).slice(9)}`;
      if (usedStepIds.has(stepId)) stepId = `step:${digest({ recordingId: String(recording.id), anchor, sourceEventIds }).slice(9)}`;
      if (usedStepIds.has(stepId)) { report("process-step-identity-collision", path); continue; }
      usedStepIds.add(stepId);
      const sources = sourceEventIds.map(id => byEventId.get(id));
      const groupIds = refs.stepGroupIds;
      const groupForTask = groups.filter(group => groupIds.includes(String(group.stepGroupId)));
      const assetIds = unique([...groupForTask.flatMap(group => group.screenshotAssetIds || []),
        ...sources.map(event => event.screenshotAssetId).filter(Boolean)]).filter(id => recording.assets?.some(asset => String(asset.id) === id));
      const normalizedIds = refs.normalizedEventIds;
      const model = obj(task.semanticActionModel);
      const actionPath = normalizedEvents.filter(event => normalizedIds.includes(String(event.normalizedEventId)));
      const preferred = refs.preferredEventId && sources.find(event => String(event.id) === refs.preferredEventId);
      const selected = (preferred && (own(preferred.raw, "value") || own(preferred.raw, "checked"))
        ? preferred : [...sources].reverse().find(event => own(event.raw, "value") || own(event.raw, "checked"))) ||
        preferred || sources.at(-1);
      const checked = typeof task.checked === "boolean";
      const valueRef = selected && own(selected.raw, "value") ? { eventId: String(selected.id), pointer: "/raw/value" } :
        selected && checked && own(selected.raw, "checked") ? { eventId: String(selected.id), pointer: "/raw/checked" } : null;
      const previousValueRef = selected && own(selected.raw, "previousValue") ? { eventId: String(selected.id), pointer: "/raw/previousValue" } : null;
      const result = obj(task.resultVerification || model.resultVerification);
      const verifiedStatus = result.status === "verified" ? "observed-success" : result.status === "error" ? "observed-error" : "unknown";
      const outcomeIds = unique(result.sourceEventIds || result.outcomes?.flatMap(item => item.sourceEventIds || []) || []).filter(id => sourceEventIds.includes(id));
      const eventKinds = actionPath.map(event => event.kind);
      const operation = text(model.actionType || task.semanticAction || task.taskType);
      const candidatesBefore = failures.length;
      const resolved = interpretation(task, recording, sourceEventIds, releaseId, path, report);
      if (failures.slice(candidatesBefore).some(item => item.severity === "error")) continue;
      const { manualChangeRef, ...normalizedInterpretation } = resolved;
      const page = obj(task.pageIdentification || model.pageIdentification || model.pageContext);
      const control = obj(page.control || page.controlIdentity || sources.at(-1)?.identification?.controlIdentity || {});
      const field = obj(page.field || page.fieldIdentity || sources.at(-1)?.identification?.fieldIdentity || {});
      const step = { stepId, sequence: process.steps.length + 1, origin: "observed",
        kind: stepKind(task), sourceRefs: { eventIds: sourceEventIds, normalizedEventIds: normalizedIds,
          stepGroupIds: groupIds, semanticActionIds: refs.semanticActionIds, assetIds },
        target: { objectRef: canonicalPageObject(task, sources), controlRef: {
          controlId: text(control.controlId || control.id), automationId: text(control.automationId),
          fieldId: text(field.fieldId || control.fieldId) },
        capturedCaption: text(task.fieldCaption || task.actionCaption || task.pageCaption || sources.at(-1)?.page?.caption) },
        observation: { operation, valueRef, previousValueRef,
          result: { status: verifiedStatus, evidenceEventIds: outcomeIds, messageRef: null } },
        interpretation: normalizedInterpretation, extensions: {} };
      if (manualChangeRef) step.extensions["bc-process-studio"] = { manualChangeRef };
      process.steps.push(step);
      stepByTask.set(task, step);
      if (verifiedStatus !== "unknown" && !outcomeIds.length) {
        report("process-result-evidence-unmapped", `${path}/observation/result`, "warning");
        step.observation.result.status = "unknown";
      }
      if (eventKinds.length && !step.sourceRefs.normalizedEventIds.length) {
        report("process-normalized-lineage-unmapped", `${path}/sourceRefs/normalizedEventIds`, "warning");
      }
    }
    for (let index = 1; index < process.steps.length; index += 1) {
      const before = process.steps[index - 1], after = process.steps[index];
      process.relations.push({ relationId: `relation:${digest({ from: before.stepId, to: after.stepId }).slice(9)}`,
        fromStepId: before.stepId, toStepId: after.stepId, type: "sequence", basis: "observed",
        sourceEventIds: unique([...before.sourceRefs.eventIds, ...after.sourceRefs.eventIds]), conditionRef: null });
    }
    if (tasks.length && !process.steps.length) report("process-no-traceable-steps", "/steps");
    if (failures.some(item => item.severity === "error")) return { ok: false, process: null, diagnostics: failures };
    const validationOptions = { recording,
      recordingRevisionId: recordingRevision,
      normalizedEvents, stepGroups: groups,
      semanticActions: list(interpretationModel.semanticActions).length
        ? interpretationModel.semanticActions : tasks.map(task => obj(task.semanticActionModel)) };
    const validation = schemaApi.validateProcess(process, validationOptions);
    const diagnostics = mergeDiagnostics(failures, validation);
    if (diagnostics.some(item => item.severity === "error")) return { ok: false, process: null, diagnostics };
    return { ok: true, process: freeze(process), diagnostics };
  }
  const freeze = value => {
    if (value && typeof value === "object" && !Object.isFrozen(value)) {
      Object.values(value).forEach(freeze); Object.freeze(value);
    }
    return value;
  };
  return { ADAPTER_VERSION, NORMALIZER_VERSION, digest, normalizeProcess };
});
