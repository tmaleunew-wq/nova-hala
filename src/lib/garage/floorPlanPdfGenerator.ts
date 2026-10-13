import { jsPDF } from "jspdf";
import type { GarageParams } from "./types";
import { toast } from "sonner";
import { ROBOTO_REGULAR_B64, ROBOTO_BOLD_B64 } from "./pdfFonts";
import { ridgeHeight, highEave } from "@/components/garage/Structure";

/**
 * Generates and downloads a technical 2D Floor Plan architectural sheet as a vector PDF.
 */
export function downloadGarageFloorPlanPdf(p: GarageParams, filenamePrefix = "Podorys"): void {
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  // 1. Register UTF-8 Slovak fonts
  try {
    pdf.addFileToVFS("Roboto-Regular.ttf", ROBOTO_REGULAR_B64);
    pdf.addFileToVFS("Roboto-Bold.ttf", ROBOTO_BOLD_B64);
    pdf.addFont("Roboto-Regular.ttf", "Roboto", "normal");
    pdf.addFont("Roboto-Bold.ttf", "Roboto", "bold");
    pdf.setFont("Roboto", "normal");
  } catch (err) {
    console.warn("Font registration failed, fallback to helvetica", err);
  }

  const pageWidth = 297; // A4 Landscape
  const pageHeight = 210;
  const margin = 10;

  // Outer border & title frame
  pdf.setDrawColor(20, 30, 45);
  pdf.setLineWidth(0.6);
  pdf.rect(margin, margin, pageWidth - 2 * margin, pageHeight - 2 * margin);
  pdf.setLineWidth(0.2);
  pdf.rect(margin + 1.5, margin + 1.5, pageWidth - 2 * margin - 3, pageHeight - 2 * margin - 3);

  // Top Title Banner
  pdf.setFillColor(15, 23, 42); // slate-900
  pdf.rect(margin + 2, margin + 2, pageWidth - 2 * margin - 4, 14, "F");

  pdf.setFont("Roboto", "bold");
  pdf.setFontSize(11);
  pdf.setTextColor(255, 255, 255);
  pdf.text("VBAU — TECHNICKÝ PÔDORYS A DISPOZÍCIA STAVBY", margin + 6, margin + 8);

  const modelName = p.hallType && p.hallType !== "Vlastný" && p.hallType !== "vlastna_garaz" ? p.hallType : "VLASTNÁ GARÁŽ";
  const dateStr = new Date().toLocaleDateString("sk-SK");

  pdf.setFont("Roboto", "normal");
  pdf.setFontSize(8.5);
  pdf.setTextColor(148, 163, 184); // slate-400
  pdf.text(`MODEL: ${modelName}  |  DÁTUM: ${dateStr}  |  FORMÁT: A4 (1:1 DÁTA)`, margin + 6, margin + 13);

  // Geometry calculations
  const w = p.width ?? 4;
  const l = p.length ?? 6;
  const bayCount = Math.max(2, p.bayCount ?? Math.round(l / 3));
  const bayLength = l / bayCount;
  const doorW = p.doorWidth ?? 2.5;

  // Drawing Viewport Boundaries
  const vpX = margin + 25;
  const vpY = margin + 25;
  const vpW = 180;
  const vpH = 145;

  // Scale calculation: determine mm on paper per meter in reality
  const scale = Math.min(vpW / w, vpH / l) * 0.85;

  const drawW = w * scale;
  const drawL = l * scale;

  // Center drawing within viewport
  const originX = vpX + (vpW - drawW) / 2;
  const originY = vpY + (vpH - drawL) / 2;

  // Grid / Axis Lines & Columns
  const colSize = Math.max(2, 0.1 * scale); // 100mm scaled

  for (let b = 0; b <= bayCount; b++) {
    const curY = originY + b * bayLength * scale;

    // Axis line (dashed)
    pdf.setDrawColor(180, 83, 9); // amber/reddish axis
    pdf.setLineDashPattern([2, 1.5], 0);
    pdf.setLineWidth(0.2);
    pdf.line(originX - 10, curY, originX + drawW + 10, curY);
    pdf.setLineDashPattern([], 0); // reset

    // Axis circle & label on left and right
    const bubbleR = 2.8;
    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(180, 83, 9);
    pdf.circle(originX - 12, curY, bubbleR, "FD");
    pdf.circle(originX + drawW + 12, curY, bubbleR, "FD");

    pdf.setFont("Roboto", "bold");
    pdf.setFontSize(6.5);
    pdf.setTextColor(180, 83, 9);
    pdf.text(`${b + 1}`, originX - 12 - 1, curY + 1.2);
    pdf.text(`${b + 1}`, originX + drawW + 12 - 1, curY + 1.2);

    // Columns on left and right walls (filled rectangles)
    pdf.setFillColor(30, 41, 59);
    pdf.setDrawColor(15, 23, 42);
    pdf.rect(originX - colSize / 2, curY - colSize / 2, colSize, colSize, "FD");
    pdf.rect(originX + drawW - colSize / 2, curY - colSize / 2, colSize, colSize, "FD");
  }

  // Obrys stien (Walls)
  pdf.setDrawColor(15, 23, 42);
  pdf.setLineWidth(0.7);

  const gateWMmPaper = doorW * scale;
  const gateLeftPaper = (drawW - gateWMmPaper) / 2;

  // Front Wall (with gate cutout)
  pdf.line(originX, originY, originX + gateLeftPaper, originY);
  pdf.line(originX + gateLeftPaper + gateWMmPaper, originY, originX + drawW, originY);

  // Left & Right walls
  pdf.line(originX, originY, originX, originY + drawL);
  pdf.line(originX + drawW, originY, originX + drawW, originY + drawL);

  // Back wall
  if (p.hasBackDoor) {
    pdf.line(originX, originY + drawL, originX + gateLeftPaper, originY + drawL);
    pdf.line(originX + gateLeftPaper + gateWMmPaper, originY + drawL, originX + drawW, originY + drawL);
    // Gate line
    pdf.setDrawColor(16, 185, 129); // emerald
    pdf.setLineWidth(0.4);
    pdf.line(originX + gateLeftPaper, originY + drawL, originX + gateLeftPaper + gateWMmPaper, originY + drawL);
  } else {
    pdf.line(originX, originY + drawL, originX + drawW, originY + drawL);
  }

  // Front Gate line & text
  pdf.setDrawColor(16, 185, 129);
  pdf.setLineWidth(0.5);
  pdf.line(originX + gateLeftPaper, originY, originX + gateLeftPaper + gateWMmPaper, originY);
  pdf.line(originX + gateLeftPaper, originY, originX + gateLeftPaper, originY - 2.5);
  pdf.line(originX + gateLeftPaper + gateWMmPaper, originY, originX + gateLeftPaper + gateWMmPaper, originY - 2.5);

  pdf.setFont("Roboto", "bold");
  pdf.setFontSize(6.5);
  pdf.setTextColor(16, 185, 129);
  pdf.text(`BRÁNA ${doorW}m`, originX + gateLeftPaper + gateWMmPaper / 2 - 6, originY - 3.5);

  // Personal Door
  if (p.hasPersonalDoor) {
    const doorY = originY + 1.2 * scale;
    const doorWPaper = 0.9 * scale;
    pdf.setDrawColor(59, 130, 246);
    pdf.setLineWidth(0.4);
    // Leaf
    pdf.line(originX + drawW, doorY, originX + drawW + doorWPaper * 0.7, doorY + doorWPaper * 0.7);
    // Arc (approximated with small lines)
    pdf.text("DVERE 900", originX + drawW + 2, doorY + 3);
  }

  // Windows
  if (p.hasWindows && (p.windowCount ?? 0) > 0) {
    const count = p.windowCount ?? 1;
    const winWPaper = 1.2 * scale;
    const step = drawL / (count + 1);
    pdf.setDrawColor(6, 182, 212);
    pdf.setLineWidth(0.4);
    for (let i = 1; i <= count; i++) {
      const winY = originY + step * i - winWPaper / 2;
      pdf.line(originX - 1.5, winY, originX - 1.5, winY + winWPaper);
      pdf.line(originX, winY, originX, winY + winWPaper);
    }
  }

  // Kóty (Dimensions)
  pdf.setDrawColor(71, 85, 105);
  pdf.setLineWidth(0.25);
  pdf.setTextColor(30, 41, 59);
  pdf.setFont("Roboto", "bold");
  pdf.setFontSize(7);

  // 1. Width Dimension (Top)
  const dimTopY = originY - 9;
  pdf.line(originX, originY - 2, originX, dimTopY - 2);
  pdf.line(originX + drawW, originY - 2, originX + drawW, dimTopY - 2);
  pdf.line(originX, dimTopY, originX + drawW, dimTopY);
  // Ticks
  pdf.line(originX - 1.2, dimTopY - 1.2, originX + 1.2, dimTopY + 1.2);
  pdf.line(originX + drawW - 1.2, dimTopY - 1.2, originX + drawW + 1.2, dimTopY + 1.2);
  pdf.text(`${(w * 1000).toFixed(0)} mm`, originX + drawW / 2 - 8, dimTopY - 1.5);

  // 2. Length Dimension (Right)
  const dimRightX = originX + drawW + 20;
  pdf.line(originX + drawW + 2, originY, dimRightX + 2, originY);
  pdf.line(originX + drawW + 2, originY + drawL, dimRightX + 2, originY + drawL);
  pdf.line(dimRightX, originY, dimRightX, originY + drawL);
  pdf.line(dimRightX - 1.2, originY - 1.2, dimRightX + 1.2, originY + 1.2);
  pdf.line(dimRightX - 1.2, originY + drawL - 1.2, dimRightX + 1.2, originY + drawL + 1.2);
  pdf.text(`${(l * 1000).toFixed(0)} mm`, dimRightX + 2.5, originY + drawL / 2 + 1);

  // Title Block Table (Rohová pečiatka vpravo dole)
  const tbW = 75;
  const tbH = 65;
  const tbX = pageWidth - margin - tbW - 3;
  const tbY = pageHeight - margin - tbH - 3;

  pdf.setFillColor(248, 250, 252);
  pdf.setDrawColor(15, 23, 42);
  pdf.setLineWidth(0.4);
  pdf.rect(tbX, tbY, tbW, tbH, "FD");

  // Title block header
  pdf.setFillColor(15, 23, 42);
  pdf.rect(tbX, tbY, tbW, 8, "F");
  pdf.setFont("Roboto", "bold");
  pdf.setFontSize(8.5);
  pdf.setTextColor(255, 255, 255);
  pdf.text("VBAU s.r.o. — PROJEKTOVÝ LIST", tbX + 3, tbY + 5.5);

  // Rows inside title block
  const rows = [
    ["Projekt / Model:", modelName],
    ["Pôdorysné rozmery:", `${w.toFixed(2)} × ${l.toFixed(2)} m`],
    ["Zastavaná plocha:", `${(w * l).toFixed(1)} m²`],
    ["Svetlá výška (H):", `${p.clearHeight ?? 2.6} m`],
    ["Strecha & Sklon:", `${p.roofType === "gable" ? "Sedlová" : "Pultová"} (${p.roofPitchDeg}°)`],
    ["Opláštenie stien:", p.panelType === "sandwich" ? `Sendvič PIR ${p.wallPanelThicknessMm ?? 100}mm` : "Trapézový plech"],
    ["Brána & Rozmer:", `${doorW} × ${p.doorHeight ?? 2.2} m`],
    ["Merítko výkresu:", "1 : 100 (informačný)"],
    ["Dátum vyhotovenia:", dateStr],
  ];

  let curRowY = tbY + 13;
  pdf.setFontSize(6.8);

  rows.forEach(([label, val]) => {
    pdf.setFont("Roboto", "normal");
    pdf.setTextColor(100, 116, 139);
    pdf.text(label, tbX + 3, curRowY);

    pdf.setFont("Roboto", "bold");
    pdf.setTextColor(15, 23, 42);
    pdf.text(val, tbX + 30, curRowY);

    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(0.15);
    pdf.line(tbX + 2, curRowY + 1.8, tbX + tbW - 2, curRowY + 1.8);
    curRowY += 5.5;
  });

  // Stamp footnote
  pdf.setFont("Roboto", "normal");
  pdf.setFontSize(6);
  pdf.setTextColor(148, 163, 184);
  pdf.text("Vygenerované automatickým 3D konfigurátorom VBAU. Kóty a osi sú v mm.", margin + 4, pageHeight - margin - 3);

  // Trigger download using native jsPDF save
  try {
    const modelStr = p.hallType ? p.hallType.replace(/\s+/g, "_") : "Garaz";
    const filename = `${filenamePrefix}_${modelStr}_${p.width}x${p.length}m.pdf`;
    pdf.save(filename);
    toast.success("Výkres pôdorysu (PDF) bol úspešne stiahnutý.");
  } catch (err) {
    console.error("PDF download error:", err);
    toast.error("Nepodarilo sa stiahnuť PDF výkres.");
  }
}
