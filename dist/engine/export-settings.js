(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9Engine = root.T9Engine || {};
  root.T9Engine.exportSettings = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const variableDefinitions = [
    {
      name: "process",
      resolve: context =>
        context.session.name ||
        context.session.processName ||
        "Business Central-process"
    },
    {
      name: "environment",
      resolve: context =>
        context.settings.environmentName ||
        context.session.settings?.environmentName ||
        "Miljö"
    },
    { name: "date", resolve: context => context.parts.date },
    { name: "time", resolve: context => context.parts.time },
    { name: "version", resolve: () => "4.2.0" }
  ];
  const definitionByName = new Map(
    variableDefinitions.map(definition => [definition.name, definition])
  );

  function safeFileName(value) {
    return String(value || "BC-process")
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
      .replace(/\s+/g, "-")
      .slice(0, 110);
  }

  function twoDigits(value) {
    return String(value).padStart(2, "0");
  }

  function dateParts(date) {
    return {
      date:
        `${date.getFullYear()}-${twoDigits(date.getMonth() + 1)}-${twoDigits(date.getDate())}`,
      time: `${twoDigits(date.getHours())}-${twoDigits(date.getMinutes())}`
    };
  }

  function buildFileName(extension, session, settings, now = new Date()) {
    const parts = dateParts(now);
    const pattern =
      settings.exportFileNamePattern ||
      "{process} - {environment} - {date}";
    const context = { session, settings, parts };
    const raw = pattern.replace(/\{([^{}]+)\}/g, (token, name) => {
      const definition = definitionByName.get(name);
      return definition ? definition.resolve(context) || "" : token;
    });
    const processName = definitionByName.get("process").resolve(context);
    return `${safeFileName(raw || processName)}.${extension}`;
  }

  function validateTemplate(pattern) {
    const text = String(pattern || "");
    const issues = [];

    for (let index = 0; index < text.length; index += 1) {
      if (text[index] === "}") {
        issues.push({ type: "malformed", token: "}", position: index });
        continue;
      }
      if (text[index] !== "{") continue;

      if (text[index + 1] === "{") {
        issues.push({ type: "duplicate-open", position: index });
        const duplicateEnd = text.indexOf("}}", index + 2);
        if (duplicateEnd === -1) {
          issues.push({ type: "missing-close", token: text.slice(index) });
          break;
        }
        index = duplicateEnd + 1;
        continue;
      }

      const close = text.indexOf("}", index + 1);
      if (close === -1) {
        issues.push({ type: "missing-close", token: text.slice(index) });
        break;
      }

      const name = text.slice(index + 1, close);
      const token = text.slice(index, close + 1);
      if (!/^[a-z][a-z0-9]*$/.test(name)) {
        issues.push({ type: "malformed", token, position: index });
      } else if (!definitionByName.has(name)) {
        issues.push({ type: "unknown", name, token, position: index });
      }
      index = close;
    }

    return issues;
  }

  function validationMessages(pattern) {
    const issues = validateTemplate(pattern);
    const unknown = [...new Set(
      issues.filter(issue => issue.type === "unknown").map(issue => issue.token)
    )];
    const messages = [];
    if (unknown.length) messages.push(`Okända variabler: ${unknown.join(", ")}.`);
    const missing = issues.find(issue => issue.type === "missing-close");
    if (missing) {
      messages.push(`Variabeln "${missing.token}" saknar avslutande }.`);
    }
    if (issues.some(issue => issue.type === "duplicate-open")) {
      messages.push("Dubbla { är inte tillåtna.");
    }
    const malformed = [...new Set(
      issues
        .filter(issue => issue.type === "malformed")
        .map(issue => issue.token === "}" ? "fristående }" : issue.token)
    )];
    if (malformed.length) {
      messages.push(
        `Felaktiga variabler: ${malformed.join(", ")}. ` +
        "Använd formatet {namn}."
      );
    }
    return messages;
  }

  function insertVariable(input, variable) {
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? start;
    input.setRangeText(variable, start, end, "end");
    input.focus();
    return input.selectionStart;
  }

  function renderVariableControls(container, help, onSelect) {
    container.replaceChildren();
    const buttons = variableDefinitions.map(definition => {
      const token = `{${definition.name}}`;
      const button = container.ownerDocument.createElement("button");
      button.className = "secondary";
      button.type = "button";
      button.dataset.variable = token;
      button.textContent = token;
      button.setAttribute("aria-label", `Infoga variabeln ${token}`);
      button.addEventListener("click", () => onSelect(token));
      container.appendChild(button);
      return button;
    });
    buttons.forEach((button, index) => {
      button.addEventListener("keydown", event => {
        let target = index;
        if (event.key === "ArrowRight" || event.key === "ArrowDown") {
          target = (index + 1) % buttons.length;
        } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
          target = (index - 1 + buttons.length) % buttons.length;
        } else if (event.key === "Home") {
          target = 0;
        } else if (event.key === "End") {
          target = buttons.length - 1;
        } else {
          return;
        }
        event.preventDefault();
        buttons[target].focus();
      });
    });
    help.textContent = `Tillgängliga variabler: ${variableDefinitions
      .map(definition => `{${definition.name}}`)
      .join(", ")}`;
  }

  function updatePreview(elements, session, settings, now = new Date()) {
    const messages = validationMessages(elements.input.value);
    const filename = buildFileName("docx", session, settings, now);
    elements.preview.textContent = `Förhandsvisning: ${filename}`;
    elements.preview.setAttribute(
      "aria-live",
      messages.length > 0 ? "off" : "polite"
    );
    elements.preview.classList.toggle("invalid", messages.length > 0);
    elements.input.classList.toggle(
      "filename-template-invalid",
      messages.length > 0
    );
    elements.input.setAttribute("aria-invalid", String(messages.length > 0));
    elements.validation.textContent = messages.join(" ");
    return filename;
  }

  return {
    buildFileName,
    insertVariable,
    renderVariableControls,
    safeFileName,
    updatePreview,
    validateTemplate,
    validationMessages,
    variableDefinitions
  };
});
