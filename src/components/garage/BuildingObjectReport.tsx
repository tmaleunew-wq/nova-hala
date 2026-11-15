import { useMemo, useState } from 'react';
import { buildBuildingObjectBom } from '@/lib/materials/building-object-bom';
import { loadMaterialCatalog, type MaterialCatalog } from '@/lib/materials/catalog';
import { calculateMaterialGeometry, type PanelLayoutSpec, type SteelAssignment } from '@/lib/materials/geometry';
import { downloadReport, type ExportRows } from '@/lib/materials/material-export';
import { resolveProjectOpenings, type HallMaterialProject } from '@/lib/materials/project';
import { steelRoleNames } from '@/lib/materials/steel-report';

const number = new Intl.NumberFormat('sk-SK', { maximumFractionDigits: 2 });
const control = 'rounded border border-white/15 bg-slate-950 px-3 py-2 text-xs text-white';
type ProfileRow = { role: string; designation: string; quantity: number; totalLengthM: number; massKg: number | null };
type ObjectRow = {
  objectId: string; name: string; roofAreaM2: number; wallAreaM2: number;
  roofProductName?: string; roofPanelCount: number | null; roofPanelAreaM2: number | null;
  roofMassKg: number | null; knownSteelMassKg: number; steelMassComplete: boolean;
  profiles: ProfileRow[]; warnings: string[];
};

function mainHallRow(project: HallMaterialProject, catalog: MaterialCatalog): ObjectRow {
  const settings = project.materialSettings;
  const roof = catalog.panels.find(panel => panel.id === settings?.roofProductId);
  const slope = 100 * Math.tan(project.params.roofPitchDeg * Math.PI / 180);
  const roofSpec: PanelLayoutSpec | undefined = roof && roof.coverWidthMm != null && roof.minLengthMm != null && roof.maxLengthMm != null && roof.minRoofSlopePercent != null && slope > roof.minRoofSlopePercent
    ? { productId: roof.id, coverWidthM: roof.coverWidthMm / 1000, minLengthM: roof.minLengthMm / 1000, maxLengthM: roof.maxLengthMm / 1000, kgPerM2: roof.kgPerM2 } : undefined;
  const assignments: Record<string, SteelAssignment> = {};
  for (const [id, profileId] of Object.entries(settings?.profileAssignments ?? {})) {
    const profile = catalog.steelProfiles.find(item => item.id === profileId);
    if (profile) assignments[id] = { profileId, kgPerM: profile.kgPerM };
  }
  const geometry = calculateMaterialGeometry(project.params, resolveProjectOpenings(project), {
    templateId: project.templateId, roofPanel: roofSpec, steelAssignments: assignments,
  });
  const profiles = new Map<string, ProfileRow>();
  for (const item of geometry.structure) {
    const key = `${item.role}:${item.profileId ?? ''}`;
    const row = profiles.get(key) ?? { role: item.role, designation: catalog.steelProfiles.find(profile => profile.id === item.profileId)?.designation ?? 'Neurčený', quantity: 0, totalLengthM: 0, massKg: item.massKg == null ? null : 0 };
    row.quantity += 1;
    row.totalLengthM += item.lengthM;
    row.massKg = row.massKg == null || item.massKg == null ? null : row.massKg + item.massKg;
    profiles.set(key, row);
  }
  const strips = geometry.surfaces.filter(face => face.kind === 'roof').flatMap(face => face.strips);
  return {
    objectId: '__main_hall__', name: 'Hlavná hala', roofAreaM2: geometry.totals.roofGrossM2,
    wallAreaM2: geometry.totals.wallNetM2, roofProductName: roof?.name,
    roofPanelCount: roofSpec ? strips.length : null,
    roofPanelAreaM2: roofSpec ? geometry.totals.roofOrderedM2 : null,
    roofMassKg: roofSpec && strips.every(strip => strip.massKg != null) ? strips.reduce((sum, strip) => sum + (strip.massKg ?? 0), 0) : null,
    knownSteelMassKg: geometry.totals.knownSteelMassKg,
    steelMassComplete: geometry.totals.steelMassComplete, profiles: [...profiles.values()],
    warnings: geometry.limitations.filter(note => !note.startsWith('Výrobný rozpis stien')),
  };
}

function Table({ columns, rows }: { columns: string[]; rows: ExportRows }) {
  return <div className="overflow-x-auto rounded border border-white/10"><table className="w-full text-left text-xs">
    <thead className="bg-white/5 text-slate-300"><tr>{columns.map(column => <th scope="col" key={column} className="whitespace-nowrap px-3 py-2">{column}</th>)}</tr></thead>
    <tbody>{rows.map((row, index) => <tr key={index} className={row[0] === 'SPOLU' ? 'border-t border-cyan-400/40 bg-cyan-950/30 font-semibold' : 'border-t border-white/10'}>{row.map((cell, cellIndex) => <td key={cellIndex} className="px-3 py-2">{typeof cell === 'number' ? number.format(cell) : cell ?? 'Neurčené'}</td>)}</tr>)}</tbody>
  </table></div>;
}

export function BuildingObjectReport({ project, catalog: suppliedCatalog }: { project: HallMaterialProject; catalog?: MaterialCatalog }) {
  const [selected, setSelected] = useState('all');
  const catalog = useMemo(() => suppliedCatalog ?? loadMaterialCatalog(project.materialSettings?.catalog), [suppliedCatalog, project.materialSettings?.catalog]);
  const objects: ObjectRow[] = useMemo(() => [mainHallRow(project, catalog), ...buildBuildingObjectBom(project, catalog)], [project, catalog]);
  const activeSelection = objects.some(object => object.objectId === selected) ? selected : 'all';
  const visible = activeSelection === 'all' ? objects : objects.filter(object => object.objectId === activeSelection);
  const sum = (key: 'roofAreaM2' | 'wallAreaM2' | 'knownSteelMassKg') => visible.reduce((total, row) => total + row[key], 0);
  const completeSum = (key: 'roofPanelCount' | 'roofPanelAreaM2' | 'roofMassKg') => visible.every(row => row[key] != null) ? visible.reduce((total, row) => total + (row[key] ?? 0), 0) : null;
  const steelKnown = (row: ObjectRow) => row.profiles.some(profile => profile.massKg != null);
  const steelStatus = (complete: boolean, known: boolean) => complete ? 'Úplná pre uvedené prvky' : known ? 'Čiastočná · chýbajú profily/kg/m' : 'Neurčená · chýbajú profily/kg/m';
  const summaryColumns = ['Objekt', 'Strecha m²', 'Steny m²', 'Strešný výrobok', 'Panely ks', 'Objednávka m²', 'Panely kg', 'Oceľ kg (známe)', 'Stav hmotnosti ocele'];
  const summary: ExportRows = visible.map(row => [row.name, row.roofAreaM2, row.wallAreaM2, row.roofProductName ?? null, row.roofPanelCount, row.roofPanelAreaM2, row.roofMassKg, steelKnown(row) ? row.knownSteelMassKg : null, steelStatus(row.steelMassComplete, steelKnown(row))]);
  if (visible.length > 1) summary.push(['SPOLU', sum('roofAreaM2'), sum('wallAreaM2'), 'Podľa objektov', completeSum('roofPanelCount'), completeSum('roofPanelAreaM2'), completeSum('roofMassKg'), visible.some(steelKnown) ? sum('knownSteelMassKg') : null, steelStatus(visible.every(row => row.steelMassComplete), visible.some(steelKnown))]);
  const profileColumns = ['Objekt', 'Prvok', 'Profil', 'Počet ks', 'Celková dĺžka m', 'Hmotnosť kg'];
  const profileRows: ExportRows = visible.flatMap(row => row.profiles.map(profile => [row.name, steelRoleNames[profile.role as keyof typeof steelRoleNames] ?? profile.role, profile.designation, profile.quantity, profile.totalLengthM, profile.massKg]));
  const warnings = visible.flatMap(row => row.warnings.map(warning => `${row.name}: ${warning}`));
  const exportRows: ExportRows = [['Výkaz podľa objektov', project.name ?? project.templateId], ['Katalóg', catalog.version], summaryColumns, ...summary, [], profileColumns, ...profileRows, [], ['Poznámky'], ['Hmotnosť obsahuje iba položky s určeným profilom a známym kg/m. Neurčené údaje nie sú nula.'], ...warnings.map(warning => [warning])];
  return <section className="space-y-4 rounded-xl border border-cyan-500/25 bg-slate-900/50 p-4 text-sm text-slate-100" aria-label="Materiálový výkaz podľa objektov">
    <div className="flex flex-wrap items-center gap-2">
      <h3 className="mr-auto font-semibold text-cyan-300">Hala a prístavby · spoločný výkaz</h3>
      <label className="flex items-center gap-2 text-xs">Objekt<select className={control} value={activeSelection} onChange={event => setSelected(event.target.value)}><option value="all">Všetky objekty</option>{objects.map(object => <option key={object.objectId} value={object.objectId}>{object.name}</option>)}</select></label>
      {(['csv', 'xlsx'] as const).map(format => <button type="button" key={format} className={control} onClick={() => downloadReport(exportRows, format, 'vykaz-objektov')}>{format.toUpperCase()}</button>)}
    </div>
    <Table columns={summaryColumns} rows={summary} />
    <p className="text-xs text-slate-300">Počet panelov vychádza z údajov zvoleného výrobku. Neurčené údaje nie sú nula. Hmotnosť ocele je iba súčet prvkov so známym profilom a kg/m; stav čiastočná označuje neúplný súčet.</p>
    <details open><summary className="mb-2 cursor-pointer font-medium">Oceľové prvky podľa objektov</summary><Table columns={profileColumns} rows={profileRows} /></details>
    {warnings.length > 0 && <details><summary className="cursor-pointer text-xs text-amber-300">Predpoklady a chýbajúce údaje ({warnings.length})</summary><ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-300">{warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul></details>}
  </section>;
}