(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9DocumentLibraryView = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function escape(value) {
    return String(value || "").replace(/[&<>"']/g, character => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[character]);
  }

  function date(value) {
    return value ? new Date(value).toLocaleDateString("sv-SE") : "Okänt datum";
  }

  function card(record, selected) {
    const confirmations = record.health.confirmations.slice(0, 2).map(value =>
      `<li>${escape(value)}</li>`).join("");
    return `<article class="library-card" role="option" tabindex="${selected ? 0 : -1}"
      aria-selected="${selected}" data-library-project-id="${escape(record.projectId)}">
      <div class="library-card-heading"><h4>${escape(record.title)}</h4>
        <button class="library-favourite" data-library-action="favourite"
          aria-pressed="${record.favourite}" aria-label="${record.favourite ? "Ta bort från" : "Lägg till i"} favoriter">${record.favourite ? "★" : "☆"}</button></div>
      <p class="library-profile">${escape(record.profile.displayName)} · ${escape(record.theme.displayName)}</p>
      ${record.author ? `<p class="muted">Av ${escape(record.author)}</p>` : ""}
      <p><strong>${escape(record.health.overall)}</strong>${record.health.suggestionLabel ? ` · ${escape(record.health.suggestionLabel)}` : ""}</p>
      ${confirmations ? `<ul class="library-confirmations">${confirmations}</ul>` : ""}
      <p class="muted">Ändrad ${date(record.modifiedAt)}${record.readingMinutes ? ` · ${record.readingMinutes} min läsning` : ""}</p>
      <div class="library-tags">${record.tags.map(tag => `<span>${escape(tag)}</span>`).join("")}</div>
      <button class="secondary" data-library-action="open">Öppna dokumentation</button>
    </article>`;
  }

  function renderList(container, records, state = {}) {
    const selectedId = records.some(value => value.projectId === state.selectedId)
      ? state.selectedId : records[0]?.projectId;
    if (!records.length) {
      container.innerHTML = '<p class="library-empty">Inga dokument matchar sökningen och filtren.</p>';
      return null;
    }
    container.innerHTML = records.map(record => card(
      record, record.projectId === selectedId
    )).join("");
    return selectedId;
  }

  function renderGrouped(container, groups, state = {}) {
    const records = groups.flatMap(group => group.documents);
    const selectedId = records.some(value => value.projectId === state.selectedId)
      ? state.selectedId : records[0]?.projectId;
    if (!records.length) return renderList(container, records, state);
    container.innerHTML = groups.map(group =>
      `<section class="library-group" aria-labelledby="library-group-${escape(group.profileId)}">
        <h3 id="library-group-${escape(group.profileId)}">${escape(group.displayName)}</h3>
        <div class="library-group-cards">${group.documents.map(record =>
          card(record, record.projectId === selectedId)).join("")}</div></section>`
    ).join("");
    return selectedId;
  }

  function renderPreview(container, record) {
    if (!record) {
      container.innerHTML = "<h3>Snabbförhandsvisning</h3><p>Välj ett dokument.</p>";
      return;
    }
    container.innerHTML = `<h3>${escape(record.title)}</h3>
      <p class="library-profile">${escape(record.profile.displayName)}</p>
      <p><strong>Dokumenthälsa:</strong> ${escape(record.health.overall)}</p>
      <p>${escape(record.summary || "Ingen sammanfattning har indexerats ännu.")}</p>
      <dl><div><dt>Arbetsflöde</dt><dd>${escape(record.workflowName || "Inte angivet")}</dd></div>
        <div><dt>Senaste aktivitet</dt><dd>${escape(record.recentActivity[0] || "Ingen aktivitet registrerad")}</dd></div></dl>
      <ul class="library-confirmations">${record.health.confirmations.map(value =>
        `<li>${escape(value)}</li>`).join("")}</ul>`;
  }

  return { card, renderGrouped, renderList, renderPreview };
});
