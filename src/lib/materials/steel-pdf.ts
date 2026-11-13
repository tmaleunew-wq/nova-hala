import { jsPDF } from 'jspdf';
import { ROBOTO_REGULAR_B64, ROBOTO_BOLD_B64 } from '../garage/pdfFonts';
import type { SteelReport, SteelRow } from './steel-report';
import { steelRoleNames } from './steel-report';

const margin = 12;
const width = 186;
const number = new Intl.NumberFormat('sk-SK', { maximumFractionDigits: 3 });
const money = new Intl.NumberFormat('sk-SK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
type Cell = string | number | null;
const formatMoney = (value: number | null) => value == null ? null : money.format(value);
const sum = (items: SteelRow[], key: 'count' | 'length' | 'volume' | 'mass' | 'surface' | 'price') =>
  items.length && items.every(item => item[key] != null) ? items.reduce((total, item) => total + item[key]!, 0) : null;

export function createSteelPdf(report: SteelReport) {
  const primary = report.kind === 'primary';
  const title = primary ? 'Dokument primárnej konštrukcie' : 'Výkaz sekundárnej konštrukcie';
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  pdf.addFileToVFS('Roboto-Regular.ttf', ROBOTO_REGULAR_B64);
  pdf.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
  pdf.addFileToVFS('Roboto-Bold.ttf', ROBOTO_BOLD_B64);
  pdf.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');
  pdf.setFont('Roboto');
  pdf.setTextColor('#203446');
  pdf.setProperties({ title, subject: report.title });
  let y = 18;

  function heading(text: string, size = 12) {
    pdf.setFontSize(size);
    const lines: string[] = pdf.splitTextToSize(text, width);
    pdf.text(lines, margin, y);
    y += lines.length * size * .42 + 3;
  }
  function newPage() {
    pdf.addPage();
    y = 18;
  }

  function drawing(members: SteelReport['members'], context: SteelReport['members'] = [], maxHeight = 80, elevation = false) {
    const all = [...context, ...members];
    if (!all.length) return;
    const project = ([x, h, z]: number[]) => elevation ? [x, -h] : [x * .8 + z * .73, x * .36 - z * .43 - h];
    const points = all.flatMap(item => [project(item.from), project(item.to)]);
    const xs = points.map(point => point[0]), ys = points.map(point => point[1]);
    const left = Math.min(...xs), top = Math.min(...ys);
    const w = Math.max(...xs) - left, h = Math.max(...ys) - top;
    const scale = Math.min(168 / (w || 1), maxHeight / (h || 1));
    const offset = (210 - w * scale) / 2;
    function lines(items: SteelReport['members'], color: string, weight: number) {
      pdf.setDrawColor(color);
      pdf.setLineWidth(weight);
      for (const item of items) {
        const [x, a] = project(item.from), [end, b] = project(item.to);
        const x1 = offset + (x - left) * scale, y1 = y + (a - top) * scale;
        const x2 = offset + (end - left) * scale, y2 = y + (b - top) * scale;
        if (primary) {
          const thickness = Math.max(.7, Math.min(3, report.params.profileSize * scale));
          pdf.setDrawColor('#555555');
          pdf.setLineWidth(thickness);
          pdf.line(x1, y1, x2, y2);
          pdf.setDrawColor('#b8b8b8');
          pdf.setLineWidth(thickness * .6);
          pdf.line(x1, y1, x2, y2);
        } else pdf.line(x1, y1, x2, y2);
      }
    }
    lines(context, '#c9d2d9', .26);
    lines(members, '#415971', .48);
    if (elevation) {
      pdf.setDrawColor('#888888');
      pdf.setLineWidth(.15);
      pdf.setFontSize(8);
      const bottom = y + h * scale;
      const dimensionY = bottom + 8;
      const axes = [...new Set(members.filter(item => ['column', 'gableColumn', 'centerColumn'].includes(item.role)).map(item => item.from[0]))].sort((a,b) => a-b);
      for (let i = 1; i < axes.length; i++) {
        const x1 = offset + (axes[i-1] - left) * scale, x2 = offset + (axes[i] - left) * scale;
        pdf.line(x1, dimensionY, x2, dimensionY);
        pdf.line(x1, dimensionY - 2, x1, dimensionY + 2);
        pdf.line(x2, dimensionY - 2, x2, dimensionY + 2);
        pdf.text(String(Math.round((axes[i]-axes[i-1])*1000)), (x1+x2)/2, dimensionY-2, {align:'center'});
      }
      for (const item of members.filter(item => ['column','gableColumn','centerColumn'].includes(item.role))) {
        const x = offset + (item.from[0] - left) * scale + (item.from[0] === axes[0] ? -9 : 9);
        const y1 = y + (-item.from[1]-top)*scale, y2 = y + (-item.to[1]-top)*scale;
        pdf.line(x,y1,x,y2);
        pdf.line(x-2,y1,x+2,y1);
        pdf.line(x-2,y2,x+2,y2);
        pdf.text(String(Math.round(item.lengthM*1000)), x-2, (y1+y2)/2, {angle:90});
      }
      pdf.text('Kóty v mm', margin, bottom + 16);
    }
    y += h * scale + (elevation ? 23 : 12);
  }

  function table(name: string, rows: SteelRow[]) {
    const columns = primary
      ? ['Názov', 'Materiál', 'Objem položky m³', 'Hmotnosť položky kg', 'Povrch položky m²', 'Množstvo ks', 'Objem m³', 'Váha kg', 'Povrch m²', 'Jednotková cena EUR/ks', 'Celková cena EUR']
      : ['Prvok / profil', 'Materiál', 'Dĺžka m', 'Objem m³', 'Hmotnosť kg', 'EUR/m', 'Cena EUR'];
    const widths = primary ? [39, 14, 15, 17, 17, 12, 14, 15, 14, 14, 15] : [55, 25, 22, 21, 23, 18, 22];
    function row(cells: Cell[], style: 'head' | 'body' | 'total') {
      const lines = cells.map((cell, index): string[] =>
        pdf.splitTextToSize(typeof cell === 'number' ? number.format(cell) : cell ?? '–', widths[index] - 2.4),
      );
      const height = Math.max(...lines.map(line => line.length)) * 3 + 2.4;
      if (y + height > 276 && style !== 'head') {
        newPage();
        heading(name + ' · pokračovanie');
        pdf.setFontSize(7.2);
        row(columns, 'head');
      }
      if (style === 'total') {
        pdf.setFont('Roboto', 'bold');
        pdf.setFillColor('#ecfdf5');
        pdf.rect(margin, y, width, height, 'F');
        pdf.setTextColor('#065f46');
      } else if (style === 'head') {
        pdf.setFont('Roboto', 'bold');
        pdf.setFillColor('#e5edf4');
        pdf.rect(margin, y, width, height, 'F');
        pdf.setTextColor('#203446');
      } else {
        pdf.setFont('Roboto', 'normal');
        pdf.setTextColor('#203446');
      }
      let x = margin;
      lines.forEach((line, index) => {
        pdf.text(line, x + 1.2, y + 3.35);
        x += widths[index];
      });
      y += height;
      if (style === 'total') {
        pdf.setLineWidth(.35);
        pdf.setDrawColor('#10b981');
      } else {
        pdf.setLineWidth(.15);
        pdf.setDrawColor('#c6d2dc');
      }
      pdf.line(margin, y, margin + width, y);
      pdf.setFont('Roboto', 'normal');
      pdf.setTextColor('#203446');
    }
    if (y > 245) newPage();
    heading(name, 11);
    pdf.setFontSize(7.2);
    row(columns, 'head');
    if (!rows.length) row(['Žiadne evidované položky', ...columns.slice(1).map(() => null)], 'body');
    for (const item of rows) {
      const label = steelRoleNames[item.role] + ' · ' + item.name;
      row(primary
        ? [label + '-' + Math.round(item.length / item.count * 1000), item.material, item.pieceVolume, item.pieceMass, item.pieceSurface, item.count,
            item.volume, item.mass, item.surface, formatMoney(item.price == null ? null : item.price / item.count), formatMoney(item.price)]
        : [label, item.material, item.length, item.volume, item.mass, formatMoney(item.unitPrice), formatMoney(item.price)], 'body');
    }
    if (rows.length) row(primary
      ? ['Celkový súčet', null, null, null, null, sum(rows, 'count'), sum(rows, 'volume'), sum(rows, 'mass'), sum(rows, 'surface'), null, formatMoney(sum(rows, 'price'))]
      : ['Celkový súčet', null, sum(rows, 'length'), sum(rows, 'volume'), sum(rows, 'mass'), null, formatMoney(sum(rows, 'price'))], 'total');
    y += 10;
  }

  if (primary) {
    pdf.setDrawColor('#444444');
    pdf.rect(margin, 10, width, 29);
    pdf.setFontSize(14);
    pdf.text(title, 105, 21, { align: 'center' });
    pdf.setFontSize(8);
    pdf.text('ID ' + (report.id ?? '–'), 105, 28, { align: 'center' });
    y = 46;
  } else heading(title, 19);
  heading(report.title, 13);
  if (report.id) heading('ID ' + report.id, 9);
  drawing(report.members, report.context, primary ? 112 : 80);
  table(primary ? 'Výkaz materiálu · primárna konštrukcia' : 'Celkový výkaz sekundárnej konštrukcie', report.summary);
  if (primary) {
    table('Výkaz materiálu · stuženie', report.bracing);
    if (report.frames.length) {
      newPage();
      heading('Výkaz materiálu · rámy');
      report.frames.forEach((frame, index) => {
        if (index > 0) newPage();
        heading('Primárny rám ' + (index + 1) + ' · ' + frame.count + ' ks', 11);
        drawing(frame.members, [], 78, true);
        table('Prvky jedného rámu', frame.rows);
      });
    }
  } else if (report.members.length) {
    newPage();
    heading('Stenové a strešné roviny');
    for (const plane of report.planes) table(plane.name, plane.rows);
  }

  if (report.notes.length) {
    if (y > 240) newPage();
    heading('Poznámky', 11);
    for (const note of report.notes) {
      if (y > 264) newPage();
      heading(note, 8);
    }
  }
  for (let i = 1; i <= pdf.getNumberOfPages(); i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setDrawColor('#c6d2dc');
    pdf.line(margin, 283, 210 - margin, 283);
    pdf.text(title, margin, 289);
    pdf.text(i + ' / ' + pdf.getNumberOfPages(), 210 - margin, 289, { align: 'right' });
  }
  return pdf;
}
