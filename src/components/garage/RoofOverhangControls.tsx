import React from "react";
import type { GarageParams } from "@/lib/garage/types";
import type { BuildingObject } from "@/lib/garage/buildingObjects";
import {
  getRoofOverhangConfig,
  getEffectiveRoofOverhangs,
  validateRoofOverhangs,
  type RoofOverhangs,
} from "@/lib/garage/roofOverhangs";
import { AlertTriangle, Compass } from "lucide-react";

interface RoofOverhangControlsProps {
  params: GarageParams;
  onChange: (patch: Partial<GarageParams>) => void;
  buildingObjects?: BuildingObject[];
  compact?: boolean;
}

export function RoofOverhangControls({
  params,
  onChange,
  buildingObjects = [],
  compact = false,
}: RoofOverhangControlsProps) {
  const config = getRoofOverhangConfig();
  const overhangs = getEffectiveRoofOverhangs(params);
  const warnings = validateRoofOverhangs(params, buildingObjects);
  const isGable = params.roofType !== "shed" && params.roofType !== "cubic";

  const items: Array<{
    key: keyof RoofOverhangs;
    paramKey: "roofOverhangFront" | "roofOverhangBack" | "roofOverhangLeft" | "roofOverhangRight";
    label: string;
    role: string;
  }> = [
    {
      key: "front",
      paramKey: "roofOverhangFront",
      label: "Predný presah",
      role: isGable ? "Štítový presah (čelo)" : "Štítový presah (čelo)",
    },
    {
      key: "back",
      paramKey: "roofOverhangBack",
      label: "Zadný presah",
      role: isGable ? "Štítový presah (zadná stena)" : "Štítový presah (zadná stena)",
    },
    {
      key: "left",
      paramKey: "roofOverhangLeft",
      label: "Ľavý presah",
      role: isGable ? "Odkvapový presah (odkvap a žľab)" : "Spodný odkvapový presah",
    },
    {
      key: "right",
      paramKey: "roofOverhangRight",
      label: "Pravý presah",
      role: isGable ? "Odkvapový presah (odkvap a žľab)" : "Horný odkvapový presah",
    },
  ];

  return (
    <div className="space-y-3 p-3 rounded-xl bg-white/5 border border-white/10" data-testid="roof-overhang-controls">
      <div className="flex items-center justify-between pb-1 border-b border-white/10">
        <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase text-sky-400 font-bold">
          <Compass className="h-3.5 w-3.5" />
          <span>Parametrický presah strechy</span>
        </div>
        <span className="text-[10px] text-slate-400 font-mono">
          {isGable ? "Sedlová strecha" : "Pultová strecha"}
        </span>
      </div>

      <p className="text-[11px] text-slate-400 leading-relaxed">
        Presahy rozširujú strešný plášť, väznice, oplechovanie a odkvapové žľaby bez zmeny rozmerov nosných stien haly.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {items.map(({ key, paramKey, label, role }) => {
          const val = overhangs[key];
          const hasCantileverWarning = val > config.maxSafeCantileverM;
          return (
            <div
              key={key}
              className={`p-2 rounded-lg border transition ${
                hasCantileverWarning
                  ? "bg-amber-950/20 border-amber-500/40"
                  : "bg-slate-900/60 border-white/10"
              }`}
            >
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-slate-200 font-medium text-[11px]">{label}:</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={config.min}
                    max={config.max}
                    step={config.step}
                    value={val}
                    onChange={(e) => {
                      const num = parseFloat(e.target.value);
                      onChange({ [paramKey]: Number.isFinite(num) ? Math.max(0, num) : 0 });
                    }}
                    className="w-16 rounded border border-white/20 bg-slate-950 px-1.5 py-0.5 text-right font-mono text-sky-300 font-bold text-xs"
                    aria-label={`${label} v metroch`}
                  />
                  <span className="text-slate-400 text-[10px] font-mono">m</span>
                </div>
              </div>

              <div className="text-[10px] text-slate-400 italic mb-1.5 truncate">{role}</div>

              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={config.min}
                  max={config.max}
                  step={config.step}
                  value={val}
                  onChange={(e) => onChange({ [paramKey]: parseFloat(e.target.value) })}
                  className="w-full accent-sky-500 cursor-pointer h-1.5"
                  aria-label={`Posuvník ${label}`}
                />
              </div>

              <div className="flex justify-between text-[9px] text-slate-400 font-mono mt-1">
                <span>0 m</span>
                <span className={hasCantileverWarning ? "text-amber-400 font-bold" : ""}>
                  {val.toFixed(2)} m
                </span>
                <span>{config.max} m</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Warnings & Notices */}
      {warnings.length > 0 && (
        <div className="space-y-1.5 pt-1">
          {warnings.map((w, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-2 p-2 rounded-lg text-[11px] leading-tight border ${
                w.code === "cantilever"
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-200"
                  : "bg-rose-500/10 border-rose-500/30 text-rose-200"
              }`}
            >
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{w.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
