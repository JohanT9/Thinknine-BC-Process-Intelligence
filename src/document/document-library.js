(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9DocumentLibrary = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const LIBRARY_SCHEMA_VERSION = "1.0.0";
  const SORTS = Object.freeze([
    "modified", "created", "alphabetical", "recent", "profile", "health"
  ]);
  const FORBIDDEN_PROJECT_FIELDS = Object.freeze([
    "review", "reviewState", "semanticDocument", "documentPlan", "plannerState",
    "wordDocument", "wordStructures", "rendererState", "screenshots",
    "processVersions", "processSnapshots", "processDiffCache",
    "generatedState", "derivedRevisions", "regenerationResult"
  ]);

  function clone(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  }

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
    return value;
  }

  function text(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  function list(value) {
    return Array.isArray(value) ? value.map(text).filter(Boolean) : [];
  }

  function timestamp(value) {
    const parsed = Date.parse(value || "");
    return Number.isFinite(parsed) ? new Date(parsed).toISOString() : "";
  }

  function normalize(value = {}) {
    const source = clone(value && typeof value === "object" ? value : {});
    FORBIDDEN_PROJECT_FIELDS.forEach(field => delete source[field]);
    const projectId = text(source.projectId || source.sessionId);
    return deepFreeze({
      ...source,
      librarySchemaVersion: text(source.librarySchemaVersion) ||
        LIBRARY_SCHEMA_VERSION,
      projectId,
      sessionId: text(source.sessionId) || projectId,
      title: text(source.title) || "Namnlöst dokument",
      profile: {
        profileId: text(source.profile?.profileId) || "business-process",
        displayName: text(source.profile?.displayName) || "Business Process"
      },
      theme: {
        themeId: text(source.theme?.themeId) || "thinknine",
        displayName: text(source.theme?.displayName) || "Thinknine"
      },
      createdAt: timestamp(source.createdAt),
      modifiedAt: timestamp(source.modifiedAt || source.createdAt),
      lastOpenedAt: timestamp(source.lastOpenedAt),
      author: text(source.author),
      summary: text(source.summary),
      workflowName: text(source.workflowName),
      sectionNames: list(source.sectionNames),
      tags: [...new Set(list(source.tags))],
      favourite: Boolean(source.favourite),
      readingMinutes: Math.max(0, Number(source.readingMinutes) || 0),
      thumbnailRef: text(source.thumbnailRef),
      health: {
        overall: text(source.health?.overall) || "Not assessed",
        suggestionLabel: text(source.health?.suggestionLabel),
        confirmations: list(source.health?.confirmations)
      },
      processVersion: {
        currentVersion: text(source.processVersion?.currentVersion),
        currentVersionId: text(source.processVersion?.currentVersionId),
        versionCount: Math.max(0, Number(source.processVersion?.versionCount) || 0),
        baselineVersion: text(source.processVersion?.baselineVersion),
        baselineVersionId: text(source.processVersion?.baselineVersionId),
        approvedVersion: text(source.processVersion?.approvedVersion),
        lastProcessChangeAt: timestamp(source.processVersion?.lastProcessChangeAt)
      },
      regeneration: {
        derivedRevisionId: text(source.regeneration?.derivedRevisionId),
        derivedRevisionDate: timestamp(source.regeneration?.derivedRevisionDate),
        regenerationVersion: text(source.regeneration?.regenerationVersion),
        pipelineVersion: text(source.regeneration?.pipelineVersion),
        processChanged: Boolean(source.regeneration?.processChanged),
        unresolvedOverrideCount: Math.max(0,
          Number(source.regeneration?.unresolvedOverrideCount) || 0)
      },
      recentActivity: list(source.recentActivity).slice(0, 5),
      metadata: source.metadata && typeof source.metadata === "object" &&
        !Array.isArray(source.metadata) ? source.metadata : {}
    });
  }

  function merge(previous, next) {
    const left = normalize(previous);
    const right = clone(next && typeof next === "object" ? next : {});
    return normalize({
      ...left,
      ...right,
      profile: { ...left.profile, ...(right.profile || {}) },
      theme: { ...left.theme, ...(right.theme || {}) },
      health: { ...left.health, ...(right.health || {}) },
      processVersion: { ...left.processVersion, ...(right.processVersion || {}) },
      regeneration: { ...left.regeneration, ...(right.regeneration || {}) },
      metadata: { ...left.metadata, ...(right.metadata || {}) }
    });
  }

  function searchable(record) {
    return [record.title, record.profile.displayName, record.profile.profileId,
      record.theme.displayName, record.author, record.summary,
      record.workflowName, ...record.tags, ...record.sectionNames,
      ...Object.values(record.metadata).filter(value =>
        ["string", "number", "boolean"].includes(typeof value))]
      .join(" ").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("sv-SE");
  }

  function create(records = []) {
    const byId = new Map();
    for (const value of records) {
      const record = normalize(value);
      if (record.projectId) byId.set(record.projectId,
        byId.has(record.projectId) ? merge(byId.get(record.projectId), record) : record);
    }
    return deepFreeze([...byId.values()].map(record => ({
      record,
      searchText: searchable(record)
    })));
  }

  function includesDate(value, range = {}) {
    if (!range.from && !range.to) return true;
    const time = Date.parse(value || "");
    if (!Number.isFinite(time)) return false;
    const from = range.from ? Date.parse(range.from) : -Infinity;
    const to = range.to ? Date.parse(`${range.to}T23:59:59.999`) : Infinity;
    return time >= from && time <= to;
  }

  function compare(sort) {
    const textCompare = (left, right) => left.localeCompare(right, "sv-SE", {
      sensitivity: "base", numeric: true
    });
    const descendingDate = field => (left, right) =>
      (Date.parse(right[field]) || 0) - (Date.parse(left[field]) || 0) ||
      textCompare(left.title, right.title);
    if (sort === "created") return descendingDate("createdAt");
    if (sort === "recent") return descendingDate("lastOpenedAt");
    if (sort === "alphabetical") return (a, b) => textCompare(a.title, b.title);
    if (sort === "profile") return (a, b) =>
      textCompare(a.profile.displayName, b.profile.displayName) ||
      textCompare(a.title, b.title);
    if (sort === "health") return (a, b) =>
      textCompare(a.health.overall, b.health.overall) ||
      textCompare(a.title, b.title);
    return descendingDate("modifiedAt");
  }

  function query(index, options = {}) {
    const search = text(options.search).normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("sv-SE");
    const filters = options.filters || {};
    const now = Number.isFinite(options.now) ? options.now : Date.now();
    const recentAfter = Number.isFinite(options.recentDays)
      ? now - options.recentDays * 86400000
      : now - 30 * 86400000;
    const values = index.filter(item => {
      const record = item.record;
      return (!search || item.searchText.includes(search)) &&
        (!filters.profile || record.profile.profileId === filters.profile) &&
        (!filters.theme || record.theme.themeId === filters.theme) &&
        (!filters.health || record.health.overall === filters.health) &&
        (!filters.favourite || record.favourite) &&
        (!filters.recent || (Date.parse(record.lastOpenedAt) || 0) >= recentAfter) &&
        includesDate(record.createdAt, filters.created) &&
        includesDate(record.modifiedAt, filters.modified);
    }).map(item => item.record).sort(compare(
      SORTS.includes(options.sort) ? options.sort : "modified"
    ));
    return deepFreeze(values);
  }

  function groupByProfile(records) {
    const groups = new Map();
    records.forEach(record => {
      const key = record.profile.profileId;
      if (!groups.has(key)) groups.set(key, {
        profileId: key,
        displayName: record.profile.displayName,
        documents: []
      });
      groups.get(key).documents.push(record);
    });
    return deepFreeze([...groups.values()].sort((a, b) =>
      a.displayName.localeCompare(b.displayName, "sv-SE", { sensitivity: "base" })
    ).map(group => ({ ...group, documents: [...group.documents] })));
  }

  function update(records, projectId, patch) {
    let found = false;
    const next = records.map(record => {
      if (record.projectId !== projectId) return normalize(record);
      found = true;
      return merge(record, patch);
    });
    if (!found) next.push(normalize({ projectId, ...patch }));
    return deepFreeze(next);
  }

  function selection(state = {}, records = [], key) {
    const ids = records.map(record => record.projectId);
    if (!ids.length) return deepFreeze({ selectedId: null, focusedId: null });
    const current = ids.indexOf(state.focusedId || state.selectedId);
    if (current < 0) {
      const initial = key === "End" ? ids[ids.length - 1] : ids[0];
      return deepFreeze({ selectedId: initial, focusedId: initial });
    }
    const index = current;
    const next = key === "Home" ? 0 : key === "End" ? ids.length - 1 :
      key === "ArrowDown" || key === "ArrowRight" ? Math.min(ids.length - 1, index + 1) :
        key === "ArrowUp" || key === "ArrowLeft" ? Math.max(0, index - 1) : index;
    return deepFreeze({ selectedId: ids[next], focusedId: ids[next] });
  }

  return { FORBIDDEN_PROJECT_FIELDS, LIBRARY_SCHEMA_VERSION, SORTS,
    create, groupByProfile, merge,
    normalize, query, selection, update };
});
