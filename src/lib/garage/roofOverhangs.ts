import defaults from '../../config/roof-overhangs/default.json';
import fallbackDefaults from '../../config/default.json';
import type { GarageParams } from './types';
import type { BuildingObject } from './buildingObjects';

export interface RoofOverhangs {
  front: number;
  back: number;
  left: number;
  right: number;
}

export interface RoofGeometryResult {
  overhangs: RoofOverhangs;
  effLength: number;
  centerZ: number;
  isGable: boolean;
  isShed: boolean;
  pitchRad: number;
  // Slope dimensions
  leftSpanX: number;
  rightSpanX: number;
  leftSlopeLen: number;
  rightSlopeLen: number;
  shedSpanX: number;
  shedSlopeLen: number;
  // Overall quantities
  totalRoofAreaM2: number;
  ridgeLengthM: number;
  gutterLengthM: number;
  eavesLengthM: number;
  vergeLengthM: number;
  // Centers for 3D meshes
  leftSlopeCenterX: number;
  rightSlopeCenterX: number;
  leftSlopeCenterY: number;
  rightSlopeCenterY: number;
}

export interface RoofOverhangWarning {
  code: 'cantilever' | 'canopy_collision';
  message: string;
  side?: 'front' | 'back' | 'left' | 'right';
  valueM?: number;
}

const config = {
  min: defaults?.min ?? (fallbackDefaults as any)?.roofOverhangs?.min ?? 0,
  max: defaults?.max ?? (fallbackDefaults as any)?.roofOverhangs?.max ?? 2.5,
  step: defaults?.step ?? (fallbackDefaults as any)?.roofOverhangs?.step ?? 0.05,
  maxSafeCantileverM: defaults?.maxSafeCantileverM ?? (fallbackDefaults as any)?.roofOverhangs?.maxSafeCantileverM ?? 0.5,
  warningMessage: defaults?.warningMessage ?? (fallbackDefaults as any)?.roofOverhangs?.warningMessage ?? 'Presah nad 0,5 m vyžaduje individuálne statické posúdenie konzolových väzníc.',
};

export function getRoofOverhangConfig() {
  return config;
}

export function getEffectiveRoofOverhangs(params?: Partial<GarageParams>): RoofOverhangs {
  const clamp = (val: number | undefined) => {
    if (val === undefined || !Number.isFinite(val)) return 0;
    return Math.max(0, Math.min(val, config.max));
  };
  return {
    front: clamp(params?.roofOverhangFront),
    back: clamp(params?.roofOverhangBack),
    left: clamp(params?.roofOverhangLeft),
    right: clamp(params?.roofOverhangRight),
  };
}

export function calculateRoofGeometry(p: GarageParams): RoofGeometryResult {
  const overhangs = getEffectiveRoofOverhangs(p);
  const W = p.width;
  const L = p.length;
  const H = p.clearHeight;
  const halfW = W / 2;
  const pitchRad = ((p.roofPitchDeg ?? 10) * Math.PI) / 180;
  const cosPitch = Math.cos(pitchRad);
  const tanPitch = Math.tan(pitchRad);
  const isGable = p.roofType !== 'shed' && p.roofType !== 'cubic';
  const isShed = p.roofType === 'shed';

  const effLength = L + overhangs.front + overhangs.back;
  const centerZ = (overhangs.back - overhangs.front) / 2;

  if (isGable) {
    const leftSpanX = halfW + overhangs.left;
    const rightSpanX = halfW + overhangs.right;
    const leftSlopeLen = leftSpanX / cosPitch;
    const rightSlopeLen = rightSpanX / cosPitch;

    const leftSlopeCenterX = -halfW + (leftSpanX / 2) - overhangs.left;
    const rightSlopeCenterX = halfW - (rightSpanX / 2) + overhangs.right;

    const leftSlopeCenterY = H + (leftSpanX / 2) * tanPitch;
    const rightSlopeCenterY = H + (rightSpanX / 2) * tanPitch;

    const totalRoofAreaM2 = (leftSlopeLen + rightSlopeLen) * effLength;
    const ridgeLengthM = effLength;
    const gutterLengthM = 2 * effLength;
    const eavesLengthM = 2 * effLength;
    const vergeLengthM = 2 * (leftSlopeLen + rightSlopeLen);

    return {
      overhangs,
      effLength,
      centerZ,
      isGable: true,
      isShed: false,
      pitchRad,
      leftSpanX,
      rightSpanX,
      leftSlopeLen,
      rightSlopeLen,
      shedSpanX: 0,
      shedSlopeLen: 0,
      totalRoofAreaM2,
      ridgeLengthM,
      gutterLengthM,
      eavesLengthM,
      vergeLengthM,
      leftSlopeCenterX,
      rightSlopeCenterX,
      leftSlopeCenterY,
      rightSlopeCenterY,
    };
  }

  // Shed / monopitch roof
  const shedSpanX = W + overhangs.left + overhangs.right;
  const shedSlopeLen = shedSpanX / cosPitch;
  const totalRoofAreaM2 = shedSlopeLen * effLength;
  const ridgeLengthM = 0;
  const gutterLengthM = effLength;
  const eavesLengthM = 2 * effLength;
  const vergeLengthM = 2 * shedSlopeLen;

  return {
    overhangs,
    effLength,
    centerZ,
    isGable: false,
    isShed: true,
    pitchRad,
    leftSpanX: 0,
    rightSpanX: 0,
    leftSlopeLen: 0,
    rightSlopeLen: 0,
    shedSpanX,
    shedSlopeLen,
    totalRoofAreaM2,
    ridgeLengthM,
    gutterLengthM,
    eavesLengthM,
    vergeLengthM,
    leftSlopeCenterX: 0,
    rightSlopeCenterX: 0,
    leftSlopeCenterY: H,
    rightSlopeCenterY: H + W * tanPitch,
  };
}

export function validateRoofOverhangs(
  params: GarageParams,
  buildingObjects: BuildingObject[] = []
): RoofOverhangWarning[] {
  const warnings: RoofOverhangWarning[] = [];
  const overhangs = getEffectiveRoofOverhangs(params);
  const maxSafe = config.maxSafeCantileverM;

  const sides: Array<{ key: keyof RoofOverhangs; label: string }> = [
    { key: 'front', label: 'Predný presah' },
    { key: 'back', label: 'Zadný presah' },
    { key: 'left', label: 'Ľavý presah' },
    { key: 'right', label: 'Pravý presah' },
  ];

  for (const { key, label } of sides) {
    const val = overhangs[key];
    if (val > maxSafe) {
      warnings.push({
        code: 'cantilever',
        side: key,
        valueM: val,
        message: `${label} (${val.toFixed(2)} m) presahuje bezpečnú konzolu ${maxSafe} m. ${config.warningMessage}`,
      });
    }
  }

  // Check canopy/annex attachment collision (Requirement 7)
  const mainHall = buildingObjects.find(o => o.type === 'main_hall');
  const attached = buildingObjects.filter(o => o.type !== 'main_hall');

  for (const obj of attached) {
    const side = obj.attachment.side;
    const overhangOnSide = side === 'left' ? overhangs.left
      : side === 'right' ? overhangs.right
      : side === 'front' ? overhangs.front
      : overhangs.back;

    if (overhangOnSide > 0.05) {
      warnings.push({
        code: 'canopy_collision',
        side,
        valueM: overhangOnSide,
        message: `Presah strechy na ${side === 'left' ? 'ľavej' : side === 'right' ? 'pravej' : side === 'front' ? 'prednej' : 'zadnej'} strane (${overhangOnSide.toFixed(2)} m) zasahuje do roviny napojenia objektu „${obj.name}“. Skontrolujte vzájomné napojenie konštrukcie.`,
      });
    }
  }

  return warnings;
}
