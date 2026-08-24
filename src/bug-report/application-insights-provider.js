(function (root, factory) {
  const queries = typeof module === "object" && module.exports
    ? require("./telemetry-query-definitions") : root.T9TelemetryQueryDefinitions;
  const enrichment = typeof module === "object" && module.exports
    ? require("./telemetry-enrichment") : root.T9TelemetryEnrichment;
  const api = factory(queries, enrichment);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ApplicationInsightsProvider = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (queryDefinitions, model) {
  "use strict";
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  function validateConfiguration(value = {}) {
    const guid = /^[0-9a-f]{8}-[0-9a-f-]{27,}$/iu;
    const errors = [];
    if (!value.enabled) errors.push("Telemetry enrichment is not enabled.");
    for (const field of ["tenantId", "clientId", "applicationId"]) {
      if (!guid.test(String(value[field] || ""))) errors.push(`${field} must be a valid identifier.`);
    }
    return { valid: errors.length === 0, errors };
  }
  function tableRecords(payload = {}) {
    return (payload.tables || []).flatMap(table => {
      const names = (table.columns || []).map(column => column.name);
      return (table.rows || []).map(row => Object.fromEntries(names.map((name, index) =>
        [name, row[index]])));
    });
  }
  function normalizedEvent(record, definition) {
    const id = record.itemId || record.operation_Id || "";
    const severity = Number(record.severityLevel);
    const result = String(record.result || "").toLocaleLowerCase();
    const duration = Number(record.duration);
    const searchable = `${record.eventName || ""} ${record.message || ""}`;
    const category = severity >= 3 ? "error" : severity === 2 ? "warning" :
      /^(failed|failure|false|error)$/u.test(result) ? "failed-operation" :
      Number.isFinite(duration) && duration >= 30000 ? "performance" :
      /\b(al|runtime|exception)\b/iu.test(searchable) ? "relevant-al-runtime" :
        "other-context";
    return model.normalizeEvent({ telemetryEventId: String(id), timestamp: record.timestamp,
      eventName: record.eventName, message: record.message, severity: record.severityLevel,
      category,
      operationId: record.operation_Id, sessionId: record.session_Id,
      clientActivityId: record.clientActivityId, duration: record.duration,
      result: record.result, dimensions: clone(record.customDimensions || {}),
      rawRecordReference: id ? `${definition.queryId}:${id}` : undefined,
      correlationReasons: [definition.correlationType], provenance: {
        queryId: definition.queryId, queryVersion: definition.queryVersion } });
  }
  function boundedRecords(records, maxBytes = 1024 * 1024) {
    const result = []; let bytes = 0;
    for (const record of records.slice(0, 500)) {
      const size = JSON.stringify(record).length * 2;
      if (bytes + size > maxBytes) break;
      result.push(record); bytes += size;
    }
    return { records: result, truncated: result.length < records.length, bytes };
  }
  function create(options = {}) {
    if (!options.authenticate || !options.query) throw new TypeError("Authentication and query transports are required.");
    return {
      async testConnection(configuration) {
        const validation = validateConfiguration(configuration);
        if (!validation.valid) return { status: configuration.enabled ?
          "configuration-error" : "not-configured", diagnostics: validation.errors };
        try {
          const token = await options.authenticate(configuration);
          await options.query(configuration, token, "print connectionTest=1");
          return { status: "connected", diagnostics: [] };
        } catch (error) { return { status: error.category || "unavailable",
          diagnostics: [options.sanitizeError?.(error) || "Connection failed."] }; }
      },
      async queryBugContext(context, configuration, queryOptions = {}) {
        const validation = validateConfiguration(configuration);
        if (!validation.valid) throw Object.assign(new Error(validation.errors.join(" ")),
          { category: configuration.enabled ? "configuration-error" : "not-configured" });
        let token;
        try { token = await options.authenticate(configuration); }
        catch (error) {
          const diagnostic = options.sanitizeError?.(error) || "Authentication failed.";
          return model.normalize({ enrichmentId: `telemetry:${context.errorEvidenceId}`,
            provider: "application-insights", queriedAt: options.now?.() || new Date().toISOString(),
            status: error.category || "unauthorized", connectionContext: {
              applicationId: configuration.applicationId }, correlationContext: clone(context),
            queries: [], events: [], warnings: [{ code: error.category || "unauthorized",
              message: diagnostic }] });
        }
        const definitions = queryDefinitions.definitions(context, queryOptions);
        const queryResults = [];
        const events = [];
        for (const definition of definitions) {
          try {
            const payload = await options.query(configuration, token, definition.kql);
            const bounded = boundedRecords(tableRecords(payload));
            const rawRecords = bounded.records;
            const normalized = rawRecords.map(record => normalizedEvent(record, definition));
            events.push(...normalized);
            queryResults.push({ queryId: definition.queryId,
              queryVersion: definition.queryVersion, purpose: definition.purpose,
              queriedAt: options.now?.() || new Date().toISOString(), status: "succeeded",
              correlationType: definition.correlationType, rawRecords,
              recordCount: rawRecords.length, rawRecordsTruncated: bounded.truncated,
              retainedBytes: bounded.bytes });
          } catch (error) {
            queryResults.push({ queryId: definition.queryId,
              queryVersion: definition.queryVersion, purpose: definition.purpose,
              queriedAt: options.now?.() || new Date().toISOString(), status: "failed",
              errorCategory: error.category || "query-failed",
              diagnostic: options.sanitizeError?.(error) || "Query failed." });
          }
        }
        const status = model.statusFor(queryResults);
        return model.normalize({ enrichmentId: `telemetry:${context.errorEvidenceId}`,
          provider: "application-insights", queriedAt: options.now?.() || new Date().toISOString(),
          status: status === "complete" && events.length === 0 ? "no-matches" : status,
          connectionContext: {
            applicationId: configuration.applicationId, environmentName: configuration.environmentName || "" },
          correlationContext: clone(context), queries: queryResults, events,
          warnings: [...queryResults.filter(item => item.status === "failed").map(item => ({
            code: item.errorCategory, queryId: item.queryId, message: item.diagnostic })),
          ...(configuration.environmentName && context.environmentName &&
            configuration.environmentName !== context.environmentName ? [{
              code: "environment-mismatch", message:
                "Captured environment differs from the configured telemetry environment." }] : [])] });
      }
    };
  }
  return { boundedRecords, create, tableRecords, validateConfiguration };
});
