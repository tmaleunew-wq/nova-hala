import React from "react";
import type { GarageParams } from "@/lib/garage/types";
import { getHallsConfig } from "@/lib/garage/configHelper";
import { SteelTube, SteelPlate } from "./SteelTube";
import { getPersonalDoorZ, getWindowCoords, getDoubleGateLayout } from "./Structure";

interface WallFramingProps {
  p: GarageParams;
  Heave: number;
  Hridge: number;
  Hhi: number;
  sz: number;
  th: number;
  col: string;
  wf: boolean;
  hxL: number;
  hxR: number;
}

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

export function WallFraming({
  p,
  Heave,
  Hridge,
  Hhi,
  sz,
  th,
  col,
  wf,
  hxL,
  hxR,
}: WallFramingProps) {
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
  const isDouble = Number(p.gateCount ?? 1) === 2;
  const maxSafeDoorW = isDouble
    ? Math.max(1.2, (p.width - 0.85) / 2)
    : Math.max(1.5, p.width - 0.5);
  const actualDW = Math.min(p.doorWidth, maxSafeDoorW);
  const actualDH = Math.min(p.doorHeight, Math.max(1.8, Heave - 0.2));

  const pillarD = activeVer?.D ?? (p.width - actualDW) / 2;
  const isShedHall = currentHall?.type === "shed";
  const hasThreeGablePosts = currentHall && (currentHall.name === "KD16" || currentHall.name === "KD18" || currentHall.name === "KD20");
  const x_L_post = isShedHall ? -actualDW / 2 : -halfW + pillarD;
  const x_R_post = isShedHall ? actualDW / 2 : halfW - pillarD;

  const leftCuts: Interval[] = [];
  const rightCuts: Interval[] = [];
  const frontCuts: Interval[] = [];
  const backCuts: Interval[] = [];

  for (const h of heights) {
    if (h >= Heave) continue;

    // 1. FRONT WALL (z = -L/2) - Cut by main gate opening between gable pillars
    if (!isTubularBraced) {
      frontCuts.length = 0;
      if (h < actualDH) {
        if (isDouble) {
          const dLayout = getDoubleGateLayout(p.width, actualDW);
          const halfDoor = dLayout.actualDoorW / 2;
          frontCuts.push({ start: dLayout.leftCx - halfDoor, end: dLayout.leftCx + halfDoor });
          frontCuts.push({ start: dLayout.rightCx - halfDoor, end: dLayout.rightCx + halfDoor });
        } else {
          frontCuts.push({ start: x_L_post, end: x_R_post });
        }
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

    // 2. BACK WALL (z = L/2) - Cut by personal door if on back or windows if on back or back gate
    backCuts.length = 0;
    if (p.hasBackDoor && h < p.doorHeight) {
      backCuts.push({ start: -p.doorWidth / 2, end: p.doorWidth / 2 });
    }
    if (p.personalDoorSide === "back" && p.hasPersonalDoor && h < 2.0) {
      backCuts.push({ start: p.hasBackDoor ? p.width / 4 - 0.45 : -0.45, end: p.hasBackDoor ? p.width / 4 + 0.45 : 0.45 });
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

  const dLayout = isDouble ? getDoubleGateLayout(p.width, actualDW) : null;
  const halfDoor = dLayout ? dLayout.actualDoorW / 2 : 0;

  const getPostY = (x: number) => {
    if (p.roofType === "gable") {
      return Heave + (halfW - Math.abs(x)) * Math.tan(slopeAngle);
    }
    const angleShed = Math.atan2(Hhi - Heave, p.width);
    return Heave + (x - hxL) * Math.tan(angleShed);
  };

  const frontPostXs = isDouble && dLayout
    ? [dLayout.leftCx - halfDoor, dLayout.leftCx + halfDoor, dLayout.rightCx - halfDoor, dLayout.rightCx + halfDoor]
    : [x_L_post, x_R_post];

  // Front Gable Pillars (štítové stĺpy predné)
  frontPostXs.forEach((xPos, idx) => {
    const yTop = getPostY(xPos);
    out.push(
      <SteelTube
        key={`gable-post-front-${idx}`}
        from={[xPos, 0, -L / 2]}
        to={[xPos, yTop, -L / 2]}
        size={sz}
        thickness={th}
        color={col}
        wireframe={wf}
      />,
    );
    out.push(
      <SteelPlate
        key={`gable-plate-front-${idx}`}
        position={[xPos, 0.006, -L / 2]}
        size={[sz * 2.2, 0.012, sz * 2.2]}
        color={col}
        wireframe={wf}
      />,
    );
  });

  if (p.doorHeight > 0 && !isTubularBraced) {
    if (isDouble && dLayout) {
      const doorTopL = Math.min(p.doorHeight, getPostY(dLayout.leftCx) - 0.2);
      const doorTopR = Math.min(p.doorHeight, getPostY(dLayout.rightCx) - 0.2);
      out.push(
        <SteelTube
          key="door-frame-top-L"
          from={[dLayout.leftCx - halfDoor, doorTopL, -L / 2]}
          to={[dLayout.leftCx + halfDoor, doorTopL, -L / 2]}
          size={sz}
          thickness={th}
          color={col}
          wireframe={wf}
        />,
      );
      out.push(
        <SteelTube
          key="door-frame-top-R"
          from={[dLayout.rightCx - halfDoor, doorTopR, -L / 2]}
          to={[dLayout.rightCx + halfDoor, doorTopR, -L / 2]}
          size={sz}
          thickness={th}
          color={col}
          wireframe={wf}
        />,
      );
    } else {
      const doorTop = Math.min(actualDH, y_left_post - 0.2);
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
  }

  // Back Gable Pillars (štítové stĺpy zadné)
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

  // Štítové krížové zavetrovania v krajných poliach
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
        to={[-xDoorBack, Math.min(2.0, y_back_L), L / 2]}
        size={sz}
        thickness={th}
        color={col}
        wireframe={wf}
      />,
      <SteelTube
        key="back-door-frame-R"
        from={[xDoorBack, 0, L / 2]}
        to={[xDoorBack, Math.min(2.0, y_back_R), L / 2]}
        size={sz}
        thickness={th}
        color={col}
        wireframe={wf}
      />,
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

  // Left Wall Personal Door frame
  if (p.personalDoorSide === "left" && p.hasPersonalDoor) {
    const doorZ = getPersonalDoorZ(p);
    out.push(
      <SteelTube
        key="left-door-frame-L"
        from={[hxL, 0, doorZ - 0.45]}
        to={[hxL, 2.0, doorZ - 0.45]}
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
        to={[hxL, 2.0, doorZ + 0.45]}
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

  // Right Wall Personal Door frame
  if (p.personalDoorSide === "right" && p.hasPersonalDoor) {
    const doorZ = getPersonalDoorZ(p);
    out.push(
      <SteelTube
        key="right-door-frame-L"
        from={[hxR, 0, doorZ - 0.45]}
        to={[hxR, 2.0, doorZ - 0.45]}
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
        to={[hxR, 2.0, doorZ + 0.45]}
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

  return <>{out}</>;
}
