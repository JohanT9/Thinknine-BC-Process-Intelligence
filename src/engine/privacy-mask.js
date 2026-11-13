(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9PrivacyMask = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  // The placeholders a recording has always used; a report passes its document language's.
  const LABELS = Object.freeze({ secret: "[maskerat]", email: "[e-postadress]",
    customer: "[aktuell kund]", vendor: "[aktuell leverantör]", item: "[aktuell artikel]",
    amount: "[belopp]", id: "[id]" });
  function mask(fieldName, value, settings = {}) {
    if (settings.maskValues === false) return value;
    const label = key => settings.labels?.[key] || LABELS[key];
    const name = String(fieldName || "").toLowerCase();
    const text = String(value ?? "");
    if (/password|lösenord|secret|token|api.?key/u.test(name)) return label("secret");
    // Secrets only: other values are kept and masked later, where that is chosen.
    if (settings.maskValues === "secrets") return value;
    if (/email|e-post/u.test(name)) return label("email");
    if (/customer|kund/u.test(name) && settings.maskCustomerNo === true) {
      return label("customer");
    }
    if (/vendor|leverantör/u.test(name) && settings.maskVendorNo === true) {
      return label("vendor");
    }
    if (/item|artikel/u.test(name) && settings.maskItemNo === true) {
      return label("item");
    }
    if (/price|cost|amount|pris|kostnad|belopp/u.test(name)) return label("amount");
    return text
      .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu,
        label("email"))
      .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/giu,
        label("id"));
  }
  function maskFieldValues(event, settings = {}) {
    if (!event || typeof event !== "object" || Array.isArray(event)) return event;
    const masked = { ...event };
    // enteredValue is the text typed before the client validated it.
    for (const property of ["value", "previousValue", "enteredValue"]) {
      if (Object.prototype.hasOwnProperty.call(event, property)) {
        masked[property] = mask(event.fieldName, event[property], settings);
      }
    }
    return masked;
  }
  // What the user typed in a field is test data: a Page Scripting test made from the recording
  // has to enter exactly that. When masking hid it, it is kept beside the masked value as
  // typedValue, which only the test export reads; documents, reports and their exports keep
  // showing the masked value. Passwords, secrets, tokens and keys are never kept.
  const TYPED_SOURCES = new Set(["input", "change"]);
  function keepTypedValue(event, masked) {
    if (!event || !masked || event.type !== "field-change" || !TYPED_SOURCES.has(event.inputSource)) return masked;
    const typed = Object.prototype.hasOwnProperty.call(event, "enteredValue") ? event.enteredValue : event.value;
    if ((typeof typed !== "string" && typeof typed !== "number") || String(typed) === "") return masked;
    const shown = Object.prototype.hasOwnProperty.call(masked, "enteredValue") ? masked.enteredValue : masked.value;
    if (String(shown) === String(typed)) return masked;
    if (String(mask(event.fieldName, typed, { maskValues: "secrets" })) !== String(typed)) return masked;
    return { ...masked, typedValue: String(typed) };
  }
  // A recorded (canonical) event with its values masked as they would have been when
  // captured; the stored recording is not changed.
  function maskRecordedEvent(event, settings = {}) {
    if (!event || typeof event !== "object" || Array.isArray(event)) return event;
    const fieldName = event.raw?.fieldName ?? event.control?.name;
    const masked = { ...event, ...(event.raw ? { raw: maskFieldValues(event.raw, settings) } : {}) };
    for (const property of ["value", "previousValue"]) {
      if (Object.prototype.hasOwnProperty.call(event, property)) {
        masked[property] = mask(fieldName, event[property], settings);
      }
    }
    return masked;
  }
  // The masked text of each step. A step derived from the masked recording counts only when it
  // comes from exactly the same events, since a masked value can make interpretation drop or
  // merge steps; the step's own values are then replaced in the text as well, so that no
  // value the mask would hide remains, whether or not such a step was found.
  function maskedStepTexts(tasks, maskedTasks, events, maskEvent) {
    const sourceKey = task => (task.sourceEventIds || []).map(String).join("|");
    const bySource = new Map(maskedTasks.filter(sourceKey).map(task => [sourceKey(task), task]));
    const eventsById = new Map(events.map(event => [String(event.id), event]));
    return tasks.map(task => {
      const twin = sourceKey(task) ? bySource.get(sourceKey(task)) : null;
      let instruction = String(twin ? twin.instruction || twin.displayText || "" :
        task.instruction || task.displayText || "");
      const replaced = new Set();
      for (const id of task.sourceEventIds || []) {
        const event = eventsById.get(String(id));
        if (!event) continue;
        const hidden = maskEvent(event);
        for (const [original, replacement] of [[event.value, hidden.value],
          [event.previousValue, hidden.previousValue], [event.raw?.value, hidden.raw?.value],
          [event.raw?.enteredValue, hidden.raw?.enteredValue]]) {
          const value = String(original ?? "").trim();
          if (!value || replaced.has(value) || value === String(replacement ?? "").trim()) continue;
          replaced.add(value);
          // Marked values first, so that a short value does not replace other text; without
          // a masked step the value is replaced wherever it appears.
          const marked = ["__", "**"].filter(mark => instruction.includes(mark + value + mark));
          if (marked.length) {
            instruction = marked.reduce((text, mark) => text.split(mark + value + mark)
              .join(mark + String(replacement) + mark), instruction);
          } else if (!twin) instruction = instruction.split(value).join(String(replacement));
        }
      }
      return { taskId: task.taskId, stepId: task.stepId, instruction };
    });
  }
  return { mask, maskFieldValues, keepTypedValue, maskRecordedEvent, maskedStepTexts };
});
