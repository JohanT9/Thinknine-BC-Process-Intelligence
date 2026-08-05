(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9TextFormat = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function quoteEmphasis(value) {
    return String(value ?? "").replace(/\*\*([^*]+?)\*\*/g, '"$1"');
  }

  return { quoteEmphasis };
});
