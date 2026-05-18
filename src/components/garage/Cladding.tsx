import "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import type { GarageParams } from "@/lib/garage/types";
import { ridgeHeight, highEave } from "./Structure";
import { makeTrapezoidTexture } from "@/lib/garage/textures";

interface Rect {
  cx: number; // hole center along panel width (panel local X)
  cy: number; // hole center from bottom of panel (panel local Y, 0 = ground)
  w: number;
  h: number;
}

/**
 * Flat rectangular panel with holes.
 * Local: bottom-left at (-width/2, 0). Normal: +Z.
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
    shape.moveTo(-w2, 0);
    shape.lineTo(w2, 0);
    shape.lineTo(w2, height);
    shape.lineTo(-w2, height);
    shape.lineTo(-w2, 0);
    for (const r of holes) {
      const path = new THREE.Path();
      const x0 = r.cx - r.w / 2;
      const x1 = r.cx + r.w / 2;
      const y0 = r.cy - r.h / 2;
      const y1 = r.cy + r.h / 2;
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

/** Triangle gable infill (front/back) for gable roof. */
function GableTriangle({ width, eave, ridge, color, wireframe }: { width: number; eave: number; ridge: number; color: string; wireframe: boolean }) {
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const verts = new Float32Array([
      -width / 2, eave, 0,
      width / 2, eave, 0,
      0, ridge, 0,
    ]);
    g.setAttribute("position", new THREE.BufferAttribute(verts, 3));
    g.computeVertexNormals();
    return g;
  }, [width, eave, ridge]);
  return (
    <mesh geometry={geom} castShadow receiveShadow>
      <meshStandardMaterial color={color} side={THREE.DoubleSide} metalness={0.55} roughness={0.55} wireframe={wireframe} />
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

  wallTex.repeat.set(Math.max(1, Math.round(L / 0.6)), 1);
  roofTex.repeat.set(Math.max(1, Math.round(L / 0.6)), 1);

  // openings
  const doorHole: Rect = { cx: 0, cy: p.doorHeight / 2 + 0.02, w: p.doorWidth, h: p.doorHeight };
  const personalHole: Rect = { cx: -L / 4, cy: 1.0, w: 0.9, h: 2.0 };
  const winSpread: Rect[] = [];
  for (let i = 0; i < p.windowCount; i++) {
    const t = (i + 1) / (p.windowCount + 1);
    winSpread.push({ cx: -L / 2 + t * L, cy: 1.6, w: p.windowWidth, h: p.windowHeight });
  }

  const ex = explodeY;
  const offFront = ex * -1.5;
  const offBack = ex * 1.5;
  const offLeft = ex * -1.5;
  const offRight = ex * 1.5;
  const offRoof = ex * 1.2;

  return (
    <group>
      {/* FRONT (z=-L/2), normal -Z */}
      <group position={[0, 0, -L / 2 + offFront]} rotation={[0, Math.PI, 0]}>
        <PanelWithHoles width={W} height={Heave} holes={[doorHole]} texture={wallTex} color={p.claddingColor} wireframe={p.wireframe} />
      </group>

      {/* BACK (z=+L/2), normal +Z */}
      <group position={[0, 0, L / 2 + offBack]}>
        <PanelWithHoles
          width={W}
          height={Heave}
          holes={p.personalDoorSide === "back" && p.hasPersonalDoor ? [{ cx: 0, cy: 1.0, w: 0.9, h: 2.0 }] : []}
          texture={wallTex}
          color={p.claddingColor}
          wireframe={p.wireframe}
        />
      </group>

      {/* LEFT (x=-W/2), normal -X. Panel width along Z. */}
      <group position={[-W / 2 + offLeft, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <PanelWithHoles
          width={L}
          height={Heave}
          holes={[
            ...(p.personalDoorSide === "left" && p.hasPersonalDoor ? [personalHole] : []),
            ...winSpread,
          ]}
          texture={wallTex}
          color={p.claddingColor}
          wireframe={p.wireframe}
        />
      </group>

      {/* RIGHT (x=+W/2), normal +X */}
      <group position={[W / 2 + offRight, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <PanelWithHoles
          width={L}
          height={p.roofType === "shed" ? Hhi : Heave}
          holes={[
            ...(p.personalDoorSide === "right" && p.hasPersonalDoor ? [personalHole] : []),
          ]}
          texture={wallTex}
          color={p.claddingColor}
          wireframe={p.wireframe}
        />
      </group>

      {/* GABLE TRIANGLES on front/back */}
      {p.roofType === "gable" && (
        <>
          <group position={[0, 0, -L / 2 + offFront]}>
            <GableTriangle width={W} eave={Heave} ridge={Hridge} color={p.claddingColor} wireframe={p.wireframe} />
          </group>
          <group position={[0, 0, L / 2 + offBack]}>
            <GableTriangle width={W} eave={Heave} ridge={Hridge} color={p.claddingColor} wireframe={p.wireframe} />
          </group>
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
                rotation={[-Math.PI / 2, 0, s * angle]}
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
          rotation={[-Math.PI / 2, 0, Math.atan2(Hhi - Heave, W)]}
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
