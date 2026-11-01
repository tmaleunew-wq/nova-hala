import React, { useState } from "react";
import { Leva } from "leva";
import type { GarageParams } from "@/lib/garage/types";
import { getHallsConfig, type HallConfig } from "@/lib/garage/configHelper";
import { RAL_PALETTE } from "./CustomGarageMenu";
import {
  Ruler,
  Home,
  DoorClosed,
  Palette,
  Eye,
  FileText,
  Check,
  ChevronDown,
  ChevronUp,
  Plus,
  Minus,
  Download,
  ArrowRightLeft,
  X,
  Layers,
} from "lucide-react";
import { GarageBomTable } from "./GarageBomTable";
import { HallSkylightControls } from "./HallSkylightControls";

export interface StandardHallMenuProps {
  showControls: boolean;
  typedParams: GarageParams;
  selectedHall: string;
  notes: string;
  setNotes: (notes: string) => void;
  isSummaryOpen: boolean;
  setIsSummaryOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setQuoteRequestSignal: React.Dispatch<React.SetStateAction<number>>;
  onToggleCladding?: () => void;
  setParams?: (params: Partial<GarageParams>) => void;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  hallsConfig?: Record<string, HallConfig>;
  selectedPoleHeight?: string;
  setSelectedPoleHeight?: (h: string) => void;
  selectedLength?: number;
  setSelectedLength?: (l: number) => void;
  onOpenComparison?: () => void;
  onSelectHall?: (hall: string) => void;
  onOpenPicker?: () => void;
  onClose?: () => void;
}

type TabType = "dimensions" | "cladding" | "roof" | "doors" | "colors" | "view" | "summary";

const WIZARD_STEPS: { id: TabType; title: string }[] = [
  { id: "view", title: "CAD Zobrazenie" },
  { id: "dimensions", title: "Rozmery" },
  { id: "cladding", title: "Opláštenie" },
  { id: "roof", title: "Strecha" },
  { id: "doors", title: "Brány & Otvory" },
  { id: "colors", title: "Farby" },
  { id: "summary", title: "Súhrn" },
];

export function HallRalColorPicker({
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
        <span className="text-cyan-400 text-xs font-bold">
          {activeColor?.name ?? value}
        </span>
      </div>
      <div className="grid grid-cols-7 gap-2 pt-1">
        {RAL_PALETTE.map((c) => {
          const isSelected = value?.toLowerCase() === c.hex.toLowerCase();
          return (
            <button
              key={c.hex}
              type="button"
              onClick={() => onChange(c.hex)}
              title={c.name}
              className={`h-8 rounded-lg border-2 transition cursor-pointer relative flex items-center justify-center ${
                isSelected
                  ? "border-cyan-300 scale-105 ring-2 ring-cyan-400/50 shadow-md"
                  : "border-white/20 hover:scale-105 hover:border-white/40"
              }`}
              style={{ backgroundColor: c.hex }}
            >
              {isSelected && (
                <Check className="h-4 w-4 text-cyan-400 bg-black/70 rounded-full p-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function StandardHallMenu({
  showControls,
  typedParams,
  selectedHall,
  notes,
  setNotes,
  isSummaryOpen,
  setIsSummaryOpen,
  setQuoteRequestSignal,
  onToggleCladding,
  setParams = () => {},
  activeTab: externalActiveTab,
  onTabChange,
  hallsConfig: passedHallsConfig,
  selectedPoleHeight = "4m",
  setSelectedPoleHeight = () => {},
  selectedLength = 20,
  setSelectedLength = () => {},
  onOpenComparison,
  onSelectHall,
  onOpenPicker,
  onClose,
}: StandardHallMenuProps) {
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

  const handleDownloadFloorPlanPdf = async () => {
    const { downloadGarageFloorPlanPdf } = await import("@/lib/garage/floorPlanPdfGenerator");
    downloadGarageFloorPlanPdf(typedParams, `${selectedHall || "hala"}_vykres`);
  };

  const handleDownloadDxf = async () => {
    const { downloadGarageDxf } = await import("@/lib/garage/dxfGenerator");
    downloadGarageDxf(typedParams, `${selectedHall || "hala"}_podorys.dxf`);
  };

  const allHalls = passedHallsConfig || getHallsConfig();
  const hallKeys = Object.keys(allHalls).filter(
    (k) => k !== "vlastna_garaz" && k !== "Vlastná garáž" && k !== "Vlastný"
  );
  const curHall: HallConfig | undefined = allHalls[selectedHall];

  const moduleLength = curHall?.moduleLength ?? 5;
  const minLength = curHall?.minLength ?? (moduleLength * 2);
  const currentLength = selectedLength > 0 ? selectedLength : typedParams.length;
  const bayCount = Math.max(2, Math.round(currentLength / moduleLength));
  const area = (typedParams.width * currentLength).toFixed(1);

  // Bezpečné rozmery brány pre halu
  const maxSafeGateHeight = Math.max(2.0, (typedParams.clearHeight ?? 4.0) - 0.2);
  const maxSafeGateWidth = Math.max(2.5, Math.min(6.0, typedParams.width - 1.2));

  // Rýchle predvoľby dĺžok pre halu
  const quickLengths = [15, 20, 25, 30, 35, 40].filter((l) => l >= minLength);

  return (
    <>
      <Leva hidden />
      <div
        className={`quote-export-panel absolute z-30 flex flex-col rounded-2xl bg-[#0c1017]/95 shadow-2xl border border-cyan-500/40 backdrop-blur-md transition-all duration-300 ${
          showControls
            ? "opacity-100 translate-y-0 md:translate-x-0 pointer-events-auto"
            : "opacity-0 translate-y-8 md:translate-y-0 md:translate-x-12 pointer-events-none"
        } bottom-2 left-2 right-2 md:bottom-auto md:left-auto md:right-3 md:top-16 max-h-[44vh] md:max-h-[calc(100vh-80px)] w-auto md:w-[460px] md:max-w-[480px]`}
      >
        {/* 1. STICKY HEADER */}
        <div className="shrink-0 px-3.5 md:px-4 py-2 md:py-3 border-b border-white/10 bg-[#111723] flex flex-col">
          {/* Mobile drag pill */}
          <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-1.5 md:hidden" />
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
              </span>
              <div className="min-w-0">
                <div className="text-xs sm:text-sm font-mono font-bold text-white tracking-wide uppercase flex items-center gap-1.5 flex-nowrap">
                  <span className="whitespace-nowrap">{curHall?.name ?? "Katalógová hala"}</span>
                  <span className="text-[9px] sm:text-[10px] text-cyan-300 font-bold bg-cyan-500/20 px-1.5 py-0.5 rounded border border-cyan-400/40 whitespace-nowrap shrink-0">
                    {curHall?.framework ?? "EN 1090"}
                  </span>
                </div>
                <div className="text-[11px] sm:text-xs font-mono text-cyan-400/90 font-medium whitespace-nowrap">
                  {typedParams.width} × {currentLength} m · <span className="text-white/60">{area} m²</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="hidden xl:inline font-mono text-[9px] bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider whitespace-nowrap">
                {selectedHall}
              </span>
              {onOpenComparison && (
                <button
                  type="button"
                  onClick={onOpenComparison}
                  className="hidden lg:flex items-center gap-1 rounded-lg bg-white/10 hover:bg-white/15 text-white font-mono text-xs px-2 py-1 transition cursor-pointer border border-white/10 active:scale-95 whitespace-nowrap"
                  title="Porovnať varianty konfigurácie"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 text-cyan-300" />
                  <span>Porovnať</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setQuoteRequestSignal((v) => v + 1)}
                className="rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-mono text-xs font-bold px-2.5 sm:px-3 py-1 transition cursor-pointer active:scale-95 shadow-md shadow-cyan-500/20 whitespace-nowrap"
              >
                Dopyt
              </button>
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  title="Zavrieť menu (zobraziť celú 3D halu)"
                  className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition cursor-pointer border border-white/10"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsMobileMinimized((v) => !v)}
                title={isMobileMinimized ? "Rozbaliť menu" : "Zbaliť menu"}
                className="md:hidden p-1 rounded-lg bg-white/10 text-white hover:bg-white/20 transition cursor-pointer"
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
                Krok <strong className="text-cyan-300">{WIZARD_STEPS.findIndex((s) => s.id === activeTab) + 1}</strong> z {WIZARD_STEPS.length}:{" "}
                <span className="text-white font-medium">{WIZARD_STEPS.find((s) => s.id === activeTab)?.title}</span>
              </span>
              <div className="w-20 sm:w-28 h-1.5 bg-white/10 rounded-full overflow-hidden ml-2">
                <div
                  className="h-full bg-cyan-400 transition-all duration-300 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.7)]"
                  style={{
                    width: `${((WIZARD_STEPS.findIndex((s) => s.id === activeTab) + 1) / WIZARD_STEPS.length) * 100}%`,
                  }}
                />
              </div>
            </div>

            {/* 2. SUB-NAVIGATION TABS */}
            <div className="shrink-0 grid grid-cols-7 border-b border-white/10 bg-[#0e131d] text-[10px] md:text-xs font-mono">
              <button
                type="button"
                onClick={() => setActiveTab("view")}
                title="Zobrazenie CAD"
                className={`flex flex-col items-center justify-center py-2.5 border-r border-white/5 transition cursor-pointer ${
                  activeTab === "view"
                    ? "bg-cyan-500/25 text-cyan-300 border-b-2 border-b-cyan-400 font-bold shadow-inner"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Eye className="h-4 w-4 mb-1" />
                <span>CAD</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("dimensions")}
                title="Rozmery haly"
                className={`flex flex-col items-center justify-center py-2.5 border-r border-white/5 transition cursor-pointer ${
                  activeTab === "dimensions"
                    ? "bg-cyan-500/25 text-cyan-300 border-b-2 border-b-cyan-400 font-bold shadow-inner"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Ruler className="h-4 w-4 mb-1" />
                <span>Rozmer</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("cladding")}
                title="Opláštenie stien haly"
                className={`flex flex-col items-center justify-center py-2.5 border-r border-white/5 transition cursor-pointer ${
                  activeTab === "cladding"
                    ? "bg-cyan-500/25 text-cyan-300 border-b-2 border-b-cyan-400 font-bold shadow-inner"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Layers className="h-4 w-4 mb-1" />
                <span className="truncate max-w-full px-0.5">Plášť</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("roof")}
                title="Strecha a strešná krytina"
                className={`flex flex-col items-center justify-center py-2.5 border-r border-white/5 transition cursor-pointer ${
                  activeTab === "roof"
                    ? "bg-cyan-500/25 text-cyan-300 border-b-2 border-b-cyan-400 font-bold shadow-inner"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Home className="h-4 w-4 mb-1" />
                <span>Strecha</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("doors")}
                title="Brány a vstupy"
                className={`flex flex-col items-center justify-center py-2.5 border-r border-white/5 transition cursor-pointer ${
                  activeTab === "doors"
                    ? "bg-cyan-500/25 text-cyan-300 border-b-2 border-b-cyan-400 font-bold shadow-inner"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <DoorClosed className="h-4 w-4 mb-1" />
                <span>Brány</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("colors")}
                title="Farby a RAL paleta"
                className={`flex flex-col items-center justify-center py-2.5 border-r border-white/5 transition cursor-pointer ${
                  activeTab === "colors"
                    ? "bg-cyan-500/25 text-cyan-300 border-b-2 border-b-cyan-400 font-bold shadow-inner"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Palette className="h-4 w-4 mb-1" />
                <span>Farby</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("summary")}
                title="Súhrn špecifikácie"
                className={`flex flex-col items-center justify-center py-2.5 transition cursor-pointer ${
                  activeTab === "summary"
                    ? "bg-cyan-500/25 text-cyan-300 border-b-2 border-b-cyan-400 font-bold shadow-inner"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <FileText className="h-4 w-4 mb-1" />
                <span>Súhrn</span>
              </button>
            </div>

            {/* 3. SCROLLABLE TAB CONTENT */}
            <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4 font-mono text-xs md:text-[13px]">
              {/* --- TAB 1: ROZMERY HALY --- */}
              {activeTab === "dimensions" && (
                <div className="space-y-4">
                  {/* Typový model haly info card s obrázkom z variantu 2 a tlačidlom na výber */}
                  <div className="rounded-xl bg-[#121824]/90 border border-white/10 p-3.5 space-y-2.5 shadow-md">
                    {/* Render haly */}
                    <div className="relative w-full h-36 sm:h-44 rounded-lg overflow-hidden bg-gradient-to-b from-[#182030] to-[#0c1018] border border-white/10 flex items-center justify-center p-2 group shadow-inner">
                      <img
                        src={`/catalog_variant2/${curHall?.imageKey || "KD8"}_render.png`}
                        alt={selectedHall}
                        className="h-full w-full object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)] transition duration-300 group-hover:scale-105"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = `/catalog/${curHall?.imageKey || "KD8"}_render.png`;
                        }}
                      />
                      {curHall?.badge && (
                        <span className="absolute top-2 right-2 rounded-full bg-cyan-400 text-slate-950 font-mono text-[9px] font-bold px-2 py-0.5 shadow-md">
                          {curHall.badge}
                        </span>
                      )}
                    </div>

                    <div className="flex justify-between items-center pt-0.5">
                      <div>
                        <span className="text-xs font-bold text-white tracking-wide block">{selectedHall}</span>
                        {curHall?.subtitle && (
                          <span className="text-[10px] text-cyan-300 font-medium">{curHall.subtitle}</span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-500/15 border border-cyan-500/30 px-2 py-0.5 rounded">
                        {typedParams.width} × {currentLength} m
                      </span>
                    </div>

                    {curHall?.description && (
                      <p className="text-[11px] text-white/70 leading-relaxed font-sans">
                        {curHall.description}
                      </p>
                    )}

                    <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                      <div className="bg-black/40 p-2 rounded-lg border border-white/5">
                        <span className="text-white/50 block text-[10px]">Statický profil:</span>
                        <span className="text-white font-medium">{curHall?.framework || curHall?.gablePillars || "IPE 160"}</span>
                      </div>
                      <div className="bg-black/40 p-2 rounded-lg border border-white/5">
                        <span className="text-white/50 block text-[10px]">Osová rozteč (modul):</span>
                        <span className="text-cyan-400 font-bold">{moduleLength} m</span>
                      </div>
                    </div>

                    {/* Vyskakovacie okno na výber z 9 typových hál */}
                    <button
                      type="button"
                      onClick={() => {
                        if (onOpenPicker) {
                          onOpenPicker();
                        } else if ((window as any).__openHallPicker) {
                          (window as any).__openHallPicker();
                        }
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/40 font-mono text-xs font-bold transition shadow-sm cursor-pointer mt-1"
                    >
                      <span>⊞</span>
                      <span>Zmeniť typový model (Katalóg 9 hál)</span>
                    </button>
                  </div>

                  {/* Šírka haly (Fixná typová šírka) */}
                  <div className="rounded-xl bg-[#121824]/90 border border-white/10 p-3.5 space-y-2 shadow-md">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-xs font-semibold text-slate-200 tracking-wide block">Šírka haly (A):</span>
                        <span className="text-[10px] text-white/50">Typový rozmer z výroby</span>
                      </div>
                      <span className="text-cyan-400 font-extrabold text-base font-mono">
                        {typedParams.width} m
                      </span>
                    </div>
                  </div>

                  {/* Dĺžka haly (B) */}
                  <div className="rounded-xl bg-[#121824]/90 border border-white/10 p-3.5 space-y-3 shadow-md">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-xs font-semibold text-slate-200 tracking-wide block">Dĺžka haly (B):</span>
                        <span className="text-[10px] text-white/50">
                          {bayCount} polí po {moduleLength} m
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const newL = Math.max(minLength, currentLength - moduleLength);
                            setSelectedLength(newL);
                            setParams({ length: newL, bayCount: Math.round(newL / moduleLength) });
                          }}
                          disabled={currentLength <= minLength}
                          className="p-1.5 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed border border-white/10 transition"
                          title="Odobrať jeden modul"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="text-cyan-400 font-extrabold text-base font-mono min-w-[50px] text-center">
                          {currentLength} m
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const newL = Math.min(60, currentLength + moduleLength);
                            setSelectedLength(newL);
                            setParams({ length: newL, bayCount: Math.round(newL / moduleLength) });
                          }}
                          disabled={currentLength >= 60}
                          className="p-1.5 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed border border-white/10 transition"
                          title="Pridať jeden modul"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <input
                      type="range"
                      min={minLength}
                      max="50"
                      step={moduleLength}
                      value={currentLength}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setSelectedLength(val);
                        setParams({ length: val, bayCount: Math.round(val / moduleLength) });
                      }}
                      className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-700 rounded-lg"
                    />

                    <div className="flex gap-1.5 pt-0.5 overflow-x-auto pb-1">
                      {quickLengths.map((l) => (
                        <button
                          key={l}
                          type="button"
                          onClick={() => {
                            setSelectedLength(l);
                            setParams({ length: l, bayCount: Math.round(l / moduleLength) });
                          }}
                          className={`flex-1 min-w-[44px] py-1.5 rounded-lg text-xs font-mono transition cursor-pointer text-center ${
                            currentLength === l
                              ? "bg-cyan-400 text-slate-950 font-extrabold border border-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.35)]"
                              : "bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 border border-white/15 font-medium"
                          }`}
                        >
                          {l}m
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Výška stĺpa / Svetlá výška (H) */}
                  <div className="rounded-xl bg-[#121824]/90 border border-white/10 p-3.5 space-y-3 shadow-md">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-xs font-semibold text-slate-200 tracking-wide block">Výška stĺpa:</span>
                        <span className="text-[10px] text-white/50">Svetlá výška haly</span>
                      </div>
                      <span className="text-cyan-400 font-extrabold text-base font-mono">
                        {typedParams.clearHeight} m
                      </span>
                    </div>

                    {curHall?.versions && curHall.versions.length > 0 ? (
                      <div className="flex gap-2 pt-0.5">
                        {curHall.versions.map((ver) => {
                          const isSel = selectedPoleHeight === `${ver.poleHeight}m` || Math.abs(typedParams.clearHeight - ver.H) < 0.1;
                          return (
                            <button
                              key={ver.poleHeight}
                              type="button"
                              onClick={() => {
                                setSelectedPoleHeight(`${ver.poleHeight}m`);
                                setParams({ clearHeight: ver.H, hallHeight: `${ver.poleHeight}m` });
                              }}
                              className={`flex-1 py-2 rounded-xl text-xs font-mono transition cursor-pointer flex flex-col items-center justify-center ${
                                isSel
                                  ? "bg-cyan-400 text-slate-950 font-extrabold border border-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.35)]"
                                  : "bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 border border-white/15 font-medium"
                              }`}
                            >
                              <span className="font-bold text-[13px]">{ver.poleHeight} m</span>
                              <span className="text-[10px] opacity-75">H = {ver.H}m</span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <input
                        type="range"
                        min="3.5"
                        max="7.0"
                        step="0.5"
                        value={typedParams.clearHeight}
                        onChange={(e) => setParams({ clearHeight: parseFloat(e.target.value) })}
                        className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-700 rounded-lg"
                      />
                    )}
                  </div>
                </div>
              )}

              {/* --- TAB: OPLÁŠTENIE --- */}
              {activeTab === "cladding" && (
                <div className="space-y-4">
                  {/* Opláštenie stien */}
                  <div className="rounded-xl bg-[#121824]/90 border border-white/10 p-3.5 space-y-3 shadow-md">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-semibold text-slate-200">Opláštenie stien haly:</label>
                      <span className="text-[11px] font-semibold text-cyan-400">
                        {typedParams.panelType === "sandwich" ? "Sendvičový panel PIR" : "Trapézový plech"}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setParams({ panelType: "sandwich" })}
                        className={`py-2 rounded-xl border text-center transition cursor-pointer text-xs ${
                          typedParams.panelType === "sandwich"
                            ? "border-2 border-cyan-400 bg-cyan-500/25 text-white font-bold ring-1 ring-cyan-400/40"
                            : "border border-white/15 bg-slate-800/80 text-slate-200 hover:bg-slate-700/80"
                        }`}
                      >
                        <div className="font-bold">Sendvičový panel PIR</div>
                        <div className="text-[10px] text-white/60">Izolované steny</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setParams({ panelType: "trapezoid" })}
                        className={`py-2 rounded-xl border text-center transition cursor-pointer text-xs ${
                          typedParams.panelType === "trapezoid"
                            ? "border-2 border-cyan-400 bg-cyan-500/25 text-white font-bold ring-1 ring-cyan-400/40"
                            : "border border-white/15 bg-slate-800/80 text-slate-200 hover:bg-slate-700/80"
                        }`}
                      >
                        <div className="font-bold">Trapézový plech</div>
                        <div className="text-[10px] text-white/60">Neizolovaný sklad</div>
                      </button>
                    </div>

                    {/* Ukladanie panelov stien: Pozdĺžne vs Priečne */}
                    <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-medium">Ukladanie panelov stien:</span>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => setParams({ claddingOrientation: "horizontal" })}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                            (typedParams.claddingOrientation ?? "horizontal") === "horizontal"
                              ? "bg-cyan-400 text-slate-950 font-bold shadow-sm"
                              : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                          }`}
                        >
                          Pozdĺžne
                        </button>
                        <button
                          type="button"
                          onClick={() => setParams({ claddingOrientation: "vertical" })}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                            typedParams.claddingOrientation === "vertical"
                              ? "bg-cyan-400 text-slate-950 font-bold shadow-sm"
                              : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                          }`}
                        >
                          Priečne
                        </button>
                      </div>
                    </div>

                    {typedParams.panelType === "sandwich" && (
                      <div className="pt-2 border-t border-white/10 space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-300">Hrúbka PIR stien:</span>
                          <span className="text-cyan-400 font-bold font-mono">
                            {typedParams.wallPanelThicknessMm ?? 100} mm
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-1.5">
                          {[60, 80, 100, 120].map((th) => (
                            <button
                              key={th}
                              type="button"
                              onClick={() => setParams({ wallPanelThicknessMm: th })}
                              className={`py-1.5 rounded-lg text-xs font-mono transition cursor-pointer ${
                                (typedParams.wallPanelThicknessMm ?? 100) === th
                                  ? "bg-cyan-400 text-slate-950 font-bold"
                                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                              }`}
                            >
                              {th}mm
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Farba opláštenia stien */}
                  <HallRalColorPicker
                    label="Farba opláštenia stien"
                    value={typedParams.claddingColor}
                    onChange={(hex) => setParams({ claddingColor: hex })}
                  />
                </div>
              )}

              {/* --- TAB 2: STRECHA --- */}
              {activeTab === "roof" && (
                <div className="space-y-4">
                  {/* Typ strechy */}
                  <div className="rounded-xl bg-[#121824]/90 border border-white/10 p-3.5 space-y-3 shadow-md">
                    <label className="text-xs font-semibold text-slate-200 block">Typ strechy haly:</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setParams({ roofType: "gable", hasAttic: false })}
                        className={`py-2 px-1.5 rounded-xl border text-center transition cursor-pointer ${
                          typedParams.roofType === "gable" && !typedParams.hasAttic
                            ? "border-2 border-cyan-400 bg-cyan-500/25 text-white font-bold ring-2 ring-cyan-400/30 shadow-md shadow-cyan-500/10"
                            : "border border-white/15 bg-slate-800/80 text-slate-200 hover:bg-slate-700/80 hover:text-white"
                        }`}
                      >
                        <div className="text-xs sm:text-sm font-bold">🏠 Sedlová</div>
                        <div className="text-[10px] text-white/70 mt-0.5">Dvojstranný spád</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setParams({ roofType: "shed", hasAttic: false })}
                        className={`py-2 px-1.5 rounded-xl border text-center transition cursor-pointer ${
                          typedParams.roofType === "shed" && !typedParams.hasAttic
                            ? "border-2 border-cyan-400 bg-cyan-500/25 text-white font-bold ring-2 ring-cyan-400/30 shadow-md shadow-cyan-500/10"
                            : "border border-white/15 bg-slate-800/80 text-slate-200 hover:bg-slate-700/80 hover:text-white"
                        }`}
                      >
                        <div className="text-xs sm:text-sm font-bold">📐 Pultová</div>
                        <div className="text-[10px] text-white/70 mt-0.5">Jednostranný spád</div>
                      </button>
                    </div>
                  </div>

                  {/* Sklon strechy */}
                  <div className="rounded-xl bg-[#121824]/90 border border-white/10 p-3.5 space-y-3 shadow-md">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold text-slate-200">Sklon strechy:</span>
                      <span className="text-cyan-400 font-extrabold text-base font-mono">
                        {typedParams.roofPitchDeg}°
                      </span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="20"
                      step="1"
                      value={typedParams.roofPitchDeg}
                      onChange={(e) => setParams({ roofPitchDeg: parseInt(e.target.value, 10) })}
                      className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-700 rounded-lg"
                    />
                    <div className="flex justify-between text-[11px] text-white/50 font-mono">
                      <span>5° (Minimálny)</span>
                      <span className="text-white/80">10° (Hala štandard)</span>
                      <span>20°</span>
                    </div>
                  </div>

                  {/* Strešný plášť / krytina */}
                  <div className="rounded-xl bg-[#121824]/90 border border-white/10 p-3.5 space-y-3 shadow-md">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-semibold text-slate-200">Strešný plášť / krytina:</label>
                      <span className="text-[11px] font-semibold text-cyan-400">
                        {typedParams.roofPanelType === "sandwich" ? "Strešný sendvič PIR" : "Trapézový plech"}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setParams({ roofPanelType: "sandwich" })}
                        className={`py-2 rounded-xl border text-center transition cursor-pointer text-xs ${
                          typedParams.roofPanelType === "sandwich"
                            ? "border-2 border-cyan-400 bg-cyan-500/25 text-white font-bold ring-1 ring-cyan-400/40"
                            : "border border-white/15 bg-slate-800/80 text-slate-200 hover:bg-slate-700/80"
                        }`}
                      >
                        <div className="font-bold">Strešný sendvič PIR</div>
                        <div className="text-[10px] text-white/60">Izolovaná strecha</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setParams({ roofPanelType: "trapezoid" })}
                        className={`py-2 rounded-xl border text-center transition cursor-pointer text-xs ${
                          typedParams.roofPanelType === "trapezoid"
                            ? "border-2 border-cyan-400 bg-cyan-500/25 text-white font-bold ring-1 ring-cyan-400/40"
                            : "border border-white/15 bg-slate-800/80 text-slate-200 hover:bg-slate-700/80"
                        }`}
                      >
                        <div className="font-bold">Trapézový plech</div>
                        <div className="text-[10px] text-white/60">Neizolovaná strecha</div>
                      </button>
                    </div>

                    {typedParams.roofPanelType === "sandwich" && (
                      <div className="pt-2 border-t border-white/10 space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-300">Hrúbka PIR strechy:</span>
                          <span className="text-cyan-400 font-bold font-mono">
                            {typedParams.roofPanelThicknessMm ?? 120} mm
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-1.5">
                          {[60, 80, 100, 120].map((th) => (
                            <button
                              key={th}
                              type="button"
                              onClick={() => setParams({ roofPanelThicknessMm: th })}
                              className={`py-1.5 rounded-lg text-xs font-mono transition cursor-pointer ${
                                (typedParams.roofPanelThicknessMm ?? 120) === th
                                  ? "bg-cyan-400 text-slate-950 font-bold"
                                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                              }`}
                            >
                              {th}mm
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Strešné svetlíky */}
                  <div className="rounded-xl bg-[#121824]/90 border border-white/10 p-3.5 space-y-3 shadow-md">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-semibold text-slate-200">Strešné svetlíky (presvetlenie)</div>
                        <div className="text-[10px] text-white/50">Polykarbonátové pásy</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setParams({ hasSkylights: !typedParams.hasSkylights })}
                        className={`w-11 h-6 flex items-center rounded-full p-1 transition cursor-pointer border border-white/20 ${
                          typedParams.hasSkylights ? "bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]" : "bg-slate-700"
                        }`}
                      >
                        <div
                          className={`bg-slate-950 w-4 h-4 rounded-full shadow-md transform transition ${
                            typedParams.hasSkylights ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {typedParams.hasSkylights && (
                    <HallSkylightControls params={typedParams} onChange={setParams} />
                  )}

                  {/* Farba strechy */}
                  <HallRalColorPicker
                    label="Farba strešného plášťa"
                    value={typedParams.roofColor}
                    onChange={(hex) => setParams({ roofColor: hex })}
                  />

                  {/* Farba lemovania */}
                  <HallRalColorPicker
                    label="Farba lemovania a odkvapov"
                    value={typedParams.trimmingColor}
                    onChange={(hex) => setParams({ trimmingColor: hex })}
                  />
                </div>
              )}

              {/* --- TAB 3: BRÁNY A VSTUPY --- */}
              {activeTab === "doors" && (
                <div className="space-y-4">
                  {/* Sekčná priemyselná brána */}
                  <div className="rounded-xl bg-[#121824]/90 border border-white/10 p-3.5 space-y-3 shadow-md">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold text-slate-200 tracking-wide">Hlavná priemyselná brána:</span>
                      <span className="text-[10px] font-bold text-cyan-400 bg-cyan-500/15 border border-cyan-500/30 px-2 py-0.5 rounded">
                        Sekčná
                      </span>
                    </div>

                    <div className="space-y-2 pt-1">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-300">Šírka brány:</span>
                        <span className="text-cyan-400 font-extrabold text-base font-mono">
                          {typedParams.doorWidth} m
                        </span>
                      </div>
                      <input
                        type="range"
                        min="2.5"
                        max={maxSafeGateWidth}
                        step="0.1"
                        value={typedParams.doorWidth}
                        onChange={(e) => setParams({ doorWidth: parseFloat(e.target.value) })}
                        className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-700 rounded-lg"
                      />

                      <div className="flex justify-between items-center pt-1.5">
                        <span className="text-xs text-slate-300">Výška brány:</span>
                        <span className="text-cyan-400 font-extrabold text-base font-mono">
                          {typedParams.doorHeight} m
                        </span>
                      </div>
                      <input
                        type="range"
                        min="2.0"
                        max={maxSafeGateHeight}
                        step="0.1"
                        value={typedParams.doorHeight}
                        onChange={(e) => setParams({ doorHeight: parseFloat(e.target.value) })}
                        className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-700 rounded-lg"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/10">
                      <span className="text-xs text-slate-200">Stav brány v 3D (Otvorená):</span>
                      <button
                        type="button"
                        onClick={() => setParams({ doorOpen: !typedParams.doorOpen })}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition border cursor-pointer ${
                          typedParams.doorOpen
                            ? "bg-cyan-500/25 border-cyan-400 text-cyan-300"
                            : "bg-slate-800 border-white/10 text-slate-300"
                        }`}
                      >
                        {typedParams.doorOpen ? "🔓 Otvorená" : "🔒 Zatvorená"}
                      </button>
                    </div>

                    {/* Prejazdová zadná brána */}
                    <div className="flex items-center justify-between pt-2 border-t border-white/10">
                      <div>
                        <div className="text-xs text-slate-200">Zadná prejazdová brána</div>
                        <div className="text-[10px] text-white/50">Priechodná hala</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setParams({ hasBackDoor: !typedParams.hasBackDoor })}
                        className={`w-11 h-6 flex items-center rounded-full p-1 transition cursor-pointer border border-white/20 ${
                          typedParams.hasBackDoor ? "bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]" : "bg-slate-700"
                        }`}
                      >
                        <div
                          className={`bg-slate-950 w-4 h-4 rounded-full shadow-md transform transition ${
                            typedParams.hasBackDoor ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Farba brány */}
                  <HallRalColorPicker
                    label="Farba priemyselnej brány"
                    value={typedParams.sectionalDoorColor}
                    onChange={(hex) => setParams({ sectionalDoorColor: hex, sectionalDoor2Color: hex })}
                  />

                  {/* Vstupné personálne dvere a okná */}
                  <div className="rounded-xl bg-[#121824]/90 border border-white/10 p-3.5 space-y-3.5 shadow-md">
                    {/* Personálne dvere toggle */}
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
                          typedParams.hasPersonalDoor ? "bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]" : "bg-slate-700"
                        }`}
                      >
                        <div
                          className={`bg-slate-950 w-4 h-4 rounded-full shadow-md transform transition ${
                            typedParams.hasPersonalDoor ? "translate-x-6" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    {/* Nastavenie strany, rozmerov a farby dverí ak sú aktívne */}
                    {typedParams.hasPersonalDoor && (
                      <div className="pt-2 border-t border-white/10 space-y-3 bg-white/[0.02] -mx-1 p-2 rounded-lg">
                        {/* Umiestnenie dverí */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-300 font-medium">Umiestnenie dverí:</span>
                            <span className="text-cyan-400 font-bold text-xs">
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
                                      ? "border-cyan-400 bg-cyan-500/25 text-white font-bold ring-1 ring-cyan-400/40"
                                      : "border-white/15 bg-slate-800/80 text-slate-300 hover:bg-slate-700/80"
                                  } ${loc.side === "back" ? "col-span-2" : ""}`}
                                >
                                  {loc.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Rozmery a posúvanie vchodových dverí */}
                        <div className="space-y-2 pt-1 border-t border-white/10">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                                <span>Šírka dverí:</span>
                                <span className="text-cyan-400 font-bold font-mono">
                                  {typedParams.personalDoorWidth ?? 0.9} m
                                </span>
                              </div>
                              <input
                                type="range"
                                min="0.8"
                                max="1.3"
                                step="0.05"
                                value={typedParams.personalDoorWidth ?? 0.9}
                                onChange={(e) => setParams({ personalDoorWidth: parseFloat(e.target.value), doorFocus: "personalDoor" })}
                                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
                              />
                            </div>
                            <div>
                              <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                                <span>Výška dverí:</span>
                                <span className="text-cyan-400 font-bold font-mono">
                                  {typedParams.personalDoorHeight ?? 2.0} m
                                </span>
                              </div>
                              <input
                                type="range"
                                min="1.9"
                                max="2.4"
                                step="0.05"
                                value={typedParams.personalDoorHeight ?? 2.0}
                                onChange={(e) => setParams({ personalDoorHeight: parseFloat(e.target.value), doorFocus: "personalDoor" })}
                                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
                              />
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between items-center text-[11px] text-slate-300 mb-1">
                              <span>Posúvanie dverí na stene:</span>
                              <div className="flex items-center gap-1.5">
                                <span className="text-cyan-400 font-bold font-mono">
                                  {(typedParams.personalDoorOffset ?? 0) > 0 ? `+${(typedParams.personalDoorOffset ?? 0).toFixed(2)}` : (typedParams.personalDoorOffset ?? 0).toFixed(2)} m
                                </span>
                                {(typedParams.personalDoorOffset ?? 0) !== 0 && (
                                  <button
                                    type="button"
                                    onClick={() => setParams({ personalDoorOffset: 0, doorFocus: "personalDoor" })}
                                    className="text-[9px] px-1.5 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-white/70 cursor-pointer"
                                  >
                                    Stred
                                  </button>
                                )}
                              </div>
                            </div>
                            {(() => {
                              const isSideWall = typedParams.personalDoorSide === "left" || typedParams.personalDoorSide === "right";
                              const wallDim = isSideWall ? currentLength : typedParams.width;
                              const maxSlide = Math.max(2.5, Math.round((wallDim / 2 - 0.8) * 10) / 10);
                              return (
                                <input
                                  type="range"
                                  min={-maxSlide}
                                  max={maxSlide}
                                  step="0.05"
                                  value={typedParams.personalDoorOffset ?? 0}
                                  onChange={(e) => setParams({ personalDoorOffset: parseFloat(e.target.value), doorFocus: "personalDoor" })}
                                  className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
                                />
                              );
                            })()}
                          </div>
                        </div>

                        {/* Farba a povrch vchodových dverí */}
                        <div className="space-y-1.5 pt-1 border-t border-white/10">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-300 font-medium">Farba / dekor dverí:</span>
                            <span className="text-cyan-400 text-xs font-bold">
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
                                  ? "border-cyan-400 bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-400/30"
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
                                      ? "border-cyan-300 scale-105 ring-2 ring-cyan-400/50 shadow-md"
                                      : "border-white/20 hover:scale-105 hover:border-white/40"
                                  }`}
                                  style={{ backgroundColor: c.hex }}
                                >
                                  {(typedParams.doorColor ?? "#3a3f47").toLowerCase() === c.hex.toLowerCase() && (
                                    <Check className="h-3.5 w-3.5 text-cyan-400 bg-black/70 rounded-full p-0.5" />
                                  )}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Priemyselné okná */}
                    <div className="flex items-center justify-between pt-2.5 border-t border-white/10">
                      <div>
                        <div className="text-xs font-bold text-slate-100">Počet okien</div>
                        <div className="text-[11px] text-white/60">Presvetlenie interiéru haly</div>
                      </div>
                      <div className="flex gap-1.5">
                        {[0, 1, 2, 3, 4, 5, 6].map((cnt) => (
                          <button
                            key={cnt}
                            type="button"
                            onClick={() => setParams({ hasWindows: cnt > 0, windowCount: cnt })}
                            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                              (typedParams.windowCount ?? (typedParams.hasWindows ? 1 : 0)) === cnt && (cnt === 0 ? !typedParams.hasWindows : typedParams.hasWindows)
                                ? "bg-cyan-400 text-slate-950 border border-cyan-300 shadow-[0_0_8px_rgba(34,211,238,0.4)]"
                                : "bg-slate-800/80 text-slate-200 border border-white/15 hover:bg-slate-700/80"
                            }`}
                          >
                            {cnt}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Nastavenie strany a rozmerov okien ak je počet > 0 */}
                    {typedParams.hasWindows && (typedParams.windowCount ?? 1) > 0 && (
                      <div className="pt-2 border-t border-white/10 space-y-3 bg-white/[0.02] -mx-1 p-2 rounded-lg">
                        {/* Strana okien */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-300 font-medium">Umiestnenie okien:</span>
                            <span className="text-cyan-400 font-bold text-xs">
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
                                    ? "border-cyan-400 bg-cyan-500/25 text-white font-bold ring-1 ring-cyan-400/40"
                                    : "border-white/15 bg-slate-800/80 text-slate-300 hover:bg-slate-700/80"
                                }`}
                              >
                                {s.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Rozmery okna a posúvanie */}
                        <div className="space-y-2 pt-1 border-t border-white/10">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                                <span>Šírka okna:</span>
                                <span className="text-cyan-400 font-bold font-mono">
                                  {typedParams.windowWidth ?? 1.2} m
                                </span>
                              </div>
                              <input
                                type="range"
                                min="0.6"
                                max="2.5"
                                step="0.05"
                                value={typedParams.windowWidth ?? 1.2}
                                onChange={(e) => setParams({ windowWidth: parseFloat(e.target.value) })}
                                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
                              />
                            </div>
                            <div>
                              <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                                <span>Výška okna:</span>
                                <span className="text-cyan-400 font-bold font-mono">
                                  {typedParams.windowHeight ?? 0.8} m
                                </span>
                              </div>
                              <input
                                type="range"
                                min="0.4"
                                max="1.6"
                                step="0.05"
                                value={typedParams.windowHeight ?? 0.8}
                                onChange={(e) => setParams({ windowHeight: parseFloat(e.target.value) })}
                                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <div className="flex justify-between items-center text-[11px] text-slate-300 mb-1">
                                <div className="flex items-center gap-1">
                                  <span>Výška osadenia:</span>
                                  {typedParams.hasPersonalDoor && (
                                    <button
                                      type="button"
                                      title="Lícovať hornú hranu okna s dverami"
                                      onClick={() => {
                                        const doorH = typedParams.personalDoorHeight ?? 2.0;
                                        const winH = typedParams.windowHeight ?? 0.8;
                                        const aligned = Math.round((doorH - winH / 2) * 100) / 100;
                                        setParams({ windowElevation: aligned });
                                      }}
                                      className="text-[9px] px-1 py-0.5 rounded bg-cyan-800/80 hover:bg-cyan-700 text-cyan-200 transition cursor-pointer"
                                    >
                                      S dverami
                                    </button>
                                  )}
                                </div>
                                <span className="text-cyan-400 font-bold font-mono">
                                  {(typedParams.windowElevation ?? 2.0).toFixed(2)} m
                                </span>
                              </div>
                              {(() => {
                                const winH = typedParams.windowHeight ?? 0.8;
                                const maxElev = Math.max(2.0, Math.round(((typedParams.clearHeight ?? 4.0) - winH / 2 - 0.2) * 100) / 100);
                                const minElev = Math.round((winH / 2 + 0.35) * 100) / 100;
                                return (
                                  <input
                                    type="range"
                                    min={minElev}
                                    max={maxElev}
                                    step="0.05"
                                    value={typedParams.windowElevation ?? 2.0}
                                    onChange={(e) => setParams({ windowElevation: parseFloat(e.target.value) })}
                                    className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
                                  />
                                );
                              })()}
                            </div>
                            <div>
                              <div className="flex justify-between items-center text-[11px] text-slate-300 mb-1">
                                <span>Posúvanie:</span>
                                <div className="flex items-center gap-1">
                                  <span className="text-cyan-400 font-bold font-mono text-[10px]">
                                    {(typedParams.windowOffset ?? 0) > 0 ? `+${(typedParams.windowOffset ?? 0).toFixed(2)}` : (typedParams.windowOffset ?? 0).toFixed(2)}m
                                  </span>
                                  {(typedParams.windowOffset ?? 0) !== 0 && (
                                    <button
                                      type="button"
                                      onClick={() => setParams({ windowOffset: 0 })}
                                      className="text-[9px] px-1 py-0.2 rounded bg-slate-700 hover:bg-slate-600 text-white/70 cursor-pointer"
                                    >
                                      0
                                    </button>
                                  )}
                                </div>
                              </div>
                              {(() => {
                                const isSideWin = (typedParams.windowSide ?? "left") === "left" || typedParams.windowSide === "right";
                                const wallDim = isSideWin ? currentLength : typedParams.width;
                                const maxSlideWin = Math.max(2.0, Math.round((wallDim / 2 - 0.8) * 10) / 10);
                                return (
                                  <input
                                    type="range"
                                    min={-maxSlideWin}
                                    max={maxSlideWin}
                                    step="0.05"
                                    value={typedParams.windowOffset ?? 0}
                                    onChange={(e) => setParams({ windowOffset: parseFloat(e.target.value) })}
                                    className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
                                  />
                                );
                              })()}
                            </div>
                          </div>

                          {/* Farba rámu okna */}
                          <div className="space-y-1.5 pt-1 border-t border-white/10">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-slate-300 font-medium">Farba rámu okna:</span>
                              <span className="text-cyan-400 text-xs font-bold">
                                {RAL_PALETTE.find(
                                  (c) =>
                                    c.hex.toLowerCase() ===
                                    (typedParams.windowColor ?? "#2b2f36").toLowerCase()
                                )?.name ?? typedParams.windowColor ?? "RAL 7016"}
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
                                      ? "border-cyan-300 scale-105 ring-2 ring-cyan-400/50 shadow-md"
                                      : "border-white/20 hover:scale-105 hover:border-white/40"
                                  }`}
                                  style={{ backgroundColor: c.hex }}
                                >
                                  {(typedParams.windowColor ?? "#2b2f36").toLowerCase() === c.hex.toLowerCase() && (
                                    <Check className="h-3.5 w-3.5 text-cyan-400 bg-black/70 rounded-full p-0.5" />
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {(typedParams.hasPersonalDoor || typedParams.hasWindows) && (
                      <div className="pt-2.5 border-t border-white/10 space-y-1.5">
                        <label className="block text-xs font-semibold text-slate-200">
                          Poznámka k umiestneniu:
                        </label>
                        <textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          rows={2}
                          className="w-full rounded-lg border border-white/15 bg-slate-800/80 px-2.5 py-1.5 text-white/90 focus:border-cyan-400 focus:outline-none resize-none text-xs placeholder:text-white/40"
                          placeholder="Napíšte presné alebo vaše približné umiestnenie..."
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* --- TAB 5: FARBY --- */}
              {activeTab === "colors" && (
                <div className="space-y-4">
                  {/* Farba stien */}
                  <HallRalColorPicker
                    label="Farba opláštenia stien"
                    value={typedParams.claddingColor}
                    onChange={(hex) => setParams({ claddingColor: hex })}
                  />

                  {/* Farba strechy */}
                  <HallRalColorPicker
                    label="Farba strešného plášťa"
                    value={typedParams.roofColor}
                    onChange={(hex) => setParams({ roofColor: hex })}
                  />

                  {/* Farba brány */}
                  <HallRalColorPicker
                    label="Farba priemyselnej brány"
                    value={typedParams.sectionalDoorColor}
                    onChange={(hex) => setParams({ sectionalDoorColor: hex, sectionalDoor2Color: hex })}
                  />

                  {/* Farba lemovania */}
                  <HallRalColorPicker
                    label="Farba lemovania a odkvapov"
                    value={typedParams.trimmingColor}
                    onChange={(hex) => setParams({ trimmingColor: hex })}
                  />

                  {/* Farba oceľovej konštrukcie */}
                  <HallRalColorPicker
                    label="Ochranný náter oceľovej konštrukcie"
                    value={typedParams.steelColor}
                    onChange={(hex) => setParams({ steelColor: hex })}
                  />
                </div>
              )}

              {/* --- TAB 5: CAD ZOBRAZENIE --- */}
              {activeTab === "view" && (
                <div className="space-y-3">
                  {[
                    { key: "showStructure", label: "Oceľová nosná konštrukcia" },
                    { key: "showCladding", label: "Opláštenie stien & strechy" },
                    { key: "showAccessories", label: "Príslušenstvo & odkvapový systém" },
                    { key: "showFoundation", label: "Základové pätky / doska" },
                    { key: "showCatalogDimensions", label: "Kótovacie čiary A-B-C" },
                    { key: "wireframe", label: "Drôtený model (Wireframe)" },
                  ].map((v) => (
                    <div
                      key={v.key}
                      className="flex items-center justify-between p-3 rounded-xl bg-[#121824]/90 border border-white/10 shadow-sm"
                    >
                      <span className="text-slate-100 text-xs font-semibold">{v.label}</span>
                      <button
                        type="button"
                        onClick={() => {
                          if (v.key === "showCladding" && onToggleCladding) {
                            onToggleCladding();
                          } else {
                            setParams({ [v.key]: !(typedParams as any)[v.key] } as any);
                          }
                        }}
                        className={`w-11 h-6 flex items-center rounded-full p-1 transition cursor-pointer border border-white/20 ${
                          (typedParams as any)[v.key] ? "bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]" : "bg-slate-700"
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

                  {/* Exploded view rozpad */}
                  <div className="p-3 rounded-xl bg-[#121824]/90 border border-white/10 shadow-sm space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-100 font-semibold">Rozpad konštrukcie (Exploded view):</span>
                      <span className="text-cyan-400 font-bold font-mono">
                        {Math.round((typedParams.explode ?? 0) * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={typedParams.explode ?? 0}
                      onChange={(e) => setParams({ explode: parseFloat(e.target.value) })}
                      className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-700 rounded-lg"
                    />
                  </div>

                  {/* DXF AutoCAD 2D export (Iba pre admina / ?cad=1) */}
                  {canExportCad && (
                    <div className="p-3 rounded-xl bg-[#121824]/90 border border-white/10 shadow-sm space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-100 font-semibold">CAD / AutoCAD Export:</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono font-bold">
                          DXF 2D
                        </span>
                      </div>
                      <p className="text-[11px] text-white/60 leading-relaxed">
                        Technický výkres pôdorysu s kótami, osami a stĺpmi (PDF na okamžité zobrazenie alebo DXF pre CAD softvér).
                      </p>
                      <div className="grid grid-cols-2 gap-2 pt-0.5">
                        <button
                          type="button"
                          onClick={handleDownloadFloorPlanPdf}
                          className="py-2 px-2.5 rounded-lg bg-cyan-400 hover:bg-cyan-300 active:scale-[0.99] text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-md shadow-cyan-500/20"
                          title="Stiahnuť a otvoriť výkres priamo v PDF"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Výkres (PDF)</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleDownloadDxf}
                          className="py-2 px-2.5 rounded-lg bg-white/10 hover:bg-white/15 active:scale-[0.99] text-white font-semibold text-xs flex items-center justify-center gap-1.5 border border-white/15 transition cursor-pointer"
                          title="Stiahnuť pre AutoCAD / Revit"
                        >
                          <Download className="w-3.5 h-3.5 text-cyan-400" />
                          <span>AutoCAD (.DXF)</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* --- TAB 6: SÚHRN ŠPECIFIKÁCIE --- */}
              {activeTab === "summary" && (
                <div className="space-y-4">
                  <div className="rounded-xl bg-[#121824]/90 border border-white/10 p-4 space-y-3 shadow-md">
                    <div className="flex justify-between items-center pb-2.5 border-b border-white/10">
                      <span className="text-sm font-bold text-slate-100 uppercase tracking-wide">
                        Špecifikácia haly
                      </span>
                      <span className="text-sm font-extrabold text-cyan-400 font-mono bg-cyan-500/15 border border-cyan-500/30 px-2.5 py-0.5 rounded-lg">
                        {area} m²
                      </span>
                    </div>

                    <div className="rounded-lg bg-black/60 p-3.5 border border-white/5 space-y-2.5 text-sm text-slate-200">
                      <div className="flex justify-between items-center py-0.5 border-b border-white/5">
                        <span className="text-white/60 font-medium">Model haly:</span>
                        <span className="font-bold text-cyan-400">{selectedHall}</span>
                      </div>
                      <div className="flex justify-between items-center py-0.5 border-b border-white/5">
                        <span className="text-white/60 font-medium">Pôdorys (Š × D):</span>
                        <span className="text-cyan-300 font-bold font-mono text-base">
                          {typedParams.width} × {currentLength} m ({bayCount} polí)
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-0.5 border-b border-white/5">
                        <span className="text-white/60 font-medium">Svetlá výška (Z):</span>
                        <span className="text-white font-semibold">{typedParams.clearHeight} m</span>
                      </div>
                      <div className="flex justify-between items-center py-0.5 border-b border-white/5">
                        <span className="text-white/60 font-medium">Strecha:</span>
                        <span className="text-white font-semibold">
                          {typedParams.roofType === "gable" ? "Sedlová" : "Pultová"} ({typedParams.roofPitchDeg}°)
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-0.5 border-b border-white/5">
                        <span className="text-white/60 font-medium">Opláštenie stien:</span>
                        <span className="text-white font-semibold">
                          {typedParams.panelType === "sandwich"
                            ? `Sendvič PIR ${typedParams.wallPanelThicknessMm ?? 100}mm (${(typedParams.claddingOrientation ?? "horizontal") === "horizontal" ? "pozdĺžne" : "priečne"})`
                            : `Trapézový plech (${(typedParams.claddingOrientation ?? "horizontal") === "horizontal" ? "pozdĺžne" : "priečne"})`}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-0.5 border-b border-white/5">
                        <span className="text-white/60 font-medium">Strešný plášť:</span>
                        <span className="text-white font-semibold">
                          {typedParams.roofPanelType === "sandwich"
                            ? `Sendvič PIR ${typedParams.roofPanelThicknessMm ?? 120}mm`
                            : "Trapézový plech"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-0.5 border-b border-white/5">
                        <span className="text-white/60 font-medium">Brána:</span>
                        <span className="text-white font-semibold">
                          {typedParams.doorWidth} × {typedParams.doorHeight} m (Sekčná)
                          {typedParams.hasBackDoor ? " + zadná" : ""}
                        </span>
                      </div>
                      {(typedParams.hasPersonalDoor || (typedParams.windowCount ?? 0) > 0) && (
                        <div className="flex justify-between items-center py-0.5">
                          <span className="text-white/60 font-medium">Výplne:</span>
                          <span className="text-white font-semibold">
                            {typedParams.hasPersonalDoor ? "Dvere" : ""}
                            {typedParams.hasPersonalDoor && (typedParams.windowCount ?? 0) > 0 ? " + " : ""}
                            {(typedParams.windowCount ?? 0) > 0 ? `${typedParams.windowCount}× okno` : ""}
                          </span>
                        </div>
                      )}
                    </div>



                    <div>
                      <label className="block mb-1 text-[10px] text-white/60 uppercase tracking-wider font-semibold">
                        Poznámka k dopytu:
                      </label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={2}
                        className="w-full rounded border border-white/10 bg-black/50 px-2.5 py-1.5 text-white/90 focus:border-cyan-400 focus:outline-none resize-none text-[11px]"
                        placeholder="Požiadavky na montáž, lokalitu stavby, zaťaženie snehom..."
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => setQuoteRequestSignal((v) => v + 1)}
                      className="w-full h-11 rounded-xl bg-cyan-400 text-center font-extrabold text-slate-950 transition hover:bg-cyan-300 active:scale-[0.99] shadow-lg shadow-cyan-500/25 text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer mt-1"
                    >
                      Dopytovať cenovú ponuku haly
                    </button>

                    {canExportCad && (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={handleDownloadFloorPlanPdf}
                          className="py-2 px-2 rounded-lg bg-cyan-400/15 hover:bg-cyan-400/25 text-cyan-300 hover:text-white text-[11px] font-semibold flex items-center justify-center gap-1.5 border border-cyan-400/30 transition cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Výkres (PDF)</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleDownloadDxf}
                          className="py-2 px-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 hover:text-white text-[11px] font-medium flex items-center justify-center gap-1.5 border border-white/10 transition cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5 text-cyan-400" />
                          <span>CAD (.DXF)</span>
                        </button>
                      </div>
                    )}

                    {onOpenComparison && (
                      <button
                        type="button"
                        onClick={onOpenComparison}
                        className="w-full py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-cyan-300 hover:text-white text-[11px] font-medium flex items-center justify-center gap-1.5 border border-cyan-500/20 transition cursor-pointer"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Porovnať varianty vedľa seba</span>
                      </button>
                    )}
                  </div>
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
                  className="px-4 py-1.5 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold shadow-md shadow-cyan-500/20 transition flex items-center gap-1.5 cursor-pointer ml-auto active:scale-95"
                >
                  <span>Ďalej: {WIZARD_STEPS[WIZARD_STEPS.findIndex((s) => s.id === activeTab) + 1]?.title}</span>
                  <span>➔</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setQuoteRequestSignal((v) => v + 1)}
                  className="px-4 py-1.5 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold shadow-lg shadow-cyan-500/25 transition flex items-center gap-1.5 cursor-pointer ml-auto active:scale-95"
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
