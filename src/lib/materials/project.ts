import { resolveBuildingObjects, isBuildingObject, type BuildingObject } from '../garage/buildingObjects';
import type { GarageParams } from '../garage/types';
import { buildBays, fitOpening, type Opening } from '../garage/openingSystem';
import { getTemplateDefaultOpenings } from '../garage/templateDefaults';

export const MATERIAL_PROJECT_STORAGE_KEY = 'vbau_hall_material_project_v1';

export interface ProjectMaterialSettings {
  accessories?: unknown;
  catalog?: unknown;
  wallProductId?: string;
  roofProductId?: string;
  wallOrientation?: 'vertical' | 'horizontal';
  profileAssignments?: Record<string, string>;
  viewSettings?: {
    show3DDims?: boolean;
    outlines?: boolean;
    technicalView?: boolean;
  };
}

/** Only confirmed model data belongs here; editor drafts and view flags are not inputs. */
export interface HallMaterialProject {
  schemaVersion: 1;
  id?: string;
  name?: string;
  templateId: string;
  params: GarageParams;
  openings?: Opening[];
  buildingObjects?: BuildingObject[];
  replacedWindowIds?: string[];
  materialSettings?: ProjectMaterialSettings;
}

export type MaterialProjectInput = Omit<HallMaterialProject, 'schemaVersion'> & { schemaVersion?: 1 };
type ProjectStorage = Pick<Storage, 'getItem' | 'setItem'>;

export function createMaterialProject(input: MaterialProjectInput): HallMaterialProject {
  if (input.buildingObjects !== undefined && (!Array.isArray(input.buildingObjects) || !input.buildingObjects.every(isBuildingObject))) throw new Error('Invalid building objects in project');
  return JSON.parse(JSON.stringify({
    schemaVersion: 1,
    id: input.id,
    name: input.name,
    templateId: input.templateId,
    params: input.params,
    openings: input.openings,
    buildingObjects: input.buildingObjects === undefined ? undefined : resolveBuildingObjects(input),
    replacedWindowIds: input.replacedWindowIds,
    materialSettings: input.materialSettings,
  }));
}

/** Missing means a legacy template; [] means the user deliberately removed every opening. */
export function resolveProjectOpenings(project: MaterialProjectInput): Opening[] {
  const bays = buildBays(project.params);
  const source = project.openings ?? getTemplateDefaultOpenings(project.templateId, project.params, bays)
    .filter(opening => !project.replacedWindowIds?.includes(opening.id));
  return source.flatMap(opening => {
    const bay = bays.find(item => item.id === opening.bayId);
    return bay ? [fitOpening(opening, bay)] : [];
  });
}

/** A replaced default can retain its ID: only absent confirmed objects are suppressed. */
export function getProjectRemovedOpeningIds(project: MaterialProjectInput): string[] {
  if (project.openings === undefined) return [];
  const confirmedIds = new Set(project.openings.map(opening => opening.id));
  const defaults = getTemplateDefaultOpenings(project.templateId, project.params, buildBays(project.params));
  return [...new Set([...defaults.map(opening => opening.id), ...(project.replacedWindowIds ?? [])])]
    .filter(id => !confirmedIds.has(id));
}

export function normalizeMaterialProject(input: MaterialProjectInput): HallMaterialProject {
  return createMaterialProject({ ...input, openings: resolveProjectOpenings(input) });
}

export function readMaterialProject(storage?: ProjectStorage): HallMaterialProject | null {
  try {
    const target = storage ?? (typeof window === 'undefined' ? undefined : window.localStorage);
    const value = target?.getItem(MATERIAL_PROJECT_STORAGE_KEY);
    if (!value) return null;
    const input = JSON.parse(value);
    if (!input || typeof input.templateId !== 'string' || !input.params ||
      !['width', 'length', 'clearHeight', 'bayCount'].every(key => Number.isFinite(input.params[key]) && input.params[key] > 0) ||
      !Number.isFinite(input.params.roofPitchDeg) ||
      (input.openings !== undefined && !Array.isArray(input.openings))) return null;
    return createMaterialProject(input);
  } catch {
    return null;
  }
}

export function writeMaterialProject(project: MaterialProjectInput, storage?: ProjectStorage): boolean {
  try {
    const target = storage ?? (typeof window === 'undefined' ? undefined : window.localStorage);
    if (!target) return false;
    target.setItem(MATERIAL_PROJECT_STORAGE_KEY, JSON.stringify(createMaterialProject(project)));
    return true;
  } catch {
    return false;
  }
}
