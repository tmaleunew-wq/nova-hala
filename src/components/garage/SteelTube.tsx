import "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";

interface SteelTubeProps {
  // start and end in world coords
  from: [number, number, number];
  to: [number, number, number];
  size?: number;       // outer side of square section [m]
  thickness?: number;  // wall thickness [m]
  color?: string;
  wireframe?: boolean;
  rollDeg?: number;    // rotate around its axis
}

/**
 * Hollow square steel tube (jakl) extruded between two points.
 * CAD-like: visible hole through the cross-section.
 */
export function SteelTube({
  from,
  to,
  size = 0.1,
  thickness = 0.004,
  color = "#6e7681",
  wireframe = false,
  rollDeg = 0,
}: SteelTubeProps) {
  const { geometry, position, quaternion, length } = useMemo(() => {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const dir = new THREE.Vector3().subVectors(b, a);
    const len = dir.length();

    const half = size / 2;
    const innerHalf = half - thickness;

    const shape = new THREE.Shape();
    shape.moveTo(-half, -half);
    shape.lineTo(half, -half);
    shape.lineTo(half, half);
    shape.lineTo(-half, half);
    shape.lineTo(-half, -half);
    const hole = new THREE.Path();
    hole.moveTo(-innerHalf, -innerHalf);
    hole.lineTo(innerHalf, -innerHalf);
    hole.lineTo(innerHalf, innerHalf);
    hole.lineTo(-innerHalf, innerHalf);
    hole.lineTo(-innerHalf, -innerHalf);
    shape.holes.push(hole);

    const geom = new THREE.ExtrudeGeometry(shape, {
      depth: len,
      bevelEnabled: false,
      curveSegments: 1,
    });
    // Extrude goes +Z. Align to direction.
    const q = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      dir.clone().normalize(),
    );
    // Roll around local Z
    if (rollDeg) {
      const roll = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 0, 1),
        (rollDeg * Math.PI) / 180,
      );
      q.multiply(roll);
    }

    return { geometry: geom, position: a.toArray() as [number, number, number], quaternion: q, length: len };
  }, [from, to, size, thickness, rollDeg]);

  return (
    <mesh position={position} quaternion={quaternion} geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial
        color={color}
        metalness={0.85}
        roughness={0.35}
        wireframe={wireframe}
      />
    </mesh>
  );
}

/** Flat steel plate (base plate, gusset, flashing). */
export function SteelPlate({
  position,
  size,
  color = "#6e7681",
  wireframe = false,
  rotation = [0, 0, 0],
}: {
  position: [number, number, number];
  size: [number, number, number];
  color?: string;
  wireframe?: boolean;
  rotation?: [number, number, number];
}) {
  return (
    <mesh position={position} rotation={rotation} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} metalness={0.85} roughness={0.35} wireframe={wireframe} />
    </mesh>
  );
}
