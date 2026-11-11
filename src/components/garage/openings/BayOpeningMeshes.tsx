import { useEffect, useMemo } from 'react';
import { BoxGeometry, DoubleSide, Shape } from 'three';
import { splitBayPanels, type Bay, type Opening, type Rect } from '@/lib/garage/openingSystem';
import { isTemplateDefaultOpening } from '@/lib/garage/templateDefaults';
import { RoofSheetDetails } from '../RoofSheetDetails';

/** Metre-based UVs retain the material's physical repeat across every rectangular piece. */
export function createBayPanelGeometry(rect: Rect, bay: Bay, thickness = .1) {
  const geometry = new BoxGeometry(rect.width, rect.height, thickness);
  geometry.translate(rect.x + rect.width / 2 - bay.width / 2, rect.y + rect.height / 2 - bay.height / 2, 0);
  const position = geometry.getAttribute('position'), uv = geometry.getAttribute('uv');
  for (let i = 0; i < position.count; i++) uv.setXY(i, position.getX(i) + bay.width / 2, position.getY(i) + bay.height / 2);
  uv.needsUpdate = true;
  return geometry;
}
function PanelPiece({ rect, bay, color, opacity, thickness = .1 }: { rect: Rect; bay: Bay; color: string; opacity: number; thickness?: number }) {
  const geometry = useMemo(() => createBayPanelGeometry(rect, bay, thickness), [rect, bay, thickness]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} castShadow receiveShadow><meshStandardMaterial color={color} metalness={.25} roughness={.7} transparent={opacity < 1} opacity={opacity} /></mesh>;
}
function OpeningModel({ o }: { o: Opening }) {
  const w = o.width, h = o.height;
  const glass = ['window', 'skylight'].includes(o.category);
  const isFloorBased = ['door', 'sectional', 'roller', 'dock'].includes(o.category);
  const frame = (x: number, y: number, width: number, height: number, key: string) => (
    <mesh key={key} position={[x, y, .04]} castShadow>
      <boxGeometry args={[width, height, .16]} />
      <meshStandardMaterial color={o.frameColor} metalness={.5} roughness={.4} />
    </mesh>
  );

  return (
    <group>
      {/* Side jambs */}
      {frame(-w / 2 + .035, 0, .07, h, 'left')}
      {frame(w / 2 - .035, 0, .07, h, 'right')}
      {/* Header frame */}
      {frame(0, h / 2 - .035, w, .07, 'top')}
      {/* Bottom threshold frame ONLY for elevated openings (windows/skylights), NOT for floor-based doors/gates */}
      {!isFloorBased && frame(0, -h / 2 + .035, w, .07, 'bottom')}

      {/* Main fill panel */}
      {o.category !== 'frame' && (
        <mesh position={[0, isFloorBased ? 0.02 : 0, 0.01]} castShadow={!glass}>
          <boxGeometry args={[Math.max(.01, w - .14), Math.max(.01, h - (isFloorBased ? .07 : .14)), .04]} />
          <meshStandardMaterial
            color={glass ? '#b9dce6' : o.fillColor}
            transparent={glass}
            opacity={glass ? .42 : 1}
            roughness={glass ? .15 : .5}
            metalness={glass ? .1 : .25}
            side={DoubleSide}
          />
        </mesh>
      )}

      {/* Sectional gate panels & seams */}
      {o.category === 'sectional' && (
        <group position={[0, 0, 0.02]}>
          {Array.from({ length: Math.max(3, Math.round(h / 0.55)) }, (_, i) => {
            const panelCount = Math.max(3, Math.round(h / 0.55));
            const panelHeight = (h - 0.07) / panelCount;
            const py = -h / 2 + 0.035 + (i + 0.5) * panelHeight;
            return (
              <group key={`sec-panel-${i}`} position={[0, py, 0.01]}>
                {/* Horizontal panel joint seam */}
                <mesh position={[0, panelHeight / 2, 0.015]}>
                  <boxGeometry args={[w - 0.14, 0.012, 0.01]} />
                  <meshStandardMaterial color="#1e2229" metalness={0.7} roughness={0.3} />
                </mesh>
              </group>
            );
          })}
          {/* Sectional gate handle */}
          <mesh position={[0, -h / 2 + 0.35, 0.035]}>
            <boxGeometry args={[0.2, 0.04, 0.03]} />
            <meshStandardMaterial color="#111827" metalness={0.8} roughness={0.2} />
          </mesh>
        </group>
      )}

      {/* Roller shutter slats */}
      {o.category === 'roller' && (
        Array.from({ length: Math.floor(h / 0.15) }, (_, i) =>
          frame(0, -h / 2 + (i + 1) * 0.15, w - .14, .015, `rib-${i}`)
        )
      )}

      {/* Window mullion */}
      {['window', 'skylight', 'sliding'].includes(o.category) && frame(0, 0, .045, h - .14, 'mullion')}

      {/* Door handle & glazing */}
      {(o.category === 'door' || o.subtype === 'wicket') && frame(w * .3, -h * .1, .12, .035, 'handle')}
      {o.subtype === 'glazed' && (
        <mesh position={[0, h * .15, .08]}>
          <boxGeometry args={[w * .75, h * .25, .025]} />
          <meshStandardMaterial color="#9fc7d8" metalness={.3} roughness={.1} />
        </mesh>
      )}
      {o.subtype === 'wicket' && frame(w * .15, -h * .2, .035, Math.min(2, h * .6), 'wicket')}
      {o.category === 'dock' && (
        <mesh position={[0, -h / 2 + .08, .5]}>
          <boxGeometry args={[w, .15, 1]} />
          <meshStandardMaterial color="#41474b" metalness={.7} roughness={.7} />
        </mesh>
      )}
    </group>
  );
}

export function BayOpeningMeshes({ bays, openings, surfaces, selected, color, roofColor, opacity, showOpenings, stemHeight = 0, stemColor = '#a5a5a5', stemThickness = .14, replacedWindowIds = [] }: {
  bays: Bay[]; openings: Opening[]; surfaces: string[]; selected?: string; color: string; roofColor: string; opacity: number; showOpenings: boolean;
  stemHeight?: number; stemColor?: string; stemThickness?: number; replacedWindowIds?: string[];
}) {
  return <group name="editable-bay-openings">{bays.map(bay => {
    const elements = openings.filter(o => o.bayId === bay.id);
    const panels = surfaces.includes(bay.surface) ? splitBayPanels(bay.width, bay.height, elements) : [];
    const baseHeight = bay.roof ? 0 : Math.max(0, Math.min(stemHeight, bay.height));
    const cladding = panels.map(rect => {
      const y = Math.max(rect.y, baseHeight);
      return { ...rect, y, height: rect.y + rect.height - y };
    }).filter(rect => rect.height > 1e-6);
    const basePanels = panels.map(rect => ({ ...rect, height: Math.min(rect.y + rect.height, baseHeight) - rect.y }))
      .filter(rect => rect.height > 1e-6);
    return <group key={bay.id} position={bay.position3D} rotation={bay.rotation}>
      {cladding.map((rect, i) => <PanelPiece key={i} rect={rect} bay={bay} color={bay.roof ? roofColor : color} opacity={opacity} />)}
      {bay.roof && panels.length > 0 && <RoofSheetDetails width={bay.width} height={bay.height}
        panels={panels} offset={-bay.position3D[2] - bay.height / 2} color={roofColor} opacity={opacity} />}
      {basePanels.map((rect, i) => <PanelPiece key={`stem-${i}`} rect={rect} bay={bay} color={stemColor} opacity={1} thickness={stemThickness} />)}
      {selected === bay.id && <mesh position={[0, 0, .09]} raycast={() => null}><planeGeometry args={[bay.width, bay.height]} /><meshBasicMaterial color="#38bdf8" transparent opacity={.14} depthWrite={false} side={DoubleSide} /></mesh>}
      {showOpenings && elements.map(o => {
        if (isTemplateDefaultOpening(o.id) && !replacedWindowIds.includes(o.id)) {
          return null;
        }
        return (
          <group key={o.id} position={[o.x + o.width / 2 - bay.width / 2, o.y + o.height / 2 - bay.height / 2, .08]}>
            <OpeningModel o={o} />
          </group>
        );
      })}
    </group>;
  })}</group>;
}

export function GableCap({ width, height, pitch, z, color }: { width: number; height: number; pitch: number; z: number; color: string }) {
  const shape = useMemo(() => {
    const s = new Shape(); s.moveTo(-width / 2, height); s.lineTo(width / 2, height); s.lineTo(0, height + width / 2 * Math.tan(pitch * Math.PI / 180)); s.closePath(); return s;
  }, [width, height, pitch]);
  return <mesh position={[0, 0, z]}><shapeGeometry args={[shape]} /><meshStandardMaterial color={color} side={DoubleSide} /></mesh>;
}
