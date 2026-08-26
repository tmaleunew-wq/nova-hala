import type { GarageParams } from "./types";

// ─── Geometry helpers (shared between PriceCalculator, vyhodnotenie, and email) ───

export function ridgeHeightCalc(p: GarageParams): number {
  if (p.roofType === "gable") {
    return p.clearHeight + (p.width / 2) * Math.tan((p.roofPitchDeg * Math.PI) / 180);
  }
  return p.clearHeight + p.width * Math.tan((p.roofPitchDeg * Math.PI) / 180);
}

export function highEaveCalc(p: GarageParams): number {
  return p.roofType === "shed" ? ridgeHeightCalc(p) : p.clearHeight;
}

export interface GarageCalcResult {
  totalSteelLength: number;
  totalSteelWeight: number;
  totalCladdingArea: number;
  wallArea: number;
  gableArea: number;
  roofArea: number;
  basePlatesCount: number;
  frames: number;
}

export function calculateGarageGeometry(
  params: GarageParams,
  steelWeightPerMeter = 6.2,
): GarageCalcResult {
  const W = params.width;
  const L = params.length;
  const Heave = params.clearHeight;
  const Hridge = ridgeHeightCalc(params);
  const Hhi = highEaveCalc(params);
  const frames = params.bayCount + 1;

  // Columns
  const leftColH = Heave;
  const rightColH = params.roofType === "shed" ? Hhi : Heave;
  const totalColLength = frames * leftColH + frames * rightColH;

  // Rafters
  let totalRafterLength = 0;
  if (params.roofType === "gable") {
    const halfW = W / 2;
    const slopeLen = Math.hypot(halfW, Hridge - Heave);
    totalRafterLength = frames * 2 * slopeLen;
  } else {
    const slopeLen = Math.hypot(W, Hhi - Heave);
    totalRafterLength = frames * slopeLen;
  }

  // Purlins
  let totalPurlinLength = 0;
  if (params.roofType === "gable") {
    const halfW = W / 2;
    const slopeLen = Math.hypot(halfW, Hridge - Heave);
    const purlinCount = Math.max(2, Math.round(slopeLen / 0.8));
    totalPurlinLength = 2 * (purlinCount + 1) * L;
  } else {
    const slopeLen = Math.hypot(W, Hhi - Heave);
    const purlinCount = Math.max(3, Math.round(slopeLen / 0.8));
    totalPurlinLength = (purlinCount + 1) * L;
  }

  // Girts
  const heights = [0.6, 1.4, 2.2];
  let totalGirtsLength = 0;
  for (const h of heights) {
    if (h >= Heave) continue;
    const frontLen = h < params.doorHeight ? Math.max(0, W - params.doorWidth) : W;
    const backLen =
      params.personalDoorSide === "back" && params.hasPersonalDoor && h < 2.0
        ? Math.max(0, W - 0.9)
        : W;
    let leftLen = L;
    if (params.personalDoorSide === "left" && params.hasPersonalDoor && h < 2.0) {
      leftLen -= 0.9;
    }
    const winBottom = 1.6 - params.windowHeight / 2;
    const winTop = 1.6 + params.windowHeight / 2;
    if (h > winBottom && h < winTop) {
      leftLen -= params.windowCount * params.windowWidth;
    }
    const rightLen =
      params.personalDoorSide === "right" && params.hasPersonalDoor && h < 2.0
        ? Math.max(0, L - 0.9)
        : L;
    totalGirtsLength += frontLen + backLen + leftLen + rightLen;
  }

  const totalEaveRidgeLength = 2 * L + (params.roofType === "gable" ? L : 0);
  const totalSteelLength =
    totalColLength + totalRafterLength + totalPurlinLength + totalGirtsLength + totalEaveRidgeLength;
  const totalSteelWeight = totalSteelLength * steelWeightPerMeter;

  // Cladding areas
  const wallArea = 2 * W * Heave + 2 * L * Heave;
  const gableArea = params.roofType === "gable" ? W * (Hridge - Heave) : 0;
  let roofArea: number;
  if (params.roofType === "gable") {
    roofArea = 2 * Math.hypot(W / 2, Hridge - Heave) * L;
  } else {
    roofArea = Math.hypot(W, Hhi - Heave) * L;
  }
  const totalCladdingArea = wallArea + gableArea + roofArea;
  const basePlatesCount = frames * 2;

  return {
    totalSteelLength,
    totalSteelWeight,
    totalCladdingArea,
    wallArea,
    gableArea,
    roofArea,
    basePlatesCount,
    frames,
  };
}

// ─── Default pricing constants ───

export const DEFAULT_PRICES = {
  steelPricePerKg: 1.85,
  steelWeightPerMeter: 6.2,
  sandwichPricePerSqM: 32.5,
  trapezoidPricePerSqM: 16.8,
  basePlateCost: 12.0,
  garageDoorCost: 550.0,
  personalDoorCost: 220.0,
  windowCost: 140.0,
  foundationPricePerSqM: 65.0,
  transportCost: 150.0,
  laborCost: 850.0,
  marginPercent: 15,
} as const;

// ─── Excel XML generator ───

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export interface ExcelPricing {
  steelPricePerKg: number;
  steelWeightPerMeter: number;
  sandwichPricePerSqM: number;
  trapezoidPricePerSqM: number;
  basePlateCost: number;
  garageDoorCost: number;
  personalDoorCost: number;
  windowCost: number;
  foundationPricePerSqM: number;
  transportCost: number;
  laborCost: number;
  marginPercent: number;
  customItem1Label?: string;
  customItem1Cost?: number;
  customItem2Label?: string;
  customItem2Cost?: number;
}

export function generateOrderExcelXml(
  params: GarageParams,
  pricing: ExcelPricing = DEFAULT_PRICES,
  clientName?: string | null,
): string {
  const calc = calculateGarageGeometry(params, pricing.steelWeightPerMeter);
  const W = params.width;
  const L = params.length;
  const Heave = params.clearHeight;
  const date = new Date().toLocaleDateString("sk-SK");
  const roofLabel = params.roofType === "gable" ? "Sedlov\u00e1" : "Pultov\u00e1";
  const panelLabel =
    params.panelType === "sandwich"
      ? "Sendvi\u010dov\u00fd panel"
      : params.panelType === "smooth"
        ? "Hladk\u00fd panel"
        : "Trap\u00e9zov\u00fd plech";

  const activeCladdingUnitPrice =
    params.panelType === "sandwich" || params.panelType === "smooth"
      ? pricing.sandwichPricePerSqM
      : pricing.trapezoidPricePerSqM;

  const dataRows: {
    name: string;
    detail: string;
    qtyNum: number;
    unit: string;
    unitPrice: number;
  }[] = [
    {
      name: "Oce\u013eov\u00e1 nosn\u00e1 kon\u0161trukcia (jakl)",
      detail:
        "St\u013apy, krokvy, v\u00e4znice, pa\u017ed\u00edky (" +
        calc.totalSteelLength.toFixed(1) +
        " m)",
      qtyNum: calc.totalSteelWeight,
      unit: "kg",
      unitPrice: pricing.steelPricePerKg,
    },
    {
      name: "Opl\u00e1\u0161tenie stien a strechy (" + panelLabel + ")",
      detail: "Celkov\u00e1 plocha stien, \u0161t\u00edtov a strechy",
      qtyNum: calc.totalCladdingArea,
      unit: "m\u00b2",
      unitPrice: activeCladdingUnitPrice,
    },
    {
      name: "Kotviace platne / p\u00e4tky",
      detail: "Vr\u00e1tane spojovacieho materi\u00e1lu",
      qtyNum: calc.basePlatesCount,
      unit: "ks",
      unitPrice: pricing.basePlateCost,
    },
    {
      name: "Sekcion\u00e1lna gar\u00e1\u017eov\u00e1 br\u00e1na",
      detail: "Rozmer: " + params.doorWidth + " \u00d7 " + params.doorHeight + " m",
      qtyNum: 1,
      unit: "ks",
      unitPrice: pricing.garageDoorCost,
    },
  ];

  if (params.hasPersonalDoor) {
    dataRows.push({
      name: "Person\u00e1lne vstupn\u00e9 dvere",
      detail: "Umiestnenie: " + params.personalDoorSide,
      qtyNum: 1,
      unit: "ks",
      unitPrice: pricing.personalDoorCost,
    });
  }
  if (params.hasWindows && params.windowCount > 0) {
    dataRows.push({
      name: "Svetl\u00edkov\u00e9 okn\u00e1",
      detail: "Rozmer: " + params.windowWidth + " \u00d7 " + params.windowHeight + " m",
      qtyNum: params.windowCount,
      unit: "ks",
      unitPrice: pricing.windowCost,
    });
  }
  if (params.showFoundation) {
    dataRows.push({
      name: "\u017delezobeton. z\u00e1kladov\u00e1 plat\u0148a",
      detail: "Plocha: " + W + " \u00d7 " + L + " m",
      qtyNum: W * L,
      unit: "m\u00b2",
      unitPrice: pricing.foundationPricePerSqM,
    });
  }
  if (pricing.customItem1Cost && pricing.customItem1Cost > 0) {
    dataRows.push({
      name: pricing.customItem1Label?.trim() || "Volite\u013en\u00e1 polo\u017eka 1",
      detail: "Volite\u013en\u00e1 doplnkov\u00e1 slu\u017eba / polo\u017eka",
      qtyNum: 1,
      unit: "ks",
      unitPrice: pricing.customItem1Cost,
    });
  }
  if (pricing.customItem2Cost && pricing.customItem2Cost > 0) {
    dataRows.push({
      name: pricing.customItem2Label?.trim() || "Volite\u013en\u00e1 polo\u017eka 2",
      detail: "Volite\u013en\u00e1 doplnkov\u00e1 slu\u017eba / polo\u017eka",
      qtyNum: 1,
      unit: "ks",
      unitPrice: pricing.customItem2Cost,
    });
  }
  dataRows.push({
    name: "Doprava, logistika a vykl\u00e1dka",
    detail: "Pau\u0161\u00e1lna suma",
    qtyNum: 1,
    unit: "pau\u0161\u00e1l",
    unitPrice: pricing.transportCost,
  });
  dataRows.push({
    name: "Mont\u00e1\u017ene a stavebn\u00e9 pr\u00e1ce",
    detail: "Kompletn\u00e1 mont\u00e1\u017e kon\u0161trukcie a opl\u00e1\u0161tenia",
    qtyNum: 1,
    unit: "pr\u00e1ca",
    unitPrice: pricing.laborCost,
  });

  const firstDataRow = 11;
  const lastDataRow = firstDataRow + dataRows.length - 1;
  const marginRow = lastDataRow + 1;
  const subtotalRow = marginRow + 1;
  const vatRow = subtotalRow + 1;

  // Pre-compute margin for fallback display value
  const rawSubtotal = dataRows.reduce((sum, r) => sum + r.qtyNum * r.unitPrice, 0);
  const marginAmount = (rawSubtotal * pricing.marginPercent) / 100;
  const finalSubtotalBeforeVat = rawSubtotal + marginAmount;
  const vatAmount = finalSubtotalBeforeVat * 0.2;
  const finalTotalWithVat = finalSubtotalBeforeVat + vatAmount;

  const dataRowsXml = dataRows
    .map((r) => {
      return (
        "<Row>" +
        '<Cell ss:StyleID="s_text"><Data ss:Type="String">' +
        escapeXml(r.name) +
        "</Data></Cell>" +
        '<Cell ss:StyleID="s_text"><Data ss:Type="String">' +
        escapeXml(r.detail) +
        "</Data></Cell>" +
        '<Cell ss:StyleID="s_num"><Data ss:Type="Number">' +
        r.qtyNum +
        "</Data></Cell>" +
        '<Cell ss:StyleID="s_text"><Data ss:Type="String">' +
        escapeXml(r.unit) +
        "</Data></Cell>" +
        '<Cell ss:StyleID="s_price"><Data ss:Type="Number">' +
        r.unitPrice +
        "</Data></Cell>" +
        '<Cell ss:StyleID="s_total" ss:Formula="=RC[-3]*RC[-1]"><Data ss:Type="Number">' +
        (r.qtyNum * r.unitPrice) +
        "</Data></Cell>" +
        "</Row>"
      );
    })
    .join("\n   ");

  const clientLine = clientName
    ? '   <Row><Cell ss:StyleID="s_label"><Data ss:Type="String">Klient:</Data></Cell><Cell ss:StyleID="s_value"><Data ss:Type="String">' +
      escapeXml(clientName) +
      "</Data></Cell></Row>\n"
    : "";

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<?mso-application progid="Excel.Sheet"?>\n' +
    '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\n' +
    ' xmlns:o="urn:schemas-microsoft-com:office:office"\n' +
    ' xmlns:x="urn:schemas-microsoft-com:office:excel"\n' +
    ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n' +
    " <Styles>\n" +
    '  <Style ss:ID="Default"><Font ss:FontName="Calibri" ss:Size="11"/></Style>\n' +
    '  <Style ss:ID="s_title"><Font ss:FontName="Calibri" ss:Size="14" ss:Bold="1"/></Style>\n' +
    '  <Style ss:ID="s_header"><Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#10B981" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center"/></Style>\n' +
    '  <Style ss:ID="s_label"><Font ss:FontName="Calibri" ss:Size="10" ss:Color="#64748B"/></Style>\n' +
    '  <Style ss:ID="s_value"><Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1"/></Style>\n' +
    '  <Style ss:ID="s_text"><Font ss:FontName="Calibri" ss:Size="10"/></Style>\n' +
    '  <Style ss:ID="s_num"><Font ss:FontName="Calibri" ss:Size="10"/><NumberFormat ss:Format="#,##0.0"/><Alignment ss:Horizontal="Right"/></Style>\n' +
    '  <Style ss:ID="s_price"><Font ss:FontName="Calibri" ss:Size="10"/><NumberFormat ss:Format="#,##0.00"/><Alignment ss:Horizontal="Right"/><Interior ss:Color="#FEF9C3" ss:Pattern="Solid"/></Style>\n' +
    '  <Style ss:ID="s_total"><Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1"/><NumberFormat ss:Format="#,##0.00"/><Alignment ss:Horizontal="Right"/></Style>\n' +
    '  <Style ss:ID="s_margin_price"><Font ss:FontName="Calibri" ss:Size="10"/><NumberFormat ss:Format="0.0"/><Alignment ss:Horizontal="Right"/><Interior ss:Color="#FEF9C3" ss:Pattern="Solid"/></Style>\n' +
    '  <Style ss:ID="s_subtotal"><Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1"/><NumberFormat ss:Format="#,##0.00"/><Alignment ss:Horizontal="Right"/><Borders><Border ss:Position="Top" ss:LineStyle="Double" ss:Weight="3"/></Borders></Style>\n' +
    '  <Style ss:ID="s_grand"><Font ss:FontName="Calibri" ss:Size="13" ss:Bold="1" ss:Color="#065F46"/><NumberFormat ss:Format="#,##0.00"/><Alignment ss:Horizontal="Right"/><Interior ss:Color="#D1FAE5" ss:Pattern="Solid"/></Style>\n' +
    " </Styles>\n" +
    ' <Worksheet ss:Name="Kalkul\u00e1cia">\n' +
    '  <Table ss:DefaultColumnWidth="120">\n' +
    '   <Column ss:Index="1" ss:Width="280"/>\n' +
    '   <Column ss:Index="2" ss:Width="220"/>\n' +
    '   <Column ss:Index="3" ss:Width="80"/>\n' +
    '   <Column ss:Index="4" ss:Width="60"/>\n' +
    '   <Column ss:Index="5" ss:Width="120"/>\n' +
    '   <Column ss:Index="6" ss:Width="140"/>\n' +
    '   <Row><Cell ss:StyleID="s_title"><Data ss:Type="String">CENOV\u00c1 KALKUL\u00c1CIA \u2014 OCE\u013dOV\u00c1 GAR\u00c1\u017d</Data></Cell></Row>\n' +
    '   <Row><Cell ss:StyleID="s_label"><Data ss:Type="String">D\u00e1tum:</Data></Cell><Cell ss:StyleID="s_value"><Data ss:Type="String">' +
    date +
    '</Data></Cell><Cell/><Cell/><Cell ss:StyleID="s_label"><Data ss:Type="String">Mena:</Data></Cell><Cell ss:StyleID="s_value"><Data ss:Type="String">EUR</Data></Cell></Row>\n' +
    clientLine +
    '   <Row><Cell ss:StyleID="s_label"><Data ss:Type="String">Geometria:</Data></Cell><Cell ss:StyleID="s_value"><Data ss:Type="String">' +
    W +
    " \u00d7 " +
    L +
    " \u00d7 " +
    Heave +
    ' m</Data></Cell><Cell/><Cell/><Cell ss:StyleID="s_label"><Data ss:Type="String">Strecha:</Data></Cell><Cell ss:StyleID="s_value"><Data ss:Type="String">' +
    roofLabel +
    " (" +
    params.roofPitchDeg +
    "\u00b0)</Data></Cell></Row>\n" +
    '   <Row><Cell ss:StyleID="s_label"><Data ss:Type="String">Opl\u00e1\u0161tenie:</Data></Cell><Cell ss:StyleID="s_value"><Data ss:Type="String">' +
    panelLabel +
    " (" +
    params.insulationCore +
    " " +
    params.wallPanelThicknessMm +
    'mm)</Data></Cell><Cell/><Cell/><Cell ss:StyleID="s_label"><Data ss:Type="String">Profil jaklu:</Data></Cell><Cell ss:StyleID="s_value"><Data ss:Type="String">' +
    (params.profileSize * 1000).toFixed(0) +
    "\u00d7" +
    (params.profileSize * 1000).toFixed(0) +
    "\u00d7" +
    (params.profileThickness * 1000).toFixed(0) +
    " mm</Data></Cell></Row>\n" +
    '   <Row><Cell ss:StyleID="s_label"><Data ss:Type="String">Br\u00e1na:</Data></Cell><Cell ss:StyleID="s_value"><Data ss:Type="String">1x ' +
    params.doorWidth +
    "\u00d7" +
    params.doorHeight +
    'm</Data></Cell><Cell/><Cell/><Cell ss:StyleID="s_label"><Data ss:Type="String">Dvere:</Data></Cell><Cell ss:StyleID="s_value"><Data ss:Type="String">' +
    (params.hasPersonalDoor ? "1x (" + params.personalDoorSide + ")" : "Nie") +
    "</Data></Cell></Row>\n" +
    '   <Row><Cell ss:StyleID="s_label"><Data ss:Type="String">Okn\u00e1:</Data></Cell><Cell ss:StyleID="s_value"><Data ss:Type="String">' +
    (params.hasWindows ? params.windowCount + "x" : "Nie") +
    '</Data></Cell><Cell/><Cell/><Cell ss:StyleID="s_label"><Data ss:Type="String">Z\u00e1kladov\u00e1 doska:</Data></Cell><Cell ss:StyleID="s_value"><Data ss:Type="String">' +
    (params.showFoundation ? "\u00c1no" : "Nie") +
    "</Data></Cell></Row>\n" +
    "   <Row/>\n" +
    "   <Row/>\n" +
    "   <Row>\n" +
    '    <Cell ss:StyleID="s_header"><Data ss:Type="String">Polo\u017eka</Data></Cell>\n' +
    '    <Cell ss:StyleID="s_header"><Data ss:Type="String">Popis</Data></Cell>\n' +
    '    <Cell ss:StyleID="s_header"><Data ss:Type="String">Mno\u017estvo</Data></Cell>\n' +
    '    <Cell ss:StyleID="s_header"><Data ss:Type="String">MJ</Data></Cell>\n' +
    '    <Cell ss:StyleID="s_header"><Data ss:Type="String">Jedn. cena \u20ac \u270f\ufe0f</Data></Cell>\n' +
    '    <Cell ss:StyleID="s_header"><Data ss:Type="String">Cena bez DPH \u20ac</Data></Cell>\n' +
    "   </Row>\n" +
    "   " +
    dataRowsXml +
    "\n" +
    "   <Row>\n" +
    '    <Cell ss:StyleID="s_text"><Data ss:Type="String">R\u00e9\u017eie, mar\u017ea a poistenie riz\u00edk</Data></Cell>\n' +
    '    <Cell ss:StyleID="s_text"><Data ss:Type="String">Percentu\u00e1lna prir\u00e1\u017eka z medzis\u00fa\u010dtu</Data></Cell>\n' +
    "    <Cell/>\n" +
    '    <Cell ss:StyleID="s_text"><Data ss:Type="String">%</Data></Cell>\n' +
    '    <Cell ss:StyleID="s_margin_price"><Data ss:Type="Number">' +
    pricing.marginPercent +
    "</Data></Cell>\n" +
    '    <Cell ss:StyleID="s_total" ss:Formula="=SUM(R' +
    firstDataRow +
    "C6:R" +
    lastDataRow +
    'C6)*RC[-1]/100"><Data ss:Type="Number">' +
    marginAmount +
    "</Data></Cell>\n" +
    "   </Row>\n" +
    "   <Row>\n" +
    '    <Cell ss:MergeAcross="4" ss:StyleID="s_subtotal"><Data ss:Type="String">SPOLU BEZ DPH</Data></Cell>\n' +
    '    <Cell ss:StyleID="s_subtotal" ss:Formula="=SUM(R' +
    firstDataRow +
    "C6:R" +
    marginRow +
    'C6)"><Data ss:Type="Number">' +
    finalSubtotalBeforeVat +
    "</Data></Cell>\n" +
    "   </Row>\n" +
    "   <Row>\n" +
    '    <Cell ss:MergeAcross="4" ss:StyleID="s_text"><Data ss:Type="String">DPH (20%)</Data></Cell>\n' +
    '    <Cell ss:StyleID="s_total" ss:Formula="=R' +
    subtotalRow +
    'C6*0.2"><Data ss:Type="Number">' +
    vatAmount +
    "</Data></Cell>\n" +
    "   </Row>\n" +
    "   <Row>\n" +
    '    <Cell ss:MergeAcross="4" ss:StyleID="s_grand"><Data ss:Type="String">KONE\u010cN\u00c1 CENA S DPH</Data></Cell>\n' +
    '    <Cell ss:StyleID="s_grand" ss:Formula="=R' +
    subtotalRow +
    "C6+R" +
    vatRow +
    'C6"><Data ss:Type="Number">' +
    finalTotalWithVat +
    "</Data></Cell>\n" +
    "   </Row>\n" +
    "   <Row/>\n" +
    "   <Row>\n" +
    '    <Cell ss:MergeAcross="5" ss:StyleID="s_label"><Data ss:Type="String">\u270f\ufe0f \u017dlt\u00e9 bunky v st\u013apci Jedn. cena s\u00fa editovate\u013en\u00e9. Po zmene sa celkov\u00e9 sumy automaticky prepo\u010d\u00edtaj\u00fa.</Data></Cell>\n' +
    "   </Row>\n" +
    "  </Table>\n" +
    " </Worksheet>\n" +
    "</Workbook>";

  return xml;
}
