(() => {
  "use strict";
  const query = new URLSearchParams(location.search);
  const bugReportId = query.get("bugReportId");
  const container = document.getElementById("technicalReport");
  const message = document.getElementById("workspaceMessage");
  const send = payload => new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(payload, response => {
      if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
      else if (!response?.ok) reject(new Error(response?.error || "Request failed"));
      else resolve(response);
    });
  });
  const action = handler => async () => {
    try { await handler(); }
    catch (error) { message.textContent = error.message || String(error); }
  };
  function download(text, filename) {
    const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    return send({ type: "T9_DOWNLOAD_FILE", url, filename }).finally(() =>
      URL.revokeObjectURL(url));
  }
  async function start() {
    if (!bugReportId) throw new Error("Bug Report ID is missing.");
    const loaded = await send({ type: "T9_LOAD_BUG_REPORT", bugReportId });
    if (!loaded.report) throw new Error("Bug Report could not be found.");
    const session = await send({ type: "T9_GET_SESSION_DATA",
      sessionId: loaded.report.recordingId, includeScreenshots: true });
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
    const render = state => globalThis.T9TechnicalReportWorkspaceView.render(
      container, state, { mediaAssets,
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
      });
    workspace.subscribe(render); render(workspace.state());
    document.getElementById("saveReport").addEventListener("click", () =>
      workspace.save().catch(error => { message.textContent = error.message; }));
    document.getElementById("undoReport").addEventListener("click", workspace.undo);
    document.getElementById("redoReport").addEventListener("click", workspace.redo);
    document.getElementById("copyMarkdown").addEventListener("click", async () => {
      await navigator.clipboard.writeText(await workspace.exportMarkdown({
        includeAiAnalysis: document.getElementById("includeAiExport").checked }));
      message.textContent = "Report copied.";
    });
    document.getElementById("downloadMarkdown").addEventListener("click", async () => {
      await download(await workspace.exportMarkdown({ includeAiAnalysis:
        document.getElementById("includeAiExport").checked }), `${bugReportId}.md`);
      message.textContent = "Markdown exported.";
    });
    document.getElementById("saveTelemetryConfig").addEventListener("click", action(async () => {
      await send({ type: "T9_SAVE_TELEMETRY_CONFIGURATION",
        configuration: configurationFromForm() });
      message.textContent = "Telemetry configuration saved. No secret or token was stored.";
    }));
    document.getElementById("testTelemetry").addEventListener("click", action(async () => {
      await send({ type: "T9_SAVE_TELEMETRY_CONFIGURATION",
        configuration: configurationFromForm() });
      const response = await send({ type: "T9_TEST_TELEMETRY_CONNECTION" });
      message.textContent = `Telemetry connection: ${response.result.status}.`;
    }));
    document.getElementById("refreshTelemetry").addEventListener("click", action(async () => {
      await workspace.flush();
      const state = workspace.state().report;
      const ids = state.businessCentralError?.errorEvidenceIds || [];
      const errorEvidenceId = state.businessCentralError?.primaryErrorEvidenceId ||
        (ids.length === 1 ? ids[0] : "");
      if (!errorEvidenceId) throw new Error("Select a primary error before telemetry refresh.");
      message.textContent = "Fetching telemetry from the configured Microsoft endpoint…";
      await send({ type: "T9_REFRESH_BUG_REPORT_TELEMETRY", bugReportId,
        errorEvidenceId, windowMinutes: Number(
          document.getElementById("telemetryWindow").value) });
      location.reload();
    }));
    document.getElementById("saveAiConfig").addEventListener("click", action(async () => {
      const configuration = aiConfigurationFromForm();
      if (configuration.enabled) await requestBrokerPermission(configuration);
      await send({ type: "T9_SAVE_AI_CONFIGURATION", configuration });
      message.textContent = "Public AI broker configuration saved. No provider key was stored.";
    }));
    document.getElementById("analyzeBugReport").addEventListener("click", action(async () => {
      if (!document.getElementById("aiConsent").checked) {
        throw new Error("Explicit consent is required before AI analysis.");
      }
      await workspace.flush();
      message.textContent = "Sending minimized evidence to the configured AI broker…";
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
          document.getElementById("issueIncludeAi").checked } });
      document.getElementById("issueTitle").textContent = issuePreviewState.issuePackage.title;
      document.getElementById("issueDescription").textContent = issuePreviewState.markdown;
      const list = document.getElementById("issueAttachments"); list.replaceChildren();
      for (const attachment of issuePreviewState.issuePackage.attachments) {
        const item = document.createElement("li");
        item.textContent = `${attachment.fileName} — ${attachment.role}`; list.append(item);
      }
      const pkg = issuePreviewState.issuePackage;
      document.getElementById("issueTransmissionSummary").textContent = [
        `Destination: ${document.getElementById("issueProvider").value || "offline only"}`,
        `Telemetry: ${pkg.inclusion.telemetry ? "included" : "excluded"}`,
        `AI analysis: ${pkg.inclusion.aiAnalysis ? "included and labelled" : "excluded"}`,
        `Attachments: ${pkg.attachments.length}`,
        `Potentially sensitive categories: ${pkg.privacy.categories.join(", ")}`
      ].join(" · ");
      document.getElementById("issueResult").textContent =
        issuePreviewState.existingReferences.length ?
          "Warning: this report already has an external issue reference." : "Package is current.";
    }
    document.getElementById("openIssuePreview").addEventListener("click", action(async () => {
      document.getElementById("issuePreview").showModal(); await generateIssuePreview();
    }));
    document.getElementById("refreshIssuePreview").addEventListener("click",
      action(generateIssuePreview));
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
      document.getElementById("issueResult").textContent = "Issue description copied.";
    }));
    document.getElementById("downloadIssuePackage").addEventListener("click", action(async () => {
      if (!issuePreviewState) await generateIssuePreview();
      const offline = { manifest: { schemaVersion: 1,
        packageId: issuePreviewState.issuePackage.packageId,
        sourceRevision: issuePreviewState.issuePackage.sourceRevision,
        files: ["bug-report.md", ...issuePreviewState.offlineAttachments.map(item =>
          item.fileName)] }, issuePackage: issuePreviewState.issuePackage,
        bugReportMarkdown: issuePreviewState.markdown,
        attachments: issuePreviewState.offlineAttachments };
      await download(JSON.stringify(offline, null, 2), `${bugReportId}-issue-package.json`);
      document.getElementById("issueResult").textContent = "Offline Issue Package exported.";
    }));
    document.getElementById("submitExternalIssue").addEventListener("click", action(async () => {
      if (!document.getElementById("issueConsent").checked) throw new Error(
        "Review and explicit submission consent are required.");
      const provider = document.getElementById("issueProvider").value;
      if (!provider) throw new Error("Select Azure DevOps or GitHub before submission.");
      if (!issuePreviewState) await generateIssuePreview();
      const button = document.getElementById("submitExternalIssue"); button.disabled = true;
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
        link.textContent = "Open external issue"; result.append(link);
      } finally { button.disabled = false; }
    }));
  }
  start().catch(error => { message.textContent = error.message; });
})();
