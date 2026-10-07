import { useState, useEffect, useRef } from "react";
import type { GarageParams } from "@/lib/garage/types";
import { ridgeHeight, highEave } from "./Structure";
import { toast } from "sonner";
import { getCladdingConfig } from "@/lib/garage/configHelper";
import emailjs from "@emailjs/browser";
import { saveInquiryToSupabase } from "@/lib/supabase";

interface PriceCalculatorProps {
  p: GarageParams;
  quoteRequestSignal?: number;
}

export function PriceCalculator({ p, quoteRequestSignal }: PriceCalculatorProps) {
  const clientName = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("client") : null;
  const claddingConfig = getCladdingConfig(clientName);

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsMobile(window.innerWidth < 768);
      const handleResize = () => {
        setIsMobile(window.innerWidth < 768);
      };
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  useEffect(() => {
    if (!quoteRequestSignal || quoteRequestSignal <= 0) return;
    if (p.notes) {
      setMessage(p.notes);
    }
    setShowForm(true);
  }, [quoteRequestSignal, p.notes]);

  // 1. Calculations matching Structure.tsx
  const W = p.width;
  const L = p.length;
  const Heave = p.clearHeight;
  const Hridge = ridgeHeight(p);
  const Hhi = highEave(p);
  const frames = p.bayCount + 1;

  // Frame columns
  const leftColH = p.roofType === "shed" ? Heave : Heave;
  const rightColH = p.roofType === "shed" ? Hhi : Heave;
  const totalColLength = frames * leftColH + frames * rightColH;

  // Rafters
  let totalRafterLength = 0;
  if (p.roofType === "gable") {
    const halfW = W / 2;
    const slopeLen = Math.hypot(halfW, Hridge - Heave);
    totalRafterLength = frames * 2 * slopeLen;
  } else {
    const slopeLen = Math.hypot(W, Hhi - Heave);
    totalRafterLength = frames * slopeLen;
  }

  // Purlins
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

  // Girts
  const heights = [0.6, 1.4, 2.2];
  let totalGirtsLength = 0;
  for (const h of heights) {
    if (h >= Heave) continue;
    // Front girts (with door cut)
    const frontLen = h < p.doorHeight ? Math.max(0, W - p.doorWidth) : W;
    // Back girts (with personal door cut)
    const backLen = (p.personalDoorSide === "back" && p.hasPersonalDoor && h < 2.0) ? Math.max(0, W - 0.9) : W;
    // Left girts
    let leftLen = L;
    if (p.personalDoorSide === "left" && p.hasPersonalDoor && h < 2.0) {
      leftLen -= 0.9;
    }
    const winBottom = 1.6 - p.windowHeight / 2;
    const winTop = 1.6 + p.windowHeight / 2;
    if (h > winBottom && h < winTop) {
      leftLen -= p.windowCount * p.windowWidth;
    }
    // Right girts
    const rightLen = (p.personalDoorSide === "right" && p.hasPersonalDoor && h < 2.0) ? Math.max(0, L - 0.9) : L;

    totalGirtsLength += (frontLen + backLen + leftLen + rightLen);
  }

  // Eave & Ridge beams
  const totalEaveRidgeLength = 2 * L + (p.roofType === "gable" ? L : 0);

  // Total steel length
  const totalSteelLength = totalColLength + totalRafterLength + totalPurlinLength + totalGirtsLength + totalEaveRidgeLength;
  
  // Weights and pricing
  const steelWeightKgPerMeter = 6.2; // approx weight for 100x100x4 tube
  const steelPricePerKg = 1.85; // EUR/kg
  const steelCost = totalSteelLength * steelWeightKgPerMeter * steelPricePerKg;

  // 2. Cladding Surface Area
  // Walls area (approximate box)
  const wallArea = 2 * W * Heave + 2 * L * Heave;
  // Gable triangles area
  const gableArea = p.roofType === "gable" ? W * (Hridge - Heave) : 0;
  // Roof area
  let roofArea = 0;
  if (p.roofType === "gable") {
    roofArea = 2 * Math.hypot(W / 2, Hridge - Heave) * L;
  } else {
    roofArea = Math.hypot(W, Hhi - Heave) * L;
  }
  const totalCladdingArea = wallArea + gableArea + roofArea;
  const panelPricePerSqM = (p.panelType === "sandwich" || p.panelType === "smooth") ? claddingConfig.sandwichPricePerSqM : claddingConfig.trapezoidPricePerSqM; // EUR/m2
  const claddingCost = totalCladdingArea * panelPricePerSqM;

  // 3. Components
  const basePlatesCount = frames * 2;
  const basePlateCost = basePlatesCount * 12.00;
  const totalGates = (p.gateCount ?? 1) + (p.hasBackDoor ? 1 : 0);
  const garageDoorCost = totalGates * 550.00;
  const personalDoorCost = p.hasPersonalDoor ? 220.00 : 0.00;
  const windowsCost = p.windowCount * 140.00;
  const foundationCost = p.showFoundation ? (W * L * 65.00) : 0.00;

  // Subtotals
  const materialSubtotal = steelCost + claddingCost + basePlateCost;
  const componentsSubtotal = garageDoorCost + personalDoorCost + windowsCost + foundationCost;
  const totalCost = materialSubtotal + componentsSubtotal;
  const vat = totalCost * 0.20;
  const totalWithVat = totalCost + vat;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const EMAILJS_SERVICE = "service_idgg40s";
    const EMAILJS_TEMPLATE = "template_npjseqb";
    const EMAILJS_PUBLIC_KEY = "98BCC5N7IUs0j5eFs";

    // Build evaluation URL
    const searchParams = new URLSearchParams();
    const keys = Object.keys(p) as (keyof GarageParams)[];
    for (const key of keys) {
      let val = String(p[key]);
      if ((key === "claddingColor" || key === "roofColor" || key === "steelColor" || key === "doorColor" || key === "sectionalDoorColor" || key === "trimmingColor") && val.startsWith("#")) {
        val = val.substring(1);
      }
      searchParams.set(key, val);
    }
    searchParams.set("client", name);
    const evaluationUrl = `${window.location.origin}/vyhodnotenie?${searchParams.toString()}`;

    // Panel type labels
    const panelLabel = p.panelType === "sandwich" ? "Sendvičový panel" : p.panelType === "smooth" ? "Hladký panel" : "Trapézový plech";
    const roofPanelLabel = p.roofPanelType === "trapezoid" ? "Trapézový plech" : p.roofPanelType === "smooth" ? "Hladký panel" : "Škridľový profil";
    const fastenerLabel = p.fastenerGrade === "A2" ? "Nerez A2" : p.fastenerGrade === "A4" ? "Nerez A4" : "Pozinkované";
    const sideLabel = (s: string) => s === "left" ? "ľavá" : s === "right" ? "pravá" : "zadná";

    // Generate simple order ID
    const orderId = `SSF-${Date.now().toString(36).toUpperCase()}`;

    // ── SECTION 1: Základné rozmery ──
    const buildingType = `${p.roofType === "gable" ? "Sedlová" : "Pultová"} strecha`;
    const dimensions = `Šírka: ${p.width}m | Dĺžka: ${p.length}m | Výška: ${p.clearHeight}m`;
    const baseDetails = `Sklon strechy: ${p.roofPitchDeg}°\nPočet polí: ${p.bayCount}\nProfil: ${p.profileSize * 1000}x${p.profileSize * 1000}x${p.profileThickness * 1000}mm`;

    // ── SECTION 2: Opláštenie ──
    const purPanels = [
      `Steny: ${panelLabel} (${p.insulationCore} ${p.wallPanelThicknessMm}mm)`,
      `Strecha: ${roofPanelLabel} (${p.insulationCore} ${p.roofPanelThicknessMm}mm)`,
      `Orientácia: ${p.claddingOrientation === "horizontal" ? "Horizontálna" : "Vertikálna"}`,
    ].join("\n");
    const wallColor = `Fasáda: ${p.claddingColor}`;
    const roofColorVal = `Strecha: ${p.roofColor}`;
    const panelDetails = [
      `Vonk. plech: ${p.outerSheetMm}mm | Vnút. plech: ${p.innerSheetMm}mm`,
      `Povrch: ${p.coatingType} ${p.coatingThicknessUm} µm`,
      `Pozink: Z${p.zincCoatingGsm} g/m²`,
      `Kotvenie: ${fastenerLabel} | Spoj: ${p.hiddenFastening ? "Skrytý" : "Viditeľný"}`,
      `Tesnenie: ${p.sealingSystem ? "Komprimačné pásky + pružné tmely" : "Štandardné"}`,
    ].join("\n");

    // ── SECTION 3: Doplnky ──
    const gateTypeLabel = p.gateType === "upAndOver" ? "výklopná" : p.gateType === "doubleLeaf" ? "dvojkrídlová" : "sekčná";
    const doorType = `Garážová brána: ${totalGates}x ${p.doorWidth}x${p.doorHeight}m (${gateTypeLabel}, ${p.sectionalDoorColor})`;
    const windowVal = p.hasWindows && p.windowCount > 0
      ? `${p.windowCount}x (${p.windowWidth}x${p.windowHeight}m) – ${sideLabel(p.windowSide)} strana`
      : "Žiadne";
    const addonsLines = [
      `Osobné dvere: ${p.hasPersonalDoor ? `Áno – ${sideLabel(p.personalDoorSide)} strana (${p.doorColor})` : "Nie"}`,
      `Svetlíky: ${p.hasSkylights ? "Áno" : "Nie"}`,
      `Základová doska: ${p.showFoundation ? `Áno (${W}x${L}m)` : "Nie"}`,
      `Lemovanie / rohy: ${p.trimmingColor} ${p.flashingMatchesPanels ? "(zhodné s panelmi)" : ""}`,
      `Žľaby a zvody: ${p.trimmingColor}`,
    ].join("\n");

    // Format price helper
    const fmt = (n: number) => `${n.toFixed(2)} €`;

    // Admin params WITH calculated euro prices
    const adminTemplateParams = {
      to_email: "tmal.eu.new@gmail.com",
      customer_email: "tmal.eu.new@gmail.com",
      customer_name: name,
      customer_phone: phone,
      customer_address: "Podľa dohody",
      order_id: orderId,
      building_type: buildingType,
      dimensions: dimensions,
      base_price: `${baseDetails}\nODHAD OCELE: ${fmt(steelCost)}`,
      pur_panels: purPanels,
      wall_color: wallColor,
      roof_color: roofColorVal,
      panel_price: `${panelDetails}\nODHAD OPLÁŠTENIA: ${fmt(claddingCost)}`,
      door_type: doorType,
      window: windowVal,
      addons: addonsLines,
      addon_price: `ODHAD DOPLNKOV: ${fmt(componentsSubtotal)}`,
      total_price: `${fmt(totalWithVat)} (odhad s DPH)`,
      notes: message || "Bez poznámky",
      summary_link: evaluationUrl,
      reply_to: email,
    };

    // Client params WITHOUT prices (or with "Bude upresnená")
    const clientTemplateParams = {
      to_email: email,
      customer_email: email,
      customer_name: name,
      customer_phone: phone,
      customer_address: "Podľa dohody",
      order_id: orderId,
      building_type: buildingType,
      dimensions: dimensions,
      base_price: baseDetails,
      pur_panels: purPanels,
      wall_color: wallColor,
      roof_color: roofColorVal,
      panel_price: panelDetails,
      door_type: doorType,
      window: windowVal,
      addons: addonsLines,
      addon_price: "—",
      total_price: "Bude upresnená",
      notes: message || "Bez poznámky",
      summary_link: evaluationUrl,
      reply_to: "tmal.eu.new@gmail.com",
    };

    // Save order locally for Admin Dashboard & Supabase
    const newOrder = {
      id: orderId,
      date: new Date().toLocaleString("sk-SK"),
      name,
      email,
      phone,
      message,
      params: p,
      totalWithVat,
      evaluationUrl,
    };

    // Async save to Supabase
    saveInquiryToSupabase({
      order_id: orderId,
      name,
      email,
      phone,
      message,
      params: p,
      total_price: totalWithVat,
      evaluation_url: evaluationUrl,
    });

    try {
      const existing = JSON.parse(localStorage.getItem("ssf_orders") || "[]");
      localStorage.setItem("ssf_orders", JSON.stringify([newOrder, ...existing]));
    } catch (e) {
      console.error("Chyba pri ukladaní objednávky:", e);
    }

    try {
      // 1. Send to Admin (with calculated prices)
      const adminPromise = emailjs.send(EMAILJS_SERVICE, EMAILJS_TEMPLATE, adminTemplateParams, EMAILJS_PUBLIC_KEY);

      // 2. Send to Client
      const clientPromise = emailjs.send(EMAILJS_SERVICE, EMAILJS_TEMPLATE, clientTemplateParams, EMAILJS_PUBLIC_KEY);

      const results = await Promise.allSettled([adminPromise, clientPromise]);
      const adminOk = results[0].status === "fulfilled";
      const clientOk = results[1].status === "fulfilled";

      if (adminOk || clientOk) {
        toast.success("Dopyt bol úspešne odoslaný! Budeme vás kontaktovať.");
        setShowForm(false);
        setName("");
        setEmail("");
        setPhone("");
        setMessage("");
      } else {
        const err0 = results[0].status === "rejected" ? (results[0].reason?.text || results[0].reason?.message || String(results[0].reason)) : "";
        const err1 = results[1].status === "rejected" ? (results[1].reason?.text || results[1].reason?.message || String(results[1].reason)) : "";
        toast.error(`Chyba pri odosielaní: ${err0 || err1}`);
      }
    } catch (error: any) {
      const errMsg = error?.text || error?.message || String(error);
      toast.error(`Chyba: ${errMsg}`);
      console.error("Chyba pri odosielaní dopytu:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Quote Request Modal */}
      {showForm && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-[340px] rounded-lg border border-white/10 bg-[#0e1116] p-5 font-mono text-white shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Nezáväzný dopyt
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="text-white/40 transition hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-[11px]">
              <div>
                <label className="block mb-1 text-white/60">Meno a priezvisko</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded border border-white/10 bg-black/50 px-2 py-1.5 text-white/90 focus:border-emerald-400 focus:outline-none"
                  placeholder="Ján Novák"
                />
              </div>

              <div>
                <label className="block mb-1 text-white/60">E-mail</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded border border-white/10 bg-black/50 px-2 py-1.5 text-white/90 focus:border-emerald-400 focus:outline-none"
                  placeholder="jan.novak@example.com"
                />
              </div>

              <div>
                <label className="block mb-1 text-white/60">Telefón</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded border border-white/10 bg-black/50 px-2 py-1.5 text-white/90 focus:border-emerald-400 focus:outline-none"
                  placeholder="+421 900 123 456"
                />
              </div>

              <div>
                <label className="block mb-1 text-white/60">Poznámka / špecifikácia</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={2}
                  className="w-full rounded border border-white/10 bg-black/50 px-2 py-1.5 text-white/90 focus:border-emerald-400 focus:outline-none resize-none"
                  placeholder="Mám záujem o montáž / špecifické RAL farby..."
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded bg-emerald-400 py-2 text-center text-xs font-bold text-black transition hover:bg-emerald-300 disabled:opacity-50"
                >
                  {isSubmitting ? "Odosiela sa..." : "Odoslať nezáväzný dopyt"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {claddingConfig.staticWarning && (
        <div className="absolute bottom-12 left-3 right-3 md:left-4 md:right-auto z-10 max-w-sm rounded-lg border border-amber-500/30 bg-black/85 p-3 font-mono text-white shadow-2xl backdrop-blur-md">
          <div className="flex items-start gap-2.5">
            <span className="text-amber-400 text-lg">⚠️</span>
            <div className="space-y-1">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-amber-400">STATICKÉ UPOZORNENIE</h4>
              <p className="text-[10px] text-amber-200/90 leading-relaxed">{claddingConfig.staticWarning}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

