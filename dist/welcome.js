(() => {
  "use strict";
  // The page a new user sees right after installing BC Process Studio, and that the library
  // opens again under Get started. Three steps that tick themselves off as they are done (the
  // toolbar button pinned, Business Central open, a first document saved) and an example of
  // what a recording becomes. Nothing here changes a recording or a document; the only thing it
  // saves is the user's answer to the language offer.
  const i18n = globalThis.T9UiI18n;
  const registry = globalThis.T9LanguageRegistry;
  const stepText = globalThis.T9StepText;
  const { SESSION_PREFIX, WELCOME_KEY } = globalThis.T9StorageKeys;
  const $ = id => document.getElementById(id);
  const BC_URL = "https://businesscentral.dynamics.com/";
  const BC_TABS = ["https://businesscentral.dynamics.com/*", "https://*.businesscentral.dynamics.com/*"];
  const PIN_POLL_MS = 2000;

  // The example's Business Central captions, as the client shows them in each language. They
  // only illustrate the example; captured documents always keep the captions that were recorded.
  // Business Central's own captions for the example, checked against Microsoft's Base Application
  // (src/document/bc-captions.json and its translation files); New from the web client's language
  // resources (CreateActionCaption, engine/bc-client-captions.js).
  const SAMPLE = Object.freeze({
    "sv-SE": { list: "Inköpsorder", page: "Inköpsorder", new: "Ny", vendorNo: "Leverantörsnr", vendorName: "Leverantörsnamn", postingDate: "Bokföringsdatum", status: "Status", open: "Öppen", released: "Släppt", no: "Nr", quantity: "Antal", release: "Släpp" },
    "en-US": { list: "Purchase Orders", page: "Purchase Order", new: "New", vendorNo: "Vendor No.", vendorName: "Vendor Name", postingDate: "Posting Date", status: "Status", open: "Open", released: "Released", no: "No.", quantity: "Quantity", release: "Release" },
    "fr-FR": { list: "Commandes achat", page: "Commande achat", new: "Créer", vendorNo: "N° fournisseur", vendorName: "Nom fournisseur", postingDate: "Date comptabilisation", status: "Statut", open: "Ouvert", released: "Lancé", no: "N°", quantity: "Quantité", release: "Lancer" },
    "de-DE": { list: "Einkaufsbestellungen", page: "Einkaufsbestellung", new: "Neu", vendorNo: "Kreditorennr.", vendorName: "Kreditorenname", postingDate: "Buchungsdatum", status: "Status", open: "Offen", released: "Freigegeben", no: "Nr.", quantity: "Menge", release: "Freigeben" },
    "es-ES": { list: "Pedidos compra", page: "Pedido compra", new: "Nuevo", vendorNo: "N.º de proveedor", vendorName: "Nombre del proveedor", postingDate: "Fecha registro", status: "Estado", open: "Abierto", released: "Lanzado", no: "Nº", quantity: "Cantidad", release: "Lanzar" },
    "da-DK": { list: "Købsordrer", page: "Købsordre", new: "Ny", vendorNo: "Kreditornr.", vendorName: "Kreditornavn", postingDate: "Bogføringsdato", status: "Status", open: "Åben", released: "Frigivet", no: "Nummer", quantity: "Antal", release: "Frigiv" },
    "fi-FI": { list: "Ostotilaukset", page: "Ostotilaus", new: "Uusi", vendorNo: "Toimittajan nro", vendorName: "Toimittajan nimi", postingDate: "Kirjauspvm", status: "Tila", open: "Avoin", released: "Vapautettu", no: "Nro", quantity: "Määrä", release: "Vapauta" },
    "nb-NO": { list: "Bestillinger", page: "Bestilling", new: "Ny", vendorNo: "Leverandørnr.", vendorName: "Leverandørnavn", postingDate: "Bokføringsdato", status: "Status", open: "Åpen", released: "Frigitt", no: "Nr.", quantity: "Antall", release: "Frigi" }
  });

  let locale = i18n.DEFAULT_LOCALE;
  let documentLanguage = "en-US";
  let offeredLanguage = "";
  let pinned = null;
  let bcTabId = 0;
  let latestDocument = null;
  let savedHere = false;
  let knownDocumentIds = null;
  let moreOpen = false;

  const t = key => i18n.translate(key, locale);
  const tf = (key, values) => i18n.format(key, values, locale);

  const send = (message, timeout = 8000) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("technical.requestTimeout")), timeout);
    try {
      chrome.runtime.sendMessage(message, response => {
        clearTimeout(timer);
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve(response);
      });
    } catch (error) { clearTimeout(timer); reject(error); }
  });

  // The first of the browser's languages that BC Process Studio has, by its own tag or its
  // language ("sv-FI" is Swedish). A language it does not have offers nothing.
  function browserLanguage(tags = navigator.languages?.length ? navigator.languages : [navigator.language]) {
    const languages = registry.supported("ui");
    for (const tag of tags) {
      const value = String(tag || "").toLowerCase();
      const found = languages.find(language => (language.aliases || []).includes(value)) ||
        languages.find(language => (language.aliases || []).includes(value.split("-")[0]));
      if (found) return found.locale;
    }
    return "";
  }

  // Sentence runs from the document templates: captions in bold, entered values marked.
  function sentence(element, number, kind, slots) {
    const result = stepText.render(stepText.describe(kind, slots), documentLanguage);
    const nodes = [Object.assign(document.createElement("span"), { className: "wl-n", textContent: `${number}.` })];
    for (const run of result?.runs || []) {
      const tag = run.role === "interface" ? "b" : run.role === "value" ? "i" : "";
      nodes.push(tag ? Object.assign(document.createElement(tag), { textContent: run.text })
        : document.createTextNode(run.text));
    }
    element.replaceChildren(...nodes);
  }

  function renderSample() {
    const words = SAMPLE[documentLanguage] || SAMPLE["en-US"];
    const doc = key => i18n.translate(key, documentLanguage);
    const docf = (key, values) => i18n.format(key, values, documentLanguage);
    $("wlDocTitle").textContent = doc("welcome.sampleDocTitle");
    $("wlDocMeta").textContent = doc("welcome.sampleMeta");
    $("wlSec1").textContent = doc("welcome.sampleSection1");
    $("wlSec2").textContent = doc("welcome.sampleSection2");
    $("wlSec3").textContent = doc("welcome.sampleSection3");
    sentence($("wlStep1"), 1, "action", { action: words.new });
    sentence($("wlStep2"), 2, "enter", { typed: "10000", field: words.vendorNo });
    sentence($("wlStep3"), 3, "enter", { typed: "1896-S", field: words.no });
    sentence($("wlStep4"), 4, "enter", { typed: "5", field: words.quantity });
    sentence($("wlStep5"), 5, "action", { action: words.release });
    $("wlShot1Page").textContent = words.list;
    $("wlShot1New").textContent = `+ ${words.new}`;
    $("wlShot1Open").textContent = words.open;
    $("wlShot1Released").textContent = words.released;
    $("wlShot2Page").textContent = `${words.page} · ${words.new}`;
    $("wlShot2Vendor").textContent = words.vendorNo;
    $("wlShot2Date").textContent = words.postingDate;
    $("wlShot2DateValue").textContent = new Intl.DateTimeFormat(documentLanguage).format(new Date());
    $("wlShot2Name").textContent = words.vendorName;
    $("wlShot2Status").textContent = words.status;
    $("wlShot2StatusValue").textContent = words.open;
    $("wlShot1").setAttribute("aria-label", docf("welcome.sampleShot1", { page: words.list, action: words.new }));
    $("wlShot2").setAttribute("aria-label", docf("welcome.sampleShot2", { field: words.vendorNo, value: "10000" }));
    $("wlDocTitle").closest("article").lang = documentLanguage.split("-")[0];
  }

  function renderLanguageOffer() {
    $("wlLang").hidden = !offeredLanguage;
    if (!offeredLanguage) return;
    // The offer speaks the offered language: that is the language its reader understands.
    $("wlLang").lang = offeredLanguage.split("-")[0];
    $("wlLangText").textContent = i18n.translate("welcome.langOffer", offeredLanguage);
    $("wlLangYes").textContent = i18n.translate("welcome.langYes", offeredLanguage);
    $("wlLangNo").textContent = i18n.translate("welcome.langNo", offeredLanguage);
  }

  function renderRecordHelp() {
    const [before, after = ""] = t("welcome.recordHelp").split("{action}");
    $("wlRecordHelp").replaceChildren(document.createTextNode(before),
      Object.assign(document.createElement("b"), { textContent: t("recorder.process") }),
      document.createTextNode(after));
  }

  function render() {
    // A browser that cannot tell whether the button is pinned leaves that step to the user:
    // it is shown, but not counted.
    const steps = [
      { id: "wlPin", done: pinned === true, counted: pinned !== null },
      { id: "wlBc", done: Boolean(bcTabId) || Boolean(latestDocument), counted: true },
      { id: "wlRecord", done: Boolean(latestDocument), counted: true }
    ];
    const current = steps.find(step => !step.done && step.counted);
    for (const step of steps) {
      const element = $(step.id);
      element.dataset.state = step.done ? "done" : step === current ? "current" : "";
      element.querySelectorAll(".wl-todo").forEach(node => { node.hidden = step.done; });
      element.querySelector(".wl-done").hidden = !step.done;
    }
    const counted = steps.filter(step => step.counted);
    const done = counted.filter(step => step.done).length;
    $("wlProgress").textContent = done === counted.length ? t("welcome.progressDone")
      : tf("welcome.progress", { done, total: counted.length });
    $("wlTitle").textContent = savedHere ? t("welcome.titleDone") : t("welcome.title");
    $("wlRecordDone").textContent = latestDocument
      ? tf("welcome.recordDone", { name: latestDocument.name || t("welcome.untitled") }) : "";
    $("wlGoBc").hidden = !bcTabId || Boolean(latestDocument);
    $("wlOpenDocument").hidden = !latestDocument;
  }

  function renderAll() {
    document.title = t("welcome.pageTitle");
    renderLanguageOffer();
    renderRecordHelp();
    renderSample();
    $("wlMoreToggle").textContent = t(moreOpen ? "welcome.fewerSteps" : "welcome.moreSteps");
    $("wlFooter").textContent = tf("welcome.footer", { name: t("welcome.open") });
    render();
    // Shown once it speaks the user's language, not the page's fallback first.
    delete $("wlMain").dataset.loading;
  }

  async function checkPinned() {
    if (!chrome.action?.getUserSettings) return;
    try {
      const settings = await chrome.action.getUserSettings();
      const next = Boolean(settings?.isOnToolbar);
      if (next !== pinned) { pinned = next; render(); }
    } catch {}
  }

  async function checkBusinessCentral() {
    try {
      const tabs = await chrome.tabs.query({ url: BC_TABS });
      const next = tabs[0]?.id || 0;
      if (next !== bcTabId) { bcTabId = next; render(); }
    } catch {}
  }

  // Saved process documents: not bug reports, not a recording still running.
  async function checkDocuments() {
    try {
      const response = await send({ type: "T9_LIST_SESSIONS" });
      const documents = (response?.sessions || []).filter(session => session?.id &&
        session.status !== "recording" && session.recordingPurpose !== "bug-report");
      const ids = new Set(documents.map(session => session.id));
      // A document that was not there when the page opened was saved while it was open.
      if (knownDocumentIds && [...ids].some(id => !knownDocumentIds.has(id))) savedHere = true;
      knownDocumentIds = knownDocumentIds || ids;
      latestDocument = documents[0] || null;
      render();
    } catch {}
  }

  async function answerLanguageOffer(accept) {
    const chosen = offeredLanguage;
    offeredLanguage = "";
    renderLanguageOffer();
    $("wlTitle").focus();
    try {
      await chrome.storage.local.set({ [WELCOME_KEY]: { languageOffer: accept ? "accepted" : "declined",
        language: chosen, answeredAt: new Date().toISOString() } });
      if (!accept) return;
      await send({ type: "T9_SAVE_UI_LOCALE", uiLocale: chosen });
      await send({ type: "T9_SAVE_DOCUMENT_LANGUAGE", documentLanguage: chosen });
      locale = i18n.apply(chosen);
      documentLanguage = registry.normalize(chosen, "document");
      renderAll();
    } catch {
      // The offer comes back, so the choice can be made again.
      offeredLanguage = chosen;
      renderLanguageOffer();
    }
  }

  async function focusTab(tabId) {
    const tab = await chrome.tabs.update(tabId, { active: true });
    if (tab?.windowId) await chrome.windows.update(tab.windowId, { focused: true });
  }

  async function loadSettings() {
    const response = await send({ type: "T9_GET_SETTINGS" });
    locale = i18n.apply(response?.settings?.uiLocale);
    documentLanguage = registry.normalize(response?.settings?.documentLanguage, "document");
  }

  async function start() {
    try { await loadSettings(); } catch { locale = i18n.apply(locale); }
    let answered = null;
    try { answered = (await chrome.storage.local.get(WELCOME_KEY))[WELCOME_KEY]; } catch {}
    const browser = browserLanguage();
    offeredLanguage = !answered?.languageOffer && browser && browser !== locale ? browser : "";
    renderAll();

    $("wlLangYes").addEventListener("click", () => { void answerLanguageOffer(true); });
    $("wlLangNo").addEventListener("click", () => { void answerLanguageOffer(false); });
    $("wlOpenBc").addEventListener("click", () => { void chrome.tabs.create({ url: BC_URL }); });
    $("wlGoBc").addEventListener("click", () => { if (bcTabId) void focusTab(bcTabId).catch(() => {}); });
    $("wlOpenDocument").addEventListener("click", () => {
      if (!latestDocument) return;
      void chrome.tabs.create({ url: chrome.runtime.getURL(
        `dashboard.html?openReview=${encodeURIComponent(latestDocument.id)}`) });
    });
    $("wlOpenLibrary").addEventListener("click", () => {
      void chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
    });
    $("wlMoreToggle").addEventListener("click", () => {
      moreOpen = !moreOpen;
      $("wlMore").hidden = !moreOpen;
      $("wlMoreToggle").setAttribute("aria-expanded", String(moreOpen));
      $("wlMoreToggle").textContent = t(moreOpen ? "welcome.fewerSteps" : "welcome.moreSteps");
    });

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "local") return;
      const keys = Object.keys(changes);
      if (keys.some(key => key.startsWith(SESSION_PREFIX))) void checkDocuments();
      // A language chosen elsewhere is followed here too.
      if (keys.some(key => /setting/i.test(key))) {
        void loadSettings().then(() => {
          if (offeredLanguage === locale) offeredLanguage = "";
          renderAll();
        }).catch(() => {});
      }
    });
    for (const event of [chrome.tabs.onUpdated, chrome.tabs.onRemoved, chrome.tabs.onCreated]) {
      event?.addListener(() => { void checkBusinessCentral(); });
    }
    // Pinning has no event in every browser version: it is checked while the page is shown.
    chrome.action?.onUserSettingsChanged?.addListener(settings => {
      pinned = Boolean(settings?.isOnToolbar);
      render();
    });
    setInterval(() => { if (document.visibilityState === "visible") void checkPinned(); }, PIN_POLL_MS);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState !== "visible") return;
      void checkPinned();
      void checkBusinessCentral();
      void checkDocuments();
    });
    await Promise.all([checkPinned(), checkBusinessCentral(), checkDocuments()]);
  }

  globalThis.T9Welcome = Object.freeze({ browserLanguage, SAMPLE });
  if (globalThis.chrome?.runtime?.id && document.getElementById("wlTitle")) void start();
})();
