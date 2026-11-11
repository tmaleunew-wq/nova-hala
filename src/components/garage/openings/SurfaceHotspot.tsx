import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { CanvasTexture, DoubleSide, Group, Quaternion, SRGBColorSpace, Vector3 } from 'three';
import type { V3 } from '@/lib/garage/openingSystem';

function discTexture(label: string, axis: boolean) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  const shade = ctx.createRadialGradient(200, 170, 30, 256, 256, 250);
  shade.addColorStop(0, axis ? '#ffffff' : '#fffbdc');
  shade.addColorStop(.8, axis ? '#ffffff' : '#fdf3b7');
  shade.addColorStop(1, axis ? '#dedede' : '#d9ce8e');
  ctx.beginPath(); ctx.arc(256, 256, 250, 0, Math.PI * 2);
  ctx.fillStyle = shade; ctx.fill();
  ctx.lineWidth = 4; ctx.strokeStyle = '#222222'; ctx.stroke();
  ctx.fillStyle = '#111111';
  if (label === '+') {
    ctx.fillRect(236, 146, 40, 220);
    ctx.fillRect(146, 236, 220, 40);
  } else {
    ctx.font = `600 ${label.length > 1 ? 210 : 270}px Arial`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, 256, 267);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 16;
  return texture;
}

export function SurfaceHotspot({ position, normal, label = '+', axis = false, large = false, onActivate }: {
  position: V3; normal: V3; label?: string; axis?: boolean; large?: boolean; onActivate?: () => void;
}) {
  const group = useRef<Group>(null);
  const [hovered, setHovered] = useState(false);
  const { gl } = useThree();
  const texture = useMemo(() => discTexture(label, axis), [label, axis]);
  useEffect(() => () => texture.dispose(), [texture]);
  const orientation = useMemo(() => new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), new Vector3(...normal).normalize()), [normal[0], normal[1], normal[2]]);
  const scratch = useMemo(() => ({ camera: new Vector3(), position: new Vector3(), normal: new Vector3() }), []);
  useFrame(({ camera }) => {
    if (!group.current) return;
    camera.getWorldPosition(scratch.camera);
    group.current.getWorldPosition(scratch.position);
    scratch.normal.set(...normal);
    group.current.visible = scratch.camera.sub(scratch.position).dot(scratch.normal) > .01;
    if (!group.current.visible && hovered) setHovered(false);
  });
  useEffect(() => {
    if (!hovered || !onActivate) return;
    const previous = gl.domElement.style.cursor;
    gl.domElement.style.cursor = 'pointer';
    return () => { gl.domElement.style.cursor = previous; };
  }, [hovered, onActivate, gl]);
  const facing = (event: ThreeEvent<PointerEvent | MouseEvent>) => group.current?.visible && event.ray.direction.dot(scratch.normal.set(...normal)) < 0;
  const radius = axis ? .18 : .28;
  return <group ref={group} position={position} quaternion={orientation}
    onPointerOver={event => { if (onActivate && facing(event)) { event.stopPropagation(); setHovered(true); } }}
    onPointerMove={event => { if (onActivate && facing(event)) { event.stopPropagation(); setHovered(true); } }}
    onPointerOut={() => setHovered(false)}
    onPointerDown={event => { if (onActivate && facing(event)) event.stopPropagation(); }}
    onClick={event => { if (onActivate && facing(event)) { event.stopPropagation(); if (event.delta <= 10) onActivate(); } }}>
    <mesh raycast={axis ? () => null : undefined}>
      <circleGeometry args={[radius, 32]} />
      <meshBasicMaterial map={texture} transparent alphaTest={.1} toneMapped={false} />
    </mesh>
    {!axis && <>
      <mesh position={[0, 0, -.002]}>
        <ringGeometry args={[.29, hovered ? .37 : .33, 32]} />
        <meshBasicMaterial color="#7dd3fc" transparent opacity={hovered ? .95 : .65} depthWrite={false} side={DoubleSide} toneMapped={false} />
      </mesh>
      {large && [.61, .72].map(inner => <mesh key={inner} position={[0, 0, -.003]}>
        <ringGeometry args={[inner, inner + .03, 64]} />
        <meshBasicMaterial color="#7dd3fc" transparent opacity={hovered ? .95 : .65} depthWrite={false} side={DoubleSide} toneMapped={false} />
      </mesh>)}
    </>}
  </group>;
}
