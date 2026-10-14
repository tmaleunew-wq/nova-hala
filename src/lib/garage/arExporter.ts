import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { USDZExporter } from "three/examples/jsm/exporters/USDZExporter.js";

export interface ArExportResult {
  blob: Blob;
  format: "glb" | "usdz";
  url: string;
}

/**
 * Zistí, či používateľ beží na iOS (iPhone, iPad)
 */
export function isIosDevice(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua);
  const isIpadOs = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return isIos || isIpadOs;
}

/**
 * Zistí, či používateľ beží na Android zariadení
 */
export function isAndroidDevice(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  return /android/i.test(navigator.userAgent);
}

/**
 * Zistí, či ide o mobilné zariadenie
 */
export function isMobileDevice(): boolean {
  return isIosDevice() || isAndroidDevice();
}

/**
 * Export 3D scény / skupiny do formátu GLB (glTF 2.0 binárny)
 */
export async function exportToGlb(object3d: THREE.Object3D): Promise<Blob> {
  const clone = object3d.clone(true);

  // Expand InstancedMesh to individual Mesh nodes for mobile AR compatibility
  const instancedMeshes: THREE.InstancedMesh[] = [];
  clone.traverse((child) => {
    if ((child as any).isInstancedMesh) {
      instancedMeshes.push(child as THREE.InstancedMesh);
    }
  });

  instancedMeshes.forEach((instMesh) => {
    const parent = instMesh.parent || clone;
    const count = instMesh.count;
    const matrix = new THREE.Matrix4();

    for (let i = 0; i < count; i++) {
      instMesh.getMatrixAt(i, matrix);
      const mesh = new THREE.Mesh(instMesh.geometry, instMesh.material);
      mesh.applyMatrix4(matrix);
      mesh.castShadow = instMesh.castShadow;
      mesh.receiveShadow = instMesh.receiveShadow;
      parent.add(mesh);
    }

    parent.remove(instMesh);
  });

  const exporter = new GLTFExporter();
  const buffer = await exporter.parseAsync(clone, {
    binary: true,
    embedImages: true,
  });
  return new Blob([buffer as ArrayBuffer], { type: "model/gltf-binary" });
}

/**
 * Export 3D scény do formátu USDZ (pre Apple Quick Look AR)
 */
export async function exportToUsdz(object3d: THREE.Object3D): Promise<Blob> {
  const exporter = new USDZExporter();
  const buffer = await exporter.parseAsync(object3d, {
    quickLookCompatible: true,
    maxTextureSize: 1024,
  });
  return new Blob([buffer as any], { type: "model/vnd.usdz+zip" });
}

/**
 * Spustí priamy AR Quick Look na iOS
 */
export function launchIosAr(usdzBlob: Blob, filename = "garaz.usdz"): void {
  const rawUrl = URL.createObjectURL(usdzBlob);
  // Apple Quick Look requires the URL to end with .usdz
  const url = `${rawUrl}#model.usdz`;
  const anchor = document.createElement("a");
  anchor.setAttribute("rel", "ar");
  anchor.setAttribute("href", url);
  anchor.setAttribute("download", filename);

  // iOS Quick Look vyžaduje, aby odkaz obsahoval prvok <img>
  const img = document.createElement("img");
  img.setAttribute("alt", "AR Preview");
  anchor.appendChild(img);

  document.body.appendChild(anchor);
  anchor.click();

  setTimeout(() => {
    document.body.removeChild(anchor);
    URL.revokeObjectURL(rawUrl);
  }, 30000);
}

/**
 * Stiahne súbor priamo do zariadenia
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  setTimeout(() => {
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, 2000);
}
