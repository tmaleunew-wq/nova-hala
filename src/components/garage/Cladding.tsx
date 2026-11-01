import "@react-three/fiber";
import { useMemo, useState } from "react";
import * as THREE from "three";
import type { GarageParams } from "@/lib/garage/types";
import { ridgeHeight, highEave, getFrameZ, getPersonalDoorZ, getFrontPersonalDoorX, getBackPersonalDoorX, getWindowZs, getWindowCoords, getDoubleGateLayout } from "./Structure";
import { makeTrapezoidTexture } from "@/lib/garage/textures";
import { createPBRCladdingMaterial, createPBRSmoothMaterial, createPBRSandwichMaterial, createPBRTileMaterial, createPBRWoodMaterial } from "@/lib/garage/pbrMaterialHelper";
import { getCladdingConfig } from "@/lib/garage/configHelper";

import { PurPanel, type Rect } from './PurPanel';
import { FacadePanelDetails } from "./FacadePanelDetails";

function PurGableTriangle({
  p,
  width,
  eave,
  ridge,
  color,
  thickness = 0.08,
  wireframe = false,
  visible = true,
  onToggle,
  isSandwich = true,
  claddingOrientation = "horizontal",
  panelType,
}: {
  p: GarageParams;
  width: number;
  eave: number;
  ridge: number;
  color: string;
  thickness?: number;
  wireframe?: boolean;
  visible?: boolean;
  onToggle?: () => void;
  isSandwich?: boolean;
  claddingOrientation?: "vertical" | "horizontal";
  panelType?: string;
}) {
  const [hovered, setHovered] = useState(false);

  const activeColor = hovered ? new THREE.Color(color).clone().multiplyScalar(1.15).getHexString() : color;
  const activeColorStr = hovered ? `#${activeColor}` : color;

  const shape = useMemo(() => {
    const s = new THREE.Shape();
    const angle = Math.atan2(ridge - eave, p.width / 2);
    const gap = (p.profileSize / 2) / Math.cos(angle);
    const yEdge = ridge + gap - (width / 2) * Math.tan(angle);
    s.moveTo(-width / 2, eave);
    s.lineTo(width / 2, eave);
    s.lineTo(width / 2, yEdge);
    s.lineTo(0, ridge + gap);
    s.lineTo(-width / 2, yEdge);
    s.lineTo(-width / 2, eave);
    return s;
  }, [width, eave, ridge, p.width, p.profileSize]);

  const pbrMaterial = useMemo(() => {
    if (wireframe) return null;
    if (panelType === "smooth") {
      return createPBRSmoothMaterial(activeColorStr, 3.2, 3.2);
    }
    if (panelType === "sandwich") {
      const isHorizontal = claddingOrientation === "horizontal";
      const orient = isHorizontal ? "horizontal" : "vertical";
      const spacing = 1.0;
      const repeats = isHorizontal
        ? Math.max(1, Math.round((ridge - eave) / spacing))
        : Math.max(1, Math.round(width / spacing));
      return createPBRSandwichMaterial(activeColorStr, orient, repeats);
    }
    if (panelType === "wood_oak") {
      return createPBRWoodMaterial("golden_oak", claddingOrientation);
    }
    if (panelType === "wood_walnut") {
      return createPBRWoodMaterial("walnut", claddingOrientation);
    }
    const isHorizontal = claddingOrientation === "horizontal";
    const orient = isHorizontal ? "horizontal" : "vertical";
    const spacing = panelType === "sandwich" ? 1.0 : 0.25;
    const repeats = isHorizontal
      ? Math.max(1, Math.round((ridge - eave) / spacing))
      : Math.max(1, Math.round(width / spacing));

    return createPBRCladdingMaterial(activeColorStr, orient, repeats);
  }, [activeColorStr, width, ridge, eave, claddingOrientation, wireframe, panelType]);

  const outerGeom = useMemo(() => {
    const depth = isSandwich ? 0.002 : thickness;
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 1 });
    g.translate(0, 0, thickness / 2 - depth);

    const pos = g.attributes.position?.array;
    const uvs = g.attributes.uv?.array;
    const triH = Math.max(0.1, ridge - eave);
    if (pos && uvs && triH > 0.01 && width > 0.01) {
      const w2 = width / 2;
      for (let i = 0; i < uvs.length; i += 2) {
        const vIdx = (i / 2) * 3;
        const x = pos[vIdx];
        const y = pos[vIdx + 1];
        uvs[i] = (x + w2) / width;
        uvs[i + 1] = Math.max(0, Math.min(1, (y - eave) / triH));
      }
      g.attributes.uv.needsUpdate = true;
    }

    return g;
  }, [shape, thickness, isSandwich, width, eave, ridge]);

  const coreGeom = useMemo(() => {
    if (!isSandwich) return null;
    const depth = thickness - 0.004;
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 1 });
    g.translate(0, 0, -depth / 2);
    return g;
  }, [shape, thickness, isSandwich]);

  const innerGeom = useMemo(() => {
    if (!isSandwich) return null;
    const depth = 0.002;
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 1 });
    g.translate(0, 0, -thickness / 2);

    const pos = g.attributes.position?.array;
    const uvs = g.attributes.uv?.array;
    const triH = Math.max(0.1, ridge - eave);
    if (pos && uvs && triH > 0.01 && width > 0.01) {
      const w2 = width / 2;
      for (let i = 0; i < uvs.length; i += 2) {
        const vIdx = (i / 2) * 3;
        const x = pos[vIdx];
        const y = pos[vIdx + 1];
        uvs[i] = (x + w2) / width;
        uvs[i + 1] = Math.max(0, Math.min(1, (y - eave) / triH));
      }
      g.attributes.uv.needsUpdate = true;
    }

    return g;
  }, [shape, thickness, isSandwich, width, eave, ridge]);

  const handlePointerOver = (e: any) => {
    e.stopPropagation();
    setHovered(true);
    document.body.style.cursor = "pointer";
  };

  const handlePointerOut = (e: any) => {
    e.stopPropagation();
    setHovered(false);
    document.body.style.cursor = "default";
  };

  if (!visible) {
    return (
      <mesh
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={(e) => { e.stopPropagation(); onToggle?.(); }}
      >
        <meshStandardMaterial
          color={hovered ? "#34d399" : "#3b82f6"}
          transparent
          opacity={hovered ? 0.35 : 0.1}
          wireframe
        />
      </mesh>
    );
  }

  return (
    <group
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onClick={(e) => { e.stopPropagation(); onToggle?.(); }}
    >
      <mesh geometry={outerGeom} castShadow receiveShadow material={pbrMaterial || undefined}>
        {wireframe && <meshStandardMaterial color={activeColorStr} side={THREE.DoubleSide} wireframe />}
      </mesh>
      <FacadePanelDetails shape={shape} thickness={thickness} panelType={panelType} orientation={claddingOrientation} color={activeColorStr} material={pbrMaterial} wireframe={wireframe} />
      {isSandwich && coreGeom && (
        <mesh geometry={coreGeom} castShadow receiveShadow>
          <meshStandardMaterial color={hovered ? "#faf3cc" : "#e6dfb3"} side={THREE.DoubleSide} metalness={0.05} roughness={0.9} wireframe={wireframe} />
        </mesh>
      )}
      {isSandwich && innerGeom && (
        <mesh geometry={innerGeom} castShadow receiveShadow>
          <meshStandardMaterial color={hovered ? "#ffffff" : "#f1f3f5"} side={THREE.DoubleSide} metalness={0.55} roughness={0.55} wireframe={wireframe} />
        </mesh>
      )}
    </group>
  );
}

function PurShedTriangle({
  p,
  width,
  eave,
  highEave,
  color,
  thickness = 0.08,
  wireframe = false,
  visible = true,
  onToggle,
  isSandwich = true,
  slopeDirection = "left-to-right",
  claddingOrientation = "horizontal",
  panelType,
}: {
  p: GarageParams;
  width: number;
  eave: number;
  highEave: number;
  color: string;
  thickness?: number;
  wireframe?: boolean;
  visible?: boolean;
  onToggle?: () => void;
  isSandwich?: boolean;
  slopeDirection: "left-to-right" | "right-to-left";
  claddingOrientation?: "vertical" | "horizontal";
  panelType?: string;
}) {
  const [hovered, setHovered] = useState(false);

  const activeColor = hovered ? new THREE.Color(color).clone().multiplyScalar(1.15).getHexString() : color;
  const activeColorStr = hovered ? `#${activeColor}` : color;

  const shape = useMemo(() => {
    const s = new THREE.Shape();
    const angle = Math.atan2(highEave - eave, p.width);
    const gap = (p.profileSize / 2) / Math.cos(angle);
    const delta = (width / 2 - p.width / 2) * Math.tan(angle);
    const yLeft = slopeDirection === "left-to-right" ? eave + gap - delta : highEave + gap + delta;
    const yRight = slopeDirection === "left-to-right" ? highEave + gap + delta : eave + gap - delta;

    s.moveTo(-width / 2, eave);
    s.lineTo(width / 2, eave);
    s.lineTo(width / 2, yRight);
    s.lineTo(-width / 2, yLeft);
    s.lineTo(-width / 2, eave);
    return s;
  }, [width, eave, highEave, p.width, p.profileSize, slopeDirection]);

  const pbrMaterial = useMemo(() => {
    if (wireframe) return null;
    if (panelType === "smooth") {
      return createPBRSmoothMaterial(activeColorStr, 3.2, 3.2);
    }
    if (panelType === "sandwich") {
      const isHorizontal = claddingOrientation === "horizontal";
      const orient = isHorizontal ? "horizontal" : "vertical";
      const spacing = 1.0;
      const repeats = isHorizontal
        ? Math.max(1, Math.round((highEave - eave) / spacing))
        : Math.max(1, Math.round(width / spacing));
      return createPBRSandwichMaterial(activeColorStr, orient, repeats);
    }
    if (panelType === "wood_oak") {
      return createPBRWoodMaterial("golden_oak", claddingOrientation);
    }
    if (panelType === "wood_walnut") {
      return createPBRWoodMaterial("walnut", claddingOrientation);
    }
    const isHorizontal = claddingOrientation === "horizontal";
    const orient = isHorizontal ? "horizontal" : "vertical";
    const spacing = panelType === "sandwich" ? 1.0 : 0.25;
    const repeats = isHorizontal
      ? Math.max(1, Math.round((highEave - eave) / spacing))
      : Math.max(1, Math.round(width / spacing));

    return createPBRCladdingMaterial(activeColorStr, orient, repeats);
  }, [activeColorStr, width, highEave, eave, claddingOrientation, wireframe, panelType]);

  const outerGeom = useMemo(() => {
    const depth = isSandwich ? 0.002 : thickness;
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 1 });
    g.translate(0, 0, thickness / 2 - depth);

    const pos = g.attributes.position?.array;
    const uvs = g.attributes.uv?.array;
    const triH = Math.max(0.1, highEave - eave);
    if (pos && uvs && triH > 0.01 && width > 0.01) {
      const w2 = width / 2;
      for (let i = 0; i < uvs.length; i += 2) {
        const vIdx = (i / 2) * 3;
        const x = pos[vIdx];
        const y = pos[vIdx + 1];
        uvs[i] = (x + w2) / width;
        uvs[i + 1] = Math.max(0, Math.min(1, (y - eave) / triH));
      }
      g.attributes.uv.needsUpdate = true;
    }

    return g;
  }, [shape, thickness, isSandwich, width, eave, highEave]);

  const coreGeom = useMemo(() => {
    if (!isSandwich) return null;
    const depth = thickness - 0.004;
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 1 });
    g.translate(0, 0, -depth / 2);
    return g;
  }, [shape, thickness, isSandwich]);

  const innerGeom = useMemo(() => {
    if (!isSandwich) return null;
    const depth = 0.002;
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 1 });
    g.translate(0, 0, -thickness / 2);

    const pos = g.attributes.position?.array;
    const uvs = g.attributes.uv?.array;
    const triH = Math.max(0.1, highEave - eave);
    if (pos && uvs && triH > 0.01 && width > 0.01) {
      const w2 = width / 2;
      for (let i = 0; i < uvs.length; i += 2) {
        const vIdx = (i / 2) * 3;
        const x = pos[vIdx];
        const y = pos[vIdx + 1];
        uvs[i] = (x + w2) / width;
        uvs[i + 1] = Math.max(0, Math.min(1, (y - eave) / triH));
      }
      g.attributes.uv.needsUpdate = true;
    }

    return g;
  }, [shape, thickness, isSandwich, width, eave, highEave]);

  const handlePointerOver = (e: any) => {
    e.stopPropagation();
    setHovered(true);
    document.body.style.cursor = "pointer";
  };

  const handlePointerOut = (e: any) => {
    e.stopPropagation();
    setHovered(false);
    document.body.style.cursor = "default";
  };

  if (!visible) {
    return (
      <mesh
        geometry={outerGeom}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={(e) => { e.stopPropagation(); onToggle?.(); }}
      >
        <meshStandardMaterial
          color={hovered ? "#34d399" : "#3b82f6"}
          transparent
          opacity={hovered ? 0.35 : 0.1}
          wireframe
        />
      </mesh>
    );
  }

  return (
    <group
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onClick={(e) => { e.stopPropagation(); onToggle?.(); }}
    >
      <mesh geometry={outerGeom} castShadow receiveShadow material={pbrMaterial || undefined}>
        {wireframe && <meshStandardMaterial color={activeColorStr} side={THREE.DoubleSide} wireframe />}
      </mesh>
      <FacadePanelDetails shape={shape} thickness={thickness} panelType={panelType} orientation={claddingOrientation} color={activeColorStr} material={pbrMaterial} wireframe={wireframe} />
      {isSandwich && coreGeom && (
        <mesh geometry={coreGeom} castShadow receiveShadow>
          <meshStandardMaterial color={hovered ? "#faf3cc" : "#e6dfb3"} side={THREE.DoubleSide} metalness={0.05} roughness={0.9} wireframe={wireframe} />
        </mesh>
      )}
      {isSandwich && innerGeom && (
        <mesh geometry={innerGeom} castShadow receiveShadow>
          <meshStandardMaterial color={hovered ? "#ffffff" : "#f1f3f5"} side={THREE.DoubleSide} metalness={0.55} roughness={0.55} wireframe={wireframe} />
        </mesh>
      )}
    </group>
  );
}

export function Cladding({
  p,
  explodeY,
  removedPanels = {},
  onTogglePanel,
}: {
  p: GarageParams;
  explodeY: number;
  removedPanels?: Record<string, boolean>;
  onTogglePanel?: (id: string) => void;
}) {
  const clientName = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("client") : null;
  const claddingConfig = getCladdingConfig(clientName);

  const wallTex = useMemo(() => makeTrapezoidTexture(p.claddingColor, 50), [p.claddingColor]);
  const roofTex = useMemo(() => makeTrapezoidTexture(p.roofColor, 50), [p.roofColor]);

  const W = p.width;
  const L = p.length;
  const Heave = p.clearHeight;
  const Hridge = ridgeHeight(p);
  const Hhi = highEave(p);

  const wallThickness = (p.panelType === "sandwich" || p.panelType === "smooth" || p.panelType === "wood_oak" || p.panelType === "wood_walnut") ? Math.max(0.04, p.wallPanelThicknessMm / 1000) : 0.01;
  const roofThickness = (p.panelType === "sandwich" || p.panelType === "smooth") ? Math.max(0.04, p.roofPanelThicknessMm / 1000) : 0.01;
  const panelThickness = wallThickness;
  const roofPanelThickness = roofThickness;
  const isSand = p.panelType === "sandwich" || p.panelType === "smooth" || p.panelType === "wood_oak" || p.panelType === "wood_walnut";
  const isRoofSand = p.roofPanelType === "sandwich" || p.roofPanelType === "smooth";
  const sz = p.profileSize;

  // openings
  const isDoubleGate = Number(p.gateCount ?? 1) === 2;
  const maxSafeDoorW = isDoubleGate
    ? Math.max(1.2, (W - 0.85) / 2)
    : Math.max(1.5, W - 0.5);
  const actualDW = Math.min(p.doorWidth, maxSafeDoorW);
  const actualDH = Math.min(p.doorHeight, Math.max(1.8, Heave - 0.2));
  const dLayout = getDoubleGateLayout(W, actualDW);
  const frontDoorHoles: Rect[] = isDoubleGate
    ? [
        { cx: dLayout.leftCx, cy: actualDH / 2 + 0.02, w: dLayout.actualDoorW, h: actualDH },
        { cx: dLayout.rightCx, cy: actualDH / 2 + 0.02, w: dLayout.actualDoorW, h: actualDH },
      ]
    : [{ cx: 0, cy: actualDH / 2 + 0.02, w: actualDW, h: actualDH }];
  const pDoorW = p.personalDoorWidth ?? 0.9;
  const pDoorH = p.personalDoorHeight ?? 2.0;
  const pDoorOff = p.personalDoorOffset ?? 0;
  if (p.hasPersonalDoor && (p.personalDoorSide === "front_left" || p.personalDoorSide === "front_right")) {
    const doorX = getFrontPersonalDoorX(p);
    frontDoorHoles.push({ cx: -doorX, cy: pDoorH / 2, w: pDoorW, h: pDoorH });
  }
  const personalHole: Rect = { cx: getPersonalDoorZ(p), cy: pDoorH / 2, w: pDoorW, h: pDoorH };
  const defaultElevation = Math.min(
    Heave - (p.windowHeight ?? 0.6) / 2 - 0.15,
    (p.personalDoorHeight ?? 2.0) - (p.windowHeight ?? 0.6) / 2,
  );
  const winElevation = p.windowElevation !== undefined
    ? Math.max((p.windowHeight ?? 0.6) / 2 + 0.35, Math.min(Heave - (p.windowHeight ?? 0.6) / 2 - 0.15, p.windowElevation))
    : defaultElevation;
  const winSpread: Rect[] = [];
  if (p.hasWindows && p.windowCount > 0) {
    const winCoords = getWindowCoords(p);
    for (const coord of winCoords) {
      winSpread.push({ cx: coord, cy: winElevation, w: p.windowWidth, h: p.windowHeight });
    }
  }
  const windowSide = p.windowSide;

  const ex = explodeY;
  const offFront = ex * -1.5;
  const offBack = ex * 1.5;
  const offLeft = ex * -1.5;
  const offRight = ex * 1.5;
  const offRoof = ex * 1.2;

  const zs = useMemo(() => getFrameZ(p), [p]);

  return (
    <group>
      {/* FRONT (z=-L/2), normal -Z */}
      <group position={[0, 0, -L / 2 - (sz / 2 + panelThickness / 2) + offFront]} rotation={[0, Math.PI, 0]}>
        <PurPanel
          id="front"
          width={W + sz + panelThickness}
          height={p.roofType === "cubic" ? Heave + (p.atticHeight ?? 0.35) : Heave}
          holes={frontDoorHoles}
          texture={wallTex}
          color={p.claddingColor}
          wireframe={p.wireframe}
          visible={!removedPanels["front"]}
          onToggle={() => onTogglePanel?.("front")}
          thickness={panelThickness}
          isSandwich={isSand}
          claddingOrientation={p.claddingOrientation}
          panelType={p.panelType}
        />
      </group>

      {/* BACK (z=+L/2), normal +Z */}
      {(() => {
        const backHoles: Rect[] = [];
        if (p.hasBackDoor) {
          backHoles.push({ cx: 0, cy: actualDH / 2 + 0.02, w: actualDW, h: actualDH });
        }
        if (p.personalDoorSide === "back" && p.hasPersonalDoor) {
          const doorX = getBackPersonalDoorX(p);
          backHoles.push({ cx: doorX, cy: pDoorH / 2, w: pDoorW, h: pDoorH });
        }
        if (p.hasWindows && p.windowSide === "back" && p.windowCount > 0) {
          for (const wRect of winSpread) {
            backHoles.push({ cx: wRect.cx, cy: wRect.cy, w: wRect.w, h: wRect.h });
          }
        }
        return (
          <group position={[0, 0, L / 2 + (sz / 2 + panelThickness / 2) + offBack]}>
            <PurPanel
              id="back"
              width={W + sz + panelThickness}
              height={p.roofType === "cubic" ? Heave + (p.atticHeight ?? 0.35) : Heave}
              holes={backHoles}
              texture={wallTex}
              color={p.claddingColor}
              wireframe={p.wireframe}
              visible={!removedPanels["back"]}
              onToggle={() => onTogglePanel?.("back")}
              thickness={panelThickness}
              isSandwich={isSand}
              claddingOrientation={p.claddingOrientation}
              panelType={p.panelType}
            />
          </group>
        );
      })()}

      {/* LEFT (x=-W/2), normal -X. Panel width along Z. */}
      <group position={[-W / 2 - (sz / 2 + panelThickness / 2) + offLeft, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
        {zs.map((z, i) => {
          if (i === zs.length - 1) return null;
          const zStart = zs[i];
          const zEnd = zs[i + 1];
          const actualStart = i === 0 ? zStart - (sz / 2 + panelThickness / 2) : zStart;
          const actualEnd = i === zs.length - 2 ? zEnd + (sz / 2 + panelThickness / 2) : zEnd;
          const w = actualEnd - actualStart;
          const zCenter = (actualStart + actualEnd) / 2;

          const bayHoles: Rect[] = [];
          if (p.personalDoorSide === "left" && p.hasPersonalDoor) {
            const dStart = personalHole.cx - personalHole.w / 2;
            const dEnd = personalHole.cx + personalHole.w / 2;
            const oStart = Math.max(actualStart, dStart);
            const oEnd = Math.min(actualEnd, dEnd);
            if (oEnd - oStart > 0.02) {
              const cutW = oEnd - oStart;
              const cutCenterZ = (oStart + oEnd) / 2;
              bayHoles.push({
                cx: cutCenterZ - zCenter,
                cy: personalHole.cy,
                w: cutW,
                h: personalHole.h,
              });
            }
          }
          if (p.hasWindows && windowSide === "left") {
            for (const wRect of winSpread) {
              const wStart = wRect.cx - wRect.w / 2;
              const wEnd = wRect.cx + wRect.w / 2;
              const oStart = Math.max(actualStart, wStart);
              const oEnd = Math.min(actualEnd, wEnd);
              if (oEnd - oStart > 0.02) {
                const cutW = oEnd - oStart;
                const cutCenterZ = (oStart + oEnd) / 2;
                bayHoles.push({
                  cx: cutCenterZ - zCenter,
                  cy: wRect.cy,
                  w: cutW,
                  h: wRect.h,
                });
              }
            }
          }

          const id = `left-${i}`;
          return (
            <group key={id} position={[zCenter, 0, 0]}>
              <PurPanel
                id={id}
                width={w}
                height={p.roofType === "cubic" ? Heave + (p.atticHeight ?? 0.35) : Heave}
                holes={bayHoles}
                texture={wallTex}
                color={p.claddingColor}
                wireframe={p.wireframe}
                visible={!removedPanels[id]}
                onToggle={() => onTogglePanel?.(id)}
                thickness={panelThickness}
                isSandwich={isSand}
                claddingOrientation={p.claddingOrientation}
                panelType={p.panelType}
              />
            </group>
          );
        })}
      </group>

      {/* RIGHT (x=+W/2), normal +X. Panel width along Z. */}
      <group position={[W / 2 + (sz / 2 + panelThickness / 2) + offRight, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        {zs.map((z, i) => {
          if (i === zs.length - 1) return null;
          const zStart = zs[i];
          const zEnd = zs[i + 1];
          const actualStart = i === 0 ? zStart - (sz / 2 + panelThickness / 2) : zStart;
          const actualEnd = i === zs.length - 2 ? zEnd + (sz / 2 + panelThickness / 2) : zEnd;
          const w = actualEnd - actualStart;
          const zCenter = (actualStart + actualEnd) / 2;

          const bayHoles: Rect[] = [];
          if (p.personalDoorSide === "right" && p.hasPersonalDoor) {
            const dStart = personalHole.cx - personalHole.w / 2;
            const dEnd = personalHole.cx + personalHole.w / 2;
            const oStart = Math.max(actualStart, dStart);
            const oEnd = Math.min(actualEnd, dEnd);
            if (oEnd - oStart > 0.02) {
              const cutW = oEnd - oStart;
              const cutCenterZ = (oStart + oEnd) / 2;
              bayHoles.push({
                cx: zCenter - cutCenterZ,
                cy: personalHole.cy,
                w: cutW,
                h: personalHole.h,
              });
            }
          }
          if (p.hasWindows && windowSide === "right") {
            for (const wRect of winSpread) {
              const wStart = wRect.cx - wRect.w / 2;
              const wEnd = wRect.cx + wRect.w / 2;
              const oStart = Math.max(actualStart, wStart);
              const oEnd = Math.min(actualEnd, wEnd);
              if (oEnd - oStart > 0.02) {
                const cutW = oEnd - oStart;
                const cutCenterZ = (oStart + oEnd) / 2;
                bayHoles.push({
                  cx: zCenter - cutCenterZ,
                  cy: wRect.cy,
                  w: cutW,
                  h: wRect.h,
                });
              }
            }
          }

          const id = `right-${i}`;
          return (
            <group key={id} position={[-zCenter, 0, 0]}>
              <PurPanel
                id={id}
                width={w}
                height={p.roofType === "cubic" ? Heave + (p.atticHeight ?? 0.35) : (p.roofType === "shed" ? Hhi : Heave)}
                holes={bayHoles}
                texture={wallTex}
                color={p.claddingColor}
                wireframe={p.wireframe}
                visible={!removedPanels[id]}
                onToggle={() => onTogglePanel?.(id)}
                thickness={panelThickness}
                isSandwich={isSand}
                claddingOrientation={p.claddingOrientation}
                panelType={p.panelType}
              />
            </group>
          );
        })}
      </group>

      {/* GABLE TRIANGLES on front/back */}
      {p.roofType === "gable" && (
        <>
          <group position={[0, 0, -L / 2 - (sz / 2 + panelThickness / 2) + offFront]} rotation={[0, Math.PI, 0]}>
            <PurGableTriangle
              p={p}
              width={W + sz + panelThickness}
              eave={Heave}
              ridge={Hridge}
              color={p.claddingColor}
              wireframe={p.wireframe}
              visible={!removedPanels["gable-front"]}
              onToggle={() => onTogglePanel?.("gable-front")}
              thickness={panelThickness}
              isSandwich={isSand}
              claddingOrientation={p.claddingOrientation}
              panelType={p.panelType}
            />
          </group>
          <group position={[0, 0, L / 2 + (sz / 2 + panelThickness / 2) + offBack]}>
            <PurGableTriangle
              p={p}
              width={W + sz + panelThickness}
              eave={Heave}
              ridge={Hridge}
              color={p.claddingColor}
              wireframe={p.wireframe}
              visible={!removedPanels["gable-back"]}
              onToggle={() => onTogglePanel?.("gable-back")}
              thickness={panelThickness}
              isSandwich={isSand}
              claddingOrientation={p.claddingOrientation}
              panelType={p.panelType}
            />
          </group>
        </>
      )}

      {/* SHED TRIANGLES on front/back */}
      {p.roofType === "shed" && (
        <>
          <group position={[0, 0, -L / 2 - (sz / 2 + panelThickness / 2) + offFront]} rotation={[0, Math.PI, 0]}>
            <PurShedTriangle
              p={p}
              width={W + sz + panelThickness}
              eave={Heave}
              highEave={Hhi}
              color={p.claddingColor}
              wireframe={p.wireframe}
              visible={!removedPanels["shed-front"]}
              onToggle={() => onTogglePanel?.("shed-front")}
              thickness={panelThickness}
              isSandwich={isSand}
              slopeDirection="right-to-left"
              claddingOrientation={p.claddingOrientation}
              panelType={p.panelType}
            />
          </group>
          <group position={[0, 0, L / 2 + (sz / 2 + panelThickness / 2) + offBack]}>
            <PurShedTriangle
              p={p}
              width={W + sz + panelThickness}
              eave={Heave}
              highEave={Hhi}
              color={p.claddingColor}
              wireframe={p.wireframe}
              visible={!removedPanels["shed-back"]}
              onToggle={() => onTogglePanel?.("shed-back")}
              thickness={panelThickness}
              isSandwich={isSand}
              slopeDirection="left-to-right"
              claddingOrientation={p.claddingOrientation}
              panelType={p.panelType}
            />
          </group>
        </>
      )}

      {/* CUBIC ATTIC on front/back & Capping Flashings */}
      {p.roofType === "cubic" && (() => {
        const atticH = p.atticHeight ?? 0.35;
        const panelW = W + sz + panelThickness;
        const rimColor = p.trimmingColor || "#2b2f36";
        const rimThick = 0.04;
        const rimDepth = panelThickness + 0.05;
        const capZDist = L / 2 + (sz / 2 + panelThickness / 2);
        const capXDist = W / 2 + (sz / 2 + panelThickness / 2);
        const capLenZ = L + (sz + panelThickness) * 2 + rimDepth;
        const capLenX = W + (sz + panelThickness) * 2 + rimDepth;
        return (
          <>
            {/* Capping flashing (obvodová krycia atiková lišta) */}
            <group position={[0, Heave + atticH + rimThick / 2, 0]}>
              <mesh position={[0, 0, -capZDist]}>
                <boxGeometry args={[capLenX, rimThick, rimDepth]} />
                <meshStandardMaterial color={rimColor} metalness={0.6} roughness={0.4} wireframe={p.wireframe} />
              </mesh>
              <mesh position={[0, 0, capZDist]}>
                <boxGeometry args={[capLenX, rimThick, rimDepth]} />
                <meshStandardMaterial color={rimColor} metalness={0.6} roughness={0.4} wireframe={p.wireframe} />
              </mesh>
              <mesh position={[-capXDist, 0, 0]}>
                <boxGeometry args={[rimDepth, rimThick, capLenZ]} />
                <meshStandardMaterial color={rimColor} metalness={0.6} roughness={0.4} wireframe={p.wireframe} />
              </mesh>
              <mesh position={[capXDist, 0, 0]}>
                <boxGeometry args={[rimDepth, rimThick, capLenZ]} />
                <meshStandardMaterial color={rimColor} metalness={0.6} roughness={0.4} wireframe={p.wireframe} />
              </mesh>
            </group>
          </>
        );
      })()}

      {/* ROOF */}
      {p.roofType === "gable" ? (
        <>
          {(() => {
            const halfW = W / 2;
            const gapWidth = sz / 2 + panelThickness;
            const overhang = 0.25;
            const extendedHalfW = halfW + gapWidth + overhang;
            const angle = Math.atan2(Hridge - Heave, halfW);
            const slopeLen = extendedHalfW / Math.cos(angle);
            return [-1, 1].map((s) => {
              const sideName = s === -1 ? "left" : "right";
              return (
                <group
                  key={`roof-${sideName}`}
                  position={[0, Hridge + offRoof, 0]}
                  rotation={[-Math.PI / 2, s * angle, 0]}
                >
                  {zs.map((z, i) => {
                    if (i === zs.length - 1) return null;
                    const zStart = zs[i];
                    const zEnd = zs[i + 1];
                    const actualStart = i === 0 ? zStart - (sz / 2 + panelThickness) - overhang : zStart;
                    const actualEnd = i === zs.length - 2 ? zEnd + (sz / 2 + panelThickness) + overhang : zEnd;
                    const w = actualEnd - actualStart;
                    const id = `roof-${sideName}-${i}`;
                    const isSkylightPanel = p.hasSkylights && (p.bayCount <= 2 ? i === 0 : i % 2 === 1);
                    return (
                      <group key={id} position={[s * (slopeLen / 2 - (sz / 2 + roofPanelThickness / 2) * Math.tan(angle)), actualStart, sz / 2 + roofPanelThickness / 2]}>
                        <PurPanel
                          id={id}
                          width={slopeLen}
                          height={w}
                          holes={[]}
                          texture={roofTex}
                          color={p.roofColor}
                          wireframe={p.wireframe}
                          visible={!removedPanels[id]}
                          onToggle={() => onTogglePanel?.(id)}
                          thickness={roofPanelThickness}
                          isSandwich={isRoofSand}
                          claddingOrientation={p.roofCladdingOrientation}
                          panelType={p.roofPanelType}
                          isSkylight={isSkylightPanel}
                        />
                      </group>
                    );
                  })}
                </group>
              );
            });
          })()}
        </>
      ) : p.roofType === "cubic" ? (
        (() => {
          // Technický spád strechy v atike dozadu k odkvapu (skryté za obvodovou atikou)
          const pitchDeg = Math.max(2, Math.min(p.roofPitchDeg, 5));
          const pitchRad = (pitchDeg * Math.PI) / 180;
          const drop = Math.tan(pitchRad) * L;
          const psz = sz * 0.7;
          const frontPurlinTop = Heave + sz / 2 + psz;
          const midY = frontPurlinTop - drop / 2 + offRoof;
          const slopeLen = Math.hypot(L, drop);
          const roofW = W + sz - 0.02;

          // Rozdelenie na štandardné modulové strešné panely (šírka ~1.0 m) idúce pozdĺžne v smere spádu
          const panelModuleW = 1.0;
          const numRoofPanels = Math.max(2, Math.round(roofW / panelModuleW));
          const actualPanelW = roofW / numRoofPanels;
          const startX = -roofW / 2;

          return (
            <group position={[0, midY, 0]} rotation={[-Math.PI / 2 + pitchRad, 0, 0]}>
              {Array.from({ length: numRoofPanels }).map((_, i) => {
                const px = startX + i * actualPanelW + actualPanelW / 2;
                const id = `roof-cubic-${i}`;
                return (
                  <group key={id} position={[px, -slopeLen / 2, roofPanelThickness / 2]}>
                    <PurPanel
                      id={id}
                      width={actualPanelW - 0.003}
                      height={slopeLen}
                      holes={[]}
                      texture={roofTex}
                      color={p.roofColor}
                      wireframe={p.wireframe}
                      visible={!removedPanels[id]}
                      onToggle={() => onTogglePanel?.(id)}
                      thickness={roofPanelThickness}
                      isSandwich={isRoofSand}
                      claddingOrientation="vertical"
                      panelType={p.roofPanelType}
                    />
                  </group>
                );
              })}
            </group>
          );
        })()
      ) : (
        (() => {
          const gapWidth = sz / 2 + panelThickness;
          const overhang = 0.25;
          const extendedW = W + 2 * gapWidth + 2 * overhang;
          const angle = Math.atan2(Hhi - Heave, W);
          const slopeLen = extendedW / Math.cos(angle);
          return (
            <group
              position={[0, (Heave + Hhi) / 2 + offRoof, 0]}
              rotation={[-Math.PI / 2, -angle, 0]}
            >
              {zs.map((z, i) => {
                if (i === zs.length - 1) return null;
                const zStart = zs[i];
                const zEnd = zs[i + 1];
                const actualStart = i === 0 ? zStart - (sz / 2 + panelThickness) - overhang : zStart;
                const actualEnd = i === zs.length - 2 ? zEnd + (sz / 2 + panelThickness) + overhang : zEnd;
                const w = actualEnd - actualStart;
                const id = `roof-${i}`;
                const isSkylightPanel = p.hasSkylights && (p.bayCount <= 2 ? i === 0 : i % 2 === 1);
                return (
                  <group key={id} position={[0, actualStart, sz / 2 + roofPanelThickness / 2]}>
                    <PurPanel
                      id={id}
                      width={slopeLen}
                      height={w}
                      holes={[]}
                      texture={roofTex}
                      color={p.roofColor}
                      wireframe={p.wireframe}
                      visible={!removedPanels[id]}
                      onToggle={() => onTogglePanel?.(id)}
                      thickness={roofPanelThickness}
                      isSandwich={isRoofSand}
                      claddingOrientation={p.roofCladdingOrientation}
                      panelType={p.roofPanelType}
                      isSkylight={isSkylightPanel}
                    />
                  </group>
                );
              })}
            </group>
          );
        })()
      )}
    </group>
  );
}
