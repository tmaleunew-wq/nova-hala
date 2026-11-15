import assert from 'node:assert/strict';
import { build } from 'esbuild';
const load = async path => { const r = await build({entryPoints:[path],bundle:true,platform:'node',format:'esm',write:false}); return import(`data:text/javascript;base64,${Buffer.from(r.outputFiles[0].text).toString('base64')}`); };
const api = await load('src/lib/garage/buildingObjects.ts');
const persistence = await load('src/lib/materials/project.ts');
const p={width:18,length:36,clearHeight:7,bayCount:6,roofPitchDeg:10,roofColor:'#333',claddingColor:'#ddd'};
const legacy={templateId:'budova_pristresok',params:p};
const objects=api.resolveBuildingObjects(legacy);
assert.equal(objects.length,2);
assert.equal(objects[1].parameters.width,4.5);
assert.equal(objects[1].parameters.columnCount,7);
assert.deepEqual(api.resolveBuildingObjects({...legacy,buildingObjects:[]}),[]);
const edited=api.updateBuildingObject(objects,objects[1].id,{parameters:{width:6,roofPitchDeg:10}});
assert.equal(edited[0].parameters.width,18);
assert.ok(Math.abs(edited[1].parameters.outerHeight-(7-6*Math.tan(Math.PI/18)))<1e-10);
assert.equal(objects[1].parameters.width,4.5);
const restored=api.resolveBuildingObjects({...legacy,params:{...p,clearHeight:9},buildingObjects:edited});
assert.equal(restored[1].parameters.innerHeight,7,'fixed heights remain independent');
const follow=api.updateBuildingObject(edited,edited[1].id,{attachment:{heightMode:'follow_parent',heightOffset:-1}});
assert.equal(api.getBuildingObjectGeometry(follow[1],follow,{...p,clearHeight:9}).innerHeight,8);
for(const side of ['left','right','front','back']) {
 const o=api.createBuildingObject('canopy','main-hall',{attachment:{side},parameters:{width:3,length:5}});
 const g=api.getBuildingObjectGeometry(o,[objects[0],o],p);
 const a=g.toWorld(0,0,0), b=g.toWorld(3,0,0);
 assert.ok(Math.abs(Math.hypot(b[0]-a[0],b[2]-a[2])-3)<1e-9);
}
assert.ok(api.validateBuildingObjects(api.updateBuildingObject(objects,objects[1].id,{parameters:{columnPositions:[0,0,99]}}),p).some(x=>x.code==='columns'));
const store=new Map(); const storage={getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)};
const project=persistence.createMaterialProject({...legacy,buildingObjects:edited});
assert.equal(project.buildingObjects.length,2);
assert.ok(persistence.writeMaterialProject(project,storage));
assert.deepEqual(persistence.readMaterialProject(storage),project);
const bad={...project,buildingObjects:[{id:'broken'}]};
assert.throws(()=>persistence.createMaterialProject(bad),/object/i);
const bom=await load('src/lib/materials/building-object-bom.ts');
const rows=bom.buildBuildingObjectBom(project);
assert.equal(rows.length,1);
assert.equal(rows[0].objectId,edited[1].id);
assert.ok(rows[0].roofAreaM2>216);
assert.equal(rows[0].profiles.length,3);
assert.ok(rows[0].profiles.every(p=>p.massKg===null));
assert.equal(rows[0].roofPanelCount,null,'no fabricated catalog selection');
console.log('PASS independent building objects: migration, editing, geometry, validation, persistence and BOM');

const catalogApi=await load('src/lib/materials/catalog.ts');
const catalog=catalogApi.DEFAULT_MATERIAL_CATALOG;
const profile=catalog.steelProfiles.find(p=>p.kgPerM!==null), panel=catalog.panels.find(p=>p.usage==='roof'&&p.coverWidthMm);
const assigned=api.updateBuildingObject(edited,edited[1].id,{profileAssignments:{column:profile.id,rafter:profile.id,purlin:profile.id},parameters:{roofProductId:panel.id}});
const measured=bom.buildBuildingObjectBom({...project,buildingObjects:assigned},catalog)[0];
assert.equal(measured.roofPanelCount,Math.ceil(36.3/(panel.coverWidthMm/1000)));
assert.equal(measured.profiles.find(p=>p.role==='column').quantity,7,'host columns are not duplicated');
assert.ok(measured.steelMassComplete);
assert.equal(measured.knownSteelMassKg,measured.profiles.reduce((sum,p)=>sum+p.totalLengthM*profile.kgPerM,0));
const sibling={...assigned[1],id:'other'};
assert.ok(api.validateBuildingObjects([...assigned,sibling],p).some(w=>w.code==='overlap'));
assert.equal(api.validateBuildingObjects(assigned,p).filter(w=>w.code==='overlap').length,0,'parent wall contact is allowed');
assert.equal(api.resolveBuildingObjects({templateId:'vyrobna_hala',params:p})[1].parameters.length,18);
assert.equal(api.resolveBuildingObjects({templateId:'budova_pristavky',params:p})[2].attachment.offset,6);
assert.deepEqual(api.updateBuildingObject(assigned,'main-hall',{parameters:{width:99}})[0],assigned[0]);
console.log('PASS catalog panel/profile quantities, no shared columns, overlap warnings, legacy annex dimensions, canonical main hall');

const high=api.updateBuildingObject(assigned,assigned[1].id,{parameters:{innerHeight:20}});
assert.ok(api.validateBuildingObjects(high,p).some(w=>w.code==='parent-height'));
const savedChanged=persistence.createMaterialProject({...project,params:{...p,width:25},buildingObjects:assigned});
assert.equal(savedChanged.buildingObjects[0].parameters.width,25);
assert.equal(savedChanged.buildingObjects[1].parameters.width,assigned[1].parameters.width);
const host=api.createBuildingObject('storage_annex','main-hall',{id:'host',attachment:{side:'right'},parameters:{width:4,length:10}});
const child=api.createBuildingObject('canopy','host',{id:'child',attachment:{side:'right'},parameters:{width:2,length:6}});
const hg=api.getBuildingObjectGeometry(host,[objects[0],host,child],p),cg=api.getBuildingObjectGeometry(child,[objects[0],host,child],p);
assert.deepEqual(cg.origin,hg.toWorld(4,0,0));
const cyclic=[{...host,parentId:'child'},child];
assert.ok(api.validateBuildingObjects(cyclic,p).some(w=>w.code==='cycle'));
console.log('PASS parent envelope validation, saved canonical hall snapshot and nested attachments');

const shared=api.getBuildingObjectGeometry(assigned[1],assigned,p);
assert.equal(shared.roofSlopeLength,shared.slopeLength+.25);
assert.equal(shared.roofLength,36.3);
assert.deepEqual(shared.purlinPositions,[.25,.5,.75,1].map(t=>shared.width*t));
assert.equal(measured.roofAreaM2,shared.roofSlopeLength*shared.roofLength);
assert.equal(measured.profiles.find(p=>p.role==='purlin').quantity,shared.purlinPositions.length);
const tooShort={...catalog,panels:catalog.panels.map(x=>x.id===panel.id?{...x,maxLengthMm:1000}:x)};
const impossible=bom.buildBuildingObjectBom({...project,buildingObjects:assigned},tooShort)[0];
assert.equal(impossible.roofPanelCount,null);
assert.equal(impossible.roofPanelAreaM2,null);
assert.equal(impossible.roofMassKg,null);
const lowSlope=api.updateBuildingObject(assigned,assigned[1].id,{parameters:{roofPitchDeg:0}});
const strictSlope={...catalog,panels:catalog.panels.map(x=>x.id===panel.id?{...x,minRoofSlopePercent:5}:x)};
assert.equal(bom.buildBuildingObjectBom({...project,buildingObjects:lowSlope},strictSlope)[0].roofPanelCount,null);
console.log('PASS shared rendered roof allowances/purlins and unmanufacturable panel quantities withheld');

// --- Test deletion and duplication ---
const withBoth = [...assigned, api.createBuildingObject('canopy', assigned[0].id, { id: 'test-canopy-2', attachment: { side: 'front', offset: 0 } })];
assert.equal(withBoth.length, 3);

// Deleting main hall should be rejected (no change)
assert.equal(api.deleteBuildingObject(withBoth, 'main-hall').length, 3);

// Deleting canopy removes only that object
const afterDeleteCanopy = api.deleteBuildingObject(withBoth, 'test-canopy-2');
assert.equal(afterDeleteCanopy.length, 2);
assert.equal(afterDeleteCanopy.find(o => o.id === 'test-canopy-2'), undefined);
assert.equal(afterDeleteCanopy.find(o => o.id === assigned[1].id)?.id, assigned[1].id);

// Deleting parent object cascade-deletes its dependent children
const parentChildList = [assigned[0], host, child];
assert.equal(parentChildList.length, 3);
const afterDeleteHost = api.deleteBuildingObject(parentChildList, 'host');
assert.equal(afterDeleteHost.length, 1);
assert.equal(afterDeleteHost[0].id, 'main-hall');

// Duplicating an attachment produces unique ID and preserved parameters
const dupRes = api.duplicateBuildingObject(assigned, assigned[1].id, p);
assert.equal(dupRes.objects.length, 3);
assert.ok(dupRes.newObject);
assert.notEqual(dupRes.newObject.id, assigned[1].id);
assert.equal(dupRes.newObject.parameters.width, assigned[1].parameters.width);
assert.equal(dupRes.newObject.parameters.innerHeight, assigned[1].parameters.innerHeight);

// View settings persistence: clean 3D default & saved explicit visibility
const projectWithViewSettings = persistence.createMaterialProject({
  ...project,
  materialSettings: {
    ...project.materialSettings,
    viewSettings: { show3DDims: true, outlines: true }
  }
});
assert.equal(projectWithViewSettings.materialSettings.viewSettings.show3DDims, true);
assert.equal(projectWithViewSettings.materialSettings.viewSettings.outlines, true);
assert.ok(persistence.writeMaterialProject(projectWithViewSettings, storage));
const loadedWithView = persistence.readMaterialProject(storage);
assert.equal(loadedWithView.materialSettings.viewSettings.show3DDims, true);
console.log('PASS building object deletion, duplication, cascade removal, and viewSettings persistence');
