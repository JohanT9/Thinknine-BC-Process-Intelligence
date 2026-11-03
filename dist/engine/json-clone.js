(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9JsonClone = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  // Gives the same result as JSON.parse(JSON.stringify(value)) without serializing the strings.
  // Strings cannot change in place, so sharing them is safe; reviews hold large screenshot and
  // text values that the many defensive copies otherwise rewrite on every render.
  function clone(value) {
    if (value === undefined) return undefined;
    const result = copy("", value, []);
    // JSON.parse(undefined) throws, as for a function or symbol on its own.
    if (result === OMIT) throw new SyntaxError("\"undefined\" is not valid JSON");
    return result;
  }

  const OMIT = Symbol("omit");

  function copy(key, value, stack) {
    if (value !== null && (typeof value === "object" || typeof value === "bigint") &&
        typeof value.toJSON === "function") {
      value = value.toJSON(String(key));
    }
    switch (typeof value) {
      case "string":
      case "boolean":
        return value;
      case "number":
        return Number.isFinite(value) ? value + 0 : null;
      case "bigint":
        throw new TypeError("Do not know how to serialize a BigInt");
      case "undefined":
      case "function":
      case "symbol":
        return OMIT;
    }
    if (value === null) return null;
    if (value instanceof Number) return copy(key, Number(value), stack);
    if (value instanceof String) return String(value);
    if (value instanceof Boolean) return value.valueOf();
    if (stack.includes(value)) throw new TypeError("Converting circular structure to JSON");
    stack.push(value);
    let result;
    if (Array.isArray(value)) {
      result = new Array(value.length);
      for (let index = 0; index < value.length; index += 1) {
        const item = copy(index, value[index], stack);
        result[index] = item === OMIT ? null : item;
      }
    } else {
      result = {};
      for (const name of Object.keys(value)) {
        const item = copy(name, value[name], stack);
        if (item === OMIT) continue;
        if (name === "__proto__") {
          Object.defineProperty(result, name, { value: item, enumerable: true,
            writable: true, configurable: true });
        } else {
          result[name] = item;
        }
      }
    }
    stack.pop();
    return result;
  }

  return Object.freeze({ clone });
});
