import { memo, useEffect, useMemo } from "react";
import type { MeshStandardMaterial } from "three";
import { createPersonalDoorGeometry, createPersonalDoorMaterial } from "./personalDoorAppearance";

/** Attach only to the existing personal-door mesh; shared facade materials stay intact. */
export const PersonalDoorLeafFinish = memo(function PersonalDoorLeafFinish({
  width,
  height,
  color,
  wood,
  base,
  wireframe,
}: {
  width: number;
  height: number;
  color: string;
  wood: boolean;
  base: MeshStandardMaterial | null;
  wireframe: boolean;
}) {
  const geometry = useMemo(() => createPersonalDoorGeometry(width, height), [width, height]);
  const material = useMemo(
    () => createPersonalDoorMaterial(base, color, wood, wireframe),
    [base, color, wood, wireframe],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(
    () => () => {
      if (material.map && material.map !== base?.map) material.map.dispose();
      material.dispose();
    },
    [material, base],
  );
  return (
    <>
      <primitive object={geometry} attach="geometry" />
      <primitive object={material} attach="material" />
    </>
  );
});

export const PersonalDoorFrameFinish = memo(function PersonalDoorFrameFinish({
  width,
  height,
  depth,
  color,
  wood,
  wireframe,
}: {
  width: number;
  height: number;
  depth: number;
  color: string;
  wood: boolean;
  wireframe: boolean;
}) {
  const frameColor = wood ? "#2d3139" : color;
  return (
    <group>
      {[-1, 1].map((face) => (
        <group key={face} position={[0, 0, face * (depth / 2 + 0.0015)]}>
          {[-1, 1].map((side) => (
            <mesh
              key={side}
              position={[side * (width / 2 + 0.015), height / 2 + 0.01, 0]}
              castShadow
            >
              <boxGeometry args={[0.026, height + 0.018, 0.003]} />
              <meshStandardMaterial
                color={frameColor}
                metalness={0.15}
                roughness={0.43}
                wireframe={wireframe}
              />
            </mesh>
          ))}
          <mesh position={[0, height + 0.015, 0]} castShadow>
            <boxGeometry args={[width + 0.052, 0.026, 0.003]} />
            <meshStandardMaterial
              color={frameColor}
              metalness={0.15}
              roughness={0.43}
              wireframe={wireframe}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
});
