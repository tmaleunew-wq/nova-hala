import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateMaterialGeometry } from './geometry';
import { buildCladdingReport } from './cladding-report';
import { createCladdingPdf } from './cladding-pdf';
import { loadMaterialCatalog } from './catalog';
import type { GarageParams } from '../garage/types';
import type { Opening } from '../garage/openingSystem';

const params = { width: 6, length: 10, clearHeight: 4, bayCount: 2, roofType: 'gable',
  roofPitchDeg: 12, claddingColor: '#4a3728', roofColor: '#000000', hasStemWall: true,
  stemWallHeight: 0.3, stemWallThickness: 0.22 } as GarageParams;
const openings: Opening[] = [{ id: 'gate', bayId: 'D-1', category: 'gate', subtype: 'test',
  x: 2, y: 0, width: 2, height: 2, frameColor: '', fillColor: '' }];
const spec = { productId: 'wall-test', coverWidthM: 1, minLengthM: 1, maxLengthM: 12 };
const model = calculateMaterialGeometry(params, openings, { wallPanel: spec, roofPanel: { ...spec, productId: 'roof-test' } });
const catalog = loadMaterialCatalog({ panels: [
  { ...loadMaterialCatalog().panels.find(panel => panel.usage === 'wall')!, id: 'wall-test', unitPricePerM2Eur: 10 },
  { ...loadMaterialCatalog().panels.find(panel => panel.usage === 'roof')!, id: 'roof-test', unitPricePerM2Eur: null },
], stemWallUnitPricePerM3Eur: 50 });
const report = () => buildCladdingReport({ schemaVersion: 1, templateId: 'prazdna_hala', name: 'Skúška', params },
  model, openings, catalog);

test('reconciles groups, counts, areas, colors and known prices with the geometry', () => {
  const data = report();
  assert.equal(data.faces.length, 6);
  assert.equal(data.panels.reduce((sum, panel) => sum + panel.count, 0),
    model.surfaces.flatMap(surface => surface.strips).length);
  assert.ok(data.panels.some(panel => panel.color === 'RAL 8017' && panel.count > 1));
  assert.ok(data.panels.some(panel => panel.color === 'RAL 9005' && panel.price === null));
  const wall = data.panels.find(panel => panel.color === 'RAL 8017')!;
  assert.equal(wall.price, wall.area * 10);
  assert.equal(data.faces.find(face => face.id === 'front')?.stem?.length, 4);
  assert.equal(data.openings[0].faceId, 'front');
});

test('unselected products export configured cladding with an explicitly estimated schedule', () => {
  const data = buildCladdingReport({ schemaVersion: 1, templateId: 'prazdna_hala', params },
    calculateMaterialGeometry(params, openings), openings, catalog);
  assert.ok(data.panels.length > 0);
  assert.ok(data.faces.every(face => face.panels.length > 0 && face.ordered! > 0));
  assert.ok(data.panels.every(panel => panel.product.includes('orientačný') && panel.price === null));
  assert.ok(data.notes.some(note => note.includes('krycia šírka 1 m')));
  assert.ok(createCladdingPdf(data).getNumberOfPages() >= 7);
});
test('a single-slope hall has one roof schedule and asymmetric gables', () => {
  const shedParams = { ...params, roofType: 'shed' as const };
  const shed = calculateMaterialGeometry(shedParams, openings, { claddingReportEnvelope: true,
    wallPanel: spec, roofPanel: { ...spec, productId: 'roof-test' } });
  const data = buildCladdingReport({ schemaVersion: 1, templateId: 'prazdna_hala', params: shedParams },
    shed, openings, catalog);
  assert.equal(data.faces.filter(face => face.roof).length, 1);
  assert.ok(data.faces.find(face => face.id === 'right')!.gross > data.faces.find(face => face.id === 'left')!.gross);
  assert.ok(data.faces.find(face => face.roof)!.panels.length > 0);
});

test('explicit unavailable products are not silently replaced by estimated materials', () => {
  const data = buildCladdingReport({ schemaVersion: 1, templateId: 'prazdna_hala', params,
    materialSettings: { wallProductId: 'missing-wall', roofProductId: 'missing-roof' } },
    calculateMaterialGeometry(params, openings), openings, catalog);
  assert.equal(data.panels.length, 0);
  assert.equal(data.faces[0].ordered, null);
});

test('estimate respects client cover width, configured material, openings and input isolation', () => {
  const configured = { ...params, panelType: 'sandwich' as const, roofPanelType: 'sandwich' as const,
    insulationCore: 'PUR' as const, wallPanelThicknessMm: 100, roofPanelThicknessMm: 120 };
  const original = calculateMaterialGeometry(configured, openings);
  const make = (coverWidthM: number) => buildCladdingReport({ schemaVersion: 1, templateId: 'prazdna_hala', params: configured },
    original, openings, loadMaterialCatalog({claddingEstimate:{coverWidthM,minLengthM:.01,maxLengthM:12}}));
  const a=make(1), b=make(.5);
  assert.ok(a.panels.some(panel => panel.product.includes('PUR 100 mm')));
  assert.ok(a.panels.some(panel => panel.product.includes('PUR 120 mm')));
  assert.ok(b.panels.reduce((s,p)=>s+p.count,0)>a.panels.reduce((s,p)=>s+p.count,0));
  assert.ok(a.faces.some(face => face.holes > 0));
  assert.ok(original.surfaces.every(face => face.strips.length === 0));
});
