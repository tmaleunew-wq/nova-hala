import assert from 'node:assert/strict';
import { test } from 'node:test';
import { estimateRoofLoad } from './roof-load.ts';

const input = { widthM: 18, lengthM: 36, roofKNPerM2: 0.25, snowKNPerM2: 1, skylightAreaM2: 20, skylightNetKNPerM2: 0.15, pvCoveragePercent: 50, pvKNPerM2: 0.14, ballastKNPerM2: 0 };

test('18 × 36 m reproduces all four roof variants', () => {
  const result = estimateRoofLoad(input);
  assert.equal(result.areaM2, 648);
  assert.deepEqual(result.variants.map(variant => Math.round(variant.totalKN)), [810, 813, 855, 858]);
  assert.equal(result.pvAreaM2, 324);
  assert.ok(Math.abs(result.pvAdditionalKN - 45.36) < 1e-9);
});

test('PV ballast applies only to covered area; lighter skylights may reduce dead load', () => {
  const result = estimateRoofLoad({ ...input, ballastKNPerM2: 0.06, skylightNetKNPerM2: -0.05, snowKNPerM2: 0 });
  assert.equal(result.pvAdditionalKN, 64.8);
  assert.equal(result.variants[1].deadKN, 161);
});

test('rejects out-of-bounds inputs and recomputes after length changes', () => {
  assert.throws(() => estimateRoofLoad({ ...input, pvCoveragePercent: 101 }), RangeError);
  assert.throws(() => estimateRoofLoad({ ...input, snowKNPerM2: -1 }), RangeError);
  assert.throws(() => estimateRoofLoad({ ...input, skylightAreaM2: 649 }), RangeError);
  assert.equal(estimateRoofLoad({ ...input, lengthM: 24 }).variants[0].totalKN, 540);
});
