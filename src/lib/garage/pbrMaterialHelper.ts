import * as THREE from "three";
import {
  makeTrapezoidTexture,
  makeTrapezoidNormalTexture,
  makeTrapezoidRoughnessTexture,
  makeTrapezoidMetalnessTexture,
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
  const map = makeTrapezoidTexture(color, repeats);

  // 2. Generate high-resolution Normal map to simulate 3D corrugation (prevents Z-fighting)
  const normalMap = makeTrapezoidNormalTexture(repeats, orientation, 0.15, 60);

  // 3. Generate Roughness map for realistic micro-surface reflection variations
  const roughnessMap = makeTrapezoidRoughnessTexture(repeats, orientation, 0.45);

  // 4. Generate Metalness map representing a sheet-metal panel
  const metalnessMap = makeTrapezoidMetalnessTexture(repeats, orientation, 0.85);

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
    normalScale: new THREE.Vector2(1.2, 1.2), // controls depth of corrugation shadows
    roughnessMap,
    metalnessMap,
    roughness: 1.0, // multiplier for roughnessMap (1.0 means use roughnessMap as-is)
    metalness: 1.0, // multiplier for metalnessMap
    side: THREE.DoubleSide,
  });

  return material;
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

  // 1. Setup a sky/ground skybox representing outdoor lighting
  const skyGeo = new THREE.BoxGeometry(100, 100, 100);
  const materials = [
    new THREE.MeshBasicMaterial({ color: 0x8a9ba8, side: THREE.BackSide }), // Right
    new THREE.MeshBasicMaterial({ color: 0x8a9ba8, side: THREE.BackSide }), // Left
    new THREE.MeshBasicMaterial({ color: 0xaec3d0, side: THREE.BackSide }), // Top (Sky blue light)
    new THREE.MeshBasicMaterial({ color: 0x3d4147, side: THREE.BackSide }), // Bottom (Ground dark reflection)
    new THREE.MeshBasicMaterial({ color: 0x8a9ba8, side: THREE.BackSide }), // Front
    new THREE.MeshBasicMaterial({ color: 0x8a9ba8, side: THREE.BackSide }), // Back
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
  const bounceMat = new THREE.MeshBasicMaterial({ color: 0xe0e6ed });
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
