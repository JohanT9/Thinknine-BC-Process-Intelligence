(function (root, factory) {
  const markdown = typeof module === "object" && module.exports
    ? require("./issue-package-markdown") : root.T9IssuePackageMarkdown;
  const api = factory(markdown); if (typeof module === "object" && module.exports) module.exports = api;
  root.T9GitHubIssueAdapter = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (formatter) {
  "use strict";
  const id = "github";
  const capabilities = () => ({ markdown: true, attachments: false, labels: true,
    tags: false, workItemTypes: false, maxBodyLength: 65536 });
  function validateConfiguration(value = {}) { const errors = [];
    if (!value.enabled) errors.push("GitHub integration is not enabled.");
    if (!/^[^/\s]+\/[^/\s]+$/u.test(String(value.repository || ""))) {
      errors.push("repository must use owner/name format.");
    }
    for (const field of ["brokerUrl", "tenantId", "clientId", "scope"])
      if (!String(value[field] || "").trim()) errors.push(`${field} is required.`);
    try { if (new URL(value.brokerUrl).protocol !== "https:") errors.push(
      "GitHub App broker must use HTTPS."); } catch { errors.push("brokerUrl is invalid."); }
    return { valid: errors.length === 0, errors };
  }
  function create(options = {}) { if (!options.invoke) throw new TypeError(
    "An authenticated GitHub App broker transport is required.");
    return { id, capabilities, validatePackage(pkg, configuration) {
      const config = validateConfiguration(configuration); const body = formatter.markdown(pkg);
      return { valid: config.valid && body.length <= capabilities().maxBodyLength,
        errors: [...config.errors, ...(body.length > capabilities().maxBodyLength ?
          ["Issue body exceeds GitHub's configured body limit; use the offline package."] : [])],
        warnings: pkg.attachments.length ? [
          "GitHub Issues REST does not provide a general issue attachment upload endpoint; attachments remain in the offline package."
        ] : [] }; },
      async testConnection(configuration) { return options.invoke("test", { configuration }); },
      async createIssue(pkg, configuration, requestOptions = {}) {
        const result = await options.invoke("create", { configuration,
          issue: { title: pkg.title, body: formatter.markdown(pkg),
            labels: configuration.labels || [] }, idempotencyKey:
            requestOptions.idempotencyKey || pkg.packageId,
          sourceRevision: pkg.sourceRevision });
        return { ...result, attachmentFailures: pkg.attachments.map(item => ({
          attachmentId: item.attachmentId, category: "unsupported-capability",
          message: "Retained in offline Issue Package; GitHub issue upload is unsupported."
        })) };
      } };
  }
  return { capabilities, create, id, validateConfiguration };
});
