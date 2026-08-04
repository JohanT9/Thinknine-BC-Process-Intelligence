(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9Export = root.T9Export || {};
  root.T9Export.word = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const EMU_PER_PIXEL = 9525;
  const PAGE_WIDTH_EMU = 5943600;
  const MAX_IMAGE_HEIGHT_EMU = 3900000;

  function xml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  function cleanMarkdown(value) {
    return String(value || "")
      .replace(/\*\*/g, "")
      .replace(/`/g, "")
      .trim();
  }

  function paragraph(text, style = "", options = {}) {
    const styleXml = style
      ? `<w:pStyle w:val="${xml(style)}"/>`
      : "";
    const pageBreak = options.pageBreakBefore
      ? "<w:pageBreakBefore/>"
      : "";
    const keepNext = options.keepNext
      ? "<w:keepNext/>"
      : "";
    const spacing = options.spacingAfter !== undefined
      ? `<w:spacing w:after="${options.spacingAfter}"/>`
      : "";
    const bold = options.bold ? "<w:b/>" : "";
    const italic = options.italic ? "<w:i/>" : "";
    const color = options.color
      ? `<w:color w:val="${xml(options.color)}"/>`
      : "";
    const size = options.size
      ? `<w:sz w:val="${options.size}"/><w:szCs w:val="${options.size}"/>`
      : "";
    const align = options.align
      ? `<w:jc w:val="${options.align}"/>`
      : "";

    return `<w:p>
      <w:pPr>${styleXml}${pageBreak}${keepNext}${spacing}${align}</w:pPr>
      <w:r>
        <w:rPr>${bold}${italic}${color}${size}</w:rPr>
        <w:t xml:space="preserve">${xml(text)}</w:t>
      </w:r>
    </w:p>`;
  }

  function fieldParagraph(instruction, fallback, options = {}) {
    const align = options.align
      ? `<w:jc w:val="${options.align}"/>`
      : "";

    return `<w:p>
      <w:pPr>${align}</w:pPr>
      <w:r><w:fldChar w:fldCharType="begin"/></w:r>
      <w:r><w:instrText xml:space="preserve">${xml(instruction)}</w:instrText></w:r>
      <w:r><w:fldChar w:fldCharType="separate"/></w:r>
      <w:r><w:t>${xml(fallback)}</w:t></w:r>
      <w:r><w:fldChar w:fldCharType="end"/></w:r>
    </w:p>`;
  }

  function bullet(text) {
    return `<w:p>
      <w:pPr>
        <w:pStyle w:val="ListParagraph"/>
        <w:numPr>
          <w:ilvl w:val="0"/>
          <w:numId w:val="1"/>
        </w:numPr>
      </w:pPr>
      <w:r><w:t xml:space="preserve">${xml(text)}</w:t></w:r>
    </w:p>`;
  }

  function tableCell(text, options = {}) {
    const width = options.width
      ? `<w:tcW w:w="${options.width}" w:type="dxa"/>`
      : "";
    const shading = options.shading
      ? `<w:shd w:fill="${options.shading}"/>`
      : "";
    const bold = options.bold ? "<w:b/>" : "";

    return `<w:tc>
      <w:tcPr>${width}${shading}</w:tcPr>
      <w:p>
        <w:r>
          <w:rPr>${bold}</w:rPr>
          <w:t xml:space="preserve">${xml(text)}</w:t>
        </w:r>
      </w:p>
    </w:tc>`;
  }

  function tableRow(cells, options = {}) {
    const header = options.header
      ? "<w:trPr><w:tblHeader/></w:trPr>"
      : "";

    return `<w:tr>${header}${cells.join("")}</w:tr>`;
  }

  function infoTable(rows) {
    return `<w:tbl>
      <w:tblPr>
        <w:tblStyle w:val="TableGrid"/>
        <w:tblW w:w="0" w:type="auto"/>
      </w:tblPr>
      <w:tblGrid>
        <w:gridCol w:w="2600"/>
        <w:gridCol w:w="6200"/>
      </w:tblGrid>
      ${rows.map(row => tableRow([
        tableCell(row[0], {
          width: 2600,
          bold: true,
          shading: "EAF2F8"
        }),
        tableCell(row[1], { width: 6200 })
      ])).join("")}
    </w:tbl>`;
  }

  function versionTable(date, reviewer = "") {
    return `<w:tbl>
      <w:tblPr>
        <w:tblStyle w:val="TableGrid"/>
        <w:tblW w:w="0" w:type="auto"/>
      </w:tblPr>
      <w:tblGrid>
        <w:gridCol w:w="1400"/>
        <w:gridCol w:w="1900"/>
        <w:gridCol w:w="2900"/>
        <w:gridCol w:w="2400"/>
      </w:tblGrid>
      ${tableRow([
        tableCell("Version", { bold: true, shading: "D9EAF7" }),
        tableCell("Datum", { bold: true, shading: "D9EAF7" }),
        tableCell("Ändring", { bold: true, shading: "D9EAF7" }),
        tableCell("Granskad av", { bold: true, shading: "D9EAF7" })
      ], { header: true })}
      ${tableRow([
        tableCell("1.0"),
        tableCell(date),
        tableCell("Första version"),
        tableCell(reviewer || "")
      ])}
    </w:tbl>`;
  }

  function pngSize(bytes) {
    if (
      bytes?.length >= 24 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47
    ) {
      const view = new DataView(
        bytes.buffer,
        bytes.byteOffset,
        bytes.byteLength
      );

      return {
        width: view.getUint32(16, false),
        height: view.getUint32(20, false)
      };
    }

    return { width: 1200, height: 700 };
  }

  function imageDimensions(bytes) {
    const size = pngSize(bytes);
    let cx = size.width * EMU_PER_PIXEL;
    let cy = size.height * EMU_PER_PIXEL;

    if (cx > PAGE_WIDTH_EMU) {
      const factor = PAGE_WIDTH_EMU / cx;
      cx = PAGE_WIDTH_EMU;
      cy *= factor;
    }

    if (cy > MAX_IMAGE_HEIGHT_EMU) {
      const factor = MAX_IMAGE_HEIGHT_EMU / cy;
      cy = MAX_IMAGE_HEIGHT_EMU;
      cx *= factor;
    }

    return {
      cx: Math.round(cx),
      cy: Math.round(cy)
    };
  }

  function imageParagraph(relId, imageIndex, bytes, altText) {
    const { cx, cy } = imageDimensions(bytes);

    return `<w:p>
      <w:pPr>
        <w:spacing w:before="120" w:after="180"/>
        <w:jc w:val="center"/>
      </w:pPr>
      <w:r>
        <w:drawing>
          <wp:inline distT="0" distB="0" distL="0" distR="0">
            <wp:extent cx="${cx}" cy="${cy}"/>
            <wp:effectExtent l="0" t="0" r="0" b="0"/>
            <wp:docPr id="${imageIndex}" name="Screenshot ${imageIndex}" descr="${xml(altText)}"/>
            <wp:cNvGraphicFramePr>
              <a:graphicFrameLocks noChangeAspect="1"/>
            </wp:cNvGraphicFramePr>
            <a:graphic>
              <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
                <pic:pic>
                  <pic:nvPicPr>
                    <pic:cNvPr id="${imageIndex}" name="Screenshot ${imageIndex}"/>
                    <pic:cNvPicPr/>
                  </pic:nvPicPr>
                  <pic:blipFill>
                    <a:blip r:embed="${relId}"/>
                    <a:stretch><a:fillRect/></a:stretch>
                  </pic:blipFill>
                  <pic:spPr>
                    <a:xfrm>
                      <a:off x="0" y="0"/>
                      <a:ext cx="${cx}" cy="${cy}"/>
                    </a:xfrm>
                    <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
                    <a:ln w="9525">
                      <a:solidFill><a:srgbClr val="B8C2CC"/></a:solidFill>
                    </a:ln>
                  </pic:spPr>
                </pic:pic>
              </a:graphicData>
            </a:graphic>
          </wp:inline>
        </w:drawing>
      </w:r>
    </w:p>`;
  }

  function stepBlock(task, index, imageInfo) {
    const instruction = cleanMarkdown(
      task.instruction ||
      task.description ||
      "Utför uppgiften."
    );
    const confidence = task.confidenceScore ?? task.confidence;
    const meta = [
      task.pageCaption ? `Sida: ${task.pageCaption}` : "",
      confidence !== undefined ? `Säkerhet: ${confidence}%` : ""
    ].filter(Boolean).join("  |  ");

    let content = paragraph(
      `Steg ${index + 1}`,
      "Heading2",
      {
        keepNext: true,
        spacingAfter: 80
      }
    );

    content += paragraph(
      instruction,
      "Instruction",
      {
        size: 24,
        spacingAfter: 100
      }
    );

    if (meta) {
      content += paragraph(
        meta,
        "Caption",
        {
          italic: true,
          color: "5F6B76",
          size: 18,
          spacingAfter: 80
        }
      );
    }

    if (task.userComment) {
      content += `<w:tbl>
        <w:tblPr>
          <w:tblW w:w="0" w:type="auto"/>
          <w:tblBorders>
            <w:top w:val="single" w:sz="8" w:color="D6A700"/>
            <w:left w:val="single" w:sz="8" w:color="D6A700"/>
            <w:bottom w:val="single" w:sz="8" w:color="D6A700"/>
            <w:right w:val="single" w:sz="8" w:color="D6A700"/>
          </w:tblBorders>
          <w:shd w:fill="FFF7CC"/>
        </w:tblPr>
        ${tableRow([
          tableCell(`Kommentar: ${task.userComment}`)
        ])}
      </w:tbl>`;
    }

    if (imageInfo) {
      content += imageParagraph(
        imageInfo.relId,
        imageInfo.imageIndex,
        imageInfo.data,
        instruction
      );
    }

    content += paragraph("", "", { spacingAfter: 120 });
    return content;
  }

  function stylesXml() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Aptos" w:hAnsi="Aptos" w:eastAsia="Aptos"/>
        <w:sz w:val="22"/>
        <w:szCs w:val="22"/>
        <w:lang w:val="sv-SE"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr>
        <w:spacing w:after="120" w:line="276" w:lineRule="auto"/>
      </w:pPr>
    </w:pPrDefault>
  </w:docDefaults>

  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:qFormat/>
  </w:style>

  <w:style w:type="paragraph" w:styleId="Title">
    <w:name w:val="Title"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Subtitle"/>
    <w:qFormat/>
    <w:pPr>
      <w:spacing w:before="900" w:after="180"/>
      <w:jc w:val="center"/>
    </w:pPr>
    <w:rPr>
      <w:b/>
      <w:color w:val="0F4C81"/>
      <w:sz w:val="52"/>
      <w:szCs w:val="52"/>
    </w:rPr>
  </w:style>

  <w:style w:type="paragraph" w:styleId="Subtitle">
    <w:name w:val="Subtitle"/>
    <w:basedOn w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:spacing w:after="240"/>
      <w:jc w:val="center"/>
    </w:pPr>
    <w:rPr>
      <w:color w:val="5F6B76"/>
      <w:sz w:val="26"/>
      <w:szCs w:val="26"/>
    </w:rPr>
  </w:style>

  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:keepNext/>
      <w:keepLines/>
      <w:spacing w:before="280" w:after="120"/>
      <w:outlineLvl w:val="0"/>
    </w:pPr>
    <w:rPr>
      <w:b/>
      <w:color w:val="0F4C81"/>
      <w:sz w:val="34"/>
      <w:szCs w:val="34"/>
    </w:rPr>
  </w:style>

  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:keepNext/>
      <w:keepLines/>
      <w:spacing w:before="220" w:after="80"/>
      <w:outlineLvl w:val="1"/>
    </w:pPr>
    <w:rPr>
      <w:b/>
      <w:color w:val="1E5E8C"/>
      <w:sz w:val="28"/>
      <w:szCs w:val="28"/>
    </w:rPr>
  </w:style>

  <w:style w:type="paragraph" w:styleId="Instruction">
    <w:name w:val="Instruction"/>
    <w:basedOn w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:spacing w:after="100"/>
    </w:pPr>
    <w:rPr>
      <w:sz w:val="24"/>
      <w:szCs w:val="24"/>
    </w:rPr>
  </w:style>

  <w:style w:type="paragraph" w:styleId="Caption">
    <w:name w:val="caption"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:semiHidden/>
    <w:unhideWhenUsed/>
    <w:qFormat/>
    <w:rPr>
      <w:i/>
      <w:color w:val="5F6B76"/>
      <w:sz w:val="18"/>
      <w:szCs w:val="18"/>
    </w:rPr>
  </w:style>

  <w:style w:type="paragraph" w:styleId="ListParagraph">
    <w:name w:val="List Paragraph"/>
    <w:basedOn w:val="Normal"/>
    <w:uiPriority w:val="34"/>
    <w:qFormat/>
    <w:pPr>
      <w:ind w:left="720"/>
      <w:contextualSpacing/>
    </w:pPr>
  </w:style>

  <w:style w:type="table" w:styleId="TableGrid">
    <w:name w:val="Table Grid"/>
    <w:uiPriority w:val="59"/>
    <w:semiHidden/>
    <w:unhideWhenUsed/>
    <w:qFormat/>
    <w:tblPr>
      <w:tblBorders>
        <w:top w:val="single" w:sz="4" w:color="B8C2CC"/>
        <w:left w:val="single" w:sz="4" w:color="B8C2CC"/>
        <w:bottom w:val="single" w:sz="4" w:color="B8C2CC"/>
        <w:right w:val="single" w:sz="4" w:color="B8C2CC"/>
        <w:insideH w:val="single" w:sz="4" w:color="D5DCE3"/>
        <w:insideV w:val="single" w:sz="4" w:color="D5DCE3"/>
      </w:tblBorders>
      <w:tblCellMar>
        <w:top w:w="100" w:type="dxa"/>
        <w:left w:w="100" w:type="dxa"/>
        <w:bottom w:w="100" w:type="dxa"/>
        <w:right w:w="100" w:type="dxa"/>
      </w:tblCellMar>
    </w:tblPr>
  </w:style>
</w:styles>`;
  }

  function numberingXml() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:abstractNum w:abstractNumId="0">
    <w:multiLevelType w:val="hybridMultilevel"/>
    <w:lvl w:ilvl="0">
      <w:start w:val="1"/>
      <w:numFmt w:val="bullet"/>
      <w:lvlText w:val="•"/>
      <w:lvlJc w:val="left"/>
      <w:pPr>
        <w:tabs><w:tab w:val="num" w:pos="360"/></w:tabs>
        <w:ind w:left="720" w:hanging="360"/>
      </w:pPr>
      <w:rPr>
        <w:rFonts w:ascii="Symbol" w:hAnsi="Symbol"/>
      </w:rPr>
    </w:lvl>
  </w:abstractNum>
  <w:num w:numId="1">
    <w:abstractNumId w:val="0"/>
  </w:num>
</w:numbering>`;
  }

  function headerXml(title) {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:p>
    <w:pPr>
      <w:pBdr>
        <w:bottom w:val="single" w:sz="6" w:space="1" w:color="0F4C81"/>
      </w:pBdr>
      <w:jc w:val="right"/>
    </w:pPr>
    <w:r>
      <w:rPr>
        <w:color w:val="5F6B76"/>
        <w:sz w:val="18"/>
        <w:szCs w:val="18"/>
      </w:rPr>
      <w:t>${xml(title)}</w:t>
    </w:r>
  </w:p>
</w:hdr>`;
  }

  function footerXml() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:p>
    <w:pPr>
      <w:pBdr>
        <w:top w:val="single" w:sz="4" w:space="1" w:color="B8C2CC"/>
      </w:pBdr>
      <w:jc w:val="center"/>
    </w:pPr>
    <w:r>
      <w:rPr>
        <w:color w:val="5F6B76"/>
        <w:sz w:val="18"/>
        <w:szCs w:val="18"/>
      </w:rPr>
      <w:t>Thinknine Process Intelligence  |  Sida </w:t>
    </w:r>
    <w:r><w:fldChar w:fldCharType="begin"/></w:r>
    <w:r><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r>
    <w:r><w:fldChar w:fldCharType="separate"/></w:r>
    <w:r><w:t>1</w:t></w:r>
    <w:r><w:fldChar w:fldCharType="end"/></w:r>
    <w:r><w:t> av </w:t></w:r>
    <w:r><w:fldChar w:fldCharType="begin"/></w:r>
    <w:r><w:instrText xml:space="preserve"> NUMPAGES </w:instrText></w:r>
    <w:r><w:fldChar w:fldCharType="separate"/></w:r>
    <w:r><w:t>1</w:t></w:r>
    <w:r><w:fldChar w:fldCharType="end"/></w:r>
  </w:p>
</w:ftr>`;
  }

  function contentTypesXml(imageCount) {
    const pngDefault = imageCount
      ? '<Default Extension="png" ContentType="image/png"/>'
      : "";

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  ${pngDefault}
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
  <Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>
  <Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`;
  }

  function documentRelsXml(images) {
    const imageRelationships = images.map(image =>
      `<Relationship Id="${image.relId}" ` +
      `Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" ` +
      `Target="media/${image.fileName}"/>`
    ).join("");

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rIdNumbering" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>
  <Relationship Id="rIdHeader" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>
  <Relationship Id="rIdFooter" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>
  ${imageRelationships}
</Relationships>`;
  }

  function packageRelsXml() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;
  }

  function coreXml(title, createdAt) {
    const iso = new Date(createdAt || Date.now()).toISOString();

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties
  xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:dcterms="http://purl.org/dc/terms/"
  xmlns:dcmitype="http://purl.org/dc/dcmitype/"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>${xml(title)}</dc:title>
  <dc:subject>Business Central arbetsinstruktion</dc:subject>
  <dc:creator>Thinknine Process Intelligence</dc:creator>
  <cp:lastModifiedBy>Thinknine Process Intelligence</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${iso}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${iso}</dcterms:modified>
  <cp:revision>1</cp:revision>
</cp:coreProperties>`;
  }

  function appXml() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties
  xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"
  xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Thinknine Process Intelligence</Application>
  <AppVersion>3.7.0</AppVersion>
  <Company>Thinknine AB</Company>
</Properties>`;
  }

  function build(options) {
    const session = options.session || {};
    const review = options.review || {};
    const tasks = (review.tasks || options.tasks || [])
      .filter(task => !task.deleted);
    const screenshotData = options.screenshotData || {};
    const title =
      cleanMarkdown(
        options.title ||
        review.sessionName ||
        session.name ||
        "Business Central-process"
      );
    const date = new Date(
      review.updatedAt ||
      session.endedAt ||
      session.startedAt ||
      Date.now()
    ).toLocaleDateString("sv-SE");
    const environment =
      session.settings?.environmentName ||
      options.environment ||
      "";
    const reviewer = review.reviewer || "";
    const purpose =
      session.purpose ||
      options.purpose ||
      "Beskriver hur processen genomförs i Business Central.";
    const prerequisites = options.prerequisites || [
      "Användaren har behörighet till berörda sidor och åtgärder.",
      "Nödvändiga grunddata och inställningar finns upplagda.",
      "Instruktionerna följer de benämningar som visades i Business Central."
    ];

    const images = [];
    const imageByTaskId = new Map();

    tasks.forEach((task, index) => {
      if (!task.screenshot) return;
      const data = screenshotData[task.screenshot];
      if (!(data instanceof Uint8Array)) return;

      const imageInfo = {
        taskId: task.taskId || String(index),
        relId: `rIdImage${images.length + 1}`,
        imageIndex: images.length + 1,
        fileName: `image${images.length + 1}.png`,
        data
      };

      images.push(imageInfo);
      imageByTaskId.set(imageInfo.taskId, imageInfo);
    });

    let body = "";
    body += paragraph("THINKNINE", "", {
      bold: true,
      color: "0F4C81",
      size: 24,
      align: "center",
      spacingAfter: 120
    });
    body += paragraph("Arbetsinstruktion", "Subtitle", {
      align: "center",
      spacingAfter: 120
    });
    body += paragraph(title, "Title", {
      align: "center",
      spacingAfter: 240
    });
    body += paragraph(
      "Business Central Process Documentation",
      "Subtitle",
      {
        align: "center",
        spacingAfter: 360
      }
    );
    body += infoTable([
      ["Version", "1.0"],
      ["Datum", date],
      ["Miljö", environment || "Ej angiven"],
      ["Dokumentationstyp",
        session.settings?.documentationProfile || "generic"],
      ["Granskningsstatus",
        review.status === "completed" ? "Slutförd" : "Pågående"],
      ["Granskad av", reviewer || "Ej angiven"]
    ]);

    body += paragraph("", "", { pageBreakBefore: true });
    body += paragraph("Innehåll", "Heading1");
    body += fieldParagraph(
      ' TOC \\o "1-2" \\h \\z \\u ',
      "Högerklicka och välj Uppdatera fält i Word.",
      { align: "left" }
    );

    body += paragraph("Syfte", "Heading1", {
      pageBreakBefore: true
    });
    body += paragraph(purpose);

    body += paragraph("Förutsättningar", "Heading1");
    for (const prerequisite of prerequisites) {
      body += bullet(prerequisite);
    }

    body += paragraph("Arbetsgång", "Heading1");
    tasks.forEach((task, index) => {
      const imageInfo = imageByTaskId.get(
        task.taskId || String(index)
      );
      body += stepBlock(task, index, imageInfo);
    });

    body += paragraph("Förväntat resultat", "Heading1");
    body += paragraph(
      options.expectedResult ||
      "Processen är genomförd enligt arbetsgången och de registrerade ändringarna har sparats i Business Central."
    );

    body += paragraph("Versionshistorik", "Heading1");
    body += versionTable(date, reviewer);

    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
  xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
  <w:body>
    ${body}
    <w:sectPr>
      <w:headerReference w:type="default" r:id="rIdHeader"/>
      <w:footerReference w:type="default" r:id="rIdFooter"/>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="567" w:footer="567" w:gutter="0"/>
      <w:cols w:space="708"/>
      <w:docGrid w:linePitch="360"/>
    </w:sectPr>
  </w:body>
</w:document>`;

    const files = [
      {
        name: "[Content_Types].xml",
        data: contentTypesXml(images.length)
      },
      {
        name: "_rels/.rels",
        data: packageRelsXml()
      },
      {
        name: "docProps/core.xml",
        data: coreXml(title, review.createdAt || session.startedAt)
      },
      {
        name: "docProps/app.xml",
        data: appXml()
      },
      {
        name: "word/document.xml",
        data: documentXml
      },
      {
        name: "word/styles.xml",
        data: stylesXml()
      },
      {
        name: "word/numbering.xml",
        data: numberingXml()
      },
      {
        name: "word/header1.xml",
        data: headerXml(title)
      },
      {
        name: "word/footer1.xml",
        data: footerXml()
      },
      {
        name: "word/_rels/document.xml.rels",
        data: documentRelsXml(images)
      },
      ...images.map(image => ({
        name: `word/media/${image.fileName}`,
        data: image.data
      }))
    ];

    return {
      files,
      title,
      taskCount: tasks.length,
      imageCount: images.length
    };
  }

  function createDocx(options, zipWriter) {
    if (!zipWriter?.create) {
      throw new Error("ZIP writer is required.");
    }

    const packageData = build(options);
    return {
      ...packageData,
      bytes: zipWriter.create(packageData.files)
    };
  }

  return {
    build,
    createDocx,
    xml,
    cleanMarkdown,
    pngSize,
    imageDimensions
  };
});
