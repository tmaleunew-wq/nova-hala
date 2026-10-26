import "@react-three/fiber";
import React from "react";
import * as THREE from "three";
import { Html } from "@react-three/drei";
import type { GarageParams } from "@/lib/garage/types";
import { getHallsConfig } from "@/lib/garage/configHelper";

function DimensionLine3D({
  from,
  to,
  color = "#3b82f6",
  thickness = 0.012,
}: {
  from: [number, number, number];
  to: [number, number, number];
  color?: string;
  thickness?: number;
}) {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const dz = to[2] - from[2];
  const len = Math.hypot(dx, dy, dz);
  if (len < 0.001) return null;

  const mid: [number, number, number] = [
    (from[0] + to[0]) / 2,
    (from[1] + to[1]) / 2,
    (from[2] + to[2]) / 2,
  ];

  const quat = React.useMemo(() => {
    const v1 = new THREE.Vector3(0, 1, 0);
    const v2 = new THREE.Vector3(dx, dy, dz).normalize();
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(v1, v2);
    return q;
  }, [dx, dy, dz]);

  return (
    <group position={mid} quaternion={quat}>
      <mesh>
        <cylinderGeometry args={[thickness, thickness, len, 12]} />
        <meshBasicMaterial color={color} depthTest={true} />
      </mesh>
    </group>
  );
}

function computeRidgeHeight(p: GarageParams): number {
  if (p.roofType === "gable") {
    return p.clearHeight + (p.width / 2) * Math.tan((p.roofPitchDeg * Math.PI) / 180);
  }
  if (p.roofType === "cubic") {
    return p.clearHeight + (p.atticHeight ?? 0.35);
  }
  return p.clearHeight + p.width * Math.tan((p.roofPitchDeg * Math.PI) / 180);
}

function DimensionBadge({
  letter,
  value,
  isCustom,
}: {
  letter: string;
  value: string;
  isCustom: boolean;
}) {
  return (
    <div className="flex flex-col items-center select-none pointer-events-none drop-shadow-sm">
      <div
        className={`${
          isCustom ? "w-5 h-5 text-[10px] border" : "w-8 h-8 text-sm border-2"
        } rounded-full bg-[#1d4ed8] border-white shadow-md flex items-center justify-center text-white font-black tracking-wider`}
      >
        {letter}
      </div>
      <div
        className={`mt-0.5 ${
          isCustom ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[11px]"
        } rounded bg-slate-900/90 backdrop-blur-md border border-white/20 font-mono font-bold text-white shadow whitespace-nowrap`}
      >
        {value}
      </div>
    </div>
  );
}

export function CatalogDimensions({ p }: { p: GarageParams }) {
  const hallsCfg = getHallsConfig();
  const isCustom = !p.hallType || p.hallType === "Vlastný" || p.hallType === "vlastna_garaz";
  const currentHall = !isCustom ? hallsCfg[p.hallType] : null;
  const modLen = currentHall?.moduleLength ?? (p.bayCount > 0 ? p.length / p.bayCount : p.length / 2);

  const halfW = p.width / 2;
  const halfL = p.length / 2;
  const y = isCustom ? 0.045 : 0.08;

  // Proportional offsets: neat & close for garages, spacious for large halls
  const z_front = isCustom ? -halfL - 0.45 : -halfL - 1.6;
  const x_sideB = isCustom ? -halfW - 0.75 : -halfW - 2.4;
  const x_sideC = isCustom ? -halfW - 0.38 : -halfW - 1.2;
  const z_firstBay = -halfL + modLen;

  // Height dimension positions (placed at the front-right corner)
  const rH = computeRidgeHeight(p);
  const hasRidge = Math.abs(rH - p.clearHeight) > 0.15;
  const x_height = isCustom ? halfW + 0.45 : halfW + 1.50;
  const x_ridge = hasRidge ? (isCustom ? x_height + 0.40 : x_height + 1.10) : x_height;
  const ridgeX = p.roofType === "gable" ? 0 : (p.slopeDirection === "left-to-right" ? halfW : -halfW);

  // Proportional line and tick sizes
  const tickSize = isCustom ? 0.05 : 0.15;
  const mainThick = isCustom ? 0.005 : 0.012;
  const witnessThick = isCustom ? 0.003 : 0.007;
  const tickThick = isCustom ? 0.006 : 0.014;
  const ext = isCustom ? 0.08 : 0.15;
  const distFactor = isCustom ? 8 : 14;

  const lineColor = "#2563eb";
  const witnessColor = "#93c5fd";

  return (
    <group name="catalog-dimensions">
      {/* --- DIMENSION A (WIDTH) --- */}
      {/* Witness lines from corner posts to dimension line */}
      <DimensionLine3D from={[-halfW, y, -halfL]} to={[-halfW, y, z_front - ext]} color={witnessColor} thickness={witnessThick} />
      <DimensionLine3D from={[halfW, y, -halfL]} to={[halfW, y, z_front - ext]} color={witnessColor} thickness={witnessThick} />
      {/* Main dimension line A */}
      <DimensionLine3D from={[-halfW, y, z_front]} to={[halfW, y, z_front]} color={lineColor} thickness={mainThick} />
      {/* End ticks 45 deg */}
      <DimensionLine3D from={[-halfW - tickSize, y, z_front - tickSize]} to={[-halfW + tickSize, y, z_front + tickSize]} color={lineColor} thickness={tickThick} />
      <DimensionLine3D from={[halfW - tickSize, y, z_front - tickSize]} to={[halfW + tickSize, y, z_front + tickSize]} color={lineColor} thickness={tickThick} />
      {/* Badge A */}
      <Html position={[0, y + (isCustom ? 0.04 : 0.06), z_front]} center distanceFactor={distFactor} zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
        <DimensionBadge letter="A" value={`${p.width.toFixed(1)} m`} isCustom={isCustom} />
      </Html>

      {/* --- DIMENSION B (TOTAL LENGTH - OPACNA STRANA) --- */}
      {/* Witness lines from front & rear corners to B line */}
      <DimensionLine3D from={[-halfW, y, -halfL]} to={[x_sideB - ext, y, -halfL]} color={witnessColor} thickness={witnessThick} />
      <DimensionLine3D from={[-halfW, y, halfL]} to={[x_sideB - ext, y, halfL]} color={witnessColor} thickness={witnessThick} />
      {/* Main dimension line B */}
      <DimensionLine3D from={[x_sideB, y, -halfL]} to={[x_sideB, y, halfL]} color={lineColor} thickness={mainThick} />
      {/* End ticks 45 deg */}
      <DimensionLine3D from={[x_sideB - tickSize, y, -halfL - tickSize]} to={[x_sideB + tickSize, y, -halfL + tickSize]} color={lineColor} thickness={tickThick} />
      <DimensionLine3D from={[x_sideB - tickSize, y, halfL - tickSize]} to={[x_sideB + tickSize, y, halfL + tickSize]} color={lineColor} thickness={tickThick} />
      {/* Badge B */}
      <Html position={[x_sideB, y + (isCustom ? 0.04 : 0.06), 0]} center distanceFactor={distFactor} zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
        <DimensionBadge letter="B" value={`${Number(p.length).toFixed(1)} m`} isCustom={isCustom} />
      </Html>

      {/* --- DIMENSION C (MODULE LENGTH - OPACNA STRANA) --- */}
      {/* Witness lines for first module */}
      <DimensionLine3D from={[-halfW, y, -halfL]} to={[x_sideC - ext, y, -halfL]} color={witnessColor} thickness={witnessThick} />
      <DimensionLine3D from={[-halfW, y, z_firstBay]} to={[x_sideC - ext, y, z_firstBay]} color={witnessColor} thickness={witnessThick} />
      {/* Main dimension line C */}
      <DimensionLine3D from={[x_sideC, y, -halfL]} to={[x_sideC, y, z_firstBay]} color={lineColor} thickness={mainThick} />
      {/* End ticks 45 deg */}
      <DimensionLine3D from={[x_sideC - tickSize, y, -halfL - tickSize]} to={[x_sideC + tickSize, y, -halfL + tickSize]} color={lineColor} thickness={tickThick} />
      <DimensionLine3D from={[x_sideC - tickSize, y, z_firstBay - tickSize]} to={[x_sideC + tickSize, y, z_firstBay + tickSize]} color={lineColor} thickness={tickThick} />
      {/* Badge C */}
      <Html position={[x_sideC, y + (isCustom ? 0.04 : 0.06), (-halfL + z_firstBay) / 2]} center distanceFactor={distFactor} zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
        <DimensionBadge letter="C" value={`${modLen.toFixed(1)} m`} isCustom={isCustom} />
      </Html>

      {/* --- DIMENSION H (WALL / EAVE HEIGHT - PRAVA STRANA) --- */}
      {/* Witness lines from front-right corner */}
      <DimensionLine3D from={[halfW, y, -halfL]} to={[x_height + ext, y, -halfL]} color={witnessColor} thickness={witnessThick} />
      <DimensionLine3D from={[halfW, p.clearHeight, -halfL]} to={[x_height + ext, p.clearHeight, -halfL]} color={witnessColor} thickness={witnessThick} />
      {/* Main vertical dimension line H */}
      <DimensionLine3D from={[x_height, y, -halfL]} to={[x_height, p.clearHeight, -halfL]} color={lineColor} thickness={mainThick} />
      {/* End ticks 45 deg in XY plane */}
      <DimensionLine3D from={[x_height - tickSize, y - tickSize, -halfL]} to={[x_height + tickSize, y + tickSize, -halfL]} color={lineColor} thickness={tickThick} />
      <DimensionLine3D from={[x_height - tickSize, p.clearHeight - tickSize, -halfL]} to={[x_height + tickSize, p.clearHeight + tickSize, -halfL]} color={lineColor} thickness={tickThick} />
      {/* Badge H */}
      <Html position={[x_height, (y + p.clearHeight) / 2, -halfL]} center distanceFactor={distFactor} zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
        <DimensionBadge letter="H" value={`${p.clearHeight.toFixed(1)} m`} isCustom={isCustom} />
      </Html>

      {/* --- DIMENSION H1 (RIDGE HEIGHT - PRAVA STRANA AK JE SEDLOVA/PULTOVA) --- */}
      {hasRidge && (
        <>
          {/* Witness lines from ridge peak */}
          <DimensionLine3D from={[x_height, y, -halfL]} to={[x_ridge + ext, y, -halfL]} color={witnessColor} thickness={witnessThick} />
          <DimensionLine3D from={[ridgeX, rH, -halfL]} to={[x_ridge + ext, rH, -halfL]} color={witnessColor} thickness={witnessThick} />
          {/* Main vertical dimension line H1 */}
          <DimensionLine3D from={[x_ridge, y, -halfL]} to={[x_ridge, rH, -halfL]} color={lineColor} thickness={mainThick} />
          {/* End ticks 45 deg in XY plane */}
          <DimensionLine3D from={[x_ridge - tickSize, y - tickSize, -halfL]} to={[x_ridge + tickSize, y + tickSize, -halfL]} color={lineColor} thickness={tickThick} />
          <DimensionLine3D from={[x_ridge - tickSize, rH - tickSize, -halfL]} to={[x_ridge + tickSize, rH + tickSize, -halfL]} color={lineColor} thickness={tickThick} />
          {/* Badge H1 */}
          <Html position={[x_ridge, (y + rH) / 2, -halfL]} center distanceFactor={distFactor} zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
            <DimensionBadge letter="H1" value={`${rH.toFixed(1)} m`} isCustom={isCustom} />
          </Html>
        </>
      )}
    </group>
  );
}
