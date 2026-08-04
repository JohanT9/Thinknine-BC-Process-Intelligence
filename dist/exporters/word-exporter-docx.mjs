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
  TableRow,
  TextRun,
  WidthType,
} from "docx";

const PAGE_IMAGE_WIDTH = 590;
const PAGE_IMAGE_HEIGHT = 390;

function plainText(value) {
  return String(value || "")
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .trim();
}

function safeDate(value) {
  const date = new Date(value || Date.now());
  return Number.isNaN(date.getTime())
    ? new Date().toLocaleDateString("sv-SE")
    : date.toLocaleDateString("sv-SE");
}

function imageBytes(imageData) {
  if (imageData instanceof Uint8Array) {
    return imageData;
  }

  if (imageData?.bytes instanceof Uint8Array) {
    return imageData.bytes;
  }

  return null;
}

function imageType(imageData, bytes) {
  const mime = String(imageData?.mimeType || "").toLowerCase();

  if (
    mime === "image/jpeg" ||
    mime === "image/jpg" ||
    (
      bytes?.length >= 3 &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff
    )
  ) {
    return "jpg";
  }

  return "png";
}

function pngSize(bytes) {
  if (
    !bytes ||
    bytes.length < 24 ||
    bytes[0] !== 0x89 ||
    bytes[1] !== 0x50 ||
    bytes[2] !== 0x4e ||
    bytes[3] !== 0x47
  ) {
    return null;
  }

  const view = new DataView(
    bytes.buffer,
    bytes.byteOffset,
    bytes.byteLength
  );

  return {
    width: view.getUint32(16, false),
    height: view.getUint32(20, false),
  };
}

function jpegSize(bytes) {
  if (
    !bytes ||
    bytes.length < 4 ||
    bytes[0] !== 0xff ||
    bytes[1] !== 0xd8
  ) {
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

    if (marker === 0xd8 || marker === 0xd9) {
      continue;
    }

    if (offset + 2 > bytes.length) {
      break;
    }

    const length = (bytes[offset] << 8) | bytes[offset + 1];

    if (
      [
        0xc0, 0xc1, 0xc2, 0xc3,
        0xc5, 0xc6, 0xc7,
        0xc9, 0xca, 0xcb,
        0xcd, 0xce, 0xcf,
      ].includes(marker)
    ) {
      return {
        height: (bytes[offset + 3] << 8) | bytes[offset + 4],
        width: (bytes[offset + 5] << 8) | bytes[offset + 6],
      };
    }

    if (length < 2) {
      break;
    }

    offset += length;
  }

  return null;
}

function fittedImageSize(bytes) {
  const size =
    pngSize(bytes) ||
    jpegSize(bytes) ||
    { width: 1200, height: 700 };

  const widthFactor = PAGE_IMAGE_WIDTH / size.width;
  const heightFactor = PAGE_IMAGE_HEIGHT / size.height;
  const factor = Math.min(1, widthFactor, heightFactor);

  return {
    width: Math.max(1, Math.round(size.width * factor)),
    height: Math.max(1, Math.round(size.height * factor)),
  };
}

function labelCell(text) {
  return new TableCell({
    width: {
      size: 30,
      type: WidthType.PERCENTAGE,
    },
    shading: {
      type: ShadingType.CLEAR,
      fill: "EAF2F8",
    },
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text,
            bold: true,
          }),
        ],
      }),
    ],
  });
}

function valueCell(text) {
  return new TableCell({
    width: {
      size: 70,
      type: WidthType.PERCENTAGE,
    },
    children: [
      new Paragraph({
        children: [
          new TextRun(String(text || "")),
        ],
      }),
    ],
  });
}

function metadataTable(rows) {
  return new Table({
    width: {
      size: 100,
      type: WidthType.PERCENTAGE,
    },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "B8C2CC" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "B8C2CC" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "B8C2CC" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "B8C2CC" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "D5DCE3" },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "D5DCE3" },
    },
    rows: rows.map(([label, value]) =>
      new TableRow({
        children: [
          labelCell(label),
          valueCell(value),
        ],
      })
    ),
  });
}

function heading(text, level = HeadingLevel.HEADING_1) {
  return new Paragraph({
    heading: level,
    spacing: {
      before: level === HeadingLevel.HEADING_1 ? 320 : 220,
      after: 120,
    },
    children: [
      new TextRun({
        text,
        bold: true,
        color: level === HeadingLevel.HEADING_1
          ? "0F4C81"
          : "1E5E8C",
      }),
    ],
  });
}

function bodyParagraph(text, options = {}) {
  return new Paragraph({
    spacing: {
      after: options.after ?? 140,
    },
    alignment: options.alignment,
    children: [
      new TextRun({
        text: plainText(text),
        bold: Boolean(options.bold),
        italics: Boolean(options.italics),
        color: options.color,
        size: options.size,
      }),
    ],
  });
}

function bulletParagraph(text) {
  return new Paragraph({
    bullet: {
      level: 0,
    },
    spacing: {
      after: 80,
    },
    children: [
      new TextRun(plainText(text)),
    ],
  });
}

function commentBox(text) {
  return new Table({
    width: {
      size: 100,
      type: WidthType.PERCENTAGE,
    },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 2, color: "D6A700" },
      bottom: { style: BorderStyle.SINGLE, size: 2, color: "D6A700" },
      left: { style: BorderStyle.SINGLE, size: 2, color: "D6A700" },
      right: { style: BorderStyle.SINGLE, size: 2, color: "D6A700" },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: {
              type: ShadingType.CLEAR,
              fill: "FFF7CC",
            },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Kommentar: ${plainText(text)}`,
                    bold: true,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

function taskElements(task, index, screenshotData) {
  const children = [];
  const instruction = plainText(
    task.instruction ||
    task.description ||
    "Utför uppgiften."
  );

  children.push(
    heading(`Steg ${index + 1}`, HeadingLevel.HEADING_2)
  );

  children.push(
    bodyParagraph(instruction, {
      size: 24,
      after: 100,
    })
  );

  const meta = [
    task.pageCaption ? `Sida: ${task.pageCaption}` : "",
    task.confidenceScore !== undefined
      ? `Säkerhet: ${task.confidenceScore}%`
      : task.confidence !== undefined
        ? `Säkerhet: ${task.confidence}%`
        : "",
  ].filter(Boolean).join(" | ");

  if (meta) {
    children.push(
      bodyParagraph(meta, {
        italics: true,
        color: "5F6B76",
        size: 18,
        after: 100,
      })
    );
  }

  if (task.userComment) {
    children.push(commentBox(task.userComment));
  }

  const imageData = task.screenshot
    ? screenshotData[task.screenshot]
    : null;
  const bytes = imageBytes(imageData);

  if (bytes) {
    const dimensions = fittedImageSize(bytes);

    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: {
          before: 120,
          after: 200,
        },
        children: [
          new ImageRun({
            data: bytes,
            type: imageType(imageData, bytes),
            transformation: dimensions,
            altText: {
              title: `Skärmbild steg ${index + 1}`,
              description: instruction,
              name: `step-${index + 1}`,
            },
          }),
        ],
      })
    );
  }

  return children;
}

function versionTable(date, reviewer) {
  const headerOptions = {
    shading: {
      type: ShadingType.CLEAR,
      fill: "D9EAF7",
    },
  };

  return new Table({
    width: {
      size: 100,
      type: WidthType.PERCENTAGE,
    },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "B8C2CC" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "B8C2CC" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "B8C2CC" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "B8C2CC" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "D5DCE3" },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "D5DCE3" },
    },
    rows: [
      new TableRow({
        tableHeader: true,
        children: ["Version", "Datum", "Ändring", "Granskad av"].map(text =>
          new TableCell({
            ...headerOptions,
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text,
                    bold: true,
                  }),
                ],
              }),
            ],
          })
        ),
      }),
      new TableRow({
        children: ["1.0", date, "Första version", reviewer || ""].map(text =>
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun(text),
                ],
              }),
            ],
          })
        ),
      }),
    ],
  });
}

function buildDocument(options) {
  const session = options.session || {};
  const review = options.review || {};
  const screenshotData = options.screenshotData || {};
  const tasks = (review.tasks || options.tasks || [])
    .filter(task => !task.deleted);

  const title = plainText(
    options.title ||
    review.sessionName ||
    session.name ||
    "Business Central-process"
  );
  const date = safeDate(
    review.updatedAt ||
    session.endedAt ||
    session.startedAt
  );
  const environment =
    session.settings?.environmentName ||
    options.environment ||
    "Ej angiven";
  const reviewer = review.reviewer || "Ej angiven";
  const purpose =
    session.purpose ||
    options.purpose ||
    "Beskriver hur processen genomförs i Business Central.";
  const prerequisites = options.prerequisites || [
    "Användaren har behörighet till berörda sidor och åtgärder.",
    "Nödvändiga grunddata och inställningar finns upplagda.",
    "Instruktionerna följer de benämningar som visades i Business Central.",
  ];

  const workflowChildren = tasks.flatMap((task, index) =>
    taskElements(task, index, screenshotData)
  );

  const header = new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        border: {
          bottom: {
            style: BorderStyle.SINGLE,
            size: 6,
            color: "0F4C81",
          },
        },
        children: [
          new TextRun({
            text: title,
            color: "5F6B76",
            size: 18,
          }),
        ],
      }),
    ],
  });

  const footer = new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        border: {
          top: {
            style: BorderStyle.SINGLE,
            size: 4,
            color: "B8C2CC",
          },
        },
        children: [
          new TextRun({
            text: "Thinknine Process Intelligence | Sida ",
            color: "5F6B76",
            size: 18,
          }),
          new TextRun({
            children: [PageNumber.CURRENT],
            color: "5F6B76",
            size: 18,
          }),
          new TextRun({
            text: " av ",
            color: "5F6B76",
            size: 18,
          }),
          new TextRun({
            children: [PageNumber.TOTAL_PAGES],
            color: "5F6B76",
            size: 18,
          }),
        ],
      }),
    ],
  });

  return {
    document: new Document({
      creator: "Thinknine Process Intelligence",
      title,
      subject: "Business Central arbetsinstruktion",
      description: "Genererad från en granskad Business Central-process.",
      styles: {
        default: {
          document: {
            run: {
              font: "Aptos",
              size: 22,
            },
            paragraph: {
              spacing: {
                after: 120,
                line: 276,
              },
            },
          },
        },
      },
      sections: [
        {
          headers: {
            default: header,
          },
          footers: {
            default: footer,
          },
          properties: {
            page: {
              margin: {
                top: 1134,
                right: 1134,
                bottom: 1134,
                left: 1134,
                header: 567,
                footer: 567,
              },
            },
          },
          children: [
            bodyParagraph("THINKNINE", {
              bold: true,
              color: "0F4C81",
              size: 24,
              alignment: AlignmentType.CENTER,
              after: 120,
            }),
            bodyParagraph("Arbetsinstruktion", {
              color: "5F6B76",
              size: 26,
              alignment: AlignmentType.CENTER,
              after: 160,
            }),
            bodyParagraph(title, {
              bold: true,
              color: "0F4C81",
              size: 52,
              alignment: AlignmentType.CENTER,
              after: 220,
            }),
            bodyParagraph("Business Central Process Documentation", {
              color: "5F6B76",
              size: 26,
              alignment: AlignmentType.CENTER,
              after: 360,
            }),
            metadataTable([
              ["Version", "1.0"],
              ["Datum", date],
              ["Miljö", environment],
              [
                "Dokumentationstyp",
                session.settings?.documentationProfile || "generic",
              ],
              [
                "Granskningsstatus",
                review.status === "completed"
                  ? "Slutförd"
                  : "Pågående",
              ],
              ["Granskad av", reviewer],
            ]),
            new Paragraph({
              children: [new PageBreak()],
            }),
            heading("Syfte"),
            bodyParagraph(purpose),
            heading("Förutsättningar"),
            ...prerequisites.map(bulletParagraph),
            heading("Arbetsgång"),
            ...workflowChildren,
            heading("Förväntat resultat"),
            bodyParagraph(
              options.expectedResult ||
              "Processen är genomförd enligt arbetsgången och de registrerade ändringarna har sparats i Business Central."
            ),
            heading("Versionshistorik"),
            versionTable(date, review.reviewer || ""),
          ],
        },
      ],
    }),
    title,
    taskCount: tasks.length,
    imageCount: tasks.filter(task =>
      task.screenshot &&
      imageBytes(screenshotData[task.screenshot])
    ).length,
  };
}

async function createDocx(options) {
  const built = buildDocument(options);
  const blob = await Packer.toBlob(built.document);

  return {
    ...built,
    blob,
  };
}

globalThis.T9Export = globalThis.T9Export || {};
globalThis.T9Export.word = {
  createDocx,
  buildDocument,
  plainText,
  fittedImageSize,
};

export {
  buildDocument,
  createDocx,
  fittedImageSize,
  plainText,
};
