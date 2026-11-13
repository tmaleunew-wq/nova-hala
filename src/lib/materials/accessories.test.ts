import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateAccessories, resolveAccessoryConfig, orderRun } from './accessories';
import { calculateMaterialGeometry } from './geometry';
import type { GarageParams } from '../garage/types';
import { createMaterialProject, writeMaterialProject, readMaterialProject } from './project';
import { makeCsv, makeXlsx } from './material-export';
import type { Opening } from '../garage/openingSystem';
const p = { width:18,length:36,clearHeight:6.5,roofPitchDeg:2,roofType:'gable',bayCount:6,profileSize:.22,hasStemWall:false } as GarageParams;
const model = (openings: Opening[] = [], rendered = false) => calculateMaterialGeometry(p, openings, {includeRenderedRoofAllowances:rendered});
const hole = (patch: Partial<Opening> = {}): Opening => ({id:'window',bayId:'A-1',category:'window',subtype:'fixed',x:1,y:2,width:2,height:1,frameColor:'#fff',fillColor:'#fff',...patch});
const close = (a:number,b:number) => assert.ok(Math.abs(a-b)<1e-7, `${a} != ${b}`);
test('nominal edge geometry and independent stock ordering', () => {
  const rows=calculateAccessories(p,model()).rows;
  const sum=(kind:string)=>rows.filter(r=>r.kind===kind).reduce((s,r)=>s+r.netM,0);
  close(sum('ridge'),36);close(sum('eave'),72);close(sum('verge'),36/Math.cos(2*Math.PI/180));close(sum('corner'),26);close(sum('base'),108);
  assert.equal(rows.find(r=>r.kind==='ridge')!.pieces,13);
  assert.equal(rows.filter(r=>r.kind==='corner').reduce((s,r)=>s+r.pieces!,0),12);
  assert.ok(rows.every(r=>r.massKg===null));
});
test('rendered roof allowances follow existing geometry',()=>{
  const rows=calculateAccessories(p,model([],true)).rows;
  close(rows.find(r=>r.kind==='ridge')!.netM,36.4);
  close(rows.filter(r=>r.kind==='verge').reduce((s,r)=>s+r.netM,0),4*(9/Math.cos(2*Math.PI/180)+.25));
});
test('stock boundaries and waste separate overlaps from offcuts',()=>{
  assert.deepEqual(orderRun(5.9,3,.1),{pieces:2,orderedM:6,overlapM:.1,offcutM:0});
  assert.equal(orderRun(5.90001,3,.1).pieces,3);
  assert.equal(orderRun(3,3,.1).pieces,1);
  assert.equal(orderRun(0,3,.1).pieces,0);
  assert.throws(()=>orderRun(3,3,3));assert.throws(()=>orderRun(NaN,3,.1));
});
test('window changes perimeter, removal restores and duplicate openings do not double count',()=>{
  const base=calculateAccessories(p,model());
  const added=calculateAccessories(p,model([hole()]));
  close(added.rows.filter(r=>r.kind==='opening').reduce((s,r)=>s+r.netM,0),6);
  assert.deepEqual(calculateAccessories(p,model([hole(),hole({id:'duplicate'})])),added);
  assert.deepEqual(calculateAccessories(p,model()),base);
  const gate=calculateAccessories(p,model([hole({category:'gate',y:0,width:3,height:4})]));
  close(gate.rows.filter(r=>r.kind==='opening').reduce((s,r)=>s+r.netM,0),11);
  close(gate.rows.filter(r=>r.kind==='base').reduce((s,r)=>s+r.netM,0),105);
});
test('config fallback, explicit unknown mass, ladder and validation',()=>{
  const config=resolveAccessoryConfig({products:{ridge:{kgPerM:2}},ladder:{count:1,heightM:7,kgPerUnit:50}});
  assert.equal(config.products.ridge.stockLengthM,3);
  const rows=calculateAccessories(p,model(),config).rows;
  assert.equal(rows.find(r=>r.kind==='ridge')!.massKg,78);
  assert.equal(rows.find(r=>r.kind==='ladder')!.massKg,50);
  assert.equal(rows.find(r=>r.kind==='ladder')!.netM,7);
  assert.equal(resolveAccessoryConfig({products:{ridge:{kgPerM:null}}}).products.ridge.kgPerM,null);
  assert.throws(()=>resolveAccessoryConfig({products:{ridge:{overlapM:3}}}));
  assert.throws(()=>resolveAccessoryConfig({ladder:{count:1}}));
  assert.throws(()=>resolveAccessoryConfig({ladder:{count:-1}}));
});
test('unsupported roof does not invent edge quantities',()=>{
  const result=calculateAccessories({...p,roofType:'shed'},model());
  assert.equal(result.rows.length,0);assert.ok(result.notes.length);
});
test('manual ladder survives unsupported envelope and ridge skylight suppresses ridge trim',()=>{
  const result=calculateAccessories({...p,roofType:'shed'},model(),{ladder:{count:1,heightM:7}});
  assert.equal(result.rows.length,1);assert.equal(result.rows[0].kind,'ladder');
  const skylight=calculateMaterialGeometry(p,[],{templateId:'skladovacia_hala_svetlik'});
  assert.equal(calculateAccessories(p,skylight).rows.some(r=>r.kind==='ridge'),false);
});
test('overlapping windows have only the exterior perimeter',()=>{
  const result=calculateAccessories(p,model([hole(),hole({id:'second',x:2})]));
  close(result.rows.filter(r=>r.kind==='opening').reduce((s,r)=>s+r.netM,0),8);
});
test('accessory settings survive project storage and quantities reach export formats',()=>{
  const accessories={ladder:{count:1,heightM:7,kgPerUnit:50}};
  const project=createMaterialProject({templateId:'prazdna_hala',params:p,openings:[hole()],materialSettings:{accessories}});
  let saved='';const storage={getItem:()=>saved,setItem:(_key:string,value:string)=>{saved=value;}};
  assert.equal(writeMaterialProject(project,storage),true);
  const loaded=readMaterialProject(storage)!;
  assert.deepEqual(loaded.materialSettings?.accessories,accessories);
  assert.deepEqual(loaded.openings,project.openings);
  const result=calculateAccessories(loaded.params,model(loaded.openings),loaded.materialSettings?.accessories);
  const rows=result.rows.map(r=>[r.label,r.netM,r.pieces,r.massKg]);
  assert.ok(makeCsv(rows).includes('Rebrík'));
  assert.ok(new TextDecoder().decode(makeXlsx(rows)).includes('Rebrík'));
  const resized={...p,length:42};
  const next=calculateAccessories(resized,calculateMaterialGeometry(resized,[],{includeRenderedRoofAllowances:false}),accessories);
  close(next.rows.find(r=>r.kind==='ridge')!.netM,42);
  assert.deepEqual(next.rows.find(r=>r.kind==='ladder'),result.rows.find(r=>r.kind==='ladder'));
});
