(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9DocumentationHierarchy = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const SCHEMA_VERSION = "1.0.0";

  function clone(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  }

  function stableId(prefix, values) {
    let hash = 2166136261;
    for (const character of values.map(String).join("\u001f")) {
      hash ^= character.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return `${prefix}:${(hash >>> 0).toString(36)}`;
  }

  function unique(values) {
    return [...new Set((values || []).filter(Boolean).map(String))];
  }

  function normalizeSection(value) {
    return Object.freeze({ ...clone(value),
      sectionId: String(value.sectionId),
      schemaVersion: String(value.schemaVersion || SCHEMA_VERSION),
      recordingId: String(value.recordingId || ""),
      title: String(value.title || "Untitled section"),
      description: String(value.description || ""),
      position: Number.isFinite(value.position) ? value.position : 0,
      sourceStepIds: unique(value.sourceStepIds),
      subtaskIds: unique(value.subtaskIds),
      directStepIds: unique(value.directStepIds),
      visibility: value.visibility === "hidden" ? "hidden" : "visible",
      provenance: value.provenance || "manual",
      createdAt: value.createdAt || null,
      updatedAt: value.updatedAt || value.createdAt || null,
      metadata: clone(value.metadata || {}),
      futureFields: clone(value.futureFields || {}) });
  }

  function normalizeSubtask(value) {
    return Object.freeze({ ...clone(value),
      subtaskId: String(value.subtaskId),
      schemaVersion: String(value.schemaVersion || SCHEMA_VERSION),
      recordingId: String(value.recordingId || ""),
      sectionId: String(value.sectionId),
      title: String(value.title || "Untitled subtask"),
      description: String(value.description || ""),
      position: Number.isFinite(value.position) ? value.position : 0,
      sourceStepIds: unique(value.sourceStepIds),
      visibility: value.visibility === "hidden" ? "hidden" : "visible",
      provenance: value.provenance || "manual",
      createdAt: value.createdAt || null,
      updatedAt: value.updatedAt || value.createdAt || null,
      metadata: clone(value.metadata || {}),
      futureFields: clone(value.futureFields || {}) });
  }

  function empty(recordingId = "") {
    return { schemaVersion: SCHEMA_VERSION, recordingId,
      sections: [], subtasks: [], assignments: [], overrides: [],
      orphanedOverrides: [], updatedAt: null };
  }

  function normalize(value, recordingId = "") {
    const input = value && typeof value === "object" ? clone(value) : empty(recordingId);
    return { ...input, schemaVersion: input.schemaVersion || SCHEMA_VERSION,
      recordingId: String(input.recordingId || recordingId),
      sections: (input.sections || []).map(normalizeSection),
      subtasks: (input.subtasks || []).map(normalizeSubtask),
      assignments: (input.assignments || []).map(item => ({ ...clone(item),
        stepId: String(item.stepId), sectionId: String(item.sectionId),
        subtaskId: item.subtaskId ? String(item.subtaskId) : null,
        recordedOrder: Number.isFinite(item.recordedOrder) ? item.recordedOrder : null,
        presentationOrder: Number.isFinite(item.presentationOrder)
          ? item.presentationOrder : 0 })),
      overrides: (input.overrides || []).map(clone),
      orphanedOverrides: (input.orphanedOverrides || []).map(clone) };
  }

  function override(type, targetId, options = {}) {
    const now = options.now || new Date().toISOString();
    return { hierarchyOverrideId: options.hierarchyOverrideId || stableId(
      "hierarchy-override", [options.recordingId || "", type, targetId,
        now, options.sequence || 0]), schemaVersion: SCHEMA_VERSION,
      recordingId: options.recordingId || "", type, targetId,
      sourceStepIds: unique(options.sourceStepIds),
      destinationSectionId: options.destinationSectionId || null,
      destinationSubtaskId: options.destinationSubtaskId || null,
      position: options.position ?? null, createdAt: now, updatedAt: now,
      metadata: clone(options.metadata || {}),
      futureFields: clone(options.futureFields || {}) };
  }

  function createSection(stateValue, title, stepIds = [], options = {}) {
    const state = normalize(stateValue, options.recordingId);
    const now = options.now || new Date().toISOString();
    const sectionId = options.sectionId || stableId("section", [
      state.recordingId, now, title, options.nonce || state.sections.length
    ]);
    const section = normalizeSection({ sectionId, recordingId: state.recordingId,
      title, position: state.sections.length, sourceStepIds: stepIds,
      directStepIds: stepIds, provenance: options.provenance || "manual",
      createdAt: now, futureFields: options.futureFields });
    const selected = new Set(stepIds.map(String));
    state.assignments = state.assignments.filter(item => !selected.has(item.stepId));
    state.assignments.push(...stepIds.map((stepId, index) => ({
      stepId: String(stepId), sectionId, subtaskId: null,
      recordedOrder: options.recordedOrders?.[stepId] ?? null,
      presentationOrder: index })));
    state.sections.push(section);
    state.overrides.push(override("create-section", sectionId, { ...options,
      recordingId: state.recordingId, sourceStepIds: stepIds,
      sequence: state.overrides.length }));
    state.updatedAt = now;
    return { state, section };
  }

  function createSubtask(stateValue, sectionId, title, stepIds = [], options = {}) {
    const state = normalize(stateValue, options.recordingId);
    if (!state.sections.some(section => section.sectionId === sectionId)) {
      return { ok: false, reason: "missing-section", state };
    }
    const now = options.now || new Date().toISOString();
    const subtaskId = options.subtaskId || stableId("subtask", [
      state.recordingId, sectionId, now, title, options.nonce || state.subtasks.length
    ]);
    const subtask = normalizeSubtask({ subtaskId, sectionId,
      recordingId: state.recordingId, title,
      position: state.subtasks.filter(item => item.sectionId === sectionId).length,
      sourceStepIds: stepIds, provenance: options.provenance || "manual",
      createdAt: now, futureFields: options.futureFields });
    const selected = new Set(stepIds.map(String));
    state.assignments = state.assignments.filter(item => !selected.has(item.stepId));
    state.assignments.push(...stepIds.map((stepId, index) => ({
      stepId: String(stepId), sectionId, subtaskId,
      recordedOrder: options.recordedOrders?.[stepId] ?? null,
      presentationOrder: index })));
    state.subtasks.push(subtask);
    state.sections = state.sections.map(section => section.sectionId === sectionId
      ? normalizeSection({ ...section, subtaskIds: [...section.subtaskIds, subtaskId],
        directStepIds: section.directStepIds.filter(id => !selected.has(id)) })
      : section);
    state.overrides.push(override("create-subtask", subtaskId, { ...options,
      recordingId: state.recordingId, sourceStepIds: stepIds,
      destinationSectionId: sectionId, sequence: state.overrides.length }));
    state.updatedAt = now;
    return { ok: true, state, subtask };
  }

  function rename(stateValue, targetId, title, options = {}) {
    const state = normalize(stateValue);
    let found = false;
    state.sections = state.sections.map(item => item.sectionId === targetId
      ? (found = true, normalizeSection({ ...item, title,
        provenance: item.provenance === "generated" ? "user-adjusted" : item.provenance,
        updatedAt: options.now || new Date().toISOString() })) : item);
    state.subtasks = state.subtasks.map(item => item.subtaskId === targetId
      ? (found = true, normalizeSubtask({ ...item, title,
        provenance: item.provenance === "generated" ? "user-adjusted" : item.provenance,
        updatedAt: options.now || new Date().toISOString() })) : item);
    if (!found) return { ok: false, reason: "missing-target", state };
    state.overrides.push(override("rename", targetId, { ...options,
      recordingId: state.recordingId, metadata: { title },
      sequence: state.overrides.length }));
    return { ok: true, state };
  }

  function assign(stateValue, stepIds, sectionId, subtaskId, options = {}) {
    const state = normalize(stateValue);
    if (!state.sections.some(item => item.sectionId === sectionId)) {
      return { ok: false, reason: "missing-section", state };
    }
    if (subtaskId && !state.subtasks.some(item =>
      item.subtaskId === subtaskId && item.sectionId === sectionId)) {
      return { ok: false, reason: "missing-subtask", state };
    }
    const selected = new Set(stepIds.map(String));
    state.assignments = state.assignments.filter(item => !selected.has(item.stepId));
    state.assignments.push(...stepIds.map((stepId, index) => ({
      stepId: String(stepId), sectionId, subtaskId: subtaskId || null,
      recordedOrder: options.recordedOrders?.[stepId] ?? null,
      presentationOrder: options.position === undefined ? index : options.position + index
    })));
    state.overrides.push(override("move", sectionId, { ...options,
      recordingId: state.recordingId, sourceStepIds: stepIds,
      destinationSectionId: sectionId, destinationSubtaskId: subtaskId,
      sequence: state.overrides.length }));
    return { ok: true, state };
  }

  function reorder(stateValue, kind, orderedIds, options = {}) {
    const state = normalize(stateValue);
    const positions = new Map(orderedIds.map((id, index) => [String(id), index]));
    if (kind === "section") state.sections = state.sections.map(item =>
      positions.has(item.sectionId) ? normalizeSection({ ...item,
        position: positions.get(item.sectionId) }) : item);
    else if (kind === "subtask") state.subtasks = state.subtasks.map(item =>
      positions.has(item.subtaskId) ? normalizeSubtask({ ...item,
        position: positions.get(item.subtaskId) }) : item);
    else state.assignments = state.assignments.map(item =>
      positions.has(item.stepId) ? { ...item,
        presentationOrder: positions.get(item.stepId) } : item);
    state.overrides.push(override("reorder", kind, { ...options,
      recordingId: state.recordingId, metadata: { orderedIds },
      sequence: state.overrides.length }));
    return state;
  }

  function resolve(stepsValue, stateValue) {
    const steps = clone(stepsValue || []);
    const state = normalize(stateValue);
    const byId = new Map(steps.map((step, index) => [
      String(step.stepId || step.taskId), { step, recordedOrder: index }
    ]));
    const diagnostics = [];
    const seen = new Set();
    const assignments = state.assignments.flatMap(item => {
      if (!byId.has(item.stepId)) {
        diagnostics.push({ code: "orphaned-hierarchy-step",
          stepId: item.stepId, sectionId: item.sectionId });
        return [];
      }
      if (seen.has(item.stepId)) {
        diagnostics.push({ code: "duplicate-hierarchy-step", stepId: item.stepId });
        return [];
      }
      seen.add(item.stepId);
      return [{ ...item, recordedOrder: byId.get(item.stepId).recordedOrder }];
    });
    const unassigned = steps.filter(step => !seen.has(String(step.stepId || step.taskId)));
    const sections = state.sections.slice().sort((a, b) => a.position - b.position)
      .flatMap(section => {
        const sectionAssignments = assignments.filter(item =>
          item.sectionId === section.sectionId
        );
        const subtasks = state.subtasks.filter(item =>
          item.sectionId === section.sectionId && item.visibility !== "hidden"
        ).sort((a, b) => a.position - b.position).flatMap(subtask => {
          const subAssignments = sectionAssignments.filter(item =>
            item.subtaskId === subtask.subtaskId
          ).sort((a, b) => a.presentationOrder - b.presentationOrder);
          return subAssignments.length ? [{ ...clone(subtask), steps:
            subAssignments.map(item => byId.get(item.stepId).step),
            sourceEventIds: unique(subAssignments.flatMap(item =>
              byId.get(item.stepId).step.sourceEventIds ||
              byId.get(item.stepId).step.sourceEventNos || [])) }] : [];
        });
        const direct = sectionAssignments.filter(item => !item.subtaskId)
          .sort((a, b) => a.presentationOrder - b.presentationOrder)
          .map(item => byId.get(item.stepId).step);
        const count = direct.length + subtasks.reduce((sum, item) =>
          sum + item.steps.length, 0);
        return section.visibility !== "hidden" && count ? [{ ...clone(section),
          directSteps: direct, subtasks,
          sourceEventIds: unique([...direct,
            ...subtasks.flatMap(item => item.steps)].flatMap(step =>
            step.sourceEventIds || step.sourceEventNos || [])) }] : [];
      });
    const recordedOrder = steps.map(step => String(step.stepId || step.taskId));
    const presentationOrder = sections.flatMap(section => {
      const sectionSteps = [
        ...section.directSteps,
        ...section.subtasks.flatMap(item => item.steps)
      ];
      return sectionSteps.map(step => String(step.stepId || step.taskId));
    });
    return Object.freeze({ sections, unassignedSteps: unassigned,
      assignments, diagnostics, recordedOrder, presentationOrder });
  }

  return { SCHEMA_VERSION, assign, createSection, createSubtask, empty,
    normalize, normalizeSection, normalizeSubtask, override, rename, reorder,
    resolve, stableId };
});
