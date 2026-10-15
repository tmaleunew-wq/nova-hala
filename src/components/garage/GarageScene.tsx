import { useEffect, useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { Grid } from "@react-three/drei";
import * as THREE from "three";
import type { GarageParams } from "@/lib/garage/types";
import { Structure, getPersonalDoorZ } from "./Structure";
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
        shadow-camera-left={-22}
        shadow-camera-right={22}
        shadow-camera-top={22}
        shadow-camera-bottom={-22}
        shadow-bias={-0.00002}
        shadow-normalBias={0.04}
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

export function CameraRig({
  preset,
  params,
  focusTab,
  onUserInteract,
}: {
  preset: ViewPreset;
  params: GarageParams;
  focusTab?: string;
  onUserInteract?: () => void;
}) {
  const { camera, controls } = useThree() as {
    camera: THREE.PerspectiveCamera;
    controls: { target: THREE.Vector3; update: () => void } | null;
  };

  const targetPos = useRef<THREE.Vector3>(new THREE.Vector3());
  const targetLook = useRef<THREE.Vector3>(new THREE.Vector3());
  const isTransitioning = useRef<boolean>(false);
  const transitionTimer = useRef<any>(null);
  const isInitialMount = useRef<boolean>(true);

  useEffect(() => {
    if (!controls) return;
    const handleStart = () => {
      isTransitioning.current = false;
      onUserInteract?.();
    };
    (controls as any).addEventListener?.("start", handleStart);
    return () => {
      (controls as any).removeEventListener?.("start", handleStart);
    };
  }, [controls, onUserInteract]);

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

    const isRoofFocus = focusTab === "roof" && preset === "iso";
    const isDoorsFocus = focusTab === "doors" && preset === "iso";
    const isPersonalDoorFocus =
      isDoorsFocus &&
      params.hasPersonalDoor &&
      params.doorFocus === "personalDoor";
    const isGateFocus = isDoorsFocus && !isPersonalDoorFocus;
    const isExtensionFocus = focusTab === "extension" && preset === "iso";
    const extSign = params.extensionSide === "left" ? -1 : 1;

    const isSingleGarage = (params.gateCount ?? 1) === 1 && W <= 4.5;
    const mobileOffsetY = isSingleGarage ? -H * 0.32 : -H * 0.45;

    // Comfortable margin: keep garage consistently framed and elevated on mobile
    const margin = isMobileViewport
      ? (isRoofFocus
          ? 0.88
          : isExtensionFocus
          ? 0.72
          : (isSingleGarage ? 1.02 : 1.22))
      : (isRoofFocus
          ? 0.60
          : isExtensionFocus
          ? 0.72
          : (isCustom ? 0.92 : 1.18));
    const dist = (maxDimension / effectiveFactor) * margin;

    const isoDir = isRoofFocus
      ? new THREE.Vector3(
          isCustom ? -0.44 : -0.75,
          isCustom ? 0.70 : 0.82,
          isCustom ? -0.88 : -0.85
        ).normalize()
      : isExtensionFocus
      ? new THREE.Vector3(
          extSign * 0.95,
          0.42,
          -0.95
        ).normalize()
      : new THREE.Vector3(
          isCustom ? -0.65 : -1.15,
          isCustom ? 0.38 : 0.70,
          isCustom ? -1.10 : -1.0
        ).normalize();

    // Shifting camera target: offset to the left of desktop screen so it is never covered by right sidebar
    let target = new THREE.Vector3(
      isExtensionFocus
        ? (params.extensionWidth ?? 3.5) * 0.3 * extSign
        : (isCustom && !isMobileViewport && preset === "iso" ? 0.70 : 0),
      isMobileViewport
        ? (isRoofFocus ? mobileOffsetY + 0.45 : mobileOffsetY)
        : (isRoofFocus ? H + 0.35 : (isCustom ? H * 0.42 : H / 2)),
      isRoofFocus ? 0 : (isCustom ? -0.2 : 0)
    );

    let pos: THREE.Vector3;
    if (preset === "iso" && isGateFocus) {
      // Pohľad na prednú stenu a celú garážovú bránu s väčším odstupom
      const frontMax = Math.max(W + 1.2, H * 1.5);
      const frontDist = (frontMax / effectiveFactor) * (isMobileViewport ? 1.40 : 1.30);
      const frontTargetY = isMobileViewport ? mobileOffsetY + H * 0.48 : H * 0.48;
      const frontTargetX = isMobileViewport ? 0 : 0.65;
      target = new THREE.Vector3(frontTargetX, frontTargetY, -L / 2);
      const gateDir = new THREE.Vector3(isMobileViewport ? -0.12 : -0.20, 0.16, -1.0).normalize();
      pos = target.clone().add(gateDir.multiplyScalar(frontDist));
    } else if (preset === "iso" && isPersonalDoorFocus) {
      // Pohľad na stenu / stranu, kde sú umiestnené vchodové dvere s väčším odstupom
      const doorOffsetX = isMobileViewport ? 0 : 0.55;
      const sideMax = Math.max(L * 0.95 + 1.0, H * 1.5);
      const sideDist = (sideMax / effectiveFactor) * (isMobileViewport ? 1.40 : 1.30);
      const sideTargetY = isMobileViewport ? mobileOffsetY + H * 0.48 : H * 0.48;

      let doorDir = new THREE.Vector3();
      if (params.personalDoorSide === "left") {
        // Pohľad na ľavú stranu garáže
        target = new THREE.Vector3(-W / 2 + doorOffsetX, sideTargetY, 0);
        doorDir = new THREE.Vector3(-1.0, 0.18, -0.15).normalize();
        pos = target.clone().add(doorDir.multiplyScalar(sideDist));
      } else if (params.personalDoorSide === "right") {
        // Pohľad na pravú stranu garáže
        target = new THREE.Vector3(W / 2 + doorOffsetX, sideTargetY, 0);
        doorDir = new THREE.Vector3(1.0, 0.18, -0.15).normalize();
        pos = target.clone().add(doorDir.multiplyScalar(sideDist));
      } else if (params.personalDoorSide === "front_left") {
        // Pohľad na prednú stenu vľavo
        const frontDoorDist = (Math.max(W + 1.2, H * 1.5) / effectiveFactor) * (isMobileViewport ? 1.40 : 1.30);
        target = new THREE.Vector3(-W * 0.25 + doorOffsetX, sideTargetY, -L / 2);
        doorDir = new THREE.Vector3(-0.35, 0.18, -1.0).normalize();
        pos = target.clone().add(doorDir.multiplyScalar(frontDoorDist));
      } else if (params.personalDoorSide === "front_right") {
        // Pohľad na prednú stenu vpravo
        const frontDoorDist = (Math.max(W + 1.2, H * 1.5) / effectiveFactor) * (isMobileViewport ? 1.40 : 1.30);
        target = new THREE.Vector3(W * 0.25 + doorOffsetX, sideTargetY, -L / 2);
        doorDir = new THREE.Vector3(0.35, 0.18, -1.0).normalize();
        pos = target.clone().add(doorDir.multiplyScalar(frontDoorDist));
      } else {
        // Pohľad na zadnú stenu garáže
        const backDist = (Math.max(W + 1.2, H * 1.5) / effectiveFactor) * (isMobileViewport ? 1.40 : 1.30);
        target = new THREE.Vector3(doorOffsetX, sideTargetY, L / 2);
        doorDir = new THREE.Vector3(-0.20, 0.18, 1.0).normalize();
        pos = target.clone().add(doorDir.multiplyScalar(backDist));
      }
    } else {
      switch (preset) {
        case "plan":
          // Epsilon offset on Z to prevent gimbal-lock singularity with camera.up
          pos = new THREE.Vector3(target.x, center.y + (Math.max(W, L) / effectiveFactor) * margin, 0.005);
          break;
        case "front":
          pos = new THREE.Vector3(target.x, center.y + 0.08, center.z - (Math.max(W, H) / effectiveFactor) * margin);
          break;
        case "side":
          pos = new THREE.Vector3(center.x + (Math.max(L, H) / effectiveFactor) * margin, center.y + 0.08, 0);
          break;
        case "iso":
        default: {
          pos = target.clone().add(isoDir.multiplyScalar(dist));
          break;
        }
      }
    }

    clearTimeout(transitionTimer.current);
    targetPos.current.copy(pos);
    targetLook.current.copy(target);

    if (isInitialMount.current) {
      camera.position.copy(pos);
      if (controls) {
        controls.target.copy(target);
        controls.update();
      } else {
        camera.lookAt(target);
      }
      camera.updateProjectionMatrix();
      isInitialMount.current = false;
      isTransitioning.current = false;
      return;
    }

    isTransitioning.current = true;
    transitionTimer.current = setTimeout(() => {
      isTransitioning.current = false;
    }, 1000);
  }, [
    preset,
    params.width,
    params.length,
    params.clearHeight,
    params.hallType,
    focusTab,
    params.doorFocus,
    params.hasPersonalDoor,
    params.personalDoorSide,
    params.personalDoorPosition,
    params.doorWidth,
    params.doorHeight,
    params.gateCount,
    params.extensionSide,
    params.extensionWidth,
    params.hasExtension,
    camera,
  ]);

  useFrame((_, delta) => {
    if (!isTransitioning.current) return;
    const speed = Math.min(1, delta * 4.2);
    camera.position.lerp(targetPos.current, speed);
    if (controls) {
      controls.target.lerp(targetLook.current, speed);
      controls.update();
    } else {
      camera.lookAt(targetLook.current);
    }
    camera.updateProjectionMatrix();

    if (camera.position.distanceTo(targetPos.current) < 0.08) {
      camera.position.copy(targetPos.current);
      if (controls) {
        controls.target.copy(targetLook.current);
        controls.update();
      }
      isTransitioning.current = false;
    }
  });

  return null;
}
