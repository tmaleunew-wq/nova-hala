import { AccessorySettings } from './AccessorySettings';
import { calculateAccessories } from '@/lib/materials/accessories';
import { RoofLoadEstimate } from './RoofLoadEstimate';
import { useMemo, useState } from 'react';
import { DEFAULT_MATERIAL_CATALOG, loadMaterialCatalog, parseMaterialCatalogJson, type PanelProduct } from '@/lib/materials/catalog';
import { calculateMaterialGeometry, type PanelLayoutSpec, type SteelAssignment } from '@/lib/materials/geometry';
import { downloadReport, type ExportRows } from '@/lib/materials/material-export';
import { resolveProjectOpenings, type HallMaterialProject, type ProjectMaterialSettings } from '@/lib/materials/project';

const geometric = 'Geometricky vypočítané';
const estimated = 'Orientačne odhadnuté';
const design = 'Vyžaduje technický návrh';
const number = new Intl.NumberFormat('sk-SK', { maximumFractionDigits: 3 });
const control = 'rounded border border-white/15 bg-slate-950 px-2 py-1.5 text-white';
const roles: Record<string, string> = {
  column: 'Stĺp', rafter: 'Strešná priečľa', eaveHaunch: 'Odkvapový nábeh', ridgeHaunch: 'Hrebeňový nábeh',
  gableColumn: 'Štítový stĺp', centerColumn: 'Stredový stĺp', centerHaunch: 'Nábeh stredového stĺpa',
  purlin: 'Väznica', girt: 'Paždík', wallBracing: 'Stenové stužidlo', roofBracing: 'Strešné stužidlo',
};
const surfaces: Record<string, string> = { left: 'Ľavá stena', right: 'Pravá stena', front: 'Predný štít', back: 'Zadný štít', 'roof-left': 'Ľavá strešná rovina', 'roof-right': 'Pravá strešná rovina' };
const surfaceName = (id: string) => {
  const [face, bay] = id.split(':');
  return `${surfaces[face] ?? face}${bay ? ` · pole ${bay}` : ''}`;
};

function panelSpec(panel: PanelProduct | undefined, slopePercent?: number): PanelLayoutSpec | undefined {
  if (!panel || panel.coverWidthMm == null || panel.minLengthMm == null || panel.maxLengthMm == null) return;
  if (slopePercent !== undefined && (panel.minRoofSlopePercent == null || slopePercent <= panel.minRoofSlopePercent)) return;
  return { productId: panel.id, coverWidthM: panel.coverWidthMm / 1000, minLengthM: panel.minLengthMm / 1000, maxLengthM: panel.maxLengthMm / 1000, kgPerM2: panel.kgPerM2 };
}

function ReportTable({ columns, rows }: { columns: string[]; rows: ExportRows }) {
  return <div className="overflow-x-auto"><table className="w-full text-left text-xs">
    <thead className="bg-white/5 text-slate-300"><tr>{columns.map(column => <th key={column} scope="col" className="px-3 py-2">{column}</th>)}</tr></thead>
    <tbody>{rows.map((row, index) => <tr className="border-t border-white/10" key={index}>{row.map((cell, col) => <td key={col} className="px-3 py-2">{typeof cell === 'number' ? number.format(cell) : cell ?? '—'}</td>)}</tr>)}</tbody>
  </table></div>;
}

export function MaterialReport({ project, onChange }: { project: HallMaterialProject; onChange?: (value: HallMaterialProject) => void }) {
  const [catalogText, setCatalogText] = useState<string>();
  const [catalogMessage, setCatalogMessage] = useState('');
  const [memberId, setMemberId] = useState('');
  const settings = project.materialSettings;
  const catalog = useMemo(() => loadMaterialCatalog(settings?.catalog), [settings?.catalog]);
  const wall = catalog.panels.find(panel => panel.id === settings?.wallProductId);
  const roof = catalog.panels.find(panel => panel.id === settings?.roofProductId);
  const params = project.params;
  const slopePercent = 100 * Math.tan(params.roofPitchDeg * Math.PI / 180);
  const wallSpec = panelSpec(wall);
  const roofSpec = panelSpec(roof, slopePercent);
  const openings = useMemo(() => resolveProjectOpenings(project), [project]);
  const assignments: Record<string, SteelAssignment> = {};
  for (const [id, profileId] of Object.entries(settings?.profileAssignments ?? {})) {
    const profile = catalog.steelProfiles.find(item => item.id === profileId);
    if (profile) assignments[id] = { profileId, kgPerM: profile.kgPerM };
  }
  const model = calculateMaterialGeometry({ ...params, claddingOrientation: settings?.wallOrientation ?? params.claddingOrientation }, openings, {
    templateId: project.templateId, wallPanel: wallSpec, roofPanel: roofSpec, steelAssignments: assignments,
  });
  const update = (patch: Partial<ProjectMaterialSettings>) => onChange?.({
    ...project, materialSettings: { ...settings, catalog, ...patch },
  });
  const accessories = (() => {
    try { return calculateAccessories(params, model, settings?.accessories); }
    catch (error) { return { rows: [], notes: [`Výpočet doplnkov nie je dostupný: ${error instanceof Error ? error.message : 'neplatné nastavenie'}`] }; }
  })();
  const member = model.structure.find(item => item.id === memberId) ?? model.structure[0];
  const assumptions = [...model.limitations,
    'Objednávacie množstvo vychádza z krycej šírky a výrobných dĺžok. Odrezky sa medzi pásmi nepoužívajú opakovane.',
    'Pozdĺžne spoje panelov, uloženie, kotvenie a výber nosných profilov vyžadujú technický návrh.',
  ];
  if (roof && !roofSpec) assumptions.push(`Sklon ${number.format(slopePercent)} % alebo neúplné údaje výrobku neumožňujú objednávací rozpis zvoleného strešného panelu.`);
  if (roof && model.surfaces.some(face => face.kind === 'roof' && face.strips.some(strip => strip.lengthM >= (roof.maxLengthMm ?? Infinity) / 1000))) assumptions.push('Dĺžka strešných pásov je na výrobnom limite. Overte pozdĺžne spoje a prípustný sklon podľa výrobcu.');
  const groups = [
    { title: 'Opláštenie', columns: ['Plocha', 'Hrubá m²', 'Otvory m²', 'Čistá m²', 'Výrobok', 'Pásy ks', 'Objednávka m²', 'Odrezky m²', 'Objednávka bm', 'Hmotnosť kg', 'Stav výpočtu'], rows: model.surfaces.map(face => {
      const sum = (key: 'orderedAreaM2' | 'wasteAreaM2' | 'orderLengthM' | 'massKg') => face.strips.reduce((total, strip) => total + (strip[key] ?? 0), 0);
      const hasLayout = !!(face.kind === 'wall' ? wallSpec : roofSpec) && (face.strips.length > 0 || face.netAreaM2 < 1e-8);
      return [surfaceName(face.id), face.grossAreaM2, face.openingAreaM2, face.netAreaM2, (face.kind === 'wall' ? wall : roof)?.name ?? 'Neurčený', hasLayout ? face.strips.length : null, hasLayout ? sum('orderedAreaM2') : null, hasLayout ? sum('wasteAreaM2') : null, hasLayout ? sum('orderLengthM') : null, hasLayout && face.strips.every(strip => strip.massKg != null) ? sum('massKg') : null, `${geometric}${hasLayout ? ` / ${estimated}` : ''}`];
    }) },
    { title: 'Rozpis panelových pásov', columns: ['ID', 'Plocha', 'Výrobok', 'Smer', 'Krycia šírka m', 'Šírka rezu m', 'Dĺžka rezu m', 'Objednávacia dĺžka m', 'Čistá m²', 'Objednávka m²', 'Odrezky m²', 'kg', 'Rez'], rows: model.surfaces.flatMap(face => face.strips.map(strip => [strip.id, surfaceName(face.id), strip.productId, strip.orientation === 'vertical' ? 'Zvislo' : face.kind === 'roof' ? 'Po spáde' : 'Vodorovne', (face.kind === 'wall' ? wallSpec : roofSpec)?.coverWidthM ?? null, strip.widthM, strip.lengthM, strip.orderLengthM, strip.netAreaM2, strip.orderedAreaM2, strip.wasteAreaM2, strip.massKg, [strip.edgeCut ? 'Okraj' : '', strip.hasCutouts ? 'Výrez' : ''].filter(Boolean).join(', ')])) },
    { title: 'Oceľová konštrukcia', columns: ['ID', 'Prvok', 'Profil', 'ks', 'bm', 'kg/m', 'kg', 'Stav hmotnosti'], rows: model.structure.map(item => [item.id, roles[item.role], catalog.steelProfiles.find(profile => profile.id === item.profileId)?.designation ?? 'Neurčený', 1, item.lengthM, item.kgPerM, item.massKg, item.massKg == null ? design : estimated]) },
    { title: 'Otvory', columns: ['ID', 'Pole', 'Typ', 'Podtyp', 'ks', 'Šírka m', 'Výška m', 'Plocha m²'], rows: openings.map(item => [item.id, item.bayId, item.category, item.subtype, 1, item.width, item.height, item.width * item.height]) },
    { title: 'Doplnky a kotvenie', columns: ['Položka', 'ks', 'bm', 'kg', 'Stav'], rows: [
      ['Pätové dosky hlavných stĺpov', model.structure.filter(item => item.role === 'column' || item.role === 'centerColumn').length, null, null, design],
      ['Hrebeňové lemovanie hlavnej lode', null, params.length, null, design],
      ['Styčníkové plechy', null, null, null, design], ['Kotvy a skrutky', null, null, null, design],
      ['Ukončovacie lišty, tesnenia a prestupy', null, null, null, design],
    ] },
  ];
  assumptions.push(...accessories.notes,
    'Podrobný rozpis líšt nižšie nahrádza predbežný údaj hrebeňa v skupine Doplnky a kotvenie. Tieto dva údaje nesčítavajte.',
    `Nastavenie doplnkov projektu (JSON override): ${JSON.stringify(settings?.accessories ?? {})}`);
  groups.push({ title: 'Lišty a rebrík · podrobný rozpis',
    columns: ['ID', 'Položka', 'Geometria / výška výstupu bm', 'Objednávka ks', 'Objednávka líšt bm', 'Presahy bm', 'Odrezky bm', 'Hmotnosť kg', 'Stav'],
    rows: accessories.rows.map(row => [row.id, row.label, row.netM, row.pieces, row.kind === 'ladder' ? null : row.orderedM, row.overlapM, row.offcutM, row.massKg,
      row.kind === 'ladder' ? estimated : `${geometric} / objednávka ${estimated}`]),
  });
  const totals = model.totals;
  const summary: ExportRows = [
    ['Steny · hrubá plocha vrátane štítov (m²)', totals.wallGrossM2], ['Steny · čistá plocha (m²)', totals.wallNetM2],
    ['Strecha · bez presahov (m²)', totals.nominalRoofGrossM2], ['Strecha · hrubá plocha s presahmi (m²)', totals.roofGrossM2], ['Strecha · čistá plocha (m²)', totals.roofNetM2],
    ['Oceľ · súčet určených profilov (kg)', model.structure.some(item => item.massKg != null) ? totals.knownSteelMassKg : null],
  ];
  const exportRows: ExportRows = [
    ['Materiálový výkaz', project.name ?? project.templateId], ['Adaptér', model.adapterVersion], ['Katalóg', catalog.version],
    ...summary, ...groups.flatMap(group => [[], [group.title], group.columns, ...group.rows]), [],
    ['Predpoklady'], ...assumptions.map(note => [note]), [], ['Zdroje katalógu'],
    ...catalog.sources.map(source => [JSON.stringify(source)]),
  ];

  return <div className="space-y-4 text-sm text-slate-100">
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-auto text-xs text-slate-300">{params.width} × {params.length} × {params.clearHeight} m · {params.roofPitchDeg}° · Katalóg {catalog.version}</span>
      {(['csv', 'xlsx'] as const).map(format => <button type="button" key={format} className={control} onClick={() => downloadReport(exportRows, format, 'materialovy-vykaz')}>{format.toUpperCase()}</button>)}
    </div>
    <ReportTable columns={['Súhrn hlavnej lode', 'Hodnota']} rows={summary} />
    <AccessorySettings value={settings?.accessories} onChange={onChange ? accessories => update({ accessories }) : undefined} />
    <RoofLoadEstimate
      widthM={params.width}
      lengthM={params.length}
      modeledSkylightAreaM2={model.surfaces
        .filter(face => face.kind === 'roof')
        .reduce((area, face) => area + face.openingAreaM2, 0) * Math.cos(params.roofPitchDeg * Math.PI / 180)}
    />
    {onChange && <div className="grid gap-3 rounded-lg border border-white/10 p-3 sm:grid-cols-2">
      {(['wall', 'roof'] as const).map(kind => <label key={kind} className="grid gap-1">
        {kind === 'wall' ? 'Stenový panel' : 'Strešný panel'}
        <select className={control} value={(kind === 'wall' ? wall : roof)?.id ?? ''} onChange={event => update(kind === 'wall' ? { wallProductId: event.target.value } : { roofProductId: event.target.value })}>
          <option value="">Neurčený</option>
          {catalog.panels.filter(panel => panel.usage === kind).map(panel => <option value={panel.id} key={panel.id}>{panel.manufacturer} · {panel.name} · {panel.core} {panel.thicknessMm} mm · {panel.coverWidthMm ?? '?'} mm krytie</option>)}
        </select>
      </label>)}
      <label className="grid gap-1">Orientácia stien<select className={control} value={settings?.wallOrientation ?? params.claddingOrientation} onChange={event => update({ wallOrientation: event.target.value === 'horizontal' ? 'horizontal' : 'vertical' })}><option value="vertical">Zvislo</option><option value="horizontal">Vodorovne</option></select></label>
      {member && <div className="grid gap-2 sm:col-span-2 sm:grid-cols-2">
        <label className="grid gap-1">Oceľový prvok<select className={control} value={member.id} onChange={event => setMemberId(event.target.value)}>{model.structure.map(item => <option key={item.id} value={item.id}>{roles[item.role]} · {item.id}</option>)}</select></label>
        <label className="grid gap-1">Profil prvku<select className={control} value={member.profileId ?? ''} onChange={event => {
          const profileAssignments = { ...settings?.profileAssignments };
          if (event.target.value) profileAssignments[member.id] = event.target.value;
          else delete profileAssignments[member.id];
          update({ profileAssignments });
        }}><option value="">Neurčený</option>{catalog.steelProfiles.map(profile => <option key={profile.id} value={profile.id}>{profile.designation} · {profile.kgPerM ?? '—'} kg/m</option>)}</select></label>
      </div>}
    </div>}
    <ul className="list-disc space-y-1 pl-5 text-xs text-amber-100">{assumptions.map(note => <li key={note}>{note}</li>)}</ul>
    {groups.map(group => <details key={group.title} className="rounded-lg border border-white/10" open={group.title === 'Opláštenie' ? true : undefined}>
      <summary className="cursor-pointer p-3 font-semibold">{group.title}</summary>
      {group.rows.length ? <ReportTable columns={group.columns} rows={group.rows} /> : <p className="px-3 pb-3 text-slate-300">Žiadne vypočítané položky.</p>}
    </details>)}
    {onChange && <details className="rounded-lg border border-white/10 p-3" onToggle={event => { if (event.currentTarget.open) setCatalogText(JSON.stringify(catalog, null, 2)); }}>
      <summary className="cursor-pointer font-semibold">Upraviť katalóg projektu (JSON)</summary>
      <textarea aria-label="Katalóg materiálov JSON" className={`${control} mt-3 h-72 w-full font-mono text-xs`} value={catalogText ?? ''} onChange={event => setCatalogText(event.target.value)} spellCheck={false} />
      <button type="button" className={control} onClick={() => {
        try {
          update({ catalog: parseMaterialCatalogJson(catalogText ?? '') });
          setCatalogMessage('Katalóg bol uložený do projektu.');
        } catch (error) {
          setCatalogMessage(error instanceof Error ? error.message : 'Neplatný katalóg.');
        }
      }}>Uložiť katalóg</button>
      <button type="button" className={`${control} ml-2`} onClick={() => setCatalogText(JSON.stringify(DEFAULT_MATERIAL_CATALOG, null, 2))}>Načítať predvolený JSON</button>
      <p className="mt-2 whitespace-pre-wrap text-xs" role="status">{catalogMessage}</p>
    </details>}
  </div>;
}
