import { ExtrudeGeometry, MeshStandardMaterial, Shape, SRGBColorSpace } from "three";

export function createPersonalDoorMaterial(
  base: MeshStandardMaterial | null,
  color: string,
  wood: boolean,
  wireframe: boolean,
) {
  if (wood && base && !wireframe) {
    const material = base.clone();
    if (base.map) {
      material.map = base.map.clone();
      material.map.colorSpace = SRGBColorSpace;
      material.map.needsUpdate = true;
    }
    material.normalScale.set(0.35, 0.35);
    material.roughness = 0.7;
    material.metalness = 0.05;
    return material;
  }
  return new MeshStandardMaterial({ color, roughness: 0.43, metalness: 0.15, wireframe });
}

export function createPersonalDoorGeometry(width: number, height: number) {
  const bevel = 0.002;
  const x = width / 2 - bevel;
  const y = height / 2 - bevel;
  const shape = new Shape();
  shape.moveTo(-x, -y);
  shape.lineTo(x, -y);
  shape.lineTo(x, y);
  shape.lineTo(-x, y);
  shape.closePath();
  const geometry = new ExtrudeGeometry(shape, {
    depth: 0.036,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    steps: 1,
    curveSegments: 1,
  });
  geometry.translate(0, 0, -0.018);
  const positions = geometry.getAttribute("position");
  const uv = geometry.getAttribute("uv");
  for (let i = 0; i < positions.count; i++) {
    uv.setXY(i, (positions.getX(i) + width / 2) / width, (positions.getY(i) + height / 2) / height);
  }
  uv.needsUpdate = true;
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}
