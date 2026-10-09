import React from "react";
import { DEFAULT_PARAMS, type GarageParams } from "@/lib/garage/types";
import type { HallConfig } from "@/lib/garage/configHelper";

type ViewPreset = "iso" | "plan" | "front" | "side";

interface TopNavigationProps {
  isMobile: boolean;
  selectedHall: string;
  applyHallType: (hall: string) => void;
  hallsConfig: Record<string, HallConfig>;
  setShowPicker: (show: boolean) => void;
  preset: ViewPreset;
  setPreset: (preset: ViewPreset) => void;
  showEnvironment: boolean;
  setShowEnvironment: React.Dispatch<React.SetStateAction<boolean>>;
  setShowArModal: (show: boolean) => void;
  handleShare: () => void;
  typedParams: GarageParams;
}

export function TopNavigation({
  isMobile,
  selectedHall,
  applyHallType,
  hallsConfig,
  setShowPicker,
  preset,
  setPreset,
  showEnvironment,
  setShowEnvironment,
  setShowArModal,
  handleShare,
  typedParams,
}: TopNavigationProps) {
  const isCustom = selectedHall === "Vlastný" || selectedHall === "vlastna_garaz";

  return (
    <div className="absolute left-0 right-0 top-0 z-20 flex flex-col md:flex-row items-start md:items-center justify-between gap-2 border-b border-white/10 bg-black/40 px-3 md:px-6 py-2 md:py-3 backdrop-blur-md">
      <div className="flex items-center justify-between w-full md:w-auto gap-2 md:gap-3">
        <div className="flex items-center gap-2">
          <div
            className={`h-2 w-2 rounded-full ${
              isCustom
                ? "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]"
                : "bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.8)]"
            }`}
          />
          <h1 className="font-mono text-xs md:text-sm tracking-widest text-white/90 font-bold whitespace-nowrap">
            {isMobile ? "STEEL GARAGE" : "STEEL GARAGE — PARAMETRIC CAD"}
          </h1>
          {!isMobile && (
            <span className="rounded border border-white/10 px-2 py-0.5 font-mono text-[10px] text-white/50">
              v1.0
            </span>
          )}
        </div>
        {/* Quick Product Switcher */}
        <div className="flex items-center gap-1 rounded border border-white/10 bg-black/40 px-1.5 py-0.5 max-w-[58%] sm:max-w-none">
          <span className="text-[10px] font-mono text-white/50 uppercase hidden md:inline">
            Produkt:
          </span>
          <select
            value={selectedHall}
            onChange={(e) => applyHallType(e.target.value)}
            className={`min-w-0 max-w-[125px] sm:max-w-none rounded bg-[#161b22] px-1.5 py-0.5 font-mono text-[11px] font-bold outline-none cursor-pointer transition truncate border ${
              isCustom
                ? "text-emerald-400 border-emerald-500/30 hover:border-emerald-400"
                : "text-cyan-400 border-cyan-500/30 hover:border-cyan-400"
            }`}
          >
            <option value="Vlastný">Vlastná garáž</option>
            <optgroup label="Oceľové haly GTG">
              {Object.keys(hallsConfig).map((name) => (
                <option key={name} value={name}>
                  {name} (Katalóg)
                </option>
              ))}
            </optgroup>
          </select>
          <button
            onClick={() => setShowPicker(true)}
            className={`flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10px] font-bold transition cursor-pointer shrink-0 border ${
              isCustom
                ? "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/40"
                : "bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border-cyan-500/40"
            }`}
            title="Otvoriť vizuálny výber produktov z katalógu"
          >
            <span>⊞</span>
            <span className="hidden sm:inline">Katalóg</span>
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between md:justify-end gap-1 w-full md:w-auto">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {(["iso", "plan", "front", "side"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setPreset(v)}
              className={`rounded px-2 md:px-3 py-1 font-mono text-[10px] md:text-xs uppercase tracking-wider transition ${
                preset === v
                  ? isCustom
                    ? "bg-emerald-400/20 text-emerald-300 ring-1 ring-emerald-400/40"
                    : "bg-cyan-400/20 text-cyan-300 ring-1 ring-cyan-400/40"
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              }`}
            >
              {v === "iso"
                ? isMobile
                  ? "ISO"
                  : "Axonometria"
                : v === "plan"
                ? isMobile
                  ? "PÔD"
                  : "Pôdorys"
                : v === "front"
                ? isMobile
                  ? "Čelo"
                  : "Čelo"
                : isMobile
                ? "Bok"
                : "Bok"}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowEnvironment((v) => !v)}
          title={showEnvironment ? "Vypnúť okolie haly" : "Zapnúť okolie haly"}
          className={`ml-1 md:ml-2 rounded px-2 py-1 font-mono text-[10px] md:text-xs transition shrink-0 ring-1 ${
            showEnvironment
              ? isCustom
                ? "bg-emerald-400/20 text-emerald-300 ring-emerald-400/40"
                : "bg-cyan-400/20 text-cyan-300 ring-cyan-400/40"
              : "text-white/60 ring-white/10 hover:bg-white/5"
          }`}
        >
          🌳{!isMobile && " Okolie"}
        </button>
        <button
          onClick={() => setShowArModal(true)}
          title="Zobraziť v rozšírenej realite (AR) alebo stiahnuť 3D model"
          className={`ml-1 md:ml-2 flex items-center gap-1 rounded px-2 md:px-3 py-1 font-mono text-[10px] md:text-xs uppercase tracking-wider ring-1 transition shrink-0 cursor-pointer ${
            isCustom
              ? "bg-emerald-400/20 text-emerald-300 ring-emerald-400/40 hover:bg-emerald-400/30"
              : "bg-cyan-400/20 text-cyan-300 ring-cyan-400/40 hover:bg-cyan-400/30"
          }`}
        >
          📱 AR
        </button>
        <button
          onClick={handleShare}
          className={`ml-1 md:ml-2 flex items-center gap-1 rounded px-2 md:px-3 py-1 font-mono text-[10px] md:text-xs uppercase tracking-wider ring-1 transition shrink-0 ${
            isCustom
              ? "bg-emerald-400/20 text-emerald-300 ring-emerald-400/40 hover:bg-emerald-400/30"
              : "bg-cyan-400/20 text-cyan-300 ring-cyan-400/40 hover:bg-cyan-400/30"
          }`}
        >
          Zdieľať
        </button>
      </div>
      {!isMobile && (
        <div className="font-mono text-[10px] text-white/40">
          {(typedParams.width ?? DEFAULT_PARAMS.width).toFixed(1)} ×{" "}
          {(typedParams.length ?? DEFAULT_PARAMS.length).toFixed(1)} ×{" "}
          {(typedParams.clearHeight ?? DEFAULT_PARAMS.clearHeight).toFixed(1)} m
        </div>
      )}
    </div>
  );
}
