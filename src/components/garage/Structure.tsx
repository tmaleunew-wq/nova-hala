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
  if (p.roofType === "cubic") {
    return p.clearHeight + 0.08;
  }
  return p.clearHeight + p.width * Math.tan((p.roofPitchDeg * Math.PI) / 180);
}

// Eave height on +X side (high side) for shed roof; equal H for gable
function highEave(p: GarageParams): number {
  if (p.roofType === "cubic") return p.clearHeight;
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
  const isBack = p.personalDoorPosition === "back";
  let base = 0;
  if (zs.length >= 3) {
    if (isBack) {
      base = (zs[zs.length - 2] + zs[zs.length - 1]) / 2;
    } else {
      base = (zs[0] + zs[1]) / 2;
    }
  } else {
    base = isBack ? p.length / 4 : -p.length / 4;
  }
  const rawZ = base + (p.personalDoorOffset ?? 0);
  const pDoorW = p.personalDoorWidth ?? 0.9;
  const margin = p.profileSize / 2 + pDoorW / 2 + 0.12;
  const minZ = -p.length / 2 + margin;
  const maxZ = p.length / 2 - margin;
  if (minZ >= maxZ) return 0;
  return Math.max(minZ, Math.min(maxZ, rawZ));
}

export function getFrontPersonalDoorX(p: GarageParams): number {
  const W = p.width;
  const pDoorW = p.personalDoorWidth ?? 0.9;
  const sz = p.profileSize ?? 0.08;
  const isDouble = Number(p.gateCount ?? 1) === 2;
  const maxSafeDoorW = isDouble ? Math.max(1.2, (W - 0.85) / 2) : Math.max(1.5, W - 0.5);
  const actualDW = Math.min(p.doorWidth ?? 2.5, maxSafeDoorW);
  const pDoorOff = p.personalDoorOffset ?? 0;
  const dLayout = isDouble ? getDoubleGateLayout(W, actualDW) : null;
  const gateLeftEdge = dLayout ? dLayout.leftCx - dLayout.actualDoorW / 2 : -actualDW / 2;
  const gateRightEdge = dLayout ? dLayout.rightCx + dLayout.actualDoorW / 2 : actualDW / 2;

  if (p.personalDoorSide === "front_left") {
    const minX = -W / 2 + sz / 2 + pDoorW / 2 + 0.10;
    const maxX = gateLeftEdge - sz / 2 - pDoorW / 2 - 0.10;
    if (minX >= maxX) return minX;
    const center = (minX + maxX) / 2;
    const rawX = center + pDoorOff;
    return Math.max(minX, Math.min(maxX, rawX));
  } else if (p.personalDoorSide === "front_right") {
    const minX = gateRightEdge + sz / 2 + pDoorW / 2 + 0.10;
    const maxX = W / 2 - sz / 2 - pDoorW / 2 - 0.10;
    if (minX >= maxX) return maxX;
    const center = (minX + maxX) / 2;
    const rawX = center + pDoorOff;
    return Math.max(minX, Math.min(maxX, rawX));
  }
  return 0;
}

export function getBackPersonalDoorX(p: GarageParams): number {
  const W = p.width;
  const pDoorW = p.personalDoorWidth ?? 0.9;
  const sz = p.profileSize ?? 0.08;
  const pDoorOff = p.personalDoorOffset ?? 0;

  if (p.hasBackDoor) {
    const backGateW = Math.min(p.doorWidth ?? 2.5, W - 1.0);
    const minX = backGateW / 2 + sz / 2 + pDoorW / 2 + 0.10;
    const maxX = W / 2 - sz / 2 - pDoorW / 2 - 0.10;
    if (minX >= maxX) return (W / 2 + backGateW / 2) / 2;
    const center = (minX + maxX) / 2;
    const rawX = center + pDoorOff;
    return Math.max(minX, Math.min(maxX, rawX));
  }
  const minX = -W / 2 + sz / 2 + pDoorW / 2 + 0.10;
  const maxX = W / 2 - sz / 2 - pDoorW / 2 - 0.10;
  const rawX = 0 + pDoorOff;
  return Math.max(minX, Math.min(maxX, rawX));
}

function computeWindowPositions(
  wallLength: number,
  profileSize: number,
  winCount: number,
  winWidth: number,
  winOffset: number,
  obstacles: Array<{ center: number; width: number }>,
  basePositions?: number[],
): number[] {
  if (winCount <= 0) return [];

  const margin = profileSize / 2 + winWidth / 2 + 0.12;
  const minBound = -wallLength / 2 + margin;
  const maxBound = wallLength / 2 - margin;
  if (minBound >= maxBound) return [0];

  // 1. Calculate forbidden intervals from obstacles (with safety clearance)
  const clearance = 0.18;
  const forbidden: Array<{ start: number; end: number }> = [];
  for (const obs of obstacles) {
    const halfObs = obs.width / 2;
    const halfWin = winWidth / 2;
    forbidden.push({
      start: obs.center - halfObs - halfWin - clearance,
      end: obs.center + halfObs + halfWin + clearance,
    });
  }

  // 2. Compute available segments by subtracting forbidden intervals from [minBound, maxBound]
  let segments: Array<{ start: number; end: number }> = [{ start: minBound, end: maxBound }];
  for (const f of forbidden) {
    const nextSegs: Array<{ start: number; end: number }> = [];
    for (const seg of segments) {
      if (f.end <= seg.start || f.start >= seg.end) {
        nextSegs.push(seg);
      } else {
        if (f.start > seg.start + 0.02) {
          nextSegs.push({ start: seg.start, end: f.start });
        }
        if (f.end < seg.end - 0.02) {
          nextSegs.push({ start: f.end, end: seg.end });
        }
      }
    }
    segments = nextSegs;
  }

  // If wall has no room anywhere (extreme rare case), fallback to minBound
  if (segments.length === 0) {
    return Array(winCount).fill(minBound);
  }

  // Helper to clamp a coordinate strictly into the nearest available segment
  const clampToAvailable = (val: number): number => {
    for (const seg of segments) {
      if (val >= seg.start && val <= seg.end) return val;
    }
    let closest = segments[0].start;
    let minDist = Infinity;
    for (const seg of segments) {
      const dStart = Math.abs(val - seg.start);
      if (dStart < minDist) {
        minDist = dStart;
        closest = seg.start;
      }
      const dEnd = Math.abs(val - seg.end);
      if (dEnd < minDist) {
        minDist = dEnd;
        closest = seg.end;
      }
    }
    return closest;
  };

  // 3. Initial raw coordinates
  const coords: number[] = [];
  for (let i = 0; i < winCount; i++) {
    const base = basePositions && basePositions[i] !== undefined
      ? basePositions[i]
      : -wallLength / 2 + ((i + 1) / (winCount + 1)) * wallLength;
    const raw = base + winOffset;
    coords.push(clampToAvailable(raw));
  }

  coords.sort((a, b) => a - b);

  // 4. Ensure separation between windows while strictly avoiding forbidden zones
  const minSpacing = winWidth + 0.15;
  for (let i = 1; i < coords.length; i++) {
    if (coords[i] - coords[i - 1] < minSpacing) {
      const candidate = coords[i - 1] + minSpacing;
      const clamped = clampToAvailable(candidate);
      if (clamped > coords[i - 1]) {
        coords[i] = clamped;
      } else {
        const prevCandidate = coords[i] - minSpacing;
        const prevClamped = clampToAvailable(prevCandidate);
        if (prevClamped < coords[i]) {
          coords[i - 1] = prevClamped;
        }
      }
    }
  }

  // Reverse pass to resolve any right-edge collisions
  for (let i = coords.length - 2; i >= 0; i--) {
    if (coords[i + 1] - coords[i] < minSpacing) {
      const candidate = coords[i + 1] - minSpacing;
      const clamped = clampToAvailable(candidate);
      if (clamped < coords[i + 1]) {
        coords[i] = clamped;
      }
    }
  }

  // Final check: every coordinate must be strictly clamped into an available segment
  return coords.sort((a, b) => a - b).map((c) => clampToAvailable(c));
}

export function getWindowCoords(p: any): number[] {
  const winCount = p.windowCount ?? 0;
  if (winCount <= 0) return [];

  const winW = p.windowWidth ?? 0.95;
  const sz = p.profileSize ?? 0.08;
  const off = p.windowOffset ?? 0;
  const side = p.windowSide;

  if (side === "back") {
    const W = p.width;
    const obstacles: Array<{ center: number; width: number }> = [];
    if (p.hasPersonalDoor && p.personalDoorSide === "back") {
      obstacles.push({
        center: getBackPersonalDoorX(p as GarageParams),
        width: p.personalDoorWidth ?? 0.9,
      });
    }
    if (p.hasBackDoor) {
      obstacles.push({
        center: 0,
        width: Math.min(p.doorWidth ?? 2.5, W - 1.0),
      });
    }
    return computeWindowPositions(W, sz, winCount, winW, off, obstacles);
  }

  // Left or Right wall
  const L = p.length;
  const obstacles: Array<{ center: number; width: number }> = [];
  if (p.hasPersonalDoor && p.personalDoorSide === side) {
    obstacles.push({
      center: getPersonalDoorZ(p as GarageParams),
      width: p.personalDoorWidth ?? 0.9,
    });
  }

  const frames = p.bayCount + 1;
  const frameZs: number[] = [];
  for (let i = 0; i < frames; i++) {
    frameZs.push(-L / 2 + (i / (frames - 1)) * L);
  }

  const basePositions: number[] = [];
  for (let i = 0; i < winCount; i++) {
    let bayIdx = 0;
    if (winCount <= p.bayCount) {
      bayIdx = Math.floor(((i + 0.5) / winCount) * p.bayCount);
    } else {
      bayIdx = i % p.bayCount;
    }
    basePositions.push((frameZs[bayIdx] + frameZs[bayIdx + 1]) / 2);
  }

  return computeWindowPositions(L, sz, winCount, winW, off, obstacles, basePositions);
}

export const getWindowZs = getWindowCoords;


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
        const pitchDeg = Math.max(2, Math.min(p.roofPitchDeg, 5));
        const drop = Math.tan((pitchDeg * Math.PI) / 180) * p.length;
        const tZ = (z - (-p.length / 2)) / p.length;
        const cubicRafterY = Heave - tZ * drop;
        const leftTop = p.roofType === "shed" ? HloShed : p.roofType === "cubic" ? cubicRafterY : Heave;
        const rightTop = p.roofType === "shed" ? Hhi : p.roofType === "cubic" ? cubicRafterY : Heave;
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
        if (p.roofType === "cubic") {
          const atticH = p.atticHeight ?? 0.35;
          const pitchDeg = Math.max(2, Math.min(p.roofPitchDeg, 5));
          const drop = Math.tan((pitchDeg * Math.PI) / 180) * p.length;
          const tZ = (z - (-p.length / 2)) / p.length;
          const rafterY = Heave - tZ * drop;
          return (
            <group key={`raf-${i}`}>
              <SteelTube
                from={[hxL, rafterY, z]}
                to={[hxR, rafterY, z]}
                size={sz}
                thickness={th}
                color={col}
                wireframe={wf}
              />
              {/* Attic parapet supports */}
              <SteelTube
                from={[hxL, rafterY, z]}
                to={[hxL, Heave + atticH, z]}
                size={sz * 0.8}
                thickness={th}
                color={col}
                wireframe={wf}
              />
              <SteelTube
                from={[hxR, rafterY, z]}
                to={[hxR, Heave + atticH, z]}
                size={sz * 0.8}
                thickness={th}
                color={col}
                wireframe={wf}
              />
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
        } else if (p.roofType === "cubic") {
          const atticH = p.atticHeight ?? 0.35;
          const topY = Heave + atticH;
          const pitchDeg = Math.max(2, Math.min(p.roofPitchDeg, 5));
          const drop = Math.tan((pitchDeg * Math.PI) / 180) * p.length;
          const purlinCount = Math.max(3, Math.round(p.width / 0.8));
          for (let i = 0; i <= purlinCount; i++) {
            const t = i / purlinCount;
            const x = hxL + t * p.width;
            purlins.push(
              <SteelTube
                key={`pr-cubic-${i}`}
                from={[x, Heave + sz / 2 + psz / 2, -p.length / 2]}
                to={[x, Heave - drop + sz / 2 + psz / 2, p.length / 2]}
                size={psz}
                thickness={th}
                color={col}
                wireframe={wf}
              />,
            );
          }
          // Obvodové horné nosníky atiky
          purlins.push(
            <SteelTube key="attic-top-L" from={[hxL, topY, -p.length / 2]} to={[hxL, topY, p.length / 2]} size={psz} thickness={th} color={col} wireframe={wf} />,
            <SteelTube key="attic-top-R" from={[hxR, topY, -p.length / 2]} to={[hxR, topY, p.length / 2]} size={psz} thickness={th} color={col} wireframe={wf} />,
            <SteelTube key="attic-top-front" from={[hxL, topY, -p.length / 2]} to={[hxR, topY, -p.length / 2]} size={psz} thickness={th} color={col} wireframe={wf} />,
            <SteelTube key="attic-top-back" from={[hxL, topY, p.length / 2]} to={[hxR, topY, p.length / 2]} size={psz} thickness={th} color={col} wireframe={wf} />,
          );
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
      {(() => {
        const pitchDeg = Math.max(2, Math.min(p.roofPitchDeg, 5));
        const drop = Math.tan((pitchDeg * Math.PI) / 180) * p.length;
        const eaveYEndL = p.roofType === "cubic" ? Heave - drop : Heave;
        const eaveYEndR = p.roofType === "cubic" ? Heave - drop : Hhi;
        return (
          <>
            <SteelTube
              from={[hxL, Heave, -p.length / 2]}
              to={[hxL, eaveYEndL, p.length / 2]}
              size={sz}
              thickness={th}
              color={col}
              wireframe={wf}
            />
            <SteelTube
              from={[hxR, p.roofType === "cubic" ? Heave : Hhi, -p.length / 2]}
              to={[hxR, eaveYEndR, p.length / 2]}
              size={sz}
              thickness={th}
              color={col}
              wireframe={wf}
            />
          </>
        );
      })()}

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
              ) : p.roofType === "shed" ? (
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
              ) : null}
            </>
          );
        })()}
    </group>
  );
}

export { ridgeHeight, highEave };
