const DEFAULTS = {
  exportFileNamePattern: "{process} - {environment} - {date}",
  documentationProfile: "generic",
  captureScreenshots: true,
  screenshotMode: "important",
  maskValues: true,
  maxEvents: 20000,
  environmentName: "ApteanAdvance",
  advancedOverridesEnabled: false,
  maskSalesOrderNo: true,
  maskPurchaseOrderNo: true,
  maskInvoiceNo: true,
  maskReceiptNo: true,
  maskShipmentNo: true,
  maskProductionOrderNo: true,
  maskPostedDocumentNo: true,
  maskCompanyName: true,
  maskTenantAndUrl: true,
  maskCustomerNo: false,
  maskVendorNo: false,
  maskItemNo: false,
  maskLocationCode: false,
  maskLotBatchNo: false
};

const $ = id => document.getElementById(id);
const send = message => chrome.runtime.sendMessage(message);


const CONTEXT_BUILDER_VERSION = "4.3.0";

function contextPageCaption(event) {
  return cleanUiCaption(
    event.pageCaption ||
    event.documentTitle ||
    ""
  );
}

function eventControlCaption(event) {
  return cleanUiCaption(
    event.fieldName ||
    event.label ||
    ""
  );
}

function isOpenRecordEvent(event) {
  return (
    event.type === "click" &&
    /open record|öppna post/i.test(eventControlCaption(event))
  );
}

function isConfirmEvent(event) {
  return (
    event.type === "click" &&
    /^(ja|nej|yes|no)$/i.test(eventControlCaption(event))
  );
}

function isStatusActionEvent(event) {
  return (
    event.type === "click" &&
    /^(öppna igen|reopen|släpp|frisläpp|release)$/i.test(
      eventControlCaption(event)
    )
  );
}

function isPostActionEvent(event) {
  return (
    event.type === "click" &&
    /^(bokför|post)$/i.test(eventControlCaption(event))
  );
}

function detectContextEntity(pageCaption) {
  const value = String(pageCaption || "");

  const mappings = [
    { entity: "SalesOrder", patterns: [/förs\.?\s*order/i, /försäljningsorder/i, /sales order/i] },
    { entity: "PurchaseOrder", patterns: [/inköpsorder/i, /purchase order/i] },
    { entity: "PostedSalesInvoice", patterns: [/bokförd.*försäljningsfaktura/i, /posted sales invoice/i] },
    { entity: "Customer", patterns: [/kund/i, /customer/i] },
    { entity: "Vendor", patterns: [/leverantör/i, /vendor/i] },
    { entity: "Item", patterns: [/artikel/i, /item/i] },
    { entity: "WarehouseReceipt", patterns: [/distlagerinleverans/i, /warehouse receipt/i] },
    { entity: "WarehouseShipment", patterns: [/distlagerutleverans/i, /warehouse shipment/i] },
    { entity: "ProductionOrder", patterns: [/produktionsorder/i, /production order/i] },
    { entity: "QualityCheck", patterns: [/qc.*check/i, /quality.*check/i, /kvalitetskontroll/i] },
    { entity: "Claim", patterns: [/reklamation/i, /claim/i] }
  ];

  for (const mapping of mappings) {
    if (mapping.patterns.some(pattern => pattern.test(value))) {
      return mapping.entity;
    }
  }

  return "";
}

function extractRecordValueFromOpenCaption(caption) {
  const text = cleanUiCaption(caption);

  const quoted = text.match(/["“](.+?)["”]/);
  if (quoted) return quoted[1];

  const trailing = text.match(/(?:open record|öppna post(?:en)?)\s+([A-Z0-9._/-]+)$/i);
  if (trailing) return trailing[1];

  return "";
}

function buildContextEvents(rawEvents) {
  const result = [];
  let currentPage = "";
  let previousPage = "";
  let currentEntity = "";
  let selectedRecordValue = "";
  let pendingAction = null;
  let activeDialog = null;

  for (let index = 0; index < rawEvents.length; index += 1) {
    const event = rawEvents[index];
    const next = rawEvents[index + 1];
    const next2 = rawEvents[index + 2];

    const eventPage = contextPageCaption(event);
    if (eventPage && eventPage !== currentPage) {
      previousPage = currentPage;
      currentPage = eventPage;
      currentEntity = detectContextEntity(currentPage) || currentEntity;
    }

    if (isOpenRecordEvent(event)) {
      selectedRecordValue =
        extractRecordValueFromOpenCaption(eventControlCaption(event)) ||
        selectedRecordValue;
    }

    if (event.category === "dialog") {
      activeDialog = {
        eventNo: event.eventNo,
        caption: eventControlCaption(event),
        pageCaption: currentPage
      };
    }

    if (isStatusActionEvent(event) || isPostActionEvent(event)) {
      pendingAction = {
        eventNo: event.eventNo,
        caption: eventControlCaption(event),
        semanticHint: isPostActionEvent(event)
          ? "PostDocument"
          : /öppna igen|reopen/i.test(eventControlCaption(event))
            ? "ReopenDocument"
            : "ReleaseDocument"
      };
    }

    const navigationTarget =
      next?.category === "navigation"
        ? contextPageCaption(next)
        : next2?.category === "navigation"
          ? contextPageCaption(next2)
          : "";

    const enriched = {
      ...event,
      context: {
        builderVersion: CONTEXT_BUILDER_VERSION,
        currentPageCaption: currentPage,
        previousPageCaption: previousPage,
        currentEntity,
        selectedRecordValue,
        pendingActionCaption: pendingAction?.caption || "",
        pendingSemanticHint: pendingAction?.semanticHint || "",
        activeDialogCaption: activeDialog?.caption || "",
        hasFollowingNavigation: Boolean(navigationTarget),
        followingPageCaption: navigationTarget,
        followingEntity: detectContextEntity(navigationTarget),
        isOpenRecord: isOpenRecordEvent(event),
        isConfirmation: isConfirmEvent(event),
        isStatusAction: isStatusActionEvent(event),
        isPostAction: isPostActionEvent(event)
      }
    };

    result.push(enriched);

    if (isConfirmEvent(event)) {
      activeDialog = null;
      pendingAction = null;
    }

    if (event.category === "navigation" && eventPage) {
      currentPage = eventPage;
      currentEntity = detectContextEntity(eventPage) || currentEntity;
    }
  }

  return result;
}

function createContextCandidates(contextEvents) {
  const candidates = [];

  for (let index = 0; index < contextEvents.length; index += 1) {
    const event = contextEvents[index];
    const context = event.context || {};

    if (context.isOpenRecord) {
      candidates.push({
        candidateType: "OpenRecord",
        sourceEventNos: [event.eventNo],
        currentPageCaption: context.currentPageCaption,
        targetPageCaption: context.followingPageCaption,
        entity:
          context.followingEntity ||
          context.currentEntity,
        recordValue: context.selectedRecordValue,
        confidence: context.followingPageCaption ? 0.96 : 0.82,
        reason: [
          `Current page: ${context.currentPageCaption || "unknown"}`,
          `Action: ${eventControlCaption(event)}`,
          context.followingPageCaption
            ? `Following page: ${context.followingPageCaption}`
            : "No following navigation"
        ]
      });
    }

    if (context.isStatusAction) {
      const nextConfirm = contextEvents
        .slice(index + 1, index + 5)
        .find(candidate => candidate.context?.isConfirmation);

      candidates.push({
        candidateType: context.pendingSemanticHint || "ChangeDocumentStatus",
        sourceEventNos: [
          event.eventNo,
          ...(nextConfirm ? [nextConfirm.eventNo] : [])
        ],
        currentPageCaption: context.currentPageCaption,
        entity: context.currentEntity,
        actionCaption: eventControlCaption(event),
        confirmationCaption: nextConfirm
          ? eventControlCaption(nextConfirm)
          : "",
        confidence: nextConfirm ? 0.99 : 0.94,
        reason: [
          `Page: ${context.currentPageCaption || "unknown"}`,
          `Action: ${eventControlCaption(event)}`,
          nextConfirm
            ? `Confirmation: ${eventControlCaption(nextConfirm)}`
            : "No explicit confirmation"
        ]
      });
    }

    if (context.isPostAction) {
      const nextConfirm = contextEvents
        .slice(index + 1, index + 6)
        .find(candidate => candidate.context?.isConfirmation);

      candidates.push({
        candidateType: "PostDocument",
        sourceEventNos: [
          event.eventNo,
          ...(nextConfirm ? [nextConfirm.eventNo] : [])
        ],
        currentPageCaption: context.currentPageCaption,
        entity: context.currentEntity,
        actionCaption: eventControlCaption(event),
        confirmationCaption: nextConfirm
          ? eventControlCaption(nextConfirm)
          : "",
        confidence: nextConfirm ? 0.99 : 0.95,
        reason: [
          `Page: ${context.currentPageCaption || "unknown"}`,
          `Action: ${eventControlCaption(event)}`,
          nextConfirm
            ? `Confirmation: ${eventControlCaption(nextConfirm)}`
            : "No explicit confirmation"
        ]
      });
    }

    if (
      event.type === "field-change" &&
      /datum|date/i.test(eventControlCaption(event))
    ) {
      candidates.push({
        candidateType: "ChangeDate",
        sourceEventNos: [event.eventNo],
        currentPageCaption: context.currentPageCaption,
        entity: context.currentEntity,
        fieldCaption: eventControlCaption(event),
        value: event.value ?? "",
        confidence: 0.96,
        reason: [
          `Page: ${context.currentPageCaption || "unknown"}`,
          `Field: ${eventControlCaption(event)}`
        ]
      });
    }
  }

  return candidates;
}


const KNOWLEDGE_PACK_FRAMEWORK_VERSION = "4.3.0";
let loadedKnowledgePacks = [];
let loadedKnowledgeRules = [];
let unmatchedKnowledgeItems = [];

async function loadKnowledgePacks() {
  const indexUrl = chrome.runtime.getURL("knowledge-packs/index.json");
  const indexResponse = await fetch(indexUrl);
  const index = await indexResponse.json();

  const packs = [];
  for (const descriptor of index.packs || []) {
    if (descriptor.enabled === false) continue;
    const url = chrome.runtime.getURL(descriptor.file);
    const response = await fetch(url);
    const pack = await response.json();
    packs.push(pack);
  }

  loadedKnowledgePacks = packs;
  loadedKnowledgeRules = packs
    .flatMap(pack => (pack.rules || []).map(rule => ({
      ...rule,
      packId: pack.packId,
      packName: pack.name,
      packVersion: pack.version,
      packPriority: pack.priority || 0
    })))
    .sort((a, b) =>
      (b.priority + b.packPriority) - (a.priority + a.packPriority)
    );

  return packs;
}

function testPatterns(patterns, value) {
  const text = String(value || "");
  if (!patterns?.length) return true;

  return patterns.some(pattern => {
    try {
      return new RegExp(pattern, "i").test(text);
    } catch {
      return false;
    }
  });
}

function knowledgeRuleScore(rule, task) {
  const match = rule.match || {};
  let score = 0;
  let matched = 0;
  let required = 0;

  const context = task.context || {};

  const checks = [
    [
      "pagePatterns",
      task.pageCaption ||
      context.currentPageCaption ||
      context.previousPageCaption
    ],
    ["actionPatterns", task.actionCaption],
    ["fieldPatterns", task.fieldCaption],
    ["automationIdPatterns", task.automationId]
  ];

  for (const [key, value] of checks) {
    const patterns = match[key] || [];
    if (!patterns.length) continue;
    required += 1;

    if (testPatterns(patterns, value)) {
      matched += 1;
      score += 25;
    }
  }

  if (required === 0) return 0;
  if (matched === 0) return 0;

  // Require all declared dimensions to match.
  if (matched < required) return 0;

  score += Math.round((rule.confidence || 0.5) * 50);
  score += Math.min(25, Math.round((rule.priority || 0) / 50));

  if (
    task.context?.currentEntity &&
    rule.entity &&
    task.context.currentEntity === rule.entity
  ) {
    score += 20;
  }

  if (
    task.context?.followingEntity &&
    rule.entity &&
    task.context.followingEntity === rule.entity
  ) {
    score += 20;
  }

  if (
    task.context?.pendingSemanticHint &&
    rule.semanticAction === task.context.pendingSemanticHint
  ) {
    score += 25;
  }

  return score;
}

function matchKnowledgeRule(task) {
  let best = null;
  let bestScore = 0;

  for (const rule of loadedKnowledgeRules) {
    const score = knowledgeRuleScore(rule, task);
    if (score > bestScore) {
      best = rule;
      bestScore = score;
    }
  }

  return best ? { rule: best, score: bestScore } : null;
}

function applyKnowledgeRule(task, match, settings) {
  if (!match) {
    unmatchedKnowledgeItems.push({
      pageId: task.pageId || "",
      pageCaption: task.pageCaption || "",
      actionCaption: task.actionCaption || "",
      fieldCaption: task.fieldCaption || "",
      selectedCaption: task.selectedCaption || "",
      automationId: task.automationId || "",
      context: task.context || {},
      suggestedRule: {
        ruleId: `Custom.${task.context?.currentEntity || task.taskType || "Task"}`,
        taskType: task.taskType || "RunAction",
        semanticAction: task.semanticAction || "",
        entity: task.entity || "",
        priority: 500,
        confidence: 0.75,
        match: {
          pagePatterns:
            task.context?.currentPageCaption
              ? [`^${task.context.currentPageCaption}$`]
              : task.pageCaption
                ? [`^${task.pageCaption}$`]
                : [],
          actionPatterns: task.actionCaption ? [`^${task.actionCaption}$`] : [],
          fieldPatterns: task.fieldCaption ? [`^${task.fieldCaption}$`] : [],
          automationIdPatterns: task.automationId ? [`^${task.automationId}$`] : []
        }
      }
    });

    return {
      ...task,
      knowledgeFrameworkVersion: KNOWLEDGE_PACK_FRAMEWORK_VERSION,
      knowledgeMatched: false,
      confidence: task.confidence || 0.55,
      reviewSuggested: true
    };
  }

  const rule = match.rule;
  const updated = {
    ...task,
    taskType: rule.taskType || task.taskType,
    semanticAction: rule.semanticAction || task.semanticAction,
    entity: rule.entity || task.entity || "",
    knowledgeFrameworkVersion: KNOWLEDGE_PACK_FRAMEWORK_VERSION,
    knowledgeMatched: true,
    knowledgeRule: rule.ruleId,
    knowledgePackId: rule.packId,
    knowledgePackName: rule.packName,
    knowledgePackVersion: rule.packVersion,
    confidence: rule.confidence || task.confidence || 0.8,
    reviewSuggested: (rule.confidence || 0.8) < 0.85
  };

  if (rule.instructionTemplate) {
    updated.instruction = rule.instructionTemplate;
  }

  return updated;
}

function applyKnowledgePackFramework(tasks, settings) {
  unmatchedKnowledgeItems = [];
  return tasks.map(task =>
    applyKnowledgeRule(task, matchKnowledgeRule(task), settings)
  );
}


const PROFILE_PRESETS = {
  generic: {
    label: "Generisk manual",
    help: "Maskerar transaktionsnummer, företagsnamn, tenant och URL. Kund-, artikel-, lagerplats- och lot-/batchvärden behålls.",
    maskSalesOrderNo: true,
    maskPurchaseOrderNo: true,
    maskInvoiceNo: true,
    maskReceiptNo: true,
    maskShipmentNo: true,
    maskProductionOrderNo: true,
    maskPostedDocumentNo: true,
    maskCompanyName: true,
    maskTenantAndUrl: true,
    maskCustomerNo: false,
    maskVendorNo: false,
    maskItemNo: false,
    maskLocationCode: false,
    maskLotBatchNo: false
  },
  customer: {
    label: "Kundspecifik manual",
    help: "Behåller kundens masterdata och transaktionsvärden. Tenant och URL tas bort.",
    maskSalesOrderNo: false,
    maskPurchaseOrderNo: false,
    maskInvoiceNo: false,
    maskReceiptNo: false,
    maskShipmentNo: false,
    maskProductionOrderNo: false,
    maskPostedDocumentNo: false,
    maskCompanyName: false,
    maskTenantAndUrl: true,
    maskCustomerNo: false,
    maskVendorNo: false,
    maskItemNo: false,
    maskLocationCode: false,
    maskLotBatchNo: false
  },
  internal: {
    label: "Intern dokumentation",
    help: "Behåller all affärsdata. Endast teknisk tenant- och URL-information tas bort.",
    maskSalesOrderNo: false,
    maskPurchaseOrderNo: false,
    maskInvoiceNo: false,
    maskReceiptNo: false,
    maskShipmentNo: false,
    maskProductionOrderNo: false,
    maskPostedDocumentNo: false,
    maskCompanyName: false,
    maskTenantAndUrl: true,
    maskCustomerNo: false,
    maskVendorNo: false,
    maskItemNo: false,
    maskLocationCode: false,
    maskLotBatchNo: false
  },
  training: {
    label: "Utbildningsmaterial",
    help: "Maskerar transaktionsnummer men behåller tydliga exempel på masterdata och testdata.",
    maskSalesOrderNo: true,
    maskPurchaseOrderNo: true,
    maskInvoiceNo: true,
    maskReceiptNo: true,
    maskShipmentNo: true,
    maskProductionOrderNo: true,
    maskPostedDocumentNo: true,
    maskCompanyName: false,
    maskTenantAndUrl: true,
    maskCustomerNo: false,
    maskVendorNo: false,
    maskItemNo: false,
    maskLocationCode: false,
    maskLotBatchNo: false
  }
};

function applyProfile(profileName, updateControls = true) {
  const preset = PROFILE_PRESETS[profileName] || PROFILE_PRESETS.generic;
  $("profileHelp").textContent = preset.help;

  if (!updateControls) return;

  for (const [key, value] of Object.entries(preset)) {
    const element = $(key);
    if (element && typeof value === "boolean") {
      element.checked = value;
    }
  }
}


function show(text, error = false) {
  $("message").textContent = text || "";
  $("message").style.color = error ? "#b42318" : "#166534";
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function safeFileName(value) {
  return globalThis.T9Engine.exportSettings.safeFileName(value);
}

function bytes(text) {
  return new TextEncoder().encode(text);
}

function dataUrlBytes(dataUrl) {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const binary = atob(base64);
  const result = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    result[index] = binary.charCodeAt(index);
  }

  return result;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);

  for (let n = 0; n < 256; n += 1) {
    let value = n;

    for (let k = 0; k < 8; k += 1) {
      value = (value & 1)
        ? 0xedb88320 ^ (value >>> 1)
        : value >>> 1;
    }

    table[n] = value >>> 0;
  }

  return table;
})();

function crc32(data) {
  let crc = 0xffffffff;

  for (const value of data) {
    crc = CRC_TABLE[(crc ^ value) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function dosTime(value) {
  const date = new Date(value || Date.now());
  const year = Math.max(1980, date.getFullYear());

  return {
    time:
      (date.getHours() << 11) |
      (date.getMinutes() << 5) |
      Math.floor(date.getSeconds() / 2),
    date:
      ((year - 1980) << 9) |
      ((date.getMonth() + 1) << 5) |
      date.getDate()
  };
}

function u16(view, offset, value) {
  view.setUint16(offset, value, true);
}

function u32(view, offset, value) {
  view.setUint32(offset, value >>> 0, true);
}

function zip(files) {
  const locals = [];
  const centrals = [];
  let offset = 0;

  for (const file of files) {
    const name = bytes(file.name);
    const data = file.data;
    const crc = crc32(data);
    const date = dosTime(file.modifiedAt);

    const local = new Uint8Array(30 + name.length + data.length);
    const localView = new DataView(local.buffer);

    u32(localView, 0, 0x04034b50);
    u16(localView, 4, 20);
    u16(localView, 6, 0x0800);
    u16(localView, 8, 0);
    u16(localView, 10, date.time);
    u16(localView, 12, date.date);
    u32(localView, 14, crc);
    u32(localView, 18, data.length);
    u32(localView, 22, data.length);
    u16(localView, 26, name.length);
    u16(localView, 28, 0);
    local.set(name, 30);
    local.set(data, 30 + name.length);
    locals.push(local);

    const central = new Uint8Array(46 + name.length);
    const centralView = new DataView(central.buffer);

    u32(centralView, 0, 0x02014b50);
    u16(centralView, 4, 20);
    u16(centralView, 6, 20);
    u16(centralView, 8, 0x0800);
    u16(centralView, 10, 0);
    u16(centralView, 12, date.time);
    u16(centralView, 14, date.date);
    u32(centralView, 16, crc);
    u32(centralView, 20, data.length);
    u32(centralView, 24, data.length);
    u16(centralView, 28, name.length);
    u16(centralView, 30, 0);
    u16(centralView, 32, 0);
    u16(centralView, 34, 0);
    u16(centralView, 36, 0);
    u32(centralView, 38, 0);
    u32(centralView, 42, offset);
    central.set(name, 46);
    centrals.push(central);

    offset += local.length;
  }

  const centralSize = centrals.reduce((sum, value) => sum + value.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);

  u32(endView, 0, 0x06054b50);
  u16(endView, 4, 0);
  u16(endView, 6, 0);
  u16(endView, 8, files.length);
  u16(endView, 10, files.length);
  u32(endView, 12, centralSize);
  u32(endView, 16, offset);
  u16(endView, 20, 0);

  return new Blob([...locals, ...centrals, end], {
    type: "application/zip"
  });
}

function rawPageCaption(event) {
  return String(
    event.pageCaption ||
    event.documentTitle ||
    ""
  )
    .replace(/\s+/g, " ")
    .trim();
}

function stripWindowChrome(title) {
  return String(title || "")
    .replace(/\s+[∙·]\s+.*$/, "")
    .replace(/\s+-\s+Microsoft Dynamics 365 Business Central.*$/i, "")
    .trim();
}

function visiblePageCaption(event) {
  const caption = rawPageCaption(event);

  // Preserve the UI caption. Only remove surrounding browser/window chrome.
  return stripWindowChrome(caption) || "aktuell sida";
}

function cleanUiCaption(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/[]+/g, "")
    .trim();
}


function normalizePageCaptionForDocumentation(caption, settings) {
  let result = String(caption || "").trim();

  if (settings?.maskCompanyName !== false) {
    result = result
      .replace(/\s*\([^)]*\)\s*$/, "")
      .replace(/\s+-\s+[A-ZÅÄÖ0-9][A-ZÅÄÖ0-9 _.-]{2,}$/, "");
  }

  // Remove transaction numbers from card page titles.
  result = result
    .replace(/\s+-\s+\d{4,}\s*$/, "")
    .replace(/\s+\d{4,}\s*$/, "");

  return result.trim() || "aktuell sida";
}

function classifyBusinessValue({
  value,
  fieldCaption = "",
  actionCaption = "",
  pageCaption = "",
  source = ""
}) {
  const rawValue = String(value ?? "").trim();
  const context = `${fieldCaption} ${actionCaption} ${pageCaption} ${source}`.toLowerCase();

  const matchers = [
    {
      role: "SalesOrderNo",
      patterns: [/förs\.?order/i, /försäljningsorder/i, /sales order/i],
      maskSetting: "maskSalesOrderNo",
      generic: "den försäljningsorder som ska hanteras"
    },
    {
      role: "PurchaseOrderNo",
      patterns: [/inköpsorder/i, /purchase order/i],
      maskSetting: "maskPurchaseOrderNo",
      generic: "den inköpsorder som ska hanteras"
    },
    {
      role: "InvoiceNo",
      patterns: [/fakturanr/i, /fakturanummer/i, /invoice no/i, /invoice number/i],
      maskSetting: "maskInvoiceNo",
      generic: "den faktura som ska hanteras"
    },
    {
      role: "ReceiptNo",
      patterns: [/inleveransnr/i, /receipt no/i, /warehouse receipt/i],
      maskSetting: "maskReceiptNo",
      generic: "den inleverans som ska hanteras"
    },
    {
      role: "ShipmentNo",
      patterns: [/utleveransnr/i, /shipment no/i, /warehouse shipment/i],
      maskSetting: "maskShipmentNo",
      generic: "den utleverans som ska hanteras"
    },
    {
      role: "ProductionOrderNo",
      patterns: [/produktionsordernr/i, /production order/i, /prod\. order/i],
      maskSetting: "maskProductionOrderNo",
      generic: "den produktionsorder som ska hanteras"
    },
    {
      role: "PostedDocumentNo",
      patterns: [/bokförd/i, /posted/i, /dokumentnr/i, /document no/i],
      maskSetting: "maskPostedDocumentNo",
      generic: "det bokförda dokument som ska hanteras"
    },
    {
      role: "CustomerNo",
      patterns: [/kundnr/i, /kundnummer/i, /customer no/i],
      maskSetting: "maskCustomerNo",
      generic: "aktuell kund"
    },
    {
      role: "VendorNo",
      patterns: [/leverantörsnr/i, /leverantörsnummer/i, /vendor no/i],
      maskSetting: "maskVendorNo",
      generic: "aktuell leverantör"
    },
    {
      role: "ItemNo",
      patterns: [/artikelnr/i, /artikelnummer/i, /item no/i],
      maskSetting: "maskItemNo",
      generic: "aktuell artikel"
    },
    {
      role: "LocationCode",
      patterns: [/lagerplatskod/i, /lagerplats/i, /location code/i],
      maskSetting: "maskLocationCode",
      generic: "aktuell lagerplats"
    },
    {
      role: "LotBatchNo",
      patterns: [
        /batchnr/i, /batchnummer/i, /batch no/i,
        /lotnr/i, /lotnummer/i, /lot no/i, /partinr/i
      ],
      maskSetting: "maskLotBatchNo",
      generic: "aktuellt lot-/batchnummer"
    }
  ];

  for (const matcher of matchers) {
    if (matcher.patterns.some(pattern => pattern.test(context))) {
      return {
        valueRole: matcher.role,
        maskSetting: matcher.maskSetting,
        maskByDefault: DEFAULTS[matcher.maskSetting] === true,
        genericValue: matcher.generic
      };
    }
  }

  // Heuristic for a number selected from an order list or opened from an order page.
  if (
    /^\d{4,}$/.test(rawValue) &&
    /(förs\.?order|försäljningsorder|sales order)/i.test(context)
  ) {
    return {
      valueRole: "SalesOrderNo",
      maskSetting: "maskSalesOrderNo",
      maskByDefault: true,
      genericValue: "den försäljningsorder som ska hanteras"
    };
  }

  return {
    valueRole: "Unknown",
    maskSetting: null,
    maskByDefault: false,
    genericValue: ""
  };
}

function instructionValueFor(classification, originalValue, settings) {
  if (!classification?.maskSetting) return originalValue;
  return settings?.[classification.maskSetting] === true
    ? classification.genericValue
    : originalValue;
}

function extractOpenRecordCaption(value) {
  const label = cleanUiCaption(value);
  const match = label.match(/^Open record\s+"([^"]+)"/i);
  return match ? match[1] : "";
}

function extractDatePickerField(value) {
  const label = cleanUiCaption(value);
  const match = label.match(/^Open the date picker for\s+(.+)$/i);
  return match ? cleanUiCaption(match[1]) : "";
}

function semanticActionForCaption(caption, event) {
  const value = cleanUiCaption(caption);

  const rules = [
    { patterns: [/^Öppna igen$/i, /^Reopen$/i, /^Genåbn$/i], semantic: "ReopenDocument" },
    { patterns: [/^Släpp$/i, /^Frisläpp$/i, /^Release$/i, /^Frigiv$/i], semantic: "ReleaseDocument" },
    { patterns: [/^Bokför$/i, /^Post$/i, /^Bogfør$/i], semantic: "PostDocument" },
    { patterns: [/^Ja$/i, /^Yes$/i, /^Oui$/i], semantic: "ConfirmYes" },
    { patterns: [/^Nej$/i, /^No$/i, /^Non$/i], semantic: "ConfirmNo" },
    { patterns: [/^Sök$/i, /^Search$/i], semantic: "OpenSearch" },
    { patterns: [/^Tillbaka$/i, /^Back$/i], semantic: "NavigateBack" },
    { patterns: [/^Ny$/i, /^New$/i, /^Ny post$/i], semantic: "CreateNew" },
    { patterns: [/^Redigera$/i, /^Edit$/i], semantic: "EditRecord" },
    { patterns: [/^Ta bort$/i, /^Delete$/i], semantic: "DeleteRecord" }
  ];

  for (const rule of rules) {
    if (rule.patterns.some(pattern => pattern.test(value))) {
      return rule.semantic;
    }
  }

  if (event?.category === "dialog") return "Dialog";
  if (event?.type === "field-change") return "ChangeField";
  if (event?.category === "navigation") return "Navigate";
  if (event?.category === "selection") return "Select";
  if (event?.category === "action") return "ClickAction";
  return event?.type || "Interaction";
}

function isTechnicalEvent(event) {
  return (
    event.type === "pointer" ||
    event.type === "page-state" ||
    event.category === "technical"
  );
}

function samePage(a, b) {
  return (
    String(a?.pageId || "") === String(b?.pageId || "") &&
    visiblePageCaption(a) === visiblePageCaption(b)
  );
}

function uiStep({
  sourceEvents,
  action,
  pageCaption,
  pageId,
  actionCaption = "",
  fieldCaption = "",
  selectedCaption = "",
  value = "",
  semanticAction = "",
  description,
  screenshot = null,
  importance = "normal"
}) {
  return {
    step: 0,
    sourceEventNos: sourceEvents.map(event => event.eventNo),
    timestamp: sourceEvents[0]?.timestamp || "",
    pageId: String(pageId || ""),
    pageCaption,
    action,
    actionCaption,
    fieldCaption,
    selectedCaption,
    value,
    semanticAction,
    description,
    screenshot,
    importance,
    valueRole: arguments[0].valueRole || "",
    maskByDefault: Boolean(arguments[0].maskByDefault),
    instructionValue: arguments[0].instructionValue ?? "",
    processPattern: arguments[0].processPattern || ""
  };
}

function screenshotFor(events, screenshots) {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const path = screenshots[events[index].eventNo];
    if (path) return path;
  }
  return null;
}

function buildBusinessSteps(rawEvents, screenshots, settings) {
  const events = rawEvents.filter(event => !isTechnicalEvent(event));
  const steps = [];
  let index = 0;

  while (index < events.length) {
    const event = events[index];
    const next = events[index + 1];
    const next2 = events[index + 2];

    // Search / Tell Me flow. Preserve each visible UI caption.
    if (
      event.type === "click" &&
      /^(Search|Sök)$/i.test(cleanUiCaption(event.label)) &&
      next?.category === "dialog"
    ) {
      const grouped = [event, next];
      let cursor = index + 2;
      let searchFieldCaption = "";
      let searchValue = "";
      let resultCaption = "";
      let navigationEvent = null;

      while (cursor < events.length && cursor <= index + 9) {
        const candidate = events[cursor];

        if (candidate.type === "field-change") {
          const caption = cleanUiCaption(
            candidate.fieldName || candidate.label
          );

          if (/Tell me|Berätta|Sök/i.test(caption)) {
            searchFieldCaption = caption;
            searchValue = String(candidate.value || "");
            grouped.push(candidate);
            cursor += 1;
            continue;
          }
        }

        if (
          candidate.type === "click" &&
          candidate.category === "selection"
        ) {
          resultCaption = cleanUiCaption(candidate.label);
          grouped.push(candidate);
          cursor += 1;
          continue;
        }

        if (candidate.category === "navigation") {
          navigationEvent = candidate;
          grouped.push(candidate);
          cursor += 1;
          break;
        }

        grouped.push(candidate);
        cursor += 1;
      }

      if (navigationEvent) {
        const pageCaption = normalizePageCaptionForDocumentation(visiblePageCaption(navigationEvent), settings);
        const searchCaption = cleanUiCaption(event.label);

        steps.push(uiStep({
          sourceEvents: grouped,
          action: "SearchAndOpen",
          pageCaption,
          pageId: navigationEvent.pageId,
          actionCaption: searchCaption,
          fieldCaption: searchFieldCaption,
          selectedCaption: resultCaption,
          value: searchValue,
          semanticAction: "SearchAndOpenPage",
          processPattern: "SearchAndOpenPage",
          description:
            `Välj **${searchCaption}**, ange ${searchValue || "söktext"} i ` +
            `**${searchFieldCaption || "sökfältet"}** och välj ` +
            `**${resultCaption || pageCaption}**.`,
          screenshot: screenshotFor(grouped, screenshots),
          importance: "high"
        }));

        index = cursor;
        continue;
      }
    }

    // Repeated changes to the same visible field: keep final value.
    if (event.type === "field-change") {
      const grouped = [event];
      let finalEvent = event;
      let cursor = index + 1;
      const originalCaption = cleanUiCaption(
        event.fieldName || event.label || "fältet"
      );

      while (
        cursor < events.length &&
        cursor <= index + 4 &&
        events[cursor].type === "field-change" &&
        cleanUiCaption(
          events[cursor].fieldName || events[cursor].label
        ) === originalCaption
      ) {
        finalEvent = events[cursor];
        grouped.push(finalEvent);
        cursor += 1;
      }

      const fieldCaption = cleanUiCaption(
        finalEvent.fieldName || finalEvent.label || "fältet"
      );
      const pageCaption = normalizePageCaptionForDocumentation(visiblePageCaption(finalEvent), settings);

      const classification = classifyBusinessValue({
        value: finalEvent.value,
        fieldCaption,
        pageCaption
      });
      const instructionValue = instructionValueFor(
        classification,
        finalEvent.value ?? "",
        settings
      );

      steps.push(uiStep({
        sourceEvents: grouped,
        action: "ChangeField",
        pageCaption,
        pageId: finalEvent.pageId,
        fieldCaption,
        value: finalEvent.value ?? "",
        semanticAction: "ChangeField",
        processPattern: /datum/i.test(fieldCaption) ? "ChangeDate" : "ChangeField",
        description:
          instructionValue !== "" &&
          classification.valueRole !== "Unknown"
            ? `Ange **${instructionValue}** i **${fieldCaption}**.`
            : `Ändra fältet **${fieldCaption}**.`,
        screenshot: screenshotFor(grouped, screenshots),
        valueRole: classification.valueRole,
        maskByDefault: classification.maskByDefault,
        instructionValue
      }));

      index = cursor;
      continue;
    }

    // Open record and following navigation.
    if (
      event.type === "click" &&
      /^Open record/i.test(cleanUiCaption(event.label)) &&
      next?.category === "navigation"
    ) {
      const grouped = [event, next];
      const recordCaption = extractOpenRecordCaption(event.label);
      const pageCaption = normalizePageCaptionForDocumentation(
        visiblePageCaption(next),
        settings
      );

      if (
        next2?.category === "navigation" &&
        String(next2.pageId || "") === String(next.pageId || "")
      ) {
        grouped.push(next2);
      }

      const classification = classifyBusinessValue({
        value: recordCaption,
        pageCaption,
        source: event.label
      });
      const instructionValue = instructionValueFor(
        classification,
        recordCaption,
        settings
      );

      steps.push(uiStep({
        sourceEvents: grouped,
        action: "OpenRecord",
        pageCaption,
        pageId: next.pageId,
        selectedCaption: recordCaption,
        semanticAction: "OpenRecord",
        processPattern: "OpenDocument",
        description: classification.valueRole === "SalesOrderNo" &&
          settings?.maskSalesOrderNo === true
          ? `Öppna **${instructionValue}**.`
          : recordCaption
            ? `Öppna **${instructionValue}**.`
            : `Öppna den aktuella posten.`,
        screenshot: screenshotFor(grouped, screenshots),
        importance: "high",
        valueRole: classification.valueRole,
        maskByDefault: classification.maskByDefault,
        instructionValue
      }));

      index += grouped.length;
      continue;
    }

    // Date picker helper is not a separate instruction.
    if (
      event.type === "click" &&
      extractDatePickerField(event.label)
    ) {
      index += 1;
      continue;
    }

    // Calendar day click is represented by the field change.
    if (
      event.type === "click" &&
      /^\d{1,2},\s+[A-Za-zÅÄÖåäö]+,\s+\d{4}$/i.test(
        cleanUiCaption(event.label)
      )
    ) {
      index += 1;
      continue;
    }

    // Dialog followed by visible Yes/No caption.
    if (
      event.category === "dialog" &&
      next?.type === "click" &&
      /^(Yes|No|Ja|Nej)$/i.test(cleanUiCaption(next.label))
    ) {
      const actionCaption = cleanUiCaption(next.label);
      const pageCaption = normalizePageCaptionForDocumentation(visiblePageCaption(event), settings);
      const grouped = [event, next];

      steps.push(uiStep({
        sourceEvents: grouped,
        action: "ConfirmDialog",
        pageCaption,
        pageId: event.pageId,
        actionCaption,
        semanticAction: semanticActionForCaption(actionCaption, next),
        processPattern: "ConfirmDialog",
        description: `Välj **${actionCaption}** i dialogrutan.`,
        screenshot: screenshotFor(grouped, screenshots),
        importance: "high"
      }));

      index += 2;
      continue;
    }

    // Back is usually navigation noise, but preserve it if it is the only
    // meaningful action before a distinct page navigation.
    if (
      event.type === "click" &&
      /^(Back|Tillbaka)$/i.test(cleanUiCaption(event.label))
    ) {
      if (next?.category === "navigation") {
        const actionCaption = cleanUiCaption(event.label);
        const grouped = [event, next];

        steps.push(uiStep({
          sourceEvents: grouped,
          action: "NavigateBack",
          pageCaption: visiblePageCaption(next),
          pageId: next.pageId,
          actionCaption,
          semanticAction: "NavigateBack",
          description: `Välj **${actionCaption}**.`,
          screenshot: screenshotFor(grouped, screenshots)
        }));

        index += 2;
        continue;
      }

      index += 1;
      continue;
    }

    // Visible action caption wins. Never normalize it.
    if (event.type === "click" && event.category === "action") {
      const actionCaption = cleanUiCaption(event.label);
      const pageCaption = normalizePageCaptionForDocumentation(visiblePageCaption(event), settings);

      if (
        !actionCaption ||
        actionCaption.length > 120 ||
        /^Specifies |^Anger /i.test(actionCaption)
      ) {
        index += 1;
        continue;
      }

      steps.push(uiStep({
        sourceEvents: [event],
        action: "ClickAction",
        pageCaption,
        pageId: event.pageId,
        actionCaption,
        semanticAction: semanticActionForCaption(actionCaption, event),
        processPattern:
          ["ReopenDocument", "ReleaseDocument"].includes(
            semanticActionForCaption(actionCaption, event)
          )
            ? "ChangeDocumentStatus"
            : semanticActionForCaption(actionCaption, event) === "PostDocument"
              ? "PostDocument"
              : "RunAction",
        description: `Välj **${actionCaption}**.`,
        screenshot: screenshotFor([event], screenshots),
        importance:
          /Öppna igen|Reopen|Släpp|Frisläpp|Release|Bokför|Post/i.test(
            actionCaption
          )
            ? "high"
            : "normal"
      }));

      index += 1;
      continue;
    }

    // Visible selected caption wins.
    if (event.type === "click" && event.category === "selection") {
      const selectedCaption = cleanUiCaption(event.label);
      const pageCaption = normalizePageCaptionForDocumentation(visiblePageCaption(event), settings);

      if (selectedCaption) {
        steps.push(uiStep({
          sourceEvents: [event],
          action: "Select",
          pageCaption,
          pageId: event.pageId,
          selectedCaption,
          semanticAction: "Select",
          description: `Välj **${selectedCaption}**.`,
          screenshot: screenshotFor([event], screenshots)
        }));
      }

      index += 1;
      continue;
    }

    // Standalone navigation. Preserve visible page caption.
    if (event.category === "navigation") {
      const grouped = [event];
      let finalEvent = event;
      let cursor = index + 1;

      while (
        cursor < events.length &&
        cursor <= index + 3 &&
        events[cursor].category === "navigation" &&
        samePage(event, events[cursor])
      ) {
        finalEvent = events[cursor];
        grouped.push(finalEvent);
        cursor += 1;
      }

      const pageCaption = normalizePageCaptionForDocumentation(visiblePageCaption(finalEvent), settings);
      const previous = steps.at(-1);

      if (
        previous?.pageCaption !== pageCaption ||
        previous?.action !== "Navigate"
      ) {
        steps.push(uiStep({
          sourceEvents: grouped,
          action: "Navigate",
          pageCaption,
          pageId: finalEvent.pageId,
          semanticAction: "Navigate",
          description: `Öppna sidan **${pageCaption}**.`,
          screenshot: screenshotFor(grouped, screenshots)
        }));
      }

      index = cursor;
      continue;
    }

    // Standalone dialog.
    if (event.category === "dialog") {
      const pageCaption = normalizePageCaptionForDocumentation(visiblePageCaption(event), settings);

      steps.push(uiStep({
        sourceEvents: [event],
        action: "Dialog",
        pageCaption,
        pageId: event.pageId,
        semanticAction: "Dialog",
        description: `Kontrollera dialogrutan.`,
        screenshot: screenshotFor([event], screenshots)
      }));

      index += 1;
      continue;
    }

    index += 1;
  }

  // Deduplicate semantic output without changing visible captions.
  const deduplicated = [];

  for (const step of steps) {
    const signature = JSON.stringify([
      step.action,
      step.pageCaption,
      step.actionCaption,
      step.fieldCaption,
      step.selectedCaption,
      step.value,
      step.description
    ]);

    if (deduplicated.at(-1)?._signature === signature) continue;

    step._signature = signature;
    deduplicated.push(step);
  }

  return deduplicated.map((step, stepIndex) => {
    const clean = {
      ...step,
      step: stepIndex + 1
    };

    delete clean._signature;
    return clean;
  });
}


function normalizedCaption(value) {
  return String(value || "")
    .replace(/\*\*/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function isConfirmationStep(step) {
  return (
    step.action === "ConfirmDialog" ||
    ["ConfirmYes", "ConfirmNo"].includes(step.semanticAction)
  );
}

function isNavigationStep(step) {
  return ["Navigate", "NavigateBack"].includes(step.action);
}

function isSearchStep(step) {
  return (
    step.action === "SearchAndOpen" ||
    step.semanticAction === "SearchAndOpenPage" ||
    step.processPattern === "SearchAndOpenPage"
  );
}

function isDocumentStatusStep(step) {
  return ["ReopenDocument", "ReleaseDocument"].includes(step.semanticAction);
}

function isPostStep(step) {
  return step.semanticAction === "PostDocument";
}

function isDateFieldStep(step) {
  return (
    step.action === "ChangeField" &&
    /datum|date/i.test(step.fieldCaption || "")
  );
}

function mergeSources(steps) {
  return [...new Set(
    steps.flatMap(step => step.sourceEventNos || [])
  )].sort((a, b) => a - b);
}

function preferredScreenshot(steps) {
  for (let index = steps.length - 1; index >= 0; index -= 1) {
    if (steps[index].screenshot) return steps[index].screenshot;
  }
  return null;
}

function cloneMergedStep(base, consumed, patch = {}) {
  return {
    ...base,
    ...patch,
    sourceEventNos: mergeSources(consumed),
    timestamp: consumed[0]?.timestamp || base.timestamp,
    screenshot: preferredScreenshot(consumed),
    mergedStepCount: consumed.length
  };
}

function sameVisiblePage(a, b) {
  if (!a || !b) return false;
  const aPage = normalizedCaption(a.pageCaption);
  const bPage = normalizedCaption(b.pageCaption);
  if (!aPage || !bPage) return false;
  return aPage === bPage || aPage.includes(bPage) || bPage.includes(aPage);
}

function suppressRedundantNavigation(steps) {
  const result = [];

  for (const step of steps) {
    const previous = result.at(-1);

    if (
      isNavigationStep(step) &&
      previous &&
      (
        sameVisiblePage(previous, step) ||
        (
          ["SearchAndOpen", "OpenRecord"].includes(previous.action) &&
          sameVisiblePage(previous, step)
        )
      )
    ) {
      continue;
    }

    result.push(step);
  }

  return result;
}

function mergeSearchPattern(steps) {
  const result = [];
  let index = 0;

  while (index < steps.length) {
    const current = steps[index];

    if (!isSearchStep(current)) {
      result.push(current);
      index += 1;
      continue;
    }

    const consumed = [current];
    let cursor = index + 1;

    while (
      cursor < steps.length &&
      cursor <= index + 3 &&
      isNavigationStep(steps[cursor]) &&
      sameVisiblePage(current, steps[cursor])
    ) {
      consumed.push(steps[cursor]);
      cursor += 1;
    }

    result.push(cloneMergedStep(current, consumed, {
      action: "SearchAndOpen",
      semanticAction: "SearchAndOpenPage",
      processPattern: "SearchAndOpenPage",
      importance: "high"
    }));

    index = cursor;
  }

  return result;
}

function mergeOpenDocumentPattern(steps) {
  const result = [];
  let index = 0;

  while (index < steps.length) {
    const current = steps[index];

    if (current.action !== "OpenRecord") {
      result.push(current);
      index += 1;
      continue;
    }

    const consumed = [current];
    let cursor = index + 1;

    while (
      cursor < steps.length &&
      cursor <= index + 3 &&
      isNavigationStep(steps[cursor]) &&
      sameVisiblePage(current, steps[cursor])
    ) {
      consumed.push(steps[cursor]);
      cursor += 1;
    }

    result.push(cloneMergedStep(current, consumed, {
      processPattern: "OpenDocument",
      importance: "high"
    }));

    index = cursor;
  }

  return result;
}

function mergeStatusAndConfirmationPattern(steps) {
  const result = [];
  let index = 0;

  while (index < steps.length) {
    const current = steps[index];

    if (!isDocumentStatusStep(current)) {
      result.push(current);
      index += 1;
      continue;
    }

    const consumed = [current];
    let cursor = index + 1;

    if (
      cursor < steps.length &&
      isConfirmationStep(steps[cursor])
    ) {
      consumed.push(steps[cursor]);
      cursor += 1;
    }

    while (
      cursor < steps.length &&
      cursor <= index + 3 &&
      isNavigationStep(steps[cursor]) &&
      sameVisiblePage(current, steps[cursor])
    ) {
      consumed.push(steps[cursor]);
      cursor += 1;
    }

    result.push(cloneMergedStep(current, consumed, {
      processPattern: "ChangeDocumentStatus",
      description: `Välj **${current.actionCaption}**.`,
      importance: "high",
      confirmationIncluded: consumed.some(isConfirmationStep)
    }));

    index = cursor;
  }

  return result;
}

function mergePostAndConfirmationPattern(steps) {
  const result = [];
  let index = 0;

  while (index < steps.length) {
    const current = steps[index];

    if (!isPostStep(current)) {
      result.push(current);
      index += 1;
      continue;
    }

    const consumed = [current];
    let cursor = index + 1;

    if (
      cursor < steps.length &&
      (
        isConfirmationStep(steps[cursor]) ||
        steps[cursor].action === "Dialog"
      )
    ) {
      consumed.push(steps[cursor]);
      cursor += 1;

      if (
        cursor < steps.length &&
        isConfirmationStep(steps[cursor])
      ) {
        consumed.push(steps[cursor]);
        cursor += 1;
      }
    }

    result.push(cloneMergedStep(current, consumed, {
      processPattern: "PostDocument",
      description: `Välj **${current.actionCaption}**.`,
      importance: "high",
      confirmationIncluded: consumed.some(isConfirmationStep)
    }));

    index = cursor;
  }

  return result;
}

function mergeDatePattern(steps) {
  const result = [];
  let index = 0;

  while (index < steps.length) {
    const current = steps[index];

    if (!isDateFieldStep(current)) {
      result.push(current);
      index += 1;
      continue;
    }

    const consumed = [current];
    let cursor = index + 1;

    while (
      cursor < steps.length &&
      cursor <= index + 2 &&
      (
        steps[cursor].action === "Dialog" ||
        (
          steps[cursor].action === "ClickAction" &&
          /datumvälj|date picker|kalender/i.test(
            steps[cursor].actionCaption || ""
          )
        )
      )
    ) {
      consumed.push(steps[cursor]);
      cursor += 1;
    }

    result.push(cloneMergedStep(current, consumed, {
      processPattern: "ChangeDate",
      description: `Ange **${current.fieldCaption}**.`,
      importance: "normal"
    }));

    index = cursor;
  }

  return result;
}

function removeNonInstructionalFieldChanges(steps) {
  return steps.filter(step => {
    if (step.action !== "ChangeField") return true;

    const caption = normalizedCaption(step.fieldCaption);
    const hasMeaningfulValue =
      step.value !== undefined &&
      step.value !== null &&
      String(step.value).trim() !== "";

    // Typical focus/blur noise on display-name fields.
    if (
      !hasMeaningfulValue &&
      /namn|name|beskrivning|description/i.test(caption)
    ) {
      return false;
    }

    return true;
  });
}

function removeStandaloneConfirmations(steps) {
  return steps.filter((step, index) => {
    if (!isConfirmationStep(step)) return true;

    const previous = steps[index - 1];
    return !(
      previous &&
      (
        isDocumentStatusStep(previous) ||
        isPostStep(previous) ||
        previous.processPattern === "ChangeDocumentStatus" ||
        previous.processPattern === "PostDocument"
      )
    );
  });
}

function removeGenericDialogNoise(steps) {
  return steps.filter((step, index) => {
    if (step.action !== "Dialog") return true;

    const previous = steps[index - 1];
    const next = steps[index + 1];

    if (
      previous &&
      (
        isDocumentStatusStep(previous) ||
        isPostStep(previous) ||
        previous.processPattern === "ChangeDocumentStatus" ||
        previous.processPattern === "PostDocument"
      )
    ) {
      return false;
    }

    if (next && isConfirmationStep(next)) return false;

    return true;
  });
}

function finalDeduplicate(steps) {
  const result = [];

  for (const step of steps) {
    const previous = result.at(-1);
    const signature = JSON.stringify([
      step.action,
      step.semanticAction,
      step.processPattern,
      normalizedCaption(step.pageCaption),
      normalizedCaption(step.actionCaption),
      normalizedCaption(step.fieldCaption),
      normalizedCaption(step.selectedCaption),
      normalizedCaption(step.instructionValue),
      normalizedCaption(step.description)
    ]);

    if (previous?._finalSignature === signature) continue;

    result.push({
      ...step,
      _finalSignature: signature
    });
  }

  return result.map((step, index) => {
    const clean = {
      ...step,
      step: index + 1
    };
    delete clean._finalSignature;
    return clean;
  });
}

function runProcessPatternEngine(initialSteps) {
  let steps = [...initialSteps];

  steps = removeNonInstructionalFieldChanges(steps);
  steps = mergeSearchPattern(steps);
  steps = mergeOpenDocumentPattern(steps);
  steps = mergeStatusAndConfirmationPattern(steps);
  steps = mergePostAndConfirmationPattern(steps);
  steps = mergeDatePattern(steps);
  steps = suppressRedundantNavigation(steps);
  steps = removeStandaloneConfirmations(steps);
  steps = removeGenericDialogNoise(steps);
  steps = finalDeduplicate(steps);

  return steps;
}




const BC_KNOWLEDGE_PACK_VERSION = "1.0";

const BC_ENTITIES = [
  {
    entity: "SalesOrder",
    pagePatterns: [
      /förs\.?\s*order/i,
      /försäljningsorder/i,
      /sales order/i
    ],
    listPatterns: [
      /förs\.?\s*order/i,
      /försäljningsorder/i,
      /sales orders?/i
    ],
    genericDocument: "den försäljningsorder som ska hanteras"
  },
  {
    entity: "PurchaseOrder",
    pagePatterns: [
      /inköpsorder/i,
      /purchase order/i
    ],
    listPatterns: [
      /inköpsorder/i,
      /purchase orders?/i
    ],
    genericDocument: "den inköpsorder som ska hanteras"
  },
  {
    entity: "Customer",
    pagePatterns: [/kund/i, /customer/i],
    listPatterns: [/kunder/i, /customers?/i],
    genericDocument: "den kund som ska hanteras"
  },
  {
    entity: "Vendor",
    pagePatterns: [/leverantör/i, /vendor/i],
    listPatterns: [/leverantörer/i, /vendors?/i],
    genericDocument: "den leverantör som ska hanteras"
  },
  {
    entity: "Item",
    pagePatterns: [/artikel/i, /item/i],
    listPatterns: [/artiklar/i, /items?/i],
    genericDocument: "den artikel som ska hanteras"
  },
  {
    entity: "PostedSalesInvoice",
    pagePatterns: [
      /bokförd.*försäljningsfaktura/i,
      /posted sales invoice/i
    ],
    listPatterns: [
      /bokförda.*försäljningsfakturor/i,
      /posted sales invoices/i
    ],
    genericDocument: "den bokförda försäljningsfaktura som ska visas"
  }
];

const BC_ACTION_RULES = [
  {
    ruleId: "ReopenDocument",
    patterns: [/^öppna igen$/i, /^reopen$/i],
    taskType: "ReopenDocument",
    semanticAction: "ReopenDocument",
    confidence: 0.99
  },
  {
    ruleId: "ReleaseDocument",
    patterns: [/^släpp$/i, /^frisläpp$/i, /^release$/i],
    taskType: "ReleaseDocument",
    semanticAction: "ReleaseDocument",
    confidence: 0.99
  },
  {
    ruleId: "PostDocument",
    patterns: [/^bokför$/i, /^post$/i],
    taskType: "PostDocument",
    semanticAction: "PostDocument",
    confidence: 0.99
  },
  {
    ruleId: "OpenSearch",
    patterns: [/^sök$/i, /^search$/i],
    taskType: "SearchAndOpenPage",
    semanticAction: "SearchAndOpenPage",
    confidence: 0.98
  }
];

const BC_FIELD_RULES = [
  {
    ruleId: "ChangeShipmentDate",
    patterns: [/^utleveransdatum$/i, /^shipment date$/i],
    taskType: "ChangeShipmentDate",
    semanticAction: "ChangeShipmentDate",
    confidence: 0.99
  },
  {
    ruleId: "SelectCustomer",
    patterns: [/^kundnr$/i, /^kundens namn$/i, /^customer no\.?$/i, /^customer name$/i],
    taskType: "SelectCustomer",
    semanticAction: "SelectCustomer",
    confidence: 0.90
  },
  {
    ruleId: "SelectItem",
    patterns: [/^artikelnr$/i, /^item no\.?$/i],
    taskType: "SelectItem",
    semanticAction: "SelectItem",
    confidence: 0.95
  }
];

function detectEntity(pageCaption, selectedCaption = "") {
  const context = `${pageCaption || ""} ${selectedCaption || ""}`;

  for (const entity of BC_ENTITIES) {
    if (
      entity.pagePatterns.some(pattern => pattern.test(context)) ||
      entity.listPatterns.some(pattern => pattern.test(context))
    ) {
      return entity;
    }
  }

  return null;
}

function findActionRule(caption) {
  const value = cleanUiCaption(caption);
  return BC_ACTION_RULES.find(rule =>
    rule.patterns.some(pattern => pattern.test(value))
  ) || null;
}

function findFieldRule(caption) {
  const value = cleanUiCaption(caption);
  return BC_FIELD_RULES.find(rule =>
    rule.patterns.some(pattern => pattern.test(value))
  ) || null;
}

function documentationProfileName(settings) {
  return settings?.documentationProfile || "generic";
}

function taskInstructionFromKnowledge(task, settings) {
  const profile = documentationProfileName(settings);

  switch (task.taskType) {
    case "OpenSalesOrder":
    case "OpenPurchaseOrder":
    case "OpenCustomer":
    case "OpenVendor":
    case "OpenItem":
    case "OpenPostedSalesInvoice":
      if (
        profile !== "generic" &&
        task.originalRecordValue
      ) {
        return `Öppna **${task.originalRecordValue}**.`;
      }
      return `Öppna **${task.genericDocument}**.`;

    case "ReopenDocument":
    case "ReleaseDocument":
    case "PostDocument":
      return `Välj **${task.actionCaption}**.`;

    case "ChangeShipmentDate":
      return `Ange **${task.fieldCaption}**.`;

    case "SelectCustomer":
      if (task.instructionValue) {
        return `Välj kunden **${task.instructionValue}**.`;
      }
      return `Välj kunden.`;

    case "SelectItem":
      if (task.instructionValue) {
        return `Välj artikeln **${task.instructionValue}**.`;
      }
      return `Välj artikeln.`;

    case "SearchAndOpenPage":
      return task.searchCaption && task.resultCaption
        ? `Välj **${task.searchCaption}**, ange söktext i **${task.searchFieldCaption || "sökfältet"}** och välj **${task.resultCaption}**.`
        : `Öppna sidan **${task.pageCaption}**.`;

    default:
      return task.instruction || task.description || "Utför uppgiften.";
  }
}

function enrichTaskWithKnowledge(task, settings) {
  const enriched = { ...task };
  const entity = detectEntity(
    task.pageCaption,
    task.selectedCaption || task.originalRecordValue
  );

  const actionRule = findActionRule(task.actionCaption);
  const fieldRule = findFieldRule(task.fieldCaption);

  enriched.knowledgePackVersion = BC_KNOWLEDGE_PACK_VERSION;
  enriched.entity = entity?.entity || "";
  enriched.knowledgeRule = "";
  enriched.confidence = 0.60;
  enriched.reviewSuggested = true;

  if (task.taskType === "OpenDocument" || task.semanticAction === "OpenRecord") {
    if (entity) {
      const openTaskByEntity = {
        SalesOrder: "OpenSalesOrder",
        PurchaseOrder: "OpenPurchaseOrder",
        Customer: "OpenCustomer",
        Vendor: "OpenVendor",
        Item: "OpenItem",
        PostedSalesInvoice: "OpenPostedSalesInvoice"
      };

      enriched.taskType = openTaskByEntity[entity.entity] || "OpenDocument";
      enriched.genericDocument = entity.genericDocument;
      enriched.originalRecordValue =
        task.selectedCaption ||
        task.value ||
        task.instructionValue ||
        "";
      enriched.knowledgeRule = enriched.taskType;
      enriched.confidence = 0.97;
      enriched.reviewSuggested = false;
    }
  } else if (actionRule) {
    enriched.taskType = actionRule.taskType;
    enriched.semanticAction = actionRule.semanticAction;
    enriched.knowledgeRule = actionRule.ruleId;
    enriched.confidence = actionRule.confidence;
    enriched.reviewSuggested = false;
  } else if (fieldRule) {
    enriched.taskType = fieldRule.taskType;
    enriched.semanticAction = fieldRule.semanticAction;
    enriched.knowledgeRule = fieldRule.ruleId;
    enriched.confidence = fieldRule.confidence;
    enriched.reviewSuggested = fieldRule.confidence < 0.90;
  } else if (task.taskType === "SearchAndOpenPage") {
    enriched.knowledgeRule = "SearchAndOpenPage";
    enriched.confidence = 0.98;
    enriched.reviewSuggested = false;
  } else if (task.taskType === "Navigate") {
    enriched.knowledgeRule = "Navigate";
    enriched.confidence = 0.85;
    enriched.reviewSuggested = true;
  }

  enriched.instruction = taskInstructionFromKnowledge(enriched, settings);
  return enriched;
}

function applyKnowledgePack(tasks, settings) {
  return tasks.map(task => enrichTaskWithKnowledge(task, settings));
}

function removeKnowledgePackNoise(tasks) {
  const result = [];

  for (const task of tasks) {
    const previous = result.at(-1);

    if (
      task.taskType === "Navigate" &&
      previous &&
      (
        [
          "SearchAndOpenPage",
          "OpenSalesOrder",
          "OpenPurchaseOrder",
          "OpenCustomer",
          "OpenVendor",
          "OpenItem",
          "OpenPostedSalesInvoice"
        ].includes(previous.taskType) &&
        sameVisiblePage(previous, task)
      )
    ) {
      continue;
    }

    // A field focus on Kundens namn without an actual value is not a manual step.
    if (
      ["SelectCustomer", "ChangeField"].includes(task.taskType) &&
      /kundens namn|customer name/i.test(task.fieldCaption || "") &&
      !String(task.value ?? "").trim()
    ) {
      continue;
    }

    // Confirmation dialogs are included in status/posting tasks.
    if (
      ["Dialog", "ConfirmDialog"].includes(task.taskType) &&
      previous &&
      [
        "ReopenDocument",
        "ReleaseDocument",
        "PostDocument"
      ].includes(previous.taskType)
    ) {
      previous.confirmationIncluded = true;
      previous.sourceEventNos = [
        ...new Set([
          ...(previous.sourceEventNos || []),
          ...(task.sourceEventNos || [])
        ])
      ];
      previous.screenshot = task.screenshot || previous.screenshot;
      continue;
    }

    // Keep only one shipment-date task.
    if (
      task.taskType === "ChangeShipmentDate" &&
      previous?.taskType === "ChangeShipmentDate"
    ) {
      result[result.length - 1] = {
        ...task,
        sourceEventNos: [
          ...new Set([
            ...(previous.sourceEventNos || []),
            ...(task.sourceEventNos || [])
          ])
        ],
        screenshot: task.screenshot || previous.screenshot
      };
      continue;
    }

    result.push(task);
  }

  return result;
}

function finalizeKnowledgeTasks(tasks, settings) {
  const enriched = applyKnowledgePack(tasks, settings);
  const cleaned = removeKnowledgePackNoise(enriched);

  return cleaned.map((task, index) => ({
    ...task,
    taskNo: index + 1,
    taskId: taskId(task.taskType, index),
    instruction: taskInstructionFromKnowledge(task, settings),
    reviewStatus: task.reviewSuggested ? "review-suggested" : "unreviewed"
  }));
}


function taskId(taskType, index) {
  return `${taskType}-${String(index + 1).padStart(3, "0")}`;
}

function taskInstruction(task) {
  switch (task.taskType) {
    case "SearchAndOpenPage":
      return task.searchCaption && task.resultCaption
        ? `Välj **${task.searchCaption}**, ange söktext i **${task.searchFieldCaption || "sökfältet"}** och välj **${task.resultCaption}**.`
        : `Öppna sidan **${task.pageCaption}**.`;

    case "OpenDocument":
      return task.instructionValue
        ? `Öppna **${task.instructionValue}**.`
        : `Öppna det dokument som ska hanteras.`;

    case "ChangeDocumentStatus":
      return `Välj **${task.actionCaption}**.`;

    case "ChangeDate":
      return `Ange **${task.fieldCaption}**.`;

    case "ChangeField":
      return task.instructionValue
        ? `Ange **${task.instructionValue}** i **${task.fieldCaption}**.`
        : `Ändra fältet **${task.fieldCaption}**.`;

    case "PostDocument":
      return `Välj **${task.actionCaption}**.`;

    case "RunAction":
      return `Välj **${task.actionCaption}**.`;

    case "Select":
      return `Välj **${task.selectedCaption}**.`;

    case "Navigate":
      return `Öppna sidan **${task.pageCaption}**.`;

    case "Dialog":
      return `Kontrollera dialogrutan.`;

    default:
      return task.description || "Utför uppgiften.";
  }
}

function createBusinessTasks(businessSteps) {
  const tasks = [];

  for (const step of businessSteps) {
    const taskType =
      step.processPattern ||
      (
        step.semanticAction === "SearchAndOpenPage"
          ? "SearchAndOpenPage"
          : step.semanticAction === "OpenRecord"
            ? "OpenDocument"
            : step.semanticAction === "ReopenDocument" ||
              step.semanticAction === "ReleaseDocument"
              ? "ChangeDocumentStatus"
              : step.semanticAction === "PostDocument"
                ? "PostDocument"
                : step.action === "ChangeField"
                  ? (/datum|date/i.test(step.fieldCaption || "") ? "ChangeDate" : "ChangeField")
                  : step.action === "Select"
                    ? "Select"
                    : step.action === "Navigate"
                      ? "Navigate"
                      : step.action === "Dialog"
                        ? "Dialog"
                        : step.action === "ClickAction"
                          ? "RunAction"
                          : "Unclassified"
      );

    const task = {
      taskId: "",
      taskNo: 0,
      taskType,
      semanticAction: step.semanticAction || "",
      processPattern: step.processPattern || "",
      pageId: step.pageId || "",
      pageCaption: step.pageCaption || "",
      actionCaption: step.actionCaption || "",
      fieldCaption: step.fieldCaption || "",
      selectedCaption: step.selectedCaption || "",
      value: step.value ?? "",
      valueRole: step.valueRole || "",
      instructionValue: step.instructionValue ?? "",
      maskByDefault: Boolean(step.maskByDefault),
      searchCaption:
        step.action === "SearchAndOpen"
          ? step.actionCaption || ""
          : "",
      searchFieldCaption:
        step.action === "SearchAndOpen"
          ? step.fieldCaption || ""
          : "",
      resultCaption:
        step.action === "SearchAndOpen"
          ? step.selectedCaption || ""
          : "",
      sourceStepNos: [step.step],
      sourceEventNos: step.sourceEventNos || [],
      screenshot: step.screenshot || null,
      importance: step.importance || "normal",
      confirmationIncluded: Boolean(step.confirmationIncluded),
      reviewStatus: "unreviewed",
      userComment: "",
      description: step.description || ""
    };

    task.instruction = taskInstruction(task);
    tasks.push(task);
  }

  return tasks.map((task, index) => ({
    ...task,
    instruction: globalThis.T9TextFormat.quoteEmphasis(task.instruction),
    taskId: taskId(task.taskType, index),
    taskNo: index + 1
  }));
}

function mergeAdjacentBusinessTasks(tasks) {
  const result = [];
  let index = 0;

  while (index < tasks.length) {
    const current = tasks[index];
    const next = tasks[index + 1];

    // Search/open page followed immediately by redundant Navigate to same page.
    if (
      current.taskType === "SearchAndOpenPage" &&
      next?.taskType === "Navigate" &&
      sameVisiblePage(current, next)
    ) {
      result.push({
        ...current,
        sourceStepNos: [
          ...new Set([
            ...(current.sourceStepNos || []),
            ...(next.sourceStepNos || [])
          ])
        ],
        sourceEventNos: [
          ...new Set([
            ...(current.sourceEventNos || []),
            ...(next.sourceEventNos || [])
          ])
        ],
        screenshot: next.screenshot || current.screenshot
      });
      index += 2;
      continue;
    }

    // Open document followed immediately by redundant Navigate.
    if (
      current.taskType === "OpenDocument" &&
      next?.taskType === "Navigate" &&
      sameVisiblePage(current, next)
    ) {
      result.push({
        ...current,
        sourceStepNos: [
          ...new Set([
            ...(current.sourceStepNos || []),
            ...(next.sourceStepNos || [])
          ])
        ],
        sourceEventNos: [
          ...new Set([
            ...(current.sourceEventNos || []),
            ...(next.sourceEventNos || [])
          ])
        ],
        screenshot: next.screenshot || current.screenshot
      });
      index += 2;
      continue;
    }

    // Consecutive ChangeDate tasks for the same field collapse to one.
    if (
      current.taskType === "ChangeDate" &&
      next?.taskType === "ChangeDate" &&
      normalizedCaption(current.fieldCaption) ===
        normalizedCaption(next.fieldCaption)
    ) {
      result.push({
        ...next,
        sourceStepNos: [
          ...new Set([
            ...(current.sourceStepNos || []),
            ...(next.sourceStepNos || [])
          ])
        ],
        sourceEventNos: [
          ...new Set([
            ...(current.sourceEventNos || []),
            ...(next.sourceEventNos || [])
          ])
        ],
        screenshot: next.screenshot || current.screenshot
      });
      index += 2;
      continue;
    }

    // Status action followed by confirmation-only task.
    if (
      current.taskType === "ChangeDocumentStatus" &&
      next &&
      (
        next.taskType === "Dialog" ||
        next.semanticAction === "ConfirmYes" ||
        next.semanticAction === "ConfirmNo"
      )
    ) {
      result.push({
        ...current,
        confirmationIncluded: true,
        sourceStepNos: [
          ...new Set([
            ...(current.sourceStepNos || []),
            ...(next.sourceStepNos || [])
          ])
        ],
        sourceEventNos: [
          ...new Set([
            ...(current.sourceEventNos || []),
            ...(next.sourceEventNos || [])
          ])
        ],
        screenshot: next.screenshot || current.screenshot
      });
      index += 2;
      continue;
    }

    // Post followed by dialog/confirmation.
    if (
      current.taskType === "PostDocument" &&
      next &&
      (
        next.taskType === "Dialog" ||
        next.semanticAction === "ConfirmYes" ||
        next.semanticAction === "ConfirmNo"
      )
    ) {
      result.push({
        ...current,
        confirmationIncluded: true,
        sourceStepNos: [
          ...new Set([
            ...(current.sourceStepNos || []),
            ...(next.sourceStepNos || [])
          ])
        ],
        sourceEventNos: [
          ...new Set([
            ...(current.sourceEventNos || []),
            ...(next.sourceEventNos || [])
          ])
        ],
        screenshot: next.screenshot || current.screenshot
      });
      index += 2;
      continue;
    }

    result.push(current);
    index += 1;
  }

  return result.map((task, taskIndex) => ({
    ...task,
    taskNo: taskIndex + 1,
    taskId: taskId(task.taskType, taskIndex),
    instruction: taskInstruction(task)
  }));
}

function removeNonManualTasks(tasks) {
  return tasks.filter(task => {
    if (task.taskType === "Unclassified") return false;
    if (task.taskType === "Navigate") return false;
    if (task.taskType === "NavigateBack") return false;
    if (task.semanticAction === "ConfirmYes") return false;
    if (task.semanticAction === "ConfirmNo") return false;

    if (
      task.taskType === "Dialog" &&
      !task.actionCaption &&
      !task.selectedCaption
    ) {
      return false;
    }

    if (
      task.taskType === "ChangeField" &&
      !task.fieldCaption
    ) {
      return false;
    }

    return true;
  });
}

function calculateTaskQuality(tasks) {
  if (!tasks.length) return 0;

  let score = 0;

  for (const task of tasks) {
    let taskScore = 40;

    if (task.taskType !== "Unclassified") taskScore += 25;
    if (task.instruction) taskScore += 15;
    if (
      task.pageCaption ||
      task.actionCaption ||
      task.fieldCaption ||
      task.selectedCaption
    ) {
      taskScore += 10;
    }
    if (task.screenshot) taskScore += 10;

    score += Math.min(taskScore, 100);
  }

  return Math.round(score / tasks.length);
}

function runBusinessTaskEngine(businessSteps) {
  let tasks = createBusinessTasks(businessSteps);
  tasks = mergeAdjacentBusinessTasks(tasks);
  tasks = removeNonManualTasks(tasks);

  return {
    tasks,
    quality: calculateTaskQuality(tasks)
  };
}

function createTaskDocumentationMarkdown(session, tasks, quality) {
  const profile =
    PROFILE_PRESETS[session.settings?.documentationProfile || "generic"]
      ?.label || "Generisk manual";

  const rendered = tasks.map(task => {
    const image = task.screenshot
      ? `\n\n   ![${task.instruction.replace(/\*\*/g, "")}](${task.screenshot})`
      : "";

    return `${task.taskNo}. ${task.instruction}${image}`;
  }).join("\n\n");

  return `# ${session.name}

## Dokumentationstyp

${profile}

## Syfte

${session.purpose || "Syfte har inte angetts."}

## Förutsättningar

- Användaren har behörighet till berörda sidor och åtgärder.
- Processen genomförs med korrekta grunddata.
- Benämningar på sidor, fält och åtgärder återges exakt som de visades i Business Central.
- Känsliga värden hanteras enligt vald dokumentationsprofil.

## Arbetsgång

${rendered || "Inga dokumenterbara affärsuppgifter kunde identifieras."}

## Förväntat resultat

Processen är genomförd enligt arbetsgången.

## Kvalitet

Dokumentationskvalitet: **${quality} %**

---
Genererad från Business Tasks av Thinknine BC Recorder 4.3.0.
`;
}


function createDocumentationMarkdown(session, businessSteps) {
  const rendered = businessSteps.map(step => {
    const image = step.screenshot
      ? `\n\n   ![${step.description.replace(/\*\*/g, "")}](${step.screenshot})`
      : "";

    return `${step.step}. ${step.description}${image}`;
  }).join("\n\n");

  return `# ${session.name}

## Syfte

${session.purpose || "Syfte har inte angetts."}

## Dokumentationstyp

${PROFILE_PRESETS[session.settings?.documentationProfile || "generic"]?.label || "Generisk manual"}

## Förutsättningar

- Användaren har behörighet till berörda sidor och åtgärder.
- Processen genomförs med korrekta grunddata.
- Benämningar på sidor, fält och åtgärder återges exakt som de visades i Business Central vid inspelningen.
- Känsliga affärsvärden kan vara maskerade.

## Arbetsgång

${rendered || "Inga meningsfulla arbetssteg kunde identifieras."}

## Förväntat resultat

Processen är genomförd och de registrerade ändringarna har sparats i Business Central.

---
Automatiskt tolkat av Thinknine BC Recorder 4.3.0.
`;
}

function createDiagnostics(session, rawEvents, businessSteps, screenshotCount) {
  const rawTypeCounts = {};
  for (const event of rawEvents) {
    rawTypeCounts[event.type] = (rawTypeCounts[event.type] || 0) + 1;
  }

  const semanticActionCounts = {};
  for (const step of businessSteps) {
    semanticActionCounts[step.semanticAction] =
      (semanticActionCounts[step.semanticAction] || 0) + 1;
  }

  return {
    recorderVersion: "4.3.0",
    uiFidelityMode: true,
    sessionId: session.id,
    environment: session.settings?.environmentName || "",
    rawEventCount: rawEvents.length,
    firstPassStepCount: arguments[4] || businessSteps.length,
    businessStepCount: businessSteps.length,
    patternReductionPercent: (arguments[4] || businessSteps.length)
      ? Math.round(
          (1 - businessSteps.length / (arguments[4] || businessSteps.length)) * 100
        )
      : 0,
    noiseReductionPercent: rawEvents.length
      ? Math.round((1 - businessSteps.length / rawEvents.length) * 100)
      : 0,
    screenshotCount,
    rawTypeCounts,
    semanticActionCounts,
    valueRoleCounts: businessSteps.reduce((counts, step) => {
      const role = step.valueRole || "None";
      counts[role] = (counts[role] || 0) + 1;
      return counts;
    }, {}),
    maskingSettings: session.settings || {},
    documentationProfile:
      session.settings?.documentationProfile || "generic",
    processPatternCounts: businessSteps.reduce((counts, step) => {
      const pattern = step.processPattern || "Unclassified";
      counts[pattern] = (counts[pattern] || 0) + 1;
      return counts;
    }, {}),
    recognizedPatternCount: businessSteps.filter(
      step => Boolean(step.processPattern)
    ).length,
    documentationQuality: (() => {
      if (!businessSteps.length) return 0;
      const recognized = businessSteps.filter(
        step => Boolean(step.processPattern)
      ).length;
      const captionComplete = businessSteps.filter(
        step =>
          step.pageCaption &&
          (
            step.actionCaption ||
            step.fieldCaption ||
            step.selectedCaption ||
            ["Navigate", "OpenRecord"].includes(step.action)
          )
      ).length;
      const score =
        (recognized / businessSteps.length) * 60 +
        (captionComplete / businessSteps.length) * 40;
      return Math.round(score);
    })(),
    pages: [...new Map(
      businessSteps.map(step => [
        `${step.pageId}|${step.pageCaption}`,
        {
          pageId: step.pageId,
          pageCaption: step.pageCaption
        }
      ])
    ).values()],
    exportedAt: new Date().toISOString()
  };
}

async function loadSettings() {
  try {
    await loadKnowledgePacks();
  } catch (error) {
    console.warn("Knowledge Packs could not be loaded.", error);
  }

  const response = await send({ type: "T9_GET_SETTINGS" });
  const settings = {
    ...DEFAULTS,
    ...(response?.settings || {})
  };

  for (const [key, value] of Object.entries(settings)) {
    const element = $(key);
    if (!element) continue;

    if (typeof value === "boolean") {
      element.checked = value;
    } else if (
      value !== undefined &&
      value !== null
    ) {
      element.value = value;
    }
  }

  $("documentationProfile").value =
    settings.documentationProfile ||
    DEFAULTS.documentationProfile ||
    "generic";

  applyProfile(
    $("documentationProfile").value,
    false
  );
  updateFilenamePreview();
}

async function saveSettings() {
  const settings = {
    ...DEFAULTS,
    documentationProfile: $("documentationProfile").value
  };

  for (const key of Object.keys(DEFAULTS)) {
    const element = $(key);
    if (!element) continue;

    settings[key] =
      element.type === "checkbox"
        ? element.checked
        : element.type === "number"
          ? Number(element.value)
          : element.value;
  }

  await send({
    type: "T9_SAVE_SETTINGS",
    settings
  });

  show("Inställningarna har sparats.");
}


async function prepareSessionModel(session) {
  const response = await send({
    type: "T9_GET_SESSION_DATA",
    sessionId: session.id,
    includeScreenshots: true
  });

  if (!response.ok) {
    throw new Error(response.error || "Sessionen kunde inte läsas.");
  }

  const imagePaths = {};
  const screenshotData = {};

  for (const [eventNo, dataUrl] of Object.entries(response.screenshots || {})) {
    imagePaths[eventNo] =
      `screenshots/${String(eventNo).padStart(6, "0")}.png`;
    screenshotData[imagePaths[eventNo]] = dataUrl;
  }

  const filteredEvents = globalThis.T9Engine?.noiseFilter
    ? globalThis.T9Engine.noiseFilter.filter(response.events)
    : response.events;

  const contextEvents = buildContextEvents(filteredEvents);
  const contextCandidates = createContextCandidates(contextEvents);

  const interpretedSteps = buildBusinessSteps(
    contextEvents,
    imagePaths,
    response.session.settings || DEFAULTS
  );
  const businessSteps = runProcessPatternEngine(interpretedSteps);
  const taskResult = runBusinessTaskEngine(businessSteps);
  const contextByEventNo = new Map(
    contextEvents.map(event => [event.eventNo, event.context || {}])
  );

  const legacyTasks = finalizeKnowledgeTasks(
    taskResult.tasks,
    response.session.settings || DEFAULTS
  ).map(task => {
    const contexts = (task.sourceEventNos || [])
      .map(eventNo => contextByEventNo.get(eventNo))
      .filter(Boolean);

    return {
      ...task,
      context:
        contexts.find(context => context.currentEntity) ||
        contexts[0] ||
        {},
      automationId: task.automationId || ""
    };
  });

  const businessTasks = applyKnowledgePackFramework(
    legacyTasks,
    response.session.settings || DEFAULTS
  ).map((task, index) => ({
    ...task,
    taskNo: index + 1,
    taskId: taskId(task.taskType, index)
  }));

  const entityNodes = globalThis.T9Engine?.entityMemory
    ? globalThis.T9Engine.entityMemory.build(contextEvents)
    : [];

  const sessionGraph = globalThis.T9Engine?.sessionGraph
    ? globalThis.T9Engine.sessionGraph.build(
        response.session,
        businessTasks,
        entityNodes
      )
    : { nodes: [], edges: [] };

  const confidenceResult = globalThis.T9Engine?.confidence
    ? globalThis.T9Engine.confidence.evaluate(
        businessTasks,
        sessionGraph
      )
    : {
        tasks: businessTasks,
        sessionConfidence: calculateTaskQuality(businessTasks),
        knowledgeMatchPercent: 0,
        graphCoveragePercent: 0,
        reviewSuggestedCount: 0
      };

  return {
    response,
    imagePaths,
    screenshotData,
    contextEvents,
    contextCandidates,
    interpretedSteps,
    businessSteps,
    sessionGraph,
    confidenceResult,
    businessTasks: confidenceResult.tasks
  };
}

async function exportSession(session) {
  show(`Förbereder export av "${session.name}"...`);

  const response = await send({
    type: "T9_GET_SESSION_DATA",
    sessionId: session.id,
    includeScreenshots: true
  });

  if (!response.ok) {
    throw new Error(response.error || "Sessionen kunde inte läsas.");
  }

  const imagePaths = {};
  const imageFiles = [];

  for (const [eventNo, dataUrl] of Object.entries(response.screenshots || {})) {
    const path = `screenshots/${String(eventNo).padStart(6, "0")}.png`;
    imagePaths[eventNo] = path;
    imageFiles.push({
      name: path,
      data: dataUrlBytes(dataUrl)
    });
  }

  const filteredEvents = globalThis.T9Engine?.noiseFilter
    ? globalThis.T9Engine.noiseFilter.filter(response.events)
    : response.events;

  const contextEvents = buildContextEvents(filteredEvents);
  const contextCandidates = createContextCandidates(contextEvents);

  const interpretedSteps = buildBusinessSteps(
    contextEvents,
    imagePaths,
    response.session.settings || DEFAULTS
  );
  const businessSteps = runProcessPatternEngine(interpretedSteps);
  const taskResult = runBusinessTaskEngine(businessSteps);
  const contextByEventNo = new Map(
    contextEvents.map(event => [event.eventNo, event.context || {}])
  );

  const legacyTasks = finalizeKnowledgeTasks(
    taskResult.tasks,
    response.session.settings || DEFAULTS
  ).map(task => {
    const contexts = (task.sourceEventNos || [])
      .map(eventNo => contextByEventNo.get(eventNo))
      .filter(Boolean);

    const strongestContext =
      contexts.find(context => context.currentEntity) ||
      contexts[0] ||
      {};

    return {
      ...task,
      context: strongestContext,
      automationId:
        task.automationId ||
        ""
    };
  });
  const businessTasks = applyKnowledgePackFramework(
    legacyTasks,
    response.session.settings || DEFAULTS
  ).map((task, index) => ({
    ...task,
    taskNo: index + 1,
    taskId: taskId(task.taskType, index)
  }));
  const entityNodes = globalThis.T9Engine?.entityMemory
    ? globalThis.T9Engine.entityMemory.build(contextEvents)
    : [];

  const sessionGraph = globalThis.T9Engine?.sessionGraph
    ? globalThis.T9Engine.sessionGraph.build(
        response.session,
        businessTasks,
        entityNodes
      )
    : { nodes: [], edges: [] };

  const confidenceResult = globalThis.T9Engine?.confidence
    ? globalThis.T9Engine.confidence.evaluate(businessTasks, sessionGraph)
    : {
        tasks: businessTasks,
        sessionConfidence: calculateTaskQuality(businessTasks),
        knowledgeMatchPercent: 0,
        graphCoveragePercent: 0,
        reviewSuggestedCount: 0
      };

  const finalBusinessTasks = confidenceResult.tasks;
  const knowledgeQuality = confidenceResult.sessionConfidence;
  const diagnostics = createDiagnostics(
    response.session,
    response.events,
    businessSteps,
    imageFiles.length,
    interpretedSteps.length
  );

  diagnostics.businessTaskCount = finalBusinessTasks.length;
  diagnostics.businessTaskQuality = knowledgeQuality;
  diagnostics.knowledgePackVersion = "4.3.0";
  diagnostics.knowledgeFrameworkVersion = KNOWLEDGE_PACK_FRAMEWORK_VERSION;
  diagnostics.loadedKnowledgePacks = loadedKnowledgePacks.map(pack => ({
    packId: pack.packId,
    name: pack.name,
    version: pack.version,
    ruleCount: (pack.rules || []).length
  }));
  diagnostics.loadedKnowledgeRuleCount = loadedKnowledgeRules.length;
  diagnostics.unmatchedKnowledgeCount = unmatchedKnowledgeItems.length;
  diagnostics.contextBuilderVersion = CONTEXT_BUILDER_VERSION;
  diagnostics.contextEventCount = contextEvents.length;
  diagnostics.contextCandidateCount = contextCandidates.length;
  diagnostics.contextEntityCounts = contextEvents.reduce(
    (counts, event) => {
      const entity = event.context?.currentEntity || "Unknown";
      counts[entity] = (counts[entity] || 0) + 1;
      return counts;
    },
    {}
  );
  diagnostics.knowledgeRuleCounts = finalBusinessTasks.reduce(
    (counts, task) => {
      const rule = task.knowledgeRule || "Unmatched";
      counts[rule] = (counts[rule] || 0) + 1;
      return counts;
    },
    {}
  );
  diagnostics.reviewSuggestedCount = finalBusinessTasks.filter(
    task => task.reviewSuggested
  ).length;
  diagnostics.businessTaskTypeCounts = finalBusinessTasks.reduce(
    (counts, task) => {
      counts[task.taskType] = (counts[task.taskType] || 0) + 1;
      return counts;
    },
    {}
  );

  const folder = safeFileName(session.name);
  const prefix = `${folder}/`;

  const files = [
    {
      name: `${prefix}session.json`,
      data: bytes(JSON.stringify(response.session, null, 2))
    },
    {
      name: `${prefix}events.json`,
      data: bytes(JSON.stringify(
        response.events.map(event => {
          const copy = { ...event };
          delete copy.signature;
          return copy;
        }),
        null,
        2
      ))
    },
    {
      name: `${prefix}business-steps.json`,
      data: bytes(JSON.stringify(businessSteps, null, 2))
    },
    {
      name: `${prefix}session-graph.json`,
      data: bytes(JSON.stringify(sessionGraph, null, 2))
    },
    {
      name: `${prefix}confidence-report.json`,
      data: bytes(JSON.stringify({
        sessionConfidence: confidenceResult.sessionConfidence,
        knowledgeMatchPercent: confidenceResult.knowledgeMatchPercent,
        graphCoveragePercent: confidenceResult.graphCoveragePercent,
        reviewSuggestedCount: confidenceResult.reviewSuggestedCount
      }, null, 2))
    },
    {
      name: `${prefix}business-tasks.json`,
      data: bytes(JSON.stringify(finalBusinessTasks, null, 2))
    },
    {
      name: `${prefix}diagnostics.json`,
      data: bytes(JSON.stringify(diagnostics, null, 2))
    },
    {
      name: `${prefix}documentation.md`,
      data: bytes(
        createTaskDocumentationMarkdown(
          response.session,
          businessTasks,
          knowledgeQuality
        )
      )
    },
    {
      name: `${prefix}context-events.json`,
      data: bytes(JSON.stringify(contextEvents, null, 2))
    },
    {
      name: `${prefix}context-candidates.json`,
      data: bytes(JSON.stringify(contextCandidates, null, 2))
    },
    {
      name: `${prefix}knowledge-pack-summary.json`,
      data: bytes(JSON.stringify({
        frameworkVersion: KNOWLEDGE_PACK_FRAMEWORK_VERSION,
        packs: loadedKnowledgePacks.map(pack => ({
          packId: pack.packId,
          name: pack.name,
          version: pack.version,
          ruleCount: (pack.rules || []).length
        })),
        totalRuleCount: loadedKnowledgeRules.length
      }, null, 2))
    },
    {
      name: `${prefix}unmatched-knowledge.json`,
      data: bytes(JSON.stringify({
        count: unmatchedKnowledgeItems.length,
        contextCandidates,
        items: unmatchedKnowledgeItems
      }, null, 2))
    },
    {
      name: `${prefix}knowledge-pack.json`,
      data: bytes(JSON.stringify({
        version: BC_KNOWLEDGE_PACK_VERSION,
        entities: BC_ENTITIES.map(entity => ({
          entity: entity.entity,
          genericDocument: entity.genericDocument
        })),
        actionRules: BC_ACTION_RULES.map(rule => ({
          ruleId: rule.ruleId,
          taskType: rule.taskType,
          semanticAction: rule.semanticAction,
          confidence: rule.confidence
        })),
        fieldRules: BC_FIELD_RULES.map(rule => ({
          ruleId: rule.ruleId,
          taskType: rule.taskType,
          semanticAction: rule.semanticAction,
          confidence: rule.confidence
        }))
      }, null, 2))
    },
    {
      name: `${prefix}quality-report.json`,
      data: bytes(JSON.stringify({
        documentationQuality: knowledgeQuality,
        knowledgePackVersion: BC_KNOWLEDGE_PACK_VERSION,
        reviewSuggestedCount: diagnostics.reviewSuggestedCount,
        knowledgeMatchedCount: finalBusinessTasks.filter(
          task => task.knowledgeMatched
        ).length,
        knowledgeMatchPercent: finalBusinessTasks.length
          ? Math.round(
              finalBusinessTasks.filter(task => task.knowledgeMatched).length /
              finalBusinessTasks.length * 100
            )
          : 0,
        unmatchedKnowledgeCount: unmatchedKnowledgeItems.length,
        contextCandidateCount: contextCandidates.length,
        contextEntityCounts: diagnostics.contextEntityCounts,
        knowledgeRuleCounts: diagnostics.knowledgeRuleCounts,
        businessTaskCount: finalBusinessTasks.length,
        businessTaskTypeCounts: diagnostics.businessTaskTypeCounts,
        rawEventCount: diagnostics.rawEventCount,
        firstPassStepCount: diagnostics.firstPassStepCount,
        businessStepCount: diagnostics.businessStepCount,
        noiseReductionPercent: diagnostics.noiseReductionPercent,
        patternReductionPercent: diagnostics.patternReductionPercent,
        recognizedPatternCount: diagnostics.recognizedPatternCount,
        processPatternCounts: diagnostics.processPatternCounts,
        recommendation:
          diagnostics.documentationQuality >= 85
            ? "Redo för granskning"
            : diagnostics.documentationQuality >= 65
              ? "Granska oklassificerade steg"
              : "Spela in processen igen eller komplettera regler"
      }, null, 2))
    },
    {
      name: `${prefix}ui-fidelity.json`,
      data: bytes(JSON.stringify({
        version: "4.3.0",
        principle: "Visible Business Central captions are preserved exactly.",
        rules: [
          "actionCaption is the text shown on the action or button.",
          "fieldCaption is the text shown beside the field.",
          "pageCaption is the visible page title captured during recording.",
          "semanticAction is separate metadata and must not replace the UI caption.",
          "AI output must preserve actionCaption, fieldCaption and pageCaption verbatim."
        ],
        dataPolicy: {
          transactionNumbers: "Masked by default",
          masterData: "Preserved by default",
          environmentData: "Removed from documentation by default"
        }
      }, null, 2))
    },
    ...loadedKnowledgePacks.map(pack => ({
      name: `${prefix}knowledge-packs/${pack.packId}.json`,
      data: bytes(JSON.stringify(pack, null, 2))
    })),
    ...imageFiles.map(file => ({
      name: `${prefix}${file.name}`,
      data: file.data
    }))
  ];

  const blob = zip(files);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `${safeFileName(session.id)}.zip`;
  link.click();

  setTimeout(() => URL.revokeObjectURL(url), 60000);
  show(`ZIP-export skapad i UI Fidelity-läge: ${response.events.length} råhändelser blev ${businessSteps.length} arbetssteg och ${imageFiles.length} bilder.`);
}




function currentFilenamePreviewSession() {
  return activeReviewModel?.response?.session ||
    activeReviewSession ||
    { name: "Business Central-process", settings: {} };
}

function currentFilenamePreviewSettings() {
  return {
    ...DEFAULTS,
    exportFileNamePattern:
      $("exportFileNamePattern")?.value ||
      DEFAULTS.exportFileNamePattern,
    environmentName:
      $("environmentName")?.value ||
      DEFAULTS.environmentName
  };
}

function updateFilenamePreview(
  session = currentFilenamePreviewSession(),
  settings = currentFilenamePreviewSettings()
) {
  const input = $("exportFileNamePattern");
  const preview = $("filenamePreview");
  const validation = $("filenameValidation");
  if (!input || !preview || !validation) return "";

  return globalThis.T9Engine.exportSettings.updatePreview(
    { input, preview, validation },
    session,
    settings
  );
}

function insertFilenameVariable(variable) {
  const input = $("exportFileNamePattern");
  if (!input) return;
  globalThis.T9Engine.exportSettings.insertVariable(input, variable);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

function initializeFilenameVariables() {
  globalThis.T9Engine.exportSettings.renderVariableControls(
    $("filenameVariables"),
    $("filenameVariableHelp"),
    insertFilenameVariable
  );
}

async function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);

  try {
    const response = await send({
      type: "T9_DOWNLOAD_FILE",
      url,
      filename
    });

    if (!response.ok) {
      throw new Error(response.error || "Filen kunde inte sparas.");
    }

    return response.downloadId;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
}

function dataUrlToImageData(dataUrl) {
  if (!dataUrl) return null;

  const headerEnd = dataUrl.indexOf(",");
  if (headerEnd < 0) return null;

  const header = dataUrl.slice(0, headerEnd);
  const mimeMatch = header.match(/^data:([^;]+)/i);
  const mimeType = mimeMatch?.[1]?.toLowerCase() || "";
  const base64 = dataUrl.slice(headerEnd + 1);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return {
    bytes,
    mimeType
  };
}

function reviewedTasksForWord() {
  const reviewTasks = activeReview?.tasks || [];
  return reviewTasks
    .filter(task => !task.deleted)
    .map((task, index) => ({
      ...task,
      taskNo: index + 1
    }));
}

async function exportActiveReviewToWord() {
  if (!activeReviewSession || !activeReview) {
    throw new Error("Ingen granskning är öppen.");
  }

  if (!globalThis.T9Export?.word?.createDocx) {
    throw new Error(
      "Word-exportbiblioteket kunde inte laddas. Kör npm install och npm run build."
    );
  }

  if (!activeReviewModel) {
    activeReviewModel = await prepareSessionModel(
      activeReviewSession
    );
  }

  const tasks = reviewedTasksForWord();
  const screenshotPaths = globalThis.T9ReviewAnnotationCompositor
    .pathsForTasks(tasks);
  const screenshotData = await globalThis.T9ReviewAnnotationCompositor
    .composeReview({
      review: activeReview,
      paths: screenshotPaths,
      screenshotSources: activeReviewModel.screenshotData || {},
      convertOriginal: dataUrlToImageData
    });

  const result = await globalThis.T9Export.word.createDocx({
    session: activeReviewModel.response.session,
    review: {
      ...activeReview,
      tasks,
    },
    screenshotData,
  });

  const settingsResponse = await send({
    type: "T9_GET_SETTINGS"
  });
  const exportSettings = {
    ...DEFAULTS,
    ...(settingsResponse?.settings || {})
  };
  const filename = updateFilenamePreview(
    activeReviewModel.response.session,
    exportSettings
  );

  await downloadBlob(result.blob, filename);

  show(
    `Word-dokument skapat med docx-biblioteket: ` +
    `${result.taskCount} steg och ${result.imageCount} skärmbilder.`
  );
}

let activeReviewSession = null;
let activeReview = null;
let activeReviewModel = null;
let activeReviewSelection = globalThis.T9ReviewSelection.create();
let activeReviewEdit = null;
let reviewReturnFocus = null;
let reviewLayoutState = globalThis.T9ReviewLayout.create();
let annotationEditorState = null;
let annotationChangesPending = false;
let annotationEditorBaseline = null;

const reviewSaveQueue = globalThis.T9ReviewEdit.createSaveQueue(
  payload => send({
    type: "T9_SAVE_REVIEW",
    sessionId: payload.sessionId,
    review: payload.review
  })
);

const reviewAutoSave = globalThis.T9ReviewEdit.createAutoSave(
  () => {
    if (globalThis.T9ReviewAnnotationEditor.hasActiveGesture(
      annotationEditorState
    )) {
      reviewAutoSave.schedule();
      return undefined;
    }
    return saveActiveReview({ render: false, announce: false });
  },
  {
    onError(error) {
      show(error.message, true);
      $("reviewFooterText").textContent = "Automatisk sparning misslyckades.";
      if (annotationEditorState) {
        $("annotationStatus").textContent =
          "Automatisk sparning misslyckades. Försök spara igen.";
      }
    }
  }
);

const reviewPersistence = globalThis.T9ReviewEdit.createPersistenceCoordinator({
  autoSave: reviewAutoSave,
  saveQueue: reviewSaveQueue,
  save: saveActiveReview
});

function reviewTaskIds() {
  return globalThis.T9Review.activeTasks(activeReview || { tasks: [] })
    .map(task => task.taskId);
}

function applyReviewToolbarState() {
  const state = globalThis.T9ReviewToolbar.derive({
    taskIds: reviewTaskIds(),
    selection: activeReviewSelection,
    canUndo: activeReview && globalThis.T9Review.canUndo(activeReview),
    canRedo: activeReview && globalThis.T9Review.canRedo(activeReview),
    canExport: activeReview && activeReviewSession && activeReviewModel
  });
  globalThis.T9ReviewToolbar.apply($("reviewToolbar"), state);
  $("completeReview").disabled = !activeReview ||
    !globalThis.T9Review.canComplete(activeReview);
}

function applyReviewStatus() {
  const status = globalThis.T9ReviewStatus.derive(
    activeReview?.tasks || [],
    activeReviewSelection
  );
  globalThis.T9ReviewStatus.apply($("reviewStatus"), status);
}

function applyReviewSelection(focusActive = false) {
  const taskIds = reviewTaskIds();
  activeReviewSelection = globalThis.T9ReviewSelection.reconcile(
    activeReviewSelection,
    taskIds
  );
  for (const card of $("reviewList").querySelectorAll("[data-review-task-id]")) {
    const selected = activeReviewSelection.selectedIds.includes(
      card.dataset.reviewTaskId
    );
    const active = activeReviewSelection.activeId === card.dataset.reviewTaskId;
    card.classList.toggle("selected", selected);
    card.setAttribute("aria-selected", String(selected));
    const initial = !activeReviewSelection.activeId &&
      card === $("reviewList").firstElementChild;
    card.tabIndex = active || initial ? 0 : -1;
    if (focusActive && active) card.focus();
  }
  applyReviewToolbarState();
  applyReviewStatus();
}

function dispatchReviewSelection(command, focusActive = false) {
  activeReviewSelection = globalThis.T9ReviewSelection.reduce(
    activeReviewSelection,
    command,
    reviewTaskIds()
  );
  applyReviewSelection(focusActive);
}

function selectedReviewTaskIds(fallbackId) {
  return activeReviewSelection.selectedIds.includes(fallbackId)
    ? activeReviewSelection.selectedIds
    : [fallbackId];
}

function renderMovedReview(previousPositions, focusId) {
  renderReview();
  if (focusId) {
    activeReviewSelection = {
      ...activeReviewSelection,
      activeId: focusId
    };
    applyReviewSelection(true);
  }
  const reducedMotion = globalThis.matchMedia?.(
    "(prefers-reduced-motion: reduce)"
  ).matches;
  globalThis.T9ReviewMove.animatePositions(
    $("reviewList"),
    previousPositions,
    reducedMotion
  );
}

function moveReviewTasksByOffset(delta, fallbackId) {
  const previous = globalThis.T9ReviewMove.capturePositions($("reviewList"));
  const fallbackSelected = activeReviewSelection.selectedIds.includes(fallbackId);
  const movedIds = selectedReviewTaskIds(fallbackId);
  const tasks = globalThis.T9ReviewMove.moveByOffset(
    activeReview.tasks,
    movedIds,
    delta
  );
  globalThis.T9Review.reorder(activeReview, tasks, {
    beforeSelection: activeReviewSelection,
    afterSelection: activeReviewSelection
  });
  const focusId = fallbackSelected
    ? activeReviewSelection.activeId || fallbackId
    : fallbackId;
  renderMovedReview(previous, focusId);
}

function moveReviewTasksTo({ draggedId, targetId, position }) {
  const previous = globalThis.T9ReviewMove.capturePositions($("reviewList"));
  const draggedSelected = activeReviewSelection.selectedIds.includes(draggedId);
  const movedIds = selectedReviewTaskIds(draggedId);
  const tasks = globalThis.T9ReviewMove.moveTo(
    activeReview.tasks,
    movedIds,
    targetId,
    position
  );
  globalThis.T9Review.reorder(activeReview, tasks, {
    beforeSelection: activeReviewSelection,
    afterSelection: activeReviewSelection
  });
  const focusId = draggedSelected
    ? activeReviewSelection.activeId || draggedId
    : draggedId;
  renderMovedReview(previous, focusId);
}

function deleteReviewTasks(selectedIds) {
  const taskIds = reviewTaskIds();
  if (!selectedIds.length) return;
  const firstIndex = Math.min(...selectedIds.map(id => taskIds.indexOf(id)));
  globalThis.T9Review.removeTasks(activeReview, selectedIds, {
    beforeSelection: activeReviewSelection
  });
  const remainingIds = reviewTaskIds();
  const nextId = remainingIds[Math.min(firstIndex, remainingIds.length - 1)] || null;
  activeReviewSelection = nextId
    ? { selectedIds: [nextId], activeId: nextId, anchorId: nextId }
    : globalThis.T9ReviewSelection.create();
  renderReview();
  applyReviewSelection(Boolean(nextId));
}

function mergeSelectedReviewTasks() {
  const selectedIds = activeReviewSelection.selectedIds;
  if (selectedIds.length < 2) return;
  const previous = globalThis.T9ReviewMove.capturePositions($("reviewList"));
  const result = globalThis.T9Review.merge(activeReview, selectedIds, {
    beforeSelection: activeReviewSelection
  });
  if (!result.mergedTask) return;
  const mergedId = result.mergedTask.taskId;
  activeReviewSelection = {
    selectedIds: [mergedId],
    activeId: mergedId,
    anchorId: mergedId
  };
  renderMovedReview(previous, mergedId);
}

function splitSelectedReviewTask() {
  const [taskId] = activeReviewSelection.selectedIds;
  if (!taskId || activeReviewSelection.selectedIds.length !== 1) return;
  const card = [...$("reviewList").querySelectorAll("[data-review-task-id]")]
    .find(element => element.dataset.reviewTaskId === taskId);
  const instruction = card?.querySelector('[data-field="instruction"]');
  const splitAt = instruction?.selectionStart;
  const previous = globalThis.T9ReviewMove.capturePositions($("reviewList"));
  const result = globalThis.T9Review.split(
    activeReview,
    taskId,
    { splitAt },
    { beforeSelection: activeReviewSelection }
  );
  if (!result.splitTasks.length) {
    $("reviewFooterText").textContent =
      "Placera markören mellan två textdelar i instruktionen.";
    instruction?.focus();
    return;
  }
  const splitIds = result.splitTasks.map(task => task.taskId);
  activeReviewSelection = {
    selectedIds: splitIds,
    activeId: splitIds[0],
    anchorId: splitIds[0]
  };
  renderMovedReview(previous, splitIds[0]);
  show(`Steget delades i ${splitIds.length} delar.`);
}

function restoreReviewHistory(direction) {
  if (!activeReview) return;
  const previous = globalThis.T9ReviewMove.capturePositions($("reviewList"));
  const result = direction === "undo"
    ? globalThis.T9Review.undo(activeReview)
    : globalThis.T9Review.redo(activeReview);
  if (!result) return;
  if (annotationEditorState) {
    annotationEditorState = globalThis.T9ReviewAnnotationEditor.select(
      annotationEditorState,
      result.annotationSelection
    );
    annotationEditorState = globalThis.T9ReviewAnnotationEditor
      .reconcileSelection(
        annotationEditorState,
        annotationItems(annotationEditorState.screenshotRef)
      );
    annotationChangesPending = true;
    reviewAutoSave.schedule();
    renderActiveAnnotation();
    applyReviewToolbarState();
    $("annotationStatus").textContent = direction === "undo"
      ? "Annoteringsändringen ångrades."
      : "Annoteringsändringen gjordes om.";
    return;
  }
  activeReviewSelection = result.selection ||
    globalThis.T9ReviewSelection.reconcile(
      activeReviewSelection,
      reviewTaskIds()
    );
  renderMovedReview(previous, activeReviewSelection.activeId);
  if (result.entry.type.startsWith("annotation-")) {
    annotationChangesPending = true;
    reviewAutoSave.schedule();
  }
  show(direction === "undo" ? "Senaste ändringen ångrades." : "Ändringen gjordes om.");
}

function finishReviewEdit(control, commit) {
  if (!activeReviewEdit || !control) return;
  const edit = globalThis.T9ReviewEdit.result(activeReviewEdit);
  if (commit && edit.changed) {
    const index = activeReview.tasks.findIndex(task => task.taskId === edit.taskId);
    if (index >= 0) {
      globalThis.T9Review.editTask(
        activeReview,
        index,
        { [edit.field]: edit.value },
        {
          beforeSelection: activeReviewSelection,
          afterSelection: activeReviewSelection
        }
      );
      reviewAutoSave.schedule();
      $("reviewFooterText").textContent = "Ändringen sparas automatiskt.";
    }
  } else if (!commit) {
    control.value = activeReviewEdit.originalValue;
  }
  if (edit.field === "userComment" && !control.value) {
    const card = control.closest("[data-review-task-id]");
    card.querySelector(".review-comment-section").hidden = true;
    card.querySelector('[data-action="add-comment"]').hidden = false;
  }
  control.readOnly = true;
  delete control.dataset.editing;
  activeReviewEdit = null;
  applyReviewSelection();
}

function beginReviewEdit({ control, taskId, field }) {
  if (activeReviewEdit) {
    const current = $("reviewList").querySelector('[data-editing="true"]');
    finishReviewEdit(current, true);
  }
  activeReviewEdit = globalThis.T9ReviewEdit.createSession(
    taskId,
    field,
    control.value
  );
  control.readOnly = false;
  control.dataset.editing = "true";
  control.focus();
  control.select();
}

function editReviewField(card, taskId, field) {
  const control = card.querySelector(`[data-edit-field="${field}"]`);
  if (!control) return;
  beginReviewEdit({ control, taskId, field });
}

globalThis.T9ReviewEdit.bind($("reviewList"), {
  start: beginReviewEdit,
  update({ value }) {
    if (activeReviewEdit) {
      activeReviewEdit = globalThis.T9ReviewEdit.update(activeReviewEdit, value);
    }
  },
  commit({ control }) {
    finishReviewEdit(control, true);
  },
  cancel({ control }) {
    finishReviewEdit(control, false);
  }
});

function reviewImages(task) {
  if (!activeReviewModel) return [];
  const paths = task.screenshots?.length
    ? task.screenshots
    : task.screenshot
      ? [task.screenshot]
      : [];
  return [...new Set(paths)]
    .map(path => ({ path, imageUrl: activeReviewModel.screenshotData[path] }))
    .filter(image => Boolean(image.imageUrl));
}

function annotationItems(screenshotRef) {
  return globalThis.T9ReviewAnnotations.findScreenshotSet(
    activeReview?.annotations,
    screenshotRef
  )?.items || [];
}

function renderAnnotationSvg(svg, image, screenshotRef, options = {}) {
  if (!image.naturalWidth || !image.naturalHeight) return;
  let items = [...annotationItems(screenshotRef)];
  if (options.preview) {
    items = items.map(annotation =>
      annotation.annotationId === options.preview.annotationId
        ? { ...annotation, geometry: options.preview.geometry }
        : annotation
    );
  }
  if (options.draft) {
    items.push({
      annotationId: "annotation-draft",
      type: options.draftType,
      geometry: options.draft,
      style: globalThis.T9ReviewAnnotations.DEFAULT_STYLES[options.draftType]
    });
  }
  globalThis.T9ReviewAnnotationSvg.render(
    svg,
    items,
    image.naturalWidth,
    image.naturalHeight,
    document,
    { selectedId: options.selectedId }
  );
}

function initializeReviewScreenshots(card, task, images) {
  for (const [index, imageData] of images.entries()) {
    const stage = card.querySelector(`[data-review-image-index="${index}"]`);
    const image = stage.querySelector("img");
    const svg = stage.querySelector("svg");
    const render = () => renderAnnotationSvg(svg, image, imageData.path);
    if (image.complete) render();
    else image.addEventListener("load", render, { once: true });
    stage.parentElement.querySelector('[data-action="annotate"]')
      .addEventListener("click", () => {
        openAnnotationEditor(task, imageData);
      });
  }
}

function renderActiveAnnotation(updateControls = true) {
  if (!annotationEditorState) return;
  renderAnnotationSvg(
    $("annotationSurface"),
    $("annotationImage"),
    annotationEditorState.screenshotRef,
    {
      draft: globalThis.T9ReviewAnnotationEditor.geometry(
        annotationEditorState
      ),
      draftType: annotationEditorState.draft?.type,
      preview: annotationEditorState.translation && {
        annotationId: annotationEditorState.translation.annotationId,
        geometry: annotationEditorState.translation.geometry
      },
      selectedId: annotationEditorState.selectedId
    }
  );
  if (updateControls) renderAnnotationControls();
}

function releaseActiveAnnotationPointer() {
  const pointerId = annotationEditorState?.pointerId;
  globalThis.T9ReviewAnnotationEditor.releasePointer(
    $("annotationSurface"),
    pointerId
  );
  if (annotationEditorState) {
    annotationEditorState = { ...annotationEditorState, pointerId: null };
  }
}

function annotationById(annotationId) {
  return annotationItems(annotationEditorState?.screenshotRef)
    .find(annotation => annotation.annotationId === annotationId) || null;
}

function annotationGeometryFields(annotation) {
  if (annotation.type === "arrow") {
    return [
      ["startX", "Start X"],
      ["startY", "Start Y"],
      ["endX", "Slut X"],
      ["endY", "Slut Y"]
    ];
  }
  return [
    ["x", "X"],
    ["y", "Y"],
    ["width", "Bredd"],
    ["height", "Höjd"]
  ];
}

function renderAnnotationControls() {
  if (!annotationEditorState) return;
  const items = annotationItems(annotationEditorState.screenshotRef)
    .filter(annotation => {
      const result = globalThis.T9ReviewAnnotations.validation(annotation);
      return result.valid && result.supported;
    });
  const selected = items.find(
    annotation => annotation.annotationId === annotationEditorState.selectedId
  );
  annotationEditorState = globalThis.T9ReviewAnnotationEditor
    .reconcileSelection(annotationEditorState, items);
  $("rectangleAnnotationTool").setAttribute(
    "aria-pressed",
    String(annotationEditorState.tool === "rectangle")
  );
  $("arrowAnnotationTool").setAttribute(
    "aria-pressed",
    String(annotationEditorState.tool === "arrow")
  );
  $("deleteAnnotation").disabled = !selected;
  $("annotationList").innerHTML = items.map((annotation, index) => {
    const type = annotation.type === "arrow" ? "Pil" : "Rektangel";
    return `<li><button class="secondary" data-annotation-id="${escapeHtml(annotation.annotationId)}"
      aria-current="${annotation.annotationId === annotationEditorState.selectedId}">${type} ${index + 1}</button></li>`;
  }).join("");
  if (!selected) {
    $("annotationProperties").innerHTML =
      '<p class="muted">Välj en markering för att ändra dess geometri.</p>';
    return;
  }
  $("annotationProperties").innerHTML = annotationGeometryFields(selected)
    .map(([key, label]) => `<label>${label}
      <input type="number" min="0" max="100" step="1"
        data-annotation-geometry="${key}"
        value="${Math.round(selected.geometry[key] * 100)}">
    </label>`)
    .join("") +
    '<div class="annotation-properties-actions"><button data-action="apply-annotation-geometry" class="primary">Tillämpa</button></div>';
}

function openAnnotationEditor(task, imageData) {
  annotationEditorBaseline = globalThis.T9ReviewAnnotationEditor.baseline(
    activeReview
  );
  annotationEditorState = globalThis.T9ReviewAnnotationEditor.create({
    taskId: task.taskId,
    screenshotRef: imageData.path,
    imageUrl: imageData.imageUrl
  });
  $("reviewDialog").classList.add("annotation-mode");
  $("reviewList").hidden = true;
  $("reviewFooter").hidden = true;
  $("annotationEditor").hidden = false;
  $("annotationTitle").textContent =
    `Annotera skärmbild för steg ${task.taskNo}`;
  $("annotationImage").src = imageData.imageUrl;
  renderAnnotationControls();
  if ($("annotationImage").complete) renderActiveAnnotation();
  $("annotationSurface").focus();
}

async function closeAnnotationEditor(options = {}) {
  if (!annotationEditorState) return;
  const taskId = annotationEditorState.taskId;
  releaseActiveAnnotationPointer();
  annotationEditorState = globalThis.T9ReviewAnnotationEditor.cancel(
    annotationEditorState
  );
  if (options.cancel) {
    reviewAutoSave.cancel();
    activeReview = globalThis.T9ReviewAnnotationEditor.restoreBaseline(
      activeReview,
      annotationEditorBaseline
    );
    annotationChangesPending = true;
    await saveActiveReview({ render: false, announce: false });
    await reviewSaveQueue.flush();
  } else {
    $("annotationStatus").textContent = "Sparar annoteringar.";
    await flushReviewPersistence();
  }
  annotationEditorState = null;
  annotationEditorBaseline = null;
  $("annotationEditor").hidden = true;
  $("reviewList").hidden = false;
  $("reviewFooter").hidden = false;
  $("reviewDialog").classList.remove("annotation-mode");
  renderReview();
  const card = [...$("reviewList").querySelectorAll("[data-review-task-id]")]
    .find(element => element.dataset.reviewTaskId === taskId);
  card?.querySelector('[data-action="annotate"]')?.focus();
}

function markAnnotationsChanged(message) {
  annotationChangesPending = true;
  reviewAutoSave.schedule();
  renderActiveAnnotation();
  $("annotationStatus").textContent =
    `${message} Väntar på automatisk sparning.`;
  $("reviewFooterText").textContent =
    "Annoteringen väntar på automatisk sparning.";
}

function addAnnotation(type, geometry) {
  if (!annotationEditorState) return false;
  try {
    const annotation = globalThis.T9ReviewAnnotations.createAnnotation(
      type,
      geometry
    );
    globalThis.T9Review.addAnnotation(
      activeReview,
      annotationEditorState.screenshotRef,
      annotation,
      {
        beforeAnnotationSelection: annotationEditorState.selectedId,
        afterAnnotationSelection: annotation.annotationId
      }
    );
    annotationEditorState = globalThis.T9ReviewAnnotationEditor.select(
      annotationEditorState,
      annotation.annotationId
    );
    markAnnotationsChanged(type === "arrow" ? "Pil tillagd." : "Rektangel tillagd.");
    return true;
  } catch (error) {
    $("annotationStatus").textContent =
      `Markeringen kunde inte läggas till: ${error.message}`;
    return false;
  }
}

function updateAnnotation(annotationId, geometry, message, options = {}) {
  if (!annotationEditorState) return false;
  try {
    const before = annotationById(annotationId);
    const updated = globalThis.T9Review.updateAnnotation(
      activeReview,
      annotationEditorState.screenshotRef,
      annotationId,
      { geometry },
      {
        type: options.type,
        groupKey: options.groupKey,
        beforeAnnotationSelection: annotationEditorState.selectedId,
        afterAnnotationSelection: annotationId
      }
    );
    if (!updated) return false;
    if (JSON.stringify(before) === JSON.stringify(updated)) {
      renderActiveAnnotation();
      return true;
    }
    markAnnotationsChanged(message || "Markeringen uppdaterades.");
    return true;
  } catch (error) {
    $("annotationStatus").textContent =
      `Markeringen kunde inte uppdateras: ${error.message}`;
    return false;
  }
}

function deleteSelectedAnnotation() {
  const annotationId = annotationEditorState?.selectedId;
  if (!annotationId) return false;
  releaseActiveAnnotationPointer();
  const removed = globalThis.T9Review.removeAnnotation(
    activeReview,
    annotationEditorState.screenshotRef,
    annotationId,
    {
      beforeAnnotationSelection: annotationId,
      afterAnnotationSelection: null
    }
  );
  if (!removed) return false;
  annotationEditorState = globalThis.T9ReviewAnnotationEditor.select(
    annotationEditorState,
    null
  );
  markAnnotationsChanged("Markeringen togs bort.");
  $("annotationSurface").focus();
  return true;
}

function renderReview() {
  const list = $("reviewList");
  list.innerHTML = "";

  const tasks = globalThis.T9Review.activeTasks(activeReview);
  const progress = globalThis.T9Review.progress(activeReview);

  $("reviewProgressBar").style.width = `${progress}%`;
  $("reviewProgress").setAttribute("aria-valuenow", String(progress));
  list.setAttribute("aria-rowcount", String(tasks.length));
  $("reviewSummary").textContent =
    `${progress}% godkända · ` +
    `Session confidence ${activeReviewModel.confidenceResult.sessionConfidence}%`;
  $("reviewFooterText").textContent =
    annotationChangesPending
      ? "Annoteringar har ändrats. Välj Spara för att lagra dem."
      : activeReview.status === "completed"
      ? "Granskningen är slutförd."
      : "Ändringar sparas lokalt i Edge.";

  tasks.forEach((task, visibleIndex) => {
    const actualIndex = activeReview.tasks.indexOf(task);
    const card = document.createElement("article");
    card.dataset.reviewTaskId = task.taskId;
    card.setAttribute("role", "row");
    card.setAttribute("aria-rowindex", String(visibleIndex + 1));
    card.setAttribute("aria-label", `Steg ${visibleIndex + 1}`);
    card.className =
      "review-card " +
      (task.approved
        ? "approved"
        : task.reviewSuggested || task.confidenceScore < 80
          ? "needs-review"
          : "");

    const images = reviewImages(task);

    card.innerHTML = `
      <div class="review-number" role="gridcell">${visibleIndex + 1}</div>
      <div class="review-fields" role="gridcell">
        <div class="review-field-heading">
          <label for="review-instruction-${visibleIndex}">Instruktion</label>
          <button data-action="edit-instruction" class="secondary"
            aria-label="Redigera instruktion för steg ${visibleIndex + 1}">Redigera</button>
        </div>
        <textarea id="review-instruction-${visibleIndex}" data-field="instruction" data-edit-field="instruction"
          aria-label="Instruktion för steg ${visibleIndex + 1}"
          aria-keyshortcuts="Enter Escape Shift+Enter"
          title="Dubbelklicka eller tryck Enter för att redigera"
          readonly>${escapeHtml(globalThis.T9TextFormat.quoteEmphasis(task.instruction))}</textarea>
        <div class="review-comment-section" ${task.userComment ? "" : "hidden"}>
          <div class="review-field-heading">
            <label for="review-comment-${visibleIndex}">Kommentar</label>
            <button data-action="edit-comment" class="secondary"
              aria-label="Redigera kommentar för steg ${visibleIndex + 1}">Redigera</button>
          </div>
          <input id="review-comment-${visibleIndex}" data-field="userComment" data-edit-field="userComment" type="text"
            aria-label="Kommentar för steg ${visibleIndex + 1}"
            aria-keyshortcuts="Enter Escape"
            title="Dubbelklicka för att redigera" readonly
            value="${escapeHtml(task.userComment || "")}">
        </div>
        <button data-action="add-comment" class="secondary review-add-comment"
          ${task.userComment ? "hidden" : ""}
          aria-label="Lägg till kommentar för steg ${visibleIndex + 1}">Lägg till kommentar</button>
        <div class="review-meta">
          ${escapeHtml(task.taskType || "Task")}
          · Confidence ${task.confidenceScore ?? task.confidence ?? 0}%
          ${task.knowledgeRule
            ? ` · ${escapeHtml(task.knowledgeRule)}`
            : ""}
        </div>
        ${images.map((image, imageIndex) =>
          `<div class="review-screenshot">
            <div class="review-image-stage" data-review-image-index="${imageIndex}">
              <img class="review-image" src="${image.imageUrl}"
                alt="Skärmbild ${imageIndex + 1} för steg ${visibleIndex + 1}">
              <svg class="review-annotation-layer" aria-hidden="true"></svg>
            </div>
            <button data-action="annotate" class="secondary review-annotate-button"
              aria-label="Annotera skärmbild ${imageIndex + 1} för steg ${visibleIndex + 1}">Annotera</button>
          </div>`
        ).join("")}
      </div>
      <div class="review-actions" role="gridcell">
        <button data-drag-handle class="secondary" draggable="true"
          aria-label="Dra steg ${visibleIndex + 1} för att flytta"
          aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown">Flytta</button>
        <label>
          <input data-action="approve" type="checkbox"
            aria-label="Godkänn steg ${visibleIndex + 1}"
            ${task.approved ? "checked" : ""}>
          Godkänd
        </label>
        <button data-action="add" class="secondary" aria-label="Lägg till steg efter steg ${visibleIndex + 1}">Lägg till efter</button>
        <button data-action="remove" class="danger" aria-label="Ta bort steg ${visibleIndex + 1}">Ta bort</button>
        <button data-action="toggle-layout" class="secondary" aria-pressed="false">Komprimera</button>
      </div>`;

    initializeReviewScreenshots(card, task, images);

    card.querySelector('[data-action="approve"]')
      .addEventListener("change", event => {
        globalThis.T9Review.approveTask(
          activeReview,
          actualIndex,
          event.target.checked,
          {
            beforeSelection: activeReviewSelection,
            afterSelection: activeReviewSelection
          }
        );
        renderReview();
      });

    card.querySelector('[data-action="edit-instruction"]')
      .addEventListener("click", () => {
        editReviewField(card, task.taskId, "instruction");
      });

    card.querySelector('[data-action="edit-comment"]')
      .addEventListener("click", () => {
        editReviewField(card, task.taskId, "userComment");
      });

    card.querySelector('[data-action="add-comment"]')
      .addEventListener("click", event => {
        card.querySelector(".review-comment-section").hidden = false;
        event.currentTarget.hidden = true;
        editReviewField(card, task.taskId, "userComment");
      });

    card.querySelector('[data-action="add"]')
      .addEventListener("click", () => {
        globalThis.T9Review.add(activeReview, actualIndex, {
          beforeSelection: activeReviewSelection
        });
        renderReview();
      });

    card.querySelector('[data-action="remove"]')
      .addEventListener("click", () => {
        deleteReviewTasks([task.taskId]);
      });

    card.querySelector('[data-action="toggle-layout"]')
      .addEventListener("click", () => {
        reviewLayoutState = globalThis.T9ReviewLayout.toggleTask(
          reviewLayoutState,
          task.taskId
        );
        globalThis.T9ReviewLayout.apply(
          list,
          $("compactReviewSteps"),
          reviewLayoutState
        );
      });

    list.appendChild(card);
  });
  globalThis.T9ReviewLayout.apply(
    list,
    $("compactReviewSteps"),
    reviewLayoutState
  );
  applyReviewSelection();
}

async function saveActiveReview(options = {}) {
  if (!activeReviewSession || !activeReview) return;
  const savedSession = activeReviewSession;
  const savedReview = activeReview;
  const savedUpdatedAt = activeReview.updatedAt;
  const savedSnapshot = JSON.parse(JSON.stringify(activeReview));
  const queued = await reviewSaveQueue.enqueue({
    sessionId: savedSession.id,
    review: savedSnapshot
  });
  const response = queued.value;

  if (!response.ok) {
    throw new Error(response.error || "Granskningen kunde inte sparas.");
  }

  const currentSession = activeReviewSession === savedSession;
  const unchanged = globalThis.T9ReviewEdit.isCurrentSave({
    latest: queued.latest,
    currentSession,
    currentReview: activeReview,
    savedReview,
    savedUpdatedAt
  });
  if (unchanged) {
    activeReview = response.review;
    annotationChangesPending = false;
  }
  if (options.announce !== false && currentSession) {
    show(`Granskningen för "${savedSession.name}" har sparats.`);
  }
  if (options.render !== false && unchanged) renderReview();
  else if (options.render === false && currentSession) {
    $("reviewFooterText").textContent = unchanged
      ? "Alla ändringar är sparade."
      : "Nyare ändringar väntar på att sparas.";
    if (annotationEditorState && unchanged) {
      $("annotationStatus").textContent = "Annoteringarna är sparade.";
    }
  }
}

async function flushReviewPersistence() {
  await reviewPersistence.flush();
}

async function openReview(session) {
  reviewReturnFocus = document.activeElement;
  show(`Förbereder granskning av "${session.name}"...`);

  activeReviewSession = session;
  annotationChangesPending = false;
  updateFilenamePreview();
  activeReviewModel = await prepareSessionModel(session);

  const existing = await send({
    type: "T9_GET_REVIEW",
    sessionId: session.id
  });

  activeReview = existing.review
    ? globalThis.T9Review.normalizeReview({
        ...existing.review,
        tasks: globalThis.T9Review.normalizeTasks(existing.review.tasks)
      })
    : globalThis.T9Review.createReview(
      session,
      activeReviewModel.businessTasks
    );
  activeReviewSelection = globalThis.T9ReviewSelection.create();
  activeReviewEdit = null;
  reviewLayoutState = globalThis.T9ReviewLayout.create(
    reviewLayoutState.allCompact
  );
  reviewAutoSave.cancel();

  $("reviewTitle").textContent = `Granska: ${session.name}`;
  $("reviewOverlay").classList.add("open");
  $("reviewOverlay").setAttribute("aria-hidden", "false");
  renderReview();
  $("closeReview").focus();
  updateFilenamePreview();
  show("");
}

async function closeReview() {
  releaseActiveAnnotationPointer();
  if (annotationEditorState) {
    annotationEditorState = globalThis.T9ReviewAnnotationEditor.cancel(
      annotationEditorState
    );
  }
  try {
    await flushReviewPersistence();
  } catch (error) {
    show(error.message, true);
    $("reviewFooterText").textContent =
      "Granskningen kunde inte stängas eftersom sparningen misslyckades.";
    return;
  }
  annotationEditorState = null;
  annotationEditorBaseline = null;
  annotationChangesPending = false;
  reviewAutoSave.cancel();
  $("annotationEditor").hidden = true;
  $("reviewList").hidden = false;
  $("reviewFooter").hidden = false;
  $("reviewDialog").classList.remove("annotation-mode");
  $("reviewOverlay").classList.remove("open");
  $("reviewOverlay").setAttribute("aria-hidden", "true");
  activeReviewSession = null;
  activeReview = null;
  activeReviewModel = null;
  activeReviewSelection = globalThis.T9ReviewSelection.create();
  activeReviewEdit = null;
  updateFilenamePreview();
  if (reviewReturnFocus?.isConnected) reviewReturnFocus.focus();
  reviewReturnFocus = null;
}

async function loadSessions() {
  const response = await send({ type: "T9_LIST_SESSIONS" });
  const sessions = Array.isArray(response?.sessions)
    ? response.sessions
    : [];
  const body = $("sessions");
  body.innerHTML = "";

  if (!sessions.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 5;
    cell.className = "muted";
    cell.textContent = "Inga sessioner har sparats ännu.";
    row.appendChild(cell);
    body.appendChild(row);
    return;
  }
  body.innerHTML = "";

  for (const session of sessions) {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${escapeHtml(session.name)}</td>
      <td>${new Date(session.startedAt).toLocaleString("sv-SE")}</td>
      <td>${session.eventCount || 0}</td>
      <td>${session.status === "recording" ? "Pågår" : "Avslutad"}</td>
      <td></td>`;

    const actions = row.lastElementChild;

    const reviewButton = document.createElement("button");
    reviewButton.textContent = "Granska";
    reviewButton.className = "primary";
    reviewButton.disabled = session.status === "recording";
    reviewButton.addEventListener("click", async () => {
      reviewButton.disabled = true;
      try {
        await openReview(session);
      } catch (error) {
        show(error.message, true);
      } finally {
        reviewButton.disabled = false;
      }
    });

    const exportButton = document.createElement("button");
    exportButton.textContent = "Exportera ZIP";
    exportButton.className = "secondary";
    exportButton.addEventListener("click", async () => {
      exportButton.disabled = true;

      try {
        await exportSession(session);
      } catch (error) {
        show(error.message, true);
      } finally {
        exportButton.disabled = false;
      }
    });

    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Ta bort";
    deleteButton.className = "danger";
    deleteButton.addEventListener("click", async () => {
      if (!confirm(`Ta bort sessionen "${session.name}"?`)) return;
      deleteButton.disabled = true;
      try {
        const response = await send({
          type: "T9_DELETE_SESSION",
          sessionId: session.id
        });
        if (!response?.ok) {
          throw new Error(response?.error || "Sessionen kunde inte tas bort.");
        }
        await loadSessions();
        show(`Sessionen "${session.name}" har tagits bort.`);
      } catch (error) {
        show(error.message, true);
        deleteButton.disabled = false;
      }
    });

    actions.append(reviewButton, exportButton, deleteButton);
    body.appendChild(row);
  }
}

$("documentationProfile").addEventListener("change", event => {
  applyProfile(event.target.value, true);
});

$("advancedToggle").addEventListener("click", () => {
  const panel = $("advancedPanel");
  panel.classList.toggle("open");
  $("advancedToggle").textContent = panel.classList.contains("open")
    ? "Dölj avancerade dataskyddsinställningar"
    : "Visa avancerade dataskyddsinställningar";
});

$("closeReview").addEventListener("click", closeReview);
$("closeAnnotationEditor").addEventListener("click", async () => {
  try {
    await closeAnnotationEditor();
  } catch (error) {
    $("annotationStatus").textContent =
      `Annoteringarna kunde inte sparas: ${error.message}`;
  }
});
$("cancelAnnotationEditor").addEventListener("click", async () => {
  try {
    await closeAnnotationEditor({ cancel: true });
  } catch (error) {
    $("annotationStatus").textContent =
      `Återställningen kunde inte sparas: ${error.message}`;
  }
});
$("rectangleAnnotationTool").addEventListener("click", () => {
  annotationEditorState = globalThis.T9ReviewAnnotationEditor.selectTool(
    annotationEditorState,
    "rectangle"
  );
  renderActiveAnnotation();
  $("annotationSurface").focus();
});
$("arrowAnnotationTool").addEventListener("click", () => {
  annotationEditorState = globalThis.T9ReviewAnnotationEditor.selectTool(
    annotationEditorState,
    "arrow"
  );
  renderActiveAnnotation();
  $("annotationSurface").focus();
});
$("deleteAnnotation").addEventListener("click", deleteSelectedAnnotation);
$("annotationList").addEventListener("click", event => {
  const button = event.target.closest?.("[data-annotation-id]");
  if (!button || !annotationEditorState) return;
  annotationEditorState = globalThis.T9ReviewAnnotationEditor.select(
    annotationEditorState,
    button.dataset.annotationId
  );
  renderActiveAnnotation();
  $("annotationSurface").focus();
});
$("annotationProperties").addEventListener("click", event => {
  if (!event.target.closest?.('[data-action="apply-annotation-geometry"]')) {
    return;
  }
  const selected = annotationById(annotationEditorState?.selectedId);
  if (!selected) return;
  const geometry = { ...selected.geometry };
  for (const input of $("annotationProperties").querySelectorAll(
    "[data-annotation-geometry]"
  )) {
    geometry[input.dataset.annotationGeometry] = Number(input.value) / 100;
  }
  updateAnnotation(
    selected.annotationId,
    geometry,
    "Markeringens geometri uppdaterades.",
    { type: selected.type === "arrow" ? "annotation-endpoints" : "annotation-resize" }
  );
});
$("annotationImage").addEventListener("load", () => {
  renderActiveAnnotation(false);
});
$("annotationSurface").addEventListener("pointerdown", event => {
  if (!annotationEditorState || event.button !== 0) return;
  const start = globalThis.T9ReviewAnnotationEditor.point(
    event.clientX,
    event.clientY,
    event.currentTarget.getBoundingClientRect()
  );
  const annotationId = event.target.dataset?.annotationId;
  const annotation = annotationById(annotationId);
  const nextState = annotation
    ? globalThis.T9ReviewAnnotationEditor.beginTranslation(
      annotationEditorState,
      annotation,
      start
    )
    : globalThis.T9ReviewAnnotationEditor.begin(annotationEditorState, start);
  annotationEditorState = { ...nextState, pointerId: event.pointerId };
  renderActiveAnnotation();
  event.currentTarget.setPointerCapture?.(event.pointerId);
  event.preventDefault();
});
$("annotationSurface").addEventListener("pointermove", event => {
  if ((!annotationEditorState?.draft && !annotationEditorState?.translation) ||
      annotationEditorState.pointerId !== event.pointerId) return;
  const end = globalThis.T9ReviewAnnotationEditor.point(
    event.clientX,
    event.clientY,
    event.currentTarget.getBoundingClientRect()
  );
  annotationEditorState = annotationEditorState.translation
    ? globalThis.T9ReviewAnnotationEditor.moveTranslation(
      annotationEditorState,
      end
    )
    : globalThis.T9ReviewAnnotationEditor.move(annotationEditorState, end);
  renderActiveAnnotation(false);
});
$("annotationSurface").addEventListener("pointerup", event => {
  if ((!annotationEditorState?.draft && !annotationEditorState?.translation) ||
      annotationEditorState.pointerId !== event.pointerId) return;
  try {
    const end = globalThis.T9ReviewAnnotationEditor.point(
      event.clientX,
      event.clientY,
      event.currentTarget.getBoundingClientRect()
    );
    if (annotationEditorState.translation) {
      const movedState = globalThis.T9ReviewAnnotationEditor.moveTranslation(
        annotationEditorState,
        end
      );
      const result = globalThis.T9ReviewAnnotationEditor.finishTranslation(
        movedState
      );
      annotationEditorState = result.state;
      updateAnnotation(
        result.change.annotationId,
        result.change.geometry,
        "Markeringen flyttades.",
        { type: "annotation-move" }
      );
    } else {
      const movedState = globalThis.T9ReviewAnnotationEditor.move(
        annotationEditorState,
        end
      );
      const type = movedState.draft.type;
      const result = globalThis.T9ReviewAnnotationEditor.finish(movedState);
      annotationEditorState = result.state;
      addAnnotation(type, result.geometry);
    }
  } finally {
    releaseActiveAnnotationPointer();
  }
});
$("annotationSurface").addEventListener("pointercancel", event => {
  if (!annotationEditorState?.draft && !annotationEditorState?.translation) return;
  try {
    annotationEditorState = globalThis.T9ReviewAnnotationEditor.cancel(
      annotationEditorState
    );
    renderActiveAnnotation();
  } finally {
    releaseActiveAnnotationPointer();
  }
});
$("annotationSurface").addEventListener("keydown", event => {
  if (!annotationEditorState) return;
  if (event.key === "Enter") {
    event.preventDefault();
    const type = annotationEditorState.tool;
    addAnnotation(
      type,
      type === "arrow"
        ? globalThis.T9ReviewAnnotationEditor.centeredArrow()
        : globalThis.T9ReviewAnnotationEditor.centeredRectangle()
    );
  } else if (event.key === "Delete") {
    event.preventDefault();
    deleteSelectedAnnotation();
  } else if (event.key.startsWith("Arrow") &&
      annotationEditorState.selectedId) {
    event.preventDefault();
    const annotation = annotationById(annotationEditorState.selectedId);
    const image = $("annotationImage");
    const multiplier = event.shiftKey ? 10 : 1;
    const horizontal = multiplier / image.naturalWidth;
    const vertical = multiplier / image.naturalHeight;
    const deltaX = event.key === "ArrowLeft"
      ? -horizontal
      : event.key === "ArrowRight" ? horizontal : 0;
    const deltaY = event.key === "ArrowUp"
      ? -vertical
      : event.key === "ArrowDown" ? vertical : 0;
    updateAnnotation(
      annotation.annotationId,
      globalThis.T9ReviewAnnotationEditor.translatedGeometry(
        annotation.type,
        annotation.geometry,
        deltaX,
        deltaY
      ),
      "Markeringen flyttades.",
      {
        type: "annotation-move",
        groupKey: `annotation-nudge:${annotationEditorState.screenshotRef}:${annotation.annotationId}`
      }
    );
  } else if (event.key === "Escape" &&
      (annotationEditorState.draft || annotationEditorState.translation)) {
    event.preventDefault();
    annotationEditorState = globalThis.T9ReviewAnnotationEditor.cancel(
      annotationEditorState
    );
    releaseActiveAnnotationPointer();
    renderActiveAnnotation();
    $("annotationStatus").textContent = "Pågående rektangel avbröts.";
  }
});
async function exportReviewFromToolbar(button) {
  button.disabled = true;
  button.textContent = "Skapar Word...";
  try {
    await reviewPersistence.saveExplicitly({ render: false });
  } catch {
    // Export may continue with the active in-memory review.
  }
  try {
    await exportActiveReviewToWord();
  } catch (error) {
    show(error.message, true);
  } finally {
    button.textContent = "Exportera Word";
    applyReviewToolbarState();
  }
}

globalThis.T9ReviewToolbar.bind($("reviewToolbar"), (command, button) => {
  if (command === "undo") restoreReviewHistory("undo");
  else if (command === "redo") restoreReviewHistory("redo");
  else if (command === "merge") mergeSelectedReviewTasks();
  else if (command === "split") splitSelectedReviewTask();
  else if (command === "move-up") {
    moveReviewTasksByOffset(
      -1,
      activeReviewSelection.activeId || activeReviewSelection.selectedIds[0]
    );
  } else if (command === "move-down") {
    moveReviewTasksByOffset(
      1,
      activeReviewSelection.activeId || activeReviewSelection.selectedIds[0]
    );
  } else if (command === "export") {
    exportReviewFromToolbar(button);
  }
});

$("saveReview").addEventListener("click", async () => {
  try {
    await reviewPersistence.saveExplicitly();
  } catch (error) {
    show(error.message, true);
  }
});
$("saveReviewBottom").addEventListener("click", async () => {
  try {
    await reviewPersistence.saveExplicitly();
  } catch (error) {
    show(error.message, true);
  }
});
$("compactReviewSteps").addEventListener("click", () => {
  reviewLayoutState = globalThis.T9ReviewLayout.toggleAll(
    reviewLayoutState,
    reviewTaskIds()
  );
  globalThis.T9ReviewLayout.apply(
    $("reviewList"),
    $("compactReviewSteps"),
    reviewLayoutState
  );
});
$("addReviewStep").addEventListener("click", () => {
  globalThis.T9Review.add(activeReview, undefined, {
    beforeSelection: activeReviewSelection
  });
  renderReview();
});
$("completeReview").addEventListener("click", async () => {
  globalThis.T9Review.complete(activeReview, {
    beforeSelection: activeReviewSelection,
    afterSelection: activeReviewSelection
  });
  try {
    await saveActiveReview();
  } catch (error) {
    show(error.message, true);
  }
});
globalThis.T9ReviewAccessibility.bindDialog($("reviewDialog"), closeReview);
$("reviewOverlay").addEventListener("click", event => {
  if (event.target === $("reviewOverlay")) closeReview();
});
$("reviewOverlay").addEventListener("keydown", event => {
  if (event.target.closest?.('[data-editing="true"]')) return;
  const direction = globalThis.T9Review.historyDirectionFromKey(event);
  if (!direction) return;
  event.preventDefault();
  restoreReviewHistory(direction);
});
globalThis.T9ReviewSelection.bind($("reviewList"), {
  dispatch: dispatchReviewSelection,
  move: moveReviewTasksByOffset
});
globalThis.T9ReviewMove.bind($("reviewList"), {
  move: moveReviewTasksTo
});

$("save").addEventListener("click", saveSettings);
$("refresh").addEventListener("click", loadSessions);
$("exportFileNamePattern").addEventListener("input", updateFilenamePreview);
$("environmentName").addEventListener("input", updateFilenamePreview);
$("debug").addEventListener("click", () => {
  chrome.tabs.create({
    url: chrome.runtime.getURL("debug.html")
  });
});


async function initializeDashboard() {
  initializeFilenameVariables();
  try {
    await loadSettings();
  } catch (error) {
    console.error("T9 loadSettings failed", error);

    // Keep the UI usable even if stored settings cannot be read.
    for (const [key, value] of Object.entries(DEFAULTS)) {
      const element = $(key);
      if (!element) continue;

      if (typeof value === "boolean") {
        element.checked = value;
      } else {
        element.value = value;
      }
    }

    $("documentationProfile").value =
      DEFAULTS.documentationProfile || "generic";
    applyProfile($("documentationProfile").value, false);
    updateFilenamePreview();
    show(
      "Inställningarna kunde inte läsas. Standardvärden visas.",
      true
    );
  }

  try {
    await loadSessions();
  } catch (error) {
    console.error("T9 loadSessions failed", error);
    show(
      "Sessionerna kunde inte läsas. Öppna debugpanelen för mer information.",
      true
    );
  }
}

initializeDashboard();
