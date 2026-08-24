(function (root, factory) { const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9IssueSubmissionService = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const active = new Set();
  function sanitizeError(error) { const status = Number(error?.status || 0);
    const category = error?.category || (status === 401 ? "unauthorized" :
      status === 403 ? "permission-denied" : status === 404 ? "destination-unavailable" :
      status === 429 ? "rate-limited" : status >= 500 ? "unavailable" : "provider-failed");
    return { category, uncertain: Boolean(error?.uncertain || category === "ambiguous-timeout"),
      message: String(error?.message || "Issue destination failed.")
        .replace(/authorization\s*[:=]\s*.*$/gimu, "Authorization: [redacted]")
        .replace(/(Bearer|token|authorization)\s*[:=]?\s*\S+/giu, "$1 [redacted]")
        .slice(0, 300) };
  }
  function create(provider) {
    if (!provider?.createIssue) throw new TypeError("An issue destination provider is required.");
    return { testConnection: configuration => provider.testConnection(configuration),
      capabilities: configuration => provider.capabilities(configuration),
      async submit(pkg, configuration, options = {}) {
        if (!options.explicitConfirmation) throw Object.assign(
          new Error("Explicit issue submission confirmation is required."),
          { category: "confirmation-required" });
        const key = `${provider.id}:${pkg.packageId}:${configuration.destination || ""}`;
        if (active.has(key)) throw Object.assign(new Error("Issue submission is already active."),
          { category: "duplicate-submission" });
        active.add(key);
        try { const validation = provider.validatePackage(pkg, configuration);
          if (!validation.valid) throw Object.assign(new Error(validation.errors.join(" ")),
            { category: "validation-failed" });
          const result = await provider.createIssue(pkg, configuration, options);
          return { status: result.attachmentFailures?.length ? "partial-success" : "created",
            reference: { provider: provider.id, destination: result.destination,
              externalId: String(result.externalId), url: result.url,
              createdAt: result.createdAt || new Date().toISOString(),
              sourceRevision: pkg.sourceRevision,
              includedAi: Boolean(pkg.inclusion.aiAnalysis),
              includedTelemetry: Boolean(pkg.inclusion.telemetry) },
            attachmentFailures: result.attachmentFailures || [] };
        } catch (error) { throw Object.assign(new Error(sanitizeError(error).message),
          sanitizeError(error)); } finally { active.delete(key); }
      } };
  }
  return { create, sanitizeError };
});
