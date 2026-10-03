import * as THREE from "three";

export function makeTrapezoidTexture(color: string, repeats = 40): THREE.CanvasTexture {
  const size = 512;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, size, size);
  const step = size / repeats;
  for (let i = 0; i < repeats; i++) {
    const x = i * step;
    const g = ctx.createLinearGradient(x, 0, x + step, 0);
    g.addColorStop(0, "rgba(0,0,0,0.32)");
    g.addColorStop(0.18, "rgba(255,255,255,0.05)");
    g.addColorStop(0.5, "rgba(255,255,255,0.12)");
    g.addColorStop(0.82, "rgba(255,255,255,0.05)");
    g.addColorStop(1, "rgba(0,0,0,0.32)");
    ctx.fillStyle = g;
    ctx.fillRect(x, 0, step, size);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
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
  slopeWidth = 0.15,
  slopeIntensity = 60,
): THREE.CanvasTexture {
  const size = 512;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;

  // Fill default flat surface color (normal pointing straight out: 128, 128, 255)
  ctx.fillStyle = "rgb(128, 128, 255)";
  ctx.fillRect(0, 0, size, size);

  const step = size / repeats;
  const sW = step * slopeWidth;

  for (let i = 0; i < repeats; i++) {
    const start = i * step;

    if (orientation === "vertical") {
      // Slopes tilt left and right (affecting Red channel)
      // Left slope
      ctx.fillStyle = `rgb(${128 - slopeIntensity}, 128, 220)`;
      ctx.fillRect(start, 0, sW, size);

      // Right slope
      ctx.fillStyle = `rgb(${128 + slopeIntensity}, 128, 220)`;
      ctx.fillRect(start + step - sW, 0, sW, size);
    } else {
      // Slopes tilt up and down (affecting Green channel)
      // Up slope
      ctx.fillStyle = `rgb(128, ${128 - slopeIntensity}, 220)`;
      ctx.fillRect(0, start, size, sW);

      // Down slope
      ctx.fillStyle = `rgb(128, ${128 + slopeIntensity}, 220)`;
      ctx.fillRect(0, start + step - sW, size, sW);
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}

export function makeTrapezoidRoughnessTexture(
  repeats = 40,
  orientation: "vertical" | "horizontal" = "vertical",
  baseRoughness = 0.45,
): THREE.CanvasTexture {
  const size = 512;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;

  // Base roughness color (monochrome, e.g. 0.45 maps to rgb(115, 115, 115))
  const baseColor = Math.round(baseRoughness * 255);
  ctx.fillStyle = `rgb(${baseColor}, ${baseColor}, ${baseColor})`;
  ctx.fillRect(0, 0, size, size);

  const step = size / repeats;
  const sW = step * 0.15;
  const slopeColor = Math.round(Math.min(1.0, baseRoughness * 1.25) * 255);

  for (let i = 0; i < repeats; i++) {
    const start = i * step;

    ctx.fillStyle = `rgb(${slopeColor}, ${slopeColor}, ${slopeColor})`;
    if (orientation === "vertical") {
      ctx.fillRect(start, 0, sW, size);
      ctx.fillRect(start + step - sW, 0, sW, size);
    } else {
      ctx.fillRect(0, start, size, sW);
      ctx.fillRect(0, start + step - sW, size, sW);
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}

export function makeTrapezoidMetalnessTexture(
  repeats = 40,
  orientation: "vertical" | "horizontal" = "vertical",
  baseMetalness = 0.8,
): THREE.CanvasTexture {
  const size = 512;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;

  // Base metalness color (monochrome, e.g. 0.8 maps to rgb(204, 204, 204))
  const baseColor = Math.round(baseMetalness * 255);
  ctx.fillStyle = `rgb(${baseColor}, ${baseColor}, ${baseColor})`;
  ctx.fillRect(0, 0, size, size);

  const step = size / repeats;
  const sW = step * 0.15;
  const slopeColor = Math.round(baseMetalness * 0.9 * 255); // Slightly less metallic on slopes

  for (let i = 0; i < repeats; i++) {
    const start = i * step;

    ctx.fillStyle = `rgb(${slopeColor}, ${slopeColor}, ${slopeColor})`;
    if (orientation === "vertical") {
      ctx.fillRect(start, 0, sW, size);
      ctx.fillRect(start + step - sW, 0, sW, size);
    } else {
      ctx.fillRect(0, start, size, sW);
      ctx.fillRect(0, start + step - sW, size, sW);
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
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

