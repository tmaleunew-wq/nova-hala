/**
 * Automated Test Suite for Universal Building Element Collision Detection & Prevention System
 * ÚLOHA 1: Univerzálny systém kontroly kolízií stavebných prvkov
 */

import {
  validateOpening,
  calculateStructuralObstacles,
  getSurfaceDimensions,
  validateHallLayout,
  repairHallOpenings,
  DEFAULT_COLLISION_RULES,
  type CollisionOpening,
  type HallGeometryDims,
} from '../src/lib/garage/collisionEngine.ts';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, details = '') {
  if (condition) {
    console.log(`✅ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${testName}: ${details}`);
    failed++;
  }
}

const geom: HallGeometryDims = {
  width: 18.0,
  length: 24.0,
  clearHeight: 6.5,
  bayCount: 4,
  roofPitchDeg: 10,
};

const boundsFront = getSurfaceDimensions('front', geom);
const obstacles = calculateStructuralObstacles(geom);

console.log('--- TEST SUITE: COLLISION DETECTION & PREVENTION ENGINE ---');

// 1. Dvere sa prekrývajú s oknom → zamietnuť.
{
  const door: CollisionOpening = {
    id: 'door-1',
    category: 'door',
    surface: 'front',
    x: 4.0,
    y: 0,
    width: 1.0,
    height: 2.1,
  };
  const overlappingWindow: CollisionOpening = {
    id: 'win-1',
    category: 'window',
    surface: 'front',
    x: 4.5, // Overlaps with door x: [4.0, 5.0]
    y: 1.5, // Overlaps with door y: [0, 2.1]
    width: 2.0,
    height: 1.2,
  };
  const result = validateOpening(door, [overlappingWindow], obstacles, boundsFront);
  assert(
    !result.valid && result.issues.some(i => i.type === 'OVERLAP' && i.conflictingElementId === 'win-1'),
    '1. Dvere sa prekrývajú s oknom → zamietnuť',
    `Expected OVERLAP error, got: ${JSON.stringify(result.issues)}`
  );
}

// 2. Dve okná sa prekrývajú → zamietnuť.
{
  const winA: CollisionOpening = {
    id: 'win-a',
    category: 'window',
    surface: 'front',
    x: 8.0,
    y: 2.5,
    width: 3.0,
    height: 1.2,
  };
  const winB: CollisionOpening = {
    id: 'win-b',
    category: 'window',
    surface: 'front',
    x: 9.5, // Overlaps horizontally with winA [8.0 .. 11.0]
    y: 2.8, // Overlaps vertically with winA [2.5 .. 3.7]
    width: 2.5,
    height: 1.2,
  };
  const result = validateOpening(winA, [winB], obstacles, boundsFront);
  assert(
    !result.valid && result.issues.some(i => i.type === 'OVERLAP'),
    '2. Dve okná sa prekrývajú → zamietnuť',
    `Expected OVERLAP error, got: ${JSON.stringify(result.issues)}`
  );
}

// 3. Brána zasahuje do dverí → zamietnuť.
{
  const gate: CollisionOpening = {
    id: 'gate-1',
    category: 'sectional',
    surface: 'front',
    x: 1.0,
    y: 0,
    width: 4.0,
    height: 4.0,
  };
  const door: CollisionOpening = {
    id: 'door-2',
    category: 'door',
    surface: 'front',
    x: 4.5, // Overlaps or violates clearance
    y: 0,
    width: 1.0,
    height: 2.1,
  };
  const result = validateOpening(gate, [door], obstacles, boundsFront);
  assert(
    !result.valid && result.issues.some(i => i.type === 'OVERLAP' || i.type === 'CLEARANCE'),
    '3. Brána zasahuje do dverí → zamietnuť',
    `Expected OVERLAP or CLEARANCE error, got: ${JSON.stringify(result.issues)}`
  );
}

// 4. Okno presahuje hranicu steny → zamietnuť.
{
  const outsideWindow: CollisionOpening = {
    id: 'win-outside',
    category: 'window',
    surface: 'front',
    x: 17.5, // 17.5 + 2.0 = 19.5m > front wall width 18.0m
    y: 2.0,
    width: 2.0,
    height: 1.2,
  };
  const result = validateOpening(outsideWindow, [], obstacles, boundsFront);
  assert(
    !result.valid && result.issues.some(i => i.type === 'BOUNDARY'),
    '4. Okno presahuje hranicu steny → zamietnuť',
    `Expected BOUNDARY error, got: ${JSON.stringify(result.issues)}`
  );
}

// 5. Otvor zasahuje do oceľového stĺpa → zamietnuť.
{
  const boundsLeft = getSurfaceDimensions('left', geom);
  const columnHitWindow: CollisionOpening = {
    id: 'win-col',
    category: 'window',
    surface: 'left',
    x: 5.5, // 5.5 to 7.5 covers the steel column at x = 6.0m
    y: 2.0,
    width: 2.0,
    height: 1.2,
  };
  const result = validateOpening(columnHitWindow, [], obstacles, boundsLeft);
  assert(
    !result.valid && result.issues.some(i => i.type === 'COLUMN'),
    '5. Otvor zasahuje do oceľového stĺpa → zamietnuť',
    `Expected COLUMN collision error, got: ${JSON.stringify(result.issues)}`
  );
}

// 6. Zmenšenie budovy vytvorí kolíziu → upozorniť a zabrániť neplatnému výsledku.
{
  const placedOpenings: CollisionOpening[] = [
    {
      id: 'win-far',
      category: 'window',
      surface: 'front',
      x: 15.0, // Fits on 18m wall
      y: 2.0,
      width: 2.0,
      height: 1.2,
    },
  ];
  const initialValidation = validateHallLayout(geom, placedOpenings);
  assert(initialValidation.valid, '6a. Pôvodná geometria haly je platná');

  // Shrink building width from 18m to 14m -> win-far at x=15m now exceeds 14m!
  const shrunkenGeom: HallGeometryDims = { ...geom, width: 14.0 };
  const shrunkenValidation = validateHallLayout(shrunkenGeom, placedOpenings);
  assert(
    !shrunkenValidation.valid && shrunkenValidation.issues.some(i => i.type === 'BOUNDARY'),
    '6. Zmenšenie budovy vytvorí kolíziu → upozorniť a zabrániť neplatnému výsledku',
    `Expected boundary issue on shrink, got: ${JSON.stringify(shrunkenValidation.issues)}`
  );
}

// 7. Dvere a okno majú dostatočný odstup → povoliť.
{
  const door: CollisionOpening = {
    id: 'door-clear',
    category: 'door',
    surface: 'front',
    x: 1.0,
    y: 0,
    width: 1.0,
    height: 2.1,
  };
  const windowClear: CollisionOpening = {
    id: 'win-clear',
    category: 'window',
    surface: 'front',
    x: 2.5, // Gap is 2.5 - (1.0 + 1.0) = 0.5m > min 0.15m!
    y: 1.5,
    width: 2.0,
    height: 1.2,
  };
  const resultDoor = validateOpening(door, [windowClear], obstacles, boundsFront);
  const resultWin = validateOpening(windowClear, [door], obstacles, boundsFront);
  assert(
    resultDoor.valid && resultWin.valid,
    '7. Dvere a okno majú dostatočný odstup → povoliť',
    `Expected valid, door: ${JSON.stringify(resultDoor.issues)}, win: ${JSON.stringify(resultWin.issues)}`
  );
}

// 8. Dve okná sú nad sebou bez prekrývania a spĺňajú odstupy → povoliť.
{
  const winLower: CollisionOpening = {
    id: 'win-1np',
    category: 'window',
    surface: 'front',
    x: 7.0,
    y: 1.5, // 1.5 to 2.7m
    width: 3.0,
    height: 1.2,
  };
  const winUpper: CollisionOpening = {
    id: 'win-2np',
    category: 'window',
    surface: 'front',
    x: 7.0,
    y: 3.5, // 3.5 to 4.7m -> vertical spandrel is 3.5 - 2.7 = 0.8m > min 0.15m!
    width: 3.0,
    height: 1.2,
  };
  const resultLower = validateOpening(winLower, [winUpper], obstacles, boundsFront);
  const resultUpper = validateOpening(winUpper, [winLower], obstacles, boundsFront);
  assert(
    resultLower.valid && resultUpper.valid,
    '8. Dve okná sú nad sebou bez prekrývania a spĺňajú odstupy → povoliť',
    `Expected valid, lower: ${JSON.stringify(resultLower.issues)}, upper: ${JSON.stringify(resultUpper.issues)}`
  );
}

// 9. Uložený projekt obsahuje starú chybnú konfiguráciu → identifikovať a ponúknuť opravu.
{
  const corruptLegacyProject: CollisionOpening[] = [
    {
      id: 'legacy-door',
      category: 'door',
      surface: 'front',
      x: 3.0,
      y: 0,
      width: 1.0,
      height: 2.1,
    },
    {
      id: 'legacy-win',
      category: 'window',
      surface: 'front',
      x: 3.5, // Collides with door
      y: 1.0,
      width: 2.0,
      height: 1.2,
    },
  ];
  // 1. Identification:
  const detectCorrupt = validateHallLayout(geom, corruptLegacyProject);
  assert(
    !detectCorrupt.valid,
    '9a. Identifikácia starej chybnej konfigurácie z uloženého projektu'
  );

  // 2. Offer & execute repair:
  const repairResult = repairHallOpenings(geom, corruptLegacyProject);
  const recheckRepaired = validateHallLayout(geom, repairResult.repairedOpenings);
  assert(
    repairResult.modifiedCount > 0 && recheckRepaired.valid,
    '9. Uložený projekt obsahuje starú chybnú konfiguráciu → identifikovať a ponúknuť opravu',
    `Expected auto-repair to fix collisions, modified: ${repairResult.modifiedCount}, valid after repair: ${recheckRepaired.valid}`
  );
}

console.log(`\nTEST SUMMARY: ${passed} passed, ${failed} failed.`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('ALL 9 MANDATORY COLLISION ENGINE TESTS PASSED SUCCESSFULLY! 🎉');
}
