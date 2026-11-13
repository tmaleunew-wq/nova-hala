import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildSteelReport } from './steel-report';
import { createSteelPdf } from './steel-pdf';
import { DEFAULT_PARAMS } from '../garage/types';

const project = { schemaVersion: 1 as const, id: 'AT-12', templateId: 'prazdna_hala', params: {
  ...DEFAULT_PARAMS, width: 7, length: 42, clearHeight: 4, bayCount: 7,
  roofType: 'shed' as const, roofPitchDeg: 6,
}, openings: [], materialSettings: { profileAssignments: { column: 'heb-160' } } };

test('primary groups all eight single-slope frames and keeps unknown quantities open', () => {
  const report = buildSteelReport(project, 'primary');
  assert.equal(report.frames.reduce((sum, frame) => sum + frame.count, 0), 8);
  assert.equal(report.summary.filter(item => item.role === 'rafter').reduce((sum, item) => sum + item.count, 0), 8);
  assert.ok(report.summary.some(item => item.role === 'column' && item.mass != null));
  assert.ok(report.summary.some(item => item.role === 'rafter' && item.mass === null));
  assert.ok(createSteelPdf(report).getNumberOfPages() >= 2);
});

test('secondary sums all plane lengths once and exposes a single roof', () => {
  const report = buildSteelReport(project, 'secondary');
  assert.equal(report.planes.filter(plane => plane.name.startsWith('Strecha')).length, 1);
  const length = report.planes.flatMap(plane => plane.rows).reduce((sum, row) => sum + row.length, 0);
  assert.ok(Math.abs(length - report.summary.reduce((sum, row) => sum + row.length, 0)) < 1e-7);
  assert.ok(report.summary.some(row => row.role === 'baseProfile'));
  assert.ok(createSteelPdf(report).getNumberOfPages() >= 2);
});
