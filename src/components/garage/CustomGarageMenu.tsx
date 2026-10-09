import React, { useState } from "react";
import { Leva } from "leva";
import type { GarageParams } from "@/lib/garage/types";
import {
  Ruler,
  Home,
  DoorClosed,
  Palette,
  PlusSquare,
  Eye,
  FileText,
  Check,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export interface CustomGarageMenuProps {
  showControls: boolean;
  typedParams: GarageParams;
  setParams: (params: Partial<GarageParams>) => void;
  selectedHall: string;
  notes: string;
  setNotes: (notes: string) => void;
  isSummaryOpen: boolean;
  setIsSummaryOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setQuoteRequestSignal: React.Dispatch<React.SetStateAction<number>>;
}

type TabType = "dimensions" | "roof" | "doors" | "colors" | "extension" | "view" | "summary";

const RAL_PALETTE = [
  { name: "RAL 7016 Antracit", hex: "#2b2f36" },
  { name: "RAL 9010 Biela", hex: "#f4f5f7" },
  { name: "RAL 9006 Strieborná", hex: "#9aa1ab" },
  { name: "RAL 8017 Hnedá", hex: "#4a3728" },
  { name: "RAL 3009 Tehlová", hex: "#6e2626" },
  { name: "RAL 6005 Zelená", hex: "#284a37" },
  { name: "RAL 9005 Čierna", hex: "#18181b" },
];

export function CustomGarageMenu({
  showControls,
  typedParams,
  setParams,
  selectedHall,
  notes,
  setNotes,
  isSummaryOpen,
  setIsSummaryOpen,
  setQuoteRequestSignal,
}: CustomGarageMenuProps) {
  const [activeTab, setActiveTab] = useState<TabType>("dimensions");

  const area = (typedParams.width * typedParams.length).toFixed(1);
  const currentGarageType: "single" | "double" | "wide" =
    typedParams.gateCount === 2
      ? "double"
      : (typedParams.doorWidth ?? 2.5) >= 3.8
      ? "wide"
      : "single";

  return (
    <>
      <Leva hidden />
      <div
        className={`quote-export-panel absolute right-3 top-[132px] md:top-28 z-30 max-h-[calc(100vh-140px)] md:max-h-[80vh] flex flex-col rounded-2xl bg-[#0c1017]/95 shadow-2xl border border-emerald-500/40 backdrop-blur-md transition-all duration-300 ${
        showControls
          ? "opacity-100 translate-x-0 pointer-events-auto"
          : "opacity-0 translate-x-12 pointer-events-none"
      } md:w-[415px] w-[calc(100vw-24px)] max-w-[440px]`}
    >
      {/* 1. STICKY HEADER */}
      <div className="shrink-0 px-4 py-3 border-b border-white/10 bg-[#111723] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <div>
            <div className="text-sm font-mono font-bold text-white tracking-wider uppercase flex items-center gap-2">
              <span>Vlastná garáž</span>
              <span className="text-[10px] text-emerald-300 font-bold bg-emerald-500/20 px-2 py-0.5 rounded-md border border-emerald-400/40">
                NA MIERU
              </span>
            </div>
            <div className="text-xs font-mono text-emerald-400/80 font-medium mt-0.5">
              {typedParams.width} × {typedParams.length} m · <span className="text-white/60">{area} m²</span>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setQuoteRequestSignal((v) => v + 1)}
          className="rounded-lg bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-mono text-xs font-bold px-3 py-1.5 transition cursor-pointer active:scale-95 shadow-md shadow-emerald-500/20"
        >
          Dopyt
        </button>
      </div>

      {/* 2. SUB-NAVIGATION TABS */}
      <div className="shrink-0 grid grid-cols-7 border-b border-white/10 bg-[#0e131d] text-[10px] md:text-[11px] font-mono">
        <button
          type="button"
          onClick={() => setActiveTab("dimensions")}
          title="Rozmery"
          className={`flex flex-col items-center justify-center py-2.5 border-r border-white/5 transition cursor-pointer ${
            activeTab === "dimensions"
              ? "bg-emerald-500/25 text-emerald-300 border-b-2 border-b-emerald-400 font-bold shadow-inner"
              : "text-white/70 hover:bg-white/10 hover:text-white"
          }`}
        >
          <Ruler className="h-4 w-4 mb-1" />
          <span>Rozmer</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("roof")}
          title="Strecha a atika"
          className={`flex flex-col items-center justify-center py-2.5 border-r border-white/5 transition cursor-pointer ${
            activeTab === "roof"
              ? "bg-emerald-500/25 text-emerald-300 border-b-2 border-b-emerald-400 font-bold shadow-inner"
              : "text-white/70 hover:bg-white/10 hover:text-white"
          }`}
        >
          <Home className="h-4 w-4 mb-1" />
          <span>Strecha</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("doors")}
          title="Brány a dvere"
          className={`flex flex-col items-center justify-center py-2.5 border-r border-white/5 transition cursor-pointer ${
            activeTab === "doors"
              ? "bg-emerald-500/25 text-emerald-300 border-b-2 border-b-emerald-400 font-bold shadow-inner"
              : "text-white/70 hover:bg-white/10 hover:text-white"
          }`}
        >
          <DoorClosed className="h-4 w-4 mb-1" />
          <span>Brány</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("colors")}
          title="Farby a opláštenie"
          className={`flex flex-col items-center justify-center py-2.5 border-r border-white/5 transition cursor-pointer ${
            activeTab === "colors"
              ? "bg-emerald-500/25 text-emerald-300 border-b-2 border-b-emerald-400 font-bold shadow-inner"
              : "text-white/70 hover:bg-white/10 hover:text-white"
          }`}
        >
          <Palette className="h-4 w-4 mb-1" />
          <span>Farby</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("extension")}
          title="Modul / Prístrešok"
          className={`flex flex-col items-center justify-center py-2.5 border-r border-white/5 transition cursor-pointer ${
            activeTab === "extension"
              ? "bg-emerald-500/25 text-emerald-300 border-b-2 border-b-emerald-400 font-bold shadow-inner"
              : "text-white/70 hover:bg-white/10 hover:text-white"
          }`}
        >
          <PlusSquare className="h-4 w-4 mb-1" />
          <span>Modul</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("view")}
          title="Zobrazenie CAD"
          className={`flex flex-col items-center justify-center py-2.5 border-r border-white/5 transition cursor-pointer ${
            activeTab === "view"
              ? "bg-emerald-500/25 text-emerald-300 border-b-2 border-b-emerald-400 font-bold shadow-inner"
              : "text-white/70 hover:bg-white/10 hover:text-white"
          }`}
        >
          <Eye className="h-4 w-4 mb-1" />
          <span>CAD</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("summary")}
          title="Súhrn konfigurácie"
          className={`flex flex-col items-center justify-center py-2.5 transition cursor-pointer ${
            activeTab === "summary"
              ? "bg-emerald-500/25 text-emerald-300 border-b-2 border-b-emerald-400 font-bold shadow-inner"
              : "text-white/70 hover:bg-white/10 hover:text-white"
          }`}
        >
          <FileText className="h-4 w-4 mb-1" />
          <span>Súhrn</span>
        </button>
      </div>

      {/* 3. SCROLLABLE TAB CONTENT */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs">
        {/* --- TAB 1: ROZMERY --- */}
        {activeTab === "dimensions" && (
          <div className="space-y-4">
            {/* Typ garáže (Garagentyp) */}
            <div className="rounded-xl bg-[#121824]/90 border border-white/10 p-3.5 space-y-2.5 shadow-md">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-200 tracking-wide">Typ garáže:</span>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded">
                  {currentGarageType === "single"
                    ? "Samostatná"
                    : currentGarageType === "double"
                    ? "Dvojgaráž"
                    : "Veľkopriestorová"}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {/* 1. Samostatná */}
                <button
                  type="button"
                  onClick={() => {
                    setParams({
                      gateCount: 1,
                      doorWidth: Math.min(typedParams.doorWidth ?? 2.5, 2.8),
                      width: typedParams.width > 4.5 ? 3.5 : typedParams.width,
                    });
                  }}
                  className={`flex flex-col items-center justify-between p-2 rounded-xl transition cursor-pointer text-center group ${
                    currentGarageType === "single"
                      ? "border-2 border-emerald-400 bg-emerald-500/20 ring-1 ring-emerald-400/40 shadow-[0_0_12px_rgba(52,211,153,0.2)]"
                      : "border border-white/10 bg-[#0e131d]/90 hover:bg-[#161f2e] hover:border-white/20"
                  }`}
                >
                  <div className="w-full flex items-center justify-center py-1">
                    <svg viewBox="0 0 100 62" className="w-full h-11 object-contain drop-shadow-sm">
                      <ellipse cx="50" cy="55" rx="34" ry="4" fill="#000000" opacity="0.3" />
                      <polygon points="68,23 85,16 85,45 68,52" fill="#94a3b8" stroke="#64748b" strokeWidth="0.5" />
                      <polygon points="26,23 43,16 85,16 68,23" fill="#f8fafc" stroke="#94a3b8" strokeWidth="0.5" />
                      <polygon points="26,23 68,23 68,26 26,26" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="0.5" />
                      <polygon points="68,23 85,16 85,18 68,26" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="0.5" />
                      <polygon points="26,26 31,26 31,52 26,52" fill="#f1f5f9" />
                      <polygon points="63,26 68,26 68,52 63,52" fill="#e2e8f0" />
                      <polygon points="31,26 63,26 63,30 31,30" fill="#f1f5f9" />
                      <polygon points="31,52 42,47 52,47 63,52" fill="#334155" />
                      <polygon points="42,32 52,32 52,47 42,47" fill="#1e293b" />
                      <polygon points="31,30 42,32 42,47 31,52" fill="#475569" />
                      <polygon points="63,30 52,32 52,47 63,52" fill="#334155" />
                    </svg>
                  </div>
                  <div className="text-[11px] font-bold text-slate-100 mt-1 leading-tight">
                    Samostatná
                  </div>
                </button>

                {/* 2. Dvojgaráž */}
                <button
                  type="button"
                  onClick={() => {
                    setParams({
                      gateCount: 2,
                      doorWidth: 2.5,
                      width: typedParams.width < 5.5 ? 6.0 : typedParams.width,
                    });
                  }}
                  className={`flex flex-col items-center justify-between p-2 rounded-xl transition cursor-pointer text-center group ${
                    currentGarageType === "double"
                      ? "border-2 border-emerald-400 bg-emerald-500/20 ring-1 ring-emerald-400/40 shadow-[0_0_12px_rgba(52,211,153,0.2)]"
                      : "border border-white/10 bg-[#0e131d]/90 hover:bg-[#161f2e] hover:border-white/20"
                  }`}
                >
                  <div className="w-full flex items-center justify-center py-1">
                    <svg viewBox="0 0 120 62" className="w-full h-11 object-contain drop-shadow-sm">
                      <ellipse cx="60" cy="55" rx="50" ry="4" fill="#000000" opacity="0.3" />
                      <polygon points="94,23 108,16 108,45 94,52" fill="#94a3b8" stroke="#64748b" strokeWidth="0.5" />
                      <polygon points="12,23 26,16 108,16 94,23" fill="#f8fafc" stroke="#94a3b8" strokeWidth="0.5" />
                      <polygon points="12,23 94,23 94,26 12,26" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="0.5" />
                      <polygon points="94,23 108,16 108,18 94,26" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="0.5" />
                      <polygon points="12,26 16,26 16,52 12,52" fill="#f1f5f9" />
                      <polygon points="90,26 94,26 94,52 90,52" fill="#e2e8f0" />
                      <polygon points="51,26 55,26 55,52 51,52" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="0.5" />
                      <polygon points="16,26 90,26 90,30 16,30" fill="#f1f5f9" />
                      <polygon points="16,52 24,47 43,47 51,52" fill="#334155" />
                      <polygon points="24,32 43,32 43,47 24,47" fill="#1e293b" />
                      <polygon points="16,30 24,32 24,47 16,52" fill="#475569" />
                      <polygon points="51,30 43,32 43,47 51,52" fill="#334155" />
                      <polygon points="55,52 63,47 82,47 90,52" fill="#334155" />
                      <polygon points="63,32 82,32 82,47 63,47" fill="#1e293b" />
                      <polygon points="55,30 63,32 63,47 55,52" fill="#475569" />
                      <polygon points="90,30 82,32 82,47 90,52" fill="#334155" />
                    </svg>
                  </div>
                  <div className="text-[11px] font-bold text-slate-100 mt-1 leading-tight">
                    Dvojgaráž
                  </div>
                </button>

                {/* 3. Veľkopriestorová */}
                <button
                  type="button"
                  onClick={() => {
                    setParams({
                      gateCount: 1,
                      doorWidth: 5.0,
                      width: typedParams.width < 5.5 ? 6.0 : typedParams.width,
                    });
                  }}
                  className={`flex flex-col items-center justify-between p-2 rounded-xl transition cursor-pointer text-center group ${
                    currentGarageType === "wide"
                      ? "border-2 border-emerald-400 bg-emerald-500/20 ring-1 ring-emerald-400/40 shadow-[0_0_12px_rgba(52,211,153,0.2)]"
                      : "border border-white/10 bg-[#0e131d]/90 hover:bg-[#161f2e] hover:border-white/20"
                  }`}
                >
                  <div className="w-full flex items-center justify-center py-1">
                    <svg viewBox="0 0 120 62" className="w-full h-11 object-contain drop-shadow-sm">
                      <ellipse cx="60" cy="55" rx="50" ry="4" fill="#000000" opacity="0.3" />
                      <polygon points="94,23 108,16 108,45 94,52" fill="#94a3b8" stroke="#64748b" strokeWidth="0.5" />
                      <polygon points="12,23 26,16 108,16 94,23" fill="#f8fafc" stroke="#94a3b8" strokeWidth="0.5" />
                      <polygon points="12,23 94,23 94,26 12,26" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="0.5" />
                      <polygon points="94,23 108,16 108,18 94,26" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="0.5" />
                      <polygon points="12,26 16,26 16,52 12,52" fill="#f1f5f9" />
                      <polygon points="90,26 94,26 94,52 90,52" fill="#e2e8f0" />
                      <polygon points="16,26 90,26 90,30 16,30" fill="#f1f5f9" />
                      <polygon points="16,52 26,47 80,47 90,52" fill="#334155" />
                      <polygon points="26,32 80,32 80,47 26,47" fill="#1e293b" />
                      <polygon points="16,30 26,32 26,47 16,52" fill="#475569" />
                      <polygon points="90,30 80,32 80,47 90,52" fill="#334155" />
                    </svg>
                  </div>
                  <div className="text-[11px] font-bold text-slate-100 mt-1 leading-tight">
                    Veľkopriestorová
                  </div>
                </button>
              </div>
            </div>

            {/* Šírka */}
            <div className="rounded-xl bg-[#121824]/90 border border-white/10 p-3.5 space-y-3 shadow-md">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-200 tracking-wide">Šírka X:</span>
                <span className="text-emerald-400 font-extrabold text-base font-mono">
                  {typedParams.width} m
                </span>
              </div>
              <input
                type="range"
                min="2.5"
                max="10.0"
                step="0.1"
                value={typedParams.width}
                onChange={(e) => setParams({ width: parseFloat(e.target.value) })}
                className="w-full accent-emerald-400 cursor-pointer h-2 bg-slate-700 rounded-lg"
              />
              <div className="flex gap-2 pt-0.5">
                {[3.0, 4.0, 5.0, 6.0, 7.0].map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setParams({ width: w })}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-mono transition cursor-pointer ${
                      typedParams.width === w
                        ? "bg-emerald-400 text-slate-950 font-extrabold border border-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.35)]"
                        : "bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 border border-white/15 font-medium"
                    }`}
                  >
                    {w}m
                  </button>
                ))}
              </div>
            </div>

            {/* Dĺžka */}
            <div className="rounded-xl bg-[#121824]/90 border border-white/10 p-3.5 space-y-3 shadow-md">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-200 tracking-wide">Dĺžka Y:</span>
                <span className="text-emerald-400 font-extrabold text-base font-mono">
                  {typedParams.length} m
                </span>
              </div>
              <input
                type="range"
                min="3.0"
                max="15.0"
                step="0.5"
                value={typedParams.length}
                onChange={(e) => setParams({ length: parseFloat(e.target.value) })}
                className="w-full accent-emerald-400 cursor-pointer h-2 bg-slate-700 rounded-lg"
              />
              <div className="flex gap-2 pt-0.5">
                {[5.0, 6.0, 7.0, 8.0, 10.0].map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setParams({ length: l })}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-mono transition cursor-pointer ${
                      typedParams.length === l
                        ? "bg-emerald-400 text-slate-950 font-extrabold border border-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.35)]"
                        : "bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 border border-white/15 font-medium"
                    }`}
                  >
                    {l}m
                  </button>
                ))}
              </div>
            </div>

            {/* Svetlá výška */}
            <div className="rounded-xl bg-[#121824]/90 border border-white/10 p-3.5 space-y-3 shadow-md">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-200 tracking-wide">Svetlá výška Z:</span>
                <span className="text-emerald-400 font-extrabold text-base font-mono">
                  {typedParams.clearHeight} m
                </span>
              </div>
              <input
                type="range"
                min="2.1"
                max="4.0"
                step="0.1"
                value={typedParams.clearHeight}
                onChange={(e) => setParams({ clearHeight: parseFloat(e.target.value) })}
                className="w-full accent-emerald-400 cursor-pointer h-2 bg-slate-700 rounded-lg"
              />
              <div className="flex gap-2 pt-0.5">
                {[2.2, 2.4, 2.6, 2.8, 3.0].map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setParams({ clearHeight: h })}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-mono transition cursor-pointer ${
                      typedParams.clearHeight === h
                        ? "bg-emerald-400 text-slate-950 font-extrabold border border-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.35)]"
                        : "bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 border border-white/15 font-medium"
                    }`}
                  >
                    {h}m
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* --- TAB 2: STRECHA & ATIKA --- */}
        {activeTab === "roof" && (
          <div className="space-y-4">
            <div className="rounded-xl bg-[#121824]/90 border border-white/10 p-3.5 space-y-3 shadow-md">
              <label className="text-xs font-semibold text-slate-200 block">Typ strechy:</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setParams({ roofType: "gable", hasAttic: false })}
                  className={`py-2 px-1.5 rounded-xl border text-center transition cursor-pointer ${
                    typedParams.roofType === "gable" && !typedParams.hasAttic
                      ? "border-2 border-emerald-400 bg-emerald-500/25 text-white font-bold ring-2 ring-emerald-400/30 shadow-md shadow-emerald-500/10"
                      : "border border-white/15 bg-slate-800/80 text-slate-200 hover:bg-slate-700/80 hover:text-white"
                  }`}
                >
                  <div className="text-xs sm:text-sm font-bold">🏠 Sedlová</div>
                  <div className="text-[10px] text-white/70 mt-0.5">Obojstranný</div>
                </button>
                <button
                  type="button"
                  onClick={() => setParams({ roofType: "shed", hasAttic: false })}
                  className={`py-2 px-1.5 rounded-xl border text-center transition cursor-pointer ${
                    typedParams.roofType === "shed" && !typedParams.hasAttic
                      ? "border-2 border-emerald-400 bg-emerald-500/25 text-white font-bold ring-2 ring-emerald-400/30 shadow-md shadow-emerald-500/10"
                      : "border border-white/15 bg-slate-800/80 text-slate-200 hover:bg-slate-700/80 hover:text-white"
                  }`}
                >
                  <div className="text-xs sm:text-sm font-bold">📐 Pultová</div>
                  <div className="text-[10px] text-white/70 mt-0.5">Jednostranný</div>
                </button>
                <button
                  type="button"
                  onClick={() => setParams({ roofType: "cubic", hasAttic: true, atticHeight: typedParams.atticHeight || 0.35 })}
                  className={`py-2 px-1.5 rounded-xl border text-center transition cursor-pointer ${
                    typedParams.roofType === "cubic" || typedParams.hasAttic
                      ? "border-2 border-emerald-400 bg-emerald-500/25 text-white font-bold ring-2 ring-emerald-400/30 shadow-md shadow-emerald-500/10"
                      : "border border-white/15 bg-slate-800/80 text-slate-200 hover:bg-slate-700/80 hover:text-white"
                  }`}
                >
                  <div className="text-xs sm:text-sm font-bold">🏢 Atika</div>
                  <div className="text-[10px] text-white/70 mt-0.5">Kubický štýl</div>
                </button>
              </div>
            </div>

            {/* Sklon strechy */}
            <div className="rounded-xl bg-[#121824]/90 border border-white/10 p-3.5 space-y-3 shadow-md">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-200">Sklon strechy:</span>
                <span className="text-emerald-400 font-extrabold text-base font-mono">
                  {typedParams.roofPitchDeg}°
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="25"
                step="1"
                value={typedParams.roofPitchDeg}
                onChange={(e) => setParams({ roofPitchDeg: parseInt(e.target.value, 10) })}
                className="w-full accent-emerald-400 cursor-pointer h-2 bg-slate-700 rounded-lg"
              />
              <div className="flex justify-between text-[11px] text-white/50 font-mono">
                <span>5° (Minimálny)</span>
                <span className="text-white/80">15° (Štandard)</span>
                <span>25° (Strmý)</span>
              </div>
            </div>

            {/* Atika (Moderný kubický vzhľad) */}
            <div className="rounded-xl bg-[#121824]/90 border border-white/10 p-3.5 space-y-3 shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-100">Atika (Kubický štýl)</div>
                  <div className="text-[11px] text-white/60">Skryté spádovanie strechy</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const isCurrentlyAttic = typedParams.roofType === "cubic" || !!typedParams.hasAttic;
                    setParams({
                      hasAttic: !isCurrentlyAttic,
                      roofType: !isCurrentlyAttic ? "cubic" : "shed"
                    });
                  }}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition cursor-pointer border border-white/20 ${
                    typedParams.roofType === "cubic" || typedParams.hasAttic ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]" : "bg-slate-700"
                  }`}
                >
                  <div
                    className={`bg-slate-950 w-4 h-4 rounded-full shadow-md transform transition ${
                      typedParams.roofType === "cubic" || typedParams.hasAttic ? "translate-x-6" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
              {(typedParams.roofType === "cubic" || typedParams.hasAttic) && (
                <div className="pt-2.5 border-t border-white/10 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-200 font-medium">Výška atiky:</span>
                    <span className="text-emerald-400 font-bold font-mono">
                      {typedParams.atticHeight ?? 0.35} m
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="0.8"
                    step="0.05"
                    value={typedParams.atticHeight ?? 0.35}
                    onChange={(e) => setParams({ atticHeight: parseFloat(e.target.value) })}
                    className="w-full accent-emerald-400 cursor-pointer h-2 bg-slate-700 rounded-lg"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- TAB 3: BRÁNY A VSTUPY --- */}
        {activeTab === "doors" && (
          <div className="space-y-4">
            {/* Počet brán */}
            <div className="rounded-xl bg-[#121824]/90 border border-white/10 p-3.5 space-y-3 shadow-md">
              <label className="text-xs font-semibold text-slate-200 block">Počet brán:</label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setParams({ gateCount: 1 })}
                  className={`py-2 rounded-lg border text-center transition cursor-pointer text-xs ${
                    typedParams.gateCount !== 2
                      ? "border-2 border-emerald-400 bg-emerald-500/25 text-white font-bold ring-1 ring-emerald-400/40"
                      : "border border-white/15 bg-slate-800/80 text-slate-200 hover:bg-slate-700/80"
                  }`}
                >
                  1 brána
                </button>
                <button
                  type="button"
                  onClick={() => setParams({ gateCount: 2 })}
                  className={`py-2 rounded-lg border text-center transition cursor-pointer text-xs ${
                    typedParams.gateCount === 2
                      ? "border-2 border-emerald-400 bg-emerald-500/25 text-white font-bold ring-1 ring-emerald-400/40"
                      : "border border-white/15 bg-slate-800/80 text-slate-200 hover:bg-slate-700/80"
                  }`}
                >
                  2 brány (Dvojgaráž)
                </button>
              </div>
            </div>

            {/* Typ brány */}
            <div className="rounded-xl bg-[#121824]/90 border border-white/10 p-3.5 space-y-3 shadow-md">
              <label className="text-xs font-semibold text-slate-200 block">Typ brány:</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "sectional", label: "Sekčná" },
                  { id: "upAndOver", label: "Výklopná" },
                  { id: "doubleLeaf", label: "Krídlová" },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setParams({ gateType: t.id as any })}
                    className={`py-2 rounded-lg border text-center transition cursor-pointer text-xs ${
                      (typedParams.gateType ?? "sectional") === t.id
                        ? "border-2 border-emerald-400 bg-emerald-500/25 text-white font-bold ring-1 ring-emerald-400/40"
                        : "border border-white/15 bg-slate-800/80 text-slate-200 hover:bg-slate-700/80"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Rozmery brány */}
            <div className="rounded-xl bg-[#121824]/90 border border-white/10 p-3.5 space-y-3 shadow-md">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-200">Šírka brány:</span>
                <span className="text-emerald-400 font-extrabold text-base font-mono">{typedParams.doorWidth} m</span>
              </div>
              <input
                type="range"
                min="2.0"
                max={typedParams.gateCount === 2 ? 3.0 : 5.0}
                step="0.1"
                value={typedParams.doorWidth}
                onChange={(e) => setParams({ doorWidth: parseFloat(e.target.value) })}
                className="w-full accent-emerald-400 cursor-pointer h-2 bg-slate-700 rounded-lg"
              />
              <div className="flex justify-between items-center pt-1.5">
                <span className="text-xs font-semibold text-slate-200">Výška brány:</span>
                <span className="text-emerald-400 font-extrabold text-base font-mono">{typedParams.doorHeight} m</span>
              </div>
              <input
                type="range"
                min="1.9"
                max="3.2"
                step="0.1"
                value={typedParams.doorHeight}
                onChange={(e) => setParams({ doorHeight: parseFloat(e.target.value) })}
                className="w-full accent-emerald-400 cursor-pointer h-2 bg-slate-700 rounded-lg"
              />
            </div>

            {/* Dvere a okná toggles */}
            <div className="rounded-xl bg-[#121824]/90 border border-white/10 p-3.5 space-y-3 shadow-md">
              {/* Bočné vstupné dvere */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-100">Vchodové dvere</div>
                  <div className="text-[11px] text-white/60">Samostatný bočný vstup</div>
                </div>
                <button
                  type="button"
                  onClick={() => setParams({ hasPersonalDoor: !typedParams.hasPersonalDoor })}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition cursor-pointer border border-white/20 ${
                    typedParams.hasPersonalDoor ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]" : "bg-slate-700"
                  }`}
                >
                  <div
                    className={`bg-slate-950 w-4 h-4 rounded-full shadow-md transform transition ${
                      typedParams.hasPersonalDoor ? "translate-x-6" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Okná */}
              <div className="flex items-center justify-between pt-2.5 border-t border-white/10">
                <div>
                  <div className="text-xs font-bold text-slate-100">Počet okien</div>
                  <div className="text-[11px] text-white/60">Presvetlenie interiéru</div>
                </div>
                <div className="flex gap-1.5">
                  {[0, 1, 2, 3].map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setParams({ hasWindows: cnt > 0, windowCount: cnt })}
                      className={`w-8 h-8 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                        typedParams.windowCount === cnt
                          ? "bg-emerald-400 text-slate-950 border border-emerald-300 shadow-[0_0_8px_rgba(52,211,153,0.35)]"
                          : "bg-slate-800/80 text-slate-200 border border-white/15 hover:bg-slate-700/80"
                      }`}
                    >
                      {cnt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- TAB 4: FARBY & OPLÁŠTENIE --- */}
        {activeTab === "colors" && (
          <div className="space-y-4">
            {/* Typ opláštenia */}
            <div className="rounded-xl bg-[#121824]/90 border border-white/10 p-3.5 space-y-3 shadow-md">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-slate-200">Typ opláštenia:</label>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded">
                  Sendvičový panel
                </span>
              </div>
              <div className="p-2.5 rounded-xl border border-emerald-400/40 bg-emerald-500/15 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white">Sendvičový panel</div>
                  <div className="text-[10px] text-emerald-300/80 mt-0.5">Tepelnoizolačné PUR / PIR jadro</div>
                </div>
                <span className="text-[11px] font-mono font-bold text-emerald-300">
                  {typedParams.wallPanelThicknessMm ?? 100} mm
                </span>
              </div>
              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
                <span className="text-slate-200 font-medium">Hrúbka jadra:</span>
                <div className="flex gap-1.5">
                  {[40, 60, 80, 100].map((th) => (
                    <button
                      key={th}
                      type="button"
                      onClick={() => setParams({ panelType: "sandwich", wallPanelThicknessMm: th })}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono transition cursor-pointer ${
                        (typedParams.wallPanelThicknessMm ?? 100) === th
                          ? "bg-emerald-400 text-slate-950 font-bold border border-emerald-300 shadow-sm"
                          : "bg-slate-800/80 text-slate-200 border border-white/15 hover:bg-slate-700/80"
                      }`}
                    >
                      {th}mm
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Farba stien */}
            <div className="rounded-xl bg-[#121824]/90 border border-white/10 p-3.5 space-y-3 shadow-md">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-slate-200">Farba stien:</label>
                <span className="text-emerald-400 text-xs font-bold">
                  {RAL_PALETTE.find((c) => c.hex.toLowerCase() === typedParams.claddingColor?.toLowerCase())?.name ?? typedParams.claddingColor}
                </span>
              </div>
              <div className="grid grid-cols-7 gap-2 pt-1">
                {RAL_PALETTE.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setParams({ claddingColor: c.hex })}
                    title={c.name}
                    className={`h-8 rounded-lg border-2 transition cursor-pointer relative flex items-center justify-center ${
                      typedParams.claddingColor?.toLowerCase() === c.hex.toLowerCase()
                        ? "border-emerald-300 scale-105 ring-2 ring-emerald-400/50 shadow-md"
                        : "border-white/20 hover:scale-105 hover:border-white/40"
                    }`}
                    style={{ backgroundColor: c.hex }}
                  >
                    {typedParams.claddingColor?.toLowerCase() === c.hex.toLowerCase() && (
                      <Check className="h-4 w-4 text-emerald-400 bg-black/70 rounded-full p-0.5" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Farba strechy */}
            <div className="rounded-xl bg-[#121824]/90 border border-white/10 p-3.5 space-y-3 shadow-md">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-slate-200">Farba strechy:</label>
                <span className="text-emerald-400 text-xs font-bold">
                  {RAL_PALETTE.find((c) => c.hex.toLowerCase() === typedParams.roofColor?.toLowerCase())?.name ?? typedParams.roofColor}
                </span>
              </div>
              <div className="grid grid-cols-7 gap-2 pt-1">
                {RAL_PALETTE.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setParams({ roofColor: c.hex })}
                    title={c.name}
                    className={`h-8 rounded-lg border-2 transition cursor-pointer relative flex items-center justify-center ${
                      typedParams.roofColor?.toLowerCase() === c.hex.toLowerCase()
                        ? "border-emerald-300 scale-105 ring-2 ring-emerald-400/50 shadow-md"
                        : "border-white/20 hover:scale-105 hover:border-white/40"
                    }`}
                    style={{ backgroundColor: c.hex }}
                  >
                    {typedParams.roofColor?.toLowerCase() === c.hex.toLowerCase() && (
                      <Check className="h-4 w-4 text-emerald-400 bg-black/70 rounded-full p-0.5" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Farba brány */}
            <div className="rounded-xl bg-[#121824]/90 border border-white/10 p-3.5 space-y-3 shadow-md">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-slate-200">Farba garážovej brány:</label>
                <span className="text-emerald-400 text-xs font-bold">
                  {RAL_PALETTE.find((c) => c.hex.toLowerCase() === typedParams.sectionalDoorColor?.toLowerCase())?.name ?? typedParams.sectionalDoorColor}
                </span>
              </div>
              <div className="grid grid-cols-7 gap-2 pt-1">
                {RAL_PALETTE.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setParams({ sectionalDoorColor: c.hex, sectionalDoor2Color: c.hex })}
                    title={c.name}
                    className={`h-8 rounded-lg border-2 transition cursor-pointer relative flex items-center justify-center ${
                      typedParams.sectionalDoorColor?.toLowerCase() === c.hex.toLowerCase()
                        ? "border-emerald-300 scale-105 ring-2 ring-emerald-400/50 shadow-md"
                        : "border-white/20 hover:scale-105 hover:border-white/40"
                    }`}
                    style={{ backgroundColor: c.hex }}
                  >
                    {typedParams.sectionalDoorColor?.toLowerCase() === c.hex.toLowerCase() && (
                      <Check className="h-4 w-4 text-emerald-400 bg-black/70 rounded-full p-0.5" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* --- TAB 5: PRÍSTREŠOK / MODUL --- */}
        {activeTab === "extension" && (
          <div className="space-y-4">
            <div className="rounded-xl bg-[#121824]/90 border border-white/10 p-3.5 space-y-3 shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-100">Prídavný bočný modul</div>
                  <div className="text-[11px] text-white/60">Carport / 2. garáž / sklad</div>
                </div>
                <button
                  type="button"
                  onClick={() => setParams({ hasExtension: !typedParams.hasExtension })}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition cursor-pointer border border-white/20 ${
                    typedParams.hasExtension ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]" : "bg-slate-700"
                  }`}
                >
                  <div
                    className={`bg-slate-950 w-4 h-4 rounded-full shadow-md transform transition ${
                      typedParams.hasExtension ? "translate-x-6" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {typedParams.hasExtension && (
                <div className="pt-2.5 border-t border-white/10 space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-200 block mb-1.5">Využitie modulu:</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: "carport", label: "Carport" },
                        { id: "garage", label: "2. garáž" },
                        { id: "storage", label: "Sklad" },
                      ].map((ex) => (
                        <button
                          key={ex.id}
                          type="button"
                          onClick={() => setParams({ extensionType: ex.id as any })}
                          className={`py-2 rounded-lg border text-center transition cursor-pointer text-xs ${
                            (typedParams.extensionType ?? "carport") === ex.id
                              ? "border-2 border-emerald-400 bg-emerald-500/25 text-white font-bold ring-1 ring-emerald-400/40"
                              : "border border-white/15 bg-slate-800/80 text-slate-200 hover:bg-slate-700/80"
                          }`}
                        >
                          {ex.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-200 block mb-1.5">Strana pripojenia:</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setParams({ extensionSide: "right" })}
                        className={`py-2 rounded-lg border text-center transition cursor-pointer text-xs ${
                          typedParams.extensionSide !== "left"
                            ? "border-2 border-emerald-400 bg-emerald-500/25 text-white font-bold ring-1 ring-emerald-400/40"
                            : "border border-white/15 bg-slate-800/80 text-slate-200 hover:bg-slate-700/80"
                        }`}
                      >
                        Vpravo
                      </button>
                      <button
                        type="button"
                        onClick={() => setParams({ extensionSide: "left" })}
                        className={`py-2 rounded-lg border text-center transition cursor-pointer text-xs ${
                          typedParams.extensionSide === "left"
                            ? "border-2 border-emerald-400 bg-emerald-500/25 text-white font-bold ring-1 ring-emerald-400/40"
                            : "border border-white/15 bg-slate-800/80 text-slate-200 hover:bg-slate-700/80"
                        }`}
                      >
                        Vľavo
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold text-slate-200">Šírka prístrešku:</span>
                      <span className="text-emerald-400 font-extrabold text-base font-mono">
                        {typedParams.extensionWidth ?? 3.5} m
                      </span>
                    </div>
                    <input
                      type="range"
                      min="2.5"
                      max="6.0"
                      step="0.1"
                      value={typedParams.extensionWidth ?? 3.5}
                      onChange={(e) => setParams({ extensionWidth: parseFloat(e.target.value) })}
                      className="w-full accent-emerald-400 cursor-pointer h-2 bg-slate-700 rounded-lg"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- TAB 6: CAD ZOBRAZENIE --- */}
        {activeTab === "view" && (
          <div className="space-y-3">
            {[
              { key: "showStructure", label: "Oceľová konštrukcia" },
              { key: "showCladding", label: "Opláštenie & steny" },
              { key: "showAccessories", label: "Príslušenstvo & lemovanie" },
              { key: "showFoundation", label: "Základová doska" },
              { key: "wireframe", label: "Drôtený model (Wireframe)" },
            ].map((v) => (
              <div
                key={v.key}
                className="flex items-center justify-between p-3 rounded-xl bg-[#121824]/90 border border-white/10 shadow-sm"
              >
                <span className="text-slate-100 text-xs font-semibold">{v.label}</span>
                <button
                  type="button"
                  onClick={() => setParams({ [v.key]: !(typedParams as any)[v.key] } as any)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition cursor-pointer border border-white/20 ${
                    (typedParams as any)[v.key] ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]" : "bg-slate-700"
                  }`}
                >
                  <div
                    className={`bg-slate-950 w-4 h-4 rounded-full shadow-md transform transition ${
                      (typedParams as any)[v.key] ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* --- TAB 7: SÚHRN KONFIGURÁCIE --- */}
        {activeTab === "summary" && (
          <div className="space-y-4">
            <div className="rounded-xl bg-[#121824]/90 border border-white/10 p-3.5 space-y-2.5 shadow-md">
              <div className="flex justify-between items-center pb-2 border-b border-white/10">
                <span className="text-xs font-bold text-slate-100 uppercase tracking-wide">
                  Súhrn parametrov
                </span>
                <span className="text-xs font-extrabold text-emerald-400 font-mono">
                  {area} m²
                </span>
              </div>

              <div className="rounded-lg bg-black/60 p-3 border border-white/5 space-y-1.5 text-xs text-slate-200">
                <div className="flex justify-between">
                  <span className="text-white/50">Model:</span>
                  <span className="font-bold text-emerald-400">Vlastná garáž</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Typ garáže:</span>
                  <span className="text-white font-medium">
                    {currentGarageType === "single"
                      ? "Samostatná garáž"
                      : currentGarageType === "double"
                      ? "Dvojgaráž"
                      : "Veľkopriestorová garáž"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Rozmery:</span>
                  <span className="text-white font-medium">{typedParams.width} × {typedParams.length} m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Svetlá výška:</span>
                  <span className="text-white font-medium">{typedParams.clearHeight ?? 2.6} m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Strecha:</span>
                  <span className="text-white font-medium">
                    {typedParams.roofType === "cubic" || typedParams.hasAttic
                      ? "Atika (Kubická)"
                      : typedParams.roofType === "gable"
                      ? "Sedlová"
                      : "Pultová"}{" "}
                    ({typedParams.roofPitchDeg}°)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Opláštenie:</span>
                  <span className="text-white font-medium">
                    Sendvičový panel {typedParams.wallPanelThicknessMm ?? 100}mm
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Brána:</span>
                  <span className="text-white font-medium">
                    {typedParams.gateCount === 2 ? "2x " : "1x "}
                    {typedParams.doorWidth} × {typedParams.doorHeight}m ({typedParams.gateType ?? "sekčná"})
                  </span>
                </div>
                {typedParams.hasExtension && (
                  <div className="flex justify-between">
                    <span className="text-white/50">Prístrešok:</span>
                    <span className="text-emerald-400 font-medium">
                      {typedParams.extensionType ?? "Carport"} ({typedParams.extensionWidth}m)
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl bg-[#121824]/90 border border-white/10 p-3.5 space-y-2 shadow-md">
              <label className="block text-[11px] text-white/70 uppercase tracking-wider font-semibold">
                Poznámka k dopytu:
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-white/15 bg-black/70 px-3 py-2 text-white/90 focus:border-emerald-400 focus:outline-none resize-none text-xs"
                placeholder="Lokalita stavby, špecifické požiadavky..."
              />
            </div>

            <button
              type="button"
              onClick={() => setQuoteRequestSignal((v) => v + 1)}
              className="w-full h-12 rounded-xl bg-emerald-400 text-center font-extrabold text-slate-950 transition hover:bg-emerald-300 active:scale-[0.99] shadow-lg shadow-emerald-500/25 text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
            >
              Dopytovať cenovú ponuku
            </button>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
