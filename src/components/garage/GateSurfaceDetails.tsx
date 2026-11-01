import { memo, useMemo } from "react";
import { Shape } from "three";
import type { Material } from "three";

type SurfaceProps = {
  width: number;
  height: number;
  material: Material;
  wireframe: boolean;
  handle: "tilt" | "leaf" | "none";
};

// Exterior is local -Z; the existing slabs and their motion remain the parent.
export const GateSurfaceDetails = memo(function GateSurfaceDetails({
  width,
  height,
  material,
  wireframe,
  handle,
}: SurfaceProps) {
  const ribShape = useMemo(() => {
    const shape = new Shape();
    shape.moveTo(-0.016, 0);
    shape.lineTo(-0.009, 0.005);
    shape.lineTo(0.009, 0.005);
    shape.lineTo(0.016, 0);
    shape.closePath();
    return shape;
  }, []);
  const ribs = Math.min(48, Math.max(4, Math.floor((width - 0.16) / 0.12)));
  const handleX = handle === "leaf" ? -width / 2 + 0.1 : 0;
  return (
    <group>
      {Array.from({ length: ribs }, (_, i) => (
        <mesh
          key={i}
          position={[
            -width / 2 + 0.08 + ((i + 0.5) * (width - 0.16)) / ribs,
            -height / 2 + 0.065,
            -0.0205,
          ]}
          rotation={[-Math.PI / 2, 0, 0]}
          material={material}
        >
          <extrudeGeometry
            args={[ribShape, { depth: height - 0.13, bevelEnabled: false, steps: 1 }]}
          />
        </mesh>
      ))}
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * (width / 2 - 0.027), 0, -0.025]} material={material} castShadow>
            <boxGeometry args={[0.045, height - 0.012, 0.014]} />
          </mesh>
          <mesh position={[0, side * (height / 2 - 0.029), -0.025]} material={material} castShadow>
            <boxGeometry args={[width - 0.058, 0.045, 0.014]} />
          </mesh>
          <mesh position={[side * (width / 2 - 0.049), 0, -0.032]} material={material}>
            <cylinderGeometry args={[0.0025, 0.0025, height - 0.1, 6]} />
          </mesh>
          {/* Interior stiffeners sit on the back of the original leaf. */}
          <mesh position={[0, side * height * 0.28, 0.039]} material={material} castShadow>
            <boxGeometry args={[width - 0.1, 0.048, 0.035]} />
          </mesh>
          {[-1, 1].map((end) => (
            <mesh
              key={end}
              position={[end * (width / 2 - 0.08), side * height * 0.28, 0.06]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              <cylinderGeometry args={[0.006, 0.006, 0.005, 6]} />
              <meshStandardMaterial
                color="#aeb6bd"
                metalness={0.75}
                roughness={0.45}
                wireframe={wireframe}
              />
            </mesh>
          ))}
        </group>
      ))}
      <mesh position={[0, -height / 2 + 0.006, -0.004]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.013, 0.013, width - 0.018, 8]} />
        <meshStandardMaterial color="#17191c" roughness={0.95} wireframe={wireframe} />
      </mesh>
      {handle !== "none" && (
        <group position={[handleX, -height / 2 + 0.95, -0.034]}>
          <mesh castShadow>
            <boxGeometry args={[0.045, 0.17, 0.009]} />
            <meshStandardMaterial
              color="#202327"
              metalness={0.45}
              roughness={0.45}
              wireframe={wireframe}
            />
          </mesh>
          <mesh position={[0, 0.038, -0.018]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.011, 0.011, 0.035, 10]} />
            <meshStandardMaterial
              color="#30343a"
              metalness={0.55}
              roughness={0.4}
              wireframe={wireframe}
            />
          </mesh>
          <mesh
            position={[handle === "leaf" ? 0.047 : 0, 0.038, -0.035]}
            rotation={[0, 0, Math.PI / 2]}
            castShadow
          >
            <cylinderGeometry args={[0.009, 0.009, handle === "leaf" ? 0.11 : 0.14, 10]} />
            <meshStandardMaterial
              color="#25292e"
              metalness={0.45}
              roughness={0.4}
              wireframe={wireframe}
            />
          </mesh>
          <mesh position={[0, -0.042, -0.008]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.009, 0.009, 0.006, 12]} />
            <meshStandardMaterial
              color="#b9bfc5"
              metalness={0.85}
              roughness={0.3}
              wireframe={wireframe}
            />
          </mesh>
          <mesh position={[0, -0.042, -0.0115]}>
            <boxGeometry args={[0.002, 0.011, 0.001]} />
            <meshStandardMaterial color="#131518" wireframe={wireframe} />
          </mesh>
        </group>
      )}
      {handle === "leaf" && (
        <mesh position={[-width / 2 - 0.006, 0, -0.031]} material={material} castShadow>
          <boxGeometry args={[0.034, height - 0.025, 0.012]} />
        </mesh>
      )}
    </group>
  );
});

export const GateJambDetails = memo(function GateJambDetails({
  width,
  height,
  wireframe,
}: {
  width: number;
  height: number;
  wireframe: boolean;
}) {
  return (
    <group>
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * (width / 2 - 0.008), height / 2, -0.042]}>
            <boxGeometry args={[0.014, height, 0.016]} />
            <meshStandardMaterial color="#181b1e" roughness={0.95} wireframe={wireframe} />
          </mesh>
          {[0.12, height / 2, height - 0.12].map((y) => (
            <mesh
              key={y}
              position={[side * (width / 2 + 0.03), y, -0.058]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              <cylinderGeometry args={[0.005, 0.005, 0.005, 6]} />
              <meshStandardMaterial
                color="#879099"
                metalness={0.7}
                roughness={0.5}
                wireframe={wireframe}
              />
            </mesh>
          ))}
        </group>
      ))}
      <mesh position={[0, height - 0.004, -0.042]}>
        <boxGeometry args={[width - 0.015, 0.014, 0.016]} />
        <meshStandardMaterial color="#181b1e" roughness={0.95} wireframe={wireframe} />
      </mesh>
    </group>
  );
});

export const LeafHingeDetails = memo(function LeafHingeDetails({
  height,
  side,
  wireframe,
}: {
  height: number;
  side: number;
  wireframe: boolean;
}) {
  return (
    <group>
      {[-1, 0, 1].map((level) => (
        <group key={level} position={[0, level * (height / 2 - 0.19), -0.04]}>
          <mesh position={[side * 0.025, 0, 0.011]} castShadow>
            <boxGeometry args={[0.05, 0.105, 0.008]} />
            <meshStandardMaterial
              color="#5c646c"
              metalness={0.7}
              roughness={0.45}
              wireframe={wireframe}
            />
          </mesh>
          {[-1, 1].map((part) => (
            <mesh key={part} position={[0, part * 0.026, 0]} castShadow>
              <cylinderGeometry args={[0.014, 0.014, 0.049, 12]} />
              <meshStandardMaterial
                color="#929ba4"
                metalness={0.75}
                roughness={0.4}
                wireframe={wireframe}
              />
            </mesh>
          ))}
          <mesh>
            <cylinderGeometry args={[0.01, 0.01, 0.116, 10]} />
            <meshStandardMaterial
              color="#4d555d"
              metalness={0.75}
              roughness={0.4}
              wireframe={wireframe}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
});

// Two connected links follow the existing slab transform, with fixed-length arms.
export function TiltDoorArmDetails({
  width,
  height,
  y,
  z,
  angle,
  wireframe,
}: {
  width: number;
  height: number;
  y: number;
  z: number;
  angle: number;
  wireframe: boolean;
}) {
  const a = [height * 0.5, 0.08];
  const b = [
    y - height * 0.2 * Math.cos(angle) - 0.06 * Math.sin(angle),
    z - height * 0.2 * Math.sin(angle) + 0.06 * Math.cos(angle),
  ];
  const dy = b[0] - a[0];
  const dz = b[1] - a[1];
  const distance = Math.hypot(dy, dz);
  const offset = Math.sqrt(Math.max(0, (height * 0.58) ** 2 - distance ** 2 / 4));
  const elbow = [
    (a[0] + b[0]) / 2 + (dz / distance) * offset,
    (a[1] + b[1]) / 2 - (dy / distance) * offset,
  ];
  return (
    <group>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * (width / 2 - 0.035), 0, 0]}>
          {[
            [a, elbow],
            [elbow, b],
          ].map(([from, to], index) => (
            <mesh
              key={index}
              position={[0, (from[0] + to[0]) / 2, (from[1] + to[1]) / 2]}
              rotation={[Math.atan2(to[1] - from[1], to[0] - from[0]), 0, 0]}
              castShadow
            >
              <boxGeometry args={[0.018, Math.hypot(to[0] - from[0], to[1] - from[1]), 0.035]} />
              <meshStandardMaterial
                color="#8b959e"
                metalness={0.75}
                roughness={0.45}
                wireframe={wireframe}
              />
            </mesh>
          ))}
          {[a, elbow, b].map((point, index) => (
            <mesh key={index} position={[0, point[0], point[1]]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.022, 0.022, 0.028, 12]} />
              <meshStandardMaterial
                color="#4d565f"
                metalness={0.7}
                roughness={0.4}
                wireframe={wireframe}
              />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}
