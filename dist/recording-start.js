(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9RecordingStart = api;
}(typeof globalThis !== "undefined" ? globalThis : this, () => {
  "use strict";
  // Starting a recording: the license, the capture scripts in the Business Central tab, and the
  // start itself. It runs in the page that asked for it: the toolbar popup, or the recording panel
  // beside Business Central. Edge closes the popup when the panel opens, so a start begun from the
  // popup is carried out by the panel, which stays open until the recording runs.
  function create({ send, t, tf, withTimeout, licenseCheckTimeout,
    confirm = message => globalThis.confirm(message) }) {

    async function prepareTenantLicense(tabId, { forceCheck = false } = {}) {
      const licenseInfo = await send({ type: "T9_LICENSE_INFORMATION" });
      if (!licenseInfo?.ok) throw new Error(licenseInfo?.error || "License configuration unavailable");
      if (licenseInfo.information.requiresAcceptance) {
        const notice = tf("license.registrationNotice", { endpoint: licenseInfo.information.endpoint });
        if (!confirm(notice + "\n\n" + t("license.acceptPrompt"))) {
          throw new Error(t("license.registrationCancelled"));
        }
        const accepted = await send({ type: "T9_ACCEPT_LICENSE_NOTICE" });
        if (!accepted?.ok) throw new Error(accepted?.error || t("technical.requestFailed"));
      }

      let tenantResult = null;
      let checkError = null;
      try {
        tenantResult = await send({ type: "T9_LICENSE_CHECK", tabId, force: forceCheck },
          licenseCheckTimeout);
        if (!tenantResult?.ok) throw Object.assign(new Error(tenantResult?.error || t("technical.requestFailed")),
          { status: tenantResult?.status });
      } catch (error) { checkError = error; }

      let account = await send({ type: "T9_CONSULTANT_LICENSE_STATUS" }, 5000);
      if (!account?.signedIn) {
        account = await send({ type: "T9_MICROSOFT_SIGN_IN" }, 120000);
        if (!account?.ok) throw new Error(account?.code === "entra-signin-unreachable"
          ? t("license.microsoftUnavailable") : account?.error || t("license.signInFailed"));
        account = { ...account, signedIn: true };
      }

      if (tenantResult?.license?.allowed) {
        // A license from the cache is being checked again while the service starts; the user is
        // registered with the service then too, without holding up the recording.
        if (tenantResult.license.stale) {
          send({ type: "T9_TENANT_USER_REGISTER", tabId }, licenseCheckTimeout).catch(() => {});
        } else {
          const registered = await send({ type: "T9_TENANT_USER_REGISTER", tabId }, 10000);
          if (!registered?.ok) throw new Error(registered?.error || t("license.userRegistrationFailed"));
        }
        return { source: "tenant", license: tenantResult.license, tenantId: tenantResult.tenantId, account };
      }

      // A trial belongs to the organization that owns the environment. A consultant signed in from
      // another organization cannot start it, and continues with the consultant license instead.
      let otherOrganization = null;
      if (tenantResult?.license?.trialAvailable || checkError) {
        try {
          let trial = await send({ type: "T9_REQUEST_TRIAL", tabId }, 45000);
          if (!trial?.ok && trial.code === "entra-reauth-required") {
            await send({ type: "T9_CONSULTANT_LICENSE_SIGN_OUT" });
            account = await send({ type: "T9_MICROSOFT_SIGN_IN" }, 120000);
            if (!account?.ok) throw new Error(account?.code === "entra-signin-unreachable"
              ? t("license.microsoftUnavailable") : account?.error || t("license.signInFailed"));
            trial = await send({ type: "T9_REQUEST_TRIAL", tabId }, 45000);
          }
          if (!trial?.ok) {
            const message = trial.code === "trial-service-timeout"
              ? t("license.trialServiceTimeout")
              : trial.code === "trial-service-unreachable"
                ? t("license.trialServiceUnavailable") : trial.error || t("license.trialFailed");
            throw Object.assign(new Error(message), { status: trial?.status, code: trial?.code });
          }
          return { source: "tenant", license: trial.license, tenantId: tenantResult?.tenantId, account };
        } catch (error) {
          if (error.status === 409) {
            const current = await send({ type: "T9_LICENSE_CHECK", tabId, force: true },
              licenseCheckTimeout);
            if (current?.ok && current.license?.allowed) {
              const registered = await send({ type: "T9_TENANT_USER_REGISTER", tabId }, 10000);
              if (!registered?.ok) throw new Error(registered?.error || t("license.userRegistrationFailed"));
              return { source: "tenant", license: current.license, tenantId: current.tenantId, account };
            }
          }
          if (error.code !== "trial-other-organization") throw error;
          otherOrganization = error;
        }
      }

      if (checkError) throw checkError;
      const consultant = await send({ type: "T9_CONSULTANT_LICENSE_CHECK", tabId }, 10000);
      if (consultant?.license?.allowed) {
        return { source: "consultant", license: consultant.license, tenantId: tenantResult?.tenantId, account };
      }
      throw new Error(t(otherOrganization ? "license.trialOtherOrganization" : "license.noEligibleTrial"));
    }

    async function pingTab(tabId) {
      try {
        return await withTimeout(chrome.tabs.sendMessage(tabId, {
          type: "T9_CONTENT_PING"
        }), 1800, "Business Central tab check", {
          errorMessage: t("technical.requestTimeout") });
      } catch {
        return null;
      }
    }

    async function ensureContentScript(tab) {
      let response = await pingTab(tab.id);
      if (response?.ok) return response;

      try {
        await withTimeout(chrome.scripting.executeScript({
          target: { tabId: tab.id, allFrames: true },
          files: ["engine/business-central-version-capture.js", "capture-field-privacy.js", "capture-value-regions.js",
            "capture-focus-session.js", "capture-keyboard.js", "capture-delivery.js", "capture-surface-mode.js",
            "engine/bc-client-captions.js", "bc-error-detector.js", "capture-indicator-i18n.js", "content.js"]
        }), 4000, "Capture script injection", {
          errorMessage: t("technical.requestTimeout") });
      } catch (error) {
        throw new Error(tf("recorder.injectFailed", { detail: error.message }));
      }

      await new Promise(resolve => setTimeout(resolve, 500));
      response = await pingTab(tab.id);
      if (!response?.ok) {
        throw new Error(t("recorder.tabUnresponsive"));
      }
      return response;
    }

    // The whole start in the tab given. progress(key) names the step under way; the result is the
    // license the recording runs on. Any failure is thrown with a message for the user.
    async function startRecording({ purpose, tab, progress = () => {} }) {
      progress("recorder.checking");
      if (!tab?.url?.includes("businesscentral.dynamics.com")) {
        throw new Error(t("recorder.openBcFirst"));
      }
      const authorization = await prepareTenantLicense(tab.id);
      await ensureContentScript(tab);
      progress("recorder.connectionWorks");
      const response = await send({
        type: purpose === "bug-report" ? "T9_START_BUG_RECORDING" : "T9_START",
        tabId: tab.id,
        name: purpose === "bug-report" ? "Business Central-fel" : "Business Central-process",
        purpose: ""
      }, 15000);
      if (!response?.ok) throw new Error(response?.error || t("recorder.startFailed"));
      return authorization;
    }

    return Object.freeze({ prepareTenantLicense, pingTab, ensureContentScript, startRecording });
  }

  return Object.freeze({ create });
}));
