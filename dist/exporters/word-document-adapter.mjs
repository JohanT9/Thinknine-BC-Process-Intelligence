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

function bodyParagraph(text, options = {}) {
  return new Paragraph({
    spacing: { after: options.after ?? 140 },
    alignment: options.alignment,
    children: [new TextRun({
      text: plainText(text),
      bold: Boolean(options.bold),
      italics: Boolean(options.italics),
      color: options.color,
      size: options.size,
    })],
  });
}

function headingComponent(component, levelOverride) {
  const level = levelOverride || (component.content.level === 2
    ? HeadingLevel.HEADING_2
    : HeadingLevel.HEADING_1);
  const fallback = level === HeadingLevel.HEADING_1 ? "0F4C81" : "1E5E8C";
  return new Paragraph({
    heading: level,
    spacing: { before: level === HeadingLevel.HEADING_1 ? 320 : 220, after: 120 },
    children: [new TextRun({
      text: plainText(component.content.text),
      bold: true,
      color: color(component.appearance.typography?.color, fallback),
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
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: tableBorders(component.appearance),
    rows: (component.content.rows || []).map(row => {
      const label = row.label;
      const rawValue = row.value;
      const value = row.key === "date"
        ? safeDate(rawValue)
        : rawValue;
      return new TableRow({ children: [
        new TableCell({
          width: { size: 30, type: WidthType.PERCENTAGE },
          shading: {
            type: ShadingType.CLEAR,
            fill: color(component.appearance.labelFill, "EAF2F8"),
          },
          children: [new Paragraph({
            children: [new TextRun({ text: String(label), bold: true })],
          })],
        }),
        new TableCell({
          width: { size: 70, type: WidthType.PERCENTAGE },
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
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 2, color: border },
      bottom: { style: BorderStyle.SINGLE, size: 2, color: border },
      left: { style: BorderStyle.SINGLE, size: 2, color: border },
      right: { style: BorderStyle.SINGLE, size: 2, color: border },
    },
    rows: [new TableRow({ children: [new TableCell({
      shading: {
        type: ShadingType.CLEAR,
        fill: color(component.appearance.fillColor, "FFF7CC"),
      },
      children: [new Paragraph({ children: [new TextRun({
        text: `${component.content.label}: ${plainText(component.content.text)}`,
        bold: true,
      })] })],
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
        children: row.map(text => new TableCell({
          children: [new Paragraph({
            children: [new TextRun(String(text || ""))],
          })],
        })),
      })),
    ],
  });
}

function screenshotParagraph(component, mediaAssets) {
  const media = mediaAssets[component.content.assetId];
  const bytes = imageBytes(media);
  if (!bytes) {
    throw new Error(`Word export is missing media asset: ${component.content.assetId}.`);
  }
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 120, after: 200 },
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
}

function renderComponent(component, mediaAssets, context = {}) {
  if (component.visibility === "hidden") return [];
  if (component.kind === "heading") return [headingComponent(component)];
  if (component.kind === "paragraph") {
    return [bodyParagraph(component.content.text, context.step
      ? { size: 24, after: 100 }
      : {})];
  }
  if (component.kind === "screenshot") {
    return [screenshotParagraph(component, mediaAssets)];
  }
  if (component.kind === "callout") {
    return [new Paragraph({ children: [] }), commentBox(component)];
  }
  if (component.kind === "step") {
    const heading = {
      content: { text: component.content.title, level: 2 },
      appearance: {
        typography: { color: component.appearance.headingColor || "#1e5e8c" },
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
        bold: true, color: accent, size: 24,
        alignment: AlignmentType.CENTER, after: 120,
      }),
      bodyParagraph(component.appearance.documentType, {
        color: muted, size: 26, alignment: AlignmentType.CENTER, after: 160,
      }),
      bodyParagraph(title, {
        bold: true, color: accent, size: 52,
        alignment: AlignmentType.CENTER, after: 220,
      }),
      bodyParagraph(component.appearance.subtitle, {
        color: muted, size: 26, alignment: AlignmentType.CENTER, after: 360,
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
      size: 18,
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
        size: 18,
      }),
      new TextRun({ children: [PageNumber.CURRENT], color: textColor, size: 18 }),
      new TextRun({
        text: component.content.totalSeparator,
        color: textColor,
        size: 18,
      }),
      new TextRun({ children: [PageNumber.TOTAL_PAGES], color: textColor, size: 18 }),
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
  const document = new Document({
    creator: plan.content.creator,
    title: plan.content.title,
    subject: plan.content.subject,
    description: plan.content.description,
    styles: { default: { document: {
      run: {
        font: appearance.fontFamily || "Aptos",
        size: (Number(appearance.fontSize) || 11) * 2,
      },
      paragraph: { spacing: { after: 120, line: 276 } },
    } } },
    sections: [{
      headers: headerComponent ? { default: wordHeader(headerComponent) } : {},
      footers: footerComponent ? { default: wordFooter(footerComponent) } : {},
      properties: { page: { margin: {
        top: 1134, right: 1134, bottom: 1134, left: 1134,
        header: 567, footer: 567,
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
