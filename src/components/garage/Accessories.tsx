import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useMemo, useRef, useState } from "react";
import type { GarageParams } from "@/lib/garage/types";
import { ridgeHeight, highEave, getFrameZ, getPersonalDoorZ, getWindowZs, getWindowCoords } from "./Structure";
import { createPBRCladdingMaterial, createPBRSmoothMaterial } from "@/lib/garage/pbrMaterialHelper";

/** Sectional door panels (front). */
function SectionalDoor({ p, explodeY }: { p: GarageParams; explodeY: number }) {
  const panels = 4;
  const panelH = p.doorHeight / panels;
  const z = -p.length / 2 - 0.025 + explodeY * -2.2;

  // Local state for smooth animation
  const progressRef = useRef(0);
  const [currentProgress, setCurrentProgress] = useState(0);

  useFrame((state, delta) => {
    const target = p.doorOpen ? 1 : 0;
    const speed = 2.0; // speed of animation (takes 0.5s to fully open)
    const diff = target - progressRef.current;
    if (Math.abs(diff) > 0.001) {
      progressRef.current += Math.sign(diff) * Math.min(Math.abs(diff), speed * delta);
      setCurrentProgress(progressRef.current);
    } else if (progressRef.current !== target) {
      progressRef.current = target;
      setCurrentProgress(target);
    }
  });

  const R = 0.25; // radius of track curvature
  const y_c = p.doorHeight - R;
  const curveLength = R * Math.PI / 2;
  const travelDistance = currentProgress * (p.doorHeight - 0.05); // slightly less than full height to keep some guidance

  return (
    <group position={[0, 0, z]}>
      {Array.from({ length: panels }).map((_, i) => {
        const baseY = 0.02 + i * panelH + panelH / 2;
        const u = baseY + travelDistance;

        let panelY = baseY;
        let panelZ = 0;
        let rotX = 0;

        if (u < y_c) {
          // Vertical section
          panelY = u;
          panelZ = 0;
          rotX = 0;
        } else if (u < y_c + curveLength) {
          // Curved section
          const alpha = (u - y_c) / R; // angle from 0 to pi/2
          panelY = y_c + R * Math.sin(alpha);
          panelZ = R - R * Math.cos(alpha);
          rotX = -alpha;
        } else {
          // Horizontal section
          const dHoriz = u - (y_c + curveLength);
          panelY = p.doorHeight;
          panelZ = R + dHoriz;
          rotX = -Math.PI / 2;
        }

        return (
          <mesh 
            key={i} 
            position={[0, panelY, panelZ]} 
            rotation={[rotX, 0, 0]}
            castShadow 
            receiveShadow
          >
            <boxGeometry args={[p.doorWidth, panelH - 0.01, 0.04]} />
            <meshStandardMaterial color={p.sectionalDoorColor} metalness={0.7} roughness={0.4} wireframe={p.wireframe} />
          </mesh>
        );
      })}
      {/* door tracks */}
      {[-1, 1].map((s) => (
        <group key={s}>
          {/* Vertical track */}
          <mesh position={[(s * p.doorWidth) / 2, p.doorHeight / 2 + 0.02, 0.02]} castShadow>
            <boxGeometry args={[0.04, p.doorHeight, 0.02]} />
            <meshStandardMaterial color="#3a3f47" metalness={0.8} roughness={0.4} wireframe={p.wireframe} />
          </mesh>
          {/* Horizontal track under the ceiling */}
          <mesh position={[(s * p.doorWidth) / 2, p.doorHeight + 0.02, p.doorHeight / 2 + 0.02]} castShadow>
            <boxGeometry args={[0.02, 0.02, p.doorHeight]} />
            <meshStandardMaterial color="#3a3f47" metalness={0.8} roughness={0.4} wireframe={p.wireframe} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function PersonalDoor({ p, explodeY }: { p: GarageParams; explodeY: number }) {
  if (!p.hasPersonalDoor) return null;
  const W = p.width;
  const L = p.length;

  const wallThickness = (p.panelType === "sandwich" || p.panelType === "smooth")
    ? Math.max(0.04, p.wallPanelThicknessMm / 1000)
    : 0.01;
  const sz = p.profileSize;
  const doorWidth = 0.88;
  const doorHeight = 1.98;
  const frameThickness = wallThickness + 0.015; // frame should be slightly thicker than cladding

  // Position and rotation based on side
  let position: [number, number, number] = [0, 0, 0];
  let rotation: [number, number, number] = [0, 0, 0];
  const ex = explodeY;

  // Align door exactly with cladding plane (sz/2 + wallThickness/2)
  const offset = sz / 2 + wallThickness / 2;

  const doorZ = getPersonalDoorZ(p);

  if (p.personalDoorSide === "left") {
    position = [-W / 2 - offset + ex * -2.2, 0, doorZ];
    rotation = [0, -Math.PI / 2, 0];
  } else if (p.personalDoorSide === "right") {
    position = [W / 2 + offset + ex * 2.2, 0, doorZ];
    rotation = [0, Math.PI / 2, 0];
  } else {
    // Back wall
    position = [0, 0, L / 2 + offset + ex * 2.2];
    rotation = [0, 0, 0];
  }

  // Handle position: place on the outer side (x = doorWidth/2 - 0.08)
  const handleX = doorWidth / 2 - 0.08;
  const handleY = 1.0;

  const pbrMaterial = useMemo(() => {
    if (p.wireframe) return null;
    return createPBRSmoothMaterial(p.doorColor);
  }, [p.doorColor, p.wireframe]);

  return (
    <group position={position} rotation={rotation}>
      {/* Door Frame (Zárubeň) - Left, Right, Top */}
      <group>
        {/* Left frame post */}
        <mesh position={[-doorWidth / 2 - 0.015, doorHeight / 2 + 0.01, 0]} castShadow>
          <boxGeometry args={[0.03, doorHeight + 0.02, frameThickness]} />
          <meshStandardMaterial color="#2d3139" metalness={0.7} roughness={0.4} wireframe={p.wireframe} />
        </mesh>
        {/* Right frame post */}
        <mesh position={[doorWidth / 2 + 0.015, doorHeight / 2 + 0.01, 0]} castShadow>
          <boxGeometry args={[0.03, doorHeight + 0.02, frameThickness]} />
          <meshStandardMaterial color="#2d3139" metalness={0.7} roughness={0.4} wireframe={p.wireframe} />
        </mesh>
        {/* Top frame header */}
        <mesh position={[0, doorHeight + 0.015, 0]} castShadow>
          <boxGeometry args={[doorWidth + 0.06, 0.03, frameThickness]} />
          <meshStandardMaterial color="#2d3139" metalness={0.7} roughness={0.4} wireframe={p.wireframe} />
        </mesh>
      </group>

      {/* Door Leaf (Dverné krídlo) */}
      <mesh position={[0, doorHeight / 2, 0]} castShadow receiveShadow material={pbrMaterial || undefined}>
        <boxGeometry args={[doorWidth, doorHeight, 0.04]} />
        {p.wireframe && (
          <meshStandardMaterial color={p.doorColor} side={THREE.DoubleSide} wireframe />
        )}
      </mesh>

      {/* Realistic Door Handle (Kľučka) & Escutcheon (Štítok) */}
      {/* Outer side handle */}
      <group position={[handleX, handleY, 0.021]}>
        {/* Escutcheon plate */}
        <mesh castShadow>
          <boxGeometry args={[0.04, 0.16, 0.005]} />
          <meshStandardMaterial color="#1a1d21" metalness={0.9} roughness={0.2} wireframe={p.wireframe} />
        </mesh>
        {/* Lock cylinder dot */}
        <mesh position={[0, -0.04, 0.003]}>
          <cylinderGeometry args={[0.006, 0.006, 0.005, 8]} />
          <meshStandardMaterial color="#d4af37" metalness={0.95} roughness={0.2} wireframe={p.wireframe} />
        </mesh>
        {/* Handle pivot/neck */}
        <mesh position={[0, 0.03, 0.015]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.008, 0.008, 0.03, 12]} />
          <meshStandardMaterial color="#d4af37" metalness={0.95} roughness={0.15} wireframe={p.wireframe} />
        </mesh>
        {/* Handle lever */}
        <mesh position={[-0.04, 0.03, 0.03]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.008, 0.008, 0.1, 12]} />
          <meshStandardMaterial color="#d4af37" metalness={0.95} roughness={0.15} wireframe={p.wireframe} />
        </mesh>
      </group>

      {/* Inner side handle */}
      <group position={[handleX, handleY, -0.021]}>
        {/* Escutcheon plate */}
        <mesh castShadow>
          <boxGeometry args={[0.04, 0.16, 0.005]} />
          <meshStandardMaterial color="#1a1d21" metalness={0.9} roughness={0.2} wireframe={p.wireframe} />
        </mesh>
        {/* Handle pivot/neck */}
        <mesh position={[0, 0.03, -0.015]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.008, 0.008, 0.03, 12]} />
          <meshStandardMaterial color="#d4af37" metalness={0.95} roughness={0.15} wireframe={p.wireframe} />
        </mesh>
        {/* Handle lever */}
        <mesh position={[-0.04, 0.03, -0.03]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.008, 0.008, 0.1, 12]} />
          <meshStandardMaterial color="#d4af37" metalness={0.95} roughness={0.15} wireframe={p.wireframe} />
        </mesh>
      </group>

      {/* Hinges (Pánty) on opposite side of handle */}
      {[-0.6, 0.6].map((hy, idx) => (
        <group key={idx} position={[-doorWidth / 2 - 0.005, doorHeight / 2 + hy, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.008, 0.008, 0.05, 12]} />
            <meshStandardMaterial color="#2d3139" metalness={0.9} roughness={0.3} wireframe={p.wireframe} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Windows({ p, explodeY }: { p: GarageParams; explodeY: number }) {
  if (!p.hasWindows || p.windowCount <= 0) return null;
  const W = p.width;
  const L = p.length;
  const ex = explodeY;

  const wallThickness = (p.panelType === "sandwich" || p.panelType === "smooth")
    ? Math.max(0.04, p.wallPanelThicknessMm / 1000)
    : 0.01;
  const sz = p.profileSize;
  const offset = sz / 2 + wallThickness / 2;
  const frameThickness = wallThickness + 0.015;

  const side = p.windowSide;
  let basePosition: [number, number, number] = [0, 0, 0];
  let rotY = 0;

  if (side === "left") {
    basePosition = [-W / 2 - offset + ex * -2.2, 1.6, 0];
    rotY = -Math.PI / 2;
  } else if (side === "right") {
    basePosition = [W / 2 + offset + ex * 2.2, 1.6, 0];
    rotY = Math.PI / 2;
  } else if (side === "back") {
    basePosition = [0, 1.6, L / 2 + offset + ex * 2.2];
    rotY = 0;
  }

  const coords = getWindowCoords(p);
  const items = [];
  for (let i = 0; i < p.windowCount; i++) {
    const coord = coords[i];
    const pos: [number, number, number] =
      side === "back"
        ? [coord, basePosition[1], basePosition[2]]
        : [basePosition[0], basePosition[1], coord];

    items.push(
      <group key={i} position={pos} rotation={[0, rotY, 0]}>
        {/* glass */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[p.windowWidth, p.windowHeight, 0.02]} />
          <meshPhysicalMaterial color="#a8c8e0" transmission={0.5} roughness={0.05} metalness={0.0} ior={1.45} thickness={0.02} wireframe={p.wireframe} />
        </mesh>
        {/* frame wrapping the cladding edge */}
        <group>
          {/* Left frame post */}
          <mesh position={[-p.windowWidth / 2 - 0.015, 0, 0]} castShadow>
            <boxGeometry args={[0.03, p.windowHeight + 0.06, frameThickness]} />
            <meshStandardMaterial color="#2a2d33" metalness={0.4} roughness={0.6} wireframe={p.wireframe} />
          </mesh>
          {/* Right frame post */}
          <mesh position={[p.windowWidth / 2 + 0.015, 0, 0]} castShadow>
            <boxGeometry args={[0.03, p.windowHeight + 0.06, frameThickness]} />
            <meshStandardMaterial color="#2a2d33" metalness={0.4} roughness={0.6} wireframe={p.wireframe} />
          </mesh>
          {/* Top frame header */}
          <mesh position={[0, p.windowHeight / 2 + 0.015, 0]} castShadow>
            <boxGeometry args={[p.windowWidth + 0.06, 0.03, frameThickness]} />
            <meshStandardMaterial color="#2a2d33" metalness={0.4} roughness={0.6} wireframe={p.wireframe} />
          </mesh>
          {/* Bottom frame sill */}
          <mesh position={[0, -p.windowHeight / 2 - 0.015, 0]} castShadow>
            <boxGeometry args={[p.windowWidth + 0.06, 0.03, frameThickness]} />
            <meshStandardMaterial color="#2a2d33" metalness={0.4} roughness={0.6} wireframe={p.wireframe} />
          </mesh>
        </group>
      </group>,
    );
  }
  return <>{items}</>;
}

function Gutters({ p, explodeY }: { p: GarageParams; explodeY: number }) {
  const L = p.length;
  const W = p.width;
  const Heave = p.clearHeight;
  const Hridge = ridgeHeight(p);
  const Hhi = highEave(p);
  const ex = explodeY * 1.5;

  const wallThickness = (p.panelType === "sandwich" || p.panelType === "smooth") ? Math.max(0.04, p.wallPanelThicknessMm / 1000) : 0.01;
  const sz = p.profileSize;
  const gapWidth = sz / 2 + wallThickness;
  const overhang = 0.25;
  const capLen = L + 2 * gapWidth + 2 * overhang;

  const angle = p.roofType === "gable"
    ? Math.atan2(Hridge - Heave, W / 2)
    : Math.atan2(Hhi - Heave, W);

  const leftX = -W / 2 - gapWidth - overhang - ex;
  const rightX = W / 2 + gapWidth + overhang + ex;

  const leftEaveY = Heave - (gapWidth + overhang) * Math.tan(angle);
  const rightEaveY = p.roofType === "shed"
    ? Hhi + (gapWidth + overhang) * Math.tan(angle)
    : Heave - (gapWidth + overhang) * Math.tan(angle);

  const leftGutterY = leftEaveY - 0.01;
  const rightGutterY = rightEaveY - 0.01;

  const color = p.trimmingColor || "#ffffff"; // Independent gutter/downpipe color
  // gutter half-tube along each eave
  const radius = 0.06;
  const geom = useMemo(() => {
    const c = new THREE.CylinderGeometry(radius, radius, capLen, 24, 1, true, 0, Math.PI);
    c.rotateX(Math.PI / 2);
    c.rotateZ(Math.PI);
    return c;
  }, [capLen]);

  const leftWallX = -W / 2 - gapWidth - 0.04 - ex;
  const rightWallX = W / 2 + gapWidth + 0.04 + ex;

  const dropY = 0.20; // vertical drop of the elbow

  // Left elbow calculation
  const leftDx = leftWallX - leftX;
  const leftDy = -dropY;
  const leftElbowLen = Math.hypot(leftDx, leftDy);
  const leftElbowRot = Math.atan2(leftDy, leftDx);
  const leftDownpipeH = leftGutterY - radius - dropY;

  // Right elbow calculation
  const rightDx = rightWallX - rightX;
  const rightDy = -dropY;
  const rightElbowLen = Math.hypot(rightDx, rightDy);
  const rightElbowRot = Math.atan2(rightDy, rightDx);
  const rightDownpipeH = rightGutterY - radius - dropY;

  return (
    <group>
      {/* left eave gutter */}
      <mesh position={[leftX, leftGutterY, 0]} geometry={geom} castShadow>
        <meshStandardMaterial color={color} metalness={0.6} roughness={0.4} side={THREE.DoubleSide} wireframe={p.wireframe} />
      </mesh>
      {/* right eave gutter */}
      <mesh position={[rightX, rightGutterY, 0]} geometry={geom} castShadow>
        <meshStandardMaterial color={color} metalness={0.6} roughness={0.4} side={THREE.DoubleSide} wireframe={p.wireframe} />
      </mesh>

      {/* LEFT DOWNPIPE (adjacent to wall) */}
      {/* Vertical pipe */}
      <mesh
        position={[leftWallX, leftDownpipeH / 2, L / 2 + gapWidth]}
        castShadow
      >
        <cylinderGeometry args={[0.04, 0.04, leftDownpipeH, 16]} />
        <meshStandardMaterial color={color} metalness={0.6} roughness={0.4} wireframe={p.wireframe} />
      </mesh>
      {/* Elbow to gutter */}
      <mesh
        position={[(leftX + leftWallX) / 2, leftGutterY - radius - dropY / 2, L / 2 + gapWidth]}
        rotation={[0, 0, leftElbowRot - Math.PI / 2]}
        castShadow
      >
        <cylinderGeometry args={[0.04, 0.04, leftElbowLen, 16]} />
        <meshStandardMaterial color={color} metalness={0.6} roughness={0.4} wireframe={p.wireframe} />
      </mesh>

      {/* RIGHT DOWNPIPE (adjacent to wall) */}
      {/* Vertical pipe */}
      <mesh
        position={[rightWallX, rightDownpipeH / 2, L / 2 + gapWidth]}
        castShadow
      >
        <cylinderGeometry args={[0.04, 0.04, rightDownpipeH, 16]} />
        <meshStandardMaterial color={color} metalness={0.6} roughness={0.4} wireframe={p.wireframe} />
      </mesh>
      {/* Elbow to gutter */}
      <mesh
        position={[(rightX + rightWallX) / 2, rightGutterY - radius - dropY / 2, L / 2 + gapWidth]}
        rotation={[0, 0, rightElbowRot - Math.PI / 2]}
        castShadow
      >
        <cylinderGeometry args={[0.04, 0.04, rightElbowLen, 16]} />
        <meshStandardMaterial color={color} metalness={0.6} roughness={0.4} wireframe={p.wireframe} />
      </mesh>
    </group>
  );
}

function CornerFlashings({ p, explodeY }: { p: GarageParams; explodeY: number }) {
  const W = p.width;
  const L = p.length;
  const Heave = p.clearHeight;
  const Hhi = highEave(p);
  const ex = explodeY * 1.5; // align with Cladding's explode speed
  
  const wallThickness = (p.panelType === "sandwich" || p.panelType === "smooth") ? Math.max(0.04, p.wallPanelThicknessMm / 1000) : 0.01;
  const sz = p.profileSize;
  const trimWidth = 0.18; // 180mm flashing legs to overlap and cover panel edges
  const trimThick = 0.002;
  const color = p.trimmingColor || "#ffffff"; // Independent corner/trim color
  
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
  const wallThickness = (p.panelType === "sandwich" || p.panelType === "smooth") ? Math.max(0.04, p.wallPanelThicknessMm / 1000) : 0.01;
  const sz = p.profileSize;

  const t = 0.002; // very thin flashing
  const jw = 0.08; // 80mm width to cover the joint neatly
  const color = p.trimmingColor || "#ffffff"; // Independent trim color

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

  const wallThickness = (p.panelType === "sandwich" || p.panelType === "smooth") ? Math.max(0.04, p.wallPanelThicknessMm / 1000) : 0.01;
  const roofThickness = (p.panelType === "sandwich" || p.panelType === "smooth") ? Math.max(0.04, p.roofPanelThicknessMm / 1000) : 0.01;
  const sz = p.profileSize;

  const color = p.roofColor || "#2a2d33";

  const mat = useMemo(() => new THREE.MeshStandardMaterial({
    color: color,
    metalness: 0.5,
    roughness: 0.5,
  }), [color]);

  const slopes = useMemo(() => {
    const wallThickness = (p.panelType === "sandwich" || p.panelType === "smooth") ? Math.max(0.04, p.wallPanelThicknessMm / 1000) : 0.01;
    const gapWidth = p.profileSize / 2 + wallThickness;
    const angle = p.roofType === "gable"
      ? Math.atan2(Hridge - Heave, W / 2)
      : Math.atan2(Hhi - Heave, W);
    const tanA = Math.tan(angle);

    const overhang = 0.25;
    const extendedHalfW = W / 2 + gapWidth + overhang;
    const yEdge = Heave - (gapWidth + overhang) * tanA;

    if (p.roofType === "gable") {
      const roofThickness = (p.panelType === "sandwich" || p.panelType === "smooth") ? Math.max(0.04, p.roofPanelThicknessMm / 1000) : 0.01;
      const offsetFace = p.profileSize / 2 + roofThickness - 0.18 / 2 + 0.01;
      const deltaX = Math.sin(angle) * offsetFace;
      const deltaY = deltaX * Math.tan(angle);
      return [
        { xStart: -extendedHalfW, yStart: yEdge, xEnd: deltaX, yEnd: Hridge + deltaY },
        { xStart: -deltaX, yStart: Hridge + deltaY, xEnd: extendedHalfW, yEnd: yEdge },
      ];
    } else {
      const yEdgeLo = Heave - (gapWidth + overhang) * tanA;
      const yEdgeHi = Hhi + (gapWidth + overhang) * tanA;
      return [
        { xStart: -W / 2 - gapWidth - overhang, yStart: yEdgeLo, xEnd: W / 2 + gapWidth + overhang, yEnd: yEdgeHi },
      ];
    }
  }, [W, Heave, Hridge, Hhi, p.roofType, p.profileSize, p.panelType, p.wallPanelThicknessMm, p.roofPanelThicknessMm]);

  const t = 0.002; // thickness of sheet metal
  const fh = 0.18; // height of the vertical face flange
  const roofOffset = sz / 2 + roofThickness;
  const gapWidth = sz / 2 + wallThickness;
  const overhang = 0.25;
  const sideLen = gapWidth + overhang + 0.04; // covers gap and overlaps roof panel by 4cm

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
      const zc = zSign * (L / 2 + gapWidth + overhang) + zSign * ex * 1.5;
      
      const zFace = zc + zSign * (t / 2 + 0.001);
      const zSide = zSign * (L / 2 + (gapWidth + overhang - 0.04) / 2) + zSign * ex * 1.5;

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

  const wallThickness = (p.panelType === "sandwich" || p.panelType === "smooth") ? Math.max(0.04, p.wallPanelThicknessMm / 1000) : 0.01;
  const sz = p.profileSize;

  const color = p.roofColor || "#2a2d33";

  const mat = useMemo(() => new THREE.MeshStandardMaterial({
    color: color,
    metalness: 0.5,
    roughness: 0.5,
  }), [color]);

  const t = 0.002;
  const fh = 0.18; // 180mm height to match bargeboard face
  const gapWidth = sz / 2 + wallThickness;
  const overhang = 0.25;

  const leftH = Heave;
  const rightH = p.roofType === "shed" ? Hhi : Heave;

  const leftX = -W / 2 - gapWidth - overhang - ex * 1.5;
  const rightX = W / 2 + gapWidth + overhang + ex * 1.5;
  const legWidth = gapWidth + overhang + 0.04;

  const angle = p.roofType === "gable"
    ? Math.atan2(ridgeHeight(p) - Heave, W / 2)
    : Math.atan2(Hhi - Heave, W);

  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);
  const tanA = Math.tan(angle);

  const roofThickness = (p.panelType === "sandwich" || p.panelType === "smooth") ? Math.max(0.04, p.roofPanelThicknessMm / 1000) : 0.01;
  const flangeWidth = 0.06;
  const roofLen = L + 2 * gapWidth + 2 * overhang;

  // Left roof edge center in world coordinates:
  const leftXMid = leftX - (sz / 2 + roofThickness / 2) * sinA;
  const leftYMid = leftH - (gapWidth + overhang) * tanA + (sz / 2 + roofThickness / 2) * cosA;

  // Right roof edge center in world coordinates:
  const rightXMid = rightX + (sz / 2 + roofThickness / 2) * sinA;
  const rightYMid = rightH - (gapWidth + overhang) * tanA + (sz / 2 + roofThickness / 2) * cosA;

  return (
    <group>
      {/* Left Eave Flashing */}
      {/* Vertical wall face */}
      <mesh
        position={[leftX - t / 2 - 0.001, leftH + 0.03, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        castShadow
        material={mat}
      >
        <boxGeometry args={[roofLen, fh, t]} />
      </mesh>
      {/* Horizontal leg on top of side wall */}
      <mesh
        position={[leftX + legWidth / 2, leftH + t / 2 + 0.001, 0]}
        castShadow
        material={mat}
      >
        <boxGeometry args={[legWidth, t, roofLen]} />
      </mesh>
      {/* Sloped roof eave trim */}
      <group position={[leftXMid, leftYMid, 0]} rotation={[0, 0, angle]}>
        {/* Edge cover */}
        <mesh castShadow material={mat}>
          <boxGeometry args={[t, roofThickness + 0.002, roofLen]} />
        </mesh>
        {/* Top flange overlapping roof panel */}
        <mesh position={[flangeWidth / 2, roofThickness / 2 + t / 2, 0]} castShadow material={mat}>
          <boxGeometry args={[flangeWidth, t, roofLen]} />
        </mesh>
      </group>

      {/* Right Eave Flashing */}
      {/* Vertical wall face */}
      <mesh
        position={[rightX + t / 2 + 0.001, rightH + 0.03, 0]}
        rotation={[0, Math.PI / 2, 0]}
        castShadow
        material={mat}
      >
        <boxGeometry args={[roofLen, fh, t]} />
      </mesh>
      {/* Horizontal leg on top of side wall */}
      <mesh
        position={[rightX - legWidth / 2, rightH + t / 2 + 0.001, 0]}
        castShadow
        material={mat}
      >
        <boxGeometry args={[legWidth, t, roofLen]} />
      </mesh>
      {/* Sloped roof eave trim */}
      <group position={[rightXMid, rightYMid, 0]} rotation={[0, 0, -angle]}>
        {/* Edge cover */}
        <mesh castShadow material={mat}>
          <boxGeometry args={[t, roofThickness + 0.002, roofLen]} />
        </mesh>
        {/* Top flange overlapping roof panel */}
        <mesh position={[-flangeWidth / 2, roofThickness / 2 + t / 2, 0]} castShadow material={mat}>
          <boxGeometry args={[flangeWidth, t, roofLen]} />
        </mesh>
      </group>
    </group>
  );
}

export function Accessories({ p, explodeY }: { p: GarageParams; explodeY: number }) {
  return (
    <group>
      <SectionalDoor p={p} explodeY={explodeY} />
      <PersonalDoor p={p} explodeY={explodeY} />
      <Windows p={p} explodeY={explodeY} />
      {p.showCladding && (
        <>
          <CornerFlashings p={p} explodeY={explodeY} />
          <Bargeboards p={p} explodeY={explodeY} />
          <EaveFlashings p={p} explodeY={explodeY} />
          <Gutters p={p} explodeY={explodeY} />
          {/* Ridge cap */}
          {p.roofType === "gable" && (() => {
            const wallThickness = (p.panelType === "sandwich" || p.panelType === "smooth") ? Math.max(0.04, p.wallPanelThicknessMm / 1000) : 0.01;
            const roofThickness = (p.panelType === "sandwich" || p.panelType === "smooth") ? Math.max(0.04, p.roofPanelThicknessMm / 1000) : 0.01;
            const gapWidth = p.profileSize / 2 + wallThickness;
            const overhang = 0.25;
            const angle = Math.atan2(ridgeHeight(p) - p.clearHeight, p.width / 2);
            const yPos = ridgeHeight(p) + (p.profileSize / 2 + roofThickness) / Math.cos(angle) + 0.01 + explodeY * 1.4;
            const capLen = p.length + 2 * gapWidth + 2 * overhang;
            const t = 0.002;
            const coverH = yPos - ridgeHeight(p);
            return (
              <group>
                {/* Main horizontal ridge cap */}
                <mesh position={[0, yPos, 0]} castShadow>
                  <boxGeometry args={[0.16, 0.04, capLen]} />
                  <meshStandardMaterial color={p.roofColor} metalness={0.6} roughness={0.5} wireframe={p.wireframe} />
                </mesh>

                {/* Front & Back vertical end closures */}
                {[-1, 1].map((zSign) => {
                  const zc = zSign * (p.length / 2 + gapWidth + overhang) + zSign * explodeY * 1.5;
                  const zPos = zc + zSign * (t / 2 + 0.002);
                  return (
                    <mesh
                      key={`ridge-closure-${zSign}`}
                      position={[0, ridgeHeight(p) + coverH / 2 + explodeY * 1.4, zPos]}
                      castShadow
                    >
                      <boxGeometry args={[0.16, coverH, t]} />
                      <meshStandardMaterial color={p.roofColor} metalness={0.6} roughness={0.5} wireframe={p.wireframe} />
                    </mesh>
                  );
                })}
              </group>
            );
          })()}
        </>
      )}
    </group>
  );
}
