import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calculateWallDrawings } from './wall-drawings';
import type { GarageParams } from './types';
import type { Opening } from './openingSystem';

const params = { width: 18, length: 36, clearHeight: 6.5, roofPitchDeg: 2, roofType: 'gable', bayCount: 6, profileSize: .22 } as GarageParams;
const window: Opening = { id: 'window', bayId: 'A-1', category: 'window', subtype: 'fixed', x: 1.5, y: 2, width: 1.2, height: 1, frameColor: '#fff', fillColor: '#fff' };
const project = { schemaVersion: 1 as const, templateId: 'prazdna_hala', params, openings: [window] };

test('four wall elevations use confirmed openings and dimensions in mm', () => {
  const { walls } = calculateWallDrawings(project);
  assert.equal(walls.length, 4);
  const left = walls.find(wall => wall.id === 'left')!;
  assert.equal(left.width, 36000);
  assert.deepEqual(left.axes, [0, 6000, 12000, 18000, 24000, 30000, 36000]);
  const opening = left.openings[0];
  assert.deepEqual([opening.x, opening.y, opening.width, opening.height], [1500, 2000, 1200, 1000]);
  assert.deepEqual(left.fields[0].chain.map(part => part.length), [1500, 1200, 3300]);
  assert.equal(walls.find(wall => wall.id === 'front')!.height, 6814);
});

test('moving and deleting openings updates both adjoining dimensions', () => {
  const moved = calculateWallDrawings({ ...project, openings: [{ ...window, x: 2 }] }).walls.find(wall => wall.id === 'left')!;
  assert.deepEqual(moved.fields[0].chain.map(part => part.length), [2000, 1200, 2800]);
  const removed = calculateWallDrawings({ ...project, openings: [] }).walls.find(wall => wall.id === 'left')!;
  assert.deepEqual(removed.fields[0].chain.map(part => part.length), [6000]);
  assert.deepEqual(removed.openings, []);
});

test('right and front fields follow the exterior wall projection', () => {
  const result = calculateWallDrawings({ ...project, openings: [{ ...window, bayId: 'C-1' }, { ...window, id: 'front', bayId: 'D-1' }] });
  assert.equal(result.walls.find(wall => wall.id === 'right')!.openings[0].x, 31500);
  assert.equal(result.walls.find(wall => wall.id === 'front')!.openings[0].x, 13500);
});

test('stacked openings are shown separately and share their horizontal projection', () => {
  const wall = calculateWallDrawings({ ...project, openings: [window, { ...window, id: 'upper', y: 4 }] }).walls.find(wall => wall.id === 'left')!;
  assert.equal(wall.openings.length, 2);
  assert.deepEqual(wall.fields[0].chain.map(part => part.length), [1500, 1200, 3300]);
  assert.equal(wall.fields[0].chain[1].openings.length, 2);
});

test('unsupported geometry is explained without producing a misleading elevation', () => {
  const result = calculateWallDrawings({ ...project, params: { ...params, roofType: 'shed' } });
  assert.equal(result.walls.length, 0);
  assert.ok(result.reason);
});
