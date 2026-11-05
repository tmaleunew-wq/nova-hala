import { useEffect, useMemo } from 'react';
import { BoxGeometry, DoubleSide, Shape } from 'three';
import { splitBayPanels, type Bay, type Opening, type Rect } from '@/lib/garage/openingSystem';

/** Metre-based UVs retain the material's physical repeat across every rectangular piece. */
export function createBayPanelGeometry(rect: Rect, bay: Bay) {
  const geometry = new BoxGeometry(rect.width, rect.height, .1);
  geometry.translate(rect.x + rect.width / 2 - bay.width / 2, rect.y + rect.height / 2 - bay.height / 2, 0);
  const position = geometry.getAttribute('position'), uv = geometry.getAttribute('uv');
  for (let i = 0; i < position.count; i++) uv.setXY(i, position.getX(i) + bay.width / 2, position.getY(i) + bay.height / 2);
  uv.needsUpdate = true;
  return geometry;
}
function PanelPiece({ rect, bay, color, opacity }: { rect: Rect; bay: Bay; color: string; opacity: number }) {
  const geometry = useMemo(() => createBayPanelGeometry(rect, bay), [rect, bay]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} castShadow receiveShadow><meshStandardMaterial color={color} metalness={.25} roughness={.7} transparent={opacity < 1} opacity={opacity} /></mesh>;
}
function OpeningModel({ o }: { o: Opening }) {
  const w = o.width, h = o.height;
  const glass = ['window', 'skylight'].includes(o.category);
  const frame = (x: number, y: number, width: number, height: number, key: string) => <mesh key={key} position={[x, y, .04]} castShadow><boxGeometry args={[width, height, .16]} /><meshStandardMaterial color={o.frameColor} metalness={.5} roughness={.4} /></mesh>;
  return <group>
    {frame(-w / 2 + .035, 0, .07, h, 'left')}{frame(w / 2 - .035, 0, .07, h, 'right')}
    {frame(0, h / 2 - .035, w, .07, 'top')}{frame(0, -h / 2 + .035, w, .07, 'bottom')}
    {o.category !== 'frame' && <mesh castShadow={!glass}><boxGeometry args={[Math.max(.01, w - .14), Math.max(.01, h - .14), .04]} />
      <meshStandardMaterial color={glass ? '#b9dce6' : o.fillColor} transparent={glass} opacity={glass ? .42 : 1} roughness={glass ? .15 : .5} metalness={glass ? .1 : .25} side={DoubleSide} />
    </mesh>}
    {['sectional', 'roller', 'dock'].includes(o.category) && Array.from({ length: Math.floor(h / (o.category === 'roller' ? .15 : .5)) }, (_, i) => frame(0, -h / 2 + (i + 1) * (o.category === 'roller' ? .15 : .5), w - .14, .015, `rib-${i}`))}
    {['window', 'skylight', 'sliding'].includes(o.category) && frame(0, 0, .045, h - .14, 'mullion')}
    {o.subtype === 'glazed' && <mesh position={[0, h * .15, .1]}><boxGeometry args={[w * .75, h * .18, .025]} /><meshStandardMaterial color="#9fc7d8" metalness={.3} roughness={.1} /></mesh>}
    {(o.category === 'door' || o.subtype === 'wicket') && frame(w * .3, -h * .1, .12, .035, 'handle')}
    {o.subtype === 'wicket' && frame(w * .15, -h * .2, .035, Math.min(2, h * .6), 'wicket')}
    {o.category === 'dock' && <mesh position={[0, -h / 2 + .08, .5]}><boxGeometry args={[w, .15, 1]} /><meshStandardMaterial color="#41474b" metalness={.7} roughness={.7} /></mesh>}
  </group>;
}

export function BayOpeningMeshes({ bays, openings, surfaces, selected, color, roofColor, opacity, showOpenings }: {
  bays: Bay[]; openings: Opening[]; surfaces: string[]; selected?: string; color: string; roofColor: string; opacity: number; showOpenings: boolean;
}) {
  return <group name="editable-bay-openings">{bays.map(bay => {
    const elements = openings.filter(o => o.bayId === bay.id);
    const panels = surfaces.includes(bay.surface) ? splitBayPanels(bay.width, bay.height, elements) : [];
    return <group key={bay.id} position={bay.position3D} rotation={bay.rotation}>
      {panels.map((rect, i) => <PanelPiece key={i} rect={rect} bay={bay} color={bay.roof ? roofColor : color} opacity={opacity} />)}
      {selected === bay.id && <mesh position={[0, 0, .09]} raycast={() => null}><planeGeometry args={[bay.width, bay.height]} /><meshBasicMaterial color="#38bdf8" transparent opacity={.14} depthWrite={false} side={DoubleSide} /></mesh>}
      {showOpenings && elements.map(o => <group key={o.id} position={[o.x + o.width / 2 - bay.width / 2, o.y + o.height / 2 - bay.height / 2, .08]}><OpeningModel o={o} /></group>)}
    </group>;
  })}</group>;
}

export function GableCap({ width, height, pitch, z, color }: { width: number; height: number; pitch: number; z: number; color: string }) {
  const shape = useMemo(() => {
    const s = new Shape(); s.moveTo(-width / 2, height); s.lineTo(width / 2, height); s.lineTo(0, height + width / 2 * Math.tan(pitch * Math.PI / 180)); s.closePath(); return s;
  }, [width, height, pitch]);
  return <mesh position={[0, 0, z]}><shapeGeometry args={[shape]} /><meshStandardMaterial color={color} side={DoubleSide} /></mesh>;
}
