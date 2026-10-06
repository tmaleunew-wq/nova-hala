import { DollarSign } from "lucide-react";

interface EvaluationPricingSettingsProps {
  steelPricePerKg: number;
  setSteelPricePerKg: (v: number) => void;
  steelWeightPerMeter: number;
  setSteelWeightPerMeter: (v: number) => void;
  sandwichPricePerSqM: number;
  setSandwichPricePerSqM: (v: number) => void;
  trapezoidPricePerSqM: number;
  setTrapezoidPricePerSqM: (v: number) => void;
  basePlateCost: number;
  setBasePlateCost: (v: number) => void;
  garageDoorCost: number;
  setGarageDoorCost: (v: number) => void;
  personalDoorCost: number;
  setPersonalDoorCost: (v: number) => void;
  windowCost: number;
  setWindowCost: (v: number) => void;
  foundationPricePerSqM: number;
  setFoundationPricePerSqM: (v: number) => void;
  laborCost: number;
  setLaborCost: (v: number) => void;
  transportCost: number;
  setTransportCost: (v: number) => void;
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

export function EvaluationPricingSettings({
  steelPricePerKg,
  setSteelPricePerKg,
  steelWeightPerMeter,
  setSteelWeightPerMeter,
  sandwichPricePerSqM,
  setSandwichPricePerSqM,
  trapezoidPricePerSqM,
  setTrapezoidPricePerSqM,
  basePlateCost,
  setBasePlateCost,
  garageDoorCost,
  setGarageDoorCost,
  personalDoorCost,
  setPersonalDoorCost,
  windowCost,
  setWindowCost,
  foundationPricePerSqM,
  setFoundationPricePerSqM,
  laborCost,
  setLaborCost,
  transportCost,
  setTransportCost,
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
}: EvaluationPricingSettingsProps) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#0e1218] p-5 print:hidden">
      <div className="flex items-center gap-2 mb-4 text-emerald-400 border-b border-white/5 pb-2">
        <DollarSign className="h-4 w-4" />
        <h2 className="text-xs uppercase font-bold tracking-widest">Nastavenie Jednotkových Cien (€)</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div>
          <label className="block text-white/50 mb-1">Cena ocele za kg</label>
          <input
            type="number"
            step="0.05"
            value={steelPricePerKg}
            onChange={(e) => setSteelPricePerKg(Math.max(0, parseFloat(e.target.value) || 0))}
            className="w-full bg-black/40 border border-white/10 rounded px-2.5 py-1.5 text-white focus:border-emerald-400 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-white/50 mb-1">Hmotnosť ocele (kg/m)</label>
          <input
            type="number"
            step="0.1"
            value={steelWeightPerMeter}
            onChange={(e) => setSteelWeightPerMeter(Math.max(0, parseFloat(e.target.value) || 0))}
            className="w-full bg-black/40 border border-white/10 rounded px-2.5 py-1.5 text-white focus:border-emerald-400 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-white/50 mb-1">Sendvič. panel (€/m²)</label>
          <input
            type="number"
            step="0.5"
            value={sandwichPricePerSqM}
            onChange={(e) => setSandwichPricePerSqM(Math.max(0, parseFloat(e.target.value) || 0))}
            className="w-full bg-black/40 border border-white/10 rounded px-2.5 py-1.5 text-white focus:border-emerald-400 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-white/50 mb-1">Trapézový plech (€/m²)</label>
          <input
            type="number"
            step="0.5"
            value={trapezoidPricePerSqM}
            onChange={(e) => setTrapezoidPricePerSqM(Math.max(0, parseFloat(e.target.value) || 0))}
            className="w-full bg-black/40 border border-white/10 rounded px-2.5 py-1.5 text-white focus:border-emerald-400 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-white/50 mb-1">Pätka / platňa (€/ks)</label>
          <input
            type="number"
            step="1"
            value={basePlateCost}
            onChange={(e) => setBasePlateCost(Math.max(0, parseFloat(e.target.value) || 0))}
            className="w-full bg-black/40 border border-white/10 rounded px-2.5 py-1.5 text-white focus:border-emerald-400 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-white/50 mb-1">Garážová brána (€/ks)</label>
          <input
            type="number"
            step="10"
            value={garageDoorCost}
            onChange={(e) => setGarageDoorCost(Math.max(0, parseFloat(e.target.value) || 0))}
            className="w-full bg-black/40 border border-white/10 rounded px-2.5 py-1.5 text-white focus:border-emerald-400 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-white/50 mb-1">Personálne dvere (€/ks)</label>
          <input
            type="number"
            step="10"
            value={personalDoorCost}
            onChange={(e) => setPersonalDoorCost(Math.max(0, parseFloat(e.target.value) || 0))}
            className="w-full bg-black/40 border border-white/10 rounded px-2.5 py-1.5 text-white focus:border-emerald-400 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-white/50 mb-1">Okno (€/ks)</label>
          <input
            type="number"
            step="5"
            value={windowCost}
            onChange={(e) => setWindowCost(Math.max(0, parseFloat(e.target.value) || 0))}
            className="w-full bg-black/40 border border-white/10 rounded px-2.5 py-1.5 text-white focus:border-emerald-400 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-white/50 mb-1">Základová doska (€/m²)</label>
          <input
            type="number"
            step="5"
            value={foundationPricePerSqM}
            onChange={(e) => setFoundationPricePerSqM(Math.max(0, parseFloat(e.target.value) || 0))}
            className="w-full bg-black/40 border border-white/10 rounded px-2.5 py-1.5 text-white focus:border-emerald-400 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-white/50 mb-1">Montáž / Práca (€)</label>
          <input
            type="number"
            step="50"
            value={laborCost}
            onChange={(e) => setLaborCost(Math.max(0, parseFloat(e.target.value) || 0))}
            className="w-full bg-black/40 border border-white/10 rounded px-2.5 py-1.5 text-white focus:border-emerald-400 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-white/50 mb-1">Doprava / Logistika (€)</label>
          <input
            type="number"
            step="10"
            value={transportCost}
            onChange={(e) => setTransportCost(Math.max(0, parseFloat(e.target.value) || 0))}
            className="w-full bg-black/40 border border-white/10 rounded px-2.5 py-1.5 text-white focus:border-emerald-400 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-white/50 mb-1">Marža / Zisk (%)</label>
          <input
            type="number"
            step="1"
            value={marginPercent}
            onChange={(e) => setMarginPercent(Math.max(0, parseFloat(e.target.value) || 0))}
            className="w-full bg-black/40 border border-white/10 rounded px-2.5 py-1.5 text-white focus:border-emerald-400 focus:outline-none"
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
              onChange={(e) => setCustomItem1Cost(Math.max(0, parseFloat(e.target.value) || 0))}
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
              onChange={(e) => setCustomItem2Cost(Math.max(0, parseFloat(e.target.value) || 0))}
              className="w-1/2 bg-black/40 border border-white/10 rounded px-2 py-1.5 text-white focus:border-emerald-400 focus:outline-none font-bold text-amber-300 text-xs"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
