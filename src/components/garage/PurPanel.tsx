import { useMemo, useState } from "react";
import * as THREE from "three";
import {
  createPBRCladdingMaterial,
  createPBRSmoothMaterial,
  createPBRTileMaterial,
  createPBRWoodMaterial,
} from "@/lib/garage/pbrMaterialHelper";

export interface Rect {
  cx: number;
  cy: number;
  w: number;
  h: number;
}

export interface PurPanelProps {
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
  isSkylight?: boolean;
}

export function PurPanel({
  id,
  width,
  height,
  holes = [],
  color,
  thickness = 0.08,
  wireframe = false,
  visible = true,
  onToggle,
  isSandwich = true,
  claddingOrientation = "vertical",
  panelType,
  isSkylight = false,
}: PurPanelProps) {
  const [hovered, setHovered] = useState(false);

  const activeColor = hovered
    ? new THREE.Color(color).clone().multiplyScalar(1.15).getHexString()
    : color;
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
      const margin = 0.01;
      const maxW = Math.max(0.1, width - margin * 2);
      const holeW = Math.min(r.w, maxW);
      const maxH = Math.max(0.1, height - margin * 2);
      const holeH = Math.min(r.h, maxH);
      const halfHW = holeW / 2;
      const x0 = Math.max(-w2 + margin, Math.min(w2 - margin - holeW, r.cx - halfHW));
      const x1 = x0 + holeW;
      const y0 = Math.max(margin, Math.min(height - margin - holeH, r.cy - holeH / 2));
      const y1 = y0 + holeH;
      const path = new THREE.Path();
      path.moveTo(x0, y0);
      path.lineTo(x0, y1);
      path.lineTo(x1, y1);
      path.lineTo(x1, y0);
      path.lineTo(x0, y0);
      s.holes.push(path);
    }
    return s;
  }, [width, height, holes]);

  const isRoof = id.startsWith("roof");
  const isSandwichActual = isSandwich && !isSkylight;

  const pbrMaterial = useMemo(() => {
    if (wireframe) return null;
    if (isSkylight) {
      return new THREE.MeshPhysicalMaterial({
        color: "#cbe2f7",
        transmission: 0.85,
        roughness: 0.15,
        metalness: 0.05,
        ior: 1.48,
        thickness: thickness,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
      });
    }
    if (panelType === "tile" && isRoof) {
      const repeatsX = Math.max(2, Math.round(width / 0.35));
      const repeatsY = Math.max(2, Math.round(height / 0.2));
      return createPBRTileMaterial(activeColorStr, repeatsX, repeatsY);
    }
    if (panelType === "smooth" || panelType === "sandwich") {
      return createPBRSmoothMaterial(activeColorStr, 3.2, 3.2);
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
      ? Math.max(1, Math.round(height / spacing))
      : Math.max(1, Math.round(width / spacing));

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
  }, [
    activeColorStr,
    width,
    height,
    isRoof,
    claddingOrientation,
    wireframe,
    panelType,
    isSkylight,
    thickness,
  ]);

  const outerGeom = useMemo(() => {
    const depth = isSandwichActual ? 0.002 : thickness;
    const g = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: false,
      curveSegments: 2,
    });
    const zTrans = thickness / 2 - depth;
    g.translate(0, 0, zTrans);
    return g;
  }, [shape, thickness, isSandwichActual]);

  const coreGeom = useMemo(() => {
    if (!isSandwichActual) return null;
    const depth = thickness - 0.004;
    const g = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: false,
      curveSegments: 2,
    });
    g.translate(0, 0, -depth / 2);
    return g;
  }, [shape, thickness, isSandwichActual]);

  const innerGeom = useMemo(() => {
    if (!isSandwichActual) return null;
    const depth = 0.002;
    const g = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: false,
      curveSegments: 2,
    });
    const zTrans = -thickness / 2;
    g.translate(0, 0, zTrans);
    return g;
  }, [shape, thickness, isSandwichActual]);

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
        position={[0, height / 2, 0]}
        castShadow={false}
        receiveShadow={false}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={(e) => {
          if (e.delta && e.delta > 5) return;
          e.stopPropagation();
          onToggle?.();
        }}
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
      onClick={(e) => {
        if (e.delta && e.delta > 5) return;
        e.stopPropagation();
        onToggle?.();
      }}
    >
      <mesh geometry={outerGeom} castShadow receiveShadow material={pbrMaterial || undefined}>
        {wireframe && (
          <meshStandardMaterial color={activeColorStr} side={THREE.DoubleSide} wireframe />
        )}
      </mesh>
      {isSandwichActual && coreGeom && (
        <mesh geometry={coreGeom} castShadow receiveShadow>
          <meshStandardMaterial
            color={hovered ? "#4a4e54" : "#363a40"}
            metalness={0.05}
            roughness={0.9}
            side={THREE.DoubleSide}
            wireframe={wireframe}
          />
        </mesh>
      )}
      {isSandwichActual && innerGeom && (
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
      {isSkylight &&
        !wireframe &&
        (() => {
          const numRibs = 5;
          const ribWidth = 0.02;
          const ribThick = 0.015;
          const ribs = [];
          for (let j = 0; j < numRibs; j++) {
            const ribY = (j / (numRibs - 1)) * height;
            const ribZ = -thickness / 2 - ribThick / 2 - 0.001;
            ribs.push(
              <mesh key={j} position={[0, ribY, ribZ]} castShadow>
                <boxGeometry args={[width, ribWidth, ribThick]} />
                <meshStandardMaterial color="#b2b9c4" metalness={0.8} roughness={0.3} />
              </mesh>,
            );
          }
          return <>{ribs}</>;
        })()}
    </group>
  );
}
