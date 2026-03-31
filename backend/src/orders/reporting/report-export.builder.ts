import type { DateRangePreset, ReportFiltersByKey, ReportKey } from './orders-reports.service';

type WorkbookBuildInput = {
  reportSheetName: string;
  metadataSheetName: string;
  includeMetadataSheet: boolean;
  reportRows: Array<Record<string, string | number>>;
  metadataRows: Array<[string, string]>;
};

type MetadataEntriesInput = {
  workspaceId: string;
  reportKey: ReportKey;
  runId: string;
  filters: ReportFiltersByKey[ReportKey];
  generatedAt: Date;
  isEmpty: boolean;
  rowCount: number;
  extraEntries?: Array<[string, string]>;
};

export function buildMetadataEntries(input: MetadataEntriesInput): Array<[string, string]> {
  const fromTo = resolveDateRangeToFromTo(input.filters.dateRange);
  const platformSelection = Array.isArray(input.filters.platform)
    ? input.filters.platform.join(', ')
    : String(input.filters.platform);

  const baseEntries: Array<[string, string]> = [
    ['workspaceId', input.workspaceId],
    ['reportKey', input.reportKey],
    ['runId', input.runId],
    ['generatedAt', input.generatedAt.toISOString()],
    ['from', fromTo.from],
    ['to', fromTo.to],
    ['platformSelection', platformSelection],
    ['rowCount', String(input.rowCount)],
    [
      'message',
      input.isEmpty
        ? 'No report rows matched selected filters. File contains metadata for auditability.'
        : 'Report rows generated.',
    ],
  ];

  return [...baseEntries, ...(input.extraEntries ?? [])];
}

export function formatFileNameTimestamp(value: Date): string {
  const yyyy = value.getUTCFullYear();
  const mm = `${value.getUTCMonth() + 1}`.padStart(2, '0');
  const dd = `${value.getUTCDate()}`.padStart(2, '0');
  const hh = `${value.getUTCHours()}`.padStart(2, '0');
  const min = `${value.getUTCMinutes()}`.padStart(2, '0');
  return `${yyyy}${mm}${dd}_${hh}${min}`;
}

export function buildWorkbookXml(input: WorkbookBuildInput): Buffer {
  const normalizedReportSheetName = normalizeSheetName(input.reportSheetName);
  const normalizedMetadataSheetName = normalizeSheetName(input.metadataSheetName);
  const reportHeaders = input.reportRows.length > 0 ? Object.keys(input.reportRows[0]) : ['message'];
  const reportDataRows =
    input.reportRows.length > 0
      ? input.reportRows.map((row) => reportHeaders.map((header) => String(row[header] ?? '')))
      : [['No rows returned for selected filters']];
  const metadataDataRows = input.metadataRows.map(([key, value]) => [key, value]);

  const files: Array<{ name: string; content: Buffer }> = [
    {
      name: '[Content_Types].xml',
      content: Buffer.from(buildContentTypesXml(input.includeMetadataSheet), 'utf-8'),
    },
    {
      name: '_rels/.rels',
      content: Buffer.from(buildRootRelsXml(), 'utf-8'),
    },
    {
      name: 'xl/workbook.xml',
      content: Buffer.from(
        buildWorkbookDocumentXml({
          reportSheetName: normalizedReportSheetName,
          metadataSheetName: normalizedMetadataSheetName,
          includeMetadataSheet: input.includeMetadataSheet,
        }),
        'utf-8',
      ),
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      content: Buffer.from(buildWorkbookRelsXml(input.includeMetadataSheet), 'utf-8'),
    },
    {
      name: 'xl/styles.xml',
      content: Buffer.from(buildStylesXml(), 'utf-8'),
    },
    {
      name: 'xl/worksheets/sheet1.xml',
      content: Buffer.from(buildWorksheetXml(reportHeaders, reportDataRows), 'utf-8'),
    },
  ];

  if (input.includeMetadataSheet) {
    files.push({
      name: 'xl/worksheets/sheet2.xml',
      content: Buffer.from(buildWorksheetXml(['field', 'value'], metadataDataRows), 'utf-8'),
    });
  }

  return createZipArchive(files);
}

function resolveDateRangeToFromTo(range: DateRangePreset): { from: string; to: string } {
  const now = new Date();
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const daysBackByPreset: Record<DateRangePreset, number> = {
    last_7_days: 7,
    last_14_days: 14,
    last_30_days: 30,
    last_90_days: 90,
  };
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - (daysBackByPreset[range] - 1));

  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

function normalizeSheetName(value: string): string {
  const sanitized = value.replaceAll(/[\\/*?:[\]]/g, ' ').trim();
  return sanitized.length === 0 ? 'Sheet' : sanitized.slice(0, 31);
}

function xmlEscape(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function buildWorksheetXml(headers: string[], rows: string[][]): string {
  const allRows = [headers, ...rows];
  const rowXml = allRows
    .map((columns, rowIndex) => {
      const cells = columns
        .map((value, columnIndex) => {
          const cellRef = `${columnNumberToName(columnIndex + 1)}${rowIndex + 1}`;
          return `<c r="${cellRef}" t="inlineStr"><is><t>${xmlEscape(value)}</t></is></c>`;
        })
        .join('');
      return `<row r="${rowIndex + 1}">${cells}</row>`;
    })
    .join('');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>${rowXml}</sheetData>
</worksheet>`;
}

function columnNumberToName(columnNumber: number): string {
  let dividend = columnNumber;
  let columnName = '';

  while (dividend > 0) {
    const modulo = (dividend - 1) % 26;
    columnName = String.fromCharCode(65 + modulo) + columnName;
    dividend = Math.floor((dividend - modulo) / 26);
  }

  return columnName;
}

function buildContentTypesXml(includeMetadataSheet: boolean): string {
  const overrides = [
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>',
    '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>',
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>',
  ];
  if (includeMetadataSheet) {
    overrides.push(
      '<Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>',
    );
  }

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  ${overrides.join('')}
</Types>`;
}

function buildRootRelsXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;
}

function buildWorkbookDocumentXml(input: {
  reportSheetName: string;
  metadataSheetName: string;
  includeMetadataSheet: boolean;
}): string {
  const metadataSheet = input.includeMetadataSheet
    ? `<sheet name="${xmlEscape(input.metadataSheetName)}" sheetId="2" r:id="rId2"/>`
    : '';

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="${xmlEscape(input.reportSheetName)}" sheetId="1" r:id="rId1"/>
    ${metadataSheet}
  </sheets>
</workbook>`;
}

function buildWorkbookRelsXml(includeMetadataSheet: boolean): string {
  const metadataRelation = includeMetadataSheet
    ? '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>'
    : '';

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  ${metadataRelation}
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;
}

function buildStylesXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>
  <fills count="1"><fill><patternFill patternType="none"/></fill></fills>
  <borders count="1"><border/></borders>
  <cellStyleXfs count="1"><xf/></cellStyleXfs>
  <cellXfs count="1"><xf xfId="0"/></cellXfs>
</styleSheet>`;
}

function createZipArchive(files: Array<{ name: string; content: Buffer }>): Buffer {
  const localHeaders: Buffer[] = [];
  const centralDirectory: Buffer[] = [];
  let offset = 0;

  files.forEach((file) => {
    const fileName = Buffer.from(file.name, 'utf-8');
    const crc32 = computeCrc32(file.content);
    const localHeader = Buffer.alloc(30 + fileName.length);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(crc32 >>> 0, 14);
    localHeader.writeUInt32LE(file.content.length, 18);
    localHeader.writeUInt32LE(file.content.length, 22);
    localHeader.writeUInt16LE(fileName.length, 26);
    localHeader.writeUInt16LE(0, 28);
    fileName.copy(localHeader, 30);
    localHeaders.push(localHeader, file.content);

    const centralHeader = Buffer.alloc(46 + fileName.length);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0, 14);
    centralHeader.writeUInt32LE(crc32 >>> 0, 16);
    centralHeader.writeUInt32LE(file.content.length, 20);
    centralHeader.writeUInt32LE(file.content.length, 24);
    centralHeader.writeUInt16LE(fileName.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);
    fileName.copy(centralHeader, 46);
    centralDirectory.push(centralHeader);

    offset += localHeader.length + file.content.length;
  });

  const centralDirectorySize = centralDirectory.reduce((sum, part) => sum + part.length, 0);
  const endRecord = Buffer.alloc(22);
  endRecord.writeUInt32LE(0x06054b50, 0);
  endRecord.writeUInt16LE(0, 4);
  endRecord.writeUInt16LE(0, 6);
  endRecord.writeUInt16LE(files.length, 8);
  endRecord.writeUInt16LE(files.length, 10);
  endRecord.writeUInt32LE(centralDirectorySize, 12);
  endRecord.writeUInt32LE(offset, 16);
  endRecord.writeUInt16LE(0, 20);

  return Buffer.concat([...localHeaders, ...centralDirectory, endRecord]);
}

function computeCrc32(data: Buffer): number {
  let crc = 0xffffffff;
  for (let index = 0; index < data.length; index += 1) {
    crc ^= data[index];
    for (let bit = 0; bit < 8; bit += 1) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }
  return ~crc;
}
