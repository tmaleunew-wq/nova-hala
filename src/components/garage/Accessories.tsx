import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useMemo, useRef, useState } from "react";
import type { GarageParams } from "@/lib/garage/types";
import { ridgeHeight, highEave, getFrameZ, getPersonalDoorZ, getWindowZs, getWindowCoords, getDoubleGateLayout } from "./Structure";
import { createPBRCladdingMaterial, createPBRSmoothMaterial, createPBRWoodMaterial } from "@/lib/garage/pbrMaterialHelper";
import { FlashingsAndGutters } from "./FlashingsAndGutters";

/** Garage door supporting Sectional, Up & Over (Výklopná), and Double-leaf (Dvojkrídlová) types */
function GarageDoor({
  p,
  cx,
  cz,
  rotY = 0,
  effectiveWidth,
  doorColor,
  doorDecor,
}: {
  p: GarageParams;
  cx: number;
  cz: number;
  rotY?: number;
  effectiveWidth?: number;
  doorColor?: string;
  doorDecor?: "none" | "wood_oak" | "wood_walnut";
}) {
  const isDouble = (Number(p.gateCount) || 1) === 2;
  const maxSafeDoorW = isDouble
    ? Math.max(1.2, (p.width - 0.85) / 2)
    : Math.max(1.5, p.width - 0.5);
  const gateWidth = Math.min(effectiveWidth ?? p.doorWidth, maxSafeDoorW);
  const gateType = p.gateType || "sectional";
  const activeColor = doorColor ?? p.sectionalDoorColor;
  const activeDecor = doorDecor ?? p.gateDecor ?? "none";
  const maxSafeDoorHeight = Math.max(1.8, p.clearHeight - 0.2);
  const actualDoorHeight = Math.min(p.doorHeight, maxSafeDoorHeight);
  const panels = 4;
  const panelH = actualDoorHeight / panels;

  // Local state for smooth animation
  const progressRef = useRef(0);
  const [currentProgress, setCurrentProgress] = useState(0);

  useFrame((_, delta) => {
    const target = p.doorOpen ? 1 : 0;
    const speed = 2.0;
    const diff = target - progressRef.current;
    if (Math.abs(diff) > 0.001) {
      progressRef.current += Math.sign(diff) * Math.min(Math.abs(diff), speed * delta);
      setCurrentProgress(progressRef.current);
    } else if (progressRef.current !== target) {
      progressRef.current = target;
      setCurrentProgress(target);
    }
  });

  const R = 0.25;
  const y_c = actualDoorHeight - R;
  const curveLength = (R * Math.PI) / 2;
  const travelDistance = currentProgress * (actualDoorHeight - 0.05);

  const gateMaterial = useMemo(() => {
    if (activeDecor === "wood_oak") {
      return createPBRWoodMaterial("golden_oak", "horizontal");
    }
    if (activeDecor === "wood_walnut") {
      return createPBRWoodMaterial("walnut", "horizontal");
    }
    return new THREE.MeshStandardMaterial({
      color: activeColor,
      metalness: 0.7,
      roughness: 0.4,
      wireframe: p.wireframe,
    });
  }, [activeDecor, activeColor, p.wireframe]);

  return (
    <group position={[cx, 0, cz]} rotation={[0, rotY, 0]}>
      {/* 1. SEKČNÁ BRÁNA */}
      {gateType === "sectional" && (
        <>
          {Array.from({ length: panels }).map((_, i) => {
            const baseY = 0.02 + i * panelH + panelH / 2;
            const u = baseY + travelDistance;

            let panelY = baseY;
            let panelZ = 0;
            let rotX = 0;

            if (u < y_c) {
              panelY = u;
              panelZ = 0;
              rotX = 0;
            } else if (u < y_c + curveLength) {
              const alpha = (u - y_c) / R;
              panelY = y_c + R * Math.sin(alpha);
              panelZ = R - R * Math.cos(alpha);
              rotX = -alpha;
            } else {
              const dHoriz = u - (y_c + curveLength);
              panelY = actualDoorHeight;
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
                material={gateMaterial}
              >
                <boxGeometry args={[gateWidth, panelH - 0.01, 0.04]} />
              </mesh>
            );
          })}

          {/* Tracks */}
          {[-1, 1].map((s) => (
            <group key={s}>
              <mesh position={[(s * gateWidth) / 2, actualDoorHeight / 2 + 0.02, 0.02]} castShadow>
                <boxGeometry args={[0.04, actualDoorHeight, 0.02]} />
                <meshStandardMaterial color="#3a3f47" metalness={0.8} roughness={0.4} wireframe={p.wireframe} />
              </mesh>
              <mesh position={[(s * gateWidth) / 2, actualDoorHeight + 0.02, actualDoorHeight / 2 + 0.02]} castShadow>
                <boxGeometry args={[0.02, 0.02, actualDoorHeight]} />
                <meshStandardMaterial color="#3a3f47" metalness={0.8} roughness={0.4} wireframe={p.wireframe} />
              </mesh>
            </group>
          ))}
        </>
      )}

      {/* 2. VÝKLOPNÁ BRÁNA (Up & Over) */}
      {gateType === "upAndOver" && (() => {
        const tiltAngle = -currentProgress * (Math.PI / 2.15);
        const tiltY = 0.02 + actualDoorHeight / 2 + currentProgress * (actualDoorHeight / 2.2);
        const tiltZ = currentProgress * (actualDoorHeight * 0.65);
        return (
          <group position={[0, tiltY, tiltZ]} rotation={[tiltAngle, 0, 0]}>
            <mesh castShadow receiveShadow material={gateMaterial}>
              <boxGeometry args={[gateWidth - 0.02, actualDoorHeight - 0.02, 0.04]} />
            </mesh>
            {/* Obvodový rám výklopnej brány */}
            <mesh position={[0, 0, 0.005]}>
              <boxGeometry args={[gateWidth, actualDoorHeight, 0.015]} />
              <meshStandardMaterial color="#1a1c20" metalness={0.8} roughness={0.5} wireframe={p.wireframe} />
            </mesh>
            {/* Madlo a zámok v strede dole */}
            <group position={[0, -actualDoorHeight / 2 + 0.35, 0.035]}>
              <mesh castShadow>
                <boxGeometry args={[0.16, 0.035, 0.03]} />
                <meshStandardMaterial color="#111111" metalness={0.9} roughness={0.2} />
              </mesh>
              <mesh position={[0, 0.04, 0]}>
                <cylinderGeometry args={[0.012, 0.012, 0.01, 16]} />
                <meshStandardMaterial color="#silver" metalness={0.9} roughness={0.1} />
              </mesh>
            </group>
          </group>
        );
      })()}

      {/* 3. DVOJKRÍDLOVÁ BRÁNA (Double-leaf) */}
      {gateType === "doubleLeaf" && (() => {
        const leafW = (gateWidth - 0.02) / 2;
        const swingAngle = currentProgress * (Math.PI * 0.5);
        return (
          <group position={[0, 0.02 + actualDoorHeight / 2, 0]}>
            {/* Ľavé krídlo */}
            <group position={[-gateWidth / 2, 0, 0]} rotation={[0, swingAngle, 0]}>
              <mesh position={[leafW / 2, 0, 0]} castShadow receiveShadow material={gateMaterial}>
                <boxGeometry args={[leafW, actualDoorHeight - 0.02, 0.04]} />
              </mesh>
              {/* Pánty */}
              {[-0.4, 0.4].map((py, idx) => (
                <mesh key={idx} position={[0.01, py * (actualDoorHeight / 2), 0.025]}>
                  <cylinderGeometry args={[0.015, 0.015, 0.08, 16]} />
                  <meshStandardMaterial color="#222" metalness={0.8} roughness={0.3} />
                </mesh>
              ))}
            </group>

            {/* Pravé krídlo s kľučkou */}
            <group position={[gateWidth / 2, 0, 0]} rotation={[0, -swingAngle, 0]}>
              <mesh position={[-leafW / 2, 0, 0]} castShadow receiveShadow material={gateMaterial}>
                <boxGeometry args={[leafW, actualDoorHeight - 0.02, 0.04]} />
              </mesh>
              {/* Kľučka na pravom krídle */}
              <group position={[-leafW + 0.1, -0.1, 0.035]}>
                <mesh castShadow>
                  <boxGeometry args={[0.03, 0.14, 0.015]} />
                  <meshStandardMaterial color="#1a1a1a" metalness={0.8} roughness={0.3} />
                </mesh>
                <mesh position={[-0.04, 0.03, 0.02]} rotation={[0, 0, 0]} castShadow>
                  <boxGeometry args={[0.1, 0.02, 0.02]} />
                  <meshStandardMaterial color="# silver" metalness={0.9} roughness={0.1} />
                </mesh>
              </group>
              {/* Pánty */}
              {[-0.4, 0.4].map((py, idx) => (
                <mesh key={idx} position={[-0.01, py * (p.doorHeight / 2), 0.025]}>
                  <cylinderGeometry args={[0.015, 0.015, 0.08, 16]} />
                  <meshStandardMaterial color="#222" metalness={0.8} roughness={0.3} />
                </mesh>
              ))}
            </group>
          </group>
        );
      })()}
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
    if (p.gateDecor === "wood_oak") {
      return createPBRWoodMaterial("golden_oak", "vertical");
    }
    if (p.gateDecor === "wood_walnut") {
      return createPBRWoodMaterial("walnut", "vertical");
    }
    return createPBRSmoothMaterial(p.doorColor);
  }, [p.gateDecor, p.doorColor, p.wireframe]);

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

export function Accessories({ p, explodeY }: { p: GarageParams; explodeY: number }) {
  const gateCount = Number(p.gateCount) || 1;
  const isDouble = gateCount === 2;
  const W = p.width;
  const L = p.length;
  const maxSafeDoorW = isDouble
    ? Math.max(1.2, (W - 0.85) / 2)
    : Math.max(1.5, W - 0.5);
  const actualDW = Math.min(p.doorWidth, maxSafeDoorW);
  const zFront = -L / 2 - 0.025 + explodeY * -2.2;
  const zBack = L / 2 + 0.025 + explodeY * 2.2;
  const dLayout = getDoubleGateLayout(W, actualDW);

  return (
    <group>
      {isDouble ? (
        <>
          <GarageDoor
            key="gate-front-left"
            p={p}
            cx={dLayout.leftCx}
            cz={zFront}
            rotY={0}
            effectiveWidth={dLayout.actualDoorW}
            doorColor={p.sectionalDoorColor}
            doorDecor={p.gateDecor}
          />
          <GarageDoor
            key="gate-front-right"
            p={p}
            cx={dLayout.rightCx}
            cz={zFront}
            rotY={0}
            effectiveWidth={dLayout.actualDoorW}
            doorColor={p.sectionalDoor2Color ?? p.sectionalDoorColor}
            doorDecor={p.gate2Decor ?? p.gateDecor}
          />
        </>
      ) : (
        <GarageDoor
          key="gate-front-single"
          p={p}
          cx={0}
          cz={zFront}
          rotY={0}
          effectiveWidth={actualDW}
          doorColor={p.sectionalDoorColor}
          doorDecor={p.gateDecor}
        />
      )}
      {p.hasBackDoor && (
        <GarageDoor
          key="gate-back"
          p={p}
          cx={0}
          cz={zBack}
          rotY={Math.PI}
          effectiveWidth={actualDW}
          doorColor={p.sectionalDoorColor}
          doorDecor={p.gateDecor}
        />
      )}
      <PersonalDoor p={p} explodeY={explodeY} />
      <Windows p={p} explodeY={explodeY} />
      {p.showCladding && (
        <>
          <FlashingsAndGutters p={p} explodeY={explodeY} />
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
