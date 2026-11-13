import { calculateWallDrawings } from './wall-drawings';
import { createWallDrawingPdf, renderWallDrawingSvg } from './wall-drawing-sheets';

import { jsPDF } from "jspdf";
import type { GarageParams } from "./types";
import { ROBOTO_REGULAR_B64, ROBOTO_BOLD_B64 } from "./pdfFonts";
import { generateGarageDxf } from "./dxfGenerator";

export type DrawingViewType =
  | "plan"
  | "front"
  | "rear"
  | "side_left"
  | "side_right"
  | "section_cross"
  | "section_long"
  | "frames_scheme";

export interface DrawingDefinition {
  id: DrawingViewType;
  title: string;
  subtitle: string;
  scale: string;
  description: string;
}

export const DRAWING_DEFINITIONS: DrawingDefinition[] = [
  {
    id: "plan",
    title: "1. PÔDORYS HALY A RASTROVÁ SIEŤ",
    subtitle: "Pôdorysná schéma nosných stĺpov, osí, otvorov a kót",
    scale: "1:100",
    description: "Koncepčný pôdorys s vyznačením modulových osí 1..N, A, B, rozostupov rámov a otvorov.",
  },
  {
    id: "front",
    title: "2. PREDNÝ POHĽAD (HLAVNÁ FASÁDA)",
    subtitle: "Štítový pohľad s odkvapovou a hrebeňovou kótou",
    scale: "1:100",
    description: "Zobrazenie predného štítu, sklonu strechy, výšky odkvapu a otvorov sekcionálnych brán.",
  },
  {
    id: "rear",
    title: "3. ZADNÝ POHĽAD",
    subtitle: "Štítový pohľad zadnej steny s opláštením",
    scale: "1:100",
    description: "Zobrazenie zadnej štítovej steny a napojenia strešných panelov.",
  },
  {
    id: "side_left",
    title: "4. BOČNÝ POHĽAD ĽAVÝ",
    subtitle: "Pozdĺžny pohľad s vyznačením konštrukčných polí",
    scale: "1:100",
    description: "Pohľad na ľavú pozdĺžnu stenu s oknami, dverami a modulovým členením.",
  },
  {
    id: "side_right",
    title: "5. BOČNÝ POHĽAD PRAVÝ",
    subtitle: "Pozdĺžny pohľad pravej steny",
    scale: "1:100",
    description: "Pohľad na pravú pozdĺžnu fasádu s prípadnou administratívnou vstavbou alebo prístavkom.",
  },
  {
    id: "section_cross",
    title: "6. PRIEČNY REZ KONŠTRUKCIOU (A-A)",
    subtitle: "Typický nosný portálový rám",
    scale: "1:75",
    description: "Rez hlavným oceľovým rámom: stĺpy, priečle, nábehy, väznice, svetlá výška a sklon.",
  },
  {
    id: "section_long",
    title: "7. POZDĹŽNY REZ HALOU (B-B)",
    subtitle: "Pozdĺžny rez radom rámov a zavetrením",
    scale: "1:100",
    description: "Rez v pozdĺžnej osi zobrazujúci rámy, väznice, paždíky a zavetrovacie polia.",
  },
  {
    id: "frames_scheme",
    title: "8. SCHÉMA RÁMOV A PLÁN OPLÁŠTENIA",
    subtitle: "Kladenie sendvičových panelov a poloha väzníc",
    scale: "1:100",
    description: "Technická schéma modulového kladenia fasádnych a strešných panelov a rozmiestnenia väzníc.",
  },
];

export interface DrawingOptions {
  openings?: Array<{
    id: string;
    bayId: string;
    category: string;
    subtype?: string;
    width: number;
    height: number;
    x: number;
    y: number;
  }>;
  templateId?: string;
  theme?: "dark" | "light";
}

/**
 * Generates an SVG string representation of a specific technical drawing view.
 */
function projectWallViews(p: GarageParams, options?: DrawingOptions) {
  if (options?.openings === undefined) return undefined;
  return calculateWallDrawings({ schemaVersion: 1, templateId: options.templateId ?? 'prazdna_hala', params: p,
    openings: options.openings.map(opening => ({ ...opening, subtype: opening.subtype ?? '', frameColor: '', fillColor: '' })) });
}
const elevationIds: Partial<Record<DrawingViewType, string>> = { front: 'front', rear: 'back', side_left: 'left', side_right: 'right' };

export function generateDrawingSvg(view: DrawingViewType, p: GarageParams, options?: DrawingOptions): string {
  const wall = projectWallViews(p, options)?.walls.find(item => item.id === elevationIds[view]);
  if (wall) return renderWallDrawingSvg(wall);
  const W = p.width ?? 16;
  const L = p.length ?? 30;
  const H = p.clearHeight ?? 6;
  const pitchRad = ((p.roofPitchDeg ?? 10) * Math.PI) / 180;
  const templateId = options?.templateId || "";
  const isDoubleSpan = templateId === "dvojlodna_hala" || !!p.hasCenterColumns;
  const isSideCanopy = templateId === "budova_pristresok";
  const isProdWithOffice = templateId === "vyrobna_hala";
  const isBothLeans = templateId === "budova_pristavky";
  const hasSkylight =
    templateId === "skladovacia_hala_svetlik" ||
    templateId === "budova_pristresok" ||
    templateId === "dvojlodna_hala" ||
    !!p.hasRidgeSkylight;

  const Hridge = isDoubleSpan
    ? H + (W / 4) * Math.tan(pitchRad)
    : H + (W / 2) * Math.tan(pitchRad);
  const bayCount = Math.max(2, p.bayCount ?? Math.round(L / 6));
  const bayLen = L / bayCount;
  const customOpenings = options?.openings || [];
  const isLight = options?.theme === "light";

  // Helper: Horizontal dimension line with extension lines & 45° architectural ticks
  const svgDimH = (x1: number, x2: number, yRef: number, yDim: number, label: string, color = "#e2e8f0") => {
    const dir = yDim >= yRef ? 1 : -1;
    const midX = (x1 + x2) / 2;
    return `
      <line x1="${x1}" y1="${yRef + dir * 3}" x2="${x1}" y2="${yDim + dir * 5}" stroke="${color}" stroke-width="0.7" stroke-opacity="0.65"/>
      <line x1="${x2}" y1="${yRef + dir * 3}" x2="${x2}" y2="${yDim + dir * 5}" stroke="${color}" stroke-width="0.7" stroke-opacity="0.65"/>
      <line x1="${x1}" y1="${yDim}" x2="${x2}" y2="${yDim}" stroke="${color}" stroke-width="1"/>
      <line x1="${x1 - 3.5}" y1="${yDim + 3.5}" x2="${x1 + 3.5}" y2="${yDim - 3.5}" stroke="${color}" stroke-width="1.4"/>
      <line x1="${x2 - 3.5}" y1="${yDim + 3.5}" x2="${x2 + 3.5}" y2="${yDim - 3.5}" stroke="${color}" stroke-width="1.4"/>
      <text x="${midX}" y="${yDim - 4}" fill="${color}" font-size="9.5" font-family="monospace" font-weight="bold" text-anchor="middle">${label}</text>
    `;
  };

  // Helper: Vertical dimension line with extension lines & 45° architectural ticks
  const svgDimV = (y1: number, y2: number, xRef: number, xDim: number, label: string, color = "#e2e8f0") => {
    const dir = xDim >= xRef ? 1 : -1;
    const midY = (y1 + y2) / 2;
    return `
      <line x1="${xRef + dir * 3}" y1="${y1}" x2="${xDim + dir * 5}" y2="${y1}" stroke="${color}" stroke-width="0.7" stroke-opacity="0.65"/>
      <line x1="${xRef + dir * 3}" y1="${y2}" x2="${xDim + dir * 5}" y2="${y2}" stroke="${color}" stroke-width="0.7" stroke-opacity="0.65"/>
      <line x1="${xDim}" y1="${y1}" x2="${xDim}" y2="${y2}" stroke="${color}" stroke-width="1"/>
      <line x1="${xDim - 3.5}" y1="${y1 + 3.5}" x2="${xDim + 3.5}" y2="${y1 - 3.5}" stroke="${color}" stroke-width="1.4"/>
      <line x1="${xDim - 3.5}" y1="${y2 + 3.5}" x2="${xDim + 3.5}" y2="${y2 - 3.5}" stroke="${color}" stroke-width="1.4"/>
      <text x="${xDim + dir * 8}" y="${midY + 3}" fill="${color}" font-size="9.5" font-family="monospace" font-weight="bold" text-anchor="${dir > 0 ? "start" : "end"}">${label}</text>
    `;
  };

  // Helper: Architectural Elevation Level Marker (±0.000, +4.500)
  const svgElevMark = (x: number, y: number, elevMeters: number, align: "left" | "right" = "left") => {
    const sign = elevMeters === 0 ? "±" : elevMeters > 0 ? "+" : "";
    const txt = `${sign}${elevMeters.toFixed(3)}`;
    const dir = align === "left" ? -1 : 1;
    return `
      <line x1="${x}" y1="${y}" x2="${x + dir * 26}" y2="${y}" stroke="#38bdf8" stroke-width="0.9"/>
      <polygon points="${x + dir * 5},${y} ${x + dir * 11},${y - 6} ${x + dir * 17},${y}" fill="none" stroke="#38bdf8" stroke-width="1"/>
      <line x1="${x + dir * 11}" y1="${y - 6}" x2="${x + dir * 26}" y2="${y - 6}" stroke="#38bdf8" stroke-width="0.9"/>
      <text x="${x + dir * 25}" y="${y - 9}" fill="#38bdf8" font-size="8.5" font-family="monospace" font-weight="bold" text-anchor="${align === "left" ? "start" : "end"}">${txt}</text>
    `;
  };

  const svgW = 900;
  const svgH = 580;
  const margin = 50;

  // Header and title block metadata
  const titleDef = DRAWING_DEFINITIONS.find((d) => d.id === view) || DRAWING_DEFINITIONS[0];
  const modelName = p.hallType || "VBAU OCEĽOVÁ HALA";
  const dateStr = new Date().toLocaleDateString("sk-SK");

  let content = "";

  if (view === "plan") {
    // 1. FLOOR PLAN
    const scale = Math.min((svgW - 200) / W, (svgH - 220) / L) * 0.85;
    const drawW = W * scale;
    const drawL = L * scale;
    const ox = 120 + ((svgW - 240) - drawW) / 2;
    const oy = 90 + ((svgH - 200) - drawL) / 2;

    // Grid Axes lines
    for (let b = 0; b <= bayCount; b++) {
      const y = oy + b * bayLen * scale;
      // Axis line
      content += `<line x1="${ox - 45}" y1="${y}" x2="${ox + drawW + 45}" y2="${y}" stroke="#64748b" stroke-width="0.8" stroke-dasharray="6,4"/>`;
      // Axis bubble (1, 2, 3...)
      content += `<circle cx="${ox - 52}" cy="${y}" r="10" fill="#0f172a" stroke="#38bdf8" stroke-width="1.2"/>`;
      content += `<text x="${ox - 52}" y="${y + 3.5}" fill="#ffffff" font-size="9.5" font-family="monospace" font-weight="bold" text-anchor="middle">${b + 1}</text>`;
      // Dimension between bays
      if (b < bayCount) {
        const nextY = oy + (b + 1) * bayLen * scale;
        content += svgDimV(y, nextY, ox, ox - 22, `${bayLen.toFixed(1)}m`, "#94a3b8");
      }
    }

    // Axes A, (B for double-span), B/C
    content += `<line x1="${ox}" y1="${oy - 45}" x2="${ox}" y2="${oy + drawL + 45}" stroke="#64748b" stroke-width="0.8" stroke-dasharray="6,4"/>`;
    content += `<circle cx="${ox}" cy="${oy - 52}" r="10" fill="#0f172a" stroke="#38bdf8" stroke-width="1.2"/>`;
    content += `<text x="${ox}" y="${oy - 48.5}" fill="#ffffff" font-size="9.5" font-family="monospace" font-weight="bold" text-anchor="middle">A</text>`;

    if (isDoubleSpan) {
      const midX = ox + drawW / 2;
      content += `<line x1="${midX}" y1="${oy - 45}" x2="${midX}" y2="${oy + drawL + 45}" stroke="#64748b" stroke-width="0.8" stroke-dasharray="6,4"/>`;
      content += `<circle cx="${midX}" cy="${oy - 52}" r="10" fill="#0f172a" stroke="#38bdf8" stroke-width="1.2"/>`;
      content += `<text x="${midX}" y="${oy - 48.5}" fill="#ffffff" font-size="9.5" font-family="monospace" font-weight="bold" text-anchor="middle">B</text>`;
    }

    content += `<line x1="${ox + drawW}" y1="${oy - 45}" x2="${ox + drawW}" y2="${oy + drawL + 45}" stroke="#64748b" stroke-width="0.8" stroke-dasharray="6,4"/>`;
    content += `<circle cx="${ox + drawW}" cy="${oy - 52}" r="10" fill="#0f172a" stroke="#38bdf8" stroke-width="1.2"/>`;
    content += `<text x="${ox + drawW}" y="${oy - 48.5}" fill="#ffffff" font-size="9.5" font-family="monospace" font-weight="bold" text-anchor="middle">${isDoubleSpan ? "C" : "B"}</text>`;

    // Side canopy / lean-to footprint
    if (isSideCanopy || isBothLeans) {
      const cw = (p.canopyWidth || 4.5) * scale;
      content += `<rect x="${ox - cw}" y="${oy}" width="${cw}" height="${drawL}" fill="#1e293b" fill-opacity="0.2" stroke="#38bdf8" stroke-width="1.2" stroke-dasharray="5,3"/>`;
    }
    if (isProdWithOffice || isBothLeans) {
      const lw = 5.0 * scale;
      const lLen = (isProdWithOffice ? Math.min(3, bayCount) * bayLen : L) * scale;
      content += `<rect x="${ox + drawW}" y="${oy}" width="${lw}" height="${lLen}" fill="#1e293b" fill-opacity="0.3" stroke="#38bdf8" stroke-width="1.5"/>`;
    }

    // Wall perimeter
    content += `<rect x="${ox}" y="${oy}" width="${drawW}" height="${drawL}" fill="#1e293b" fill-opacity="0.4" stroke="#f8fafc" stroke-width="2.5"/>`;

    // Skylight outline in plan
    if (hasSkylight) {
      const sw = Math.min(3.0, W * 0.2) * scale;
      content += `<rect x="${ox + (drawW - sw) / 2}" y="${oy + bayLen * 0.5 * scale}" width="${sw}" height="${drawL - bayLen * scale}" fill="#0c4a6e" fill-opacity="0.35" stroke="#38bdf8" stroke-width="1" stroke-dasharray="4,2"/>`;
    }

    // Columns
    const colSize = 8;
    for (let b = 0; b <= bayCount; b++) {
      const y = oy + b * bayLen * scale;
      content += `<rect x="${ox - colSize / 2}" y="${y - colSize / 2}" width="${colSize}" height="${colSize}" fill="#38bdf8" stroke="#0284c7" stroke-width="1"/>`;
      content += `<rect x="${ox + drawW - colSize / 2}" y="${y - colSize / 2}" width="${colSize}" height="${colSize}" fill="#38bdf8" stroke="#0284c7" stroke-width="1"/>`;
      if (isDoubleSpan) {
        content += `<rect x="${ox + drawW / 2 - colSize / 2}" y="${y - colSize / 2}" width="${colSize}" height="${colSize}" fill="#38bdf8" stroke="#0284c7" stroke-width="1"/>`;
      }
    }

    // Front Gate
    const gateW = (p.doorWidth ?? 4.0) * scale;
    const gateX = ox + (drawW - gateW) / 2;
    content += `<rect x="${gateX}" y="${oy - 4}" width="${gateW}" height="8" fill="#10b981" stroke="#059669" stroke-width="1.5"/>`;
    content += `<text x="${gateX + gateW / 2}" y="${oy - 10}" fill="#34d399" font-size="9" font-weight="bold" text-anchor="middle">SEKCIONÁLNA BRÁNA ${(p.doorWidth ?? 4.0).toFixed(1)}m</text>`;

    // Custom side openings in floor plan
    customOpenings.forEach((op) => {
      const [prefix, idxStr] = op.bayId.split("-");
      const bIdx = Math.max(0, (parseInt(idxStr, 10) || 1) - 1);
      if (prefix === "A" || prefix === "C") {
        const wallX = prefix === "A" ? ox : ox + drawW;
        const startY = oy + (bIdx * bayLen + op.x) * scale;
        const lenPx = op.width * scale;
        const fillC = op.category === "window" ? "#38bdf8" : "#10b981";
        content += `<rect x="${wallX - 3}" y="${startY}" width="6" height="${lenPx}" fill="${fillC}" stroke="#f8fafc" stroke-width="0.8"/>`;
      }
    });

    // Overall dimension lines with ticks
    content += svgDimH(ox, ox + drawW, oy, oy - 24, `ŠÍRKA W = ${W.toFixed(2)} m`, "#f8fafc");
    content += svgDimV(oy, oy + drawL, ox + drawW, ox + drawW + 28, `DĹŽKA L = ${L.toFixed(2)} m`, "#f8fafc");
  } else if (view === "front" || view === "rear") {
    // 2 & 3. FRONT / REAR ELEVATION
    const scale = Math.min((svgW - 200) / W, (svgH - 220) / Hridge) * 0.82;
    const drawW = W * scale;
    const drawH = H * scale;
    const drawHridge = Hridge * scale;
    const ox = 120 + ((svgW - 240) - drawW) / 2;
    const groundY = svgH - 120;

    // Ground line
    content += `<line x1="${ox - 60}" y1="${groundY}" x2="${ox + drawW + 60}" y2="${groundY}" stroke="#64748b" stroke-width="2"/>`;

    // Gable wall shape
    const topEaveY = groundY - drawH;
    const topRidgeY = groundY - drawHridge;
    const apexX = ox + drawW / 2;
    const path = isDoubleSpan
      ? `M ${ox} ${groundY} L ${ox} ${topEaveY} L ${ox + drawW * 0.25} ${topRidgeY} L ${apexX} ${topEaveY} L ${ox + drawW * 0.75} ${topRidgeY} L ${ox + drawW} ${topEaveY} L ${ox + drawW} ${groundY} Z`
      : `M ${ox} ${groundY} L ${ox} ${topEaveY} L ${apexX} ${topRidgeY} L ${ox + drawW} ${topEaveY} L ${ox + drawW} ${groundY} Z`;
    content += `<path d="${path}" fill="#1e293b" fill-opacity="0.5" stroke="#f8fafc" stroke-width="2"/>`;

    // Horizontal sandwich panel lines every 1m
    for (let yM = 1.0; yM < H; yM += 1.0) {
      const py = groundY - yM * scale;
      content += `<line x1="${ox}" y1="${py}" x2="${ox + drawW}" y2="${py}" stroke="#475569" stroke-width="0.8"/>`;
    }

    // Skylight on ridge
    if (hasSkylight && !isDoubleSpan) {
      const sw = Math.min(3.0, W * 0.2) * scale;
      const sh = 0.45 * scale;
      content += `<polygon points="${apexX - sw / 2},${topRidgeY + sh * 0.5} ${apexX},${topRidgeY - sh} ${apexX + sw / 2},${topRidgeY + sh * 0.5}" fill="#0c4a6e" stroke="#38bdf8" stroke-width="1.2"/>`;
    }

    // Gate in front view
    if (view === "front") {
      const gateW = (p.doorWidth ?? 4.0) * scale;
      const gateH = (p.doorHeight ?? 4.25) * scale;
      const gateX = ox + (drawW - gateW) / 2;
      const gateY = groundY - gateH;
      content += `<rect x="${gateX}" y="${gateY}" width="${gateW}" height="${gateH}" fill="#334155" stroke="#38bdf8" stroke-width="1.8"/>`;
      // Gate panels
      for (let gy = gateY + gateH / 4; gy < groundY; gy += gateH / 4) {
        content += `<line x1="${gateX}" y1="${gy}" x2="${gateX + gateW}" y2="${gy}" stroke="#64748b" stroke-width="1"/>`;
      }
      content += `<text x="${gateX + gateW / 2}" y="${gateY + gateH / 2 + 4}" fill="#e2e8f0" font-size="10" font-weight="bold" font-family="monospace" text-anchor="middle">${(p.doorWidth ?? 4).toFixed(1)} × ${(p.doorHeight ?? 4.25).toFixed(1)} m</text>`;
    }

    // Ridge cap
    content += `<rect x="${apexX - 16}" y="${topRidgeY - 4}" width="32" height="7" fill="#38bdf8" stroke="#0284c7" stroke-width="1"/>`;

    // Elevation markers & Dimensions
    content += svgElevMark(ox - 8, groundY, 0, "left");
    content += svgElevMark(ox - 8, topEaveY, H, "left");
    content += svgElevMark(ox + drawW + 8, topRidgeY, Hridge, "right");

    content += svgDimV(topEaveY, groundY, ox, ox - 48, `H = ${H.toFixed(2)}m`, "#e2e8f0");
    content += svgDimV(topRidgeY, groundY, ox + drawW, ox + drawW + 48, `H_hrebeň = ${Hridge.toFixed(2)}m`, "#38bdf8");
    content += svgDimH(ox, ox + drawW, groundY, groundY + 26, `ROZPON W = ${W.toFixed(2)} m · SKLON ${p.roofPitchDeg ?? 10}°`, "#f8fafc");
  } else if (view === "side_left" || view === "side_right") {
    // 4 & 5. SIDE ELEVATIONS
    const scale = Math.min((svgW - 200) / L, (svgH - 220) / Hridge) * 0.85;
    const drawL = L * scale;
    const drawH = H * scale;
    const drawHridge = Hridge * scale;
    const ox = 120 + ((svgW - 240) - drawL) / 2;
    const groundY = svgH - 120;
    const topY = groundY - drawH;
    const ridgeY = groundY - drawHridge;

    content += `<line x1="${ox - 40}" y1="${groundY}" x2="${ox + drawL + 40}" y2="${groundY}" stroke="#64748b" stroke-width="2"/>`;
    content += `<rect x="${ox}" y="${ridgeY}" width="${drawL}" height="${drawHridge - drawH}" fill="#1e293b" fill-opacity="0.25" stroke="#475569" stroke-width="1"/>`;
    if (hasSkylight) {
      const skH = 0.4 * scale;
      content += `<rect x="${ox + bayLen * 0.5 * scale}" y="${ridgeY - skH}" width="${drawL - bayLen * scale}" height="${skH}" fill="#0c4a6e" fill-opacity="0.6" stroke="#38bdf8" stroke-width="1"/>`;
    }
    content += `<rect x="${ox}" y="${topY}" width="${drawL}" height="${drawH}" fill="#1e293b" fill-opacity="0.5" stroke="#f8fafc" stroke-width="2"/>`;

    // Horizontal panel seams
    for (let yM = 1.0; yM < H; yM += 1.0) {
      const py = groundY - yM * scale;
      content += `<line x1="${ox}" y1="${py}" x2="${ox + drawL}" y2="${py}" stroke="#475569" stroke-width="0.6" stroke-opacity="0.6"/>`;
    }

    // Dynamic or template side openings
    const sidePrefix = view === "side_left" ? "A" : "C";
    const sideCustom = customOpenings.filter((o) => o.bayId.startsWith(`${sidePrefix}-`));
    if (sideCustom.length > 0) {
      sideCustom.forEach((op) => {
        const bIdx = Math.max(0, (parseInt(op.bayId.split("-")[1], 10) || 1) - 1);
        const xPx = ox + (bIdx * bayLen + op.x) * scale;
        const wPx = op.width * scale;
        const hPx = op.height * scale;
        const yPx = groundY - (op.y + op.height) * scale;
        const fillC = op.category === "window" ? "#0c4a6e" : "#334155";
        content += `<rect x="${xPx}" y="${yPx}" width="${wPx}" height="${hPx}" fill="${fillC}" stroke="#38bdf8" stroke-width="1.3"/>`;
        content += `<text x="${xPx + wPx / 2}" y="${yPx + hPx / 2 + 3}" fill="#e2e8f0" font-size="8" font-family="monospace" text-anchor="middle">${op.width.toFixed(1)}×${op.height.toFixed(1)}</text>`;
      });
    } else {
      for (let b = 0; b < bayCount; b++) {
        const bx = ox + b * bayLen * scale;
        if (
          templateId === "skladovacia_hala" ||
          templateId === "skladovacia_hala_svetlik" ||
          templateId === "kancelarska_budova" ||
          (p.windowBays || []).includes(b)
        ) {
          if (b % 2 === 0 || templateId === "skladovacia_hala_svetlik") {
            const ww = Math.min(4.0, bayLen * 0.7) * scale;
            const wh = 1.0 * scale;
            const wx = bx + (bayLen * scale - ww) / 2;
            const wy = groundY - (H - 1.1) * scale;
            content += `<rect x="${wx}" y="${wy}" width="${ww}" height="${wh}" fill="#0c4a6e" stroke="#38bdf8" stroke-width="1.1"/>`;
          }
        }
      }
      if (p.hasPersonalDoor && ((view === "side_left" && p.personalDoorSide !== "right") || (view === "side_right" && p.personalDoorSide === "right"))) {
        const db = Math.min(p.personalDoorBay ?? 0, bayCount - 1);
        const dx = ox + (db + 0.5) * bayLen * scale - 0.5 * scale;
        content += `<rect x="${dx}" y="${groundY - 2.1 * scale}" width="${1.0 * scale}" height="${2.1 * scale}" fill="#334155" stroke="#10b981" stroke-width="1.3"/>`;
      }
    }

    // Bay lines & annotations
    for (let b = 0; b <= bayCount; b++) {
      const bx = ox + b * bayLen * scale;
      content += `<line x1="${bx}" y1="${ridgeY}" x2="${bx}" y2="${groundY}" stroke="#475569" stroke-width="1" stroke-dasharray="4,4"/>`;
      content += `<circle cx="${bx}" cy="${groundY + 38}" r="9" fill="#0f172a" stroke="#38bdf8" stroke-width="1"/>`;
      content += `<text x="${bx}" y="${groundY + 41}" fill="#ffffff" font-size="9" font-family="monospace" text-anchor="middle">${b + 1}</text>`;
      if (b < bayCount) {
        content += svgDimH(bx, ox + (b + 1) * bayLen * scale, groundY, groundY + 16, `${bayLen.toFixed(1)}m`, "#94a3b8");
      }
    }

    content += svgElevMark(ox - 8, groundY, 0, "left");
    content += svgElevMark(ox - 8, topY, H, "left");
    content += svgDimV(topY, groundY, ox, ox - 46, `H = ${H.toFixed(2)}m`, "#e2e8f0");
    content += svgDimH(ox, ox + drawL, groundY + 40, groundY + 58, `DĹŽKA L = ${L.toFixed(2)} m (${bayCount} polí po ${bayLen.toFixed(1)} m)`, "#f8fafc");
  } else if (view === "section_cross") {
    // 6. CROSS SECTION A-A
    const scale = Math.min((svgW - 260) / W, (svgH - 250) / Hridge) * 0.78;
    const drawW = W * scale;
    const drawH = H * scale;
    const drawHridge = Hridge * scale;
    const ox = 110 + ((svgW - 310) - drawW) / 2;
    const groundY = svgH - 145;
    const apexX = ox + drawW / 2;
    const topEaveY = groundY - drawH;
    const topRidgeY = groundY - drawHridge;

    // Slab
    content += `<rect x="${ox - 15}" y="${groundY}" width="${drawW + 30}" height="14" fill="#334155" stroke="#64748b" stroke-width="1"/>`;
    content += `<rect x="${ox - 12}" y="${groundY + 14}" width="28" height="14" fill="#1e293b" stroke="#64748b" stroke-width="1"/>`;
    content += `<rect x="${ox + drawW - 16}" y="${groundY + 14}" width="28" height="14" fill="#1e293b" stroke="#64748b" stroke-width="1"/>`;
    content += `<text x="${apexX}" y="${groundY + 10}" fill="#94a3b8" font-size="8" font-family="monospace" text-anchor="middle">ŽELEZOBETÓNOVÁ DOSKA 200mm + PÄTKY</text>`;

    // Portal Frame Columns (IPE)
    content += `<rect x="${ox}" y="${topEaveY}" width="12" height="${drawH}" fill="#0284c7" stroke="#38bdf8" stroke-width="1.5"/>`;
    content += `<rect x="${ox + drawW - 12}" y="${topEaveY}" width="12" height="${drawH}" fill="#0284c7" stroke="#38bdf8" stroke-width="1.5"/>`;

    if (isDoubleSpan) {
      content += `<rect x="${apexX - 5}" y="${topEaveY}" width="10" height="${drawH}" fill="#0284c7" stroke="#38bdf8" stroke-width="1.5"/>`;
      const r1X = ox + drawW * 0.25;
      const r2X = ox + drawW * 0.75;
      content += `<line x1="${ox + 6}" y1="${topEaveY}" x2="${r1X}" y2="${topRidgeY}" stroke="#38bdf8" stroke-width="7" stroke-linecap="round"/>`;
      content += `<line x1="${r1X}" y1="${topRidgeY}" x2="${apexX}" y2="${topEaveY}" stroke="#38bdf8" stroke-width="7" stroke-linecap="round"/>`;
      content += `<line x1="${apexX}" y1="${topEaveY}" x2="${r2X}" y2="${topRidgeY}" stroke="#38bdf8" stroke-width="7" stroke-linecap="round"/>`;
      content += `<line x1="${r2X}" y1="${topRidgeY}" x2="${ox + drawW - 6}" y2="${topEaveY}" stroke="#38bdf8" stroke-width="7" stroke-linecap="round"/>`;
    } else {
      // Pitched Rafters
      content += `<line x1="${ox + 6}" y1="${topEaveY}" x2="${apexX}" y2="${topRidgeY}" stroke="#38bdf8" stroke-width="8" stroke-linecap="round"/>`;
      content += `<line x1="${ox + drawW - 6}" y1="${topEaveY}" x2="${apexX}" y2="${topRidgeY}" stroke="#38bdf8" stroke-width="8" stroke-linecap="round"/>`;

      // Haunch gusset plates (nábehy)
      content += `<polygon points="${ox + 12},${topEaveY + 25} ${ox + 12},${topEaveY} ${ox + 45},${topEaveY - 4}" fill="#0284c7"/>`;
      content += `<polygon points="${ox + drawW - 12},${topEaveY + 25} ${ox + drawW - 12},${topEaveY} ${ox + drawW - 45},${topEaveY - 4}" fill="#0284c7"/>`;
    }

    if (hasSkylight && !isDoubleSpan) {
      const sw = Math.min(3.0, W * 0.2) * scale;
      const sh = 0.45 * scale;
      content += `<polygon points="${apexX - sw / 2},${topRidgeY + sh * 0.4} ${apexX},${topRidgeY - sh} ${apexX + sw / 2},${topRidgeY + sh * 0.4}" fill="#0c4a6e" stroke="#38bdf8" stroke-width="1.4"/>`;
      content += `<text x="${apexX}" y="${topRidgeY - sh - 6}" fill="#38bdf8" font-size="8.5" font-family="monospace" font-weight="bold" text-anchor="middle">SVETLÍK</text>`;
    }

    content += svgElevMark(ox - 8, groundY, 0, "left");
    content += svgElevMark(ox - 8, topEaveY, H, "left");
    content += svgElevMark(ox + drawW + 8, topRidgeY, Hridge, "right");
    content += svgDimV(topEaveY, groundY, ox, ox - 48, `H = ${H.toFixed(2)}m`, "#e2e8f0");
    content += svgDimV(topRidgeY, groundY, ox + drawW, ox + drawW + 48, `H_hr = ${Hridge.toFixed(2)}m`, "#38bdf8");
    content += svgDimH(ox, ox + drawW, groundY + 14, groundY + 38, `ROZPON W = ${W.toFixed(2)} m`, "#f8fafc");

    // Annotations
    content += `<text x="${ox + 20}" y="${topEaveY + 45}" fill="#38bdf8" font-size="10" font-family="monospace" font-weight="bold">STĹP ${p.framework || "IPE 240"}</text>`;
    content += `<text x="${apexX}" y="${topRidgeY + 28}" fill="#38bdf8" font-size="10" font-family="monospace" font-weight="bold" text-anchor="middle">VÄZNÍK / PRIEČĽA ${p.framework || "IPE 240"}</text>`;
    content += `<text x="${apexX}" y="${(topEaveY + groundY) / 2}" fill="#e2e8f0" font-size="11" font-family="monospace" text-anchor="middle">SVETLÁ VÝŠKA = ${H.toFixed(2)} m</text>`;
  } else if (view === "section_long") {
    // 7. LONGITUDINAL SECTION B-B
    const scale = Math.min((svgW - 200) / L, (svgH - 220) / Hridge) * 0.85;
    const drawL = L * scale;
    const drawH = H * scale;
    const ox = 120 + ((svgW - 240) - drawL) / 2;
    const groundY = svgH - 120;
    const topY = groundY - drawH;

    // Foundation
    content += `<rect x="${ox - 15}" y="${groundY}" width="${drawL + 30}" height="14" fill="#334155" stroke="#64748b" stroke-width="1"/>`;

    // Frames
    for (let b = 0; b <= bayCount; b++) {
      const bx = ox + b * bayLen * scale;
      content += `<rect x="${bx - 5}" y="${topY}" width="10" height="${drawH}" fill="#0284c7" stroke="#38bdf8" stroke-width="1"/>`;
      content += `<text x="${bx}" y="${topY - 10}" fill="#38bdf8" font-size="8" font-family="monospace" text-anchor="middle">R${b + 1}</text>`;
      if (b < bayCount) {
        content += svgDimH(bx, ox + (b + 1) * bayLen * scale, groundY + 14, groundY + 32, `${bayLen.toFixed(1)}m`, "#94a3b8");
      }
    }

    // Purlin rows (Väznice pozdĺžne)
    content += `<line x1="${ox}" y1="${topY}" x2="${ox + drawL}" y2="${topY}" stroke="#e2e8f0" stroke-width="3"/>`;
    content += `<line x1="${ox}" y1="${topY + drawH * 0.4}" x2="${ox + drawL}" y2="${topY + drawH * 0.4}" stroke="#94a3b8" stroke-width="2" stroke-dasharray="6,4"/>`;
    content += `<line x1="${ox}" y1="${topY + drawH * 0.7}" x2="${ox + drawL}" y2="${topY + drawH * 0.7}" stroke="#94a3b8" stroke-width="2" stroke-dasharray="6,4"/>`;

    // X-Bracing in first and last bay
    const b0X = ox;
    const b1X = ox + bayLen * scale;
    content += `<line x1="${b0X}" y1="${groundY}" x2="${b1X}" y2="${topY}" stroke="#f59e0b" stroke-width="2"/>`;
    content += `<line x1="${b0X}" y1="${topY}" x2="${b1X}" y2="${groundY}" stroke="#f59e0b" stroke-width="2"/>`;

    const bLast0 = ox + (bayCount - 1) * bayLen * scale;
    const bLast1 = ox + bayCount * bayLen * scale;
    content += `<line x1="${bLast0}" y1="${groundY}" x2="${bLast1}" y2="${topY}" stroke="#f59e0b" stroke-width="2"/>`;
    content += `<line x1="${bLast0}" y1="${topY}" x2="${bLast1}" y2="${groundY}" stroke="#f59e0b" stroke-width="2"/>`;

    content += `<text x="${(b0X + b1X) / 2}" y="${(groundY + topY) / 2}" fill="#fbbf24" font-size="9" font-weight="bold" font-family="monospace" text-anchor="middle">ZAVETRENIE</text>`;
    content += svgDimH(ox, ox + drawL, groundY + 34, groundY + 54, `CELKOVÁ DĹŽKA L = ${L.toFixed(2)} m`, "#f8fafc");
  } else {
    // 8. FRAMES SCHEME & CLADDING PLAN
    const scale = Math.min((svgW - 200) / L, (svgH - 220) / Hridge) * 0.85;
    const drawL = L * scale;
    const drawH = H * scale;
    const ox = 120 + ((svgW - 240) - drawL) / 2;
    const groundY = svgH - 120;
    const topY = groundY - drawH;
    const courses = Math.ceil(H);

    content += `<rect x="${ox}" y="${topY}" width="${drawL}" height="${drawH}" fill="#1e293b" fill-opacity="0.45" stroke="#f8fafc" stroke-width="1.8"/>`;
    for (let c = 1; c < courses; c++) {
      const py = groundY - c * scale;
      if (py > topY) {
        content += `<line x1="${ox}" y1="${py}" x2="${ox + drawL}" y2="${py}" stroke="#38bdf8" stroke-width="0.8" stroke-dasharray="4,2"/>`;
        content += `<text x="${ox + drawL + 8}" y="${py + 3}" fill="#94a3b8" font-size="7.5" font-family="monospace">P${c} (+${c}.0m)</text>`;
      }
    }
    for (let b = 0; b <= bayCount; b++) {
      const bx = ox + b * bayLen * scale;
      content += `<line x1="${bx}" y1="${topY - 10}" x2="${bx}" y2="${groundY + 10}" stroke="#f8fafc" stroke-width="1.3"/>`;
      if (b < bayCount) {
        const midX = bx + (bayLen * scale) / 2;
        content += `<text x="${midX}" y="${topY + drawH / 2}" fill="#38bdf8" font-size="8.5" font-family="monospace" font-weight="bold" text-anchor="middle">MODUL M${b + 1}</text>`;
        content += `<text x="${midX}" y="${topY + drawH / 2 + 12}" fill="#94a3b8" font-size="7.5" font-family="monospace" text-anchor="middle">${courses}× PUR ${p.wallPanelThicknessMm || 100}mm</text>`;
        content += svgDimH(bx, ox + (b + 1) * bayLen * scale, groundY, groundY + 22, `${bayLen.toFixed(2)}m`, "#e2e8f0");
      }
    }
    content += `<text x="${ox + drawL / 2}" y="${topY - 16}" fill="#38bdf8" font-size="10" font-family="monospace" font-weight="bold" text-anchor="middle">KLADENIE PANELOV: MODUL 1000 mm · HRÚBKA ${p.wallPanelThicknessMm || 100} mm</text>`;
  }

  // Engineering Title Block (Rohová pečiatka)
  const tbW = 295;
  const tbH = 72;
  const tbX = svgW - margin - tbW + 10;
  const tbY = svgH - margin - tbH + 10;

  const titleBlock = `
    <g id="title-block">
      <rect x="${tbX}" y="${tbY}" width="${tbW}" height="${tbH}" fill="#0f172a" stroke="#38bdf8" stroke-width="1.5"/>
      <line x1="${tbX}" y1="${tbY + 21}" x2="${tbX + tbW}" y2="${tbY + 21}" stroke="#334155" stroke-width="1"/>
      <line x1="${tbX}" y1="${tbY + 47}" x2="${tbX + tbW}" y2="${tbY + 47}" stroke="#334155" stroke-width="1"/>
      <line x1="${tbX + 195}" y1="${tbY}" x2="${tbX + 195}" y2="${tbY + 47}" stroke="#334155" stroke-width="1"/>

      <text x="${tbX + 10}" y="${tbY + 14}" fill="#38bdf8" font-size="11" font-weight="bold" font-family="sans-serif">VBAU Haly s.r.o.</text>
      <text x="${tbX + 203}" y="${tbY + 14}" fill="#94a3b8" font-size="9" font-family="monospace">MIERKA: ${titleDef.scale}</text>

      <text x="${tbX + 10}" y="${tbY + 33}" fill="#ffffff" font-size="9" font-weight="bold" font-family="sans-serif">${titleDef.title}</text>
      <text x="${tbX + 10}" y="${tbY + 43}" fill="#94a3b8" font-size="7.5" font-family="sans-serif">${titleDef.subtitle}</text>

      <text x="${tbX + 203}" y="${tbY + 33}" fill="#94a3b8" font-size="8" font-family="monospace">DÁTUM: ${dateStr}</text>
      <text x="${tbX + 203}" y="${tbY + 43}" fill="#38bdf8" font-size="8" font-family="monospace">REV: 2.0 (CAD)</text>

      <text x="${tbX + 10}" y="${tbY + 60}" fill="#64748b" font-size="7.5" font-family="sans-serif">Koncepčný výkres z 3D konfigurátora · Nenahrádza statický projekt</text>
    </g>
  `;

  const svgFilter = isLight ? "filter: invert(1) hue-rotate(180deg);" : "";

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgW} ${svgH}" width="100%" height="100%" style="background-color: #0b1120; ${svgFilter}">
      <!-- Border frame -->
      <rect x="${margin / 2}" y="${margin / 2}" width="${svgW - margin}" height="${svgH - margin}" fill="none" stroke="#334155" stroke-width="1"/>
      <rect x="${margin / 2 + 3}" y="${margin / 2 + 3}" width="${svgW - margin - 6}" height="${svgH - margin - 6}" fill="none" stroke="#1e293b" stroke-width="0.5"/>

      <!-- Title header -->
      <text x="${margin}" y="${margin - 5}" fill="#38bdf8" font-size="14" font-weight="bold" font-family="sans-serif">${titleDef.title}</text>
      <text x="${margin}" y="${margin + 12}" fill="#94a3b8" font-size="10" font-family="sans-serif">${modelName} · Rozmery: ${W} × ${L} × ${H} m (sklon ${p.roofPitchDeg ?? 10}°)</text>

      ${content}
      ${titleBlock}
    </svg>
  `;
}

/**
 * Downloads a complete multi-sheet PDF drawing set (all 8 technical views) with title blocks.
 */
export function downloadMultiPageDrawingsPdf(p: GarageParams, filename = "Technicke_Vykresy_Haly.pdf", options?: DrawingOptions): void {
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  try {
    pdf.addFileToVFS("Roboto-Regular.ttf", ROBOTO_REGULAR_B64);
    pdf.addFileToVFS("Roboto-Bold.ttf", ROBOTO_BOLD_B64);
    pdf.addFont("Roboto-Regular.ttf", "Roboto", "normal");
    pdf.addFont("Roboto-Bold.ttf", "Roboto", "bold");
    pdf.setFont("Roboto", "normal");
  } catch (err) {
    console.warn("Font registration failed, fallback to default", err);
  }

  const pageWidth = 297;
  const pageHeight = 210;
  const margin = 10;
  const W = p.width ?? 16;
  const L = p.length ?? 30;
  const H = p.clearHeight ?? 6;
  const pitchRad = ((p.roofPitchDeg ?? 10) * Math.PI) / 180;
  const Hridge = H + (W / 2) * Math.tan(pitchRad);
  const bayCount = Math.max(2, p.bayCount ?? Math.round(L / 6));
  const bayLen = L / bayCount;
  const modelName = p.hallType || "VBAU OCEĽOVÁ HALA";
  const dateStr = new Date().toLocaleDateString("sk-SK");

  const projectWalls = projectWallViews(p, options);
  DRAWING_DEFINITIONS.forEach((def, index) => {
    if (index > 0) {
      pdf.addPage("a4", "landscape");
    }

    const wall = projectWalls?.walls.find(item => item.id === elevationIds[def.id]);
    if (wall) {
      createWallDrawingPdf([wall], pdf);
      return;
    }

    // Outer border
    pdf.setDrawColor(30, 41, 59);
    pdf.setLineWidth(0.6);
    pdf.rect(margin, margin, pageWidth - 2 * margin, pageHeight - 2 * margin);
    pdf.setLineWidth(0.2);
    pdf.rect(margin + 1.5, margin + 1.5, pageWidth - 2 * margin - 3, pageHeight - 2 * margin - 3);

    // Top Title Bar
    pdf.setFillColor(15, 23, 42);
    pdf.rect(margin + 2, margin + 2, pageWidth - 2 * margin - 4, 14, "F");

    pdf.setFont("Roboto", "bold");
    pdf.setFontSize(11);
    pdf.setTextColor(255, 255, 255);
    pdf.text(def.title, margin + 6, margin + 8);

    pdf.setFont("Roboto", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(148, 163, 184);
    pdf.text(`${modelName}  |  ROZMERY: ${W} × ${L} × ${H} m  |  LIST ${index + 1} Z ${DRAWING_DEFINITIONS.length}`, margin + 6, margin + 13);

    // Drawing Canvas Area
    const vpX = margin + 15;
    const vpY = margin + 24;
    const vpW = pageWidth - 2 * margin - 30;
    const vpH = pageHeight - 2 * margin - 55;

    pdf.setDrawColor(15, 23, 42);
    pdf.setTextColor(15, 23, 42);

    if (def.id === "plan") {
      const scale = Math.min(vpW / W, vpH / L) * 0.82;
      const dW = W * scale;
      const dL = L * scale;
      const ox = vpX + (vpW - dW) / 2;
      const oy = vpY + (vpH - dL) / 2;

      // Outer hall box
      pdf.setLineWidth(0.5);
      pdf.rect(ox, oy, dW, dL);

      // Grid lines
      pdf.setLineWidth(0.2);
      for (let b = 0; b <= bayCount; b++) {
        const cy = oy + b * bayLen * scale;
        pdf.line(ox - 10, cy, ox + dW + 10, cy);
        pdf.circle(ox - 14, cy, 3);
        pdf.setFontSize(7);
        pdf.text(`${b + 1}`, ox - 14, cy + 1, { align: "center" });

        // Columns
        pdf.rect(ox - 1.5, cy - 1.5, 3, 3, "F");
        pdf.rect(ox + dW - 1.5, cy - 1.5, 3, 3, "F");
      }

      // Dimensions
      pdf.setFont("Roboto", "bold");
      pdf.setFontSize(9);
      pdf.text(`ŠÍRKA W = ${W.toFixed(1)} m`, ox + dW / 2, oy - 6, { align: "center" });
      pdf.text(`DĹŽKA L = ${L.toFixed(1)} m`, ox + dW + 8, oy + dL / 2, { angle: 90 });
    } else if (def.id === "front" || def.id === "rear") {
      const scale = Math.min(vpW / W, vpH / Hridge) * 0.85;
      const dW = W * scale;
      const dH = H * scale;
      const dHridge = Hridge * scale;
      const ox = vpX + (vpW - dW) / 2;
      const groundY = vpY + vpH - 10;
      const apexX = ox + dW / 2;
      const topEaveY = groundY - dH;
      const topRidgeY = groundY - dHridge;

      // Ground
      pdf.setLineWidth(0.6);
      pdf.line(ox - 15, groundY, ox + dW + 15, groundY);

      // Gable outline
      pdf.setLineWidth(0.4);
      pdf.line(ox, groundY, ox, topEaveY);
      pdf.line(ox, topEaveY, apexX, topRidgeY);
      pdf.line(apexX, topRidgeY, ox + dW, topEaveY);
      pdf.line(ox + dW, topEaveY, ox + dW, groundY);

      // Gate if front
      if (def.id === "front") {
        const gw = (p.doorWidth ?? 4) * scale;
        const gh = (p.doorHeight ?? 4.25) * scale;
        const gx = ox + (dW - gw) / 2;
        pdf.rect(gx, groundY - gh, gw, gh);
        pdf.setFontSize(8);
        pdf.text(`BRÁNA ${(p.doorWidth ?? 4).toFixed(1)} × ${(p.doorHeight ?? 4.25).toFixed(1)} m`, gx + gw / 2, groundY - gh / 2, { align: "center" });
      }

      // Height dimension
      pdf.setFont("Roboto", "bold");
      pdf.setFontSize(8);
      pdf.text(`H_odkvap = ${H.toFixed(2)} m`, ox - 5, (groundY + topEaveY) / 2, { align: "right" });
      pdf.text(`H_hrebeň = ${Hridge.toFixed(2)} m`, ox + dW + 5, (groundY + topRidgeY) / 2);
    } else if (def.id === "section_cross") {
      // 6. CROSS SECTION A-A in PDF
      const scale = Math.min(vpW / W, vpH / Hridge) * 0.85;
      const dW = W * scale;
      const dH = H * scale;
      const dHridge = Hridge * scale;
      const ox = vpX + (vpW - dW) / 2;
      const groundY = vpY + vpH - 12;
      const apexX = ox + dW / 2;
      const topEaveY = groundY - dH;
      const topRidgeY = groundY - dHridge;

      // Foundation slab
      pdf.setFillColor(203, 213, 225);
      pdf.rect(ox - 5, groundY, dW + 10, 4, "FD");

      // Columns & Rafters
      pdf.setDrawColor(2, 132, 199);
      pdf.setLineWidth(1.2);
      pdf.line(ox, groundY, ox, topEaveY);
      pdf.line(ox + dW, groundY, ox + dW, topEaveY);
      pdf.line(ox, topEaveY, apexX, topRidgeY);
      pdf.line(apexX, topRidgeY, ox + dW, topEaveY);

      // Haunches
      pdf.setLineWidth(0.6);
      pdf.line(ox, topEaveY + 6, ox + 10, topEaveY - (10 / (dW / 2)) * (topEaveY - topRidgeY));
      pdf.line(ox + dW, topEaveY + 6, ox + dW - 10, topEaveY - (10 / (dW / 2)) * (topEaveY - topRidgeY));

      pdf.setDrawColor(15, 23, 42);
      pdf.setFont("Roboto", "bold");
      pdf.setFontSize(8);
      pdf.text(`STĹP / PRIEČĽA ${p.framework || "IPE 240"}`, apexX, topRidgeY - 4, { align: "center" });
      pdf.text(`SVETLÁ VÝŠKA H = ${H.toFixed(2)} m`, apexX, (groundY + topEaveY) / 2, { align: "center" });
      pdf.text(`ROZPON W = ${W.toFixed(2)} m`, apexX, groundY + 10, { align: "center" });
      pdf.text("±0.000", ox - 14, groundY);
      pdf.text(`+${H.toFixed(3)}`, ox - 14, topEaveY);
      pdf.text(`+${Hridge.toFixed(3)}`, ox + dW + 4, topRidgeY);
    } else {
      // Side / Longitudinal Section / Cladding Scheme views in PDF
      const scale = Math.min(vpW / L, vpH / Hridge) * 0.85;
      const dL = L * scale;
      const dH = H * scale;
      const ox = vpX + (vpW - dL) / 2;
      const groundY = vpY + vpH - 10;
      const topY = groundY - dH;

      pdf.setLineWidth(0.6);
      pdf.line(ox - 10, groundY, ox + dL + 10, groundY);
      pdf.setLineWidth(0.4);
      pdf.rect(ox, topY, dL, dH);

      // Horizontal panel courses or purlin lines
      if (def.id === "frames_scheme" || def.id === "side_left" || def.id === "side_right") {
        pdf.setLineWidth(0.15);
        for (let c = 1; c < Math.ceil(H); c++) {
          const py = groundY - c * scale;
          if (py > topY) pdf.line(ox, py, ox + dL, py);
        }
      } else if (def.id === "section_long") {
        // X-Bracing in first and last bay
        pdf.setDrawColor(217, 119, 6);
        pdf.setLineWidth(0.5);
        pdf.line(ox, groundY, ox + bayLen * scale, topY);
        pdf.line(ox, topY, ox + bayLen * scale, groundY);
        const lastX = ox + (bayCount - 1) * bayLen * scale;
        pdf.line(lastX, groundY, ox + dL, topY);
        pdf.line(lastX, topY, ox + dL, groundY);
        pdf.setDrawColor(15, 23, 42);
      }

      // Portal frame lines
      pdf.setLineWidth(0.35);
      for (let b = 0; b <= bayCount; b++) {
        const bx = ox + b * bayLen * scale;
        pdf.line(bx, topY, bx, groundY);
        pdf.setFontSize(7);
        pdf.text(`R${b + 1}`, bx, groundY + 5, { align: "center" });
      }

      pdf.setFont("Roboto", "bold");
      pdf.setFontSize(9);
      pdf.text(`DĹŽKA L = ${L.toFixed(1)} m (${bayCount} polí po ${bayLen.toFixed(1)} m)`, ox + dL / 2, groundY + 12, { align: "center" });
    }

    // Title Block on each page
    const tbW = 95;
    const tbH = 26;
    const tbX = pageWidth - margin - tbW - 2;
    const tbY = pageHeight - margin - tbH - 2;

    pdf.setDrawColor(15, 23, 42);
    pdf.setLineWidth(0.3);
    pdf.rect(tbX, tbY, tbW, tbH);
    pdf.line(tbX, tbY + 8, tbX + tbW, tbY + 8);
    pdf.line(tbX, tbY + 18, tbX + tbW, tbY + 18);
    pdf.line(tbX + 55, tbY, tbX + 55, tbY + 18);

    pdf.setFont("Roboto", "bold");
    pdf.setFontSize(8.5);
    pdf.setTextColor(15, 23, 42);
    pdf.text("VBAU Haly s.r.o.", tbX + 3, tbY + 5.5);
    pdf.setFontSize(7.5);
    pdf.text(`MIERKA: ${def.scale}`, tbX + 58, tbY + 5.5);

    pdf.setFont("Roboto", "bold");
    pdf.text(def.title, tbX + 3, tbY + 13);
    pdf.setFont("Roboto", "normal");
    pdf.setFontSize(6.5);
    pdf.text(def.subtitle, tbX + 3, tbY + 16.5);
    pdf.text(`DÁTUM: ${dateStr}`, tbX + 58, tbY + 13);
    pdf.text("FORMÁT: A4", tbX + 58, tbY + 16.5);

    pdf.setTextColor(100, 116, 139);
    pdf.setFontSize(6);
    pdf.text("Koncepčný výkres z 3D konfigurátora · Nenahrádza statický projekt", tbX + 3, tbY + 22.5);
  });

  pdf.save(filename);
}
