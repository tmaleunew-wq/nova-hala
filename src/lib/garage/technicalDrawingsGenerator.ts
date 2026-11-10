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

/**
 * Generates an SVG string representation of a specific technical drawing view.
 */
export function generateDrawingSvg(view: DrawingViewType, p: GarageParams): string {
  const W = p.width ?? 16;
  const L = p.length ?? 30;
  const H = p.clearHeight ?? 6;
  const pitchRad = ((p.roofPitchDeg ?? 10) * Math.PI) / 180;
  const Hridge = H + (W / 2) * Math.tan(pitchRad);
  const bayCount = Math.max(2, p.bayCount ?? Math.round(L / 6));
  const bayLen = L / bayCount;

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
      content += `<circle cx="${ox - 45}" cy="${y}" r="11" fill="#0f172a" stroke="#38bdf8" stroke-width="1.2"/>`;
      content += `<text x="${ox - 45}" y="${y + 4}" fill="#ffffff" font-size="10" font-family="monospace" font-weight="bold" text-anchor="middle">${b + 1}</text>`;
      // Dimension between bays
      if (b < bayCount) {
        const nextY = oy + (b + 1) * bayLen * scale;
        const midY = (y + nextY) / 2;
        content += `<text x="${ox - 22}" y="${midY + 4}" fill="#94a3b8" font-size="9" font-family="monospace" text-anchor="middle">${bayLen.toFixed(1)}m</text>`;
      }
    }

    // Axes A and B
    content += `<line x1="${ox}" y1="${oy - 45}" x2="${ox}" y2="${oy + drawL + 45}" stroke="#64748b" stroke-width="0.8" stroke-dasharray="6,4"/>`;
    content += `<circle cx="${ox}" cy="${oy - 45}" r="11" fill="#0f172a" stroke="#38bdf8" stroke-width="1.2"/>`;
    content += `<text x="${ox}" y="${oy - 41}" fill="#ffffff" font-size="10" font-family="monospace" font-weight="bold" text-anchor="middle">A</text>`;

    content += `<line x1="${ox + drawW}" y1="${oy - 45}" x2="${ox + drawW}" y2="${oy + drawL + 45}" stroke="#64748b" stroke-width="0.8" stroke-dasharray="6,4"/>`;
    content += `<circle cx="${ox + drawW}" cy="${oy - 45}" r="11" fill="#0f172a" stroke="#38bdf8" stroke-width="1.2"/>`;
    content += `<text x="${ox + drawW}" y="${oy - 41}" fill="#ffffff" font-size="10" font-family="monospace" font-weight="bold" text-anchor="middle">B</text>`;

    // Wall perimeter
    content += `<rect x="${ox}" y="${oy}" width="${drawW}" height="${drawL}" fill="#1e293b" fill-opacity="0.4" stroke="#f8fafc" stroke-width="2.5"/>`;

    // Columns
    const colSize = 8;
    for (let b = 0; b <= bayCount; b++) {
      const y = oy + b * bayLen * scale;
      content += `<rect x="${ox - colSize / 2}" y="${y - colSize / 2}" width="${colSize}" height="${colSize}" fill="#38bdf8" stroke="#0284c7" stroke-width="1"/>`;
      content += `<rect x="${ox + drawW - colSize / 2}" y="${y - colSize / 2}" width="${colSize}" height="${colSize}" fill="#38bdf8" stroke="#0284c7" stroke-width="1"/>`;
    }

    // Front Gate
    const gateW = (p.doorWidth ?? 4.0) * scale;
    const gateX = ox + (drawW - gateW) / 2;
    content += `<rect x="${gateX}" y="${oy - 4}" width="${gateW}" height="8" fill="#10b981" stroke="#059669" stroke-width="1.5"/>`;
    content += `<text x="${gateX + gateW / 2}" y="${oy - 10}" fill="#34d399" font-size="9" font-weight="bold" text-anchor="middle">SEKCIONÁLNA BRÁNA ${(p.doorWidth ?? 4.0).toFixed(1)}m</text>`;

    // Overall dimension text
    content += `<text x="${ox + drawW / 2}" y="${oy - 22}" fill="#f8fafc" font-size="12" font-weight="bold" font-family="monospace" text-anchor="middle">ŠÍRKA W = ${W.toFixed(1)} m</text>`;
    content += `<text x="${ox + drawW + 35}" y="${oy + drawL / 2}" fill="#f8fafc" font-size="12" font-weight="bold" font-family="monospace" text-anchor="middle" transform="rotate(90, ${ox + drawW + 35}, ${oy + drawL / 2})">DĹŽKA L = ${L.toFixed(1)} m</text>`;
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
    content += `<text x="${ox - 70}" y="${groundY + 4}" fill="#94a3b8" font-size="9" font-family="monospace">±0.000</text>`;

    // Gable wall shape
    const topEaveY = groundY - drawH;
    const topRidgeY = groundY - drawHridge;
    const apexX = ox + drawW / 2;
    const path = `M ${ox} ${groundY} L ${ox} ${topEaveY} L ${apexX} ${topRidgeY} L ${ox + drawW} ${topEaveY} L ${ox + drawW} ${groundY} Z`;
    content += `<path d="${path}" fill="#1e293b" fill-opacity="0.5" stroke="#f8fafc" stroke-width="2"/>`;

    // Horizontal sandwich panel lines every 1m
    for (let yM = 1.0; yM < H; yM += 1.0) {
      const py = groundY - yM * scale;
      content += `<line x1="${ox}" y1="${py}" x2="${ox + drawW}" y2="${py}" stroke="#475569" stroke-width="0.8"/>`;
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

    // Dimensions
    content += `<line x1="${ox - 25}" y1="${groundY}" x2="${ox - 25}" y2="${topEaveY}" stroke="#e2e8f0" stroke-width="1"/>`;
    content += `<text x="${ox - 30}" y="${(groundY + topEaveY) / 2}" fill="#e2e8f0" font-size="10" font-family="monospace" font-weight="bold" text-anchor="end">H = ${H.toFixed(2)}m</text>`;

    content += `<line x1="${ox + drawW + 25}" y1="${groundY}" x2="${ox + drawW + 25}" y2="${topRidgeY}" stroke="#38bdf8" stroke-width="1"/>`;
    content += `<text x="${ox + drawW + 30}" y="${(groundY + topRidgeY) / 2}" fill="#38bdf8" font-size="10" font-family="monospace" font-weight="bold" text-anchor="start">H_hrebeň = ${Hridge.toFixed(2)}m</text>`;

    content += `<text x="${apexX}" y="${groundY + 25}" fill="#f8fafc" font-size="12" font-weight="bold" font-family="monospace" text-anchor="middle">ROZPON W = ${W.toFixed(1)} m · SKLON ${p.roofPitchDeg ?? 10}°</text>`;
  } else if (view === "side_left" || view === "side_right") {
    // 4 & 5. SIDE ELEVATIONS
    const scale = Math.min((svgW - 200) / L, (svgH - 220) / Hridge) * 0.85;
    const drawL = L * scale;
    const drawH = H * scale;
    const ox = 120 + ((svgW - 240) - drawL) / 2;
    const groundY = svgH - 120;
    const topY = groundY - drawH;

    content += `<line x1="${ox - 40}" y1="${groundY}" x2="${ox + drawL + 40}" y2="${groundY}" stroke="#64748b" stroke-width="2"/>`;
    content += `<rect x="${ox}" y="${topY}" width="${drawL}" height="${drawH}" fill="#1e293b" fill-opacity="0.5" stroke="#f8fafc" stroke-width="2"/>`;

    // Bay lines & annotations
    for (let b = 0; b <= bayCount; b++) {
      const bx = ox + b * bayLen * scale;
      content += `<line x1="${bx}" y1="${topY}" x2="${bx}" y2="${groundY}" stroke="#475569" stroke-width="1" stroke-dasharray="4,4"/>`;
      content += `<circle cx="${bx}" cy="${groundY + 20}" r="9" fill="#0f172a" stroke="#38bdf8" stroke-width="1"/>`;
      content += `<text x="${bx}" y="${groundY + 23}" fill="#ffffff" font-size="9" font-family="monospace" text-anchor="middle">${b + 1}</text>`;
    }

    content += `<text x="${ox + drawL / 2}" y="${groundY + 45}" fill="#f8fafc" font-size="12" font-weight="bold" font-family="monospace" text-anchor="middle">DĹŽKA L = ${L.toFixed(1)} m (${bayCount} polí po ${bayLen.toFixed(1)} m)</text>`;
    content += `<text x="${ox - 25}" y="${(groundY + topY) / 2}" fill="#e2e8f0" font-size="10" font-family="monospace" font-weight="bold" text-anchor="end">H = ${H.toFixed(2)}m</text>`;
  } else if (view === "section_cross") {
    // 6. CROSS SECTION A-A
    const scale = Math.min((svgW - 200) / W, (svgH - 220) / Hridge) * 0.82;
    const drawW = W * scale;
    const drawH = H * scale;
    const drawHridge = Hridge * scale;
    const ox = 120 + ((svgW - 240) - drawW) / 2;
    const groundY = svgH - 120;
    const apexX = ox + drawW / 2;
    const topEaveY = groundY - drawH;
    const topRidgeY = groundY - drawHridge;

    // Slab
    content += `<rect x="${ox - 15}" y="${groundY}" width="${drawW + 30}" height="14" fill="#334155" stroke="#64748b" stroke-width="1"/>`;
    content += `<text x="${apexX}" y="${groundY + 10}" fill="#94a3b8" font-size="8" font-family="monospace" text-anchor="middle">ŽELEZOBETÓNOVÁ DOSKA 200mm</text>`;

    // Portal Frame Columns (IPE)
    content += `<rect x="${ox}" y="${topEaveY}" width="12" height="${drawH}" fill="#0284c7" stroke="#38bdf8" stroke-width="1.5"/>`;
    content += `<rect x="${ox + drawW - 12}" y="${topEaveY}" width="12" height="${drawH}" fill="#0284c7" stroke="#38bdf8" stroke-width="1.5"/>`;

    // Pitched Rafters
    content += `<line x1="${ox + 6}" y1="${topEaveY}" x2="${apexX}" y2="${topRidgeY}" stroke="#38bdf8" stroke-width="8" stroke-linecap="round"/>`;
    content += `<line x1="${ox + drawW - 6}" y1="${topEaveY}" x2="${apexX}" y2="${topRidgeY}" stroke="#38bdf8" stroke-width="8" stroke-linecap="round"/>`;

    // Haunch gusset plates (nábehy)
    content += `<polygon points="${ox + 12},${topEaveY + 25} ${ox + 12},${topEaveY} ${ox + 45},${topEaveY - 4}" fill="#0284c7"/>`;
    content += `<polygon points="${ox + drawW - 12},${topEaveY + 25} ${ox + drawW - 12},${topEaveY} ${ox + drawW - 45},${topEaveY - 4}" fill="#0284c7"/>`;

    // Annotations
    content += `<text x="${ox + 20}" y="${topEaveY + 45}" fill="#38bdf8" font-size="10" font-family="monospace" font-weight="bold">STĹP ${p.framework || "IPE 240"}</text>`;
    content += `<text x="${apexX}" y="${topRidgeY - 14}" fill="#38bdf8" font-size="10" font-family="monospace" font-weight="bold" text-anchor="middle">VÄZNÍK / PRIEČĽA ${p.framework || "IPE 240"}</text>`;
    content += `<text x="${apexX}" y="${(topEaveY + groundY) / 2}" fill="#e2e8f0" font-size="11" font-family="monospace" text-anchor="middle">SVETLÁ VÝŠKA = ${H.toFixed(2)} m</text>`;
  } else {
    // 7 & 8. LONGITUDINAL SECTION / FRAMES SCHEME
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
      // Frame label
      content += `<text x="${bx}" y="${topY - 10}" fill="#38bdf8" font-size="8" font-family="monospace" text-anchor="middle">R${b + 1}</text>`;
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
  }

  // Engineering Title Block (Rohová pečiatka)
  const tbW = 280;
  const tbH = 75;
  const tbX = svgW - margin - tbW;
  const tbY = svgH - margin - tbH;

  const titleBlock = `
    <g id="title-block">
      <rect x="${tbX}" y="${tbY}" width="${tbW}" height="${tbH}" fill="#0f172a" stroke="#38bdf8" stroke-width="1.5"/>
      <line x1="${tbX}" y1="${tbY + 22}" x2="${tbX + tbW}" y2="${tbY + 22}" stroke="#334155" stroke-width="1"/>
      <line x1="${tbX}" y1="${tbY + 48}" x2="${tbX + tbW}" y2="${tbY + 48}" stroke="#334155" stroke-width="1"/>
      <line x1="${tbX + 175}" y1="${tbY}" x2="${tbX + 175}" y2="${tbY + 48}" stroke="#334155" stroke-width="1"/>

      <text x="${tbX + 10}" y="${tbY + 15}" fill="#38bdf8" font-size="11" font-weight="bold" font-family="sans-serif">VBAU Haly s.r.o.</text>
      <text x="${tbX + 185}" y="${tbY + 15}" fill="#94a3b8" font-size="9" font-family="monospace">MIERKA: ${titleDef.scale}</text>

      <text x="${tbX + 10}" y="${tbY + 34}" fill="#ffffff" font-size="10" font-weight="bold" font-family="sans-serif">${titleDef.title}</text>
      <text x="${tbX + 10}" y="${tbY + 43}" fill="#94a3b8" font-size="8" font-family="sans-serif">${titleDef.subtitle}</text>

      <text x="${tbX + 185}" y="${tbY + 34}" fill="#94a3b8" font-size="8" font-family="monospace">DÁTUM: ${dateStr}</text>
      <text x="${tbX + 185}" y="${tbY + 43}" fill="#38bdf8" font-size="8" font-family="monospace">REV: 1.0 (CAD)</text>

      <text x="${tbX + 10}" y="${tbY + 62}" fill="#64748b" font-size="7.5" font-family="sans-serif">Koncepčný výkres z 3D konfigurátora · Nenahrádza statický projekt</text>
    </g>
  `;

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgW} ${svgH}" width="100%" height="100%" style="background-color: #0b1120;">
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
export function downloadMultiPageDrawingsPdf(p: GarageParams, filename = "Technicke_Vykresy_Haly.pdf"): void {
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

  DRAWING_DEFINITIONS.forEach((def, index) => {
    if (index > 0) {
      pdf.addPage("a4", "landscape");
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
    } else {
      // Side / Section views
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

      // Portal frame lines
      for (let b = 0; b <= bayCount; b++) {
        const bx = ox + b * bayLen * scale;
        pdf.line(bx, topY, bx, groundY);
        pdf.setFontSize(7);
        pdf.text(`R${b + 1}`, bx, groundY + 5, { align: "center" });
      }

      pdf.setFont("Roboto", "bold");
      pdf.setFontSize(9);
      pdf.text(`DĹŽKA L = ${L.toFixed(1)} m (${bayCount} polí)`, ox + dL / 2, groundY + 12, { align: "center" });
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
