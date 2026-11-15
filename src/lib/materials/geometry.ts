import type { GarageParams } from '../garage/types';
import { buildBays, type Opening, type V3, type Rect } from '../garage/openingSystem';

/** Versioned adapter of NewHallStandalone3D main-envelope / main-portal formulas.
 * View toggles deliberately do not change the bill of materials. Units: metres, m², kg.
 * Canonical openings are supplied by the caller; this module never adds template defaults.
 */
export type StructuralRole = 'column' | 'rafter' | 'eaveHaunch' | 'ridgeHaunch' | 'gableColumn' | 'centerColumn' | 'centerHaunch' | 'purlin' | 'girt' | 'wallBracing' | 'roofBracing';
export interface SteelAssignment { profileId: string; kgPerM: number | null }
export interface PanelLayoutSpec { productId?: string; coverWidthM: number; minLengthM: number; maxLengthM: number; kgPerM2?: number | null }
export interface MaterialGeometryOptions {
  templateId?: string;
  /** Defaults to renderer roof dimensions; false explicitly requests the nominal envelope. */
  includeRenderedRoofAllowances?: boolean;
  claddingReportEnvelope?: boolean;
  wallPanel?: PanelLayoutSpec;
  roofPanel?: PanelLayoutSpec;
  /** An element ID overrides its role's default assignment. No implied profile from mesh size. */
  steelAssignments?: Readonly<Record<string, SteelAssignment | undefined>>;
}
export type Point2 = [number, number];
export interface PanelStrip {
  id: string; surfaceId: string; productId: string | null; orientation: 'vertical' | 'horizontal';
  x: number; y: number; widthM: number; lengthM: number; orderLengthM: number;
  netAreaM2: number; orderedAreaM2: number; wasteAreaM2: number; massKg: number | null;
  hasCutouts: boolean; edgeCut: boolean;
}
export interface MaterialSurface {
  id: string; kind: 'wall' | 'roof'; polygon: Point2[]; openings: Rect[];
  grossAreaM2: number; openingAreaM2: number; netAreaM2: number;
  strips: PanelStrip[];
}
export interface StructuralElement {
  id: string; role: StructuralRole; from: V3; to: V3; lengthM: number;
  renderedSizeM: number; profileId: string | null; kgPerM: number | null; massKg: number | null;
}
export interface MaterialGeometry {
  adapterVersion: 'standalone-main-v1'; complete: boolean; limitations: string[];
  surfaces: MaterialSurface[]; structure: StructuralElement[];
  totals: {
    nominalWallGrossM2: number; nominalRoofGrossM2: number;
    renderedRoofGrossM2: number; roofAllowanceM2: number;
    wallGrossM2: number; wallNetM2: number; roofGrossM2: number; roofNetM2: number;
    wallOrderedM2: number; roofOrderedM2: number; knownSteelMassKg: number; steelMassComplete: boolean;
  };
}
const EPS = 1e-9;
const area = (poly: Point2[]) => Math.abs(poly.reduce((a, p, i) => {
  const q = poly[(i + 1) % poly.length]; return a + p[0] * q[1] - q[0] * p[1];
}, 0)) / 2;
const rectPoly = (x: number, y: number, width: number, height: number): Point2[] => [[x,y],[x+width,y],[x+width,y+height],[x,y+height]];

/** Sutherland–Hodgman clipping against one axis-aligned half-plane. */
function clip(poly: Point2[], axis: 0 | 1, value: number, greater: boolean): Point2[] {
  const out: Point2[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const insideA = greater ? a[axis] >= value : a[axis] <= value;
    const insideB = greater ? b[axis] >= value : b[axis] <= value;
    if (insideA) out.push(a);
    if (insideA !== insideB) {
      const t = (value - a[axis]) / (b[axis] - a[axis]);
      out.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]);
    }
  }
  return out;
}
function clipRect(poly: Point2[], r: Rect): Point2[] {
  return clip(clip(clip(clip(poly,0,r.x,true),0,r.x+r.width,false),1,r.y,true),1,r.y+r.height,false);
}
/** Each subtraction produces disjoint convex pieces, so overlapping openings count once. */
function subtract(poly: Point2[], r: Rect): Point2[][] {
  if (area(clipRect(poly,r)) <= EPS) return [poly];
  const out: Point2[][] = [];
  let remainder = poly;
  for (const [axis, value, greater] of [[0,r.x,true],[0,r.x+r.width,false],[1,r.y,true],[1,r.y+r.height,false]] as [0|1,number,boolean][]) {
    const outside = clip(remainder,axis,value,!greater);
    if (area(outside)>EPS) out.push(outside);
    remainder = clip(remainder,axis,value,greater);
  }
  return out;
}
function validSpec(s?: PanelLayoutSpec): s is PanelLayoutSpec {
  return !!s && [s.coverWidthM,s.minLengthM,s.maxLengthM].every(v=>Number.isFinite(v)&&v>0) && s.minLengthM<=s.maxLengthM;
}
function layout(surface: MaterialSurface, pieces: Point2[][], spec: PanelLayoutSpec, orientation: 'vertical'|'horizontal'): PanelStrip[] {
  // Cross axis is cover width; run axis is production length. Horizontal swaps X/Y.
  const cross: 0|1 = orientation==='vertical' ? 0 : 1, run: 0|1 = cross===0 ? 1 : 0;
  const low = Math.min(...surface.polygon.map(p=>p[cross])), high = Math.max(...surface.polygon.map(p=>p[cross]));
  const count = Math.ceil((high-low)/spec.coverWidthM-EPS);
  if (count > 10000) throw new RangeError('Príliš veľa panelových pásov.');
  const result: PanelStrip[]=[];
  for(let row=0;row<count;row++) {
    const c0=low+row*spec.coverWidthM, c1=Math.min(high,c0+spec.coverWidthM);
    const stripPieces=pieces.map(poly=>clip(clip(poly,cross,c0,true),cross,c1,false)).filter(poly=>area(poly)>EPS);
    const intervals=stripPieces.map(poly=>[Math.min(...poly.map(p=>p[run])),Math.max(...poly.map(p=>p[run]))]).sort((a,b)=>a[0]-b[0]);
    const merged:number[][]=[];
    for(const interval of intervals) {
      const last=merged[merged.length-1];
      if(last && interval[0]<=last[1]+EPS) last[1]=Math.max(last[1],interval[1]); else merged.push([...interval]);
    }
    let segment=0;
    for(const [r0,r1] of merged) {
      const parts=Math.ceil((r1-r0)/spec.maxLengthM-EPS);
      if(parts>10000) throw new RangeError('Príliš veľa dielov panela.');
      // Equal subdivisions avoid a tiny final remainder where manufacturing permits it.
      const length=(r1-r0)/parts;
      for(let part=0;part<parts;part++) {
        const a=r0+part*length,b=a+length;
        const net=stripPieces.reduce((sum,poly)=>sum+area(clip(clip(poly,run,a,true),run,b,false)),0);
        if(net<=EPS) continue;
        const orderLength=Math.max(spec.minLengthM,length), ordered=orderLength*spec.coverWidthM;
        const x=cross===0?c0:a,y=cross===0?a:c0;
        result.push({id:`${surface.id}:strip:${row}:${segment++}`,surfaceId:surface.id,productId:spec.productId??null,orientation,x,y,widthM:c1-c0,lengthM:length,orderLengthM:orderLength,netAreaM2:net,orderedAreaM2:ordered,wasteAreaM2:Math.max(0,ordered-net),massKg:typeof spec.kgPerM2==='number'&&Number.isFinite(spec.kgPerM2)&&spec.kgPerM2>=0?ordered*spec.kgPerM2:null,hasCutouts:net<(c1-c0)*length-EPS,edgeCut:c1-c0<spec.coverWidthM-EPS});
      }
    }
  }
  return result;
}

export function calculateMaterialGeometry(p: GarageParams, openings: readonly Opening[], options: MaterialGeometryOptions = {}): MaterialGeometry {
  const W=p.width,L=p.length,H=p.clearHeight,a=p.roofPitchDeg*Math.PI/180;
  const limitations:string[]=[];
  const result:MaterialGeometry={adapterVersion:'standalone-main-v1',complete:false,limitations,surfaces:[],structure:[],totals:{nominalWallGrossM2:0,nominalRoofGrossM2:0,renderedRoofGrossM2:0,roofAllowanceM2:0,wallGrossM2:0,wallNetM2:0,roofGrossM2:0,roofNetM2:0,wallOrderedM2:0,roofOrderedM2:0,knownSteelMassKg:0,steelMassComplete:false}};
  if(![W,L,H].every(v=>Number.isFinite(v)&&v>0)||!Number.isFinite(a)||a<0||a>=Math.PI/2||!Number.isInteger(p.bayCount)||p.bayCount<1||p.bayCount>1000) {
    limitations.push('Neplatné rozmery, sklon alebo počet polí.'); return result;
  }
  const n=Math.max(2,p.bayCount), depth=L/n, halfW=W/2, halfL=L/2, ridge=H+halfW*Math.tan(a);
  const overF = p.roofOverhangFront ?? 0, overB = p.roofOverhangBack ?? 0;
  const overL = p.roofOverhangLeft ?? 0, overR = p.roofOverhangRight ?? 0;
  const effL = L + overF + overB;
  const leftSlope = (halfW + overL) / Math.cos(a);
  const rightSlope = (halfW + overR) / Math.cos(a);
  const slope = halfW / Math.cos(a);
  const col=p.profileSize||.22, stem=p.hasStemWall===true?(p.stemWallHeight??.27):0;
  if(!Number.isFinite(col)||col<=0||col>=Math.min(W,depth)||!Number.isFinite(stem)||stem<0||stem>=H) {
    limitations.push('Profil alebo sokel presahuje geometriu obálky.'); return result;
  }
  result.totals.nominalWallGrossM2=2*(W+L)*H+W*(ridge-H);
  result.totals.nominalRoofGrossM2=(leftSlope + rightSlope)*effL;
  result.totals.renderedRoofGrossM2=(leftSlope + .25 + rightSlope + .25)*(effL + .4)/2;
  result.totals.roofAllowanceM2=result.totals.renderedRoofGrossM2-result.totals.nominalRoofGrossM2;
  const template=options.templateId??'prazdna_hala';
  const unsupported=['vyrobna_hala','kancelarska_budova','budova_pristresok','budova_pristavky','nakreslit_pudorys'];
  if(unsupported.includes(template)||p.hasExtension||p.hasOfficeAnnex||p.hasCanopy||p.hasDualExtensions||p.isLShape) limitations.push('Neúplná geometria: prístavby, kancelárske medziposchodie a vedľajšie krídla zatiaľ nie sú zahrnuté.');
  if(['skladovacia_hala_svetlik','budova_pristresok','dvojlodna_hala'].includes(template)||p.hasRidgeSkylight) limitations.push('Neúplná geometria: pásové hrebeňové svetlíky a ich nosníky nie sú zahrnuté.');
  if(p.roofType!=='gable'||p.twinRoof||p.hasAttic||p.wallMode==='open'||p.wallMode==='plinth') limitations.push('Neúplná geometria: adaptér podporuje spoločnú sedlovú obálku; odlišný typ strechy alebo stien vyžaduje samostatný adaptér.');
  if(!validSpec(options.wallPanel)) limitations.push('Výrobný rozpis stien chýba: vyberte panel s overenou krycou šírkou a minimálnou/maximálnou výrobnou dĺžkou.');
  if(!validSpec(options.roofPanel)) limitations.push('Výrobný rozpis strechy chýba: vyberte panel s overenou krycou šírkou a minimálnou/maximálnou výrobnou dĺžkou.');
  const surfaces=result.surfaces;
  const shed = options.claddingReportEnvelope && p.roofType === 'shed' && !p.twinRoof && !p.hasAttic;
  const high = H + W * Math.tan(a);
  if (shed && !['open', 'plinth'].includes(p.wallMode ?? '')) {
    const index = limitations.findIndex(note => note.startsWith('Neúplná geometria: adaptér'));
    if (index >= 0) limitations.splice(index, 1);
  }
  const addSurface=(id:string,kind:'wall'|'roof',polygon:Point2[])=>surfaces.push({id,kind,polygon,openings:[],grossAreaM2:area(polygon),openingAreaM2:0,netAreaM2:0,strips:[]});
  // Column insets and the renderer's .08 Z-fighting offsets are visual, not material deductions.
  // Bay subdivisions remain physical panel end joints while preserving the full wall area.
  for(let i=0;i<n;i++) for(const side of ['left','right']) addSurface(`${side}:${i+1}`,'wall',rectPoly(i*depth,stem,depth,H-stem));
  for(const side of ['front','back']) addSurface(side,'wall',[[0,stem],[W,stem],[W,H],[halfW,ridge],[0,H]]);
  const roofExtra=options.includeRenderedRoofAllowances!==false?.25:0, endExtra=options.includeRenderedRoofAllowances!==false?.4:0;
  addSurface('roof-left','roof',rectPoly(0,0,leftSlope+roofExtra,effL+endExtra));
  addSurface('roof-right','roof',rectPoly(0,0,rightSlope+roofExtra,effL+endExtra));
  const bays=buildBays(p), byBay=new Map(bays.map(b=>[b.id,b]));
  if (shed) {
    for (const surface of surfaces) {
      if (surface.id.startsWith('right:')) surface.polygon = surface.polygon.map(([x, y]) => [x, y === H ? high : y]);
      if (surface.id === 'front') surface.polygon = [[0,stem],[W,stem],[W,H],[0,high]];
      if (surface.id === 'back') surface.polygon = [[0,stem],[W,stem],[W,high],[0,H]];
      surface.grossAreaM2 = area(surface.polygon);
    }
    surfaces.splice(surfaces.findIndex(surface => surface.id === 'roof-left'), 2);
    addSurface('roof-left', 'roof', rectPoly(0, 0, 2 * slope + 2 * roofExtra, L + endExtra));
  }
  for(const opening of [...openings].sort((a,b)=>a.id.localeCompare(b.id)||a.bayId.localeCompare(b.bayId)||a.x-b.x||a.y-b.y)) {
    const bay=byBay.get(opening.bayId);
    if(!bay||![opening.x,opening.y,opening.width,opening.height].every(Number.isFinite)||opening.width<=0||opening.height<=0){limitations.push(`Otvor ${opening.id}: neplatné rozmery alebo neznáme pole.`);continue;}
    // Clip to the actual owning bay before transforming: no opening leaks into a neighbour.
    const x=Math.max(0,opening.x),y=Math.max(0,opening.y),right=Math.min(bay.width,opening.x+opening.width),top=Math.min(bay.height,opening.y+opening.height);
    if(right<=x||top<=y) continue;
    const r:Rect={x,y,width:right-x,height:top-y};
    if(bay.roof) {
      // buildBays Euler(-π/2, side*a, 0): local +X follows the slope, local +Y is world -Z.
      r.x+=roofExtra/2; r.y+=halfL-bay.position3D[2]-bay.height/2+endExtra/2;
      if (shed) {
        if (bay.surface === 'roof-left') r.x += roofExtra / 2;
        else r.x += slope + roofExtra / 2;
        surfaces.find(s => s.id === 'roof-left')!.openings.push(r);
        continue;
      }
      surfaces.find(s=>s.id===bay.surface)!.openings.push(r);
    } else {
      if(bay.surface==='left') r.x+=bay.position3D[2]+halfL-bay.width/2;
      if(bay.surface==='right') r.x+=halfL-bay.position3D[2]-bay.width/2;
      if(bay.surface==='front') r.x+=halfW-bay.position3D[0]-bay.width/2;
      if(bay.surface==='back') r.x+=halfW+bay.position3D[0]-bay.width/2;
      for(const s of surfaces.filter(s=>s.id===bay.surface||s.id.startsWith(`${bay.surface}:`))) if(area(clipRect(s.polygon,r))>EPS) s.openings.push({...r});
    }
  }
  for(const surface of surfaces) {
    let pieces=[surface.polygon];
    for(const hole of surface.openings) pieces=pieces.flatMap(poly=>subtract(poly,hole));
    surface.netAreaM2=pieces.reduce((sum,poly)=>sum+area(poly),0);
    surface.openingAreaM2=Math.max(0,surface.grossAreaM2-surface.netAreaM2);
    const spec=surface.kind==='wall'?options.wallPanel:options.roofPanel;
    if(validSpec(spec)) {
      try { surface.strips=layout(surface,pieces,spec,surface.kind==='wall'?(p.claddingOrientation??'horizontal'):(p.roofCladdingOrientation??'horizontal')); }
      catch(error) { limitations.push(`${surface.id}: ${error instanceof Error?error.message:'Rozpis panelov sa nepodaril.'}`); }
    }
    const t=result.totals;
    if(surface.kind==='wall'){t.wallGrossM2+=surface.grossAreaM2;t.wallNetM2+=surface.netAreaM2;t.wallOrderedM2+=surface.strips.reduce((sum,s)=>sum+s.orderedAreaM2,0);}
    else {t.roofGrossM2+=surface.grossAreaM2;t.roofNetM2+=surface.netAreaM2;t.roofOrderedM2+=surface.strips.reduce((sum,s)=>sum+s.orderedAreaM2,0);}
  }
  const add=(id:string,role:StructuralRole,from:V3,to:V3,size:number)=>{
    const lengthM=Math.hypot(...from.map((v,i)=>to[i]-v)), assignment=options.steelAssignments?.[id]??options.steelAssignments?.[role];
    const kg=assignment?.kgPerM,kgPerM=typeof kg==='number'&&Number.isFinite(kg)&&kg>=0?kg:null;
    result.structure.push({id,role,from,to,lengthM,renderedSizeM:size,profileId:assignment?.profileId??null,kgPerM,massKg:kgPerM===null?null:lengthM*kgPerM});
  };
  const center=template==='dvojlodna_hala'||!!p.hasCenterColumns;
  const hasGate=['prazdna_hala','skladovacia_hala','skladovacia_hala_svetlik','budova_pristavky'].includes(template);
  for(let i=0;i<=n;i++) {
    const z=-halfL+i*depth, end=i===0||i===n;
    for(const side of [-1,1]) {
      const tag=side<0?'left':'right';
      add(`frame:${i}:column:${tag}`,'column',[side*halfW,0,z],[side*halfW,H,z],col);
      add(`frame:${i}:rafter:${tag}`,'rafter',[side*halfW,H,z],[0,ridge,z],col*.9);
      if(!end) add(`frame:${i}:eave-haunch:${tag}`,'eaveHaunch',[side*halfW,H-.55,z],[side*(halfW-1.4),H+1.4*Math.tan(a),z],col*.9*.8);
      if(center) add(`frame:${i}:center-haunch:${tag}`,'centerHaunch',[0,H-.6,z],[side*1.2,ridge-1.2*Math.tan(a),z],col*.55);
      if(end&&!center) {
        const x=side*halfW/3,top=H+(halfW-Math.abs(x))*Math.tan(a),bottom=i===0&&hasGate&&Math.abs(x)<(p.doorWidth||4.2)/2+.1?(p.doorHeight||4):0;
        if(bottom<top) add(`frame:${i}:gable-column:${tag}`,'gableColumn',[x,bottom,z],[x,top,z],col*.72);
      }
    }
    if(!end) add(`frame:${i}:ridge-haunch`,'ridgeHaunch',[-1,ridge-Math.tan(a)-.12,z],[1,ridge-Math.tan(a)-.12,z],col*.9*.65);
    if(center) add(`frame:${i}:center-column`,'centerColumn',[0,0,z],[0,ridge,z],col*.95);
  }
  const purlins=Math.max(3,Math.ceil(halfW/1.6));
  for(let i=0;i<=purlins;i++) for(const side of i===0?[-1]:[-1,1]) {
    const x=side*i/purlins*halfW,y=H+(1-i/purlins)*(ridge-H)+.08;
    add(`purlin:${i}:${side}`,'purlin',[x,y,-halfL],[x,y,halfL],.07);
  }
  for(const y of [1.5,3,4.5,5.8].filter(y=>y<H-.3)) for(const side of [-1,1]) add(`girt:${y}:${side}`,'girt',[side*(halfW+.04),y,-halfL],[side*(halfW+.04),y,halfL],.06);
  for(const bay of [0,n-1]) for(const side of [-1,1]) for(const diagonal of [0,1]) {
    const z0=-halfL+bay*depth,z1=z0+depth;
    add(`bracing:wall:${bay}:${side}:${diagonal}`,'wallBracing',[side*halfW,diagonal?H-.2:.2,z0],[side*halfW,diagonal?.2:H-.2,z1],.03);
    add(`bracing:roof:${bay}:${side}:${diagonal}`,'roofBracing',[diagonal?0:side*halfW,diagonal?ridge:H,z0],[diagonal?side*halfW:0,diagonal?H:ridge,z1],.03);
  }
  // Plates/bolts are not lineal steel: do not pretend kg/m can quantify them.
  limitations.push('Oceľ: uvedené sú lineárne prúty hlavnej konštrukcie; pätky, styčníkové plechy, skrutky, kotvy a lemovanie nie sú zahrnuté.');
  result.totals.knownSteelMassKg=result.structure.reduce((sum,s)=>sum+(s.massKg??0),0);
  result.totals.steelMassComplete=result.structure.every(s=>s.massKg!==null);
  result.complete=false; // Assembly-wide completeness requires plates, fasteners and trims as well.
  result.limitations=[...new Set(limitations)];
  return result;
}
