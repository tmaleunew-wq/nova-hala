import React from "react";
import { Leva } from "leva";
import type { GarageParams } from "@/lib/garage/types";

export interface StandardHallMenuProps {
  showControls: boolean;
  typedParams: GarageParams;
  selectedHall: string;
  notes: string;
  setNotes: (notes: string) => void;
  isSummaryOpen: boolean;
  setIsSummaryOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setQuoteRequestSignal: React.Dispatch<React.SetStateAction<number>>;
}

const levaTheme = {
  colors: {
    elevation1: "#0e1116",
    elevation2: "#161b22",
    elevation3: "#1f2630",
    accent1: "#34d399",
    accent2: "#10b981",
    accent3: "#059669",
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
}: StandardHallMenuProps) {
  return (
    <div
      className={`quote-export-panel absolute right-3 top-[132px] md:top-28 z-30 max-h-[calc(100vh-150px)] md:max-h-[72vh] overflow-y-auto rounded-lg bg-[#0e1116]/95 shadow-2xl border border-white/10 transition-all duration-300 ${
        showControls
          ? "opacity-100 translate-x-0 pointer-events-auto"
          : "opacity-0 translate-x-12 pointer-events-none"
      } md:w-[320px] w-[calc(100vw-32px)] max-w-[360px]`}
    >
      {/* Pinned Sticky Header pre Katalógovú halu */}
      <div className="sticky top-0 z-30 px-3.5 py-2.5 border-b border-cyan-500/30 bg-[#10141d] shadow-md flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
          <div>
            <div className="text-xs font-mono font-bold text-white tracking-wider uppercase flex items-center gap-1.5">
              <span>Katalógová hala</span>
              <span className="text-[10px] text-cyan-400 font-normal">[Menu]</span>
            </div>
            <div className="text-[10px] font-mono text-white/50">
              Typový projekt oceľovej haly
            </div>
          </div>
        </div>
        <span className="font-mono text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
          {selectedHall}
        </span>
      </div>

      <Leva
        fill
        flat
        titleBar={false}
        theme={levaTheme}
      />

      {/* Súhrn konfigurácie */}
      <div className="border-t border-white/10 bg-[#161b22]">
        <button
          type="button"
          onClick={() => setIsSummaryOpen((v) => !v)}
          className="flex w-full items-center justify-between px-3.5 py-2.5 text-xs font-mono font-bold uppercase tracking-wider text-white/90 hover:bg-white/5 transition cursor-pointer select-none"
        >
          <span className="flex items-center gap-2">
            <span className="text-[10px] text-emerald-400">
              {isSummaryOpen ? "▾" : "▸"}
            </span>
            Súhrn konfigurácie
          </span>
          <span className="text-[10px] font-normal text-emerald-400 font-mono">
            {(typedParams.width * typedParams.length).toFixed(1)} m²
          </span>
        </button>

        {isSummaryOpen && (
          <div className="p-3 pt-1 space-y-2.5 text-[11px] font-mono border-t border-white/5">
            <div className="rounded bg-black/40 p-2.5 border border-white/5 space-y-1.5 text-white/80">
              <div className="flex justify-between">
                <span className="text-white/50">Model:</span>
                <span className="font-bold text-emerald-400">
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
                className="w-full rounded border border-white/10 bg-black/50 px-2.5 py-1.5 text-white/90 focus:border-emerald-400 focus:outline-none resize-none text-[11px]"
                placeholder="Špecifikácia, požiadavky..."
              />
            </div>

            <button
              type="button"
              onClick={() => setQuoteRequestSignal((v) => v + 1)}
              className="w-full h-11 rounded bg-emerald-400 text-center font-bold text-black transition hover:bg-emerald-300 active:scale-[0.99] shadow-lg shadow-emerald-500/20 text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
            >
              Dopytovať cenovú ponuku
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
