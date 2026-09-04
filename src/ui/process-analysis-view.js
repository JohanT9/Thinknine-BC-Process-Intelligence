(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ProcessAnalysisView = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  const array = value => Array.isArray(value) ? value : [];
  const text = value => value == null ? "" : String(value).trim();
  const escape = value => text(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
  })[character]);
  function stepLabel(step) { return text(step?.title || step?.name || step?.id ||
    step?.referenceProcess || "Unknown step"); }
  function localized(value, labels) { return labels.processNames?.[text(value)] || text(value); }
  function variantLabel(value, labels) { const id = text(value?.id || value);
    const name = text(value?.name || value); return labels.variantNames?.[id] ||
      labels.variantNames?.[name] || name.replace(/^variant:/, "").replace(/-/g, " "); }
  function normalize(result = {}, decision = null) { let best = result.bestMatch || null;
    if (decision?.confirmedReferenceId) { const selected = array(result.matches).find(item =>
      item.referenceDiagramId === decision.confirmedReferenceId) ||
      array(result.processLibraryMatch?.alternativeMatches).find(item =>
        item.referenceId === decision.confirmedReferenceId);
      if (selected) best = { ...selected, referenceProcessId: selected.referenceDiagramId ||
        selected.referenceId, referenceProcess: selected.referenceProcess || selected.name,
        additionalSteps: selected.additionalSteps || selected.unexpectedSteps }; }
    const processMatch = result.processLibraryMatch || null; const matched = array(best?.matchedSteps ||
      processMatch?.matchedSteps); const missing = array(best?.missingSteps || processMatch?.missingSteps);
    const additional = array(best?.additionalSteps || processMatch?.unexpectedSteps);
    const confidence = Math.max(0, Math.min(1, Number(best?.confidence || result.confidence || 0)));
    const effectiveId = text(best?.referenceProcessId || best?.referenceDiagramId || best?.referenceId);
    const alternatives = array(result.matches).filter(item => item.referenceDiagramId !==
      effectiveId).map(item => ({ id: item.referenceDiagramId,
        name: item.referenceProcess, confidence: item.confidence, domain: item.domain || "" }));
    array(processMatch?.alternativeMatches).forEach(item => { if (!alternatives.some(candidate =>
      candidate.id === item.referenceId) && item.referenceId !== effectiveId) alternatives.push({
      id: item.referenceId, name: item.name,
      confidence: item.confidence, domain: item.domain || "" }); });
    const assessment = result.assessment || result.recognition?.assessment || {};
    const status = text(best?.assessmentStatus || assessment.status) || (confidence >= 0.82
      ? "auto-classifiable" : confidence >= 0.35 ? "review-required" : "insufficient-evidence");
    return Object.freeze({ available: Boolean(best), referenceId: text(best?.referenceProcessId ||
      best?.referenceDiagramId || best?.referenceId), name: text(best?.referenceProcess || best?.name),
      domain: text(best?.domain), confidence, matched: clone(matched), missing: clone(missing),
      additional: clone(additional), alternatives: clone(alternatives.slice(0, 5)),
      confirmed: decision?.status === "confirmed", confirmedReferenceId:
      text(decision?.confirmedReferenceId), confirmedAt: decision?.confirmedAt || null,
      assessmentStatus: status, evidenceQuality: text(best?.evidenceQuality || assessment.evidenceQuality) || "weak",
      candidateMargin: Number(best?.candidateMargin ?? assessment.candidateMargin ?? 0),
      variantAssessment: clone(best?.variantAssessment || result.recognition?.classification
        ?.processEvidence?.variantAssessment || null), confirmedVariantId:
      text(decision?.confirmedVariantId),
      manualConfirmationRecommended: assessment.manualConfirmationRecommended === true ||
        best?.manualConfirmationRecommended === true || status !== "auto-classifiable", advisory: true }); }
  function metric(label, value, tone) { return `<div class="process-analysis-metric ${tone}">
    <strong>${escape(value)}</strong><span>${escape(label)}</span></div>`; }
  function steps(title, values, tone, emptyLabel, labels) { return `<section class="process-analysis-list ${tone}">
    <h4>${escape(title)} <span>${values.length}</span></h4>${values.length ? `<ul>${values.map(item =>
      `<li>${escape(localized(stepLabel(item), labels))}</li>`).join("")}</ul>` : `<p>${escape(emptyLabel)}</p>`}</section>`; }
  function render(container, input, labels = {}) { const model = normalize(input.result, input.decision);
    if (!model.available) { container.innerHTML = `<div class="process-analysis-empty" role="status">
      <h4>${escape(labels.noMatchTitle || "No reliable process match")}</h4>
      <p>${escape(labels.noMatchText || "The recording remains valid and can be classified manually later.")}</p>
      </div>`; return model; }
    const percent = Math.round(model.confidence * 100); container.innerHTML = `
      <p class="process-analysis-assessment ${escape(model.assessmentStatus)}" role="status">
        <strong>${escape(labels[model.assessmentStatus] || model.assessmentStatus)}</strong>
        <span>${escape(model.manualConfirmationRecommended ? labels.confirmationRecommended ||
          "Confirm the classification before using it." : labels.strongEvidence ||
          "The classification is supported by several independent signals.")}</span>
      </p>
      <section class="process-analysis-summary" aria-labelledby="processAnalysisMatchName">
        <div><span class="process-analysis-eyebrow">${escape(labels.detected || "Detected reference process")}</span>
          <h4 id="processAnalysisMatchName">${escape(localized(model.name, labels))}</h4>
          <p>${escape(localized(model.domain, labels) || labels.unknownDomain || "Domain not identified")}</p></div>
        <div class="process-analysis-confidence"><strong>${percent}%</strong>
          <span>${escape(labels.match || "match")}</span></div>
      </section>
      ${model.variantAssessment ? `<fieldset class="process-analysis-variant" aria-labelledby="processAnalysisVariantTitle">
        <div><span>${escape(labels.configurationVariant || "Business Central configuration")}</span>
          <h4 id="processAnalysisVariantTitle">${escape(variantLabel({ id:
            model.variantAssessment.selectedVariantId, name:
            model.variantAssessment.selectedVariantName }, labels))}</h4></div>
        <p>${escape(model.variantAssessment.ambiguous ? labels.variantUncertain ||
          "Several configurations fit the recording. Variant-specific steps are shown as conditional." :
          labels.variantSupported || "The observed sequence supports this configuration variant.")}</p>
        ${model.variantAssessment.ambiguous ? `<div class="process-analysis-variant-options">
          ${[{ id: model.variantAssessment.selectedVariantId,
            name: model.variantAssessment.selectedVariantName }, ...array(
            model.variantAssessment.alternativeVariants)].map((item, index) =>
              `<label><input type="radio" name="processAnalysisVariant" value="${escape(item.id)}"
                data-variant-name="${escape(item.name)}" ${text(model.confirmedVariantId ||
                  model.variantAssessment.selectedVariantId) === text(item.id) ? "checked" : ""}>
                <span>${escape(variantLabel(item, labels))}</span>${index === 0 ? `<small>${escape(
                  labels.mostLikely || "Most likely")}</small>` : ""}</label>`).join("")}</div>` : ""}
        </fieldset>` : ""}
      <div class="process-analysis-meter" role="progressbar" aria-label="${escape(labels.matchDegree ||
        "Match confidence")}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}">
        <span style="width:${percent}%"></span></div>
      ${model.confirmed ? `<p class="process-analysis-confirmed" role="status">✓ ${escape(
        labels.confirmed || "Classification confirmed manually")}</p>` : ""}
      <div class="process-analysis-metrics">${metric(labels.matched || "Matched", model.matched.length, "matched")}
        ${metric(labels.missing || "Possible missing", model.missing.length, "missing")}
        ${metric(labels.additional || "Customer-specific", model.additional.length, "additional")}</div>
      <p class="process-analysis-advisory">${escape(labels.advisory ||
        "Differences are guidance, not errors. The recorded process may be a valid customer variant.")}</p>
      <div class="process-analysis-columns">${steps(labels.matchedSteps || "Matched steps", model.matched,
        "matched", labels.none || "None", labels)}${steps(labels.missingSteps || "Possible missing steps", model.missing,
        "missing", labels.noMissing || "No expected steps are missing", labels)}${steps(labels.additionalSteps ||
        "Customer-specific steps", model.additional, "additional", labels.noAdditional || "No additional steps", labels)}</div>
      <fieldset class="process-analysis-alternatives"><legend>${escape(labels.alternatives ||
        "Alternative reference processes")}</legend>${model.alternatives.length ? model.alternatives.map(item =>
          `<label><input type="radio" name="processAnalysisReference" value="${escape(item.id)}"
            data-reference-name="${escape(item.name)}"><span>${escape(localized(item.name, labels))}</span>
            <strong>${Math.round(item.confidence * 100)}%</strong></label>`).join("") :
          `<p>${escape(labels.noAlternatives || "No relevant alternatives")}</p>`}</fieldset>`;
    return model; }
  function selectedReference(container, model) { const selected = container.querySelector(
    'input[name="processAnalysisReference"]:checked'); return selected ? { id: selected.value,
    name: selected.dataset.referenceName || selected.value } : { id: model.referenceId, name: model.name }; }
  function selectedVariant(container, model) { const selected = container.querySelector(
    'input[name="processAnalysisVariant"]:checked'); return selected ? { id: selected.value,
    name: selected.dataset.variantName || selected.value } : model.variantAssessment ? {
      id: model.variantAssessment.selectedVariantId,
      name: model.variantAssessment.selectedVariantName } : null; }
  return { normalize, render, selectedReference, selectedVariant };
});
