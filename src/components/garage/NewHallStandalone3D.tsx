import React, { useMemo, useEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { SteelTube, SteelPlate } from "./SteelTube";
import { BuildingObjects3D, ObjectOutline } from "./BuildingObjects3D";
import { resolveBuildingObjects, getBuildingObjectGeometry, type BuildingObject } from "@/lib/garage/buildingObjects";
import { type MaterialCatalog } from "@/lib/materials/catalog";
import { type GarageParams } from "@/lib/garage/types";
import { PersonalDoorDetails, WindowDetails } from "./AccessoryDetails";
import { PersonalDoorLeafFinish, PersonalDoorFrameFinish } from "./PersonalDoorFinish";
import { SectionalPanelDetails, SectionalGuideDetails } from "./SectionalDoorDetails";
import { GateJambDetails } from "./GateSurfaceDetails";
import { RoofSheetDetails } from "./RoofSheetDetails";
import { createPBRSmoothMaterial, createPBRWoodMaterial, setupProceduralEnvMap } from "@/lib/garage/pbrMaterialHelper";

export interface HiStructLayerToggles {
  panels: boolean;
  openings: boolean;
  frames: boolean;
  purlins: boolean;
  girts: boolean;
  flashings: boolean;
  structuralComponents: boolean;
  basePlate: boolean;
}

interface NewHallStandalone3DProps {
  p: GarageParams;
  templateId: string;
  claddingOpacity?: number;
  layerToggles?: HiStructLayerToggles;
  editedSurfaces?: string[];
  replacedWindowIds?: string[];
  buildingObjects?: BuildingObject[];
  selectedObjectId?: string;
  onSelectObject?: (id: string) => void;
  materialCatalog?: MaterialCatalog;
}

/**
 * Renders a complete, standalone industrial steel hall where each of the 10 standalone
 * archetypes has its own dedicated structural frame system and architectural envelope.
 */
export function NewHallStandalone3D({
  p,
  templateId,
  claddingOpacity = 1.0,
  layerToggles,
  editedSurfaces = [],
  replacedWindowIds = [],
  buildingObjects, selectedObjectId, onSelectObject, materialCatalog,
}: NewHallStandalone3DProps) {
  const lt: HiStructLayerToggles = layerToggles ?? {
    panels: true,
    openings: true,
    frames: true,
    purlins: true,
    girts: true,
    flashings: true,
    structuralComponents: true,
    basePlate: true,
  };

  const { gl, scene } = useThree();

  useEffect(() => {
    const envMap = setupProceduralEnvMap(scene, gl);
    return () => {
      if (scene.environment === envMap) {
        scene.environment = null;
      }
      envMap.dispose();
    };
  }, [gl, scene]);

  const W = p.width;
  const L = p.length;
  const H = p.clearHeight;
  const halfW = W / 2;
  const halfL = L / 2;
  const pitchRad = ((p.roofPitchDeg ?? 10) * Math.PI) / 180;
  const Hridge = H + halfW * Math.tan(pitchRad);

  const bayCount = Math.max(2, p.bayCount ?? Math.round(L / 6));
  const bayLen = L / bayCount;

  const frameZs = useMemo(() => {
    const arr: number[] = [];
    for (let i = 0; i <= bayCount; i++) {
      arr.push(-halfL + i * bayLen);
    }
    return arr;
  }, [halfL, bayCount, bayLen]);

  const showStruct = p.showStructure !== false;
  const showClad = p.showCladding !== false && lt.panels;
  const showOpenings = showClad && lt.openings;
  const isGhostClad = claddingOpacity < 0.99;

  // Standalone archetype identification & slab calculations
  const isDoubleSpan = templateId === "dvojlodna_hala" || !!p.hasCenterColumns;
  const isOfficeWithStorage = templateId === "kancelarska_budova";
  const isProdWithOffice = templateId === "vyrobna_hala";
  const isSideCanopy = templateId === "budova_pristresok";
  const isBothLeans = templateId === "budova_pristavky";
  const isLShape = templateId === "nakreslit_pudorys";
  const hasSkylight =
    templateId === "skladovacia_hala_svetlik" ||
    templateId === "budova_pristresok" ||
    templateId === "dvojlodna_hala" ||
    !!p.hasRidgeSkylight;

  const managedObjects = useMemo(() => resolveBuildingObjects({ templateId, params: p, buildingObjects }), [templateId, p, buildingObjects]);
  const attachmentCorners = managedObjects.filter(object => object.type !== "main_hall").flatMap(object => {
    try {
      const g = getBuildingObjectGeometry(object, managedObjects, p);
      return [g.toWorld(0, 0, 0), g.toWorld(g.width, 0, 0), g.toWorld(0, 0, g.length), g.toWorld(g.width, 0, g.length)];
    } catch { return []; }
  });
  const attachmentMinX = Math.min(-halfW, ...attachmentCorners.map(point => point[0])) - .3;
  const attachmentMaxX = Math.max(halfW, ...attachmentCorners.map(point => point[0])) + .3;
  const slabMinZ = Math.min(-halfL, ...attachmentCorners.map(point => point[2])) - .3;
  const slabMaxZ = Math.max(halfL, ...attachmentCorners.map(point => point[2])) + .3;
  const slabMinX = -halfW - 0.3 - (isSideCanopy ? (p.canopyWidth || 4.5) : isBothLeans || isLShape ? 5.3 : 0);
  const slabMaxX = halfW + 0.3 + (isProdWithOffice || isBothLeans || isOfficeWithStorage ? 6.0 : 0);
  const slabWidth = Math.max(slabMaxX, attachmentMaxX) - Math.min(slabMinX, attachmentMinX);
  const slabCenterX = (Math.min(slabMinX, attachmentMinX) + Math.max(slabMaxX, attachmentMaxX)) / 2;

  // Colors & Materials (defaulting steel to HiStruct blue #3b83bd)
  const steelColor = p.steelColor || "#3b83bd";
  const wallColor = p.claddingColor || "#d1d5db";
  const roofColor = p.roofColor || "#6b7280";
  const trimColor = p.trimmingColor || "#1f2937";
  const gateColor = p.sectionalDoorColor || "#374151";

  const wallMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: wallColor,
        roughness: 0.65,
        metalness: 0.15,
        transparent: isGhostClad,
        opacity: claddingOpacity,
        side: THREE.DoubleSide,
      }),
    [wallColor, isGhostClad, claddingOpacity]
  );

  const roofMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: roofColor,
        roughness: 0.62,
        metalness: 0.3,
        transparent: isGhostClad,
        opacity: claddingOpacity,
        side: THREE.DoubleSide,
      }),
    [roofColor, isGhostClad, claddingOpacity]
  );

  const trimMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: trimColor,
        roughness: 0.4,
        metalness: 0.3,
      }),
    [trimColor]
  );

  const gateMaterial = useMemo(() => {
    if (p.gateDecor === "wood_oak") {
      return createPBRWoodMaterial("golden_oak", "horizontal");
    }
    if (p.gateDecor === "wood_walnut") {
      return createPBRWoodMaterial("walnut", "horizontal");
    }
    return new THREE.MeshStandardMaterial({
      color: p.sectionalDoorColor || gateColor,
      metalness: 0.6,
      roughness: 0.35,
      wireframe: p.wireframe,
    });
  }, [p.gateDecor, p.sectionalDoorColor, gateColor, p.wireframe]);

  const gateMat = gateMaterial;

  const doorMaterial = useMemo(() => {
    if (p.wireframe) return null;
    if (p.doorDecor === "wood_oak") {
      return createPBRWoodMaterial("golden_oak", "vertical");
    }
    if (p.doorDecor === "wood_walnut") {
      return createPBRWoodMaterial("walnut", "vertical");
    }
    if (p.doorDecor === "none" && p.doorColor) {
      return createPBRSmoothMaterial(p.doorColor);
    }
    if (p.gateDecor === "wood_oak" && !p.doorColor) {
      return createPBRWoodMaterial("golden_oak", "vertical");
    }
    if (p.gateDecor === "wood_walnut" && !p.doorColor) {
      return createPBRWoodMaterial("walnut", "vertical");
    }
    return createPBRSmoothMaterial(p.doorColor || "#3a3f47");
  }, [p.doorDecor, p.gateDecor, p.doorColor, p.wireframe]);

  const glassMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#cbe7f7",
        transparent: true,
        opacity: 0.38,
        roughness: 0.04,
        metalness: 0.1,
        transmission: 0.72,
        ior: 1.5,
        thickness: 0.03,
        depthWrite: false,
      }),
    []
  );

  const concreteMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#94a3b8",
        roughness: 0.9,
      }),
    []
  );

  const stemH = p.hasStemWall !== false ? (p.stemWallHeight ?? 0.27) : 0;
  const stemThick = p.stemWallThickness ?? 0.1;
  const stemColor = p.stemWallColor || "#a5a5a5";
  const panelW = p.wallPanelWidth ?? 1.0;
  const isHorizontal = p.claddingOrientation !== "vertical";

  const stemMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: stemColor,
        roughness: 0.85,
        metalness: 0.1,
      }),
    [stemColor]
  );

  const seamMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#272e38",
        roughness: 0.8,
      }),
    []
  );

  const colSize = p.profileSize || 0.22;
  const colHalf = colSize / 2;

  const hasFrontGate =
    templateId === "prazdna_hala" ||
    templateId === "skladovacia_hala" ||
    templateId === "skladovacia_hala_svetlik" ||
    templateId === "budova_pristavky";

  const frontGateW = hasFrontGate ? (p.doorWidth || 4.2) : 0;
  const frontGateH = hasFrontGate ? (p.doorHeight || 4.0) : 0;

  const gableShape = useMemo(() => {
    const s = new THREE.Shape();
    const eavesY = H + colHalf * Math.tan(pitchRad) + 0.08;
    s.moveTo(-halfW + colHalf, stemH);
    s.lineTo(halfW - colHalf, stemH);
    s.lineTo(halfW - colHalf, eavesY);
    s.lineTo(0, Hridge + 0.08);
    s.lineTo(-halfW + colHalf, eavesY);
    s.closePath();
    return s;
  }, [halfW, H, Hridge, stemH, colHalf, pitchRad]);

  const frontGableShape = useMemo(() => {
    const s = new THREE.Shape();
    const eavesY = H + colHalf * Math.tan(pitchRad) + 0.08;
    s.moveTo(-halfW + colHalf, stemH);
    s.lineTo(halfW - colHalf, stemH);
    s.lineTo(halfW - colHalf, eavesY);
    s.lineTo(0, Hridge + 0.08);
    s.lineTo(-halfW + colHalf, eavesY);
    s.closePath();

    if (hasFrontGate && frontGateW > 0 && frontGateH > stemH) {
      const gw = frontGateW / 2;
      const gh = frontGateH;
      const hole = new THREE.Path();
      hole.moveTo(-gw, stemH);
      hole.lineTo(gw, stemH);
      hole.lineTo(gw, gh);
      hole.lineTo(-gw, gh);
      hole.lineTo(-gw, stemH);
      s.holes.push(hole);
    }
    return s;
  }, [halfW, H, Hridge, stemH, colHalf, pitchRad, hasFrontGate, frontGateW, frontGateH]);

  const gableExtrudeSettings = useMemo(
    () => ({
      depth: 0.1,
      bevelEnabled: false,
    }),
    []
  );

  // Helper: Renders a duopitch portal frame at Z with optional center column and purlins
  const renderMainPortalFrames = (hasCenterCol: boolean, hasMezzanineBays = 0) => {
    const colSize = p.profileSize || 0.22;
    const rafterSize = colSize * 0.9;
    const purlinCount = Math.max(3, Math.ceil(halfW / 1.6));
    const purlinColor = "#8f8f8f";

    return (
      <group name="primary-steel-structure">
        {lt.frames &&
          frameZs.map((z, idx) => {
            const isGable = idx === 0 || idx === bayCount;
            return (
              <group key={`frame-${idx}`}>
                {/* Left & Right Primary Columns */}
                <SteelTube from={[-halfW, 0, z]} to={[-halfW, H, z]} size={colSize} color={steelColor} />
                <SteelPlate position={[-halfW, 0.015, z]} size={[colSize * 1.35, 0.025, colSize]} color="#d7d7d7" />

                <SteelTube from={[halfW, 0, z]} to={[halfW, H, z]} size={colSize} color={steelColor} />
                <SteelPlate position={[halfW, 0.015, z]} size={[colSize * 1.35, 0.025, colSize]} color="#d7d7d7" />

                {/* Eave & Ridge Haunches only on internal portal frames (not on gable walls) */}
                {!isGable && (
                  <>
                    <SteelTube
                      from={[-halfW, H - 0.55, z]}
                      to={[-halfW + 1.4, H + 1.4 * Math.tan(pitchRad), z]}
                      size={rafterSize * 0.8}
                      color={steelColor}
                    />
                    <SteelTube
                      from={[halfW, H - 0.55, z]}
                      to={[halfW - 1.4, H + 1.4 * Math.tan(pitchRad), z]}
                      size={rafterSize * 0.8}
                      color={steelColor}
                    />

                    {/* Ridge Haunches (Nábehy v hrebeni) */}
                    <SteelTube
                      from={[-1.0, Hridge - 1.0 * Math.tan(pitchRad) - 0.12, z]}
                      to={[1.0, Hridge - 1.0 * Math.tan(pitchRad) - 0.12, z]}
                      size={rafterSize * 0.65}
                      color={steelColor}
                    />
                  </>
                )}

                {/* Left & Right Rafters */}
                <SteelTube from={[-halfW, H, z]} to={[0, Hridge, z]} size={rafterSize} color={steelColor} />
                <SteelTube from={[0, Hridge, z]} to={[halfW, H, z]} size={rafterSize} color={steelColor} />

                {/* Center Column (pre dvojloďovú halu) */}
                {hasCenterCol && (
                  <>
                    <SteelTube from={[0, 0, z]} to={[0, Hridge, z]} size={colSize * 0.95} color={steelColor} />
                    <SteelPlate position={[0, 0.015, z]} size={[colSize * 1.8, 0.03, colSize * 1.8]} color="#d7d7d7" />
                    <SteelTube
                      from={[0, H - 0.6, z]}
                      to={[-1.2, Hridge - 1.2 * Math.tan(pitchRad), z]}
                      size={colSize * 0.55}
                      color={steelColor}
                    />
                    <SteelTube
                      from={[0, H - 0.6, z]}
                      to={[1.2, Hridge - 1.2 * Math.tan(pitchRad), z]}
                      size={colSize * 0.55}
                      color={steelColor}
                    />
                  </>
                )}

                {/* Gable Wind Columns (Štítové stĺpy — 2 medzistĺpy ako v HiStruct 1019956) */}
                {isGable && !hasCenterCol && (
                  <>
                    {[-halfW / 3, halfW / 3].map((gx, gi) => {
                      const gy = H + (halfW - Math.abs(gx)) * Math.tan(pitchRad);
                      const isFront = z === frameZs[0];
                      const insideGate = isFront && hasFrontGate && Math.abs(gx) < frontGateW / 2 + 0.1;
                      const startY = insideGate ? frontGateH : 0;
                      if (startY >= gy) return null;
                      return (
                        <SteelTube
                          key={`gable-col-${gi}`}
                          from={[gx, startY, z]}
                          to={[gx, gy, z]}
                          size={colSize * 0.72}
                          color={steelColor}
                        />
                      );
                    })}
                  </>
                )}
              </group>
            );
          })}

        {/* Internal Structural Components (Štrukturálne komponenty: Plošina, Stĺpy RHS, Schodisko, Zábradlie, Deliaca stena) */}
        {lt.structuralComponents && hasMezzanineBays > 0 && (
          <group name="histruct-structural-components">
            {frameZs.slice(0, hasMezzanineBays + 1).map((z, idx) => (
              <group key={`mezz-frame-${idx}`}>
                {/* Stropný nosník HEA vo výške 3.0m */}
                <SteelTube from={[-halfW, 3.0, z]} to={[halfW, 3.0, z]} size={0.18} color="#5b9bd5" />
                {/* Vnútorné stĺpy RHS 100x100 vo farbe RAL 5024 */}
                <SteelTube from={[-halfW / 3, 0, z]} to={[-halfW / 3, 3.0, z]} size={0.12} color="#5b9bd5" />
                <SteelTube from={[halfW / 3, 0, z]} to={[halfW / 3, 3.0, z]} size={0.12} color="#5b9bd5" />
              </group>
            ))}

            {/* Mezzanine Platform Deck (Plošina 2.NP) */}
            <mesh position={[0, 3.08, -halfL + (hasMezzanineBays * bayLen) / 2]}>
              <boxGeometry args={[W - 0.16, 0.14, hasMezzanineBays * bayLen]} />
              <primitive object={concreteMat} attach="material" />
            </mesh>

            {/* Safety Railings (Zábradlie na galérii v výške +1.1m) */}
            <SteelTube
              from={[-halfW + 0.2, 4.2, -halfL + hasMezzanineBays * bayLen]}
              to={[halfW - 1.5, 4.2, -halfL + hasMezzanineBays * bayLen]}
              size={0.05}
              color="#5b9bd5"
            />
            <SteelTube
              from={[-halfW + 0.2, 3.65, -halfL + hasMezzanineBays * bayLen]}
              to={[halfW - 1.5, 3.65, -halfL + hasMezzanineBays * bayLen]}
              size={0.04}
              color="#5b9bd5"
            />

            {/* Internal Staircase (Oceľové schodisko na 2.NP) */}
            <group position={[halfW - 1.1, 0, -halfL + hasMezzanineBays * bayLen + 0.2]}>
              <SteelTube from={[-0.4, 0, 2.8]} to={[-0.4, 3.08, 0]} size={0.08} color="#5b9bd5" />
              <SteelTube from={[0.4, 0, 2.8]} to={[0.4, 3.08, 0]} size={0.08} color="#5b9bd5" />
              {Array.from({ length: 12 }).map((_, si) => {
                const st = (si + 0.5) / 12;
                return (
                  <mesh key={`step-${si}`} position={[0, st * 3.05, (1 - st) * 2.8]}>
                    <boxGeometry args={[0.8, 0.05, 0.26]} />
                    <primitive object={concreteMat} attach="material" />
                  </mesh>
                );
              })}
            </group>

            {/* Internal Partition Wall separating 2-storey Office from Warehouse */}
            {showClad && (
              <mesh
                position={[0, H / 2, -halfL + hasMezzanineBays * bayLen + 0.04]}
              >
                <boxGeometry args={[W - 0.2, H, 0.1]} />
                <meshStandardMaterial
                  color="#ffffff"
                  roughness={0.7}
                  transparent={isGhostClad}
                  opacity={claddingOpacity}
                />
              </mesh>
            )}
          </group>
        )}

        {/* Longitudinal Roof Purlins (Z-väznice) */}
        {lt.purlins &&
          Array.from({ length: purlinCount + 1 }).map((_, pi) => {
            const t = pi / purlinCount;
            const xOff = t * halfW;
            const yPos = H + (1 - t) * (Hridge - H) + 0.08;
            return (
              <group key={`purlin-row-${pi}`}>
                <SteelTube from={[-xOff, yPos, -halfL]} to={[-xOff, yPos, halfL]} size={0.07} color={purlinColor} />
                {pi > 0 && (
                  <SteelTube from={[xOff, yPos, -halfL]} to={[xOff, yPos, halfL]} size={0.07} color={purlinColor} />
                )}
              </group>
            );
          })}

        {/* Wall Girts (Stenové paždíky) */}
        {lt.girts &&
          [1.5, 3.0, 4.5, 5.8].filter((gy) => gy < H - 0.3).map((gy, gi) => (
            <group key={`girt-row-${gi}`}>
              <SteelTube from={[-halfW - 0.04, gy, -halfL]} to={[-halfW - 0.04, gy, halfL]} size={0.06} color={purlinColor} />
              <SteelTube from={[halfW + 0.04, gy, -halfL]} to={[halfW + 0.04, gy, halfL]} size={0.06} color={purlinColor} />
            </group>
          ))}

        {/* Wind X-Bracing in first and last bays (Zavetrovacie kríže) */}
        {lt.frames &&
          [0, bayCount - 1].map((bIdx) => {
            const z0 = frameZs[bIdx];
            const z1 = frameZs[bIdx + 1];
            if (z1 === undefined) return null;
            return (
              <group key={`bracing-${bIdx}`}>
                {/* Wall X-bracing */}
                <SteelTube from={[-halfW, 0.2, z0]} to={[-halfW, H - 0.2, z1]} size={0.03} color="#475569" />
                <SteelTube from={[-halfW, H - 0.2, z0]} to={[-halfW, 0.2, z1]} size={0.03} color="#475569" />
                <SteelTube from={[halfW, 0.2, z0]} to={[halfW, H - 0.2, z1]} size={0.03} color="#475569" />
                <SteelTube from={[halfW, H - 0.2, z0]} to={[halfW, 0.2, z1]} size={0.03} color="#475569" />
                {/* Roof X-bracing */}
                <SteelTube from={[-halfW, H, z0]} to={[0, Hridge, z1]} size={0.03} color="#475569" />
                <SteelTube from={[0, Hridge, z0]} to={[-halfW, H, z1]} size={0.03} color="#475569" />
                <SteelTube from={[halfW, H, z0]} to={[0, Hridge, z1]} size={0.03} color="#475569" />
                <SteelTube from={[0, Hridge, z0]} to={[halfW, H, z1]} size={0.03} color="#475569" />
              </group>
            );
          })}

        {/* Base Concrete Slab (Základová doska pre celý stavebný komplex) */}
        {p.showFoundation !== false && lt.basePlate && (
          <group name="base-plate">
            <mesh position={[slabCenterX, -0.08, (slabMinZ + slabMaxZ) / 2]} receiveShadow>
              <boxGeometry args={[slabWidth, 0.16, slabMaxZ - slabMinZ]} />
              <primitive object={concreteMat} attach="material" />
            </mesh>
          </group>
        )}
      </group>
    );
  };

  // Helper: Main Duopitch Cladding Envelope
  const renderMainEnvelope = () => {
    const colSize = p.profileSize || 0.22;
    const colHalf = colSize / 2;
    const slopeLen = Math.hypot(halfW, Hridge - H) + 0.25;
    const wallH = H - stemH;
    const wallMidY = stemH + wallH / 2;

    const wallThick = 0.10;
    const sokelThick = 0.12;
    // 8mm architectural relief inset for panels so steel columns stand proud
    const inset = 0.008;
    const leftWallX = -halfW - colHalf + inset + wallThick / 2;
    const rightWallX = halfW + colHalf - inset - wallThick / 2;
    const leftSokelX = -halfW - colHalf + 0.004 + sokelThick / 2;
    const rightSokelX = halfW + colHalf - 0.004 - sokelThick / 2;
    const leftSeamX = -halfW - colHalf + inset - 0.003;
    const rightSeamX = halfW + colHalf - inset + 0.003;

    // Segmented bay spans: panels, plinths and seams strictly fit between steel columns
    const sideBays: Array<{ b: number; z0: number; z1: number; baySpan: number; bayMidZ: number }> = [];
    for (let b = 0; b < bayCount; b++) {
      const z0 = frameZs[b];
      const z1 = frameZs[b + 1];
      if (z1 === undefined) continue;
      const baySpan = (z1 - z0) - colSize;
      const bayMidZ = (z0 + z1) / 2;
      sideBays.push({ b, z0, z1, baySpan: Math.max(0.05, baySpan), bayMidZ });
    }

    return (
      <group name="main-envelope">
        {/* Left & Right Side Walls (segmented per bay between steel columns, eliminating Z-fighting) */}
        {sideBays.map(({ b, baySpan, bayMidZ }) => (
          <group key={`side-wall-bay-${b}`}>
            <mesh position={[leftWallX, wallMidY, bayMidZ]}>
              <boxGeometry args={[wallThick, wallH, baySpan]} />
              <primitive object={wallMat} attach="material" />
            </mesh>
            <mesh position={[rightWallX, wallMidY, bayMidZ]}>
              <boxGeometry args={[wallThick, wallH, baySpan]} />
              <primitive object={wallMat} attach="material" />
            </mesh>
          </group>
        ))}

        {/* Concrete Stem Walls (Sokel - bočné polia medzi stĺpmi + štítové steny) */}
        {stemH > 0 && (
          <group name="concrete-stem-walls">
            {sideBays.map(({ b, baySpan, bayMidZ }) => (
              <group key={`stem-bay-${b}`}>
                <mesh position={[leftSokelX, stemH / 2, bayMidZ]}>
                  <boxGeometry args={[sokelThick, stemH, baySpan]} />
                  <primitive object={stemMat} attach="material" />
                </mesh>
                <mesh position={[rightSokelX, stemH / 2, bayMidZ]}>
                  <boxGeometry args={[sokelThick, stemH, baySpan]} />
                  <primitive object={stemMat} attach="material" />
                </mesh>
              </group>
            ))}
            {/* Front sokel: cleanly splits around front gate if present */}
            {hasFrontGate && frontGateW > 0 ? (
              <>
                <mesh
                  position={[(-halfW + colHalf - frontGateW / 2) / 2, stemH / 2, -halfL - colHalf + 0.004 + sokelThick / 2]}
                >
                  <boxGeometry args={[(halfW - colHalf) - frontGateW / 2, stemH, sokelThick]} />
                  <primitive object={stemMat} attach="material" />
                </mesh>
                <mesh
                  position={[(frontGateW / 2 + halfW - colHalf) / 2, stemH / 2, -halfL - colHalf + 0.004 + sokelThick / 2]}
                >
                  <boxGeometry args={[(halfW - colHalf) - frontGateW / 2, stemH, sokelThick]} />
                  <primitive object={stemMat} attach="material" />
                </mesh>
              </>
            ) : (
              <mesh
                position={[0, stemH / 2, -halfL - colHalf + 0.004 + sokelThick / 2]}
              >
                <boxGeometry args={[W - colSize, stemH, sokelThick]} />
                <primitive object={stemMat} attach="material" />
              </mesh>
            )}
            <mesh
              position={[0, stemH / 2, halfL + colHalf - 0.004 - sokelThick / 2]}
            >
              <boxGeometry args={[W - colSize, stemH, sokelThick]} />
              <primitive object={stemMat} attach="material" />
            </mesh>
          </group>
        )}

        {/* Horizontal Sandwich Panel Joint Lines (Drážky/škáry panelov v poliach - neprechádzajú cez stĺpy) */}
        {isHorizontal && (
          <group name="horizontal-panel-joints">
            {Array.from({ length: Math.max(1, Math.floor((H - stemH) / panelW)) }).map((_, i) => {
              const y = stemH + (i + 1) * panelW;
              if (y >= H - 0.05) return null;
              return (
                <group key={`p-joint-${i}`}>
                  {sideBays.map(({ b, baySpan, bayMidZ }) => (
                    <group key={`p-joint-bay-${b}-${i}`}>
                      <mesh position={[leftSeamX, y, bayMidZ]}>
                        <boxGeometry args={[0.008, 0.016, baySpan]} />
                        <primitive object={seamMat} attach="material" />
                      </mesh>
                      <mesh position={[rightSeamX, y, bayMidZ]}>
                        <boxGeometry args={[0.008, 0.016, baySpan]} />
                        <primitive object={seamMat} attach="material" />
                      </mesh>
                    </group>
                  ))}
                  {/* Front seams: split around gate for heights below frontGateH */}
                  {hasFrontGate && frontGateW > 0 && y < frontGateH ? (
                    <>
                      <mesh
                        position={[(-halfW + colHalf - frontGateW / 2) / 2, y, -halfL - colHalf + inset - 0.003]}
                      >
                        <boxGeometry args={[(halfW - colHalf) - frontGateW / 2, 0.016, 0.008]} />
                        <primitive object={seamMat} attach="material" />
                      </mesh>
                      <mesh
                        position={[(frontGateW / 2 + halfW - colHalf) / 2, y, -halfL - colHalf + inset - 0.003]}
                      >
                        <boxGeometry args={[(halfW - colHalf) - frontGateW / 2, 0.016, 0.008]} />
                        <primitive object={seamMat} attach="material" />
                      </mesh>
                    </>
                  ) : (
                    <mesh
                      position={[0, y, -halfL - colHalf + inset - 0.003]}
                    >
                      <boxGeometry args={[W - colSize, 0.016, 0.008]} />
                      <primitive object={seamMat} attach="material" />
                    </mesh>
                  )}
                  <mesh
                    position={[0, y, halfL + colHalf - inset + 0.003]}
                  >
                    <boxGeometry args={[W - colSize, 0.016, 0.008]} />
                    <primitive object={seamMat} attach="material" />
                  </mesh>
                </group>
              );
            })}
            {/* Gable triangle seams above H up to Hridge */}
            {Array.from({ length: Math.max(0, Math.floor((Hridge - H) / panelW)) }).map((_, gi) => {
              const gy = H + (gi + 1) * panelW;
              if (gy >= Hridge - 0.35) return null;
              const gSpan = (1 - (gy - H) / (Hridge - H)) * (W - colSize);
              return (
                <group key={`g-joint-${gi}`}>
                  <mesh position={[0, gy, -halfL - colHalf + inset - 0.003]}>
                    <boxGeometry args={[gSpan, 0.018, 0.006]} />
                    <primitive object={seamMat} attach="material" />
                  </mesh>
                  <mesh position={[0, gy, halfL + colHalf - inset + 0.003]}>
                    <boxGeometry args={[gSpan, 0.018, 0.006]} />
                    <primitive object={seamMat} attach="material" />
                  </mesh>
                </group>
              );
            })}
          </group>
        )}

        {/* Front & Back Gable Walls (recessed by 8mm from column faces, avoiding coplanar Z-fighting) */}
        <mesh position={[0, 0, -halfL - colHalf + inset]}>
          <extrudeGeometry args={[frontGableShape, gableExtrudeSettings]} />
          <primitive object={wallMat} attach="material" />
        </mesh>
        <mesh position={[0, 0, halfL + colHalf - inset - 0.10]}>
          <extrudeGeometry args={[gableShape, gableExtrudeSettings]} />
          <primitive object={wallMat} attach="material" />
        </mesh>

        {/* Left & Right Roof Slopes */}
        <mesh
          position={[-halfW / 2, (H + Hridge) / 2 + 0.08, 0]}
          rotation={[0, 0, pitchRad]}
          castShadow
        >
          <boxGeometry args={[slopeLen, 0.1, L + 0.4]} />
          <primitive object={roofMat} attach="material" />
        </mesh>
        <mesh
          position={[halfW / 2, (H + Hridge) / 2 + 0.08, 0]}
          rotation={[0, 0, -pitchRad]}
          castShadow
        >
          <boxGeometry args={[slopeLen, 0.1, L + 0.4]} />
          <primitive object={roofMat} attach="material" />
        </mesh>

        {/* Corner & Ridge Flashings (Klampiarske lemovanie) */}
        {[-1, 1].map(side => (
          <group key={`roof-detail-${side}`}
            position={[side * halfW / 2, (H + Hridge) / 2 + .08, 0]}
            rotation={[-Math.PI / 2, side * pitchRad, 0]}>
            {!editedSurfaces.includes(side < 0 ? 'roof-left' : 'roof-right') && (
              <RoofSheetDetails width={slopeLen} height={L + .4} offset={-halfL - .2}
                color={roofColor} opacity={claddingOpacity} receiveShadow={false} />
            )}
            {lt.flashings && <>
              {[-1, 1].map(end => <mesh key={`verge-${end}`} position={[0, end * (halfL + .2), .065]}>
                <boxGeometry args={[slopeLen, .075, .08]} />
                <primitive object={trimMat} attach="material" />
              </mesh>)}
              <mesh position={[side * slopeLen / 2, 0, .025]}>
                <boxGeometry args={[.075, L + .4, .14]} />
                <primitive object={trimMat} attach="material" />
              </mesh>
{/* Apex cap handled cleanly by continuous unified ridge flashing */}
            </>}
          </group>
        ))}
        {lt.flashings && (
          <>
            {/* Corner trims: only used in cladding-only mode without structural frame to prevent clipping steel corner columns */}
            {!showStruct &&
              [
                [-halfW - 0.07, -halfL - 0.07],
                [halfW + 0.07, -halfL - 0.07],
                [-halfW - 0.07, halfL + 0.07],
                [halfW + 0.07, halfL + 0.07],
              ].map(([cx, cz], ci) => {
                // When an office wing is attached on front-right (vyrobna_hala / budova_pristavky),
                // omit the corner trim at this junction so the front facade connects seamlessly
                const hasRightWing = (isProdWithOffice || isBothLeans) && ci === 1;
                if (hasRightWing) {
                  return null;
                }
                return (
                  <mesh key={`corner-trim-${ci}`} position={[cx, H / 2, cz]}>
                    <boxGeometry args={[0.16, H, 0.16]} />
                    <primitive object={trimMat} attach="material" />
                  </mesh>
                );
              })}

            {/* Solid Unified Ridge Cap (Hrebenáč bez Z-fighting) */}
            <mesh position={[0, Hridge + 0.12, 0]}>
              <boxGeometry args={[0.42, 0.09, L + 0.44]} />
              <primitive object={trimMat} attach="material" />
            </mesh>
          </>
        )}
      </group>
    );
  };

  // Helper: Exact Industrial Sectional Gate from Steel Hall (Accessories.tsx)
  const renderSectionalGate = (
    cx: number,
    cz: number,
    rotY: number,
    gateWidth = 4.0,
    actualDoorHeight = 4.25,
    keyStr = "gate"
  ) => {
    if (
      replacedWindowIds.includes(keyStr) ||
      replacedWindowIds.includes(`template-gate-${keyStr}`) ||
      replacedWindowIds.includes(`template-window-${keyStr}`)
    ) {
      return null;
    }
    const panels = Math.max(4, Math.min(8, Math.round(actualDoorHeight / 0.52)));
    const panelH = actualDoorHeight / panels;
    const R = 0.25;
    const hCurveStart = actualDoorHeight - 0.02;
    // Sectional door details use local -Z as the exterior face.
    const sideWall = Math.abs(Math.sin(rotY)) > 0.5;
    const outward = sideWall ? Math.sign(cx) || 1 : Math.sign(cz) || -1;
    const gateRotation = sideWall ? -outward * Math.PI / 2 : outward < 0 ? 0 : Math.PI;
    const visionCount = Math.max(1, Math.floor(gateWidth / 0.95));
    const visionSpacing = (gateWidth - 0.3) / visionCount;

    return (
      <group key={keyStr} position={[cx + (sideWall ? outward * .08 : 0), 0, cz + (sideWall ? 0 : outward * .08)]} rotation={[0, gateRotation, 0]}>
        <GateJambDetails width={gateWidth} height={actualDoorHeight} wireframe={p.wireframe} />
        {/* 0. PORTÁLOVÝ KRYCÍ RÁM OTVORU (Jambs & Header Portal Frame) */}
        <group>
          {/* Ľavé ostenie */}
          <mesh position={[-gateWidth / 2 - 0.03, actualDoorHeight / 2 + 0.01, 0.005]} castShadow receiveShadow>
            <boxGeometry args={[0.07, actualDoorHeight + 0.04, 0.12]} />
            <meshStandardMaterial color="#3a3f42" metalness={0.7} roughness={0.35} wireframe={p.wireframe} />
          </mesh>
          {/* Pravé ostenie */}
          <mesh position={[gateWidth / 2 + 0.03, actualDoorHeight / 2 + 0.01, 0.005]} castShadow receiveShadow>
            <boxGeometry args={[0.07, actualDoorHeight + 0.04, 0.12]} />
            <meshStandardMaterial color="#3a3f42" metalness={0.7} roughness={0.35} wireframe={p.wireframe} />
          </mesh>
          {/* Horné nadpražie */}
          <mesh position={[0, actualDoorHeight + 0.04, 0.005]} castShadow receiveShadow>
            <boxGeometry args={[gateWidth + 0.13, 0.07, 0.12]} />
            <meshStandardMaterial color="#3a3f42" metalness={0.7} roughness={0.35} wireframe={p.wireframe} />
          </mesh>
        </group>

        {/* 1. SEKČNÁ BRÁNA */}
        <SectionalGuideDetails width={gateWidth} height={actualDoorHeight} radius={R} curveStart={hCurveStart} wireframe={p.wireframe} />
        {Array.from({ length: panels }).map((_, i) => {
          const panelY = 0.02 + i * panelH + panelH / 2;
          return (
            <group
              key={i}
              position={[0, panelY, 0]}
            >
              <mesh castShadow receiveShadow material={gateMaterial}>
                <boxGeometry args={[gateWidth, panelH - 0.004, 0.04]} />
              </mesh>
              <SectionalPanelDetails
                width={gateWidth}
                height={panelH}
                index={i}
                material={gateMaterial}
                wireframe={p.wireframe}
              />
              {/* Presklená sekcia (panoramatické okná) na 3. lamele */}
              {i === 2 && (
                <group position={[0, 0, -0.022]}>
                  {Array.from({ length: visionCount }, (_, wi) => (wi - (visionCount - 1) / 2) * visionSpacing).map((wx, wi) => (
                    <mesh key={`gate-vis-${wi}`} position={[wx, 0, -.012]}>
                      <boxGeometry args={[Math.min(.72, visionSpacing * .82), panelH * 0.52, 0.015]} />
                      <primitive object={glassMat} attach="material" />
                    </mesh>
                  ))}
                </group>
              )}
            </group>
          );
        })}
      </group>
    );
  };

  // Helper: Exact Personal Door from Steel Hall (Accessories.tsx)
  const renderPersonnelDoor = (
    x: number,
    z: number,
    rotY: number,
    doorWidth = 1.0,
    doorHeight = 2.1,
    keyStr = "door"
  ) => {
    if (
      replacedWindowIds.includes(keyStr) ||
      replacedWindowIds.includes(`template-door-${keyStr}`) ||
      replacedWindowIds.includes(`template-window-${keyStr}`)
    ) {
      return null;
    }
    const frameThickness = 0.075;
    const handleX = doorWidth / 2 - 0.08;
    const handleY = 1.0;
    const exterior = Math.abs(rotY) < 0.1 ? -1 : 1;
    const doorSurfaceOffset = 0.08;

    return (
      <group key={keyStr} position={[
        x + Math.sin(rotY) * exterior * doorSurfaceOffset,
        0,
        z + Math.cos(rotY) * exterior * doorSurfaceOffset,
      ]} rotation={[0, rotY, 0]}>
        <PersonalDoorFrameFinish
          width={doorWidth}
          height={doorHeight}
          depth={frameThickness}
          color={p.doorColor || "#3a3f47"}
          wood={!!p.doorDecor?.startsWith("wood_") || (!p.doorColor && !!p.gateDecor?.startsWith("wood_"))}
          wireframe={p.wireframe}
        />
        <PersonalDoorDetails
          width={doorWidth}
          height={doorHeight}
          frameDepth={frameThickness}
          exterior={exterior}
          wireframe={p.wireframe}
        />
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
        <mesh position={[0, doorHeight / 2, 0]} castShadow receiveShadow material={doorMaterial || undefined}>
          <boxGeometry args={[doorWidth, doorHeight, 0.04]} />
          {p.wireframe && (
            <meshStandardMaterial color={p.doorColor} side={THREE.DoubleSide} wireframe />
          )}
          <PersonalDoorLeafFinish
            width={doorWidth}
            height={doorHeight}
            color={p.doorColor || "#3a3f47"}
            wood={!!p.doorDecor?.startsWith("wood_") || (!p.doorColor && !!p.gateDecor?.startsWith("wood_"))}
            base={doorMaterial}
            wireframe={p.wireframe}
          />
        </mesh>

        {/* Presklenie v hornej časti dverí */}
        <mesh position={[0, doorHeight * 0.65, exterior * 0.022]} castShadow>
          <boxGeometry args={[doorWidth * 0.48, doorHeight * 0.28, 0.012]} />
          <primitive object={glassMat} attach="material" />
        </mesh>

        {/* Vylepšenie vzhľadu: obvodové lemovanie otvoru (ostenie) */}
        <group position={[0, 0, exterior * 0.03]}>
          <mesh position={[-doorWidth / 2 - 0.075, doorHeight / 2 + 0.05, 0]} castShadow>
            <boxGeometry args={[0.07, doorHeight + 0.1, 0.035]} />
            <primitive object={trimMat} attach="material" />
          </mesh>
          <mesh position={[doorWidth / 2 + 0.075, doorHeight / 2 + 0.05, 0]} castShadow>
            <boxGeometry args={[0.07, doorHeight + 0.1, 0.035]} />
            <primitive object={trimMat} attach="material" />
          </mesh>
          <mesh position={[0, doorHeight + 0.065, 0]} castShadow>
            <boxGeometry args={[doorWidth + 0.22, 0.07, 0.035]} />
            <primitive object={trimMat} attach="material" />
          </mesh>
        </group>

        {/* Strieška nad dverami */}
        <mesh position={[0, doorHeight + 0.16, exterior * 0.2]} castShadow>
          <boxGeometry args={[doorWidth + 0.5, 0.035, 0.38]} />
          <primitive object={trimMat} attach="material" />
        </mesh>

        {/* Prah */}
        <mesh position={[0, 0.012, exterior * 0.06]} receiveShadow>
          <boxGeometry args={[doorWidth + 0.16, 0.024, 0.24]} />
          <meshStandardMaterial color="#9ca3af" metalness={0.5} roughness={0.5} wireframe={p.wireframe} />
        </mesh>

        {/* Ochranný plech v spodnej časti krídla */}
        <mesh position={[0, 0.17, exterior * 0.0235]}>
          <boxGeometry args={[doorWidth * 0.92, 0.28, 0.006]} />
          <meshStandardMaterial color="#9aa0a8" metalness={0.85} roughness={0.3} wireframe={p.wireframe} />
        </mesh>

        {/* Zapustená výplň krídla (spodný panel) */}
        <mesh position={[0, doorHeight * 0.33, exterior * 0.0235]}>
          <boxGeometry args={[doorWidth * 0.72, doorHeight * 0.2, 0.006]} />
          <meshStandardMaterial color="#1f2328" metalness={0.5} roughness={0.45} wireframe={p.wireframe} />
        </mesh>

        {/* Realistic Door Handle & Escutcheon */}
        {/* Outer side handle */}
        <group position={[handleX, handleY, exterior * 0.021]}>
          <mesh castShadow>
            <boxGeometry args={[0.04, 0.16, 0.005]} />
            <meshStandardMaterial color="#1a1d21" metalness={0.9} roughness={0.2} wireframe={p.wireframe} />
          </mesh>
          <mesh position={[0, -0.04, 0.003 * exterior]}>
            <cylinderGeometry args={[0.006, 0.006, 0.005, 8]} />
            <meshStandardMaterial color="#d4af37" metalness={0.95} roughness={0.2} wireframe={p.wireframe} />
          </mesh>
          <mesh position={[0, 0.03, 0.015 * exterior]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.008, 0.008, 0.03, 12]} />
            <meshStandardMaterial color="#d4af37" metalness={0.95} roughness={0.15} wireframe={p.wireframe} />
          </mesh>
          <mesh position={[-0.04, 0.03, 0.03 * exterior]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.008, 0.008, 0.1, 12]} />
            <meshStandardMaterial color="#d4af37" metalness={0.95} roughness={0.15} wireframe={p.wireframe} />
          </mesh>
        </group>

        {/* Inner side handle */}
        <group position={[handleX, handleY, -exterior * 0.021]}>
          <mesh castShadow>
            <boxGeometry args={[0.04, 0.16, 0.005]} />
            <meshStandardMaterial color="#1a1d21" metalness={0.9} roughness={0.2} wireframe={p.wireframe} />
          </mesh>
          <mesh position={[0, 0.03, -0.015 * exterior]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.008, 0.008, 0.03, 12]} />
            <meshStandardMaterial color="#d4af37" metalness={0.95} roughness={0.15} wireframe={p.wireframe} />
          </mesh>
          <mesh position={[-0.04, 0.03, -0.03 * exterior]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.008, 0.008, 0.1, 12]} />
            <meshStandardMaterial color="#d4af37" metalness={0.95} roughness={0.15} wireframe={p.wireframe} />
          </mesh>
        </group>

        {/* Hinges (Pánty) */}
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
  };

  // Helper: Exact Window from Steel Hall (Accessories.tsx)
  const renderWindow = (
    x: number,
    y: number,
    z: number,
    rotY: number,
    windowWidth = 4.0,
    windowHeight = 1.0,
    keyStr = "win"
  ) => {
    const frameColor = p.windowColor || "#2b2f36";
    const frameThickness = 0.075;
    // Window finishes use local +Z as the exterior face, on every facade.
    const sideWall = Math.abs(Math.sin(rotY)) > 0.5;
    const outward = sideWall ? Math.sign(x) || 1 : Math.sign(z) || -1;
    const windowRotation = sideWall ? outward * Math.PI / 2 : outward < 0 ? Math.PI : 0;

    return (
      <group
        key={keyStr}
        position={[x + (sideWall ? outward * .08 : 0), y, z + (sideWall ? 0 : outward * .08)]}
        rotation={[0, windowRotation, 0]}
        visible={!replacedWindowIds.includes(`template-window-${keyStr}`) && !replacedWindowIds.includes(keyStr)}
        userData={{ hotspotWindow: { id: keyStr, width: windowWidth, height: windowHeight, frameColor } }}
      >
        <WindowDetails
          width={windowWidth}
          height={windowHeight}
          frameDepth={frameThickness}
          color={frameColor}
          wireframe={p.wireframe}
        />
        {/* Light blue-grey backing for the template's glazed window preview. */}
        <mesh position={[0, 0, -0.01]}>
          <boxGeometry args={[windowWidth - 0.04, windowHeight - 0.04, 0.05]} />
          <meshStandardMaterial color="#9bb7c7" roughness={0.45} metalness={0.15} />
        </mesh>

        {/* Truly transparent architectural glass */}
        <mesh position={[0, 0, 0.025]} receiveShadow>
          <boxGeometry args={[windowWidth - 0.04, windowHeight - 0.04, 0.012]} />
          <primitive object={glassMat} attach="material" />
        </mesh>

        {/* Vertical mullions (stĺpiky) dividing ribbon window into ~1.0m panes */}
        {Array.from({ length: Math.max(0, Math.round(windowWidth / 1.05) - 1) }).map((_, mi) => {
          const count = Math.max(1, Math.round(windowWidth / 1.05));
          const paneW = windowWidth / count;
          const mX = -windowWidth / 2 + (mi + 1) * paneW;
          return (
            <mesh key={`mullion-${mi}`} position={[mX, 0, 0.022]} castShadow>
              <boxGeometry args={[0.045, windowHeight - 0.02, 0.045]} />
              <meshStandardMaterial color={frameColor} metalness={0.4} roughness={0.5} wireframe={p.wireframe} />
            </mesh>
          );
        })}
        {/* frame wrapping the cladding edge */}
        <group>
          {/* Left frame post */}
          <mesh position={[-windowWidth / 2 - 0.015, 0, 0]} castShadow>
            <boxGeometry args={[0.03, windowHeight + 0.06, frameThickness]} />
            <meshStandardMaterial color={frameColor} metalness={0.4} roughness={0.6} wireframe={p.wireframe} />
          </mesh>
          {/* Right frame post */}
          <mesh position={[windowWidth / 2 + 0.015, 0, 0]} castShadow>
            <boxGeometry args={[0.03, windowHeight + 0.06, frameThickness]} />
            <meshStandardMaterial color={frameColor} metalness={0.4} roughness={0.6} wireframe={p.wireframe} />
          </mesh>
          {/* Top frame header */}
          <mesh position={[0, windowHeight / 2 + 0.015, 0]} castShadow>
            <boxGeometry args={[windowWidth + 0.06, 0.03, frameThickness]} />
            <meshStandardMaterial color={frameColor} metalness={0.4} roughness={0.6} wireframe={p.wireframe} />
          </mesh>
          {/* Bottom frame sill */}
          <mesh position={[0, -windowHeight / 2 - 0.015, 0]} castShadow>
            <boxGeometry args={[windowWidth + 0.06, 0.03, frameThickness]} />
            <meshStandardMaterial color={frameColor} metalness={0.4} roughness={0.6} wireframe={p.wireframe} />
          </mesh>
        </group>
      </group>
    );
  };

  // Helper: Structural Ridge Skylight (Sedlový hrebeňový svetlík)
  const renderRidgeSkylight = (xOffset = 0, yBase = Hridge) => {
    const skLen = L * 0.72;
    const skW = 2.2;
    return (
      <group position={[xOffset, yBase + 0.12, 0]}>
        {/* Steel Skylight Frames */}
        {showStruct &&
          frameZs.slice(1, -1).map((z, idx) => (
            <group key={`sk-frame-${idx}`}>
              <SteelTube from={[-skW / 2, 0, z]} to={[0, 0.55, z]} size={0.06} color={steelColor} />
              <SteelTube from={[0, 0.55, z]} to={[skW / 2, 0, z]} size={0.06} color={steelColor} />
            </group>
          ))}
        {/* Translucent Skylight Cladding */}
        {showClad && (
          <>
            <mesh position={[-skW / 4, 0.26, 0]} rotation={[0, 0, 0.42]}>
              <boxGeometry args={[skW / 1.8, 0.06, skLen]} />
              <primitive object={glassMat} attach="material" />
            </mesh>
            <mesh position={[skW / 4, 0.26, 0]} rotation={[0, 0, -0.42]}>
              <boxGeometry args={[skW / 1.8, 0.06, skLen]} />
              <primitive object={glassMat} attach="material" />
            </mesh>
          </>
        )}
      </group>
    );
  };

  // Helper: Lean-to Aisle Structure & Cladding (pre Výrobnú halu, Bočné prestrešenie, Budovu s prístavkami)
  const renderLeanToAisle = (
    sideSign: -1 | 1,
    leanW: number,
    leanHInner: number,
    leanHOuter: number,
    startBayIdx: number,
    endBayIdx: number,
    isOpenCanopy: boolean,
    hasOfficeWindows: boolean
  ) => {
    if (managedObjects) return null;
    const zStart = frameZs[startBayIdx] ?? -halfL;
    const zEnd = frameZs[endBayIdx] ?? halfL;
    const len = zEnd - zStart;
    const zMid = (zStart + zEnd) / 2;
    const innerX = sideSign * halfW;
    const outerX = sideSign * (halfW + leanW);
    const slopeAngle = Math.atan2(leanHInner - leanHOuter, leanW);
    const slopeLen = Math.hypot(leanW, leanHInner - leanHOuter) + 0.25;

    const leanGableShape = new THREE.Shape();
    if (sideSign === 1) {
      leanGableShape.moveTo(innerX, 0);
      leanGableShape.lineTo(outerX, 0);
      leanGableShape.lineTo(outerX, leanHOuter + 0.05);
      leanGableShape.lineTo(innerX, leanHInner + 0.05);
    } else {
      leanGableShape.moveTo(outerX, 0);
      leanGableShape.lineTo(innerX, 0);
      leanGableShape.lineTo(innerX, leanHInner + 0.05);
      leanGableShape.lineTo(outerX, leanHOuter + 0.05);
    }
    leanGableShape.closePath();

    return (
      <group name={`lean-to-${sideSign}`}>
        {/* Lean-to Steel Frames */}
        {showStruct && (
          <group>
            {frameZs.slice(startBayIdx, endBayIdx + 1).map((z, idx) => (
              <group key={`lean-frame-${sideSign}-${idx}`}>
                <SteelTube from={[outerX, 0, z]} to={[outerX, leanHOuter, z]} size={0.16} color={steelColor} />
                <SteelPlate position={[outerX, 0.015, z]} size={[0.3, 0.03, 0.3]} color={steelColor} />
                <SteelTube from={[innerX, leanHInner, z]} to={[outerX, leanHOuter, z]} size={0.16} color={steelColor} />
              </group>
            ))}
            {/* Lean-to Purlins */}
            {[0.25, 0.5, 0.75, 1.0].map((t, pi) => {
              const px = innerX + sideSign * t * leanW;
              const py = leanHInner - t * (leanHInner - leanHOuter) + 0.06;
              return (
                <SteelTube key={`lean-purlin-${pi}`} from={[px, py, zStart]} to={[px, py, zEnd]} size={0.06} color={steelColor} />
              );
            })}
          </group>
        )}

        {/* Lean-to Roof & Cladding */}
        {showClad && (
          <group>
            {/* Roof */}
            <mesh
              position={[(innerX + outerX) / 2, (leanHInner + leanHOuter) / 2 + 0.08, zMid]}
              rotation={[0, 0, -sideSign * slopeAngle]}
            >
              <boxGeometry args={[slopeLen, 0.09, len + 0.3]} />
              <primitive object={roofMat} attach="material" />
            </mesh>

            {/* Closed walls if not an open canopy */}
            {!isOpenCanopy && (
              <>
                {/* Lean-to Outer Stem Wall (Sokel prístavku) */}
                {stemH > 0 && (
                  <mesh position={[outerX + sideSign * 0.07, stemH / 2, zMid]}>
                    <boxGeometry args={[0.14, stemH, len]} />
                    <primitive object={stemMat} attach="material" />
                  </mesh>
                )}
                <mesh position={[outerX + sideSign * 0.07, stemH + (leanHOuter - stemH) / 2, zMid]}>
                  <boxGeometry args={[0.1, leanHOuter - stemH, len]} />
                  <primitive object={wallMat} attach="material" />
                </mesh>
                {/* Front and back gable walls flush with main envelope */}
                <mesh position={[0, 0, zStart - 0.12]}>
                  <extrudeGeometry args={[leanGableShape, gableExtrudeSettings]} />
                  <primitive object={wallMat} attach="material" />
                </mesh>
                <mesh position={[0, 0, zEnd + 0.02]}>
                  <extrudeGeometry args={[leanGableShape, gableExtrudeSettings]} />
                  <primitive object={wallMat} attach="material" />
                </mesh>
                {/* Horizontal panel seams on lean-to outer wall */}
                {isHorizontal && (
                  <group name={`lean-horizontal-joints-${sideSign}`}>
                    {Array.from({ length: Math.max(1, Math.floor(leanHOuter / panelW)) }).map((_, i) => {
                      const y = (i + 1) * panelW;
                      if (y >= leanHOuter - 0.05) return null;
                      return (
                        <mesh key={`lean-p-joint-${i}`} position={[outerX + sideSign * 0.105, y, zMid]}>
                          <boxGeometry args={[0.015, 0.018, len + 0.02]} />
                          <primitive object={seamMat} attach="material" />
                        </mesh>
                      );
                    })}
                  </group>
                )}
              </>
            )}

            {/* Architectural Flashings for Lean-to Annex */}
            {lt.flashings && (
              <>
                {/* Apron Flashing at intersection with main hall wall (Stenové lemovanie) */}
                <mesh position={[innerX + sideSign * 0.04, leanHInner + 0.04, zMid]}>
                  <boxGeometry args={[0.12, 0.10, len + 0.35]} />
                  <primitive object={trimMat} attach="material" />
                </mesh>
                {/* Eaves Flashing along outer roof edge */}
                <mesh position={[outerX + sideSign * 0.04, leanHOuter + 0.02, zMid]}>
                  <boxGeometry args={[0.08, 0.10, len + 0.35]} />
                  <primitive object={trimMat} attach="material" />
                </mesh>
                {/* Outer corner trims */}
                {!isOpenCanopy && (
                  <>
                    <mesh position={[outerX + sideSign * 0.06, leanHOuter / 2, zStart - 0.06]}>
                      <boxGeometry args={[0.14, leanHOuter, 0.14]} />
                      <primitive object={trimMat} attach="material" />
                    </mesh>
                    <mesh position={[outerX + sideSign * 0.06, leanHOuter / 2, zEnd + 0.06]}>
                      <boxGeometry args={[0.14, leanHOuter, 0.14]} />
                      <primitive object={trimMat} attach="material" />
                    </mesh>
                  </>
                )}
              </>
            )}

            {/* Office 2-level ribbon windows if vyrobna_hala */}
            {hasOfficeWindows && !isOpenCanopy && (
              <>
                {renderWindow(outerX + sideSign * 0.06, 1.4, zMid, sideSign > 0 ? Math.PI / 2 : -Math.PI / 2, len * 0.82, 1.0, "off-win-1")}
                {renderWindow(outerX + sideSign * 0.06, 3.0, zMid, sideSign > 0 ? Math.PI / 2 : -Math.PI / 2, len * 0.82, 1.0, "off-win-2")}
                {renderWindow((innerX + outerX) / 2, 1.4, zStart - 0.06, Math.PI, leanW * 0.75, 1.0, "off-win-f1")}
                {renderWindow((innerX + outerX) / 2, 3.0, zStart - 0.06, Math.PI, leanW * 0.75, 1.0, "off-win-f2")}
              </>
            )}
          </group>
        )}
      </group>
    );
  };

  // Structural features using hoisted archetype definitions

  return (
    <group name={`standalone-hall-${templateId}`} onClick={event => { event.stopPropagation(); onSelectObject?.("main-hall"); }}>
      <BuildingObjects3D objects={managedObjects} params={p} selectedObjectId={selectedObjectId} onSelectObject={onSelectObject} catalog={materialCatalog} layers={lt} opacity={claddingOpacity} renderWindow={renderWindow} />
      {selectedObjectId === "main-hall" && <group position={[-halfW, 0, -halfL]}><ObjectOutline width={W} length={L} innerHeight={Hridge} outerHeight={Hridge} name={managedObjects.find(object => object.id === "main-hall")?.name ?? "Hlavná hala"} /></group>}
      {/* 1. Primary Steel Structure */}
      {showStruct && renderMainPortalFrames(isDoubleSpan, isOfficeWithStorage ? 2 : 0)}

      {/* 2. Primary Cladding Envelope */}
      {showClad && renderMainEnvelope()}

      {/* 3. Skylights */}
      {hasSkylight && !isDoubleSpan && renderRidgeSkylight(0, Hridge)}
      {isDoubleSpan && (
        <>
          {renderRidgeSkylight(-halfW / 2, H + (halfW / 2) * Math.tan(pitchRad))}
          {renderRidgeSkylight(halfW / 2, H + (halfW / 2) * Math.tan(pitchRad))}
        </>
      )}

      {/* 4. Specific Standalone Hall Constructions & Openings */}
      {/* 4A. VÝROBNÁ HALA s kancelárskou časťou */}
      {isProdWithOffice && (
        <>
          {renderLeanToAisle(1, 5.5, 4.4, 3.6, 0, Math.min(3, bayCount), false, true)}
          {showClad && (
            <>
              {renderSectionalGate(-halfW - 0.06, frameZs[1] + bayLen / 2, Math.PI / 2, 4.0, 4.2, "prod-gate-1")}
              {renderSectionalGate(-halfW - 0.06, frameZs[3] ? frameZs[2] + bayLen / 2 : 0, Math.PI / 2, 4.0, 4.2, "prod-gate-2")}
            </>
          )}
        </>
      )}

      {/* 4B. KANCELÁRSKA BUDOVA so skladom (OfficeBuildingWithStorage — id: 1019956) */}
      {isOfficeWithStorage && showOpenings && (
        <>
          {/* Front gable wall (z = -halfL): 3 spans [-halfW..-halfW/3], [-halfW/3..halfW/3], [halfW/3..halfW] */}
          {/* Left span: 1st & 2nd floor windows (stacked) */}
          {renderWindow(-halfW * (2 / 3), 5.4, -halfL - 0.06, Math.PI, halfW * 0.58, 1.0, "kanc-f-l2")}
          {renderWindow(-halfW * (2 / 3), 2.2, -halfL - 0.06, Math.PI, halfW * 0.58, 1.0, "kanc-f-l1")}
          {/* Middle span: Modern entrance door (1.1x2.1m) centered at x = 0 (bez kolízie s oknami) */}
          {renderPersonnelDoor(0, -halfL - 0.06, 0, 1.1, 2.1, "kanc-f-door")}
          {/* Right span: 1st & 2nd floor windows (stacked) */}
          {renderWindow(halfW * (2 / 3), 5.4, -halfL - 0.06, Math.PI, halfW * 0.58, 1.0, "kanc-f-r2")}
          {renderWindow(halfW * (2 / 3), 2.2, -halfL - 0.06, Math.PI, halfW * 0.58, 1.0, "kanc-f-r1")}

          {/* Side walls: Bays 0 & 1 (Office 2-storey ribbon windows 5.25x1.0m on BOTH left and right walls!) */}
          {frameZs.slice(0, -1).map((z, idx) => {
            const zCenter = z + bayLen / 2;
            const winW = bayLen * 0.875; // 5.25m on a 6m bay
            if (idx < 2) {
              return (
                <group key={`kanc-bay-${idx}`}>
                  {/* Right side wall (+halfW): 1st & 2nd floor windows */}
                  {renderWindow(halfW + 0.06, 2.4, zCenter, Math.PI / 2, winW, 1.0, `kw-r1-${idx}`)}
                  {renderWindow(halfW + 0.06, 5.4, zCenter, Math.PI / 2, winW, 1.0, `kw-r2-${idx}`)}
                  {/* Left side wall (-halfW): 1st & 2nd floor windows */}
                  {renderWindow(-halfW - 0.06, 2.4, zCenter, -Math.PI / 2, winW, 1.0, `kw-l1-${idx}`)}
                  {renderWindow(-halfW - 0.06, 5.4, zCenter, -Math.PI / 2, winW, 1.0, `kw-l2-${idx}`)}
                </group>
              );
            }
            return (
              <group key={`kanc-storage-${idx}`}>
                {/* Left side wall (-halfW) in storage section: personnel door in Bay 3, sectional gate 4.0x4.0m in Bay 4 */}
                {idx === 3 && renderPersonnelDoor(-halfW - 0.06, zCenter, -Math.PI / 2, 1.0, 2.1, `kanc-side-door-${idx}`)}
                {idx === 4 && renderSectionalGate(-halfW - 0.06, zCenter, Math.PI / 2, 4.0, 4.0, "ks-gate")}
              </group>
            );
          })}
        </>
      )}

      {/* 4C. BUDOVA s bočným prestrešením */}
      {isSideCanopy && (
        <>
          {renderLeanToAisle(-1, p.canopyWidth || 4.5, H, H - 0.9, 0, bayCount, true, false)}
          {showClad && (
            <>
              {renderSectionalGate(-halfW - 0.06, frameZs[1] - bayLen / 2, Math.PI / 2, 3.8, 4.0, "can-g1")}
              {renderSectionalGate(-halfW - 0.06, frameZs[2] - bayLen / 2, Math.PI / 2, 3.8, 4.0, "can-g2")}
              {frameZs.slice(2, -1).map((z, idx) =>
                renderWindow(-halfW - 0.06, 2.4, z + bayLen / 2, -Math.PI / 2, bayLen * 0.65, 1.2, `can-w-${idx}`)
              )}
            </>
          )}
        </>
      )}

      {/* 4D. SKLADOVACIA HALA (StorageBuilding.fcc — id: 1019969) & SKLADOVACIA HALA SO SVETLÍKOM */}
      {templateId === "skladovacia_hala" && showOpenings && (
        <>
          {/* Front Gable Wall: Center sectional gate 4.0x4.25m + personal entrance door 1.1x2.1m */}
          {renderSectionalGate(0, -halfL - 0.06, 0, 4.0, 4.25, "sklad-front-gate")}
          {renderPersonnelDoor(-3.55, -halfL - 0.06, 0, 1.1, 2.1, "sklad-front-door")}

          {/* Left Side Wall (-halfW): 5 ribbon windows 4.0x1.0m, side personal door, side sectional gate 4.0x4.25m */}
          {frameZs.slice(0, -1).map((z, idx) => {
            const zc = z + bayLen / 2;
            const hasWin = idx % 2 === 0;
            return (
              <group key={`sklad-left-${idx}`}>
                {hasWin && renderWindow(-halfW - 0.06, 3.27, zc, -Math.PI / 2, Math.min(4.0, bayLen - 0.4), 1.0, `sklad-lw-${idx}`)}
                {/* Personnel door in Bay 4 */}
                {idx === 4 &&
                  renderPersonnelDoor(-halfW - 0.06, z + bayLen * 0.85, -Math.PI / 2, 1.1, 2.1, "sklad-side-door")}
                {/* Sectional gate 4.0x4.25m in Bay 5 */}
                {idx === 5 && renderSectionalGate(-halfW - 0.06, zc, Math.PI / 2, Math.min(4.0, bayLen - 0.4), 4.25, "sklad-side-gate")}
              </group>
            );
          })}

          {/* Right Side Wall (+halfW): 5 ribbon windows 4.0x1.0m in alternating bays */}
          {frameZs.slice(0, -1).map((z, idx) => {
            const zc = z + bayLen / 2;
            const hasWin = idx % 2 === 0;
            if (!hasWin) return null;
            return renderWindow(halfW + 0.06, 3.27, zc, Math.PI / 2, Math.min(4.0, bayLen - 0.4), 1.0, `sklad-rw-${idx}`);
          })}
        </>
      )}

      {templateId === "skladovacia_hala_svetlik" && showOpenings && (
        <>
          {renderSectionalGate(0, -halfL - 0.06, 0, 4.2, 4.2, "sklad-front-gate-sv")}
          {frameZs.slice(0, -1).map((z, idx) => {
            const zc = z + bayLen / 2;
            return (
              <group key={`sklad-bay-sv-${idx}`}>
                {idx === 2 && renderSectionalGate(-halfW - 0.06, zc, Math.PI / 2, 3.8, 4.0, `sklad-sg-${idx}`)}
                {idx !== 2 && renderWindow(-halfW - 0.06, H - 1.1, zc, -Math.PI / 2, bayLen * 0.72, 0.9, `sklad-w-${idx}`)}
              </group>
            );
          })}
        </>
      )}

      {/* 4E. JEDNOLOĎOVÁ HALA */}
      {templateId === "jednolodna_hala" && showClad && (
        <>
          {renderWindow(halfW * 0.45, 2.2, -halfL - 0.06, Math.PI, halfW * 0.75, 1.5, "jedn-fw")}
          {renderSectionalGate(-halfW * 0.45, -halfL - 0.06, 0, 4.2, 4.0, "jedn-fg")}
          {frameZs.slice(0, -1).map((z, idx) => {
            const zc = z + bayLen / 2;
            if (idx < 2) {
              return renderWindow(halfW + 0.06, 2.2, zc, Math.PI / 2, bayLen * 0.75, 1.5, `jedn-sw-${idx}`);
            }
            return renderSectionalGate(-halfW - 0.06, zc, Math.PI / 2, 3.8, 3.8, `jedn-sg-${idx}`);
          })}
        </>
      )}

      {/* 4F. DVOJLOĎOVÁ HALA */}
      {isDoubleSpan && showClad && (
        <>
          {/* Two front gates — one for each structural aisle */}
          {renderSectionalGate(-halfW / 2, -halfL - 0.06, 0, 4.4, 4.2, "double-gate-left")}
          {renderSectionalGate(halfW / 2, -halfL - 0.06, 0, 4.4, 4.2, "double-gate-right")}
          {frameZs.slice(0, -1).map((z, idx) =>
            renderWindow(halfW + 0.06, 2.5, z + bayLen / 2, Math.PI / 2, bayLen * 0.65, 1.2, `dbl-w-${idx}`)
          )}
        </>
      )}

      {/* 4G. BUDOVA S PRÍSTAVKAMI (BuildingWithLeansTo - 3-loďová stupňovitá hala) */}
      {isBothLeans && (
        <>
          {renderLeanToAisle(-1, 5.0, 4.2, 3.2, 0, bayCount, false, false)}
          {renderLeanToAisle(1, 5.0, 4.2, 3.2, 1, bayCount - 1, false, false)}
          {showClad && renderSectionalGate(0, -halfL - 0.06, 0, 4.2, 4.4, "leans-main-gate")}
        </>
      )}

      {/* 4H. NAKRESLIŤ PÔDORYS (L-tvar HBC3) */}
      {isLShape && (
        <group position={[halfW + 6, 0, -halfL + 6]} rotation={[0, Math.PI / 2, 0]}>
          {showStruct &&
            [-6, -2, 2, 6].map((wz, wi) => (
              <group key={`wing-frame-${wi}`}>
                <SteelTube from={[-6, 0, wz]} to={[-6, H, wz]} size={0.2} color={steelColor} />
                <SteelTube from={[6, 0, wz]} to={[6, H, wz]} size={0.2} color={steelColor} />
                <SteelTube from={[-6, H, wz]} to={[0, H + 6 * Math.tan(pitchRad), wz]} size={0.18} color={steelColor} />
                <SteelTube from={[0, H + 6 * Math.tan(pitchRad), wz]} to={[6, H, wz]} size={0.18} color={steelColor} />
              </group>
            ))}
          {showClad && (
            <>
              <mesh position={[-6, H / 2, 0]}>
                <boxGeometry args={[0.1, H, 12]} />
                <primitive object={wallMat} attach="material" />
              </mesh>
              <mesh position={[6, H / 2, 0]}>
                <boxGeometry args={[0.1, H, 12]} />
                <primitive object={wallMat} attach="material" />
              </mesh>
              <mesh position={[0, H / 2, 6]}>
                <boxGeometry args={[12, H, 0.1]} />
                <primitive object={wallMat} attach="material" />
              </mesh>
              <mesh
                position={[-3, H + 1.5 * Math.tan(pitchRad), 0]}
                rotation={[0, 0, pitchRad]}
              >
                <boxGeometry args={[6.3, 0.1, 12.2]} />
                <primitive object={roofMat} attach="material" />
              </mesh>
              <mesh
                position={[3, H + 1.5 * Math.tan(pitchRad), 0]}
                rotation={[0, 0, -pitchRad]}
              >
                <boxGeometry args={[6.3, 0.1, 12.2]} />
                <primitive object={roofMat} attach="material" />
              </mesh>
            </>
          )}
        </group>
      )}

      {/* Custom user-added openings on standard/blank hall */}
      {templateId === "prazdna_hala" && showClad && (
        <>
          {renderSectionalGate(0, -halfL - 0.06, 0, p.doorWidth || 4.2, p.doorHeight || 4.0, "blank-front-gate")}
          {p.hasPersonalDoor &&
            renderPersonnelDoor(
              p.personalDoorSide === "right" ? halfW + 0.06 : -halfW - 0.06,
              frameZs[Math.min(p.personalDoorBay ?? 0, bayCount - 1)] + bayLen / 2,
              p.personalDoorSide === "right" ? Math.PI / 2 : -Math.PI / 2,
              1.0,
              2.1,
              "blank-door"
            )}
          {(p.windowBays || []).map((bIdx) => {
            if (bIdx >= bayCount) return null;
            const zc = frameZs[bIdx] + bayLen / 2;
            return renderWindow(-halfW - 0.06, 2.5, zc, -Math.PI / 2, bayLen * 0.65, 1.2, `custom-win-${bIdx}`);
          })}
        </>
      )}
    </group>
  );
}
