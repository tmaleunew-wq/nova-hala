import "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import type { GarageParams } from "@/lib/garage/types";
import { SteelTube, SteelPlate } from "./SteelTube";
import { PurPanel } from "./PurPanel";
import { makeTrapezoidTexture } from "@/lib/garage/textures";
import { createPBRCladdingMaterial, createPBRSmoothMaterial, createPBRWoodMaterial } from "@/lib/garage/pbrMaterialHelper";

export function ModularExtension({ p }: { p: GarageParams }) {
  if (!p.hasExtension) return null;

  const extW = p.extensionWidth ?? 3.5;
  const extL = p.length;
  const H = p.clearHeight;
  const atticH = p.atticHeight ?? 0.35;
  const sideSign = p.extensionSide === "left" ? -1 : 1;
  const cx = sideSign * (p.width / 2 + extW / 2);
  const extType = p.extensionType ?? "garage";

  const sz = p.profileSize;
  const th = p.profileThickness;
  const col = p.steelColor;
  const wf = p.wireframe;
  const rimColor = p.trimmingColor || "#2b2f36";
  const wallTex = useMemo(() => makeTrapezoidTexture(p.claddingColor, 50), [p.claddingColor]);
  const roofTex = useMemo(() => makeTrapezoidTexture(p.roofColor, 50), [p.roofColor]);

  const frames = p.bayCount + 1;
  const zs: number[] = [];
  for (let i = 0; i < frames; i++) {
    const t = i / (frames - 1);
    zs.push(-extL / 2 + t * extL);
  }

  const wallThickness = (p.panelType === "sandwich" || p.panelType === "smooth" || p.panelType === "wood_oak" || p.panelType === "wood_walnut")
    ? Math.max(0.04, p.wallPanelThicknessMm / 1000)
    : 0.01;
  const isSand = p.panelType === "sandwich" || p.panelType === "smooth" || p.panelType === "wood_oak" || p.panelType === "wood_walnut";

  const outerX = cx + sideSign * (extW / 2);
  const innerX = cx - sideSign * (extW / 2);

  return (
    <group name="modular-extension">
      {/* 1. ZÁKLADOVÁ DOSKA PRÍSTAVBY */}
      {p.showFoundation && (
        <mesh position={[cx, -0.075, 0]} receiveShadow>
          <boxGeometry args={[extW + 0.3, 0.15, extL + 0.3]} />
          <meshStandardMaterial color="#808890" roughness={0.9} metalness={0.05} wireframe={wf} />
        </mesh>
      )}

      {/* 2. OCEĽOVÁ KONŠTRUKCIA PRÍSTAVBY */}
      {p.showStructure && (
        <group>
          {zs.map((z, i) => (
            <group key={`ext-col-${i}`}>
              {/* Vonkajší nosný stĺp */}
              <SteelTube from={[outerX, 0, z]} to={[outerX, H, z]} size={sz} thickness={th} color={col} wireframe={wf} />
              {/* Priečny nosník spájajúci hlavnú garáž s prístavbou */}
              <SteelTube from={[innerX, H, z]} to={[outerX, H, z]} size={sz} thickness={th} color={col} wireframe={wf} />
              {/* Stĺpik atiky na vonkajšej hrane */}
              <SteelTube from={[outerX, H, z]} to={[outerX, H + atticH, z]} size={sz * 0.8} thickness={th} color={col} wireframe={wf} />
              {/* Základová platňa pod vonkajším stĺpom */}
              <SteelPlate position={[outerX, 0.006, z]} size={[sz * 2.2, 0.012, sz * 2.2]} color={col} wireframe={wf} />
            </group>
          ))}

          {/* Pozdĺžne nosníky vo výške H a na vrchu atiky */}
          <SteelTube from={[outerX, H, -extL / 2]} to={[outerX, H, extL / 2]} size={sz * 0.8} thickness={th} color={col} wireframe={wf} />
          <SteelTube from={[outerX, H + atticH, -extL / 2]} to={[outerX, H + atticH, extL / 2]} size={sz * 0.8} thickness={th} color={col} wireframe={wf} />
          {/* Čelné nosníky atiky */}
          <SteelTube from={[innerX, H + atticH, -extL / 2]} to={[outerX, H + atticH, -extL / 2]} size={sz * 0.8} thickness={th} color={col} wireframe={wf} />
          <SteelTube from={[innerX, H + atticH, extL / 2]} to={[outerX, H + atticH, extL / 2]} size={sz * 0.8} thickness={th} color={col} wireframe={wf} />
        </group>
      )}

      {/* 3. OPLÁŠTENIE PRÍSTAVBY */}
      {p.showCladding && (
        <group>
          {/* Vonkajšia bočná stena prístavby (ak to nie je otvorený carport alebo ak je požadovaná) */}
          {extType !== "carport" && (
            <group position={[outerX + sideSign * (sz / 2 + wallThickness / 2), 0, 0]} rotation={[0, sideSign > 0 ? Math.PI / 2 : -Math.PI / 2, 0]}>
              {zs.map((z, i) => {
                if (i === zs.length - 1) return null;
                const zStart = zs[i];
                const zEnd = zs[i + 1];
                const w = zEnd - zStart;
                const zCenter = (zStart + zEnd) / 2;
                return (
                  <group key={`ext-wall-${i}`} position={[-sideSign * zCenter, 0, 0]}>
                    <PurPanel
                      id={`ext-wall-${i}`}
                      width={w}
                      height={H + atticH}
                      holes={[]}
                      texture={wallTex}
                      color={p.claddingColor}
                      wireframe={wf}
                      thickness={wallThickness}
                      isSandwich={isSand}
                      claddingOrientation={p.claddingOrientation}
                      panelType={p.panelType}
                    />
                  </group>
                );
              })}
            </group>
          )}

          {/* Predná a zadná atika modulu */}
          <group position={[cx, H, -extL / 2 - (sz / 2 + wallThickness / 2)]}>
            <PurPanel
              id="ext-attic-front"
              width={extW}
              height={atticH}
              holes={[]}
              texture={wallTex}
              color={p.claddingColor}
              wireframe={wf}
              thickness={wallThickness}
              isSandwich={isSand}
              claddingOrientation={p.claddingOrientation}
              panelType={p.panelType}
            />
          </group>

          <group position={[cx, H, extL / 2 + (sz / 2 + wallThickness / 2)]}>
            <PurPanel
              id="ext-attic-back"
              width={extW}
              height={atticH}
              holes={[]}
              texture={wallTex}
              color={p.claddingColor}
              wireframe={wf}
              thickness={wallThickness}
              isSandwich={isSand}
              claddingOrientation={p.claddingOrientation}
              panelType={p.panelType}
            />
          </group>

          {/* Zadná stena modulu (ak nie je otvorený carport) */}
          {extType !== "carport" && (
            <group position={[cx, 0, extL / 2 + (sz / 2 + wallThickness / 2)]}>
              <PurPanel
                id="ext-back"
                width={extW}
                height={H}
                holes={[]}
                texture={wallTex}
                color={p.claddingColor}
                wireframe={wf}
                thickness={wallThickness}
                isSandwich={isSand}
                claddingOrientation={p.claddingOrientation}
                panelType={p.panelType}
              />
            </group>
          )}

          {/* Predná stena modulu s otvorom pre bránu (pri garáži) alebo plná s dverami (pri sklade) */}
          {extType === "garage" && (
            <group position={[cx, 0, -extL / 2 - (sz / 2 + wallThickness / 2)]}>
              {/* Bočné panely vedľa brány */}
              {(() => {
                const gateW = Math.min(2.5, extW - 0.6);
                const sidePillarW = (extW - gateW) / 2;
                return (
                  <>
                    <group position={[-extW / 2 + sidePillarW / 2, 0, 0]}>
                      <PurPanel id="ext-front-L" width={sidePillarW} height={H} holes={[]} texture={wallTex} color={p.claddingColor} wireframe={wf} thickness={wallThickness} isSandwich={isSand} claddingOrientation={p.claddingOrientation} panelType={p.panelType} />
                    </group>
                    <group position={[extW / 2 - sidePillarW / 2, 0, 0]}>
                      <PurPanel id="ext-front-R" width={sidePillarW} height={H} holes={[]} texture={wallTex} color={p.claddingColor} wireframe={wf} thickness={wallThickness} isSandwich={isSand} claddingOrientation={p.claddingOrientation} panelType={p.panelType} />
                    </group>
                    {/* Nadpražie nad bránou */}
                    {H - 2.2 > 0.05 && (
                      <group position={[0, 2.2 + (H - 2.2) / 2, 0]}>
                        <PurPanel id="ext-front-top" width={gateW} height={H - 2.2} holes={[]} texture={wallTex} color={p.claddingColor} wireframe={wf} thickness={wallThickness} isSandwich={isSand} claddingOrientation={p.claddingOrientation} panelType={p.panelType} />
                      </group>
                    )}
                  </>
                );
              })()}
            </group>
          )}

          {/* Oplechovanie koruny atiky modulu (capping trim) */}
          <group position={[0, H + atticH + 0.02, 0]}>
            {/* Predná lišta */}
            <mesh position={[cx, 0, -extL / 2 - sz / 2]}>
              <boxGeometry args={[extW + 0.06, 0.04, wallThickness + 0.05]} />
              <meshStandardMaterial color={rimColor} metalness={0.6} roughness={0.4} wireframe={wf} />
            </mesh>
            {/* Zadná lišta */}
            <mesh position={[cx, 0, extL / 2 + sz / 2]}>
              <boxGeometry args={[extW + 0.06, 0.04, wallThickness + 0.05]} />
              <meshStandardMaterial color={rimColor} metalness={0.6} roughness={0.4} wireframe={wf} />
            </mesh>
            {/* Vonkajšia bočná lišta */}
            <mesh position={[outerX + sideSign * sz / 2, 0, 0]}>
              <boxGeometry args={[wallThickness + 0.05, 0.04, extL + sz * 2]} />
              <meshStandardMaterial color={rimColor} metalness={0.6} roughness={0.4} wireframe={wf} />
            </mesh>
          </group>

          {/* Plochá strecha modulu */}
          <group position={[cx, H - 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            {zs.map((z, i) => {
              if (i === zs.length - 1) return null;
              const zStart = zs[i];
              const zEnd = zs[i + 1];
              const w = zEnd - zStart;
              const zCenter = (zStart + zEnd) / 2;
              return (
                <group key={`ext-roof-${i}`} position={[0, zStart, sz / 2]}>
                  <PurPanel
                    id={`ext-roof-${i}`}
                    width={extW}
                    height={w}
                    holes={[]}
                    texture={roofTex}
                    color={p.roofColor}
                    wireframe={wf}
                    thickness={0.05}
                    isSandwich={true}
                    claddingOrientation={p.roofCladdingOrientation}
                    panelType={p.roofPanelType}
                  />
                </group>
              );
            })}
          </group>
        </group>
      )}

      {/* 4. BRÁNA MODULU (ak je typ garage a zapnuté accessories) */}
      {p.showAccessories && extType === "garage" && (
        <group position={[cx, 0, -extL / 2 - sz / 2 - 0.02]}>
          {(() => {
            const gateW = Math.min(2.5, extW - 0.6);
            const gateH = Math.min(2.2, H - 0.15);
            const gateColor = p.sectionalDoor2Color || p.sectionalDoorColor || "#3a3f47";
            return (
              <group position={[0, gateH / 2, 0]}>
                <mesh castShadow receiveShadow>
                  <boxGeometry args={[gateW, gateH, 0.04]} />
                  <meshStandardMaterial color={gateColor} metalness={0.5} roughness={0.5} wireframe={wf} />
                </mesh>
                {/* Vodorovné prelisy sekčnej brány */}
                {[1, 2, 3].map((idx) => (
                  <mesh key={`ext-gate-line-${idx}`} position={[0, -gateH / 2 + (gateH / 4) * idx, 0.022]}>
                    <boxGeometry args={[gateW - 0.04, 0.008, 0.005]} />
                    <meshStandardMaterial color="#1a1c20" roughness={0.7} />
                  </mesh>
                ))}
                {/* Rám brány */}
                <mesh position={[-gateW / 2, 0, 0.01]}>
                  <boxGeometry args={[0.06, gateH, 0.03]} />
                  <meshStandardMaterial color="#1f2328" roughness={0.6} />
                </mesh>
                <mesh position={[gateW / 2, 0, 0.01]}>
                  <boxGeometry args={[0.06, gateH, 0.03]} />
                  <meshStandardMaterial color="#1f2328" roughness={0.6} />
                </mesh>
                <mesh position={[0, gateH / 2, 0.01]}>
                  <boxGeometry args={[gateW + 0.06, 0.06, 0.03]} />
                  <meshStandardMaterial color="#1f2328" roughness={0.6} />
                </mesh>
              </group>
            );
          })()}
        </group>
      )}
    </group>
  );
}
