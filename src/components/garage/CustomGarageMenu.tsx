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

type TabType = "dimensions" | "roof" | "doors" | "colors" | "extension" | "view";

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

  return (
    <>
      <Leva hidden />
      <div
        className={`quote-export-panel absolute right-3 top-[132px] md:top-28 z-30 max-h-[calc(100vh-150px)] md:max-h-[76vh] flex flex-col rounded-xl bg-[#0b0e14]/95 shadow-2xl border border-emerald-500/30 backdrop-blur-md transition-all duration-300 ${
        showControls
          ? "opacity-100 translate-x-0 pointer-events-auto"
          : "opacity-0 translate-x-12 pointer-events-none"
      } md:w-[350px] w-[calc(100vw-24px)] max-w-[380px]`}
    >
      {/* 1. STICKY HEADER */}
      <div className="shrink-0 p-3.5 border-b border-white/10 bg-[#10151f] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <div>
            <div className="text-xs font-mono font-bold text-white tracking-wider uppercase flex items-center gap-1.5">
              <span>Vlastná garáž</span>
              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/30">
                NA MIERU
              </span>
            </div>
            <div className="text-[10px] font-mono text-white/50 mt-0.5">
              {typedParams.width} × {typedParams.length} m · {area} m²
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setQuoteRequestSignal((v) => v + 1)}
          className="rounded bg-emerald-400/90 hover:bg-emerald-300 text-slate-950 font-mono text-[10px] font-bold px-2.5 py-1 transition cursor-pointer active:scale-95 shadow-sm"
        >
          Dopyt
        </button>
      </div>

      {/* 2. SUB-NAVIGATION TABS */}
      <div className="shrink-0 grid grid-cols-6 border-b border-white/10 bg-[#0d1118] text-[10px] font-mono">
        <button
          type="button"
          onClick={() => setActiveTab("dimensions")}
          title="Rozmery"
          className={`flex flex-col items-center justify-center py-2 border-r border-white/5 transition cursor-pointer ${
            activeTab === "dimensions"
              ? "bg-emerald-500/20 text-emerald-300 border-b-2 border-b-emerald-400 font-bold"
              : "text-white/50 hover:bg-white/5 hover:text-white"
          }`}
        >
          <Ruler className="h-3.5 w-3.5 mb-0.5" />
          <span>Rozmer</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("roof")}
          title="Strecha a atika"
          className={`flex flex-col items-center justify-center py-2 border-r border-white/5 transition cursor-pointer ${
            activeTab === "roof"
              ? "bg-emerald-500/20 text-emerald-300 border-b-2 border-b-emerald-400 font-bold"
              : "text-white/50 hover:bg-white/5 hover:text-white"
          }`}
        >
          <Home className="h-3.5 w-3.5 mb-0.5" />
          <span>Strecha</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("doors")}
          title="Brány a dvere"
          className={`flex flex-col items-center justify-center py-2 border-r border-white/5 transition cursor-pointer ${
            activeTab === "doors"
              ? "bg-emerald-500/20 text-emerald-300 border-b-2 border-b-emerald-400 font-bold"
              : "text-white/50 hover:bg-white/5 hover:text-white"
          }`}
        >
          <DoorClosed className="h-3.5 w-3.5 mb-0.5" />
          <span>Brány</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("colors")}
          title="Farby a opláštenie"
          className={`flex flex-col items-center justify-center py-2 border-r border-white/5 transition cursor-pointer ${
            activeTab === "colors"
              ? "bg-emerald-500/20 text-emerald-300 border-b-2 border-b-emerald-400 font-bold"
              : "text-white/50 hover:bg-white/5 hover:text-white"
          }`}
        >
          <Palette className="h-3.5 w-3.5 mb-0.5" />
          <span>Farby</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("extension")}
          title="Modul / Prístrešok"
          className={`flex flex-col items-center justify-center py-2 border-r border-white/5 transition cursor-pointer ${
            activeTab === "extension"
              ? "bg-emerald-500/20 text-emerald-300 border-b-2 border-b-emerald-400 font-bold"
              : "text-white/50 hover:bg-white/5 hover:text-white"
          }`}
        >
          <PlusSquare className="h-3.5 w-3.5 mb-0.5" />
          <span>Modul</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("view")}
          title="Zobrazenie CAD"
          className={`flex flex-col items-center justify-center py-2 transition cursor-pointer ${
            activeTab === "view"
              ? "bg-emerald-500/20 text-emerald-300 border-b-2 border-b-emerald-400 font-bold"
              : "text-white/50 hover:bg-white/5 hover:text-white"
          }`}
        >
          <Eye className="h-3.5 w-3.5 mb-0.5" />
          <span>CAD</span>
        </button>
      </div>

      {/* 3. SCROLLABLE TAB CONTENT */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs">
        {/* --- TAB 1: ROZMERY --- */}
        {activeTab === "dimensions" && (
          <div className="space-y-4">
            {/* Šírka */}
            <div className="rounded-lg bg-black/40 border border-white/5 p-3 space-y-2">
              <div className="flex justify-between items-center text-white/80">
                <span className="text-[11px] text-white/60">Šírka X:</span>
                <span className="text-emerald-400 font-bold text-sm">
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
                className="w-full accent-emerald-400 cursor-pointer"
              />
              <div className="flex gap-1.5 pt-1">
                {[3.0, 4.0, 5.0, 6.0, 7.0].map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setParams({ width: w })}
                    className={`flex-1 py-1 rounded text-[10px] transition cursor-pointer ${
                      typedParams.width === w
                        ? "bg-emerald-400 text-black font-bold"
                        : "bg-white/5 hover:bg-white/10 text-white/70"
                    }`}
                  >
                    {w}m
                  </button>
                ))}
              </div>
            </div>

            {/* Dĺžka */}
            <div className="rounded-lg bg-black/40 border border-white/5 p-3 space-y-2">
              <div className="flex justify-between items-center text-white/80">
                <span className="text-[11px] text-white/60">Dĺžka Y:</span>
                <span className="text-emerald-400 font-bold text-sm">
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
                className="w-full accent-emerald-400 cursor-pointer"
              />
              <div className="flex gap-1.5 pt-1">
                {[5.0, 6.0, 7.0, 8.0, 10.0].map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setParams({ length: l })}
                    className={`flex-1 py-1 rounded text-[10px] transition cursor-pointer ${
                      typedParams.length === l
                        ? "bg-emerald-400 text-black font-bold"
                        : "bg-white/5 hover:bg-white/10 text-white/70"
                    }`}
                  >
                    {l}m
                  </button>
                ))}
              </div>
            </div>

            {/* Svetlá výška */}
            <div className="rounded-lg bg-black/40 border border-white/5 p-3 space-y-2">
              <div className="flex justify-between items-center text-white/80">
                <span className="text-[11px] text-white/60">Svetlá výška Z:</span>
                <span className="text-emerald-400 font-bold text-sm">
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
                className="w-full accent-emerald-400 cursor-pointer"
              />
              <div className="flex gap-1.5 pt-1">
                {[2.2, 2.4, 2.6, 2.8, 3.0].map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setParams({ clearHeight: h })}
                    className={`flex-1 py-1 rounded text-[10px] transition cursor-pointer ${
                      typedParams.clearHeight === h
                        ? "bg-emerald-400 text-black font-bold"
                        : "bg-white/5 hover:bg-white/10 text-white/70"
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
            <div className="rounded-lg bg-black/40 border border-white/5 p-3 space-y-2.5">
              <label className="text-[11px] text-white/60 block">Typ strechy:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setParams({ roofType: "gable" })}
                  className={`py-2 px-3 rounded-lg border text-center transition cursor-pointer ${
                    typedParams.roofType === "gable"
                      ? "border-emerald-400 bg-emerald-500/20 text-white font-bold ring-1 ring-emerald-400/40"
                      : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
                  }`}
                >
                  <div className="text-sm">🏠 Sedlová</div>
                  <div className="text-[10px] opacity-70">Obojstranný spád</div>
                </button>
                <button
                  type="button"
                  onClick={() => setParams({ roofType: "shed" })}
                  className={`py-2 px-3 rounded-lg border text-center transition cursor-pointer ${
                    typedParams.roofType === "shed"
                      ? "border-emerald-400 bg-emerald-500/20 text-white font-bold ring-1 ring-emerald-400/40"
                      : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
                  }`}
                >
                  <div className="text-sm">📐 Pultová</div>
                  <div className="text-[10px] opacity-70">Jednostranný spád</div>
                </button>
              </div>
            </div>

            {/* Sklon strechy */}
            <div className="rounded-lg bg-black/40 border border-white/5 p-3 space-y-2">
              <div className="flex justify-between items-center text-white/80">
                <span className="text-[11px] text-white/60">Sklon strechy:</span>
                <span className="text-emerald-400 font-bold text-sm">
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
                className="w-full accent-emerald-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-white/40">
                <span>5° (Minimálny)</span>
                <span>15° (Štandard)</span>
                <span>25° (Strmý)</span>
              </div>
            </div>

            {/* Atika (Moderný kubický vzhľad) */}
            <div className="rounded-lg bg-black/40 border border-white/5 p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white">Atika (Kubický štýl)</div>
                  <div className="text-[10px] text-white/50">Skryté spádovanie strechy</div>
                </div>
                <button
                  type="button"
                  onClick={() => setParams({ hasAttic: !typedParams.hasAttic })}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition cursor-pointer ${
                    typedParams.hasAttic ? "bg-emerald-400" : "bg-white/20"
                  }`}
                >
                  <div
                    className={`bg-black w-4 h-4 rounded-full shadow-md transform transition ${
                      typedParams.hasAttic ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
              {typedParams.hasAttic && (
                <div className="pt-2 border-t border-white/5 space-y-1.5">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-white/60">Výška atiky:</span>
                    <span className="text-emerald-400 font-bold">
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
                    className="w-full accent-emerald-400 cursor-pointer"
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
            <div className="rounded-lg bg-black/40 border border-white/5 p-3 space-y-2">
              <label className="text-[11px] text-white/60 block">Počet brán:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setParams({ gateCount: 1 })}
                  className={`py-1.5 rounded border text-center transition cursor-pointer ${
                    typedParams.gateCount !== 2
                      ? "border-emerald-400 bg-emerald-500/20 text-white font-bold"
                      : "border-white/10 bg-white/5 text-white/60"
                  }`}
                >
                  1 brána
                </button>
                <button
                  type="button"
                  onClick={() => setParams({ gateCount: 2 })}
                  className={`py-1.5 rounded border text-center transition cursor-pointer ${
                    typedParams.gateCount === 2
                      ? "border-emerald-400 bg-emerald-500/20 text-white font-bold"
                      : "border-white/10 bg-white/5 text-white/60"
                  }`}
                >
                  2 brány (Dvojgaráž)
                </button>
              </div>
            </div>

            {/* Typ brány */}
            <div className="rounded-lg bg-black/40 border border-white/5 p-3 space-y-2">
              <label className="text-[11px] text-white/60 block">Typ brány:</label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: "sectional", label: "Sekčná" },
                  { id: "upAndOver", label: "Výklopná" },
                  { id: "doubleLeaf", label: "Krídlová" },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setParams({ gateType: t.id as any })}
                    className={`py-1.5 rounded border text-center transition cursor-pointer text-[10px] ${
                      (typedParams.gateType ?? "sectional") === t.id
                        ? "border-emerald-400 bg-emerald-500/20 text-white font-bold"
                        : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Rozmery brány */}
            <div className="rounded-lg bg-black/40 border border-white/5 p-3 space-y-2">
              <div className="flex justify-between items-center text-white/80">
                <span className="text-[11px] text-white/60">Šírka brány:</span>
                <span className="text-emerald-400 font-bold">{typedParams.doorWidth} m</span>
              </div>
              <input
                type="range"
                min="2.0"
                max={typedParams.gateCount === 2 ? 3.0 : 5.0}
                step="0.1"
                value={typedParams.doorWidth}
                onChange={(e) => setParams({ doorWidth: parseFloat(e.target.value) })}
                className="w-full accent-emerald-400 cursor-pointer"
              />
              <div className="flex justify-between items-center text-white/80 pt-1">
                <span className="text-[11px] text-white/60">Výška brány:</span>
                <span className="text-emerald-400 font-bold">{typedParams.doorHeight} m</span>
              </div>
              <input
                type="range"
                min="1.9"
                max="3.2"
                step="0.1"
                value={typedParams.doorHeight}
                onChange={(e) => setParams({ doorHeight: parseFloat(e.target.value) })}
                className="w-full accent-emerald-400 cursor-pointer"
              />
            </div>

            {/* Dvere a okná toggles */}
            <div className="rounded-lg bg-black/40 border border-white/5 p-3 space-y-3">
              {/* Bočné vstupné dvere */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white">Vchodové dvere</div>
                  <div className="text-[10px] text-white/50">Samostatný bočný vstup</div>
                </div>
                <button
                  type="button"
                  onClick={() => setParams({ hasPersonalDoor: !typedParams.hasPersonalDoor })}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition cursor-pointer ${
                    typedParams.hasPersonalDoor ? "bg-emerald-400" : "bg-white/20"
                  }`}
                >
                  <div
                    className={`bg-black w-4 h-4 rounded-full shadow-md transform transition ${
                      typedParams.hasPersonalDoor ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Okná */}
              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <div>
                  <div className="text-xs font-bold text-white">Počet okien</div>
                  <div className="text-[10px] text-white/50">Presvetlenie interiéru</div>
                </div>
                <div className="flex gap-1">
                  {[0, 1, 2, 3].map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setParams({ hasWindows: cnt > 0, windowCount: cnt })}
                      className={`w-6 h-6 rounded text-[10px] font-bold transition cursor-pointer ${
                        typedParams.windowCount === cnt
                          ? "bg-emerald-400 text-black"
                          : "bg-white/5 text-white/60 hover:bg-white/10"
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
            <div className="rounded-lg bg-black/40 border border-white/5 p-3 space-y-2">
              <label className="text-[11px] text-white/60 block">Opláštenie stien:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setParams({ panelType: "sandwich" })}
                  className={`py-2 px-2.5 rounded border text-center transition cursor-pointer ${
                    typedParams.panelType === "sandwich"
                      ? "border-emerald-400 bg-emerald-500/20 text-white font-bold"
                      : "border-white/10 bg-white/5 text-white/60"
                  }`}
                >
                  <div className="text-xs">Sendvičový panel</div>
                  <div className="text-[10px] opacity-70">Zateplená (PUR)</div>
                </button>
                <button
                  type="button"
                  onClick={() => setParams({ panelType: "trapezoid" })}
                  className={`py-2 px-2.5 rounded border text-center transition cursor-pointer ${
                    typedParams.panelType === "trapezoid"
                      ? "border-emerald-400 bg-emerald-500/20 text-white font-bold"
                      : "border-white/10 bg-white/5 text-white/60"
                  }`}
                >
                  <div className="text-xs">Trapézový plech</div>
                  <div className="text-[10px] opacity-70">Nezateplená</div>
                </button>
              </div>
              {typedParams.panelType === "sandwich" && (
                <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
                  <span className="text-white/60">Hrúbka PUR jadra:</span>
                  <div className="flex gap-1">
                    {[40, 60, 80, 100].map((th) => (
                      <button
                        key={th}
                        type="button"
                        onClick={() => setParams({ wallPanelThicknessMm: th })}
                        className={`px-2 py-0.5 rounded text-[10px] transition cursor-pointer ${
                          typedParams.wallPanelThicknessMm === th
                            ? "bg-emerald-400 text-black font-bold"
                            : "bg-white/5 text-white/70"
                        }`}
                      >
                        {th}mm
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Farba stien */}
            <div className="rounded-lg bg-black/40 border border-white/5 p-3 space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[11px] text-white/60">Farba stien:</label>
                <span className="text-emerald-400 text-[10px] font-bold">
                  {RAL_PALETTE.find((c) => c.hex.toLowerCase() === typedParams.claddingColor?.toLowerCase())?.name ?? typedParams.claddingColor}
                </span>
              </div>
              <div className="grid grid-cols-7 gap-1.5 pt-1">
                {RAL_PALETTE.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setParams({ claddingColor: c.hex })}
                    title={c.name}
                    className={`h-7 rounded border transition cursor-pointer relative flex items-center justify-center ${
                      typedParams.claddingColor?.toLowerCase() === c.hex.toLowerCase()
                        ? "border-emerald-400 scale-105 ring-2 ring-emerald-400/50"
                        : "border-white/20 hover:scale-105"
                    }`}
                    style={{ backgroundColor: c.hex }}
                  >
                    {typedParams.claddingColor?.toLowerCase() === c.hex.toLowerCase() && (
                      <Check className="h-3 w-3 text-emerald-400 bg-black/60 rounded-full" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Farba strechy */}
            <div className="rounded-lg bg-black/40 border border-white/5 p-3 space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[11px] text-white/60">Farba strechy:</label>
                <span className="text-emerald-400 text-[10px] font-bold">
                  {RAL_PALETTE.find((c) => c.hex.toLowerCase() === typedParams.roofColor?.toLowerCase())?.name ?? typedParams.roofColor}
                </span>
              </div>
              <div className="grid grid-cols-7 gap-1.5 pt-1">
                {RAL_PALETTE.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setParams({ roofColor: c.hex })}
                    title={c.name}
                    className={`h-7 rounded border transition cursor-pointer relative flex items-center justify-center ${
                      typedParams.roofColor?.toLowerCase() === c.hex.toLowerCase()
                        ? "border-emerald-400 scale-105 ring-2 ring-emerald-400/50"
                        : "border-white/20 hover:scale-105"
                    }`}
                    style={{ backgroundColor: c.hex }}
                  >
                    {typedParams.roofColor?.toLowerCase() === c.hex.toLowerCase() && (
                      <Check className="h-3 w-3 text-emerald-400 bg-black/60 rounded-full" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Farba brány */}
            <div className="rounded-lg bg-black/40 border border-white/5 p-3 space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[11px] text-white/60">Farba garážovej brány:</label>
                <span className="text-emerald-400 text-[10px] font-bold">
                  {RAL_PALETTE.find((c) => c.hex.toLowerCase() === typedParams.sectionalDoorColor?.toLowerCase())?.name ?? typedParams.sectionalDoorColor}
                </span>
              </div>
              <div className="grid grid-cols-7 gap-1.5 pt-1">
                {RAL_PALETTE.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setParams({ sectionalDoorColor: c.hex, sectionalDoor2Color: c.hex })}
                    title={c.name}
                    className={`h-7 rounded border transition cursor-pointer relative flex items-center justify-center ${
                      typedParams.sectionalDoorColor?.toLowerCase() === c.hex.toLowerCase()
                        ? "border-emerald-400 scale-105 ring-2 ring-emerald-400/50"
                        : "border-white/20 hover:scale-105"
                    }`}
                    style={{ backgroundColor: c.hex }}
                  >
                    {typedParams.sectionalDoorColor?.toLowerCase() === c.hex.toLowerCase() && (
                      <Check className="h-3 w-3 text-emerald-400 bg-black/60 rounded-full" />
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
            <div className="rounded-lg bg-black/40 border border-white/5 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white">Prídavný bočný modul</div>
                  <div className="text-[10px] text-white/50">Carport / 2. garáž / sklad</div>
                </div>
                <button
                  type="button"
                  onClick={() => setParams({ hasExtension: !typedParams.hasExtension })}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition cursor-pointer ${
                    typedParams.hasExtension ? "bg-emerald-400" : "bg-white/20"
                  }`}
                >
                  <div
                    className={`bg-black w-4 h-4 rounded-full shadow-md transform transition ${
                      typedParams.hasExtension ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {typedParams.hasExtension && (
                <div className="pt-2 border-t border-white/5 space-y-3">
                  <div>
                    <label className="text-[11px] text-white/60 block mb-1">Využitie modulu:</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { id: "carport", label: "Carport" },
                        { id: "garage", label: "2. garáž" },
                        { id: "storage", label: "Sklad" },
                      ].map((ex) => (
                        <button
                          key={ex.id}
                          type="button"
                          onClick={() => setParams({ extensionType: ex.id as any })}
                          className={`py-1.5 rounded border text-center transition cursor-pointer text-[10px] ${
                            (typedParams.extensionType ?? "carport") === ex.id
                              ? "border-emerald-400 bg-emerald-500/20 text-white font-bold"
                              : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
                          }`}
                        >
                          {ex.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-white/60 block mb-1">Strana pripojenia:</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setParams({ extensionSide: "right" })}
                        className={`py-1.5 rounded border text-center transition cursor-pointer ${
                          typedParams.extensionSide !== "left"
                            ? "border-emerald-400 bg-emerald-500/20 text-white font-bold"
                            : "border-white/10 bg-white/5 text-white/60"
                        }`}
                      >
                        Vpravo
                      </button>
                      <button
                        type="button"
                        onClick={() => setParams({ extensionSide: "left" })}
                        className={`py-1.5 rounded border text-center transition cursor-pointer ${
                          typedParams.extensionSide === "left"
                            ? "border-emerald-400 bg-emerald-500/20 text-white font-bold"
                            : "border-white/10 bg-white/5 text-white/60"
                        }`}
                      >
                        Vľavo
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-white/80">
                      <span className="text-[11px] text-white/60">Šírka prístrešku:</span>
                      <span className="text-emerald-400 font-bold">
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
                      className="w-full accent-emerald-400 cursor-pointer"
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
                className="flex items-center justify-between p-2.5 rounded-lg bg-black/40 border border-white/5"
              >
                <span className="text-white/80 text-xs">{v.label}</span>
                <button
                  type="button"
                  onClick={() => setParams({ [v.key]: !(typedParams as any)[v.key] } as any)}
                  className={`w-9 h-5 flex items-center rounded-full p-0.5 transition cursor-pointer ${
                    (typedParams as any)[v.key] ? "bg-emerald-400" : "bg-white/20"
                  }`}
                >
                  <div
                    className={`bg-black w-4 h-4 rounded-full shadow-md transform transition ${
                      (typedParams as any)[v.key] ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. BOTTOM ACCORDION SUMMARY & CTA */}
      <div className="shrink-0 border-t border-white/10 bg-[#10151f]">
        <button
          type="button"
          onClick={() => setIsSummaryOpen((v) => !v)}
          className="flex w-full items-center justify-between px-3.5 py-2.5 text-xs font-mono font-bold uppercase tracking-wider text-white/90 hover:bg-white/5 transition cursor-pointer select-none"
        >
          <span className="flex items-center gap-2">
            <span className="text-[10px] text-emerald-400">
              {isSummaryOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
            </span>
            Súhrn konfigurácie
          </span>
          <span className="text-[11px] font-bold text-emerald-400 font-mono">
            {area} m²
          </span>
        </button>

        {isSummaryOpen && (
          <div className="p-3.5 pt-1 space-y-2.5 text-[11px] font-mono border-t border-white/5">
            <div className="rounded-lg bg-black/50 p-2.5 border border-white/5 space-y-1 text-white/80">
              <div className="flex justify-between">
                <span className="text-white/50">Model:</span>
                <span className="font-bold text-emerald-400">Vlastná garáž</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Rozmery:</span>
                <span className="text-white font-medium">{typedParams.width} × {typedParams.length} m</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Strecha:</span>
                <span className="text-white font-medium">
                  {typedParams.roofType === "gable" ? "Sedlová" : "Pultová"} ({typedParams.roofPitchDeg}°)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Opláštenie:</span>
                <span className="text-white font-medium">
                  {typedParams.panelType === "sandwich" ? `Sendvič ${typedParams.wallPanelThicknessMm}mm` : "Trapéz"}
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

            <div>
              <label className="block mb-1 text-[10px] text-white/60 uppercase tracking-wider font-semibold">
                Poznámka k dopytu:
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-white/10 bg-black/60 px-2.5 py-1.5 text-white/90 focus:border-emerald-400 focus:outline-none resize-none text-[11px]"
                placeholder="Lokalita stavby, špecifické požiadavky..."
              />
            </div>

            <button
              type="button"
              onClick={() => setQuoteRequestSignal((v) => v + 1)}
              className="w-full h-11 rounded-lg bg-emerald-400 text-center font-bold text-slate-950 transition hover:bg-emerald-300 active:scale-[0.99] shadow-lg shadow-emerald-500/20 text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
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
