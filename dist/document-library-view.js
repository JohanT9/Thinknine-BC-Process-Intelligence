(function (root, factory) {
  const languages = typeof module === "object" && module.exports
    ? require("../engine/language-registry") : root.T9LanguageRegistry;
  const api = factory(languages);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9DocumentLibraryView = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (languages) {
  function escape(value) {
    return String(value || "").replace(/[&<>"']/g, character => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[character]);
  }

  function date(value) {
    return value ? new Date(value).toLocaleDateString("sv-SE") : "Okänt datum";
  }

  function card(record, selected, active) {
    const bugReport = record.metadata?.recordingPurpose === "bug-report";
    const language = languages.get(record.documentLanguage);
    return `<article class="library-card" role="listitem" tabindex="${active ? 0 : -1}"
      data-selected="${selected}" ${active ? 'aria-current="true"' : ""}
      data-library-project-id="${escape(record.projectId)}">
      <div class="library-card-heading"><label class="library-select">
        <input type="checkbox" data-library-action="select"
          ${selected ? "checked" : ""} aria-label="Välj ${escape(record.title)}">
        <span class="sr-only">Välj dokument</span></label><h4>${escape(record.title)}</h4>
        <span class="library-language" aria-label="${escape(language.nativeName)}">${escape(language.shortCode)}</span>
        <button class="library-favourite" data-library-action="favourite"
          aria-pressed="${record.favourite}" aria-label="${record.favourite ? "Ta bort från" : "Lägg till i"} favoriter">${record.favourite ? "★" : "☆"}</button></div>
      <p class="library-profile">${escape(record.profile.displayName)} · ${escape(record.theme.displayName)}</p>
      ${record.archived ? '<p><strong>Arkiverad</strong></p>' : ""}
      ${record.author ? `<p class="muted">Av ${escape(record.author)}</p>` : ""}
      ${record.status ? `<p class="muted">Status: ${escape(record.status)}</p>` : ""}
      <p class="muted">Ändrad ${date(record.modifiedAt)}${record.readingMinutes ? ` · ${record.readingMinutes} min läsning` : ""}</p>
      <div class="library-tags">${record.tags.map(tag => `<span>${escape(tag)}</span>`).join("")}</div>
      <button class="secondary" data-library-action="open">${bugReport
        ? "Öppna felrapport" : "Öppna dokumentation"}</button>
    </article>`;
  }

  function renderList(container, records, state = {}) {
    const selectedIds = new Set(state.selectedIds || []);
    const activeId = records.some(value => value.projectId === state.activeId)
      ? state.activeId : records[0]?.projectId;
    if (!records.length) {
      container.innerHTML = '<p class="library-empty">Det finns inga dokument i Dokumentbiblioteket som matchar sökningen och filtren.</p>';
      return null;
    }
    container.innerHTML = records.map(record => card(record,
      selectedIds.has(record.projectId), record.projectId === activeId
    )).join("");
    return activeId;
  }

  function renderGrouped(container, groups, state = {}) {
    const records = groups.flatMap(group => group.documents);
    const selectedIds = new Set(state.selectedIds || []);
    const activeId = records.some(value => value.projectId === state.activeId)
      ? state.activeId : records[0]?.projectId;
    if (!records.length) return renderList(container, records, state);
    container.innerHTML = groups.map(group =>
      `<section class="library-group" aria-labelledby="library-group-${escape(group.profileId)}">
        <h3 id="library-group-${escape(group.profileId)}">${escape(group.displayName)}</h3>
        <div class="library-group-cards">${group.documents.map(record =>
          card(record, selectedIds.has(record.projectId),
            record.projectId === activeId)).join("")}</div></section>`
    ).join("");
    return activeId;
  }

  function applySelection(container, state = {}) {
    const selectedIds = new Set(state.selectedIds || []);
    const cards = [...container.querySelectorAll("[data-library-project-id]")];
    cards.forEach(cardValue => {
      const selected = selectedIds.has(cardValue.dataset.libraryProjectId);
      const active = cardValue.dataset.libraryProjectId === state.activeId;
      cardValue.dataset.selected = String(selected);
      cardValue.tabIndex = active ? 0 : -1;
      if (active) cardValue.setAttribute("aria-current", "true");
      else cardValue.removeAttribute("aria-current");
      const checkbox = cardValue.querySelector('[data-library-action="select"]');
      if (checkbox) checkbox.checked = selected;
    });
    return cards.find(cardValue =>
      cardValue.dataset.libraryProjectId === state.activeId
    ) || null;
  }

  return { applySelection, card, renderGrouped, renderList };
});
