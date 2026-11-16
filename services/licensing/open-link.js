"use strict";

// The page a link in an assignment email opens: https, so that Outlook keeps the link and any
// browser can open it. BC Process Studio recognises the page and opens the test in the
// extension; without the extension the page says what to do. The page holds no data: the
// link carries only the random ids of the suite and the test, which the page neither stores,
// logs nor sends anywhere, and it runs no script. Its language follows the browser's.
const TEXTS = Object.freeze({
  "sv": { title: "Öppna testet i BC Process Studio",
    lead: "BC Process Studio öppnar testet nu.",
    help: "Händer inget? Öppna länken i Microsoft Edge där BC Process Studio är installerat. Har du inte BC Process Studio, be den som tilldelade testet om hjälp." },
  "en": { title: "Open the test in BC Process Studio",
    lead: "BC Process Studio is opening the test.",
    help: "Nothing happening? Open the link in Microsoft Edge with BC Process Studio installed. If you do not have BC Process Studio, ask the person who assigned the test for help." },
  "fr": { title: "Ouvrir le test dans BC Process Studio",
    lead: "BC Process Studio ouvre le test.",
    help: "Rien ne se passe ? Ouvrez le lien dans Microsoft Edge avec BC Process Studio installé. Si vous n’avez pas BC Process Studio, demandez de l’aide à la personne qui vous a attribué le test." },
  "de": { title: "Den Test in BC Process Studio öffnen",
    lead: "BC Process Studio öffnet den Test.",
    help: "Passiert nichts? Öffnen Sie den Link in Microsoft Edge mit installiertem BC Process Studio. Wenn Sie BC Process Studio nicht haben, bitten Sie die Person um Hilfe, die Ihnen den Test zugewiesen hat." },
  "es": { title: "Abrir la prueba en BC Process Studio",
    lead: "BC Process Studio está abriendo la prueba.",
    help: "¿No ocurre nada? Abra el enlace en Microsoft Edge con BC Process Studio instalado. Si no tiene BC Process Studio, pida ayuda a la persona que le asignó la prueba." },
  "da": { title: "Åbn testen i BC Process Studio",
    lead: "BC Process Studio åbner testen.",
    help: "Sker der ikke noget? Åbn linket i Microsoft Edge, hvor BC Process Studio er installeret. Har du ikke BC Process Studio, så bed den, der tildelte testen, om hjælp." },
  "fi": { title: "Avaa testi BC Process Studiossa",
    lead: "BC Process Studio avaa testin.",
    help: "Eikö mitään tapahdu? Avaa linkki Microsoft Edgessä, johon BC Process Studio on asennettu. Jos sinulla ei ole BC Process Studiota, pyydä apua testin määrittäneeltä henkilöltä." },
  "nb": { title: "Åpne testen i BC Process Studio",
    lead: "BC Process Studio åpner testen.",
    help: "Skjer det ingenting? Åpne lenken i Microsoft Edge der BC Process Studio er installert. Har du ikke BC Process Studio, be den som tildelte testen, om hjelp." }
});
const ALIASES = Object.freeze({ no: "nb", nn: "nb" });

// The first language in Accept-Language that the page has, else English.
function language(acceptLanguage) {
  const wanted = String(acceptLanguage || "").split(",").map(part => {
    const [tag, ...params] = part.trim().toLowerCase().split(";");
    const q = params.map(param => param.trim()).find(param => param.startsWith("q="));
    return { base: tag.split("-")[0], q: q ? Number(q.slice(2)) || 0 : 1 };
  }).filter(item => item.base && item.q > 0).sort((a, b) => b.q - a.q);
  for (const { base } of wanted) {
    const code = ALIASES[base] || base;
    if (TEXTS[code]) return code;
  }
  return "en";
}

const escape = value => String(value).replace(/[&<>"]/gu, ch =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);

function openPage(acceptLanguage) {
  const code = language(acceptLanguage);
  const text = TEXTS[code];
  return `<!doctype html>
<html lang="${code}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>${escape(text.title)}</title>
<style>:root{color-scheme:light dark}body{margin:0;font:16px/1.5 "Segoe UI",system-ui,sans-serif;background:#f5f7fa;color:#172b4d}
main{max-width:560px;margin:15vh auto 0;padding:0 16px}h1{font-size:1.4rem;margin:0 0 8px}p{margin:0 0 12px}
@media(prefers-color-scheme:dark){body{background:#181b1f;color:#e6e9ee}}</style></head>
<body><main><h1>${escape(text.title)}</h1><p id="bcps-open-lead">${escape(text.lead)}</p>
<p>${escape(text.help)}</p></main></body></html>`;
}

const OPEN_HEADERS = Object.freeze({
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "X-Frame-Options": "DENY",
  "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  "Vary": "Accept-Language"
});

module.exports = { openPage, language, OPEN_HEADERS, OPEN_LANGUAGES: Object.keys(TEXTS) };
