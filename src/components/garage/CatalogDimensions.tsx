import "@react-three/fiber";
import React from "react";
import { Html } from "@react-three/drei";
import type { GarageParams } from "@/lib/garage/types";
import { getHallsConfig } from "@/lib/garage/configHelper";

function DimensionLine3D({
  from,
  to,
  color = "#3b82f6",
  thickness = 0.015,
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

  // Rotate cylinder to point from 'from' to 'to'
  // Default Three.js cylinder is along Y axis
  const dir = [dx / len, dy / len, dz / len];
  const up = [0, 1, 0];
  // Calculate orientation
  const axis = [
    up[1] * dir[2] - up[2] * dir[1],
    up[2] * dir[0] - up[0] * dir[2],
    up[0] * dir[1] - up[1] * dir[0],
  ];
  const axisLen = Math.hypot(axis[0], axis[1], axis[2]);
  const angle = Math.acos(Math.max(-1, Math.min(1, dir[1])));

  return (
    <group position={mid}>
      {axisLen > 0.0001 ? (
        <group rotation={[axis[0] / axisLen * angle, axis[1] / axisLen * angle, axis[2] / axisLen * angle]}>
          <mesh>
            <cylinderGeometry args={[thickness, thickness, len, 8]} />
            <meshBasicMaterial color={color} />
          </mesh>
        </group>
      ) : (
        <mesh>
          <cylinderGeometry args={[thickness, thickness, len, 8]} />
          <meshBasicMaterial color={color} />
        </mesh>
      )}
    </group>
  );
}

export function CatalogDimensions({ p }: { p: GarageParams }) {
  const hallsCfg = getHallsConfig();
  const currentHall = p.hallType && p.hallType !== "Vlastný" ? hallsCfg[p.hallType] : null;
  const modLen = currentHall?.moduleLength ?? (p.bayCount > 0 ? p.length / p.bayCount : 4.0);

  const halfW = p.width / 2;
  const halfL = p.length / 2;
  const y = 0.03; // slightly above ground

  // Front dimension A: in front of the building (along X, at Z = -halfL - 1.6)
  const z_front = -halfL - 1.6;
  // Side dimension B: full length (along Z, on opposite side at X = -halfW - 2.4)
  const x_sideB = -halfW - 2.4;
  // Side dimension C: first bay (along Z, on opposite side at X = -halfW - 1.2)
  const x_sideC = -halfW - 1.2;
  const z_firstBay = -halfL + modLen;

  const lineColor = "#2563eb";
  const witnessColor = "#93c5fd";

  return (
    <group name="catalog-dimensions">
      {/* --- DIMENSION A (WIDTH) --- */}
      {/* Witness lines from corner posts to dimension line */}
      <DimensionLine3D from={[-halfW, y, -halfL]} to={[-halfW, y, z_front - 0.2]} color={witnessColor} thickness={0.008} />
      <DimensionLine3D from={[halfW, y, -halfL]} to={[halfW, y, z_front - 0.2]} color={witnessColor} thickness={0.008} />
      {/* Main dimension line A */}
      <DimensionLine3D from={[-halfW, y, z_front]} to={[halfW, y, z_front]} color={lineColor} thickness={0.014} />
      {/* End ticks */}
      <DimensionLine3D from={[-halfW - 0.15, y, z_front - 0.15]} to={[-halfW + 0.15, y, z_front + 0.15]} color={lineColor} thickness={0.016} />
      <DimensionLine3D from={[halfW - 0.15, y, z_front - 0.15]} to={[halfW + 0.15, y, z_front + 0.15]} color={lineColor} thickness={0.016} />
      {/* Badge A */}
      <Html position={[0, y + 0.05, z_front]} center distanceFactor={16} zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
        <div className="flex flex-col items-center select-none transform transition-transform duration-150 hover:scale-110">
          <div className="w-8 h-8 rounded-full bg-[#1d4ed8] border-2 border-white shadow-xl flex items-center justify-center text-white font-black text-sm tracking-wider">
            A
          </div>
          <div className="mt-1 px-1.5 py-0.5 rounded bg-slate-900/80 backdrop-blur border border-white/20 text-[10px] font-mono font-bold text-white shadow whitespace-nowrap">
            {p.width.toFixed(1)} m
          </div>
        </div>
      </Html>

      {/* --- DIMENSION B (TOTAL LENGTH - OPACNA STRANA) --- */}
      {/* Witness lines from front & rear corners to B line */}
      <DimensionLine3D from={[-halfW, y, -halfL]} to={[x_sideB - 0.2, y, -halfL]} color={witnessColor} thickness={0.008} />
      <DimensionLine3D from={[-halfW, y, halfL]} to={[x_sideB - 0.2, y, halfL]} color={witnessColor} thickness={0.008} />
      {/* Main dimension line B */}
      <DimensionLine3D from={[x_sideB, y, -halfL]} to={[x_sideB, y, halfL]} color={lineColor} thickness={0.014} />
      {/* End ticks */}
      <DimensionLine3D from={[x_sideB - 0.15, y, -halfL - 0.15]} to={[x_sideB + 0.15, y, -halfL + 0.15]} color={lineColor} thickness={0.016} />
      <DimensionLine3D from={[x_sideB - 0.15, y, halfL - 0.15]} to={[x_sideB + 0.15, y, halfL + 0.15]} color={lineColor} thickness={0.016} />
      {/* Badge B */}
      <Html position={[x_sideB, y + 0.05, 0]} center distanceFactor={16} zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
        <div className="flex flex-col items-center select-none transform transition-transform duration-150 hover:scale-110">
          <div className="w-8 h-8 rounded-full bg-[#1d4ed8] border-2 border-white shadow-xl flex items-center justify-center text-white font-black text-sm tracking-wider">
            B
          </div>
          <div className="mt-1 px-1.5 py-0.5 rounded bg-slate-900/80 backdrop-blur border border-white/20 text-[10px] font-mono font-bold text-white shadow whitespace-nowrap">
            {Number(p.length).toFixed(1)} m
          </div>
        </div>
      </Html>

      {/* --- DIMENSION C (MODULE LENGTH - OPACNA STRANA) --- */}
      {/* Witness lines for first module */}
      <DimensionLine3D from={[-halfW, y, -halfL]} to={[x_sideC - 0.2, y, -halfL]} color={witnessColor} thickness={0.008} />
      <DimensionLine3D from={[-halfW, y, z_firstBay]} to={[x_sideC - 0.2, y, z_firstBay]} color={witnessColor} thickness={0.008} />
      {/* Main dimension line C */}
      <DimensionLine3D from={[x_sideC, y, -halfL]} to={[x_sideC, y, z_firstBay]} color={lineColor} thickness={0.014} />
      {/* End ticks */}
      <DimensionLine3D from={[x_sideC - 0.15, y, -halfL - 0.15]} to={[x_sideC + 0.15, y, -halfL + 0.15]} color={lineColor} thickness={0.016} />
      <DimensionLine3D from={[x_sideC - 0.15, y, z_firstBay - 0.15]} to={[x_sideC + 0.15, y, z_firstBay + 0.15]} color={lineColor} thickness={0.016} />
      {/* Badge C */}
      <Html position={[x_sideC, y + 0.05, (-halfL + z_firstBay) / 2]} center distanceFactor={16} zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
        <div className="flex flex-col items-center select-none transform transition-transform duration-150 hover:scale-110">
          <div className="w-8 h-8 rounded-full bg-[#1d4ed8] border-2 border-white shadow-xl flex items-center justify-center text-white font-black text-sm tracking-wider">
            C
          </div>
          <div className="mt-1 px-1.5 py-0.5 rounded bg-slate-900/80 backdrop-blur border border-white/20 text-[10px] font-mono font-bold text-white shadow whitespace-nowrap">
            {modLen.toFixed(1)} m
          </div>
        </div>
      </Html>
    </group>
  );
}
