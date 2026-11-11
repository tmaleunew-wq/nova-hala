export type V3 = [number, number, number];
export type Bay = { id: string; surface: string; width: number; height: number; position3D: V3; normal: V3; rotation: V3; roof: boolean };
export type Opening = { id: string; bayId: string; category: string; subtype: string; width: number; height: number; x: number; y: number; frameColor: string; fillColor: string };
export type ModalMode = 'ADD' | 'UPDATE' | 'REPLACE';
export type ActiveModalState = {
  bayId: string;
  step: 'CATEGORY' | 'SUBTYPE' | 'PARAMETERS';
  mode?: ModalMode;
  draft?: Opening;
  editingId?: string;
  targetId?: string;
  originalOpening?: Opening;
} | null;
export type Rect = { x: number; y: number; width: number; height: number };

export function buildBays(p: { width: number; length: number; clearHeight: number; bayCount: number; roofPitchDeg: number }): Bay[] {
  const { width: w, length: l, clearHeight: h } = p;
  const n = Math.max(2, p.bayCount), depth = l / n, angle = p.roofPitchDeg * Math.PI / 180;
  const bays: Bay[] = [];
  for (let i = 0; i < n; i++) {
    const z = -l / 2 + (i + .5) * depth;
    for (const side of [-1, 1]) {
      bays.push({ id: `${side < 0 ? 'A' : 'C'}-${i + 1}`, surface: side < 0 ? 'left' : 'right', width: depth, height: h, position3D: [side * (w / 2 + .06), h / 2, z], normal: [side, 0, 0], rotation: [0, side * Math.PI / 2, 0], roof: false });
      bays.push({ id: `R${side < 0 ? 'A' : 'C'}-${i + 1}`, surface: side < 0 ? 'roof-left' : 'roof-right', width: w / 2 / Math.cos(angle), height: depth, position3D: [side * w / 4, h + w / 4 * Math.tan(angle) + .08, z], normal: [side * Math.sin(angle), Math.cos(angle), 0], rotation: [-Math.PI / 2, side * angle, 0], roof: true });
    }
  }
  const columns = Math.max(1, Math.ceil(w / 6));
  for (const side of [-1, 1]) for (let i = 0; i < columns; i++) {
    bays.push({ id: `${side < 0 ? 'D' : 'B'}-${i + 1}`, surface: side < 0 ? 'front' : 'back', width: w / columns, height: h, position3D: [-w / 2 + (i + .5) * w / columns, h / 2, side * (l / 2 + .05)], normal: [0, 0, side], rotation: [0, side < 0 ? Math.PI : 0, 0], roof: false });
  }
  return bays;
}

/** Subtract any number of rectangular openings; coordinates are metres from bottom-left. */
export function splitBayPanels(width: number, height: number, holes: Rect[]): Rect[] {
  let panels: Rect[] = [{ x: 0, y: 0, width, height }];
  for (const hole of holes) panels = panels.flatMap(p => {
    const left = Math.max(p.x, hole.x), right = Math.min(p.x + p.width, hole.x + hole.width);
    const bottom = Math.max(p.y, hole.y), top = Math.min(p.y + p.height, hole.y + hole.height);
    if (left >= right || bottom >= top) return [p];
    return [
      { x: p.x, y: p.y, width: left - p.x, height: p.height },
      { x: right, y: p.y, width: p.x + p.width - right, height: p.height },
      { x: left, y: p.y, width: right - left, height: bottom - p.y },
      { x: left, y: top, width: right - left, height: p.y + p.height - top },
    ].filter(r => r.width > 1e-6 && r.height > 1e-6);
  });
  return panels;
}

export function fitOpening(o: Opening, bay: Bay): Opening {
  const width = Math.max(.1, Math.min(o.width, bay.width - .2));
  const height = Math.max(.1, Math.min(o.height, bay.height - .2));
  return { ...o, width, height, x: Math.max(.1, Math.min(o.x, bay.width - width - .1)), y: Math.max(bay.roof ? .1 : 0, Math.min(o.y, bay.height - height - .1)) };
}
export function overlaps(a: Rect, b: Rect) {
  return a.x < b.x + b.width + .05 && a.x + a.width + .05 > b.x && a.y < b.y + b.height + .05 && a.y + a.height + .05 > b.y;
}

export * from './collisionEngine';

export function openingToCollision(o: Opening, bay: Bay) {
  return {
    id: o.id,
    category: o.category,
    subtype: o.subtype,
    surface: bay.surface as any,
    x: o.x,
    y: o.y,
    width: o.width,
    height: o.height,
    bayId: bay.id,
  };
}

