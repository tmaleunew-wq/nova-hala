import { DEFAULT_PARAMS, type GarageParams } from "@/lib/garage/types";
import { DoubleSide } from "three";
import { getSkylightLimits, getSkylightRect, getSkylightPanelSection } from "@/lib/garage/skylights";
import { PurPanel, type PurPanelProps } from "./PurPanel";

/** Roof coordinates are expressed in this panel's local plane. */
export function HallRoofPanel({
  params: p, roof, direction = 1, ...panel
}: PurPanelProps & {
  params: GarageParams;
  roof: { width: number; length: number; cx: number; cy: number };
  direction?: number;
}) {
  if (!p.hasSkylights) return <PurPanel {...panel} isSkylight={false} />;
  const { maxWidth, maxLength } = getSkylightLimits(p);
  const opening = getSkylightRect(roof, {
    width: Math.max(0.3, Math.min(maxWidth, p.skylightWidth ?? DEFAULT_PARAMS.skylightWidth!)),
    length: Math.max(0.3, Math.min(maxLength, p.skylightLength ?? DEFAULT_PARAMS.skylightLength!)),
    x: direction < 0
      ? 100 - (p.skylightPositionX ?? DEFAULT_PARAMS.skylightPositionX!)
      : (p.skylightPositionX ?? DEFAULT_PARAMS.skylightPositionX!),
    y: p.skylightPositionY ?? DEFAULT_PARAMS.skylightPositionY!,
  });
  const section = getSkylightPanelSection(opening, panel.width, panel.height);
  if (!section) return <PurPanel {...panel} isSkylight={false} />;
  const { hole, edges } = section;
  const { w, h } = hole;
  const z = (panel.thickness ?? 0.08) / 2 + 0.012;
  const ribCount = Math.max(1, Math.ceil(w / 0.12));
  return (
    <>
      <PurPanel {...panel} holes={[...(panel.holes ?? []), hole]} roofOpening={hole} isSkylight={false} />
      {panel.visible !== false && (
        <group position={[hole.cx, hole.cy, z]} onClick={(event) => {
          if (event.delta > 5) return;
          event.stopPropagation();
          panel.onToggle?.();
        }}>
          <mesh>
            <planeGeometry args={[w, h]} />
            <meshPhysicalMaterial color="#b5e0ec" roughness={0.25} metalness={0}
              transmission={0.6} thickness={0.018} ior={1.49} clearcoat={0.8}
              transparent opacity={0.86} side={DoubleSide} wireframe={panel.wireframe} />
          </mesh>
          {Array.from({ length: ribCount - 1 }, (_, i) => (
            <mesh key={`cell-${i}`} position={[-w / 2 + ((i + 1) * w) / ribCount, 0, 0.012]}>
              <boxGeometry args={[0.008, h, 0.008]} />
              <meshStandardMaterial color="#d3edf2" transparent opacity={0.5} roughness={0.4} wireframe={panel.wireframe} />
            </mesh>
          ))}
          {[
            { show: edges.left, x: -w / 2, y: 0, w: 0.045, h: h + 0.045 },
            { show: edges.right, x: w / 2, y: 0, w: 0.045, h: h + 0.045 },
            { show: edges.bottom, x: 0, y: -h / 2, w, h: 0.045 },
            { show: edges.top, x: 0, y: h / 2, w, h: 0.045 },
          ].filter((frame) => frame.show).map((frame, i) => (
            <mesh key={`frame-${i}`} position={[frame.x, frame.y, 0.018]} castShadow>
              <boxGeometry args={[frame.w, frame.h, 0.035]} />
              <meshStandardMaterial color="#aab7bf" metalness={0.75} roughness={0.3} wireframe={panel.wireframe} />
            </mesh>
          ))}
        </group>
      )}
    </>
  );
}
