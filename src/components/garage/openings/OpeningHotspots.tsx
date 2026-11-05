import { useEffect, useMemo, useState, type RefObject } from 'react';
import { Euler, Group, Quaternion, Vector3 } from 'three';
import type { Bay, Opening } from '@/lib/garage/openingSystem';
import { splitBayPanels } from '@/lib/garage/openingSystem';
import { addHotspotPosition, gridBubbles, surfacePoint } from '@/lib/garage/surfaceHotspotLayout';
import catalog from '@/config/openingsCatalog.json';
import { SurfaceHotspot } from './SurfaceHotspot';

export function OpeningHotspots({ bays, openings, enabled, onAdd, onEdit, modelRef, templateId }: {
  bays: Bay[]; openings: Opening[]; enabled: boolean;
  modelRef?: RefObject<Group | null>; templateId?: string;
  onAdd: (bay: Bay) => void; onEdit: (opening: Opening) => void;
}) {
  const [templateWindows, setTemplateWindows] = useState<Opening[]>([]);
  useEffect(() => {
    const model = modelRef?.current;
    if (!model) return;
    model.updateWorldMatrix(true, true);
    const windows: Opening[] = [];
    model.traverse(object => {
      const window = object.userData.hotspotWindow;
      if (!window) return;
      const centre = object.getWorldPosition(new Vector3());
      for (const bay of bays.filter(b => !b.roof)) {
        const local = centre.clone().sub(new Vector3(...bay.position3D))
          .applyQuaternion(new Quaternion().setFromEuler(new Euler(...bay.rotation)).invert());
        if (Math.abs(local.z) > .2 || Math.abs(local.x) >= (bay.width + window.width) / 2) continue;
        windows.push({ id: `template-${object.uuid}-${bay.id}`, bayId: bay.id, category: 'window', subtype: 'fixed',
          width: window.width + .12, height: window.height + .12,
          x: local.x + bay.width / 2 - (window.width + .12) / 2,
          y: local.y + bay.height / 2 - (window.height + .12) / 2, frameColor: '', fillColor: '' });
      }
    });
    setTemplateWindows(windows);
  }, [bays, modelRef, templateId, enabled]);
  const bubbles = useMemo(() => gridBubbles(bays), [bays]);
  const points = useMemo(() => bays.map(bay => {
    const elements = openings.filter(o => o.bayId === bay.id);
    const free = splitBayPanels(bay.width, bay.height, elements);
    const canAdd = catalog.categories.some(c => c.roof === bay.roof && free.some(r => r.width >= c.minWidth + .2 && r.height >= c.minHeight + .1));
    return { bay, elements, addPosition: canAdd ? addHotspotPosition(bay, [...openings, ...templateWindows]) : null };
  }), [bays, openings, templateWindows]);
  if (!enabled) return null;
  return <group name="surface-opening-hotspots">
    {points.map(({ bay, elements, addPosition }) => <group key={bay.id}>
      {addPosition && <SurfaceHotspot position={addPosition} normal={bay.normal} onActivate={() => onAdd(bay)} />}
      {elements.map(opening => {
        const large = ['sectional', 'sliding', 'roller', 'dock', 'skylight'].includes(opening.category);
        const y = opening.y + opening.height * (large && !bay.roof ? .65 : .5);
        return <SurfaceHotspot key={opening.id} position={surfacePoint(bay, opening.x + opening.width / 2, y, .24)}
          normal={bay.normal} large={large} onActivate={() => onEdit(opening)} />;
      })}
    </group>)}
    {bubbles.map(bubble => <SurfaceHotspot key={bubble.id} position={bubble.position} normal={bubble.normal} label={bubble.label} axis />)}
  </group>;
}
