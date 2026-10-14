import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

export function exportGroupToGlb(group: THREE.Object3D): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // Clone object tree for export
    const clone = group.clone(true);

    // 1. Expand InstancedMesh to individual Mesh nodes for iOS Quick Look & Android AR compatibility
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
    exporter.parse(
      clone,
      (result) => {
        if (result instanceof ArrayBuffer) {
          const blob = new Blob([result], { type: 'model/gltf-binary' });
          resolve(blob);
        } else {
          const output = JSON.stringify(result, null, 2);
          const blob = new Blob([output], { type: 'application/json' });
          resolve(blob);
        }
      },
      (error) => {
        console.error('An error occurred while exporting GLB:', error);
        reject(error);
      },
      {
        binary: true,
        embedImages: true,
        compactPack: true,
      } as any
    );
  });
}
