import { loadMaterialCatalog, type SteelProfile } from './catalog';
import { calculateMaterialGeometry, type StructuralElement, type StructuralRole } from './geometry';
import { resolveProjectOpenings, type HallMaterialProject } from './project';
import { buildBays, type Opening, type V3 } from '../garage/openingSystem';

export type SteelReportKind = 'primary' | 'secondary';
type Role = StructuralRole | 'baseProfile' | 'eaveProfile';
type Member = Pick<StructuralElement, 'id' | 'lengthM' | 'from' | 'to'> & { role: Role; plane?: string };

export const steelRoleNames: Record<Role, string> = {
  column: 'Stĺp', rafter: 'Nosník', eaveHaunch: 'Odkvapový nábeh', ridgeHaunch: 'Hrebeňový nábeh',
  gableColumn: 'Štítový stĺp', centerColumn: 'Stredový stĺp', centerHaunch: 'Nábeh stredového stĺpa',
  purlin: 'Väznica', girt: 'Paždík', wallBracing: 'Stenové stužidlo', roofBracing: 'Strešné stužidlo',
  baseProfile: 'Soklový profil', eaveProfile: 'Odkvapový profil',
};

const secondaryRoles = new Set<Role>(['purlin', 'girt', 'baseProfile', 'eaveProfile']);
const bracingRoles = new Set<Role>(['wallBracing', 'roofBracing']);
const planes = [
  ['front', 'Stena A · predná'], ['right', 'Stena B · pravá'], ['back', 'Stena C · zadná'], ['left', 'Stena D · ľavá'],
  ['roof-left', 'Strecha A'], ['roof-right', 'Strecha B'],
] as const;

export interface SteelRow {
  role: Role;
  name: string;
  material: string;
  length: number;
  count: number;
  pieceVolume: number | null;
  pieceMass: number | null;
  pieceSurface: number | null;
  volume: number | null;
  mass: number | null;
  surface: number | null;
  unitPrice: number | null;
  price: number | null;
}

export function buildSteelReport(project: HallMaterialProject, kind: SteelReportKind, openings: Opening[] = resolveProjectOpenings(project)) {
  const catalog = loadMaterialCatalog(project.materialSettings?.catalog);
  const params = { ...project.params, roofType: catalog.claddingReportRoofType ?? project.params.roofType };

  const model = calculateMaterialGeometry(params, openings, { templateId: project.templateId, claddingReportEnvelope: true });
  const profiles = new Map(catalog.steelProfiles.map(profile => [profile.id, profile]));
  const assignments = project.materialSettings?.profileAssignments;
  const profileOf = (member: Member): SteelProfile | undefined => profiles.get(
    assignments?.[member.id] ?? (member.plane ? assignments?.[member.role + ':' + member.plane] : undefined)
      ?? assignments?.[member.role] ?? '',
  );
  const shed = params.roofType === 'shed' && !params.hasAttic && !params.twinRoof;
  const { width, length, clearHeight } = params;
  const halfW = width / 2, halfL = length / 2;
  const pitch = Math.tan(params.roofPitchDeg * Math.PI / 180);
  const roofHeight = (x: number) => clearHeight + (shed ? x + halfW : halfW - Math.abs(x)) * pitch;
  const secondary: Member[] = [];
  const primary: Member[] = [];
  for (const item of model.structure) {
    if (item.role === 'purlin') {
      const [x, , z0] = item.from;
      const [, , z1] = item.to;
      const plane = shed || x <= 0 ? 'roof-left' : 'roof-right';
      secondary.push({ ...item, plane, from: [x, roofHeight(x), z0], to: [x, roofHeight(x), z1] });
    } else if (item.role !== 'girt') {
      if (!shed) {
        primary.push(item);
        continue;
      }
      if (item.role === 'rafter') {
        if (!item.id.endsWith(':left')) continue;
        const z = item.from[2];
        primary.push({ ...item, from: [-halfW, clearHeight, z], to: [halfW, roofHeight(halfW), z],
          lengthM: Math.hypot(width, width * pitch) });
      } else if (item.role === 'column' || item.role === 'gableColumn' || item.role === 'centerColumn' || item.role === 'roofBracing') {
        const from: V3 = item.role === 'roofBracing' ? [item.from[0], roofHeight(item.from[0]), item.from[2]] : item.from;
        const to: V3 = [item.to[0], roofHeight(item.to[0]), item.to[2]];
        primary.push({ ...item, from, to, lengthM: Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]) });
      } else if (item.role === 'wallBracing') {
        const shift = (point: V3): V3 => [point[0], point[1] > clearHeight / 2 ? point[1] + roofHeight(point[0]) - clearHeight : point[1], point[2]];
        const from = shift(item.from), to = shift(item.to);
        primary.push({ ...item, from, to, lengthM: Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]) });
      }
    }
  }

  if (model.surfaces.length) {
    const bays = new Map(buildBays(params).map(bay => [bay.id, bay]));
    for (const [plane] of planes.slice(0, 4)) {
      const side = plane === 'left' || plane === 'right';
      const span = side ? length : width;
      const at = (x: number, y: number): V3 => plane === 'left' ? [-halfW, y, x - halfL] :
        plane === 'right' ? [halfW, y, halfL - x] :
        plane === 'front' ? [halfW - x, y, -halfL] : [x - halfW, y, halfL];
      const holes = openings.flatMap(opening => {
        const bay = bays.get(opening.bayId);
        if (bay?.surface !== plane) return [];
        const [x, , z] = bay.position3D;
        const origin = span / 2 + (plane === 'left' ? z : plane === 'right' ? -z : plane === 'front' ? -x : x);
        const start = origin - bay.width / 2 + opening.x;
        return [{ ...opening, start }];
      });
      const eave = side ? roofHeight(at(0, 0)[0]) : clearHeight;
      function run(role: Role, height: number, cutAtOpenings: boolean, existingId?: string) {
        const cuts = holes.filter(hole => cutAtOpenings && height >= hole.y && height < hole.y + hole.height)
          .map(hole => [Math.max(0, hole.start), Math.min(span, hole.start + hole.width)])
          .sort((a, b) => a[0] - b[0]);
        let start = 0;
        const add = (end: number) => {
          if (end - start < 1e-6) return;
          secondary.push({ id: existingId ?? [role, plane, height].join(':'), role, plane,
            from: at(start, height), to: at(end, height), lengthM: end - start });
        };
        for (const [from, to] of cuts) {
          add(from);
          start = Math.max(start, to);
        }
        add(span);
      }
      for (const height of [1.5, 3, 4.5, 5.8].filter(value => value < eave - .3)) {
        run('girt', height, true, side ? 'girt:' + height + ':' + (plane === 'left' ? -1 : 1) : undefined);
      }
      run('baseProfile', params.hasStemWall === false ? 0 : params.stemWallHeight ?? .27, true);
      if (side) run('eaveProfile', eave, false);
    }
  }

  function group(members: Member[], lineal = false, byRole = true) {
    const rows = new Map<string, SteelRow>();
    for (const member of members) {
      const profile = profileOf(member);
      const key = JSON.stringify([byRole ? member.role : null, profile?.id ?? member.role, lineal ? null : member.lengthM.toFixed(6)]);
      const row = rows.get(key) ?? {
        role: member.role, name: profile?.designation ?? 'Profil neurčený', material: profile?.steelGrade ?? 'Oceľ',
        length: 0, count: 0, pieceVolume: null, pieceMass: null, pieceSurface: null,
        volume: null, mass: null, surface: null, unitPrice: profile?.unitPricePerMEur ?? null, price: null,
      };
      row.length += member.lengthM;
      row.count++;
      row.mass = profile?.kgPerM == null ? null : row.length * profile.kgPerM;
      row.volume = row.mass == null ? null : row.mass / 7850;
      row.surface = profile?.surfaceM2PerM == null ? null : row.length * profile.surfaceM2PerM;
      row.pieceMass = row.mass == null ? null : row.mass / row.count;
      row.pieceVolume = row.volume == null ? null : row.volume / row.count;
      row.pieceSurface = row.surface == null ? null : row.surface / row.count;
      row.price = row.unitPrice == null ? null : row.length * row.unitPrice;
      rows.set(key, row);
    }
    return [...rows.values()];
  }

  const frameMembers = new Map<string, Member[]>();
  for (const member of primary) {
    if (!member.id.startsWith('frame:')) continue;
    const id = member.id.split(':')[1];
    const frame = frameMembers.get(id) ?? [];
    frame.push(member);
    frameMembers.set(id, frame);
  }
  const frameTypes = new Map<string, { count: number; rows: SteelRow[]; members: Member[] }>();
  for (const members of frameMembers.values()) {
    const signature = members.map(member => JSON.stringify([member.role, profileOf(member)?.id, member.lengthM.toFixed(6)])).sort().join('|');
    const frame = frameTypes.get(signature);
    if (frame) frame.count++;
    else frameTypes.set(signature, { count: 1, rows: group(members), members });
  }
  const members = kind === 'primary' ? primary : secondary;
  const notes = model.limitations.filter(note => !note.startsWith('Výrobný rozpis') && !note.startsWith('Oceľ:'));
  notes.push('Výkaz vychádza z orientačnej geometrie hlavnej lode. Výrobné spoje, pätky, kotvy a samostatné plechy vyžadujú technické podklady.');
  if (shed) notes.push('Nábehy pultových rámov vyžadujú samostatné technické podklady.');
  if (kind === 'secondary') notes.push('Paždíky sú členené podľa stien a prerušené v evidovaných otvoroch. Dĺžky nezahŕňajú montážne presahy.');
  if (project.openings === undefined) notes.push('Rozpis otvorov vychádza z dostupných údajov projektu alebo šablóny.');
  if (members.some(member => !profileOf(member))) notes.push('Prvky bez priradeného profilu majú uvedenú dĺžku a počet. Profil možno priradiť v nastavení výkazu.');
  return {
    kind, id: project.id, title: project.name ?? project.templateId, params, members, notes,
    context: kind === 'secondary' ? primary.filter(member => !bracingRoles.has(member.role)) : [],
    summary: group(members.filter(member => kind === 'secondary' || !bracingRoles.has(member.role)), kind === 'secondary', kind === 'primary'),
    bracing: group(primary.filter(member => bracingRoles.has(member.role))),
    frames: [...frameTypes.values()],
    planes: planes.filter(([id]) => !shed || id !== 'roof-right')
      .map(([id, name]) => ({ name, rows: group(secondary.filter(member => member.plane === id), true) })),
  };
}

export type SteelReport = ReturnType<typeof buildSteelReport>;
