import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { getHallEnvironmentConfig } from "@/lib/garage/configHelper";

const noRaycast = () => null;
type Point = [number, number];

// World-space UVs keep the grain and concrete joints at the same scale for every hall.
function surfaceTexture(kind: "grass" | "concrete" | "asphalt", tileSize: number) {
  const size = 256;
  const data = new Uint8Array(size * size * 4);
  let seed = 721;
  for (let i = 0; i < data.length; i += 4) {
    seed = (seed * 16807) % 2147483647;
    const shade = 235 + Math.round((seed / 2147483647 - 0.5) * (kind === "grass" ? 34 : 22));
    data[i] = data[i + 1] = data[i + 2] = shade;
    data[i + 3] = 255;
  }
  if (kind === "concrete") {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (x < 1 || y < 1) {
          const i = (y * size + x) * 4;
          data[i] = data[i + 1] = data[i + 2] = 178;
        }
      }
    }
  }
  const texture = new THREE.DataTexture(data, size, size);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = 4;
  texture.repeat.set(1 / tileSize, 1 / tileSize);
  texture.needsUpdate = true;
  return texture;
}

function Surface({ points, y, color, texture }: {
  points: Point[]; y: number; color: string; texture: THREE.Texture;
}) {
  const shape = useMemo(() => new THREE.Shape(points.map(([x, z]) => new THREE.Vector2(x, -z))), [points]);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]} receiveShadow raycast={noRaycast}>
      <shapeGeometry args={[shape]} />
      <meshStandardMaterial color={color} map={texture} roughness={0.96} />
    </mesh>
  );
}

export function HallGroundDetails({ width: W, length: L, plotWidth, plotLength, driveWidth, driveLength, clientName }: {
  width: number; length: number; plotWidth: number; plotLength: number;
  driveWidth: number; driveLength: number; clientName?: string;
}) {
  const config = getHallEnvironmentConfig(clientName);
  const textures = useMemo(() => ({
    grass: surfaceTexture("grass", 5),
    concrete: surfaceTexture("concrete", Math.max(0.5, config.concreteTileSize)),
    asphalt: surfaceTexture("asphalt", 2),
  }), [config.concreteTileSize]);
  useEffect(() => () => Object.values(textures).forEach((texture) => texture.dispose()), [textures]);

  const halfW = (W + 3) / 2;
  const back = (L + 3) / 2;
  const front = -back;
  const margin = (plotLength - L) / 2;
  const transition = Math.max(0.3, Math.min(config.transitionLength, margin / 3));
  const apronDepth = Math.max(0.5, Math.min(config.apronDepth, margin - 2.2 - transition));
  const apronEnd = front - apronDepth;
  const taperEnd = apronEnd - transition;
  const roadEnd = front - driveLength;
  const roadHalfW = driveWidth / 2;
  const apronHalfW = Math.max(halfW, roadHalfW);
  const curbWidth = Math.max(0.05, config.curbWidth);
  const curbHeight = Math.max(0.02, config.curbHeight);

  const concrete: Point[] = [[-halfW, front], [halfW, front], [halfW, back], [-halfW, back]];
  const asphalt: Point[] = [
    [-apronHalfW, front], [apronHalfW, front], [apronHalfW, apronEnd],
    [roadHalfW, taperEnd], [roadHalfW, roadEnd], [-roadHalfW, roadEnd],
    [-roadHalfW, taperEnd], [-apronHalfW, apronEnd],
  ];
  // Leave the entrance open; curbs follow the outside boundary of the paved area.
  const edge: Point[] = [
    [-roadHalfW, roadEnd], [-roadHalfW, taperEnd], [-apronHalfW, apronEnd],
    [-apronHalfW, front], [-halfW, front], [-halfW, back],
    [halfW, back], [halfW, front], [apronHalfW, front],
    [apronHalfW, apronEnd], [roadHalfW, taperEnd], [roadHalfW, roadEnd],
  ];

  return (
    <group name="hall-ground-details">
      <Surface points={[
        [-(plotWidth + 40) / 2, -(plotLength + 40) / 2],
        [(plotWidth + 40) / 2, -(plotLength + 40) / 2],
        [(plotWidth + 40) / 2, (plotLength + 40) / 2],
        [-(plotWidth + 40) / 2, (plotLength + 40) / 2],
      ]} y={-0.173} color={config.grassColor} texture={textures.grass} />
      <Surface points={concrete} y={-0.160} color={config.concreteColor} texture={textures.concrete} />
      <Surface points={asphalt} y={-0.155} color={config.asphaltColor} texture={textures.asphalt} />
      {edge.slice(1).map(([x1, z1], i) => {
        const [x0, z0] = edge[i];
        const length = Math.hypot(x1 - x0, z1 - z0);
        if (length < 0.01) return null;
        return (
          <mesh key={i} position={[(x0 + x1) / 2, -0.17 + curbHeight / 2, (z0 + z1) / 2]}
            rotation={[0, -Math.atan2(z1 - z0, x1 - x0), 0]} receiveShadow castShadow raycast={noRaycast}>
            <boxGeometry args={[length + curbWidth / 2, curbHeight, curbWidth]} />
            <meshStandardMaterial color={config.curbColor} roughness={0.9} />
          </mesh>
        );
      })}
    </group>
  );
}
