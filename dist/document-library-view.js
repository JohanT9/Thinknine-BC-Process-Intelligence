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

  // The review state comes from the saved review: approved steps of the visible steps.
  function documentState(record, progress) {
    if (record.metadata?.status === "recording") return { state: "recording" };
    if (record.metadata?.recordingPurpose === "bug-report") return { state: "bug-report" };
    const total = Number(progress?.total) || 0;
    const approved = Math.min(Number(progress?.approved) || 0, total);
    if (progress?.completed || (total > 0 && approved >= total)) {
      return { state: "ready", total, approved };
    }
    return { state: approved > 0 ? "review" : "new", total, approved };
  }

  function stateLabel(state, locale) {
    if (state.state === "recording") return localized("Recording", locale, "Spelar in");
    if (state.state === "ready") return localized("Ready to share", locale, "Klar att dela");
    if (state.state === "review") {
      return localized("In review · {approved} of {total}", locale,
        "Granskas · {approved} av {total}", state);
    }
    return state.state === "new" ? localized("Not reviewed", locale, "Ej granskad") : "";
  }

  // The latest email made from a bug report. Only a confirmed send is shown as sent.
  function deliveryLabel(delivery, locale) {
    if (!delivery) return "";
    const values = { date: date(delivery.at, locale) };
    if (delivery.outcome === "sent") return localized("Sent {date}", locale, "Skickad {date}", values);
    if (delivery.outcome === "uncertain") {
      return localized("Possibly sent {date}", locale, "Kanske skickad {date}", values);
    }
    return ["draft", "file"].includes(delivery.outcome)
      ? localized("Email prepared {date}", locale, "E-post förberedd {date}", values) : "";
  }

  // view.folderOf(record) gives the record's folder path and its accessible label, and
  // view.moveToFolderLabel names the menu action; both are left out where folders are not shown.
  function card(record, selected, active, locale = "en-US", progress = null, delivery = null, view = {}) {
    const folder = view.folderOf?.(record) || null;
    const bugReport = record.metadata?.recordingPurpose === "bug-report";
    const state = documentState(record, progress);
    const recording = state.state === "recording";
    const language = languages.get(record.documentLanguage);
    const safeTitle = escape(record.title);
    // A tag that only repeats the company already shown in the card's details is left out.
    const company = String(record.metadata?.company || "").trim().toLocaleLowerCase();
    const tags = record.tags.filter(tag => String(tag).trim().toLocaleLowerCase() !== company);
    const visibleTags = tags.slice(0, 3);
    const hiddenTagCount = Math.max(0, tags.length - visibleTags.length);
    const label = stateLabel(state, locale);
    // The status chip says whether a document is reviewed, so its button always names what it opens.
    // The language badge comes first in the details, so it lines up from row to row.
    const openLabel = bugReport ? localized("Open bug report", locale, "Öppna felrapport")
      : localized("Open documentation", locale, "Öppna dokumentation");
    return `<article class="library-card" role="listitem" tabindex="${active ? 0 : -1}"
      data-selected="${selected}" ${active ? 'aria-current="true"' : ""}
      data-kind="${bugReport ? "bug-report" : "documentation"}"
      data-library-project-id="${escape(record.projectId)}">
      <div class="library-card-heading"><label class="library-select">
        <input type="checkbox" data-library-action="select"
          ${selected ? "checked" : ""} aria-label="${escape(localized(
            "Select document: {title}", locale, "Välj dokument: {title}",
            { title: record.title }))}">
        <span class="sr-only">${escape(localized("Select document", locale,
          "Välj dokument"))}</span></label>
        <span class="library-kind" aria-hidden="true">${bugReport ? "!" : "≡"}</span>
        <div class="library-card-title"><h4 title="${safeTitle}">${safeTitle}</h4>
          <div class="library-card-meta">
            <span class="library-language" aria-label="${escape(language.nativeName)}">${escape(language.shortCode)}</span>
            <span>${escape(bugReport ? localized("Bug report", locale, "Felrapport")
              : localized("Documentation", locale, "Dokumentation"))}</span>
            ${folder ? `<span class="library-folder-badge" title="${escape(folder.label)}"><span class="sr-only">${escape(folder.label)}</span><span aria-hidden="true">▸ ${escape(folder.path)}</span></span>` : ""}
            ${record.metadata?.company ? `<span>${escape(record.metadata.company)}</span>` : ""}
            <span>${escape(localized("Changed {date}", locale,
              "Ändrad {date}", { date: date(record.modifiedAt, locale) }))}</span>
            ${bugReport && deliveryLabel(delivery, locale) ? `<span class="library-delivery"
              data-outcome="${escape(delivery.outcome)}">${escape(deliveryLabel(delivery, locale))}</span>` : ""}
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
        </div></div>
      ${label ? `<span class="library-state" data-state="${state.state}">${escape(label)}</span>` : "<span></span>"}
      <div class="library-card-footer">
        <button class="library-favourite" data-library-action="favourite"
          aria-pressed="${record.favourite}" aria-label="${escape(localized(
            record.favourite ? "Remove from favorites" : "Add to favorites",
            locale, record.favourite ? "Ta bort från favoriter" :
              "Lägg till i favoriter"))}">${record.favourite ? "★" : "☆"}</button>
        ${!bugReport && state.state === "ready" ? `<button class="secondary" data-library-action="run-test">${escape(
          localized("Run test", locale, "Kör test"))}</button>` : ""}
        <button class="secondary" data-library-action="open" ${recording ? "disabled" : ""}>${escape(openLabel)}</button>
        <details class="library-card-menu" data-library-menu>
          <summary aria-label="${escape(localized("More actions for {title}", locale,
            "Fler åtgärder för {title}", { title: record.title }))}">⋯</summary>
          <div class="library-card-menu-panel" data-no-tooltip>
            ${bugReport || recording ? "" : `<button type="button" data-library-action="export-word">${escape(
              localized("Export Word", locale, "Exportera Word"))}</button>
            ${state.state === "ready" ? "" : `<button type="button" data-library-action="run-test">${escape(
              localized("Run test", locale, "Kör test"))}</button>`}`}
            ${recording ? "" : `<button type="button" data-library-action="export-recording">${escape(
              localized("Export recording (ZIP)", locale, "Exportera inspelning (ZIP)"))}</button>`}
            ${view.moveToFolderLabel ? `<button type="button" data-library-action="move-folder">${escape(view.moveToFolderLabel)}</button>` : ""}
            <button type="button" data-library-action="archive">${escape(record.archived
              ? localized("Restore from archive", locale, "Återställ från arkivet")
              : localized("Archive", locale, "Arkivera"))}</button>
            <hr>
            <button type="button" class="danger" data-library-action="delete">${escape(
              localized("Delete…", locale, "Ta bort…"))}</button>
          </div>
        </details>
      </div>
    </article>`;
  }

  // Started reviews that are not finished, so the user can continue where they left off.
  function renderContinue(container, records, state = {}) {
    const locale = state.locale || "en-US";
    const progress = state.progress || new Map();
    const items = records.filter(record => !record.archived &&
      documentState(record, progress.get(record.projectId)).state === "review")
      .slice(0, state.limit || 3);
    container.innerHTML = items.map(record => {
      const value = documentState(record, progress.get(record.projectId));
      const percent = value.total ? Math.round(value.approved / value.total * 100) : 0;
      return `<button type="button" class="library-continue-card"
        data-library-continue="${escape(record.projectId)}">
        <span class="library-continue-kind">${escape(localized("Documentation · changed {date}",
          locale, "Dokumentation · ändrad {date}", { date: date(record.modifiedAt, locale) }))}</span>
        <strong>${escape(record.title)}</strong>
        <span class="library-progress" aria-hidden="true"><span style="width:${percent}%"></span></span>
        <span class="library-continue-next">${escape(localized(
          "{approved} of {total} steps approved · Continue reviewing →", locale,
          "{approved} av {total} steg godkända · Fortsätt granska →", value))}</span></button>`;
    }).join("");
    return items.length;
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
      // An empty folder says so, rather than suggesting that a filter hides its documents.
      container.innerHTML = state.emptyMessage
        ? `<p class="library-empty">${escape(state.emptyMessage)}</p>`
        : state.storedCount === 0
        // First use: the steps to the first document, with no tools that need documents.
        ? `<div class="library-empty library-first-run"><h4>${escape(localized("Get started",
          locale, "Kom igång"))}</h4><ol>${[
          ["Open Business Central in the browser.", "Öppna Business Central i webbläsaren."],
          ["Select BC Process Studio in the browser toolbar.",
            "Välj BC Process Studio i webbläsarens verktygsfält."],
          ["Choose Document a process or Report an issue and do the work in Business Central.",
            "Välj Dokumentera en process eller Rapportera ett fel och utför arbetet i Business Central."]
        ].map(([english, swedish]) => `<li>${escape(localized(english, locale, swedish))}</li>`).join("")}</ol>
          <p>${escape(localized("When you finish the recording, the document appears here. Documents from another computer can be brought in with Import or Sync.",
          locale, "När du avslutar inspelningen hamnar dokumentet här. Dokument från en annan dator hämtar du med Importera eller Synka."))}</p></div>`
        : `<div class="library-empty"><p>${escape(localized(
          "No documents in the Document Library match the search and filters.",
          locale, "Det finns inga dokument i Dokumentbiblioteket som matchar sökningen och filtren."))}</p>
          <button type="button" class="secondary" data-library-action="clear-search-filters">${escape(localized(
            "Clear search and filters", locale, "Rensa sökning och filter"))}</button></div>`;
      return null;
    }
    container.innerHTML = records.map(record => card(record,
      selectedIds.has(record.projectId), record.projectId === activeId, locale,
      state.progress?.get(record.projectId), state.deliveries?.get(record.projectId), state
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
            record.projectId === activeId, locale,
            state.progress?.get(record.projectId),
            state.deliveries?.get(record.projectId), state)).join("")}</div></section>`
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

  return { activeFilterCount, applySelection, card, documentState, renderContinue,
    renderGrouped, renderList };
});
