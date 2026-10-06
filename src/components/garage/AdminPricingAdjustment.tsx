import { Sliders } from "lucide-react";

interface AdminPricingAdjustmentProps {
  steelPricePerKg: number;
  setSteelPricePerKg: (v: number) => void;
  sandwichPricePerSqM: number;
  setSandwichPricePerSqM: (v: number) => void;
  trapezoidPricePerSqM: number;
  setTrapezoidPricePerSqM: (v: number) => void;
  garageDoorCost: number;
  setGarageDoorCost: (v: number) => void;
  personalDoorCost: number;
  setPersonalDoorCost: (v: number) => void;
  windowCost: number;
  setWindowCost: (v: number) => void;
  laborCost: number;
  setLaborCost: (v: number) => void;
  marginPercent: number;
  setMarginPercent: (v: number) => void;
  customItem1Label: string;
  setCustomItem1Label: (v: string) => void;
  customItem1Cost: number;
  setCustomItem1Cost: (v: number) => void;
  customItem2Label: string;
  setCustomItem2Label: (v: string) => void;
  customItem2Cost: number;
  setCustomItem2Cost: (v: number) => void;
}

export function AdminPricingAdjustment({
  steelPricePerKg,
  setSteelPricePerKg,
  sandwichPricePerSqM,
  setSandwichPricePerSqM,
  trapezoidPricePerSqM,
  setTrapezoidPricePerSqM,
  garageDoorCost,
  setGarageDoorCost,
  personalDoorCost,
  setPersonalDoorCost,
  windowCost,
  setWindowCost,
  laborCost,
  setLaborCost,
  marginPercent,
  setMarginPercent,
  customItem1Label,
  setCustomItem1Label,
  customItem1Cost,
  setCustomItem1Cost,
  customItem2Label,
  setCustomItem2Label,
  customItem2Cost,
  setCustomItem2Cost,
}: AdminPricingAdjustmentProps) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#0e1218] p-5">
      <div className="flex items-center gap-2 mb-4 text-emerald-400 border-b border-white/5 pb-2">
        <Sliders className="h-4 w-4" />
        <h3 className="text-xs uppercase font-bold tracking-widest">Nastavenie Jednotkových Cien Pre Kalkulačku (€)</h3>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <div>
          <label className="block text-white/50 mb-1">Cena ocele (€/kg)</label>
          <input
            type="number"
            step="0.05"
            value={steelPricePerKg}
            onChange={(e) => setSteelPricePerKg(parseFloat(e.target.value) || 0)}
            className="w-full bg-black/40 border border-white/10 rounded px-2 py-1.5 text-white focus:border-emerald-400 focus:outline-none font-bold text-emerald-300"
          />
        </div>

        <div>
          <label className="block text-white/50 mb-1">Sendvič (€/m²)</label>
          <input
            type="number"
            step="0.5"
            value={sandwichPricePerSqM}
            onChange={(e) => setSandwichPricePerSqM(parseFloat(e.target.value) || 0)}
            className="w-full bg-black/40 border border-white/10 rounded px-2 py-1.5 text-white focus:border-emerald-400 focus:outline-none font-bold text-emerald-300"
          />
        </div>

        <div>
          <label className="block text-white/50 mb-1">Trapéz (€/m²)</label>
          <input
            type="number"
            step="0.5"
            value={trapezoidPricePerSqM}
            onChange={(e) => setTrapezoidPricePerSqM(parseFloat(e.target.value) || 0)}
            className="w-full bg-black/40 border border-white/10 rounded px-2 py-1.5 text-white focus:border-emerald-400 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-white/50 mb-1">Garážová brána (€)</label>
          <input
            type="number"
            step="10"
            value={garageDoorCost}
            onChange={(e) => setGarageDoorCost(parseFloat(e.target.value) || 0)}
            className="w-full bg-black/40 border border-white/10 rounded px-2 py-1.5 text-white focus:border-emerald-400 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-white/50 mb-1">Vstupné dvere (€)</label>
          <input
            type="number"
            step="10"
            value={personalDoorCost}
            onChange={(e) => setPersonalDoorCost(parseFloat(e.target.value) || 0)}
            className="w-full bg-black/40 border border-white/10 rounded px-2 py-1.5 text-white focus:border-emerald-400 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-white/50 mb-1">Okno (€/ks)</label>
          <input
            type="number"
            step="5"
            value={windowCost}
            onChange={(e) => setWindowCost(parseFloat(e.target.value) || 0)}
            className="w-full bg-black/40 border border-white/10 rounded px-2 py-1.5 text-white focus:border-emerald-400 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-white/50 mb-1">Montáž a práca (€)</label>
          <input
            type="number"
            step="50"
            value={laborCost}
            onChange={(e) => setLaborCost(parseFloat(e.target.value) || 0)}
            className="w-full bg-black/40 border border-white/10 rounded px-2 py-1.5 text-white focus:border-emerald-400 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-white/50 mb-1">Marža / Zisk (%)</label>
          <input
            type="number"
            step="1"
            value={marginPercent}
            onChange={(e) => setMarginPercent(parseFloat(e.target.value) || 0)}
            className="w-full bg-black/40 border border-white/10 rounded px-2 py-1.5 text-white focus:border-emerald-400 focus:outline-none font-bold text-emerald-300"
          />
        </div>

        <div>
          <label className="block text-white/50 mb-1">Voliteľná položka 1 (€)</label>
          <div className="flex gap-1">
            <input
              type="text"
              placeholder="Názov 1"
              value={customItem1Label}
              onChange={(e) => setCustomItem1Label(e.target.value)}
              className="w-1/2 bg-black/40 border border-white/10 rounded px-2 py-1.5 text-white focus:border-emerald-400 focus:outline-none text-[11px]"
            />
            <input
              type="number"
              placeholder="Suma €"
              value={customItem1Cost || ""}
              onChange={(e) => setCustomItem1Cost(parseFloat(e.target.value) || 0)}
              className="w-1/2 bg-black/40 border border-white/10 rounded px-2 py-1.5 text-white focus:border-emerald-400 focus:outline-none font-bold text-amber-300 text-xs"
            />
          </div>
        </div>

        <div>
          <label className="block text-white/50 mb-1">Voliteľná položka 2 (€)</label>
          <div className="flex gap-1">
            <input
              type="text"
              placeholder="Názov 2"
              value={customItem2Label}
              onChange={(e) => setCustomItem2Label(e.target.value)}
              className="w-1/2 bg-black/40 border border-white/10 rounded px-2 py-1.5 text-white focus:border-emerald-400 focus:outline-none text-[11px]"
            />
            <input
              type="number"
              placeholder="Suma €"
              value={customItem2Cost || ""}
              onChange={(e) => setCustomItem2Cost(parseFloat(e.target.value) || 0)}
              className="w-1/2 bg-black/40 border border-white/10 rounded px-2 py-1.5 text-white focus:border-emerald-400 focus:outline-none font-bold text-amber-300 text-xs"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
