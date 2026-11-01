import { BufferGeometry, Float32BufferAttribute } from "three";

export type RoofCoverDimensions = {
  width: number;
  height: number;
  thickness: number;
  panelType: string;
  alongY: boolean;
  reverse: boolean;
};

/** Panel-local coordinates: +Z is outside; v runs from uphill to downhill. */
export function roofCoverPoint(
  u: number,
  v: number,
  z: number,
  d: RoofCoverDimensions,
): [number, number, number] {
  if (d.alongY) return [u - d.width / 2, d.reverse ? d.height - v : v, z];
  return [d.reverse ? d.width / 2 - v : v - d.width / 2, u, z];
}

export function createRoofCoverGeometry(d: RoofCoverDimensions): BufferGeometry {
  const span = d.alongY ? d.width : d.height;
  const run = d.alongY ? d.height : d.width;
  const tile = d.panelType === "tile";
  const smooth = d.panelType === "smooth";
  const sandwich = d.panelType === "sandwich";
  const count = Math.max(1, Math.round(span / (tile ? 0.3 : smooth ? 1 : sandwich ? 1 / 3 : 0.25)));
  const rows = tile ? Math.max(1, Math.ceil(run / 0.35)) : 1;
  const base = d.thickness / 2 + 0.001;
  const positions: number[] = [];
  const quad = (a: number[], b: number[], c: number[], e: number[]) => {
    positions.push(...a, ...b, ...c, ...a, ...c, ...e);
  };
  const profile = tile
    ? Array.from({ length: 9 }, (_, i) => [i / 8, 0.003 + 0.023 * Math.sin((i / 8) * Math.PI) ** 2])
    : smooth
      ? [
          [0, 0.001],
          [0.012, 0.001],
          [0.025, 0.004],
          [0.975, 0.004],
          [0.988, 0.001],
          [1, 0.001],
        ]
      : sandwich
        ? [
            [0, 0.002],
            [0.16, 0.002],
            [0.18, 0.004],
            [0.2, 0.002],
            [0.36, 0.002],
            [0.44, 0.04],
            [0.56, 0.04],
            [0.64, 0.002],
            [0.8, 0.002],
            [0.82, 0.004],
            [0.84, 0.002],
            [1, 0.002],
          ]
        : [
            [0, 0.002],
            [0.22, 0.002],
            [0.35, 0.03],
            [0.65, 0.03],
            [0.78, 0.002],
            [1, 0.002],
          ];
  const samples: [number, number][] = [];
  for (let rib = 0; rib < count; rib++) {
    for (let i = rib === 0 ? 0 : 1; i < profile.length; i++) {
      samples.push([((rib + profile[i][0]) * span) / count, profile[i][1]]);
    }
  }
  const p = (u: number, v: number, rise: number) => roofCoverPoint(u, v, base + rise, d);
  // Keep top winding outward for both slope directions and both panel layouts.
  const flip = d.alongY ? d.reverse : !d.reverse;
  for (let row = 0; row < rows; row++) {
    const start = tile ? row * 0.35 : 0;
    const end = tile ? Math.min(run, (row + 1) * 0.35) : run;
    const overlap = tile ? (0.012 * (end - start)) / 0.35 : 0;
    for (let i = 0; i < samples.length - 1; i++) {
      const [u0, h0] = samples[i];
      const [u1, h1] = samples[i + 1];
      const a = p(u0, start, h0);
      const b = p(u1, start, h1);
      const c = p(u1, end, h1 + overlap);
      const e = p(u0, end, h0 + overlap);
      if (flip) quad(e, c, b, a);
      else quad(a, b, c, e);
      // Thin closed folds at row overlaps and cut sheet ends.
      quad(a, p(u0, start, 0), p(u1, start, 0), b);
      quad(e, c, p(u1, end, 0), p(u0, end, 0));
    }
    for (const edge of [samples[0], samples[samples.length - 1]]) {
      quad(
        p(edge[0], start, edge[1]),
        p(edge[0], end, edge[1] + overlap),
        p(edge[0], end, 0),
        p(edge[0], start, 0),
      );
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}
