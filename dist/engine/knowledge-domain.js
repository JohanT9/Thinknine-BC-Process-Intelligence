(function (root, factory) {
  const consolidation = typeof module === "object" && module.exports
    ? require("./task-consolidation") : root.T9TaskConsolidation;
  const explanationCatalog = typeof module === "object" && module.exports
    ? require("./knowledge-explanation-catalog") : root.T9KnowledgeExplanationCatalog;
  const pageIdentification = typeof module === "object" && module.exports
    ? require("./page-identification-engine") : root.T9PageIdentificationEngine;
  const api = factory(consolidation, explanationCatalog, pageIdentification);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9KnowledgeDomain = api;
})(typeof globalThis !== "undefined" ? globalThis : this,
function (consolidation, explanationCatalog, pageIdentification) {
  "use strict";
  const VERSION = "2.3.0";
  const text = value => String(value || "");
  const patternCache = new Map();
  const confidenceValue = (value, fallback) => Number.isFinite(value)
    ? Math.max(0, Math.min(1, value)) : fallback;

  function patternRegex(pattern) {
    const key = String(pattern);
    if (patternCache.has(key)) return patternCache.get(key);
    let regex = null;
    try { regex = new RegExp(key, "i"); } catch { /* invalid packs are non-matching */ }
    if (patternCache.size >= 4096) patternCache.clear();
    patternCache.set(key, regex);
    return regex;
  }

  function rules(packs = []) {
    return packs.flatMap(pack => (pack.rules || []).map(rule => ({
      ...rule, packId: pack.packId, packName: pack.name,
      packVersion: pack.version, packPriority: pack.priority || 0,
      sourceRefs: (rule.sourceIds || []).map(sourceId =>
        (pack.sources || []).find(source => source.sourceId === sourceId))
        .filter(Boolean)
    }))).sort((a, b) =>
      (b.priority + b.packPriority) - (a.priority + a.packPriority));
  }

  function patternsMatch(patterns, value) {
    if (!patterns?.length) return true;
    const candidate = text(value);
    return patterns.some(pattern => patternRegex(pattern)?.test(candidate) || false);
  }

  function pageEvidence(task, packs) {
    const pageObjectId = task.pageObjectId || task.pageId ||
      task.pageIdentification?.pageObjectId ||
      task.pageContext?.pageObjectId || task.context?.currentPageObjectId;
    const definition = pageObjectId && pageIdentification?.getPageDefinition(
      pageObjectId, packs);
    if (!definition) return task;
    const language = text(task.language || task.locale || task.context?.language ||
      task.context?.locale || "en-US");
    const definitions = packs.flatMap(pack => pack.pageDefinitions || [])
      .filter(item => String(item.pageObjectId || "") === String(pageObjectId) &&
        (!definition.entity || item.entity === definition.entity));
    const preferred = definitions.find(item => item.ruleId === definition.ruleId);
    const localized = definitions.map(item => item.localizedCaptions || {});
    const captions = localized.find(item => item[language]?.length ||
      item[language.split("-")[0]]?.length) || preferred?.localizedCaptions ||
      localized[0] || {};
    const entityCaption = createdEntityNames[definition.entity]?.[language] ||
      createdEntityNames[definition.entity]?.[language.split("-")[0]] || "";
    const localizedEntityCaption = entityCaption
      ? `${entityCaption.slice(0, 1).toLocaleUpperCase(language)}${entityCaption.slice(1)}` : "";
    const caption = captions[language]?.[0] ||
      captions[language.split("-")[0]]?.[0] ||
      localizedEntityCaption || Object.values(captions).flat()[0] || task.pageCaption || "";
    // The object ID is stronger evidence than the document title/company name,
    // which is commonly all that the browser-level capture has for BC pages.
    return { ...task, pageCaption: caption, knowledgePageCaption: caption,
      entity: task.entity || definition.entity || "",
      pageObjectId: String(pageObjectId),
      context: { ...(task.context || {}),
        currentEntity: task.context?.currentEntity || definition.entity || "",
        currentPageCaption: caption,
        currentPageObjectId: String(pageObjectId) } };
  }

  const captionEntityCaches = new WeakMap();
  function captionEntity(caption, language, packs) {
    const cacheOwner = Array.isArray(packs) ? packs : captionEntity;
    if (!captionEntityCaches.has(cacheOwner)) captionEntityCaches.set(cacheOwner, new Map());
    const captionEntityCache = captionEntityCaches.get(cacheOwner);
    const key = `${text(language)}\u001f${text(caption)}`;
    if (captionEntityCache.has(key)) return captionEntityCache.get(key);
    let entity = "";
    try {
      entity = text(pageIdentification?.resolvePageIdentity?.({ pageCaption: caption,
        language }, packs)?.entity).trim().toLowerCase();
    } catch { /* page identification is optional evidence */ }
    if (captionEntityCache.size >= 2048) captionEntityCache.clear();
    captionEntityCache.set(key, entity);
    return entity;
  }

  function score(rule, task, packs = []) {
    const match = rule.match || {};
    const context = task.context || {};
    const pageObjectIds = match.pageObjectIds || [];
    const observedPageObjectId = text(task.pageObjectId || task.pageId ||
      task.pageIdentification?.pageObjectId || task.pageContext?.pageObjectId ||
      context.currentPageObjectId);
    if (pageObjectIds.length && observedPageObjectId &&
        !pageObjectIds.map(String).includes(observedPageObjectId)) return 0;
    const pageResolvedByObjectId = pageObjectIds.length > 0 &&
      pageObjectIds.map(String).includes(observedPageObjectId);
    const ruleEntity = text(rule.entity).trim().toLowerCase();
    const observedEntity = text(task.entity || context.currentEntity)
      .trim().toLowerCase();
    const pageCaption = task.knowledgePageCaption || task.pageCaption || context.currentPageCaption ||
      context.previousPageCaption;
    const pageMatches = (match.pagePatterns || []).length > 0 &&
      (patternsMatch(match.pagePatterns, pageCaption) || pageResolvedByObjectId);
    if (ruleEntity && observedEntity && ruleEntity !== observedEntity && !pageMatches) return 0;
    const checks = [["pagePatterns", pageCaption],
      ["actionPatterns", task.actionCaption], ["fieldPatterns", task.fieldCaption],
      ["automationIdPatterns", task.automationId]];
    // An identified entity may stand in for the page unless the caption is a
    // reliably identified page of a different entity. Missing, low-confidence or
    // unidentifiable captions (for example a company name used as page title) and
    // other pages of the same entity (card versus list) do not contradict it.
    const pageConfidence = Number(task.pageIdentificationConfidence ??
      context.pageIdentificationConfidence ?? NaN);
    const entityStandsInForPage = () => {
      if (!pageCaption || (Number.isFinite(pageConfidence) && pageConfidence < 0.6)) return true;
      const identified = captionEntity(pageCaption, task.language || context.language, packs);
      if (identified) return identified === ruleEntity;
      // An unmapped caption only yields to the entity when nobody vouched for it.
      return !Number.isFinite(pageConfidence);
    };
    let value = 0; let matched = 0; let required = 0;
    for (const [key, candidate] of checks) {
      const declared = match[key] || [];
      if (!declared.length) continue;
      required += 1;
      const pageResolvedByEntity = key === "pagePatterns" && ruleEntity &&
        observedEntity === ruleEntity;
      if (patternsMatch(declared, key === "pagePatterns" ? pageCaption : candidate) ||
          (key === "pagePatterns" && pageResolvedByObjectId) ||
          (pageResolvedByEntity && entityStandsInForPage())) {
        matched += 1; value += 25;
      }
    }
    if (!required || matched < required) return 0;
    value += Math.round(confidenceValue(rule.confidence, 0.5) * 50);
    value += Math.min(25, Math.round((rule.priority || 0) / 50));
    if (context.currentEntity && rule.entity === context.currentEntity) value += 20;
    if (context.followingEntity && rule.entity === context.followingEntity) value += 20;
    if (context.pendingSemanticHint &&
        rule.semanticAction === context.pendingSemanticHint) value += 25;
    return value;
  }

  function match(task, availableRules, packs) {
    const [winner, runnerUp] = topMatches(task, availableRules, 2, packs);
    if (!winner) return null;
    if (runnerUp && winner.score - runnerUp.score < 5) return null;
    return winner;
  }

  function ruleIdentity(rule) {
    return [rule.taskType || "", rule.semanticAction || "",
      text(rule.entity).trim().toLowerCase()].join("\u001f");
  }

  function topMatches(task, availableRules, limit, packs) {
    const ranked = [];
    for (const rule of availableRules) {
      const value = score(rule, task, packs);
      if (value <= 0) continue;
      const item = { rule, score: value };
      const duplicate = ranked.findIndex(candidate =>
        ruleIdentity(candidate.rule) === ruleIdentity(rule));
      if (duplicate >= 0) {
        if (value <= ranked[duplicate].score) continue;
        ranked.splice(duplicate, 1);
      }
      const position = ranked.findIndex(candidate => value > candidate.score);
      if (position < 0) {
        if (ranked.length < limit) ranked.push(item);
      } else {
        ranked.splice(position, 0, item);
        if (ranked.length > limit) ranked.pop();
      }
    }
    return ranked;
  }

  function ambiguousCandidates(task, availableRules, packs) {
    const ranked = topMatches(task, availableRules, 4, packs);
    const [winner, runnerUp] = ranked;
    if (!winner || !runnerUp || winner.score - runnerUp.score >= 5) return [];
    return ranked.slice(0, 4).map(item => ({ ruleId: item.rule.ruleId,
      taskType: item.rule.taskType || "", semanticAction: item.rule.semanticAction || "",
      entity: item.rule.entity || "", score: item.score }));
  }

  function suggestedRule(task) {
    const context = task.context || {};
    const exact = value => value ? [`^${value}$`] : [];
    return { ruleId: `Custom.${context.currentEntity || task.taskType || "Task"}`,
      taskType: task.taskType || "RunAction", semanticAction: task.semanticAction || "",
      entity: task.entity || "", priority: 500, confidence: 0.75,
      match: { pagePatterns: exact(context.currentPageCaption || task.pageCaption),
        actionPatterns: exact(task.actionCaption), fieldPatterns: exact(task.fieldCaption),
        automationIdPatterns: exact(task.automationId) } };
  }

  function localizedInstruction(rule, language) {
    const localized = rule?.localizedInstructions || {};
    const tag = text(language).trim();
    const base = tag.split("-")[0];
    return localized[tag] || localized[base] || rule?.instructionTemplate || "";
  }

  const createdEntityNames = {
    PurchaseOrder: { "sv-SE": "inköpsorder", "en-US": "purchase order", "fr-FR": "commande achat", "de-DE": "Einkaufsbestellung", "es-ES": "pedido de compra", "da-DK": "købsordre", "fi-FI": "ostotilaus", "nb-NO": "innkjøpsordre" },
    SalesOrder: { "sv-SE": "försäljningsorder", "en-US": "sales order", "fr-FR": "commande vente", "de-DE": "Verkaufsauftrag", "es-ES": "pedido de venta", "da-DK": "salgsordre", "fi-FI": "myyntitilaus", "nb-NO": "salgsordre" },
    PurchaseInvoice: { "sv-SE": "inköpsfaktura", "en-US": "purchase invoice", "fr-FR": "facture achat", "de-DE": "Einkaufsrechnung", "es-ES": "factura de compra", "da-DK": "købsfaktura", "fi-FI": "ostolasku", "nb-NO": "kjøpsfaktura" },
    SalesInvoice: { "sv-SE": "försäljningsfaktura", "en-US": "sales invoice", "fr-FR": "facture vente", "de-DE": "Verkaufsrechnung", "es-ES": "factura de venta", "da-DK": "salgsfaktura", "fi-FI": "myyntilasku", "nb-NO": "salgsfaktura" },
    ProductionOrder: { "sv-SE": "produktionsorder", "en-US": "production order", "fr-FR": "ordre de fabrication", "de-DE": "Fertigungsauftrag", "es-ES": "orden de producción", "da-DK": "produktionsordre", "fi-FI": "tuotantotilaus", "nb-NO": "produksjonsordre" },
    WarehouseReceipt: { "sv-SE": "lagerinleverans", "en-US": "warehouse receipt", "fr-FR": "réception entrepôt", "de-DE": "Lagerwareneingang", "es-ES": "recepción de almacén", "da-DK": "lagerindlevering", "fi-FI": "varastovastaanotto", "nb-NO": "lagerinngående levering" },
    QualityCheck: { "sv-SE": "kvalitetskontroll", "en-US": "quality check", "fr-FR": "contrôle qualité", "de-DE": "Qualitätsprüfung", "es-ES": "control de calidad", "da-DK": "kvalitetskontrol", "fi-FI": "laaduntarkastus", "nb-NO": "kvalitetskontroll" },
    Customer: { "sv-SE": "kund", "en-US": "customer", "fr-FR": "client", "de-DE": "Kunde", "es-ES": "cliente", "da-DK": "kunde", "fi-FI": "asiakas", "nb-NO": "kunde" },
    Vendor: { "sv-SE": "leverantör", "en-US": "vendor", "fr-FR": "fournisseur", "de-DE": "Lieferant", "es-ES": "proveedor", "da-DK": "leverandør", "fi-FI": "toimittaja", "nb-NO": "leverandør" },
    Item: { "sv-SE": "artikel", "en-US": "item", "fr-FR": "article", "de-DE": "Artikel", "es-ES": "artículo", "da-DK": "vare", "fi-FI": "nimike", "nb-NO": "vare" },
    SalesQuote: { "sv-SE": "försäljningsoffert", "en-US": "sales quote", "fr-FR": "devis de vente", "de-DE": "Verkaufsangebot", "es-ES": "oferta de venta", "da-DK": "salgstilbud", "fi-FI": "myyntitarjous", "nb-NO": "salgstilbud" },
    PurchaseCreditMemo: { "sv-SE": "inköpskreditnota", "en-US": "purchase credit memo", "fr-FR": "avoir achat", "de-DE": "Einkaufsgutschrift", "es-ES": "abono de compra", "da-DK": "købskreditnota", "fi-FI": "ostohyvityslasku", "nb-NO": "kjøpskreditnota" },
    TransferOrder: { "sv-SE": "överföringsorder", "en-US": "transfer order", "fr-FR": "ordre de transfert", "de-DE": "Umlagerungsauftrag", "es-ES": "orden de transferencia", "da-DK": "overførselsordre", "fi-FI": "siirtotilaus", "nb-NO": "overføringsordre" },
    AssemblyOrder: { "sv-SE": "monteringsorder", "en-US": "assembly order", "fr-FR": "ordre d’assemblage", "de-DE": "Montageauftrag", "es-ES": "orden de ensamblado", "da-DK": "samleordre", "fi-FI": "kokoonpanotilaus", "nb-NO": "monteringsordre" },
    ServiceOrder: { "sv-SE": "serviceorder", "en-US": "service order", "fr-FR": "ordre de service", "de-DE": "Serviceauftrag", "es-ES": "orden de servicio", "da-DK": "serviceordre", "fi-FI": "huoltotilaus", "nb-NO": "serviceordre" },
    SalesCreditMemo: { "sv-SE": "försäljningskreditnota", "en-US": "sales credit memo", "fr-FR": "avoir vente", "de-DE": "Verkaufsgutschrift", "es-ES": "abono de venta", "da-DK": "salgskreditnota", "fi-FI": "myyntihyvityslasku", "nb-NO": "salgskreditnota" },
    SalesReturnOrder: { "sv-SE": "försäljningsreturorder", "en-US": "sales return order", "fr-FR": "commande retour vente", "de-DE": "Verkaufsrücksendung", "es-ES": "devolución de venta", "da-DK": "salgsreturordre", "fi-FI": "myyntipalautustilaus", "nb-NO": "salgsreturordre" },
    PurchaseReturnOrder: { "sv-SE": "inköpsreturorder", "en-US": "purchase return order", "fr-FR": "commande retour achat", "de-DE": "Einkaufsrücksendung", "es-ES": "devolución de compra", "da-DK": "købsreturordre", "fi-FI": "ostopalautustilaus", "nb-NO": "kjøpsreturordre" },
    PurchaseQuote: { "sv-SE": "inköpsoffert", "en-US": "purchase quote", "fr-FR": "devis d’achat", "de-DE": "Einkaufsanfrage", "es-ES": "oferta de compra", "da-DK": "købstilbud", "fi-FI": "ostotarjous", "nb-NO": "kjøpstilbud" },
    BankAccount: { "sv-SE": "bankkonto", "en-US": "bank account", "fr-FR": "compte bancaire", "de-DE": "Bankkonto", "es-ES": "cuenta bancaria", "da-DK": "bankkonto", "fi-FI": "pankkitili", "nb-NO": "bankkonto" },
    GLAccount: { "sv-SE": "huvudbokskonto", "en-US": "G/L account", "fr-FR": "compte général", "de-DE": "Sachkonto", "es-ES": "cuenta contable", "da-DK": "finanskonto", "fi-FI": "pääkirjatili", "nb-NO": "hovedbokskonto" },
    GeneralJournal: { "sv-SE": "redovisningsjournal", "en-US": "general journal", "fr-FR": "journal général", "de-DE": "Fibu Buch.-Blatt", "es-ES": "diario general", "da-DK": "finanskladde", "fi-FI": "yleinen päiväkirja", "nb-NO": "generell journal" },
    PaymentJournal: { "sv-SE": "betalningsjournal", "en-US": "payment journal", "fr-FR": "journal de paiement", "de-DE": "Zahlungs Buch.-Blatt", "es-ES": "diario de pagos", "da-DK": "betalingskladde", "fi-FI": "maksupäiväkirja", "nb-NO": "betalingsjournal" },
    CashReceiptJournal: { "sv-SE": "inbetalningsjournal", "en-US": "cash receipt journal", "fr-FR": "journal des encaissements", "de-DE": "Zahlungseingang Buch.-Blatt", "es-ES": "diario de cobros", "da-DK": "indbetalingskladde", "fi-FI": "kassakuittipäiväkirja", "nb-NO": "innbetalingsjournal" },
    BankAccountReconciliation: { "sv-SE": "bankavstämning", "en-US": "bank account reconciliation", "fr-FR": "rapprochement bancaire", "de-DE": "Bankkontoabstimmung", "es-ES": "conciliación bancaria", "da-DK": "bankafstemning", "fi-FI": "pankkitilin täsmäytys", "nb-NO": "bankavstemming" },
    PaymentReconciliationJournal: { "sv-SE": "betalningsavstämningsjournal", "en-US": "payment reconciliation journal", "fr-FR": "journal de rapprochement des paiements", "de-DE": "Zahlungsabstimmungs-Buch.-Blatt", "es-ES": "diario de conciliación de pagos", "da-DK": "betalingsafstemningskladde", "fi-FI": "maksujen täsmäytyspäiväkirja", "nb-NO": "betalingsavstemmingsjournal" },
    WarehouseShipment: { "sv-SE": "lagerutleverans", "en-US": "warehouse shipment", "fr-FR": "expédition entrepôt", "de-DE": "Lagerlieferung", "es-ES": "envío de almacén", "da-DK": "lagerleverance", "fi-FI": "varastotoimitus", "nb-NO": "lagerutlevering" },
    WarehousePick: { "sv-SE": "lagerplockning", "en-US": "warehouse pick", "fr-FR": "prélèvement entrepôt", "de-DE": "Lagerkommissionierung", "es-ES": "picking de almacén", "da-DK": "lagerpluk", "fi-FI": "varastokeräily", "nb-NO": "lagerplukk" },
    WarehousePutAway: { "sv-SE": "lagerinlagring", "en-US": "warehouse put-away", "fr-FR": "rangement entrepôt", "de-DE": "Lager Einlagerung", "es-ES": "ubicación en almacén", "da-DK": "lagerindlagring", "fi-FI": "varastopaikoitus", "nb-NO": "lagerinnlagring" },
    InventoryPick: { "sv-SE": "lagerplockning", "en-US": "inventory pick", "fr-FR": "prélèvement stock", "de-DE": "Lagerkommissionierung", "es-ES": "picking de inventario", "da-DK": "lagerpluk", "fi-FI": "varastokeräily", "nb-NO": "lagerplukk" },
    WarehouseActivity: { "sv-SE": "lageraktivitet", "en-US": "warehouse activity", "fr-FR": "activité entrepôt", "de-DE": "Lageraktivität", "es-ES": "actividad de almacén", "da-DK": "lageraktivitet", "fi-FI": "varastotoiminto", "nb-NO": "lageraktivitet" },
    ItemVariant: { "sv-SE": "artikelvariant", "en-US": "item variant", "fr-FR": "variante article", "de-DE": "Artikelvariante", "es-ES": "variante de artículo", "da-DK": "varevariant", "fi-FI": "nimikevariantti", "nb-NO": "varevariant" },
    ItemCategory: { "sv-SE": "artikelkategori", "en-US": "item category", "fr-FR": "catégorie article", "de-DE": "Artikelkategorie", "es-ES": "categoría de producto", "da-DK": "varekategori", "fi-FI": "nimikekategoria", "nb-NO": "varekategori" }
  };
  const createInstructionTemplates = {
    "sv-SE": (entity, action, page) => `Börja skapa en ny **${entity}** genom att välja **${action}** på sidan **${page}**.`,
    "en-US": (entity, action, page) => `Start creating a new **${entity}** by selecting **${action}** on the **${page}** page.`,
    "fr-FR": (entity, action, page) => `Commencez à créer **${entity}** en sélectionnant **${action}** sur la page **${page}**.`,
    "de-DE": (entity, action, page) => `Beginnen Sie mit der Erstellung von **${entity}**, indem Sie auf der Seite **${page}** **${action}** wählen.`,
    "es-ES": (entity, action, page) => `Empieza a crear **${entity}** seleccionando **${action}** en la página **${page}**.`,
    "da-DK": (entity, action, page) => `Begynd at oprette en ny **${entity}** ved at vælge **${action}** på siden **${page}**.`,
    "fi-FI": (entity, action, page) => `Aloita uuden **${entity}** luominen valitsemalla **${action}** sivulla **${page}**.`,
    "nb-NO": (entity, action, page) => `Begynn å opprette en ny **${entity}** ved å velge **${action}** på siden **${page}**.`
  };
  const genericCreateInstructionTemplates = {
    "sv-SE": (action, page) => `Börja skapa en ny post genom att välja **${action}** på sidan **${page}**.`,
    "en-US": (action, page) => `Start creating a new record by selecting **${action}** on the **${page}** page.`,
    "fr-FR": (action, page) => `Commencez à créer un enregistrement en sélectionnant **${action}** sur la page **${page}**.`,
    "de-DE": (action, page) => `Beginnen Sie mit der Erstellung eines neuen Datensatzes, indem Sie auf der Seite **${page}** **${action}** wählen.`,
    "es-ES": (action, page) => `Empieza a crear un registro seleccionando **${action}** en la página **${page}**.`,
    "da-DK": (action, page) => `Begynd at oprette en ny post ved at vælge **${action}** på siden **${page}**.`,
    "fi-FI": (action, page) => `Aloita tietueen luominen valitsemalla **${action}** sivulla **${page}**.`,
    "nb-NO": (action, page) => `Begynn å opprette en ny post ved å velge **${action}** på siden **${page}**.`
  };
  function isNewActionCaption(value) {
    // Only enrich the literal New action. Other actions whose semantic type
    // starts with Create (for example creating a warehouse receipt from a
    // purchase order) are different business operations and must retain their
    // own instruction instead of being rewritten as a new record.
    return /^(?:(?:ny(?:tt)?(?:\s+(?:post|order|faktura|kreditnota))?)|(?:new(?:\s+(?:record|order|invoice|credit memo))?)|(?:skapa ny|create new|nouveau|nouvelle|neu(?:e|er|es)?|nuevo|nueva|uusi|opret|opprett(?:e)?))$/iu
      .test(text(value).trim().replace(/\.$/u, ""));
  }
  function contextualCreateInstruction(rule, task) {
    if (!/^Create/u.test(String(rule?.taskType || rule?.semanticAction || ""))) return "";
    const names = createdEntityNames[rule.entity || task.entity];
    const language = text(task.language || task.locale || task.context?.language || "sv-SE");
    const locale = genericCreateInstructionTemplates[language] ? language :
      genericCreateInstructionTemplates[language.split("-")[0]] ? language.split("-")[0] : "sv-SE";
    const page = text(task.knowledgePageCaption || task.pageCaption ||
      task.context?.currentPageCaption || task.context?.previousPageCaption);
    const action = text(task.actionCaption);
    if (!page || !isNewActionCaption(action)) return "";
    if (!names) return genericCreateInstructionTemplates[locale](action, page);
    const entity = names[locale] || names["en-US"];
    return createInstructionTemplates[locale](entity, action, page);
  }

  function explanationEligible(rule, task, availableRules = [], packs = []) {
    if (!localizedExplanations(rule, task)) return false;
    const matchSpec = rule.match || {};
    const explicitSignal = [
      [matchSpec.actionPatterns, task.actionCaption],
      [matchSpec.fieldPatterns, task.fieldCaption],
      [matchSpec.automationIdPatterns, task.automationId]
    ].some(([patterns, value]) => patterns?.length && patternsMatch(patterns, value));
    if (!explicitSignal) return false;
    const observedEntity = text(task.entity || task.context?.currentEntity)
      .trim().toLowerCase();
    const ruleEntity = text(rule.entity).trim().toLowerCase();
    const genericCore = ["Core.SearchAndOpenPage", "Core.CreateNew", "Core.EditRecord",
      "Core.DeleteRecord", "Core.NavigateBack", "Core.Lookup", "Core.ChangeDate",
      "Core.ConfirmYes", "Core.ConfirmNo"]
      .includes(rule.ruleId);
    // A bare Yes/No says nothing about what was confirmed; only explain it when
    // the page or entity gives the decision context.
    if (["Core.ConfirmYes", "Core.ConfirmNo"].includes(rule.ruleId) && !observedEntity &&
        !(task.knowledgePageCaption || task.pageCaption || task.context?.currentPageCaption ||
          task.context?.previousPageCaption)) return false;
    if (rule.ruleId === "Core.CreateNew" && !observedEntity &&
        !(task.knowledgePageCaption || task.pageCaption || task.context?.currentPageCaption || task.context?.previousPageCaption)) return false;
    const entitylessCore = genericCore && !observedEntity;
    if (!ruleEntity && !genericCore) return false;
    const pageCaption = task.knowledgePageCaption || task.pageCaption || task.context?.currentPageCaption ||
      task.context?.previousPageCaption || "";
    const pageObjectId = text(task.pageObjectId || task.pageId ||
      task.pageIdentification?.pageObjectId || task.pageContext?.pageObjectId ||
      task.context?.currentPageObjectId);
    const pageMatches = Boolean(matchSpec.pagePatterns?.length &&
      (patternsMatch(matchSpec.pagePatterns, pageCaption) ||
        (matchSpec.pageObjectIds || []).map(String).includes(pageObjectId)));
    if (ruleEntity && observedEntity && observedEntity !== ruleEntity && !pageMatches) return false;
    const entityBackedPage = observedEntity === ruleEntity;
    if (!pageMatches && !entityBackedPage && !entitylessCore &&
        !(genericCore && pageCaption)) return false;
    const sources = rule.sourceRefs || [];
    const officialSource = sources.some(source => { const uri = String(source?.sourceUri || ""); return uri.startsWith("https://learn.microsoft.com/") || uri.startsWith("https://erpdocs.apteancloud.com/"); });
    const authoredWorkflow = explanationCatalog?.isAuthored?.(rule) === true;
    const pageContextAction = rule.ruleId?.startsWith("Core.") && Boolean(pageCaption || observedEntity);
    if (!officialSource && !authoredWorkflow && !pageContextAction) return false;
    const candidates = availableRules.length ? availableRules : [rule];
    const scored = candidates.map(candidate => ({ candidate,
      score: score(candidate, task, packs) })).filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score);
    const winner = scored[0];
    return winner?.candidate.ruleId === rule.ruleId &&
      (!scored[1] || winner.score - scored[1].score >= 5);
  }

  function localizedExplanation(rule, language) {
    const localized = localizedExplanations(rule) || {};
    const tag = text(language).trim();
    const base = tag.split("-")[0];
    return localized[tag] || localized[base] || "";
  }

  function localizedExplanations(rule, context) {
    const localized = rule?.localizedExplanations || explanationCatalog?.localized(rule, context) || null;
    if (!localized) return null;
    const action = text(context?.actionCaption || context?.context?.actionCaption).trim();
    const createAction = rule?.ruleId === "Core.CreateNew" ||
      rule?.taskType === "CreateNew" || rule?.semanticAction === "CreateNew" ||
      isNewActionCaption(action);
    const page = text(context?.knowledgePageCaption || context?.pageCaption ||
      context?.context?.currentPageCaption || context?.context?.previousPageCaption).trim();
    if (!createAction || !page) return localized;
    return Object.fromEntries(Object.entries(localized).map(([locale, explanation]) => {
      const current = text(explanation);
      const escapedPage = page.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const pageReference = new RegExp(`(?:page\\s+${escapedPage}|(?:the\\s+)?${escapedPage}\\s+page|sidan\\s+${escapedPage}|siden\\s+${escapedPage}|seite\\s+${escapedPage}|página\\s+${escapedPage}|pagina\\s+${escapedPage}|sivulla\\s+${escapedPage})`, "iu");
      const actionLabel = action || ({
        "sv-SE": "Ny", "en-US": "New", "fr-FR": "Nouveau", "de-DE": "Neu",
        "es-ES": "Nuevo", "da-DK": "Opret", "fi-FI": "Uusi", "nb-NO": "Opprett"
      })[locale] || "New";
      if (pageReference.test(current) && current.includes(actionLabel)) return [locale, current];
      const prefix = {
        "sv-SE": `På sidan **${page}**, när du väljer **${actionLabel}**: `,
        "en-US": `On the **${page}** page, after selecting **${actionLabel}**: `,
        "fr-FR": `Sur la page **${page}**, après avoir choisi **${actionLabel}** : `,
        "de-DE": `Auf der Seite **${page}**, nach Auswahl von **${actionLabel}**: `,
        "es-ES": `En la página **${page}**, al seleccionar **${actionLabel}**: `,
        "da-DK": `På siden **${page}**, efter valg af **${actionLabel}**: `,
        "fi-FI": `Sivulla **${page}**, kun valitset **${actionLabel}**: `,
        "nb-NO": `På siden **${page}**, etter at du velger **${actionLabel}**: `
      }[locale] || `On **${page}**, after selecting **${actionLabel}**: `;
      return [locale, `${prefix}${current}`];
    }));
  }

  function sourceLanguage(source) {
    const uri = text(source?.sourceUri);
    const locale = uri.match(/^https:\/\/learn\.microsoft\.com\/([^/]+)\//i)?.[1];
    if (!locale) return "";
    const language = locale.split("-")[0].toLowerCase();
    const names = { en: "English", sv: "Swedish", fr: "French", de: "German",
      es: "Spanish", da: "Danish", fi: "Finnish", nb: "Norwegian" };
    return names[language] || locale;
  }

  function sourceMatchesLanguage(source, task) {
    const uri = text(source?.sourceUri);
    const sourceLocale = uri.match(/^https:\/\/learn\.microsoft\.com\/([^/]+)\//i)?.[1];
    if (!sourceLocale) return true;
    const requested = text(task?.language || task?.locale || task?.context?.language ||
      task?.context?.locale || "en-US").toLowerCase().split("-")[0];
    const actual = sourceLocale.toLowerCase().split("-")[0];
    return requested === actual || (requested === "nb" && actual === "no") ||
      (requested === "no" && actual === "nb");
  }

  function apply(tasks = [], packs = [], { mergeSteps = true } = {}) {
    const availableRules = rules(packs); const unmatched = [];
    const enriched = tasks.map(originalTask => {
      const task = pageEvidence(originalTask, packs);
      const found = match(task, availableRules, packs);
      if (!found) {
        const ambiguous = ambiguousCandidates(task, availableRules, packs);
        unmatched.push({ pageId: task.pageId || "", pageCaption: task.pageCaption || "",
          actionCaption: task.actionCaption || "", fieldCaption: task.fieldCaption || "",
          selectedCaption: task.selectedCaption || "", automationId: task.automationId || "",
          context: task.context || {},
          ambiguousCandidates: ambiguous,
          suggestedRule: suggestedRule(task) });
        return { ...task, knowledgeFrameworkVersion: VERSION,
          knowledgeMatched: false,
          confidence: confidenceValue(task.confidence, 0.55),
          reviewSuggested: true,
          ...(ambiguous.length ? { knowledgeMatchAmbiguous: true,
            ambiguousCandidates: ambiguous } : {}) };
      }
      const rule = found.rule;
      const instruction = localizedInstruction(rule, task.language || task.locale ||
        task.context?.language || task.context?.locale || "en-US");
      const contextualInstruction = contextualCreateInstruction(rule, task);
      const effectiveInstruction = contextualInstruction || instruction;
      const explanations = explanationEligible(rule, task, availableRules, packs)
        ? localizedExplanations(rule, task) : null;
      const explanationBasis = explanations
        ? explanationCatalog?.basis?.(rule, task) || "microsoft-learn" : "";
      const pageContextExplanation = explanationBasis === "page-context";
      const confidence = confidenceValue(rule.confidence,
        confidenceValue(task.confidence, 0.8));
      return { ...task, taskType: rule.taskType || task.taskType,
        semanticAction: rule.semanticAction || task.semanticAction,
        entity: rule.entity || task.entity || "", knowledgeFrameworkVersion: VERSION,
        knowledgeMatched: true, knowledgeRule: rule.ruleId,
        knowledgePackId: rule.packId, knowledgePackName: rule.packName,
        knowledgePackVersion: rule.packVersion,
        confidence,
        reviewSuggested: confidence < 0.85,
        ...(contextualInstruction ? { contextualInstruction,
          instruction: contextualInstruction, description: contextualInstruction,
          semanticActionModel: task.semanticActionModel ? {
            ...task.semanticActionModel, displayText: contextualInstruction
          } : task.semanticActionModel } : {}),
        ...(explanations ? { contextualExplanations: { ...explanations },
          contextualExplanationRuleId: rule.ruleId,
          contextualExplanationConfidence: Number(rule.confidence),
          contextualExplanationSourceIds: pageContextExplanation ? [] : [...(rule.sourceIds || [])],
          contextualExplanationBasis: explanationBasis,
          contextualExplanationSources: pageContextExplanation ? [] : rule.sourceRefs.map(source => ({
            sourceId: source.sourceId, title: source.title, sourceUri: source.sourceUri,
            sourceLanguage: sourceLanguage(source),
            sourceMatchesExplanationLanguage: sourceMatchesLanguage(source, task)
          })) } : {}),
        ...(effectiveInstruction ? { userDirective: effectiveInstruction,
          userDirectiveSourceIds: [...(rule.sourceIds || [])] } : {}) };
    });
    const consolidated = consolidation.consolidateWithAnalysis(enriched, { mergeSteps });
    const tasksWithKnowledge = consolidated.tasks.map(task => {
      const sourceTaskIds = new Set(task.sourceTaskIds || [task.taskId]);
      const matches = enriched.filter(item => sourceTaskIds.has(item.taskId) ||
        (item.stepGroupIds || []).some(id => sourceTaskIds.has(id)));
      const rules = [...new Set(matches.map(item => item.knowledgeRule).filter(Boolean))];
      const directives = [...new Set(matches.map(item => item.userDirective).filter(Boolean))];
      const contextualInstructions = [...new Set(matches.map(item =>
        item.contextualInstruction).filter(Boolean))];
      const sourceIds = [...new Set(matches.flatMap(item =>
        item.userDirectiveSourceIds || []))];
      const explanationMaps = [...new Map(matches.map(item => item.contextualExplanations)
        .filter(Boolean).map(value => [JSON.stringify(value), value])).values()];
      const explanationSourceIds = [...new Set(matches.flatMap(item =>
        item.contextualExplanationSourceIds || []))];
      const explanationSources = [...new Map(matches.flatMap(item =>
        item.contextualExplanationSources || []).map(source => [source.sourceId, source]))
        .values()];
      const explanationRuleIds = [...new Set(matches.map(item =>
        item.contextualExplanationRuleId).filter(Boolean))];
      const explanationConfidences = [...new Set(matches.map(item =>
        item.contextualExplanationConfidence).filter(Number.isFinite))];
      if (rules.length !== 1) return task;
      const matched = matches.find(item => item.knowledgeRule === rules[0]);
      const contextualInstruction = contextualInstructions.length === 1
        ? contextualInstructions[0] : "";
      return { ...task,
        entity: matched.entity || task.entity || "",
        ...(contextualInstruction ? { instruction: contextualInstruction,
          description: contextualInstruction,
          semanticActionModel: task.semanticActionModel ? {
            ...task.semanticActionModel, displayText: contextualInstruction
          } : task.semanticActionModel } : {}),
        knowledgeMatched: true,
        knowledgeRule: matched.knowledgeRule,
        knowledgePackId: matched.knowledgePackId,
        knowledgePackName: matched.knowledgePackName,
        knowledgePackVersion: matched.knowledgePackVersion,
        knowledgeFrameworkVersion: matched.knowledgeFrameworkVersion,
        ...(explanationMaps.length === 1 && explanationRuleIds.length === 1 &&
            explanationConfidences.length === 1 ? {
          contextualExplanations: explanationMaps[0],
          contextualExplanationRuleId: explanationRuleIds[0],
          contextualExplanationConfidence: explanationConfidences[0],
          contextualExplanationSourceIds: explanationSourceIds,
          contextualExplanationSources: explanationSources
        } : {}),
        ...(directives.length === 1 ? { userDirective: directives[0],
          userDirectiveSourceIds: sourceIds } : {}) };
    });
    return { tasks: tasksWithKnowledge,
      consolidationDecisions: consolidated.decisions,
      unmatched, rules: availableRules };
  }
  return { VERSION, apply, match, ambiguousCandidates, pageEvidence, patternsMatch, rules, score, explanationEligible,
    localizedExplanations, localizedInstruction,
    contextualInstruction: contextualCreateInstruction,
    localizedExplanation };
});
