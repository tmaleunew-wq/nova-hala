import * as THREE from "three";
import type { GarageParams } from "./types";
import { ridgeHeight, highEave, getFrameZ } from "../../components/garage/Structure";

// Define the interface for a Snap Point
export interface SnapPoint {
  id: string; // Unique identifier of the snap slot (e.g., "left-0", "roof-left-1")
  position: THREE.Vector3; // Snap target position in world space
  rotation: THREE.Euler; // Snap target rotation in world space
  isOccupied: boolean; // Whether a panel is currently attached to this slot
  type: "wall" | "roof" | "gable" | "door"; // Category of the panel slot
}

export interface SnapPointsResult {
  panels: SnapPoint[];
  doors: SnapPoint[];
}

/**
 * STEP 1: SNAP POINTS CALCULATION
 * Computes all valid attachment slots on the steel frame for wall, roof, gable, and door panels.
 * Uses a dummy Object3D hierarchy to project local panel offsets into world coordinates.
 */
export function generateSnapPoints(p: GarageParams): SnapPointsResult {
  const snapPoints: SnapPoint[] = [];
  const W = p.width;
  const L = p.length;
  const Heave = p.clearHeight;
  const Hridge = ridgeHeight(p);
  const Hhi = highEave(p);
  const zs = getFrameZ(p);

  // Outer cladding configuration
  const panelThickness = p.panelType === "sandwich" ? 0.1 : 0.02;
  const sz = p.profileSize;
  const psz = sz * 0.7; // size of roof purlins

  // Calculate vertical offset for roof panels so they sit strictly on top of purlins
  const roofOffset = sz / 2 + psz + panelThickness / 2;

  // Auxiliary container for hierarchy conversions
  const parentDummy = new THREE.Object3D();
  const childDummy = new THREE.Object3D();
  parentDummy.add(childDummy);

  const getAbsoluteCoords = (
    parentPos: [number, number, number],
    parentRot: [number, number, number],
    childPos: [number, number, number],
  ) => {
    parentDummy.position.set(...parentPos);
    parentDummy.rotation.set(...parentRot);
    childDummy.position.set(...childPos);
    parentDummy.updateMatrixWorld(true);

    const targetPos = new THREE.Vector3();
    const targetQuat = new THREE.Quaternion();
    childDummy.getWorldPosition(targetPos);
    childDummy.getWorldQuaternion(targetQuat);

    const targetRot = new THREE.Euler().setFromQuaternion(targetQuat);
    return { position: targetPos, rotation: targetRot };
  };

  // --- 1. FRONT WALL (WALL-FRONT) ---
  // Default garage front wall center panel
  snapPoints.push({
    id: "front-0",
    ...getAbsoluteCoords([0, Heave / 2, -L / 2 - sz / 2 - panelThickness / 2], [0, Math.PI, 0], [0, 0, 0]),
    isOccupied: false,
    type: "wall",
  });

  // --- 2. BACK WALL (WALL-BACK) ---
  snapPoints.push({
    id: "back-0",
    ...getAbsoluteCoords([0, Heave / 2, L / 2 + sz / 2 + panelThickness / 2], [0, 0, 0], [0, 0, 0]),
    isOccupied: false,
    type: "wall",
  });

  // --- 3. LEFT WALL (WALL-LEFT) ---
  for (let i = 0; i < zs.length - 1; i++) {
    const zStart = zs[i];
    const zEnd = zs[i + 1];
    const zCenter = (zStart + zEnd) / 2;
    snapPoints.push({
      id: `left-${i}`,
      ...getAbsoluteCoords(
        [-W / 2 - sz / 2 - panelThickness / 2, Heave / 2, 0],
        [0, -Math.PI / 2, 0],
        [zCenter, 0, 0],
      ),
      isOccupied: false,
      type: "wall",
    });
  }

  // --- 4. RIGHT WALL (WALL-RIGHT) ---
  for (let i = 0; i < zs.length - 1; i++) {
    const zStart = zs[i];
    const zEnd = zs[i + 1];
    const zCenter = (zStart + zEnd) / 2;
    const rHeave = p.roofType === "shed" ? Hhi : Heave;
    snapPoints.push({
      id: `right-${i}`,
      ...getAbsoluteCoords(
        [W / 2 + sz / 2 + panelThickness / 2, rHeave / 2, 0],
        [0, Math.PI / 2, 0],
        [-zCenter, 0, 0],
      ),
      isOccupied: false,
      type: "wall",
    });
  }

  // --- 5. GABLES ---
  if (p.roofType === "gable") {
    // Front gable
    snapPoints.push({
      id: "gable-front",
      ...getAbsoluteCoords([0, (Heave + Hridge) / 2, -L / 2 - sz / 2 - panelThickness / 2], [0, Math.PI, 0], [0, 0, 0]),
      isOccupied: false,
      type: "gable",
    });
    // Back gable
    snapPoints.push({
      id: "gable-back",
      ...getAbsoluteCoords([0, (Heave + Hridge) / 2, L / 2 + sz / 2 + panelThickness / 2], [0, 0, 0], [0, 0, 0]),
      isOccupied: false,
      type: "gable",
    });
  }

  // --- 6. ROOF PANELS ---
  if (p.roofType === "gable") {
    const halfW = W / 2;
    const angle = Math.atan2(Hridge - Heave, halfW);

    for (const s of [-1, 1]) {
      const sideName = s === -1 ? "left" : "right";
      for (let i = 0; i < zs.length - 1; i++) {
        const zStart = zs[i];
        snapPoints.push({
          id: `roof-${sideName}-${i}`,
          ...getAbsoluteCoords(
            [(s * halfW) / 2, (Heave + Hridge) / 2, 0],
            [-Math.PI / 2, 0, -s * angle],
            [0, zStart, roofOffset],
          ),
          isOccupied: false,
          type: "roof",
        });
      }
    }
  } else {
    // Shed roof
    const angle = Math.atan2(Hhi - Heave, W);
    for (let i = 0; i < zs.length - 1; i++) {
      const zStart = zs[i];
      snapPoints.push({
        id: `roof-${i}`,
        ...getAbsoluteCoords(
          [0, (Heave + Hhi) / 2, 0],
          [-Math.PI / 2, 0, angle],
          [0, zStart, roofOffset],
        ),
        isOccupied: false,
        type: "roof",
      });
    }
  }

  // --- 7. DOOR SNAP POINTS (GROUND ELEVATION IN BAYS) ---
  const doorSnapPoints: SnapPoint[] = [];

  // Front wall center bay (ground level)
  doorSnapPoints.push({
    id: "door-front",
    ...getAbsoluteCoords([0, 0, -L / 2 - sz / 2 - panelThickness / 2], [0, Math.PI, 0], [0, 0, 0]),
    isOccupied: false,
    type: "door",
  });

  // Back wall center bay (ground level)
  doorSnapPoints.push({
    id: "door-back",
    ...getAbsoluteCoords([0, 0, L / 2 + sz / 2 + panelThickness / 2], [0, 0, 0], [0, 0, 0]),
    isOccupied: false,
    type: "door",
  });

  // Left wall bays (ground level)
  for (let i = 0; i < zs.length - 1; i++) {
    const zStart = zs[i];
    const zEnd = zs[i + 1];
    const zCenter = (zStart + zEnd) / 2;
    doorSnapPoints.push({
      id: `door-left-${i}`,
      ...getAbsoluteCoords(
        [-W / 2 - sz / 2 - panelThickness / 2, 0, 0],
        [0, -Math.PI / 2, 0],
        [zCenter, 0, 0],
      ),
      isOccupied: false,
      type: "door",
    });
  }

  // Right wall bays (ground level)
  for (let i = 0; i < zs.length - 1; i++) {
    const zStart = zs[i];
    const zEnd = zs[i + 1];
    const zCenter = (zStart + zEnd) / 2;
    doorSnapPoints.push({
      id: `door-right-${i}`,
      ...getAbsoluteCoords(
        [W / 2 + sz / 2 + panelThickness / 2, 0, 0],
        [0, Math.PI / 2, 0],
        [-zCenter, 0, 0],
      ),
      isOccupied: false,
      type: "door",
    });
  }

  return {
    panels: snapPoints,
    doors: doorSnapPoints,
  };
}
