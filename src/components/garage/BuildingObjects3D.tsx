import React, { useMemo } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { type GarageParams } from '@/lib/garage/types';
import { type BuildingObject, getBuildingObjectGeometry } from '@/lib/garage/buildingObjects';
import { DEFAULT_MATERIAL_CATALOG, type MaterialCatalog, type SteelProfile } from '@/lib/materials/catalog';
import { type HiStructLayerToggles } from './NewHallStandalone3D';

type Point = [number, number, number];
/** Extruded catalog sections retain their actual width, depth and wall thickness. */
function Member({ from, to, profile, fallback, color }: { from: Point; to: Point; profile?: SteelProfile; fallback: number; color: string }) {
  const { geometry, quaternion } = useMemo(() => {
    const w = (profile?.widthMm ?? fallback * 1000) / 1000;
    const h = (profile?.heightMm ?? fallback * 1000) / 1000;
    const tw = Math.min((profile?.webThicknessMm ?? profile?.wallThicknessMm ?? 4) / 1000, w / 3);
    const tf = Math.min((profile?.flangeThicknessMm ?? profile?.wallThicknessMm ?? 4) / 1000, h / 3);
    const shape = new THREE.Shape();
    const family = (profile?.family ?? '').toUpperCase();
    const points: [number,number][] = /^(IPE|HE|IPN|I$)/.test(family)
      ? [[-w/2,-h/2],[w/2,-h/2],[w/2,-h/2+tf],[tw/2,-h/2+tf],[tw/2,h/2-tf],[w/2,h/2-tf],[w/2,h/2],[-w/2,h/2],[-w/2,h/2-tf],[-tw/2,h/2-tf],[-tw/2,-h/2+tf],[-w/2,-h/2+tf]]
      : /^(U|C)/.test(family)
        ? [[-w/2,-h/2],[w/2,-h/2],[w/2,-h/2+tf],[-w/2+tw,-h/2+tf],[-w/2+tw,h/2-tf],[w/2,h/2-tf],[w/2,h/2],[-w/2,h/2]]
        : [[-w/2,-h/2],[w/2,-h/2],[w/2,h/2],[-w/2,h/2]];
    points.forEach(([x,y], i) => i ? shape.lineTo(x,y) : shape.moveTo(x,y)); shape.closePath();
    if (!/^(IPE|HE|IPN|I$|U|C)/.test(family)) {
      const hole = new THREE.Path(); hole.moveTo(-w/2+tw,-h/2+tf); hole.lineTo(-w/2+tw,h/2-tf); hole.lineTo(w/2-tw,h/2-tf); hole.lineTo(w/2-tw,-h/2+tf); hole.closePath(); shape.holes.push(hole);
    }
    const direction = new THREE.Vector3(...to).sub(new THREE.Vector3(...from));
    return { geometry: new THREE.ExtrudeGeometry(shape,{depth:direction.length(),bevelEnabled:false}), quaternion:new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),direction.normalize()) };
  }, [from.join(','),to.join(','),profile,fallback]);
  React.useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} position={from} quaternion={quaternion} castShadow receiveShadow><meshStandardMaterial color={color} metalness={.65} roughness={.4}/></mesh>;
}

export function ObjectOutline({ width, length, innerHeight, outerHeight, name }: {width:number;length:number;innerHeight:number;outerHeight:number;name:string}) {
  const vertices = useMemo(() => {
    const corners = [[0,0,0],[width,0,0],[width,0,length],[0,0,length],[0,innerHeight,0],[width,outerHeight,0],[width,outerHeight,length],[0,innerHeight,length]];
    return new Float32Array([[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]].flatMap(([a,b]) => [...corners[a],...corners[b]]));
  },[width,length,innerHeight,outerHeight]);
  return <><lineSegments raycast={() => null} renderOrder={20}><bufferGeometry><bufferAttribute attach="attributes-position" args={[vertices,3]}/></bufferGeometry><lineBasicMaterial color="#ffad19" depthTest={false}/></lineSegments><Html position={[width/2,Math.max(innerHeight,outerHeight)+.45,length/2]} center style={{pointerEvents:'none',whiteSpace:'nowrap',background:'#222',color:'#ffcd61',padding:'4px 8px',borderRadius:4,fontSize:12}}>{name}</Html></>;
}

export function BuildingObjects3D({ objects, params, selectedObjectId, onSelectObject, catalog = DEFAULT_MATERIAL_CATALOG, layers, opacity, renderWindow }: {
  objects:BuildingObject[];params:GarageParams;selectedObjectId?:string;onSelectObject?:(id:string)=>void;catalog?:MaterialCatalog;layers:HiStructLayerToggles;opacity:number;
  renderWindow?:(x:number,y:number,z:number,rotation:number,width:number,height:number,key:string)=>React.ReactNode;
}) {
  return <>{objects.filter(o => o.type !== 'main_hall').map(object => {
    let g: ReturnType<typeof getBuildingObjectGeometry>;
    try { g = getBuildingObjectGeometry(object,objects,params); } catch { return null; }
    const p = object.parameters;
    const angle = Math.atan2(g.innerHeight-g.outerHeight,g.width);
    const roofThickness = (catalog.panels.find(panel => panel.id === p.roofProductId)?.thicknessMm ?? 90)/1000;
    const profile = (role:'column'|'rafter'|'purlin') => catalog.steelProfiles.find(item => item.id === object.profileAssignments[role]);
    const color = params.steelColor || '#3b83bd';
    const showPanels = params.showCladding !== false && layers.panels;
    const shape = new THREE.Shape(); shape.moveTo(0,0);shape.lineTo(g.width,0);shape.lineTo(g.width,g.outerHeight);shape.lineTo(0,g.innerHeight);shape.closePath();
    const stemHeight = Math.min(g.outerHeight, params.hasStemWall !== false ? params.stemWallHeight ?? .27 : 0);
    const panelWidth = params.wallPanelWidth ?? 1;
    const wallMaterial = <meshStandardMaterial color={p.wallColor} transparent={opacity<1} opacity={opacity} side={THREE.DoubleSide}/>;
    return <group key={object.id} name={`building-object-${object.id}`} position={g.origin} rotation={[0,g.rotationY,0]} onClick={event => {event.stopPropagation();onSelectObject?.(object.id);}}>
      {params.showStructure !== false && <>
        {layers.frames && g.columnPositions.map((v,i) => <group key={i}>
          <Member from={[g.width,0,v]} to={[g.width,g.outerHeight,v]} profile={profile('column')} fallback={.16} color={color}/>
          <Member from={[0,g.innerHeight,v]} to={[g.width,g.outerHeight,v]} profile={profile('rafter')} fallback={.16} color={color}/>
          {layers.structuralComponents && <mesh position={[g.width,.015,v]}><boxGeometry args={[.3,.03,.3]}/><meshStandardMaterial color={color}/></mesh>}
        </group>)}
        {layers.purlins && [.25,.5,.75,1].map(t => <Member key={t} from={[g.width*t,g.innerHeight+(g.outerHeight-g.innerHeight)*t+.06,0]} to={[g.width*t,g.innerHeight+(g.outerHeight-g.innerHeight)*t+.06,g.length]} profile={profile('purlin')} fallback={.06} color={color}/>)}
      </>}
      {showPanels && <>
        <mesh position={[g.width/2,(g.innerHeight+g.outerHeight)/2+.08,g.length/2]} rotation={[0,0,-angle]} castShadow receiveShadow><boxGeometry args={[g.slopeLength+.25,roofThickness,g.length+.3]}/><meshStandardMaterial color={p.roofColor} transparent={opacity<1} opacity={opacity}/></mesh>
        {object.closures.outer && <>
          {stemHeight > 0 && <mesh position={[g.width+.07,stemHeight/2,g.length/2]}><boxGeometry args={[.14,stemHeight,g.length]}/><meshStandardMaterial color={params.stemWallColor ?? '#a5a5a5'}/></mesh>}
          <mesh position={[g.width+.05,stemHeight+(g.outerHeight-stemHeight)/2,g.length/2]}><boxGeometry args={[.1,Math.max(.001,g.outerHeight-stemHeight),g.length]}/>{wallMaterial}</mesh>
          {params.claddingOrientation !== 'vertical' && Array.from({length:Math.max(0,Math.floor(g.outerHeight/panelWidth))},(_,i)=>(i+1)*panelWidth).filter(y=>y<g.outerHeight-.05).map(y=><mesh key={y} position={[g.width+.105,y,g.length/2]}><boxGeometry args={[.015,.018,g.length+.02]}/><meshStandardMaterial color={p.wallColor} roughness={.9}/></mesh>)}
        </>}
        {(['front','back'] as const).map(side => object.closures[side] && <mesh key={side} position={[0,0,side==='front'?-.1:g.length]}><extrudeGeometry args={[shape,{depth:.1,bevelEnabled:false}]}/>{wallMaterial}</mesh>)}
        {layers.flashings && <>{object.closures.outer && [0,g.length].map(v=><mesh key={`corner-${v}`} position={[g.width+.06,g.outerHeight/2,v]}><boxGeometry args={[.14,g.outerHeight,.14]}/><meshStandardMaterial color={p.roofColor}/></mesh>)}{[0,1].map(t => <mesh key={t} position={[g.width*t,g.innerHeight+(g.outerHeight-g.innerHeight)*t+.05,g.length/2]}><boxGeometry args={[.12,.1,g.length+.35]}/><meshStandardMaterial color={p.roofColor}/></mesh>)}</>}
        {object.type==='office_annex' && layers.openings && renderWindow && [1.4,3].filter(y => y+.5<g.outerHeight).map((y,i) => <React.Fragment key={i}>
          {object.closures.outer && renderWindow(g.width+.06,y,g.length/2,Math.PI/2,g.length*.82,1,`${object.id}-outer-${i}`)}
          {object.closures.front && renderWindow(g.width/2,y,-.06,Math.PI,g.width*.75,1,`${object.id}-front-${i}`)}
        </React.Fragment>)}
      </>}
      {layers.flashings && params.showCladding !== false && <>
        {object.accessories.gutter && <mesh position={[g.width+.16,g.outerHeight,g.length/2]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.09,.09,g.length+.3,12,1,true,0,Math.PI]}/><meshStandardMaterial color={p.roofColor} side={THREE.DoubleSide}/></mesh>}
        {object.accessories.downpipe && <mesh position={[g.width+.18,g.outerHeight/2,g.length-.15]}><cylinderGeometry args={[.05,.05,g.outerHeight,12]}/><meshStandardMaterial color={p.roofColor}/></mesh>}
      </>}
      {selectedObjectId===object.id && <ObjectOutline {...g} name={object.name}/>}
    </group>;
  })}</>;
}
