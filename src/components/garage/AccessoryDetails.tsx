import { memo } from "react";
import { DoubleSide } from "three";

export const PersonalDoorDetails = memo(function PersonalDoorDetails({
  width,
  height,
  frameDepth,
  exterior,
  wireframe,
}: {
  width: number;
  height: number;
  frameDepth: number;
  exterior: number;
  wireframe: boolean;
}) {
  return (
    <group>
      <group scale={[1, 1, exterior]}>
        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * (width / 2 - 0.004), height / 2, 0.023]}>
            <boxGeometry args={[0.008, height, 0.006]} />
            <meshStandardMaterial color="#16191c" roughness={0.95} wireframe={wireframe} />
          </mesh>
        ))}
        <mesh position={[0, height - 0.004, 0.023]}>
          <boxGeometry args={[width, 0.008, 0.006]} />
          <meshStandardMaterial color="#16191c" roughness={0.95} wireframe={wireframe} />
        </mesh>
        <mesh position={[0, 0.009, frameDepth / 2 + 0.025]} receiveShadow>
          <boxGeometry args={[width + 0.025, 0.018, 0.08]} />
          <meshStandardMaterial
            color="#929ba3"
            metalness={0.75}
            roughness={0.5}
            wireframe={wireframe}
          />
        </mesh>
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[0, 0.019, frameDepth / 2 + 0.005 + i * 0.018]}>
            <boxGeometry args={[width - 0.01, 0.002, 0.003]} />
            <meshStandardMaterial
              color="#59636b"
              metalness={0.6}
              roughness={0.6}
              wireframe={wireframe}
            />
          </mesh>
        ))}
        {[0.2, 0.5, 0.8].map((level) => (
          <group key={level} position={[-width / 2 - 0.005, height * level, 0.027]}>
            <mesh position={[0.018, 0, -0.004]}>
              <boxGeometry args={[0.035, 0.075, 0.006]} />
              <meshStandardMaterial
                color="#30363d"
                metalness={0.65}
                roughness={0.45}
                wireframe={wireframe}
              />
            </mesh>
            {[-1, 1].map((part) => (
              <mesh key={part} position={[0, part * 0.019, 0]} castShadow>
                <cylinderGeometry args={[0.011, 0.011, 0.035, 12]} />
                <meshStandardMaterial
                  color="#727e88"
                  metalness={0.75}
                  roughness={0.4}
                  wireframe={wireframe}
                />
              </mesh>
            ))}
            <mesh>
              <cylinderGeometry args={[0.008, 0.008, 0.08, 10]} />
              <meshStandardMaterial
                color="#30363d"
                metalness={0.7}
                roughness={0.4}
                wireframe={wireframe}
              />
            </mesh>
          </group>
        ))}
      </group>
      {/* Detail both existing handle plates; the front door faces local -Z. */}
      {[-1, 1].map((face) => (
        <group key={face} position={[width / 2 - 0.08, 1, 0]} scale={[1, 1, face]}>
          {[-0.065, 0.065].map((y) => (
            <mesh key={y} position={[0, y, 0.0255]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.0035, 0.0035, 0.003, 8]} />
              <meshStandardMaterial
                color="#828c94"
                metalness={0.8}
                roughness={0.45}
                wireframe={wireframe}
              />
            </mesh>
          ))}
          <mesh position={[0, -0.04, 0.027]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.007, 0.007, 0.005, 12]} />
            <meshStandardMaterial
              color="#b8a06c"
              metalness={0.8}
              roughness={0.35}
              wireframe={wireframe}
            />
          </mesh>
          <mesh position={[0, -0.04, 0.03]}>
            <boxGeometry args={[0.0015, 0.009, 0.001]} />
            <meshStandardMaterial color="#15181a" wireframe={wireframe} />
          </mesh>
        </group>
      ))}
    </group>
  );
});

export const WindowDetails = memo(function WindowDetails({
  width,
  height,
  frameDepth,
  color,
  wireframe,
}: {
  width: number;
  height: number;
  frameDepth: number;
  color: string;
  wireframe: boolean;
}) {
  const depth = Math.max(0.017, frameDepth / 2 + 0.003);
  return (
    <group>
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * (width / 2 - 0.012), 0, 0.012]}>
            <boxGeometry args={[0.014, height - 0.016, 0.006]} />
            <meshStandardMaterial color="#14191e" roughness={0.95} wireframe={wireframe} />
          </mesh>
          <mesh position={[0, side * (height / 2 - 0.012), 0.012]}>
            <boxGeometry args={[width - 0.016, 0.014, 0.006]} />
            <meshStandardMaterial color="#14191e" roughness={0.95} wireframe={wireframe} />
          </mesh>
          <mesh position={[side * (width / 2 - 0.002), 0, 0.012 + depth / 2]} castShadow>
            <boxGeometry args={[0.012, height, depth]} />
            <meshStandardMaterial
              color={color}
              metalness={0.4}
              roughness={0.5}
              wireframe={wireframe}
            />
          </mesh>
          <mesh position={[0, side * (height / 2 - 0.002), 0.012 + depth / 2]} castShadow>
            <boxGeometry args={[width, 0.012, depth]} />
            <meshStandardMaterial
              color={color}
              metalness={0.4}
              roughness={0.5}
              wireframe={wireframe}
            />
          </mesh>
          <mesh position={[side * (width / 2 - 0.08), -height / 2 - 0.015, frameDepth / 2 + 0.001]}>
            <boxGeometry args={[0.025, 0.004, 0.002]} />
            <meshStandardMaterial color="#171c21" roughness={0.9} wireframe={wireframe} />
          </mesh>
        </group>
      ))}
      {/* Sloping sill projects outwards; the folded nose sheds water below the frame. */}
      <group position={[0, -height / 2 - 0.034, frameDepth / 2 + 0.04]} rotation={[0.07, 0, 0]}>
        <mesh receiveShadow castShadow>
          <boxGeometry args={[width + 0.09, 0.004, 0.12]} />
          <meshStandardMaterial
            color={color}
            metalness={0.55}
            roughness={0.45}
            wireframe={wireframe}
          />
        </mesh>
        <mesh position={[0, -0.01, 0.059]}>
          <boxGeometry args={[width + 0.09, 0.02, 0.004]} />
          <meshStandardMaterial
            color={color}
            metalness={0.55}
            roughness={0.45}
            wireframe={wireframe}
          />
        </mesh>
        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * (width / 2 + 0.043), 0.007, 0]}>
            <boxGeometry args={[0.004, 0.018, 0.12]} />
            <meshStandardMaterial
              color={color}
              metalness={0.55}
              roughness={0.45}
              wireframe={wireframe}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
});

export const GutterDetails = memo(function GutterDetails({
  length,
  gutterX,
  gutterY,
  pipeX,
  pipeHeight,
  pipeZ,
  side,
  color,
  wireframe,
}: {
  length: number;
  gutterX: number;
  gutterY: number;
  pipeX: number;
  pipeHeight: number;
  pipeZ: number;
  side: number;
  color: string;
  wireframe: boolean;
}) {
  const brackets = Math.max(2, Math.ceil(length / 0.8) + 1);
  const clamps = Math.max(2, Math.ceil(pipeHeight / 1.4));
  return (
    <group>
      {[-1, 1].map((end) => (
        <mesh key={end} position={[gutterX, gutterY, (end * length) / 2]}>
          <circleGeometry args={[0.06, 24, Math.PI / 2, Math.PI]} />
          <meshStandardMaterial
            color={color}
            metalness={0.55}
            roughness={0.45}
            side={DoubleSide}
            wireframe={wireframe}
          />
        </mesh>
      ))}
      {Array.from({ length: brackets }, (_, i) => (
        <mesh
          key={i}
          position={[gutterX, gutterY, -length / 2 + 0.1 + (i * (length - 0.2)) / (brackets - 1)]}
          rotation={[0, 0, Math.PI / 2]}
        >
          <torusGeometry args={[0.062, 0.0035, 6, 16, Math.PI]} />
          <meshStandardMaterial
            color={color}
            metalness={0.65}
            roughness={0.45}
            wireframe={wireframe}
          />
        </mesh>
      ))}
      {Array.from({ length: clamps }, (_, i) => (
        <group
          key={i}
          position={[pipeX, 0.3 + (i * Math.max(0.1, pipeHeight - 0.6)) / (clamps - 1), pipeZ]}
        >
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.042, 0.004, 6, 16]} />
            <meshStandardMaterial
              color={color}
              metalness={0.65}
              roughness={0.4}
              wireframe={wireframe}
            />
          </mesh>
          <mesh position={[-side * 0.045, 0, 0]}>
            <boxGeometry args={[0.008, 0.065, 0.04]} />
            <meshStandardMaterial
              color={color}
              metalness={0.65}
              roughness={0.45}
              wireframe={wireframe}
            />
          </mesh>
          <mesh position={[side * 0.047, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.006, 0.006, 0.008, 6]} />
            <meshStandardMaterial
              color="#9aa4ad"
              metalness={0.8}
              roughness={0.4}
              wireframe={wireframe}
            />
          </mesh>
        </group>
      ))}
      <mesh position={[pipeX, pipeHeight - 0.025, pipeZ]}>
        <cylinderGeometry args={[0.044, 0.044, 0.05, 16, 1, true]} />
        <meshStandardMaterial
          color={color}
          metalness={0.6}
          roughness={0.45}
          side={DoubleSide}
          wireframe={wireframe}
        />
      </mesh>
    </group>
  );
});
