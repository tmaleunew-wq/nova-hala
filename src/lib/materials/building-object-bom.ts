import { resolveBuildingObjects, getBuildingObjectGeometry, validateBuildingObjects, type BuildingObjectType } from '../garage/buildingObjects';
import { DEFAULT_MATERIAL_CATALOG, type MaterialCatalog } from './catalog';
import type { MaterialProjectInput } from './project';
export interface BuildingObjectProfileBom { role: 'column'|'rafter'|'purlin'; profileId:string; designation:string; quantity:number; totalLengthM:number; kgPerM:number|null; massKg:number|null }
export interface BuildingObjectBomRow {
  objectId:string; name:string; type:BuildingObjectType; roofAreaM2:number; roofProductId?:string; roofProductName?:string;
  roofPanelCount:number|null; roofPanelLengthM:number; roofPanelCoverWidthM:number|null; roofPanelAreaM2:number|null; roofMassKg:number|null;
  wallAreaM2:number; gutterLengthM:number; downpipeLengthM:number; profiles:BuildingObjectProfileBom[]; knownSteelMassKg:number; steelMassComplete:boolean; warnings:string[];
}
export function buildBuildingObjectBom(project: MaterialProjectInput, catalog: MaterialCatalog = DEFAULT_MATERIAL_CATALOG): BuildingObjectBomRow[] {
  const objects=resolveBuildingObjects(project), validation=validateBuildingObjects(objects,project.params,project.openings);
  return objects.filter(o=>o.type!=='main_hall').map(o=>{
    const warnings=validation.filter(w=>w.objectId===o.id).map(w=>w.message);
    let g: ReturnType<typeof getBuildingObjectGeometry>;
    try { g=getBuildingObjectGeometry(o,objects,project.params); } catch {
      return { objectId:o.id,name:o.name,type:o.type,roofAreaM2:0,roofPanelCount:null,roofPanelLengthM:0,roofPanelCoverWidthM:null,roofPanelAreaM2:null,roofMassKg:null,wallAreaM2:0,gutterLengthM:0,downpipeLengthM:0,profiles:[],knownSteelMassKg:0,steelMassComplete:false,warnings };
    }
    const roofAreaM2=g.roofSlopeLength*g.roofLength, product=catalog.panels.find(p=>p.id===o.parameters.roofProductId&&p.usage==='roof');
    const cover=product?.coverWidthMm ? product.coverWidthMm/1000 : null;
    const slopePercent=(g.innerHeight-g.outerHeight)/g.width*100;
    const validLength=!!product&&(product.minLengthMm===null||g.roofSlopeLength*1000>=product.minLengthMm)&&(product.maxLengthMm===null||g.roofSlopeLength*1000<=product.maxLengthMm);
    const validSlope=!!product&&(product.minRoofSlopePercent===null||slopePercent>=product.minRoofSlopePercent);
    const roofPanelCount=cover&&validLength&&validSlope ? Math.ceil(g.roofLength/cover) : null;
    const roofPanelAreaM2=roofPanelCount!==null&&cover!==null ? roofPanelCount*cover*g.roofSlopeLength : null;
    if(!product) warnings.push('Strešný produkt nie je priradený z katalógu; počet panelov a hmotnosť nie sú určené.');
    else {
      if(!cover) warnings.push('Katalóg neobsahuje kryciu šírku strešného panelu.');
      if((product.minLengthMm!==null&&g.roofSlopeLength*1000<product.minLengthMm)||(product.maxLengthMm!==null&&g.roofSlopeLength*1000>product.maxLengthMm)) warnings.push('Dĺžka strešného panelu je mimo výrobného rozsahu; návrh vyžaduje overenie delenia.');
      if(product.minRoofSlopePercent!==null&&slopePercent<product.minRoofSlopePercent) warnings.push('Sklon je pod minimom strešného produktu.');
    }
    const profiles:BuildingObjectProfileBom[]=[];
    let steelMassComplete=true;
    const counts={column:g.columnPositions.length,rafter:g.columnPositions.length,purlin:g.purlinPositions.length};
    const lengths={column:g.outerHeight,rafter:g.slopeLength,purlin:g.length};
    for(const role of ['column','rafter','purlin'] as const) {
      const profileId=o.profileAssignments[role],profile=catalog.steelProfiles.find(p=>p.id===profileId);
      if(!profile) { steelMassComplete=false; warnings.push(`Chýba katalógový profil: ${role}.`); profiles.push({role,profileId:profileId ?? '',designation:'Neurčený',quantity:counts[role],totalLengthM:counts[role]*lengths[role],kgPerM:null,massKg:null}); continue; }
      const quantity=counts[role],totalLengthM=quantity*lengths[role],massKg=profile.kgPerM===null?null:totalLengthM*profile.kgPerM;
      if(massKg===null) steelMassComplete=false;
      profiles.push({role,profileId:profile.id,designation:profile.designation,quantity,totalLengthM,kgPerM:profile.kgPerM,massKg});
    }
    return {objectId:o.id,name:o.name,type:o.type,roofAreaM2,roofProductId:product?.id,roofProductName:product?.name,roofPanelCount,roofPanelLengthM:g.roofSlopeLength,roofPanelCoverWidthM:cover,roofPanelAreaM2,roofMassKg:roofPanelAreaM2!==null&&product?.kgPerM2!=null?roofPanelAreaM2*product.kgPerM2:null,
      wallAreaM2:(o.closures.outer?g.length*g.outerHeight:0)+(Number(o.closures.front)+Number(o.closures.back))*g.width*(g.innerHeight+g.outerHeight)/2,
      gutterLengthM:o.accessories.gutter?g.roofLength:0,downpipeLengthM:o.accessories.downpipe?g.outerHeight:0,profiles,knownSteelMassKg:profiles.reduce((sum,p)=>sum+(p.massKg??0),0),steelMassComplete,warnings};
  });
}
