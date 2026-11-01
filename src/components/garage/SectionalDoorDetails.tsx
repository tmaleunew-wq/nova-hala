import { memo } from "react";
import { DoubleSide } from "three";
import type { Material } from "three";

// Local +Z faces the garage interior. All moving details inherit the panel transform.
export const SectionalPanelDetails = memo(function SectionalPanelDetails({
  width,
  height,
  index,
  material,
  wireframe,
}: {
  width: number;
  height: number;
  index: number;
  material: Material;
  wireframe: boolean;
}) {
  return (
    <group>
      {/* Small rounded folds catch light without covering the selected finish. */}
      {[-1, 1].map((edge) => (
        <mesh
          key={edge}
          position={[0, edge * (height / 2 - 0.009), -0.019]}
          rotation={[0, 0, Math.PI / 2]}
          material={material}
          castShadow
        >
          <cylinderGeometry args={[0.004, 0.004, width - 0.024, 6]} />
        </mesh>
      ))}
      {/* Exterior M-profile reveal and the narrow folded lip beneath it. */}
      <mesh position={[0, 0, -0.0208]}>
        <boxGeometry args={[width - 0.026, 0.004, 0.001]} />
        <meshStandardMaterial color="#25282b" roughness={0.85} wireframe={wireframe} />
      </mesh>
      <mesh position={[0, -0.004, -0.0205]} material={material}>
        <boxGeometry args={[width - 0.026, 0.003, 0.002]} />
      </mesh>
      {/* Galvanized rear roller brackets and wheels, coaxial with the guide. */}
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * (width / 2 - 0.04), 0, 0.025]} castShadow>
            <boxGeometry args={[0.065, 0.13, 0.008]} />
            <meshStandardMaterial
              color="#a0a8af"
              metalness={0.75}
              roughness={0.48}
              wireframe={wireframe}
            />
          </mesh>
          {[-0.043, 0.043].map((y) => (
            <mesh
              key={y}
              position={[side * (width / 2 - 0.04), y, 0.031]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              <cylinderGeometry args={[0.006, 0.006, 0.004, 6]} />
              <meshStandardMaterial
                color="#c0c6cb"
                metalness={0.8}
                roughness={0.4}
                wireframe={wireframe}
              />
            </mesh>
          ))}
          <mesh position={[side * (width / 2 - 0.012), 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.007, 0.007, 0.11, 8]} />
            <meshStandardMaterial
              color="#adb4ba"
              metalness={0.8}
              roughness={0.4}
              wireframe={wireframe}
            />
          </mesh>
          <mesh position={[side * (width / 2 + 0.04), 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.022, 0.022, 0.016, 12]} />
            <meshStandardMaterial color="#32363a" roughness={0.65} wireframe={wireframe} />
          </mesh>
        </group>
      ))}
      {index > 0 && (
        <group position={[0, -height / 2 + 0.025, 0.026]}>
          <mesh>
            <boxGeometry args={[0.07, 0.045, 0.007]} />
            <meshStandardMaterial
              color="#a0a8af"
              metalness={0.75}
              roughness={0.48}
              wireframe={wireframe}
            />
          </mesh>
          <mesh position={[0, -0.018, 0.008]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.008, 0.008, 0.075, 8]} />
            <meshStandardMaterial
              color="#bcc2c7"
              metalness={0.8}
              roughness={0.4}
              wireframe={wireframe}
            />
          </mesh>
        </group>
      )}
      {index === 0 && (
        <mesh position={[0, -height / 2 + 0.006, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.014, 0.014, width - 0.02, 8]} />
          <meshStandardMaterial color="#16181b" roughness={0.95} wireframe={wireframe} />
        </mesh>
      )}
      {index === 1 && (
        <group position={[width * 0.22, 0, -0.022]}>
          <mesh castShadow>
            <boxGeometry args={[0.18, 0.075, 0.009]} />
            <meshStandardMaterial
              color="#2b2e32"
              metalness={0.35}
              roughness={0.5}
              wireframe={wireframe}
            />
          </mesh>
          <mesh position={[0, 0.004, -0.005]}>
            <boxGeometry args={[0.15, 0.047, 0.002]} />
            <meshStandardMaterial color="#0d0f11" roughness={0.95} wireframe={wireframe} />
          </mesh>
          <mesh position={[0, 0.018, -0.01]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.007, 0.007, 0.135, 8]} />
            <meshStandardMaterial
              color="#34383d"
              metalness={0.4}
              roughness={0.45}
              wireframe={wireframe}
            />
          </mesh>
        </group>
      )}
    </group>
  );
});

export const SectionalGuideDetails = memo(function SectionalGuideDetails({
  width,
  height,
  radius,
  curveStart,
  wireframe,
}: {
  width: number;
  height: number;
  radius: number;
  curveStart: number;
  wireframe: boolean;
}) {
  return (
    <group>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * (width / 2 + 0.04), 0, 0]}>
          {/* Continuous C-channel follows the existing panel-centre trajectory. */}
          <mesh position={[side * 0.02, curveStart / 2, 0]}>
            <boxGeometry args={[0.004, curveStart, 0.056]} />
            <meshStandardMaterial
              color="#9ca5ad"
              metalness={0.75}
              roughness={0.48}
              wireframe={wireframe}
            />
          </mesh>
          <mesh position={[side * 0.02, curveStart, radius]} rotation={[0, Math.PI / 2, 0]}>
            <ringGeometry args={[radius - 0.028, radius + 0.028, 24, 1, 0, Math.PI / 2]} />
            <meshStandardMaterial
              color="#9ca5ad"
              metalness={0.75}
              roughness={0.48}
              side={DoubleSide}
              wireframe={wireframe}
            />
          </mesh>
          <mesh position={[side * 0.02, curveStart + radius, radius + height / 2]}>
            <boxGeometry args={[0.004, 0.056, height]} />
            <meshStandardMaterial
              color="#9ca5ad"
              metalness={0.75}
              roughness={0.48}
              wireframe={wireframe}
            />
          </mesh>
          {[-1, 1].map((edge) => (
            <group key={edge}>
              <mesh position={[0, curveStart / 2, -edge * 0.026]}>
                <boxGeometry args={[0.04, curveStart, 0.004]} />
                <meshStandardMaterial
                  color="#aeb6bd"
                  metalness={0.75}
                  roughness={0.42}
                  wireframe={wireframe}
                />
              </mesh>
              <mesh position={[0, curveStart, radius]} rotation={[0, Math.PI / 2, 0]}>
                <torusGeometry args={[radius + edge * 0.026, 0.003, 4, 24, Math.PI / 2]} />
                <meshStandardMaterial
                  color="#aeb6bd"
                  metalness={0.75}
                  roughness={0.42}
                  wireframe={wireframe}
                />
              </mesh>
              <mesh position={[0, curveStart + radius + edge * 0.026, radius + height / 2]}>
                <boxGeometry args={[0.04, 0.004, height]} />
                <meshStandardMaterial
                  color="#aeb6bd"
                  metalness={0.75}
                  roughness={0.42}
                  wireframe={wireframe}
                />
              </mesh>
            </group>
          ))}
        </group>
      ))}
    </group>
  );
});
