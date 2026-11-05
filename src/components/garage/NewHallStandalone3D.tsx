import React, { useMemo } from "react";
import * as THREE from "three";
import { SteelTube, SteelPlate } from "./SteelTube";
import { type GarageParams } from "@/lib/garage/types";

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
}

/**
 * Renders a complete, standalone industrial steel hall where each of the 10 PEM/HiStruct
 * archetypes has its own dedicated structural frame system and architectural envelope.
 */
export function NewHallStandalone3D({
  p,
  templateId,
  claddingOpacity = 1.0,
  layerToggles,
  editedSurfaces = [],
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
        roughness: 0.55,
        metalness: 0.2,
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

  const gateMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: gateColor,
        roughness: 0.5,
        metalness: 0.3,
      }),
    [gateColor]
  );

  const glassMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#bae6fd",
        transparent: true,
        opacity: 0.65,
        roughness: 0.1,
        metalness: 0.1,
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

  const gableShape = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-halfW, stemH);
    s.lineTo(halfW, stemH);
    s.lineTo(halfW, H);
    s.lineTo(0, Hridge);
    s.lineTo(-halfW, H);
    s.closePath();
    return s;
  }, [halfW, H, Hridge, stemH]);

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
                <SteelPlate center={[-halfW, 0.015, z]} size={[colSize * 2, 0.03, colSize * 2]} color="#d7d7d7" />

                <SteelTube from={[halfW, 0, z]} to={[halfW, H, z]} size={colSize} color={steelColor} />
                <SteelPlate center={[halfW, 0.015, z]} size={[colSize * 2, 0.03, colSize * 2]} color="#d7d7d7" />

                {/* Eave Haunches (Nábehy pri odkvape) */}
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

                {/* Left & Right Rafters */}
                <SteelTube from={[-halfW, H, z]} to={[0, Hridge, z]} size={rafterSize} color={steelColor} />
                <SteelTube from={[0, Hridge, z]} to={[halfW, H, z]} size={rafterSize} color={steelColor} />

                {/* Center Column (pre dvojloďovú halu) */}
                {hasCenterCol && (
                  <>
                    <SteelTube from={[0, 0, z]} to={[0, Hridge, z]} size={colSize * 0.95} color={steelColor} />
                    <SteelPlate center={[0, 0.015, z]} size={[colSize * 1.8, 0.03, colSize * 1.8]} color="#d7d7d7" />
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
                      return (
                        <SteelTube
                          key={`gable-col-${gi}`}
                          from={[gx, 0, z]}
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

        {/* Base Concrete Slab + Stem Wall (Základná plocha + sokel) */}
        {p.showFoundation !== false && lt.basePlate && (
          <group name="base-plate-and-stem-wall">
            <mesh position={[0, -0.08, 0]} receiveShadow>
              <boxGeometry args={[W + 0.6, 0.16, L + 0.6]} />
              <primitive object={concreteMat} attach="material" />
            </mesh>
            {/* Concrete Stem Wall Perimeter (Betónový sokel 0.30 m) */}
            <mesh position={[-halfW - 0.04, 0.15, 0]}>
              <boxGeometry args={[0.14, 0.3, L + 0.1]} />
              <primitive object={concreteMat} attach="material" />
            </mesh>
            <mesh position={[halfW + 0.04, 0.15, 0]}>
              <boxGeometry args={[0.14, 0.3, L + 0.1]} />
              <primitive object={concreteMat} attach="material" />
            </mesh>
          </group>
        )}
      </group>
    );
  };

  // Helper: Main Duopitch Cladding Envelope
  const renderMainEnvelope = () => {
    const slopeLen = Math.hypot(halfW, Hridge - H) + 0.25;
    const wallH = H - stemH;
    const wallMidY = stemH + wallH / 2;

    return (
      <group name="main-envelope">
        {/* Left & Right Side Walls (from stemH up to H) */}
        <mesh visible={!editedSurfaces.includes('left')} position={[-halfW - 0.06, wallMidY, 0]}>
          <boxGeometry args={[0.1, wallH, L]} />
          <primitive object={wallMat} attach="material" />
        </mesh>
        <mesh visible={!editedSurfaces.includes('right')} position={[halfW + 0.06, wallMidY, 0]}>
          <boxGeometry args={[0.1, wallH, L]} />
          <primitive object={wallMat} attach="material" />
        </mesh>

        {/* Concrete Stem Walls (Sokel) */}
        {stemH > 0 && (
          <group name="concrete-stem-walls">
            <mesh visible={!editedSurfaces.includes('left')} position={[-halfW - 0.06, stemH / 2, 0]}>
              <boxGeometry args={[stemThick + 0.04, stemH, L + 0.12]} />
              <primitive object={stemMat} attach="material" />
            </mesh>
            <mesh visible={!editedSurfaces.includes('right')} position={[halfW + 0.06, stemH / 2, 0]}>
              <boxGeometry args={[stemThick + 0.04, stemH, L + 0.12]} />
              <primitive object={stemMat} attach="material" />
            </mesh>
            <mesh visible={!editedSurfaces.includes('front')} position={[0, stemH / 2, -halfL - 0.05]}>
              <boxGeometry args={[W, stemH, stemThick + 0.04]} />
              <primitive object={stemMat} attach="material" />
            </mesh>
            <mesh visible={!editedSurfaces.includes('back')} position={[0, stemH / 2, halfL + 0.05]}>
              <boxGeometry args={[W, stemH, stemThick + 0.04]} />
              <primitive object={stemMat} attach="material" />
            </mesh>
          </group>
        )}

        {/* Horizontal Sandwich Panel Joint Lines (Drážky/škáry panelov každých panelW metrov) */}
        {isHorizontal && (
          <group name="horizontal-panel-joints">
            {Array.from({ length: Math.max(1, Math.floor((H - stemH) / panelW)) }).map((_, i) => {
              const y = stemH + (i + 1) * panelW;
              if (y >= H - 0.05) return null;
              return (
                <group key={`p-joint-${i}`}>
                  <mesh visible={!editedSurfaces.includes('left')} position={[-halfW - 0.115, y, 0]}>
                    <boxGeometry args={[0.015, 0.018, L + 0.02]} />
                    <primitive object={seamMat} attach="material" />
                  </mesh>
                  <mesh visible={!editedSurfaces.includes('right')} position={[halfW + 0.115, y, 0]}>
                    <boxGeometry args={[0.015, 0.018, L + 0.02]} />
                    <primitive object={seamMat} attach="material" />
                  </mesh>
                  <mesh visible={!editedSurfaces.includes('front')} position={[0, y, -halfL - 0.105]}>
                    <boxGeometry args={[W + 0.02, 0.018, 0.015]} />
                    <primitive object={seamMat} attach="material" />
                  </mesh>
                  <mesh visible={!editedSurfaces.includes('back')} position={[0, y, halfL + 0.105]}>
                    <boxGeometry args={[W + 0.02, 0.018, 0.015]} />
                    <primitive object={seamMat} attach="material" />
                  </mesh>
                </group>
              );
            })}
            {/* Gable triangle seams above H up to Hridge */}
            {Array.from({ length: Math.max(0, Math.floor((Hridge - H) / panelW)) }).map((_, gi) => {
              const gy = H + (gi + 1) * panelW;
              if (gy >= Hridge - 0.05) return null;
              const gSpan = (1 - (gy - H) / (Hridge - H)) * W;
              return (
                <group key={`g-joint-${gi}`}>
                  <mesh position={[0, gy, -halfL - 0.105]}>
                    <boxGeometry args={[gSpan, 0.018, 0.015]} />
                    <primitive object={seamMat} attach="material" />
                  </mesh>
                  <mesh position={[0, gy, halfL + 0.105]}>
                    <boxGeometry args={[gSpan, 0.018, 0.015]} />
                    <primitive object={seamMat} attach="material" />
                  </mesh>
                </group>
              );
            })}
          </group>
        )}

        {/* Front & Back Gable Walls (Exact polygon with pitched top) */}
        <mesh visible={!editedSurfaces.includes('front')} position={[0, 0, -halfL - 0.05]}>
          <shapeGeometry args={[gableShape]} />
          <primitive object={wallMat} attach="material" />
        </mesh>
        <mesh visible={!editedSurfaces.includes('back')} position={[0, 0, halfL + 0.05]}>
          <shapeGeometry args={[gableShape]} />
          <primitive object={wallMat} attach="material" />
        </mesh>

        {/* Left & Right Roof Slopes */}
        <mesh
          position={[-halfW / 2, (H + Hridge) / 2 + 0.08, 0]}
          visible={!editedSurfaces.includes('roof-left')}
          rotation={[0, 0, pitchRad]}
        >
          <boxGeometry args={[slopeLen, 0.1, L + 0.4]} />
          <primitive object={roofMat} attach="material" />
        </mesh>
        <mesh
          position={[halfW / 2, (H + Hridge) / 2 + 0.08, 0]}
          visible={!editedSurfaces.includes('roof-right')}
          rotation={[0, 0, -pitchRad]}
        >
          <boxGeometry args={[slopeLen, 0.1, L + 0.4]} />
          <primitive object={roofMat} attach="material" />
        </mesh>

        {/* Corner & Ridge Flashings (Klampiarske lemovanie) */}
        {lt.flashings && (
          <>
            {[
              [-halfW - 0.08, -halfL - 0.08],
              [halfW + 0.08, -halfL - 0.08],
              [-halfW - 0.08, halfL + 0.08],
              [halfW + 0.08, halfL + 0.08],
            ].map(([cx, cz], ci) => (
              <mesh key={`corner-trim-${ci}`} position={[cx, H / 2, cz]}>
                <boxGeometry args={[0.16, H, 0.16]} />
                <primitive object={trimMat} attach="material" />
              </mesh>
            ))}

            {/* Ridge Cap */}
            <mesh position={[0, Hridge + 0.14, 0]}>
              <boxGeometry args={[0.35, 0.08, L + 0.44]} />
              <primitive object={trimMat} attach="material" />
            </mesh>
          </>
        )}
      </group>
    );
  };

  // Helper: Industrial Sectional Gate
  const renderSectionalGate = (x: number, z: number, rotY: number, gw = 4.0, gh = 4.2, keyStr = "gate") => (
    <group key={keyStr} position={[x, gh / 2, z]} rotation={[0, rotY, 0]}>
      {/* Gate panel */}
      <mesh>
        <boxGeometry args={[gw, gh, 0.16]} />
        <primitive object={gateMat} attach="material" />
      </mesh>
      {/* Vision strip (presklená lamela) */}
      <mesh position={[0, gh * 0.15, 0]}>
        <boxGeometry args={[gw * 0.88, 0.45, 0.18]} />
        <primitive object={glassMat} attach="material" />
      </mesh>
      {/* Frame border */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[gw + 0.18, gh + 0.1, 0.14]} />
        <primitive object={trimMat} attach="material" />
      </mesh>
    </group>
  );

  // Helper: Ribbon Window (Pásové okno)
  const renderWindow = (x: number, y: number, z: number, rotY: number, ww = 3.6, wh = 1.2, keyStr = "win") => (
    <group key={keyStr} position={[x, y, z]} rotation={[0, rotY, 0]} userData={{ hotspotWindow: { width: ww, height: wh } }}>
      <mesh>
        <boxGeometry args={[ww, wh, 0.16]} />
        <primitive object={glassMat} attach="material" />
      </mesh>
      <mesh>
        <boxGeometry args={[ww + 0.12, wh + 0.12, 0.14]} />
        <primitive object={trimMat} attach="material" />
      </mesh>
    </group>
  );

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
      leanGableShape.lineTo(outerX, leanHOuter);
      leanGableShape.lineTo(innerX, leanHInner);
    } else {
      leanGableShape.moveTo(outerX, 0);
      leanGableShape.lineTo(innerX, 0);
      leanGableShape.lineTo(innerX, leanHInner);
      leanGableShape.lineTo(outerX, leanHOuter);
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
                <SteelPlate center={[outerX, 0.015, z]} size={[0.3, 0.03, 0.3]} color={steelColor} />
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
                <mesh position={[outerX + sideSign * 0.05, leanHOuter / 2, zMid]}>
                  <boxGeometry args={[0.1, leanHOuter, len]} />
                  <primitive object={wallMat} attach="material" />
                </mesh>
                <mesh position={[0, 0, zStart - 0.04]}>
                  <shapeGeometry args={[leanGableShape]} />
                  <primitive object={wallMat} attach="material" />
                </mesh>
                <mesh position={[0, 0, zEnd + 0.04]}>
                  <shapeGeometry args={[leanGableShape]} />
                  <primitive object={wallMat} attach="material" />
                </mesh>
              </>
            )}

            {/* Office 2-level ribbon windows if vyrobna_hala */}
            {hasOfficeWindows && !isOpenCanopy && (
              <>
                {renderWindow(outerX + sideSign * 0.06, 1.4, zMid, Math.PI / 2, len * 0.82, 1.0, "off-win-1")}
                {renderWindow(outerX + sideSign * 0.06, 3.0, zMid, Math.PI / 2, len * 0.82, 1.0, "off-win-2")}
                {renderWindow((innerX + outerX) / 2, 1.4, zStart - 0.06, 0, leanW * 0.75, 1.0, "off-win-f1")}
                {renderWindow((innerX + outerX) / 2, 3.0, zStart - 0.06, 0, leanW * 0.75, 1.0, "off-win-f2")}
              </>
            )}
          </group>
        )}
      </group>
    );
  };

  // Determine structural features based on standalone hall templateId
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

  return (
    <group name={`standalone-hall-${templateId}`}>
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
      {/* 4A. VÝROBNÁ HALA s kancelárskou časťou (PEM_MetalTrade) */}
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
          {/* Left span: 2nd floor window (y=5.4m) */}
          {renderWindow(-halfW * (2 / 3), 5.4, -halfL - 0.06, 0, halfW * 0.58, 1.0, "kanc-f-l2")}
          {/* Middle span: Entrance door (0.9x2.1m) + 1st floor window (y=2.4m) */}
          <mesh position={[-halfW / 3 + 1.0, 1.05, -halfL - 0.07]}>
            <boxGeometry args={[1.0, 2.1, 0.16]} />
            <primitive object={trimMat} attach="material" />
          </mesh>
          {renderWindow(0, 2.4, -halfL - 0.06, 0, halfW * 0.58, 1.0, "kanc-f-m1")}
          {/* Right span: 2nd floor window (y=5.4m) */}
          {renderWindow(halfW * (2 / 3), 5.4, -halfL - 0.06, 0, halfW * 0.58, 1.0, "kanc-f-r2")}

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
                  {renderWindow(-halfW - 0.06, 2.4, zCenter, Math.PI / 2, winW, 1.0, `kw-l1-${idx}`)}
                  {renderWindow(-halfW - 0.06, 5.4, zCenter, Math.PI / 2, winW, 1.0, `kw-l2-${idx}`)}
                </group>
              );
            }
            return (
              <group key={`kanc-storage-${idx}`}>
                {/* Left side wall (-halfW) in storage section: personnel door in Bay 3, sectional gate 4.0x4.0m in Bay 4 */}
                {idx === 3 && (
                  <mesh position={[-halfW - 0.07, 1.05, zCenter]}>
                    <boxGeometry args={[0.16, 2.1, 1.0]} />
                    <primitive object={trimMat} attach="material" />
                  </mesh>
                )}
                {idx === 4 && renderSectionalGate(-halfW - 0.06, zCenter, Math.PI / 2, 4.0, 4.0, "ks-gate")}
              </group>
            );
          })}
        </>
      )}

      {/* 4C. BUDOVA s bočným prestrešením (PEM_Kotrbaty) */}
      {isSideCanopy && (
        <>
          {renderLeanToAisle(-1, p.canopyWidth || 4.5, H, H - 0.9, 0, bayCount, true, false)}
          {showClad && (
            <>
              {renderSectionalGate(-halfW - 0.06, frameZs[1] - bayLen / 2, Math.PI / 2, 3.8, 4.0, "can-g1")}
              {renderSectionalGate(-halfW - 0.06, frameZs[2] - bayLen / 2, Math.PI / 2, 3.8, 4.0, "can-g2")}
              {frameZs.slice(2, -1).map((z, idx) =>
                renderWindow(-halfW - 0.06, 2.4, z + bayLen / 2, Math.PI / 2, bayLen * 0.65, 1.2, `can-w-${idx}`)
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
          <mesh position={[-3.55, 1.05, -halfL - 0.07]}>
            <boxGeometry args={[1.1, 2.1, 0.16]} />
            <primitive object={trimMat} attach="material" />
          </mesh>

          {/* Left Side Wall (-halfW): 5 ribbon windows 4.0x1.0m, side personal door, side sectional gate 4.0x4.25m */}
          {frameZs.slice(0, -1).map((z, idx) => {
            const zc = z + bayLen / 2;
            const hasWin = idx % 2 === 0;
            return (
              <group key={`sklad-left-${idx}`}>
                {hasWin && renderWindow(-halfW - 0.06, 3.27, zc, Math.PI / 2, 4.0, 1.0, `sklad-lw-${idx}`)}
                {/* Personnel door in Bay 4 */}
                {idx === 4 && (
                  <mesh position={[-halfW - 0.07, 1.05, z + bayLen * 0.85]}>
                    <boxGeometry args={[0.16, 2.1, 1.1]} />
                    <primitive object={trimMat} attach="material" />
                  </mesh>
                )}
                {/* Sectional gate 4.0x4.25m in Bay 5 */}
                {idx === 5 && renderSectionalGate(-halfW - 0.06, z + bayLen * 0.85, Math.PI / 2, 4.0, 4.25, "sklad-side-gate")}
              </group>
            );
          })}

          {/* Right Side Wall (+halfW): 5 ribbon windows 4.0x1.0m in alternating bays */}
          {frameZs.slice(0, -1).map((z, idx) => {
            const zc = z + bayLen / 2;
            const hasWin = idx % 2 === 0;
            if (!hasWin) return null;
            return renderWindow(halfW + 0.06, 3.27, zc, Math.PI / 2, 4.0, 1.0, `sklad-rw-${idx}`);
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
                {idx !== 2 && renderWindow(-halfW - 0.06, H - 1.1, zc, Math.PI / 2, bayLen * 0.72, 0.9, `sklad-w-${idx}`)}
              </group>
            );
          })}
        </>
      )}

      {/* 4E. JEDNOLOĎOVÁ HALA (PEM_KOSTA) */}
      {templateId === "jednolodna_hala" && showClad && (
        <>
          {renderWindow(halfW * 0.45, 2.2, -halfL - 0.06, 0, halfW * 0.75, 1.5, "jedn-fw")}
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

      {/* 4F. DVOJLOĎOVÁ HALA (PEM_PalettenTrade) */}
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
          {p.hasPersonalDoor && (
            <mesh
              position={[
                p.personalDoorSide === "right" ? halfW + 0.07 : -halfW - 0.07,
                1.05,
                frameZs[Math.min(p.personalDoorBay ?? 0, bayCount - 1)] + bayLen / 2,
              ]}
            >
              <boxGeometry args={[0.12, 2.1, 1.0]} />
              <primitive object={gateMat} attach="material" />
            </mesh>
          )}
          {(p.windowBays || []).map((bIdx) => {
            if (bIdx >= bayCount) return null;
            const zc = frameZs[bIdx] + bayLen / 2;
            return renderWindow(-halfW - 0.06, 2.5, zc, Math.PI / 2, bayLen * 0.65, 1.2, `custom-win-${bIdx}`);
          })}
        </>
      )}
    </group>
  );
}
