(() => {
  "use strict";
  const query = new URLSearchParams(location.search);
  const bugReportId = query.get("bugReportId");
  const container = document.getElementById("technicalReport");
  const message = document.getElementById("workspaceMessage");
  let currentUiLocale = globalThis.T9UiI18n.DEFAULT_LOCALE;
  let supportEmail = "";
  let bugReportEmailMode = "eml";
  const t = key => globalThis.T9UiI18n.translate(key, currentUiLocale);
  const tf = (key, values) => globalThis.T9UiI18n.format(
    key, values, currentUiLocale);
  const send = payload => new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(payload, response => {
      if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
      else if (!response?.ok) reject(new Error(response?.error ||
        t("technical.requestFailed")));
      else resolve(response);
    });
  });
  const action = handler => async () => {
    try { await handler(); }
    catch (error) { message.textContent = error.message || String(error); }
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
      sessionId: loaded.report.recordingId, includeScreenshots: true });
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
    const telemetryConfiguration = (await send({
      type: "T9_GET_TELEMETRY_CONFIGURATION" })).configuration;
    document.getElementById("telemetryTenantId").value = telemetryConfiguration.tenantId || "";
    document.getElementById("telemetryClientId").value = telemetryConfiguration.clientId || "";
    document.getElementById("telemetryApplicationId").value = telemetryConfiguration.applicationId || "";
    document.getElementById("telemetryEnvironment").value = telemetryConfiguration.environmentName || "";
    document.getElementById("telemetryEnabled").checked = Boolean(telemetryConfiguration.enabled);
    const configurationFromForm = () => ({
      enabled: document.getElementById("telemetryEnabled").checked,
      tenantId: document.getElementById("telemetryTenantId").value,
      clientId: document.getElementById("telemetryClientId").value,
      applicationId: document.getElementById("telemetryApplicationId").value,
      environmentName: document.getElementById("telemetryEnvironment").value
    });
    const aiConfiguration = (await send({ type: "T9_GET_AI_CONFIGURATION" })).configuration;
    for (const [id, field] of [["aiTenantId", "tenantId"], ["aiClientId", "clientId"],
      ["aiScope", "scope"], ["aiBrokerUrl", "brokerUrl"], ["aiModel", "model"]]) {
      document.getElementById(id).value = aiConfiguration[field] || "";
    }
    document.getElementById("aiEnabled").checked = Boolean(aiConfiguration.enabled);
    const aiConfigurationFromForm = () => ({
      enabled: document.getElementById("aiEnabled").checked,
      tenantId: document.getElementById("aiTenantId").value,
      clientId: document.getElementById("aiClientId").value,
      scope: document.getElementById("aiScope").value,
      brokerUrl: document.getElementById("aiBrokerUrl").value,
      model: document.getElementById("aiModel").value,
      maxInputTokens: 12000 });
    const aiPolicyFromForm = () => ({
      includeTelemetry: document.getElementById("aiIncludeTelemetry").checked,
      includeTelemetryMessages: document.getElementById(
        "aiIncludeTelemetryMessages").checked,
      includeHumanNotes: document.getElementById("aiIncludeNotes").checked });
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
    async function requestBrokerPermission(configuration) {
      const origin = `${new URL(configuration.brokerUrl).origin}/*`;
      if (!await chrome.permissions.request({ origins: [origin] })) {
        throw new Error("Permission for the configured AI broker was not granted.");
      }
    }
    const mediaAssets = {};
    (loaded.report.evidence?.screenshots || []).forEach(item => {
      const event = session.recording?.events?.find(value =>
        value.screenshotAssetId === item.assetId);
      if (event && session.screenshots?.[event.raw?.eventNo]) mediaAssets[item.assetId] = {
        source: session.screenshots[event.raw.eventNo]
      };
    });
    const persistentDisclosures = [".report-more-fields", ".reproduction-editor",
      ".technical-details", ".additional-evidence", ".screenshot-editor"];
    const render = state => {
      const openDisclosures = persistentDisclosures.filter(selector =>
        container.querySelector(selector)?.open);
      const result = globalThis.T9TechnicalReportWorkspaceView.render(
        container, state, { mediaAssets, locale: currentUiLocale,
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
    document.getElementById("copyMarkdown").addEventListener("click", async () => {
      await navigator.clipboard.writeText(await workspace.exportMarkdown({
        includeAiAnalysis: document.getElementById("includeAiExport").checked }));
      message.textContent = t("technical.reportCopied");
    });
    document.getElementById("downloadMarkdown").addEventListener("click", async () => {
      await download(await workspace.exportMarkdown({ includeAiAnalysis:
        document.getElementById("includeAiExport").checked }), `${bugReportId}.md`);
      message.textContent = t("technical.markdownExported");
    });
    document.getElementById("saveTelemetryConfig").addEventListener("click", action(async () => {
      await send({ type: "T9_SAVE_TELEMETRY_CONFIGURATION",
        configuration: configurationFromForm() });
      message.textContent = t("technical.telemetrySaved");
    }));
    document.getElementById("testTelemetry").addEventListener("click", action(async () => {
      await send({ type: "T9_SAVE_TELEMETRY_CONFIGURATION",
        configuration: configurationFromForm() });
      const response = await send({ type: "T9_TEST_TELEMETRY_CONNECTION" });
      message.textContent = tf("technical.telemetryConnection",
        { status: response.result.status });
    }));
    document.getElementById("refreshTelemetry").addEventListener("click", action(async () => {
      await workspace.flush();
      const state = workspace.state().report;
      const ids = state.businessCentralError?.errorEvidenceIds || [];
      const errorEvidenceId = state.businessCentralError?.primaryErrorEvidenceId ||
        (ids.length === 1 ? ids[0] : "");
      if (!errorEvidenceId) throw new Error(t("technical.selectPrimaryError"));
      message.textContent = t("technical.fetchingTelemetry");
      await send({ type: "T9_REFRESH_BUG_REPORT_TELEMETRY", bugReportId,
        errorEvidenceId, windowMinutes: Number(
          document.getElementById("telemetryWindow").value) });
      location.reload();
    }));
    document.getElementById("saveAiConfig").addEventListener("click", action(async () => {
      const configuration = aiConfigurationFromForm();
      if (configuration.enabled) await requestBrokerPermission(configuration);
      await send({ type: "T9_SAVE_AI_CONFIGURATION", configuration });
      message.textContent = t("technical.aiSaved");
    }));
    document.getElementById("analyzeBugReport").addEventListener("click", action(async () => {
      if (!document.getElementById("aiConsent").checked) {
        throw new Error(t("technical.aiConsent"));
      }
      await workspace.flush();
      message.textContent = t("technical.sendingAi");
      await send({ type: "T9_ANALYZE_BUG_REPORT", bugReportId,
        policy: aiPolicyFromForm() }); location.reload();
    }));
    document.getElementById("removeAiAnalysis").addEventListener("click", action(async () => {
      await send({ type: "T9_REMOVE_BUG_REPORT_AI_ANALYSIS", bugReportId });
      location.reload();
    }));
    let issuePreviewState = null;
    async function generateIssuePreview() {
      await workspace.flush();
      issuePreviewState = await send({ type: "T9_BUILD_ISSUE_PACKAGE", bugReportId,
        options: { includeTelemetry: document.getElementById(
          "issueIncludeTelemetry").checked, includeAiAnalysis:
          document.getElementById("issueIncludeAi").checked,
          includeCallStack: document.getElementById("issueIncludeCallStack").checked,
          includeTechnicalDetails: document.getElementById(
            "issueIncludeTechnical").checked } });
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
        `${t("technical.aiAnalysis")}: ${pkg.inclusion.aiAnalysis
          ? t("technical.includedLabelled") : excluded}`,
        `${t("technical.callStack")}: ${pkg.inclusion.callStack ? included : excluded}`,
        `${t("technical.technicalDetails")}: ${pkg.inclusion.technicalDetails
          ? included : excluded}`,
        `${t("technical.attachments")}: ${pkg.attachments.length}`,
        `${t("technical.sensitiveCategories")}: ${pkg.privacy.categories.join(", ")}`
      ].join(" · ");
      document.getElementById("issueResult").textContent =
        issuePreviewState.existingReferences.length ?
          "Warning: this report already has an external issue reference." : "Package is current.";
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
    document.getElementById("openIssuePreview").addEventListener("click", action(async () => {
      updateShareUi(); document.getElementById("issuePreview").showModal();
      await generateIssuePreview();
    }));
    document.getElementById("issueProvider").addEventListener("change", action(async () => {
      issuePreviewState = null; updateShareUi(); await generateIssuePreview();
    }));
    for (const id of ["issueIncludeTelemetry", "issueIncludeAi", "issueIncludeCallStack",
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
      const offline = { manifest: { schemaVersion: 1,
        packageId: issuePreviewState.issuePackage.packageId,
        sourceRevision: issuePreviewState.issuePackage.sourceRevision,
        files: ["bug-report.md", ...issuePreviewState.offlineAttachments.map(item =>
          item.fileName)] }, issuePackage: issuePreviewState.issuePackage,
        bugReportMarkdown: issuePreviewState.markdown,
        attachments: issuePreviewState.offlineAttachments };
      await download(JSON.stringify(offline, null, 2), `${bugReportId}-issue-package.json`);
      document.getElementById("issueResult").textContent =
        t("technical.packageExported");
    }
    async function reviewPdfImages() {
      const dialog = document.getElementById("pdfImagePreview");
      const list = document.getElementById("pdfImageChoices");
      list.replaceChildren();
      const choices = issuePreviewState.offlineAttachments.map((attachment, index) => {
        const figure = document.createElement("figure");
        const label = document.createElement("label");
        const check = document.createElement("input"); check.type = "checkbox"; check.checked = true;
        label.className = "screenshot-include";
        const step = issuePreviewState.issuePackage.reproduction.find(item =>
          item.reproductionStepId === attachment.sourceRef ||
          (item.screenshotAssetIds || []).includes(attachment.assetId));
        const caption = attachment.role === "error-evidence"
          ? (currentUiLocale === "sv-SE" ? "Felbild" : "Error screenshot")
          : step ? `${currentUiLocale === "sv-SE" ? "Steg" : "Step"} ${step.number}: ${step.instruction.replace(/\*\*/gu, "")}`
            : `${currentUiLocale === "sv-SE" ? "Bild" : "Image"} ${index + 1}`;
        label.append(check, document.createTextNode(caption)); figure.append(label);
        if (/^data:image\/(?:png|jpe?g);base64,/u.test(attachment.dataUrl || "")) {
          const image = document.createElement("img"); image.src = attachment.dataUrl;
          image.alt = caption; image.style.maxHeight = "240px"; figure.append(image);
        }
        list.append(figure); return { attachment, check };
      });
      if (!choices.length) {
        const empty = document.createElement("p");
        empty.textContent = currentUiLocale === "sv-SE" ? "Inga bilder finns i rapporten." : "No screenshots in this report.";
        list.append(empty);
      }
      dialog.returnValue = "";
      document.getElementById("confirmPdfImages").onclick = () => dialog.close("confirm");
      document.getElementById("cancelPdfImages").onclick = () => dialog.close("cancel");
      const closed = new Promise(resolve => dialog.addEventListener("close", resolve, { once: true }));
      dialog.showModal(); await closed;
      return dialog.returnValue === "confirm" ? choices.filter(item => item.check.checked)
        .map(item => item.attachment) : null;
    }
    async function emailReport() {
      if (!supportEmail) throw new Error(globalThis.T9UiI18n.translateStaticText(
        "Add a support email address in settings first.", currentUiLocale));
      await generateIssuePreview();
      const selectedImages = await reviewPdfImages();
      if (selectedImages === null) return;
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
      const includeTechnicalPackage = document.getElementById("includeTechnicalZip").checked;
      if (bugReportEmailMode === "windowsShare") {
        await send({ type: "T9_SHARE_BUG_REPORT_WINDOWS", payload: {
          schemaVersion: 2, action: "shareBugReportPdf",
          title: issuePreviewState.issuePackage.title,
          supportEmail, pdfBase64, includeTechnicalPackage,
          reportJson: includeTechnicalPackage ? JSON.stringify(offline) : "",
          markdown: includeTechnicalPackage ? issuePreviewState.markdown : "" } });
        message.textContent = globalThis.T9UiI18n.translateStaticText(
          "Windows-hjälparen är öppnad. Välj Dela bifogad rapport och sedan Outlook.", currentUiLocale);
        return;
      }
      const attachments = [{ fileName: "felrapport.pdf", mediaType: "application/pdf", base64: pdfBase64 }];
      if (includeTechnicalPackage) attachments.push({ fileName: "tekniskt-paket.zip", mediaType: "application/zip",
        base64: globalThis.T9BugReportPdf.base64(await globalThis.T9BugReportPdf.technicalZip(offline)) });
      const draft = globalThis.T9BugReportEmailDraft.build(
        issuePreviewState.issuePackage, JSON.stringify(offline, null, 2), {
          to: supportEmail, locale: currentUiLocale, attachments });
      const result = await download(draft.content, draft.fileName,
        "message/rfc822;charset=utf-8", true);
      message.textContent = globalThis.T9UiI18n.translateStaticText(
        result.opened
          ? "Email draft created with the report attached."
          : "Email draft saved. Open the downloaded .eml file to continue.",
        currentUiLocale);
    }
    async function submitExternalIssue() {
      if (!document.getElementById("issueConsent").checked) throw new Error(
        t("technical.submissionConsent"));
      const provider = document.getElementById("issueProvider").value;
      if (!provider) throw new Error(t("technical.selectProvider"));
      if (!issuePreviewState) await generateIssuePreview();
      const button = document.getElementById("shareReport"); button.disabled = true;
      try { const response = await send({ type: "T9_CREATE_EXTERNAL_ISSUE", bugReportId,
        provider, issuePackage: issuePreviewState.issuePackage,
        confirmDuplicate: document.getElementById("issueConfirmDuplicate").checked });
        const reference = response.result.reference;
        const result = document.getElementById("issueResult"); result.replaceChildren();
        result.append(document.createTextNode(response.result.status === "partial-success"
          ? `Issue ${reference.externalId} created; some attachments failed. `
          : `Issue ${reference.externalId} created. `));
        const url = new URL(reference.url); if (url.protocol !== "https:") throw new Error(
          "The destination returned an unsafe issue URL.");
        const link = document.createElement("a"); link.href = url.toString();
        link.target = "_blank"; link.rel = "noopener noreferrer";
        link.textContent = t("technical.openExternalIssue"); result.append(link);
      } finally { button.disabled = false; }
    }
    document.getElementById("shareReport").addEventListener("click", action(async () => {
      if (document.getElementById("issueProvider").value) await submitExternalIssue();
      else await downloadOfflinePackage();
    }));
    document.getElementById("emailReport").addEventListener("click", action(emailReport));
    document.getElementById("exportPdf").addEventListener("click", action(async () => {
      await generateIssuePreview();
      const selectedImages = await reviewPdfImages();
      if (selectedImages === null) return;
      const pdf = await globalThis.T9BugReportPdf.create(issuePreviewState.issuePackage,
        selectedImages);
      const name = issuePreviewState.issuePackage.title.replace(/[^\p{L}\p{N}._-]+/gu, "-").slice(0, 70) || "felrapport";
      await download(pdf.bytes, `${name}.pdf`, "application/pdf");
      message.textContent = globalThis.T9UiI18n.translateStaticText("PDF-rapporten har sparats.", currentUiLocale);
    }));
  }
  async function initialize() {
    try {
      const response = await send({ type: "T9_GET_SETTINGS" });
      currentUiLocale = globalThis.T9UiI18n.apply(response?.settings?.uiLocale);
      supportEmail = String(response?.settings?.supportEmail || "").trim();
      bugReportEmailMode = response?.settings?.bugReportEmailMode || "eml";
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
