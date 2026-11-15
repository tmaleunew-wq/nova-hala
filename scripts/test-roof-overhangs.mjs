import assert from 'node:assert/strict';
import { build } from 'esbuild';

const load = async path => {
  const r = await build({
    entryPoints: [path],
    bundle: true,
    platform: 'node',
    format: 'esm',
    write: false,
  });
  return import(`data:text/javascript;base64,${Buffer.from(r.outputFiles[0].text).toString('base64')}`);
};

const roofApi = await load('src/lib/garage/roofOverhangs.ts');
const bomApi = await load('src/lib/garage/bomCalculator.ts');
const geomApi = await load('src/lib/materials/geometry.ts');
const projectApi = await load('src/lib/materials/project.ts');

const baseParams = {
  width: 16,
  length: 30,
  clearHeight: 6,
  bayCount: 5,
  roofType: 'gable',
  roofPitchDeg: 10,
  roofColor: '#2b2f36',
  claddingColor: '#ffffff',
  profileSize: 0.22,
  profileThickness: 0.008,
  hasStemWall: true,
  stemWallHeight: 0.27,
  hasPersonalDoor: true,
  doorWidth: 2.5,
  doorHeight: 2.2,
};

// Test values: 0m, 0.3m, 0.5m, 1.0m
const testValues = [0, 0.3, 0.5, 1.0];
let prevArea = 0;
let prevFlashing = 0;

for (const ov of testValues) {
  const params = {
    ...baseParams,
    roofOverhangFront: ov,
    roofOverhangBack: ov,
    roofOverhangLeft: ov,
    roofOverhangRight: ov,
  };

  // 1. Geometria strechy
  const geom = roofApi.calculateRoofGeometry(params);
  const expectedLength = 30 + 2 * ov;
  assert.equal(geom.effLength, expectedLength, `Dĺžka strechy pri presahu ${ov}m musí byť ${expectedLength}m`);

  const cosPitch = Math.cos((10 * Math.PI) / 180);
  const expectedSlopeLen = (8 + ov) / cosPitch;
  assert.ok(Math.abs(geom.leftSlopeLen - expectedSlopeLen) < 1e-6, `Dĺžka spádu vľavo nesedí pri ${ov}m`);
  assert.ok(Math.abs(geom.rightSlopeLen - expectedSlopeLen) < 1e-6, `Dĺžka spádu vpravo nesedí pri ${ov}m`);

  const expectedArea = 2 * expectedSlopeLen * expectedLength;
  assert.ok(Math.abs(geom.totalRoofAreaM2 - expectedArea) < 1e-6, `Plocha strechy nesedí pri ${ov}m`);

  // 2. Nemennosť rozmerov hlavnej haly
  assert.equal(params.width, 16, 'Šírka nosných stien haly sa nesmie zmeniť');
  assert.equal(params.length, 30, 'Dĺžka nosných stien haly sa nesmie zmeniť');
  assert.equal(params.clearHeight, 6, 'Výška haly v odkvape sa nesmie zmeniť');

  // 3. BOM / Materiálový výkaz
  const bom = bomApi.calculateGarageBom(params);
  assert.ok(bom.totalRoofAreaM2 >= prevArea, 'Plocha v BOM musí rásť s presahom');
  const roofPanelsItem = bom.items.find(i => i.id === 'roof_panels');
  assert.ok(roofPanelsItem, 'Položka roof_panels musí existovať');
  assert.equal(roofPanelsItem.quantity, bom.totalRoofAreaM2, 'Výkaz panelov musí zodpovedať ploche strechy');

  const flashingsItem = bom.items.find(i => i.id === 'flashings');
  assert.ok(flashingsItem, 'Položka flashings musí existovať');
  assert.ok(flashingsItem.quantity >= prevFlashing, 'Klampiarske prvky musia rásť s presahom');

  prevArea = bom.totalRoofAreaM2;
  prevFlashing = flashingsItem.quantity;

  // 4. Overenie statického varovania nad 0.5m
  const warnings = roofApi.validateRoofOverhangs(params);
  if (ov > 0.5) {
    assert.ok(warnings.some(w => w.code === 'cantilever'), `Pri presahu ${ov}m musí byť zobrazené statické varovanie`);
  } else {
    assert.equal(warnings.filter(w => w.code === 'cantilever').length, 0, `Pri presahu ${ov}m nesmie byť statické varovanie`);
  }

  // 5. Uloženie a opätovné načítanie projektu
  const store = new Map();
  const mockStorage = { getItem: k => store.get(k), setItem: (k, v) => store.set(k, v) };
  const project = projectApi.createMaterialProject({
    templateId: 'vyrobna_hala',
    params,
  });
  assert.equal(project.params.roofOverhangFront, ov);
  assert.equal(project.params.roofOverhangRight, ov);
  assert.ok(projectApi.writeMaterialProject(project, mockStorage));
  const restored = projectApi.readMaterialProject(mockStorage);
  assert.equal(restored.params.roofOverhangFront, ov, 'Presah front sa musí obnoviť z pamäte');
  assert.equal(restored.params.roofOverhangRight, ov, 'Presah right sa musí obnoviť z pamäte');
}

// 6. Overenie kolízie s prístreškom (Requirement 7)
const canopyObj = {
  id: 'canopy-1',
  type: 'canopy',
  name: 'Prístrešok',
  attachment: { side: 'right', offset: 0, heightMode: 'fixed', heightOffset: 0 },
};
const paramsWithCanopyCollision = {
  ...baseParams,
  roofOverhangRight: 0.3,
};
const collisionWarnings = roofApi.validateRoofOverhangs(paramsWithCanopyCollision, [canopyObj]);
assert.ok(collisionWarnings.some(w => w.code === 'canopy_collision'), 'Musí detekovať kolíziu presahu s prístreškom na pravej strane');

// 7. Overenie pultovej strechy (Requirement 6)
const shedGeom = roofApi.calculateRoofGeometry({
  ...baseParams,
  roofType: 'shed',
  roofOverhangFront: 0.4,
  roofOverhangBack: 0.4,
  roofOverhangLeft: 0.3,
  roofOverhangRight: 0.5,
});
assert.equal(shedGeom.isShed, true);
assert.ok(Math.abs(shedGeom.effLength - 30.8) < 1e-6);
const shedCos = Math.cos((10 * Math.PI) / 180);
assert.ok(Math.abs(shedGeom.shedSlopeLen - (16 + 0.8) / shedCos) < 1e-6);

console.log('VŠETKY TESTY PRESAHU STRECHY ÚSPEŠNE PREŠLI (0m, 0.3m, 0.5m, 1m, kolízie, BOM, statika a perzistencia)');
