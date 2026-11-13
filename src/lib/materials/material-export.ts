export type ExportCell = string | number | null;
export type ExportRows = ExportCell[][];

export function makeCsv(rows: ExportRows): string {
  return '\uFEFF' + rows.map(row => row.map(value => {
    const text = value === null ? '' : String(value);
    const safe = typeof value === 'string' && /^[\s]*[=+@-]/.test(text) ? "'" + text : text;
    return '"' + safe.replaceAll('"', '""') + '"';
  }).join(';')).join('\r\n');
}

function xml(value: string): string {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function columnName(index: number): string {
  let result = '';
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) result = String.fromCharCode(65 + (n - 1) % 26) + result;
  return result;
}

// Stored ZIP entries keep the browser export dependency-free and deterministic.
function zip(files: Record<string, string>): Uint8Array {
  const encoder = new TextEncoder();
  const entries = Object.entries(files).map(([name, content]) => ({ name: encoder.encode(name), data: encoder.encode(content) }));
  const size = entries.reduce((sum, entry) => sum + 30 + entry.name.length + entry.data.length + 46 + entry.name.length, 22);
  const result = new Uint8Array(size);
  const view = new DataView(result.buffer);
  const records: { offset: number; crc: number }[] = [];
  let cursor = 0;
  for (const entry of entries) {
    let crc = 0xffffffff;
    for (const byte of entry.data) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
    crc = (crc ^ 0xffffffff) >>> 0;
    records.push({ offset: cursor, crc });
    view.setUint32(cursor, 0x04034b50, true);
    view.setUint16(cursor + 4, 20, true);
    view.setUint16(cursor + 6, 0x0800, true);
    view.setUint16(cursor + 12, 33, true);
    view.setUint32(cursor + 14, crc, true);
    view.setUint32(cursor + 18, entry.data.length, true);
    view.setUint32(cursor + 22, entry.data.length, true);
    view.setUint16(cursor + 26, entry.name.length, true);
    result.set(entry.name, cursor + 30);
    result.set(entry.data, cursor + 30 + entry.name.length);
    cursor += 30 + entry.name.length + entry.data.length;
  }
  const centralOffset = cursor;
  entries.forEach((entry, index) => {
    view.setUint32(cursor, 0x02014b50, true);
    view.setUint16(cursor + 4, 20, true);
    view.setUint16(cursor + 6, 20, true);
    view.setUint16(cursor + 8, 0x0800, true);
    view.setUint16(cursor + 14, 33, true);
    view.setUint32(cursor + 16, records[index].crc, true);
    view.setUint32(cursor + 20, entry.data.length, true);
    view.setUint32(cursor + 24, entry.data.length, true);
    view.setUint16(cursor + 28, entry.name.length, true);
    view.setUint32(cursor + 42, records[index].offset, true);
    result.set(entry.name, cursor + 46);
    cursor += 46 + entry.name.length;
  });
  view.setUint32(cursor, 0x06054b50, true);
  view.setUint16(cursor + 8, entries.length, true);
  view.setUint16(cursor + 10, entries.length, true);
  view.setUint32(cursor + 12, cursor - centralOffset, true);
  view.setUint32(cursor + 16, centralOffset, true);
  return result;
}

export function makeXlsx(rows: ExportRows): Uint8Array {
  const sheetRows = rows.map((row, rowIndex) => '<row r="' + (rowIndex + 1) + '">' + row.map((value, colIndex) => {
    const ref = columnName(colIndex) + (rowIndex + 1);
    if (typeof value === 'number' && Number.isFinite(value)) return `<c r="${ref}"><v>${value}</v></c>`;
    return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xml(value === null ? '' : String(value))}</t></is></c>`;
  }).join('') + '</row>').join('');
  return zip({
    '[Content_Types].xml': '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
    '_rels/.rels': '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    'xl/workbook.xml': '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Materiálový výkaz" sheetId="1" r:id="rId1"/></sheets></workbook>',
    'xl/_rels/workbook.xml.rels': '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
    'xl/worksheets/sheet1.xml': '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>' + sheetRows + '</sheetData></worksheet>',
  });
}

export function downloadReport(rows: ExportRows, format: 'csv' | 'xlsx', name: string): void {
  const content = format === 'csv' ? makeCsv(rows) : makeXlsx(rows);
  const blob = new Blob([content as BlobPart], { type: format === 'csv' ? 'text/csv;charset=utf-8' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${name}.${format}`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
