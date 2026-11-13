import { z } from 'zod';
import defaults from '../../config/materials/accessories/default.json';
import type { GarageParams } from '../garage/types';
import type { Rect } from '../garage/openingSystem';
import type { MaterialGeometry } from './geometry';

const product = z.object({stockLengthM:z.number().finite().positive(),overlapM:z.number().finite().nonnegative(),kgPerM:z.number().finite().nonnegative().nullable()});
const kinds = ['ridge','eave','verge','corner','base','opening'] as const;
type TrimKind = typeof kinds[number];
const schema = z.object({
  version:z.string().min(1),source:z.string().min(1),validFrom:z.string().nullable(),
  products:z.object({ridge:product,eave:product,verge:product,corner:product,base:product,opening:product}),
  ladder:z.object({count:z.number().int().min(0).max(100),heightM:z.number().finite().positive().nullable(),kgPerUnit:z.number().finite().nonnegative().nullable(),product:z.string(),includesAccessories:z.boolean()}),
});
export type AccessoryConfig = z.infer<typeof schema>;
export interface AccessoryRow {
  id:string;kind:TrimKind|'ladder';label:string;netM:number;pieces:number;orderedM:number;
  overlapM:number;offcutM:number;massKg:number|null;
}
const labels:Record<TrimKind,string>={ridge:'Hrebeňové lemovanie',eave:'Odkvapové lemovanie',verge:'Štítová strešná lišta',corner:'Rohová lišta',base:'Soklová lišta',opening:'Lemovanie otvorov'};
const EPS=1e-8;
const object=(v:unknown):Record<string,unknown> => {
  if(v===undefined)return {};
  if(!v||typeof v!=='object'||Array.isArray(v))throw new Error('Konfigurácia musí byť JSON objekt.');
  return v as Record<string,unknown>;
};
/** Partial client/project JSON overrides inherit every omitted field, including nested products. */
export function resolveAccessoryConfig(override?:unknown):AccessoryConfig {
  const input=object(override), products=object(input.products);
  const merged=Object.fromEntries(kinds.map(kind=>[kind,{...defaults.products[kind],...object(products[kind])}]));
  const result=schema.parse({...defaults,...input,products:merged,ladder:{...defaults.ladder,...object(input.ladder)}});
  for(const kind of kinds)if(result.products[kind].overlapM>=result.products[kind].stockLengthM)throw new Error('Presah musí byť menší ako skladová dĺžka.');
  if(result.ladder.count>0&&result.ladder.heightM===null)throw new Error('Zadajte výšku výstupu rebríka.');
  return result;
}
export function orderRun(length:number,stock:number,overlap:number) {
  if(![length,stock,overlap].every(Number.isFinite)||length<0||stock<=0||overlap<0||overlap>=stock)throw new Error('Neplatná dĺžka alebo presah lišty.');
  const pieces=length<=EPS?0:Math.max(1,Math.ceil((length-overlap)/(stock-overlap)-EPS));
  const orderedM=pieces*stock,overlapM=Math.max(0,pieces-1)*overlap;
  const waste=Math.max(0,orderedM-length-overlapM);
  return {pieces,orderedM,overlapM,offcutM:waste<EPS?0:waste};
}
type Edge={axis:'h'|'v';fixed:number;from:number;to:number};
/** Union boundary: overlapping/adjacent openings share no internal trim. Collinear edges merge. */
function boundary(rects:Rect[]):Edge[] {
  const xs=[...new Set(rects.flatMap(r=>[r.x,r.x+r.width]))].sort((a,b)=>a-b);
  const ys=[...new Set(rects.flatMap(r=>[r.y,r.y+r.height]))].sort((a,b)=>a-b);
  const filled=xs.slice(1).map((x,i)=>ys.slice(1).map((y,j)=>rects.some(r=>(xs[i]+x)/2>r.x&&(xs[i]+x)/2<r.x+r.width&&(ys[j]+y)/2>r.y&&(ys[j]+y)/2<r.y+r.height)));
  const edges:Edge[]=[];
  for(let i=0;i<xs.length-1;i++)for(let j=0;j<ys.length-1;j++)if(filled[i][j]){
    if(!filled[i-1]?.[j])edges.push({axis:'v',fixed:xs[i],from:ys[j],to:ys[j+1]});
    if(!filled[i+1]?.[j])edges.push({axis:'v',fixed:xs[i+1],from:ys[j],to:ys[j+1]});
    if(!filled[i]?.[j-1])edges.push({axis:'h',fixed:ys[j],from:xs[i],to:xs[i+1]});
    if(!filled[i]?.[j+1])edges.push({axis:'h',fixed:ys[j+1],from:xs[i],to:xs[i+1]});
  }
  edges.sort((a,b)=>a.axis.localeCompare(b.axis)||a.fixed-b.fixed||a.from-b.from);
  const merged:Edge[]=[];
  for(const edge of edges){const last=merged[merged.length-1];if(last&&last.axis===edge.axis&&last.fixed===edge.fixed&&Math.abs(last.to-edge.from)<EPS)last.to=edge.to;else merged.push({...edge});}
  return merged;
}

export function calculateAccessories(p:GarageParams,model:MaterialGeometry,override?:unknown):{rows:AccessoryRow[];notes:string[]} {
  const config=resolveAccessoryConfig(override),rows:AccessoryRow[]=[];
  const notes=[`Lemovanie: ${config.version}; ${config.source} Platnosť od: ${config.validFrom??'neurčená'}.`,
    'Objednávka líšt je orientačná: každá súvislá hrana samostatne, plné skladové kusy, bez opätovného využitia odrezkov. Presahy spojov a odrezky sú oddelené.',
    'Hmotnosť líšt zahŕňa objednané kusy. Skrutky, tesnenia, kotvy, žľaby a zvody nie sú v týchto položkách zahrnuté.',
    'Lemovanie otvorov je geometrický obvod; parapety a nadpražia potrebujú výrobkový detail. Pri podlahe sa spodná lišta otvoru nepridáva.',
  ];
  const ladder=config.ladder;
  if(ladder.count>0){
    rows.push({id:'ladder',kind:'ladder',label:`Rebrík · ${ladder.product}`,netM:ladder.count*ladder.heightM!,pieces:ladder.count,orderedM:ladder.count*ladder.heightM!,overlapM:0,offcutM:0,massKg:ladder.kgPerUnit===null?null:ladder.count*ladder.kgPerUnit});
    notes.push(`Rebrík: výška výstupu ${ladder.heightM} m, ${ladder.count} ks. Hmotnosť podľa zadania ${ladder.includesAccessories?'vrátane príslušenstva':'bez potvrdeného príslušenstva (kôš, madlá, konzoly a kotvenie doplniť)'}. Výška výstupu nie je výrobná dĺžka rebríka.`);
  }
  if(p.roofType!=='gable'||p.twinRoof||p.hasAttic||p.wallMode==='open'||p.wallMode==='plinth'||!model.surfaces.length){
    return {rows,notes:[...notes,'Lemovanie neurčené: nepodporovaná alebo neplatná obálka.']};
  }
  const add=(id:string,kind:TrimKind,length:number)=>{
    if(length<=EPS)return;
    const spec=config.products[kind],order=orderRun(length,spec.stockLengthM,spec.overlapM);
    rows.push({id,kind,label:labels[kind],netM:length,...order,massKg:spec.kgPerM===null?null:order.orderedM*spec.kgPerM});
  };
  const roofs=model.surfaces.filter(s=>s.kind==='roof');
  const size=(points:number[])=>Math.max(...points)-Math.min(...points);
  const ridgeSkylight=p.hasRidgeSkylight||model.limitations.some(note=>note.includes('pásové hrebeňové svetlíky'));
  for(const roof of roofs){
    const slope=size(roof.polygon.map(v=>v[0])),length=size(roof.polygon.map(v=>v[1]));
    if(roof.id==='roof-left'&&!ridgeSkylight)add('ridge','ridge',length);
    add(`${roof.id}:eave`,'eave',length);
    for(const end of ['front','back'])add(`${roof.id}:${end}:verge`,'verge',slope);
  }
  if(ridgeSkylight)notes.push('Hrebeňové lemovanie pri pásovom svetlíku vyžaduje samostatný detail.');
  const base=p.hasStemWall?(p.stemWallHeight??.27):0;
  for(let i=0;i<4;i++)add(`corner:${i}`,'corner',p.clearHeight-base);
  const faces=new Map<string,{roof:boolean;holes:Rect[];length:number}>();
  for(const surface of model.surfaces){
    const key=surface.id.split(':')[0];
    const face=faces.get(key)??{roof:surface.kind==='roof',holes:[],length:key==='left'||key==='right'?p.length:p.width};
    for(const rect of surface.openings)if(!face.holes.some(r=>r.x===rect.x&&r.y===rect.y&&r.width===rect.width&&r.height===rect.height))face.holes.push(rect);
    faces.set(key,face);
  }
  for(const [id,face] of faces){
    if(face.holes.length>200){notes.push(`${id}: príliš veľa otvorov na výpočet lemovania.`);continue;}
    // Clamp below the cladding base (a stem wall is not panel cladding).
    const holes=face.holes.map(r=>face.roof?r:{...r,y:Math.max(base,r.y),height:r.y+r.height-Math.max(base,r.y)}).filter(r=>r.width>0&&r.height>EPS);
    boundary(holes).filter(e=>face.roof||e.axis!=='h'||e.fixed>base+EPS).forEach((edge,i)=>add(`${id}:opening:${i}`,'opening',edge.to-edge.from));
    if(!face.roof){
      const blocked=holes.filter(r=>r.y<=base+EPS).map(r=>[Math.max(0,r.x),Math.min(face.length,r.x+r.width)]).sort((a,b)=>a[0]-b[0]);
      let cursor=0,index=0;
      for(const [start,end] of blocked){if(start>cursor)add(`${id}:base:${index++}`,'base',start-cursor);cursor=Math.max(cursor,end);}
      add(`${id}:base:${index}`,'base',face.length-cursor);
    }
  }
  return {rows,notes};
}
