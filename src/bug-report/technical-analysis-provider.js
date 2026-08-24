(function (root, factory) {
  const inputBuilder = typeof module === "object" && module.exports
    ? require("./ai-analysis-input") : root.T9AiAnalysisInput;
  const model = typeof module === "object" && module.exports
    ? require("./ai-analysis-model") : root.T9AiAnalysisModel;
  const prompt = typeof module === "object" && module.exports
    ? require("./ai-analysis-prompt") : root.T9AiAnalysisPrompt;
  const api = factory(inputBuilder, model, prompt);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9TechnicalAnalysisProvider = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (
  inputBuilder, analysisModel, promptTemplate
) {
  "use strict";
  function create(options = {}) {
    if (!options.invoke) throw new TypeError("An authenticated analysis broker is required.");
    let generation = 0;
    return { cancel() { generation += 1; }, async analyzeTechnicalBug(report,
      evidence, policy, configuration = {}) {
      const requestGeneration = ++generation;
      const input = inputBuilder.build(report, evidence, policy);
      if (input.size.estimatedTokens > Number(configuration.maxInputTokens || 12000)) {
        throw Object.assign(new Error("AI analysis input exceeds the configured limit."),
          { category: "input-too-large" });
      }
      const response = await options.invoke({ input, instructions:
        promptTemplate.instructions, promptVersion: promptTemplate.VERSION,
      outputSchema: promptTemplate.schema, model: configuration.model,
      store: false, tools: [] });
      if (requestGeneration !== generation) return { ignored: true,
        reason: "superseded-analysis" };
      return { input, analysis: analysisModel.normalize(response.output, {
        analysisId: response.analysisId || `ai-analysis:${report.bugReportId}`,
        createdAt: response.createdAt || options.now?.() || new Date().toISOString(),
        provider: response.provider || configuration.provider || "broker",
        model: response.model || configuration.model || "unspecified",
        usage: response.usage }, input) };
    } };
  }
  return { create };
});
