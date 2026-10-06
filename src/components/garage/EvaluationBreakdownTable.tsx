import { FileText } from "lucide-react";
import type { GarageParams } from "@/lib/garage/types";

interface EvaluationBreakdownTableProps {
  params: GarageParams;
  totalSteelLength: number;
  totalSteelWeight: number;
  steelPricePerKg: number;
  calculatedSteelCost: number;
  totalCladdingArea: number;
  activeCladdingUnitPrice: number;
  calculatedCladdingCost: number;
  basePlatesCount: number;
  basePlateCost: number;
  calculatedBasePlateCost: number;
  garageDoorCost: number;
  calculatedGarageDoorCost: number;
  personalDoorCost: number;
  calculatedPersonalDoorCost: number;
  windowCost: number;
  calculatedWindowsCost: number;
  W: number;
  L: number;
  foundationPricePerSqM: number;
  calculatedFoundationCost: number;
  customItem1Label: string;
  calculatedCustomItem1Cost: number;
  customItem2Label: string;
  calculatedCustomItem2Cost: number;
  transportCost: number;
  laborCost: number;
  marginPercent: number;
  marginAmount: number;
  finalSubtotalBeforeVat: number;
  vatAmount: number;
  finalTotalWithVat: number;
}

export function EvaluationBreakdownTable({
  params,
  totalSteelLength,
  totalSteelWeight,
  steelPricePerKg,
  calculatedSteelCost,
  totalCladdingArea,
  activeCladdingUnitPrice,
  calculatedCladdingCost,
  basePlatesCount,
  basePlateCost,
  calculatedBasePlateCost,
  garageDoorCost,
  calculatedGarageDoorCost,
  personalDoorCost,
  calculatedPersonalDoorCost,
  windowCost,
  calculatedWindowsCost,
  W,
  L,
  foundationPricePerSqM,
  calculatedFoundationCost,
  customItem1Label,
  calculatedCustomItem1Cost,
  customItem2Label,
  calculatedCustomItem2Cost,
  transportCost,
  laborCost,
  marginPercent,
  marginAmount,
  finalSubtotalBeforeVat,
  vatAmount,
  finalTotalWithVat,
}: EvaluationBreakdownTableProps) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#0e1218] p-5 print:border-none print:bg-white print:p-0">
      <div className="flex items-center gap-2 mb-4 text-emerald-400 border-b border-white/5 pb-2 print:border-slate-300 print:text-black">
        <FileText className="h-4 w-4 print:hidden" />
        <h2 className="text-xs uppercase font-bold tracking-widest print:text-sm">Podrobný Rozpis Kalkulácie</h2>
      </div>

      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="border-b border-white/10 text-white/40 print:border-slate-300 print:text-slate-500">
            <th className="py-2 font-normal">Položka špecifikácie</th>
            <th className="py-2 text-right font-normal">Množstvo</th>
            <th className="py-2 text-right font-normal">Jedn. cena</th>
            <th className="py-2 text-right font-normal">Cena bez DPH</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5 print:divide-slate-200">
          {/* Steel Structure */}
          <tr>
            <td className="py-2.5 pr-2">
              <div className="font-bold text-slate-200 print:text-black">Oceľová nosná konštrukcia (jakl)</div>
              <div className="text-[10px] text-white/40 print:text-slate-500">
                Výpočet: stĺpy, krokvy, väznice, paždíky, väzníky (Celkovo {totalSteelLength.toFixed(1)} m)
              </div>
            </td>
            <td className="py-2.5 text-right font-mono">{totalSteelWeight.toFixed(0)} kg</td>
            <td className="py-2.5 text-right font-mono">{steelPricePerKg.toFixed(2)} €</td>
            <td className="py-2.5 text-right font-mono font-bold text-slate-100 print:text-black">{calculatedSteelCost.toFixed(2)} €</td>
          </tr>

          {/* Cladding Panels */}
          <tr>
            <td className="py-2.5 pr-2">
              <div className="font-bold text-slate-200 print:text-black">
                Opláštenie stien a strechy ({params.panelType === "sandwich" ? "Sendvič" : "Trapéz"})
              </div>
              <div className="text-[10px] text-white/40 print:text-slate-500">
                Celková plocha stien, štítov a strechy
              </div>
            </td>
            <td className="py-2.5 text-right font-mono">{totalCladdingArea.toFixed(1)} m²</td>
            <td className="py-2.5 text-right font-mono">{activeCladdingUnitPrice.toFixed(2)} €</td>
            <td className="py-2.5 text-right font-mono font-bold text-slate-100 print:text-black">{calculatedCladdingCost.toFixed(2)} €</td>
          </tr>

          {/* Base plates */}
          <tr>
            <td className="py-2.5 pr-2">
              <div className="font-bold text-slate-200 print:text-black">Kotviace platne / pätky</div>
              <div className="text-[10px] text-white/40 print:text-slate-500">Vrátane spojovacieho materiálu</div>
            </td>
            <td className="py-2.5 text-right font-mono">{basePlatesCount} ks</td>
            <td className="py-2.5 text-right font-mono">{basePlateCost.toFixed(2)} €</td>
            <td className="py-2.5 text-right font-mono font-bold text-slate-100 print:text-black">{calculatedBasePlateCost.toFixed(2)} €</td>
          </tr>

          {/* Garage Door */}
          <tr>
            <td className="py-2.5 pr-2">
              <div className="font-bold text-slate-200 print:text-black">Sekcionálna garážová brána</div>
              <div className="text-[10px] text-white/40 print:text-slate-500">Rozmer: {params.doorWidth} × {params.doorHeight} m</div>
            </td>
            <td className="py-2.5 text-right font-mono">1 ks</td>
            <td className="py-2.5 text-right font-mono">{garageDoorCost.toFixed(2)} €</td>
            <td className="py-2.5 text-right font-mono font-bold text-slate-100 print:text-black">{calculatedGarageDoorCost.toFixed(2)} €</td>
          </tr>

          {/* Personal Door */}
          {params.hasPersonalDoor && (
            <tr>
              <td className="py-2.5 pr-2">
                <div className="font-bold text-slate-200 print:text-black">Personálne vstupné dvere</div>
                <div className="text-[10px] text-white/40 print:text-slate-500">Kovové zateplené, umiestnenie: {params.personalDoorSide}</div>
              </td>
              <td className="py-2.5 text-right font-mono">1 ks</td>
              <td className="py-2.5 text-right font-mono">{personalDoorCost.toFixed(2)} €</td>
              <td className="py-2.5 text-right font-mono font-bold text-slate-100 print:text-black">{calculatedPersonalDoorCost.toFixed(2)} €</td>
            </tr>
          )}

          {/* Windows */}
          {params.hasWindows && params.windowCount > 0 && (
            <tr>
              <td className="py-2.5 pr-2">
                <div className="font-bold text-slate-200 print:text-black">Svetlíkové okná</div>
                <div className="text-[10px] text-white/40 print:text-slate-500">Rozmer: {params.windowWidth} × {params.windowHeight} m</div>
              </td>
              <td className="py-2.5 text-right font-mono">{params.windowCount} ks</td>
              <td className="py-2.5 text-right font-mono">{windowCost.toFixed(2)} €</td>
              <td className="py-2.5 text-right font-mono font-bold text-slate-100 print:text-black">{calculatedWindowsCost.toFixed(2)} €</td>
            </tr>
          )}

          {/* Foundation */}
          {params.showFoundation && (
            <tr>
              <td className="py-2.5 pr-2">
                <div className="font-bold text-slate-200 print:text-black">Železobetónová základová platňa</div>
                <div className="text-[10px] text-white/40 print:text-slate-500">Výpočet plochy: {W} × {L} m</div>
              </td>
              <td className="py-2.5 text-right font-mono">{(W * L).toFixed(1)} m²</td>
              <td className="py-2.5 text-right font-mono">{foundationPricePerSqM.toFixed(2)} €</td>
              <td className="py-2.5 text-right font-mono font-bold text-slate-100 print:text-black">{calculatedFoundationCost.toFixed(2)} €</td>
            </tr>
          )}

          {calculatedCustomItem1Cost > 0 && (
            <tr>
              <td className="py-2.5 pr-2">
                <div className="font-bold text-amber-300 print:text-black">{customItem1Label.trim() || "Voliteľná položka 1"}</div>
              </td>
              <td className="py-2.5 text-right font-mono">1 ks</td>
              <td className="py-2.5 text-right font-mono">{calculatedCustomItem1Cost.toFixed(2)} €</td>
              <td className="py-2.5 text-right font-mono font-bold text-amber-300 print:text-black">{calculatedCustomItem1Cost.toFixed(2)} €</td>
            </tr>
          )}

          {calculatedCustomItem2Cost > 0 && (
            <tr>
              <td className="py-2.5 pr-2">
                <div className="font-bold text-amber-300 print:text-black">{customItem2Label.trim() || "Voliteľná položka 2"}</div>
              </td>
              <td className="py-2.5 text-right font-mono">1 ks</td>
              <td className="py-2.5 text-right font-mono">{calculatedCustomItem2Cost.toFixed(2)} €</td>
              <td className="py-2.5 text-right font-mono font-bold text-amber-300 print:text-black">{calculatedCustomItem2Cost.toFixed(2)} €</td>
            </tr>
          )}

          {/* Transport */}
          <tr>
            <td className="py-2.5 pr-2">
              <div className="font-bold text-slate-200 print:text-black">Doprava, logistika a vykládka materiálu</div>
            </td>
            <td className="py-2.5 text-right font-mono">Paušál</td>
            <td className="py-2.5 text-right font-mono">{transportCost.toFixed(2)} €</td>
            <td className="py-2.5 text-right font-mono font-bold text-slate-100 print:text-black">{transportCost.toFixed(2)} €</td>
          </tr>

          {/* Labor / Assembly */}
          <tr>
            <td className="py-2.5 pr-2">
              <div className="font-bold text-slate-200 print:text-black">Montážne a stavebné práce konštrukcie a opláštenia</div>
            </td>
            <td className="py-2.5 text-right font-mono">Práca</td>
            <td className="py-2.5 text-right font-mono">{laborCost.toFixed(2)} €</td>
            <td className="py-2.5 text-right font-mono font-bold text-slate-100 print:text-black">{laborCost.toFixed(2)} €</td>
          </tr>

          {/* Custom margin */}
          {marginPercent > 0 && (
            <tr>
              <td className="py-2.5 pr-2">
                <div className="font-bold text-slate-200 print:text-black">Ostatné réžie, marža a poistenie rizík</div>
              </td>
              <td className="py-2.5 text-right font-mono">{marginPercent} %</td>
              <td className="py-2.5 text-right font-mono">Z celku</td>
              <td className="py-2.5 text-right font-mono font-bold text-slate-100 print:text-black">{marginAmount.toFixed(2)} €</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Price calculation block summary */}
      <div className="mt-6 border-t-2 border-white/20 pt-4 space-y-2 text-xs print:border-slate-300">
        <div className="flex justify-between text-slate-400 print:text-slate-600">
          <span>Spolu bez DPH:</span>
          <span className="font-mono">{finalSubtotalBeforeVat.toFixed(2)} €</span>
        </div>
        <div className="flex justify-between text-slate-400 print:text-slate-600">
          <span>DPH (20%):</span>
          <span className="font-mono">{vatAmount.toFixed(2)} €</span>
        </div>
        <div className="flex justify-between text-base font-bold text-emerald-400 border-t border-white/5 pt-2 print:border-slate-200 print:text-black">
          <span>KONEČNÁ CENA S DPH:</span>
          <span className="font-mono text-lg">{finalTotalWithVat.toFixed(2)} €</span>
        </div>
      </div>

      {/* Fine print for invoice */}
      <div className="hidden print:block mt-12 text-[9px] text-slate-500 leading-normal border-t border-slate-200 pt-4">
        <p>Tento rozpis cien slúži ako nezáväzný dopytový odhad kalkulácie na základe hodnôt zvolených v konfigurátore.</p>
        <p>Konečná cena sa môže mierne líšiť na základe statického posúdenia a aktuálneho cenníka hutníckeho materiálu v čase reálneho objednania.</p>
        <p>Platnosť ponuky: 30 kalendárnych dní.</p>
      </div>
    </div>
  );
}
