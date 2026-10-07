import "@react-three/fiber";
import { useMemo } from "react";
import { SteelTube, SteelPlate } from "./SteelTube";
import { WallFraming } from "./WallFraming";
import type { GarageParams } from "@/lib/garage/types";
import { getHallsConfig } from "@/lib/garage/configHelper";

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

export function getPersonalDoorZ(p: GarageParams): number {
  const zs = getFrameZ(p);
  if (zs.length >= 3) {
    return (zs[1] + zs[2]) / 2;
  }
  return -p.length / 4;
}

export function getWindowZs(p: { length: number; bayCount: number; windowCount: number }): number[] {
  const zs = [];
  const frames = p.bayCount + 1;
  const frameZs: number[] = [];
  for (let i = 0; i < frames; i++) {
    frameZs.push(-p.length / 2 + (i / (frames - 1)) * p.length);
  }
  
  for (let i = 0; i < p.windowCount; i++) {
    let bayIdx = 0;
    if (p.windowCount <= p.bayCount) {
      bayIdx = Math.floor(((i + 0.5) / p.windowCount) * p.bayCount);
    } else {
      bayIdx = i % p.bayCount;
    }
    const zCenter = (frameZs[bayIdx] + frameZs[bayIdx + 1]) / 2;
    zs.push(zCenter);
  }
  return zs;
}

export function getWindowCoords(p: { width: number; length: number; bayCount: number; windowCount: number; windowSide: "left" | "right" | "back" }): number[] {
  if (p.windowSide === "back") {
    const coords: number[] = [];
    for (let i = 0; i < p.windowCount; i++) {
      const t = (i + 1) / (p.windowCount + 1);
      coords.push(-p.width / 2 + t * p.width);
    }
    return coords;
  }
  return getWindowZs(p);
}


export function getDoubleGateLayout(W: number, doorWidth: number) {
  const minSide = 0.25;
  const minCenter = 0.35;
  const maxPossibleDoorW = Math.max(1.0, (W - 2 * minSide - minCenter) / 2);
  const actualDoorW = Math.max(1.0, Math.min(doorWidth, maxPossibleDoorW));
  const remaining = Math.max(0, W - 2 * actualDoorW);
  const sideMargin = Math.max(minSide, remaining * 0.25);
  const centerPillar = Math.max(minCenter, W - 2 * actualDoorW - 2 * sideMargin);
  const dist = actualDoorW + centerPillar;
  return {
    actualDoorW,
    leftCx: -dist / 2,
    rightCx: dist / 2,
    centerPillar,
    sideMargin,
  };
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
            <SteelTube
              from={[hxL, 0, z]}
              to={[hxL, leftTop, z]}
              size={sz}
              thickness={th}
              color={col}
              wireframe={wf}
            />
            <SteelTube
              from={[hxR, 0, z]}
              to={[hxR, rightTop, z]}
              size={sz}
              thickness={th}
              color={col}
              wireframe={wf}
            />
            {/* base plates */}
            <SteelPlate
              position={[hxL, 0.006, z]}
              size={[sz * 2.2, 0.012, sz * 2.2]}
              color={col}
              wireframe={wf}
            />
            <SteelPlate
              position={[hxR, 0.006, z]}
              size={[sz * 2.2, 0.012, sz * 2.2]}
              color={col}
              wireframe={wf}
            />
            {/* anchor bolts (4 per plate) */}
            {[-1, 1].flatMap((sx) =>
              [-1, 1].map((sz2) => (
                <group key={`bL-${sx}-${sz2}`}>
                  <mesh position={[hxL + sx * sz * 0.85, 0.025, z + sz2 * sz * 0.85]}>
                    <cylinderGeometry args={[0.008, 0.008, 0.04, 12]} />
                    <meshStandardMaterial
                      color="#2a2d33"
                      metalness={0.9}
                      roughness={0.4}
                      wireframe={wf}
                    />
                  </mesh>
                </group>
              )),
            )}
            {[-1, 1].flatMap((sx) =>
              [-1, 1].map((sz2) => (
                <group key={`bR-${sx}-${sz2}`}>
                  <mesh position={[hxR + sx * sz * 0.85, 0.025, z + sz2 * sz * 0.85]}>
                    <cylinderGeometry args={[0.008, 0.008, 0.04, 12]} />
                    <meshStandardMaterial
                      color="#2a2d33"
                      metalness={0.9}
                      roughness={0.4}
                      wireframe={wf}
                    />
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
              <SteelTube
                from={[hxL, Heave, z]}
                to={[0, Hridge, z]}
                size={sz}
                thickness={th}
                color={col}
                wireframe={wf}
              />
              <SteelTube
                from={[0, Hridge, z]}
                to={[hxR, Heave, z]}
                size={sz}
                thickness={th}
                color={col}
                wireframe={wf}
              />
              {/* Corner haunches (nábehy v rohoch rámu) */}
              {(() => {
                const halfW = p.width / 2;
                const angle = Math.atan2(Hridge - Heave, halfW);
                const haunchLen = Math.min(0.8, halfW * 0.22);
                const haunchDown = Math.min(0.65, Heave * 0.14);
                return (
                  <>
                    <SteelTube
                      from={[hxL, Heave - haunchDown, z]}
                      to={[hxL + haunchLen, Heave + haunchLen * Math.tan(angle), z]}
                      size={sz * 0.8}
                      thickness={th}
                      color={col}
                      wireframe={wf}
                    />
                    <SteelTube
                      from={[hxR, Heave - haunchDown, z]}
                      to={[hxR - haunchLen, Heave + haunchLen * Math.tan(angle), z]}
                      size={sz * 0.8}
                      thickness={th}
                      color={col}
                      wireframe={wf}
                    />
                  </>
                );
              })()}
              {/* Tie rod (vodorovné tiahlo na vnútorných rámoch pre haly KD14, KD16, KD18, KD20 podľa PDF) */}
              {(() => {
                const currentHall = p.hallType && p.hallType !== "Vlastný" ? getHallsConfig()[p.hallType] : null;
                const hasTieRod = !currentHall && p.width >= 24;
                if (!hasTieRod || i === 0 || i === zs.length - 1) return null;
                const halfW = p.width / 2;
                const angle = Math.atan2(Hridge - Heave, halfW);
                const x1 = -halfW * 0.35;
                const x2 = halfW * 0.35;
                const y1 = Heave + (halfW - Math.abs(x1)) * Math.tan(angle);
                const y2 = Heave + (halfW - Math.abs(x2)) * Math.tan(angle);
                return (
                  <group key={`tie-rod-frame-${i}`}>
                    <SteelTube
                      from={[hxL, Heave, z]}
                      to={[hxR, Heave, z]}
                      size={sz * 0.65}
                      thickness={th}
                      color={col}
                      wireframe={wf}
                    />
                    <SteelTube
                      from={[x1, Heave, z]}
                      to={[x1, y1, z]}
                      size={sz * 0.45}
                      thickness={th}
                      color={col}
                      wireframe={wf}
                    />
                    <SteelTube
                      from={[x2, Heave, z]}
                      to={[x2, y2, z]}
                      size={sz * 0.45}
                      thickness={th}
                      color={col}
                      wireframe={wf}
                    />
                  </group>
                );
              })()}
            </group>
          );
        }
        // shed
        return (
          <SteelTube
            key={`raf-${i}`}
            from={[hxL, HloShed, z]}
            to={[hxR, Hhi, z]}
            size={sz}
            thickness={th}
            color={col}
            wireframe={wf}
          />
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
          for (const side of [-1, 1] as const) {
            for (let i = 0; i <= purlinCount; i++) {
              const t = i / purlinCount;
              const x = side * (1 - t) * halfW;
              const y = Heave + t * (Hridge - Heave);
              purlins.push(
                <SteelTube
                  key={`pr-${side}-${i}`}
                  from={[x, y, -p.length / 2]}
                  to={[x, y, p.length / 2]}
                  size={psz}
                  thickness={th}
                  color={col}
                  wireframe={wf}
                />,
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
              <SteelTube
                key={`pr-${i}`}
                from={[x, y, -p.length / 2]}
                to={[x, y, p.length / 2]}
                size={psz}
                thickness={th}
                color={col}
                wireframe={wf}
              />,
            );
          }
        }
        return purlins;
      })()}

      {/* Wall girts (paždíky stenové) and Openings Framing */}
      <WallFraming
        p={p}
        Heave={Heave}
        Hridge={Hridge}
        Hhi={Hhi}
        sz={sz}
        th={th}
        col={col}
        wf={wf}
        hxL={hxL}
        hxR={hxR}
      />

      {/* Eave beams */}
      <SteelTube
        from={[hxL, Heave, -p.length / 2]}
        to={[hxL, Heave, p.length / 2]}
        size={sz}
        thickness={th}
        color={col}
        wireframe={wf}
      />
      <SteelTube
        from={[hxR, Hhi, -p.length / 2]}
        to={[hxR, Hhi, p.length / 2]}
        size={sz}
        thickness={th}
        color={col}
        wireframe={wf}
      />

      {/* Ridge beam (gable) */}
      {p.roofType === "gable" && (
        <SteelTube
          from={[0, Hridge, -p.length / 2]}
          to={[0, Hridge, p.length / 2]}
          size={sz}
          thickness={th}
          color={col}
          wireframe={wf}
        />
      )}

      {/* Cross bracing (stužidlá) in end bays - side walls */}
      {zs.length >= 2 &&
        (() => {
          const z0 = zs[0];
          const z1 = zs[1];
          const zN = zs[zs.length - 1];
          const zN1 = zs[zs.length - 2];
          const bsz = sz * 0.5;

          const hasOpening = (side: "left" | "right", zStart: number, zEnd: number) => {
            // Check personal door
            if (p.hasPersonalDoor && p.personalDoorSide === side) {
              const doorCenter = getPersonalDoorZ(p);
              const doorStart = doorCenter - 0.45;
              const doorEnd = doorCenter + 0.45;
              if (doorStart < zEnd && doorEnd > zStart) {
                return true;
              }
            }
            // Check windows
            if (p.hasWindows && p.windowCount > 0 && p.windowSide === side) {
              const winZs = getWindowCoords(p);
              for (const winZ of winZs) {
                const winStart = winZ - p.windowWidth / 2;
                const winEnd = winZ + p.windowWidth / 2;
                if (winStart < zEnd && winEnd > zStart) {
                  return true;
                }
              }
            }
            return false;
          };

          const showLeftFirst = !hasOpening("left", z0, z1);
          const showLeftLast = !hasOpening("left", zN1, zN);
          const showRightFirst = !hasOpening("right", z0, z1);
          const showRightLast = !hasOpening("right", zN1, zN);

          return (
            <>
              {showLeftFirst && (
                <>
                  <SteelTube
                    from={[hxL, 0.1, z0]}
                    to={[hxL, Heave - 0.1, z1]}
                    size={bsz}
                    thickness={th}
                    color={col}
                    wireframe={wf}
                  />
                  <SteelTube
                    from={[hxL, Heave - 0.1, z0]}
                    to={[hxL, 0.1, z1]}
                    size={bsz}
                    thickness={th}
                    color={col}
                    wireframe={wf}
                  />
                </>
              )}
              {showRightFirst && (
                <>
                  <SteelTube
                    from={[hxR, 0.1, z0]}
                    to={[hxR, Hhi - 0.1, z1]}
                    size={bsz}
                    thickness={th}
                    color={col}
                    wireframe={wf}
                  />
                  <SteelTube
                    from={[hxR, Hhi - 0.1, z0]}
                    to={[hxR, 0.1, z1]}
                    size={bsz}
                    thickness={th}
                    color={col}
                    wireframe={wf}
                  />
                </>
              )}
              {showLeftLast && (
                <>
                  <SteelTube
                    from={[hxL, 0.1, zN1]}
                    to={[hxL, Heave - 0.1, zN]}
                    size={bsz}
                    thickness={th}
                    color={col}
                    wireframe={wf}
                  />
                  <SteelTube
                    from={[hxL, Heave - 0.1, zN1]}
                    to={[hxL, 0.1, zN]}
                    size={bsz}
                    thickness={th}
                    color={col}
                    wireframe={wf}
                  />
                </>
              )}
              {showRightLast && (
                <>
                  <SteelTube
                    from={[hxR, 0.1, zN1]}
                    to={[hxR, Hhi - 0.1, zN]}
                    size={bsz}
                    thickness={th}
                    color={col}
                    wireframe={wf}
                  />
                  <SteelTube
                    from={[hxR, Hhi - 0.1, zN1]}
                    to={[hxR, 0.1, zN]}
                    size={bsz}
                    thickness={th}
                    color={col}
                    wireframe={wf}
                  />
                </>
              )}

              {/* Roof cross bracing in end bays */}
              {p.roofType === "gable" ? (
                <>
                  <SteelTube
                    from={[hxL, Heave, z0]}
                    to={[0, Hridge, z1]}
                    size={bsz * 0.6}
                    thickness={th}
                    color={col}
                    wireframe={wf}
                  />
                  <SteelTube
                    from={[hxL, Heave, z1]}
                    to={[0, Hridge, z0]}
                    size={bsz * 0.6}
                    thickness={th}
                    color={col}
                    wireframe={wf}
                  />
                  <SteelTube
                    from={[hxR, Heave, z0]}
                    to={[0, Hridge, z1]}
                    size={bsz * 0.6}
                    thickness={th}
                    color={col}
                    wireframe={wf}
                  />
                  <SteelTube
                    from={[hxR, Heave, z1]}
                    to={[0, Hridge, z0]}
                    size={bsz * 0.6}
                    thickness={th}
                    color={col}
                    wireframe={wf}
                  />
                  {zs.length > 2 && (
                    <>
                      <SteelTube
                        from={[hxL, Heave, zN1]}
                        to={[0, Hridge, zN]}
                        size={bsz * 0.6}
                        thickness={th}
                        color={col}
                        wireframe={wf}
                      />
                      <SteelTube
                        from={[hxL, Heave, zN]}
                        to={[0, Hridge, zN1]}
                        size={bsz * 0.6}
                        thickness={th}
                        color={col}
                        wireframe={wf}
                      />
                      <SteelTube
                        from={[hxR, Heave, zN1]}
                        to={[0, Hridge, zN]}
                        size={bsz * 0.6}
                        thickness={th}
                        color={col}
                        wireframe={wf}
                      />
                      <SteelTube
                        from={[hxR, Heave, zN]}
                        to={[0, Hridge, zN1]}
                        size={bsz * 0.6}
                        thickness={th}
                        color={col}
                        wireframe={wf}
                      />
                    </>
                  )}
                </>
              ) : (
                <>
                  <SteelTube
                    from={[hxL, HloShed, z0]}
                    to={[hxR, Hhi, z1]}
                    size={bsz * 0.6}
                    thickness={th}
                    color={col}
                    wireframe={wf}
                  />
                  <SteelTube
                    from={[hxL, HloShed, z1]}
                    to={[hxR, Hhi, z0]}
                    size={bsz * 0.6}
                    thickness={th}
                    color={col}
                    wireframe={wf}
                  />
                  {zs.length > 2 && (
                    <>
                      <SteelTube
                        from={[hxL, HloShed, zN1]}
                        to={[hxR, Hhi, zN]}
                        size={bsz * 0.6}
                        thickness={th}
                        color={col}
                        wireframe={wf}
                      />
                      <SteelTube
                        from={[hxL, HloShed, zN]}
                        to={[hxR, Hhi, zN1]}
                        size={bsz * 0.6}
                        thickness={th}
                        color={col}
                        wireframe={wf}
                      />
                    </>
                  )}
                </>
              )}
            </>
          );
        })()}
    </group>
  );
}

export { ridgeHeight, highEave };
