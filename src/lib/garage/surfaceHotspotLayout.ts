import { Euler, Vector3 } from 'three';
import { splitBayPanels, type Bay, type Opening, type V3 } from './openingSystem.ts';

export function surfacePoint(bay: Bay, x: number, y: number, outward = .07): V3 {
  return new Vector3(x - bay.width / 2, y - bay.height / 2, outward)
    .applyEuler(new Euler(...bay.rotation)).add(new Vector3(...bay.position3D)).toArray() as V3;
}

export function addHotspotPosition(bay: Bay, openings: Opening[]): V3 | null {
  const local = openings.filter(o => o.bayId === bay.id);
  if (!local.length) return surfacePoint(bay, bay.width / 2, bay.height / 2);
  const windows = local.filter(o => o.category === 'window' && o.y >= .7);
  const free = splitBayPanels(bay.width, bay.height, local).filter(r => r.width >= .66 && r.height >= .66);
  if (!free.length) return null;
  for (const window of windows) {
    const x = window.x + window.width / 2, y = window.y / 2;
    if (free.some(r => x - .33 >= r.x && x + .33 <= r.x + r.width && y - .33 >= r.y && y + .33 <= r.y + r.height)) return surfacePoint(bay, x, y);
  }
  const largest = free.reduce((a, b) => a.width * a.height >= b.width * b.height ? a : b);
  return surfacePoint(bay, largest.x + largest.width / 2, largest.y + largest.height / 2);
}

function axisLetter(index: number): string {
  let label = '';
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) label = String.fromCharCode(65 + (n - 1) % 26) + label;
  return label;
}
export function gridBubbles(bays: Bay[]) {
  const result: { id: string; label: string; position: V3; normal: V3 }[] = [];
  for (const surface of ['left', 'right', 'front', 'back']) {
    const points = new Map<string, { position: V3; normal: V3 }>();
    for (const bay of bays.filter(b => b.surface === surface)) for (const x of [0, bay.width]) {
      const position = surfacePoint(bay, x, bay.height, .09);
      points.set(position.map(v => v.toFixed(5)).join(','), { position, normal: bay.normal });
    }
    const longitudinal = surface === 'left' || surface === 'right';
    [...points.values()].sort((a, b) => a.position[longitudinal ? 2 : 0] - b.position[longitudinal ? 2 : 0]).forEach((point, i) => result.push({ ...point, id: `${surface}-${i}`, label: longitudinal ? axisLetter(i) : String(i + 1) }));
  }
  return result;
}
