import "@react-three/fiber";
import { useMemo } from "react";
import { SteelTube, SteelPlate } from "./SteelTube";
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
      {(() => {
        const out: React.ReactNode[] = [];
        const gsz = sz * 0.6;
        const L = p.length;

        const hallsCfg = getHallsConfig();
        const currentHall = p.hallType && p.hallType !== "Vlastný" ? hallsCfg[p.hallType] : null;
        const isTubularBraced = currentHall && (currentHall.name === "KD14" || currentHall.claddingVersion?.includes("BU"));
        const girtCount = isTubularBraced ? 1 : Math.max(3, Math.round(Heave / 1.15));
        const heights: number[] = [];
        if (isTubularBraced) {
          heights.push(Heave * 0.5);
        } else {
          for (let gi = 1; gi <= girtCount; gi++) {
            const gh = (gi / (girtCount + 0.35)) * Heave;
            if (gh < Heave - 0.2) heights.push(gh);
          }
        }
        const activeVer = currentHall?.versions?.find((v) => Math.abs(v.H - p.clearHeight) < 0.05) || currentHall?.versions?.[0];
        const halfW = p.width / 2;
        const pillarD = activeVer?.D ?? (p.width - p.doorWidth) / 2;
        const isShedHall = currentHall?.type === "shed";
        const hasThreeGablePosts = currentHall && (currentHall.name === "KD16" || currentHall.name === "KD18" || currentHall.name === "KD20");
        const x_L_post = isShedHall ? -p.doorWidth / 2 : -halfW + pillarD;
        const x_R_post = isShedHall ? p.doorWidth / 2 : halfW - pillarD;

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

          // 1. FRONT WALL (z = -L/2) - Cut by main gate opening between gable pillars
          if (!isTubularBraced) {
            frontCuts.length = 0;
            if (h < p.doorHeight) {
              frontCuts.push({ start: x_L_post, end: x_R_post });
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
          }

          // 2. BACK WALL (z = L/2) - Cut by personal door if on back or windows if on back
          backCuts.length = 0;
          if (p.personalDoorSide === "back" && p.hasPersonalDoor && h < 2.0) {
            backCuts.push({ start: -0.45, end: 0.45 });
          }
          if (p.hasWindows && p.windowSide === "back" && p.windowCount > 0) {
            const winXs = getWindowCoords(p);
            for (const winX of winXs) {
              const wHalf = p.windowWidth / 2;
              const winBottom = 1.6 - p.windowHeight / 2;
              const winTop = 1.6 + p.windowHeight / 2;
              if (h > winBottom && h < winTop) {
                backCuts.push({ start: winX - wHalf, end: winX + wHalf });
              }
            }
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
            const doorZ = getPersonalDoorZ(p);
            leftCuts.push({ start: doorZ - 0.45, end: doorZ + 0.45 });
          }
          if (p.hasWindows && p.windowSide === "left" && p.windowCount > 0) {
            const winZs = getWindowCoords(p);
            for (const winZ of winZs) {
              const wHalf = p.windowWidth / 2;
              const winBottom = 1.6 - p.windowHeight / 2;
              const winTop = 1.6 + p.windowHeight / 2;
              if (h > winBottom && h < winTop) {
                leftCuts.push({ start: winZ - wHalf, end: winZ + wHalf });
              }
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

          // 4. RIGHT WALL (x = W/2) - Cut by personal door or windows
          rightCuts.length = 0;
          if (p.personalDoorSide === "right" && p.hasPersonalDoor && h < 2.0) {
            const doorZ = getPersonalDoorZ(p);
            rightCuts.push({ start: doorZ - 0.45, end: doorZ + 0.45 });
          }
          if (p.hasWindows && p.windowSide === "right" && p.windowCount > 0) {
            const winZs = getWindowCoords(p);
            for (const winZ of winZs) {
              const wHalf = p.windowWidth / 2;
              const winBottom = 1.6 - p.windowHeight / 2;
              const winTop = 1.6 + p.windowHeight / 2;
              if (h > winBottom && h < winTop) {
                rightCuts.push({ start: winZ - wHalf, end: winZ + wHalf });
              }
            }
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

        // 5. GABLE PILLARS (štítové stĺpy) AND OPENING FRAMING
        const slopeAngle = Math.atan2(Hridge - Heave, halfW);

        let y_left_post = Heave;
        let y_right_post = Heave;
        if (p.roofType === "gable") {
          y_left_post = Heave + (halfW - Math.abs(x_L_post)) * Math.tan(slopeAngle);
          y_right_post = Heave + (halfW - Math.abs(x_R_post)) * Math.tan(slopeAngle);
        } else {
          const angleShed = Math.atan2(Hhi - Heave, p.width);
          y_left_post = Heave + (x_L_post - hxL) * Math.tan(angleShed);
          y_right_post = Heave + (x_R_post - hxL) * Math.tan(angleShed);
        }

        // Front Gable Pillars (štítové stĺpy predné)
        out.push(
          <SteelTube
            key="gable-post-front-L"
            from={[x_L_post, 0, -L / 2]}
            to={[x_L_post, y_left_post, -L / 2]}
            size={sz}
            thickness={th}
            color={col}
            wireframe={wf}
          />,
        );
        out.push(
          <SteelPlate
            key="gable-plate-front-L"
            position={[x_L_post, 0.006, -L / 2]}
            size={[sz * 2.2, 0.012, sz * 2.2]}
            color={col}
            wireframe={wf}
          />,
        );
        out.push(
          <SteelTube
            key="gable-post-front-R"
            from={[x_R_post, 0, -L / 2]}
            to={[x_R_post, y_right_post, -L / 2]}
            size={sz}
            thickness={th}
            color={col}
            wireframe={wf}
          />,
        );
        out.push(
          <SteelPlate
            key="gable-plate-front-R"
            position={[x_R_post, 0.006, -L / 2]}
            size={[sz * 2.2, 0.012, sz * 2.2]}
            color={col}
            wireframe={wf}
          />,
        );
        if (p.doorHeight > 0 && !isTubularBraced) {
          const doorTop = Math.min(p.doorHeight, y_left_post - 0.2);
          out.push(
            <SteelTube
              key="door-frame-top"
              from={[x_L_post, doorTop, -L / 2]}
              to={[x_R_post, doorTop, -L / 2]}
              size={sz}
              thickness={th}
              color={col}
              wireframe={wf}
            />,
          );
          if (!currentHall && p.roofType === "gable" && Hridge > doorTop) {
            out.push(
              <SteelTube
                key="door-frame-ridge-strut"
                from={[0, doorTop, -L / 2]}
                to={[0, Hridge, -L / 2]}
                size={sz}
                thickness={th}
                color={col}
                wireframe={wf}
              />,
            );
          }
        }

        // Back Gable Pillars (štítové stĺpy zadné - presne podľa PDF)
        out.push(
          <SteelTube
            key="gable-post-back-L"
            from={[x_L_post, 0, L / 2]}
            to={[x_L_post, y_left_post, L / 2]}
            size={sz}
            thickness={th}
            color={col}
            wireframe={wf}
          />,
        );
        out.push(
          <SteelPlate
            key="gable-plate-back-L"
            position={[x_L_post, 0.006, L / 2]}
            size={[sz * 2.2, 0.012, sz * 2.2]}
            color={col}
            wireframe={wf}
          />,
        );
        out.push(
          <SteelTube
            key="gable-post-back-R"
            from={[x_R_post, 0, L / 2]}
            to={[x_R_post, y_right_post, L / 2]}
            size={sz}
            thickness={th}
            color={col}
            wireframe={wf}
          />,
        );
        out.push(
          <SteelPlate
            key="gable-plate-back-R"
            position={[x_R_post, 0.006, L / 2]}
            size={[sz * 2.2, 0.012, sz * 2.2]}
            color={col}
            wireframe={wf}
          />,
        );

        if (hasThreeGablePosts) {
          const y_center = p.roofType === "gable" ? Hridge : Heave + (-hxL) * Math.tan(Math.atan2(Hhi - Heave, p.width));
          // Predný stredový stĺp: iba ak na prednej stene nie je aktívny otvor brány
          if (p.doorHeight === 0 || !p.doorWidth) {
            out.push(
              <SteelTube
                key="gable-post-front-C"
                from={[0, 0, -L / 2]}
                to={[0, y_center, -L / 2]}
                size={sz}
                thickness={th}
                color={col}
                wireframe={wf}
              />,
              <SteelPlate
                key="gable-plate-front-C"
                position={[0, 0.006, -L / 2]}
                size={[sz * 2.2, 0.012, sz * 2.2]}
                color={col}
                wireframe={wf}
              />,
            );
          }
          out.push(
            <SteelTube
              key="gable-post-back-C"
              from={[0, 0, L / 2]}
              to={[0, y_center, L / 2]}
              size={sz}
              thickness={th}
              color={col}
              wireframe={wf}
            />,
            <SteelPlate
              key="gable-plate-back-C"
              position={[0, 0.006, L / 2]}
              size={[sz * 2.2, 0.012, sz * 2.2]}
              color={col}
              wireframe={wf}
            />,
          );
        }

        // Štítové krížové zavetrovania v krajných poliach (presne podľa výkresu a renderu KD14, KD16, KD18, KD20)
        const hasGableBracing = currentHall && (currentHall.name === "KD14" || currentHall.name === "KD16" || currentHall.name === "KD18" || currentHall.name === "KD20");
        if (hasGableBracing) {
          const bsz = sz * 0.45;
          out.push(
            // Predné čelo: ľavé krajné pole
            <SteelTube key="gX-FL1" from={[hxL, 0.1, -L / 2]} to={[x_L_post, y_left_post - 0.2, -L / 2]} size={bsz} thickness={th} color={col} wireframe={wf} />,
            <SteelTube key="gX-FL2" from={[hxL, Heave - 0.2, -L / 2]} to={[x_L_post, 0.1, -L / 2]} size={bsz} thickness={th} color={col} wireframe={wf} />,
            // Predné čelo: pravé krajné pole
            <SteelTube key="gX-FR1" from={[x_R_post, 0.1, -L / 2]} to={[hxR, Heave - 0.2, -L / 2]} size={bsz} thickness={th} color={col} wireframe={wf} />,
            <SteelTube key="gX-FR2" from={[x_R_post, y_right_post - 0.2, -L / 2]} to={[hxR, 0.1, -L / 2]} size={bsz} thickness={th} color={col} wireframe={wf} />,
            // Zadné čelo: ľavé krajné pole
            <SteelTube key="gX-BL1" from={[hxL, 0.1, L / 2]} to={[x_L_post, y_left_post - 0.2, L / 2]} size={bsz} thickness={th} color={col} wireframe={wf} />,
            <SteelTube key="gX-BL2" from={[hxL, Heave - 0.2, L / 2]} to={[x_L_post, 0.1, L / 2]} size={bsz} thickness={th} color={col} wireframe={wf} />,
            // Zadné čelo: pravé krajné pole
            <SteelTube key="gX-BR1" from={[x_R_post, 0.1, L / 2]} to={[hxR, Heave - 0.2, L / 2]} size={bsz} thickness={th} color={col} wireframe={wf} />,
            <SteelTube key="gX-BR2" from={[x_R_post, y_right_post - 0.2, L / 2]} to={[hxR, 0.1, L / 2]} size={bsz} thickness={th} color={col} wireframe={wf} />,
          );
          if (currentHall?.name === "KD14") {
            out.push(
              // Zadné čelo: stredné pole
              <SteelTube key="gX-BC1" from={[x_L_post, 0.1, L / 2]} to={[x_R_post, y_right_post - 0.2, L / 2]} size={bsz} thickness={th} color={col} wireframe={wf} />,
              <SteelTube key="gX-BC2" from={[x_L_post, y_left_post - 0.2, L / 2]} to={[x_R_post, 0.1, L / 2]} size={bsz} thickness={th} color={col} wireframe={wf} />,
            );
          }
        }

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
          const doorZ = getPersonalDoorZ(p);
          out.push(
            <SteelTube
              key="left-door-frame-L"
              from={[hxL, 0, doorZ - 0.45]}
              to={[hxL, Heave, doorZ - 0.45]}
              size={sz}
              thickness={th}
              color={col}
              wireframe={wf}
            />,
          );
          out.push(
            <SteelTube
              key="left-door-frame-R"
              from={[hxL, 0, doorZ + 0.45]}
              to={[hxL, Heave, doorZ + 0.45]}
              size={sz}
              thickness={th}
              color={col}
              wireframe={wf}
            />,
          );
          out.push(
            <SteelTube
              key="left-door-frame-top"
              from={[hxL, 2.0, doorZ - 0.45]}
              to={[hxL, 2.0, doorZ + 0.45]}
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
          const doorZ = getPersonalDoorZ(p);
          out.push(
            <SteelTube
              key="right-door-frame-L"
              from={[hxR, 0, doorZ - 0.45]}
              to={[hxR, rH, doorZ - 0.45]}
              size={sz}
              thickness={th}
              color={col}
              wireframe={wf}
            />,
          );
          out.push(
            <SteelTube
              key="right-door-frame-R"
              from={[hxR, 0, doorZ + 0.45]}
              to={[hxR, rH, doorZ + 0.45]}
              size={sz}
              thickness={th}
              color={col}
              wireframe={wf}
            />,
          );
          out.push(
            <SteelTube
              key="right-door-frame-top"
              from={[hxR, 2.0, doorZ - 0.45]}
              to={[hxR, 2.0, doorZ + 0.45]}
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
