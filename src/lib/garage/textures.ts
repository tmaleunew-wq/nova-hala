import * as THREE from "three";

export function makeTrapezoidTexture(
  color: string,
  repeats = 40,
  orientation: "vertical" | "horizontal" = "vertical",
): THREE.CanvasTexture {
  const size = 512;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, size, size);

  // Micro-grain coil-coating texture (simulates architectural fine-matte / polyester structure)
  const imgData = ctx.getImageData(0, 0, size, size);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    const grain = (Math.random() - 0.5) * 8;
    d[i] = Math.max(0, Math.min(255, d[i] + grain));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + grain));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + grain));
  }
  ctx.putImageData(imgData, 0, 0);

  const step = size / repeats;
  const isVert = orientation === "vertical";

  for (let i = 0; i < repeats; i++) {
    const start = i * step;
    const g = isVert
      ? ctx.createLinearGradient(start, 0, start + step, 0)
      : ctx.createLinearGradient(0, start, 0, start + step);

    // Realistic trapezoid profile:
    // 0.00 - 0.38: Valley / trough with inner corner contact shadow
    // 0.38 - 0.48: Sloped shoulder
    // 0.48 - 0.52: Beveled top edge with specular highlight
    // 0.52 - 0.88: Top crest (direct daylight illumination)
    // 0.88 - 0.92: Beveled top edge with specular highlight
    // 0.92 - 1.00: Sloped shoulder down to trough
    g.addColorStop(0.0, "rgba(0,0,0,0.30)");        // trough shadow
    g.addColorStop(0.20, "rgba(0,0,0,0.16)");       // bottom flat trough
    g.addColorStop(0.38, "rgba(0,0,0,0.28)");       // inner corner shadow
    g.addColorStop(0.44, "rgba(0,0,0,0.06)");       // rising slope
    g.addColorStop(0.49, "rgba(255,255,255,0.18)"); // stamped bevel highlight
    g.addColorStop(0.55, "rgba(255,255,255,0.08)"); // top crest
    g.addColorStop(0.85, "rgba(255,255,255,0.08)"); // top crest
    g.addColorStop(0.90, "rgba(255,255,255,0.18)"); // stamped bevel highlight
    g.addColorStop(0.95, "rgba(0,0,0,0.06)");       // descending slope
    g.addColorStop(1.0, "rgba(0,0,0,0.30)");        // trough shadow

    ctx.fillStyle = g;
    if (isVert) {
      ctx.fillRect(start, 0, step, size);
    } else {
      ctx.fillRect(0, start, size, step);
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 16;
  return tex;
}

export function makeConcreteTexture(): THREE.CanvasTexture {
  const size = 512;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#9aa0a6";
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 4000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const v = 130 + Math.random() * 80;
    ctx.fillStyle = `rgba(${v},${v},${v},${Math.random() * 0.5})`;
    ctx.fillRect(x, y, 2, 2);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function makeTrapezoidNormalTexture(
  repeats = 40,
  orientation: "vertical" | "horizontal" = "vertical",
  slopeWidth = 0.14,
  slopeIntensity = 75,
): THREE.CanvasTexture {
  const size = 512;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;

  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;
  const step = size / repeats;
  const isVert = orientation === "vertical";

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const coord = isVert ? x : y;
      const l = coord % step;
      const t = l / step; // 0.0 to 1.0 within profile wave

      // Trapezoid profile gradient (dz/du) with smooth fillet rounding at bends
      let slope = 0;
      if (t >= 0.38 && t < 0.48) {
        // Ascending slope with cosine fillet roundness
        const prog = (t - 0.38) / 0.10;
        slope = Math.sin(prog * Math.PI) * (slopeIntensity / 40);
      } else if (t >= 0.88 && t < 0.98) {
        // Descending slope with cosine fillet roundness
        const prog = (t - 0.88) / 0.10;
        slope = -Math.sin(prog * Math.PI) * (slopeIntensity / 40);
      }

      // Micro-roughness scatter on normal map (subtle fine coil-coating stipple)
      const microGrain = (Math.random() - 0.5) * 0.06;

      const du = slope + microGrain;
      const dv = (Math.random() - 0.5) * 0.03;

      let nx = isVert ? -du : -dv;
      let ny = isVert ? -dv : -du;
      let nz = 1.0;

      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      nx /= len;
      ny /= len;
      nz /= len;

      const idx = (y * size + x) * 4;
      data[idx] = Math.round((nx * 0.5 + 0.5) * 255);
      data[idx + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      data[idx + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 16;
  return tex;
}

export function makeTrapezoidRoughnessTexture(
  repeats = 40,
  orientation: "vertical" | "horizontal" = "vertical",
  baseRoughness = 0.46,
): THREE.CanvasTexture {
  const size = 512;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;

  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;
  const step = size / repeats;
  const isVert = orientation === "vertical";

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const coord = isVert ? x : y;
      const l = coord % step;
      const t = l / step;

      let rVal = baseRoughness;
      // Stamped fold shoulders are slightly more polished/specular (lower roughness)
      if ((t >= 0.46 && t <= 0.50) || (t >= 0.86 && t <= 0.90)) {
        rVal = baseRoughness - 0.10;
      } else if (t < 0.38) {
        // Trough crevices have slightly higher diffuse scattering
        rVal = baseRoughness + 0.05;
      }

      // Micro-grain coating texture
      rVal += (Math.random() - 0.5) * 0.04;
      rVal = Math.max(0.15, Math.min(0.95, rVal));

      const byteVal = Math.round(rVal * 255);
      const idx = (y * size + x) * 4;
      data[idx] = byteVal;
      data[idx + 1] = byteVal;
      data[idx + 2] = byteVal;
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 16;
  return tex;
}

export function makeTrapezoidMetalnessTexture(
  repeats = 40,
  orientation: "vertical" | "horizontal" = "vertical",
  baseMetalness = 0.22,
): THREE.CanvasTexture {
  const size = 512;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;

  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;
  const step = size / repeats;
  const isVert = orientation === "vertical";

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const coord = isVert ? x : y;
      const l = coord % step;
      const t = l / step;

      let mVal = baseMetalness;
      // Stamped edges show slightly higher specular sheen
      if ((t >= 0.46 && t <= 0.50) || (t >= 0.86 && t <= 0.90)) {
        mVal = baseMetalness + 0.05;
      }
      mVal += (Math.random() - 0.5) * 0.02;
      mVal = Math.max(0.05, Math.min(0.95, mVal));

      const byteVal = Math.round(mVal * 255);
      const idx = (y * size + x) * 4;
      data[idx] = byteVal;
      data[idx + 1] = byteVal;
      data[idx + 2] = byteVal;
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 16;
  return tex;
}

export function makeTileTexture(
  color: string,
  repeatsX = 12,
  repeatsY = 14,
): THREE.CanvasTexture {
  const size = 512;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;

  ctx.fillStyle = color;
  ctx.fillRect(0, 0, size, size);

  // Micro-grain coating texture (simulating architectural fine-matte / pural finish)
  const imgData = ctx.getImageData(0, 0, size, size);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    const grain = (Math.random() - 0.5) * 10;
    d[i] = Math.max(0, Math.min(255, d[i] + grain));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + grain));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + grain));
  }
  ctx.putImageData(imgData, 0, 0);

  // 1. Horizontal step gradients (along X direction / repeatsX / slope length)
  // Simulates realistic 350mm module stamped tile courses
  const stepX = size / repeatsX;
  for (let i = 0; i < repeatsX; i++) {
    const x = i * stepX;
    const g = ctx.createLinearGradient(x, 0, x + stepX, 0);
    g.addColorStop(0, "rgba(0, 0, 0, 0.55)");        // deep contact shadow at the step drop
    g.addColorStop(0.05, "rgba(0, 0, 0, 0.35)");
    g.addColorStop(0.10, "rgba(255, 255, 255, 0.18)"); // stamped bevel highlight
    g.addColorStop(0.20, "rgba(255, 255, 255, 0.05)");
    g.addColorStop(0.85, "rgba(0, 0, 0, 0.0)");        // main body
    g.addColorStop(1, "rgba(0, 0, 0, 0.28)");        // slope shading towards next drop
    ctx.fillStyle = g;
    ctx.fillRect(x, 0, stepX, size);
  }

  // 2. Longitudinal wave gradients (along Y direction / repeatsY / building length)
  // Simulates sinusoidal Roman / Spanish metal tile arch profiles
  const stepY = size / repeatsY;
  for (let j = 0; j < repeatsY; j++) {
    const y = j * stepY;
    const g = ctx.createLinearGradient(0, y, 0, y + stepY);
    g.addColorStop(0, "rgba(0, 0, 0, 0.25)");       // trough shadow / valley
    g.addColorStop(0.25, "rgba(255, 255, 255, 0.06)");
    g.addColorStop(0.5, "rgba(255, 255, 255, 0.20)");  // crest ridge highlight
    g.addColorStop(0.75, "rgba(255, 255, 255, 0.06)");
    g.addColorStop(1, "rgba(0, 0, 0, 0.25)");       // trough shadow / valley
    ctx.fillStyle = g;
    ctx.fillRect(0, y, size, stepY);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 16;
  return tex;
}

export function makeTileNormalTexture(
  repeatsX = 12,
  repeatsY = 14,
): THREE.CanvasTexture {
  const size = 512;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;

  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;

  const stepX = size / repeatsX;
  const stepY = size / repeatsY;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const lx = x % stepX;
      const ly = y % stepY;

      // X direction (along slope): saw-tooth tile course profile with stamped drop
      const tX = lx / stepX;
      let dzdx = -0.15;
      if (tX < 0.08) {
        dzdx = 3.2; // steep drop at tile overlap
      } else if (tX < 0.16) {
        dzdx = 0.8; // transition rounded radius
      }

      // Y direction (along length): sinusoidal arch wave profile
      const tY = ly / stepY;
      const dzdy = -1.2 * Math.sin(tY * Math.PI * 2);

      // Normal vector = (-dzdx, -dzdy, 1.0) normalized
      const nx = -dzdx;
      const ny = -dzdy;
      const nz = 1.0;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);

      const r = Math.round(((nx / len) * 0.5 + 0.5) * 255);
      const g = Math.round(((ny / len) * 0.5 + 0.5) * 255);
      const b = Math.round(((nz / len) * 0.5 + 0.5) * 255);

      const idx = (y * size + x) * 4;
      data[idx] = Math.max(0, Math.min(255, r));
      data[idx + 1] = Math.max(0, Math.min(255, g));
      data[idx + 2] = Math.max(0, Math.min(255, b));
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 16;
  return tex;
}

export function makeTileRoughnessTexture(
  repeatsX = 12,
  repeatsY = 14,
  baseRoughness = 0.50,
): THREE.CanvasTexture {
  const size = 512;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;

  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;

  const stepX = size / repeatsX;
  const stepY = size / repeatsY;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const lx = x % stepX;
      const ly = y % stepY;

      const tX = lx / stepX;
      const tY = ly / stepY;

      // Crests and stamped edges are slightly glossier/sharper (lower roughness)
      const waveCrest = Math.cos(tY * Math.PI * 2) * 0.5 + 0.5; // 1 at crest, 0 at trough
      const stepEdge = tX >= 0.08 && tX <= 0.18 ? 0.2 : 0.0;

      let rVal = baseRoughness - (waveCrest * 0.12) - stepEdge;
      if (tX < 0.08) {
        rVal += 0.15; // deeper diffuse in shadow crevices
      }
      rVal = Math.max(0.25, Math.min(0.85, rVal));

      const byteVal = Math.round(rVal * 255);
      const idx = (y * size + x) * 4;
      data[idx] = byteVal;
      data[idx + 1] = byteVal;
      data[idx + 2] = byteVal;
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 16;
  return tex;
}

export function makeTileMetalnessTexture(
  repeatsX = 12,
  repeatsY = 14,
  baseMetalness = 0.28,
): THREE.CanvasTexture {
  const size = 512;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;

  const baseColor = Math.round(baseMetalness * 255);
  ctx.fillStyle = `rgb(${baseColor}, ${baseColor}, ${baseColor})`;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 16;
  return tex;
}

export function makeTileDisplacementTexture(
  repeatsX = 12,
  repeatsY = 14,
): THREE.CanvasTexture {
  const size = 512;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;

  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;

  const stepX = size / repeatsX;
  const stepY = size / repeatsY;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const lx = x % stepX;
      const ly = y % stepY;

      // X direction (repeatsX, along slope): tile steps
      const tX = lx / stepX;
      const step = 1.0 - tX; // saw-tooth drop-off

      // Y direction (repeatsY, along building length): waves
      const tY = ly / stepY;
      const wave = (Math.sin(tY * Math.PI * 2) + 1.0) / 2.0; // 0 to 1

      // Combine wave and step (60% step depth, 40% wave depth)
      const hVal = Math.round((wave * 0.40 + step * 0.60) * 255);

      const idx = (y * size + x) * 4;
      data[idx] = hVal;
      data[idx + 1] = hVal;
      data[idx + 2] = hVal;
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 16;
  return tex;
}

export function makeWoodTexture(
  type: "golden_oak" | "walnut" = "golden_oak",
  grainRepeat = 8,
): THREE.CanvasTexture {
  const size = 512;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;

  const isOak = type === "golden_oak";
  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;

  for (let y = 0; y < size; y++) {
    const wave = Math.sin(y * 0.04) * 14 + Math.sin(y * 0.1) * 6;
    for (let x = 0; x < size; x++) {
      const ring = Math.sin((x + wave) * (grainRepeat * 0.05));
      const micro = Math.sin(x * 1.8 + wave * 1.5) * 0.12;
      const t = Math.max(0, Math.min(1, 0.5 + 0.5 * ring + micro));

      let r: number, g: number, b: number;
      if (isOak) {
        // Zlatý dub: medový, teplý jantárový základ s tmavšími dubovými letokruhmi
        r = Math.round(155 + t * 55);
        g = Math.round(95 + t * 45);
        b = Math.round(35 + t * 25);
      } else {
        // Tmavý orech: sýty ebenovo-čokoládový základ s tmavohnedými vláknami
        r = Math.round(65 + t * 40);
        g = Math.round(40 + t * 25);
        b = Math.round(22 + t * 18);
      }

      const idx = (y * size + x) * 4;
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}

export function makeWoodNormalTexture(grainRepeat = 8): THREE.CanvasTexture {
  const size = 512;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;

  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;

  for (let y = 0; y < size; y++) {
    const wave = Math.sin(y * 0.04) * 14;
    for (let x = 0; x < size; x++) {
      const dxd = Math.cos((x + wave) * (grainRepeat * 0.05)) * 0.35;
      const r = Math.round(128 + dxd * 60);
      const idx = (y * size + x) * 4;
      data[idx] = Math.max(0, Math.min(255, r));
      data[idx + 1] = 128;
      data[idx + 2] = 230;
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}

export function makeWoodRoughnessTexture(): THREE.CanvasTexture {
  const size = 512;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "rgb(130, 130, 130)"; // Satin semi-matte finish (roughness ~0.5)
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}

// -------------------------------------------------------------
// STUCCO / JEMNÁ STIERKA FASÁDNA TEXTÚRA (PBR)
// -------------------------------------------------------------
const stuccoNormalCache = new Map<string, THREE.CanvasTexture>();
const stuccoDiffuseCache = new Map<string, THREE.CanvasTexture>();
const stuccoRoughnessCache = new Map<string, THREE.CanvasTexture>();

const STUCCO_SIZE = 512;
let stuccoSharedHeight: Float32Array | null = null;

function getStuccoHeightField(): Float32Array {
  if (stuccoSharedHeight) return stuccoSharedHeight;
  const size = STUCCO_SIZE;
  const cellSize = 5; // ~102 aggregate grains per tile
  const gridW = Math.ceil(size / cellSize);

  let seed = 918273;
  function rand() {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  }

  // Jittered 2D grid of grain aggregate centers (seamless periodic wrapping)
  const grid: Array<Array<{ x: number; y: number; h: number }>> = Array.from({ length: gridW }, () => []);
  for (let gy = 0; gy < gridW; gy++) {
    for (let gx = 0; gx < gridW; gx++) {
      grid[gy].push({
        x: (gx + 0.15 + rand() * 0.7) * cellSize,
        y: (gy + 0.15 + rand() * 0.7) * cellSize,
        h: 0.85 + rand() * 0.3,
      });
    }
  }

  const height = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    const gy = Math.floor(y / cellSize);
    for (let x = 0; x < size; x++) {
      const gx = Math.floor(x / cellSize);
      let d1 = Infinity;
      let d2 = Infinity;
      let closestH = 1.0;

      for (let dy = -1; dy <= 1; dy++) {
        const cy = (gy + dy + gridW) % gridW;
        for (let dx = -1; dx <= 1; dx++) {
          const cx = (gx + dx + gridW) % gridW;
          const pt = grid[cy][cx];
          let px = pt.x;
          let py = pt.y;
          if (dx === -1 && px > x) px -= size;
          if (dx === 1 && px < x) px += size;
          if (dy === -1 && py > y) py -= size;
          if (dy === 1 && py < y) py += size;

          const dist = Math.hypot(x - px, y - py);
          if (dist < d1) {
            d2 = d1;
            d1 = dist;
            closestH = pt.h;
          } else if (dist < d2) {
            d2 = dist;
          }
        }
      }

      // 1. Hemispherical aggregate grain dome
      const rad = cellSize * 0.75;
      const dome = Math.max(0, 1 - d1 / rad);
      // 2. Inter-granular crevice groove (Voronoi boundary)
      const crevice = Math.min(1, (d2 - d1) / (cellSize * 0.45));
      // 3. Micro-sand grit
      const grit = (rand() - 0.5) * 0.14;

      height[y * size + x] = (dome * 0.62 + crevice * 0.38) * closestH + grit;
    }
  }

  // Normalize height field to [0, 1] range
  let minH = Infinity;
  let maxH = -Infinity;
  for (let i = 0; i < size * size; i++) {
    if (height[i] < minH) minH = height[i];
    if (height[i] > maxH) maxH = height[i];
  }
  const span = maxH - minH || 1;
  for (let i = 0; i < size * size; i++) {
    height[i] = (height[i] - minH) / span;
  }

  stuccoSharedHeight = height;
  return height;
}

export function makeStuccoNormalTexture(repeatsX = 3.2, repeatsY = 3.2): THREE.CanvasTexture {
  const key = `${repeatsX}_${repeatsY}`;
  if (stuccoNormalCache.has(key)) return stuccoNormalCache.get(key)!;

  const size = STUCCO_SIZE;
  const height = getStuccoHeightField();
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;

  // Central difference normal calculation with periodic wrapping (100% seamless)
  const dz = 0.075; // Pronounced tactile relief for granular facade plaster
  for (let y = 0; y < size; y++) {
    const yTop = (y - 1 + size) % size;
    const yBottom = (y + 1) % size;
    for (let x = 0; x < size; x++) {
      const xLeft = (x - 1 + size) % size;
      const xRight = (x + 1) % size;

      const dx = (height[y * size + xRight] - height[y * size + xLeft]) * 0.5;
      const dy = (height[yBottom * size + x] - height[yTop * size + x]) * 0.5;

      const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const nx = -dx / len;
      const ny = -dy / len;
      const nz = dz / len;

      const idx = (y * size + x) * 4;
      data[idx] = Math.round((nx * 0.5 + 0.5) * 255);
      data[idx + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      data[idx + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatsX, repeatsY);
  tex.anisotropy = 16;
  stuccoNormalCache.set(key, tex);
  return tex;
}

export function makeStuccoTexture(color: string, repeatsX = 3.2, repeatsY = 3.2): THREE.CanvasTexture {
  const key = `${color.toLowerCase()}_${repeatsX}_${repeatsY}`;
  if (stuccoDiffuseCache.has(key)) return stuccoDiffuseCache.get(key)!;

  const size = STUCCO_SIZE;
  const height = getStuccoHeightField();
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;

  ctx.fillStyle = color;
  ctx.fillRect(0, 0, size, size);

  const imgData = ctx.getImageData(0, 0, size, size);
  const data = imgData.data;

  // Base RGB values
  const r0 = data[0];
  const g0 = data[1];
  const b0 = data[2];

  let seed = 44556;
  function rand() {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  }

  // Modulate diffuse by ambient occlusion in inter-granular pore pits + micro highlights on peaks
  for (let i = 0; i < size * size; i++) {
    const h = height[i]; // 0.0 (deep crevice) to 1.0 (grain peak)
    // Deep cavity darkening in pores to withstand Three.js scene illumination
    let factor: number;
    if (h < 0.35) {
      factor = 0.45 + (h / 0.35) * 0.40; // 0.45 to 0.85
    } else if (h < 0.75) {
      factor = 0.85 + ((h - 0.35) / 0.40) * 0.15; // 0.85 to 1.00
    } else {
      factor = 1.00 + ((h - 0.75) / 0.25) * 0.08; // 1.00 to 1.08 highlight
    }

    // Micro mineral scatter
    factor *= 1.0 + (rand() - 0.5) * 0.04;

    const idx = i * 4;
    data[idx] = Math.max(0, Math.min(255, Math.round(r0 * factor)));
    data[idx + 1] = Math.max(0, Math.min(255, Math.round(g0 * factor)));
    data[idx + 2] = Math.max(0, Math.min(255, Math.round(b0 * factor)));
  }
  ctx.putImageData(imgData, 0, 0);

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatsX, repeatsY);
  tex.anisotropy = 16;
  stuccoDiffuseCache.set(key, tex);
  return tex;
}

export function makeStuccoRoughnessTexture(repeatsX = 3.2, repeatsY = 3.2): THREE.CanvasTexture {
  const key = `${repeatsX}_${repeatsY}`;
  if (stuccoRoughnessCache.has(key)) return stuccoRoughnessCache.get(key)!;

  const size = STUCCO_SIZE;
  const height = getStuccoHeightField();
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;

  for (let i = 0; i < size * size; i++) {
    const h = height[i];
    // Matte architectural plaster (crevice pores ~0.96, grain tops ~0.80)
    const roughness = 0.96 - h * 0.16;
    const val = Math.round(Math.max(0, Math.min(255, roughness * 255)));
    const idx = i * 4;
    data[idx] = val;
    data[idx + 1] = val;
    data[idx + 2] = val;
    data[idx + 3] = 255;
  }
  ctx.putImageData(imgData, 0, 0);

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatsX, repeatsY);
  tex.anisotropy = 16;
  stuccoRoughnessCache.set(key, tex);
  return tex;
}

const sandwichTexCache = new Map<string, THREE.CanvasTexture>();
const sandwichNormalCache = new Map<string, THREE.CanvasTexture>();
const sandwichRoughnessCache = new Map<string, THREE.CanvasTexture>();

export function makeSandwichTexture(
  color: string,
  repeats = 1,
  orientation: "horizontal" | "vertical" = "horizontal",
): THREE.CanvasTexture {
  const key = `${color}_${repeats}_${orientation}`;
  if (sandwichTexCache.has(key)) return sandwichTexCache.get(key)!;

  const size = 1024;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, size, size);

  // Micro-grain architectural satin coil-coating texture (fine steel sheet texture)
  const imgData = ctx.getImageData(0, 0, size, size);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    const grain = (Math.random() - 0.5) * 5;
    d[i] = Math.max(0, Math.min(255, d[i] + grain));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + grain));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + grain));
  }
  ctx.putImageData(imgData, 0, 0);

  const step = size / repeats;
  const isHoriz = orientation === "horizontal";

  for (let i = 0; i < repeats; i++) {
    const start = i * step;

    // Realistic sandwich panel shadow joint (jemná pero-drážka / priznaná škára):
    if (i > 0) {
      // 1. Subtle upper shadow line (4px)
      ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
      if (isHoriz) {
        ctx.fillRect(0, start, size, 4);
      } else {
        ctx.fillRect(start, 0, 4, size);
      }

      // 2. Crisp dark joint recess (8px)
      ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
      if (isHoriz) {
        ctx.fillRect(0, start + 4, size, 8);
      } else {
        ctx.fillRect(start + 4, 0, 8, size);
      }

      // 3. Delicate beveled highlight on lower joint edge (6px)
      ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
      if (isHoriz) {
        ctx.fillRect(0, start + 12, size, 6);
      } else {
        ctx.fillRect(start + 12, 0, 6, size);
      }
    }

    // 4. Soft ambient gradient across the panel face (gives realistic panel flatness & curvature)
    const g = isHoriz
      ? ctx.createLinearGradient(0, start, 0, start + step)
      : ctx.createLinearGradient(start, 0, start + step, 0);
    g.addColorStop(0.0, "rgba(0, 0, 0, 0.05)");
    g.addColorStop(0.05, "rgba(255, 255, 255, 0.04)");
    g.addColorStop(0.50, "rgba(255, 255, 255, 0.01)");
    g.addColorStop(0.95, "rgba(0, 0, 0, 0.02)");
    g.addColorStop(1.0, "rgba(0, 0, 0, 0.06)");

    ctx.fillStyle = g;
    if (isHoriz) {
      ctx.fillRect(0, start + 18, size, step - 18);
    } else {
      ctx.fillRect(start + 18, 0, step - 18, size);
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 16;
  sandwichTexCache.set(key, tex);
  return tex;
}

export function makeSandwichNormalTexture(
  repeats = 1,
  orientation: "horizontal" | "vertical" = "horizontal",
): THREE.CanvasTexture {
  const key = `${repeats}_${orientation}`;
  if (sandwichNormalCache.has(key)) return sandwichNormalCache.get(key)!;

  const size = 512;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;

  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;

  // Base normal is flat facing (0, 0, 1) -> (128, 128, 255)
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 128;
    data[i + 1] = 128;
    data[i + 2] = 255;
    data[i + 3] = 255;
  }

  const step = size / repeats;
  const isHoriz = orientation === "horizontal";

  for (let i = 1; i < repeats; i++) {
    const startY = Math.round(i * step);
    const grooveH = 16;

    for (let g = 0; g < grooveH; g++) {
      const pos = (startY + g) % size;
      let ny = 128;
      if (g < 8) {
        ny = 40 + g * 11; // steep downward slope
      } else {
        ny = 216 - (g - 8) * 11; // steep upward slope
      }

      for (let x = 0; x < size; x++) {
        const idx = isHoriz ? (pos * size + x) * 4 : (x * size + pos) * 4;
        if (isHoriz) {
          data[idx + 1] = ny;
        } else {
          data[idx] = ny;
        }
        data[idx + 2] = 215;
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  sandwichNormalCache.set(key, tex);
  return tex;
}

export function makeSandwichRoughnessTexture(
  repeats = 1,
  orientation: "horizontal" | "vertical" = "horizontal",
  baseRoughness = 0.40,
): THREE.CanvasTexture {
  const key = `${repeats}_${orientation}_${baseRoughness}`;
  if (sandwichRoughnessCache.has(key)) return sandwichRoughnessCache.get(key)!;

  const size = 512;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;

  const baseVal = Math.round(baseRoughness * 255);
  ctx.fillStyle = `rgb(${baseVal}, ${baseVal}, ${baseVal})`;
  ctx.fillRect(0, 0, size, size);

  const step = size / repeats;
  const isHoriz = orientation === "horizontal";

  ctx.fillStyle = "rgb(180, 180, 180)";
  for (let i = 1; i < repeats; i++) {
    const start = i * step;
    if (isHoriz) {
      ctx.fillRect(0, start, size, 14);
    } else {
      ctx.fillRect(start, 0, 14, size);
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  sandwichRoughnessCache.set(key, tex);
  return tex;
}


