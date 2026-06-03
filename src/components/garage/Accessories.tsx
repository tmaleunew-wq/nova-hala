import "@react-three/fiber";
import * as THREE from "three";
import { useMemo } from "react";
import type { GarageParams } from "@/lib/garage/types";
import { ridgeHeight, highEave } from "./Structure";

/** Sectional door panels (front). */
function SectionalDoor({ p, explodeY }: { p: GarageParams; explodeY: number }) {
  const panels = 4;
  const panelH = p.doorHeight / panels;
  const z = -p.length / 2 - 0.025 + explodeY * -2.2;
  return (
    <group position={[0, 0, z]}>
      {Array.from({ length: panels }).map((_, i) => {
        const y = 0.02 + i * panelH + panelH / 2;
        return (
          <mesh key={i} position={[0, y, 0]} castShadow receiveShadow>
            <boxGeometry args={[p.doorWidth, panelH - 0.01, 0.04]} />
            <meshStandardMaterial color="#cdd3da" metalness={0.7} roughness={0.4} wireframe={p.wireframe} />
          </mesh>
        );
      })}
      {/* door tracks */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[(s * p.doorWidth) / 2, p.doorHeight / 2 + 0.02, 0.02]} castShadow>
          <boxGeometry args={[0.04, p.doorHeight, 0.02]} />
          <meshStandardMaterial color="#3a3f47" metalness={0.8} roughness={0.4} wireframe={p.wireframe} />
        </mesh>
      ))}
    </group>
  );
}

function PersonalDoor({ p, explodeY }: { p: GarageParams; explodeY: number }) {
  if (!p.hasPersonalDoor) return null;
  const W = p.width;
  const L = p.length;
  // Position based on side
  let position: [number, number, number] = [0, 0, 0];
  let rotation: [number, number, number] = [0, 0, 0];
  const ex = explodeY;
  if (p.personalDoorSide === "left") {
    position = [-W / 2 - 0.025 + ex * -2.2, 0, -L / 4];
    rotation = [0, -Math.PI / 2, 0];
  } else if (p.personalDoorSide === "right") {
    position = [W / 2 + 0.025 + ex * 2.2, 0, -L / 4];
    rotation = [0, Math.PI / 2, 0];
  } else {
    position = [0, 0, L / 2 + 0.025 + ex * 2.2];
    rotation = [0, 0, 0];
  }
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 1.0, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.88, 1.98, 0.04]} />
        <meshStandardMaterial color="#cdd3da" metalness={0.5} roughness={0.5} wireframe={p.wireframe} />
      </mesh>
      <mesh position={[0.35, 1.0, 0.025]}>
        <sphereGeometry args={[0.025, 16, 16]} />
        <meshStandardMaterial color="#1a1d21" metalness={0.9} roughness={0.3} wireframe={p.wireframe} />
      </mesh>
    </group>
  );
}

function Windows({ p, explodeY }: { p: GarageParams; explodeY: number }) {
  if (p.windowCount <= 0) return null;
  const W = p.width;
  const L = p.length;
  const ex = explodeY;
  // Side: same side as personal door's opposite to avoid collision; default left
  const side = p.personalDoorSide === "left" ? "right" : "left";
  const x = side === "left" ? -W / 2 - 0.025 + ex * -2.2 : W / 2 + 0.025 + ex * 2.2;
  const rotY = side === "left" ? -Math.PI / 2 : Math.PI / 2;
  const items = [];
  for (let i = 0; i < p.windowCount; i++) {
    const t = (i + 1) / (p.windowCount + 1);
    const z = -L / 2 + t * L;
    items.push(
      <group key={i} position={[x, 1.6, z]} rotation={[0, rotY, 0]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[p.windowWidth, p.windowHeight, 0.02]} />
          <meshPhysicalMaterial color="#a8c8e0" transmission={0.5} roughness={0.05} metalness={0.0} ior={1.45} thickness={0.02} wireframe={p.wireframe} />
        </mesh>
        {/* frame */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[p.windowWidth + 0.06, p.windowHeight + 0.06, 0.015]} />
          <meshStandardMaterial color="#2a2d33" metalness={0.4} roughness={0.6} wireframe={p.wireframe} />
        </mesh>
      </group>,
    );
  }
  return <>{items}</>;
}

function Gutters({ p, explodeY }: { p: GarageParams; explodeY: number }) {
  const L = p.length;
  const W = p.width;
  const Heave = p.clearHeight;
  const Hhi = highEave(p);
  const ex = explodeY * 0.4;
  // gutter half-tube along each eave
  const radius = 0.06;
  const geom = useMemo(() => {
    const c = new THREE.CylinderGeometry(radius, radius, L, 24, 1, true, 0, Math.PI);
    c.rotateZ(Math.PI / 2);
    return c;
  }, [L]);

  return (
    <group>
      {/* left eave gutter */}
      <mesh position={[-W / 2 - 0.08 + ex * -1, Heave - 0.05, 0]} geometry={geom} rotation={[0, 0, Math.PI]} castShadow>
        <meshStandardMaterial color="#cdd3da" metalness={0.6} roughness={0.4} side={THREE.DoubleSide} wireframe={p.wireframe} />
      </mesh>
      {/* right eave gutter */}
      <mesh position={[W / 2 + 0.08 + ex, Hhi - 0.05, 0]} geometry={geom} castShadow>
        <meshStandardMaterial color="#cdd3da" metalness={0.6} roughness={0.4} side={THREE.DoubleSide} wireframe={p.wireframe} />
      </mesh>
      {/* downpipes */}
      {[-1, 1].map((sz) =>
        [-1, 1].map((sx) => (
          <mesh
            key={`dp-${sx}-${sz}`}
            position={[sx * (W / 2 + 0.1) + ex * sx, (Heave) / 2 - 0.05, sz * (L / 2 - 0.2)]}
            castShadow
          >
            <cylinderGeometry args={[0.04, 0.04, Heave - 0.05, 16]} />
            <meshStandardMaterial color="#cdd3da" metalness={0.6} roughness={0.4} wireframe={p.wireframe} />
          </mesh>
        )),
      )}
    </group>
  );
}

function CornerFlashings({ p, explodeY }: { p: GarageParams; explodeY: number }) {
  const W = p.width;
  const L = p.length;
  const Heave = p.clearHeight;
  const Hhi = highEave(p);
  const ex = explodeY * 0.6;
  const t = 0.015;
  const cw = 0.12;
  // 4 vertical corners
  const corners: { pos: [number, number, number]; h: number }[] = [
    { pos: [-W / 2 - ex, Heave / 2, -L / 2 - ex], h: Heave },
    { pos: [W / 2 + ex, (p.roofType === "shed" ? Hhi : Heave) / 2, -L / 2 - ex], h: p.roofType === "shed" ? Hhi : Heave },
    { pos: [-W / 2 - ex, Heave / 2, L / 2 + ex], h: Heave },
    { pos: [W / 2 + ex, (p.roofType === "shed" ? Hhi : Heave) / 2, L / 2 + ex], h: p.roofType === "shed" ? Hhi : Heave },
  ];
  return (
    <group>
      {corners.map((c, i) => (
        <group key={i} position={c.pos} rotation={[0, (i % 2 === 0 ? 1 : -1) * Math.PI / 4, 0]}>
          <mesh castShadow>
            <boxGeometry args={[cw, c.h, t]} />
            <meshStandardMaterial color="#2a2d33" metalness={0.7} roughness={0.45} wireframe={p.wireframe} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function Accessories({ p, explodeY }: { p: GarageParams; explodeY: number }) {
  return (
    <group>
      <SectionalDoor p={p} explodeY={explodeY} />
      <PersonalDoor p={p} explodeY={explodeY} />
      <Windows p={p} explodeY={explodeY} />
      <Gutters p={p} explodeY={explodeY} />
      <CornerFlashings p={p} explodeY={explodeY} />
      {/* Ridge cap */}
      {p.roofType === "gable" && (
        <mesh position={[0, ridgeHeight(p) + 0.02 + explodeY * 1.4, 0]} castShadow>
          <boxGeometry args={[0.16, 0.04, p.length + 0.1]} />
          <meshStandardMaterial color={p.roofColor} metalness={0.6} roughness={0.5} wireframe={p.wireframe} />
        </mesh>
      )}
    </group>
  );
}
