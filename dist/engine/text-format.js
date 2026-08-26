(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9TextFormat = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const FONT_FAMILIES = Object.freeze([
    "Aptos", "Arial", "Calibri", "Segoe UI", "Times New Roman"
  ]);
  const FONT_SIZES = Object.freeze([9, 10, 11, 12, 14, 16, 18]);
  const COLORS = Object.freeze([
    Object.freeze({ name: "Svart", value: "#000000" }),
    Object.freeze({ name: "Vit", value: "#FFFFFF" }),
    Object.freeze({ name: "Mörkblå", value: "#0F4C81" }),
    Object.freeze({ name: "Turkos", value: "#008C95" }),
    Object.freeze({ name: "Röd", value: "#C50F1F" }),
    Object.freeze({ name: "Grön", value: "#107C10" }),
    Object.freeze({ name: "Gul", value: "#FFF100" }),
    Object.freeze({ name: "Orange", value: "#CA5010" })
  ]);

  function quoteEmphasis(value) {
    return instructionSegments(value).map(segment => segment.text).join("");
  }

  function instructionSegments(value) {
    const source = String(value ?? "");
    const segments = [];
    let cursor = 0;
    const valuePattern = /__([\s\S]+?)__/g;
    let match;
    while ((match = valuePattern.exec(source))) {
      if (match.index > cursor) {
        segments.push({ text: quoteLabels(source.slice(cursor, match.index)),
          bold: false });
      }
      segments.push({ text: quoteLabels(match[1]), bold: true });
      cursor = match.index + match[0].length;
    }
    if (cursor < source.length || !segments.length) {
      segments.push({ text: quoteLabels(source.slice(cursor)), bold: false });
    }
    return segments.filter(segment => segment.text !== "");
  }

  function quoteLabels(value) {
    return String(value).replace(/\*\*([^*]+?)\*\*/g, '"$1"');
  }

  function sameFormatting(left, right) {
    return ["bold", "italic", "monospace", "fontFamily", "fontSize",
      "textColor", "backgroundColor"]
      .every(key => left?.[key] === right?.[key]);
  }

  function mergeInstructionRuns(runs) {
    const merged = [];
    for (const run of runs) {
      if (!run.text) continue;
      const previous = merged.at(-1);
      if (previous && sameFormatting(previous, run)) previous.text += run.text;
      else merged.push({ ...run });
    }
    return merged;
  }

  function normalizeInstructionRuns(value, fallbackText = "") {
    const fallback = String(fallbackText ?? "");
    if (!Array.isArray(value)) return [{ text: fallback }];
    const runs = value.map(run => {
      const fontSize = Number(run?.fontSize);
      return {
        text: String(run?.text ?? ""),
        ...(run?.bold ? { bold: true } : {}),
        ...(run?.italic ? { italic: true } : {}),
        ...(run?.monospace ? { monospace: true } : {}),
        ...(FONT_FAMILIES.includes(run?.fontFamily)
          ? { fontFamily: run.fontFamily } : {}),
        ...(FONT_SIZES.includes(fontSize) ? { fontSize } : {}),
        ...(COLORS.some(color => color.value === run?.textColor)
          ? { textColor: run.textColor } : {}),
        ...(COLORS.some(color => color.value === run?.backgroundColor)
          ? { backgroundColor: run.backgroundColor } : {})
      };
    }).filter(run => run.text !== "");
    if (runs.map(run => run.text).join("") !== fallback) {
      return [{ text: fallback }];
    }
    return mergeInstructionRuns(runs.length ? runs : [{ text: fallback }]);
  }

  function applyInstructionFormat(value, fallbackText, start, end, patch) {
    const text = String(fallbackText ?? "");
    const runs = normalizeInstructionRuns(value, text);
    let from = Math.max(0, Math.min(text.length, Number(start) || 0));
    let to = Math.max(0, Math.min(text.length, Number(end) || 0));
    if (from > to) [from, to] = [to, from];
    if (from === to) { from = 0; to = text.length; }
    const result = [];
    let offset = 0;
    for (const run of runs) {
      const runStart = offset;
      const runEnd = offset + run.text.length;
      const overlapStart = Math.max(runStart, from);
      const overlapEnd = Math.min(runEnd, to);
      if (overlapStart > runStart) {
        result.push({ ...run, text: run.text.slice(0, overlapStart - runStart) });
      }
      if (overlapStart < overlapEnd) {
        const formatted = { ...run,
          text: run.text.slice(overlapStart - runStart, overlapEnd - runStart) };
        for (const [key, next] of Object.entries(patch || {})) {
          if (next === undefined || next === null || next === false || next === "") {
            delete formatted[key];
          } else {
            formatted[key] = next;
          }
        }
        result.push(formatted);
      }
      if (overlapEnd < runEnd) {
        result.push({ ...run, text: run.text.slice(overlapEnd - runStart) });
      }
      offset = runEnd;
    }
    return normalizeInstructionRuns(mergeInstructionRuns(result), text);
  }

  function resolveInstructionPresentation(options = {}) {
    const reviewText = String(options.reviewText ?? "");
    const documentPresentation = options.documentPresentation;
    const hasDocumentText = typeof documentPresentation?.text === "string";
    const useReviewOverride = options.reviewRunsUserEdited === true &&
      Array.isArray(options.reviewRuns);
    const text = useReviewOverride || !hasDocumentText
      ? reviewText
      : documentPresentation.text;
    const runs = useReviewOverride
      ? options.reviewRuns
      : Array.isArray(documentPresentation?.runs)
        ? documentPresentation.runs
        : options.automaticRuns;
    return {
      text,
      runs: normalizeInstructionRuns(runs, text),
      source: useReviewOverride ? "review-override" :
        hasDocumentText ? "semantic-document" : "automatic"
    };
  }

  return { COLORS, FONT_FAMILIES, FONT_SIZES, applyInstructionFormat,
    instructionSegments, normalizeInstructionRuns, quoteEmphasis,
    resolveInstructionPresentation };
});
