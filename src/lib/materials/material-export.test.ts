import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeCsv, makeXlsx } from './material-export.ts';

test('CSV preserves quotes, Unicode and neutralizes spreadsheet formulas', () => {
  const csv = makeCsv([['Oceľ', 'a"b', '=1+1', 3.5, null]]);
  assert.ok(csv.includes('"a""b"'));
  assert.ok(csv.includes("'\\=1+1".replace('\\', '')));
  assert.ok(csv.startsWith('\uFEFF'));
});

test('XLSX is an OOXML ZIP containing typed values and escaped text', () => {
  const data = makeXlsx([['Oceľ & <profil>', 15.8, null]]);
  assert.equal(new DataView(data.buffer).getUint32(0, true), 0x04034b50);
  const text = new TextDecoder().decode(data);
  assert.ok(text.includes('[Content_Types].xml'));
  assert.ok(text.includes('xl/worksheets/sheet1.xml'));
  assert.ok(text.includes('Oceľ &amp; &lt;profil&gt;'));
  assert.ok(text.includes('<v>15.8</v>'));
});
