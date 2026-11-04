(() => {
  "use strict";
  const query = new URLSearchParams(location.search);
  const bugReportId = query.get("bugReportId");
  const container = document.getElementById("technicalReport");
  const message = document.getElementById("workspaceMessage");
  let currentUiLocale = globalThis.T9UiI18n.DEFAULT_LOCALE;
  let supportEmail = "";
  const t = key => globalThis.T9UiI18n.translate(key, currentUiLocale);
  const send = payload => new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(payload, response => {
      if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
      else if (!response?.ok) reject(Object.assign(new Error(response?.error ||
        t("technical.requestFailed")), { category: response?.category,
        uncertain: response?.uncertain === true }));
      else resolve(response);
    });
  });
  const action = handler => async () => {
    try { await handler(); }
    catch (error) {
      const detail = error.category === "timeout"
        ? t("technical.issueSubmissionTimeout") : t(error.message || String(error));
      message.textContent = error.uncertain
        ? `${globalThis.T9UiI18n.translateStaticText(
          "The destination may have created the issue. Check before retrying.",
          currentUiLocale)} ${detail}` : detail;
    }
  };
  // Resolves when the browser has written the file, so a message never claims a file was
  // saved while the download is still running, waiting in a Save as dialog or was cancelled.
  function downloadCompleted(downloadId) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const finish = state => {
        if (settled || state === "in_progress") return;
        settled = true; chrome.downloads.onChanged.removeListener(listener);
        if (state === "complete") resolve();
        else reject(new Error(t("technical.downloadNotSaved")));
      };
      const listener = delta => {
        if (delta.id === downloadId && delta.state?.current) finish(delta.state.current);
      };
      chrome.downloads.onChanged.addListener(listener);
      chrome.downloads.search({ id: downloadId }).then(([item]) => {
        if (item) finish(item.state);
      }, () => {});
    });
  }
  async function download(text, filename, type = "text/markdown;charset=utf-8", open = false) {
    const url = URL.createObjectURL(new Blob([text], { type }));
    try {
      const result = await send({ type: "T9_DOWNLOAD_FILE", url, filename, open });
      message.textContent = t("technical.waitingForDownload");
      await downloadCompleted(result.downloadId);
      return result;
    } finally { URL.revokeObjectURL(url); }
  }
  // A file name in the given language for a report without a usable title.
  const reportFileName = locale => globalThis.T9LanguageRegistry.translate("error report",
    locale, "felrapport").replace(/\s+/gu, "-");
  const busyButtons = ["emailReport", "exportPdf", "downloadMarkdown", "copySummary"]
    .map(id => document.getElementById(id));
  // Export actions run one at a time and show what is happening until they finish.
  async function busy(progress, work) {
    busyButtons.forEach(button => { button.disabled = true; });
    message.textContent = progress;
    try { return await work(); }
    catch (error) { if (message.textContent === progress) message.textContent = ""; throw error; }
    finally { busyButtons.forEach(button => { button.disabled = false; }); }
  }
  async function copyText(text, html = "") {
    try {
      if (html && globalThis.ClipboardItem && navigator.clipboard?.write) {
        await navigator.clipboard.write([new ClipboardItem({
          "text/plain": new Blob([text], { type: "text/plain" }),
          "text/html": new Blob([html], { type: "text/html" }) })]);
      } else await navigator.clipboard.writeText(text);
      return true;
    } catch {
      message.textContent = t("technical.copyFailed");
      return false;
    }
  }
  async function start() {
    if (!bugReportId) throw new Error(t("technical.missingReportId"));
    const loaded = await send({ type: "T9_LOAD_BUG_REPORT", bugReportId });
    if (!loaded.report) throw new Error(t("technical.reportNotFound"));
    const session = await send({ type: "T9_GET_SESSION_DATA",
      sessionId: loaded.report.recordingId, includeScreenshots: false });
    // Reports include the AL call stack when Business Central exposed one.
    const includeCallStack = (session.bcErrorEvidence || []).some(item =>
      String(item.rawCallStack || "").trim());
    const store = { save: report => send({ type: "T9_SAVE_BUG_REPORT", report })
      .then(response => response.report) };
    const workspace = globalThis.T9TechnicalReportWorkspace.create({
      report: loaded.report, errorEvidence: session.bcErrorEvidence, store
    });
    const mediaAssets = {};
    const recording = session.recordingHeader
      ? globalThis.T9CanonicalRecording.fromLegacyProjection(
        session.recordingHeader, session.session, session.events
      ) : session.recording;
    const screenshotIds = (loaded.report.evidence?.screenshots || [])
      .map(item => item.assetId);
    const screenshotPathByAssetId = globalThis.T9ScreenshotAssetPaths
      .assetPathIndex(recording);
    const screenshotPaths = [...new Set(screenshotIds.map(id =>
      screenshotPathByAssetId.get(String(id))).filter(Boolean))];
    async function loadReportScreenshots() {
      if (!screenshotPaths.length) return;
      const loadingMessage = globalThis.T9UiI18n.translateStaticText(
        "Loading report screenshots…", currentUiLocale);
      if (!message.textContent) message.textContent = loadingMessage;
      const result = await globalThis.T9ScreenshotBatchLoader.load({
        sessionId: loaded.report.recordingId, screenshotPaths, batchSize: 10,
        continueOnError: true, send: async request => {
          try { return await send(request); }
          catch (error) { return { ok: false, error: error.message }; }
        }, onAsset({ path, value }) {
          const item = (loaded.report.evidence?.screenshots || []).find(entry =>
            screenshotPathByAssetId.get(String(entry.assetId)) === path);
          if (item) mediaAssets[item.assetId] = { source: value };
        }
      });
      render(workspace.state());
      if (message.textContent === loadingMessage) {
        message.textContent = result.missingPaths.length
          ? t("review.openedPartial") : "";
      }
    }
    const persistentDisclosures = [".report-more-fields", ".reproduction-editor",
      ".technical-details", ".additional-evidence", ".screenshot-editor"];
    let issuePreviewState = null;
    // Rebuilding the report keeps the focused field, its caret and any text typed into it
    // that has not been committed yet; the field commits it when the user leaves it.
    function captureFocus() {
      const active = document.activeElement;
      if (!active || !container.contains(active)) return null;
      const selector = active.id ? `#${CSS.escape(active.id)}` : active.dataset.focusKey
        ? `[data-focus-key="${CSS.escape(active.dataset.focusKey)}"]` : null;
      if (!selector) return null;
      const editable = active.tagName === "TEXTAREA" ||
        (active.tagName === "INPUT" && active.type === "text");
      return { selector, editable, value: active.value, start: active.selectionStart,
        end: active.selectionEnd, scrollTop: active.scrollTop };
    }
    function restoreFocus(saved) {
      const next = saved && container.querySelector(saved.selector);
      if (!next) return;
      if (saved.editable && next.value !== saved.value) {
        const committed = next.value;
        next.value = saved.value;
        let changed = false;
        next.addEventListener("change", () => { changed = true; }, { once: true });
        next.addEventListener("blur", () => {
          if (!changed && next.value !== committed) next.dispatchEvent(new Event("change"));
        }, { once: true });
      }
      next.focus({ preventScroll: true });
      if (saved.editable) {
        try { next.setSelectionRange(saved.start, saved.end); } catch { /* not a text field */ }
        next.scrollTop = saved.scrollTop;
      }
    }
    let renderedRevision = null;
    const viewOptions = () => ({ mediaAssets, locale: currentUiLocale,
        onRetrySave: action(async () => { await workspace.flush(); }),
        onCopy: value => copyText(value).then(copied => {
          if (copied) message.textContent = t("technical.copied");
        }),
        onEdit(name, value) {
          if (["title", "summary", "severity", "category"].includes(name)) {
            workspace.edit({ summary: { [name]: value } });
          } else if (name === "notes") workspace.edit({ notes: value ? [{
            noteId: "workspace-note", text: value
          }] : [] });
          else workspace.edit({ [name]: value });
        },
        onSelectPrimaryError: id => workspace.selectPrimaryError(id)
        ,onEditReproductionStep: (id, patch) =>
          workspace.updateReproductionStep(id, patch)
        ,onAddReproductionStep: instruction => workspace.addReproductionStep(instruction)
        ,onSetScreenshotVisibility: (assetId, visibility) =>
          workspace.updateScreenshotVisibility(assetId, visibility)
        });
    const render = state => {
      const openDisclosures = persistentDisclosures.filter(selector =>
        container.querySelector(selector)?.open);
      const focus = captureFocus();
      const scrollY = window.scrollY;
      const result = globalThis.T9TechnicalReportWorkspaceView.render(
        container, state, viewOptions());
      renderedRevision = state.revision;
      openDisclosures.forEach(selector => {
        const disclosure = container.querySelector(selector);
        if (disclosure) disclosure.open = true;
      });
      restoreFocus(focus);
      if (window.scrollY !== scrollY) window.scrollTo(0, scrollY);
      // Sending is the main action once the report is complete and states what was expected;
      // until then it stays available without being emphasised.
      document.getElementById("emailReport").classList.toggle("is-ready", Boolean(result.ready &&
        String(state.report?.expectedResult?.text || "").trim()));
      return result;
    };
    // Changes are drawn after the browser has moved focus and finished a click, so a field
    // or button the user is reaching for is not replaced underneath them.
    let pendingState = null;
    let renderTimer = null;
    let pointerHeld = false;
    const drawPending = () => {
      renderTimer = null;
      if (pointerHeld || !pendingState) return;
      const state = pendingState; pendingState = null;
      if (state.revision === renderedRevision && globalThis.T9TechnicalReportWorkspaceView
        .renderSaveState(container, state, viewOptions())) return;
      render(state);
    };
    const scheduleRender = state => {
      pendingState = state;
      if (!renderTimer) renderTimer = setTimeout(drawPending, 0);
    };
    document.addEventListener("pointerdown", () => { pointerHeld = true; }, true);
    const releasePointer = () => {
      pointerHeld = false;
      if (pendingState && !renderTimer) renderTimer = setTimeout(drawPending, 0);
    };
    ["pointerup", "pointercancel"].forEach(type =>
      document.addEventListener(type, releasePointer, true));
    window.addEventListener("blur", releasePointer);
    let autosaveTimer = null;
    const renderAndAutosave = state => {
      if (state.saveState === "unsaved") issuePreviewState = null;
      scheduleRender(state);
      if (state.saveState !== "unsaved") return;
      clearTimeout(autosaveTimer);
      autosaveTimer = setTimeout(() => workspace.save().catch(error => {
        message.textContent = t(error.message);
      }), 600);
    };
    workspace.subscribe(renderAndAutosave); render(workspace.state());
    if (query.get("new") === "1") {
      const title = document.getElementById("technical-report-title");
      const expected = document.getElementById("technical-report-expectedResult");
      const firstMissing = !title?.value.trim() ? title :
        (!expected?.value.trim() ? expected : null);
      firstMissing?.focus();
    }
    document.getElementById("closeReport").addEventListener("click", action(async () => {
      clearTimeout(autosaveTimer); await workspace.flush(); window.close();
    }));
    document.getElementById("undoReport").addEventListener("click", workspace.undo);
    document.getElementById("redoReport").addEventListener("click", workspace.redo);
    const regenerateDialog = document.getElementById("regenerateDialog");
    document.getElementById("regenerateReport").addEventListener("click", () => {
      if (!regenerateDialog.open) regenerateDialog.showModal();
    });
    document.getElementById("cancelRegenerate").addEventListener("click", () =>
      regenerateDialog.close());
    document.getElementById("confirmRegenerate").addEventListener("click", action(async () => {
      const button = document.getElementById("confirmRegenerate"); button.disabled = true;
      try {
        await workspace.flush();
        await send({ type: "T9_REGENERATE_BUG_REPORT", bugReportId });
        location.reload();
      } finally { button.disabled = false; }
    }));
    document.getElementById("downloadMarkdown").addEventListener("click", action(() =>
      busy(t("technical.waitingForDownload"), async () => {
        await download(await workspace.exportMarkdown(), `${bugReportId}.md`);
        message.textContent = t("technical.markdownExported");
      })));
    document.getElementById("copySummary").addEventListener("click", action(async () => {
      // Built from the current state, so the copy happens within the click.
      const summary = globalThis.T9BugReportTextExport.summary(workspace.state().document);
      if (await copyText(summary.text, summary.html)) {
        message.textContent = t("technical.summaryCopied");
      }
    }));
    let issuePreviewRequestId = 0;
    let issuePreviewPending = null;
    async function generateIssuePreview() {
      const requestId = ++issuePreviewRequestId;
      const pending = (async () => {
        await workspace.flush();
        const snapshot = workspace.state();
        if (snapshot.saveState !== "saved") {
          issuePreviewState = null;
          throw new Error(t("technical.requestFailed"));
        }
        const reportSnapshot = JSON.stringify(snapshot.report);
        const generated = await send({ type: "T9_BUILD_ISSUE_PACKAGE", bugReportId,
          options: { includeTelemetry: false, includeCallStack,
            includeTechnicalDetails: false } });
        if (requestId !== issuePreviewRequestId) return null;
        if (JSON.stringify(workspace.state().report) !== reportSnapshot) {
          issuePreviewState = null;
          throw new Error(t("technical.requestFailed"));
        }
        issuePreviewState = generated;
        return generated;
      })();
      issuePreviewPending = pending;
      const generated = await pending;
      return requestId === issuePreviewRequestId ? generated :
        issuePreviewPending || issuePreviewState;
    }
    async function loadIssuePackageAttachments() {
      const attachments = issuePreviewState?.issuePackage?.attachments || [];
      const pathByAssetId = new Map(attachments.flatMap(attachment => {
        const path = screenshotPathByAssetId.get(String(attachment.assetId));
        return path ? [[attachment.assetId, path]] : [];
      }));
      const imagesByPath = new Map();
      const requestedPaths = [...new Set(pathByAssetId.values())];
      const result = requestedPaths.length
        ? await globalThis.T9ScreenshotBatchLoader.load({
          sessionId: loaded.report.recordingId, screenshotPaths: requestedPaths,
          batchSize: 10, continueOnError: true, send, onAsset({ path, value }) {
            imagesByPath.set(path, value);
          }
        }) : { missingPaths: [] };
      const offlineAttachments = attachments.map(attachment => {
        const path = pathByAssetId.get(attachment.assetId);
        return { ...attachment, dataUrl: path ? imagesByPath.get(path) || null : null };
      });
      const missingCount = offlineAttachments.filter(item => !item.dataUrl).length;
      return { attachments: offlineAttachments.filter(item => item.dataUrl),
        missingCount: Math.max(missingCount, result.missingPaths.length) };
    }
    let preparedEmail = null;
    const outlookClient = globalThis.T9OutlookDraft.create({ identity: chrome.identity,
      storage: chrome.storage.local, sessionStorage: chrome.storage.session, fetcher: fetch,
      getAccount: async () => {
        const status = await send({ type: "T9_CONSULTANT_LICENSE_STATUS" });
        return status.signedIn ? status.profile || {} : {};
      },
      clientId: globalThis.T9TenantLicenseConfig.consultant.clientId });
    async function prepareEmail() {
      if (!supportEmail) throw new Error(globalThis.T9UiI18n.translateStaticText(
        "Add a support email address in settings first.", currentUiLocale));
      await generateIssuePreview();
      const imageResult = await loadIssuePackageAttachments();
      const selectedImages = imageResult.attachments;
      if (imageResult.missingCount) message.textContent =
        t("technical.someImagesMissing");
      const pdf = await globalThis.T9BugReportPdf.create(issuePreviewState.issuePackage,
        selectedImages);
      const pdfBase64 = globalThis.T9BugReportPdf.base64(pdf.bytes);
      const attachments = [{ fileName: `${reportFileName(currentUiLocale)}.pdf`,
        mediaType: "application/pdf", base64: pdfBase64 }];
      const draft = globalThis.T9BugReportEmailDraft.build(
        issuePreviewState.issuePackage, "", {
          to: supportEmail, locale: currentUiLocale, attachments });
      return { draft, imageResult, reportKey: bugReportId + ":" +
        issuePreviewState.issuePackage.sourceRevision };
    }
    async function emailReport() {
      const { draft, imageResult } = preparedEmail || await prepareEmail();
      const result = await download(draft.content, draft.fileName,
        "message/rfc822;charset=utf-8", true);
      message.textContent = [globalThis.T9UiI18n.translateStaticText(
        result.opened
          ? "Email draft created with the report attached."
          : "Email draft saved. Open the downloaded .eml file to continue.",
        currentUiLocale), imageResult.missingCount
          ? t("technical.someImagesMissing") : ""].filter(Boolean).join(" ");
    }
    const emailChoice = document.getElementById("emailChoice");
    const outlookButton = document.getElementById("outlookDraft");
    const outlookStatus = document.getElementById("outlookStatus");
    const outlookLink = document.getElementById("outlookLink");
    const sendButton = document.getElementById("sendDirect");
    const sendConfirm = document.getElementById("sendConfirm");
    const confirmSend = document.getElementById("confirmSend");
    const cancelSend = document.getElementById("cancelSend");
    const recipientFields = [document.getElementById("sendConfirmTo"),
      document.getElementById("sendConfirmCc")];
    // Recipient suggestions: addresses this browser has sent reports to, kept only in local
    // storage, and people from Microsoft 365 once the user has approved People.Read.
    const RECENT_RECIPIENTS = "t9RecentRecipientsV1";
    const suggestionList = document.getElementById("recipientSuggestions");
    const peopleSearch = document.getElementById("peopleSearch");
    const searchPeopleButton = document.getElementById("searchPeople");
    let peopleState = "unknown"; // unknown, ready, signIn or unavailable
    let suggestions = [], activeSuggestion = -1, suggestionField = null, suggestionTimer = 0;
    async function recentRecipients() {
      try {
        const stored = (await chrome.storage.local.get(RECENT_RECIPIENTS))[RECENT_RECIPIENTS];
        return Array.isArray(stored) ? stored.filter(item => typeof item?.address === "string") : [];
      } catch { return []; }
    }
    async function rememberRecipients(list) {
      const used = new Set(list.map(address => address.toLowerCase()));
      const kept = (await recentRecipients()).filter(item => !used.has(item.address.toLowerCase()));
      const now = Date.now();
      try {
        await chrome.storage.local.set({ [RECENT_RECIPIENTS]: [...list.map(address =>
          ({ address, usedAt: now })), ...kept].slice(0, 20) });
      } catch { /* Suggestions are a convenience; the email has already been sent. */ }
    }
    const typedTerm = field => field.value.split(/[\s,;]+/u).pop() || "";
    function closeSuggestions() {
      clearTimeout(suggestionTimer);
      suggestions = []; activeSuggestion = -1;
      suggestionList.hidden = true;
      suggestionList.replaceChildren();
      recipientFields.forEach(field => {
        field.setAttribute("aria-expanded", "false");
        field.removeAttribute("aria-activedescendant");
      });
    }
    function showSuggestions(field, items) {
      suggestions = items; activeSuggestion = -1;
      if (!items.length) { closeSuggestions(); return; }
      suggestionField = field;
      field.parentElement.append(suggestionList);
      suggestionList.replaceChildren(...items.map((item, index) => {
        const option = document.createElement("li");
        option.id = "recipientSuggestion" + index;
        option.setAttribute("role", "option");
        option.setAttribute("aria-selected", "false");
        if (item.name && item.name.toLowerCase() !== item.address.toLowerCase()) {
          const name = document.createElement("span");
          name.textContent = item.name;
          const address = document.createElement("span");
          address.className = "suggestion-address";
          address.textContent = item.address;
          option.append(name, address);
        } else option.textContent = item.address;
        // Keep focus in the field so that the choice does not close the list first.
        option.addEventListener("mousedown", event => event.preventDefault());
        option.addEventListener("click", () => chooseSuggestion(index));
        return option;
      }));
      suggestionList.hidden = false;
      field.setAttribute("aria-expanded", "true");
    }
    function markSuggestion(index) {
      activeSuggestion = index;
      [...suggestionList.children].forEach((option, position) => {
        option.setAttribute("aria-selected", String(position === index));
      });
      const option = suggestionList.children[index];
      suggestionField.setAttribute("aria-activedescendant", option.id);
      option.scrollIntoView({ block: "nearest" });
    }
    function chooseSuggestion(index) {
      const field = suggestionField, item = suggestions[index];
      if (!field || !item) return;
      const term = typedTerm(field);
      field.value = field.value.slice(0, field.value.length - term.length) + item.address + "; ";
      field.removeAttribute("aria-invalid");
      closeSuggestions();
      field.focus();
    }
    async function suggestRecipients(field) {
      const term = typedTerm(field).toLowerCase();
      if (!term) { closeSuggestions(); return; }
      const present = new Set(recipientFields.flatMap(input =>
        globalThis.T9OutlookDraft.addresses(input.value).valid.map(address => address.toLowerCase())));
      const fits = item => !present.has(item.address.toLowerCase()) &&
        (item.address.toLowerCase().includes(term) || item.name?.toLowerCase().includes(term));
      const recent = (await recentRecipients()).filter(fits).slice(0, 5);
      if (typedTerm(field).toLowerCase() !== term) return;
      showSuggestions(field, recent);
      if (term.length < 2 || ["signIn", "unavailable"].includes(peopleState)) return;
      clearTimeout(suggestionTimer);
      suggestionTimer = setTimeout(async () => {
        let found;
        try { found = await outlookClient.people(term); }
        catch { peopleState = "unavailable"; return; }
        if (found === null) { peopleState = "signIn"; peopleSearch.hidden = false; return; }
        peopleState = "ready";
        if (document.activeElement !== field || typedTerm(field).toLowerCase() !== term) return;
        const seen = new Set(recent.map(item => item.address.toLowerCase()));
        showSuggestions(field, [...recent, ...found.filter(item => fits(item) &&
          !seen.has(item.address.toLowerCase()))]);
      }, 250);
    }
    recipientFields.forEach(field => {
      field.addEventListener("input", () => { suggestRecipients(field); });
      field.addEventListener("blur", closeSuggestions);
      field.addEventListener("keydown", event => {
        if (suggestionList.hidden || suggestionField !== field) return;
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          const step = event.key === "ArrowDown" ? 1 : -1;
          markSuggestion((activeSuggestion + step + suggestions.length) % suggestions.length);
        } else if (event.key === "Enter" && activeSuggestion >= 0) {
          event.preventDefault();
          chooseSuggestion(activeSuggestion);
        } else if (event.key === "Escape") {
          // Close only the list; the dialog stays open.
          event.preventDefault();
          event.stopPropagation();
          closeSuggestions();
        }
      });
    });
    // Signing in for People.Read happens only from this button, never while typing.
    searchPeopleButton.addEventListener("click", async () => {
      searchPeopleButton.disabled = true;
      try {
        const ready = await outlookClient.people("", { interactive: true });
        if (ready === null) throw { outlookCode: "consent" };
        peopleState = "ready";
        peopleSearch.hidden = true;
        outlookStatus.textContent = "";
        const field = recipientFields.find(input => typedTerm(input)) || recipientFields[0];
        field.focus();
        suggestRecipients(field);
      } catch {
        outlookStatus.textContent = t("outlook.peopleFailed");
      } finally { searchPeopleButton.disabled = false; }
    });
    const emailButtons = [outlookButton, document.getElementById("emailFile"), sendButton];
    let pendingSend = null;
    const closeSendConfirm = () => { pendingSend = null; sendConfirm.hidden = true; closeSuggestions(); };
    document.getElementById("emailReport").addEventListener("click", () => {
      if (!emailChoice.open) {
        preparedEmail = null;
        closeSendConfirm();
        outlookStatus.textContent = "";
        outlookLink.hidden = true;
        emailChoice.showModal();
      }
    });
    const sendMessageKey = code => ({ consent: "outlook.sendConsent",
      uncertain: "outlook.sendUncertain", size: "outlook.size",
      configuration: "outlook.configuration" })[code] || "outlook.sendFailed";
    // Sending cannot be undone, so the email is prepared first and shown with its recipient,
    // subject and attachment; it is sent only from that confirmation.
    sendButton.addEventListener("click", async () => {
      emailButtons.forEach(button => { button.disabled = true; });
      closeSendConfirm();
      outlookLink.hidden = true;
      outlookStatus.textContent = t("technical.creatingPdf");
      try {
        // Request only Graph's exact origin, directly from the explicit user action.
        const permitted = await chrome.permissions.request({ origins: ["https://graph.microsoft.com/*"] });
        if (!permitted) throw { outlookCode: "consent" };
        const prepared = await prepareEmail();
        const attachment = prepared.draft.attachments[0];
        const size = new Intl.NumberFormat(currentUiLocale, { maximumFractionDigits: 0 })
          .format(attachment.base64.length * 3 / 4 / 1024);
        recipientFields.forEach(field => { field.removeAttribute("aria-invalid"); });
        recipientFields[0].value = prepared.draft.to;
        recipientFields[1].value = "";
        document.getElementById("sendConfirmSubject").textContent = prepared.draft.subject;
        document.getElementById("sendConfirmAttachment").textContent =
          `${attachment.fileName} (${size} kB)`;
        pendingSend = prepared;
        sendConfirm.hidden = false;
        outlookStatus.textContent = prepared.imageResult.missingCount
          ? t("technical.someImagesMissing") : "";
        confirmSend.focus();
      } catch (error) {
        outlookStatus.textContent = error?.outlookCode
          ? t(sendMessageKey(error.outlookCode)) : t(error?.message || String(error));
      } finally {
        emailButtons.forEach(button => { button.disabled = false; });
      }
    });
    cancelSend.addEventListener("click", () => {
      closeSendConfirm();
      outlookStatus.textContent = "";
      sendButton.focus();
    });
    confirmSend.addEventListener("click", async () => {
      if (!pendingSend) return;
      const sending = pendingSend;
      // The recipients are checked here so that a typing error is shown at its field and
      // nothing is sent until every address is valid.
      const [to, cc] = recipientFields.map(field => globalThis.T9OutlookDraft.addresses(field.value));
      recipientFields.forEach(field => { field.removeAttribute("aria-invalid"); });
      const wrong = !to.valid.length || to.invalid.length ? 0 : cc.invalid.length ? 1 : -1;
      if (wrong >= 0) {
        const field = recipientFields[wrong];
        const invalid = [to, cc][wrong].invalid;
        field.setAttribute("aria-invalid", "true");
        outlookStatus.textContent = invalid.length
          ? t("outlook.invalidRecipient").replace("{address}", invalid.join(", "))
          : t("outlook.missingRecipient");
        field.focus();
        return;
      }
      const controls = [...emailButtons, confirmSend, cancelSend, searchPeopleButton, ...recipientFields];
      controls.forEach(control => { control.disabled = true; });
      outlookStatus.textContent = t("outlook.sending");
      try {
        await outlookClient.send({ reportKey: sending.reportKey, email: { ...sending.draft,
          to: to.valid.join("; "), cc: cc.valid.join("; ") } });
        closeSendConfirm();
        await rememberRecipients([...to.valid, ...cc.valid]);
        const sent = t("outlook.sent").replace("{to}", [...to.valid, ...cc.valid].join(", "));
        outlookStatus.textContent = sent;
        message.textContent = [sent, sending.imageResult.missingCount
          ? t("technical.someImagesMissing") : ""].filter(Boolean).join(" ");
        sendButton.focus();
      } catch (error) {
        // An unconfirmed send may have gone out; the confirmation closes so that it is not
        // sent again by a second click before Sent Items has been checked.
        if (error?.outlookCode === "uncertain") closeSendConfirm();
        outlookStatus.textContent = t(sendMessageKey(error?.outlookCode));
      } finally {
        controls.forEach(control => { control.disabled = false; });
      }
    });
    document.getElementById("closeEmailChoice").addEventListener("click", () => emailChoice.close());
    document.getElementById("emailFile").addEventListener("click", async () => {
      const button = document.getElementById("emailFile");
      button.disabled = true; outlookButton.disabled = true;
      outlookStatus.textContent = t("technical.creatingEmail");
      try {
        await busy(t("technical.creatingEmail"), emailReport);
        outlookStatus.textContent = "";
        emailChoice.close();
      } catch (error) {
        outlookStatus.textContent = t(error.message || String(error));
      } finally { button.disabled = false; outlookButton.disabled = false; }
    });
    outlookButton.addEventListener("click", async () => {
      outlookButton.disabled = true;
      document.getElementById("emailFile").disabled = true;
      outlookStatus.textContent = t("outlook.working");
      try {
        // Request only Graph's exact origin, directly from the explicit user action.
        const permitted = await chrome.permissions.request({ origins: ["https://graph.microsoft.com/*"] });
        if (!permitted) throw { outlookCode: "consent" };
        preparedEmail = await prepareEmail();
        const result = await outlookClient.draft({ reportKey: preparedEmail.reportKey,
          email: preparedEmail.draft });
        outlookLink.href = result.webLink;
        outlookLink.hidden = false;
        outlookStatus.textContent = t(result.recovery ? "outlook.uncertain" : "outlook.created");
        if (preparedEmail.imageResult.missingCount) outlookStatus.textContent += " " + t("technical.someImagesMissing");
        try { await chrome.tabs.create({ url: result.webLink }); }
        catch { /* The verified link remains available if the tab could not open. */ }
      } catch (error) {
        const key = ["consent", "uncertain", "size", "configuration"].includes(error.outlookCode)
          ? error.outlookCode : "failed";
        outlookStatus.textContent = t("outlook." + key);
      } finally {
        outlookButton.disabled = false;
        document.getElementById("emailFile").disabled = false;
      }
    });
    document.getElementById("exportPdf").addEventListener("click", action(() =>
      busy(t("technical.creatingPdf"), async () => {
        await generateIssuePreview();
        const imageResult = await loadIssuePackageAttachments();
        const pdf = await globalThis.T9BugReportPdf.create(issuePreviewState.issuePackage,
          imageResult.attachments);
        const name = issuePreviewState.issuePackage.title.replace(/[^\p{L}\p{N}._-]+/gu, "-")
          .replace(/^-+|-+$/gu, "").slice(0, 70) ||
          reportFileName(workspace.state().document.documentLanguage);
        await download(pdf.bytes, `${name}.pdf`, "application/pdf");
        message.textContent = [globalThis.T9UiI18n.translateStaticText(
          "PDF-rapporten har sparats.", currentUiLocale), imageResult.missingCount
          ? t("technical.someImagesMissing") : ""].filter(Boolean).join(" ");
      })));
    void loadReportScreenshots();
  }
  async function initialize() {
    try {
      const response = await send({ type: "T9_GET_SETTINGS" });
      currentUiLocale = globalThis.T9UiI18n.apply(response?.settings?.uiLocale);
      supportEmail = String(response?.settings?.supportEmail || "").trim();
    } catch {
      currentUiLocale = globalThis.T9UiI18n.apply(currentUiLocale);
    }
    globalThis.T9UiI18n.observe(() => currentUiLocale);
    document.title = globalThis.T9UiI18n.translateStaticText(
      "Technical Bug Report", currentUiLocale);
    await start();
  }
  initialize().catch(error => { message.textContent = t(error.message); });
})();
