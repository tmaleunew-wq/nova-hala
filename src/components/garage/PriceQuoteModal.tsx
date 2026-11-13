import React from "react";
import type { GarageParams } from "@/lib/garage/types";
import { ridgeHeight, highEave } from "./Structure";
import { Printer, FileSpreadsheet, Send, X, ShieldCheck, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import emailjs from "@emailjs/browser";
import { generateOrderExcelXml } from "@/lib/garage/excelGenerator";

interface PricingValues {
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

interface PriceQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientNote?: string;
  p: GarageParams;
  pricing: PricingValues;
}

export function PriceQuoteModal({
  isOpen,
  onClose,
  clientName,
  clientEmail,
  clientPhone,
  clientNote,
  p,
  pricing,
}: PriceQuoteModalProps) {
  if (!isOpen) return null;

  const issueDate = new Date().toLocaleDateString("sk-SK");
  const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString("sk-SK");
  const quoteNumber = `CP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  // Geometry & Calculations
  const W = p.width;
  const L = p.length;
  const Heave = p.clearHeight;
  const Hridge = ridgeHeight(p);
  const Hhi = highEave(p);
  const frames = p.bayCount + 1;

  const leftColH = p.roofType === "shed" ? Heave : Heave;
  const rightColH = p.roofType === "shed" ? Hhi : Heave;
  const totalColLength = frames * leftColH + frames * rightColH;

  let totalRafterLength = 0;
  if (p.roofType === "gable") {
    const halfW = W / 2;
    const slopeLen = Math.hypot(halfW, Hridge - Heave);
    totalRafterLength = frames * 2 * slopeLen;
  } else {
    const slopeLen = Math.hypot(W, Hhi - Heave);
    totalRafterLength = frames * slopeLen;
  }

  let totalPurlinLength = 0;
  if (p.roofType === "gable") {
    const halfW = W / 2;
    const slopeLen = Math.hypot(halfW, Hridge - Heave);
    const purlinCount = Math.max(2, Math.round(slopeLen / 0.8));
    totalPurlinLength = 2 * (purlinCount + 1) * L;
  } else {
    const slopeLen = Math.hypot(W, Hhi - Heave);
    const purlinCount = Math.max(3, Math.round(slopeLen / 0.8));
    totalPurlinLength = (purlinCount + 1) * L;
  }

  const heights = [0.6, 1.4, 2.2];
  let totalGirtsLength = 0;
  for (const h of heights) {
    if (h >= Heave) continue;
    const frontLen = h < p.doorHeight ? Math.max(0, W - p.doorWidth) : W;
    const backLen = (p.personalDoorSide === "back" && p.hasPersonalDoor && h < 2.0) ? Math.max(0, W - 0.9) : W;
    let leftLen = L;
    if (p.personalDoorSide === "left" && p.hasPersonalDoor && h < 2.0) {
      leftLen -= 0.9;
    }
    const winBottom = 1.6 - p.windowHeight / 2;
    const winTop = 1.6 + p.windowHeight / 2;
    if (h > winBottom && h < winTop) {
      leftLen -= p.windowCount * p.windowWidth;
    }
    const rightLen = (p.personalDoorSide === "right" && p.hasPersonalDoor && h < 2.0) ? Math.max(0, L - 0.9) : L;
    totalGirtsLength += (frontLen + backLen + leftLen + rightLen);
  }

  const totalEaveRidgeLength = 2 * L + (p.roofType === "gable" ? L : 0);
  const totalSteelLength = totalColLength + totalRafterLength + totalPurlinLength + totalGirtsLength + totalEaveRidgeLength;
  const totalSteelWeight = totalSteelLength * pricing.steelWeightPerMeter;
  const steelCost = totalSteelWeight * pricing.steelPricePerKg;

  const wallArea = 2 * W * Heave + 2 * L * Heave;
  const gableArea = p.roofType === "gable" ? W * (Hridge - Heave) : 0;
  let roofArea = 0;
  if (p.roofType === "gable") {
    roofArea = 2 * Math.hypot(W / 2, Hridge - Heave) * L;
  } else {
    roofArea = Math.hypot(W, Hhi - Heave) * L;
  }
  const totalCladdingArea = wallArea + gableArea + roofArea;
  const activeCladdingUnitPrice = (p.panelType === "sandwich" || p.panelType === "smooth") ? pricing.sandwichPricePerSqM : pricing.trapezoidPricePerSqM;
  const claddingCost = totalCladdingArea * activeCladdingUnitPrice;

  const basePlatesCount = frames * 2;
  const basePlateCost = basePlatesCount * pricing.basePlateCost;
  const totalGatesCount = (p.gateCount ?? 1) + (p.hasBackDoor ? 1 : 0);
  const garageDoorCost = totalGatesCount * pricing.garageDoorCost;
  const personalDoorCost = p.hasPersonalDoor ? pricing.personalDoorCost : 0;
  const windowsCost = p.hasWindows ? p.windowCount * pricing.windowCost : 0;
  const foundationCost = p.showFoundation ? (W * L * pricing.foundationPricePerSqM) : 0;

  const customItem1Cost = (pricing.customItem1Cost && pricing.customItem1Cost > 0) ? pricing.customItem1Cost : 0;
  const customItem2Cost = (pricing.customItem2Cost && pricing.customItem2Cost > 0) ? pricing.customItem2Cost : 0;

  const rawSubtotal = steelCost + claddingCost + basePlateCost + garageDoorCost + personalDoorCost + windowsCost + foundationCost + customItem1Cost + customItem2Cost;
  const rawTotalWithExtras = rawSubtotal + pricing.transportCost + pricing.laborCost;
  const marginAmount = (rawTotalWithExtras * pricing.marginPercent) / 100;
  const subtotalBeforeVat = rawTotalWithExtras + marginAmount;
  const vatAmount = subtotalBeforeVat * 0.20;
  const totalWithVat = subtotalBeforeVat + vatAmount;

  const fmt = (val: number) => `${val.toFixed(2)} €`;

  const handlePrint = () => {
    window.print();
  };

  const handleExcelExport = () => {
    const xml = generateOrderExcelXml(p, pricing, clientName);
    const blob = new Blob([xml], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cenova_ponuka_${quoteNumber}_${clientName.replace(/\s+/g, "_")}.xls`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Cenová ponuka bola exportovaná do Excelu!");
  };

  const handleSendEmailToClient = async () => {
    if (!clientEmail) {
      toast.error("Klient nemá zadanú e-mailovú adresu.");
      return;
    }

    const EMAILJS_SERVICE = "service_idgg40s";
    const EMAILJS_TEMPLATE = "template_npjseqb";
    const EMAILJS_PUBLIC_KEY = "98BCC5N7IUs0j5eFs";

    const specs = [
      `Rozmer: ${p.width} x ${p.length} x ${p.clearHeight} m`,
      `Strecha: ${p.roofType === "gable" ? "Sedlová" : "Pultová"} (${p.roofPitchDeg}°)`,
      `Opláštenie: ${p.panelType === "sandwich" ? "Sendvičový panel" : "Trapézový plech"} (Steny: ${p.claddingColor}, Strecha: ${p.roofColor})`,
      `Izolácia: ${p.insulationCore} ${p.wallPanelThicknessMm}mm / ${p.roofPanelThicknessMm}mm`,
      `Garážová brána: ${p.doorWidth}x${p.doorHeight}m (${p.sectionalDoorColor})`,
      `Osobné dvere: ${p.hasPersonalDoor ? `Áno (${p.doorColor})` : "Nie"}`,
      `Okná: ${p.hasWindows ? `${p.windowCount}x (${p.windowWidth}x${p.windowHeight}m)` : "Nie"}`,
    ].join("\n");

    const templateParams = {
      to_email: clientEmail,
      customer_email: clientEmail,
      customer_name: clientName,
      customer_phone: clientPhone,
      customer_address: "Podľa dohody",
      order_id: quoteNumber,
      building_type: `${p.roofType === "gable" ? "Sedlová" : "Pultová"} strecha`,
      dimensions: `${p.width} x ${p.length} x ${p.clearHeight} m`,
      base_price: fmt(steelCost),
      pur_panels: `${p.panelType === "sandwich" ? "Sendvičový panel" : "Trapézový plech"} (${p.insulationCore} ${p.wallPanelThicknessMm}mm)`,
      wall_color: p.claddingColor,
      roof_color: p.roofColor,
      panel_price: fmt(claddingCost),
      door_type: `${p.doorWidth}x${p.doorHeight}m`,
      window: p.hasWindows ? `${p.windowCount}x (${p.windowWidth}x${p.windowHeight}m)` : "Žiadne",
      addons: `Montáž & doprava: ${fmt(pricing.laborCost + pricing.transportCost)}`,
      addon_price: fmt(pricing.laborCost + pricing.transportCost),
      total_price: `${fmt(totalWithVat)} s DPH`,
      notes: clientNote || "Oficiálna cenová ponuka od Steel Shed Forge",
      reply_to: "tmal.eu.new@gmail.com",
    };

    try {
      await emailjs.send(EMAILJS_SERVICE, EMAILJS_TEMPLATE, templateParams, EMAILJS_PUBLIC_KEY);
      toast.success(`Cenová ponuka bola odoslaná na e-mail ${clientEmail}!`);
    } catch (err: any) {
      toast.error(`Chyba pri odosielaní: ${err?.text || err?.message || String(err)}`);
    }
  };

  // Handle Escape key to close
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      className="price-quote-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto print:p-0 print:bg-white print:static print:block cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="price-quote-modal-box w-full max-w-4xl rounded-xl border border-white/10 bg-[#0e1218] font-sans text-slate-100 shadow-2xl overflow-hidden my-8 cursor-default print:border-none print:bg-white print:text-black print:shadow-none print:w-full print:max-w-none print:m-0"
      >
        
        {/* Top Control Bar (Sticky & Hidden on print) */}
        <div className="sticky top-0 z-30 flex flex-wrap items-center justify-between border-b border-white/10 bg-[#0b0f14]/95 px-6 py-3.5 backdrop-blur-md print:hidden gap-3 shadow-xl">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
            <h2 className="text-sm font-bold tracking-wider text-white font-mono uppercase">
              CENOVÁ PONUKA — {quoteNumber}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-400 px-4 py-2 text-xs font-mono font-bold text-black hover:bg-emerald-300 transition shadow-lg shadow-emerald-400/20"
              title="Tlačiť alebo uložiť ako PDF súbor"
            >
              <Printer className="h-4 w-4" />
              Tlačiť / Uložiť ako PDF
            </button>

            <button
              onClick={handleSendEmailToClient}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-3.5 py-2 text-xs font-mono font-bold hover:bg-emerald-500/30 transition"
              title="Odoslať túto ponuku zákazníkovi na e-mail"
            >
              <Send className="h-3.5 w-3.5" />
              Odoslať e-mailom
            </button>

            <button
              onClick={handleExcelExport}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-3.5 py-2 text-xs font-mono font-bold hover:bg-emerald-500/30 transition"
              title="Stiahnuť súbor vo formáte Excel (.xls)"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Excel (.xls)
            </button>

            <button
              onClick={onClose}
              className="flex items-center gap-1.5 rounded-lg bg-red-500/20 text-red-300 border border-red-500/40 px-3.5 py-2 text-xs font-mono font-bold hover:bg-red-500/40 transition"
              title="Zatvoriť ponuku (Esc)"
            >
              <X className="h-4 w-4" />
              Zatvoriť
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-8 space-y-5 print:p-0 print:space-y-4">
          
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-emerald-500 pb-4 print:pb-3">
            <div>
              <div className="text-2xl font-extrabold tracking-tight text-white print:text-black print:text-xl">
                VBAU <span className="text-emerald-400 print:text-emerald-700">STEEL SHED FORGE</span>
              </div>
              <div className="text-xs text-white/50 print:text-slate-600 mt-0.5 font-mono">
                Dodávateľ montovaných oceľových garáží a hál
              </div>
            </div>

            <div className="text-right font-mono text-xs">
              <div className="text-base font-bold text-emerald-400 print:text-black print:text-sm">CENOVÁ PONUKA</div>
              <div className="text-white/80 print:text-slate-800">Číslo: <strong>{quoteNumber}</strong></div>
              <div className="text-white/60 print:text-slate-600">Dátum vystavenia: {issueDate}</div>
              <div className="text-white/60 print:text-slate-600">Platnosť ponuky do: {validUntil}</div>
            </div>
          </div>

          {/* Supplier & Customer Info Cards */}
          <div className="grid grid-cols-2 gap-6 text-xs font-mono">
            <div className="rounded-lg border border-white/10 bg-black/30 p-4 print:border-slate-300 print:bg-slate-50 print:text-black">
              <h3 className="font-bold text-emerald-400 print:text-slate-700 uppercase tracking-wider mb-2">Dodávateľ:</h3>
              <div className="font-bold text-white print:text-black">Vbau1 s.r.o.</div>
              <div className="text-white/70 print:text-slate-600">Oceľové konštrukcie & Sendvičové opláštenie</div>
              <div className="text-white/70 print:text-slate-600">E-mail: info@steelshedforge.com</div>
              <div className="text-white/70 print:text-slate-600">Web: https://steel-shed-forge.vercel.app</div>
            </div>

            <div className="rounded-lg border border-white/10 bg-black/30 p-4 print:border-slate-300 print:bg-slate-50 print:text-black">
              <h3 className="font-bold text-emerald-400 print:text-slate-700 uppercase tracking-wider mb-2">Odberateľ (Zákazník):</h3>
              <div className="font-bold text-white print:text-black text-sm">{clientName || "Zákazník"}</div>
              <div className="text-white/70 print:text-slate-600">E-mail: {clientEmail || "—"}</div>
              <div className="text-white/70 print:text-slate-600">Telefón: {clientPhone || "—"}</div>
              <div className="text-white/70 print:text-slate-600 italic">Poznámka: {clientNote || "Bez poznámky"}</div>
            </div>
          </div>

          {/* Technical Specs Table */}
          <div>
            <h3 className="text-xs uppercase font-bold tracking-widest text-emerald-400 print:text-black mb-2 font-mono">
              Technická špecifikácia garáže
            </h3>
            <table className="w-full text-left text-xs border border-white/10 print:border-slate-300 font-mono border-collapse">
              <tbody className="divide-y divide-white/10 print:divide-slate-200">
                <tr className="bg-white/5 print:bg-slate-100">
                  <td className="p-2.5 font-bold text-white/80 print:text-black w-1/3">Geometria & Rozmery</td>
                  <td className="p-2.5 text-white/90 print:text-black">
                    Šírka: <strong>{W.toFixed(2)} m</strong> | Dĺžka: <strong>{L.toFixed(2)} m</strong> | Svetlá výška: <strong>{Heave.toFixed(2)} m</strong> (Výška v hrebeni: {Hridge.toFixed(2)} m)
                  </td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold text-white/80 print:text-black">Strecha</td>
                  <td className="p-2.5 text-white/90 print:text-black">
                    {p.roofType === "gable" ? "Sedlová strecha" : "Pultová strecha"} (sklon {p.roofPitchDeg}°)
                  </td>
                </tr>
                <tr className="bg-white/5 print:bg-slate-100">
                  <td className="p-2.5 font-bold text-white/80 print:text-black">Oceľová konštrukcia</td>
                  <td className="p-2.5 text-white/90 print:text-black">
                    Profil Jäkl {(p.profileSize * 1000).toFixed(0)}x{(p.profileSize * 1000).toFixed(0)}x{(p.profileThickness * 1000).toFixed(0)}mm ({p.bayCount} polí, {frames} rámov) | Farba ocele: {p.steelColor}
                  </td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold text-white/80 print:text-black">Opláštenie stien & strechy</td>
                  <td className="p-2.5 text-white/90 print:text-black">
                    Steny: <strong>{p.panelType === "sandwich" ? "Sendvičový panel" : "Trapézový plech"}</strong> ({p.insulationCore} {p.wallPanelThicknessMm}mm, Farba: {p.claddingColor})<br />
                    Strecha: <strong>{p.roofPanelType === "trapezoid" ? "Trapézový plech" : "Škridľový profil"}</strong> ({p.insulationCore} {p.roofPanelThicknessMm}mm, Farba: {p.roofColor})<br />
                    Plech: vonkajší {p.outerSheetMm}mm / vnútorný {p.innerSheetMm}mm | Povrch: {p.coatingType} {p.coatingThicknessUm} µm
                  </td>
                </tr>
                <tr className="bg-white/5 print:bg-slate-100">
                  <td className="p-2.5 font-bold text-white/80 print:text-black">Otvory a príslušenstvo</td>
                  <td className="p-2.5 text-white/90 print:text-black">
                    Garážová brána: 1x ({p.doorWidth}x{p.doorHeight}m, RAL: {p.sectionalDoorColor})<br />
                    Osobné dvere: {p.hasPersonalDoor ? `1x (${p.personalDoorSide} strana, RAL: ${p.doorColor})` : "Nie"}<br />
                    Okná: {p.hasWindows ? `${p.windowCount}x (${p.windowWidth}x${p.windowHeight}m, ${p.windowSide} strana)` : "Nie"}<br />
                    Základová doska: {p.showFoundation ? `Áno (${W}x${L}m)` : "Nie"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Pricing Breakdown Table */}
          <div>
            <h3 className="text-xs uppercase font-bold tracking-widest text-emerald-400 print:text-black mb-2 font-mono">
              Cenová kalkulácia položiek
            </h3>
            <table className="w-full text-left text-xs border border-white/10 print:border-slate-300 font-mono border-collapse">
              <thead>
                <tr className="bg-emerald-500/10 text-emerald-300 print:bg-slate-200 print:text-slate-800 border-b border-white/10 print:border-slate-300">
                  <th className="p-2.5">Položka</th>
                  <th className="p-2.5 text-right">Množstvo</th>
                  <th className="p-2.5 text-right">Jedn. cena</th>
                  <th className="p-2.5 text-right">Cena bez DPH</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 print:divide-slate-200">
                <tr>
                  <td className="p-2.5">Oceľová nosná konštrukcia (stĺpy, krokvy, väznice)</td>
                  <td className="p-2.5 text-right">{totalSteelWeight.toFixed(0)} kg</td>
                  <td className="p-2.5 text-right">{pricing.steelPricePerKg.toFixed(2)} €</td>
                  <td className="p-2.5 text-right font-bold text-white print:text-black">{fmt(steelCost)}</td>
                </tr>

                <tr>
                  <td className="p-2.5">Opláštenie stien, štítov a strechy ({p.panelType === "sandwich" ? "Sendvič" : "Trapéz"})</td>
                  <td className="p-2.5 text-right">{totalCladdingArea.toFixed(1)} m²</td>
                  <td className="p-2.5 text-right">{activeCladdingUnitPrice.toFixed(2)} €</td>
                  <td className="p-2.5 text-right font-bold text-white print:text-black">{fmt(claddingCost)}</td>
                </tr>

                <tr>
                  <td className="p-2.5">Kotviace platne a spojovací materiál</td>
                  <td className="p-2.5 text-right">{basePlatesCount} ks</td>
                  <td className="p-2.5 text-right">{pricing.basePlateCost.toFixed(2)} €</td>
                  <td className="p-2.5 text-right font-bold text-white print:text-black">{fmt(basePlateCost)}</td>
                </tr>

                <tr>
                  <td className="p-2.5">Sekcionálna garážová brána ({p.doorWidth}x{p.doorHeight}m)</td>
                  <td className="p-2.5 text-right">1 ks</td>
                  <td className="p-2.5 text-right">{pricing.garageDoorCost.toFixed(2)} €</td>
                  <td className="p-2.5 text-right font-bold text-white print:text-black">{fmt(garageDoorCost)}</td>
                </tr>

                {p.hasPersonalDoor && (
                  <tr>
                    <td className="p-2.5">
                      Personálne vstupné dvere ({p.personalDoorSide === "left" ? "vľavo" : p.personalDoorSide === "right" ? "vpravo" : "vzadu"})
                    </td>
                    <td className="p-2.5 text-right">1 ks</td>
                    <td className="p-2.5 text-right">{pricing.personalDoorCost.toFixed(2)} €</td>
                    <td className="p-2.5 text-right font-bold text-white print:text-black">{fmt(personalDoorCost)}</td>
                  </tr>
                )}

                {p.hasWindows && p.windowCount > 0 && (
                  <tr>
                    <td className="p-2.5">Svetlíkové okná ({p.windowWidth}x{p.windowHeight}m)</td>
                    <td className="p-2.5 text-right">{p.windowCount} ks</td>
                    <td className="p-2.5 text-right">{pricing.windowCost.toFixed(2)} €</td>
                    <td className="p-2.5 text-right font-bold text-white print:text-black">{fmt(windowsCost)}</td>
                  </tr>
                )}

                {p.showFoundation && (
                  <tr>
                    <td className="p-2.5">Železobetónová základová doska</td>
                    <td className="p-2.5 text-right">{(W * L).toFixed(1)} m²</td>
                    <td className="p-2.5 text-right">{pricing.foundationPricePerSqM.toFixed(2)} €</td>
                    <td className="p-2.5 text-right font-bold text-white print:text-black">{fmt(foundationCost)}</td>
                  </tr>
                )}

                {customItem1Cost > 0 && (
                  <tr>
                    <td className="p-2.5">{pricing.customItem1Label?.trim() || "Voliteľná položka 1"}</td>
                    <td className="p-2.5 text-right">1 ks</td>
                    <td className="p-2.5 text-right">{customItem1Cost.toFixed(2)} €</td>
                    <td className="p-2.5 text-right font-bold text-white print:text-black">{fmt(customItem1Cost)}</td>
                  </tr>
                )}

                {customItem2Cost > 0 && (
                  <tr>
                    <td className="p-2.5">{pricing.customItem2Label?.trim() || "Voliteľná položka 2"}</td>
                    <td className="p-2.5 text-right">1 ks</td>
                    <td className="p-2.5 text-right">{customItem2Cost.toFixed(2)} €</td>
                    <td className="p-2.5 text-right font-bold text-white print:text-black">{fmt(customItem2Cost)}</td>
                  </tr>
                )}

                <tr>
                  <td className="p-2.5">Montážne a stavebné práce konštrukcie a opláštenia</td>
                  <td className="p-2.5 text-right">Komplet</td>
                  <td className="p-2.5 text-right">{pricing.laborCost.toFixed(2)} €</td>
                  <td className="p-2.5 text-right font-bold text-white print:text-black">{fmt(pricing.laborCost)}</td>
                </tr>

                <tr>
                  <td className="p-2.5">Doprava, logistika a vykládka materiálu</td>
                  <td className="p-2.5 text-right">Paušál</td>
                  <td className="p-2.5 text-right">{pricing.transportCost.toFixed(2)} €</td>
                  <td className="p-2.5 text-right font-bold text-white print:text-black">{fmt(pricing.transportCost)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Price Totals Summary */}
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-4 font-mono text-xs print:border-2 print:border-emerald-600 print:bg-emerald-50/50 print:text-black">
            <div className="flex justify-between py-1 text-white/70 print:text-slate-600">
              <span>Spolu za materiál a montáž bez DPH:</span>
              <span className="font-bold font-mono">{fmt(rawTotalWithExtras)}</span>
            </div>
            {pricing.marginPercent > 0 && (
              <div className="flex justify-between py-1 text-white/70 print:text-slate-600">
                <span>Zisková prirážka / marža ({pricing.marginPercent}%):</span>
                <span className="font-bold font-mono">{fmt(marginAmount)}</span>
              </div>
            )}
            <div className="flex justify-between py-1 text-white/70 print:text-slate-600 border-t border-white/10 print:border-slate-300 pt-2">
              <span>Základ dane (Suma bez DPH):</span>
              <span className="font-bold font-mono">{fmt(subtotalBeforeVat)}</span>
            </div>
            <div className="flex justify-between py-1 text-white/70 print:text-slate-600">
              <span>DPH (20%):</span>
              <span className="font-bold font-mono">{fmt(vatAmount)}</span>
            </div>
            <div className="flex justify-between py-2 text-base font-extrabold text-emerald-400 print:text-emerald-800 print:bg-emerald-100 print:px-2 print:rounded border-t border-emerald-500/40 print:border-emerald-500 mt-2">
              <span>KONEČNÁ CENA S DPH:</span>
              <span className="font-mono text-lg">{fmt(totalWithVat)}</span>
            </div>
          </div>

          {/* Terms & Conditions & Signatures */}
          <div className="pt-4 border-t border-white/10 print:border-slate-300 text-[10px] text-white/50 print:text-slate-600 space-y-2 font-mono">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <strong className="text-white/80 print:text-black block mb-1">Obchodné a platobné podmienky:</strong>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>Záloha 50% pri podpise zmluvy / záväznej objednávky.</li>
                  <li>Doplatok 50% po dokončení montáže a odovzdaní diela.</li>
                  <li>Dodacia lehota: 4 - 6 týždňov od pripísania zálohy.</li>
                </ul>
              </div>
              <div className="text-right">
                <strong className="text-white/80 print:text-black block mb-1">Vystavil:</strong>
                <p>Tím VBAU Steel Shed Forge</p>
                <p>Tel: +421 900 123 456</p>
                <p>E-mail: info@steelshedforge.com</p>
              </div>
            </div>

            <div className="flex justify-between items-end pt-8 print:pt-12">
              <div className="text-center w-1/3 border-t border-white/20 print:border-slate-400 pt-1">
                Pečiatka a podpis dodávateľa
              </div>
              <div className="text-center w-1/3 border-t border-white/20 print:border-slate-400 pt-1">
                Podpis odberateľa (klienta)
              </div>
            </div>
          </div>

          {/* Bottom Action Footer (Hidden on print) */}
          <div className="pt-4 border-t border-white/10 flex flex-wrap justify-end gap-2 print:hidden">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-400 px-4 py-2 text-xs font-mono font-bold text-black hover:bg-emerald-300 transition shadow-lg shadow-emerald-400/20"
            >
              <Printer className="h-4 w-4" />
              Tlačiť / Uložiť ako PDF
            </button>

            <button
              onClick={handleSendEmailToClient}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-3.5 py-2 text-xs font-mono font-bold hover:bg-emerald-500/30 transition"
            >
              <Send className="h-3.5 w-3.5" />
              Odoslať klientovi e-mailom
            </button>

            <button
              onClick={handleExcelExport}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-3.5 py-2 text-xs font-mono font-bold hover:bg-emerald-500/30 transition"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Excel (.xls)
            </button>

            <button
              onClick={onClose}
              className="flex items-center gap-1.5 rounded-lg bg-red-500/20 text-red-300 border border-red-500/40 px-4 py-2 text-xs font-mono font-bold hover:bg-red-500/40 transition"
            >
              <X className="h-4 w-4" />
              Zatvoriť
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
