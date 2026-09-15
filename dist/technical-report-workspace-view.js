(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9TechnicalReportWorkspaceView = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const element = (doc, tag, text, className = "") => {
    const value = doc.createElement(tag); value.className = className;
    value.textContent = text || ""; return value;
  };
  const ui = (text, locale) => globalThis.T9UiI18n?.translateStaticText(
    text, locale) || text;
  function copyButton(doc, label, value, onCopy, locale) {
    const button = element(doc, "button", ui("Copy", locale), "technical-copy");
    button.type = "button"; button.setAttribute("aria-label", label);
    button.addEventListener("click", () => onCopy(String(value || "")));
    return button;
  }
  function details(doc, summary, text, onCopy, locale) {
    const wrapper = doc.createElement("details");
    wrapper.appendChild(element(doc, "summary", ui(summary, locale)));
    const pre = element(doc, "pre", text, "technical-raw-evidence");
    wrapper.append(pre, copyButton(doc, `${ui("Copy", locale)} ${ui(summary,
      locale)}`, text, onCopy, locale));
    return wrapper;
  }
  function hasSectionContent(section) {
    const content = section.content;
    if (section.kind === "metadata") return [content?.businessCentral,
      content?.browser].some(value => value && Object.values(value).some(child =>
      child != null && child !== ""));
    if (section.kind === "errors") return Boolean(content?.primary ||
      content?.additional?.length);
    if (section.kind === "diagnostics") return Boolean(content?.rows?.length ||
      content?.captureStatuses?.length);
    if (section.kind === "call-stack") return (content || []).some(stack =>
      stack.rawCallStack || stack.frames?.length);
    if (section.kind === "objects") return Boolean(content?.objects?.length ||
      content?.apps?.length);
    if (section.kind === "telemetry") return Boolean(content?.configured &&
      content?.contexts?.length);
    if (section.kind === "ai-analysis") return Boolean(content?.available);
    if (section.kind === "timeline") return Boolean(Array.isArray(content) &&
      content.length > 1);
    if (section.kind === "traceability") return false;
    return true;
  }
  function appendMetadata(doc, parent, input, locale, prefix = "") {
    const labels = { "businessCentral.environment": "Business Central environment",
      "businessCentral.company": "Business Central company",
      "browser.name": "Browser", "browser.version": "Browser version" };
    Object.entries(input || {}).forEach(([key, value]) => {
      if (key === "authorship" || value == null || value === "") return;
      const label = prefix ? `${prefix}.${key}` : key;
      if (value && typeof value === "object" && !Array.isArray(value)) {
        appendMetadata(doc, parent, value, locale, label);
        return;
      }
      parent.append(element(doc, "dt", ui(labels[label] || label, locale)), element(doc, "dd",
        Array.isArray(value) ? value.join(", ") : String(value)));
    });
  }
  function render(container, workspaceState, options = {}, doc = document) {
    const onCopy = options.onCopy || (() => {});
    const onEdit = options.onEdit || (() => {});
    const locale = options.locale || "en-US";
    const report = workspaceState.document;
    container.replaceChildren();
    container.setAttribute("aria-label", `Technical Bug Report: ${report.title}`);
    container.appendChild(element(doc, "h1", report.title));
    const saveLabels = { saved: "Saved automatically", saving: "Saving…",
      unsaved: "Changes waiting to be saved", failed: "Could not save changes" };
    const status = element(doc, "p", ui(saveLabels[workspaceState.saveState] ||
      workspaceState.saveState, locale), `save-state save-state-${workspaceState.saveState}`);
    status.setAttribute("role", "status"); container.appendChild(status);
    const severityLabel = element(doc, "label", ui("Severity", locale));
    severityLabel.htmlFor = "technical-report-severity";
    const severity = doc.createElement("select");
    severity.id = "technical-report-severity"; severity.name = "severity";
    const severityValues = ["", "Low", "Medium", "High", "Critical"];
    const savedSeverity = workspaceState.report.summary.severity || "";
    severityValues.forEach(value => {
      const option = element(doc, "option", value); option.value = value;
      severity.appendChild(option);
    });
    // Unknown legacy values are not selectable; known values retain their classification.
    severity.value = severityValues.find(value =>
      value.toLowerCase() === String(savedSeverity).toLowerCase()) || "";
    severity.addEventListener("change", () => onEdit("severity", severity.value));
    const severityHeader = element(doc, "div", "", "report-severity-header");
    severityHeader.append(severityLabel, severity); container.appendChild(severityHeader);
    const editor = doc.createElement("fieldset");
    editor.className = "report-core-fields";
    editor.appendChild(element(doc, "legend", ui("Describe the problem", locale)));
    const fields = [{ name: "title", label: "Title",
      value: workspaceState.report.summary.title },
    { name: "expectedResult", label: "What did you expect?",
      value: workspaceState.report.expectedResult.text, multiline: true },
    ];
    const appendField = (parent, field) => {
      const id = `technical-report-${field.name}`;
      const label = element(doc, "label", ui(field.label, locale)); label.htmlFor = id;
      const input = doc.createElement(field.multiline ? "textarea" : "input");
      input.id = id; input.name = field.name; input.value = field.value || "";
      input.addEventListener("change", () => onEdit(field.name, input.value));
      parent.append(label, input);
    };
    fields.forEach(field => appendField(editor, field));
    container.appendChild(editor);
    const technicalDetails = doc.createElement("details");
    technicalDetails.className = "technical-details";
    technicalDetails.appendChild(element(doc, "summary", ui("Technical details", locale)));
    technicalDetails.appendChild(element(doc, "p",
      ui("Only technical information captured for this error is shown.", locale)));
    const advancedKinds = new Set(["metadata", "diagnostics", "call-stack",
      "objects", "telemetry", "timeline", "ai-analysis", "traceability",
      "errors"]);
    const editorDuplicateKinds = new Set(["summary", "text", "notes"]);
    let technicalSectionCount = 0;
    for (const section of report.sections) {
      if (advancedKinds.has(section.kind) && !hasSectionContent(section)) continue;
      const node = doc.createElement("section");
      node.className = `report-section report-section-${section.kind}`;
      node.dataset.technicalReportSection = section.id;
      node.appendChild(element(doc, "h2", section.title));
      if (section.kind === "metadata") {
        const list = doc.createElement("dl");
        appendMetadata(doc, list, { businessCentral: section.content.businessCentral,
          browser: section.content.browser }, locale);
        node.appendChild(list);
      } else if (section.kind === "text") node.appendChild(element(doc, "p",
        section.content || "Incomplete"));
      else if (section.kind === "reproduction") {
        const list = doc.createElement("ol");
        section.content.forEach(step => {
          const item = element(doc, "li", step.instruction);
          if (step.failurePoint) {
            item.className = "failure-point";
            item.appendChild(element(doc, "strong",
              ` — ${ui("Error occurred here", locale)}`, "failure-point-label"));
          }
          list.appendChild(item);
        }); node.appendChild(list);
        const editableSteps = (workspaceState.report.reproduction?.steps || [])
          .map((step, index) => ({ ...step, number: index + 1,
            hasInstructionOverride: Object.prototype.hasOwnProperty.call(
              step.stepOverride?.fields || {}, "instruction"),
            instruction: Object.prototype.hasOwnProperty.call(
              step.stepOverride?.fields || {}, "instruction")
              ? step.stepOverride.fields.instruction : step.instruction,
            included: step.visibility !== "hidden" }));
        if (editableSteps.length && options.onEditReproductionStep) {
          const editor = doc.createElement("details");
          editor.className = "reproduction-editor";
          editor.appendChild(element(doc, "summary",
            ui("Edit reproduction steps", locale)));
          editableSteps.forEach(step => {
            const row = doc.createElement("div"); row.className = "reproduction-editor-row";
            const label = element(doc, "label",
              `${ui("Step", locale)} ${step.number}`);
            const input = doc.createElement("input");
            input.value = step.instruction;
            input.setAttribute("aria-label", `${ui("Step", locale)} ${step.number}`);
            input.addEventListener("change", () => options.onEditReproductionStep(
              step.reproductionStepId, { instruction: input.value }));
            input.addEventListener("keydown", event => {
              if (event.key === "Enter") { event.preventDefault(); input.blur(); }
            });
            const includeLabel = element(doc, "label", ui("Include in report", locale),
              "reproduction-include");
            const include = doc.createElement("input"); include.type = "checkbox";
            include.checked = step.included;
            include.setAttribute("aria-label",
              `${ui("Include in report", locale)}: ${ui("Step", locale)} ${step.number}`);
            include.addEventListener("change", () => options.onEditReproductionStep(
              step.reproductionStepId, { visibility: include.checked
                ? "visible" : "hidden" }));
            includeLabel.appendChild(include);
            label.appendChild(input); row.append(label, includeLabel);
            if (step.hasInstructionOverride) {
              const reset = element(doc, "button", ui("Use generated text", locale));
              reset.type = "button";
              reset.addEventListener("click", () => options.onEditReproductionStep(
                step.reproductionStepId, { resetInstruction: true }));
              row.appendChild(reset);
            }
            editor.appendChild(row);
          });
          node.appendChild(editor);
        }
      } else if (section.kind === "actual-result") {
        appendField(node, { name: "actualResult", label: "What happened instead?",
          value: workspaceState.report.actualResult.human.text, multiline: true });
        section.content.capturedErrors.forEach(error => {
          const block = element(doc, "blockquote", error.rawMessage);
          block.setAttribute("aria-label", ui("Captured Business Central error", locale));
          node.append(block, copyButton(doc, ui("Copy Business Central error", locale),
            error.rawMessage, onCopy, locale));
        });
      } else if (section.kind === "diagnostics") {
        const dl = doc.createElement("dl");
        section.content.rows.forEach(row => {
          dl.append(element(doc, "dt", row.label), element(doc, "dd", row.value),
            copyButton(doc, `${ui("Copy", locale)} ${row.label}`, row.value,
              onCopy, locale));
        }); node.appendChild(dl);
        section.content.captureStatuses.forEach(status => node.appendChild(
          element(doc, "p", status.diagnosticsStatus === "diagnostics-capture-failed"
            ? "Diagnostic capture failed."
            : status.diagnosticsStatus === "diagnostics-unavailable"
              ? "Diagnostics were not provided by Business Central."
              : "Diagnostics captured.")));
      } else if (section.kind === "call-stack") {
        section.content.forEach(stack => {
          const table = doc.createElement("table");
          table.appendChild(element(doc, "caption",
            `Structured AL call stack — ${stack.parseStatus}`));
          const head = doc.createElement("thead");
          const header = doc.createElement("tr");
          ["#", "Object", "Method / Trigger", "App / Extension", "Source / Line",
            "Parse Status"].forEach(value => header.appendChild(element(doc, "th",
            value))); head.appendChild(header); table.appendChild(head);
          const body = doc.createElement("tbody");
          stack.frames.forEach(frame => {
            const row = doc.createElement("tr");
            [frame.frameIndex + 1, `${frame.objectType || ""} ${frame.objectId || ""} ${frame.objectName || ""}`,
              frame.methodName || frame.triggerName || "", frame.extensionName || "",
              frame.sourceLocation || frame.lineNumber || "", frame.parseStatus]
              .forEach(value => row.appendChild(element(doc, "td", String(value))));
            body.appendChild(row);
          }); table.appendChild(body); node.appendChild(table);
          if (stack.rawCallStack) node.appendChild(details(doc, "Raw AL call stack",
            stack.rawCallStack, onCopy, locale));
          if (stack.unparsedSegments.length) node.appendChild(details(doc,
            "Unparsed call-stack segments", stack.unparsedSegments.map(item =>
              item.rawText).join("\n"), onCopy, locale));
        });
      } else if (section.kind === "errors") {
        const all = [section.content.primary, ...section.content.additional]
          .filter(Boolean);
        all.forEach(error => {
          if (all.length > 1) {
            const choose = doc.createElement("button"); choose.type = "button";
            choose.textContent = error.errorEvidenceId ===
              section.content.primaryErrorEvidenceId ? ui("Primary error", locale) :
              ui("Select as primary error", locale);
            choose.setAttribute("aria-pressed", String(error.errorEvidenceId ===
              section.content.primaryErrorEvidenceId));
            choose.addEventListener("click", () => options.onSelectPrimaryError?.(
              error.errorEvidenceId)); node.appendChild(choose);
          }
          node.appendChild(element(doc, "p", error.rawMessage));
          if (error.supportUrl) {
            const link = element(doc, "a", ui("Open in Business Central", locale));
            link.href = error.supportUrl; link.target = "_blank";
            link.rel = "noopener noreferrer"; node.appendChild(link);
          }
          if (error.rawDiagnostics) node.appendChild(details(doc,
            "Raw Business Central diagnostics", error.rawDiagnostics, onCopy,
            locale));
        });
      } else if (section.kind === "evidence") {
        const assets = options.mediaAssets || {};
        const stepByAsset = new Map(report.sections.find(item =>
          item.kind === "reproduction")?.content.flatMap(step =>
          (step.screenshotAssetIds || []).map(assetId => [assetId, step.number])) || []);
        const screenshotLabel = screenshot => screenshot.role === "error"
          ? ui("Error screenshot", locale) : stepByAsset.has(screenshot.assetId)
            ? `${ui("Screenshot for step", locale)} ${stepByAsset.get(screenshot.assetId)}`
            : ui("Reproduction screenshot", locale);
        const byAsset = new Map();
        section.content.screenshots.forEach(screenshot => {
          const current = byAsset.get(screenshot.assetId);
          if (!current || screenshot.role === "error") {
            byAsset.set(screenshot.assetId, screenshot);
          }
        });
        const screenshots = [...byAsset.values()];
        const primary = screenshots.find(item => item.role === "error") ||
          screenshots.at(-1);
        const appendScreenshot = (parent, screenshot, className = "") => {
          const figure = doc.createElement("figure"); figure.className = className;
          const media = assets[screenshot.assetId];
          if (media?.source) {
            const image = doc.createElement("img"); image.src = media.source;
            image.alt = screenshot.role === "error"
              ? ui("Captured Business Central error", locale) :
                ui("Reproduction evidence", locale);
            figure.appendChild(image);
          }
          figure.appendChild(element(doc, "figcaption",
            screenshotLabel(screenshot))); parent.appendChild(figure);
        };
        if (primary) appendScreenshot(node, primary, "primary-evidence");
        const supporting = screenshots.filter(item => item !== primary);
        if (supporting.length) {
          const more = doc.createElement("details"); more.className = "additional-evidence";
          const summary = element(doc, "summary", ui("Additional screenshots", locale));
          summary.appendChild(element(doc, "span", ` (${supporting.length})`,
            "evidence-count")); more.appendChild(summary);
          supporting.forEach(item => appendScreenshot(more, item));
          node.appendChild(more);
        }
        const editableScreenshots = workspaceState.report.evidence?.screenshots || [];
        if (editableScreenshots.length && options.onSetScreenshotVisibility) {
          const editor = doc.createElement("details"); editor.className = "screenshot-editor";
          editor.appendChild(element(doc, "summary", ui("Choose screenshots", locale)));
          editableScreenshots.forEach((screenshot, index) => {
            const label = element(doc, "label", screenshotLabel(screenshot),
              "screenshot-include");
            const include = doc.createElement("input"); include.type = "checkbox";
            include.checked = screenshot.visibility !== "hidden";
            include.setAttribute("aria-label", `${ui("Include in report", locale)}: ${
              screenshotLabel(screenshot)} ${index + 1}`);
            include.addEventListener("change", () => options.onSetScreenshotVisibility(
              screenshot.assetId, include.checked ? "visible" : "hidden"));
            label.appendChild(include); editor.appendChild(label);
          });
          node.appendChild(editor);
        }
      } else if (section.kind === "notes") {
        section.content.forEach(note => node.appendChild(element(doc, "p",
          note.text || note.content || "")));
      } else if (section.kind === "telemetry") {
        if (!section.content.configured) node.appendChild(element(doc, "p",
          "Telemetry is optional and has not been fetched."));
        section.content.contexts.forEach(context => {
          node.appendChild(element(doc, "h3", `Error ${context.errorEvidenceId}`));
          node.appendChild(element(doc, "p", `Status: ${context.status}`));
          const list = doc.createElement("ul");
          context.events.forEach(event => list.appendChild(element(doc, "li",
            `${event.timestamp} — ${event.eventName || event.message} (${(event.correlationReasons || []).join(", ")})`)));
          node.appendChild(list);
          node.appendChild(details(doc, "Raw telemetry query results",
            JSON.stringify(context.queries, null, 2), onCopy, locale));
        });
      } else if (section.kind === "timeline") {
        const list = doc.createElement("ol");
        section.content.forEach(item => list.appendChild(element(doc, "li",
          `${item.timestamp} [${item.source}] ${item.label}`)));
        node.appendChild(list);
      } else if (section.kind === "ai-analysis") {
        if (!section.content.available) node.appendChild(element(doc, "p",
          "AI analysis is optional and has not been run."));
        else {
          const analysis = section.content.analysis;
          node.appendChild(element(doc, "p", analysis.status === "stale"
            ? "This AI analysis is stale. Re-analyze before relying on it."
            : "Derived AI analysis — not captured evidence."));
          node.appendChild(element(doc, "h3", "Summary"));
          node.appendChild(element(doc, "p", analysis.summary));
          const addItems = (title, items, prefix = "") => {
            node.appendChild(element(doc, "h3", title));
            const values = doc.createElement("ul");
            items.forEach(item => values.appendChild(element(doc, "li",
              `${prefix}${item.text || item}`))); node.appendChild(values);
          };
          addItems("Evidence-based observations", analysis.observations || []);
          addItems("Possible root-cause hypotheses", analysis.hypotheses || [],
            "Not verified: ");
          addItems("Recommended investigation", analysis.recommendedNextChecks || []);
          addItems("Missing evidence", analysis.missingEvidence || []);
          addItems("Warnings and limitations", analysis.warnings || []);
        }
      }
      if (editorDuplicateKinds.has(section.kind)) continue;
      if (advancedKinds.has(section.kind)) {
        technicalDetails.appendChild(node); technicalSectionCount += 1;
      } else container.appendChild(node);
    }
    if (technicalSectionCount) container.appendChild(technicalDetails);
    const requiredIssues = report.completeness.issues.filter(issue =>
      issue.level === "required");
    if (requiredIssues.length) {
      const guidance = doc.createElement("section");
      guidance.className = "report-incomplete";
      guidance.appendChild(element(doc, "h2", ui("Needs attention", locale)));
      const list = doc.createElement("ul");
      requiredIssues.forEach(issue => list.appendChild(element(doc,
        "li", ui(issue.message, locale)))); guidance.appendChild(list);
      container.appendChild(guidance);
    }
    return { sectionCount: report.sections.length,
      ready: report.completeness.ready };
  }
  return { render };
});
