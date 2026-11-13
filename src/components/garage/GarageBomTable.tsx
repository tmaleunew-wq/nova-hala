import React, { useState } from "react";
import type { GarageParams } from "@/lib/garage/types";
import { calculateGarageBom } from "@/lib/garage/bomCalculator";
import { Package, ChevronDown, ChevronUp, Layers, Wrench, Shield } from "lucide-react";

interface GarageBomTableProps {
  params: GarageParams;
  accentColor?: "cyan" | "emerald";
}

export function GarageBomTable({ params, accentColor = "cyan" }: GarageBomTableProps) {
  const [isOpen, setIsOpen] = useState(false);
  const bom = calculateGarageBom(params);

  const isEmerald = accentColor === "emerald";
  const badgeCls = isEmerald
    ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
    : "bg-cyan-500/15 text-cyan-300 border-cyan-500/30";
  const numCls = isEmerald ? "text-emerald-400" : "text-cyan-400";

  return (
    <div className="rounded-xl bg-[#121824]/90 border border-white/10 overflow-hidden shadow-md">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-3.5 flex items-center justify-between text-left hover:bg-white/[0.02] transition cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          <div className={`p-1.5 rounded-lg border ${badgeCls}`}>
            <Package className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-100 uppercase tracking-wide">
                Výkaz materiálu & kusovník (BOM)
              </span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded border font-mono font-semibold ${badgeCls}`}>
                {bom.items.length} položiek
              </span>
            </div>
            <p className="text-[11px] text-white/50 mt-0.5">
              Oceľová konštrukcia, panely, lemovania a spojovací materiál
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-white/60">
          <span className="text-[11px] hidden sm:inline">
            {isOpen ? "Zbaliť" : "Zobraziť výpis"}
          </span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Quick Summary Chips */}
      <div className="px-3.5 pb-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono border-b border-white/5">
        <div className="p-2 rounded-lg bg-black/40 border border-white/5">
          <div className="text-[10px] text-white/40 uppercase">Oceľ (celkom)</div>
          <div className={`font-bold ${numCls}`}>{bom.totalSteelWeightKg} kg</div>
          <div className="text-[10px] text-white/50">{bom.totalSteelLengthBm} bm profilov</div>
        </div>
        <div className="p-2 rounded-lg bg-black/40 border border-white/5">
          <div className="text-[10px] text-white/40 uppercase">Steny & Strecha</div>
          <div className={`font-bold ${numCls}`}>{(bom.totalWallAreaM2 + bom.totalRoofAreaM2).toFixed(1)} m²</div>
          <div className="text-[10px] text-white/50">{bom.totalWallAreaM2}m² steny / {bom.totalRoofAreaM2}m² strecha</div>
        </div>
        <div className="p-2 rounded-lg bg-black/40 border border-white/5">
          <div className="text-[10px] text-white/40 uppercase">Lemovanie</div>
          <div className={`font-bold ${numCls}`}>{bom.totalFlashingBm} bm</div>
          <div className="text-[10px] text-white/50">nárožia + odkvapy</div>
        </div>
        <div className="p-2 rounded-lg bg-black/40 border border-white/5">
          <div className="text-[10px] text-white/40 uppercase">Kotvy a skrutky</div>
          <div className={`font-bold ${numCls}`}>{bom.totalFastenersCount} ks</div>
          <div className="text-[10px] text-white/50">EPDM spojovací mat.</div>
        </div>
      </div>

      {/* Expanded Table */}
      {isOpen && (
        <div className="p-3.5 bg-black/30 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-[10px] text-white/50 uppercase font-mono">
                <th className="pb-2 font-medium">Položka</th>
                <th className="pb-2 font-medium">Špecifikácia</th>
                <th className="pb-2 font-medium text-right">Množstvo</th>
                <th className="pb-2 font-medium text-right">Hmotnosť</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-[11px]">
              {Array.from(new Set(bom.items.map((i) => i.category))).map((category) => {
                const catItems = bom.items.filter((i) => i.category === category);
                const catWeight = catItems.reduce((sum, i) => sum + (i.weightKg || 0), 0);
                const sameUnit = catItems.every((i) => i.unit === catItems[0].unit);
                const catQty = sameUnit ? Math.round(catItems.reduce((sum, i) => sum + i.quantity, 0) * 10) / 10 : null;

                return (
                  <React.Fragment key={category}>
                    <tr className="bg-white/[0.05] border-t border-b border-white/10">
                      <td colSpan={2} className="py-2 px-2 text-xs font-bold text-emerald-400">
                        {category}
                        <span className="ml-2 text-[10px] font-normal text-white/50">({catItems.length} {catItems.length === 1 ? 'položka' : catItems.length < 5 ? 'položky' : 'položiek'})</span>
                      </td>
                      <td className="py-2 pr-2 text-right font-mono font-bold text-emerald-300 whitespace-nowrap">
                        {catQty !== null ? `${catQty} ${catItems[0].unit}` : "—"}
                      </td>
                      <td className="py-2 pl-2 text-right font-mono font-bold text-emerald-300 whitespace-nowrap">
                        {catWeight > 0 ? `${catWeight} kg` : "—"}
                      </td>
                    </tr>
                    {catItems.map((item) => (
                      <tr key={item.id} className="hover:bg-white/[0.02]">
                        <td className="py-2 pl-4 pr-2 font-medium text-white">
                          {item.name}
                        </td>
                        <td className="py-2 pr-2 text-white/70 font-mono text-[10px]">
                          {item.spec}
                        </td>
                        <td className="py-2 pr-2 text-right font-mono font-bold text-white whitespace-nowrap">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="py-2 pl-2 text-right font-mono text-white/60 whitespace-nowrap">
                          {item.weightKg ? `${item.weightKg} kg` : "—"}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-emerald-500/40 bg-emerald-950/30 text-xs font-bold text-white">
                <td colSpan={2} className="py-2.5 px-3 uppercase tracking-wider text-emerald-300">
                  Celkový súčet evidovanej ocele
                </td>
                <td className="py-2.5 pr-2 text-right font-mono text-emerald-300">
                  {bom.totalSteelLengthBm} bm
                </td>
                <td className="py-2.5 pl-2 text-right font-mono text-emerald-300">
                  {bom.totalSteelWeightKg} kg
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
