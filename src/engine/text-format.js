(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9TextFormat = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
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

  return { instructionSegments, quoteEmphasis };
});
