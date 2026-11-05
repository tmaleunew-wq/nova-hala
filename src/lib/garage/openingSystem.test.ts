import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Euler, Vector3 } from 'three';
import { buildBays, splitBayPanels, fitOpening, overlaps } from './openingSystem.ts';

test('rectangular subtraction retains area and leaves no wall in a gate or elevated window', () => {
  const holes = [{ x: .2, y: 0, width: 2, height: 3 }, { x: 3, y: 2, width: 2, height: 1 }];
  const pieces = splitBayPanels(6, 5, holes);
  assert.ok(Math.abs(pieces.reduce((sum, r) => sum + r.width * r.height, 0) - 22) < 1e-8);
  for (const r of pieces) for (const h of holes) {
    const area = Math.max(0, Math.min(r.x + r.width, h.x + h.width) - Math.max(r.x, h.x)) * Math.max(0, Math.min(r.y + r.height, h.y + h.height) - Math.max(r.y, h.y));
    assert.equal(area, 0);
  }
});
test('all bay rotations match outward normals including roof slopes', () => {
  const bays = buildBays({ width: 18, length: 36, clearHeight: 6, bayCount: 6, roofPitchDeg: 12 });
  assert.equal(new Set(bays.map(b => b.id)).size, bays.length);
  for (const bay of bays) {
    const normal = new Vector3(0, 0, 1).applyEuler(new Euler(...bay.rotation));
    assert.ok(normal.distanceTo(new Vector3(...bay.normal)) < 1e-10);
  }
});
test('fitting clamps oversized openings and collision detection includes clearance', () => {
  const bay = buildBays({ width: 12, length: 20, clearHeight: 5, bayCount: 4, roofPitchDeg: 10 })[0];
  const fitted = fitOpening({ id: '1', bayId: bay.id, category: 'window', subtype: 'fixed', width: 99, height: 99, x: -4, y: 88, frameColor: '#fff', fillColor: '#fff' }, bay);
  assert.ok(fitted.x >= .1 && fitted.x + fitted.width <= bay.width - .099);
  assert.ok(fitted.y >= 0 && fitted.y + fitted.height <= bay.height - .099);
  assert.ok(overlaps(fitted, fitted));
  assert.equal(overlaps({x:0,y:0,width:1,height:1},{x:2,y:0,width:1,height:1}), false);
});
