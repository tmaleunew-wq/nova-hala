import { Calculator } from "lucide-react";
import type { GarageParams } from "@/lib/garage/types";

interface AdminPricingTableProps {
  clientName: string;
  params: GarageParams;
  totalSteelLength: number;
  totalSteelWeight: number;
  steelPricePerKg: number;
  calculatedSteelCost: number;
  totalCladdingArea: number;
  activeCladdingUnitPrice: number;
  calculatedCladdingCost: number;
  garageDoorCost: number;
  calculatedGarageDoorCost: number;
  personalDoorCost: number;
  calculatedPersonalDoorCost: number;
  windowCost: number;
  calculatedWindowsCost: number;
  customItem1Label: string;
  calculatedCustomItem1Cost: number;
  customItem2Label: string;
  calculatedCustomItem2Cost: number;
  laborCost: number;
  transportCost: number;
  marginPercent: number;
  marginAmount: number;
  finalSubtotalBeforeVat: number;
  finalTotalWithVat: number;
}

export function AdminPricingTable({
  clientName,
  params,
  totalSteelLength,
  totalSteelWeight,
  steelPricePerKg,
  calculatedSteelCost,
  totalCladdingArea,
  activeCladdingUnitPrice,
  calculatedCladdingCost,
  garageDoorCost,
  calculatedGarageDoorCost,
  personalDoorCost,
  calculatedPersonalDoorCost,
  windowCost,
  calculatedWindowsCost,
  customItem1Label,
  calculatedCustomItem1Cost,
  customItem2Label,
  calculatedCustomItem2Cost,
  laborCost,
  transportCost,
  marginPercent,
  marginAmount,
  finalSubtotalBeforeVat,
  finalTotalWithVat,
}: AdminPricingTableProps) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#0e1218] p-5">
      <div className="flex items-center gap-2 mb-4 text-emerald-400 border-b border-white/5 pb-2">
        <Calculator className="h-4 w-4" />
        <h3 className="text-xs uppercase font-bold tracking-widest">Podrobný Rozpis Kalkulácie pre {clientName}</h3>
      </div>

      <div className="overflow-x-auto -mx-2 px-2">
        <table className="w-full min-w-[500px] text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-white/10 text-white/40">
              <th className="py-2 font-normal">Položka špecifikácie</th>
              <th className="py-2 text-right font-normal">Množstvo</th>
              <th className="py-2 text-right font-normal">Jedn. cena</th>
              <th className="py-2 text-right font-normal">Cena bez DPH</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
          <tr>
            <td className="py-2 pr-2">
              <div className="font-bold text-slate-200">Oceľová nosná konštrukcia (jakl)</div>
              <div className="text-[10px] text-white/40">Celková dĺžka profilov: {totalSteelLength.toFixed(1)} m</div>
            </td>
            <td className="py-2 text-right font-mono">{totalSteelWeight.toFixed(0)} kg</td>
            <td className="py-2 text-right font-mono">{steelPricePerKg.toFixed(2)} €</td>
            <td className="py-2 text-right font-mono font-bold text-slate-100">{calculatedSteelCost.toFixed(2)} €</td>
          </tr>

          <tr>
            <td className="py-2 pr-2">
              <div className="font-bold text-slate-200">Opláštenie ({params.panelType === "sandwich" ? "Sendvič" : "Trapéz"})</div>
              <div className="text-[10px] text-white/40">Steny ({params.claddingColor}) + Strecha ({params.roofColor})</div>
            </td>
            <td className="py-2 text-right font-mono">{totalCladdingArea.toFixed(1)} m²</td>
            <td className="py-2 text-right font-mono">{activeCladdingUnitPrice.toFixed(2)} €</td>
            <td className="py-2 text-right font-mono font-bold text-slate-100">{calculatedCladdingCost.toFixed(2)} €</td>
          </tr>

          <tr>
            <td className="py-2 pr-2">
              <div className="font-bold text-slate-200">Sekcionálna garážová brána</div>
              <div className="text-[10px] text-white/40">Rozmer: {params.doorWidth} × {params.doorHeight} m</div>
            </td>
            <td className="py-2 text-right font-mono">1 ks</td>
            <td className="py-2 text-right font-mono">{garageDoorCost.toFixed(2)} €</td>
            <td className="py-2 text-right font-mono font-bold text-slate-100">{calculatedGarageDoorCost.toFixed(2)} €</td>
          </tr>

          {params.hasPersonalDoor && (
            <tr>
              <td className="py-2 pr-2">
                <div className="font-bold text-slate-200">Personálne dvere</div>
                <div className="text-[10px] text-white/40">Umiestnenie: {params.personalDoorSide} strana</div>
              </td>
              <td className="py-2 text-right font-mono">1 ks</td>
              <td className="py-2 text-right font-mono">{personalDoorCost.toFixed(2)} €</td>
              <td className="py-2 text-right font-mono font-bold text-slate-100">{calculatedPersonalDoorCost.toFixed(2)} €</td>
            </tr>
          )}

          {params.hasWindows && params.windowCount > 0 && (
            <tr>
              <td className="py-2 pr-2">
                <div className="font-bold text-slate-200">Svetlíkové okná</div>
                <div className="text-[10px] text-white/40">{params.windowCount}x ({params.windowWidth}×{params.windowHeight}m)</div>
              </td>
              <td className="py-2 text-right font-mono">{params.windowCount} ks</td>
              <td className="py-2 text-right font-mono">{windowCost.toFixed(2)} €</td>
              <td className="py-2 text-right font-mono font-bold text-slate-100">{calculatedWindowsCost.toFixed(2)} €</td>
            </tr>
          )}

          {calculatedCustomItem1Cost > 0 && (
            <tr>
              <td className="py-2 pr-2">
                <div className="font-bold text-amber-300">{customItem1Label.trim() || "Voliteľná položka 1"}</div>
              </td>
              <td className="py-2 text-right font-mono">1 ks</td>
              <td className="py-2 text-right font-mono">{calculatedCustomItem1Cost.toFixed(2)} €</td>
              <td className="py-2 text-right font-mono font-bold text-amber-300">{calculatedCustomItem1Cost.toFixed(2)} €</td>
            </tr>
          )}

          {calculatedCustomItem2Cost > 0 && (
            <tr>
              <td className="py-2 pr-2">
                <div className="font-bold text-amber-300">{customItem2Label.trim() || "Voliteľná položka 2"}</div>
              </td>
              <td className="py-2 text-right font-mono">1 ks</td>
              <td className="py-2 text-right font-mono">{calculatedCustomItem2Cost.toFixed(2)} €</td>
              <td className="py-2 text-right font-mono font-bold text-amber-300">{calculatedCustomItem2Cost.toFixed(2)} €</td>
            </tr>
          )}

          <tr>
            <td className="py-2 pr-2">
              <div className="font-bold text-slate-200">Montáž, prácnosť a doprava</div>
            </td>
            <td className="py-2 text-right font-mono">Komplet</td>
            <td className="py-2 text-right font-mono">{(laborCost + transportCost).toFixed(2)} €</td>
            <td className="py-2 text-right font-mono font-bold text-slate-100">{(laborCost + transportCost).toFixed(2)} €</td>
          </tr>

          {marginPercent > 0 && (
            <tr>
              <td className="py-2 pr-2">
                <div className="font-bold text-slate-200">Marža / Zisk ({marginPercent}%)</div>
              </td>
              <td className="py-2 text-right font-mono">{marginPercent} %</td>
              <td className="py-2 text-right font-mono">—</td>
              <td className="py-2 text-right font-mono font-bold text-slate-100">{marginAmount.toFixed(2)} €</td>
            </tr>
          )}
        </tbody>
      </table>
      </div>

      {/* Totals Summary */}
      <div className="mt-4 border-t border-white/20 pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm">
        <div className="text-white/60">
          Spolu bez DPH: <span className="font-bold text-white font-mono">{finalSubtotalBeforeVat.toFixed(2)} €</span>
        </div>
        <div className="text-base sm:text-lg font-bold text-emerald-400 font-mono">
          CELKOVÁ CENA S DPH: {finalTotalWithVat.toFixed(2)} €
        </div>
      </div>
    </div>
  );
}
