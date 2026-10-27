(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ProcessVersionComparisonView = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function escape(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[character]);
  }

  function localized(key, english, swedish, locale) {
    return globalThis.T9UiI18n?.translate?.(`processVersion.${key}`, locale) ||
      (String(locale || "").toLowerCase().startsWith("sv") ? swedish : english);
  }

  function snapshot(value) {
    return value?.processSnapshot || value || {};
  }

  function label(value, currentLabel) {
    return value?.versionNumber ? `v${value.versionNumber}` : currentLabel;
  }

  function nodeStatus(diff) {
    const result = new Map();
    (diff?.nodeChanges || []).forEach(change => {
      if (change.changeType === "unchanged") return;
      const id = change.after?.nodeId || change.nodeId || change.before?.nodeId;
      const previous = result.get(id);
      const status = change.changeType === "added" ? "added"
        : change.changeType === "removed" ? "removed"
          : change.changeType === "moved" ? "moved" : "modified";
      if (!previous || previous === "moved") result.set(id, status);
    });
    return result;
  }

  function render(container, comparison, options = {}) {
    if (!container || !comparison?.diff) return { changed: false, nodeCount: 0 };
    const locale = options.locale || "sv-SE";
    const currentLabel = localized("current", "Current", "Aktuellt", locale);
    const diff = comparison.diff;
    const toModel = snapshot(comparison.to);
    const statuses = nodeStatus(diff);
    const ordered = [...(toModel.nodes || [])].sort((left, right) =>
      (left.processOrder ?? left.sequence ?? 0) -
      (right.processOrder ?? right.sequence ?? 0));
    const removed = (diff.nodeChanges || []).filter(change =>
      change.changeType === "removed").map(change => change.before);
    const nodes = [...ordered.map(node => ({ node,
      status: statuses.get(node.nodeId) || "unchanged" })),
    ...removed.map(node => ({ node, status: "removed" }))];
    const summary = diff.summary || {};
    const metrics = [
      [summary.addedNodes, localized("added", "Added", "Tillagda", locale)],
      [summary.removedNodes, localized("removed", "Removed", "Borttagna", locale)],
      [summary.modifiedNodes, localized("modified", "Modified", "Ändrade", locale)],
      [summary.movedNodes, localized("moved", "Moved", "Flyttade", locale)],
      [(summary.addedTransitions || 0) + (summary.removedTransitions || 0) +
        (summary.modifiedTransitions || 0), localized("routes", "Routes", "Vägar", locale)],
      [(summary.addedStateTransitions || 0) +
        (summary.removedStateTransitions || 0) +
        (summary.modifiedStateTransitions || 0), localized("states", "States", "Tillstånd", locale)]
    ];
    container.innerHTML = `<div class="process-version-heading"><strong>${escape(
      label(comparison.from, currentLabel))}</strong><span aria-hidden="true">→</span><strong>${escape(
      label(comparison.to, currentLabel))}</strong></div>
      <div class="process-version-metrics">${metrics.map(([count, text]) =>
        `<div><strong>${Number(count) || 0}</strong><span>${escape(text)}</span></div>`
      ).join("")}</div>
      <div class="process-version-flow" role="list" aria-label="${escape(localized(
        "changes", "Process changes", "Processändringar", locale))}">${nodes.map(({ node, status }) =>
        `<div role="listitem" class="process-version-node ${escape(status)}">
          <span>${escape(status === "added" ? localized("added", "Added", "Tillagd", locale)
            : status === "removed" ? localized("removed", "Removed", "Borttagen", locale)
              : status === "modified" ? localized("modified", "Modified", "Ändrad", locale)
                : status === "moved" ? localized("moved", "Moved", "Flyttad", locale) : "")}</span>
          <strong>${escape(node.title || node.nodeType)}</strong>
        </div>`).join("")}</div>
      <p class="muted">${escape(summary.changed
        ? localized("semanticOnly", "Only semantic process changes are shown.",
          "Endast semantiska processändringar visas.", locale)
        : localized("none", "No semantic process changes.",
          "Inga semantiska processändringar.", locale))}</p>`;
    return { changed: Boolean(summary.changed), nodeCount: nodes.length };
  }

  return { label, nodeStatus, render };
});
