import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { Grid } from "@react-three/drei";
import * as THREE from "three";
import type { GarageParams } from "@/lib/garage/types";
import { Structure } from "./Structure";
import { Cladding } from "./Cladding";
import { Accessories } from "./Accessories";
import { Foundation } from "./Foundation";
import { setupProceduralEnvMap } from "@/lib/garage/pbrMaterialHelper";
import { CatalogDimensions } from "./CatalogDimensions";
import { Environment } from "./Environment";
import { CustomGarageIsland } from "./CustomGarageIsland";
import { ModularExtension } from "./ModularExtension";

export type ViewPreset = "iso" | "plan" | "front" | "side";

interface SceneProps {
  params: GarageParams;
  exportRef: React.MutableRefObject<THREE.Group | null>;
  removedPanels: Record<string, boolean>;
  onTogglePanel: (id: string) => void;
  hideDimensions?: boolean;
  showEnvironment?: boolean;
  isCustom?: boolean;
}

export function Scene({
  params,
  exportRef,
  removedPanels,
  onTogglePanel,
  hideDimensions,
  showEnvironment,
  isCustom,
}: SceneProps) {
  const { gl, scene } = useThree();

  useEffect(() => {
    const envMap = setupProceduralEnvMap(scene, gl);
    return () => {
      if (scene.environment === envMap) {
        scene.environment = null;
      }
      envMap.dispose();
    };
  }, [gl, scene]);

  return (
    <>
      <ambientLight intensity={0.65} />
      <directionalLight
        position={[7, 14, -8]}
        intensity={1.6}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
        shadow-bias={-0.0001}
      />
      <directionalLight position={[-6, 8, 6]} intensity={0.4} />
      <hemisphereLight args={["#ffffff", "#888e99", 0.6]} />

      <group ref={exportRef}>
        {params.showFoundation && <Foundation p={params} />}
        {params.showStructure && <Structure p={params} explodeY={params.explode} />}
        {params.showCladding && (
          <Cladding
            p={params}
            explodeY={params.explode}
            removedPanels={removedPanels}
            onTogglePanel={onTogglePanel}
          />
        )}
        {params.showAccessories && <Accessories p={params} explodeY={params.explode} />}
        <ModularExtension p={params} />
      </group>

      {!hideDimensions && !!params.showCatalogDimensions && (
        <CatalogDimensions p={params} />
      )}

      {showEnvironment && (
        isCustom ? <CustomGarageIsland p={params} /> : <Environment p={params} />
      )}

      {!showEnvironment && (
        <Grid
          args={[100, 100]}
          cellSize={0.5}
          cellThickness={0.5}
          cellColor="#c0c4ca"
          sectionSize={2}
          sectionThickness={1}
          sectionColor="#8a8f97"
          fadeDistance={80}
          fadeStrength={1.2}
          infiniteGrid
          position={[0, -0.149, 0]}
        />
      )}
    </>
  );
}

export function CameraRig({ preset, params }: { preset: ViewPreset; params: GarageParams }) {
  const { camera, controls } = useThree() as {
    camera: THREE.PerspectiveCamera;
    controls: { target: THREE.Vector3; update: () => void } | null;
  };

  useEffect(() => {
    if (!camera) return;
    const W = params.width;
    const L = params.length;
    const H = params.clearHeight;

    const isMobileViewport = typeof window !== "undefined" && window.innerWidth < 768;
    const aspect = typeof window !== "undefined" && window.innerHeight > 0 ? window.innerWidth / window.innerHeight : 1;

    const isCustom = params.hallType === "Vlastný" || params.hallType === "vlastna_garaz" || !params.hallType;

    // Calculate bounding dimensions - bring custom garage closer to the viewer
    const islandW = isCustom ? W + 3.2 : W;
    const islandL = isCustom ? L + 2.8 : L;
    const diag = Math.hypot(islandW, islandL);
    const maxDimension = Math.max(diag, H * 1.5);
    const center = new THREE.Vector3(0, isCustom ? H * 0.42 : H / 2, isCustom ? -0.4 : 0);

    // Three.js perspective camera uses vertical FOV (35 deg)
    const vFovRad = ((camera.fov || 35) * Math.PI) / 180;
    const vertFactor = 2 * Math.tan(vFovRad / 2); // ≈ 0.63
    // On portrait mobile (aspect < 1), horizontal aperture is narrower:
    const horizFactor = vertFactor * Math.max(0.3, aspect);
    const effectiveFactor = aspect < 1 ? horizFactor : vertFactor;

    // Comfortable margin: enlarge view on the garage
    const margin = isMobileViewport ? 1.30 : (isCustom ? 0.88 : 1.18);
    const dist = (maxDimension / effectiveFactor) * margin;

    // ZAPF perspective: frontal 22° 3/4 angle on the gate with eye-level elevation
    const isoDir = new THREE.Vector3(
      isCustom ? -0.52 : -1.15,
      isCustom ? 0.36 : 0.70,
      isCustom ? -1.18 : -1.0
    ).normalize();
    // Shifting camera target: decreasing target.x shifts the garage to the left on screen
    const target = new THREE.Vector3(
      isCustom && !isMobileViewport && preset === "iso" ? 0.15 : 0,
      isCustom ? H * 0.42 : H / 2,
      isCustom ? -0.4 : 0
    );

    let pos: THREE.Vector3;
    switch (preset) {
      case "plan":
        pos = new THREE.Vector3(0.001, center.y + (Math.max(W, L) / effectiveFactor) * margin, 0);
        break;
      case "front":
        pos = new THREE.Vector3(0, center.y, center.z - (Math.max(W, H) / effectiveFactor) * margin);
        break;
      case "side":
        pos = new THREE.Vector3(center.x + (Math.max(L, H) / effectiveFactor) * margin, center.y, 0);
        break;
      case "iso":
      default: {
        pos = target.clone().add(isoDir.multiplyScalar(dist));
        break;
      }
    }

    camera.position.copy(pos);
    camera.lookAt(target);
    camera.updateProjectionMatrix();
    if (controls) {
      controls.target.copy(target);
      controls.update();
    }
  }, [preset, params.width, params.length, params.clearHeight, params.hallType, camera, controls]);

  return null;
}
