(() => {
  "use strict";
  const query = new URLSearchParams(location.search);
  const bugReportId = query.get("bugReportId");
  const container = document.getElementById("technicalReport");
  const message = document.getElementById("workspaceMessage");
  let currentUiLocale = globalThis.T9UiI18n.DEFAULT_LOCALE;
  let supportEmail = "";
  const t = key => globalThis.T9UiI18n.translate(key, currentUiLocale);
  const tf = (key, values) => globalThis.T9UiI18n.format(
    key, values, currentUiLocale);
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
        ? t("technical.issueSubmissionTimeout") : error.message || String(error);
      message.textContent = error.uncertain
        ? `${globalThis.T9UiI18n.translateStaticText(
          "The destination may have created the issue. Check before retrying.",
          currentUiLocale)} ${detail}` : detail;
    }
  };
  function download(text, filename, type = "text/markdown;charset=utf-8", open = false) {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    return send({ type: "T9_DOWNLOAD_FILE", url, filename, open }).finally(() =>
      URL.revokeObjectURL(url));
  }
  async function start() {
    if (!bugReportId) throw new Error(t("technical.missingReportId"));
    const loaded = await send({ type: "T9_LOAD_BUG_REPORT", bugReportId });
    if (!loaded.report) throw new Error(t("technical.reportNotFound"));
    const session = await send({ type: "T9_GET_SESSION_DATA",
      sessionId: loaded.report.recordingId, includeScreenshots: false });
    const callStackInput = document.getElementById("issueIncludeCallStack");
    const hasCallStack = (session.bcErrorEvidence || []).some(item =>
      String(item.rawCallStack || "").trim());
    callStackInput.checked = hasCallStack;
    callStackInput.disabled = !hasCallStack;
    document.getElementById("issueCallStackAvailability").textContent = hasCallStack
      ? "" : `— ${t("technical.callStackUnavailable")}`;
    const store = { save: report => send({ type: "T9_SAVE_BUG_REPORT", report })
      .then(response => response.report) };
    const workspace = globalThis.T9TechnicalReportWorkspace.create({
      report: loaded.report, errorEvidence: session.bcErrorEvidence, store
    });
    const issueConfiguration = (await send({
      type: "T9_GET_ISSUE_CONFIGURATION" })).configuration;
    const setValue = (id, value) => { const element = document.getElementById(id);
      if (element.type === "checkbox") element.checked = Boolean(value);
      else element.value = Array.isArray(value) ? value.join(", ") : value || ""; };
    for (const [id, value] of Object.entries({ adoEnabled: issueConfiguration.azureDevOps?.enabled,
      adoOrganization: issueConfiguration.azureDevOps?.organization,
      adoProject: issueConfiguration.azureDevOps?.project,
      adoWorkItemType: issueConfiguration.azureDevOps?.workItemType || "Bug",
      adoAreaPath: issueConfiguration.azureDevOps?.areaPath,
      adoIterationPath: issueConfiguration.azureDevOps?.iterationPath,
      adoTags: issueConfiguration.azureDevOps?.tags,
      adoTenantId: issueConfiguration.azureDevOps?.tenantId,
      adoClientId: issueConfiguration.azureDevOps?.clientId,
      adoScope: issueConfiguration.azureDevOps?.scope ||
        "499b84ac-1321-427f-aa17-267ca6975798/.default",
      githubEnabled: issueConfiguration.github?.enabled,
      githubRepository: issueConfiguration.github?.repository,
      githubLabels: issueConfiguration.github?.labels,
      githubBrokerUrl: issueConfiguration.github?.brokerUrl,
      githubTenantId: issueConfiguration.github?.tenantId,
      githubClientId: issueConfiguration.github?.clientId,
      githubScope: issueConfiguration.github?.scope })) setValue(id, value);
    setValue("issueProvider", issueConfiguration.defaultProvider);
    const csv = id => document.getElementById(id).value.split(",")
      .map(value => value.trim()).filter(Boolean);
    const issueConfigurationFromForm = () => ({
      defaultProvider: document.getElementById("issueProvider").value,
      azureDevOps: { enabled: document.getElementById("adoEnabled").checked,
        organization: document.getElementById("adoOrganization").value,
        project: document.getElementById("adoProject").value,
        workItemType: document.getElementById("adoWorkItemType").value,
        areaPath: document.getElementById("adoAreaPath").value,
        iterationPath: document.getElementById("adoIterationPath").value,
        tags: csv("adoTags"), tenantId: document.getElementById("adoTenantId").value,
        clientId: document.getElementById("adoClientId").value,
        scope: document.getElementById("adoScope").value },
      github: { enabled: document.getElementById("githubEnabled").checked,
        repository: document.getElementById("githubRepository").value,
        labels: csv("githubLabels"), brokerUrl:
          document.getElementById("githubBrokerUrl").value,
        tenantId: document.getElementById("githubTenantId").value,
        clientId: document.getElementById("githubClientId").value,
        scope: document.getElementById("githubScope").value } });
    async function requestIssuePermission(configuration) {
      const origins = [];
      if (configuration.azureDevOps.enabled && configuration.azureDevOps.organization) {
        origins.push("https://dev.azure.com/*");
      }
      if (configuration.github.enabled && configuration.github.brokerUrl) {
        origins.push(`${new URL(configuration.github.brokerUrl).origin}/*`);
      }
      if (origins.length && !await chrome.permissions.request({ origins })) {
        throw new Error("Permission for the configured issue destination was not granted.");
      }
    }
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
    const render = state => {
      const openDisclosures = persistentDisclosures.filter(selector =>
        container.querySelector(selector)?.open);
      const result = globalThis.T9TechnicalReportWorkspaceView.render(
        container, state, { mediaAssets, locale: currentUiLocale,
        onRetrySave: action(async () => { await workspace.flush(); }),
        onCopy: value => navigator.clipboard.writeText(value),
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
        ,onSetScreenshotVisibility: (assetId, visibility) =>
          workspace.updateScreenshotVisibility(assetId, visibility)
        });
      openDisclosures.forEach(selector => {
        const disclosure = container.querySelector(selector);
        if (disclosure) disclosure.open = true;
      });
      return result;
    };
    let autosaveTimer = null;
    const renderAndAutosave = state => {
      if (state.saveState === "unsaved") issuePreviewState = null;
      render(state);
      if (state.saveState !== "unsaved") return;
      clearTimeout(autosaveTimer);
      autosaveTimer = setTimeout(() => workspace.save().catch(error => {
        message.textContent = error.message;
      }), 600);
    };
    workspace.subscribe(renderAndAutosave); renderAndAutosave(workspace.state());
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
    document.getElementById("regenerateReport").addEventListener("click", action(async () => {
      const confirmation = currentUiLocale === "sv-SE"
        ? "Generera om hela rapporten från inspelningen? Manuella stegändringar och bildval ersätts. Titel, allvarlighetsgrad och förväntat resultat behålls."
        : "Regenerate the report from the recording? Manual step edits and image selections will be replaced. Title, severity and expected result are retained.";
      if (!window.confirm(confirmation)) return;
      const button = document.getElementById("regenerateReport"); button.disabled = true;
      try {
        await workspace.flush();
        await send({ type: "T9_REGENERATE_BUG_REPORT", bugReportId });
        location.reload();
      } finally { button.disabled = false; }
    }));
    document.getElementById("downloadMarkdown").addEventListener("click", action(async () => {
      await download(await workspace.exportMarkdown(), `${bugReportId}.md`);
      message.textContent = t("technical.markdownExported");
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
          options: { includeTelemetry: document.getElementById(
            "issueIncludeTelemetry").checked,
            includeCallStack: document.getElementById("issueIncludeCallStack").checked,
            includeTechnicalDetails: document.getElementById(
              "issueIncludeTechnical").checked } });
        if (requestId !== issuePreviewRequestId) return null;
        if (JSON.stringify(workspace.state().report) !== reportSnapshot) {
          issuePreviewState = null;
          throw new Error(t("technical.requestFailed"));
        }
        issuePreviewState = generated;
        document.getElementById("issueTitle").textContent = issuePreviewState.issuePackage.title;
        document.getElementById("issueDescription").textContent = issuePreviewState.markdown;
        const list = document.getElementById("issueAttachments"); list.replaceChildren();
        for (const attachment of issuePreviewState.issuePackage.attachments) {
          const item = document.createElement("li");
          item.textContent = `${attachment.fileName} — ${attachment.role}`; list.append(item);
        }
        const pkg = issuePreviewState.issuePackage;
        const included = t("technical.included");
        const excluded = t("technical.excluded");
        document.getElementById("issueTransmissionSummary").textContent = [
          `${t("technical.destination")}: ${document.getElementById(
            "issueProvider").value || t("technical.offlineOnly")}`,
          `${t("technical.telemetry")}: ${pkg.inclusion.telemetry ? included : excluded}`,
          `${t("technical.callStack")}: ${pkg.inclusion.callStack ? included : excluded}`,
          `${t("technical.technicalDetails")}: ${pkg.inclusion.technicalDetails
            ? included : excluded}`,
          `${t("technical.attachments")}: ${pkg.attachments.length}`,
          `${t("technical.sensitiveCategories")}: ${pkg.privacy.categories.join(", ")}`
        ].join(" · ");
        document.getElementById("issueResult").textContent =
          issuePreviewState.existingReferences.length ?
            "Warning: this report already has an external issue reference." : "Package is current.";
        return generated;
      })();
      issuePreviewPending = pending;
      const generated = await pending;
      return requestId === issuePreviewRequestId ? generated :
        issuePreviewPending || issuePreviewState;
    }
    function updateShareUi() {
      const provider = document.getElementById("issueProvider").value;
      const external = Boolean(provider);
      document.getElementById("issueConsentRow").hidden = !external;
      document.getElementById("issueDuplicateRow").hidden = !external;
      document.getElementById("adoConfiguration").hidden =
        provider !== "azure-devops";
      document.getElementById("githubConfiguration").hidden =
        provider !== "github";
      document.getElementById("shareReport").textContent = external
        ? globalThis.T9UiI18n.translateStaticText("Create Issue", currentUiLocale)
        : globalThis.T9UiI18n.translateStaticText("Download report package",
          currentUiLocale);
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
    document.getElementById("issueProvider").addEventListener("change", action(async () => {
      issuePreviewState = null; updateShareUi(); await generateIssuePreview();
    }));
    for (const id of ["issueIncludeTelemetry", "issueIncludeCallStack",
      "issueIncludeTechnical"]) {
      document.getElementById(id).addEventListener("change", action(async () => {
        issuePreviewState = null; await generateIssuePreview();
      }));
    }
    document.getElementById("saveIssueConfiguration").addEventListener("click", action(async () => {
      const configuration = issueConfigurationFromForm();
      await requestIssuePermission(configuration);
      await send({ type: "T9_SAVE_ISSUE_CONFIGURATION", configuration });
      document.getElementById("issueResult").textContent =
        "Public destination configuration saved. No token or secret was stored.";
    }));
    const testIssueConnection = provider => action(async () => {
      const configuration = issueConfigurationFromForm(); await requestIssuePermission(configuration);
      await send({ type: "T9_SAVE_ISSUE_CONFIGURATION", configuration });
      const response = await send({ type: "T9_TEST_ISSUE_CONNECTION", provider });
      document.getElementById("issueResult").textContent =
        `${provider} connection: ${response.result.status || "connected"}.`;
    });
    document.getElementById("testAdoConnection").addEventListener("click",
      testIssueConnection("azure-devops"));
    document.getElementById("testGithubConnection").addEventListener("click",
      testIssueConnection("github"));
    document.getElementById("copyIssueDescription").addEventListener("click", action(async () => {
      if (!issuePreviewState) await generateIssuePreview();
      await navigator.clipboard.writeText(issuePreviewState.markdown);
      document.getElementById("issueResult").textContent =
        t("technical.issueCopied");
    }));
    async function downloadOfflinePackage() {
      if (!issuePreviewState) await generateIssuePreview();
      const imageResult = await loadIssuePackageAttachments();
      if (imageResult.missingCount) message.textContent =
        t("technical.someImagesMissing");
      const offline = { manifest: { schemaVersion: 1,
        packageId: issuePreviewState.issuePackage.packageId,
        sourceRevision: issuePreviewState.issuePackage.sourceRevision,
        files: ["bug-report.md", ...imageResult.attachments.map(item =>
          item.fileName)] }, issuePackage: issuePreviewState.issuePackage,
        bugReportMarkdown: issuePreviewState.markdown,
        attachments: imageResult.attachments };
      await download(JSON.stringify(offline, null, 2), `${bugReportId}-issue-package.json`);
      document.getElementById("issueResult").textContent = [
        t("technical.packageExported"), imageResult.missingCount
          ? t("technical.someImagesMissing") : ""
      ].filter(Boolean).join(" ");
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
      const offline = { manifest: { schemaVersion: 1,
        packageId: issuePreviewState.issuePackage.packageId,
        sourceRevision: issuePreviewState.issuePackage.sourceRevision,
        files: ["bug-report.md", ...selectedImages.map(item =>
          item.fileName)] }, issuePackage: issuePreviewState.issuePackage,
        bugReportMarkdown: issuePreviewState.markdown,
        attachments: selectedImages };
      const pdf = await globalThis.T9BugReportPdf.create(issuePreviewState.issuePackage,
        selectedImages);
      const pdfBase64 = globalThis.T9BugReportPdf.base64(pdf.bytes);
      const includeTechnicalPackage = false;
      const attachments = [{ fileName: "felrapport.pdf", mediaType: "application/pdf", base64: pdfBase64 }];
      if (includeTechnicalPackage) attachments.push({ fileName: "tekniskt-paket.zip", mediaType: "application/zip",
        base64: globalThis.T9BugReportPdf.base64(await globalThis.T9BugReportPdf.technicalZip(offline)) });
      const draft = globalThis.T9BugReportEmailDraft.build(
        issuePreviewState.issuePackage, JSON.stringify(offline, null, 2), {
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
    async function submitExternalIssue() {
      if (!document.getElementById("issueConsent").checked) throw new Error(
        t("technical.submissionConsent"));
      const provider = document.getElementById("issueProvider").value;
      if (!provider) throw new Error(t("technical.selectProvider"));
      const button = document.getElementById("shareReport"); button.disabled = true;
      const submissionControls = ["issueProvider", "issueConsent",
        "issueConfirmDuplicate", "issueIncludeTelemetry", "issueIncludeCallStack", "issueIncludeTechnical"].map(id =>
        document.getElementById(id)).filter(Boolean);
      const priorDisabledStates = submissionControls.map(control => control.disabled);
      submissionControls.forEach(control => { control.disabled = true; });
      try {
        if (!issuePreviewState) await generateIssuePreview();
        const response = await send({ type: "T9_CREATE_EXTERNAL_ISSUE", bugReportId,
          provider, issuePackage: issuePreviewState.issuePackage,
          confirmDuplicate: document.getElementById("issueConfirmDuplicate").checked });
        const reference = response.result.reference;
        const result = document.getElementById("issueResult"); result.replaceChildren();
        const attachmentFailureCount = response.result.attachmentFailures?.length || 0;
        const createdText = attachmentFailureCount
          ? tf(attachmentFailureCount === 1
            ? "technical.issueCreatedOneAttachmentFailed"
            : "technical.issueCreatedManyAttachmentsFailed",
          { id: reference.externalId, count: attachmentFailureCount })
          : tf("technical.issueCreated", { id: reference.externalId });
        result.append(document.createTextNode(createdText + " "));
        if (response.referenceSaved === false) {
          result.append(document.createTextNode(t("technical.issueReferenceNotSaved") + " "));
        }
        const safeIssueUrl = globalThis.T9ExternalIssueUrl.safe(reference.url);
        if (safeIssueUrl) {
          const link = document.createElement("a"); link.href = safeIssueUrl;
          link.target = "_blank"; link.rel = "noopener noreferrer";
          link.textContent = t("technical.openExternalIssue"); result.append(link);
        } else {
          result.append(document.createTextNode(tf(
            "technical.issueLinkUnavailable", { id: reference.externalId })));
        }
      } finally {
        button.disabled = false;
        submissionControls.forEach((control, index) => {
          control.disabled = priorDisabledStates[index];
        });
      }
    }
    document.getElementById("shareReport").addEventListener("click", action(async () => {
      if (document.getElementById("issueProvider").value) await submitExternalIssue();
      else await downloadOfflinePackage();
    }));
    const emailChoice = document.getElementById("emailChoice");
    const outlookButton = document.getElementById("outlookDraft");
    const outlookStatus = document.getElementById("outlookStatus");
    const outlookLink = document.getElementById("outlookLink");
    document.getElementById("emailReport").addEventListener("click", () => {
      if (!emailChoice.open) {
        preparedEmail = null;
        outlookStatus.textContent = "";
        outlookLink.hidden = true;
        emailChoice.showModal();
      }
    });
    document.getElementById("closeEmailChoice").addEventListener("click", () => emailChoice.close());
    document.getElementById("emailFile").addEventListener("click", action(async () => {
      const button = document.getElementById("emailFile");
      button.disabled = true;
      try { await emailReport(); emailChoice.close(); }
      finally { button.disabled = false; }
    }));
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
    document.getElementById("exportPdf").addEventListener("click", action(async () => {
      await generateIssuePreview();
      const imageResult = await loadIssuePackageAttachments();
      if (imageResult.missingCount) message.textContent = t("review.openedPartial");
      const pdf = await globalThis.T9BugReportPdf.create(issuePreviewState.issuePackage,
        imageResult.attachments);
      const name = issuePreviewState.issuePackage.title.replace(/[^\p{L}\p{N}._-]+/gu, "-").slice(0, 70) || "felrapport";
      await download(pdf.bytes, `${name}.pdf`, "application/pdf");
      message.textContent = [globalThis.T9UiI18n.translateStaticText(
        "PDF-rapporten har sparats.", currentUiLocale), imageResult.missingCount
        ? t("technical.someImagesMissing") : ""].filter(Boolean).join(" ");
    }));
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
  initialize().catch(error => { message.textContent = error.message; });
})();
