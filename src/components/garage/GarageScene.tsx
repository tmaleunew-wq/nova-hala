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

export type ViewPreset = "iso" | "plan" | "front" | "side";

interface SceneProps {
  params: GarageParams;
  exportRef: React.MutableRefObject<THREE.Group | null>;
  removedPanels: Record<string, boolean>;
  onTogglePanel: (id: string) => void;
  hideDimensions?: boolean;
  showEnvironment?: boolean;
}

export function Scene({
  params,
  exportRef,
  removedPanels,
  onTogglePanel,
  hideDimensions,
  showEnvironment,
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
      <ambientLight intensity={0.55} />
      <directionalLight
        position={[8, 12, 6]}
        intensity={1.4}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
      />
      <directionalLight position={[-6, 8, -4]} intensity={0.35} />
      <hemisphereLight args={["#ffffff", "#9ca3af", 0.55]} />

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
      </group>

      {!hideDimensions && !!params.showCatalogDimensions && (
        <CatalogDimensions p={params} />
      )}

      {showEnvironment && <Environment p={params} />}

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
    const center = new THREE.Vector3(0, H / 2, 0);

    const isMobileViewport = typeof window !== "undefined" && window.innerWidth < 768;
    const aspect = typeof window !== "undefined" && window.innerHeight > 0 ? window.innerWidth / window.innerHeight : 1;

    // Calculate bounding dimensions
    const diag = Math.hypot(W, L);
    const maxDimension = Math.max(diag, H * 1.5);

    // Three.js perspective camera uses vertical FOV (35 deg)
    const vFovRad = ((camera.fov || 35) * Math.PI) / 180;
    const vertFactor = 2 * Math.tan(vFovRad / 2); // ≈ 0.63
    // On portrait mobile (aspect < 1), horizontal aperture is narrower:
    const horizFactor = vertFactor * Math.max(0.3, aspect);
    const effectiveFactor = aspect < 1 ? horizFactor : vertFactor;

    // Comfortable margin: 1.30 on mobile, 1.18 on desktop
    const margin = isMobileViewport ? 1.30 : 1.18;
    const dist = (maxDimension / effectiveFactor) * margin;

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
        const isoDir = new THREE.Vector3(-1.15, 0.70, -1.0).normalize();
        pos = center.clone().add(isoDir.multiplyScalar(dist));
        break;
      }
    }

    camera.position.copy(pos);
    camera.lookAt(center);
    camera.updateProjectionMatrix();
    if (controls) {
      controls.target.copy(center);
      controls.update();
    }
  }, [preset, params.width, params.length, params.clearHeight, params.hallType, camera, controls]);

  return null;
}
