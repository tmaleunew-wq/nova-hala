import { memo, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { DoubleSide, Object3D } from "three";
import type { InstancedMesh } from "three";
import { createRoofCoverGeometry, roofCoverPoint } from "./roofCoverGeometry";

export const RoofCoverDetails = memo(function RoofCoverDetails({
  id,
  width,
  height,
  thickness,
  panelType,
  color,
  wireframe,
  roofOpening,
}: {
  id: string;
  width: number;
  height: number;
  thickness: number;
  panelType?: string;
  color: string;
  wireframe: boolean;
  roofOpening?: { cx: number; cy: number; w: number; h: number };
}) {
  const dimensions = useMemo(
    () => ({
      width,
      height,
      thickness,
      panelType: panelType ?? "sandwich",
      alongY: id.startsWith("roof-cubic"),
      reverse: !id.startsWith("roof-right"),
      roofOpening,
    }),
    [id, width, height, thickness, panelType, roofOpening],
  );
  const geometry = useMemo(() => createRoofCoverGeometry(dimensions), [dimensions]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const screws = useRef<InstancedMesh>(null);
  const washers = useRef<InstancedMesh>(null);
  const fasteners = useMemo(() => {
    if (panelType === "tile" || panelType === "smooth") return [];
    const span = dimensions.alongY ? width : height;
    const run = dimensions.alongY ? height : width;
    const sandwich = dimensions.panelType === "sandwich";
    const ribs = Math.max(1, Math.round(span / (sandwich ? 1 / 3 : 0.25)));
    const rows = Math.max(2, Math.ceil(run / 1.2) + 1);
    const points: [number, number, number][] = [];
    for (let row = 0; row < rows; row++) {
      for (let rib = 0; rib < ribs; rib++) {
        // Sandwich fasteners sit on the main crown; trapezoid screws in the low flat.
        points.push(
          roofCoverPoint(
            ((rib + (sandwich ? 0.5 : 0.11)) * span) / ribs,
            0.05 + (row * (run - 0.1)) / (rows - 1),
            thickness / 2 + (sandwich ? 0.041 : 0.003),
            dimensions,
          ),
        );
      }
    }
    return points.filter(([x, y]) => !dimensions.roofOpening
      || Math.abs(x - dimensions.roofOpening.cx) > dimensions.roofOpening.w / 2 + 0.01
      || Math.abs(y - dimensions.roofOpening.cy) > dimensions.roofOpening.h / 2 + 0.01);
  }, [dimensions, panelType, width, height, thickness]);
  useLayoutEffect(() => {
    if (!screws.current || !washers.current) return;
    const dummy = new Object3D();
    dummy.rotation.x = Math.PI / 2;
    fasteners.forEach((point, index) => {
      dummy.position.set(point[0], point[1], point[2] + 0.0015);
      dummy.updateMatrix();
      washers.current!.setMatrixAt(index, dummy.matrix);
      dummy.position.z += 0.003;
      dummy.updateMatrix();
      screws.current!.setMatrixAt(index, dummy.matrix);
    });
    screws.current.instanceMatrix.needsUpdate = true;
    washers.current.instanceMatrix.needsUpdate = true;
    screws.current.computeBoundingSphere();
    washers.current.computeBoundingSphere();
  }, [fasteners]);
  return (
    <group>
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial
          color={color}
          metalness={0.35}
          roughness={panelType === "tile" ? 0.48 : 0.4}
          side={DoubleSide}
          wireframe={wireframe}
        />
      </mesh>
      {fasteners.length > 0 && (
        <>
          <instancedMesh
            key={`washers-${fasteners.length}`}
            ref={washers}
            args={[undefined, undefined, fasteners.length]}
          >
            <cylinderGeometry args={[0.008, 0.008, 0.003, 8]} />
            <meshStandardMaterial color="#282c30" roughness={0.85} wireframe={wireframe} />
          </instancedMesh>
          <instancedMesh
            key={`screws-${fasteners.length}`}
            ref={screws}
            args={[undefined, undefined, fasteners.length]}
          >
            <cylinderGeometry args={[0.0045, 0.0045, 0.005, 6]} />
            <meshStandardMaterial
              color={color}
              metalness={0.65}
              roughness={0.38}
              wireframe={wireframe}
            />
          </instancedMesh>
        </>
      )}
    </group>
  );
});
