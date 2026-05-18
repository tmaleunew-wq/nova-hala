import "@react-three/fiber";
import { useMemo } from "react";
import { SteelTube, SteelPlate } from "./SteelTube";
import type { GarageParams } from "@/lib/garage/types";

function ridgeHeight(p: GarageParams): number {
  if (p.roofType === "gable") {
    return p.clearHeight + (p.width / 2) * Math.tan((p.roofPitchDeg * Math.PI) / 180);
  }
  return p.clearHeight + p.width * Math.tan((p.roofPitchDeg * Math.PI) / 180);
}

// Eave height on +X side (high side) for shed roof; equal H for gable
function highEave(p: GarageParams): number {
  return p.roofType === "shed" ? ridgeHeight(p) : p.clearHeight;
}

export function getFrameZ(p: GarageParams): number[] {
  const frames = p.bayCount + 1;
  const zs: number[] = [];
  for (let i = 0; i < frames; i++) {
    const t = i / (frames - 1);
    zs.push(-p.length / 2 + t * p.length);
  }
  return zs;
}

export function Structure({ p, explodeY }: { p: GarageParams; explodeY: number }) {
  const zs = useMemo(() => getFrameZ(p), [p]);
  const hxL = -p.width / 2;
  const hxR = p.width / 2;
  const Heave = p.clearHeight;
  const Hridge = ridgeHeight(p);
  const Hhi = highEave(p);
  const HloShed = p.clearHeight;
  const sz = p.profileSize;
  const th = p.profileThickness;
  const col = p.steelColor;
  const wf = p.wireframe;

  // Apply explode lift to whole structure (small)
  const ey = explodeY * 0.2;

  return (
    <group position={[0, ey, 0]}>
      {/* Columns + base plates at every frame */}
      {zs.map((z, i) => {
        const leftTop = p.roofType === "shed" ? HloShed : Heave;
        const rightTop = p.roofType === "shed" ? Hhi : Heave;
        return (
          <group key={`col-${i}`}>
            <SteelTube from={[hxL, 0, z]} to={[hxL, leftTop, z]} size={sz} thickness={th} color={col} wireframe={wf} />
            <SteelTube from={[hxR, 0, z]} to={[hxR, rightTop, z]} size={sz} thickness={th} color={col} wireframe={wf} />
            {/* base plates */}
            <SteelPlate position={[hxL, 0.006, z]} size={[sz * 2.2, 0.012, sz * 2.2]} color={col} wireframe={wf} />
            <SteelPlate position={[hxR, 0.006, z]} size={[sz * 2.2, 0.012, sz * 2.2]} color={col} wireframe={wf} />
            {/* anchor bolts (4 per plate) */}
            {[-1, 1].flatMap((sx) =>
              [-1, 1].map((sz2) => (
                <group key={`bL-${sx}-${sz2}`}>
                  <mesh position={[hxL + sx * sz * 0.85, 0.025, z + sz2 * sz * 0.85]}>
                    <cylinderGeometry args={[0.008, 0.008, 0.04, 12]} />
                    <meshStandardMaterial color="#2a2d33" metalness={0.9} roughness={0.4} wireframe={wf} />
                  </mesh>
                </group>
              )),
            )}
            {[-1, 1].flatMap((sx) =>
              [-1, 1].map((sz2) => (
                <group key={`bR-${sx}-${sz2}`}>
                  <mesh position={[hxR + sx * sz * 0.85, 0.025, z + sz2 * sz * 0.85]}>
                    <cylinderGeometry args={[0.008, 0.008, 0.04, 12]} />
                    <meshStandardMaterial color="#2a2d33" metalness={0.9} roughness={0.4} wireframe={wf} />
                  </mesh>
                </group>
              )),
            )}
          </group>
        );
      })}

      {/* Rafters (väzníky) at each frame */}
      {zs.map((z, i) => {
        if (p.roofType === "gable") {
          return (
            <group key={`raf-${i}`}>
              <SteelTube from={[hxL, Heave, z]} to={[0, Hridge, z]} size={sz} thickness={th} color={col} wireframe={wf} />
              <SteelTube from={[0, Hridge, z]} to={[hxR, Heave, z]} size={sz} thickness={th} color={col} wireframe={wf} />
              {/* horizontal tie (spodný pás) on inner frames only */}
              {i > 0 && i < zs.length - 1 && (
                <SteelTube from={[hxL, Heave, z]} to={[hxR, Heave, z]} size={sz * 0.7} thickness={th} color={col} wireframe={wf} />
              )}
            </group>
          );
        }
        // shed
        return (
          <SteelTube key={`raf-${i}`} from={[hxL, HloShed, z]} to={[hxR, Hhi, z]} size={sz} thickness={th} color={col} wireframe={wf} />
        );
      })}

      {/* Roof purlins (paždíky strešné) along Z */}
      {(() => {
        const purlins: React.ReactNode[] = [];
        const psz = sz * 0.7;
        if (p.roofType === "gable") {
          const halfW = p.width / 2;
          const slopeLen = Math.hypot(halfW, Hridge - Heave);
          const purlinCount = Math.max(2, Math.round(slopeLen / 0.8));
          for (let side of [-1, 1] as const) {
            for (let i = 0; i <= purlinCount; i++) {
              const t = i / purlinCount;
              const x = side * (1 - t) * halfW;
              const y = Heave + t * (Hridge - Heave);
              purlins.push(
                <SteelTube key={`pr-${side}-${i}`} from={[x, y, -p.length / 2]} to={[x, y, p.length / 2]} size={psz} thickness={th} color={col} wireframe={wf} />,
              );
            }
          }
        } else {
          const slopeLen = Math.hypot(p.width, Hhi - HloShed);
          const purlinCount = Math.max(3, Math.round(slopeLen / 0.8));
          for (let i = 0; i <= purlinCount; i++) {
            const t = i / purlinCount;
            const x = hxL + t * p.width;
            const y = HloShed + t * (Hhi - HloShed);
            purlins.push(
              <SteelTube key={`pr-${i}`} from={[x, y, -p.length / 2]} to={[x, y, p.length / 2]} size={psz} thickness={th} color={col} wireframe={wf} />,
            );
          }
        }
        return purlins;
      })()}

      {/* Wall girts (paždíky stenové) along Z on side walls */}
      {(() => {
        const out: React.ReactNode[] = [];
        const gsz = sz * 0.6;
        const heights = [0.6, 1.4, 2.2];
        for (const h of heights) {
          if (h < Heave) {
            out.push(<SteelTube key={`gL-${h}`} from={[hxL, h, -p.length / 2]} to={[hxL, h, p.length / 2]} size={gsz} thickness={th} color={col} wireframe={wf} />);
            out.push(<SteelTube key={`gR-${h}`} from={[hxR, h, -p.length / 2]} to={[hxR, h, p.length / 2]} size={gsz} thickness={th} color={col} wireframe={wf} />);
          }
        }
        // End walls girts along X
        for (const h of heights) {
          if (h < Heave) {
            out.push(<SteelTube key={`gF-${h}`} from={[hxL, h, -p.length / 2]} to={[hxR, h, -p.length / 2]} size={gsz} thickness={th} color={col} wireframe={wf} />);
            out.push(<SteelTube key={`gB-${h}`} from={[hxL, h, p.length / 2]} to={[hxR, h, p.length / 2]} size={gsz} thickness={th} color={col} wireframe={wf} />);
          }
        }
        return out;
      })()}

      {/* Eave beams */}
      <SteelTube from={[hxL, Heave, -p.length / 2]} to={[hxL, Heave, p.length / 2]} size={sz} thickness={th} color={col} wireframe={wf} />
      <SteelTube from={[hxR, Hhi, -p.length / 2]} to={[hxR, Hhi, p.length / 2]} size={sz} thickness={th} color={col} wireframe={wf} />

      {/* Ridge beam (gable) */}
      {p.roofType === "gable" && (
        <SteelTube from={[0, Hridge, -p.length / 2]} to={[0, Hridge, p.length / 2]} size={sz} thickness={th} color={col} wireframe={wf} />
      )}

      {/* Cross bracing (stužidlá) in end bays - side walls */}
      {zs.length >= 2 && (() => {
        const z0 = zs[0];
        const z1 = zs[1];
        const zN = zs[zs.length - 1];
        const zN1 = zs[zs.length - 2];
        const bsz = sz * 0.5;
        return (
          <>
            <SteelTube from={[hxL, 0.1, z0]} to={[hxL, Heave - 0.1, z1]} size={bsz} thickness={th} color={col} wireframe={wf} />
            <SteelTube from={[hxL, Heave - 0.1, z0]} to={[hxL, 0.1, z1]} size={bsz} thickness={th} color={col} wireframe={wf} />
            <SteelTube from={[hxR, 0.1, z0]} to={[hxR, Hhi - 0.1, z1]} size={bsz} thickness={th} color={col} wireframe={wf} />
            <SteelTube from={[hxR, Hhi - 0.1, z0]} to={[hxR, 0.1, z1]} size={bsz} thickness={th} color={col} wireframe={wf} />
            <SteelTube from={[hxL, 0.1, zN1]} to={[hxL, Heave - 0.1, zN]} size={bsz} thickness={th} color={col} wireframe={wf} />
            <SteelTube from={[hxL, Heave - 0.1, zN1]} to={[hxL, 0.1, zN]} size={bsz} thickness={th} color={col} wireframe={wf} />
            <SteelTube from={[hxR, 0.1, zN1]} to={[hxR, Hhi - 0.1, zN]} size={bsz} thickness={th} color={col} wireframe={wf} />
            <SteelTube from={[hxR, Hhi - 0.1, zN1]} to={[hxR, 0.1, zN]} size={bsz} thickness={th} color={col} wireframe={wf} />
          </>
        );
      })()}
    </group>
  );
}

export { ridgeHeight, highEave };
