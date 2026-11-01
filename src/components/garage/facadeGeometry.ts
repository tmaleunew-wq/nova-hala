import { BufferGeometry, Float32BufferAttribute, ShapeUtils, Vector2 } from "three";
import type { Shape } from "three";

/** Convex wall/roofline outlines with rectangular openings, matching existing panels. */
export function createFacadeGeometry(
  shape: Shape,
  thickness: number,
  type: string,
  horizontal: boolean,
) {
  const outline = shape.getPoints();
  if (outline[0].equals(outline[outline.length - 1])) outline.pop();
  if (ShapeUtils.isClockWise(outline)) outline.reverse();
  const minX = Math.min(...outline.map((p) => p.x));
  const maxX = Math.max(...outline.map((p) => p.x));
  const minY = Math.min(...outline.map((p) => p.y));
  const maxY = Math.max(...outline.map((p) => p.y));
  const holes = shape.holes.map((hole) => {
    const points = hole.getPoints();
    return {
      x0: Math.min(...points.map((p) => p.x)),
      x1: Math.max(...points.map((p) => p.x)),
      y0: Math.min(...points.map((p) => p.y)),
      y1: Math.max(...points.map((p) => p.y)),
    };
  });
  const wood = type.startsWith("wood_");
  const smooth = type === "smooth";
  const sandwich = type === "sandwich";
  const crossMin = horizontal ? minY : minX;
  const crossMax = horizontal ? maxY : maxX;
  const count = Math.max(
    1,
    Math.round((crossMax - crossMin) / (wood ? 0.18 : sandwich || smooth ? 1 : 0.25)),
  );
  const profile = smooth
    ? [
        [0, 0.001],
        [1, 0.001],
      ]
    : wood
      ? [
          [0, 0.001],
          [0.015, 0.001],
          [0.035, 0.006],
          [0.965, 0.006],
          [0.985, 0.001],
          [1, 0.001],
        ]
      : sandwich
        ? [
            [0, 0.001],
            [0.003, 0.001],
            [0.008, 0.005],
            [0.3, 0.005],
            [0.305, 0.0065],
            [0.31, 0.005],
            [0.69, 0.005],
            [0.695, 0.0065],
            [0.7, 0.005],
            [0.992, 0.005],
            [0.997, 0.001],
            [1, 0.001],
          ]
        : [
            [0, 0.002],
            [0.22, 0.002],
            [0.35, 0.02],
            [0.65, 0.02],
            [0.78, 0.002],
            [1, 0.002],
          ];
  const samples: [number, number][] = [];
  for (let i = 0; i < count; i++) {
    for (let j = i === 0 ? 0 : 1; j < profile.length; j++) {
      samples.push([
        crossMin + ((i + profile[j][0]) * (crossMax - crossMin)) / count,
        profile[j][1],
      ]);
    }
  }
  const rise = (p: Vector2) => {
    const cross = horizontal ? p.y : p.x;
    const i = Math.max(
      1,
      samples.findIndex((sample) => sample[0] >= cross - 1e-9),
    );
    const a = samples[i - 1];
    const b = samples[i];
    const t = Math.max(0, Math.min(1, (cross - a[0]) / (b[0] - a[0])));
    return thickness / 2 + 0.0005 + a[1] + (b[1] - a[1]) * t;
  };
  const sorted = (values: number[]) => [...new Set(values)].sort((a, b) => a - b);
  const xs = sorted([
    minX,
    maxX,
    ...(!horizontal ? samples.map((p) => p[0]) : []),
    ...holes.flatMap((h) => [h.x0, h.x1]),
  ]);
  const ys = sorted([
    minY,
    maxY,
    ...(horizontal ? samples.map((p) => p[0]) : []),
    ...holes.flatMap((h) => [h.y0, h.y1]),
  ]);
  const positions: number[] = [];
  const uvs: number[] = [];
  const vertex = (p: Vector2, z: number) => {
    positions.push(p.x, p.y, z);
    uvs.push((p.x - minX) / (maxX - minX), (p.y - minY) / (maxY - minY));
  };
  // Clip each profile strip against the actual gable/shed outline.
  const clip = (input: Vector2[]) => {
    let polygon = input;
    for (let i = 0; i < outline.length && polygon.length; i++) {
      const a = outline[i],
        b = outline[(i + 1) % outline.length];
      const distance = (p: Vector2) => (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
      const output: Vector2[] = [];
      for (let j = 0; j < polygon.length; j++) {
        const p = polygon[j],
          q = polygon[(j + 1) % polygon.length];
        const dp = distance(p),
          dq = distance(q);
        if (dp >= 0) output.push(p);
        if (dp >= 0 !== dq >= 0) output.push(p.clone().lerp(q, dp / (dp - dq)));
      }
      polygon = output;
    }
    return polygon;
  };
  for (let x = 0; x < xs.length - 1; x++) {
    for (let y = 0; y < ys.length - 1; y++) {
      const mx = (xs[x] + xs[x + 1]) / 2,
        my = (ys[y] + ys[y + 1]) / 2;
      if (holes.some((h) => mx > h.x0 && mx < h.x1 && my > h.y0 && my < h.y1)) continue;
      const polygon = clip([
        new Vector2(xs[x], ys[y]),
        new Vector2(xs[x + 1], ys[y]),
        new Vector2(xs[x + 1], ys[y + 1]),
        new Vector2(xs[x], ys[y + 1]),
      ]);
      for (let i = 1; i < polygon.length - 1; i++) {
        for (const p of [polygon[0], polygon[i], polygon[i + 1]]) vertex(p, rise(p));
      }
    }
  }
  // Folded returns on cut edges, including openings; no geometry spans an opening.
  for (const contour of [outline, ...shape.holes.map((h) => h.getPoints())]) {
    for (let i = 0; i < contour.length; i++) {
      const a = contour[i],
        b = contour[(i + 1) % contour.length];
      if (a.distanceToSquared(b) < 1e-12) continue;
      const start = horizontal ? a.y : a.x,
        end = horizontal ? b.y : b.x;
      const cuts = sorted([
        0,
        1,
        ...samples.map((p) => (p[0] - start) / (end - start)).filter((t) => t > 0 && t < 1),
      ]);
      for (let j = 0; j < cuts.length - 1; j++) {
        const p = a.clone().lerp(b, cuts[j]),
          q = a.clone().lerp(b, cuts[j + 1]);
        const bottom = thickness / 2 - Math.min(0.006, thickness / 2);
        vertex(p, rise(p));
        vertex(p, bottom);
        vertex(q, bottom);
        vertex(p, rise(p));
        vertex(q, bottom);
        vertex(q, rise(q));
      }
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}
