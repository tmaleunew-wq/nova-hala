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

  // 1. Horizontal step gradients (along X direction / repeatsX / slope length)
  // This simulates overlapping courses of shingles/tiles.
  const stepX = size / repeatsX;
  for (let i = 0; i < repeatsX; i++) {
    const x = i * stepX;
    const g = ctx.createLinearGradient(x, 0, x + stepX, 0);
    g.addColorStop(0, "rgba(0, 0, 0, 0.45)");      // shadow under the overlap
    g.addColorStop(0.12, "rgba(255, 255, 255, 0.15)"); // highlight just below the overlap
    g.addColorStop(0.85, "rgba(0, 0, 0, 0.0)");       // standard body color
    g.addColorStop(1, "rgba(0, 0, 0, 0.32)");       // shadow shading towards the lower edge
    ctx.fillStyle = g;
    ctx.fillRect(x, 0, stepX, size);
  }

  // 2. Vertical wave gradients (along Y direction / repeatsY / building length)
  // This simulates the rounded tile wave profiles running down the slope.
  const stepY = size / repeatsY;
  for (let j = 0; j < repeatsY; j++) {
    const y = j * stepY;
    const g = ctx.createLinearGradient(0, y, 0, y + stepY);
    g.addColorStop(0, "rgba(0, 0, 0, 0.22)");      // wave trough shadow
    g.addColorStop(0.3, "rgba(255, 255, 255, 0.05)");
    g.addColorStop(0.5, "rgba(255, 255, 255, 0.16)");  // wave crest highlight
    g.addColorStop(0.7, "rgba(255, 255, 255, 0.05)");
    g.addColorStop(1, "rgba(0, 0, 0, 0.22)");      // wave trough shadow
    ctx.fillStyle = g;
    ctx.fillRect(0, y, size, stepY);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
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

  ctx.fillStyle = "rgb(128, 128, 255)";
  ctx.fillRect(0, 0, size, size);

  const imgData = ctx.getImageData(0, 0, size, size);
  const data = imgData.data;

  const stepX = size / repeatsX;
  const stepY = size / repeatsY;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const lx = x % stepX;
      const ly = y % stepY;

      // X direction (repeatsX, along slope): saw-tooth tile course profile
      const tX = lx / stepX;
      let slopeX = 0.15; // gentle upward tilt of the shingle
      if (tX > 0.90) {
        slopeX = -1.8; // steep drop-off at the overlapping edge
      }
      const r = Math.round(128 + slopeX * 70);

      // Y direction (repeatsY, along building length): sinusoidal wave profile
      const tY = ly / stepY;
      const slopeY = Math.sin(tY * Math.PI * 2);
      const g = Math.round(128 + slopeY * 45);

      const idx = (y * size + x) * 4;
      data[idx] = Math.max(0, Math.min(255, r));
      data[idx + 1] = Math.max(0, Math.min(255, g));
      data[idx + 2] = 230;
    }
  }

  ctx.putImageData(imgData, 0, 0);

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
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
  tex.anisotropy = 8;
  return tex;
}

