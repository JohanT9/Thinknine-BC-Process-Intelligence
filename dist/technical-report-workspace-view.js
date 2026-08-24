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
  function copyButton(doc, label, value, onCopy) {
    const button = element(doc, "button", "Copy", "technical-copy");
    button.type = "button"; button.setAttribute("aria-label", label);
    button.addEventListener("click", () => onCopy(String(value || "")));
    return button;
  }
  function details(doc, summary, text, onCopy) {
    const wrapper = doc.createElement("details");
    wrapper.appendChild(element(doc, "summary", summary));
    const pre = element(doc, "pre", text, "technical-raw-evidence");
    wrapper.append(pre, copyButton(doc, `Copy ${summary}`, text, onCopy));
    return wrapper;
  }
  function render(container, workspaceState, options = {}, doc = document) {
    const onCopy = options.onCopy || (() => {});
    const onEdit = options.onEdit || (() => {});
    const report = workspaceState.document;
    container.replaceChildren();
    container.setAttribute("aria-label", `Technical Bug Report: ${report.title}`);
    container.appendChild(element(doc, "h1", report.title));
    const status = element(doc, "p", workspaceState.saveState, "save-state");
    status.setAttribute("role", "status"); container.appendChild(status);
    const editor = doc.createElement("fieldset");
    editor.appendChild(element(doc, "legend", "Editable report fields"));
    const fields = [{ name: "title", label: "Title",
      value: workspaceState.report.summary.title },
    { name: "summary", label: "Summary",
      value: workspaceState.report.summary.summary },
    { name: "severity", label: "Severity",
      value: workspaceState.report.summary.severity },
    { name: "category", label: "Category",
      value: workspaceState.report.summary.category },
    { name: "expectedResult", label: "Expected Result",
      value: workspaceState.report.expectedResult.text, multiline: true },
    { name: "actualResult", label: "Actual Result",
      value: workspaceState.report.actualResult.human.text, multiline: true },
    { name: "notes", label: "Notes", value: (workspaceState.report.notes || [])
      .map(note => note.text || note.content || "").join("\n"), multiline: true }];
    fields.forEach(field => {
      const id = `technical-report-${field.name}`;
      const label = element(doc, "label", field.label); label.htmlFor = id;
      const input = doc.createElement(field.multiline ? "textarea" : "input");
      input.id = id; input.name = field.name; input.value = field.value || "";
      input.addEventListener("change", () => onEdit(field.name, input.value));
      editor.append(label, input);
    });
    container.appendChild(editor);
    const technicalDetails = doc.createElement("details");
    technicalDetails.className = "technical-details";
    technicalDetails.appendChild(element(doc, "summary", "Technical details"));
    technicalDetails.appendChild(element(doc, "p",
      "Diagnostics, AL call stack, referenced objects, telemetry, AI analysis and traceability."));
    const advancedKinds = new Set(["metadata", "diagnostics", "call-stack",
      "objects", "telemetry", "timeline", "ai-analysis", "traceability"]);
    let technicalSectionCount = 0;
    for (const section of report.sections) {
      const node = doc.createElement("section");
      node.dataset.technicalReportSection = section.id;
      node.appendChild(element(doc, "h2", section.title));
      if (section.kind === "text") node.appendChild(element(doc, "p",
        section.content || "Incomplete"));
      else if (section.kind === "reproduction") {
        const list = doc.createElement("ol");
        section.content.forEach(step => list.appendChild(element(doc, "li",
          step.instruction))); node.appendChild(list);
      } else if (section.kind === "actual-result") {
        if (section.content.userDescription) node.appendChild(element(doc, "p",
          section.content.userDescription));
        section.content.capturedErrors.forEach(error => {
          const block = element(doc, "blockquote", error.rawMessage);
          block.setAttribute("aria-label", "Captured Business Central error");
          node.append(block, copyButton(doc, "Copy Business Central error",
            error.rawMessage, onCopy));
        });
      } else if (section.kind === "diagnostics") {
        const dl = doc.createElement("dl");
        section.content.rows.forEach(row => {
          dl.append(element(doc, "dt", row.label), element(doc, "dd", row.value),
            copyButton(doc, `Copy ${row.label}`, row.value, onCopy));
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
            stack.rawCallStack, onCopy));
          if (stack.unparsedSegments.length) node.appendChild(details(doc,
            "Unparsed call-stack segments", stack.unparsedSegments.map(item =>
              item.rawText).join("\n"), onCopy));
        });
      } else if (section.kind === "errors") {
        const all = [section.content.primary, ...section.content.additional]
          .filter(Boolean);
        all.forEach(error => {
          if (all.length > 1) {
            const choose = doc.createElement("button"); choose.type = "button";
            choose.textContent = error.errorEvidenceId ===
              section.content.primaryErrorEvidenceId ? "Primary error" :
              "Select as primary error";
            choose.setAttribute("aria-pressed", String(error.errorEvidenceId ===
              section.content.primaryErrorEvidenceId));
            choose.addEventListener("click", () => options.onSelectPrimaryError?.(
              error.errorEvidenceId)); node.appendChild(choose);
          }
          node.appendChild(element(doc, "p", error.rawMessage));
          if (error.rawDiagnostics) node.appendChild(details(doc,
            "Raw Business Central diagnostics", error.rawDiagnostics, onCopy));
        });
      } else if (section.kind === "evidence") {
        const assets = options.mediaAssets || {};
        [...section.content.screenshots].sort((a, b) =>
          (a.role === "error" ? -1 : 0) - (b.role === "error" ? -1 : 0))
          .forEach(screenshot => {
            const figure = doc.createElement("figure");
            const media = assets[screenshot.assetId];
            if (media?.source) {
              const image = doc.createElement("img"); image.src = media.source;
              image.alt = screenshot.role === "error"
                ? "Captured Business Central error" : "Reproduction evidence";
              figure.appendChild(image);
            }
            figure.appendChild(element(doc, "figcaption",
              screenshot.role === "error" ? "Error screenshot" :
                "Reproduction screenshot")); node.appendChild(figure);
          });
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
            JSON.stringify(context.queries, null, 2), onCopy));
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
      if (advancedKinds.has(section.kind)) {
        technicalDetails.appendChild(node); technicalSectionCount += 1;
      } else container.appendChild(node);
    }
    if (technicalSectionCount) container.appendChild(technicalDetails);
    const guidance = doc.createElement("section");
    guidance.className = report.completeness.ready ? "report-ready" : "report-incomplete";
    guidance.appendChild(element(doc, "h2", "Completeness"));
    guidance.appendChild(element(doc, "p", report.completeness.ready
      ? "Ready to share. Review the preview before any external submission."
      : "Complete the required human context below before sharing."));
    const list = doc.createElement("ul");
    report.completeness.issues.forEach(issue => list.appendChild(element(doc,
      "li", issue.message))); guidance.appendChild(list); container.appendChild(guidance);
    return { sectionCount: report.sections.length,
      ready: report.completeness.ready };
  }
  return { render };
});
