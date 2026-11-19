(() => {
  "use strict";
  // Settings → Bug reports → Your own apps. The user adds the .app files of
  // partner apps or their own extensions; each is read here, on the user's computer
  // (bug-report/app-errors.js), and only its error messages are kept in the browser's storage.
  // The possible cause of a bug report then names the app and object that show an error and the
  // actions it offers (bug-report/error-cause.js). Nothing is sent anywhere.
  const $ = id => document.getElementById(id);
  if (!$("appErrors")) return;
  const i18n = globalThis.T9UiI18n;
  const KEY = globalThis.T9StorageKeys?.KNOWN_APP_ERRORS_KEY || "t9_known_app_errors";
  const locales = () => (globalThis.T9LanguageRegistry?.supported?.("ui") || []).map(item => item.locale)
    .filter(Boolean);
  let locale = i18n.DEFAULT_LOCALE;
  let stored = { apps: [] };
  let removed = null;      // the app last removed, until it is undone or something else happens
  let status = null;       // { lines, undo } of the last outcome, shown again in a new language
  const t = (key, values = {}) => i18n.format(key, values, locale);
  const countText = (one, many, count, values = {}) => t(count === 1 ? one : many, { ...values, count });

  async function read() {
    try {
      const data = (await chrome.storage.local.get(KEY))?.[KEY];
      stored = data && typeof data === "object" ? { ...data, apps: Array.isArray(data.apps) ? data.apps : [] } : { apps: [] };
    } catch {
      stored = { apps: [] };
    }
    render();
  }
  // Unknown fields of a later version are kept.
  async function write(apps) {
    const next = { ...stored, version: 1, apps };
    await chrome.storage.local.set({ [KEY]: next });
    stored = next;
    render();
  }

  function showStatus(next) {
    status = next;
    // One line per file; only what failed is shown as an error.
    $("appErrorsStatusText").replaceChildren(...(next?.lines || []).map(([key, values, one, failed]) => {
      const line = document.createElement("span");
      line.textContent = one && values.count === 1 ? t(one, values) : t(key, values);
      if (failed) line.dataset.state = "error";
      return line;
    }));
    $("appErrorsUndo").hidden = !(next?.undo && removed);
  }

  function render() {
    const list = $("appErrorsList");
    list.replaceChildren(...stored.apps.map(app => {
      const item = document.createElement("li");
      item.className = "app-errors-item";
      const label = document.createElement("div");
      label.className = "app-errors-item-text";
      const name = document.createElement("span");
      name.className = "app-errors-item-name";
      name.textContent = app.name || app.fileName;
      const meta = document.createElement("span");
      meta.className = "app-errors-item-meta";
      meta.textContent = [app.publisher, app.version ? t("appErrors.version", { version: app.version }) : "",
        Number(app.errorCount) || !Number(app.captionCount)
          ? countText("appErrors.countOne", "appErrors.count", Number(app.errorCount) || 0) : "",
        Number(app.captionCount) ? countText("appErrors.namesOne", "appErrors.names", Number(app.captionCount)) : ""]
        .filter(Boolean).join(" · ");
      label.append(name, meta);
      if (app.from === "labels" && Number(app.errorCount)) {
        const note = document.createElement("span");
        note.className = "app-errors-item-meta";
        note.textContent = t("appErrors.fromLabels");
        label.append(note);
      }
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "secondary";
      remove.textContent = t("appErrors.remove");
      remove.setAttribute("aria-label", t("appErrors.removeName", { name: app.name || app.fileName }));
      remove.addEventListener("click", () => removeApp(app.id));
      item.append(label, remove);
      return item;
    }));
    $("appErrorsEmpty").hidden = stored.apps.length > 0;
  }

  async function addFiles(files) {
    if (!files.length) return;
    removed = null;
    const button = $("appErrorsAdd");
    button.disabled = true;
    const lines = [];
    let changed = false;
    let apps = [...stored.apps];
    try {
      for (const file of files) {
        showStatus({ lines: [["appErrors.reading", { fileName: file.name }]] });
        try {
          const app = await globalThis.T9AppErrors.readUserApp(await file.arrayBuffer(), { locales: locales(), fileName: file.name });
          // An app is kept for its error messages or for the names of its pages, actions and fields.
          if (!app.errorCount && !app.captionCount) {
            lines.push(["appErrors.noErrors", { name: app.name || file.name }, "", true]);
            continue;
          }
          const existing = apps.findIndex(item => item.id === app.id);
          if (app.errorCount) {
            lines.push([existing >= 0 ? "appErrors.updated" : "appErrors.added",
              { name: app.name, count: app.errorCount }, existing >= 0 ? "appErrors.updatedOne" : "appErrors.addedOne"]);
          } else {
            lines.push([existing >= 0 ? "appErrors.updatedNames" : "appErrors.addedNames", { name: app.name }]);
          }
          apps = existing >= 0 ? apps.map((item, index) => index === existing ? app : item) : [...apps, app];
          changed = true;
        } catch (error) {
          lines.push([error?.code === "not-an-app" ? "appErrors.notApp" : "appErrors.readFailed", { fileName: file.name }, "", true]);
        }
      }
      if (changed) {
        apps.sort((first, second) => String(first.name).localeCompare(String(second.name), locale));
        await write(apps);
      }
      showStatus({ lines });
    } catch {
      showStatus({ lines: [["appErrors.saveFailed", {}, "", true]] });
    } finally {
      button.disabled = false;
    }
  }

  async function removeApp(id) {
    const index = stored.apps.findIndex(app => app.id === id);
    if (index < 0) return;
    const app = stored.apps[index];
    try {
      await write(stored.apps.filter(item => item.id !== id));
      removed = { app, index };
      showStatus({ lines: [["appErrors.removed", { name: app.name || app.fileName }]], undo: true });
      $("appErrorsAdd").focus();
    } catch {
      showStatus({ lines: [["appErrors.saveFailed", {}, "", true]] });
    }
  }
  async function undoRemove() {
    if (!removed) return;
    const { app, index } = removed;
    removed = null;
    try {
      const apps = stored.apps.filter(item => item.id !== app.id);
      apps.splice(Math.min(index, apps.length), 0, app);
      await write(apps);
      showStatus({ lines: [["appErrors.restored", { name: app.name || app.fileName }]] });
      $("appErrorsAdd").focus();
    } catch {
      removed = { app, index };
      showStatus({ lines: [["appErrors.saveFailed", {}, "", true]], undo: true });
    }
  }

  $("appErrorsAdd").addEventListener("click", () => $("appErrorsFile").click());
  $("appErrorsFile").addEventListener("change", event => {
    const files = [...event.target.files];
    event.target.value = "";
    void addFiles(files);
  });
  $("appErrorsUndo").addEventListener("click", () => void undoRemove());
  document.addEventListener("t9:locale-changed", event => {
    locale = event.detail?.locale || locale;
    render();
    showStatus(status);
  });
  // Another page of the extension can change the apps too.
  chrome.storage?.onChanged?.addListener((changes, area) => {
    if (area === "local" && changes[KEY]) void read();
  });
  void read();
})();
