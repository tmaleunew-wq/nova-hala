import { useMemo, useState } from "react";
import * as THREE from "three";
import { RoofCoverDetails } from "./RoofCoverDetails";
import { FacadePanelDetails } from "./FacadePanelDetails";
import { getSkylightPanelSection } from "@/lib/garage/skylights";
import {
  createPBRCladdingMaterial,
  createPBRSmoothMaterial,
  createPBRSandwichMaterial,
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
  roofOpening?: Rect;
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
  claddingOrientation = "horizontal",
  panelType,
  isSkylight = false,
  roofOpening,
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
      const margin = 0.005;
      const x0 = Math.max(-w2 + margin, Math.min(w2 - margin, r.cx - r.w / 2));
      const x1 = Math.max(-w2 + margin, Math.min(w2 - margin, r.cx + r.w / 2));
      const y0 = Math.max(margin, Math.min(height - margin, r.cy - r.h / 2));
      const y1 = Math.max(margin, Math.min(height - margin, r.cy + r.h / 2));
      if (x1 - x0 > 0.02 && y1 - y0 > 0.02) {
        const path = new THREE.Path();
        path.moveTo(x0, y0);
        path.lineTo(x0, y1);
        path.lineTo(x1, y1);
        path.lineTo(x1, y0);
        path.lineTo(x0, y0);
        s.holes.push(path);
      }
    }
    return s;
  }, [width, height, holes]);

  // A skylight crossing a panel edge needs an open cut, not a closed hole with a metal strip.
  const extrusionShape = useMemo(() => {
    if (!roofOpening) return shape;
    const section = getSkylightPanelSection(roofOpening, width, height);
    if (!section) return shape;
    return section.remainder.map(({ cx, cy, w, h }) => {
      const part = new THREE.Shape();
      part.moveTo(cx - w / 2, cy - h / 2);
      part.lineTo(cx + w / 2, cy - h / 2);
      part.lineTo(cx + w / 2, cy + h / 2);
      part.lineTo(cx - w / 2, cy + h / 2);
      part.closePath();
      return part;
    });
  }, [shape, roofOpening, width, height]);

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
    if (panelType === "smooth") {
      return createPBRSmoothMaterial(activeColorStr, 3.2, 3.2);
    }
    if (panelType === "sandwich") {
      const isHorizontal = claddingOrientation === "horizontal";
      const orient = isRoof ? "vertical" : isHorizontal ? "horizontal" : "vertical";
      const spacing = isRoof ? 0.25 : 1.0;
      const repeats = isHorizontal && !isRoof
        ? Math.max(1, Math.round(height / spacing))
        : Math.max(2, Math.round(width / spacing));
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
      ? Math.max(1, Math.round(height / spacing))
      : Math.max(1, Math.round(width / spacing));

    return createPBRCladdingMaterial(activeColorStr, orient, repeats);
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
    const g = new THREE.ExtrudeGeometry(extrusionShape, {
      depth,
      bevelEnabled: false,
      curveSegments: 2,
    });
    const zTrans = thickness / 2 - depth;
    g.translate(0, 0, zTrans);

    const pos = g.attributes.position?.array;
    const uvs = g.attributes.uv?.array;
    if (pos && uvs && height > 0.01 && width > 0.01) {
      const w2 = width / 2;
      for (let i = 0; i < uvs.length; i += 2) {
        const vIdx = (i / 2) * 3;
        const x = pos[vIdx];
        const y = pos[vIdx + 1];
        uvs[i] = (x + w2) / width;
        uvs[i + 1] = Math.max(0, Math.min(1, y / height));
      }
      g.attributes.uv.needsUpdate = true;
    }

    return g;
  }, [extrusionShape, thickness, isSandwichActual, width, height]);

  const coreGeom = useMemo(() => {
    if (!isSandwichActual) return null;
    const depth = thickness - 0.004;
    const g = new THREE.ExtrudeGeometry(extrusionShape, {
      depth,
      bevelEnabled: false,
      curveSegments: 2,
    });
    g.translate(0, 0, -depth / 2);
    return g;
  }, [extrusionShape, thickness, isSandwichActual]);

  const innerGeom = useMemo(() => {
    if (!isSandwichActual) return null;
    const depth = 0.002;
    const g = new THREE.ExtrudeGeometry(extrusionShape, {
      depth,
      bevelEnabled: false,
      curveSegments: 2,
    });
    const zTrans = -thickness / 2;
    g.translate(0, 0, zTrans);

    const pos = g.attributes.position?.array;
    const uvs = g.attributes.uv?.array;
    if (pos && uvs && height > 0.01 && width > 0.01) {
      const w2 = width / 2;
      for (let i = 0; i < uvs.length; i += 2) {
        const vIdx = (i / 2) * 3;
        const x = pos[vIdx];
        const y = pos[vIdx + 1];
        uvs[i] = (x + w2) / width;
        uvs[i + 1] = Math.max(0, Math.min(1, y / height));
      }
      g.attributes.uv.needsUpdate = true;
    }

    return g;
  }, [extrusionShape, thickness, isSandwichActual, width, height]);

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
      {(isRoof || id.startsWith("ext-roof")) && !isSkylight && holes.length === 0 && (
        <RoofCoverDetails id={id} width={width} height={height} thickness={thickness} panelType={panelType} color={activeColorStr} wireframe={wireframe} />
      )}
      {(isRoof || id.startsWith("ext-roof")) && !isSkylight && roofOpening && (
        <RoofCoverDetails id={id} width={width} height={height} thickness={thickness} panelType={panelType} color={activeColorStr} wireframe={wireframe} roofOpening={roofOpening} />
      )}
      {!isRoof && !id.startsWith("ext-roof") && !isSkylight && (
        <FacadePanelDetails shape={shape} thickness={thickness} panelType={panelType} orientation={claddingOrientation} color={activeColorStr} material={pbrMaterial} wireframe={wireframe} />
      )}
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
