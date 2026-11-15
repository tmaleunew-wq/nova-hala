import defaults from '../../config/building-objects/default.json';
import type { GarageParams } from './types';
import { buildBays, type Opening } from './openingSystem';

export type BuildingObjectType = 'main_hall' | 'canopy' | 'office_annex' | 'storage_annex';
export interface BuildingObject {
  id: string; type: BuildingObjectType; name: string; parentId: string | null;
  parameters: { width: number; length: number; innerHeight: number; outerHeight: number; roofPitchDeg: number; roofColor: string; roofProductId?: string; wallColor: string; columnCount: number; columnPositions?: number[] };
  profileAssignments: { column?: string; rafter?: string; purlin?: string };
  closures: { outer: boolean; front: boolean; back: boolean };
  accessories: { gutter: boolean; downpipe: boolean };
  attachment: { side: 'left' | 'right' | 'front' | 'back'; offset: number; heightMode: 'fixed' | 'follow_parent'; heightOffset: number };
}
export type BuildingObjectPatch = Partial<Omit<BuildingObject, 'parameters' | 'attachment' | 'closures' | 'accessories' | 'profileAssignments'>> & {
  parameters?: Partial<BuildingObject['parameters']>; attachment?: Partial<BuildingObject['attachment']>; closures?: Partial<BuildingObject['closures']>; accessories?: Partial<BuildingObject['accessories']>; profileAssignments?: BuildingObject['profileAssignments'];
};
type ObjectProject = { templateId: string; params: GarageParams; buildingObjects?: BuildingObject[] };
export type BuildingObjectWarning = { objectId: string; code: string; message: string };
const degrees = (inner: number, outer: number, width: number) => Math.atan2(inner - outer, width) * 180 / Math.PI;

export function createBuildingObject(type: BuildingObjectType, parentId: string | null, patch: BuildingObjectPatch = {}): BuildingObject {
  const parameters = { ...defaults.parameters, roofPitchDeg: degrees(defaults.parameters.innerHeight, defaults.parameters.outerHeight, defaults.parameters.width), ...patch.parameters };
  if (patch.parameters?.roofPitchDeg !== undefined && patch.parameters.outerHeight === undefined) parameters.outerHeight = parameters.innerHeight - parameters.width * Math.tan(parameters.roofPitchDeg * Math.PI / 180);
  else parameters.roofPitchDeg = degrees(parameters.innerHeight, parameters.outerHeight, parameters.width);
  return { id: globalThis.crypto?.randomUUID?.() ?? `object-${Date.now()}-${Math.random().toString(36).slice(2)}`, type, name: defaults.names[type], parentId, ...patch, parameters,
    profileAssignments: { ...patch.profileAssignments }, closures: { outer: type !== 'canopy', front: type !== 'canopy', back: type !== 'canopy', ...patch.closures },
    accessories: { ...defaults.accessories, ...patch.accessories }, attachment: { ...defaults.attachment, ...patch.attachment } as BuildingObject['attachment'] };
}

/** Malformed data is rejected explicitly, never filtered out of a saved project. */
export function isBuildingObject(value: unknown): value is BuildingObject {
  const o = value as BuildingObject;
  return !!o && typeof o === 'object' && typeof o.id === 'string' && !!o.id && typeof o.name === 'string' && ['main_hall','canopy','office_annex','storage_annex'].includes(o.type)
    && (o.parentId === null || typeof o.parentId === 'string') && !!o.parameters
    && ['width','length','innerHeight','outerHeight','roofPitchDeg','columnCount'].every(k => Number.isFinite(o.parameters[k as keyof BuildingObject['parameters']]))
    && typeof o.parameters.roofColor === 'string' && typeof o.parameters.wallColor === 'string'
    && (o.parameters.roofProductId === undefined || typeof o.parameters.roofProductId === 'string')
    && (o.parameters.columnPositions === undefined || (Array.isArray(o.parameters.columnPositions) && o.parameters.columnPositions.every(Number.isFinite)))
    && !!o.profileAssignments && ['column','rafter','purlin'].every(k => o.profileAssignments[k as keyof BuildingObject['profileAssignments']] === undefined || typeof o.profileAssignments[k as keyof BuildingObject['profileAssignments']] === 'string')
    && !!o.closures && ['outer','front','back'].every(k => typeof o.closures[k as keyof BuildingObject['closures']] === 'boolean')
    && !!o.accessories && typeof o.accessories.gutter === 'boolean' && typeof o.accessories.downpipe === 'boolean'
    && !!o.attachment && ['left','right','front','back'].includes(o.attachment.side) && ['fixed','follow_parent'].includes(o.attachment.heightMode) && Number.isFinite(o.attachment.offset) && Number.isFinite(o.attachment.heightOffset);
}

export function resolveBuildingObjects(project: ObjectProject): BuildingObject[] {
  const p = project.params;
  const main = createBuildingObject('main_hall', null, { id: 'main-hall', parameters: { width:p.width, length:p.length, innerHeight:p.clearHeight, outerHeight:p.clearHeight, roofPitchDeg:p.roofPitchDeg, roofColor:p.roofColor ?? defaults.parameters.roofColor, wallColor:p.claddingColor ?? defaults.parameters.wallColor, columnCount:Math.max(2,p.bayCount)+1 } });
  main.parameters.roofPitchDeg = p.roofPitchDeg;
  if (project.buildingObjects !== undefined) {
    if (!Array.isArray(project.buildingObjects) || !project.buildingObjects.every(isBuildingObject)) throw new Error('Invalid building objects in project');
    return project.buildingObjects.map(o => o.type === 'main_hall' ? { ...o, parameters: { ...o.parameters, ...main.parameters } } : structuredClone(o));
  }
  const objects = [main], n = Math.max(2,p.bayCount), depth = p.length/n;
  const seed = (id: string, type: BuildingObjectType, side: BuildingObject['attachment']['side'], width: number, innerHeight: number, outerHeight: number, start: number, end: number) => objects.push(createBuildingObject(type,main.id,{id,parameters:{width,length:(end-start)*depth,innerHeight,outerHeight,roofColor:main.parameters.roofColor,wallColor:main.parameters.wallColor,columnCount:end-start+1},attachment:{side,offset:start*depth}}));
  if (project.templateId === 'budova_pristresok') seed('legacy-canopy-left','canopy','left',p.canopyWidth || 4.5,p.clearHeight,p.clearHeight-.9,0,n);
  if (project.templateId === 'vyrobna_hala') seed('legacy-office-right','office_annex','right',5.5,4.4,3.6,0,Math.min(3,n));
  if (project.templateId === 'budova_pristavky') { seed('legacy-storage-left','storage_annex','left',5,4.2,3.2,0,n); seed('legacy-storage-right','storage_annex','right',5,4.2,3.2,1,n-1); }
  return objects;
}

export function updateBuildingObject(objects: BuildingObject[], id: string, patch: BuildingObjectPatch): BuildingObject[] {
  return objects.map(o => {
    if (o.id !== id || o.type === 'main_hall') return o;
    const parameters = { ...o.parameters, ...patch.parameters };
    if (patch.parameters?.roofPitchDeg !== undefined) parameters.outerHeight = parameters.innerHeight - parameters.width * Math.tan(parameters.roofPitchDeg * Math.PI / 180);
    else if (patch.parameters && ['width','innerHeight','outerHeight'].some(k => k in patch.parameters!)) parameters.roofPitchDeg = degrees(parameters.innerHeight,parameters.outerHeight,parameters.width);
    return { ...o, ...patch, id:o.id, parameters, attachment:{...o.attachment,...patch.attachment}, closures:{...o.closures,...patch.closures}, accessories:{...o.accessories,...patch.accessories}, profileAssignments:{...o.profileAssignments,...patch.profileAssignments} };
  });
}

export interface BuildingObjectGeometry {
  width:number; length:number; innerHeight:number; outerHeight:number; slopeLength:number;
  roofSlopeLength:number; roofLength:number; purlinPositions:number[];
  columnPositions:number[]; origin:[number,number,number]; rotationY:number;
  toWorld:(u:number,y:number,v:number)=>[number,number,number];
}
export function getBuildingObjectGeometry(object: BuildingObject, objects: BuildingObject[], params: GarageParams, visited = new Set<string>()): BuildingObjectGeometry {
  if (visited.has(object.id)) throw new Error('Cyclic building object hierarchy');
  visited.add(object.id);
  const p = object.parameters, a = object.attachment;
  const parent = objects.find(o => o.id === object.parentId);
  const parentGeometry = parent && parent.type !== 'main_hall' ? getBuildingObjectGeometry(parent,objects,params,visited) : undefined;
  const hostW = parentGeometry?.width ?? params.width, hostL = parentGeometry?.length ?? params.length;
  const hostHeight = parentGeometry ? (a.side === 'right' ? parentGeometry.outerHeight : parentGeometry.innerHeight) : params.clearHeight;
  const innerHeight = a.heightMode === 'follow_parent' ? hostHeight + a.heightOffset : p.innerHeight;
  const outerHeight = p.outerHeight + innerHeight - p.innerHeight;
  const rotation = {right:0,left:Math.PI,front:Math.PI/2,back:-Math.PI/2}[a.side];
  const centeredOrigin: [number,number,number] = a.side === 'right' ? [hostW/2,0,-hostL/2+a.offset] : a.side === 'left' ? [-hostW/2,0,hostL/2-a.offset] : a.side === 'front' ? [-hostW/2+a.offset,0,-hostL/2] : [hostW/2-a.offset,0,hostL/2];
  const origin: [number,number,number] = parentGeometry ? parentGeometry.toWorld(centeredOrigin[0]+hostW/2,0,centeredOrigin[2]+hostL/2) : centeredOrigin;
  const rotationY = rotation + (parentGeometry?.rotationY ?? 0), cos=Math.cos(rotationY), sin=Math.sin(rotationY);
  const count = Number.isInteger(p.columnCount) && p.columnCount >= 2 && p.columnCount <= 1000 ? p.columnCount : 0;
  const columnPositions = p.columnPositions ? [...p.columnPositions] : Array.from({length:count},(_,i)=>i*p.length/(count-1));
  return { width:p.width,length:p.length,innerHeight,outerHeight,slopeLength:Math.hypot(p.width,innerHeight-outerHeight),columnPositions,origin,rotationY,roofSlopeLength:Math.hypot(p.width,innerHeight-outerHeight)+defaults.roofSlopeAllowanceM,roofLength:p.length+defaults.roofLengthAllowanceM,purlinPositions:defaults.purlinFractions.map(t=>p.width*t),
    toWorld: (u:number,y:number,v:number): [number,number,number] => [origin[0]+u*cos+v*sin,y,origin[2]-u*sin+v*cos] };
}

export function validateBuildingObjects(objects: BuildingObject[], params: GarageParams, openings: Opening[] = []): BuildingObjectWarning[] {
  const warnings: BuildingObjectWarning[] = [], seen = new Set<string>();
  const add = (o:BuildingObject,code:string,message:string) => warnings.push({objectId:o.id,code,message});
  const bounds: { object:BuildingObject; minX:number;maxX:number;minZ:number;maxZ:number }[] = [];
  for (const o of objects) {
    if (!isBuildingObject(o)) { warnings.push({objectId:(o as BuildingObject)?.id ?? 'unknown',code:'invalid',message:'Neplatné údaje objektu.'}); continue; }
    if (seen.has(o.id)) add(o,'duplicate','Duplicitné ID objektu.'); seen.add(o.id);
    if (o.type === 'main_hall') continue;
    if (!objects.some(p=>p.id===o.parentId)) add(o,'parent','Chýba nadradená budova.');
    const p=o.parameters;
    if ([p.width,p.length,p.innerHeight,p.outerHeight].some(v=>v<=0) || Math.abs(p.roofPitchDeg)>=89) add(o,'dimensions','Rozmery a výšky musia byť kladné, sklon menší ako 89°.');
    let g: ReturnType<typeof getBuildingObjectGeometry>;
    try { g=getBuildingObjectGeometry(o,objects,params); } catch { add(o,'cycle','Cyklické pripojenie objektov.'); continue; }
    if (g.innerHeight<=0 || g.outerHeight<=0) add(o,'height','Výsledná výška objektu musí byť kladná.');
    const host=objects.find(p=>p.id===o.parentId), hostLength=o.attachment.side==='left'||o.attachment.side==='right' ? (host?.type==='main_hall'?params.length:host?.parameters.length ?? params.length) : (host?.type==='main_hall'?params.width:host?.parameters.width ?? params.width);
    if (host) {
      const side=o.attachment.side;
      let availableHeight=host.type==='main_hall'?params.clearHeight:host.parameters.innerHeight;
      if(host.type==='main_hall'&&(side==='front'||side==='back')&&params.roofType!=='cubic') {
        const roofAt=(along:number)=>params.clearHeight+(params.roofType==='shed'?along:Math.min(along,params.width-along))*Math.tan(params.roofPitchDeg*Math.PI/180);
        availableHeight=Math.min(roofAt(o.attachment.offset),roofAt(o.attachment.offset+p.length));
      } else if(host.type!=='main_hall') {
        try {
          const hg=getBuildingObjectGeometry(host,objects,params);
          if(side==='right') availableHeight=hg.outerHeight;
          else if(side==='left') availableHeight=hg.innerHeight;
          else {
            const roofAt=(along:number)=>hg.innerHeight+(hg.outerHeight-hg.innerHeight)*along/hg.width;
            availableHeight=Math.min(roofAt(o.attachment.offset),roofAt(o.attachment.offset+p.length));
          }
        } catch { /* The cycle warning above already explains this object. */ }
      }
      if(g.innerHeight>availableHeight+1e-6) add(o,'parent-height','Napojenie strechy je nad dostupnou výškou steny nadradenej budovy.');
    }
    if(o.attachment.offset<0 || o.attachment.offset+p.length>hostLength+1e-6) add(o,'bounds','Prístavba presahuje dĺžku steny nadradenej budovy.');
    if(!Number.isInteger(p.columnCount)||p.columnCount<2||p.columnCount>1000||g.columnPositions.length!==p.columnCount||g.columnPositions.some((v,i)=>v<0||v>p.length||(i>0&&v<=g.columnPositions[i-1]))) add(o,'columns','Stĺpy musia mať jedinečné rastúce polohy v dĺžke objektu a zodpovedať počtu.');
    const corners=[g.toWorld(0,0,0),g.toWorld(p.width,0,0),g.toWorld(0,0,p.length),g.toWorld(p.width,0,p.length)];
    bounds.push({object:o,minX:Math.min(...corners.map(c=>c[0])),maxX:Math.max(...corners.map(c=>c[0])),minZ:Math.min(...corners.map(c=>c[2])),maxZ:Math.max(...corners.map(c=>c[2]))});
    if(host?.type==='main_hall') for(const opening of openings) {
      const bay=buildBays(params).find(b=>b.id===opening.bayId&&b.surface===o.attachment.side);
      if(!bay) continue;
      const worldCenter=(bay.surface==='left'||bay.surface==='right'?bay.position3D[2]:bay.position3D[0]);
      const start=worldCenter-bay.width/2+opening.x, end=start+opening.width;
      const first=g.toWorld(0,0,0),last=g.toWorld(0,0,p.length),axis=bay.surface==='left'||bay.surface==='right'?2:0;
      if(end>Math.min(first[axis],last[axis])&&start<Math.max(first[axis],last[axis])&&opening.y<g.innerHeight+.12&&opening.y+opening.height>g.innerHeight-.12) add(o,'opening-roof',`Strecha pretína otvor ${opening.id}.`);
    }
  }
  for(let i=0;i<bounds.length;i++) for(let j=i+1;j<bounds.length;j++) {
    const a=bounds[i],b=bounds[j];
    if(Math.min(a.maxX,b.maxX)-Math.max(a.minX,b.minX)>1e-5&&Math.min(a.maxZ,b.maxZ)-Math.max(a.minZ,b.minZ)>1e-5) { add(a.object,'overlap',`Objekt sa prekrýva s ${b.object.name}.`); add(b.object,'overlap',`Objekt sa prekrýva s ${a.object.name}.`); }
  }
  return warnings;
}
