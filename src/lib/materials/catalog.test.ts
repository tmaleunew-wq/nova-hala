import { test } from 'node:test';
import assert from 'node:assert/strict';

async function api() {
  const loaded = await import('./catalog.ts').catch(() => null);
  assert.ok(loaded, 'The material catalog API must load');
  return loaded;
}

test('default catalog has traceable masses and all requested product families', async () => {
  const { loadMaterialCatalog, validateMaterialCatalog } = await api();
  const catalog = loadMaterialCatalog();
  assert.deepEqual(validateMaterialCatalog(catalog), { valid: true, errors: [] });
  assert.deepEqual(new Set(catalog.steelProfiles.map(p => p.family)), new Set(['IPE', 'HEA', 'HEB', 'UPN', 'RHS', 'SHS']));
  for (const core of ['PIR', 'PUR', 'MW']) for (const usage of ['wall', 'roof']) {
    assert.ok(catalog.panels.some(p => p.core === core && p.usage === usage));
  }
  assert.equal(catalog.steelProfiles.find(p => p.id === 'ipe-200')?.kgPerM, 22.4);
  assert.equal(catalog.panels.find(p => p.id === 'balex-pir-roof-40')?.maxLengthMm, 16000);
});

test('client config falls back by item id and field without mutating defaults', async () => {
  const { loadMaterialCatalog } = await api();
  const base = loadMaterialCatalog();
  const merged = loadMaterialCatalog({ panels: [{ id: base.panels[0].id, name: 'Klient' }] });
  assert.equal(merged.panels[0].name, 'Klient');
  assert.equal(merged.panels[0].coverWidthMm, base.panels[0].coverWidthMm);
  assert.equal(merged.panels.length, base.panels.length);
  merged.panels[0].limitations.push('local');
  assert.notDeepEqual(merged.panels[0].limitations, loadMaterialCatalog().panels[0].limitations);
});

test('explicit unknown mass stays unknown and changed numbers lose inherited verification', async () => {
  const { loadMaterialCatalog } = await api();
  const catalog = loadMaterialCatalog({ steelProfiles: [{ id: 'ipe-200', kgPerM: null }] });
  const profile = catalog.steelProfiles.find(p => p.id === 'ipe-200')!;
  assert.equal(profile.kgPerM, null);
  assert.equal(profile.status, 'unverified');
  assert.equal(profile.sourceId, null);
});

test('full imports reject duplicate ids, invalid ranges, missing sources and unsafe URLs', async () => {
  const { loadMaterialCatalog, validateMaterialCatalog, parseMaterialCatalogJson } = await api();
  const catalog = loadMaterialCatalog();
  catalog.steelProfiles.push({ ...catalog.steelProfiles[0] });
  catalog.panels[0].minLengthMm = 999999;
  catalog.panels[0].sourceId = 'missing';
  catalog.sources[0].url = 'javascript:alert(1)';
  const result = validateMaterialCatalog(catalog);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(e => e.includes('duplicate')));
  assert.ok(result.errors.some(e => e.includes('minLengthMm')));
  assert.ok(result.errors.some(e => e.includes('sourceId')));
  assert.ok(result.errors.some(e => e.includes('url')));
  assert.throws(() => parseMaterialCatalogJson(JSON.stringify(catalog)));
});

test('JSON import preserves snapshot exactly and rejects incomplete or malformed input', async () => {
  const { loadMaterialCatalog, parseMaterialCatalogJson, validateMaterialCatalog } = await api();
  const catalog = loadMaterialCatalog();
  assert.deepEqual(parseMaterialCatalogJson(JSON.stringify(catalog)), catalog);
  assert.throws(() => parseMaterialCatalogJson('{'));
  assert.throws(() => parseMaterialCatalogJson('{}'));
  for (const input of [null, [], 2, { schemaVersion: 1, panels: [null] }]) {
    assert.equal(validateMaterialCatalog(input).valid, false);
  }
});

test('partial overrides reject invalid numbers and duplicate entries before fallback', async () => {
  const { loadMaterialCatalog } = await api();
  assert.throws(() => loadMaterialCatalog({ steelProfiles: [{ id: 'ipe-200', kgPerM: -1 }] }));
  assert.throws(() => loadMaterialCatalog({ steelProfiles: [{ id: 'ipe-200' }, { id: 'ipe-200' }] }));
  assert.throws(() => loadMaterialCatalog(JSON.parse('{"__proto__":{"polluted":true}}')));
  assert.equal(({} as Record<string, unknown>).polluted, undefined);
});
