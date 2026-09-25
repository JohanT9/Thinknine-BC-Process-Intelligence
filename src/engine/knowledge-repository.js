(function (root, factory) {
  const adapter = typeof module === "object" && module.exports
    ? require("./canonical-process-adapter") : root.BCProcessAdapter;
  const knowledge = typeof module === "object" && module.exports
    ? require("./knowledge-domain") : root.T9KnowledgeDomain;
  const pageEngine = typeof module === "object" && module.exports
    ? require("./page-identification-engine") : root.T9PageIdentificationEngine;
  const api = factory(adapter, knowledge, pageEngine);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.BCKnowledgeRepository = api;
})(typeof globalThis !== "undefined" ? globalThis : this,
function (adapter, knowledge, pageEngine) {
  "use strict";
  const SCHEMA_VERSION = 1;
  const FRAMEWORK_VERSION = "1.0.0";
  const APPEND_ONLY = true;
  const object = value => value && typeof value === "object" && !Array.isArray(value);
  const array = value => Array.isArray(value) ? value : [];
  const str = value => typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
  const unique = items => [...new Set(items)];
  const freeze = value => {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.values(value).forEach(freeze); return Object.freeze(value);
  };
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const semver = value => typeof value === "string" && /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(value);
  const compareSemver = (left, right) => {
    const a = String(left).split(/[.+-]/).slice(0, 3).map(Number);
    const b = String(right).split(/[.+-]/).slice(0, 3).map(Number);
    for (let index = 0; index < 3; index += 1) if ((a[index] || 0) !== (b[index] || 0)) return (a[index] || 0) - (b[index] || 0);
    return 0;
  };
  const diagnostic = (code, subjectRef, severity = "error", details = {}) => ({
    code, severity, subjectRef, details });

  function validateManifest(manifest) {
    const diagnostics = [];
    const add = (code, ref, details) => diagnostics.push(diagnostic(code, ref, "error", details));
    if (!object(manifest)) return [diagnostic("knowledge-invalid-manifest", "/")];
    if (!semver(manifest.frameworkVersion)) add("knowledge-invalid-framework-version", "/frameworkVersion");
    if (!Array.isArray(manifest.packs) || !manifest.packs.length) add("knowledge-packs-required", "/packs");
    const seen = new Set();
    array(manifest.packs).forEach((descriptor, index) => {
      const ref = `/packs/${index}`;
      if (!object(descriptor)) { add("knowledge-invalid-descriptor", ref); return; }
      if (!/^[a-z0-9][a-z0-9._-]*$/.test(str(descriptor.packId))) add("knowledge-invalid-pack-id", `${ref}/packId`);
      if (seen.has(descriptor.packId)) add("knowledge-duplicate-pack-id", `${ref}/packId`);
      seen.add(descriptor.packId);
      if (typeof descriptor.enabled !== "boolean") add("knowledge-enabled-required", `${ref}/enabled`);
      if (descriptor.optional === true) add("knowledge-optional-pack-not-supported", `${ref}/optional`);
      if (!/^knowledge-packs\/[a-z0-9][a-z0-9._-]*\.json$/.test(str(descriptor.file)) ||
          descriptor.file.includes("..")) add("knowledge-invalid-pack-path", `${ref}/file`);
    });
    return diagnostics;
  }

  function validatePack(pack, descriptor, previousRuleIds = new Set()) {
    const diagnostics = [];
    const add = (code, ref, details = {}) => diagnostics.push(diagnostic(code, ref, "error", details));
    if (!object(pack)) return [diagnostic("knowledge-invalid-pack", `/packs/${descriptor?.packId || "?"}`)];
    const base = `/packs/${str(descriptor?.packId) || "?"}`;
    if (pack.packId !== descriptor.packId) add("knowledge-pack-id-mismatch", `${base}/packId`);
    if (!str(pack.name)) add("knowledge-pack-name-required", `${base}/name`);
    if (!semver(pack.version)) add("knowledge-invalid-pack-version", `${base}/version`);
    if (!Number.isFinite(pack.priority)) add("knowledge-invalid-pack-priority", `${base}/priority`);
    if (!Array.isArray(pack.rules)) add("knowledge-rules-required", `${base}/rules`);
    if (pack.sources !== undefined && !Array.isArray(pack.sources)) add("knowledge-sources-invalid", `${base}/sources`);
    const sourceIds = new Set();
    array(pack.sources).forEach((source, index) => {
      const ref = `${base}/sources/${index}`;
      if (!object(source) || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/.test(str(source.sourceId)) ||
          !str(source.title) || !/^https:\/\//.test(str(source.sourceUri))) {
        add("knowledge-source-reference-invalid", ref); return;
      }
      if (sourceIds.has(source.sourceId)) add("knowledge-duplicate-source-id", `${ref}/sourceId`);
      sourceIds.add(source.sourceId);
    });
    if (pack.pageDefinitions !== undefined && !Array.isArray(pack.pageDefinitions)) add("knowledge-page-definitions-invalid", `${base}/pageDefinitions`);
    const ruleIds = new Set();
    array(pack.rules).forEach((rule, index) => {
      const ref = `${base}/rules/${index}`;
      if (!object(rule)) { add("knowledge-invalid-rule", ref); return; }
      if (!/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(str(rule.ruleId))) add("knowledge-invalid-rule-id", `${ref}/ruleId`);
      if (ruleIds.has(rule.ruleId) || previousRuleIds.has(rule.ruleId)) add("knowledge-duplicate-rule-id", `${ref}/ruleId`);
      ruleIds.add(rule.ruleId); previousRuleIds.add(rule.ruleId);
      for (const field of ["taskType", "semanticAction", "entity"]) {
        if (typeof rule[field] !== "string") add("knowledge-invalid-rule-output", `${ref}/${field}`);
      }
      if (!Number.isFinite(rule.priority)) add("knowledge-invalid-rule-priority", `${ref}/priority`);
      if (!Number.isFinite(rule.confidence) || rule.confidence < 0 || rule.confidence > 1) add("knowledge-invalid-rule-confidence", `${ref}/confidence`);
      if (!object(rule.match)) { add("knowledge-rule-match-required", `${ref}/match`); return; }
      for (const field of ["pagePatterns", "actionPatterns", "fieldPatterns", "automationIdPatterns"]) {
        if (!Array.isArray(rule.match[field])) { add("knowledge-pattern-list-required", `${ref}/match/${field}`); continue; }
        rule.match[field].forEach((pattern, patternIndex) => {
          if (typeof pattern !== "string" || !pattern) { add("knowledge-pattern-invalid", `${ref}/match/${field}/${patternIndex}`); return; }
          try { new RegExp(pattern, "i"); } catch {
            add("knowledge-pattern-invalid", `${ref}/match/${field}/${patternIndex}`);
          }
        });
      }
      if (rule.languages !== undefined && (!Array.isArray(rule.languages) || rule.languages.some(locale =>
        typeof locale !== "string" || !/^[a-z]{2,3}-[A-Z]{2}$/.test(locale)))) {
        add("knowledge-invalid-language-list", `${ref}/languages`);
      }
      if (rule.aliases !== undefined && (!Array.isArray(rule.aliases) || rule.aliases.some(alias => typeof alias !== "string"))) {
        add("knowledge-invalid-alias-list", `${ref}/aliases`);
      }
      if (rule.sourceIds !== undefined && (!Array.isArray(rule.sourceIds) || rule.sourceIds.some(id => !sourceIds.has(id)))) {
        add("knowledge-rule-source-reference-invalid", `${ref}/sourceIds`);
      }
    });
    const pageIds = new Set();
    array(pack.pageDefinitions).forEach((page, index) => {
      const ref = `${base}/pageDefinitions/${index}`;
      if (!object(page)) { add("knowledge-invalid-page-definition", ref); return; }
      if (!str(page.ruleId)) add("knowledge-page-rule-id-required", `${ref}/ruleId`);
      if (page.sourceIds !== undefined && (!Array.isArray(page.sourceIds) || page.sourceIds.some(id => !sourceIds.has(id)))) {
        add("knowledge-page-source-reference-invalid", `${ref}/sourceIds`);
      }
      if (pageIds.has(page.pageObjectId)) add("knowledge-duplicate-page-object", `${ref}/pageObjectId`);
      if (page.pageObjectId != null && !/^[1-9]\d*$/.test(String(page.pageObjectId))) add("knowledge-invalid-page-object-id", `${ref}/pageObjectId`);
      if (page.pageObjectId != null) pageIds.add(page.pageObjectId);
      if (page.captionRules !== undefined && !Array.isArray(page.captionRules)) add("knowledge-invalid-caption-rules", `${ref}/captionRules`);
      array(page.captionRules).forEach((caption, captionIndex) => {
        if (!object(caption) || typeof caption.locale !== "string" || typeof caption.pattern !== "string") {
          add("knowledge-invalid-caption-rule", `${ref}/captionRules/${captionIndex}`); return;
        }
        try { new RegExp(caption.pattern, "i"); } catch {
          add("knowledge-invalid-caption-pattern", `${ref}/captionRules/${captionIndex}/pattern`);
        }
      });
      if (page.localizedCaptions !== undefined && !object(page.localizedCaptions)) add("knowledge-invalid-localized-captions", `${ref}/localizedCaptions`);
      if (page.applicationRef !== undefined) {
        const app = page.applicationRef;
        if (!object(app) || !/^[a-z0-9][a-z0-9._-]*$/.test(str(app.appId)) ||
            !str(app.publisher) || !semver(app.appVersion) ||
            !["verified", "declared"].includes(app.verification)) {
          add("knowledge-invalid-application-reference", `${ref}/applicationRef`);
        }
      }
      if (page.objectVerification !== undefined && !["verified", "declared"].includes(page.objectVerification)) {
        add("knowledge-invalid-object-verification", `${ref}/objectVerification`);
      }
      if (page.compatibility !== undefined) {
        const compatibility = page.compatibility;
        const validVersionRange = range => object(range) &&
          (range.minAppVersion == null || semver(range.minAppVersion)) &&
          (range.maxAppVersion == null || semver(range.maxAppVersion)) &&
          !(range.minAppVersion && range.maxAppVersion &&
            compareSemver(range.minAppVersion, range.maxAppVersion) > 0);
        if (!object(compatibility) ||
            (compatibility.minAppVersion != null && !semver(compatibility.minAppVersion)) ||
            (compatibility.maxAppVersion != null && !semver(compatibility.maxAppVersion)) ||
            (compatibility.minAppVersion && compatibility.maxAppVersion &&
              compareSemver(compatibility.minAppVersion, compatibility.maxAppVersion) > 0) ||
            (compatibility.appVersionRanges !== undefined &&
              (!Array.isArray(compatibility.appVersionRanges) || !compatibility.appVersionRanges.length ||
                compatibility.appVersionRanges.some(range => !validVersionRange(range)))) ||
            (compatibility.appIds !== undefined && (!Array.isArray(compatibility.appIds) ||
              compatibility.appIds.some(value => !/^[a-z0-9][a-z0-9._-]*$/.test(str(value)))))) {
          add("knowledge-invalid-object-compatibility", `${ref}/compatibility`);
        }
      }
      if (object(page.localizedCaptions)) for (const [locale, values] of Object.entries(page.localizedCaptions)) {
        if (!/^[a-z]{2,3}-[A-Z]{2}$/.test(locale) || !Array.isArray(values) || values.some(value => typeof value !== "string")) {
          add("knowledge-invalid-localized-caption", `${ref}/localizedCaptions/${locale}`);
        }
      }
    });
    return diagnostics;
  }

  function packDigestInput(manifest, packs) {
    return { schemaVersion: SCHEMA_VERSION, frameworkVersion: manifest.frameworkVersion,
      manifest: clone(manifest), packs: packs.map(clone).sort((a, b) => a.packId.localeCompare(b.packId)) };
  }

  function importRelease(manifest, packInputs) {
    const diagnostics = [...validateManifest(manifest)];
    if (!Array.isArray(packInputs)) diagnostics.push(diagnostic("knowledge-pack-data-required", "/packs"));
    if (diagnostics.some(item => item.severity === "error")) return { ok: false, snapshot: null, diagnostics };
    const descriptors = manifest.packs.filter(item => item.enabled);
    const loaded = new Map();
    packInputs.forEach(item => {
      if (!object(item) || !object(item.pack)) {
        diagnostics.push(diagnostic("knowledge-invalid-pack-input", "/packs")); return;
      }
      const descriptor = descriptors.find(entry => entry.packId === item.packId);
      if (!descriptor) { diagnostics.push(diagnostic("knowledge-unexpected-pack", `/packs/${item.packId}`)); return; }
      if (loaded.has(item.packId)) { diagnostics.push(diagnostic("knowledge-duplicate-pack-input", `/packs/${item.packId}`)); return; }
      loaded.set(item.packId, { pack: item.pack, descriptor });
    });
    descriptors.forEach(descriptor => {
      if (!loaded.has(descriptor.packId)) diagnostics.push(diagnostic("knowledge-required-pack-missing", `/packs/${descriptor.packId}`));
    });
    if (diagnostics.some(item => item.severity === "error")) return { ok: false, snapshot: null, diagnostics };

    const ruleIds = new Set();
    const packs = [];
    for (const descriptor of descriptors) {
      const item = loaded.get(descriptor.packId);
      diagnostics.push(...validatePack(item.pack, descriptor, ruleIds));
      packs.push(clone(item.pack));
    }
    if (diagnostics.some(item => item.severity === "error")) return { ok: false, snapshot: null, diagnostics };
    if (pageEngine?.validateKnowledgePacks) {
      const result = pageEngine.validateKnowledgePacks(packs);
      diagnostics.push(...array(result.diagnostics).map(item => diagnostic(item.code || "knowledge-page-validation",
        `/packs/${item.packId || "unknown"}/${item.ruleId || "pageDefinitions"}`,
        item.code === "conflicting-page-definitions" ? "warning" : "error",
        { pageObjectId: item.pageObjectId || null })));
      if (diagnostics.some(item => item.severity === "error")) return { ok: false, snapshot: null, diagnostics };
    }

    const rules = packs.flatMap(pack => pack.rules.map(rule => ({ ...clone(rule),
      packId: pack.packId, packName: pack.name, packVersion: pack.version,
      packPriority: pack.priority })));
    const pages = packs.flatMap(pack => array(pack.pageDefinitions).map(page => ({ ...clone(page),
      packId: pack.packId, packName: pack.name, packVersion: pack.version })));
    const ruleConcepts = new Map();
    rules.forEach(rule => {
      for (const [kind, label] of [["task", rule.taskType], ["action", rule.semanticAction], ["entity", rule.entity]]) {
        if (label) {
          const id = `${kind}:${label}`;
          if (!ruleConcepts.has(id)) ruleConcepts.set(id, { conceptId: id, kind, label,
            provenance: [] });
          ruleConcepts.get(id).provenance.push({ packId: rule.packId, packVersion: rule.packVersion, ruleId: rule.ruleId });
        }
      }
    });
    const isBcPack = id => id.startsWith("bc-");
    const packSourceById = new Map(packs.map(pack => [pack.packId,
      new Map(array(pack.sources).map(source => [source.sourceId, clone(source)]))]));
    const applications = [...new Map(packs.flatMap(pack => array(pack.pageDefinitions)
      .filter(page => object(page.applicationRef)).map(page => page.applicationRef))
      .map(app => [app.appId, { appId: app.appId, publisher: app.publisher,
        product: app.product || null, version: app.appVersion,
        verification: app.verification }])).values()];
    const objects = pages.map(page => ({ objectKey: `${page.packId}:page:${page.pageObjectId || "caption-only:" + page.ruleId}`,
      appId: page.applicationRef?.appId || (isBcPack(page.packId) ? "microsoft.dynamics.365.business-central" : null),
      publisher: page.applicationRef?.publisher || null, objectType: "page", objectId: page.pageObjectId ? String(page.pageObjectId) : null,
      technicalName: str(page.entity) || null, version: page.applicationRef?.appVersion || null, packId: page.packId,
      sourceRuleId: page.ruleId, verification: page.objectVerification || (page.pageObjectId ? "declared" : "caption-only"),
      displayName: Object.values(page.localizedCaptions || {}).flat().find(Boolean) || null,
      pageType: str(page.pageType) || null,
      sourceTable: str(page.sourceTable) || null,
      description: str(page.description) || null,
      sourceRefs: array(page.sourceIds).map(sourceId => packSourceById.get(page.packId)?.get(sourceId)).filter(Boolean),
      compatibility: clone(page.compatibility || null) }));
    const aliases = [];
    pages.forEach(page => {
      for (const [locale, labels] of Object.entries(page.localizedCaptions || {})) {
        labels.forEach(label => aliases.push({ locale, label, objectKey: `${page.packId}:page:${page.pageObjectId || "caption-only:" + page.ruleId}`,
          packId: page.packId, sourceRuleId: page.ruleId }));
      }
      array(page.aliases).forEach(label => typeof label === "string" && aliases.push({
        locale: null, label, objectKey: `${page.packId}:page:${page.pageObjectId || "caption-only:" + page.ruleId}`,
        packId: page.packId, sourceRuleId: page.ruleId }));
    });
    rules.forEach(rule => array(rule.aliases).forEach(label => aliases.push({ locale: null,
      label, ruleId: rule.ruleId, packId: rule.packId, sourceRuleId: rule.ruleId })));
    const conflicts = new Map();
    rules.forEach(rule => {
      const signature = adapter.digest({ match: rule.match, priority: rule.priority + rule.packPriority });
      if (!conflicts.has(signature)) conflicts.set(signature, []);
      conflicts.get(signature).push(rule);
    });
    for (const matching of conflicts.values()) {
      const outputs = new Set(matching.map(rule => `${rule.taskType}\u001f${rule.semanticAction}\u001f${rule.entity}`));
      if (matching.length > 1 && outputs.size > 1) diagnostics.push(diagnostic(
        "knowledge-equal-match-conflict", `/rules/${matching.map(rule => `${rule.packId}:${rule.ruleId}`).join(",")}`,
        "warning", { ruleIds: matching.map(rule => `${rule.packId}:${rule.ruleId}`) }));
    }
    const digestInput = packDigestInput(manifest, packs);
    const contentDigest = adapter.digest(digestInput);
    const snapshot = freeze({ schemaVersion: SCHEMA_VERSION, frameworkVersion: FRAMEWORK_VERSION,
      release: { releaseId: `local:${contentDigest}`, manifestVersion: manifest.frameworkVersion,
        contentDigest, status: "validated" }, manifest: clone(manifest), packs,
      applications, objects, controls: [], concepts: [...ruleConcepts.values()], aliases,
      bindings: rules.map(rule => ({ bindingId: `${rule.packId}:${rule.ruleId}`,
        packId: rule.packId, ruleId: rule.ruleId, taskType: rule.taskType,
        semanticAction: rule.semanticAction, entity: rule.entity })),
      rules, sources: packs.flatMap(pack => [{ packId: pack.packId,
        sourceType: "bundled-knowledge-pack", sourceId: `${pack.packId}@${pack.version}`,
        reviewStatus: "imported-unverified" }, ...array(pack.sources).map(source => ({
        packId: pack.packId, ...clone(source) }))]) });
    return { ok: true, snapshot, diagnostics };
  }

  function validateRelease(snapshot) {
    if (!object(snapshot) || snapshot.schemaVersion !== SCHEMA_VERSION || !object(snapshot.release) ||
        !object(snapshot.manifest) || !Array.isArray(snapshot.packs)) return [diagnostic("knowledge-invalid-release", "/")];
    const imported = importRelease(snapshot.manifest, snapshot.packs.map(pack => ({ packId: pack.packId, pack })));
    if (!imported.ok) return imported.diagnostics;
    if (imported.snapshot.release.releaseId !== snapshot.release.releaseId ||
        imported.snapshot.release.contentDigest !== snapshot.release.contentDigest) {
      return [diagnostic("knowledge-release-digest-mismatch", "/release/contentDigest")];
    }
    return imported.diagnostics;
  }

  async function load(options = {}) {
    const fetchJson = options.fetchJson || (async url => {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Knowledge source returned ${response.status}.`);
      return response.json();
    });
    let manifest;
    try { manifest = await fetchJson(options.indexUrl); }
    catch { return { ok: false, snapshot: null, diagnostics: [diagnostic("knowledge-manifest-load-failed", "/manifest")] }; }
    const manifestDiagnostics = validateManifest(manifest);
    if (manifestDiagnostics.some(item => item.severity === "error")) return { ok: false, snapshot: null, diagnostics: manifestDiagnostics };
    const packs = [];
    for (const descriptor of manifest.packs.filter(item => item.enabled)) {
      try {
        const url = options.resolveUrl ? options.resolveUrl(descriptor.file) : descriptor.file;
        const pack = await fetchJson(url);
        packs.push({ packId: descriptor.packId, pack });
      } catch {
        return { ok: false, snapshot: null, diagnostics: [diagnostic("knowledge-required-pack-load-failed", `/packs/${descriptor.packId}`)] };
      }
    }
    return importRelease(manifest, packs);
  }

  function createRepository(initialSnapshot = null) {
    const releases = new Map();
    let activeReleaseId = null;
    const activate = candidate => {
      const diagnostics = validateRelease(candidate);
      if (diagnostics.some(item => item.severity === "error")) return { ok: false, activeReleaseId, diagnostics };
      // Rebuild indexed records from the verified manifest and source packs;
      // never activate caller-supplied object/rule indexes alongside a valid digest.
      const rebuilt = importRelease(candidate.manifest,
        candidate.packs.map(pack => ({ packId: pack.packId, pack })));
      if (!rebuilt.ok) return { ok: false, activeReleaseId, diagnostics: rebuilt.diagnostics };
      const pinned = rebuilt.snapshot;
      releases.set(pinned.release.releaseId, pinned);
      activeReleaseId = pinned.release.releaseId;
      return { ok: true, activeReleaseId, diagnostics };
    };
    if (initialSnapshot) {
      const result = activate(initialSnapshot);
      if (!result.ok) throw new Error(`Invalid initial knowledge release: ${result.diagnostics.map(item => item.code).join(", ")}`);
    }
    const getRelease = releaseId => releases.get(String(releaseId || activeReleaseId)) || null;
    const resolve = (status, candidates) => {
      const distinct = [...new Map(candidates.map(candidate => [candidate.candidateId, candidate])).values()]
        .sort((a, b) => a.candidateId.localeCompare(b.candidateId));
      return { status: status || (distinct.length === 0 ? "unresolved" : distinct.length === 1 ? "resolved" : "ambiguous"),
        selectedCandidateId: distinct.length === 1 && status !== "ambiguous" ? distinct[0].candidateId : null,
        candidates: distinct };
    };
    const lookupObject = (objectRef = {}, releaseId) => {
      const release = getRelease(releaseId);
      if (!release) return resolve("unresolved", []);
      const id = str(objectRef.objectId || objectRef.pageObjectId || objectRef.id);
      const type = str(objectRef.objectType || "page");
      if (!id) return resolve("unresolved", []);
      let matches = release.objects.filter(item => item.objectType === type && item.objectId === id);
      if (str(objectRef.appId)) matches = matches.filter(item => item.appId === str(objectRef.appId));
      if (str(objectRef.appVersion)) matches = matches.filter(item => {
        const compatibility = item.compatibility;
        if (item.version === str(objectRef.appVersion)) return true;
        if (!compatibility) return false;
        const ranges = compatibility.appVersionRanges || [compatibility];
        const versionMatches = ranges.some(range =>
          (!range.minAppVersion || compareSemver(objectRef.appVersion, range.minAppVersion) >= 0) &&
          (!range.maxAppVersion || compareSemver(objectRef.appVersion, range.maxAppVersion) <= 0));
        if (!versionMatches) return false;
        return !compatibility.appIds?.length || compatibility.appIds.includes(str(objectRef.appId)) ||
          compatibility.appIds.includes(item.appId);
      });
      else if (str(objectRef.appId)) matches = matches.filter(item => !item.compatibility?.appIds?.length ||
        item.compatibility.appIds.includes(str(objectRef.appId)) || item.compatibility.appIds.includes(item.appId));
      if (!str(objectRef.appVersion) && matches.length > 1) {
        const semanticIdentities = new Set(matches.map(item => [item.appId, item.objectType,
          item.objectId, item.technicalName || "", item.pageType || ""].join("|")));
        if (semanticIdentities.size === 1 && matches.some(item => item.compatibility?.minAppVersion ||
            item.compatibility?.appVersionRanges?.length)) {
          const latestMinimum = item => Math.max(...(item.compatibility?.appVersionRanges ||
            [item.compatibility || {}]).map(range => {
              const version = range.minAppVersion || "0.0.0";
              const parts = version.split(".").map(Number);
              return (parts[0] || 0) * 1e12 + (parts[1] || 0) * 1e6 + (parts[2] || 0);
            }));
          const newest = Math.max(...matches.map(latestMinimum));
          matches = matches.filter(item => latestMinimum(item) === newest);
        }
      }
      if (matches.length > 1) {
        const equivalent = new Map();
        for (const item of matches) {
          const identity = [item.appId, item.objectType, item.objectId].join("|");
          const groups = equivalent.get(identity) || [];
          const groupIndex = groups.findIndex(existing => {
            const samePageType = (existing.item.pageType || "") === (item.pageType || "");
            const sameCaptionOrTechnicalName = (existing.item.displayName || "") ===
              (item.displayName || "") || (existing.item.technicalName && item.technicalName &&
                existing.item.technicalName === item.technicalName);
            const technicalNamesCompatible = !existing.item.technicalName || !item.technicalName ||
              existing.item.technicalName === item.technicalName;
            return samePageType && sameCaptionOrTechnicalName && technicalNamesCompatible && (!existing.item.sourceTable ||
              !item.sourceTable || existing.item.sourceTable === item.sourceTable);
          });
          if (groupIndex < 0) {
            groups.push({ item, sourceRefs: array(item.sourceRefs), packIds: [item.packId] });
            equivalent.set(identity, groups);
            continue;
          }
          const existing = groups[groupIndex];
          const existingPriority = release.packs.find(pack => pack.packId === existing.item.packId)?.priority || 0;
          const itemPriority = release.packs.find(pack => pack.packId === item.packId)?.priority || 0;
          const preferred = itemPriority > existingPriority ? item : existing.item;
          const sourceRefs = [...new Map([...existing.sourceRefs, ...array(item.sourceRefs)]
            .map(source => [`${source.sourceId}|${source.sourceUri}`, source])).values()];
          groups[groupIndex] = { item: preferred, sourceRefs, packIds: [...new Set([...existing.packIds, item.packId])] };
          equivalent.set(identity, groups);
        }
        matches = [...equivalent.values()].flat().map(value => ({ ...value.item,
          sourceRefs: value.sourceRefs, packIds: value.packIds }));
      }
      return resolve(matches.length > 1 ? "ambiguous" : undefined, matches.map(item => ({
        candidateId: item.objectKey, objectRef: { appId: item.appId, publisher: item.publisher,
          objectType: item.objectType, objectId: item.objectId, appVersion: item.version },
        displayName: item.displayName, pageType: item.pageType,
        ...(item.sourceTable ? { sourceTable: item.sourceTable } : {}),
        ...(item.description ? { description: item.description } : {}),
        provenance: { packId: item.packId, packIds: item.packIds || [item.packId], sourceRuleId: item.sourceRuleId,
          verification: item.verification, sourceRefs: clone(item.sourceRefs) } })));
    };
    const resolveControl = ({ objectRef = {}, controlRef = {}, releaseId } = {}) => {
      const id = str(controlRef.controlId || controlRef.id);
      const objectResult = lookupObject(objectRef, releaseId);
      if (!id || objectResult.status !== "resolved") return resolve(objectResult.status === "ambiguous" ? "ambiguous" : "unresolved", []);
      const objectCandidate = objectResult.candidates[0];
      const item = getRelease(releaseId)?.controls.find(control => control.controlId === id &&
        control.objectKey === objectCandidate.candidateId);
      return resolve(item ? "resolved" : "unresolved", item ? [{ candidateId: item.controlKey,
        controlRef: { controlId: item.controlId }, provenance: item.provenance }] : []);
    };
    const resolveAction = ({ objectRef = {}, controlRef = {}, context = {}, language = null } = {}, releaseId) => {
      const release = getRelease(releaseId);
      if (!release) return resolve("unresolved", []);
      const task = { pageCaption: context.pageCaption || "", actionCaption: context.actionCaption || "",
        fieldCaption: context.fieldCaption || "", automationId: controlRef.automationId || context.automationId || "",
        context: { ...(context || {}), currentPageCaption: context.pageCaption || "" } };
      const hasObjectIdentity = Boolean(objectRef.objectId || objectRef.pageObjectId || objectRef.id);
      const objectResolution = hasObjectIdentity ? lookupObject(objectRef, releaseId) : null;
      if (objectResolution?.status === "ambiguous") return resolve("ambiguous", []);
      if (hasObjectIdentity && objectResolution?.status !== "resolved") return resolve("unresolved", []);
      const objectPackIds = new Set(objectResolution?.candidates.flatMap(candidate =>
        candidate.provenance.packIds || [candidate.provenance.packId]) || []);
      const rules = release.rules.filter(rule => !hasObjectIdentity || objectPackIds.has(rule.packId));
      const scored = rules.map(rule => ({ rule,
        score: knowledge.score({ ...rule, packPriority: release.packs.find(pack => pack.packId === rule.packId)?.priority || 0 }, task) }))
        .filter(item => item.score > 0);
      if (!scored.length) return resolve("unresolved", []);
      const best = Math.max(...scored.map(item => item.score));
      const tied = scored.filter(item => item.score === best).map(item => item.rule);
      const candidates = tied.map(rule => ({ candidateId: `${rule.packId}:${rule.ruleId}`,
        taskType: rule.taskType, semanticAction: rule.semanticAction, entity: rule.entity,
        confidence: rule.confidence, score: best,
        provenance: { packId: rule.packId, packVersion: rule.packVersion,
          knowledgeReleaseId: release.release.releaseId, ruleId: rule.ruleId,
          method: "text-rule", language: language || null,
          sourceRefs: array(rule.sourceIds).map(sourceId => release.packs
            .find(pack => pack.packId === rule.packId)?.sources?.find(source => source.sourceId === sourceId))
            .filter(Boolean).map(clone) } }));
      const outputs = new Set(candidates.map(item => `${item.taskType}\u001f${item.semanticAction}\u001f${item.entity}`));
      candidates.sort((a, b) => a.candidateId.localeCompare(b.candidateId));
      return outputs.size > 1 ? resolve("ambiguous", candidates) : resolve("resolved", candidates.slice(0, 1));
    };
    const resolveConcept = (conceptId, releaseId) => {
      const release = getRelease(releaseId);
      if (!release) return resolve("unresolved", []);
      const concept = release.concepts.find(item => item.conceptId === String(conceptId));
      return resolve(concept ? "resolved" : "unresolved", concept ? [{
        candidateId: concept.conceptId, concept, provenance: { rules: concept.provenance } }] : []);
    };
    return Object.freeze({ activate, activeReleaseId: () => activeReleaseId,
      getRelease, lookupObject, resolveControl, resolveAction, resolveConcept, validateRelease });
  }

  return { APPEND_ONLY, FRAMEWORK_VERSION, SCHEMA_VERSION, createRepository,
    importRelease, load, validateManifest, validatePack, validateRelease };
});
