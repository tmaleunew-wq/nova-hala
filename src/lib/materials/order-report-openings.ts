import { getBackPersonalDoorX, getDoubleGateLayout, getFrontPersonalDoorX, getPersonalDoorZ, getWindowCoords } from '../../components/garage/Structure';
import { buildBays, type Opening } from '../garage/openingSystem';
import type { GarageParams } from '../garage/types';

export function getOrderReportOpenings(params: GarageParams): Opening[] {
  const { width, length, clearHeight } = params;
  if (![width, length, clearHeight].every(value => Number.isFinite(value) && value > 0) ||
    !Number.isInteger(params.bayCount) || params.bayCount < 1 || params.bayCount > 1000) return [];
  const bays = buildBays(params);
  const openings: Opening[] = [];
  function add(id: string, surface: string, category: string, center: number, y: number, w: number, h: number) {
    const span = surface === 'left' || surface === 'right' ? length : width;
    for (const bay of bays.filter(item => item.surface === surface)) {
      const [x, , z] = bay.position3D;
      const origin = span / 2 + (surface === 'left' ? z : surface === 'right' ? -z : surface === 'front' ? -x : x) - bay.width / 2;
      const start = Math.max(origin, span / 2 + center - w / 2);
      const end = Math.min(origin + bay.width, span / 2 + center + w / 2);
      if (end - start <= 1e-6 || h <= 0) continue;
      openings.push({ id, bayId: bay.id, category, subtype: 'Objednávka', x: start - origin, y,
        width: end - start, height: h, frameColor: '', fillColor: '' });
    }
  }

  const double = Number(params.gateCount ?? 1) === 2;
  const doorWidth = Math.min(params.doorWidth, double ? Math.max(1.2, (width - .85) / 2) : Math.max(1.5, width - .5));
  const doorHeight = Math.min(params.doorHeight, Math.max(1.8, clearHeight - .2));
  const layout = getDoubleGateLayout(width, doorWidth);
  if (double) {
    add('Brána 1', 'front', 'Brána', layout.leftCx, 0, layout.actualDoorW, doorHeight);
    add('Brána 2', 'front', 'Brána', layout.rightCx, 0, layout.actualDoorW, doorHeight);
  } else {
    add('Brána 1', 'front', 'Brána', 0, 0, doorWidth, doorHeight);
  }
  if (params.hasBackDoor) add('Zadná brána', 'back', 'Brána', 0, 0, doorWidth, doorHeight);
  const personalHeight = params.personalDoorHeight ?? 2;
  if (params.hasPersonalDoor) {
    const side = params.personalDoorSide;
    const face = side.startsWith('front') ? 'front' : side;
    const center = face === 'front' ? -getFrontPersonalDoorX(params) : face === 'back' ? getBackPersonalDoorX(params)
      : (face === 'right' ? -1 : 1) * getPersonalDoorZ(params);
    add('Dvere', face, 'Dvere', center, 0, params.personalDoorWidth ?? .9, personalHeight);
  }
  if (params.hasWindows && params.windowCount > 0) {
    const h = params.windowHeight ?? .6;
    const top = clearHeight - h / 2 - .15;
    const centerY = params.windowElevation == null ? Math.min(top, personalHeight - h / 2)
      : Math.max(h / 2 + .35, Math.min(top, params.windowElevation));
    getWindowCoords(params).forEach((center, index) => add('Okno ' + (index + 1), params.windowSide,
      'Okno', params.windowSide === 'right' ? -center : center, centerY - h / 2, params.windowWidth, h));
  }
  return openings;
}
