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

