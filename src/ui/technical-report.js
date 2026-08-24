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
      await navigator.clipboard.writeText(await workspace.exportMarkdown());
      message.textContent = "Report copied.";
    });
    document.getElementById("downloadMarkdown").addEventListener("click", async () => {
      await download(await workspace.exportMarkdown(), `${bugReportId}.md`);
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
  }
  start().catch(error => { message.textContent = error.message; });
})();
