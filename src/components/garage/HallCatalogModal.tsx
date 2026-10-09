import React from "react";
import { X } from "lucide-react";
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
  const curVer =
    curHall.versions?.find((v) => Math.abs(v.H - (typedParams.clearHeight ?? 0)) < 0.05) ||
    curHall.versions?.[0];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-3 md:p-6 backdrop-blur-md">
      <div className="relative max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-xl border border-white/20 bg-[#0e1116] p-4 md:p-6 shadow-2xl font-mono text-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
          <div>
            <h3 className="text-base md:text-lg font-bold text-cyan-400">
              Typový model: {selectedHall}
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

        {/* Parametric CAD 2D Blueprint Schematic (No supplier catalog photos) */}
        <div className="rounded-lg border border-white/10 bg-[#070a0f] p-3 md:p-4 mb-4 overflow-hidden">
          <div className="flex items-center justify-between mb-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-cyan-400">PARAMETRICKÝ SCHEMATICKÝ REZ RÁMU</span>
              <span className="text-[10px] bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 px-2 py-0.5 rounded">
                Kóty 1:1
              </span>
            </div>
            <span className="text-white/40 text-[10px] hidden sm:inline">
              Rámy: {curHall.framework || "IPE 160"} · Stĺpy: {curHall.gablePillars || "RK 120x120"}
            </span>
          </div>

          <div className="w-full bg-[#05070a] rounded-lg border border-white/5 p-2 flex items-center justify-center">
            <svg
              viewBox="0 0 760 250"
              className="w-full h-auto max-h-[260px] text-xs font-mono select-none"
            >
              <defs>
                <pattern id="cadGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                </pattern>
                <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="rgba(34,211,238,0.8)" />
                </marker>
                <marker id="arrowEmerald" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="rgba(52,211,153,0.8)" />
                </marker>
              </defs>

              <rect width="760" height="250" fill="url(#cadGrid)" />

              {/* Ground level */}
              <line x1="80" y1="200" x2="680" y2="200" stroke="#334155" strokeWidth="2" strokeDasharray="6 3" />
              <text x="90" y="214" fill="#64748b" fontSize="10">ÚROVEŇ TERÉNU ±0.000</text>

              {curHall.type === "gable" ? (
                <>
                  {/* Foundation pads */}
                  <rect x="142" y="200" width="36" height="8" fill="#1e293b" stroke="#475569" strokeWidth="1" />
                  <rect x="582" y="200" width="36" height="8" fill="#1e293b" stroke="#475569" strokeWidth="1" />

                  {/* Columns */}
                  <line x1="160" y1="200" x2="160" y2="85" stroke="#38bdf8" strokeWidth="5" strokeLinecap="round" />
                  <line x1="600" y1="200" x2="600" y2="85" stroke="#38bdf8" strokeWidth="5" strokeLinecap="round" />

                  {/* Rafters */}
                  <line x1="160" y1="85" x2="380" y2="40" stroke="#38bdf8" strokeWidth="5" strokeLinecap="round" />
                  <line x1="600" y1="85" x2="380" y2="40" stroke="#38bdf8" strokeWidth="5" strokeLinecap="round" />

                  {/* Clear height line H2 */}
                  <line x1="160" y1="100" x2="600" y2="100" stroke="#06b6d4" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.6" />
                  <text x="380" y="114" fill="#22d3ee" fontSize="10" textAnchor="middle" fontWeight="bold">
                    Svetlá výška H2 = {curVer?.H2 ? `${curVer.H2} m` : "-"}
                  </text>

                  {/* Width Dimension A */}
                  <line x1="160" y1="230" x2="600" y2="230" stroke="#22d3ee" strokeWidth="1.5" markerStart="url(#arrow)" markerEnd="url(#arrow)" />
                  <line x1="160" y1="202" x2="160" y2="236" stroke="#22d3ee" strokeWidth="1" opacity="0.5" />
                  <line x1="600" y1="202" x2="600" y2="236" stroke="#22d3ee" strokeWidth="1" opacity="0.5" />
                  <text x="380" y="225" fill="#22d3ee" fontSize="11" textAnchor="middle" fontWeight="bold">
                    Šírka A = {curHall.width} m
                  </text>

                  {/* Column Height Dimension H */}
                  <line x1="120" y1="200" x2="120" y2="85" stroke="#34d399" strokeWidth="1.5" markerStart="url(#arrowEmerald)" markerEnd="url(#arrowEmerald)" />
                  <line x1="114" y1="200" x2="158" y2="200" stroke="#34d399" strokeWidth="1" opacity="0.5" />
                  <line x1="114" y1="85" x2="158" y2="85" stroke="#34d399" strokeWidth="1" opacity="0.5" />
                  <text x="110" y="148" fill="#34d399" fontSize="11" textAnchor="end" fontWeight="bold">
                    H = {curVer?.H ?? curHall.heights[0]} m
                  </text>

                  {/* Ridge Height Dimension H1 */}
                  <line x1="640" y1="200" x2="640" y2="40" stroke="#f59e0b" strokeWidth="1.5" markerStart="url(#arrow)" markerEnd="url(#arrow)" />
                  <line x1="380" y1="40" x2="648" y2="40" stroke="#f59e0b" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
                  <line x1="600" y1="200" x2="648" y2="200" stroke="#f59e0b" strokeWidth="1" opacity="0.5" />
                  <text x="650" y="125" fill="#fbbf24" fontSize="11" textAnchor="start" fontWeight="bold">
                    H1 = {curVer?.H1 ? `${curVer.H1} m` : "-"} (hrebeň)
                  </text>

                  {/* Roof pitch indicator */}
                  <path d="M 220 73 A 40 40 0 0 0 250 67" fill="none" stroke="#94a3b8" strokeWidth="1" />
                  <text x="245" y="60" fill="#cbd5e1" fontSize="10">
                    Sklon {curHall.roofPitchDeg}°
                  </text>
                </>
              ) : (
                <>
                  <rect x="142" y="200" width="36" height="8" fill="#1e293b" stroke="#475569" strokeWidth="1" />
                  <rect x="582" y="200" width="36" height="8" fill="#1e293b" stroke="#475569" strokeWidth="1" />

                  {/* High Column Left */}
                  <line x1="160" y1="200" x2="160" y2="60" stroke="#38bdf8" strokeWidth="5" strokeLinecap="round" />
                  {/* Low Column Right */}
                  <line x1="600" y1="200" x2="600" y2="115" stroke="#38bdf8" strokeWidth="5" strokeLinecap="round" />
                  {/* Monopitch Rafter */}
                  <line x1="160" y1="60" x2="600" y2="115" stroke="#38bdf8" strokeWidth="5" strokeLinecap="round" />

                  {/* Width A */}
                  <line x1="160" y1="230" x2="600" y2="230" stroke="#22d3ee" strokeWidth="1.5" markerStart="url(#arrow)" markerEnd="url(#arrow)" />
                  <text x="380" y="225" fill="#22d3ee" fontSize="11" textAnchor="middle" fontWeight="bold">
                    Šírka A = {curHall.width} m
                  </text>

                  {/* High Side Dimension */}
                  <line x1="120" y1="200" x2="120" y2="60" stroke="#f59e0b" strokeWidth="1.5" markerStart="url(#arrow)" markerEnd="url(#arrow)" />
                  <text x="110" y="135" fill="#fbbf24" fontSize="11" textAnchor="end" fontWeight="bold">
                    H1 = {curVer?.H1 ?? "-"} m
                  </text>

                  {/* Low Side Dimension */}
                  <line x1="640" y1="200" x2="640" y2="115" stroke="#34d399" strokeWidth="1.5" markerStart="url(#arrowEmerald)" markerEnd="url(#arrowEmerald)" />
                  <text x="650" y="162" fill="#34d399" fontSize="11" textAnchor="start" fontWeight="bold">
                    H = {curVer?.H ?? curHall.heights[0]} m
                  </text>
                </>
              )}
            </svg>
          </div>
        </div>

        {/* Technical Data Table */}
        <div className="rounded-lg border border-white/10 bg-black/40 p-4 mb-4 text-xs">
          <div className="font-bold text-emerald-300 mb-2 border-b border-white/10 pb-1 flex items-center justify-between">
            <span>Technické parametre konštrukcie:</span>
            <span className="text-[10px] text-white/50">Norma EN 1090-2 (Trieda EXC2)</span>
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
                        const bays = curHall.defaultBays ?? 4;
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
                          ? "bg-cyan-400 text-slate-950 shadow-md ring-2 ring-cyan-300"
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

        {/* Action Button */}
        <div className="flex items-center justify-end border-t border-white/10 pt-3">
          <button
            onClick={onClose}
            className="rounded bg-cyan-400 px-5 py-2.5 text-xs font-bold text-slate-950 hover:bg-cyan-300 transition-colors cursor-pointer shadow-lg shadow-cyan-400/20"
          >
            Hotovo, pokračovať v konfigurácii
          </button>
        </div>
      </div>
    </div>
  );
}
