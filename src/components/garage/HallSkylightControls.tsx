import { DEFAULT_PARAMS, type GarageParams } from "@/lib/garage/types";
import { getSkylightLimits } from "@/lib/garage/skylights";

export function HallSkylightControls({ params: p, onChange }: {
  params: GarageParams;
  onChange: (values: Partial<GarageParams>) => void;
}) {
  const { maxWidth, maxLength } = getSkylightLimits(p);
  const fields = [
    { key: "skylightWidth", label: "Šírka po spáde", min: 0.3, max: maxWidth, step: 0.1, unit: "m" },
    { key: "skylightLength", label: "Dĺžka svetlíka", min: 0.3, max: maxLength, step: 0.1, unit: "m" },
    { key: "skylightPositionX", label: p.roofType === "gable" ? "Hrebeň → odkvap" : "Poloha naprieč strechou", min: 0, max: 100, step: 1, unit: "%" },
    { key: "skylightPositionY", label: "Predná → zadná strana", min: 0, max: 100, step: 1, unit: "%" },
  ] as const;
  return (
    <div className="space-y-3 border-t border-white/10 pt-3">
      {fields.map(({ key, label, min, max, step, unit }) => {
        const value = Math.max(min, Math.min(max, p[key] ?? DEFAULT_PARAMS[key]!));
        return (
          <label key={key} className="block space-y-1.5">
            <span className="flex items-center justify-between text-xs text-slate-300">
              <span>{label}</span>
              <span className="font-mono font-bold text-cyan-400">{unit === "m" ? value.toFixed(1) : value} {unit}</span>
            </span>
            <input type="range" min={min} max={max} step={step} value={value}
              onChange={(event) => onChange({ [key]: Number(event.target.value) })}
              className="h-2 w-full cursor-pointer rounded-lg bg-slate-700 accent-cyan-400" />
          </label>
        );
      })}
      <p className="text-[10px] leading-relaxed text-white/50">
        {p.roofType === "gable" ? "Svetlíky sú na oboch stranách hrebeňa. " : ""}
        Poloha 0–100 % posúva svetlík v rámci strechy s odstupom od okrajov.
      </p>
    </div>
  );
}
