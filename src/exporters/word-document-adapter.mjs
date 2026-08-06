import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  ImageRun,
  PageBreak,
  PageNumber,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableOfContents,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import "../engine/text-format.js";

function plainText(value) {
  return globalThis.T9TextFormat.quoteEmphasis(value)
    .replace(/`/g, "")
    .trim();
}

function formattedTextRuns(value, options = {}) {
  return globalThis.T9TextFormat.instructionSegments(value).map(segment =>
    new TextRun({
      text: segment.text.replace(/`/g, ""),
      bold: Boolean(options.bold) || segment.bold,
      italics: Boolean(options.italics),
      color: options.color,
      size: options.size,
      font: options.font,
    })
  );
}

function color(value, fallback) {
  return String(value || fallback || "").replace(/^#/, "").toUpperCase();
}

function safeDate(value) {
  const date = new Date(value || "");
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString("sv-SE");
}

function imageBytes(imageData) {
  if (imageData instanceof Uint8Array) return imageData;
  if (imageData?.bytes instanceof Uint8Array) return imageData.bytes;
  return null;
}

function imageType(imageData, bytes) {
  const mime = String(imageData?.mimeType || "").toLowerCase();
  if (mime === "image/jpeg" || mime === "image/jpg" || (
    bytes?.length >= 3 && bytes[0] === 0xff &&
    bytes[1] === 0xd8 && bytes[2] === 0xff
  )) return "jpg";
  return "png";
}

function pngSize(bytes) {
  if (!bytes || bytes.length < 24 || bytes[0] !== 0x89 ||
      bytes[1] !== 0x50 || bytes[2] !== 0x4e || bytes[3] !== 0x47) {
    return null;
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16, false), height: view.getUint32(20, false) };
}

function jpegSize(bytes) {
  if (!bytes || bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    return null;
  }
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = bytes[offset + 1];
    offset += 2;
    if (marker === 0xd8 || marker === 0xd9) continue;
    if (offset + 2 > bytes.length) break;
    const length = (bytes[offset] << 8) | bytes[offset + 1];
    if ([
      0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7,
      0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
    ].includes(marker)) {
      return {
        height: (bytes[offset + 3] << 8) | bytes[offset + 4],
        width: (bytes[offset + 5] << 8) | bytes[offset + 6],
      };
    }
    if (length < 2) break;
    offset += length;
  }
  return null;
}

function fittedImageSize(bytes, limits = {}) {
  const size = pngSize(bytes) || jpegSize(bytes) || { width: 1200, height: 700 };
  const maxWidth = Number(limits.maxWidth) || 590;
  const maxHeight = Number(limits.maxHeight) || 390;
  const factor = Math.min(1, maxWidth / size.width, maxHeight / size.height);
  return {
    width: Math.max(1, Math.round(size.width * factor)),
    height: Math.max(1, Math.round(size.height * factor)),
  };
}

function halfPoints(value, fallback) {
  return Math.round((Number(value) || fallback) * 2);
}

function pointSpacing(value, fallback) {
  return Math.round((Number.isFinite(Number(value))
    ? Number(value)
    : fallback) * 20);
}

function componentSpacing(component, fallback = {}) {
  return {
    before: pointSpacing(component?.spacingIntent?.before, fallback.before || 0),
    after: pointSpacing(component?.spacingIntent?.after, fallback.after || 0),
  };
}

function cellMargins(value) {
  const margin = pointSpacing(value, 0);
  return { top: margin, right: margin, bottom: margin, left: margin };
}

function millimeters(value, fallback) {
  return Math.round((Number(value) || fallback) * 56.6929);
}

function bodyParagraph(text, options = {}) {
  return new Paragraph({
    spacing: options.spacing || { after: options.after ?? 140 },
    alignment: options.alignment,
    keepNext: Boolean(options.keepNext),
    keepLines: Boolean(options.keepLines),
    border: options.border,
    shading: options.shading,
    children: formattedTextRuns(text, options),
  });
}

function headingComponent(component, levelOverride) {
  const level = levelOverride || (component.content.level === 2
    ? HeadingLevel.HEADING_2
    : HeadingLevel.HEADING_1);
  const fallback = level === HeadingLevel.HEADING_1 ? "0F4C81" : "1E5E8C";
  const professionalBand = component.appearance.headingStyle === "band";
  const dividerSize = Number(component.appearance.dividerSize) || 0;
  const professional = professionalBand || dividerSize > 0 ||
    component.presentationIntent?.avoidOrphan;
  return new Paragraph({
    heading: level,
    keepNext: component.keepWithNext !== false,
    keepLines: true,
    spacing: professional && component.spacingIntent
      ? componentSpacing(component, {
        before: level === HeadingLevel.HEADING_1 ? 16 : 11,
        after: 6,
      })
      : { before: level === HeadingLevel.HEADING_1 ? 320 : 220, after: 120 },
    shading: professionalBand ? {
      type: ShadingType.CLEAR,
      fill: color(component.appearance.headingFill, "EAF2F8"),
    } : undefined,
    border: professionalBand ? { left: {
      style: BorderStyle.SINGLE,
      size: 18,
      color: color(component.appearance.headingBorderColor, "38A3D1"),
      space: 8,
    } } : dividerSize ? { bottom: {
      style: BorderStyle.SINGLE,
      size: dividerSize,
      color: color(component.appearance.dividerColor, fallback),
      space: 5,
    } } : undefined,
    children: [new TextRun({
      text: plainText(component.content.text),
      bold: true,
      color: color(component.appearance.typography?.color, fallback),
      size: component.appearance.typography?.size
        ? halfPoints(component.appearance.typography.size, 13)
        : undefined,
      font: component.appearance.typography?.family,
    })],
  });
}

function tableBorders(appearance, size = 1) {
  const outer = color(appearance.borderColor, "B8C2CC");
  const inside = color(appearance.insideBorderColor, "D5DCE3");
  return {
    top: { style: BorderStyle.SINGLE, size, color: outer },
    bottom: { style: BorderStyle.SINGLE, size, color: outer },
    left: { style: BorderStyle.SINGLE, size, color: outer },
    right: { style: BorderStyle.SINGLE, size, color: outer },
    insideHorizontal: { style: BorderStyle.SINGLE, size, color: inside },
    insideVertical: { style: BorderStyle.SINGLE, size, color: inside },
  };
}

function metadataTable(component) {
  const compact = component.appearance.style === "compact";
  return new Table({
    width: {
      size: Number(component.appearance.width) || 100,
      type: WidthType.PERCENTAGE,
    },
    alignment: compact ? AlignmentType.CENTER : undefined,
    borders: tableBorders(component.appearance),
    rows: (component.content.rows || []).map(row => {
      const label = row.label;
      const rawValue = row.value;
      const value = row.key === "date"
        ? safeDate(rawValue)
        : rawValue;
      return new TableRow({ cantSplit: true, children: [
        new TableCell({
          width: {
            size: Number(component.appearance.labelWidth) || 30,
            type: WidthType.PERCENTAGE,
          },
          margins: compact
            ? cellMargins(component.appearance.cellPadding)
            : undefined,
          shading: {
            type: ShadingType.CLEAR,
            fill: color(component.appearance.labelFill, "EAF2F8"),
          },
          children: [new Paragraph({
            children: [new TextRun({ text: String(label), bold: true })],
          })],
        }),
        new TableCell({
          width: {
            size: 100 - (Number(component.appearance.labelWidth) || 30),
            type: WidthType.PERCENTAGE,
          },
          margins: compact
            ? cellMargins(component.appearance.cellPadding)
            : undefined,
          shading: compact ? {
            type: ShadingType.CLEAR,
            fill: color(component.appearance.valueFill, "FFFFFF"),
          } : undefined,
          children: [new Paragraph({
            children: [new TextRun(String(value || ""))],
          })],
        }),
      ] });
    }),
  });
}

function commentBox(component) {
  const border = color(component.appearance.borderColor, "D6A700");
  const professional = Number(component.appearance.borderSize) > 2;
  const none = { style: BorderStyle.NONE, size: 0, color: border };
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: professional ? none : { style: BorderStyle.SINGLE, size: 2, color: border },
      bottom: professional ? none : { style: BorderStyle.SINGLE, size: 2, color: border },
      left: {
        style: BorderStyle.SINGLE,
        size: Number(component.appearance.borderSize) || 2,
        color: border,
      },
      right: professional ? none : { style: BorderStyle.SINGLE, size: 2, color: border },
    },
    rows: [new TableRow({ cantSplit: true, children: [new TableCell({
      margins: professional
        ? cellMargins(component.appearance.cellPadding || 6)
        : undefined,
      shading: {
        type: ShadingType.CLEAR,
        fill: color(component.appearance.fillColor, "FFF7CC"),
      },
      children: [new Paragraph({
        spacing: componentSpacing(component, { before: 0, after: 0 }),
        keepLines: true,
        children: professional ? [
          new TextRun({
            text: `${component.content.label}: `,
            bold: true,
            color: color(component.appearance.labelColor, border),
          }),
          new TextRun({ text: plainText(component.content.text) }),
        ] : [new TextRun({
          text: `${component.content.label}: ${plainText(component.content.text)}`,
          bold: true,
        })],
      })],
    })] })],
  });
}

function revisionTable(component) {
  const columns = component.content.columns || [];
  const headers = columns.map(column => column.label);
  const rows = (component.content.entries || []).map(entry => columns.map(
    column => column.key === "createdAt"
      ? safeDate(entry[column.key])
      : entry[column.key]
  ));
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: tableBorders(component.appearance),
    rows: [
      new TableRow({
        tableHeader: true,
        cantSplit: true,
        children: headers.map(text => new TableCell({
          shading: {
            type: ShadingType.CLEAR,
            fill: color(component.appearance.headerFill, "D9EAF7"),
          },
          children: [new Paragraph({
            children: [new TextRun({ text, bold: true })],
          })],
        })),
      }),
      ...rows.map(row => new TableRow({
        cantSplit: Boolean(component.appearance.rowIntegrity),
        children: row.map(text => new TableCell({
          children: [new Paragraph({
            children: [new TextRun(String(text || ""))],
          })],
        })),
      })),
    ],
  });
}

function screenshotBlock(component, mediaAssets) {
  const media = mediaAssets[component.content.assetId];
  const bytes = imageBytes(media);
  if (!bytes) {
    throw new Error(`Word export is missing media asset: ${component.content.assetId}.`);
  }
  const image = new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: component.appearance.presentationStyle === "framed"
      ? componentSpacing(component, { before: 6, after: 10 })
      : { before: 120, after: 200 },
    keepLines: true,
    children: [new ImageRun({
      data: bytes,
      type: imageType(media, bytes),
      transformation: fittedImageSize(bytes, component.appearance),
      altText: {
        title: component.accessibility.label,
        description: component.accessibility.description,
        name: component.content.altName,
      },
    })],
  });
  if (component.appearance.presentationStyle !== "framed") return image;
  const border = color(component.appearance.borderColor, "C8D5DF");
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    alignment: AlignmentType.CENTER,
    borders: {
      top: { style: BorderStyle.SINGLE,
        size: Number(component.appearance.borderSize) || 4, color: border },
      bottom: { style: BorderStyle.SINGLE,
        size: Number(component.appearance.borderSize) || 4, color: border },
      left: { style: BorderStyle.SINGLE,
        size: Number(component.appearance.borderSize) || 4, color: border },
      right: { style: BorderStyle.SINGLE,
        size: Number(component.appearance.borderSize) || 4, color: border },
    },
    rows: [new TableRow({ cantSplit: true, children: [new TableCell({
      margins: cellMargins(component.appearance.cellPadding),
      shading: {
        type: ShadingType.CLEAR,
        fill: color(component.appearance.backgroundColor, "F7FAFC"),
      },
      children: [image],
    })] })],
  });
}

function plannedTable(component, mediaAssets, context) {
  const columns = component.content.columns || [];
  const headerLabels = columns.map(column => column.label || column.title || "");
  const hasHeader = headerLabels.some(Boolean);
  const rows = component.components.map(rowGroup => new TableRow({
    cantSplit: component.presentationIntent.rowIntegrity !== false,
    children: rowGroup.components.map(cellGroup => new TableCell({
      margins: cellMargins(component.appearance.cellPadding),
      children: cellGroup.components.flatMap(child =>
        renderComponent(child, mediaAssets, context)),
    })),
  }));
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: tableBorders(component.appearance),
    rows: [
      ...(hasHeader ? [new TableRow({
        tableHeader: true,
        cantSplit: true,
        children: headerLabels.map(label => new TableCell({
          shading: { type: ShadingType.CLEAR,
            fill: color(component.appearance.headerFill, "EAF2F8") },
          margins: cellMargins(component.appearance.cellPadding),
          children: [bodyParagraph(label, { bold: true, after: 0 })],
        })),
      })] : []),
      ...rows,
    ],
  });
}

function renderComponent(component, mediaAssets, context = {}) {
  if (component.visibility === "hidden") return [];
  if (component.kind === "heading") return [headingComponent(component)];
  if (component.kind === "paragraph") {
    const professional = component.presentationIntent?.readableMeasure;
    return [bodyParagraph(component.content.text, {
      size: component.appearance.typography?.size
        ? halfPoints(component.appearance.typography.size, 11)
        : context.step ? 24 : undefined,
      font: component.appearance.typography?.family,
      color: component.appearance.typography?.color
        ? color(component.appearance.typography.color)
        : undefined,
      spacing: professional && component.spacingIntent
        ? componentSpacing(component, { before: 0, after: context.step ? 5 : 7 })
        : undefined,
      keepNext: component.keepWithNext,
      keepLines: true,
    })];
  }
  if (component.kind === "screenshot") {
    return [screenshotBlock(component, mediaAssets)];
  }
  if (component.kind === "callout") {
    return component.presentationIntent.semanticRole
      ? [commentBox(component)]
      : [new Paragraph({ children: [] }), commentBox(component)];
  }
  if (component.kind === "step") {
    const heading = {
      content: { text: component.content.title, level: 2 },
      keepWithNext: true,
      spacingIntent: component.spacingIntent,
      appearance: {
        ...component.appearance,
        typography: {
          ...component.appearance.typography,
          color: component.appearance.headingColor || "#1e5e8c",
        },
      },
    };
    return [
      headingComponent(heading, HeadingLevel.HEADING_2),
      ...component.components.flatMap(child =>
        renderComponent(child, mediaAssets, { step: true })),
    ];
  }
  if (component.kind === "list") {
    return component.components.flatMap(group => {
      const paragraph = group.components.find(child => child.kind === "paragraph");
      return paragraph ? [new Paragraph({
        bullet: { level: 0 },
        spacing: { after: 80 },
        children: [new TextRun(plainText(paragraph.content.text))],
      })] : [];
    });
  }
  if (component.kind === "table") {
    return [plannedTable(component, mediaAssets, context)];
  }
  if (component.kind === "metadata") return [metadataTable(component)];
  if (component.kind === "revisionHistory" && component.sourceRef.blockId) {
    return [revisionTable(component)];
  }
  if (component.kind === "pageBreak") {
    return [new Paragraph({ children: [new PageBreak()] })];
  }
  if (component.kind === "toc") {
    return [new TableOfContents(component.appearance.title, {
      hyperlink: true,
      headingStyleRange: component.content.headingLevelRange.join("-"),
    })];
  }
  if (component.kind === "cover") {
    const title = component.content.title;
    const metadata = component.components.find(child => child.kind === "metadata");
    const accent = color(component.appearance.accentColor, "0F4C81");
    const muted = color(component.appearance.mutedColor, "5F6B76");
    return [
      bodyParagraph(component.appearance.brandText, {
        bold: true, color: accent,
        size: halfPoints(component.appearance.brandSize, 12),
        alignment: AlignmentType.CENTER,
        after: pointSpacing(component.appearance.spacing?.brandAfter, 6),
      }),
      bodyParagraph(component.appearance.documentType, {
        color: muted,
        size: halfPoints(component.appearance.documentTypeSize, 13),
        alignment: AlignmentType.CENTER,
        after: pointSpacing(component.appearance.spacing?.typeAfter, 8),
        border: component.appearance.dividerSize ? { bottom: {
          style: BorderStyle.SINGLE,
          size: Number(component.appearance.dividerSize) * 4,
          color: color(component.appearance.dividerColor, accent),
          space: 9,
        } } : undefined,
      }),
      bodyParagraph(title, {
        bold: true, color: accent,
        size: halfPoints(component.appearance.titleSize, 26),
        alignment: AlignmentType.CENTER,
        after: pointSpacing(component.appearance.spacing?.titleAfter, 11),
        keepLines: true,
      }),
      bodyParagraph(component.appearance.subtitle, {
        color: muted,
        size: halfPoints(component.appearance.subtitleSize, 13),
        alignment: AlignmentType.CENTER,
        after: pointSpacing(component.appearance.spacing?.subtitleAfter, 18),
      }),
      ...(metadata ? [metadataTable(metadata)] : []),
      new Paragraph({ children: [new PageBreak()] }),
    ];
  }
  return component.components.flatMap(child =>
    renderComponent(child, mediaAssets, context));
}

function wordHeader(component) {
  if (!component) return undefined;
  return new Header({ children: [new Paragraph({
    alignment: AlignmentType.RIGHT,
    border: { bottom: {
      style: BorderStyle.SINGLE,
      size: 6,
      color: color(component.appearance.borderColor, "0F4C81"),
    } },
    children: [new TextRun({
      text: component.content.text,
      color: color(component.appearance.textColor, "5F6B76"),
      size: halfPoints(component.appearance.fontSize, 9),
    })],
  })] });
}

function wordFooter(component) {
  if (!component) return undefined;
  const textColor = color(component.appearance.textColor, "5F6B76");
  return new Footer({ children: [new Paragraph({
    alignment: AlignmentType.CENTER,
    border: { top: {
      style: BorderStyle.SINGLE,
      size: 4,
      color: color(component.appearance.borderColor, "B8C2CC"),
    } },
    children: [
      new TextRun({
        text: `${component.content.text} | ${component.content.pageLabel} `,
        color: textColor,
        size: halfPoints(component.appearance.fontSize, 9),
      }),
      new TextRun({
        children: [PageNumber.CURRENT],
        color: textColor,
        size: halfPoints(component.appearance.fontSize, 9),
      }),
      new TextRun({
        text: component.content.totalSeparator,
        color: textColor,
        size: halfPoints(component.appearance.fontSize, 9),
      }),
      new TextRun({
        children: [PageNumber.TOTAL_PAGES],
        color: textColor,
        size: halfPoints(component.appearance.fontSize, 9),
      }),
    ],
  })] });
}

function allComponents(plan) {
  const result = [];
  function visit(components) {
    (components || []).forEach(component => {
      result.push(component);
      visit(component.components);
    });
  }
  visit(plan.components);
  plan.sections.forEach(section => visit(section.components));
  return result;
}

function validatePlanMedia(plan, mediaAssets) {
  if (!plan || !Array.isArray(plan.sections)) {
    throw new TypeError("Word adapter requires a valid Document Plan.");
  }
  const missing = allComponents(plan)
    .filter(component => component.kind === "screenshot" &&
      component.visibility !== "hidden")
    .map(component => component.content.assetId)
    .filter((assetId, index, values) => values.indexOf(assetId) === index)
    .filter(assetId => !imageBytes(mediaAssets[assetId]));
  if (missing.length) {
    throw new Error(`Word export is missing media assets: ${missing.join(", ")}.`);
  }
}

function buildDocument({ plan, mediaAssets = {} }) {
  validatePlanMedia(plan, mediaAssets);
  const planBefore = JSON.stringify(plan);
  const headerComponent = plan.components.find(component =>
    component.kind === "header" && component.visibility !== "hidden");
  const footerComponent = plan.components.find(component =>
    component.kind === "footer" && component.visibility !== "hidden");
  const children = plan.sections.flatMap(section =>
    section.components.flatMap(component =>
      renderComponent(component, mediaAssets)));
  const appearance = plan.content.documentAppearance || {};
  const margins = appearance.margins || {};
  const document = new Document({
    creator: plan.content.creator,
    title: plan.content.title,
    subject: plan.content.subject,
    description: plan.content.description,
    styles: { default: { document: {
      run: {
        font: appearance.fontFamily || "Aptos",
        size: halfPoints(appearance.fontSize, 11),
      },
      paragraph: { spacing: {
        after: pointSpacing(appearance.paragraphAfter, 6),
        line: Math.round((Number(appearance.lineHeight) || 1.15) * 240),
      } },
    } } },
    sections: [{
      headers: headerComponent ? { default: wordHeader(headerComponent) } : {},
      footers: footerComponent ? { default: wordFooter(footerComponent) } : {},
      properties: { page: { margin: {
        top: millimeters(margins.top, 20),
        right: millimeters(margins.right, 20),
        bottom: millimeters(margins.bottom, 20),
        left: millimeters(margins.left, 20),
        header: millimeters(margins.header, 10),
        footer: millimeters(margins.footer, 10),
      } } },
      children,
    }],
  });
  if (JSON.stringify(plan) !== planBefore) {
    throw new Error("Word adapter mutated the Document Plan.");
  }
  const components = allComponents(plan);
  return {
    document,
    title: plan.content.title,
    taskCount: components.filter(component =>
      component.kind === "step" && component.visibility !== "hidden").length,
    imageCount: components.filter(component =>
      component.kind === "screenshot" && component.visibility !== "hidden").length,
  };
}

async function renderPlan(options) {
  const built = buildDocument(options);
  const blob = await Packer.toBlob(built.document);
  return { ...built, blob };
}

const createDocx = renderPlan;

globalThis.T9Export = globalThis.T9Export || {};
globalThis.T9Export.word = {
  buildDocument,
  createDocx,
  fittedImageSize,
  plainText,
  renderPlan,
};

export { buildDocument, createDocx, fittedImageSize, plainText, renderPlan };
