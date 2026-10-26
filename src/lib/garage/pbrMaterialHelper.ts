import * as THREE from "three";
import {
  makeTrapezoidTexture,
  makeTrapezoidNormalTexture,
  makeTrapezoidRoughnessTexture,
  makeTrapezoidMetalnessTexture,
  makeTileTexture,
  makeTileNormalTexture,
  makeTileRoughnessTexture,
  makeTileMetalnessTexture,
  makeWoodTexture,
  makeWoodNormalTexture,
  makeWoodRoughnessTexture,
  makeStuccoTexture,
  makeStuccoNormalTexture,
  makeStuccoRoughnessTexture,
} from "./textures";

/**
 * Creates a high-fidelity PBR (Physically Based Rendering) material for cladding panels.
 * Generates procedural Albedo, Normal, Roughness, and Metalness maps to represent
 * trapezoidal corrugation/sandwich structure.
 */
export function createPBRCladdingMaterial(
  color: string,
  orientation: "vertical" | "horizontal" = "vertical",
  repeats = 40,
): THREE.MeshStandardMaterial {
  // 1. Generate Albedo (Diffuse) texture for base color
  const map = makeTrapezoidTexture(color, repeats, orientation);

  // 2. Generate high-resolution Normal map to simulate 3D corrugation (prevents Z-fighting)
  const normalMap = makeTrapezoidNormalTexture(repeats, orientation, 0.14, 75);

  // 3. Generate Roughness map for realistic micro-surface reflection variations
  const roughnessMap = makeTrapezoidRoughnessTexture(repeats, orientation, 0.46);

  // 4. Generate Metalness map representing a sheet-metal panel
  const metalnessMap = makeTrapezoidMetalnessTexture(repeats, orientation, 0.22);

  // Configure wrapping, repeats, and filters for all texture layers
  const textures = [map, normalMap, roughnessMap, metalnessMap];
  for (const tex of textures) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
  }

  // 5. Construct the PBR MeshStandardMaterial
  const material = new THREE.MeshStandardMaterial({
    map,
    normalMap,
    normalScale: new THREE.Vector2(1.5, 1.5), // controls depth of corrugation shadows
    roughnessMap,
    metalnessMap,
    roughness: 1.0, // multiplier for roughnessMap (1.0 means use roughnessMap as-is)
    metalness: 1.0, // multiplier for metalnessMap
    side: THREE.DoubleSide,
  });

  return material;
}

export function createPBRSmoothMaterial(
  color: string,
  repeatsX = 3.2,
  repeatsY = 3.2,
): THREE.MeshStandardMaterial {
  const map = makeStuccoTexture(color, repeatsX, repeatsY);
  const normalMap = makeStuccoNormalTexture(repeatsX, repeatsY);
  const roughnessMap = makeStuccoRoughnessTexture(repeatsX, repeatsY);

  return new THREE.MeshStandardMaterial({
    map,
    normalMap,
    normalScale: new THREE.Vector2(2.0, 2.0), // Crisp tactile plaster grain micro-shadows
    roughnessMap,
    roughness: 0.90, // Matte architectural plaster / stierka
    metalness: 0.02, // Non-metallic facade render
    side: THREE.DoubleSide,
  });
}

export function createPBRTileMaterial(
  color: string,
  repeatsX = 12,
  repeatsY = 14,
): THREE.MeshStandardMaterial {
  const map = makeTileTexture(color, repeatsX, repeatsY);
  const normalMap = makeTileNormalTexture(repeatsX, repeatsY);
  const roughnessMap = makeTileRoughnessTexture(repeatsX, repeatsY, 0.48);
  const metalnessMap = makeTileMetalnessTexture(repeatsX, repeatsY, 0.28);

  const textures = [map, normalMap, roughnessMap, metalnessMap];
  for (const tex of textures) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
  }

  return new THREE.MeshStandardMaterial({
    map,
    normalMap,
    normalScale: new THREE.Vector2(1.8, 1.8),
    roughnessMap,
    metalnessMap,
    roughness: 1.0,
    metalness: 1.0,
    side: THREE.DoubleSide,
  });
}

export function createPBRWoodMaterial(
  type: "golden_oak" | "walnut" = "golden_oak",
  orientation: "vertical" | "horizontal" = "horizontal",
  grainRepeat = 8,
): THREE.MeshStandardMaterial {
  const map = makeWoodTexture(type, grainRepeat);
  const normalMap = makeWoodNormalTexture(grainRepeat);
  const roughnessMap = makeWoodRoughnessTexture();

  const textures = [map, normalMap, roughnessMap];
  for (const tex of textures) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    if (orientation === "horizontal") {
      tex.rotation = Math.PI / 2;
      tex.center.set(0.5, 0.5);
    }
  }

  return new THREE.MeshStandardMaterial({
    map,
    normalMap,
    normalScale: new THREE.Vector2(0.85, 0.85),
    roughnessMap,
    roughness: 0.55,
    metalness: 0.05,
    side: THREE.DoubleSide,
  });
}

/**
 * Sets up a default, zero-dependency procedural environment map (HDRI equivalent)
 * to provide realistic light reflections, glossy highlights, and metallic luster.
 */
export function setupProceduralEnvMap(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
): THREE.Texture {
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();

  // Create a virtual environment scene
  const envScene = new THREE.Scene();

  // 1. Setup a sky/ground skybox representing neutral studio-like lighting for accurate colors
  const skyGeo = new THREE.BoxGeometry(100, 100, 100);
  const materials = [
    new THREE.MeshBasicMaterial({ color: 0xf3f4f6, side: THREE.BackSide }), // Right (Neutral light grey)
    new THREE.MeshBasicMaterial({ color: 0xf3f4f6, side: THREE.BackSide }), // Left (Neutral light grey)
    new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.BackSide }), // Top (Neutral white sky)
    new THREE.MeshBasicMaterial({ color: 0xe5e7eb, side: THREE.BackSide }), // Bottom (Neutral medium-light grey ground)
    new THREE.MeshBasicMaterial({ color: 0xf3f4f6, side: THREE.BackSide }), // Front (Neutral light grey)
    new THREE.MeshBasicMaterial({ color: 0xf3f4f6, side: THREE.BackSide }), // Back (Neutral light grey)
  ];
  const skyBox = new THREE.Mesh(skyGeo, materials);
  envScene.add(skyBox);

  // 2. Add high-intensity area light source (sun simulator) for specular reflections
  const sunGeo = new THREE.SphereGeometry(8, 16, 16);
  const sunMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const sun = new THREE.Mesh(sunGeo, sunMat);
  sun.position.set(30, 45, 20);
  envScene.add(sun);

  // 3. Add secondary ambient bounce light source
  const bounceGeo = new THREE.SphereGeometry(12, 16, 16);
  const bounceMat = new THREE.MeshBasicMaterial({ color: 0xf3f4f6 });
  const bounce = new THREE.Mesh(bounceGeo, bounceMat);
  bounce.position.set(-30, 20, -30);
  envScene.add(bounce);

  // Generate the PMREM environment target
  const envTarget = pmremGenerator.fromScene(envScene);

  // Assign to scene environment for PBR reflections
  scene.environment = envTarget.texture;

  // Cleanup generator assets from GPU memory
  pmremGenerator.dispose();

  return envTarget.texture;
}
