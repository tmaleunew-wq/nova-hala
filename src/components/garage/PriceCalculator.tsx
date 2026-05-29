import { useState } from "react";
import type { GarageParams } from "@/lib/garage/types";
import { ridgeHeight, highEave } from "./Structure";
import { toast } from "sonner";

interface PriceCalculatorProps {
  p: GarageParams;
}

export function PriceCalculator({ p }: PriceCalculatorProps) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
  const panelPricePerSqM = p.panelType === "sandwich" ? 32.50 : 16.80; // EUR/m2
  const claddingCost = totalCladdingArea * panelPricePerSqM;

  // 3. Components
  const basePlatesCount = frames * 2;
  const basePlateCost = basePlatesCount * 12.00;
  const garageDoorCost = 550.00;
  const personalDoorCost = p.hasPersonalDoor ? 220.00 : 0.00;
  const windowsCost = p.windowCount * 140.00;
  const foundationCost = p.showFoundation ? (W * L * 65.00) : 0.00;

  // Subtotals
  const materialSubtotal = steelCost + claddingCost + basePlateCost;
  const componentsSubtotal = garageDoorCost + personalDoorCost + windowsCost + foundationCost;
  const totalCost = materialSubtotal + componentsSubtotal;
  const vat = totalCost * 0.20;
  const totalWithVat = totalCost + vat;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate API request
    setTimeout(() => {
      setIsSubmitting(false);
      setShowForm(false);
      setName("");
      setEmail("");
      setPhone("");
      setMessage("");
      toast.success("Dopyt bol úspešne odoslaný! Budeme vás kontaktovať.");
    }, 1200);
  };

  return (
    <>
      {/* Floating Price Card */}
      <div className="absolute bottom-3 left-4 z-10 w-72 rounded-lg border border-white/10 bg-black/75 p-4 font-mono text-white/90 shadow-2xl backdrop-blur-md">
        <h3 className="mb-2 text-xs tracking-wider text-emerald-400">
          ODHAD CENY MATERIÁLU
        </h3>
        
        <div className="space-y-1.5 text-[11px] border-b border-white/10 pb-2">
          <div className="flex justify-between">
            <span>Konštrukcia ({totalSteelLength.toFixed(0)}m):</span>
            <span>{steelCost.toFixed(2)} €</span>
          </div>
          <div className="flex justify-between">
            <span>Opláštenie ({totalCladdingArea.toFixed(0)}m²):</span>
            <span>{claddingCost.toFixed(2)} €</span>
          </div>
          {p.hasPersonalDoor && (
            <div className="flex justify-between">
              <span>Dvere (personálne):</span>
              <span>{personalDoorCost.toFixed(2)} €</span>
            </div>
          )}
          {p.windowCount > 0 && (
            <div className="flex justify-between">
              <span>Okná ({p.windowCount} ks):</span>
              <span>{windowsCost.toFixed(2)} €</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Brána ({p.doorWidth}m × {p.doorHeight}m):</span>
            <span>{garageDoorCost.toFixed(2)} €</span>
          </div>
          {p.showFoundation && (
            <div className="flex justify-between">
              <span>Základová doska:</span>
              <span>{foundationCost.toFixed(2)} €</span>
            </div>
          )}
        </div>

        <div className="pt-2 text-xs">
          <div className="flex justify-between text-white/50">
            <span>Bez DPH:</span>
            <span>{totalCost.toFixed(2)} €</span>
          </div>
          <div className="flex justify-between text-white/50">
            <span>DPH (20%):</span>
            <span>{vat.toFixed(2)} €</span>
          </div>
          <div className="mt-1 flex justify-between text-sm font-bold text-emerald-300">
            <span>Spolu s DPH:</span>
            <span>{totalWithVat.toFixed(2)} €</span>
          </div>
        </div>

        <button
          onClick={() => setShowForm(true)}
          className="mt-3 w-full rounded bg-emerald-400 py-1.5 text-center text-xs font-bold text-black transition hover:bg-emerald-300"
        >
          Dopytovať cenovú ponuku
        </button>
      </div>

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
    </>
  );
}
