import "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import { useTexture } from "@react-three/drei";
import type { GarageParams } from "@/lib/garage/types";
import { ridgeHeight, highEave } from "./Structure";
import { makeTrapezoidTexture } from "@/lib/garage/textures";

interface Rect {
  x: number; // center
  y: number;
  w: number;
  h: number;
}

/**
 * Build a flat panel (in local XY) with rectangular holes.
 * Returns a mesh facing +Z (normal).
 */
function PanelWithHoles({
  width,
  height,
  holes,
  texture,
  color,
  thickness = 0.02,
  wireframe = false,
}: {
  width: number;
  height: number;
  holes: Rect[];
  texture?: THREE.Texture;
  color: string;
  thickness?: number;
  wireframe?: boolean;
}) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    const w2 = width / 2;
    const h2 = height / 2;
    shape.moveTo(-w2, -h2);
    shape.lineTo(w2, -h2);
    shape.lineTo(w2, h2);
    shape.lineTo(-w2, h2);
    shape.lineTo(-w2, -h2);
    for (const r of holes) {
      const path = new THREE.Path();
      const x0 = r.x - r.w / 2;
      const x1 = r.x + r.w / 2;
      const y0 = r.y - r.h / 2;
      const y1 = r.y + r.h / 2;
      path.moveTo(x0, y0);
      path.lineTo(x1, y0);
      path.lineTo(x1, y1);
      path.lineTo(x0, y1);
      path.lineTo(x0, y0);
      shape.holes.push(path);
    }
    const g = new THREE.ExtrudeGeometry(shape, {
      depth: thickness,
      bevelEnabled: false,
      curveSegments: 1,
    });
    g.translate(0, 0, -thickness / 2);
    return g;
  }, [width, height, holes, thickness]);

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial
        map={texture}
        color={color}
        metalness={0.55}
        roughness={0.55}
        side={THREE.DoubleSide}
        wireframe={wireframe}
      />
    </mesh>
  );
}

export function Cladding({ p, explodeY }: { p: GarageParams; explodeY: number }) {
  const wallTex = useMemo(() => makeTrapezoidTexture(p.claddingColor, 50), [p.claddingColor]);
  const roofTex = useMemo(() => makeTrapezoidTexture(p.roofColor, 50), [p.roofColor]);

  const W = p.width;
  const L = p.length;
  const Heave = p.clearHeight;
  const Hridge = ridgeHeight(p);
  const Hhi = highEave(p);

  // texture repeats
  const wallRepX = Math.max(1, Math.round(L / 0.6));
  wallTex.repeat.set(wallRepX, 1);
  const roofRepX = Math.max(1, Math.round(L / 0.6));
  roofTex.repeat.set(roofRepX, 1);

  // OPENINGS placement
  // Front wall (z = -L/2): sectional door centered
  const doorHole: Rect = { x: 0, y: p.doorHeight / 2 + 0.05, w: p.doorWidth, h: p.doorHeight };
  // Personal door + windows on side
  const personalHole: Rect | null = p.hasPersonalDoor
    ? { x: -L / 4, y: 1.0, w: 0.9, h: 2.0 }
    : null;
  const windowHoles: Rect[] = [];
  for (let i = 0; i < p.windowCount; i++) {
    const spacing = L / (p.windowCount + 1);
    windowHoles.push({
      x: -L / 2 + (i + 1) * spacing - L / 2 + L / 2, // along Z
      y: 1.6,
      w: p.windowWidth,
      h: p.windowHeight,
    });
  }
  // simpler: distribute windows evenly along length
  const winSpread: Rect[] = [];
  for (let i = 0; i < p.windowCount; i++) {
    const t = (i + 1) / (p.windowCount + 1);
    winSpread.push({
      x: -L / 2 + t * L,
      y: 1.6,
      w: p.windowWidth,
      h: p.windowHeight,
    });
  }

  const ex = explodeY;
  const offFront = ex * -1.5;
  const offBack = ex * 1.5;
  const offLeft = ex * -1.5;
  const offRight = ex * 1.5;
  const offRoof = ex * 1.2;

  return (
    <group>
      {/* FRONT WALL (z = -L/2, normal pointing -Z) - rotate so normal faces -Z */}
      <group position={[0, 0, -L / 2 + offFront]} rotation={[0, Math.PI, 0]}>
        <PanelWithHoles
          width={W}
          height={Heave}
          holes={[doorHole]}
          texture={wallTex}
          color={p.claddingColor}
          wireframe={p.wireframe}
        />
        {/* gable triangle infill */}
        {p.roofType === "gable" && (
          <mesh position={[0, Heave + (Hridge - Heave) / 2 - Heave / 2, 0]} castShadow receiveShadow>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                args={[new Float32Array([
                  -W / 2, Heave / 2, 0,
                  W / 2, Heave / 2, 0,
                  0, Heave / 2 + (Hridge - Heave), 0,
                ]), 3]}
              />
            </bufferGeometry>
            <meshStandardMaterial color={p.claddingColor} side={THREE.DoubleSide} metalness={0.55} roughness={0.55} wireframe={p.wireframe} />
          </mesh>
        )}
      </group>
      {/* compensate position offset for triangle above (it placed wrong); render gable triangle as separate */}

      {/* BACK WALL */}
      <group position={[0, 0, L / 2 + offBack]}>
        <PanelWithHoles
          width={W}
          height={Heave}
          holes={p.personalDoorSide === "back" && p.hasPersonalDoor ? [{ x: 0, y: 1.0, w: 0.9, h: 2.0 }] : []}
          texture={wallTex}
          color={p.claddingColor}
          wireframe={p.wireframe}
        />
      </group>

      {/* LEFT WALL (x=-W/2, normal -X) */}
      <group position={[-W / 2 + offLeft, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <PanelWithHoles
          width={L}
          height={Heave}
          holes={[
            ...(p.personalDoorSide === "left" && personalHole ? [personalHole] : []),
            ...winSpread,
          ]}
          texture={wallTex}
          color={p.claddingColor}
          wireframe={p.wireframe}
        />
      </group>

      {/* RIGHT WALL (x=+W/2, normal +X) */}
      <group position={[W / 2 + offRight, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <PanelWithHoles
          width={L}
          height={p.roofType === "shed" ? Hhi : Heave}
          holes={[
            ...(p.personalDoorSide === "right" && personalHole ? [{ x: personalHole.x, y: personalHole.y, w: personalHole.w, h: personalHole.h }] : []),
          ]}
          texture={wallTex}
          color={p.claddingColor}
          wireframe={p.wireframe}
        />
      </group>

      {/* GABLE TRIANGLES (front + back) */}
      {p.roofType === "gable" && (
        <>
          {[-1, 1].map((s) => {
            const z = (s * L) / 2 + (s < 0 ? offFront : offBack);
            const verts = new Float32Array([
              -W / 2, Heave, z,
              W / 2, Heave, z,
              0, Hridge, z,
            ]);
            return (
              <mesh key={`gable-${s}`} castShadow receiveShadow>
                <bufferGeometry>
                  <bufferAttribute attach="attributes-position" args={[verts, 3]} />
                </bufferGeometry>
                <meshStandardMaterial color={p.claddingColor} side={THREE.DoubleSide} metalness={0.55} roughness={0.55} wireframe={p.wireframe} />
              </mesh>
            );
          })}
        </>
      )}

      {/* ROOF */}
      {p.roofType === "gable" ? (
        <>
          {(() => {
            const halfW = W / 2;
            const slopeLen = Math.hypot(halfW, Hridge - Heave);
            const angle = Math.atan2(Hridge - Heave, halfW);
            return [-1, 1].map((s) => (
              <group
                key={`roof-${s}`}
                position={[(s * halfW) / 2, (Heave + Hridge) / 2 + offRoof, 0]}
                rotation={[Math.PI / 2, 0, -s * angle + (s < 0 ? Math.PI : 0)]}
              >
                <mesh castShadow receiveShadow>
                  <planeGeometry args={[slopeLen, L]} />
                  <meshStandardMaterial
                    map={roofTex}
                    color={p.roofColor}
                    metalness={0.55}
                    roughness={0.55}
                    side={THREE.DoubleSide}
                    wireframe={p.wireframe}
                  />
                </mesh>
              </group>
            ));
          })()}
        </>
      ) : (
        <group
          position={[0, (Heave + Hhi) / 2 + offRoof, 0]}
          rotation={[Math.PI / 2, 0, Math.atan2(Hhi - Heave, W)]}
        >
          <mesh castShadow receiveShadow>
            <planeGeometry args={[Math.hypot(W, Hhi - Heave), L]} />
            <meshStandardMaterial
              map={roofTex}
              color={p.roofColor}
              metalness={0.55}
              roughness={0.55}
              side={THREE.DoubleSide}
              wireframe={p.wireframe}
            />
          </mesh>
        </group>
      )}
    </group>
  );
}
