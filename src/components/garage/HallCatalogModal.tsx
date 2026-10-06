import React from "react";
import { X, ExternalLink } from "lucide-react";
import type { HallConfig } from "@/lib/garage/configHelper";
import type { GarageParams } from "@/lib/garage/types";

interface HallCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedHall: string;
  hallsConfig: Record<string, HallConfig>;
  typedParams: GarageParams;
  onApplyVersion: (params: Record<string, any>) => void;
}

export function HallCatalogModal({
  isOpen,
  onClose,
  selectedHall,
  hallsConfig,
  typedParams,
  onApplyVersion,
}: HallCatalogModalProps) {
  if (!isOpen || selectedHall === "Vlastný" || !hallsConfig[selectedHall]) {
    return null;
  }

  const curHall = hallsConfig[selectedHall];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-3 md:p-6 backdrop-blur-md">
      <div className="relative max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-xl border border-white/20 bg-[#0e1116] p-4 md:p-6 shadow-2xl font-mono text-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
          <div>
            <h3 className="text-base font-bold text-emerald-400">
              Katalógová predloha GTG 2025: {selectedHall}
              {curHall.subtitle ? ` — ${curHall.subtitle}` : ""}
            </h3>
            <p className="text-xs text-white/50">
              Typ: {curHall.type === "gable" ? "Sedlová hala" : "Pultová hala"} ·
              Norma EN 1090 EXC2 · Zinkovanie PN-EN ISO 1461
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full bg-white/10 p-1.5 hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
            title="Zavrieť"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Gallery of catalog images */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="rounded-lg border border-white/10 bg-black/40 p-2.5 overflow-hidden flex flex-col">
            <div className="text-[11px] font-bold text-emerald-300 mb-1.5 flex items-center justify-between">
              <span>1. Vizualizácia z katalógu</span>
              <span className="text-[9px] text-white/40">3D RENDER (HD)</span>
            </div>
            <a
              href={`/catalog/${selectedHall}_render.png`}
              target="_blank"
              rel="noopener noreferrer"
              title="Kliknite pre zväčšenie"
              className="overflow-hidden rounded border border-white/5 bg-black/60 flex items-center justify-center min-h-[170px] cursor-zoom-in hover:opacity-95 transition"
            >
              <img
                src={`/catalog/${selectedHall}_render.png`}
                alt={`Katalógový render ${selectedHall}`}
                className="max-h-[220px] w-auto object-contain hover:scale-105 transition-transform duration-200"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = "none";
                  const fallback = e.currentTarget.parentElement?.querySelector(".fallback-note");
                  if (fallback) (fallback as HTMLElement).style.display = "block";
                }}
              />
              <div className="fallback-note hidden text-[10px] text-white/40 p-4 text-center">
                Súbor /catalog/{selectedHall}_render.png nie je k dispozícii
              </div>
            </a>
          </div>

          <div className="rounded-lg border border-white/10 bg-black/40 p-2.5 overflow-hidden flex flex-col">
            <div className="text-[11px] font-bold text-emerald-300 mb-1.5 flex items-center justify-between">
              <span>2. Technický nákres a rozmery</span>
              <span className="text-[9px] text-white/40">VÝKRES / SCHÉMA</span>
            </div>
            <a
              href={`/catalog/${selectedHall}_drawing.png`}
              target="_blank"
              rel="noopener noreferrer"
              title="Kliknite pre zväčšenie"
              className="overflow-hidden rounded border border-white/5 bg-black/60 flex items-center justify-center min-h-[170px] cursor-zoom-in hover:opacity-95 transition"
            >
              <img
                src={`/catalog/${selectedHall}_drawing.png`}
                alt={`Technický výkres ${selectedHall}`}
                className="max-h-[220px] w-auto object-contain hover:scale-105 transition-transform duration-200"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = "none";
                  const fallback = e.currentTarget.parentElement?.querySelector(".fallback-note");
                  if (fallback) (fallback as HTMLElement).style.display = "block";
                }}
              />
              <div className="fallback-note hidden text-[10px] text-white/40 p-4 text-center">
                Súbor /catalog/{selectedHall}_drawing.png nie je k dispozícii
              </div>
            </a>
          </div>
        </div>

        {/* Technical Data Table */}
        <div className="rounded-lg border border-white/10 bg-black/40 p-4 mb-4 text-xs">
          <div className="font-bold text-emerald-300 mb-2 border-b border-white/10 pb-1 flex items-center justify-between">
            <span>Katalógové parametre výrobcu:</span>
            <span className="text-[10px] text-white/50">EN 1090-2 (Trieda EXC2)</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-white/80">
            <div className="flex items-center justify-between sm:justify-start sm:gap-2 bg-black/30 sm:bg-transparent px-2 py-1 sm:p-0 rounded">
              <span className="text-white/60">Šírka A:</span>
              <span className="font-bold text-white">{curHall.width} m</span>
            </div>
            <div className="flex items-center justify-between sm:justify-start sm:gap-2 bg-black/30 sm:bg-transparent px-2 py-1 sm:p-0 rounded">
              <span className="text-white/60">Modul C:</span>
              <span className="font-bold text-white">{curHall.moduleLength} m</span>
            </div>
            <div className="flex items-center justify-between sm:justify-start sm:gap-2 bg-black/30 sm:bg-transparent px-2 py-1 sm:p-0 rounded">
              <span className="text-white/60">Min. dĺžka B:</span>
              <span className="font-bold text-white">{curHall.minLength} m</span>
            </div>
            <div className="flex items-center justify-between sm:justify-start sm:gap-2 bg-black/30 sm:bg-transparent px-2 py-1 sm:p-0 rounded">
              <span className="text-white/60">Rámy (nosníky):</span>
              <span className="font-bold text-emerald-300">{curHall.framework || "IPE 180"}</span>
            </div>
            <div className="flex items-center justify-between sm:justify-start sm:gap-2 bg-black/30 sm:bg-transparent px-2 py-1 sm:p-0 rounded">
              <span className="text-white/60">Štítové stĺpy:</span>
              <span className="font-bold text-emerald-300">{curHall.gablePillars || "RK 100x100"}</span>
            </div>
            <div className="flex items-center justify-between sm:justify-start sm:gap-2 bg-black/30 sm:bg-transparent px-2 py-1 sm:p-0 rounded">
              <span className="text-white/60">Oceľ:</span>
              <span className="font-bold text-white">{curHall.steelGrade || "S355"}</span>
            </div>
            <div className="flex items-center justify-between sm:justify-start sm:gap-2 bg-black/30 sm:bg-transparent px-2 py-1 sm:p-0 rounded">
              <span className="text-white/60">Sklon:</span>
              <span className="font-bold text-white">{curHall.roofPitchDeg}°</span>
            </div>
            <div className="flex items-center justify-between sm:justify-start sm:gap-2 bg-black/30 sm:bg-transparent px-2 py-1 sm:p-0 rounded">
              <span className="text-white/60">Zavetrovanie:</span>
              <span className="font-bold text-white">{curHall.bracing || "ø10.7"}</span>
            </div>
            <div className="flex items-center justify-between sm:justify-start sm:gap-2 bg-black/30 sm:bg-transparent px-2 py-1 sm:p-0 rounded">
              <span className="text-white/60">Ťahadlá:</span>
              <span className="font-bold text-white">{curHall.tieRods || "ø16"}</span>
            </div>
            <div className="flex items-center justify-between sm:justify-start sm:gap-2 bg-black/30 sm:bg-transparent px-2 py-1 sm:p-0 rounded">
              <span className="text-white/60">Zóny:</span>
              <span className="font-bold text-white">
                Sneh {curHall.snowZone} / Vietor {curHall.windZone}
              </span>
            </div>
          </div>

          {curHall.versions && curHall.versions.length > 0 && (
            <div className="mt-3 pt-3 border-t border-white/10">
              <div className="font-semibold text-white/60 mb-2">Dostupné výškové verzie:</div>
              <div className="flex flex-wrap gap-2">
                {curHall.versions.map((ver) => {
                  const isCur = Math.abs(ver.H - (typedParams.clearHeight ?? 0)) < 0.05;
                  return (
                    <button
                      key={ver.label}
                      onClick={() => {
                        const isShed = curHall.type === "shed";
                        const gateW = isShed ? Math.min(3.0, curHall.width * 0.5) : (ver.E ?? 4.8);
                        const gateH = isShed
                          ? (ver.H4 ? Math.min(ver.H4 - 0.15, 3.2) : 2.5)
                          : (ver.H2 ? Math.min(ver.H2 - 0.15, 4.8) : Math.min(3.8, ver.H - 0.2));
                        const bays = curHall.defaultBays ?? (curHall.name === "KD8" ? 5 : 4);
                        const len = curHall.defaultLength ?? (bays * curHall.moduleLength);
                        onApplyVersion({
                          showStructure: true,
                          showCladding: false,
                          showAccessories: false,
                          clearHeight: ver.H,
                          hallHeight: `${ver.poleHeight}m`,
                          doorWidth: gateW,
                          doorHeight: gateH,
                          bayCount: bays,
                          length: len,
                        });
                      }}
                      className={`rounded px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                        isCur
                          ? "bg-emerald-400 text-slate-900 shadow-md ring-2 ring-emerald-300"
                          : "bg-white/10 text-white hover:bg-white/20 border border-white/10"
                      }`}
                    >
                      ✓ Nastaviť 1:1: {ver.label} (H={ver.H}m, H1={ver.H1}m, H2={ver.H2}m)
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Close Button */}
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="rounded bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-900 hover:bg-emerald-400 transition-colors cursor-pointer"
          >
            Hotovo, pokračovať v konfigurácii
          </button>
        </div>
      </div>
    </div>
  );
}
