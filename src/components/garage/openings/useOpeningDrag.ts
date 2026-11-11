import { useEffect, useRef } from 'react';
import { useThree, type ThreeEvent } from '@react-three/fiber';
import { Matrix4, Plane, Vector3 } from 'three';
import type { Opening } from '@/lib/garage/openingSystem';

type MoveOpening = (id: string, coords: { x: number; y: number }) => void;

export function useOpeningDrag(onMove?: MoveOpening) {
  const controls = useThree(state => state.controls) as { enabled: boolean } | null;
  const drag = useRef<{
    opening: Opening;
    plane: Plane;
    inverse: Matrix4;
    start: Vector3;
    pointerId: number;
    restore: () => void;
  } | null>(null);

  const finish = () => {
    const current = drag.current;
    drag.current = null;
    current?.restore();
  };

  useEffect(() => finish, []);
  useEffect(() => {
    if (!onMove) finish();
  }, [onMove]);

  return (opening: Opening) => ({
    onPointerDown: (event: ThreeEvent<PointerEvent>) => {
      if (!onMove || event.button !== 0 || drag.current) return;
      const bayGroup = event.object.parent?.parent;
      if (!bayGroup) return;
      event.stopPropagation();
      const inverse = bayGroup.matrixWorld.clone().invert();
      const plane = new Plane().setFromNormalAndCoplanarPoint(
        event.object.getWorldDirection(new Vector3()), event.point,
      );
      const controlsEnabled = controls?.enabled;
      const target = event.target as unknown as {
        setPointerCapture(id: number): void;
        releasePointerCapture(id: number): void;
        hasPointerCapture(id: number): boolean;
      };
      target.setPointerCapture(event.pointerId);
      if (controls) controls.enabled = false;
      drag.current = {
        opening: { ...opening }, plane, inverse,
        start: event.point.clone().applyMatrix4(inverse),
        pointerId: event.pointerId,
        restore: () => {
          if (controls && controlsEnabled !== undefined) controls.enabled = controlsEnabled;
          if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId);
        },
      };
    },
    onPointerMove: (event: ThreeEvent<PointerEvent>) => {
      const current = drag.current;
      if (!current || current.opening.id !== opening.id || current.pointerId !== event.pointerId) return;
      event.stopPropagation();
      const hit = event.ray.intersectPlane(current.plane, new Vector3());
      if (!hit) return;
      const delta = hit.applyMatrix4(current.inverse).sub(current.start);
      onMove?.(opening.id, {
        x: current.opening.x + delta.x,
        y: current.opening.y + delta.y,
      });
    },
    onPointerUp: (event: ThreeEvent<PointerEvent>) => {
      if (drag.current?.pointerId !== event.pointerId) return;
      event.stopPropagation();
      finish();
    },
    onPointerCancel: finish,
    onLostPointerCapture: finish,
  });
}
