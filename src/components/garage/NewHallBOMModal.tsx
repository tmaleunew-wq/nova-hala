import React from "react";
import { type GarageParams } from "@/lib/garage/types";
import { X, Printer, Download, Layers, ShieldCheck, Box, Ruler } from "lucide-react";

interface NewHallBOMModalProps {
  isOpen: boolean;
  onClose: () => void;
  params: GarageParams;
  hallName?: string;
}

export function NewHallBOMModal({
  isOpen,
  onClose,
  params,
  hallName = "Nová priemyselná hala",
}: NewHallBOMModalProps) {
  if (!isOpen) return null;

  const w = params.width;
  const l = params.length;
  const h = params.clearHeight;
  const bays = params.bayCount ?? Math.max(1, Math.round(l / 4.5));
  const framesCount = bays + 1;
  const hasCenterCols = !!params.hasCenterColumns;

  // Steel structure breakdown
  const mainColumnsCount = framesCount * (hasCenterCols ? 3 : 2);
  const raftersCount = framesCount * 2;
  const purlinRowsPerSlope = Math.max(3, Math.ceil(w / 2 / 1.5));
  const purlinTotalRows = purlinRowsPerSlope * 2;
  const purlinTotalCount = purlinTotalRows * bays;
  const purlinLengthM = bays * (l / bays); // total per line
  const purlinsTotalLength = purlinTotalRows * l;

  // Steel weight estimations (approx kg)
  // IPE 160 approx 15.8 kg/m, C200 approx 10-12 kg/m
  const colKgPerM = params.structureType === "c_profiles" ? 11.5 : 15.8;
  const colWeight = mainColumnsCount * h * colKgPerM;
  const slopeLen = Math.hypot(w / 2, (params.hallHeight ?? h) - h);
  const rafterWeight = raftersCount * slopeLen * colKgPerM;
  const purlinWeight = purlinsTotalLength * 5.2; // Z-purlins approx 5.2 kg/m
  const bracingWeight = bays * 140; // X-bracings
  const totalSteelWeightKg = Math.round(colWeight + rafterWeight + purlinWeight + bracingWeight);

  // Cladding & Panel breakdown (standard 1000mm width)
  const wallPerimeter = 2 * (w + l);
  const wallAreaM2 = Math.round(wallPerimeter * h * 10) / 10;
  const wallPanelsCount = Math.ceil(wallPerimeter / 1.0); // 1000mm module
  const roofAreaM2 = Math.round(2 * slopeLen * l * 10) / 10;
  const roofPanelsCount = Math.ceil((l / 1.0) * 2);

  // Doors & Windows
  const doorCount = (params.personalDoorCount ?? (params.hasPersonalDoor ? 1 : 0));
  const windowCount = params.windowCount ?? 0;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-cyan-500/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                Výkaz materiálu & Kladačský plán (BOM)
                <span className="text-[10px] font-mono uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 px-2 py-0.5 rounded-full">
                  HiStruct Štandard
                </span>
              </h2>
              <p className="text-xs text-white/50">
                {hallName} · {w} × {l} × {h} m · Rámový modul: {(l / bays).toFixed(2)} m ({bays} polí)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white text-xs font-mono flex items-center gap-1.5 transition cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              Tlač / PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Top Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
              <span className="text-[11px] text-white/50 block font-mono">Odhadovaná oceľ</span>
              <span className="text-xl font-bold font-mono text-cyan-400">{totalSteelWeightKg.toLocaleString()} kg</span>
              <span className="text-[10px] text-white/40 block mt-0.5">S355JR / S280GD</span>
            </div>
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
              <span className="text-[11px] text-white/50 block font-mono">Plocha stien</span>
              <span className="text-xl font-bold font-mono text-white">{wallAreaM2} m²</span>
              <span className="text-[10px] text-white/40 block mt-0.5">{wallPanelsCount} ks panelov (1m)</span>
            </div>
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
              <span className="text-[11px] text-white/50 block font-mono">Plocha strechy</span>
              <span className="text-xl font-bold font-mono text-white">{roofAreaM2} m²</span>
              <span className="text-[10px] text-white/40 block mt-0.5">{roofPanelsCount} ks panelov</span>
            </div>
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
              <span className="text-[11px] text-white/50 block font-mono">Nosné rámy</span>
              <span className="text-xl font-bold font-mono text-white">{framesCount} ks</span>
              <span className="text-[10px] text-white/40 block mt-0.5">{bays} modulových polí</span>
            </div>
          </div>

          {/* Section 1: Oceľová konštrukcia */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
              <Box className="h-4 w-4" />
              1. Prvky primárnej a sekundárnej oceľovej konštrukcie
            </h3>
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-white/5 text-white/60 border-b border-white/10 uppercase text-[10px]">
                  <tr>
                    <th className="p-2.5">Pozícia</th>
                    <th className="p-2.5">Profil</th>
                    <th className="p-2.5">Počet</th>
                    <th className="p-2.5">Dĺžka / ks</th>
                    <th className="p-2.5">Celková dĺžka</th>
                    <th className="p-2.5 text-right">Celk. hmotnosť</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-white/80">
                  <tr>
                    <td className="p-2.5 font-bold text-white">Nosné stĺpy (hlavné)</td>
                    <td className="p-2.5 text-cyan-300">{params.structureType === "c_profiles" ? "C 200" : "IPE 160"}</td>
                    <td className="p-2.5">{framesCount * 2} ks</td>
                    <td className="p-2.5">{h.toFixed(2)} m</td>
                    <td className="p-2.5">{(framesCount * 2 * h).toFixed(1)} m</td>
                    <td className="p-2.5 text-right font-bold">{Math.round(framesCount * 2 * h * colKgPerM)} kg</td>
                  </tr>
                  {hasCenterCols && (
                    <tr>
                      <td className="p-2.5 font-bold text-white">Stredové podperné stĺpy</td>
                      <td className="p-2.5 text-cyan-300">SHS 120×120</td>
                      <td className="p-2.5">{framesCount} ks</td>
                      <td className="p-2.5">{(params.hallHeight ?? h).toFixed(2)} m</td>
                      <td className="p-2.5">{(framesCount * (params.hallHeight ?? h)).toFixed(1)} m</td>
                      <td className="p-2.5 text-right font-bold">{Math.round(framesCount * (params.hallHeight ?? h) * 16.5)} kg</td>
                    </tr>
                  )}
                  <tr>
                    <td className="p-2.5 font-bold text-white">Strešné priečle / väzníky</td>
                    <td className="p-2.5 text-cyan-300">{params.structureType === "c_profiles" ? "C 200" : "IPE 160"}</td>
                    <td className="p-2.5">{raftersCount} ks</td>
                    <td className="p-2.5">{slopeLen.toFixed(2)} m</td>
                    <td className="p-2.5">{(raftersCount * slopeLen).toFixed(1)} m</td>
                    <td className="p-2.5 text-right font-bold">{Math.round(rafterWeight)} kg</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold text-white">Strešné väznice (Z-profily)</td>
                    <td className="p-2.5 text-cyan-300">Z 200 / 1.5mm</td>
                    <td className="p-2.5">{purlinTotalCount} ks</td>
                    <td className="p-2.5">{(l / bays).toFixed(2)} m</td>
                    <td className="p-2.5">{purlinsTotalLength.toFixed(1)} m</td>
                    <td className="p-2.5 text-right font-bold">{Math.round(purlinWeight)} kg</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold text-white">Stenové a strešné stužidlá</td>
                    <td className="p-2.5 text-cyan-300">Ťahadlá M16 / L 50</td>
                    <td className="p-2.5">{bays * 4} ks</td>
                    <td className="p-2.5">~5.5 m</td>
                    <td className="p-2.5">~{(bays * 4 * 5.5).toFixed(0)} m</td>
                    <td className="p-2.5 text-right font-bold">{bracingWeight} kg</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Kladačský plán opláštenia */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
              <Ruler className="h-4 w-4" />
              2. Kladačský rozpis sendvičových / trapézových panelov (šírka 1000 mm)
            </h3>
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-white/5 text-white/60 border-b border-white/10 uppercase text-[10px]">
                  <tr>
                    <th className="p-2.5">Plocha</th>
                    <th className="p-2.5">Typ panelu</th>
                    <th className="p-2.5">Počet kusov</th>
                    <th className="p-2.5">Dĺžka rezu</th>
                    <th className="p-2.5">Plocha brutto</th>
                    <th className="p-2.5 text-right">Poznámka</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-white/80">
                  <tr>
                    <td className="p-2.5 font-bold text-white">Bočná ľavá stena</td>
                    <td className="p-2.5 text-cyan-300">PIR / Trapéz (vertikálne)</td>
                    <td className="p-2.5">{Math.ceil(l / 1.0)} ks</td>
                    <td className="p-2.5">{h.toFixed(2)} m</td>
                    <td className="p-2.5">{(Math.ceil(l / 1.0) * h).toFixed(1)} m²</td>
                    <td className="p-2.5 text-right text-white/50">{params.personalDoorSide === "left" ? "Výrez na dvere" : "Plná"}</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold text-white">Bočná pravá stena</td>
                    <td className="p-2.5 text-cyan-300">PIR / Trapéz (vertikálne)</td>
                    <td className="p-2.5">{Math.ceil(l / 1.0)} ks</td>
                    <td className="p-2.5">{h.toFixed(2)} m</td>
                    <td className="p-2.5">{(Math.ceil(l / 1.0) * h).toFixed(1)} m²</td>
                    <td className="p-2.5 text-right text-white/50">{params.personalDoorSide === "right" ? "Výrez na dvere" : "Plná"}</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold text-white">Predný & zadný štít</td>
                    <td className="p-2.5 text-cyan-300">PIR / Trapéz (vertikálne)</td>
                    <td className="p-2.5">{Math.ceil(w / 1.0) * 2} ks</td>
                    <td className="p-2.5">{h.toFixed(2)} - {(params.hallHeight ?? h).toFixed(2)} m</td>
                    <td className="p-2.5">{(w * (h + (params.hallHeight ?? h)) / 2 * 2).toFixed(1)} m²</td>
                    <td className="p-2.5 text-right text-white/50">Garážové vráta / vetranie</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold text-white">Strešné roviny (2x spád)</td>
                    <td className="p-2.5 text-cyan-300">PIR Strešný 5-vlna</td>
                    <td className="p-2.5">{roofPanelsCount} ks</td>
                    <td className="p-2.5">{(slopeLen + 0.15).toFixed(2)} m</td>
                    <td className="p-2.5">{roofAreaM2} m²</td>
                    <td className="p-2.5 text-right text-white/50">Presah odkvapu 150mm</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Otvory, Klampiarske prvky a doplnky */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-2">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Výplne otvorov</h4>
              <ul className="text-xs space-y-1.5 text-white/70 font-mono">
                <li className="flex justify-between">
                  <span>Priemyselné vráta:</span>
                  <span className="text-cyan-300 font-bold">1 ks ({params.doorWidth ?? 4.8} × {params.doorHeight ?? 3.85} m)</span>
                </li>
                <li className="flex justify-between">
                  <span>Vstupné dvere:</span>
                  <span className="text-cyan-300 font-bold">{doorCount} ks (0.9 × 2.0 m, {params.personalDoorSide ?? "ľavá"})</span>
                </li>
                <li className="flex justify-between">
                  <span>Okenné moduly:</span>
                  <span className="text-cyan-300 font-bold">{windowCount} ks</span>
                </li>
                <li className="flex justify-between">
                  <span>Hrebeňový svetlík:</span>
                  <span className="text-cyan-300 font-bold">{params.hasRidgeSkylight ? "Áno (stredový oblúk)" : "Nie"}</span>
                </li>
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-2">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Klampiarske lemovanie</h4>
              <ul className="text-xs space-y-1.5 text-white/70 font-mono">
                <li className="flex justify-between">
                  <span>Hrebenáč:</span>
                  <span className="text-white font-bold">{l} bm</span>
                </li>
                <li className="flex justify-between">
                  <span>Odkvapové lemovanie:</span>
                  <span className="text-white font-bold">{(2 * l).toFixed(0)} bm</span>
                </li>
                <li className="flex justify-between">
                  <span>Štítové záveterné lišty:</span>
                  <span className="text-white font-bold">{(4 * slopeLen).toFixed(1)} bm</span>
                </li>
                <li className="flex justify-between">
                  <span>Rohové krycie lišty:</span>
                  <span className="text-white font-bold">{(4 * h).toFixed(1)} bm</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-white/10 bg-white/[0.02] text-xs font-mono text-white/40">
          <span>Generované systémom VBAU HiStruct Configurator</span>
          <span>Súlad s normami STN EN 1090-2 & Eurocode 3</span>
        </div>
      </div>
    </div>
  );
}
