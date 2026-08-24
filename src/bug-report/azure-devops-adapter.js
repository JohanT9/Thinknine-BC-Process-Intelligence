(function (root, factory) {
  const markdown = typeof module === "object" && module.exports
    ? require("./issue-package-markdown") : root.T9IssuePackageMarkdown;
  const api = factory(markdown); if (typeof module === "object" && module.exports) module.exports = api;
  root.T9AzureDevOpsAdapter = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (formatter) {
  "use strict";
  const id = "azure-devops";
  const capabilities = () => ({ markdown: true, attachments: true, labels: false,
    tags: true, workItemTypes: true, maxBodyLength: 1000000 });
  function validateConfiguration(value = {}) { const errors = [];
    if (!value.enabled) errors.push("Azure DevOps integration is not enabled.");
    for (const field of ["organization", "project", "workItemType", "tenantId",
      "clientId", "scope"]) if (!String(value[field] || "").trim()) errors.push(`${field} is required.`);
    if (value.scope && !String(value.scope).includes("499b84ac-1321-427f-aa17-267ca6975798")) {
      errors.push("Azure DevOps Microsoft Entra scope is invalid.");
    }
    return { valid: errors.length === 0, errors };
  }
  const html = value => `<pre>${String(value).replace(/&/gu, "&amp;")
    .replace(/</gu, "&lt;").replace(/>/gu, "&gt;").replace(/"/gu, "&quot;")}</pre>`;
  function fieldMap(pkg, configuration = {}) { const fields = [
    { op: "add", path: "/fields/System.Title", value: pkg.title },
    { op: "add", path: `/fields/${configuration.descriptionField || "System.Description"}`,
      value: html(formatter.markdown(pkg)) }];
    if (configuration.areaPath) fields.push({ op: "add", path: "/fields/System.AreaPath",
      value: configuration.areaPath });
    if (configuration.iterationPath) fields.push({ op: "add",
      path: "/fields/System.IterationPath", value: configuration.iterationPath });
    if ((configuration.tags || []).length) fields.push({ op: "add",
      path: "/fields/System.Tags", value: configuration.tags.join("; ") });
    if (pkg.summary?.severity && configuration.severityField) fields.push({ op: "add",
      path: `/fields/${configuration.severityField}`, value: pkg.summary.severity });
    return fields;
  }
  function create(options = {}) { if (!options.invoke) throw new TypeError(
    "An authenticated Azure DevOps transport is required.");
    return { id, capabilities, validatePackage(pkg, configuration) {
      const config = validateConfiguration(configuration); const body = formatter.markdown(pkg);
      return { valid: config.valid && body.length <= capabilities().maxBodyLength,
        errors: [...config.errors, ...(body.length > capabilities().maxBodyLength ?
          ["Issue body exceeds the Azure DevOps body limit."] : [])] }; },
      async testConnection(configuration) { return options.invoke("test", { configuration }); },
      async createIssue(pkg, configuration, requestOptions = {}) {
        return options.invoke("create", { configuration, fields: fieldMap(pkg, configuration),
          attachments: pkg.attachments, idempotencyKey: requestOptions.idempotencyKey ||
            pkg.packageId, sourceRevision: pkg.sourceRevision });
      } };
  }
  return { capabilities, create, fieldMap, html, id, validateConfiguration };
});
