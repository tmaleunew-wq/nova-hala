import { z } from 'zod';
import defaults from '../../config/materials/default.json' with { type: 'json' };

const positive = z.number().finite().positive().nullable();
const date = z.string().date().nullable();
const provenance = z.enum(['verified', 'partial', 'unverified']);
const id = z.string().regex(/^[a-z0-9][a-z0-9-]{0,99}$/i);
const source = z.object({ id, title: z.string().min(1), url: z.string().url().regex(/^https?:\/\//i, 'url must use HTTP(S)'), version: z.string().nullable(), validFrom: date, checkedAt: date, status: provenance, notes: z.array(z.string()) });
const product = z.object({ id, sourceId: id.nullable(), status: provenance, limitations: z.array(z.string()) });
const steel = product.extend({ family: z.string().min(1), designation: z.string().min(1), kgPerM: positive,
  heightMm: positive.optional(), widthMm: positive.optional(), webThicknessMm: positive.optional(), flangeThicknessMm: positive.optional(), wallThicknessMm: positive.optional() });
const panel = product.extend({ name: z.string().min(1), manufacturer: z.string().min(1), core: z.enum(['PIR', 'PUR', 'MW']), usage: z.enum(['wall', 'roof']),
  thicknessMm: positive, coverWidthMm: positive, overallWidthMm: positive, minLengthMm: positive, maxLengthMm: positive, kgPerM2: positive,
  minRoofSlopePercent: z.number().finite().nonnegative().nullable(), joinedRoofSlopePercent: z.number().finite().nonnegative().nullable() });
const schema = z.object({ schemaVersion: z.literal(1), version: z.string().min(1), validFrom: date, checkedAt: date,
  sources: z.array(source), steelProfiles: z.array(steel), panels: z.array(panel) });
export type MaterialCatalog = z.infer<typeof schema>;
export type PanelProduct = z.infer<typeof panel>;
export type SteelProfile = z.infer<typeof steel>;

const lists = ['sources', 'steelProfiles', 'panels'] as const;

export function validateMaterialCatalog(input: unknown): { valid: boolean; errors: string[] } {
  const parsed = schema.safeParse(input);
  const errors = parsed.success ? [] : parsed.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`);
  const raw = input as Partial<MaterialCatalog> | null;
  if (raw && typeof raw === 'object') {
    for (const list of lists) {
      const items = raw[list];
      if (Array.isArray(items) && new Set(items.map(item => item?.id)).size !== items.length) errors.push(`${list}: duplicate ID`);
    }
    const sourceIds = new Set(Array.isArray(raw.sources) ? raw.sources.map(item => item?.id) : []);
    for (const item of [...(Array.isArray(raw.panels) ? raw.panels : []), ...(Array.isArray(raw.steelProfiles) ? raw.steelProfiles : [])]) {
      if (item && ((item.sourceId && !sourceIds.has(item.sourceId)) || (!item.sourceId && item.status !== 'unverified'))) errors.push(`${item.id}: sourceId`);
    }
    for (const item of Array.isArray(raw.panels) ? raw.panels : []) {
      if (!item) continue;
      if (item.minLengthMm != null && item.maxLengthMm != null && item.minLengthMm > item.maxLengthMm) errors.push(`${item.id}: minLengthMm > maxLengthMm`);
      if (item.coverWidthMm != null && item.overallWidthMm != null && item.coverWidthMm > item.overallWidthMm) errors.push(`${item.id}: coverWidthMm > overallWidthMm`);
    }
  }
  return { valid: errors.length === 0, errors };
}

export function parseMaterialCatalogJson(text: string): MaterialCatalog {
  const input: unknown = JSON.parse(text);
  const result = validateMaterialCatalog(input);
  if (!result.valid) throw new Error(result.errors.join('\n'));
  return schema.parse(input);
}

export const DEFAULT_MATERIAL_CATALOG = parseMaterialCatalogJson(JSON.stringify(defaults));

export function loadMaterialCatalog(override?: unknown): MaterialCatalog {
  if (override === undefined) return structuredClone(DEFAULT_MATERIAL_CATALOG);
  if (!override || typeof override !== 'object' || Array.isArray(override) || Object.hasOwn(override, '__proto__')) throw new Error('Neplatný materiálový katalóg.');
  if (validateMaterialCatalog(override).valid) return schema.parse(override);
  const patch = override as Record<string, unknown>;
  const merged: Record<string, unknown> = { ...DEFAULT_MATERIAL_CATALOG, ...patch };
  for (const list of lists) {
    if (patch[list] === undefined) continue;
    const items = z.array(z.object({ id }).passthrough()).parse(patch[list]);
    if (new Set(items.map(item => item.id)).size !== items.length) throw new Error(`${list}: duplicate ID`);
    const byId = new Map<string, object>(DEFAULT_MATERIAL_CATALOG[list].map(item => [item.id, item]));
    for (const item of items) {
      const previous = byId.get(item.id);
      const next = { ...previous, ...item };
      if (list !== 'sources' && previous && !Object.hasOwn(item, 'sourceId')) {
        const original = previous as Record<string, unknown>;
        const changed = Object.keys(item).some(key => key !== 'id' && (typeof original[key] === 'number' || typeof item[key] === 'number') && original[key] !== item[key]);
        if (changed) Object.assign(next, { sourceId: null, status: 'unverified' });
      }
      byId.set(item.id, next);
    }
    merged[list] = [...byId.values()];
  }
  return parseMaterialCatalogJson(JSON.stringify(merged));
}
