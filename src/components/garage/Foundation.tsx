import "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import { makeConcreteTexture } from "@/lib/garage/textures";
import type { GarageParams } from "@/lib/garage/types";

export function Foundation({ p }: { p: GarageParams }) {
  const tex = useMemo(() => makeConcreteTexture(), []);
  tex.repeat.set(Math.max(2, Math.round(p.width)), Math.max(2, Math.round(p.length)));
  const overhang = 0.2;
  return (
    <mesh position={[0, -0.075, 0]} receiveShadow>
      <boxGeometry args={[p.width + overhang * 2, 0.15, p.length + overhang * 2]} />
      <meshStandardMaterial map={tex} color="#8a8f96" roughness={0.95} metalness={0} wireframe={p.wireframe} />
    </mesh>
  );
}
