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

  // Built-in profile and theme names are stored in English and shown in the interface language.
  const BUILT_IN_NAMES = Object.freeze({ "Business Process": "Affärsprocess",
    "Bug Report": "Felrapport", "Technical Report": "Teknisk rapport" });
  const builtInName = (name, locale) => BUILT_IN_NAMES[name]
    ? localized(name, locale, BUILT_IN_NAMES[name]) : name;
  function localized(english, locale, swedish = english, values = {}) {
    let result = languages.translate(english, locale,
      locale === "sv-SE" ? swedish : english);
    for (const [key, value] of Object.entries(values)) {
      result = result.replaceAll(`{${key}}`, String(value));
    }
    return result;
  }

  function date(value, locale) {
    const timestamp = value ? new Date(value) : null;
    if (!timestamp || !Number.isFinite(timestamp.getTime())) {
      return localized("Unknown date", locale, "Okänt datum");
    }
    return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(timestamp);
  }

  function card(record, selected, active, locale = "en-US") {
    const bugReport = record.metadata?.recordingPurpose === "bug-report";
    const language = languages.get(record.documentLanguage);
    const safeTitle = escape(record.title);
    const visibleTags = record.tags.slice(0, 3);
    const hiddenTagCount = Math.max(0, record.tags.length - visibleTags.length);
    return `<article class="library-card" role="listitem" tabindex="${active ? 0 : -1}"
      data-selected="${selected}" ${active ? 'aria-current="true"' : ""}
      data-library-project-id="${escape(record.projectId)}">
      <div class="library-card-heading"><label class="library-select">
        <input type="checkbox" data-library-action="select"
          ${selected ? "checked" : ""} aria-label="${escape(localized(
            "Select document: {title}", locale, "Välj dokument: {title}",
            { title: record.title }))}">
        <span class="sr-only">${escape(localized("Select document", locale,
          "Välj dokument"))}</span></label><h4 title="${safeTitle}">${safeTitle}</h4>
        <span class="library-language" aria-label="${escape(language.nativeName)}">${escape(language.shortCode)}</span>
        <button class="library-favourite" data-library-action="favourite"
          aria-pressed="${record.favourite}" aria-label="${escape(localized(
            record.favourite ? "Remove from favorites" : "Add to favorites",
            locale, record.favourite ? "Ta bort från favoriter" :
              "Lägg till i favoriter"))}">${record.favourite ? "★" : "☆"}</button></div>
      <div class="library-card-meta">
        <span class="library-profile">${escape(builtInName(record.profile.displayName, locale))} · ${escape(builtInName(record.theme.displayName, locale))}</span>
        ${record.archived ? `<span class="library-card-status">${escape(localized(
          "Archived", locale, "Arkiverad"))}</span>` : ""}
        ${record.status ? `<span>${escape(record.status)}</span>` : ""}
        ${record.author ? `<span>${escape(localized("By {author}", locale,
          "Av {author}", { author: record.author }))}</span>` : ""}
      </div>
      ${visibleTags.length ? `<div class="library-tags">${visibleTags.map(tag =>
        `<span>${escape(tag)}</span>`).join("")}${hiddenTagCount
        ? `<span aria-label="${escape(localized("Additional tags: {count}",
          locale, "Ytterligare taggar: {count}", { count: hiddenTagCount }))}">+${hiddenTagCount}</span>` : ""}</div>` : ""}
      <div class="library-card-footer">
        <span class="muted">${escape(localized("Changed {date}", locale,
          "Ändrad {date}", { date: date(record.modifiedAt, locale) }))}${record.readingMinutes ? ` · ${record.readingMinutes} min` : ""}</span>
        <button class="secondary" data-library-action="open">${bugReport
          ? localized("Open bug report", locale, "Öppna felrapport") :
            localized("Open documentation", locale, "Öppna dokumentation")}</button>
      </div>
    </article>`;
  }

  function activeFilterCount(options = {}) {
    const filters = options.filters || {};
    return [filters.profile, filters.theme, filters.documentLanguage,
      filters.favourite, filters.recent,
      filters.created?.from || filters.created?.to,
      filters.modified?.from || filters.modified?.to]
      .filter(Boolean).length;
  }

  function renderList(container, records, state = {}) {
    const locale = state.locale || "en-US";
    const selectedIds = new Set(state.selectedIds || []);
    const activeId = records.some(value => value.projectId === state.activeId)
      ? state.activeId : records[0]?.projectId;
    if (!records.length) {
      container.innerHTML = state.storedCount === 0
        ? `<p class="library-empty">${escape(localized(
          "No documents yet. Open Business Central, select BC Process Studio in the browser toolbar and choose Document a process.",
          locale, "Det finns inga dokument ännu. Öppna Business Central, välj BC Process Studio i webbläsarens verktygsfält och välj Dokumentera en process."))}</p>`
        : `<div class="library-empty"><p>${escape(localized(
          "No documents in the Document Library match the search and filters.",
          locale, "Det finns inga dokument i Dokumentbiblioteket som matchar sökningen och filtren."))}</p>
          <button type="button" class="secondary" data-library-action="clear-search-filters">${escape(localized(
            "Clear search and filters", locale, "Rensa sökning och filter"))}</button></div>`;
      return null;
    }
    container.innerHTML = records.map(record => card(record,
      selectedIds.has(record.projectId), record.projectId === activeId, locale
    )).join("");
    return activeId;
  }

  function renderGrouped(container, groups, state = {}) {
    const locale = state.locale || "en-US";
    const records = groups.flatMap(group => group.documents);
    const selectedIds = new Set(state.selectedIds || []);
    const activeId = records.some(value => value.projectId === state.activeId)
      ? state.activeId : records[0]?.projectId;
    if (!records.length) return renderList(container, records, state);
    container.innerHTML = groups.map(group =>
      `<section class="library-group" aria-labelledby="library-group-${escape(group.profileId)}">
        <h3 id="library-group-${escape(group.profileId)}">${escape(builtInName(group.displayName, locale))}</h3>
        <div class="library-group-cards">${group.documents.map(record =>
          card(record, selectedIds.has(record.projectId),
            record.projectId === activeId, locale)).join("")}</div></section>`
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

  return { activeFilterCount, applySelection, card, renderGrouped, renderList };
});
