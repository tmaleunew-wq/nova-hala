import "@react-three/fiber";
import { useMemo, useState } from "react";
import * as THREE from "three";
import type { GarageParams } from "@/lib/garage/types";
import { ridgeHeight, highEave, getFrameZ } from "./Structure";
import { makeTrapezoidTexture } from "@/lib/garage/textures";
import { createPBRCladdingMaterial, createPBRSmoothMaterial, createPBRTileMaterial } from "@/lib/garage/pbrMaterialHelper";
import { getCladdingConfig } from "@/lib/garage/configHelper";

interface Rect {
  cx: number;
  cy: number;
  w: number;
  h: number;
}

function PurPanel({
  id,
  width,
  height,
  holes = [],
  texture,
  color,
  thickness = 0.08,
  wireframe = false,
  visible = true,
  onToggle,
  isSandwich = true,
  claddingOrientation = "vertical",
  panelType,
}: {
  id: string;
  width: number;
  height: number;
  holes?: Rect[];
  texture?: THREE.Texture;
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
    const w2 = width / 2;
    s.moveTo(-w2, 0);
    s.lineTo(w2, 0);
    s.lineTo(w2, height);
    s.lineTo(-w2, height);
    s.lineTo(-w2, 0);
    for (const r of holes) {
      const path = new THREE.Path();
      const x0 = r.cx - r.w / 2;
      const x1 = r.cx + r.w / 2;
      const y0 = r.cy - r.h / 2;
      const y1 = r.cy + r.h / 2;
      path.moveTo(x0, y0);
      path.lineTo(x0, y1);
      path.lineTo(x1, y1);
      path.lineTo(x1, y0);
      path.lineTo(x0, y0);
      s.holes.push(path);
    }
    return s;
  }, [width, height, holes]);

  const pbrMaterial = useMemo(() => {
    if (wireframe) return null;
    const isRoof = id.startsWith("roof");
    if (isRoof) {
      const repeatsX = Math.max(4, Math.round(width / 0.18));
      const repeatsY = Math.max(4, Math.round(height / 0.35));
      return createPBRTileMaterial(activeColorStr, repeatsX, repeatsY);
    }
    if (panelType === "smooth") {
      return createPBRSmoothMaterial(activeColorStr);
    }
    const isHorizontal = claddingOrientation === "horizontal";
    const orient = isHorizontal ? "horizontal" : "vertical";
    const repeats = isHorizontal
      ? Math.max(1, Math.round(height / 0.6))
      : Math.max(1, Math.round(width / 0.6));

    const mat = createPBRCladdingMaterial(activeColorStr, orient, repeats);

    const textures = [mat.map, mat.normalMap, mat.roughnessMap, mat.metalnessMap].filter(
      Boolean,
    ) as THREE.Texture[];
    for (const t of textures) {
      if (isHorizontal) {
        t.rotation = Math.PI / 2;
        t.center.set(0.5, 0.5);
      } else {
        t.rotation = 0;
      }
      t.needsUpdate = true;
    }
    return mat;
  }, [activeColorStr, width, height, id, claddingOrientation, wireframe, panelType]);

  const outerGeom = useMemo(() => {
    const depth = isSandwich ? 0.002 : thickness;
    const g = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: false,
      curveSegments: 2,
    });
    g.translate(0, 0, thickness / 2 - depth);
    return g;
  }, [shape, thickness, isSandwich]);

  const coreGeom = useMemo(() => {
    if (!isSandwich) return null;
    const depth = thickness - 0.004;
    const g = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: false,
      curveSegments: 2,
    });
    g.translate(0, 0, -depth / 2);
    return g;
  }, [shape, thickness, isSandwich]);

  const innerGeom = useMemo(() => {
    if (!isSandwich) return null;
    const depth = 0.002;
    const g = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: false,
      curveSegments: 2,
    });
    g.translate(0, 0, -thickness / 2);
    return g;
  }, [shape, thickness, isSandwich]);

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

  const handleClick = (e: any) => {
    e.stopPropagation();
    if (onToggle) onToggle();
  };

  if (!visible) {
    return (
      <mesh
        position={[0, height / 2, 0]}
        castShadow={false}
        receiveShadow={false}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      >
        <boxGeometry args={[width, height, thickness]} />
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
      onClick={handleClick}
    >
      <mesh geometry={outerGeom} castShadow receiveShadow material={pbrMaterial || undefined}>
        {wireframe && (
          <meshStandardMaterial
            color={activeColorStr}
            side={THREE.DoubleSide}
            wireframe
          />
        )}
      </mesh>
      {isSandwich && coreGeom && (
        <mesh geometry={coreGeom} castShadow receiveShadow>
          <meshStandardMaterial
            color={hovered ? "#faf3cc" : "#e6dfb3"}
            metalness={0.05}
            roughness={0.9}
            side={THREE.DoubleSide}
            wireframe={wireframe}
          />
        </mesh>
      )}
      {isSandwich && innerGeom && (
        <mesh geometry={innerGeom} castShadow receiveShadow>
          <meshStandardMaterial
            color={hovered ? "#ffffff" : "#f1f3f5"}
            metalness={0.55}
            roughness={0.55}
            side={THREE.DoubleSide}
            wireframe={wireframe}
          />
        </mesh>
      )}
    </group>
  );
}

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
  claddingOrientation = "vertical",
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
      return createPBRSmoothMaterial(activeColorStr);
    }
    const isHorizontal = claddingOrientation === "horizontal";
    const orient = isHorizontal ? "horizontal" : "vertical";
    const repeats = isHorizontal
      ? Math.max(1, Math.round(ridge / 0.6))
      : Math.max(1, Math.round(width / 0.6));

    const mat = createPBRCladdingMaterial(activeColorStr, orient, repeats);

    const textures = [mat.map, mat.normalMap, mat.roughnessMap, mat.metalnessMap].filter(
      Boolean,
    ) as THREE.Texture[];
    for (const t of textures) {
      if (isHorizontal) {
        t.rotation = Math.PI / 2;
        t.center.set(0.5, 0.5);
      } else {
        t.rotation = 0;
      }
      t.needsUpdate = true;
    }
    return mat;
  }, [activeColorStr, width, ridge, claddingOrientation, wireframe, panelType]);

  const outerGeom = useMemo(() => {
    const depth = isSandwich ? 0.002 : thickness;
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 1 });
    g.translate(0, 0, thickness / 2 - depth);
    return g;
  }, [shape, thickness, isSandwich]);

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
    return g;
  }, [shape, thickness, isSandwich]);

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

  const handleClick = (e: any) => {
    e.stopPropagation();
    if (onToggle) onToggle();
  };

  if (!visible) {
    return (
      <mesh
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
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
      onClick={handleClick}
    >
      <mesh geometry={outerGeom} castShadow receiveShadow material={pbrMaterial || undefined}>
        {wireframe && <meshStandardMaterial color={activeColorStr} side={THREE.DoubleSide} wireframe />}
      </mesh>
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
  claddingOrientation = "vertical",
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
      return createPBRSmoothMaterial(activeColorStr);
    }
    const isHorizontal = claddingOrientation === "horizontal";
    const orient = isHorizontal ? "horizontal" : "vertical";
    const repeats = isHorizontal
      ? Math.max(1, Math.round(highEave / 0.6))
      : Math.max(1, Math.round(width / 0.6));

    const mat = createPBRCladdingMaterial(activeColorStr, orient, repeats);

    const textures = [mat.map, mat.normalMap, mat.roughnessMap, mat.metalnessMap].filter(
      Boolean,
    ) as THREE.Texture[];
    for (const t of textures) {
      if (isHorizontal) {
        t.rotation = Math.PI / 2;
        t.center.set(0.5, 0.5);
      } else {
        t.rotation = 0;
      }
      t.needsUpdate = true;
    }
    return mat;
  }, [activeColorStr, width, highEave, claddingOrientation, wireframe, panelType]);

  const outerGeom = useMemo(() => {
    const depth = isSandwich ? 0.002 : thickness;
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 1 });
    g.translate(0, 0, thickness / 2 - depth);
    return g;
  }, [shape, thickness, isSandwich]);

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
    return g;
  }, [shape, thickness, isSandwich]);

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

  const handleClick = (e: any) => {
    e.stopPropagation();
    if (onToggle) onToggle();
  };

  if (!visible) {
    return (
      <mesh
        geometry={outerGeom}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
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
      onClick={handleClick}
    >
      <mesh geometry={outerGeom} castShadow receiveShadow material={pbrMaterial || undefined}>
        {wireframe && <meshStandardMaterial color={activeColorStr} side={THREE.DoubleSide} wireframe />}
      </mesh>
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

  const wallThickness = (p.panelType === "sandwich" || p.panelType === "smooth") ? Math.max(0.04, p.wallPanelThicknessMm / 1000) : 0.01;
  const roofThickness = (p.panelType === "sandwich" || p.panelType === "smooth") ? Math.max(0.04, p.roofPanelThicknessMm / 1000) : 0.01;
  const panelThickness = wallThickness;
  const roofPanelThickness = roofThickness;
  const isSand = p.panelType === "sandwich" || p.panelType === "smooth";
  const sz = p.profileSize;

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

  const zs = useMemo(() => getFrameZ(p), [p]);

  return (
    <group>
      {/* FRONT (z=-L/2), normal -Z */}
      <group position={[0, 0, -L / 2 - (sz / 2 + panelThickness / 2) + offFront]} rotation={[0, Math.PI, 0]}>
        <PurPanel
          id="front"
          width={W + sz + panelThickness}
          height={Heave}
          holes={[doorHole]}
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
      <group position={[0, 0, L / 2 + (sz / 2 + panelThickness / 2) + offBack]}>
        <PurPanel
          id="back"
          width={W + sz + panelThickness}
          height={Heave}
          holes={p.personalDoorSide === "back" && p.hasPersonalDoor ? [{ cx: 0, cy: 1.0, w: 0.9, h: 2.0 }] : []}
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
            if (personalHole.cx + personalHole.w / 2 > zStart && personalHole.cx - personalHole.w / 2 < zEnd) {
              bayHoles.push({ cx: personalHole.cx - zCenter, cy: personalHole.cy, w: personalHole.w, h: personalHole.h });
            }
          }
          for (const wRect of winSpread) {
            if (wRect.cx + wRect.w / 2 > zStart && wRect.cx - wRect.w / 2 < zEnd) {
              bayHoles.push({ cx: wRect.cx - zCenter, cy: wRect.cy, w: wRect.w, h: wRect.h });
            }
          }

          const id = `left-${i}`;
          return (
            <group key={id} position={[zCenter, 0, 0]}>
              <PurPanel
                id={id}
                width={w}
                height={Heave}
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
            if (personalHole.cx + personalHole.w / 2 > zStart && personalHole.cx - personalHole.w / 2 < zEnd) {
              bayHoles.push({ cx: zCenter - personalHole.cx, cy: personalHole.cy, w: personalHole.w, h: personalHole.h });
            }
          }

          const id = `right-${i}`;
          return (
            <group key={id} position={[-zCenter, 0, 0]}>
              <PurPanel
                id={id}
                width={w}
                height={p.roofType === "shed" ? Hhi : Heave}
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
          <group position={[0, 0, -L / 2 - (sz / 2 + panelThickness / 2) + offFront]}>
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
                          isSandwich={isSand}
                          claddingOrientation={p.claddingOrientation}
                        />
                      </group>
                    );
                  })}
                </group>
              );
            });
          })()}
        </>
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
                      isSandwich={isSand}
                      claddingOrientation={p.claddingOrientation}
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
