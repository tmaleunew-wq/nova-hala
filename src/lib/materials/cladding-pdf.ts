import { drawCladdingWallDetail } from './cladding-wall-detail';
import { jsPDF } from 'jspdf';
import { ROBOTO_REGULAR_B64 } from '../garage/pdfFonts';
import type { Point2 } from './geometry';
import type { CladdingPanel, CladdingReport } from './cladding-report';

type Face = CladdingReport['faces'][number];
type Cell = string | number | null;
const margin = 13;
const width = 184;
const ink = '#222222';
const rule = '#c7d2db';
const metric = new Intl.NumberFormat('sk-SK', { maximumFractionDigits: 3 });
const money = new Intl.NumberFormat('sk-SK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const total = <T>(items: T[], amount: (item: T) => number) => items.reduce((sum, item) => sum + amount(item), 0);
const knownTotal = <T>(items: T[], amount: (item: T) => number | null) =>
  items.length && items.every(item => amount(item) != null) ? total(items, item => amount(item)!) : null;
const eur = (value: number | null) => value == null ? null : money.format(value);
const box = (x: number, y: number, w: number, h: number): Point2[] => [[x,y],[x+w,y],[x+w,y+h],[x,y+h]];
const hex = (color: string | undefined, fallback: string) => {
  const value = color?.replace(/^#/, '');
  return value && /^[0-9a-f]{6}$/i.test(value) ? '#' + value : fallback;
};

export function createCladdingPdf(report: CladdingReport) {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  pdf.addFileToVFS('Roboto-Regular.ttf', ROBOTO_REGULAR_B64);
  pdf.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
  pdf.setFont('Roboto');
  pdf.setTextColor(ink);
  pdf.setProperties({ title: 'Súhrnný dokument opláštenia', subject: report.title });
  let y = 17;

  function heading(text: string, size = 12) {
    pdf.setTextColor(ink);
    pdf.setFontSize(size);
    const lines: string[] = pdf.splitTextToSize(text, width);
    pdf.text(lines, margin, y);
    y += lines.length * size * .42 + 2;
  }

  function page(title: string) {
    pdf.addPage();
    y = 17;
    heading(title);
  }

  function table(title: string, columns: string[], widths: number[], rows: Cell[][], footer?: Cell[]) {
    function row(cells: Cell[], header = false, foot = false) {
      const lines = cells.map((cell, i): string[] => pdf.splitTextToSize(
        typeof cell === 'number' ? metric.format(cell) : cell ?? '–', widths[i] - 3,
      ));
      const height = Math.max(...lines.map(line => line.length)) * 3.45 + 2;
      if (y + height > 278 && !header) {
        page(title + ' · pokračovanie');
        pdf.setFontSize(7.5);
        row(columns, true);
      }
      if (header || foot) {
        pdf.setFillColor('#ffffff');
        pdf.rect(margin, y, width, height, 'F');
      }
      let x = margin;
      lines.forEach((line, i) => { pdf.text(line, x + 1.5, y + 3.5); x += widths[i]; });
      y += height;
      pdf.setDrawColor(rule);
      pdf.setLineWidth(.15);
      pdf.line(margin, y, margin + width, y);
    }
    if (y > 253) page(title);
    else heading(title, 10);
    pdf.setFontSize(7.5);
    row(columns, true);
    if (!rows.length) row(['Žiadne položky', ...columns.slice(1).map(() => null)]);
    rows.forEach(cells => row(cells));
    if (footer) row(footer, false, true);
    y += 8;
  }

  function panels(title: string, items: CladdingPanel[], complete: boolean) {
    table(title, ['Panel', 'Farba', 'Dĺžka m', 'Plocha m²/ks', 'Množstvo ks', 'Celková plocha m²', 'Jednotková cena EUR/m²', 'Celková cena EUR'],
      [52, 23, 15, 15, 11, 22, 22, 24],
      items.map(item => [item.product + ', L = ' + Math.round(item.length * 1000) + ' mm', item.color, item.length, item.pieceArea, item.count, item.area, eur(item.unitPrice), eur(item.price)]),
      complete ? ['Celkom', null, null, null, total(items, item => item.count), total(items, item => item.area), null,
        eur(knownTotal(items, item => item.price))] : undefined);
  }

  function stems(title: string, faces: Face[]) {
    const items = faces.flatMap(face => face.stem ? [{ name: face.name, ...face.stem }] : []);
    if (!items.length) return;
    table(title, ['Rovina / materiál', 'Hrúbka m', 'Dĺžka m', 'Výška m', 'Farba', 'Plocha m²', 'Objem m³', 'EUR/m³', 'Cena EUR'],
      [38, 16, 16, 16, 25, 18, 17, 18, 20],
      items.map(item => [item.name + ' / Betón', item.thickness, item.length, item.height, item.color, item.area, item.volume,
        eur(item.unitPrice), eur(item.price)]),
      ['Celkom', null, total(items, item => item.length), null, null, total(items, item => item.area),
        total(items, item => item.volume), null, eur(knownTotal(items, item => item.price))]);
  }

  function polygon(points: Point2[], fill?: string) {
    if (points.length < 3) return;
    if (fill) pdf.setFillColor(fill);
    const steps = points.slice(1).map(([x, py], i) => [x - points[i][0], py - points[i][1]]);
    pdf.lines(steps, points[0][0], points[0][1], [1, 1], fill ? 'FD' : 'S', true);
  }

  function drawFace(face: Face, project: (point: Point2) => Point2, color: string, joints: string) {
    pdf.setLineWidth(.24);
    pdf.setDrawColor('#536578');
    for (const surface of face.surfaces) polygon(surface.polygon.map(project), color);
    pdf.setDrawColor(joints);
    pdf.setLineWidth(.13);
    for (const surface of face.surfaces) {
      for (const strip of surface.strips) {
        const vertical = strip.orientation === 'vertical';
        const length = strip.lengthM;
        const a = project([strip.x, strip.y]);
        const b = project([strip.x + (vertical ? 0 : length), strip.y + (vertical ? length : 0)]);
        pdf.line(...a, ...b);
      }
    }
    pdf.setDrawColor('#536578');
    pdf.setLineWidth(.2);
    for (const piece of face.stem?.pieces ?? []) polygon(box(piece.x, piece.y, piece.width, piece.height).map(project), '#a0aeb8');
    for (const surface of face.surfaces) {
      for (const opening of surface.openings) {
        const xs = surface.polygon.map(point => point[0]);
        const ys = surface.polygon.map(point => point[1]);
        const x = Math.max(opening.x, Math.min(...xs)), z = Math.max(opening.y, Math.min(...ys));
        const w = Math.min(opening.x + opening.width, Math.max(...xs)) - x;
        const h = Math.min(opening.y + opening.height, Math.max(...ys)) - z;
        if (w > 0 && h > 0) polygon(box(x, z, w, h).map(project), '#f9fbfc');
      }
    }
  }

  function isometric() {
    const { width: w, length: l, roofPitchDeg, clearHeight: h, roofType } = report.params;
    const angle = roofPitchDeg * Math.PI / 180;
    const shed = roofType === 'shed';
    const project = (x: number, z: number, height: number): Point2 => [x * .8 + z * .75, x * .36 - z * .42 - height];
    const roofProject = (id: string, [s, z]: Point2): Point2 => {
      const face = report.faces.find(item => item.id === id)!;
      const span = face.surfaces[0].polygon[1][0];
      const depth = face.surfaces[0].polygon[2][1];
      const x = s * Math.cos(angle) - (span * Math.cos(angle) - (shed ? w : w / 2)) / 2;
      const y = shed ? h + x * Math.tan(angle) : h + (id === 'roof-left' ? x : w / 2 - x) * Math.tan(angle);
      return project(id === 'roof-right' ? w / 2 + x : x, l + (depth - l) / 2 - z, y);
    };
    const right = ([x, z]: Point2) => project(w, l - x, z);
    const front = ([x, z]: Point2) => project(w - x, 0, z);
    const visible = report.faces.flatMap(face => {
      const transform = face.roof ? (point: Point2) => roofProject(face.id, point) : face.id === 'right' ? right : face.id === 'front' ? front : null;
      return transform ? [{ face, transform }] : [];
    });
    const points = [...visible.flatMap(({ face, transform }) => face.surfaces.flatMap(surface => surface.polygon.map(transform))),
      project(0, 0, 0), project(w, 0, 0), project(w, l, 0)];
    const xs = points.map(point => point[0]), ys = points.map(point => point[1]);
    const x0 = Math.min(...xs), y0 = Math.min(...ys);
    const dx = Math.max(...xs) - x0, dy = Math.max(...ys) - y0;
    const scale = Math.min(169 / dx, 90 / dy);
    if (!Number.isFinite(scale)) return;
    for (const { face, transform } of visible) drawFace(face, point => {
      const [x, z] = transform(point);
      return [(210 - dx * scale) / 2 + (x - x0) * scale, y + (z - y0) * scale];
    }, face.roof ? hex(report.params.roofColor, '#adb7c0') : hex(report.params.claddingColor, '#dfe6eb'), '#778a9b');
    y += dy * scale + 7;
  }

  function elevation(face: Face) {
    const points = face.surfaces.flatMap(surface => surface.polygon);
    const rotated = face.roof && Math.max(...points.map(point => point[1])) > Math.max(...points.map(point => point[0]));
    const orient = ([x, z]: Point2): Point2 => rotated ? [z, x] : [x, z];
    const oriented = points.map(orient);
    const w = Math.max(...oriented.map(point => point[0])), h = Math.max(...oriented.map(point => point[1]));
    const scale = Math.min(164 / w, 48 / h);
    const x0 = (210 - w * scale) / 2, bottom = y + h * scale + 10;
    drawFace(face, point => {
      const [x, z] = orient(point);
      return [x0 + x * scale, bottom - z * scale];
    }, '#edf2f6', '#879aab');
    pdf.setFontSize(8);
    pdf.setDrawColor('#536578');
    pdf.line(x0, bottom + 3, x0 + w * scale, bottom + 3);
    pdf.line(x0, bottom + 1, x0, bottom + 5);
    pdf.line(x0 + w * scale, bottom + 1, x0 + w * scale, bottom + 5);
    pdf.text(String(Math.round(w * 1000)), 105, bottom + 8, { align: 'center' });
    const dimX = x0 + w * scale + 3;
    pdf.line(dimX, bottom, dimX, bottom - h * scale);
    pdf.line(dimX - 1, bottom, dimX + 1, bottom);
    pdf.line(dimX - 1, bottom - h * scale, dimX + 1, bottom - h * scale);
    pdf.text(String(Math.round(h * 1000)), dimX + 2, bottom - h * scale / 2 + 1);
    pdf.setFontSize(6);
    pdf.text('Kóty v mm', margin, bottom + 12);
    for (const surface of face.surfaces) {
      for (const strip of surface.strips) {
        const vertical = strip.orientation === 'vertical';
        const center = orient([strip.x + (vertical ? strip.widthM : strip.lengthM) / 2,
          strip.y + (vertical ? strip.lengthM : strip.widthM) / 2]);
        const crossSize = strip.widthM * scale;
        if (crossSize < 2.5 || strip.lengthM * scale < 10) continue;
        pdf.setFontSize(Math.min(6, crossSize * 1.2));
        const alongVertical = vertical !== rotated;
        pdf.text(String(Math.round(strip.orderLengthM * 1000)),
          x0 + center[0] * scale, bottom - center[1] * scale,
          { align: 'center', angle: alongVertical ? 90 : 0 });
      }
    }
    y = face.roof ? bottom + 15 : drawCladdingWallDetail(pdf, report, face, x0, bottom, scale, w, h);
  }

  pdf.setDrawColor('#333333');
  pdf.rect(margin, 10, width, 29);
  pdf.setFontSize(14);
  pdf.text('Súhrnný dokument opláštenia', 105, 22, { align: 'center' });
  pdf.setFontSize(8);
  pdf.text('ID ' + (report.projectId ?? '–'), 105, 30, { align: 'center' });
  y = 47;
  heading(report.title, 13);

  if (report.faces.length) isometric();
  const all = report.faces;
  const sumAreas = (items: Face[]): Cell[] => {
    const walls = items.filter(face => !face.roof), roofs = items.filter(face => face.roof);
    return [total(walls, face => face.net), total(roofs, face => face.net),
      walls.length ? knownTotal(walls, face => face.ordered) : 0,
      roofs.length ? knownTotal(roofs, face => face.ordered) : 0,
      total(walls, face => face.holes), total(roofs, face => face.holes),
      total(items, face => face.stem?.area ?? 0)];
  };
  table('Zhrnutie oblastí panelov',
    ['Rovina', 'Čistá plocha stien m²', 'Čistá plocha strechy m²', 'Neorezané panely stien m²',
      'Neorezané panely strechy m²', 'Otvory stien m²', 'Otvory strechy m²', 'Pevné steny m²'],
    [30, 22, 22, 25, 25, 20, 20, 20],
    all.map(face => [face.name, ...sumAreas([face])]),
    all.length ? ['Celková plocha', ...sumAreas(all)] : undefined);
  table('Steny a strecha spolu', ['Čistá plocha m²', 'Neorezané panely m²', 'Otvory m²', 'Pevné steny m²'],
    [46, 46, 46, 46], [[total(all, face => face.net), knownTotal(all, face => face.ordered),
      total(all, face => face.holes), total(all, face => face.stem?.area ?? 0)]]);
  panels('Zoznam použitých panelov', report.panels, all.length > 0 && all.every(face => face.ordered != null));
  stems('Súhrn pevných stien a sokla', all);

  for (const face of all) {
    page((face.roof ? 'Opláštenie a otvory na streche' : 'Opláštenie a otvory na stenách') + ' · ' + face.name);
    elevation(face);
    panels('Panely · ' + face.name, face.panels, face.ordered != null);
    if (face.openings.length) table('Otvory · ' + face.name, ['ID', 'Pole', 'Typ', 'Šírka m', 'Výška m', 'Plocha m²'],
      [39, 23, 50, 24, 24, 24],
      face.openings.map((opening, index) => [`O${index + 1} · ${opening.id}`, opening.bayId, opening.category + ' / ' + opening.subtype, opening.width, opening.height, opening.area]));
    stems('Pevné steny a sokel · ' + face.name, [face]);
  }

  if (report.notes.length) table('Poznámky k výpočtu', ['Rozsah a podmienky'], [width], report.notes.map(note => [note]));

  for (let i = 1; i <= pdf.getNumberOfPages(); i++) {
    pdf.setPage(i);
    pdf.setDrawColor(rule);
    pdf.line(margin, 284, margin + width, 284);
    pdf.setFontSize(8);
    pdf.text('Výkaz opláštenia', margin, 289);
    pdf.text(i + ' / ' + pdf.getNumberOfPages(), margin + width, 289, { align: 'right' });
  }
  return pdf;
}
