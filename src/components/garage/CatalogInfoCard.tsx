import React from "react";
import type { HallConfig } from "@/lib/garage/configHelper";

interface CatalogInfoCardProps {
  selectedHall: string;
  curHall: HallConfig;
  showHallSpecs: boolean;
  setShowHallSpecs: React.Dispatch<React.SetStateAction<boolean>>;
  selectedPoleHeight: string;
  setSelectedPoleHeight: (h: string) => void;
  selectedLength: number;
  setSelectedLength: (l: number) => void;
  onSetParams: (params: Record<string, any>) => void;
  onOpenCatalogModal: () => void;
}

export function CatalogInfoCard({
  selectedHall,
  curHall,
  showHallSpecs,
  setShowHallSpecs,
  selectedPoleHeight,
  setSelectedPoleHeight,
  selectedLength,
  setSelectedLength,
  onSetParams,
  onOpenCatalogModal,
}: CatalogInfoCardProps) {
  const poleNum = parseInt(selectedPoleHeight, 10);
  const activeVer =
    (poleNum ? curHall.versions?.find((v) => v.poleHeight === poleNum) : undefined) ||
    curHall.versions?.[0];

  return (
    <div className="pointer-events-auto w-full rounded border border-emerald-500/30 bg-[#0e1116]/85 p-2.5 font-mono text-[10px] text-white/90 backdrop-blur shadow-xl">
      <div
        onClick={() => setShowHallSpecs((v) => !v)}
        className="flex items-center justify-between border-b border-white/10 pb-1 mb-1.5 cursor-pointer select-none"
      >
        <span className="font-bold text-emerald-400">
          KATALÓG GTG: {selectedHall}
          {curHall.subtitle ? ` · ${curHall.subtitle}` : ""}
        </span>
        <span className="text-white/50 text-[9px] flex items-center gap-1">
          <span>{curHall.framework || "EN 1090"}</span>
          <span className="text-emerald-400 font-bold">{showHallSpecs ? "▴" : "▾"}</span>
        </span>
      </div>

      {showHallSpecs && (
        <>
          {/* Voľba výšky stĺpa podľa katalógu (napr. 4m / 5m) */}
          {curHall.versions && curHall.versions.length > 0 && (
            <div className="flex items-center justify-between mb-1.5 bg-white/5 px-2 py-1 rounded border border-white/10">
              <span className="text-white/60">Výška stĺpa:</span>
              <div className="flex gap-1">
                {curHall.versions.map((ver) => {
                  const isSel = selectedPoleHeight === `${ver.poleHeight}m`;
                  return (
                    <button
                      key={ver.poleHeight}
                      onClick={() => {
                        setSelectedPoleHeight(`${ver.poleHeight}m`);
                        onSetParams({
                          clearHeight: ver.H,
                          poleHeightSelect: `${ver.poleHeight}m`,
                        });
                      }}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                        isSel
                          ? "bg-emerald-500 text-black shadow"
                          : "bg-white/10 text-white/80 hover:bg-white/20"
                      }`}
                    >
                      {ver.poleHeight}m
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Dĺžka B - Základ 20m, modulové pridanie / odobratie */}
          <div className="flex items-center justify-between bg-white/5 px-2 py-1 rounded border border-white/10 mb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="text-white/60">Dĺžka B:</span>
              <span className="text-emerald-400 font-bold text-[11px]">{selectedLength} m</span>
              <span className="text-white/40 text-[9px]">
                ({Math.round(selectedLength / curHall.moduleLength)} × {curHall.moduleLength}m)
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  const minL = curHall.minLength ?? curHall.moduleLength * 2;
                  const newL = Math.max(minL, selectedLength - curHall.moduleLength);
                  setSelectedLength(newL);
                  onSetParams({ length: `${newL}m`, bayCount: Math.round(newL / curHall.moduleLength) });
                }}
                disabled={selectedLength <= (curHall.minLength ?? curHall.moduleLength * 2)}
                className="px-2 py-0.5 rounded bg-white/10 hover:bg-emerald-500/30 text-white font-bold cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                title={`Odobrať modul -${curHall.moduleLength}m`}
              >
                − {curHall.moduleLength}m
              </button>
              <button
                onClick={() => {
                  const newL = selectedLength + curHall.moduleLength;
                  setSelectedLength(newL);
                  onSetParams({ length: `${newL}m`, bayCount: Math.round(newL / curHall.moduleLength) });
                }}
                className="px-2 py-0.5 rounded bg-white/10 hover:bg-emerald-500/30 text-white font-bold cursor-pointer"
                title={`Pridať modul +${curHall.moduleLength}m`}
              >
                + {curHall.moduleLength}m
              </button>
            </div>
          </div>

          {activeVer && (
            <div className="text-[9px] text-emerald-300 font-semibold mb-1 truncate">
              {activeVer.label}
            </div>
          )}

          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-white/70">
            <div>
              Šírka A: <span className="text-white">{curHall.width} m</span>
            </div>
            <div>
              Modul C: <span className="text-white">{curHall.moduleLength} m</span>
            </div>
            <div>
              Výška H:{" "}
              <span className="text-white">
                {activeVer ? `${activeVer.H.toFixed(3)} m` : `${curHall.heights[0]} m`}
              </span>
            </div>
            <div>
              Hrebeň H1:{" "}
              <span className="text-white">
                {activeVer ? `${activeVer.H1.toFixed(3)} m` : "-"}
              </span>
            </div>
            <div>
              Prejazd H2:{" "}
              <span className="text-white">
                {activeVer ? `${activeVer.H2.toFixed(3)} m` : "-"}
              </span>
            </div>
            {curHall.type === "shed" && activeVer?.H3 && (
              <div>
                Vzadu H3/H4:{" "}
                <span className="text-white">
                  {activeVer.H3}m / {activeVer.H4}m
                </span>
              </div>
            )}
            <div>
              Rozteč D / E:{" "}
              <span className="text-white">
                {activeVer ? `${activeVer.D}m / ${activeVer.E}m` : "-"}
              </span>
            </div>
            <div>
              Stĺpy: <span className="text-white">{curHall.gablePillars || "RK"}</span>
            </div>
            <div>
              Sklon: <span className="text-white">{curHall.roofPitchDeg}°</span>
            </div>
            <div>
              Oceľ: <span className="text-white">{curHall.steelGrade || "S355"}</span>
            </div>
            {curHall.snowZone && (
              <div>
                Zóna:{" "}
                <span className="text-white">
                  Sneh {curHall.snowZone} / Vietor {curHall.windZone}
                </span>
              </div>
            )}
            {curHall.claddingVersion && (
              <div>
                Opláštenie: <span className="text-white">{curHall.claddingVersion}</span>
              </div>
            )}
          </div>

          <button
            onClick={onOpenCatalogModal}
            className="mt-2 w-full flex items-center justify-center gap-1.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 py-1 text-[10px] font-bold cursor-pointer transition-colors"
          >
            <span>📷 Zobraziť predlohu z katalógu</span>
          </button>
        </>
      )}
    </div>
  );
}
