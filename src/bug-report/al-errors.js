(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9AlErrors = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
"use strict";
// Reads AL source to find the labels that Business Central shows as errors, the object that shows
// each of them, and the actions Microsoft attaches to an error (ErrorInfo.AddAction and
// AddNavigationAction). Used by scripts/build-error-labels.js for Microsoft's apps, and by
// app-errors.js for the apps a user adds in the settings, on the user's computer.
//
// A label counts as an error when it is the message of Error(...), the second argument of
// FieldError(...), or the message of an ErrorInfo (ErrorInfo.Create(...), Info.Message := ... or
// Info.Message(...) on a variable of type ErrorInfo), directly or through StrSubstNo(...). An
// action belongs to the error whose ErrorInfo variable it is added to in the same procedure.

const NAME = String.raw`(?:"(?:[^"]|"")+"|[A-Za-z_]\w*)`;
const unquote = name => String(name || "").trim().replace(/^"(.*)"$/su, "$1").replace(/""/gu, "\"");
const key = name => unquote(name).toLowerCase();
// An argument that is a label, directly or as the first argument of StrSubstNo.
const LABEL_ARG = String.raw`\s*(?:StrSubstNo\s*\(\s*)?(${NAME})`;

// Code without comments and string literals, so that a word inside them is not read as code.
function code(source) {
  return source.replace(/\/\*[\s\S]*?\*\//gu, " ").replace(/\/\/[^\n]*/gu, " ")
    .replace(/'(?:[^']|'')*'/gu, "''");
}

// Each object in a file: its type, name and labels ("Text001" -> declared), and its code split
// into procedures and triggers.
function objects(source) {
  const result = [];
  const header = new RegExp(String.raw`^\s*(table|tableextension|page|pageextension|codeunit|report|reportextension|xmlport|query|enum|enumextension|interface|permissionset|controladdin|profile)\s+(?:\d+\s+)?(${NAME})`, "gimu");
  const starts = [...source.matchAll(header)];
  starts.forEach((match, index) => {
    const text = source.slice(match.index, index + 1 < starts.length ? starts[index + 1].index : source.length);
    const labels = new Set();
    for (const label of text.matchAll(new RegExp(String.raw`(${NAME})\s*:\s*Label\s+'`, "gu"))) labels.add(key(label[1]));
    const body = code(text);
    // Variables and parameters of type ErrorInfo; a Notification has a message and actions too.
    const errorInfos = new Set([...body.matchAll(new RegExp(String.raw`(${NAME})\s*:\s*ErrorInfo\b`, "giu"))]
      .map(declared => key(declared[1])));
    const parts = body.split(/\n\s*(?:\[[^\]]*\]\s*)*(?:local\s+|internal\s+|protected\s+)?(?:procedure|trigger)\s+/iu);
    result.push({ type: match[1].toLowerCase(), name: unquote(match[2]), labels, errorInfos, parts });
  });
  return result;
}

const TYPE_CAPTION = { table: "Table", tableextension: "TableExtension", page: "Page", pageextension: "PageExtension",
  codeunit: "Codeunit", report: "Report", reportextension: "ReportExtension", xmlport: "XmlPort", query: "Query",
  enum: "Enum", enumextension: "EnumExtension", interface: "Interface" };

// The index of the parenthesis that closes the one at open, or -1.
function closing(text, open) {
  let depth = 0;
  for (let index = open; index < text.length; index += 1) {
    if (text[index] === "(") depth += 1;
    else if (text[index] === ")" && --depth === 0) return index;
  }
  return -1;
}
// Text split at a separator that is not inside parentheses or brackets.
function split(text, separator) {
  const result = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < text.length; index += 1) {
    if ("([".includes(text[index])) depth += 1;
    else if (")]".includes(text[index])) depth -= 1;
    else if (text[index] === separator && depth === 0) { result.push(text.slice(start, index)); start = index + 1; }
  }
  result.push(text.slice(start));
  return result;
}
// A procedure's name, parameters and body, from a part that starts with "Throw(ErrorMessage: Text; ...)".
function signature(part) {
  const name = new RegExp(String.raw`^(${NAME})\s*\(`, "u").exec(part);
  if (!name) return null;
  const close = closing(part, name[0].length - 1);
  if (close < 0) return null;
  const params = split(part.slice(name[0].length, close), ";").map(param => {
    const match = new RegExp(String.raw`^\s*(?:var\s+)?(${NAME})\s*:\s*([\s\S]*)$`, "iu").exec(param);
    return match ? { name: key(match[1]), type: match[2].replace(/\s+/gu, " ").trim().toLowerCase() } : { name: "", type: "" };
  });
  return { name: key(name[1]), params, body: part.slice(close + 1) };
}
const escapeName = name => name.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");

// Errors in the sources: [{ object: 'Codeunit "Sales-Post"', hint: "Codeunit Sales-Post - NamedType X",
// actions: [hint of each action caption] }]. The hint is how the translation files name the label.
//
// Some errors are raised by a helper: the caller passes the message, and the actions as a call
// that returns them ("Throw(StrSubstNo(CannotAssignNewErr, Code), Code, Errors.OpenNoSeriesLinesAction())").
// A helper is a procedure that raises one of its Text parameters as an error; an action procedure
// adds a caption label to a dictionary. The error belongs to the caller, the caption to the
// action procedure's object.
function errors(sources) {
  const found = new Map();
  const all = sources.flatMap(source => objects(source)).filter(object => TYPE_CAPTION[object.type]);
  const objectKey = (type, name) => `${type}|${key(name)}`;
  const hintOf = (object, label) => `${TYPE_CAPTION[object.type]} ${object.name} - NamedType ${unquote(label)}`;
  const record = (object, label, actionHints = []) => {
    if (!object.labels.has(key(label))) return;
    const id = hintOf(object, label);
    const entry = found.get(id) || { object: `${TYPE_CAPTION[object.type]} "${object.name}"`, hint: id, actions: new Set() };
    actionHints.forEach(action => entry.actions.add(action));
    found.set(id, entry);
  };
  // Helpers and action procedures by object and procedure name.
  const helpers = new Map();
  const actionProcedures = new Map();
  for (const object of all) {
    for (const part of object.parts.slice(1)) {
      const procedure = signature(part);
      if (!procedure) continue;
      const id = `${objectKey(object.type, object.name)}|${procedure.name}`;
      const message = procedure.params.findIndex(param => param.name && /^(?:text|code)\b/u.test(param.type) &&
        new RegExp(String.raw`(?:\bError\s*\(|\.Message\s*(?::=|\()|\bErrorInfo\.Create\s*\()\s*"?${escapeName(param.name)}"?\s*[,;)]`, "iu").test(procedure.body));
      if (message >= 0) {
        const actions = procedure.params.map((param, index) => /^dictionary of \[text, ?text\]/u.test(param.type) ? index : -1)
          .filter(index => index >= 0);
        helpers.set(id, [...(helpers.get(id) || []), { count: procedure.params.length, message, actions }]);
      }
      if (/\bDictionary of\b/iu.test(part)) {
        const caption = [...procedure.body.matchAll(new RegExp(String.raw`\.Add\s*\(\s*''\s*,\s*(${NAME})\s*\)`, "giu"))]
          .map(match => match[1]).find(label => object.labels.has(key(label)));
        if (caption) actionProcedures.set(id, hintOf(object, caption));
      }
    }
  }
  for (const object of all) {
    const codeunits = new Map([...object.parts.join("\n").matchAll(new RegExp(String.raw`(${NAME})\s*:\s*Codeunit\s+(${NAME})`, "giu"))]
      .map(match => [key(match[1]), objectKey("codeunit", match[2])]));
    // The object a call goes to: a codeunit variable's codeunit, or this object.
    const target = variable => variable ? codeunits.get(key(variable)) : objectKey(object.type, object.name);
    for (const part of object.parts) {
      for (const call of part.matchAll(new RegExp(String.raw`(?:(${NAME})\.)?(${NAME})\s*\(`, "gu"))) {
        if (call.index > 0 && /[\w."]/u.test(part[call.index - 1])) continue;
        const destination = target(call[1]);
        const overloads = destination && helpers.get(`${destination}|${key(call[2])}`);
        if (!overloads) continue;
        const open = call.index + call[0].length - 1;
        const close = closing(part, open);
        if (close < 0) continue;
        const values = split(part.slice(open + 1, close), ",");
        const helper = overloads.find(item => item.count === values.length);
        if (!helper) continue;
        const label = new RegExp(String.raw`^${LABEL_ARG}`, "u").exec(values[helper.message])?.[1];
        if (!label) continue;
        const actionHints = helper.actions.map(index => new RegExp(String.raw`^\s*(?:(${NAME})\.)?(${NAME})\s*\(\s*\)\s*$`, "u")
          .exec(values[index] || "")).filter(Boolean)
          .map(match => actionProcedures.get(`${target(match[1])}|${key(match[2])}`)).filter(Boolean);
        record(object, label, actionHints);
      }
    }
  }
  for (const object of all) {
    const add = (label, actions = []) => record(object, label,
      actions.filter(action => object.labels.has(key(action))).map(action => hintOf(object, action)));
    {
      for (const part of object.parts) {
        for (const match of part.matchAll(new RegExp(String.raw`\bError\s*\(${LABEL_ARG}`, "giu"))) add(match[1]);
        for (const match of part.matchAll(new RegExp(String.raw`\bFieldError\s*\([^,;]*?,${LABEL_ARG}`, "giu"))) add(match[1]);
        // ErrorInfo: the variable, its message label and the actions added to it in this procedure.
        const messages = new Map();
        for (const match of part.matchAll(new RegExp(String.raw`(${NAME})\s*:=\s*ErrorInfo\.Create\s*\(${LABEL_ARG}`, "giu"))) messages.set(key(match[1]), match[2]);
        for (const match of part.matchAll(new RegExp(String.raw`(${NAME})\.Message\s*(?::=|\()${LABEL_ARG}`, "giu"))) messages.set(key(match[1]), match[2]);
        for (const match of part.matchAll(new RegExp(String.raw`\bErrorInfo\.Create\s*\(${LABEL_ARG}`, "giu"))) add(match[1]);
        for (const [variable, label] of messages) {
          if (!object.errorInfos.has(variable)) continue;
          const actions = [...part.matchAll(new RegExp(String.raw`(${NAME})\.Add(?:Navigation)?Action\s*\(\s*(${NAME})`, "giu"))]
            .filter(match => key(match[1]) === variable).map(match => match[2]);
          add(label, actions);
        }
      }
    }
  }
  return [...found.values()].map(entry => ({ ...entry, actions: [...entry.actions] }));
}

return { errors, objects };
});
