(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ReviewStorageFormat = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  // How a review is stored. A step carries the evidence it was interpreted from, and the same
  // evidence is repeated in the step, in its semantic action, in the steps as first generated
  // and in the edit history: most of a stored review. Stored, every part of the review that
  // occurs more than once with exactly the same content is kept once and each occurrence
  // refers to it. Read, the review is exactly what was stored before, so nothing is
  // reinterpreted and no step changes.
  //
  //   storageFormat: { sharedValues: 1 }
  //   sharedValues: [value, …]                  each may refer to earlier or later ones
  //   … { "$shared": index } wherever a shared value occurred
  const SHARED_FORMAT = 1;
  const REF = "$shared";
  // Smaller parts are not worth a reference.
  const MIN_SHARED_LENGTH = 512;

  const isObject = value => Boolean(value) && typeof value === "object" && !Array.isArray(value);

  class UnsupportedReviewFormatError extends Error {
    constructor(version) {
      super(`This review was saved by a newer version of BC Process Studio (format ${version}).`);
      this.name = "UnsupportedReviewFormatError";
      this.code = "unsupported-review-format";
    }
  }

  function isPacked(review) {
    return isObject(review) && isObject(review.storageFormat) &&
      review.storageFormat.sharedValues !== undefined;
  }

  // The JSON text of every object and array, built from its children's texts. Values JSON
  // leaves out (undefined, functions) are left out as storage leaves them out.
  function describe(value, texts, counts, state) {
    if (Array.isArray(value)) {
      const text = `[${value.map(item => {
        const part = describe(item, texts, counts, state);
        return part === undefined ? "null" : part;
      }).join(",")}]`;
      return remember(value, text, texts, counts);
    }
    if (isObject(value)) {
      if (Object.hasOwn(value, REF)) state.reserved = true;
      const parts = [];
      for (const [key, child] of Object.entries(value)) {
        const part = describe(child, texts, counts, state);
        if (part !== undefined) parts.push(`${JSON.stringify(key)}:${part}`);
      }
      return remember(value, `{${parts.join(",")}}`, texts, counts);
    }
    return JSON.stringify(value);
  }

  function remember(value, text, texts, counts) {
    texts.set(value, text);
    if (text.length >= MIN_SHARED_LENGTH) counts.set(text, (counts.get(text) || 0) + 1);
    return text;
  }

  // The review as it is stored.
  function pack(review) {
    if (!isObject(review)) return review;
    const source = isPacked(review) ? unpack(review) : review;
    const texts = new Map();
    const counts = new Map();
    const state = { reserved: false };
    describe(source, texts, counts, state);
    // A review that already uses the reference key in its own data is stored as it is.
    if (state.reserved || ![...counts.values()].some(count => count > 1)) return source;
    const shared = [];
    const indexes = new Map();
    const repeated = value => (counts.get(texts.get(value)) || 0) > 1;
    // The first occurrence of a repeated value is stored once, with its own repeated parts
    // referred to as well; every occurrence becomes a reference.
    function reference(value, content) {
      const text = texts.get(value);
      if (!indexes.has(text)) {
        const index = shared.length;
        indexes.set(text, index);
        shared.push(null);
        shared[index] = content(value);
      }
      return { [REF]: indexes.get(text) };
    }
    function packArray(value) {
      return value.map(item => item === undefined || typeof item === "function" ? null : packValue(item));
    }
    function packChildren(value) {
      const result = {};
      for (const [key, child] of Object.entries(value)) {
        if (child === undefined || typeof child === "function") continue;
        result[key] = packValue(child);
      }
      return result;
    }
    function packValue(value) {
      if (Array.isArray(value)) return repeated(value) ? reference(value, packArray) : packArray(value);
      if (!isObject(value)) return value;
      return repeated(value) ? reference(value, packChildren) : packChildren(value);
    }
    const { storageFormat, ...rest } = source;
    const packed = packChildren(rest);
    return { ...packed, storageFormat: { ...(isObject(storageFormat) ? storageFormat : {}),
      sharedValues: SHARED_FORMAT }, sharedValues: shared };
  }

  // The review as it was before it was stored. A review stored before this format is returned
  // as it is; one stored by a newer format is refused rather than read wrongly.
  function unpack(review) {
    if (!isPacked(review)) return review;
    const version = review.storageFormat.sharedValues;
    if (version !== SHARED_FORMAT) throw new UnsupportedReviewFormatError(version);
    const { storageFormat, sharedValues, ...rest } = review;
    const shared = Array.isArray(sharedValues) ? sharedValues : [];
    const resolving = new Set();
    function expand(value) {
      if (Array.isArray(value)) return value.map(expand);
      if (!isObject(value)) return value;
      if (Object.hasOwn(value, REF) && Object.keys(value).length === 1) {
        const index = value[REF];
        if (!Number.isInteger(index) || index < 0 || index >= shared.length || resolving.has(index)) {
          throw new Error(`Stored review has an invalid shared value ${index}.`);
        }
        resolving.add(index);
        const result = expand(shared[index]);
        resolving.delete(index);
        return result;
      }
      const result = {};
      for (const [key, child] of Object.entries(value)) result[key] = expand(child);
      return result;
    }
    const result = expand(rest);
    const otherFormats = Object.fromEntries(Object.entries(storageFormat)
      .filter(([key]) => key !== "sharedValues"));
    return Object.keys(otherFormats).length ? { ...result, storageFormat: otherFormats } : result;
  }

  return Object.freeze({ SHARED_FORMAT, MIN_SHARED_LENGTH, UnsupportedReviewFormatError,
    isPacked, pack, unpack });
});
