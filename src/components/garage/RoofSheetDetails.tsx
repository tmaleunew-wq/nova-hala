import { useEffect, useMemo } from 'react';
import { BufferGeometry, Float32BufferAttribute } from 'three';
import type { Rect } from '@/lib/garage/openingSystem';

/** Ribs run down the slope. Clipped rectangles keep every roof opening clear. */
export function createRoofRibGeometry(width: number, height: number, panels: Rect[], offset = 0) {
  const vertices: number[] = [];
  const pitch = 1 / 3;
  const ribHeight = (y: number, center: number) => {
    const distance = Math.abs(y - center);
    return .052 + .025 * Math.max(0, Math.min(1, (.045 - distance) / .025));
  };
  for (const panel of panels) {
    const first = Math.ceil((panel.y + offset - .045) / pitch);
    const last = Math.floor((panel.y + panel.height + offset + .045) / pitch);
    for (let index = first; index <= last; index++) {
      const center = index * pitch - offset;
      const bottom = Math.max(panel.y, center - .045);
      const top = Math.min(panel.y + panel.height, center + .045);
      if (top <= bottom) continue;
      const cuts = [bottom, center - .02, center + .02, top]
        .filter(y => y >= bottom && y <= top);
      for (let i = 0; i < cuts.length - 1; i++) {
        const x1 = panel.x - width / 2;
        const x2 = x1 + panel.width;
        const y1 = cuts[i] - height / 2;
        const y2 = cuts[i + 1] - height / 2;
        const z1 = ribHeight(cuts[i], center);
        const z2 = ribHeight(cuts[i + 1], center);
        vertices.push(x1, y1, z1, x2, y1, z1, x2, y2, z2,
          x1, y1, z1, x2, y2, z2, x1, y2, z2);
      }
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

export function RoofSheetDetails({ width, height, panels, offset = 0, color, opacity = 1, receiveShadow = true }: {
  width: number; height: number; panels?: Rect[]; offset?: number; color: string; opacity?: number; receiveShadow?: boolean;
}) {
  const geometry = useMemo(() => createRoofRibGeometry(width, height,
    panels ?? [{ x: 0, y: 0, width, height }], offset), [width, height, panels, offset]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} receiveShadow={receiveShadow}>
    <meshStandardMaterial color={color} metalness={.3} roughness={.62}
      transparent={opacity < 1} opacity={opacity} depthWrite={opacity >= 1} />
  </mesh>;
}
