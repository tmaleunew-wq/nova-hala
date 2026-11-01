import { memo, useEffect, useMemo } from "react";
import { DoubleSide } from "three";
import type { Material, Shape } from "three";
import { createFacadeGeometry } from "./facadeGeometry";

export const FacadePanelDetails = memo(function FacadePanelDetails({
  shape,
  thickness,
  panelType,
  orientation,
  color,
  material,
  wireframe,
}: {
  shape: Shape;
  thickness: number;
  panelType?: string;
  orientation: "horizontal" | "vertical";
  color: string;
  material: Material | null;
  wireframe: boolean;
}) {
  const geometry = useMemo(
    () =>
      createFacadeGeometry(
        shape,
        thickness,
        panelType ?? "trapezoid",
        orientation === "horizontal",
      ),
    [shape, thickness, panelType, orientation],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  const textured = !wireframe && (panelType === "smooth" || panelType?.startsWith("wood_"));
  if (panelType !== "smooth" && !panelType?.startsWith("wood_")) return null;
  return (
    <mesh
      geometry={geometry}
      material={textured && material ? material : undefined}
      castShadow
      receiveShadow
    >
      {!textured && (
        <meshStandardMaterial
          color={color}
          metalness={0.3}
          roughness={panelType === "sandwich" ? 0.5 : 0.42}
          side={DoubleSide}
          wireframe={wireframe}
        />
      )}
    </mesh>
  );
});
