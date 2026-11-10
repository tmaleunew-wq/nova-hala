import React from "react";
import { type GarageParams } from "@/lib/garage/types";
import { X, Printer, Download, Layers, ShieldCheck, Box, Ruler, FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "sonner";

interface NewHallBOMModalProps {
  isOpen: boolean;
  onClose: () => void;
  params: GarageParams;
  hallName?: string;
}

export function NewHallBOMModal({
  isOpen,
  onClose,
  params,
  hallName = "Nová priemyselná hala",
}: NewHallBOMModalProps) {
  if (!isOpen) return null;

  const w = params.width;
  const l = params.length;
  const h = params.clearHeight;
  const bays = params.bayCount ?? Math.max(1, Math.round(l / 4.5));
  const framesCount = bays + 1;
  const hasCenterCols = !!params.hasCenterColumns;

  // Steel structure breakdown
  const mainColumnsCount = framesCount * (hasCenterCols ? 3 : 2);
  const raftersCount = framesCount * 2;
  const purlinRowsPerSlope = Math.max(3, Math.ceil(w / 2 / 1.5));
  const purlinTotalRows = purlinRowsPerSlope * 2;
  const purlinTotalCount = purlinTotalRows * bays;
  const purlinLengthM = bays * (l / bays); // total per line
  const purlinsTotalLength = purlinTotalRows * l;

  // Steel weight estimations (approx kg)
  // IPE 160 approx 15.8 kg/m, C200 approx 10-12 kg/m
  const colKgPerM = params.structureType === "c_profiles" ? 11.5 : 15.8;
  const colWeight = mainColumnsCount * h * colKgPerM;
  const slopeLen = Math.hypot(w / 2, (params.hallHeight ?? h) - h);
  const rafterWeight = raftersCount * slopeLen * colKgPerM;
  const purlinWeight = purlinsTotalLength * 5.2; // Z-purlins approx 5.2 kg/m
  const bracingWeight = bays * 140; // X-bracings
  const totalSteelWeightKg = Math.round(colWeight + rafterWeight + purlinWeight + bracingWeight);

  // Cladding & Panel breakdown (standard 1000mm width)
  const wallPerimeter = 2 * (w + l);
  const wallAreaM2 = Math.round(wallPerimeter * h * 10) / 10;
  const wallPanelsCount = Math.ceil(wallPerimeter / 1.0); // 1000mm module
  const roofAreaM2 = Math.round(2 * slopeLen * l * 10) / 10;
  const roofPanelsCount = Math.ceil((l / 1.0) * 2);

  // Doors & Windows
  const doorCount = (params.personalDoorCount ?? (params.hasPersonalDoor ? 1 : 0));
  const windowCount = params.windowCount ?? 0;

  const handlePrint = () => {
    window.print();
  };

  const handleExportCsv = () => {
    const rows = [
      ["Kod", "Kategoria", "Polozka", "Specifikacia", "Pocet ks", "Dlzka / Plocha", "Jednotka", "Hmotnost kg", "Poznamka"],
      ["ST-01", "Ocelova konstrukcia", "Nosne stlpy (hlavne)", params.structureType === "c_profiles" ? "C 200" : "IPE 160", framesCount * 2, (framesCount * 2 * h).toFixed(1), "bm", Math.round(framesCount * 2 * h * colKgPerM), "S355JR / STN EN 10025"],
      ["ST-02", "Ocelova konstrukcia", "Stresne priecle / vazniky", params.structureType === "c_profiles" ? "C 200" : "IPE 160", raftersCount, (raftersCount * slopeLen).toFixed(1), "bm", Math.round(rafterWeight), "Sedlovy ram"],
      ["ST-03", "Ocelova konstrukcia", "Stresne vaznice", "Z 200 / 1.5mm", purlinTotalCount, purlinsTotalLength.toFixed(1), "bm", Math.round(purlinWeight), "Rozostup max 1.5m"],
      ["ST-04", "Ocelova konstrukcia", "Stuzidla stien a strechy", "Tahadla M16 / L 50", bays * 4, (bays * 4 * 5.5).toFixed(0), "bm", bracingWeight, "Zavetrovaci kriz"],
      ["CL-01", "Oplastenie strechy", "Stresne panely", "PIR Stresny 5-vlna", roofPanelsCount, roofAreaM2, "m2", "-", "Presah 150mm"],
      ["CL-02", "Oplastenie stien", "Stenove panely", "PIR Stenovy panel 1000mm", wallPanelsCount, wallAreaM2, "m2", "-", "Odpad ~5%"],
      ["DR-01", "Vyplne otvorov", "Sekcionalna priemyselna brana", String(params.doorWidth || 4.0) + " x " + String(params.doorHeight || 4.25) + " m", 1, 1, "ks", "-", "Elektricky priemyselny pohon"],
      ["DR-02", "Vyplne otvorov", "Vstupne dvere", "0.9 x 2.0 m", doorCount, doorCount, "ks", "-", "Kovanie, klucka"],
      ["FL-01", "Klampiarske prvky", "Hrebenac", "Hrebenova lista r.s. 400", 1, l, "bm", "-", "RAL nastrek"],
      ["FL-02", "Klampiarske prvky", "Odkvapove a zaveterne listy", "Ukoncovacie profily", 1, (2 * l + 4 * slopeLen).toFixed(0), "bm", "-", "Lemovanie"],
    ];
    const csvContent = "\uFEFF" + rows.map((r) => r.map((c) => `"${c}"`).join(";")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `VBAU_Kusovnik_BOM_${w}x${l}m.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Kusovnik materialov (BOM) bol exportovany do CSV!");
  };

  const handleExportExcel = () => {
    const tableHeader = '<tr style="background-color:#0f172a; color:#ffffff;"><th>Kod</th><th>Kategoria</th><th>Polozka</th><th>Specifikacia</th><th>Pocet</th><th>Mnozstvo</th><th>Jednotka</th><th>Hmotnost kg</th><th>Poznamka</th></tr>';
    const rowsHtml = [
      '<tr><td>ST-01</td><td>Ocelova konstrukcia</td><td>Nosne stlpy (hlavne)</td><td>' + (params.structureType === "c_profiles" ? "C 200" : "IPE 160") + '</td><td>' + (framesCount * 2) + '</td><td>' + (framesCount * 2 * h).toFixed(1) + '</td><td>bm</td><td>' + Math.round(framesCount * 2 * h * colKgPerM) + '</td><td>S355JR</td></tr>',
      '<tr><td>ST-02</td><td>Ocelova konstrukcia</td><td>Stresne priecle / vazniky</td><td>' + (params.structureType === "c_profiles" ? "C 200" : "IPE 160") + '</td><td>' + raftersCount + '</td><td>' + (raftersCount * slopeLen).toFixed(1) + '</td><td>bm</td><td>' + Math.round(rafterWeight) + '</td><td>Sedlovy ram</td></tr>',
      '<tr><td>ST-03</td><td>Ocelova konstrukcia</td><td>Stresne vaznice</td><td>Z 200 / 1.5mm</td><td>' + purlinTotalCount + '</td><td>' + purlinsTotalLength.toFixed(1) + '</td><td>bm</td><td>' + Math.round(purlinWeight) + '</td><td>Z-profil</td></tr>',
      '<tr><td>ST-04</td><td>Ocelova konstrukcia</td><td>Stuzidla stien a strechy</td><td>Tahadla M16 / L 50</td><td>' + (bays * 4) + '</td><td>' + (bays * 4 * 5.5).toFixed(0) + '</td><td>bm</td><td>' + bracingWeight + '</td><td>X-bracing</td></tr>',
      '<tr><td>CL-01</td><td>Oplastenie strechy</td><td>Stresne panely</td><td>PIR Stresny 5-vlna</td><td>' + roofPanelsCount + '</td><td>' + roofAreaM2 + '</td><td>m2</td><td>-</td><td>1000mm modul</td></tr>',
      '<tr><td>CL-02</td><td>Oplastenie stien</td><td>Stenove panely</td><td>PIR Stenovy panel 1000mm</td><td>' + wallPanelsCount + '</td><td>' + wallAreaM2 + '</td><td>m2</td><td>-</td><td>Odpad ~5%</td></tr>',
      '<tr><td>DR-01</td><td>Vyplne otvorov</td><td>Sekcionalna priemyselna brana</td><td>' + (params.doorWidth || 4.0) + ' x ' + (params.doorHeight || 4.25) + ' m</td><td>1</td><td>1</td><td>ks</td><td>-</td><td>Priemyselny pohon</td></tr>',
      '<tr><td>DR-02</td><td>Vyplne otvorov</td><td>Vstupne dvere</td><td>0.9 x 2.0 m</td><td>' + doorCount + '</td><td>' + doorCount + '</td><td>ks</td><td>-</td><td>Kovanie</td></tr>',
      '<tr><td>FL-01</td><td>Klampiarske prvky</td><td>Hrebenac</td><td>Hrebenova lista r.s. 400</td><td>1</td><td>' + l + '</td><td>bm</td><td>-</td><td>RAL nastrek</td></tr>',
      '<tr><td>FL-02</td><td>Klampiarske prvky</td><td>Odkvapove a zaveterne listy</td><td>Ukoncovacie profily</td><td>1</td><td>' + (2 * l + 4 * slopeLen).toFixed(0) + '</td><td>bm</td><td>-</td><td>Lemovanie</td></tr>',
      '<tr style="background-color:#f1f5f9; font-weight:bold;"><td colspan="7">CELKOVA HMOTNOST OCELOVEJ KONSTRUKCIE</td><td>' + totalSteelWeightKg.toLocaleString() + ' kg</td><td>Vyzaduje staticke posudenie</td></tr>'
    ].join("");

    const htmlTable = '<html><head><meta charset="utf-8"></head><body><h2>VBAU Haly s.r.o. — Materialovy vykaz a kusovnik (BOM)</h2><p>Projekt: ' + hallName + ' | Rozmery: ' + w + ' x ' + l + ' x ' + h + ' m</p><table border="1" cellpadding="5" cellspacing="0" style="border-collapse:collapse; font-family:sans-serif;">' + tableHeader + rowsHtml + '</table></body></html>';

    const blob = new Blob([htmlTable], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `VBAU_Kusovnik_BOM_${w}x${l}m.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Kusovnik materialov bol stiahnuty vo formate Excel (XLS)!");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-cyan-500/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                Výkaz materiálu & Kladačský plán (BOM)
                <span className="text-[10px] font-mono uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 px-2 py-0.5 rounded-full">
                  HiStruct Štandard
                </span>
              </h2>
              <p className="text-xs text-white/50">
                {hallName} · {w} × {l} × {h} m · Rámový modul: {(l / bays).toFixed(2)} m ({bays} polí)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="px-3 py-1.5 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-white text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer"
              title="Stiahnuť kusovník ako CSV súbor"
            >
              <Download className="h-3.5 w-3.5 text-sky-400" />
              CSV
            </button>
            <button
              onClick={handleExportExcel}
              className="px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-200 text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer"
              title="Stiahnuť formátovaný Excel zošit"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
              Excel (XLS)
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white text-xs font-mono flex items-center gap-1.5 transition cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              Tlač
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Top Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
              <span className="text-[11px] text-white/50 block font-mono">Odhadovaná oceľ</span>
              <span className="text-xl font-bold font-mono text-cyan-400">{totalSteelWeightKg.toLocaleString()} kg</span>
              <span className="text-[10px] text-white/40 block mt-0.5">S355JR / S280GD</span>
            </div>
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
              <span className="text-[11px] text-white/50 block font-mono">Plocha stien</span>
              <span className="text-xl font-bold font-mono text-white">{wallAreaM2} m²</span>
              <span className="text-[10px] text-white/40 block mt-0.5">{wallPanelsCount} ks panelov (1m)</span>
            </div>
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
              <span className="text-[11px] text-white/50 block font-mono">Plocha strechy</span>
              <span className="text-xl font-bold font-mono text-white">{roofAreaM2} m²</span>
              <span className="text-[10px] text-white/40 block mt-0.5">{roofPanelsCount} ks panelov</span>
            </div>
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
              <span className="text-[11px] text-white/50 block font-mono">Nosné rámy</span>
              <span className="text-xl font-bold font-mono text-white">{framesCount} ks</span>
              <span className="text-[10px] text-white/40 block mt-0.5">{bays} modulových polí</span>
            </div>
          </div>

          {/* Section 1: Oceľová konštrukcia */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
              <Box className="h-4 w-4" />
              1. Prvky primárnej a sekundárnej oceľovej konštrukcie
            </h3>
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-white/5 text-white/60 border-b border-white/10 uppercase text-[10px]">
                  <tr>
                    <th className="p-2.5">Pozícia</th>
                    <th className="p-2.5">Profil</th>
                    <th className="p-2.5">Počet</th>
                    <th className="p-2.5">Dĺžka / ks</th>
                    <th className="p-2.5">Celková dĺžka</th>
                    <th className="p-2.5 text-right">Celk. hmotnosť</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-white/80">
                  <tr>
                    <td className="p-2.5 font-bold text-white">Nosné stĺpy (hlavné)</td>
                    <td className="p-2.5 text-cyan-300">{params.structureType === "c_profiles" ? "C 200" : "IPE 160"}</td>
                    <td className="p-2.5">{framesCount * 2} ks</td>
                    <td className="p-2.5">{h.toFixed(2)} m</td>
                    <td className="p-2.5">{(framesCount * 2 * h).toFixed(1)} m</td>
                    <td className="p-2.5 text-right font-bold">{Math.round(framesCount * 2 * h * colKgPerM)} kg</td>
                  </tr>
                  {hasCenterCols && (
                    <tr>
                      <td className="p-2.5 font-bold text-white">Stredové podperné stĺpy</td>
                      <td className="p-2.5 text-cyan-300">SHS 120×120</td>
                      <td className="p-2.5">{framesCount} ks</td>
                      <td className="p-2.5">{(params.hallHeight ?? h).toFixed(2)} m</td>
                      <td className="p-2.5">{(framesCount * (params.hallHeight ?? h)).toFixed(1)} m</td>
                      <td className="p-2.5 text-right font-bold">{Math.round(framesCount * (params.hallHeight ?? h) * 16.5)} kg</td>
                    </tr>
                  )}
                  <tr>
                    <td className="p-2.5 font-bold text-white">Strešné priečle / väzníky</td>
                    <td className="p-2.5 text-cyan-300">{params.structureType === "c_profiles" ? "C 200" : "IPE 160"}</td>
                    <td className="p-2.5">{raftersCount} ks</td>
                    <td className="p-2.5">{slopeLen.toFixed(2)} m</td>
                    <td className="p-2.5">{(raftersCount * slopeLen).toFixed(1)} m</td>
                    <td className="p-2.5 text-right font-bold">{Math.round(rafterWeight)} kg</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold text-white">Strešné väznice (Z-profily)</td>
                    <td className="p-2.5 text-cyan-300">Z 200 / 1.5mm</td>
                    <td className="p-2.5">{purlinTotalCount} ks</td>
                    <td className="p-2.5">{(l / bays).toFixed(2)} m</td>
                    <td className="p-2.5">{purlinsTotalLength.toFixed(1)} m</td>
                    <td className="p-2.5 text-right font-bold">{Math.round(purlinWeight)} kg</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold text-white">Stenové a strešné stužidlá</td>
                    <td className="p-2.5 text-cyan-300">Ťahadlá M16 / L 50</td>
                    <td className="p-2.5">{bays * 4} ks</td>
                    <td className="p-2.5">~5.5 m</td>
                    <td className="p-2.5">~{(bays * 4 * 5.5).toFixed(0)} m</td>
                    <td className="p-2.5 text-right font-bold">{bracingWeight} kg</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Kladačský plán opláštenia */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
              <Ruler className="h-4 w-4" />
              2. Kladačský rozpis sendvičových / trapézových panelov (šírka 1000 mm)
            </h3>
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-white/5 text-white/60 border-b border-white/10 uppercase text-[10px]">
                  <tr>
                    <th className="p-2.5">Plocha</th>
                    <th className="p-2.5">Typ panelu</th>
                    <th className="p-2.5">Počet kusov</th>
                    <th className="p-2.5">Dĺžka rezu</th>
                    <th className="p-2.5">Plocha brutto</th>
                    <th className="p-2.5 text-right">Poznámka</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-white/80">
                  <tr>
                    <td className="p-2.5 font-bold text-white">Bočná ľavá stena</td>
                    <td className="p-2.5 text-cyan-300">PIR / Trapéz (vertikálne)</td>
                    <td className="p-2.5">{Math.ceil(l / 1.0)} ks</td>
                    <td className="p-2.5">{h.toFixed(2)} m</td>
                    <td className="p-2.5">{(Math.ceil(l / 1.0) * h).toFixed(1)} m²</td>
                    <td className="p-2.5 text-right text-white/50">{params.personalDoorSide === "left" ? "Výrez na dvere" : "Plná"}</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold text-white">Bočná pravá stena</td>
                    <td className="p-2.5 text-cyan-300">PIR / Trapéz (vertikálne)</td>
                    <td className="p-2.5">{Math.ceil(l / 1.0)} ks</td>
                    <td className="p-2.5">{h.toFixed(2)} m</td>
                    <td className="p-2.5">{(Math.ceil(l / 1.0) * h).toFixed(1)} m²</td>
                    <td className="p-2.5 text-right text-white/50">{params.personalDoorSide === "right" ? "Výrez na dvere" : "Plná"}</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold text-white">Predný & zadný štít</td>
                    <td className="p-2.5 text-cyan-300">PIR / Trapéz (vertikálne)</td>
                    <td className="p-2.5">{Math.ceil(w / 1.0) * 2} ks</td>
                    <td className="p-2.5">{h.toFixed(2)} - {(params.hallHeight ?? h).toFixed(2)} m</td>
                    <td className="p-2.5">{(w * (h + (params.hallHeight ?? h)) / 2 * 2).toFixed(1)} m²</td>
                    <td className="p-2.5 text-right text-white/50">Garážové vráta / vetranie</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold text-white">Strešné roviny (2x spád)</td>
                    <td className="p-2.5 text-cyan-300">PIR Strešný 5-vlna</td>
                    <td className="p-2.5">{roofPanelsCount} ks</td>
                    <td className="p-2.5">{(slopeLen + 0.15).toFixed(2)} m</td>
                    <td className="p-2.5">{roofAreaM2} m²</td>
                    <td className="p-2.5 text-right text-white/50">Presah odkvapu 150mm</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Otvory, Klampiarske prvky a doplnky */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-2">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Výplne otvorov</h4>
              <ul className="text-xs space-y-1.5 text-white/70 font-mono">
                <li className="flex justify-between">
                  <span>Priemyselné vráta:</span>
                  <span className="text-cyan-300 font-bold">1 ks ({params.doorWidth ?? 4.8} × {params.doorHeight ?? 3.85} m)</span>
                </li>
                <li className="flex justify-between">
                  <span>Vstupné dvere:</span>
                  <span className="text-cyan-300 font-bold">{doorCount} ks (0.9 × 2.0 m, {params.personalDoorSide ?? "ľavá"})</span>
                </li>
                <li className="flex justify-between">
                  <span>Okenné moduly:</span>
                  <span className="text-cyan-300 font-bold">{windowCount} ks</span>
                </li>
                <li className="flex justify-between">
                  <span>Hrebeňový svetlík:</span>
                  <span className="text-cyan-300 font-bold">{params.hasRidgeSkylight ? "Áno (stredový oblúk)" : "Nie"}</span>
                </li>
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-2">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Klampiarske lemovanie</h4>
              <ul className="text-xs space-y-1.5 text-white/70 font-mono">
                <li className="flex justify-between">
                  <span>Hrebenáč:</span>
                  <span className="text-white font-bold">{l} bm</span>
                </li>
                <li className="flex justify-between">
                  <span>Odkvapové lemovanie:</span>
                  <span className="text-white font-bold">{(2 * l).toFixed(0)} bm</span>
                </li>
                <li className="flex justify-between">
                  <span>Štítové záveterné lišty:</span>
                  <span className="text-white font-bold">{(4 * slopeLen).toFixed(1)} bm</span>
                </li>
                <li className="flex justify-between">
                  <span>Rohové krycie lišty:</span>
                  <span className="text-white font-bold">{(4 * h).toFixed(1)} bm</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer with engineering disclaimer */}
        <div className="px-6 py-3 border-t border-white/10 bg-white/[0.02] space-y-1.5 text-xs font-mono text-white/50">
          <div className="flex items-center justify-between">
            <span>Generované systémom VBAU HiStruct 3D Configurator</span>
            <span>Súlad s normami STN EN 1090-2 & Eurokód 3</span>
          </div>
          <p className="text-[10px] text-amber-300/80 leading-normal">
            * UPOZORNENIE: Uvedené rozmery oceľových profilov, hmotnosti a počty spojovacieho materiálu vychádzajú z orientačných modulových pravidiel a vyžadujú technické doplnenie a schválenie autorizovaným statikom podľa konkrétneho snehového a vetrového zaťaženia staveniska.
          </p>
        </div>
      </div>
    </div>
  );
}
