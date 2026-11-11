/**
 * Universal Building Element Collision Detection & Prevention System
 * (Univerzálny systém kontroly kolízií stavebných prvkov)
 *
 * Implements CAD-grade 2D/3D collision detection, clearance margins,
 * structural steel column obstacle protection, boundary constraints,
 * and nearest-valid-position solver for all current and future building elements.
 */

import defaultConfig from '../../config/default.json';

export type CollisionSurface = 'front' | 'back' | 'left' | 'right' | 'roof-left' | 'roof-right';

export interface CollisionRules {
  minGapOpenings: number;     // Minimum clearance between opening frames (m), default 0.15m (150mm)
  minGapColumn: number;       // Clearance from structural column edge (m), default 0.15m
  minGapCorner: number;       // Clearance from wall corners (m), default 0.20m
  minGapEaves: number;        // Clearance below eaves/roofline (m), default 0.20m
  minWindowSill: number;      // Minimum sill height above floor for windows (m), default 0.10m
  columnWidthSide: number;    // Width reserved for portal frame column (m), default 0.30m
  columnWidthGable: number;   // Width reserved for gable wind post (m), default 0.25m
}

export const DEFAULT_COLLISION_RULES: CollisionRules = {
  minGapOpenings: (defaultConfig as any)?.collisionRules?.minGapOpenings ?? 0.15,
  minGapColumn: (defaultConfig as any)?.collisionRules?.minGapColumn ?? 0.15,
  minGapCorner: (defaultConfig as any)?.collisionRules?.minGapCorner ?? 0.20,
  minGapEaves: (defaultConfig as any)?.collisionRules?.minGapEaves ?? 0.20,
  minWindowSill: (defaultConfig as any)?.collisionRules?.minWindowSill ?? 0.10,
  columnWidthSide: (defaultConfig as any)?.collisionRules?.columnWidthSide ?? 0.30,
  columnWidthGable: (defaultConfig as any)?.collisionRules?.columnWidthGable ?? 0.25,
};

export interface CollisionOpening {
  id: string;
  category: string; // 'door' | 'window' | 'sectional' | 'roller' | 'sliding' | 'dock' | 'skylight' | 'frame' | 'vent' | 'stairs' | string
  subtype?: string;
  surface: CollisionSurface;
  x: number;       // Local x in metres on surface (from left edge facing from outside)
  y: number;       // Local y in metres on surface (from bottom/ground)
  width: number;   // In metres
  height: number;  // In metres
  depth?: number;  // 3D depth in metres
  isFixedTemplate?: boolean;
  label?: string;
  bayId?: string;
}

export interface StructuralObstacle {
  id: string;
  name: string;
  surface: CollisionSurface;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'COLUMN' | 'FRAME_POST' | 'BRACING' | 'PLINTH' | 'BEAM';
}

export type CollisionIssueType =
  | 'OVERLAP'
  | 'BOUNDARY'
  | 'COLUMN'
  | 'CLEARANCE'
  | 'DIMENSION'
  | 'STRUCTURAL';

export interface CollisionIssue {
  type: CollisionIssueType;
  severity: 'ERROR' | 'WARNING';
  elementId: string;
  conflictingElementId?: string;
  conflictingObstacleName?: string;
  surface: CollisionSurface;
  message: string;
  details?: {
    requiredGap?: number;
    actualGap?: number;
  };
}

export interface ValidationResult {
  valid: boolean;
  issues: CollisionIssue[];
  nearestValidPosition?: { x: number; y: number };
}

export interface HallGeometryDims {
  width: number;
  length: number;
  clearHeight: number;
  bayCount: number;
  roofPitchDeg: number;
}

/**
 * Calculates surface dimensions (width & height) in local metres.
 */
export function getSurfaceDimensions(surface: CollisionSurface, geom: HallGeometryDims): { width: number; height: number } {
  const pitchRad = (geom.roofPitchDeg * Math.PI) / 180;
  const slopeWidth = (geom.width / 2) / Math.cos(pitchRad);
  switch (surface) {
    case 'front':
    case 'back':
      return { width: geom.width, height: geom.clearHeight };
    case 'left':
    case 'right':
      return { width: geom.length, height: geom.clearHeight };
    case 'roof-left':
    case 'roof-right':
      return { width: slopeWidth, height: geom.length };
  }
}

/**
 * Calculates structural column and wind post obstacles that openings must not intersect.
 */
export function calculateStructuralObstacles(geom: HallGeometryDims, rules: CollisionRules = DEFAULT_COLLISION_RULES): StructuralObstacle[] {
  const obstacles: StructuralObstacle[] = [];
  const n = Math.max(2, geom.bayCount);
  const bayLen = geom.length / n;

  // 1. Side wall portal columns (left and right walls)
  // Columns are located at every portal frame: z = 0, bayLen, 2*bayLen ... up to geom.length
  for (let i = 0; i <= n; i++) {
    const frameX = i * bayLen;
    // Left wall: frameX along length
    // Column reservation zone
    const colHalf = rules.columnWidthSide / 2;
    const colLeft = Math.max(0, frameX - colHalf);
    const colRight = Math.min(geom.length, frameX + colHalf);
    const colW = colRight - colLeft;

    obstacles.push({
      id: `col-left-frame-${i}`,
      name: `Oceľový stĺp rámu ${i + 1} (ľavá stena)`,
      surface: 'left',
      x: colLeft,
      y: 0,
      width: colW,
      height: geom.clearHeight,
      type: 'COLUMN',
    });

    obstacles.push({
      id: `col-right-frame-${i}`,
      name: `Oceľový stĺp rámu ${i + 1} (pravá stena)`,
      surface: 'right',
      x: colLeft,
      y: 0,
      width: colW,
      height: geom.clearHeight,
      type: 'COLUMN',
    });
  }

  // 2. Gable wall posts (front and back walls)
  // Gable posts at building corners + intermediate wind posts
  const gableColumns = Math.max(1, Math.ceil(geom.width / 6));
  const postSpacing = geom.width / gableColumns;

  for (let i = 0; i <= gableColumns; i++) {
    const postX = i * postSpacing;
    const colHalf = rules.columnWidthGable / 2;
    const colLeft = Math.max(0, postX - colHalf);
    const colRight = Math.min(geom.width, postX + colHalf);
    const colW = colRight - colLeft;

    // Corner columns are strictly protected; intermediate gable posts can be framed around
    // but in automatic mode openings must not slice through them.
    const isCorner = i === 0 || i === gableColumns;
    const nameStr = isCorner ? `Rohový stĺp haly` : `Štítový stĺpik ${i}`;

    obstacles.push({
      id: `col-front-post-${i}`,
      name: `${nameStr} (predná stena)`,
      surface: 'front',
      x: colLeft,
      y: 0,
      width: colW,
      height: geom.clearHeight,
      type: isCorner ? 'COLUMN' : 'FRAME_POST',
    });

    obstacles.push({
      id: `col-back-post-${i}`,
      name: `${nameStr} (zadná stena)`,
      surface: 'back',
      x: colLeft,
      y: 0,
      width: colW,
      height: geom.clearHeight,
      type: isCorner ? 'COLUMN' : 'FRAME_POST',
    });
  }

  return obstacles;
}

/**
 * Checks if two 2D axis-aligned rectangles overlap, taking an optional margin into account.
 */
export function rectsOverlap(
  r1: { x: number; y: number; width: number; height: number },
  r2: { x: number; y: number; width: number; height: number },
  margin = 0
): boolean {
  return (
    r1.x < r2.x + r2.width + margin &&
    r1.x + r1.width + margin > r2.x &&
    r1.y < r2.y + r2.height + margin &&
    r1.y + r1.height + margin > r2.y
  );
}

/**
 * Calculates Euclidean distance between two non-overlapping rectangles. Returns 0 if overlapping.
 */
export function rectDistance(
  r1: { x: number; y: number; width: number; height: number },
  r2: { x: number; y: number; width: number; height: number }
): { dx: number; dy: number; total: number } {
  const dx = Math.max(0, Math.max(r1.x - (r2.x + r2.width), r2.x - (r1.x + r1.width)));
  const dy = Math.max(0, Math.max(r1.y - (r2.y + r2.height), r2.y - (r1.y + r1.height)));
  return { dx, dy, total: Math.hypot(dx, dy) };
}

/**
 * Validates a single candidate opening against wall boundaries, other openings, and structural columns.
 */
export function validateOpening(
  candidate: CollisionOpening,
  allOpenings: CollisionOpening[],
  obstacles: StructuralObstacle[],
  surfaceBounds: { width: number; height: number },
  rules: CollisionRules = DEFAULT_COLLISION_RULES
): ValidationResult {
  const issues: CollisionIssue[] = [];

  // 1. Boundary & Clearance from edges
  const minX = rules.minGapCorner;
  const maxX = surfaceBounds.width - rules.minGapCorner;
  const maxY = surfaceBounds.height - rules.minGapEaves;

  if (candidate.x < 0 || candidate.x + candidate.width > surfaceBounds.width) {
    issues.push({
      type: 'BOUNDARY',
      severity: 'ERROR',
      elementId: candidate.id,
      surface: candidate.surface,
      message: `Prvok presahuje šírku steny (${candidate.x.toFixed(2)}m až ${(candidate.x + candidate.width).toFixed(2)}m, šírka steny je ${surfaceBounds.width.toFixed(2)}m).`,
    });
  } else if (candidate.x < minX || candidate.x + candidate.width > maxX) {
    issues.push({
      type: 'BOUNDARY',
      severity: 'ERROR',
      elementId: candidate.id,
      surface: candidate.surface,
      message: `Prvok je príliš blízko k rohu budovy. Požadovaný odstup od rohu je min. ${minX * 1000} mm.`,
    });
  }

  if (candidate.y < 0) {
    issues.push({
      type: 'BOUNDARY',
      severity: 'ERROR',
      elementId: candidate.id,
      surface: candidate.surface,
      message: `Prvok zasahuje pod úroveň podlahy (y = ${candidate.y.toFixed(2)}m).`,
    });
  } else if (candidate.y + candidate.height > surfaceBounds.height) {
    issues.push({
      type: 'BOUNDARY',
      severity: 'ERROR',
      elementId: candidate.id,
      surface: candidate.surface,
      message: `Prvok presahuje hornú hranu steny (${(candidate.y + candidate.height).toFixed(2)}m > ${surfaceBounds.height.toFixed(2)}m).`,
    });
  } else if (candidate.y + candidate.height > maxY) {
    issues.push({
      type: 'BOUNDARY',
      severity: 'ERROR',
      elementId: candidate.id,
      surface: candidate.surface,
      message: `Prvok je príliš blízko k odkvapu/streche. Požadovaný odstup pod odkvapom je min. ${rules.minGapEaves * 1000} mm.`,
    });
  }

  // Windows must have sill clearance above floor (unless roof skylight or floor-to-ceiling)
  if (candidate.category === 'window' && candidate.surface !== 'roof-left' && candidate.surface !== 'roof-right') {
    if (candidate.y < rules.minWindowSill) {
      issues.push({
        type: 'CLEARANCE',
        severity: 'ERROR',
        elementId: candidate.id,
        surface: candidate.surface,
        message: `Parapet okna je príliš nízko (${(candidate.y * 1000).toFixed(0)} mm). Minimálna výška parapetu je ${rules.minWindowSill * 1000} mm.`,
      });
    }
  }

  // 2. Collision with structural obstacles (steel columns, frames)
  for (const obs of obstacles) {
    if (obs.surface !== candidate.surface) continue;
    if (rectsOverlap(candidate, obs, 0.01)) {
      issues.push({
        type: 'COLUMN',
        severity: 'ERROR',
        elementId: candidate.id,
        conflictingObstacleName: obs.name,
        surface: candidate.surface,
        message: `Otvor zasahuje do nosnej oceľovej konštrukcie: ${obs.name}. Umiestnenie je neprípustné.`,
      });
    }
  }

  // 3. Collision with other openings on the SAME surface
  for (const other of allOpenings) {
    if (other.id === candidate.id || other.surface !== candidate.surface) continue;

    // Check direct physical overlap (AABB)
    if (rectsOverlap(candidate, other, 0)) {
      issues.push({
        type: 'OVERLAP',
        severity: 'ERROR',
        elementId: candidate.id,
        conflictingElementId: other.id,
        surface: candidate.surface,
        message: `Prvok sa fyzicky prekrýva s prvkom "${other.label || other.category}" (ID: ${other.id}). Prekrytie je neprípustné.`,
      });
    } else if (rectsOverlap(candidate, other, rules.minGapOpenings)) {
      // Elements do not directly touch, but violate minimum required clearance margin
      const dist = rectDistance(candidate, other);
      const minDistance = Math.min(dist.dx, dist.dy);
      issues.push({
        type: 'CLEARANCE',
        severity: 'ERROR',
        elementId: candidate.id,
        conflictingElementId: other.id,
        surface: candidate.surface,
        message: `Nedostatočný montážny odstup medzi prvkami (${(minDistance * 1000).toFixed(0)} mm). Požadovaný minimálny odstup je ${rules.minGapOpenings * 1000} mm.`,
        details: {
          requiredGap: rules.minGapOpenings,
          actualGap: minDistance,
        },
      });
    }
  }

  const valid = issues.length === 0;
  const result: ValidationResult = { valid, issues };

  // If invalid, calculate nearest valid position
  if (!valid) {
    const suggested = findNearestValidPosition(candidate, allOpenings, obstacles, surfaceBounds, rules);
    if (suggested) {
      result.nearestValidPosition = suggested;
    }
  }

  return result;
}

/**
 * Searches in outward steps around candidate's (x, y) to find the nearest collision-free coordinates.
 */
export function findNearestValidPosition(
  candidate: CollisionOpening,
  allOpenings: CollisionOpening[],
  obstacles: StructuralObstacle[],
  surfaceBounds: { width: number; height: number },
  rules: CollisionRules = DEFAULT_COLLISION_RULES,
  step = 0.05
): { x: number; y: number } | null {
  const minX = rules.minGapCorner;
  const maxX = surfaceBounds.width - rules.minGapCorner - candidate.width;
  const minY = (candidate.category === 'window' && !candidate.surface.startsWith('roof'))
    ? rules.minWindowSill
    : 0;
  const maxY = surfaceBounds.height - rules.minGapEaves - candidate.height;

  if (maxX < minX || maxY < minY) {
    // Opening is physically larger than allowable surface area
    return null;
  }

  const startX = Math.max(minX, Math.min(candidate.x, maxX));
  const startY = Math.max(minY, Math.min(candidate.y, maxY));

  const testPos = (tx: number, ty: number): boolean => {
    const testOpening: CollisionOpening = { ...candidate, x: tx, y: ty };
    // Check obstacles
    for (const obs of obstacles) {
      if (obs.surface !== testOpening.surface) continue;
      if (rectsOverlap(testOpening, obs, 0.01)) return false;
    }
    // Check other openings + clearance
    for (const other of allOpenings) {
      if (other.id === testOpening.id || other.surface !== testOpening.surface) continue;
      if (rectsOverlap(testOpening, other, rules.minGapOpenings)) return false;
    }
    return true;
  };

  // If current clamped position is valid:
  if (testPos(startX, startY)) {
    return { x: Number(startX.toFixed(2)), y: Number(startY.toFixed(2)) };
  }

  // Outward spiral search: try offsets in X and Y
  const maxRadius = Math.max(surfaceBounds.width, surfaceBounds.height);
  const stepsCount = Math.ceil(maxRadius / step);

  // Doors & gates prefer staying at ground (y = 0); windows prefer staying at current sill height
  const lockY = candidate.category === 'door' || candidate.category === 'sectional' || candidate.category === 'roller' || candidate.category === 'sliding';

  // First try 1D horizontal shifts along current Y
  for (let s = 1; s <= stepsCount; s++) {
    const d = s * step;
    for (const sign of [1, -1]) {
      const tx = startX + sign * d;
      if (tx >= minX && tx <= maxX) {
        if (testPos(tx, startY)) {
          return { x: Number(tx.toFixed(2)), y: Number(startY.toFixed(2)) };
        }
      }
    }
  }

  // If locked to ground and no horizontal slot found, no valid position on ground
  if (lockY) {
    return null;
  }

  // 2D grid search
  for (let s = 1; s <= stepsCount; s++) {
    const d = s * step;
    for (let dx = -d; dx <= d; dx += step) {
      for (const dy of [-d, d]) {
        const tx = startX + dx;
        const ty = startY + dy;
        if (tx >= minX && tx <= maxX && ty >= minY && ty <= maxY) {
          if (testPos(tx, ty)) {
            return { x: Number(tx.toFixed(2)), y: Number(ty.toFixed(2)) };
          }
        }
      }
    }
    for (let dy = -d + step; dy <= d - step; dy += step) {
      for (const dx of [-d, d]) {
        const tx = startX + dx;
        const ty = startY + dy;
        if (tx >= minX && tx <= maxX && ty >= minY && ty <= maxY) {
          if (testPos(tx, ty)) {
            return { x: Number(tx.toFixed(2)), y: Number(ty.toFixed(2)) };
          }
        }
      }
    }
  }

  return null;
}

/**
 * Validates the entire hall layout with all openings against structural obstacles and boundaries.
 */
export function validateHallLayout(
  geom: HallGeometryDims,
  openings: CollisionOpening[],
  rules: CollisionRules = DEFAULT_COLLISION_RULES
): { valid: boolean; issues: CollisionIssue[]; autoRepairedOpenings?: CollisionOpening[] } {
  const obstacles = calculateStructuralObstacles(geom, rules);
  const issues: CollisionIssue[] = [];

  for (const opening of openings) {
    const bounds = getSurfaceDimensions(opening.surface, geom);
    const res = validateOpening(opening, openings, obstacles, bounds, rules);
    if (!res.valid) {
      issues.push(...res.issues);
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Automatically repairs openings when building dimensions change or corrupt configurations are loaded.
 * Ensures no openings are silently deleted; attempts to adjust positions to nearest valid slots.
 */
export function repairHallOpenings(
  geom: HallGeometryDims,
  openings: CollisionOpening[],
  rules: CollisionRules = DEFAULT_COLLISION_RULES
): {
  repairedOpenings: CollisionOpening[];
  modifiedCount: number;
  unresolvableIssues: CollisionIssue[];
} {
  const obstacles = calculateStructuralObstacles(geom, rules);
  const currentOpenings: CollisionOpening[] = openings.map(o => ({ ...o }));
  let modifiedCount = 0;
  const unresolvableIssues: CollisionIssue[] = [];

  for (let i = 0; i < currentOpenings.length; i++) {
    const opening = currentOpenings[i];
    const bounds = getSurfaceDimensions(opening.surface, geom);
    const res = validateOpening(opening, currentOpenings, obstacles, bounds, rules);

    if (!res.valid) {
      const nearest = findNearestValidPosition(opening, currentOpenings, obstacles, bounds, rules);
      if (nearest) {
        currentOpenings[i] = {
          ...opening,
          x: nearest.x,
          y: nearest.y,
        };
        modifiedCount++;
      } else {
        unresolvableIssues.push(...res.issues);
      }
    }
  }

  return {
    repairedOpenings: currentOpenings,
    modifiedCount,
    unresolvableIssues,
  };
}
