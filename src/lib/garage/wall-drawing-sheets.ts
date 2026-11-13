import { jsPDF } from 'jspdf';
import { ROBOTO_REGULAR_B64 } from './pdfFonts';
import type { WallDrawing } from './wall-drawings';

const width = 297, height = 210;
const ink = '#192839', guide = '#48617a', outline = '#263e58', openingFill = '#dbeafe';
type Line = { kind: 'line'; x: number; y: number; x2: number; y2: number; color: string };
type Label = { kind: 'label'; x: number; y: number; text: string; size: number; centered: boolean };
type Box = { kind: 'box'; x: number; y: number; w: number; h: number; fill: string };
type Page = (Line | Label | Box)[];

function buildSheets(wall: WallDrawing): Page[] {
  const pages: Page[] = [[]];
  let page = pages[0];
  const line = (x: number, y: number, x2: number, y2: number, color = guide) => page.push({ kind: 'line', x, y, x2, y2, color });
  const label = (x: number, y: number, text: string, size = 8, centered = false) => page.push({ kind: 'label', x, y, text, size, centered });
  const header = () => {
    label(12, 14, `${wall.name.toUpperCase()} · POHĽAD ZVONKA`, 13);
    label(12, 21, `Rozmery v mm · X od ľavého rohu · Y od podlahy ±0 · list ${pages.length}`, 8);
    label(12, 27, 'Rozmery podľa konfigurácie · pri tlači sa riaďte číselnými kótami.', 8);
    line(12, 30, 285, 30);
  };
  header();
  const scale = Math.min(225 / wall.width, 72 / wall.height);
  const x = (value: number) => (width - wall.width * scale) / 2 + value * scale;
  const y = (value: number) => 112 - value * scale;
  for (let i = 0; i < wall.outline.length; i++) {
    const [a, b] = wall.outline[i], [c, d] = wall.outline[(i + 1) % wall.outline.length];
    line(x(a), y(b), x(c), y(d), outline);
  }
  if (wall.base > 0) {
    line(x(0), y(0), x(wall.width), y(0));
    for (const edge of [0, wall.width]) line(x(edge), y(wall.base), x(edge), y(0));
  }
  for (const opening of wall.openings) {
    const left = x(opening.x), top = y(opening.y + opening.height);
    page.push({ kind: 'box', x: left, y: top, w: opening.width * scale, h: opening.height * scale, fill: openingFill });
    label(left + opening.width * scale / 2, top + opening.height * scale / 2 + 0.8, opening.mark, 6, true);
  }
  for (const axis of wall.axes) line(x(axis), 113, x(axis), 120);
  line(x(0), 117, x(wall.width), 117);
  const axisIntervals = wall.axes.slice(1).map((axis, i) => axis - wall.axes[i]);
  axisIntervals.forEach((interval, i) => {
    if (interval * scale >= 10) label(x((wall.axes[i] + wall.axes[i + 1]) / 2), 116, String(interval), 7, true);
  });
  line(x(0), 126, x(wall.width), 126);
  for (const edge of [0, wall.width]) line(x(edge), 121, x(edge), 129);
  label(width / 2, 125, String(wall.width), 9, true);
  for (const [dimension, offset] of [[wall.eave, 8], [wall.height, 18]] as const) {
    if (offset === 18 && wall.height === wall.eave) continue;
    const at = x(wall.width) + offset;
    line(at, y(0), at, y(dimension));
    line(at - 2, y(0), at + 2, y(0));
    line(at - 2, y(dimension), at + 2, y(dimension));
    label(at + 1, (y(0) + y(dimension)) / 2, String(dimension), 7);
  }
  label(12, 138, `Výška pri odkvape ${wall.eave} · celková výška ${wall.height} · sokel ${wall.base}`, 8);

  let rowY = 147;
  function writeTable(title: string, headers: string[], columns: number[], rows: string[][]) {
    const tableHead = () => {
      label(12, rowY, title, 10);
      rowY += 6;
      headers.forEach((value, i) => label(columns[i], rowY, value, 8));
      line(12, rowY + 2, 285, rowY + 2);
      rowY += 7;
    };
    const newPage = () => { page = []; pages.push(page); header(); rowY = 39; };
    if (rowY + 18 > 198) newPage();
    tableHead();
    for (const row of rows) {
      if (rowY > 198) { newPage(); tableHead(); }
      row.forEach((value, i) => label(columns[i], rowY, value));
      rowY += 5;
    }
    rowY += 7;
  }
  const category: Record<string, string> = { window: 'Okno', door: 'Dvere', gate: 'Brána', sectional: 'Sekčná brána' };
  if (wall.openings.length) writeTable('Otvory a ich poloha', ['Označenie', 'Typ', 'Pole', 'X vľavo', 'Y dole', 'Šírka', 'Výška', 'X vpravo', 'Y hore'],
    [12, 38, 77, 103, 127, 153, 177, 202, 230], wall.openings.map(o => [o.mark, category[o.category] ?? 'Otvor', o.bayId,
      ...[o.x, o.y, o.width, o.height, o.x + o.width, o.y + o.height].map(String)]));
  else { label(12, rowY, 'Stena bez otvorov.'); rowY += 9; }
  writeTable('Vodorovný kótovací reťazec od ľavého rohu', ['Pole', 'Od X', 'Po X', 'Dĺžka', 'Úsek'], [12, 44, 78, 112, 153],
    wall.fields.flatMap(field => field.chain.map(part => [field.id, String(part.from), String(part.to), String(part.length),
      part.openings.length ? `Priemet ${part.openings.slice(0, 8).join(', ')}${part.openings.length > 8 ? '…' : ''}` : 'Medzera bez otvoru'])));
  return pages;
}

const escape = (value: string) => value.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);

export function renderWallDrawingSvg(wall: WallDrawing): string {
  const pages = buildSheets(wall);
  const content = pages.map((page, index) => `<g transform="translate(0 ${height * index})"><rect width="${width}" height="${height}" fill="white" stroke="${guide}" stroke-width=".3"/>${page.map(item => {
    if (item.kind === 'line') return `<line x1="${item.x}" y1="${item.y}" x2="${item.x2}" y2="${item.y2}" stroke="${item.color}" stroke-width=".25"/>`;
    if (item.kind === 'box') return `<rect x="${item.x}" y="${item.y}" width="${item.w}" height="${item.h}" fill="${item.fill}" stroke="${outline}" stroke-width=".25"/>`;
    return `<text x="${item.x}" y="${item.y}" text-anchor="${item.centered ? 'middle' : 'start'}" font-size="${item.size * 25.4 / 72}" fill="${ink}">${escape(item.text)}</text>`;
  }).join('')}</g>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 ${width} ${height * pages.length}" font-family="Arial, sans-serif">${content}</svg>`;
}

export function createWallDrawingPdf(walls: WallDrawing[]) {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  pdf.addFileToVFS('Roboto-Regular.ttf', ROBOTO_REGULAR_B64);
  pdf.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
  pdf.setFont('Roboto', 'normal');
  pdf.setLineWidth(.25);
  pdf.setTextColor(ink);
  walls.flatMap(buildSheets).forEach((page, index) => {
    if (index) pdf.addPage();
    for (const item of page) {
      if (item.kind === 'line') { pdf.setDrawColor(item.color); pdf.line(item.x, item.y, item.x2, item.y2); }
      else if (item.kind === 'box') { pdf.setFillColor(item.fill); pdf.setDrawColor(outline); pdf.rect(item.x, item.y, item.w, item.h, 'FD'); }
      else { pdf.setFontSize(item.size); pdf.text(item.text, item.x, item.y, { align: item.centered ? 'center' : 'left' }); }
    }
  });
  return pdf;
}
