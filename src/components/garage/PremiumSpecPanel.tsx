import { useMemo, useState } from "react";
import type { GarageParams } from "@/lib/garage/types";

type Status = "ok" | "warn" | "err";

interface Check {
  label: string;
  value: string;
  status: Status;
  detail?: string;
}

function buildChecks(p: GarageParams): Check[] {
  const checks: Check[] = [];

  checks.push({
    label: "Jadro panelu",
    value: p.insulationCore,
    status: p.insulationCore === "PIR" ? "ok" : "err",
    detail:
      p.insulationCore === "PIR"
        ? "PIR — vysoká požiarna odolnosť a tepelná stabilita."
        : "Vyžaduje sa PIR. EPS/PUR nespĺňajú prémiový štandard.",
  });

  checks.push({
    label: "Stenový panel",
    value: `${p.wallPanelThicknessMm} mm`,
    status: p.wallPanelThicknessMm >= 100 ? "ok" : "err",
    detail: "Min. 100 mm jadro pre steny.",
  });

  checks.push({
    label: "Strešný panel",
    value: `${p.roofPanelThicknessMm} mm (trapéz)`,
    status: p.roofPanelThicknessMm >= 120 ? "ok" : "err",
    detail: "Min. 120 mm jadro pre strechu s trapézovou profiláciou.",
  });

  checks.push({
    label: "Vonkajší plech",
    value: `${p.outerSheetMm.toFixed(2)} mm`,
    status: p.outerSheetMm >= 0.6 ? "ok" : "err",
    detail: "Min. 0,60 mm – odolnosť proti krupobitiu a deformáciám.",
  });

  checks.push({
    label: "Vnútorný plech",
    value: `${p.innerSheetMm.toFixed(2)} mm`,
    status: p.innerSheetMm >= 0.5 ? "ok" : "err",
    detail: "Min. 0,50 mm.",
  });

  const coatingOk =
    (p.coatingType === "HDX" || p.coatingType === "Pural") && p.coatingThicknessUm >= 50;
  checks.push({
    label: "Povrchová úprava",
    value: `${p.coatingType} ${p.coatingThicknessUm} µm`,
    status: coatingOk ? "ok" : p.coatingThicknessUm >= 50 ? "warn" : "err",
    detail: "Hrubovrstvý polyuretán (HDX / Pural), min. 50 µm.",
  });

  checks.push({
    label: "Pozinkovanie",
    value: `Z${p.zincCoatingGsm} g/m²`,
    status: p.zincCoatingGsm >= 275 ? "ok" : "err",
    detail: "Min. Z275 g/m² antikorózna ochrana.",
  });

  checks.push({
    label: "Spoj stenových panelov",
    value: p.hiddenFastening ? "Skryté kotvenie" : "Viditeľné kotvenie",
    status: p.hiddenFastening ? "ok" : "warn",
    detail: "Skryté kotvenie chráni skrutky pred poveternostnými vplyvmi.",
  });

  checks.push({
    label: "Skrutky",
    value:
      p.fastenerGrade === "carbon"
        ? "Pozinkovaná oceľ"
        : `Nerez ${p.fastenerGrade}`,
    status: p.fastenerGrade === "A2" || p.fastenerGrade === "A4" ? "ok" : "err",
    detail:
      "Samovrtné nerezové skrutky A2/A4 s EPDM podložkou, dimenzované na hrúbku jaklu.",
  });

  checks.push({
    label: "Tesnenia",
    value: p.sealingSystem ? "Pružné tmely + komprimačné pásky" : "Chýba",
    status: p.sealingSystem ? "ok" : "err",
    detail: "Trvale pružné tmely a komprimačné pásky proti tepelným mostom a infiltrácii.",
  });

  checks.push({
    label: "Klampiarstvo",
    value: p.flashingMatchesPanels ? "Systémové, zhodný povrch" : "Nesystémové",
    status: p.flashingMatchesPanels ? "ok" : "warn",
    detail: "Lemovania a klampiarske prvky s rovnakou povrchovou úpravou ako panely.",
  });

  return checks;
}

function estimateLoad(p: GarageParams) {
  // approx 11-15 kg/m² depending on thickness
  const wall = 9 + (p.wallPanelThicknessMm - 80) * 0.04; // ~9-13 kg/m²
  const roof = 11 + (p.roofPanelThicknessMm - 100) * 0.04; // ~11-15 kg/m²
  return { wall: Math.max(8, wall), roof: Math.max(10, roof) };
}

const dot: Record<Status, string> = {
  ok: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]",
  warn: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.7)]",
  err: "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.7)]",
};

export function PremiumSpecPanel({ p }: { p: GarageParams }) {
  const [open, setOpen] = useState(false);
  const checks = useMemo(() => buildChecks(p), [p]);
  const load = useMemo(() => estimateLoad(p), [p]);

  const errors = checks.filter((c) => c.status === "err").length;
  const warns = checks.filter((c) => c.status === "warn").length;

  const status: Status = errors > 0 ? "err" : warns > 0 ? "warn" : "ok";

  return (
    <div className="pointer-events-auto absolute left-3 top-14 z-10 w-[340px] rounded border border-white/10 bg-black/70 font-mono text-[11px] text-white/80 backdrop-blur">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 border-b border-white/10 px-3 py-2 text-left hover:bg-white/5"
      >
        <span className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${dot[status]}`} />
          <span className="uppercase tracking-widest text-white/90">
            Prémiové opláštenie
          </span>
        </span>
        <span className="text-[10px] text-white/40">
          {status === "ok"
            ? "Spĺňa štandard"
            : status === "warn"
              ? `${warns} upozornení`
              : `${errors} chýb`}
          {" "}
          {open ? "▾" : "▸"}
        </span>
      </button>

      {open && (
        <div className="max-h-[60vh] overflow-y-auto">
          <ul className="divide-y divide-white/5">
            {checks.map((c) => (
              <li key={c.label} className="px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <span className={`h-1.5 w-1.5 rounded-full ${dot[c.status]}`} />
                    <span className="text-white/70">{c.label}</span>
                  </span>
                  <span className="text-right text-white/90">{c.value}</span>
                </div>
                {c.detail && (
                  <div className="mt-1 pl-3.5 text-[10px] text-white/40">
                    {c.detail}
                  </div>
                )}
              </li>
            ))}
          </ul>

          <div className="border-t border-amber-500/40 bg-amber-500/10 px-3 py-2 text-amber-200">
            <div className="mb-1 text-[10px] uppercase tracking-widest text-amber-300">
              ⚠ Statický posudok
            </div>
            <div className="text-[10px] leading-snug text-amber-100/90">
              Existujúca oceľová konštrukcia musí byť posúdená na dodatočné
              zaťaženie sendvičovými panelmi (steny ~{load.wall.toFixed(1)} kg/m²,
              strecha ~{load.roof.toFixed(1)} kg/m²) a saním vetra podľa
              EN&nbsp;1991-1-4. Bez posudku autorizovaného statika nezačínajte
              montáž.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
