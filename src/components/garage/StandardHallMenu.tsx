import React, { useState } from "react";
import { Leva } from "leva";
import type { GarageParams } from "@/lib/garage/types";
import { ChevronDown, ChevronUp } from "lucide-react";

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
}

const levaTheme = {
  colors: {
    elevation1: "#0e1116",
    elevation2: "#161b22",
    elevation3: "#1f2630",
    accent1: "#22d3ee",
    accent2: "#06b6d4",
    accent3: "#0891b2",
    highlight1: "#9ca3af",
    highlight2: "#e5e7eb",
    highlight3: "#ffffff",
  },
  sizes: { rootWidth: "100%", controlWidth: "45%" },
  fonts: { mono: "ui-monospace, SFMono-Regular, Menlo, monospace" },
};

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
}: StandardHallMenuProps) {
  const [isMobileMinimized, setIsMobileMinimized] = useState<boolean>(false);

  return (
    <div
      className={`quote-export-panel absolute z-30 flex flex-col rounded-2xl bg-[#0e1116]/95 shadow-2xl border border-cyan-500/40 shadow-cyan-950/40 transition-all duration-300 ${
        showControls
          ? "opacity-100 translate-y-0 md:translate-x-0 pointer-events-auto"
          : "opacity-0 translate-y-8 md:translate-y-0 md:translate-x-12 pointer-events-none"
      } bottom-2 left-2 right-2 md:bottom-auto md:left-auto md:right-3 md:top-16 ${
        isMobileMinimized ? "max-h-auto" : "max-h-[44vh] md:max-h-[calc(100vh-80px)]"
      } w-auto md:w-[460px] md:max-w-[480px]`}
    >
      {/* Pinned Sticky Header pre Katalógovú halu */}
      <div className="shrink-0 sticky top-0 z-[1005] px-3 md:px-3.5 py-2 md:py-2.5 border-b border-cyan-500/30 bg-[#10141d] shadow-md flex flex-col">
        {/* Mobile drag handle */}
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-1.5 md:hidden" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
            <div>
              <div className="text-xs font-mono font-bold text-white tracking-wider uppercase flex items-center gap-1.5">
                <span>Katalógová hala</span>
                <span className="text-[10px] text-cyan-400 font-normal">[Menu]</span>
              </div>
              <div className="text-[10px] font-mono text-white/50">
                {typedParams.width} × {typedParams.length} m · {(typedParams.width * typedParams.length).toFixed(0)} m²
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
              {selectedHall}
            </span>
            <button
              type="button"
              onClick={() => setQuoteRequestSignal((v) => v + 1)}
              className="rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-mono text-xs font-bold px-2.5 py-1 transition cursor-pointer active:scale-95 shadow-md shadow-cyan-500/20"
            >
              Dopyt
            </button>
            <button
              type="button"
              onClick={() => setIsMobileMinimized((v) => !v)}
              title={isMobileMinimized ? "Rozbaliť menu" : "Zbaliť menu"}
              className="md:hidden p-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 transition cursor-pointer"
            >
              {isMobileMinimized ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {!isMobileMinimized && (
        <div className="overflow-y-auto flex-1 flex flex-col">
          {/* Rýchly prepínač Opláštenia */}
          <div className="shrink-0 px-3.5 py-2.5 bg-[#141a24] border-b border-white/10 flex items-center justify-between">
            <span className="text-xs font-mono font-semibold text-slate-200">
              Opláštenie haly:
            </span>
            <button
              type="button"
              onClick={onToggleCladding}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition border cursor-pointer ${
                typedParams.showCladding
                  ? "bg-cyan-500/25 border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.3)]"
                  : "bg-slate-800 border-white/15 text-slate-400 hover:text-white"
              }`}
            >
              {typedParams.showCladding ? "✓ Zapnuté" : "✕ Vypnuté (Iba konštrukcia)"}
            </button>
          </div>

          <div className="relative shrink-0">
            <Leva
              fill
              flat
              titleBar={false}
              theme={levaTheme}
            />
          </div>

      {/* Súhrn konfigurácie */}
      <div className="border-t border-white/10 bg-[#161b22]">
        <button
          type="button"
          onClick={() => setIsSummaryOpen((v) => !v)}
          className="flex w-full items-center justify-between px-3.5 py-2.5 text-xs font-mono font-bold uppercase tracking-wider text-white/90 hover:bg-white/5 transition cursor-pointer select-none"
        >
          <span className="flex items-center gap-2">
            <span className="text-[10px] text-cyan-400">
              {isSummaryOpen ? "▾" : "▸"}
            </span>
            Súhrn konfigurácie
          </span>
          <span className="text-[10px] font-normal text-cyan-400 font-mono">
            {(typedParams.width * typedParams.length).toFixed(1)} m²
          </span>
        </button>

        {isSummaryOpen && (
          <div className="p-3 pt-1 space-y-2.5 text-[11px] font-mono border-t border-white/5">
            <div className="rounded bg-black/40 p-2.5 border border-white/5 space-y-1.5 text-white/80">
              <div className="flex justify-between">
                <span className="text-white/50">Model:</span>
                <span className="font-bold text-cyan-400">
                  {selectedHall}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Rozmery:</span>
                <span className="text-white font-medium">
                  {typedParams.width} × {typedParams.length} m
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Svetlá výška:</span>
                <span className="text-white font-medium">
                  {typedParams.clearHeight} m
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Strecha:</span>
                <span className="text-white font-medium">
                  {typedParams.roofType === "gable" ? "Sedlová" : "Pultová"} (
                  {typedParams.roofPitchDeg}°)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Opláštenie:</span>
                <span className="text-white font-medium">
                  {typedParams.panelType === "sandwich"
                    ? `Sendvič ${typedParams.wallPanelThicknessMm}mm`
                    : "Trapéz"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Brána:</span>
                <span className="text-white font-medium">
                  {typedParams.gateCount === 2 ? "2x " : "1x "}
                  {typedParams.doorWidth} × {typedParams.doorHeight} m
                  {typedParams.gateType === "upAndOver"
                    ? " (výklopná)"
                    : typedParams.gateType === "doubleLeaf"
                    ? " (dvojkrídlová)"
                    : " (sekčná)"}
                  {typedParams.hasBackDoor ? " + zadná" : ""}
                </span>
              </div>
              {(typedParams.hasPersonalDoor || typedParams.windowCount > 0) && (
                <div className="flex justify-between">
                  <span className="text-white/50">Výplne:</span>
                  <span className="text-white font-medium">
                    {typedParams.hasPersonalDoor ? "Dvere" : ""}
                    {typedParams.hasPersonalDoor && typedParams.windowCount > 0
                      ? " + "
                      : ""}
                    {typedParams.windowCount > 0
                      ? `${typedParams.windowCount}x okno`
                      : ""}
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="block mb-1 text-[10px] text-white/60 uppercase tracking-wider font-semibold">
                Poznámka:
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full rounded border border-white/10 bg-black/50 px-2.5 py-1.5 text-white/90 focus:border-cyan-400 focus:outline-none resize-none text-[11px]"
                placeholder="Špecifikácia, požiadavky..."
              />
            </div>

            <button
              type="button"
              onClick={() => setQuoteRequestSignal((v) => v + 1)}
              className="w-full h-11 rounded-xl bg-cyan-400 text-center font-extrabold text-slate-950 transition hover:bg-cyan-300 active:scale-[0.99] shadow-lg shadow-cyan-500/25 text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
            >
              Dopytovať cenovú ponuku
            </button>
          </div>
        )}
      </div>
        </div>
      )}
    </div>
  );
}
