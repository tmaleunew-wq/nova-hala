import "@react-three/fiber";
import * as THREE from "three";
import { useMemo } from "react";
import type { GarageParams } from "@/lib/garage/types";
import { ridgeHeight, highEave, getFrameZ } from "./Structure";

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
  const ex = explodeY * 1.5;

  const wallThickness = p.panelType === "sandwich" ? Math.max(0.04, p.wallPanelThicknessMm / 1000) : 0.01;
  const sz = p.profileSize;
  const gapWidth = sz / 2 + wallThickness;

  const color = p.claddingColor || "#2a2d33";
  // gutter half-tube along each eave
  const radius = 0.06;
  const geom = useMemo(() => {
    const c = new THREE.CylinderGeometry(radius, radius, L, 24, 1, true, 0, Math.PI);
    c.rotateX(Math.PI / 2);
    c.rotateZ(Math.PI);
    return c;
  }, [L]);

  return (
    <group>
      {/* left eave gutter */}
      <mesh position={[-W / 2 - gapWidth - 0.08 - ex, Heave - 0.05, 0]} geometry={geom} castShadow>
        <meshStandardMaterial color={color} metalness={0.6} roughness={0.4} side={THREE.DoubleSide} wireframe={p.wireframe} />
      </mesh>
      {/* right eave gutter */}
      <mesh position={[W / 2 + gapWidth + 0.08 + ex, Hhi - 0.05, 0]} geometry={geom} castShadow>
        <meshStandardMaterial color={color} metalness={0.6} roughness={0.4} side={THREE.DoubleSide} wireframe={p.wireframe} />
      </mesh>
      {/* downpipes */}
      {[-1, 1].map((szSign) =>
        [-1, 1].map((sx) => (
          <mesh
            key={`dp-${sx}-${szSign}`}
            position={[sx * (W / 2 + gapWidth + 0.1) + ex * sx, (Heave) / 2 - 0.05, szSign * (L / 2 - 0.2)]}
            castShadow
          >
            <cylinderGeometry args={[0.04, 0.04, Heave - 0.05, 16]} />
            <meshStandardMaterial color={color} metalness={0.6} roughness={0.4} wireframe={p.wireframe} />
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
  const ex = explodeY * 1.5; // align with Cladding's explode speed
  
  const wallThickness = p.panelType === "sandwich" ? Math.max(0.04, p.wallPanelThicknessMm / 1000) : 0.01;
  const sz = p.profileSize;
  const trimWidth = 0.18; // 180mm flashing legs to overlap and cover panel edges
  const trimThick = 0.002;
  const color = p.claddingColor || "#2a2d33"; // Use wall cladding color
  
  const mat = useMemo(() => new THREE.MeshStandardMaterial({
    color: color,
    metalness: 0.5,
    roughness: 0.5,
  }), [color]);

  // Corner definitions: xSign, zSign
  const config = [
    { xSign: -1, zSign: -1, h: Heave }, // left-front
    { xSign: 1, zSign: -1, h: p.roofType === "shed" ? Hhi : Heave },  // right-front
    { xSign: -1, zSign: 1, h: Heave },  // left-back
    { xSign: 1, zSign: 1, h: p.roofType === "shed" ? Hhi : Heave },   // right-back
  ];

  return (
    <group>
      {config.map((c, i) => {
        const xc = c.xSign * (W / 2 + sz / 2 + wallThickness) + c.xSign * ex;
        const zc = c.zSign * (L / 2 + sz / 2 + wallThickness) + c.zSign * ex;
        const yPos = c.h / 2;

        return (
          <group key={i}>
            {/* Face parallel to Front/Back wall (X-axis) */}
            <mesh position={[xc - c.xSign * (trimWidth / 2), yPos, zc + c.zSign * (trimThick / 2 + 0.001)]} castShadow>
              <boxGeometry args={[trimWidth, c.h, trimThick]} />
              <primitive object={mat} attach="material" />
            </mesh>

            {/* Face parallel to Left/Right wall (Z-axis) */}
            <mesh 
              position={[xc + c.xSign * (trimThick / 2 + 0.001), yPos, zc - c.zSign * (trimWidth / 2)]} 
              rotation={[0, Math.PI / 2, 0]} 
              castShadow
            >
              <boxGeometry args={[trimWidth, c.h, trimThick]} />
              <primitive object={mat} attach="material" />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function JointFlashings({ p, explodeY }: { p: GarageParams; explodeY: number }) {
  const W = p.width;
  const Heave = p.clearHeight;
  const Hhi = highEave(p);
  const ex = explodeY * 1.5;
  const wallThickness = p.panelType === "sandwich" ? Math.max(0.04, p.wallPanelThicknessMm / 1000) : 0.01;
  const sz = p.profileSize;

  const t = 0.002; // very thin flashing
  const jw = 0.08; // 80mm width to cover the joint neatly
  const color = p.claddingColor || "#3a4048";

  const zs = getFrameZ(p);
  const intermediateZs = zs.slice(1, -1); // skip corners

  return (
    <group>
      {intermediateZs.map((z, i) => {
        const rH = p.roofType === "shed" ? Hhi : Heave;
        return (
          <group key={i}>
            {/* Left wall joint flashing */}
            <group position={[-W / 2 - (sz / 2 + wallThickness) - ex - t / 2 - 0.001, Heave / 2, z]} rotation={[0, -Math.PI / 2, 0]}>
              <mesh castShadow receiveShadow>
                <boxGeometry args={[jw, Heave, t]} />
                <meshStandardMaterial color={color} metalness={0.5} roughness={0.5} wireframe={p.wireframe} />
              </mesh>
            </group>

            {/* Right wall joint flashing */}
            <group position={[W / 2 + (sz / 2 + wallThickness) + ex + t / 2 + 0.001, rH / 2, z]} rotation={[0, Math.PI / 2, 0]}>
              <mesh castShadow receiveShadow>
                <boxGeometry args={[jw, rH, t]} />
                <meshStandardMaterial color={color} metalness={0.5} roughness={0.5} wireframe={p.wireframe} />
              </mesh>
            </group>
          </group>
        );
      })}
    </group>
  );
}

function Bargeboards({ p, explodeY }: { p: GarageParams; explodeY: number }) {
  const W = p.width;
  const L = p.length;
  const Heave = p.clearHeight;
  const Hridge = ridgeHeight(p);
  const Hhi = highEave(p);
  const ex = explodeY;

  const wallThickness = p.panelType === "sandwich" ? Math.max(0.04, p.wallPanelThicknessMm / 1000) : 0.01;
  const roofThickness = p.panelType === "sandwich" ? Math.max(0.04, p.roofPanelThicknessMm / 1000) : 0.01;
  const sz = p.profileSize;

  const color = p.claddingColor || "#2a2d33";

  const mat = useMemo(() => new THREE.MeshStandardMaterial({
    color: color,
    metalness: 0.5,
    roughness: 0.5,
  }), [color]);

  const slopes = useMemo(() => {
    if (p.roofType === "gable") {
      const halfW = W / 2;
      return [
        { xStart: -halfW, yStart: Heave, xEnd: 0, yEnd: Hridge },
        { xStart: 0, yStart: Hridge, xEnd: halfW, yEnd: Heave },
      ];
    } else {
      return [
        { xStart: -W / 2, yStart: Heave, xEnd: W / 2, yEnd: Hhi },
      ];
    }
  }, [W, Heave, Hridge, Hhi, p.roofType]);

  const t = 0.002; // thickness of sheet metal
  const fh = 0.18; // height of the vertical face flange
  const roofOffset = sz / 2 + roofThickness;
  const gapWidth = sz / 2 + wallThickness;
  const sideLen = gapWidth + 0.04; // covers gap and overlaps roof panel by 4cm

  const items: React.ReactNode[] = [];

  slopes.forEach((slope, sIndex) => {
    const dx = slope.xEnd - slope.xStart;
    const dy = slope.yEnd - slope.yStart;
    const len = Math.hypot(dx, dy);
    const rotZ = Math.atan2(dy, dx);

    const nx = -Math.sin(rotZ);
    const ny = Math.cos(rotZ);

    const xMid = (slope.xStart + slope.xEnd) / 2;
    const yMid = (slope.yStart + slope.yEnd) / 2;

    const offsetFace = roofOffset - fh / 2 + 0.01;
    const xFace = xMid + nx * offsetFace;
    const yFace = yMid + ny * offsetFace;

    const xSide = xMid + nx * (roofOffset + t / 2);
    const ySide = yMid + ny * (roofOffset + t / 2);

    // Render for front (zSign = -1) and back (zSign = 1)
    [-1, 1].forEach((zSign) => {
      const zc = zSign * (L / 2 + gapWidth) + zSign * ex * 1.5;
      
      const zFace = zc + zSign * (t / 2 + 0.001);
      const zSide = zSign * (L / 2 + (gapWidth - 0.04) / 2) + zSign * ex * 1.5;

      const keyBase = `barge-${sIndex}-${zSign}`;

      items.push(
        <group key={keyBase}>
          {/* Vertical face flange */}
          <mesh
            position={[xFace, yFace, zFace]}
            rotation={[0, 0, rotZ]}
            castShadow
            material={mat}
          >
            <boxGeometry args={[len + 0.02, fh, t]} />
          </mesh>

          {/* Top/Side flange covering roof edge and gap */}
          <mesh
            position={[xSide, ySide, zSide]}
            rotation={[0, 0, rotZ]}
            castShadow
            material={mat}
          >
            <boxGeometry args={[len + 0.02, t, sideLen]} />
          </mesh>
        </group>
      );
    });
  });

  return <group>{items}</group>;
}

function EaveFlashings({ p, explodeY }: { p: GarageParams; explodeY: number }) {
  const W = p.width;
  const L = p.length;
  const Heave = p.clearHeight;
  const Hhi = highEave(p);
  const ex = explodeY;

  const wallThickness = p.panelType === "sandwich" ? Math.max(0.04, p.wallPanelThicknessMm / 1000) : 0.01;
  const sz = p.profileSize;

  const color = p.claddingColor || "#2a2d33";

  const mat = useMemo(() => new THREE.MeshStandardMaterial({
    color: color,
    metalness: 0.5,
    roughness: 0.5,
  }), [color]);

  const t = 0.002;
  const fh = 0.18; // 180mm height to match bargeboard face
  const gapWidth = sz / 2 + wallThickness;

  const leftH = Heave;
  const rightH = p.roofType === "shed" ? Hhi : Heave;

  const leftX = -W / 2 - gapWidth - ex * 1.5;
  const rightX = W / 2 + gapWidth + ex * 1.5;

  const legWidth = gapWidth + 0.04;

  return (
    <group>
      {/* Left Eave Flashing */}
      <mesh
        position={[leftX - t / 2 - 0.001, leftH + 0.03, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        castShadow
        material={mat}
      >
        <boxGeometry args={[L + 0.02, fh, t]} />
      </mesh>
      {/* Left Eave Flashing Horizontal Leg */}
      <mesh
        position={[leftX + legWidth / 2, leftH + sz / 2 - t / 2, 0]}
        castShadow
        material={mat}
      >
        <boxGeometry args={[legWidth, t, L + 0.02]} />
      </mesh>

      {/* Right Eave Flashing */}
      <mesh
        position={[rightX + t / 2 + 0.001, rightH + 0.03, 0]}
        rotation={[0, Math.PI / 2, 0]}
        castShadow
        material={mat}
      >
        <boxGeometry args={[L + 0.02, fh, t]} />
      </mesh>
      {/* Right Eave Flashing Horizontal Leg */}
      <mesh
        position={[rightX - legWidth / 2, rightH + sz / 2 - t / 2, 0]}
        castShadow
        material={mat}
      >
        <boxGeometry args={[legWidth, t, L + 0.02]} />
      </mesh>
    </group>
  );
}

export function Accessories({ p, explodeY }: { p: GarageParams; explodeY: number }) {
  return (
    <group>
      <SectionalDoor p={p} explodeY={explodeY} />
      <PersonalDoor p={p} explodeY={explodeY} />
      <Windows p={p} explodeY={explodeY} />
      <CornerFlashings p={p} explodeY={explodeY} />
      <Bargeboards p={p} explodeY={explodeY} />
      <EaveFlashings p={p} explodeY={explodeY} />
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
