import React, { useState } from "react";
import { Leva } from "leva";
import type { GarageParams } from "@/lib/garage/types";
import defaultConfig from "@/config/default.json";
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
  Download,
  ArrowRightLeft,
} from "lucide-react";
import { downloadGarageDxf } from "@/lib/garage/dxfGenerator";
import { downloadGarageFloorPlanPdf } from "@/lib/garage/floorPlanPdfGenerator";
import { GarageBomTable } from "./GarageBomTable";

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
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  onOpenComparison?: () => void;
  onOpenPicker?: () => void;
}

type TabType = "dimensions" | "roof" | "doors" | "colors" | "view" | "summary";

const WIZARD_STEPS: { id: TabType; title: string }[] = [
  { id: "view", title: "CAD Zobrazenie" },
  { id: "dimensions", title: "Rozmery" },
  { id: "roof", title: "Strecha" },
  { id: "doors", title: "Brány & Otvory" },
  { id: "colors", title: "Farby" },
  { id: "summary", title: "Súhrn" },
];

const DEFAULT_RAL_PALETTE = [
  { name: "RAL 7016 Antracit", hex: "#2b2f36" },
  { name: "RAL 9010 Biela", hex: "#f4f5f7" },
  { name: "RAL 9006 Strieborná", hex: "#9aa1ab" },
  { name: "RAL 8017 Hnedá", hex: "#4a3728" },
  { name: "RAL 3009 Tehlová", hex: "#6e2626" },
  { name: "RAL 6005 Zelená", hex: "#284a37" },
  { name: "RAL 9005 Čierna", hex: "#18181b" },
];

export const RAL_PALETTE: Array<{ name: string; hex: string }> =
  (defaultConfig as any)?.palette ?? DEFAULT_RAL_PALETTE;

export function RalSwatchButton({
  color,
  isSelected,
  onClick,
  size = "h-8",
}: {
  color: { name: string; hex: string };
  isSelected: boolean;
  onClick: () => void;
  size?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={color.name}
      className={`${size} rounded-lg border transition-all duration-200 cursor-pointer relative flex items-center justify-center overflow-hidden shadow-sm ${
        isSelected
          ? "border-emerald-300 scale-105 ring-2 ring-emerald-400/50 shadow-[0_0_12px_rgba(52,211,153,0.35)] z-10"
          : "border-white/20 hover:scale-105 hover:border-white/50"
      }`}
      style={{ backgroundColor: color.hex }}
    >
      <div className="absolute inset-0 bg-gradient-to-tr from-black/25 via-transparent to-white/25 pointer-events-none" />
      {isSelected && (
        <span className="relative z-10 flex h-4 w-4 items-center justify-center rounded-full bg-black/75 shadow-sm">
          <Check className="h-2.5 w-2.5 text-emerald-400 stroke-[3]" />
        </span>
      )}
    </button>
  );
}

export function RalColorPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string;
  onChange: (hex: string) => void;
}) {
  const activeColor = RAL_PALETTE.find((c) => c.hex.toLowerCase() === value?.toLowerCase());
  return (
    <div className="rounded-xl bg-[#121824]/90 border border-white/10 p-3.5 space-y-3 shadow-md">
      <div className="flex justify-between items-center">
        <label className="text-xs font-semibold text-slate-200">{label}:</label>
        <span className="text-emerald-400 text-xs font-bold">
          {activeColor?.name ?? value}
        </span>
      </div>
      <div className="grid grid-cols-7 gap-2 pt-1">
        {RAL_PALETTE.map((c) => (
          <RalSwatchButton
            key={c.hex}
            color={c}
            isSelected={value?.toLowerCase() === c.hex.toLowerCase()}
            onClick={() => onChange(c.hex)}
          />
        ))}
      </div>
    </div>
  );
}

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
  activeTab: externalActiveTab,
  onTabChange,
  onOpenComparison,
  onOpenPicker,
}: CustomGarageMenuProps) {
  const [internalActiveTab, setInternalActiveTab] = useState<TabType>("view");
  const [isMobileMinimized, setIsMobileMinimized] = useState<boolean>(false);
  const activeTab = (externalActiveTab as TabType) || internalActiveTab;
  const setActiveTab = (tab: TabType) => {
    setInternalActiveTab(tab);
    onTabChange?.(tab);
  };

  const canExportCad =
    typeof window !== "undefined" &&
    (new URLSearchParams(window.location.search).get("cad") === "1" ||
      new URLSearchParams(window.location.search).get("admin") === "1");

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
        className={`quote-export-panel absolute z-30 flex flex-col rounded-2xl bg-[#0c1017]/95 shadow-2xl border border-emerald-500/40 backdrop-blur-md transition-all duration-300 ${
        showControls
          ? "opacity-100 translate-y-0 md:translate-x-0 pointer-events-auto"
          : "opacity-0 translate-y-8 md:translate-y-0 md:translate-x-12 pointer-events-none"
      } bottom-2 left-2 right-2 md:bottom-auto md:left-auto md:right-3 md:top-16 max-h-[44vh] md:max-h-[calc(100vh-80px)] w-auto md:w-[460px] md:max-w-[480px]`}
    >
      {/* 1. STICKY HEADER */}
      <div className="shrink-0 px-3.5 md:px-4 py-2 md:py-3 border-b border-white/10 bg-[#111723] flex flex-col">
        {/* Mobile drag pill indicator */}
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-1.5 md:hidden" />
        <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <div>
            <div className="text-sm md:text-base font-mono font-bold text-white tracking-wider uppercase flex items-center gap-2">
              <span>Vlastná garáž</span>
              <span className="text-[10px] md:text-xs text-emerald-300 font-bold bg-emerald-500/20 px-2 py-0.5 rounded-md border border-emerald-400/40">
                NA MIERU
              </span>
            </div>
            <div className="text-xs md:text-sm font-mono text-emerald-400/80 font-medium mt-0.5">
              {typedParams.width} × {typedParams.length} m · <span className="text-white/60">{area} m²</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onOpenComparison && (
            <button
              type="button"
              onClick={onOpenComparison}
              className="hidden sm:flex items-center gap-1 rounded-lg bg-white/10 hover:bg-white/15 text-white font-mono text-xs px-2.5 py-1.5 transition cursor-pointer border border-white/10 active:scale-95"
              title="Porovnať varianty konfigurácie"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-400" />
              <span>Porovnať</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setQuoteRequestSignal((v) => v + 1)}
            className="rounded-lg bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-mono text-xs md:text-sm font-bold px-3.5 py-1.5 transition cursor-pointer active:scale-95 shadow-md shadow-emerald-500/20"
          >
            Dopyt
          </button>
          <button
            type="button"
            onClick={() => setIsMobileMinimized((v) => !v)}
            title={isMobileMinimized ? "Rozbaliť menu" : "Zbaliť menu"}
            className="md:hidden p-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 transition cursor-pointer"
          >
            {isMobileMinimized ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
        </div>
      </div>
      </div>

      {!isMobileMinimized && (
        <>
          {/* WIZARD STEPPER PROGRESS */}
          <div className="shrink-0 px-3.5 py-1.5 bg-[#0b0f16] border-b border-white/5 flex items-center justify-between text-[10px] font-mono">
            <span className="text-white/60">
              Krok <strong className="text-emerald-300">{WIZARD_STEPS.findIndex((s) => s.id === activeTab) + 1}</strong> z {WIZARD_STEPS.length}:{" "}
              <span className="text-white font-medium">{WIZARD_STEPS.find((s) => s.id === activeTab)?.title}</span>
            </span>
            <div className="w-20 sm:w-28 h-1.5 bg-white/10 rounded-full overflow-hidden ml-2">
              <div
                className="h-full bg-emerald-400 transition-all duration-300 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.7)]"
                style={{
                  width: `${((WIZARD_STEPS.findIndex((s) => s.id === activeTab) + 1) / WIZARD_STEPS.length) * 100}%`,
                }}
              />
            </div>
          </div>

      {/* 2. SUB-NAVIGATION TABS */}
      <div className="shrink-0 grid grid-cols-6 border-b border-white/10 bg-[#0e131d] text-[11px] md:text-xs font-mono">
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
          onClick={() => {
            setActiveTab("doors");
            setParams({ doorFocus: "gate" });
          }}
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
      <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4 font-mono text-xs md:text-[13px]">
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
                      doorWidth: 2.8,
                      width: 4.0,
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
            <div className="rounded-xl bg-[#121824]/90 backdrop-blur-sm border border-white/10 p-3.5 space-y-3 shadow-md hover:border-white/15 transition-colors">
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
                className="w-full accent-emerald-400 cursor-pointer h-2 bg-slate-700/80 rounded-lg transition hover:brightness-110"
              />
              <div className="flex gap-2 pt-0.5">
                {[3.0, 4.0, 5.0, 6.0, 7.0].map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setParams({ width: w })}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-mono transition-all duration-150 cursor-pointer active:scale-95 ${
                      typedParams.width === w
                        ? "bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 font-black border border-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.35)] scale-102"
                        : "bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-white/10 hover:border-white/25 font-semibold"
                    }`}
                  >
                    {w}m
                  </button>
                ))}
              </div>
            </div>

            {/* Dĺžka */}
            <div className="rounded-xl bg-[#121824]/90 backdrop-blur-sm border border-white/10 p-3.5 space-y-3 shadow-md hover:border-white/15 transition-colors">
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
                className="w-full accent-emerald-400 cursor-pointer h-2 bg-slate-700/80 rounded-lg transition hover:brightness-110"
              />
              <div className="flex gap-2 pt-0.5">
                {[5.0, 6.0, 7.0, 8.0, 10.0].map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setParams({ length: l })}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-mono transition-all duration-150 cursor-pointer active:scale-95 ${
                      typedParams.length === l
                        ? "bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 font-black border border-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.35)] scale-102"
                        : "bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-white/10 hover:border-white/25 font-semibold"
                    }`}
                  >
                    {l}m
                  </button>
                ))}
              </div>
            </div>

            {/* Svetlá výška */}
            <div className="rounded-xl bg-[#121824]/90 backdrop-blur-sm border border-white/10 p-3.5 space-y-3 shadow-md hover:border-white/15 transition-colors">
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
                className="w-full accent-emerald-400 cursor-pointer h-2 bg-slate-700/80 rounded-lg transition hover:brightness-110"
              />
              <div className="flex gap-2 pt-0.5">
                {[2.2, 2.4, 2.6, 2.8, 3.0].map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setParams({ clearHeight: h })}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-mono transition-all duration-150 cursor-pointer active:scale-95 ${
                      typedParams.clearHeight === h
                        ? "bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 font-black border border-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.35)] scale-102"
                        : "bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-white/10 hover:border-white/25 font-semibold"
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

            {/* Farba lemovania strechy a odkvapov */}
            <div className="rounded-xl bg-[#121824]/90 border border-white/10 p-3.5 space-y-3 shadow-md">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-slate-200">Farba lemovania & odkvapov:</label>
                <span className="text-emerald-400 text-xs font-bold">
                  {RAL_PALETTE.find((c) => c.hex.toLowerCase() === typedParams.trimmingColor?.toLowerCase())?.name ?? typedParams.trimmingColor}
                </span>
              </div>
              <div className="grid grid-cols-7 gap-2 pt-1">
                {RAL_PALETTE.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setParams({ trimmingColor: c.hex })}
                    title={c.name}
                    className={`h-8 rounded-lg border-2 transition cursor-pointer relative flex items-center justify-center ${
                      typedParams.trimmingColor?.toLowerCase() === c.hex.toLowerCase()
                        ? "border-emerald-300 scale-105 ring-2 ring-emerald-400/50 shadow-md"
                        : "border-white/20 hover:scale-105 hover:border-white/40"
                    }`}
                    style={{ backgroundColor: c.hex }}
                  >
                    {typedParams.trimmingColor?.toLowerCase() === c.hex.toLowerCase() && (
                      <Check className="h-4 w-4 text-emerald-400 bg-black/70 rounded-full p-0.5" />
                    )}
                  </button>
                ))}
              </div>
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
                  onClick={() => setParams({ gateCount: 1, doorFocus: "gate" })}
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
                  onClick={() => setParams({ gateCount: 2, doorFocus: "gate" })}
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
                    onClick={() => setParams({ gateType: t.id as any, doorFocus: "gate" })}
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

            {/* Animácia otvorenia / zatvorenia brány */}
            <div className="rounded-xl bg-[#121824]/90 border border-white/10 p-3.5 space-y-2.5 shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full inline-block ${typedParams.doorOpen ? "bg-amber-400 animate-pulse" : "bg-emerald-400"}`} />
                    <span>{typedParams.doorOpen ? "Brána je otvorená" : "Brána je zatvorená"}</span>
                  </div>
                  <div className="text-[11px] text-white/60">3D animácia pohybu brány</div>
                </div>
                <button
                  type="button"
                  onClick={() => setParams({ doorOpen: !typedParams.doorOpen, doorFocus: "gate" })}
                  className={`px-3.5 py-2 rounded-lg font-bold text-xs transition cursor-pointer flex items-center gap-2 shadow-lg active:scale-95 ${
                    typedParams.doorOpen
                      ? "bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-amber-400/25 ring-2 ring-amber-400/40"
                      : "bg-emerald-400 hover:bg-emerald-300 text-slate-950 shadow-emerald-400/25 ring-2 ring-emerald-400/40"
                  }`}
                >
                  <span className="text-sm">{typedParams.doorOpen ? "🔒" : "🔓"}</span>
                  <span>{typedParams.doorOpen ? "Zatvoriť bránu" : "Otvoriť bránu"}</span>
                </button>
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
                onChange={(e) => setParams({ doorWidth: parseFloat(e.target.value), doorFocus: "gate" })}
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
                onChange={(e) => setParams({ doorHeight: parseFloat(e.target.value), doorFocus: "gate" })}
                className="w-full accent-emerald-400 cursor-pointer h-2 bg-slate-700 rounded-lg"
              />
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
                    onClick={() => setParams({ sectionalDoorColor: c.hex, sectionalDoor2Color: c.hex, doorFocus: "gate" })}
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

            {/* Dvere a okná toggles & nastavenia */}
            <div className="rounded-xl bg-[#121824]/90 border border-white/10 p-3.5 space-y-3.5 shadow-md">
              {/* Bočné vstupné dvere */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-100">Vchodové dvere</div>
                  <div className="text-[11px] text-white/60">Samostatný bočný / zadný vstup</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const nextVal = !typedParams.hasPersonalDoor;
                    setParams({
                      hasPersonalDoor: nextVal,
                      doorFocus: nextVal ? "personalDoor" : "gate",
                    });
                  }}
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

              {/* Nastavenie strany a farby dverí ak sú aktívne */}
              {typedParams.hasPersonalDoor && (
                <div className="pt-2 border-t border-white/10 space-y-3 bg-white/[0.02] -mx-1 p-2 rounded-lg">
                  {/* Umiestnenie dverí */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-300 font-medium">Umiestnenie dverí:</span>
                      <span className="text-emerald-400 font-bold text-xs">
                        {typedParams.personalDoorSide === "front_left"
                          ? "Vpredu vľavo"
                          : typedParams.personalDoorSide === "front_right"
                          ? "Vpredu vpravo"
                          : typedParams.personalDoorSide === "back"
                          ? "Vzadu"
                          : typedParams.personalDoorSide === "left"
                          ? typedParams.personalDoorPosition === "back"
                            ? "Vľavo vzadu"
                            : "Vľavo vpredu"
                          : typedParams.personalDoorPosition === "back"
                          ? "Vpravo vzadu"
                          : "Vpravo vpredu"}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { side: "left", pos: "front", label: "Vľavo vpredu" },
                        { side: "left", pos: "back", label: "Vľavo vzadu" },
                        { side: "right", pos: "front", label: "Vpravo vpredu" },
                        { side: "right", pos: "back", label: "Vpravo vzadu" },
                        { side: "front_left", pos: "front", label: "Vpredu vľavo" },
                        { side: "front_right", pos: "front", label: "Vpredu vpravo" },
                        { side: "back", pos: "back", label: "Vzadu" },
                      ].map((loc) => {
                        const isMatch =
                          loc.side === "front_left"
                            ? typedParams.personalDoorSide === "front_left"
                            : loc.side === "front_right"
                            ? typedParams.personalDoorSide === "front_right"
                            : loc.side === "back"
                            ? typedParams.personalDoorSide === "back"
                            : typedParams.personalDoorSide === loc.side &&
                              (typedParams.personalDoorPosition ?? "front") === loc.pos;

                        return (
                          <button
                            key={`${loc.side}-${loc.pos}`}
                            type="button"
                            onClick={() =>
                              setParams({
                                personalDoorSide: loc.side as any,
                                personalDoorPosition: loc.pos as any,
                                doorFocus: "personalDoor",
                              })
                            }
                            className={`py-1.5 px-2 rounded-lg border text-center transition cursor-pointer text-xs ${
                              isMatch
                                ? "border-emerald-400 bg-emerald-500/25 text-white font-bold ring-1 ring-emerald-400/40"
                                : "border-white/15 bg-slate-800/80 text-slate-300 hover:bg-slate-700/80"
                            } ${loc.side === "back" ? "col-span-2" : ""}`}
                          >
                            {loc.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Farba a povrch vchodových dverí */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-300 font-medium">Farba / dekor dverí:</span>
                      <span className="text-emerald-400 text-xs font-bold">
                        {typedParams.doorDecor === "wood_oak"
                          ? "Zlatý dub"
                          : typedParams.doorDecor === "wood_walnut"
                          ? "Tmavý orech"
                          : (RAL_PALETTE.find(
                              (c) =>
                                c.hex.toLowerCase() ===
                                (typedParams.doorColor ?? "#3a3f47").toLowerCase()
                            )?.name ?? typedParams.doorColor ?? "RAL 7016")}
                      </span>
                    </div>

                    {/* Drevodekor voľba */}
                    <div className="flex gap-1.5 pb-1">
                      <button
                        type="button"
                        onClick={() => setParams({ doorDecor: "none", doorFocus: "personalDoor" })}
                        className={`flex-1 py-1 rounded text-[11px] font-bold border transition cursor-pointer ${
                          (typedParams.doorDecor ?? "none") === "none"
                            ? "border-emerald-400 bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/30"
                            : "border-white/15 bg-slate-800/60 text-slate-300 hover:bg-slate-700/60"
                        }`}
                      >
                        RAL farba
                      </button>
                      <button
                        type="button"
                        onClick={() => setParams({ doorDecor: "wood_oak", doorFocus: "personalDoor" })}
                        className={`flex-1 py-1 rounded text-[11px] font-bold border transition cursor-pointer ${
                          typedParams.doorDecor === "wood_oak"
                            ? "border-amber-400 bg-amber-500/25 text-amber-200 ring-1 ring-amber-400/40"
                            : "border-white/15 bg-slate-800/60 text-slate-300 hover:bg-slate-700/60"
                        }`}
                      >
                        Zlatý dub
                      </button>
                      <button
                        type="button"
                        onClick={() => setParams({ doorDecor: "wood_walnut", doorFocus: "personalDoor" })}
                        className={`flex-1 py-1 rounded text-[11px] font-bold border transition cursor-pointer ${
                          typedParams.doorDecor === "wood_walnut"
                            ? "border-amber-700 bg-amber-900/40 text-amber-200 ring-1 ring-amber-600/40"
                            : "border-white/15 bg-slate-800/60 text-slate-300 hover:bg-slate-700/60"
                        }`}
                      >
                        Tmavý orech
                      </button>
                    </div>

                    {/* RAL paleta ak nie je vybraný drevodekor */}
                    {(typedParams.doorDecor ?? "none") === "none" && (
                      <div className="grid grid-cols-7 gap-1.5 pt-0.5">
                        {RAL_PALETTE.map((c) => (
                          <button
                            key={c.hex}
                            type="button"
                            onClick={() => setParams({ doorColor: c.hex, doorDecor: "none", doorFocus: "personalDoor" })}
                            title={c.name}
                            className={`h-7 rounded-lg border-2 transition cursor-pointer relative flex items-center justify-center ${
                              (typedParams.doorColor ?? "#3a3f47").toLowerCase() === c.hex.toLowerCase()
                                ? "border-emerald-300 scale-105 ring-2 ring-emerald-400/50 shadow-md"
                                : "border-white/20 hover:scale-105 hover:border-white/40"
                            }`}
                            style={{ backgroundColor: c.hex }}
                          >
                            {(typedParams.doorColor ?? "#3a3f47").toLowerCase() === c.hex.toLowerCase() && (
                              <Check className="h-3.5 w-3.5 text-emerald-400 bg-black/70 rounded-full p-0.5" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

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
                        (typedParams.windowCount ?? 0) === cnt
                          ? "bg-emerald-400 text-slate-950 border border-emerald-300 shadow-[0_0_8px_rgba(52,211,153,0.35)]"
                          : "bg-slate-800/80 text-slate-200 border border-white/15 hover:bg-slate-700/80"
                      }`}
                    >
                      {cnt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nastavenie strany a farby okien ak je počet > 0 */}
              {(typedParams.windowCount ?? 0) > 0 && (
                <div className="pt-2 border-t border-white/10 space-y-3 bg-white/[0.02] -mx-1 p-2 rounded-lg">
                  {/* Strana okien */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-300 font-medium">Umiestnenie okien:</span>
                      <span className="text-emerald-400 font-bold text-xs">
                        {typedParams.windowSide === "left"
                          ? "Ľavá stena"
                          : typedParams.windowSide === "back"
                          ? "Zadná stena"
                          : "Pravá stena"}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { id: "left", label: "Vľavo" },
                        { id: "right", label: "Vpravo" },
                        { id: "back", label: "Vzadu" },
                      ].map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setParams({ windowSide: s.id as any })}
                          className={`py-1.5 rounded-lg border text-center transition cursor-pointer text-xs ${
                            (typedParams.windowSide ?? "left") === s.id
                              ? "border-emerald-400 bg-emerald-500/25 text-white font-bold ring-1 ring-emerald-400/40"
                              : "border-white/15 bg-slate-800/80 text-slate-300 hover:bg-slate-700/80"
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Farba rámu okien */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-300 font-medium">Farba rámu okien:</span>
                      <span className="text-emerald-400 text-xs font-bold">
                        {RAL_PALETTE.find((c) => c.hex.toLowerCase() === (typedParams.windowColor ?? "#2b2f36").toLowerCase())?.name ?? typedParams.windowColor ?? "RAL 7016"}
                      </span>
                    </div>
                    <div className="grid grid-cols-7 gap-1.5 pt-0.5">
                      {RAL_PALETTE.map((c) => (
                        <button
                          key={c.hex}
                          type="button"
                          onClick={() => setParams({ windowColor: c.hex })}
                          title={c.name}
                          className={`h-7 rounded-lg border-2 transition cursor-pointer relative flex items-center justify-center ${
                            (typedParams.windowColor ?? "#2b2f36").toLowerCase() === c.hex.toLowerCase()
                              ? "border-emerald-300 scale-105 ring-2 ring-emerald-400/50 shadow-md"
                              : "border-white/20 hover:scale-105 hover:border-white/40"
                          }`}
                          style={{ backgroundColor: c.hex }}
                        >
                          {(typedParams.windowColor ?? "#2b2f36").toLowerCase() === c.hex.toLowerCase() && (
                            <Check className="h-3.5 w-3.5 text-emerald-400 bg-black/70 rounded-full p-0.5" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
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
                  <RalSwatchButton
                    key={c.hex}
                    color={c}
                    isSelected={typedParams.claddingColor?.toLowerCase() === c.hex.toLowerCase()}
                    onClick={() => setParams({ claddingColor: c.hex })}
                  />
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
                  <RalSwatchButton
                    key={c.hex}
                    color={c}
                    isSelected={typedParams.roofColor?.toLowerCase() === c.hex.toLowerCase()}
                    onClick={() => setParams({ roofColor: c.hex })}
                  />
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
                  <RalSwatchButton
                    key={c.hex}
                    color={c}
                    isSelected={typedParams.sectionalDoorColor?.toLowerCase() === c.hex.toLowerCase()}
                    onClick={() => setParams({ sectionalDoorColor: c.hex, sectionalDoor2Color: c.hex })}
                  />
                ))}
              </div>
            </div>

            {/* Rohové lemovanie a odkvapy */}
            <div className="rounded-xl bg-[#121824]/90 border border-white/10 p-3.5 space-y-3 shadow-md">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div>
                  <div className="text-xs font-semibold text-slate-200">Rohové lemovanie & odkvapy</div>
                  <div className="text-[10px] text-white/50">Krycie lišty a žľaby</div>
                </div>
                <button
                  type="button"
                  onClick={() => setParams({ showAccessories: !typedParams.showAccessories })}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition cursor-pointer border border-white/20 ${
                    typedParams.showAccessories ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]" : "bg-slate-700"
                  }`}
                  title={typedParams.showAccessories ? "Vypnúť lemovanie" : "Zapnúť lemovanie"}
                >
                  <div
                    className={`bg-slate-950 w-4 h-4 rounded-full shadow-md transform transition ${
                      typedParams.showAccessories ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {typedParams.showAccessories && (
                <>
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-slate-200">Farba lemovania:</label>
                    <span className="text-emerald-400 text-xs font-bold">
                      {RAL_PALETTE.find((c) => c.hex.toLowerCase() === typedParams.trimmingColor?.toLowerCase())?.name ?? typedParams.trimmingColor}
                    </span>
                  </div>
                  <div className="grid grid-cols-7 gap-2 pt-1">
                    {RAL_PALETTE.map((c) => (
                      <RalSwatchButton
                        key={c.hex}
                        color={c}
                        isSelected={typedParams.trimmingColor?.toLowerCase() === c.hex.toLowerCase()}
                        onClick={() => setParams({ trimmingColor: c.hex })}
                      />
                    ))}
                  </div>
                </>
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

            {/* DXF AutoCAD 2D export (Iba pre admina / ?cad=1) */}
            {canExportCad && (
              <div className="p-3 rounded-xl bg-[#121824]/90 border border-white/10 shadow-sm space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-100 font-semibold">CAD / AutoCAD Export:</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                    DXF 2D
                  </span>
                </div>
                <p className="text-[11px] text-white/60 leading-relaxed">
                  Technický výkres pôdorysu garáže s kótami, osami a stĺpmi (PDF na okamžité zobrazenie alebo DXF pre CAD softvér).
                </p>
                <div className="grid grid-cols-2 gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => downloadGarageFloorPlanPdf(typedParams, `${selectedHall || "garaz"}_vykres`)}
                    className="py-2 px-2.5 rounded-lg bg-emerald-400 hover:bg-emerald-300 active:scale-[0.99] text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-md shadow-emerald-500/20"
                    title="Stiahnuť a otvoriť výkres priamo v PDF"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Výkres (PDF)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadGarageDxf(typedParams, `${selectedHall || "garaz"}_podorys.dxf`)}
                    className="py-2 px-2.5 rounded-lg bg-white/10 hover:bg-white/15 active:scale-[0.99] text-white font-semibold text-xs flex items-center justify-center gap-1.5 border border-white/15 transition cursor-pointer"
                    title="Stiahnuť pre AutoCAD / Revit"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span>AutoCAD (.DXF)</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- TAB 7: SÚHRN KONFIGURÁCIE --- */}
        {activeTab === "summary" && (
          <div className="space-y-4">
            <div className="rounded-xl bg-[#121824]/90 border border-white/10 p-4 space-y-3 shadow-md">
              <div className="flex justify-between items-center pb-2.5 border-b border-white/10">
                <span className="text-sm font-bold text-slate-100 uppercase tracking-wide">
                  Súhrn parametrov
                </span>
                <span className="text-sm font-extrabold text-emerald-400 font-mono bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-lg">
                  {area} m²
                </span>
              </div>

              <div className="rounded-lg bg-black/60 p-3.5 border border-white/5 space-y-2.5 text-sm text-slate-200">
                <div className="flex justify-between items-center py-0.5 border-b border-white/5">
                  <span className="text-white/60 font-medium">Model:</span>
                  <span className="font-bold text-emerald-400">Garáž na mieru</span>
                </div>
                <div className="flex justify-between items-center py-0.5 border-b border-white/5">
                  <span className="text-white/60 font-medium">Typ garáže:</span>
                  <span className="text-white font-semibold">
                    {currentGarageType === "single"
                      ? "Samostatná garáž"
                      : currentGarageType === "double"
                      ? "Dvojgaráž"
                      : "Veľkopriestorová garáž"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-0.5 border-b border-white/5">
                  <span className="text-white/60 font-medium">Rozmery (Š × D):</span>
                  <span className="text-emerald-300 font-bold font-mono text-base">{typedParams.width} × {typedParams.length} m</span>
                </div>
                <div className="flex justify-between items-center py-0.5 border-b border-white/5">
                  <span className="text-white/60 font-medium">Svetlá výška (Z):</span>
                  <span className="text-white font-semibold">{typedParams.clearHeight ?? 2.6} m</span>
                </div>
                <div className="flex justify-between items-center py-0.5 border-b border-white/5">
                  <span className="text-white/60 font-medium">Strecha:</span>
                  <span className="text-white font-semibold">
                    {typedParams.roofType === "cubic" || typedParams.hasAttic
                      ? "Atika (Kubická)"
                      : typedParams.roofType === "gable"
                      ? "Sedlová"
                      : "Pultová"}{" "}
                    ({typedParams.roofPitchDeg}°)
                  </span>
                </div>
                <div className="flex justify-between items-center py-0.5 border-b border-white/5">
                  <span className="text-white/60 font-medium">Opláštenie:</span>
                  <span className="text-white font-semibold">
                    Sendvičový panel {typedParams.wallPanelThicknessMm ?? 100}mm
                  </span>
                </div>
                <div className="flex justify-between items-center py-0.5 border-b border-white/5">
                  <span className="text-white/60 font-medium">Brána:</span>
                  <span className="text-white font-semibold">
                    {typedParams.gateCount === 2 ? "2× " : "1× "}
                    {typedParams.doorWidth} × {typedParams.doorHeight} m ({typedParams.gateType === "sectional" ? "Sekčná" : typedParams.gateType === "upAndOver" ? "Výklopná" : "Krídlová"})
                  </span>
                </div>
                {typedParams.hasPersonalDoor && (
                  <div className="flex justify-between items-center py-0.5 border-b border-white/5">
                    <span className="text-white/60 font-medium">Vchodové dvere:</span>
                    <span className="text-white font-semibold">
                      {typedParams.personalDoorSide === "front_left"
                        ? "Vpredu vľavo"
                        : typedParams.personalDoorSide === "front_right"
                        ? "Vpredu vpravo"
                        : typedParams.personalDoorSide === "back"
                        ? "Vzadu"
                        : typedParams.personalDoorSide === "left"
                        ? typedParams.personalDoorPosition === "back" ? "Vľavo vzadu" : "Vľavo vpredu"
                        : typedParams.personalDoorPosition === "back" ? "Vpravo vzadu" : "Vpravo vpredu"}
                      {typedParams.doorDecor === "wood_oak"
                        ? " (Zlatý dub)"
                        : typedParams.doorDecor === "wood_walnut"
                        ? " (Tmavý orech)"
                        : ""}
                    </span>
                  </div>
                )}
                {(typedParams.windowCount ?? 0) > 0 && (
                  <div className="flex justify-between items-center py-0.5 border-b border-white/5">
                    <span className="text-white/60 font-medium">Okná:</span>
                    <span className="text-white font-semibold">{typedParams.windowCount}× okno</span>
                  </div>
                )}
                {typedParams.hasExtension && (
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-white/60 font-medium">Prístrešok:</span>
                    <span className="text-emerald-400 font-semibold">
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

            {canExportCad && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => downloadGarageFloorPlanPdf(typedParams, `${selectedHall || "garaz"}_vykres`)}
                  className="py-2 px-2 rounded-lg bg-emerald-400/15 hover:bg-emerald-400/25 text-emerald-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 border border-emerald-400/30 transition cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Výkres (PDF)</span>
                </button>

                <button
                  type="button"
                  onClick={() => downloadGarageDxf(typedParams, `${selectedHall || "garaz"}_podorys.dxf`)}
                  className="py-2 px-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 hover:text-white text-xs font-medium flex items-center justify-center gap-1.5 border border-white/10 transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>CAD (.DXF)</span>
                </button>
              </div>
            )}

            {onOpenComparison && (
              <button
                type="button"
                onClick={onOpenComparison}
                className="w-full py-2.5 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-emerald-300 hover:text-white text-xs font-medium flex items-center justify-center gap-1.5 border border-emerald-500/20 transition cursor-pointer"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-400" />
                <span>Porovnať varianty vedľa seba</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* 4. PINNED WIZARD NAVIGATION FOOTER */}
      <div className="shrink-0 p-2.5 md:p-3 border-t border-white/10 bg-[#0e131d]/95 backdrop-blur flex items-center justify-between gap-2 font-mono text-xs">
        {WIZARD_STEPS.findIndex((s) => s.id === activeTab) > 0 ? (
          <button
            type="button"
            onClick={() => {
              const idx = WIZARD_STEPS.findIndex((s) => s.id === activeTab);
              if (idx > 0) setActiveTab(WIZARD_STEPS[idx - 1].id);
            }}
            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 transition flex items-center gap-1 cursor-pointer active:scale-95"
          >
            <span>←</span>
            <span className="hidden sm:inline">Späť</span>
          </button>
        ) : (
          <div />
        )}

        <div className="text-[11px] text-white/40 hidden sm:block">
          {WIZARD_STEPS.findIndex((s) => s.id === activeTab) + 1} / {WIZARD_STEPS.length}
        </div>

        {WIZARD_STEPS.findIndex((s) => s.id === activeTab) < WIZARD_STEPS.length - 1 ? (
          <button
            type="button"
            onClick={() => {
              const idx = WIZARD_STEPS.findIndex((s) => s.id === activeTab);
              if (idx < WIZARD_STEPS.length - 1) setActiveTab(WIZARD_STEPS[idx + 1].id);
            }}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 font-bold shadow-lg shadow-emerald-500/25 transition-all flex items-center gap-1.5 cursor-pointer ml-auto active:scale-95"
          >
            <span>Ďalej: {WIZARD_STEPS[WIZARD_STEPS.findIndex((s) => s.id === activeTab) + 1]?.title}</span>
            <span>➔</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setQuoteRequestSignal((v) => v + 1)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 font-bold shadow-lg shadow-emerald-500/30 transition-all flex items-center gap-1.5 cursor-pointer ml-auto active:scale-95"
          >
            <span>Odoslať dopyt</span>
            <span>✓</span>
          </button>
        )}
      </div>
      </>
      )}
    </div>
    </>
  );
}
