import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateMaterialGeometry } from './geometry.ts';
import type { GarageParams } from '../garage/types';
import type { Opening } from '../garage/openingSystem';

const p = {width:18,length:36,clearHeight:6.5,roofPitchDeg:2,roofType:'gable',bayCount:6,profileSize:.22,hasStemWall:false,claddingOrientation:'vertical'} as GarageParams;
const options = {templateId:'skladovacia_hala',includeRenderedRoofAllowances:false, wallPanel:{coverWidthM:1,minLengthM:2,maxLengthM:4}, roofPanel:{coverWidthM:1,minLengthM:2,maxLengthM:4}};
const hole = (id:string, patch:Partial<Opening>={}):Opening => ({id,bayId:'A-1',category:'window',subtype:'fixed',x:1,y:2,width:2,height:1,frameColor:'#fff',fillColor:'#fff',...patch});
const close = (a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);

test('18x36x6.5 at 2 degrees distinguishes nominal and rendered geometry and includes both gables',()=>{
  const r=calculateMaterialGeometry(p,[],options), a=2*Math.PI/180;
  close(r.totals.nominalWallGrossM2,2*(18+36)*6.5+18*9*Math.tan(a));
  close(r.totals.nominalRoofGrossM2,18*36/Math.cos(a));
  close(r.totals.roofGrossM2,18*36/Math.cos(a));
  close(r.totals.wallGrossM2,r.totals.nominalWallGrossM2);
  close(r.totals.renderedRoofGrossM2,2*(9/Math.cos(a)+.25)*36.4);
  close(calculateMaterialGeometry(p,[],{...options,includeRenderedRoofAllowances:true}).totals.roofGrossM2,r.totals.renderedRoofGrossM2);
  assert.ok(r.surfaces.find(s=>s.id==='front')!.grossAreaM2 > 18*6.5);
  assert.equal(r.structure.filter(s=>s.role==='column').length,14);
  assert.equal(r.structure.filter(s=>s.role==='purlin').length,13);
});
test('openings add, remove and replace without stale area; overlap union and bay clipping',()=>{
  const base=calculateMaterialGeometry(p,[],options);
  const add=calculateMaterialGeometry(p,[hole('a')],options);
  close(base.totals.wallNetM2-add.totals.wallNetM2,2);
  close(calculateMaterialGeometry(p,[hole('a'),hole('b')],options).totals.wallNetM2,add.totals.wallNetM2);
  close(base.totals.wallNetM2-calculateMaterialGeometry(p,[hole('a',{width:3})],options).totals.wallNetM2,3);
  assert.deepEqual(calculateMaterialGeometry(p,[],options),base);
  const edge=calculateMaterialGeometry(p,[hole('edge',{x:-5,width:6})],options);
  close(base.totals.wallNetM2-edge.totals.wallNetM2,1);
});
test('roof bay coordinates preserve local slope width and reverse longitudinal world direction',()=>{
  const r=calculateMaterialGeometry(p,[hole('roof',{bayId:'RA-2',x:1,y:1,width:2,height:3})],options);
  close(r.totals.roofGrossM2-r.totals.roofNetM2,6);
  const opening=r.surfaces.find(s=>s.id==='roof-left')!.openings[0];
  close(opening.x,1); close(opening.y,25);
});
test('strip schedule respects production lengths and includes cut waste in either direction',()=>{
  for(const direction of ['vertical','horizontal'] as const){
    const r=calculateMaterialGeometry({...p,claddingOrientation:direction},[hole('a')],options);
    const strips=r.surfaces.flatMap(s=>s.strips);
    assert.ok(strips.length>0);
    assert.ok(strips.every(s=>s.orderLengthM>=2 && s.orderLengthM<=4));
    assert.ok(strips.every(s=>s.netAreaM2<=s.orderedAreaM2+1e-8));
    close(strips.reduce((a,s)=>a+s.netAreaM2,0),r.totals.wallNetM2+r.totals.roofNetM2);
    assert.ok(r.totals.wallOrderedM2>=r.totals.wallNetM2);
  }
});
test('assignments affect mass only and unknown mass remains null',()=>{
  const a=calculateMaterialGeometry(p,[],options);
  assert.equal(a.structure[0].massKg,null);
  const id=a.structure[0].id;
  const b=calculateMaterialGeometry(p,[],{...options,steelAssignments:{[id]:{profileId:'verified',kgPerM:10}}});
  close(b.structure[0].massKg!,65); close(b.totals.knownSteelMassKg,65);
  assert.equal(b.totals.steelMassComplete,false);
  assert.deepEqual(a.surfaces,b.surfaces);
  assert.deepEqual(a.structure.map(s=>[s.id,s.lengthM]),b.structure.map(s=>[s.id,s.lengthM]));
});
test('output is deterministic and unsupported annexes explicitly incomplete',()=>{
  assert.deepEqual(calculateMaterialGeometry(p,[hole('b'),hole('a')],options),calculateMaterialGeometry(p,[hole('a'),hole('b')],options));
  const r=calculateMaterialGeometry(p,[],{...options,templateId:'vyrobna_hala'});
  assert.equal(r.complete,false); assert.ok(r.limitations.some(x=>x.includes('prístav')));
});
