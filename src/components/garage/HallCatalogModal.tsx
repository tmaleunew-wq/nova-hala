import React, { useState } from "react";
import { X, ExternalLink, Image as ImageIcon, Ruler, FileText, LayoutGrid, Download } from "lucide-react";
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
  const [activeTab, setActiveTab] = useState<"all" | "render" | "cad" | "spec">("all");

  if (!isOpen || selectedHall === "Vlastný" || !hallsConfig[selectedHall]) {
    return null;
  }

  const curHall = hallsConfig[selectedHall];

  const archRenderUrl = `/catalog/${selectedHall}_arch_render.png`;
  const cadDiagramUrl = `/catalog/${selectedHall}_cad_diagram.png`;
  const pageSpecUrl = `/catalog/${selectedHall}_page_spec.png`;
  const fallbackRenderUrl = `/catalog/${selectedHall}_render.png`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-3 md:p-6 backdrop-blur-md">
      <div className="relative max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-xl border border-white/20 bg-[#0e1116] p-4 md:p-6 shadow-2xl font-mono text-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
          <div>
            <h3 className="text-base md:text-lg font-bold text-emerald-400">
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

        {/* View Mode Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 mb-4 border-b border-white/10 pb-2">
          <button
            onClick={() => setActiveTab("all")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer ${
              activeTab === "all"
                ? "bg-emerald-500 text-black shadow"
                : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span>Prehľad (Všetko)</span>
          </button>
          <button
            onClick={() => setActiveTab("render")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer ${
              activeTab === "render"
                ? "bg-emerald-500 text-black shadow"
                : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            <ImageIcon className="h-3.5 w-3.5" />
            <span>3D Fotovizualizácia (HD)</span>
          </button>
          <button
            onClick={() => setActiveTab("cad")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer ${
              activeTab === "cad"
                ? "bg-emerald-500 text-black shadow"
                : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Ruler className="h-3.5 w-3.5" />
            <span>Technický CAD výkres</span>
          </button>
          <button
            onClick={() => setActiveTab("spec")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer ${
              activeTab === "spec"
                ? "bg-emerald-500 text-black shadow"
                : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Oficiálny Technický List</span>
          </button>
        </div>

        {/* Gallery / Detail View based on tab */}
        {activeTab === "all" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* 1. Arch Render Card */}
            <div className="rounded-lg border border-white/10 bg-black/40 p-2.5 overflow-hidden flex flex-col">
              <div className="text-[11px] font-bold text-emerald-300 mb-1.5 flex items-center justify-between">
                <span>1. 3D Fotovizualizácia</span>
                <span className="text-[9px] text-white/40">HD RENDER</span>
              </div>
              <div
                onClick={() => setActiveTab("render")}
                className="overflow-hidden rounded border border-white/5 bg-black/60 flex items-center justify-center min-h-[170px] cursor-pointer hover:border-emerald-400/50 transition group relative"
              >
                <img
                  src={archRenderUrl}
                  alt={`Architektonická vizualizácia ${selectedHall}`}
                  className="max-h-[200px] w-auto object-contain group-hover:scale-105 transition-transform duration-200"
                  onError={(e) => {
                    // Fallback to basic render if arch render not found
                    const target = e.currentTarget;
                    if (target.src.indexOf("_arch_render.png") !== -1) {
                      target.src = fallbackRenderUrl;
                    } else {
                      target.style.display = "none";
                    }
                  }}
                />
                <span className="absolute bottom-1 right-1 bg-black/70 px-1.5 py-0.5 rounded text-[9px] text-emerald-300 opacity-0 group-hover:opacity-100 transition-opacity">
                  Zväčšiť 🔍
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[10px] text-white/50">
                <span>Realistická architektúra</span>
                <a
                  href={archRenderUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-400 hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  <span>Plné rozlíšenie</span>
                </a>
              </div>
            </div>

            {/* 2. CAD Drawing Card */}
            <div className="rounded-lg border border-white/10 bg-black/40 p-2.5 overflow-hidden flex flex-col">
              <div className="text-[11px] font-bold text-emerald-300 mb-1.5 flex items-center justify-between">
                <span>2. Technický CAD výkres</span>
                <span className="text-[9px] text-white/40">KÓTY & RÁM</span>
              </div>
              <div
                onClick={() => setActiveTab("cad")}
                className="overflow-hidden rounded border border-white/5 bg-black/60 flex items-center justify-center min-h-[170px] cursor-pointer hover:border-emerald-400/50 transition group relative"
              >
                <img
                  src={cadDiagramUrl}
                  alt={`CAD výkres ${selectedHall}`}
                  className="max-h-[200px] w-auto object-contain group-hover:scale-105 transition-transform duration-200"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = "none";
                  }}
                />
                <span className="absolute bottom-1 right-1 bg-black/70 px-1.5 py-0.5 rounded text-[9px] text-emerald-300 opacity-0 group-hover:opacity-100 transition-opacity">
                  Zväčšiť 🔍
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[10px] text-white/50">
                <span>H, H1, H2, D, E schémy</span>
                <a
                  href={cadDiagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-400 hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  <span>Plné rozlíšenie</span>
                </a>
              </div>
            </div>

            {/* 3. Tech Sheet Card */}
            <div className="rounded-lg border border-white/10 bg-black/40 p-2.5 overflow-hidden flex flex-col">
              <div className="text-[11px] font-bold text-emerald-300 mb-1.5 flex items-center justify-between">
                <span>3. Technický List</span>
                <span className="text-[9px] text-white/40">EN 1090 SPEC</span>
              </div>
              <div
                onClick={() => setActiveTab("spec")}
                className="overflow-hidden rounded border border-white/5 bg-black/60 flex items-center justify-center min-h-[170px] cursor-pointer hover:border-emerald-400/50 transition group relative"
              >
                <img
                  src={pageSpecUrl}
                  alt={`Technický list ${selectedHall}`}
                  className="max-h-[200px] w-auto object-contain group-hover:scale-105 transition-transform duration-200"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = "none";
                  }}
                />
                <span className="absolute bottom-1 right-1 bg-black/70 px-1.5 py-0.5 rounded text-[9px] text-emerald-300 opacity-0 group-hover:opacity-100 transition-opacity">
                  Zväčšiť 🔍
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[10px] text-white/50">
                <span>Kompletná špecifikácia</span>
                <a
                  href={pageSpecUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-400 hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  <span>Plné rozlíšenie</span>
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Detailed Single View for Render */}
        {activeTab === "render" && (
          <div className="rounded-lg border border-white/10 bg-black/40 p-3 mb-4 overflow-hidden">
            <div className="flex items-center justify-between mb-2 pb-1 border-b border-white/10 text-xs">
              <span className="font-bold text-emerald-400">Fotorealistická 3D vizualizácia haly {selectedHall}</span>
              <a
                href={archRenderUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-emerald-300 hover:underline font-bold text-xs"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Otvoriť v plnej veľkosti (HD)</span>
              </a>
            </div>
            <div className="flex justify-center bg-black/60 rounded p-2">
              <img
                src={archRenderUrl}
                alt={`3D Architektonický render ${selectedHall}`}
                className="max-h-[500px] w-auto object-contain rounded"
                onError={(e) => {
                  e.currentTarget.src = fallbackRenderUrl;
                }}
              />
            </div>
          </div>
        )}

        {/* Detailed Single View for CAD Drawing */}
        {activeTab === "cad" && (
          <div className="rounded-lg border border-white/10 bg-black/40 p-3 mb-4 overflow-hidden">
            <div className="flex items-center justify-between mb-2 pb-1 border-b border-white/10 text-xs">
              <span className="font-bold text-emerald-400">Technický CAD nákres, výkres a kóty rámu {selectedHall}</span>
              <a
                href={cadDiagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-emerald-300 hover:underline font-bold text-xs"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Otvoriť výkres v plnej veľkosti</span>
              </a>
            </div>
            <div className="flex justify-center bg-black/60 rounded p-2">
              <img
                src={cadDiagramUrl}
                alt={`CAD Diagram ${selectedHall}`}
                className="max-h-[500px] w-auto object-contain rounded"
              />
            </div>
          </div>
        )}

        {/* Detailed Single View for Technical Specification Sheet */}
        {activeTab === "spec" && (
          <div className="rounded-lg border border-white/10 bg-black/40 p-3 mb-4 overflow-hidden">
            <div className="flex items-center justify-between mb-2 pb-1 border-b border-white/10 text-xs">
              <span className="font-bold text-emerald-400">Oficiálny Technický List výrobcu GTG (Norma EN 1090-2) — {selectedHall}</span>
              <a
                href={pageSpecUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-emerald-300 hover:underline font-bold text-xs"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Otvoriť kompletný technický list</span>
              </a>
            </div>
            <div className="flex justify-center bg-black/60 rounded p-2">
              <img
                src={pageSpecUrl}
                alt={`Technický list ${selectedHall}`}
                className="max-h-[550px] w-auto object-contain rounded"
              />
            </div>
          </div>
        )}

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

        {/* Close Button & Direct Links */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3">
          <div className="flex items-center gap-2">
            <a
              href={pageSpecUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/20 transition"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Stiahnuť / Zobraziť Technický list</span>
            </a>
            <a
              href={cadDiagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10 transition"
            >
              <Ruler className="h-3.5 w-3.5" />
              <span>CAD Nákres</span>
            </a>
          </div>
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
