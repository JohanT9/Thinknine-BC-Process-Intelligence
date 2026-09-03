(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ProcessMapSearch = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  function normalize(value) { return String(value || "").normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "").toLocaleLowerCase().trim(); }
  function find(values, query) { const needle = normalize(query); if (!needle) return [];
    return (values || []).map((value, index) => ({ index, value }))
      .filter(item => normalize(item.value).includes(needle)); }
  function next(matches, currentIndex = -1) { if (!matches?.length) return -1;
    const position = matches.findIndex(match => match.index === currentIndex);
    return matches[(position + 1) % matches.length].index;
  }
  return { find, next, normalize };
});
