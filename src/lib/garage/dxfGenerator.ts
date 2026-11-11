import type { GarageParams } from "./types";
import { toast } from "sonner";

/**
 * Generates an AutoCAD compatible 2D DXF (Release 12 / 2000 ASCII)
 * containing the floor plan (pôdorys), column grid, wall outlines,
 * gate/door/window openings, dimensions, and annotations.
 */
export function generateGarageDxf(
  p: GarageParams,
  openings?: Array<{ bayId: string; category: string; width: number; height: number; x: number; y: number }>
): string {
  const w = p.width ?? 4;
  const l = p.length ?? 6;
  const h = p.clearHeight ?? 2.6;
  const bayCount = Math.max(2, p.bayCount ?? Math.round(l / 3));
  const bayLength = l / bayCount;
  const doorW = p.doorWidth ?? 2.5;
  const doorH = p.doorHeight ?? 2.1;
  const colSize = p.profileSize ? Math.round(p.profileSize * 1000) : 100; // mm

  // Convert to millimeters for standard CAD 1:1 engineering drafting
  const W = Math.round(w * 1000);
  const L = Math.round(l * 1000);
  const bayMm = Math.round(bayLength * 1000);
  const gateWMm = Math.round(doorW * 1000);

  const lines: string[] = [];

  // DXF HEADER
  lines.push(
    "0", "SECTION",
    "2", "HEADER",
    "9", "$ACADVER",
    "1", "AC1015", // AutoCAD 2000 format
    "9", "$INSUNITS",
    "70", "4", // 4 = Millimeters
    "0", "ENDSEC"
  );

  // DXF TABLES (LAYERS)
  lines.push(
    "0", "SECTION",
    "2", "TABLES",
    "0", "TABLE",
    "2", "LAYER",
    "70", "6",
    // Layer 0
    "0", "LAYER", "2", "0", "70", "0", "62", "7", "6", "CONTINUOUS",
    // Layer OBRYS_STAVBY (cyan)
    "0", "LAYER", "2", "OBRYS_STAVBY", "70", "0", "62", "4", "6", "CONTINUOUS",
    // Layer NOSNA_KONSTRUKCIA (red)
    "0", "LAYER", "2", "NOSNA_KONSTRUKCIA", "70", "0", "62", "1", "6", "CONTINUOUS",
    // Layer OTVORY (green)
    "0", "LAYER", "2", "OTVORY", "70", "0", "62", "3", "6", "CONTINUOUS",
    // Layer KOTY (yellow)
    "0", "LAYER", "2", "KOTY", "70", "0", "62", "2", "6", "CONTINUOUS",
    // Layer TEXTY_POPIS (white)
    "0", "LAYER", "2", "TEXTY_POPIS", "70", "0", "62", "7", "6", "CONTINUOUS",
    "0", "ENDTAB",
    "0", "ENDSEC"
  );

  // DXF ENTITIES
  lines.push("0", "SECTION", "2", "ENTITIES");

  // Helper: Line
  const addLine = (layer: string, x1: number, y1: number, x2: number, y2: number) => {
    lines.push(
      "0", "LINE",
      "8", layer,
      "10", x1.toFixed(1),
      "20", y1.toFixed(1),
      "30", "0.0",
      "11", x2.toFixed(1),
      "21", y2.toFixed(1),
      "31", "0.0"
    );
  };

  // Helper: Text
  const addText = (layer: string, x: number, y: number, height: number, text: string, rotation = 0) => {
    lines.push(
      "0", "TEXT",
      "8", layer,
      "10", x.toFixed(1),
      "20", y.toFixed(1),
      "30", "0.0",
      "40", height.toFixed(1),
      "1", text
    );
    if (rotation !== 0) {
      lines.push("50", rotation.toFixed(1));
    }
  };

  // Helper: Dimension line with end ticks & measurement text
  const addDim = (
    layer: string,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    offset: number,
    horizontal = true
  ) => {
    const tick = 120; // 120mm tick mark
    const textHeight = 160;

    if (horizontal) {
      const dimY = y1 + offset;
      // Extension lines
      addLine(layer, x1, y1 + (offset > 0 ? 50 : -50), x1, dimY + (offset > 0 ? 50 : -50));
      addLine(layer, x2, y2 + (offset > 0 ? 50 : -50), x2, dimY + (offset > 0 ? 50 : -50));
      // Dimension main line
      addLine(layer, x1, dimY, x2, dimY);
      // Ticks
      addLine(layer, x1 - tick * 0.7, dimY - tick * 0.7, x1 + tick * 0.7, dimY + tick * 0.7);
      addLine(layer, x2 - tick * 0.7, dimY - tick * 0.7, x2 + tick * 0.7, dimY + tick * 0.7);
      // Distance text
      const dist = Math.abs(x2 - x1);
      const midX = (x1 + x2) / 2 - (dist >= 1000 ? 180 : 120);
      const textY = offset > 0 ? dimY + 40 : dimY - 180;
      addText(layer, midX, textY, textHeight, `${dist.toFixed(0)} mm`);
    } else {
      const dimX = x1 + offset;
      // Extension lines
      addLine(layer, x1 + (offset > 0 ? 50 : -50), y1, dimX + (offset > 0 ? 50 : -50), y1);
      addLine(layer, x2 + (offset > 0 ? 50 : -50), y2, dimX + (offset > 0 ? 50 : -50), y2);
      // Dimension main line
      addLine(layer, dimX, y1, dimX, y2);
      // Ticks
      addLine(layer, dimX - tick * 0.7, y1 - tick * 0.7, dimX + tick * 0.7, y1 + tick * 0.7);
      addLine(layer, dimX - tick * 0.7, y2 - tick * 0.7, dimX + tick * 0.7, y2 + tick * 0.7);
      // Distance text
      const dist = Math.abs(y2 - y1);
      const midY = (y1 + y2) / 2 - 120;
      const textX = offset > 0 ? dimX + 40 : dimX - 220;
      addText(layer, textX, midY, textHeight, `${dist.toFixed(0)} mm`, 90);
    }
  };

  // Helper: Draw rectangular column
  const addColumn = (cx: number, cy: number, size = colSize) => {
    const half = size / 2;
    addLine("NOSNA_KONSTRUKCIA", cx - half, cy - half, cx + half, cy - half);
    addLine("NOSNA_KONSTRUKCIA", cx + half, cy - half, cx + half, cy + half);
    addLine("NOSNA_KONSTRUKCIA", cx + half, cy + half, cx - half, cy + half);
    addLine("NOSNA_KONSTRUKCIA", cx - half, cy + half, cx - half, cy - half);
    // Center cross
    addLine("NOSNA_KONSTRUKCIA", cx - half, cy, cx + half, cy);
    addLine("NOSNA_KONSTRUKCIA", cx, cy - half, cx, cy + half);
  };

  // 1. OBRYS STAVBY (Steny)
  // Predná stena: y = 0
  // Zadná stena: y = L
  // Ľavá stena: x = 0
  // Pravá stena: x = W
  const gateLeft = (W - gateWMm) / 2;
  const gateRight = gateLeft + gateWMm;

  // Predná stena (s vynechaním brány)
  if (gateLeft > 0) {
    addLine("OBRYS_STAVBY", 0, 0, gateLeft, 0);
  }
  addLine("OBRYS_STAVBY", gateRight, 0, W, 0);

  // Bočné a zadná stena
  addLine("OBRYS_STAVBY", W, 0, W, L); // Pravá stena
  addLine("OBRYS_STAVBY", 0, 0, 0, L); // Ľavá stena

  if (p.hasBackDoor) {
    const backGateLeft = (W - gateWMm) / 2;
    const backGateRight = backGateLeft + gateWMm;
    addLine("OBRYS_STAVBY", 0, L, backGateLeft, L);
    addLine("OBRYS_STAVBY", backGateRight, L, W, L);
    // Zadná brána
    addLine("OTVORY", backGateLeft, L, backGateRight, L);
    addText("OTVORY", (W - gateWMm) / 2 + 100, L + 120, 140, `ZADNÁ BRÁNA Š=${gateWMm}`);
  } else {
    addLine("OBRYS_STAVBY", 0, L, W, L); // Plná zadná stena
  }

  // 2. HLAVNÁ BRÁNA (Predná stena)
  addLine("OTVORY", gateLeft, 0, gateRight, 0);
  addLine("OTVORY", gateLeft, 0, gateLeft, -150);
  addLine("OTVORY", gateRight, 0, gateRight, -150);
  addText("OTVORY", gateLeft + 100, -220, 150, `SEKČNÁ BRÁNA ${doorW.toFixed(1)} × ${doorH.toFixed(1)} m`);

  // 3. PERSONÁLNE DVERE (ak sú aktívne)
  if (p.hasPersonalDoor) {
    const doorX = W - 100;
    const doorY = 1200;
    const pDoorW = 900;
    addLine("OTVORY", W, doorY, W, doorY + pDoorW);
    // Krídlo dverí oblúk / línia
    addLine("OTVORY", W, doorY, W + pDoorW * 0.7, doorY + pDoorW * 0.7);
    addText("OTVORY", W + 80, doorY + 300, 120, "DVERE 900");
  }

  // 4. OKNÁ (ak sú aktívne)
  if (p.hasWindows) {
    const count = p.windowCount || 1;
    const winW = 1200;
    const step = L / (count + 1);
    for (let i = 1; i <= count; i++) {
      const winY = Math.round(step * i - winW / 2);
      addLine("OTVORY", 0, winY, 0, winY + winW);
      addLine("OTVORY", -60, winY, -60, winY + winW);
      addText("OTVORY", -450, winY + 200, 110, "OKNO", 90);
    }
  }

  // 4B. DYNAMICKÉ OTVORY Z EDITORA POLÍ (okná, dvere, bočné brány)
  if (openings && openings.length > 0) {
    openings.forEach((op) => {
      const [prefix, idxStr] = op.bayId.split("-");
      const bIdx = Math.max(0, (parseInt(idxStr, 10) || 1) - 1);
      const startMm = Math.round(bIdx * bayMm + op.x * 1000);
      const lenMm = Math.round(op.width * 1000);
      const label = `${op.category.toUpperCase()} ${(op.width * 1000).toFixed(0)}x${(op.height * 1000).toFixed(0)}`;
      if (prefix === "A") {
        addLine("OTVORY", 0, startMm, 0, startMm + lenMm);
        addLine("OTVORY", -80, startMm, -80, startMm + lenMm);
        addText("OTVORY", -250, startMm + 100, 110, label, 90);
      } else if (prefix === "C") {
        addLine("OTVORY", W, startMm, W, startMm + lenMm);
        addLine("OTVORY", W + 80, startMm, W + 80, startMm + lenMm);
        addText("OTVORY", W + 220, startMm + 100, 110, label, 90);
      }
    });
  }

  // 5. MODULOVÝ RÁMOVÝ RASTER & STĹPY
  for (let b = 0; b <= bayCount; b++) {
    const yMm = Math.round(b * bayMm);
    // Os rámu (čiarkovaná línia)
    addLine("NOSNA_KONSTRUKCIA", -300, yMm, W + 300, yMm);
    addText("NOSNA_KONSTRUKCIA", -550, yMm - 60, 130, `OS ${b + 1}`);
    addText("NOSNA_KONSTRUKCIA", W + 360, yMm - 60, 130, `OS ${b + 1}`);

    // Stĺpy (ľavý a pravý)
    addColumn(0, yMm);
    addColumn(W, yMm);
  }

  // 6. KÓTOVANIE (DIMENSIONS)
  // Celková šírka dole
  addDim("KOTY", 0, 0, W, 0, -600, true);
  // Kóta brány dole
  addDim("KOTY", gateLeft, 0, gateRight, 0, -350, true);
  // Celková dĺžka vpravo
  addDim("KOTY", W, 0, W, L, 700, false);
  // Modulové kóty vpravo
  for (let b = 0; b < bayCount; b++) {
    const y1 = Math.round(b * bayMm);
    const y2 = Math.round((b + 1) * bayMm);
    addDim("KOTY", W, y1, W, y2, 400, false);
  }

  // 7. POPISOVÝ BLOK (TITLE BLOCK)
  const titleX = W + 1500;
  const titleY = L > 3000 ? L - 1500 : 1500;
  const titleW = 2800;
  const titleH = 1400;

  // Obdĺžnik tabuľky
  addLine("TEXTY_POPIS", titleX, titleY, titleX + titleW, titleY);
  addLine("TEXTY_POPIS", titleX + titleW, titleY, titleX + titleW, titleY + titleH);
  addLine("TEXTY_POPIS", titleX + titleW, titleY + titleH, titleX, titleY + titleH);
  addLine("TEXTY_POPIS", titleX, titleY + titleH, titleX, titleY);

  const modelName = p.hallType && p.hallType !== "Vlastný" ? p.hallType : "VLASTNÁ GARÁŽ";
  const areaM2 = (w * l).toFixed(1);

  addText("TEXTY_POPIS", titleX + 100, titleY + 1150, 180, "VBAU — 3D CAD GENERÁTOR");
  addText("TEXTY_POPIS", titleX + 100, titleY + 950, 140, `MODEL: ${modelName}`);
  addText("TEXTY_POPIS", titleX + 100, titleY + 750, 130, `PÔDORYS: ${w.toFixed(2)} × ${l.toFixed(2)} m (Plocha: ${areaM2} m²)`);
  addText("TEXTY_POPIS", titleX + 100, titleY + 570, 120, `SVETLÁ VÝŠKA H: ${h.toFixed(2)} m · STRECHA: ${p.roofType === "gable" ? "Sedlová" : "Pultová"} (${p.roofPitchDeg}°)`);
  addText("TEXTY_POPIS", titleX + 100, titleY + 390, 120, `OPLÁŠTENIE: ${p.panelType === "sandwich" ? `Sendvičový panel ${p.wallPanelThicknessMm || 100}mm` : "Trapézový plech"}`);
  addText("TEXTY_POPIS", titleX + 100, titleY + 210, 110, `MIERKA: 1:1 (mm) · DÁTUM: ${new Date().toLocaleDateString("sk-SK")}`);

  // END OF ENTITIES & FILE
  lines.push("0", "ENDSEC", "0", "EOF");

  return lines.join("\n");
}

/**
 * Initiates browser download of the generated DXF file.
 */
export function downloadGarageDxf(p: GarageParams, filenamePrefix = "Podorys_Konstrukcie"): void {
  try {
    const dxfContent = generateGarageDxf(p);
    const blob = new Blob([dxfContent], { type: "application/dxf;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const modelStr = p.hallType ? p.hallType.replace(/\s+/g, "_") : "Garaz";
    a.href = url;
    a.download = `${filenamePrefix}_${modelStr}_${p.width}x${p.length}m.dxf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 60000);
    toast.success("CAD výkres (.dxf) bol úspešne stiahnutý.");
  } catch (err) {
    console.error("DXF download error:", err);
    toast.error("Nepodarilo sa stiahnuť DXF výkres.");
  }
}
