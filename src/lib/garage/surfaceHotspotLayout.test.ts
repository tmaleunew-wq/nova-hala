import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Euler, Quaternion, Vector3 } from 'three';
import { buildBays, type Opening } from './openingSystem.ts';
import { addHotspotPosition, gridBubbles, surfacePoint } from './surfaceHotspotLayout.ts';

const bays = buildBays({ width: 18, length: 54, clearHeight: 6, bayCount: 9, roofPitchDeg: 12 });
test('empty bay targets are centred and offset along the wall or roof normal', () => {
  for (const bay of bays) {
    const position = new Vector3(...addHotspotPosition(bay, [])!);
    const offset = position.sub(new Vector3(...bay.position3D));
    assert.ok(offset.distanceTo(new Vector3(...bay.normal).multiplyScalar(.07)) < 1e-10);
    const upper = new Vector3(...surfacePoint(bay, bay.width / 2, bay.height));
    const centre = new Vector3(...surfacePoint(bay, bay.width / 2, bay.height / 2));
    assert.ok(Math.abs(upper.sub(centre).dot(new Vector3(...bay.normal))) < 1e-10);
  }
});
test('add marker moves under a high window and disappears in a full bay', () => {
  const bay = bays[0];
  const window: Opening = { id:'window', bayId:bay.id, category:'window', subtype:'fixed', width:4, height:1.2, x:1, y:3, frameColor:'#fff', fillColor:'#fff' };
  const target = new Vector3(...addHotspotPosition(bay, [window])!).sub(new Vector3(...bay.position3D));
  target.applyQuaternion(new Quaternion().setFromEuler(new Euler(...bay.rotation)).invert());
  assert.ok(Math.abs(target.y + bay.height / 2 - 1.5) < 1e-10);
  assert.equal(addHotspotPosition(bay, [{...window, x:0,y:0,width:bay.width,height:bay.height}]), null);
});
test('axis markers are unique per surface and label all frame boundaries', () => {
  const bubbles = gridBubbles(bays);
  assert.deepEqual(bubbles.filter(b => b.id.startsWith('left-')).map(b => b.label), ['A','B','C','D','E','F','G','H','I','J']);
  assert.deepEqual(bubbles.filter(b => b.id.startsWith('front-')).map(b => b.label), ['1','2','3','4']);
  assert.equal(new Set(bubbles.map(b => b.id)).size, bubbles.length);
});

test('alternating template windows leave a visible add target in every side bay', () => {
  for (const side of ['left', 'right']) {
    const sideBays = bays.filter(b => b.surface === side);
    for (const [index, bay] of sideBays.entries()) {
      const windows: Opening[] = index % 2 === 0 ? [{ id: `template-${index}`, bayId: bay.id,
        category: 'window', subtype: 'fixed', width: 4.12, height: 1.12,
        x: (bay.width - 4.12) / 2, y: 3.27 - .56, frameColor: '', fillColor: '' }] : [];
      const position = addHotspotPosition(bay, windows);
      assert.ok(position, `Missing target in ${bay.id}`);
      const local = new Vector3(...position).sub(new Vector3(...bay.position3D))
        .applyQuaternion(new Quaternion().setFromEuler(new Euler(...bay.rotation)).invert());
      if (windows.length) assert.ok(local.y + bay.height / 2 + .33 < windows[0].y, `Target overlaps window in ${bay.id}`);
      else assert.ok(Math.abs(local.y) < 1e-10);
    }
  }
});
