import "@react-three/fiber";
import { useMemo } from "react";
import type { GarageParams } from "@/lib/garage/types";
import { HallGroundDetails } from "./HallGroundDetails";
import { getDoubleGateLayout } from "./Structure";
import { getHallEnvironmentConfig } from "@/lib/garage/configHelper";
import type { SphereGeometry } from "three";

function shapeTreeCrown(geometry: SphereGeometry) {
  const positions = geometry.getAttribute("position");
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
    const length = Math.hypot(x, y, z);
    const nx = x / length, ny = y / length, nz = z / length;
    const radius = geometry.parameters.radius * (1
      + 0.1 * Math.sin(nx * 11 + ny * 3) * Math.cos(nz * 9 - ny * 4)
      + 0.045 * Math.sin(ny * 19 + nz * 7 + nx * 5));
    positions.setXYZ(i, nx * radius, ny * radius, nz * radius);
  }
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
}

/**
 * Okolie haly (trávnik, príjazd, plot, stromy).
 * - Je úplne oddelené od konfigurátora: nečíta ani nemení parametre, len sa prispôsobuje
 *   pôdorysu haly (šírka/dĺžka/šírka brány).
 * - Žiadny prvok nie je klikateľný (raycast vypnutý), nezasahuje do panelov ani kót.
 * - Nenachádza sa v exportnej skupine, takže ho export modelu neobsahuje.
 */
const noRaycast = () => null;

// deterministický pseudo-random, aby stromy nelietali pri každom renderi
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function Environment({ p, clientName }: { p: Pick<GarageParams, "width" | "length" | "doorWidth" | "gateCount">; clientName?: string }) {
  const W = p.width;
  const L = p.length;
  const halfW = W / 2;
  const halfL = L / 2;
  const config = getHallEnvironmentConfig(clientName);
  const doubleGate = Number(p.gateCount ?? 1) === 2 ? getDoubleGateLayout(W, p.doorWidth) : null;
  const gateSpan = doubleGate
    ? doubleGate.rightCx - doubleGate.leftCx + doubleGate.actualDoorW
    : Math.min(p.doorWidth, Math.max(1.5, W - 0.5));

  // Okraj pozemku okolo haly (mimo kót A/B/C, ktoré siahajú do ~2.6 m od haly)
  const margin = Math.max(7, Math.min(12, Math.max(W, L) * 0.45));
  const plotW = W + margin * 2;
  const plotL = L + margin * 2;
  const driveW = Math.max(gateSpan + 3, 5);
  const driveLen = margin + 6;

  const trees = useMemo(() => {
    const rand = rng(config.treeSeed);
    const out: { x: number; z: number; h: number; r: number; tone: number }[] = [];
    const count = Math.round(14 + (W + L) / 4);
    let guard = 0;
    while (out.length < count && guard++ < 400) {
      // vzdialenosť od haly: za plotom, aby stromy nikdy neprekrývali halu ani kóty
      const side = Math.floor(rand() * 4);
      const out1 = margin + 2 + rand() * 9;
      let x: number;
      let z: number;
      if (side === 0) { x = (rand() * 2 - 1) * (halfW + out1); z = halfL + out1; }
      else if (side === 1) { x = (rand() * 2 - 1) * (halfW + out1); z = -(halfL + out1); }
      else if (side === 2) { x = halfW + out1; z = (rand() * 2 - 1) * (halfL + out1); }
      else { x = -(halfW + out1); z = (rand() * 2 - 1) * (halfL + out1); }
      // nechaj voľný príjazd pred bránou
      if (side === 1) {
        x = (x < 0 ? -1 : 1) * (driveW / 2 + 2 + Math.abs(x));
      }
      out.push({ x, z, h: 3.2 + rand() * 3, r: 1.1 + rand() * 0.9, tone: rand() });
    }
    return out;
  }, [W, L, halfW, halfL, margin, driveW, config.treeSeed]);

  const fenceH = 1.1;
  const postStep = 3;
  const fx = plotW / 2 - 0.5;
  const fz = plotL / 2 - 0.5;

  const fence = useMemo(() => {
    const posts: [number, number][] = [];
    for (let x = -fx; x <= fx + 0.01; x += postStep) {
      if (Math.abs(x) >= driveW / 2) posts.push([x, -fz]);
      posts.push([x, fz]);
    }
    for (let z = -fz + postStep; z < fz - 0.01; z += postStep) {
      posts.push([-fx, z], [fx, z]);
    }
    // Anchor corners and both entrance ends, without overlapping nearby posts.
    for (const [x, z] of [
      [-fx, -fz], [fx, -fz], [-fx, fz], [fx, fz],
      [-driveW / 2, -fz], [driveW / 2, -fz],
    ]) {
      for (let i = posts.length - 1; i >= 0; i--) {
        if (Math.hypot(posts[i][0] - x, posts[i][1] - z) < 0.16) posts.splice(i, 1);
      }
      posts.push([x, z]);
    }
    return posts;
  }, [fx, fz, driveW]);

  const frontSegW = fx - driveW / 2;

  return (
    <group name="environment">
      <HallGroundDetails width={W} length={L} plotWidth={plotW} plotLength={plotL}
        driveWidth={driveW} driveLength={driveLen} clientName={clientName} />
      {/* Trávnik */}
      <mesh position={[0, -0.185, 0]} raycast={noRaycast} receiveShadow>
        <boxGeometry args={[plotW + 40, 0.02, plotL + 40]} />
        <meshStandardMaterial color="#8fae7e" roughness={1} />
      </mesh>
      {/* Spevnená plocha okolo haly */}
      <mesh position={[0, -0.172, 0]} raycast={noRaycast} receiveShadow>
        <boxGeometry args={[W + 3, 0.02, L + 3]} />
        <meshStandardMaterial color="#b9bcc2" roughness={0.95} />
      </mesh>
      {/* Príjazd k bráne (-Z strana, kde je brána) */}
      <mesh position={[0, -0.168, -halfL - driveLen / 2 - 1.5]} raycast={noRaycast} receiveShadow>
        <boxGeometry args={[driveW, 0.02, driveLen]} />
        <meshStandardMaterial color="#9a9da4" roughness={0.9} />
      </mesh>

      {/* Plot s otvorom pre príjazd */}
      {fence.map(([x, z], i) => (
        <mesh key={`fp-${i}`} position={[x, fenceH / 2 - 0.18, z]} raycast={noRaycast}>
          <boxGeometry args={[0.08, fenceH, 0.08]} />
          <meshStandardMaterial color="#6b7078" metalness={0.5} roughness={0.5} />
        </mesh>
      ))}
      {[fenceH * 0.25, fenceH * 0.8].map((y) => (
        <group key={`rail-${y}`}>
          <mesh position={[0, y - 0.18, fz]} raycast={noRaycast}>
            <boxGeometry args={[plotW - 1, 0.04, 0.04]} />
            <meshStandardMaterial color="#8a8f97" metalness={0.5} roughness={0.5} />
          </mesh>
          <mesh position={[-fx, y - 0.18, 0]} raycast={noRaycast}>
            <boxGeometry args={[0.04, 0.04, plotL - 1]} />
            <meshStandardMaterial color="#8a8f97" metalness={0.5} roughness={0.5} />
          </mesh>
          <mesh position={[fx, y - 0.18, 0]} raycast={noRaycast}>
            <boxGeometry args={[0.04, 0.04, plotL - 1]} />
            <meshStandardMaterial color="#8a8f97" metalness={0.5} roughness={0.5} />
          </mesh>
          {frontSegW > 0 && (
            <>
              <mesh position={[-(driveW / 2 + frontSegW / 2), y - 0.18, -fz]} raycast={noRaycast}>
                <boxGeometry args={[frontSegW, 0.04, 0.04]} />
                <meshStandardMaterial color="#8a8f97" metalness={0.5} roughness={0.5} />
              </mesh>
              <mesh position={[driveW / 2 + frontSegW / 2, y - 0.18, -fz]} raycast={noRaycast}>
                <boxGeometry args={[frontSegW, 0.04, 0.04]} />
                <meshStandardMaterial color="#8a8f97" metalness={0.5} roughness={0.5} />
              </mesh>
            </>
          )}
        </group>
      ))}

      {/* Stromy s prirodzenou listnatou korunou (obláčikový cluster gúľ namiesto kužeľov) */}
      {trees.map((t, i) => {
        const foliageColor = t.tone > 0.6 ? "#4d7844" : t.tone > 0.3 ? "#5b844e" : "#3f663a";
        const foliageHighlight = t.tone > 0.6 ? "#5a884f" : "#4a733e";
        const trunkH = t.h * 0.42;
        const slender = t.tone > 0.6;
        return (
          <group key={`tree-${i}`} position={[t.x, -0.18, t.z]}>
            {[1, -1].map((side) => (
              <mesh key={`branch-${side}`} position={[side * 0.18, trunkH * 0.92, 0]}
                rotation={[side * 0.18, t.tone * Math.PI, -side * 0.45]}
                raycast={noRaycast} castShadow>
                <cylinderGeometry args={[0.025, 0.07, trunkH * 0.7, 6]} />
                <meshStandardMaterial color="#5a4232" roughness={0.95} />
              </mesh>
            ))}
            {/* Kmeň stromu */}
            <mesh position={[0, trunkH / 2, 0]} raycast={noRaycast} castShadow>
              <cylinderGeometry args={[0.1, 0.16, trunkH, 7]} />
              <meshStandardMaterial color="#5a4232" roughness={0.95} />
            </mesh>
            {/* Hlavná centrálna koruna */}
            <mesh position={[0, trunkH + t.r * 0.65, 0]} raycast={noRaycast} castShadow
              scale={[slender ? 0.72 : 1.05, slender ? 1.3 : 0.85, 0.82]}
              rotation={[0.08, t.tone * Math.PI * 2, -0.12]}>
              <sphereGeometry args={[t.r, 24, 18]} onUpdate={shapeTreeCrown} />
              <meshStandardMaterial color={foliageColor} roughness={0.88} />
            </mesh>
            {/* Horný zhluk lístia */}
            <mesh position={[t.r * 0.18, trunkH + t.r * 1.15, t.r * 0.12]} raycast={noRaycast} castShadow
              scale={[0.78, slender ? 1.2 : 0.9, 0.9]} rotation={[0.2, t.tone * 4, 0.18]}>
              <sphereGeometry args={[t.r * 0.68, 20, 14]} onUpdate={shapeTreeCrown} />
              <meshStandardMaterial color={foliageHighlight} roughness={0.88} />
            </mesh>
            {/* Bočný zhluk lístia */}
            <mesh position={[-t.r * 0.35, trunkH + t.r * 0.6, -t.r * 0.2]} raycast={noRaycast} castShadow
              scale={[1.1, 0.72, 0.85]} rotation={[0.15, t.tone * 5, -0.25]}>
              <sphereGeometry args={[t.r * 0.6, 20, 14]} onUpdate={shapeTreeCrown} />
              <meshStandardMaterial color={foliageColor} roughness={0.9} />
            </mesh>
            <mesh position={[t.r * 0.48, trunkH + t.r * 0.46, t.r * 0.28]}
              scale={[0.85, 0.7, 1]} rotation={[0, t.tone * 6, 0.25]} raycast={noRaycast} castShadow>
              <sphereGeometry args={[t.r * 0.57, 20, 14]} onUpdate={shapeTreeCrown} />
              <meshStandardMaterial color={foliageColor} roughness={0.95} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
