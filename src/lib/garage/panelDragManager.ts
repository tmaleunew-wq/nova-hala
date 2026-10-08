import * as THREE from "three";
import type { GarageParams } from "./types";
import { ridgeHeight } from "@/components/garage/Structure";
import { generateSnapPoints, type SnapPoint, type SnapPointsResult } from './snapPointsGenerator';
export { generateSnapPoints, type SnapPoint, type SnapPointsResult };


export interface OrbitControlsLike {
  enabled: boolean;
}

// Placed panel application state structure decoupled from Three.js
export interface PlacedPanel {
  id: string; // Panel unique identifier matching snapPoint id
  gridX: number; // Column or bay index
  gridY: number; // Row or vertical height index
  wallPosition: string; // e.g., "left", "right", "front", "back", "roof-left", etc.
  type?: "standard" | "composite-door";
}

/**
 * STEP 2 & 3: PANEL DRAG AND DROP MANAGER
 * Handles the pointer interaction, camera locking, mathematical plane alignment,
 * raycasting, snapping, and cleanup.
 */
export class PanelDragManager {
  private camera: THREE.Camera;
  private scene: THREE.Scene;
  private orbitControls: OrbitControlsLike | null;

  // Snap parameters
  private snapPoints: SnapPoint[] = [];
  private snappingThreshold: number = 0.5; // Snap range in meters

  // State variables
  private draggedPanel: THREE.Object3D | null = null;
  private originalPosition: THREE.Vector3 | null = null;
  private originalRotation: THREE.Euler | null = null;
  private originalSnapPointId: string | null = null;

  // Drag mathematical plane & raycasting
  private dragPlane: THREE.Plane = new THREE.Plane();
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private pointer: THREE.Vector2 = new THREE.Vector2();

  // Draggable targets array
  public draggablePanels: THREE.Object3D[] = [];

  // Callback hooks for application integration
  public onSnapSuccess: (panelId: string, snapPointId: string) => void = () => {};
  public onPanelRemoved: (panelId: string) => void = () => {};
  public addPanelToState: (snapPoint: SnapPoint) => void = () => {};

  constructor(
    camera: THREE.Camera,
    scene: THREE.Scene,
    orbitControls: OrbitControlsLike | null,
    snapPoints: SnapPoint[],
  ) {
    this.camera = camera;
    this.scene = scene;
    this.orbitControls = orbitControls;
    this.snapPoints = snapPoints;
  }

  /**
   * Updates the list of available snap points (e.g., when parameters change)
   */
  public setSnapPoints(snapPoints: SnapPoint[]) {
    this.snapPoints = snapPoints;
  }

  /**
   * POINTER DOWN HANDLER
   * Identifies if a draggable panel (or InstancedMesh instance) is clicked, initializes dragging state,
   * configures the mathematical drag plane, and disables orbit controls.
   * If clicking an InstancedMesh, hides the instance and spawns a temporary clone for drag feedback.
   */
  public onPointerDown(event: PointerEvent, domElement: HTMLElement) {
    this.updatePointerCoords(event, domElement);

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersects = this.raycaster.intersectObjects(this.draggablePanels, true);

    if (intersects.length > 0) {
      const hit = intersects[0];
      const hitObject = hit.object;

      // Handle InstancedMesh selection
      if (hitObject instanceof THREE.InstancedMesh && hit.instanceId !== undefined) {
        const instanceId = hit.instanceId;
        const map = hitObject.userData.instanceToPanelIdMap as string[] | undefined;
        const panelId = map ? map[instanceId] : null;

        if (panelId) {
          // 1. Hide the clicked instance in the InstancedMesh by scaling its matrix to 0
          const zeroMatrix = new THREE.Matrix4().makeScale(0, 0, 0);
          hitObject.setMatrixAt(instanceId, zeroMatrix);
          hitObject.instanceMatrix.needsUpdate = true;

          // Recalculate trims immediately by notifying application state that the panel is picked up
          this.onPanelRemoved(panelId);

          // 2. Spawn a temporary standard THREE.Mesh for dragging visual (shares geometry & material)
          const tempMesh = new THREE.Mesh(hitObject.geometry, hitObject.material);
          tempMesh.userData = {
            panelId,
            instanceId, // store so we know which instance we are dragging
            instancedMesh: hitObject,
            isTemporaryDrag: true,
          };

          // Setup initial position/rotation at the matched snap point
          const snapPoint = this.snapPoints.find((sp) => sp.id === panelId);
          if (snapPoint) {
            tempMesh.position.copy(snapPoint.position);
            tempMesh.rotation.copy(snapPoint.rotation);
            snapPoint.isOccupied = false;
          }

          this.scene.add(tempMesh);
          this.draggedPanel = tempMesh;
          this.originalPosition = tempMesh.position.clone();
          this.originalRotation = tempMesh.rotation.clone();
          this.originalSnapPointId = panelId;
        }
      } else {
        // Fallback for standard non-instanced meshes
        let obj: THREE.Object3D | null = hitObject;
        while (obj && obj.parent && obj.parent !== this.scene && !obj.name.startsWith("panel-")) {
          obj = obj.parent;
        }
        if (!obj) obj = hitObject;

        this.draggedPanel = obj;
        this.originalPosition = this.draggedPanel.position.clone();
        this.originalRotation = this.draggedPanel.rotation.clone();

        const panelId = this.draggedPanel.userData.panelId || this.draggedPanel.name;

        // Recalculate trims immediately by notifying application state that the panel is picked up
        this.onPanelRemoved(panelId);

        const snapPoint = this.snapPoints.find((sp) => sp.id === panelId);
        if (snapPoint) {
          snapPoint.isOccupied = false;
          this.originalSnapPointId = snapPoint.id;
        } else {
          this.originalSnapPointId = null;
        }
      }

      if (this.draggedPanel) {
        // Configure the math plane to face the camera, passing through the panel's origin
        const normal = new THREE.Vector3();
        this.camera.getWorldDirection(normal);
        normal.negate(); // Point towards camera
        this.dragPlane.setFromNormalAndCoplanarPoint(normal, this.originalPosition!);

        // Disable camera rotation/panning during drag
        if (this.orbitControls) {
          this.orbitControls.enabled = false;
        }
      }
    }
  }

  /**
   * POINTER MOVE HANDLER
   * Performs raycasting against the mathematically oriented drag plane,
   * updates the dragged panel's position, and previews potential snaps.
   */
  public onPointerMove(event: PointerEvent, domElement: HTMLElement) {
    if (!this.draggedPanel) return;

    this.updatePointerCoords(event, domElement);
    this.raycaster.setFromCamera(this.pointer, this.camera);

    const intersectionPoint = new THREE.Vector3();
    // Mathematical ray-plane intersection (highly performant, avoids costly mesh raycasting)
    if (this.raycaster.ray.intersectPlane(this.dragPlane, intersectionPoint)) {
      // Find the closest valid snap point
      const closest = this.getClosestSnapPoint(intersectionPoint);

      if (closest && closest.distance < this.snappingThreshold && !closest.point.isOccupied) {
        // Soft snap orientation: lock orientation to match snap point exactly
        this.draggedPanel.rotation.copy(closest.point.rotation);

        // Soft snap position: interpolate (magnetic pull) towards snap point, allowing slight drift
        // 0.4 means it pulls 40% towards the snap target, and stays 60% with the cursor
        this.draggedPanel.position.lerpVectors(closest.point.position, intersectionPoint, 0.4);
      } else {
        // Free movement: position follows cursor, orientation restored to original
        this.draggedPanel.position.copy(intersectionPoint);
        if (this.originalRotation) {
          this.draggedPanel.rotation.copy(this.originalRotation);
        }
      }
    }
  }

  /**
   * POINTER UP HANDLER
   * Emits an add event to the external state on successful drops,
   * disposes of the temporary dragged mesh in either case, and re-enables camera controls.
   */
  public onPointerUp() {
    if (!this.draggedPanel) return;

    const currentPos = this.draggedPanel.position;
    const closest = this.getClosestSnapPoint(currentPos);
    const panelId = this.draggedPanel.userData.panelId || this.draggedPanel.name;

    if (closest && closest.distance < this.snappingThreshold && !closest.point.isOccupied) {
      // SUCCESSFUL DROP: Emit event to decoupled application state.
      // We DO NOT leave the temporary THREE.Mesh in the scene.
      this.addPanelToState(closest.point);
    } else {
      // INVALID DROP / OUTSIDE: Notify application state if necessary
      this.onPanelRemoved(panelId);
    }

    // Always dispose of the temporary dragged panel to avoid WebGL memory leaks
    this.disposePanel(this.draggedPanel);

    // Reset interaction state
    this.draggedPanel = null;
    this.originalPosition = null;
    this.originalRotation = null;
    this.originalSnapPointId = null;

    if (this.orbitControls) {
      this.orbitControls.enabled = true;
    }
  }

  /**
   * Helper to normalize mouse coordinates into webGL clip space (-1 to +1)
   */
  private updatePointerCoords(event: PointerEvent, domElement: HTMLElement) {
    const rect = domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  /**
   * Finds the closest snap point and returns it with the distance
   */
  private getClosestSnapPoint(position: THREE.Vector3) {
    let closestPoint: SnapPoint | null = null;
    let minDistance = Infinity;

    for (const sp of this.snapPoints) {
      const d = position.distanceTo(sp.position);
      if (d < minDistance) {
        minDistance = d;
        closestPoint = sp;
      }
    }

    if (!closestPoint) return null;
    return { point: closestPoint, distance: minDistance };
  }

  /**
   * Recursively disposes of all geometries and materials attached to the object
   * to avoid WebGL memory leaks, then removes it from the scene graph.
   * If the object is a temporary drag mesh cloning shared assets, disposes only the mesh itself.
   */
  private disposePanel(obj: THREE.Object3D) {
    const isTempDrag = obj.userData?.isTemporaryDrag === true;

    obj.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        // CRITICAL: Do NOT dispose geometry/material if they are shared with InstancedMesh!
        if (!isTempDrag) {
          if (child.geometry) {
            child.geometry.dispose();
          }
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach((mat) => mat.dispose());
            } else {
              child.material.dispose();
            }
          }
        }
      }
    });

    if (obj.parent) {
      obj.parent.remove(obj);
    } else {
      this.scene.remove(obj);
    }
  }
}

export interface InstancedPanelMeshes {
  panels: THREE.InstancedMesh;
  headers: THREE.InstancedMesh;
  doors: THREE.InstancedMesh;
}

/**
 * Helper to dynamically construct Corner Trim flashing geometries.
 */
function createCornerTrim(
  xSign: number,
  zSign: number,
  W: number,
  L: number,
  sz: number,
  panelThickness: number,
  Heave: number,
  color: string,
): THREE.Group {
  const group = new THREE.Group();
  group.name = `trim-corner-${xSign > 0 ? "R" : "L"}-${zSign > 0 ? "B" : "F"}`;

  const trimWidth = 0.15; // 150mm flashing legs
  const trimThick = 0.002;
  const geom = new THREE.BoxGeometry(trimWidth, Heave, trimThick);
  const mat = new THREE.MeshStandardMaterial({
    color: color,
    metalness: 0.8,
    roughness: 0.45,
  });

  // World coordinates of outer corner
  const xc = xSign * (W / 2 + sz / 2 + panelThickness);
  const zc = zSign * (L / 2 + sz / 2 + panelThickness);

  // Face 1: Parallel to Front/Back wall (X-axis)
  const face1 = new THREE.Mesh(geom, mat);
  face1.position.set(xc - xSign * (trimWidth / 2), Heave / 2, zc + zSign * (trimThick / 2 + 0.001));
  group.add(face1);

  // Face 2: Parallel to Left/Right wall (Z-axis)
  const face2 = new THREE.Mesh(geom, mat);
  face2.rotation.y = Math.PI / 2;
  face2.position.set(xc + xSign * (trimThick / 2 + 0.001), Heave / 2, zc - zSign * (trimWidth / 2));
  group.add(face2);

  return group;
}

/**
 * Helper to dynamically construct Ridge Cap flashing geometries at the apex of the roof.
 */
function createRidgeCap(
  W: number,
  L: number,
  sz: number,
  panelThickness: number,
  Heave: number,
  Hridge: number,
  color: string,
): THREE.Group {
  const group = new THREE.Group();
  group.name = "trim-ridge-cap";

  const halfW = W / 2;
  const angle = Math.atan2(Hridge - Heave, halfW);
  const psz = sz * 0.7;
  const roofOuterOffset = sz / 2 + psz + panelThickness;

  // Height at apex X=0
  const yApex = Hridge + roofOuterOffset / Math.cos(angle);

  const capWidth = 0.25; // 250mm wings
  const capThick = 0.002;
  const geom = new THREE.BoxGeometry(capWidth, capThick, L + 0.02);
  const mat = new THREE.MeshStandardMaterial({
    color: color,
    metalness: 0.8,
    roughness: 0.45,
  });

  // Left wing
  const leftWing = new THREE.Mesh(geom, mat);
  leftWing.rotation.z = angle;
  leftWing.position.set(
    -(capWidth / 2) * Math.cos(angle),
    yApex - (capWidth / 2) * Math.sin(angle) + 0.002, // 2mm offset to avoid Z-fighting
    0,
  );
  group.add(leftWing);

  // Right wing
  const rightWing = new THREE.Mesh(geom, mat);
  rightWing.rotation.z = -angle;
  rightWing.position.set(
    (capWidth / 2) * Math.cos(angle),
    yApex - (capWidth / 2) * Math.sin(angle) + 0.002,
    0,
  );
  group.add(rightWing);

  return group;
}

/**
 * STEP 3: MASTER RENDER / SYNCHRONIZATION FUNCTION (INSTANCED VERSION)
 * Re-instantiates and aligns 3D panel meshes strictly based on the decoupled
 * application state and latest calculated snap points, using a THREE.InstancedMesh
 * for high-performance rendering. Supports composite-door states with headers.
 * Automatically generates overlay trims for corners and roof ridge apex to prevent gaps.
 */
export function syncPanelsToScene(
  stateArray: PlacedPanel[],
  snapPoints: SnapPointsResult | SnapPoint[],
  meshes: InstancedPanelMeshes | THREE.InstancedMesh,
  params: GarageParams,
) {
  // Normalize snap points into panels/doors result
  const hasResultStructure = !Array.isArray(snapPoints);
  const panelsSnaps = hasResultStructure
    ? (snapPoints as SnapPointsResult).panels
    : (snapPoints as SnapPoint[]);
  const doorsSnaps = hasResultStructure ? (snapPoints as SnapPointsResult).doors : [];

  // Check if we are using the optimized multi-mesh layout
  const isMultiMesh = !(meshes instanceof THREE.InstancedMesh);

  const panelsMesh = isMultiMesh
    ? (meshes as InstancedPanelMeshes).panels
    : (meshes as THREE.InstancedMesh);
  const headersMesh = isMultiMesh ? (meshes as InstancedPanelMeshes).headers : null;
  const doorsMesh = isMultiMesh ? (meshes as InstancedPanelMeshes).doors : null;

  // 1. Reset occupancy status of all snap points
  for (const sp of panelsSnaps) {
    sp.isOccupied = false;
  }
  for (const sp of doorsSnaps) {
    sp.isOccupied = false;
  }

  // 2. Clear all matrices in all meshes by scaling to 0
  const zeroMatrix = new THREE.Matrix4().makeScale(0, 0, 0);

  const clearMesh = (mesh: THREE.InstancedMesh) => {
    for (let i = 0; i < mesh.count; i++) {
      mesh.setMatrixAt(i, zeroMatrix);
    }
  };

  clearMesh(panelsMesh);
  if (headersMesh) clearMesh(headersMesh);
  if (doorsMesh) clearMesh(doorsMesh);

  // 3. Setup index mapping trackers for raycasting lookup
  const panelsMap: string[] = [];
  const headersMap: string[] = [];
  const doorsMap: string[] = [];

  let panelsCount = 0;
  let headersCount = 0;
  let doorsCount = 0;

  const doorHeight = params.doorHeight || 2.2;

  // 4. Render based on decoupled state
  for (const item of stateArray) {
    if (item.type === "composite-door") {
      if (!isMultiMesh) continue; // Skip if we don't have multi-mesh support configured

      // Find the corresponding wall snap point (e.g. "left-2" instead of "left-2-composite")
      const wallId = item.id.replace("-composite", "");
      const wallSnap = panelsSnaps.find((sp) => sp.id === wallId);

      // Also find the door snap point for occupancy state
      const doorId = `door-${wallId}`;
      const doorSnap = doorsSnaps.find((sp) => sp.id === doorId);

      if (wallSnap && doorSnap) {
        wallSnap.isOccupied = true;
        doorSnap.isOccupied = true;

        // Render the Door at ground level
        if (doorsMesh && doorsCount < doorsMesh.count) {
          const matrix = new THREE.Matrix4();
          const q = new THREE.Quaternion().setFromEuler(wallSnap.rotation);
          matrix.compose(wallSnap.position, q, new THREE.Vector3(1, 1, 1));
          doorsMesh.setMatrixAt(doorsCount, matrix);
          doorsMap[doorsCount] = doorId;
          doorsCount++;
        }

        // Render the Header panel above the door
        if (headersMesh && headersCount < headersMesh.count) {
          const matrix = new THREE.Matrix4();
          // Header sits at y = snapPoint.position.y + doorHeight
          const headerPos = wallSnap.position.clone().add(new THREE.Vector3(0, doorHeight, 0));
          const q = new THREE.Quaternion().setFromEuler(wallSnap.rotation);
          matrix.compose(headerPos, q, new THREE.Vector3(1, 1, 1));
          headersMesh.setMatrixAt(headersCount, matrix);
          headersMap[headersCount] = wallId;
          headersCount++;
        }
      }
    } else {
      // Standard panel rendering
      const match = panelsSnaps.find((sp) => sp.id === item.id);
      if (match && panelsCount < panelsMesh.count) {
        const matrix = new THREE.Matrix4();
        const q = new THREE.Quaternion().setFromEuler(match.rotation);
        matrix.compose(match.position, q, new THREE.Vector3(1, 1, 1));
        panelsMesh.setMatrixAt(panelsCount, matrix);

        match.isOccupied = true;
        panelsMap[panelsCount] = item.id;
        panelsCount++;
      }
    }
  }

  // 5. Store mappings and trigger updates
  panelsMesh.userData.instanceToPanelIdMap = panelsMap;
  panelsMesh.instanceMatrix.needsUpdate = true;

  if (headersMesh) {
    headersMesh.userData.instanceToPanelIdMap = headersMap;
    headersMesh.instanceMatrix.needsUpdate = true;
  }
  if (doorsMesh) {
    doorsMesh.userData.instanceToPanelIdMap = doorsMap;
    doorsMesh.instanceMatrix.needsUpdate = true;
  }

  // 6. DYNAMIC AUTOMATIC FLASHINGS/TRIMS GENERATION
  const parentGroup = panelsMesh.parent;
  if (parentGroup) {
    // Clear previously rendered procedural trims to prevent memory leaks
    const oldTrims = parentGroup.children.filter((c) => c.name.startsWith("trim-"));
    for (const trim of oldTrims) {
      parentGroup.remove(trim);
      trim.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
            else child.material.dispose();
          }
        }
      });
    }

    // Detect if panels are present on adjacent walls
    const hasLeft = stateArray.some((p) => p.wallPosition === "left");
    const hasRight = stateArray.some((p) => p.wallPosition === "right");
    const hasFront = stateArray.some((p) => p.wallPosition === "front");
    const hasBack = stateArray.some((p) => p.wallPosition === "back");

    const W = params.width;
    const L = params.length;
    const Heave = params.clearHeight;
    const Hridge = ridgeHeight(params);
    const sz = params.profileSize;
    const panelThickness = params.panelType === "sandwich" ? 0.1 : 0.02;
    const trimColor = params.claddingColor || "#3a4048";

    // Build Corner Flashings when adjacent walls meet
    if (hasLeft && hasFront) {
      parentGroup.add(createCornerTrim(-1, -1, W, L, sz, panelThickness, Heave, trimColor));
    }
    if (hasRight && hasFront) {
      parentGroup.add(createCornerTrim(1, -1, W, L, sz, panelThickness, Heave, trimColor));
    }
    if (hasLeft && hasBack) {
      parentGroup.add(createCornerTrim(-1, 1, W, L, sz, panelThickness, Heave, trimColor));
    }
    if (hasRight && hasBack) {
      parentGroup.add(createCornerTrim(1, 1, W, L, sz, panelThickness, Heave, trimColor));
    }

    // Build Ridge Cap flashing at roof apex for gable configurations
    if (params.roofType === "gable") {
      const hasRoofLeft = stateArray.some((p) => p.id.includes("roof-left"));
      const hasRoofRight = stateArray.some((p) => p.id.includes("roof-right"));
      if (hasRoofLeft && hasRoofRight) {
        parentGroup.add(
          createRidgeCap(W, L, sz, panelThickness, Heave, Hridge, params.roofColor || "#2b2f36"),
        );
      }
    }
  }
}

/**
 * RE-VALIDATION LOGIC FOR STRUCTURAL CHANGES
 * Recalculates snap points based on updated garage configuration parameters
 * and prunes any placed panels that are now out-of-bounds (e.g., due to reduced length or bay count).
 */
export function handleParametersChange(
  currentPanels: PlacedPanel[],
  newParams: GarageParams,
  meshes: InstancedPanelMeshes | THREE.InstancedMesh,
): { updatedPanels: PlacedPanel[]; newSnapPoints: SnapPointsResult } {
  // 1. Recalculate the snap points array based on new parameters
  const newSnapPoints = generateSnapPoints(newParams);

  // 2, 3 & 4. Iterate through panelState and check if the coordinates/IDs still exist
  const updatedPanels = currentPanels.filter((panel) => {
    // If it's a composite door, we match the root wall ID
    const searchId = panel.id.replace("-composite", "");
    return newSnapPoints.panels.some((sp) => {
      // Validate by ID match (which inherently encodes gridX/gridY/wallPosition)
      if (sp.id === searchId) {
        return true;
      }

      // Fallback coordinate validation: check if position and coordinates match
      const isSameWall = sp.type === panel.wallPosition;
      const isSameGridX = sp.id.includes(`${panel.wallPosition}-${panel.gridX}`);
      return isSameWall && isSameGridX;
    });
  });

  // 5. Call syncPanelsToScene to visually update the InstancedMesh representation
  syncPanelsToScene(updatedPanels, newSnapPoints, meshes, newParams);

  return {
    updatedPanels,
    newSnapPoints,
  };
}

/**
 * CONFLICT RESOLUTION: ADDING A DOOR TO STATE
 * When a door is successfully dropped, replaces the standard wall panel
 * in that bay with a composite-door panel state.
 */
export function resolveDoorConflicts(
  state: PlacedPanel[],
  doorSnapPoint: SnapPoint,
): PlacedPanel[] {
  // A doorSnapPoint has an id like "door-left-2"
  // The corresponding wall panel id is "left-2"
  const wallPanelId = doorSnapPoint.id.replace("door-", "");

  return state.map((panel) => {
    if (panel.id === wallPanelId) {
      return {
        ...panel,
        id: `${wallPanelId}-composite`,
        type: "composite-door" as const,
      };
    }
    return panel;
  });
}

/**
 * CONFLICT RESOLUTION: REMOVING A DOOR FROM STATE
 * When a door is removed, reverts the bay's state back to a standard full panel.
 */
export function revertDoorConflict(state: PlacedPanel[], doorSnapPointId: string): PlacedPanel[] {
  const wallPanelId = doorSnapPointId.replace("door-", "");
  const compositeId = `${wallPanelId}-composite`;

  return state.map((panel) => {
    if (panel.id === compositeId) {
      return {
        ...panel,
        id: wallPanelId,
        type: "standard" as const,
      };
    }
    return panel;
  });
}
