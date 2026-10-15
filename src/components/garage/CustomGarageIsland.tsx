import * as THREE from "three";
import { useMemo, useRef, useEffect } from "react";
import type { GarageParams } from "@/lib/garage/types";

const noRaycast = () => null;

let cachedPaverTex: THREE.CanvasTexture | null = null;
let cachedAnthraciteTex: THREE.CanvasTexture | null = null;
let cachedGravelTex: THREE.CanvasTexture | null = null;
let cachedGrassTex: THREE.CanvasTexture | null = null;

/**
 * Creates a procedural large-format concrete paver texture
 * with subtle surface variation and clean joints.
 */
function makePaverTexture(): THREE.CanvasTexture {
  if (cachedPaverTex) return cachedPaverTex;
  if (typeof document === "undefined") return new THREE.CanvasTexture({} as HTMLCanvasElement);
  const size = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#52565e";
  ctx.fillRect(0, 0, size, size);

  // Subtle concrete noise
  for (let i = 0; i < 15000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const val = 70 + Math.random() * 30;
    ctx.fillStyle = `rgba(${val},${val},${val},${Math.random() * 0.18})`;
    ctx.fillRect(x, y, 2, 2);
  }

  // Large-format paver grid lines (e.g., 1.2m x 0.6m aspect)
  const rows = 8;
  const cols = 4;
  const rowH = size / rows;
  const colW = size / cols;

  ctx.strokeStyle = "#363a42";
  ctx.lineWidth = 3;

  for (let r = 0; r <= rows; r++) {
    const y = r * rowH;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
  }

  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * (colW / 2);
    const y = r * rowH;
    for (let c = 0; c <= cols + 1; c++) {
      const x = (c * colW + offset) % size;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + rowH);
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  cachedPaverTex = tex;
  return tex;
}

/**
 * Creates dark anthracite basalt paver texture
 */
function makeAnthraciteTexture(): THREE.CanvasTexture {
  if (cachedAnthraciteTex) return cachedAnthraciteTex;
  if (typeof document === "undefined") return new THREE.CanvasTexture({} as HTMLCanvasElement);
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#25282d";
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 6000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const v = 30 + Math.random() * 25;
    ctx.fillStyle = `rgba(${v},${v},${v},${Math.random() * 0.25})`;
    ctx.fillRect(x, y, 2, 2);
  }

  // Cross joint lines
  const step = size / 8;
  ctx.strokeStyle = "#16181b";
  ctx.lineWidth = 2.5;
  for (let i = 0; i <= size; i += step) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(size, i);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, size);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  cachedAnthraciteTex = tex;
  return tex;
}

/**
 * Creates natural river pebble / gravel texture
 */
function makeGravelTexture(): THREE.CanvasTexture {
  if (cachedGravelTex) return cachedGravelTex;
  if (typeof document === "undefined") return new THREE.CanvasTexture({} as HTMLCanvasElement);
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#8e9299";
  ctx.fillRect(0, 0, size, size);

  // Draw simulated small pebbles
  for (let i = 0; i < 1800; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const rad = 2 + Math.random() * 4.5;
    const shade = 120 + Math.random() * 70;
    ctx.fillStyle = `rgb(${shade},${shade + (Math.random() * 6 - 3)},${shade + 2})`;
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.fill();

    // subtle pebble shadow
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  cachedGravelTex = tex;
  return tex;
}

/**
 * Creates manicured grass turf texture
 */
function makeGrassTexture(): THREE.CanvasTexture {
  if (cachedGrassTex) return cachedGrassTex;
  if (typeof document === "undefined") return new THREE.CanvasTexture({} as HTMLCanvasElement);
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#4e7539";
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 12000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const g = 95 + Math.random() * 60;
    const r = Math.round(g * 0.65);
    const b = Math.round(g * 0.45);
    ctx.fillStyle = `rgba(${r},${g},${b},${0.3 + Math.random() * 0.4})`;
    ctx.fillRect(x, y, 1.5, 3);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  cachedGrassTex = tex;
  return tex;
}

/**
 * Procedural Buxus Bush:
 * Perfectly manicured spherical shrub with detailed leaf surface clusters.
 */
function BuxusBush({ position, radius = 0.38 }: { position: [number, number, number]; radius?: number }) {
  const foliageMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#2e6122",
        roughness: 0.85,
        metalness: 0.05,
      }),
    [],
  );

  const subClusters = useMemo(() => {
    // Generate cluster offsets around the main sphere surface for realistic foliage depth
    const offsets: { pos: [number, number, number]; r: number }[] = [];
    const count = 16;
    for (let i = 0; i < count; i++) {
      const phi = Math.acos(-1 + (2 * i) / count);
      const theta = Math.sqrt(count * Math.PI) * phi;
      const d = radius * 0.82;
      offsets.push({
        pos: [
          d * Math.cos(theta) * Math.sin(phi),
          d * Math.sin(theta) * Math.sin(phi),
          d * Math.cos(phi),
        ],
        r: radius * 0.36,
      });
    }
    return offsets;
  }, [radius]);

  return (
    <group position={position} raycast={noRaycast}>
      {/* Root mound */}
      <mesh position={[0, 0.02, 0]} receiveShadow>
        <cylinderGeometry args={[radius * 0.7, radius * 0.85, 0.04, 16]} />
        <meshStandardMaterial color="#3b3228" roughness={1} />
      </mesh>

      {/* Main core sphere */}
      <mesh position={[0, radius * 0.88, 0]} castShadow receiveShadow material={foliageMat}>
        <sphereGeometry args={[radius * 0.85, 20, 20]} />
      </mesh>

      {/* Detailed outer leaf clumps */}
      {subClusters.map((c, i) => (
        <mesh
          key={i}
          position={[c.pos[0], radius * 0.88 + c.pos[1], c.pos[2]]}
          castShadow
          receiveShadow
          material={foliageMat}
        >
          <sphereGeometry args={[c.r, 12, 12]} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Outdoor pathway cylinder bollard light
 */
function PathwayBollard({ position }: { position: [number, number, number] }) {
  const bodyMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#1c1f24",
        metalness: 0.85,
        roughness: 0.35,
      }),
    [],
  );

  const lightRingMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#fff8e7",
        emissive: "#ffe29a",
        emissiveIntensity: 1.8,
        roughness: 0.2,
      }),
    [],
  );

  const h = 0.52;
  const r = 0.05;

  return (
    <group position={position} raycast={noRaycast}>
      {/* Lower pedestal */}
      <mesh position={[0, h / 2, 0]} castShadow material={bodyMat}>
        <cylinderGeometry args={[r, r, h, 16]} />
      </mesh>
      {/* Glowing diffuser band */}
      <mesh position={[0, h * 0.86, 0]} material={lightRingMat}>
        <cylinderGeometry args={[r + 0.003, r + 0.003, 0.04, 16]} />
      </mesh>
      {/* Top cap */}
      <mesh position={[0, h + 0.015, 0]} castShadow material={bodyMat}>
        <cylinderGeometry args={[r + 0.006, r + 0.006, 0.03, 16]} />
      </mesh>
      {/* Warm ambient pool on gravel */}
      <pointLight
        position={[0, h * 0.86, 0]}
        color="#ffe29a"
        intensity={0.35}
        distance={2.2}
        decay={2}
      />
    </group>
  );
}

export function CustomGarageIsland({ p }: { p: GarageParams }) {
  const W = p.width;
  const L = p.length;
  const halfW = W / 2;
  const halfL = L / 2;

  // Zoning dimensions
  // Driveway extends in front of garage and wraps around sides
  const driveSideMargin = 1.1; // driveway margin along side of garage
  const driveW = Math.max(W + driveSideMargin * 2, 5.4);
  const halfDriveW = driveW / 2;

  const stripW = 0.42; // dark anthracite strip width
  const gravelW = 0.72; // decorative gravel strip width
  const grassW = 1.35; // outer lawn wedge width

  // Overall outer island radii for the front semi-circle
  const outerRx = halfDriveW + stripW + gravelW + grassW;
  const islandFrontExt = 4.2; // length of driveway in front of the gate
  const islandBackExt = 2.4; // ground extending behind the garage

  const totalLength = L + islandFrontExt + islandBackExt;
  const islandZCenter = (islandBackExt - islandFrontExt) / 2;

  // Textures
  const paverTex = useMemo(() => makePaverTexture(), []);
  const anthraciteTex = useMemo(() => makeAnthraciteTexture(), []);
  const gravelTex = useMemo(() => makeGravelTexture(), []);
  const grassTex = useMemo(() => makeGrassTexture(), []);

  // Configure texture tiling
  useMemo(() => {
    paverTex.repeat.set(driveW / 2.4, totalLength / 2.4);
    anthraciteTex.repeat.set(1, totalLength / 0.5);
    gravelTex.repeat.set(1.5, totalLength / 1.2);
    grassTex.repeat.set(4, 4);
  }, [paverTex, anthraciteTex, gravelTex, grassTex, driveW, totalLength]);

  // Materials
  const paverMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: paverTex,
        roughness: 0.8,
        metalness: 0.1,
      }),
    [paverTex],
  );

  const anthraciteMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: anthraciteTex,
        roughness: 0.65,
        metalness: 0.2,
      }),
    [anthraciteTex],
  );

  const gravelMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: gravelTex,
        roughness: 0.95,
        metalness: 0.05,
      }),
    [gravelTex],
  );

  const grassMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: grassTex,
        roughness: 0.95,
        metalness: 0.0,
      }),
    [grassTex],
  );

  const curbMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#a4a8ad",
        roughness: 0.85,
        metalness: 0.15,
      }),
    [],
  );

  const edgeTrimMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#3a3d42",
        roughness: 0.6,
        metalness: 0.5,
      }),
    [],
  );

  // Island height above ground plane
  const islandH = 0.12;
  const topY = -0.015; // flush right below garage base
  const baseY = topY - islandH;


  // Bush and lamp coordinates (3 bushes + 2 lamps per side)
  const leftX = -halfDriveW - stripW - gravelW * 0.55;
  const rightX = halfDriveW + stripW + gravelW * 0.55;

  const bushZPositions = useMemo(() => {
    return [
      -halfL - islandFrontExt * 0.68, // front-most bush
      -halfL - islandFrontExt * 0.18, // mid bush (near garage front)
      -halfL + L * 0.35,              // side bush along garage flank
    ];
  }, [halfL, islandFrontExt, L]);

  const lampZPositions = useMemo(() => {
    const positions: number[] = [];
    // Predný príjazd
    positions.push(-halfL - islandFrontExt * 0.75);
    positions.push(-halfL - islandFrontExt * 0.28);
    // Pozdĺž celej garáže
    const sideCount = Math.max(2, Math.round(L / 2.6));
    for (let i = 0; i < sideCount; i++) {
      positions.push(-halfL + (L * (i + 0.5)) / sideCount);
    }
    // Zadná časť za garážou
    positions.push(halfL + islandBackExt * 0.45);
    return positions;
  }, [halfL, islandFrontExt, L, islandBackExt]);

  const islandRef = useRef<THREE.Group>(null);
  useEffect(() => {
    islandRef.current?.traverse((child: any) => {
      child.raycast = noRaycast;
    });
  });

  return (
    <group ref={islandRef} name="custom-garage-island" raycast={noRaycast}>
      {/* 1. SEAMLESS STUDIO SHADOW CATCHER GROUND (soft gradient ground around island) */}
      <mesh position={[0, baseY - 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow raycast={noRaycast}>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial color="#f0f2f5" roughness={1} metalness={0} />
      </mesh>

      {/* 2. CENTRAL GARAGE PAD (under the garage structure) - Tiled */}
      <mesh position={[0, topY, 0]} receiveShadow material={paverMat}>
        <boxGeometry args={[W + 0.12, islandH, L + 0.12]} />
      </mesh>

      {/* 3. MAIN DRIVEWAY & FRONT APRON (Light-grey large pavers) */}
      <group position={[0, topY, 0]}>
        {/* Front apron in front of garage */}
        <mesh
          position={[0, 0, -halfL - islandFrontExt / 2]}
          receiveShadow
          material={paverMat}
        >
          <boxGeometry args={[driveW, islandH, islandFrontExt]} />
        </mesh>

        {/* Left side walkway alongside garage */}
        <mesh
          position={[-(halfW + driveSideMargin / 2), 0, 0]}
          receiveShadow
          material={paverMat}
        >
          <boxGeometry args={[driveSideMargin, islandH, L]} />
        </mesh>

        {/* Right side walkway alongside garage */}
        <mesh
          position={[halfW + driveSideMargin / 2, 0, 0]}
          receiveShadow
          material={paverMat}
        >
          <boxGeometry args={[driveSideMargin, islandH, L]} />
        </mesh>

        {/* Back strip behind garage */}
        <mesh
          position={[0, 0, halfL + islandBackExt / 2]}
          receiveShadow
          material={paverMat}
        >
          <boxGeometry args={[driveW, islandH, islandBackExt]} />
        </mesh>
      </group>

      {/* 4. ACCENT ANTHRACITE BORDER STRIP (Left & Right) */}
      <group position={[0, topY, islandZCenter]}>
        {/* Left dark strip */}
        <mesh
          position={[-halfDriveW - stripW / 2, 0, 0]}
          receiveShadow
          material={anthraciteMat}
        >
          <boxGeometry args={[stripW, islandH, totalLength]} />
        </mesh>

        {/* Right dark strip */}
        <mesh
          position={[halfDriveW + stripW / 2, 0, 0]}
          receiveShadow
          material={anthraciteMat}
        >
          <boxGeometry args={[stripW, islandH, totalLength]} />
        </mesh>
      </group>

      {/* 5. GRAVEL BEDS (Natural small grey stone pebbles) */}
      <group position={[0, topY - 0.008, islandZCenter]}>
        {/* Left gravel bed */}
        <mesh
          position={[-halfDriveW - stripW - gravelW / 2, 0, 0]}
          receiveShadow
          material={gravelMat}
        >
          <boxGeometry args={[gravelW, islandH, totalLength]} />
        </mesh>

        {/* Right gravel bed */}
        <mesh
          position={[halfDriveW + stripW + gravelW / 2, 0, 0]}
          receiveShadow
          material={gravelMat}
        >
          <boxGeometry args={[gravelW, islandH, totalLength]} />
        </mesh>

        {/* Slim edge trim between gravel and grass */}
        <mesh position={[-halfDriveW - stripW - gravelW - 0.008, 0.012, 0]} material={edgeTrimMat}>
          <boxGeometry args={[0.016, islandH + 0.01, totalLength]} />
        </mesh>
        <mesh position={[halfDriveW + stripW + gravelW + 0.008, 0.012, 0]} material={edgeTrimMat}>
          <boxGeometry args={[0.016, islandH + 0.01, totalLength]} />
        </mesh>
      </group>

      {/* 6. MANICURED LAWN / GRASS AREAS (Outer curved wings) */}
      <group position={[0, topY - 0.004, islandZCenter]}>
        {/* Left grass wing */}
        <mesh
          position={[-halfDriveW - stripW - gravelW - grassW / 2, 0, 0]}
          receiveShadow
          material={grassMat}
        >
          <boxGeometry args={[grassW, islandH, totalLength]} />
        </mesh>

        {/* Right grass wing */}
        <mesh
          position={[halfDriveW + stripW + gravelW + grassW / 2, 0, 0]}
          receiveShadow
          material={grassMat}
        >
          <boxGeometry args={[grassW, islandH, totalLength]} />
        </mesh>
      </group>

      {/* 7. LOW CONCRETE CURB (Enclosing the island perimeter cleanly) */}
      <group position={[0, 0, 0]}>
        {/* Predný rovný obrubník */}
        <mesh
          position={[0, topY - islandH / 2 + 0.01, -halfL - islandFrontExt - 0.08]}
          castShadow
          receiveShadow
          material={curbMat}
        >
          <boxGeometry args={[outerRx * 2 + 0.32, islandH + 0.02, 0.16]} />
        </mesh>

        {/* Ľavý bočný obrubník */}
        <mesh
          position={[-outerRx - 0.08, topY - islandH / 2 + 0.01, islandZCenter]}
          castShadow
          receiveShadow
          material={curbMat}
        >
          <boxGeometry args={[0.16, islandH + 0.02, totalLength + 0.32]} />
        </mesh>

        {/* Pravý bočný obrubník */}
        <mesh
          position={[outerRx + 0.08, topY - islandH / 2 + 0.01, islandZCenter]}
          castShadow
          receiveShadow
          material={curbMat}
        >
          <boxGeometry args={[0.16, islandH + 0.02, totalLength + 0.32]} />
        </mesh>

        {/* Zadný rovný obrubník */}
        <mesh
          position={[0, topY - islandH / 2 + 0.01, halfL + islandBackExt + 0.08]}
          castShadow
          receiveShadow
          material={curbMat}
        >
          <boxGeometry args={[outerRx * 2 + 0.32, islandH + 0.02, 0.16]} />
        </mesh>
      </group>


      {/* 9. LIGHTING: CYLINDRICAL BOLLARD LIGHTS IN GRAVEL BEDS */}
      {lampZPositions.map((z, idx) => (
        <group key={`lamps-${idx}`}>
          <PathwayBollard position={[leftX, topY, z]} />
          <PathwayBollard position={[rightX, topY, z]} />
        </group>
      ))}
    </group>
  );
}
