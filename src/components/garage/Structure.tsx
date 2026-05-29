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
              {/* horizontal tie (spodný pás) on inner frames only */}
              {i > 0 && i < zs.length - 1 && (
                <SteelTube
                  from={[hxL, Heave, z]}
                  to={[hxR, Heave, z]}
                  size={sz * 0.7}
                  thickness={th}
                  color={col}
                  wireframe={wf}
                />
              )}
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
      {(() => {
        const out: React.ReactNode[] = [];
        const gsz = sz * 0.6;
        const heights = [0.6, 1.4, 2.2];
        const L = p.length;

        interface Interval {
          start: number;
          end: number;
        }

        function subtractIntervals(
          totalStart: number,
          totalEnd: number,
          cuts: Interval[],
        ): Interval[] {
          let segments = [{ start: totalStart, end: totalEnd }];
          for (const cut of cuts) {
            const nextSegments: Interval[] = [];
            for (const seg of segments) {
              if (cut.end <= seg.start || cut.start >= seg.end) {
                nextSegments.push(seg);
              } else {
                if (cut.start > seg.start) {
                  nextSegments.push({ start: seg.start, end: cut.start });
                }
                if (cut.end < seg.end) {
                  nextSegments.push({ start: cut.end, end: seg.end });
                }
              }
            }
            segments = nextSegments;
          }
          return segments;
        }

        const leftCuts: Interval[] = [];
        const rightCuts: Interval[] = [];
        const frontCuts: Interval[] = [];
        const backCuts: Interval[] = [];

        for (const h of heights) {
          if (h >= Heave) continue;

          // 1. FRONT WALL (z = -L/2) - Cut by main garage door (gate)
          frontCuts.length = 0;
          if (h < p.doorHeight) {
            frontCuts.push({ start: -p.doorWidth / 2, end: p.doorWidth / 2 });
          }
          const frontGirts = subtractIntervals(hxL, hxR, frontCuts);
          for (const seg of frontGirts) {
            out.push(
              <SteelTube
                key={`gF-${h}-${seg.start.toFixed(2)}`}
                from={[seg.start, h, -p.length / 2]}
                to={[seg.end, h, -p.length / 2]}
                size={gsz}
                thickness={th}
                color={col}
                wireframe={wf}
              />,
            );
          }

          // 2. BACK WALL (z = L/2) - Cut by personal door if on back
          backCuts.length = 0;
          if (p.personalDoorSide === "back" && p.hasPersonalDoor && h < 2.0) {
            backCuts.push({ start: -0.45, end: 0.45 });
          }
          const backGirts = subtractIntervals(hxL, hxR, backCuts);
          for (const seg of backGirts) {
            out.push(
              <SteelTube
                key={`gB-${h}-${seg.start.toFixed(2)}`}
                from={[seg.start, h, p.length / 2]}
                to={[seg.end, h, p.length / 2]}
                size={gsz}
                thickness={th}
                color={col}
                wireframe={wf}
              />,
            );
          }

          // 3. LEFT WALL (x = -W/2) - Cut by personal door or windows
          leftCuts.length = 0;
          if (p.personalDoorSide === "left" && p.hasPersonalDoor && h < 2.0) {
            leftCuts.push({ start: -L / 4 - 0.45, end: -L / 4 + 0.45 });
          }
          for (let wIdx = 0; wIdx < p.windowCount; wIdx++) {
            const t = (wIdx + 1) / (p.windowCount + 1);
            const cx = -L / 2 + t * L;
            const wHalf = p.windowWidth / 2;
            const winBottom = 1.6 - p.windowHeight / 2;
            const winTop = 1.6 + p.windowHeight / 2;
            if (h > winBottom && h < winTop) {
              leftCuts.push({ start: cx - wHalf, end: cx + wHalf });
            }
          }
          const leftGirts = subtractIntervals(-L / 2, L / 2, leftCuts);
          for (const seg of leftGirts) {
            out.push(
              <SteelTube
                key={`gL-${h}-${seg.start.toFixed(2)}`}
                from={[hxL, h, seg.start]}
                to={[hxL, h, seg.end]}
                size={gsz}
                thickness={th}
                color={col}
                wireframe={wf}
              />,
            );
          }

          // 4. RIGHT WALL (x = W/2) - Cut by personal door
          rightCuts.length = 0;
          if (p.personalDoorSide === "right" && p.hasPersonalDoor && h < 2.0) {
            rightCuts.push({ start: -L / 4 - 0.45, end: -L / 4 + 0.45 });
          }
          const rightGirts = subtractIntervals(-L / 2, L / 2, rightCuts);
          for (const seg of rightGirts) {
            out.push(
              <SteelTube
                key={`gR-${h}-${seg.start.toFixed(2)}`}
                from={[hxR, h, seg.start]}
                to={[hxR, h, seg.end]}
                size={gsz}
                thickness={th}
                color={col}
                wireframe={wf}
              />,
            );
          }
        }

        // 5. VERTICAL FRAMING POSTS AND HORIZONTAL LINTELS FOR OPENINGS
        const halfW = p.width / 2;
        const slopeAngle = Math.atan2(Hridge - Heave, halfW);
        const xDoor = p.doorWidth / 2;

        let y_left_post = Heave;
        let y_right_post = Heave;
        if (p.roofType === "gable") {
          const hSlope = Heave + (halfW - xDoor) * Math.tan(slopeAngle);
          y_left_post = hSlope;
          y_right_post = hSlope;
        } else {
          const angleShed = Math.atan2(Hhi - Heave, p.width);
          y_left_post = Heave + (-xDoor - hxL) * Math.tan(angleShed);
          y_right_post = Heave + (xDoor - hxL) * Math.tan(angleShed);
        }

        // Front Garage Door frame
        out.push(
          <SteelTube
            key="door-frame-L"
            from={[-p.doorWidth / 2, 0, -L / 2]}
            to={[-p.doorWidth / 2, y_left_post, -L / 2]}
            size={sz}
            thickness={th}
            color={col}
            wireframe={wf}
          />,
        );
        out.push(
          <SteelTube
            key="door-frame-R"
            from={[p.doorWidth / 2, 0, -L / 2]}
            to={[p.doorWidth / 2, y_right_post, -L / 2]}
            size={sz}
            thickness={th}
            color={col}
            wireframe={wf}
          />,
        );
        out.push(
          <SteelTube
            key="door-frame-top"
            from={[-p.doorWidth / 2, p.doorHeight, -L / 2]}
            to={[p.doorWidth / 2, p.doorHeight, -L / 2]}
            size={sz}
            thickness={th}
            color={col}
            wireframe={wf}
          />,
        );

        // Back Personal Door frame
        if (p.personalDoorSide === "back" && p.hasPersonalDoor) {
          const xDoorBack = 0.45;
          let y_back_L = Heave;
          let y_back_R = Heave;
          if (p.roofType === "gable") {
            const hSlope = Heave + (halfW - xDoorBack) * Math.tan(slopeAngle);
            y_back_L = hSlope;
            y_back_R = hSlope;
          } else {
            const angleShed = Math.atan2(Hhi - Heave, p.width);
            y_back_L = Heave + (-xDoorBack - hxL) * Math.tan(angleShed);
            y_back_R = Heave + (xDoorBack - hxL) * Math.tan(angleShed);
          }
          out.push(
            <SteelTube
              key="back-door-frame-L"
              from={[-xDoorBack, 0, L / 2]}
              to={[-xDoorBack, y_back_L, L / 2]}
              size={sz}
              thickness={th}
              color={col}
              wireframe={wf}
            />,
          );
          out.push(
            <SteelTube
              key="back-door-frame-R"
              from={[xDoorBack, 0, L / 2]}
              to={[xDoorBack, y_back_R, L / 2]}
              size={sz}
              thickness={th}
              color={col}
              wireframe={wf}
            />,
          );
          out.push(
            <SteelTube
              key="back-door-frame-top"
              from={[-xDoorBack, 2.0, L / 2]}
              to={[xDoorBack, 2.0, L / 2]}
              size={sz}
              thickness={th}
              color={col}
              wireframe={wf}
            />,
          );
        }

        // Left Personal Door frame
        if (p.personalDoorSide === "left" && p.hasPersonalDoor) {
          out.push(
            <SteelTube
              key="left-door-frame-L"
              from={[hxL, 0, -L / 4 - 0.45]}
              to={[hxL, Heave, -L / 4 - 0.45]}
              size={sz}
              thickness={th}
              color={col}
              wireframe={wf}
            />,
          );
          out.push(
            <SteelTube
              key="left-door-frame-R"
              from={[hxL, 0, -L / 4 + 0.45]}
              to={[hxL, Heave, -L / 4 + 0.45]}
              size={sz}
              thickness={th}
              color={col}
              wireframe={wf}
            />,
          );
          out.push(
            <SteelTube
              key="left-door-frame-top"
              from={[hxL, 2.0, -L / 4 - 0.45]}
              to={[hxL, 2.0, -L / 4 + 0.45]}
              size={sz}
              thickness={th}
              color={col}
              wireframe={wf}
            />,
          );
        }

        // Right Personal Door frame
        if (p.personalDoorSide === "right" && p.hasPersonalDoor) {
          const rH = p.roofType === "shed" ? Hhi : Heave;
          out.push(
            <SteelTube
              key="right-door-frame-L"
              from={[hxR, 0, -L / 4 - 0.45]}
              to={[hxR, rH, -L / 4 - 0.45]}
              size={sz}
              thickness={th}
              color={col}
              wireframe={wf}
            />,
          );
          out.push(
            <SteelTube
              key="right-door-frame-R"
              from={[hxR, 0, -L / 4 + 0.45]}
              to={[hxR, rH, -L / 4 + 0.45]}
              size={sz}
              thickness={th}
              color={col}
              wireframe={wf}
            />,
          );
          out.push(
            <SteelTube
              key="right-door-frame-top"
              from={[hxR, 2.0, -L / 4 - 0.45]}
              to={[hxR, 2.0, -L / 4 + 0.45]}
              size={sz}
              thickness={th}
              color={col}
              wireframe={wf}
            />,
          );
        }

        return out;
      })()}

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
          return (
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
          );
        })()}
    </group>
  );
}

export { ridgeHeight, highEave };
