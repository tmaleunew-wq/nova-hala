import { calculateMaterialGeometry, type Point2 } from '../materials/geometry';
import { resolveProjectOpenings, type HallMaterialProject } from '../materials/project';
import { buildBays } from './openingSystem';

const wallNames = { left: 'Ľavá stena', right: 'Pravá stena', front: 'Predný štít', back: 'Zadný štít' };
export type WallId = keyof typeof wallNames;
export interface DrawingOpening {
  id: string; mark: string; bayId: string; category: string;
  x: number; y: number; width: number; height: number;
}
interface ChainPart { from: number; to: number; length: number; openings: string[] }
export interface WallDrawing {
  id: WallId; name: string; width: number; height: number; eave: number; base: number;
  outline: Point2[]; axes: number[]; openings: DrawingOpening[];
  fields: { id: string; from: number; to: number; chain: ChainPart[] }[];
}
const mm = (m: number) => Math.round(m * 1000);

export function calculateWallDrawings(project: HallMaterialProject): { walls: WallDrawing[]; reason?: string } {
  const p = project.params;
  // Reject invalid input before constructing bay arrays or fitting openings.
  const model = calculateMaterialGeometry(p, [], { templateId: project.templateId });
  if (!model.surfaces.length) return { walls: [], reason: model.limitations[0] };
  if (model.limitations.some(note => note.startsWith('Neúplná geometria:')) || p.hasCenterColumns) {
    return { walls: [], reason: 'Kótované listy sú dostupné pre plne opláštenú jednoloďovú sedlovú halu bez prístavieb a pásového svetlíka.' };
  }
  const bays = buildBays(p);
  const confirmed = resolveProjectOpenings(project);
  const walls = (Object.keys(wallNames) as WallId[]).map(id => {
    const side = id === 'left' || id === 'right';
    const width = mm(side ? p.length : p.width);
    const eave = mm(p.clearHeight);
    const surfaces = model.surfaces.filter(surface => surface.id === id || surface.id.startsWith(`${id}:`));
    const base = mm(Math.min(...surfaces.flatMap(surface => surface.polygon.map(point => point[1]))));
    const outline: Point2[] = side ? [[0, base], [width, base], [width, eave], [0, eave]]
      : surfaces[0].polygon.map(([x, y]) => [mm(x), mm(y)]);
    const height = Math.max(...outline.map(point => point[1]));
    const fieldsByX = bays.filter(bay => bay.surface === id).map(bay => {
      // Face coordinates increase from the left corner as viewed from outside.
      const center = side ? p.length / 2 + (id === 'left' ? 1 : -1) * bay.position3D[2]
        : p.width / 2 + (id === 'back' ? 1 : -1) * bay.position3D[0];
      const origin = center - bay.width / 2;
      return { id: bay.id, origin, from: mm(origin), to: mm(origin + bay.width) };
    }).sort((a, b) => a.from - b.from);
    const origins = new Map(fieldsByX.map(field => [field.id, field.origin]));
    const openings = confirmed.flatMap(opening => {
      const origin = origins.get(opening.bayId);
      if (origin === undefined || ![opening.x, opening.y, opening.width, opening.height].every(Number.isFinite)) return [];
      const x = mm(origin + opening.x), y = mm(opening.y);
      return [{ id: opening.id, bayId: opening.bayId, category: opening.category, x, y,
        width: mm(origin + opening.x + opening.width) - x, height: mm(opening.y + opening.height) - y }];
    }).sort((a, b) => a.x - b.x || a.y - b.y || a.id.localeCompare(b.id)).map((opening, index) => ({ ...opening, mark: `O${index + 1}` }));
    const fields = fieldsByX.map(({ id: fieldId, from, to }) => {
      const local = openings.filter(opening => opening.bayId === fieldId);
      const edges = [...new Set([from, to, ...local.flatMap(opening => [opening.x, opening.x + opening.width])])].sort((a, b) => a - b);
      const chain = edges.slice(1).map((end, index) => ({ from: edges[index], to: end, length: end - edges[index],
        openings: local.filter(opening => opening.x < end && opening.x + opening.width > edges[index]).map(opening => opening.mark) }));
      return { id: fieldId, from, to, chain };
    });
    return { id, name: wallNames[id], width, height, eave, base, outline, openings, fields,
      axes: side ? [0, ...fields.map(field => field.to)] : [0, width] };
  });
  return { walls };
}
