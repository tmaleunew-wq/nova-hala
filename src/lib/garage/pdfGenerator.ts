import { jsPDF } from "jspdf";
import { type GarageParams, resolveColorName } from "@/lib/garage/types";
import { ridgeHeight, highEave } from "@/components/garage/Structure";
import { ROBOTO_REGULAR_B64, ROBOTO_BOLD_B64 } from "./pdfFonts";
import { calculateGarageBom } from "./bomCalculator";

export interface CustomerData {
  name: string;
  email: string;
  phone: string;
  city?: string;
  notes?: string;
}

export interface QuotePricingSummary {
  steelCost: number;
  claddingCost: number;
  componentsSubtotal: number;
  laborAndTransport: number;
  subtotalBeforeVat: number;
  vatAmount: number;
  totalWithVat: number;
  hidePrices?: boolean;
}

const SUCCESS_STYLE_ID = "ssf-pdf-success-styles";
const SUCCESS_OVERLAY_ID = "ssf-pdf-success-overlay";

function formatDate(date?: Date) {
  return new Intl.DateTimeFormat("sk-SK", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date || new Date());
}

function drawBox(
  pdf: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  title: string,
  value: string,
  opts?: {
    titleColor?: [number, number, number];
    valueColor?: [number, number, number];
    borderColor?: [number, number, number];
    bgColor?: [number, number, number];
  }
) {
  const theme = opts || {};
  const titleColor = theme.titleColor || [102, 112, 133];
  const valueColor = theme.valueColor || [16, 24, 40];
  const borderColor = theme.borderColor || [229, 231, 235];
  const bgColor = theme.bgColor || [255, 255, 255];
  const hasBg = !!theme.bgColor;

  const titleLines = pdf.splitTextToSize(String(title || "").toUpperCase(), w - 8);
  const valueLines = pdf.splitTextToSize(String(value || "-"), w - 8);

  const lineHeightTitle = 3.6;
  const lineHeightValue = 4.8;
  const contentHeight = 4 + titleLines.length * lineHeightTitle + 2 + valueLines.length * lineHeightValue + 4;
  const boxHeight = Math.max(h || 0, contentHeight);

  pdf.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  if (hasBg) {
    pdf.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
    pdf.roundedRect(x, y, w, boxHeight, 3, 3, "FD");
  } else {
    pdf.roundedRect(x, y, w, boxHeight, 3, 3, "S");
  }

  const ty = y + 4;
  pdf.setFont("Roboto", "normal");
  pdf.setFontSize(7.5);
  pdf.setTextColor(titleColor[0], titleColor[1], titleColor[2]);
  pdf.text(titleLines, x + 4, ty + 1.5);

  const vy = ty + titleLines.length * lineHeightTitle + 1.5;
  pdf.setFont("Roboto", "bold");
  pdf.setFontSize(9.5);
  pdf.setTextColor(valueColor[0], valueColor[1], valueColor[2]);
  pdf.text(valueLines, x + 4, vy + 3);

  return boxHeight;
}

function drawPricingRow(
  pdf: jsPDF,
  x: number,
  y: number,
  w: number,
  label: string,
  price: string,
  opts?: {
    borderColor?: [number, number, number];
    fillColor?: [number, number, number];
    labelColor?: [number, number, number];
    priceColor?: [number, number, number];
    textColor?: [number, number, number];
    emphasize?: boolean;
    priceWidth?: number;
  }
) {
  const theme = opts || {};
  const borderColor = theme.borderColor || [229, 231, 235];
  const fillColor = theme.fillColor || [255, 255, 255];
  const labelColor = theme.textColor || theme.labelColor || [16, 24, 40];
  const priceColor = theme.textColor || theme.priceColor || [16, 24, 40];
  const emphasize = !!theme.emphasize;
  const priceWidth = theme.priceWidth || 42;
  const gap = 4;
  const labelWidth = w - priceWidth - gap - 8;
  const labelLines = pdf.splitTextToSize(label || "-", labelWidth);
  const rowHeight = Math.max(9, 4 + labelLines.length * 4);

  pdf.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  pdf.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
  pdf.roundedRect(x, y, w, rowHeight, 2, 2, "FD");

  const ty = y + 4.5;
  pdf.setFont("Roboto", emphasize ? "bold" : "normal");
  pdf.setFontSize(emphasize ? 9.5 : 8.5);
  pdf.setTextColor(labelColor[0], labelColor[1], labelColor[2]);
  pdf.text(labelLines, x + 4, ty);

  pdf.setFont("Roboto", "bold");
  pdf.setFontSize(emphasize ? 10 : 8.5);
  pdf.setTextColor(priceColor[0], priceColor[1], priceColor[2]);
  pdf.text(price, x + w - 4, ty, { align: "right" });

  return y + rowHeight + 2;
}

export function ensureSuccessStyles() {
  if (typeof document === "undefined" || document.getElementById(SUCCESS_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = SUCCESS_STYLE_ID;
  style.textContent = `
    #${SUCCESS_OVERLAY_ID}{position:fixed;inset:0;background:rgba(15,23,42,.88);backdrop-filter:blur(10px);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px;animation:ssfFadeIn .3s ease}
    #${SUCCESS_OVERLAY_ID} *{box-sizing:border-box}
    #${SUCCESS_OVERLAY_ID} .ssf-success-card{background:rgba(17,24,39,.98);border:1px solid rgba(148,163,184,.25);border-radius:28px;width:100%;max-width:460px;padding:32px;text-align:center;box-shadow:0 30px 60px -12px rgba(0,0,0,.6);color:#fff;font-family:Inter,system-ui,-apple-system,sans-serif}
    #${SUCCESS_OVERLAY_ID} .ssf-success-icon{width:64px;height:64px;background:#10b981;color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-size:32px;font-weight:bold;box-shadow:0 0 20px rgba(16,185,129,.4)}
    #${SUCCESS_OVERLAY_ID} .ssf-success-title{font-size:22px;font-weight:800;margin:0 0 10px;color:#fff;letter-spacing:-.01em}
    #${SUCCESS_OVERLAY_ID} .ssf-success-text{font-size:13.5px;color:#94a3b8;line-height:1.6;margin:0 0 24px}
    #${SUCCESS_OVERLAY_ID} .ssf-dealer-box{background:rgba(15,23,42,.7);border:1px solid rgba(148,163,184,.18);border-radius:18px;padding:18px;margin-bottom:24px;text-align:left}
    #${SUCCESS_OVERLAY_ID} .ssf-dealer-label{font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.12em;margin-bottom:10px;display:block;font-weight:700}
    #${SUCCESS_OVERLAY_ID} .ssf-dealer-info{display:flex;flex-direction:column;gap:8px}
    #${SUCCESS_OVERLAY_ID} .ssf-dealer-name{font-weight:700;color:#fff;font-size:14px}
    #${SUCCESS_OVERLAY_ID} .ssf-dealer-row{display:flex;align-items:center;gap:10px;font-size:12.5px;color:#e2e8f0}
    #${SUCCESS_OVERLAY_ID} .ssf-success-actions{display:flex;flex-direction:column;gap:10px}
    #${SUCCESS_OVERLAY_ID} .ssf-btn-pdf{background:#10b981;color:#0b0f14;border:none;border-radius:14px;padding:15px;font-weight:800;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;transition:all .15s ease;box-shadow:0 10px 20px -5px rgba(16,185,129,.3)}
    #${SUCCESS_OVERLAY_ID} .ssf-btn-pdf:hover{transform:translateY(-1px);filter:brightness(1.08)}
    #${SUCCESS_OVERLAY_ID} .ssf-btn-pdf:active{transform:translateY(1px)}
    #${SUCCESS_OVERLAY_ID} .ssf-success-close{background:rgba(148,163,184,.08);color:#94a3b8;border:1px solid rgba(148,163,184,.15);border-radius:14px;padding:13px;font-weight:600;font-size:13px;cursor:pointer;transition:background .15s}
    #${SUCCESS_OVERLAY_ID} .ssf-success-close:hover{background:rgba(148,163,184,.12);color:#fff}
    @keyframes ssfFadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  `;
  document.head.appendChild(style);
}

export function showSuccessModal({
  quoteId,
  customerEmail,
  pdfBlob,
  onClose,
}: {
  quoteId: string;
  customerEmail?: string;
  pdfBlob?: Blob | null;
  onClose?: () => void;
}) {
  ensureSuccessStyles();
  const existing = document.getElementById(SUCCESS_OVERLAY_ID);
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.id = SUCCESS_OVERLAY_ID;
  overlay.innerHTML = `
    <div class="ssf-success-card">
      <div class="ssf-success-icon">&#10003;</div>
      <h3 class="ssf-success-title">Výborne! Váš dopyt je odoslaný.</h3>
      <p class="ssf-success-text">
        Vaša cenová ponuka (ID: <strong>${quoteId}</strong>) bola úspešne uložená a odoslaná na e-mail <strong>${customerEmail || "váš e-mail"}</strong>. 
        Náš obchodný zástupca vás bude čoskoro kontaktovať pre dohodnutie ďalšieho postupu.
      </p>

      <div class="ssf-dealer-box">
        <span class="ssf-dealer-label">KONTAKT NA PREDAJCU</span>
        <div class="ssf-dealer-info">
          <div class="ssf-dealer-name">VBAU s.r.o.</div>
          <div class="ssf-dealer-row">&#9993; tmal.eu.new@gmail.com</div>
          <div class="ssf-dealer-row">&#9990; +421 900 000 000</div>
          <div class="ssf-dealer-row">&#9679; Slovenská republika</div>
        </div>
      </div>

      <div class="ssf-success-actions">
        <button id="ssf-btn-pdf-download" class="ssf-btn-pdf" type="button">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:18px;height:18px"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Stiahnuť ponuku (PDF)
        </button>
        <button class="ssf-success-close" type="button">Zavrieť</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const pdfBtn = overlay.querySelector<HTMLButtonElement>("#ssf-btn-pdf-download");
  if (pdfBtn && pdfBlob) {
    pdfBtn.onclick = () => {
      const blobUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `cenova_ponuka_${quoteId}.pdf`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1500);
    };
  } else if (pdfBtn) {
    pdfBtn.onclick = () => {
      window.print();
    };
  }

  const closeButton = overlay.querySelector<HTMLButtonElement>(".ssf-success-close");
  closeButton?.addEventListener("click", () => {
    overlay.remove();
    if (onClose) onClose();
  });
}

export function generateGarageQuotePDF({
  params,
  customer,
  quoteId,
  pricing,
  evaluationUrl,
  imageDataUrl,
}: {
  params: GarageParams;
  customer: CustomerData;
  quoteId: string;
  pricing: QuotePricingSummary;
  evaluationUrl?: string;
  imageDataUrl?: string;
}): Blob {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  // Register Roboto fonts for complete Slovak UTF-8 support
  try {
    pdf.addFileToVFS("Roboto-Regular.ttf", ROBOTO_REGULAR_B64);
    pdf.addFileToVFS("Roboto-Bold.ttf", ROBOTO_BOLD_B64);
    pdf.addFont("Roboto-Regular.ttf", "Roboto", "normal");
    pdf.addFont("Roboto-Bold.ttf", "Roboto", "bold");
    pdf.setFont("Roboto", "normal");
  } catch (err) {
    console.warn("Failed to register Roboto font in jsPDF, using standard helvetica", err);
  }

  const margin = 10;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const usableWidth = pageWidth - margin * 2;
  const primaryRGB: [number, number, number] = [0, 200, 255]; // Pergola Pro Cyan accent #00c8ff
  let y = margin;

  // Top Accent Bar
  pdf.setDrawColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
  pdf.setLineWidth(0.8);
  pdf.line(margin, margin + 22, pageWidth - margin, margin + 22);

  // Header Details
  pdf.setFont("Roboto", "bold");
  pdf.setFontSize(7.5);
  pdf.setTextColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
  pdf.text("OFICIÁLNA CENOVÁ PONUKA — OCEĽOVÉ GARÁŽE", margin, y + 2);

  pdf.setFont("Roboto", "bold");
  pdf.setFontSize(16);
  pdf.setTextColor(16, 24, 40);
  pdf.text("VBAU s.r.o.", margin, y + 9);

  pdf.setFont("Roboto", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(100, 116, 139);

  const validityDate = new Date();
  validityDate.setDate(validityDate.getDate() + 30);
  const validityText = `ČÍSLO: ${quoteId}   |   DÁTUM: ${formatDate()}   |   PLATNOSŤ DO: ${formatDate(validityDate)}`;
  pdf.text(validityText, margin, y + 16);

  y = margin + 26;

  // 3D Preview (if available)
  if (imageDataUrl && imageDataUrl.startsWith("data:image")) {
    try {
      const props = pdf.getImageProperties(imageDataUrl);
      const maxH = 65;
      let iw = usableWidth;
      let ih = (props.height * iw) / props.width;
      if (ih > maxH) {
        ih = maxH;
        iw = (props.width * ih) / props.height;
      }
      const ix = margin + (usableWidth - iw) / 2;
      pdf.setDrawColor(241, 245, 249);
      pdf.setFillColor(248, 250, 252);
      pdf.roundedRect(margin, y, usableWidth, ih + 4, 3, 3, "FD");
      pdf.addImage(imageDataUrl, "PNG", ix, y + 2, iw, ih);
      y += ih + 8;
    } catch (e) {
      console.warn("PDF screenshot insertion skipped", e);
    }
  }

  // 2 Columns Grid: Specs (60%) vs Pricing & Contact (40%)
  const colGap = 4;
  const col1W = usableWidth * 0.58 - colGap / 2;
  const col2W = usableWidth * 0.42 - colGap / 2;
  const gridY = y;
  let ty = gridY;

  // LEFT COLUMN: Geometry & Specs
  pdf.setFont("Roboto", "bold").setFontSize(9).setTextColor(16, 24, 40);
  pdf.text("TECHNICKÁ ŠPECIFIKÁCIA", margin, ty);
  ty += 4;

  const dw = (col1W - 4) / 3;
  const dh = 18;
  const dimH = Math.max(
    drawBox(pdf, margin, ty, dw, dh, "A (Šírka)", `${params.width} m`),
    drawBox(pdf, margin + dw + 2, ty, dw, dh, "B (Dĺžka)", `${params.length} m`),
    drawBox(pdf, margin + (dw + 2) * 2, ty, dw, dh, "C (Výška)", `${params.clearHeight} m`)
  );
  ty += dimH + 3;

  const roofLabel = params.roofType === "gable" ? `Sedlová (${params.roofPitchDeg}°)` : `Pultová (${params.roofPitchDeg}°)`;
  const claddingLabel = params.panelType === "sandwich" ? `Sendvičový panel (PUR/PIR)` : `Trapézový plech (T-18/T-35)`;
  const gateLabel = `1x (${params.doorWidth}x${params.doorHeight}m, ${resolveColorName(params.sectionalDoorColor)})`;
  const pDoorLabel = params.hasPersonalDoor ? `Áno (${resolveColorName(params.doorColor)})` : "Nie";
  const windowLabel = params.hasWindows && params.windowCount > 0 ? `${params.windowCount}x (${params.windowWidth}x${params.windowHeight}m)` : "Žiadne";

  const specBoxes: [string, string][] = [
    ["Typ strechy", roofLabel],
    ["Opláštenie & Farby", `${claddingLabel}\nSteny: ${resolveColorName(params.claddingColor)} | Strecha: ${resolveColorName(params.roofColor)}`],
    ["Garážová brána", gateLabel],
    ["Osobné dvere & Okná", `Dvere: ${pDoorLabel} | Okná: ${windowLabel}`],
    ["Základová doska", params.showFoundation ? "Áno (betónová základová doska)" : "Nie (pripraví zákazník)"],
  ];

  if (customer.notes) {
    specBoxes.push(["Poznámka k dopytu", customer.notes]);
  }

  specBoxes.forEach(([lbl, val]) => {
    ty += drawBox(pdf, margin, ty, col1W, 13, lbl, val) + 2;
  });

  // RIGHT COLUMN: Pricing & Contact
  let ry = gridY;
  pdf.setFont("Roboto", "bold").setFontSize(9).setTextColor(16, 24, 40);
  pdf.text("CENOVÝ ODHAD & KONTAKT", margin + col1W + colGap, ry);
  ry += 4;

  const fmt = (v: number) => `${v.toFixed(2)} €`;
  const displayTotal = pricing.hidePrices ? "Cena na vyžiadanie" : `${fmt(pricing.totalWithVat)} s DPH`;

  ry += drawBox(
    pdf,
    margin + col1W + colGap,
    ry,
    col2W,
    22,
    "Celková cena",
    displayTotal,
    {
      valueColor: primaryRGB,
      borderColor: primaryRGB,
      bgColor: [236, 253, 245],
    }
  ) + 3;

  const contactTxt = [
    `Meno: ${customer.name || "-"}`,
    `E-mail: ${customer.email || "-"}`,
    `Telefón: ${customer.phone || "-"}`,
    `Lokalita: ${customer.city || "Podľa dohody"}`,
  ].join("\n");

  ry += drawBox(
    pdf,
    margin + col1W + colGap,
    ry,
    col2W,
    30,
    "Zákazník / Kontakt",
    contactTxt
  ) + 3;

  if (evaluationUrl) {
    ry += drawBox(
      pdf,
      margin + col1W + colGap,
      ry,
      col2W,
      18,
      "Interaktívna ponuka online",
      "Odkaz pre otvorenie v prehliadači:\n" + evaluationUrl
    ) + 3;
  }

  // Page 2: Rekapitulácia cien a položiek
  pdf.addPage();
  y = margin;

  pdf.setFont("Roboto", "bold").setFontSize(10).setTextColor(16, 24, 40);
  pdf.text("CENOVÁ REKAPITULÁCIA A ROZPIS POLOŽIEK", margin, y);
  y += 5;

  const priceWidth = 42;
  pdf.setFillColor(16, 24, 40);
  pdf.rect(margin, y, usableWidth, 7, "F");
  pdf.setFont("Roboto", "bold").setFontSize(8).setTextColor(255, 255, 255);
  pdf.text("Položka špecifikácie", margin + 4, y + 4.8);
  pdf.text("Suma", margin + usableWidth - priceWidth + 4, y + 4.8);
  y += 8;

  y = drawPricingRow(
    pdf,
    margin,
    y,
    usableWidth,
    `Oceľová nosná konštrukcia (stĺpy, priehradové nosníky, väznice, paždíky)`,
    pricing.hidePrices ? "V cene" : fmt(pricing.steelCost),
    { emphasize: true, fillColor: [248, 250, 252] }
  );

  y = drawPricingRow(
    pdf,
    margin,
    y,
    usableWidth,
    `Opláštenie stien a strechy (${params.panelType === "sandwich" ? "Sendvičové panely" : "Trapézový plech"}, lemovanie, spojovací materiál)`,
    pricing.hidePrices ? "V cene" : fmt(pricing.claddingCost)
  );

  y = drawPricingRow(
    pdf,
    margin,
    y,
    usableWidth,
    `Výplne otvorov (Sekčná garážová brána, osobné dvere, okná)`,
    pricing.hidePrices ? "V cene" : fmt(pricing.componentsSubtotal)
  );

  y = drawPricingRow(
    pdf,
    margin,
    y,
    usableWidth,
    `Doprava na miesto stavby a odborná montáž`,
    pricing.hidePrices ? "V cene" : fmt(pricing.laborAndTransport)
  );

  y += 4;

  if (!pricing.hidePrices) {
    y = drawPricingRow(
      pdf,
      margin,
      y,
      usableWidth,
      "Základ dane (bez DPH)",
      fmt(pricing.subtotalBeforeVat)
    );

    y = drawPricingRow(
      pdf,
      margin,
      y,
      usableWidth,
      "DPH 20%",
      fmt(pricing.vatAmount)
    );
  }

  y = drawPricingRow(
    pdf,
    margin,
    y,
    usableWidth,
    "Celková suma s DPH",
    displayTotal,
    {
      emphasize: true,
      priceColor: primaryRGB,
      fillColor: [236, 253, 245],
    }
  );

  y += 8;
  pdf.setFont("Roboto", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(100, 116, 139);
  pdf.text(
    "Cenová ponuka je platná 30 dní od vygenerovania. V prípade otázok nás neváhajte kontaktovať.",
    margin,
    y
  );

  // Technical BOM Section on Page 2
  y += 9;
  pdf.setFont("Roboto", "bold").setFontSize(9.5).setTextColor(16, 24, 40);
  pdf.text("TECHNICKÝ VÝKAZ MATERIÁLU (BOM / KUSOVNÍK)", margin, y);
  y += 4;

  const bom = calculateGarageBom(params);
  pdf.setFillColor(241, 245, 249);
  pdf.rect(margin, y, usableWidth, 6, "F");
  pdf.setFont("Roboto", "bold").setFontSize(7).setTextColor(71, 85, 105);
  pdf.text("POLOŽKA", margin + 3, y + 4.2);
  pdf.text("ŠPECIFIKÁCIA", margin + 45, y + 4.2);
  pdf.text("MNOŽSTVO", margin + usableWidth - 34, y + 4.2);
  pdf.text("HMOTNOSŤ", margin + usableWidth - 14, y + 4.2);
  y += 6;

  bom.items.forEach((item, idx) => {
    const rowH = 5.2;
    if (idx % 2 === 1) {
      pdf.setFillColor(248, 250, 252);
      pdf.rect(margin, y, usableWidth, rowH, "F");
    }
    pdf.setDrawColor(241, 245, 249);
    pdf.line(margin, y + rowH, margin + usableWidth, y + rowH);

    pdf.setFont("Roboto", "bold").setFontSize(7).setTextColor(15, 23, 42);
    pdf.text(item.name, margin + 3, y + 3.6);

    pdf.setFont("Roboto", "normal").setFontSize(6.8).setTextColor(100, 116, 139);
    const specLines = pdf.splitTextToSize(item.spec, usableWidth - 85);
    pdf.text(specLines[0] || "", margin + 45, y + 3.6);

    pdf.setFont("Roboto", "bold").setFontSize(7).setTextColor(15, 23, 42);
    pdf.text(`${item.quantity} ${item.unit}`, margin + usableWidth - 34, y + 3.6);

    pdf.setFont("Roboto", "normal").setFontSize(7).setTextColor(100, 116, 139);
    pdf.text(item.weightKg ? `${item.weightKg} kg` : "-", margin + usableWidth - 14, y + 3.6);

    y += rowH;
  });

  return pdf.output("blob");
}
