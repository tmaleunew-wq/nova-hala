import { useState } from 'react';
import defaults from '@/config/materials/roof-load-defaults.json';
import { downloadReport, type ExportRows } from '@/lib/materials/material-export';
import { estimateRoofLoad, type RoofLoadAssumptions } from '@/lib/materials/roof-load';

const fields: [keyof RoofLoadAssumptions, string][] = [
  ['roofKNPerM2', 'Vlastná tiaž strechy a nosnej strešnej ocele (kN/m²)'],
  ['snowKNPerM2', 'Modelový sneh na streche (kN/m² pôdorysu)'],
  ['skylightAreaM2', 'Pôdorysná plocha svetlíkov (m²)'],
  ['skylightNetKNPerM2', 'Prírastok tiaže svetlíkov po odpočítaní krytiny (kN/m²)'],
  ['pvCoveragePercent', 'Pokrytie strechy fotovoltikou (%)'],
  ['pvKNPerM2', 'Fotovoltika vrátane líšt (kN/m² pokrytej plochy)'],
  ['ballastKNPerM2', 'Balast FV (kN/m² pokrytej plochy)'],
];
const columns = ['Variant', 'Vlastná tiaž (kN)', 'Sneh (kN)', 'Spolu (kN)', 'Priemer (kN/m²)'];
const scope = 'Orientačný súčet zvislých zaťažení. Únosnosť, vietor, lokálne záveje a sily v úchytoch vyžadujú statické posúdenie.';
const fmt = new Intl.NumberFormat('sk-SK', { maximumFractionDigits: 2 });

export function RoofLoadEstimate({ widthM, lengthM, modeledSkylightAreaM2 }: { widthM: number; lengthM: number; modeledSkylightAreaM2: number }) {
  const [edits, setEdits] = useState<Partial<Record<keyof RoofLoadAssumptions, string>>>({});
  const areaM2 = widthM * lengthM;
  const base = { ...defaults, skylightAreaM2: modeledSkylightAreaM2 || Math.min(defaults.skylightAreaM2, areaM2) };
  const inputs = { ...base };
  for (const [key] of fields) {
    const value = edits[key];
    if (value !== undefined) inputs[key] = value.trim() === '' ? NaN : Number(value);
  }
  let result: ReturnType<typeof estimateRoofLoad> | undefined;
  let error = '';
  try {
    result = estimateRoofLoad({ ...inputs, widthM, lengthM });
  } catch (issue) {
    error = issue instanceof Error ? issue.message : 'Odhad sa nepodarilo vypočítať.';
  }
  const rows: ExportRows = result?.variants.map(variant => [variant.label, variant.deadKN, result.snowKN, variant.totalKN, variant.meanKNPerM2]) ?? [];
  const overlap = 'Súčet zadaných plôch FV a svetlíkov presahuje pôdorys. Upravte pokrytie kombinovaného variantu.';
  const report: ExportRows = [['Orientačný odhad zaťaženia strechy'], ['Pôdorys (m²)', areaM2], ...fields.map(([key, label]) => [label, inputs[key]]), [], columns, ...rows, [], [scope], ...(result?.combinedFits === false ? [[overlap]] : [])];

  return <details className="rounded-lg border border-white/10 p-3" open>
    <summary className="cursor-pointer font-semibold">Orientačné zaťaženie strechy</summary>
    <p className="my-2 text-xs text-slate-300">Pôdorys {fmt.format(areaM2)} m². Predvolené hodnoty sú modelové. Plocha svetlíkov vychádza z potvrdených strešných otvorov, ak sú v projekte evidované.</p>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {fields.map(([key, label]) => <label className="grid gap-1 text-xs" key={key}>{label}
        <input className="rounded border border-white/15 bg-slate-950 px-2 py-1.5" type="number" step="any" value={edits[key] ?? base[key]} onChange={event => setEdits(previous => ({ ...previous, [key]: event.target.value }))} />
      </label>)}
    </div>
    {error && <p role="alert" className="mt-2 text-red-300">{error}</p>}
    {result && <>
      <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-xs">
        <thead className="bg-white/5"><tr>{columns.map(column => <th key={column} scope="col" className="px-2 py-2">{column}</th>)}</tr></thead>
        <tbody>{rows.map(row => <tr key={String(row[0])} className="border-t border-white/10">{row.map((cell, index) => <td key={index} className="px-2 py-2">{typeof cell === 'number' ? fmt.format(cell) : cell}</td>)}</tr>)}</tbody>
      </table></div>
      <p className="mt-2 text-xs">Fotovoltika na {fmt.format(result.pvAreaM2)} m² pridáva {fmt.format(result.pvAdditionalKN)} kN vrátane zadaného balastu.</p>
      {!result.combinedFits && <p className="mt-2 text-xs text-amber-200">{overlap}</p>}
      <div className="mt-3 flex gap-2">
        {(['csv', 'xlsx'] as const).map(format => <button type="button" key={format} className="rounded border border-white/15 px-2 py-1.5 text-xs" onClick={() => downloadReport(report, format, 'odhad-zatazenia-strechy')}>Export odhadu {format.toUpperCase()}</button>)}
      </div>
    </>}
    <p className="mt-3 text-xs text-amber-100">{scope}</p>
  </details>;
}
