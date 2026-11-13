import React, { useEffect, useRef } from 'react';
import { createRoot, extend } from '@react-three/fiber';
import * as THREE from 'three';
import { NewHallStandalone3D } from '@/components/garage/NewHallStandalone3D';
import { BayOpeningMeshes } from '@/components/garage/openings/BayOpeningMeshes';
import { buildBays } from './openingSystem';
import { getTemplateDefaultOpenings, isTemplateDefaultOpening } from './templateDefaults';
import { resolveProjectOpenings, type HallMaterialProject } from '../materials/project';
import { jsPDF } from 'jspdf';
import { ROBOTO_REGULAR_B64 } from './pdfFonts';

export const PROJECT_DRAWING_VIEWS = [
  { id: 'plan', title: 'Pôdorys konštrukcie', direction: [0, 1, 0], structure: true },
  { id: 'roof', title: 'Pôdorys strechy', direction: [0, 1, 0] },
  { id: 'front', title: 'Predný pohľad', direction: [0, 0, -1] },
  { id: 'rear', title: 'Zadný pohľad', direction: [0, 0, 1] },
  { id: 'left', title: 'Ľavý pohľad', direction: [-1, 0, 0] },
  { id: 'right', title: 'Pravý pohľad', direction: [1, 0, 0] },
  { id: 'cross', title: 'Priečny rez A–A', direction: [0, 0, -1], section: 'z' },
  { id: 'long', title: 'Pozdĺžny rez B–B', direction: [-1, 0, 0], section: 'x' },
] as const;
export interface ProjectDrawingPage {
  title: string;
  image: string;
  scale: number;
  widthMm: number;
  heightMm: number;
}
const imageWidth = 2200, imageHeight = 1400;
const boundsCorners = (box: THREE.Box3) => [box.min.x, box.max.x].flatMap(x =>
  [box.min.y, box.max.y].flatMap(y => [box.min.z, box.max.z].map(z => new THREE.Vector3(x,y,z))));

/** Derive edited faces with the same default-opening rules as the interactive editor. */
export function projectOpeningState(project: HallMaterialProject) {
  const bays = buildBays(project.params);
  const openings = resolveProjectOpenings(project);
  const defaults = getTemplateDefaultOpenings(project.templateId, project.params, bays);
  const replaced = new Set(project.replacedWindowIds ?? []);
  for (const original of defaults) {
    const current = openings.find(item => item.id === original.id);
    if (!current || ['bayId', 'x', 'y', 'width', 'height', 'category', 'subtype'].some(
      key => current[key as keyof typeof current] !== original[key as keyof typeof original])) replaced.add(original.id);
  }
  const surfaces = new Set<string>();
  for (const opening of [...defaults.filter(item => replaced.has(item.id)),
    ...openings.filter(item => !isTemplateDefaultOpening(item.id) || replaced.has(item.id))]) {
    const bay = bays.find(item => item.id === opening.bayId);
    if (bay) surfaces.add(bay.surface);
  }
  return { bays, openings, surfaces: [...surfaces], replacedWindowIds: [...replaced] };
}

function ProjectScene({ project, ready }: { project: HallMaterialProject; ready: (shell: THREE.Group, structure: THREE.Group) => void }) {
  const shell = useRef<THREE.Group>(null), structure = useRef<THREE.Group>(null);
  const state = projectOpeningState(project);
  const p = { ...project.params, showStructure: true, showCladding: true, explode: 0, wireframe: false, doorOpen: false };
  useEffect(() => { if (shell.current && structure.current) ready(shell.current, structure.current); }, [ready]);
  return <>
    <group ref={shell}>
      <NewHallStandalone3D p={p} templateId={project.templateId}
        editedSurfaces={state.surfaces} replacedWindowIds={state.replacedWindowIds} />
      <BayOpeningMeshes {...state} color={p.claddingColor} roofColor={p.roofColor}
        opacity={1} showOpenings stemHeight={p.hasStemWall !== false ? p.stemWallHeight ?? .27 : 0}
        stemColor={p.stemWallColor ?? '#a5a5a5'} stemThickness={(p.stemWallThickness ?? .1) + .04} />
    </group>
    <group ref={structure}>
      <NewHallStandalone3D p={{...p, showCladding: false}} templateId={project.templateId}
        editedSurfaces={state.surfaces} replacedWindowIds={state.replacedWindowIds}
        layerToggles={{ panels:false, openings:false, frames:true, purlins:true, girts:true,
          flashings:false, structuralComponents:true, basePlate:true }} />
    </group>
  </>;
}

let generationQueue: Promise<unknown> = Promise.resolve();
export function generateProjectDrawings(project: HallMaterialProject): Promise<ProjectDrawingPage[]> {
  const snapshot = structuredClone(project);
  const work = generationQueue.then(() => renderProject(snapshot));
  generationQueue = work.catch(() => {});
  return work;
}

async function renderProject(project: HallMaterialProject): Promise<ProjectDrawingPage[]> {
  if (![project.params.width,project.params.length,project.params.clearHeight].every(value => Number.isFinite(value) && value > 0))
    throw new Error('Neplatné rozmery haly.');
  const canvas = document.createElement('canvas');
  const gl = new THREE.WebGLRenderer({canvas, antialias:true, preserveDrawingBuffer:true});
  gl.setSize(imageWidth,imageHeight);
  gl.setPixelRatio(1);
  gl.setClearColor('#ffffff');
  gl.localClippingEnabled = true;
  extend(THREE);
  const root = createRoot(canvas);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1,1,1,-1,.01,10000);
  const owned: (THREE.Material | THREE.BufferGeometry)[] = [];
  try {
    await root.configure({ gl, scene, camera, frameloop:'never', size:{width:imageWidth,height:imageHeight,top:0,left:0} });
    const [shell, structure] = await new Promise<[THREE.Group,THREE.Group]>((resolve,reject) => {
      const timer = window.setTimeout(() => reject(new Error('Model haly sa nepodarilo načítať.')),30000);
      root.render(<ProjectScene project={project} ready={(a,b) => { clearTimeout(timer); resolve([a,b]); }} />);
    });
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    scene.background = new THREE.Color('#ffffff');
    scene.updateMatrixWorld(true);
    // Replace only materials on this dedicated export scene. Geometry is the configurator geometry.
    const meshes: THREE.Mesh[] = [];
    shell.traverseVisible(object => { if ((object as THREE.Mesh).isMesh) meshes.push(object as THREE.Mesh); });
    structure.traverseVisible(object => { if ((object as THREE.Mesh).isMesh) meshes.push(object as THREE.Mesh); });
    for (const mesh of meshes) {
      const material = new THREE.MeshBasicMaterial({color:'#ffffff', side:THREE.DoubleSide, polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1});
      mesh.material = material;
      owned.push(material);
      const geometry = new THREE.EdgesGeometry(mesh.geometry, 28);
      const lineMaterial = new THREE.LineBasicMaterial({color:'#3c4650'});
      const edge = new THREE.LineSegments(geometry,lineMaterial);
      mesh.add(edge);
      owned.push(geometry,lineMaterial);
    }
    const box = new THREE.Box3().setFromObject(shell);
    const center = box.getCenter(new THREE.Vector3());
    const radius = box.getSize(new THREE.Vector3()).length();
    const pages: ProjectDrawingPage[] = [];
    for (const view of PROJECT_DRAWING_VIEWS) {
      shell.visible = !('structure' in view);
      structure.visible = 'structure' in view;
      const direction = new THREE.Vector3(...view.direction);
      camera.position.copy(center).addScaledVector(direction,radius * 2 + 10);
      camera.up.set(0,1,0);
      if (view.direction[1]) camera.up.set(0,0,1);
      camera.lookAt(center);
      camera.updateMatrixWorld(true);
      const local = boundsCorners(box).map(point => point.applyMatrix4(camera.matrixWorldInverse));
      const minX = Math.min(...local.map(p => p.x)), maxX = Math.max(...local.map(p => p.x));
      const minY = Math.min(...local.map(p => p.y)), maxY = Math.max(...local.map(p => p.y));
      const w = maxX-minX, h = maxY-minY;
      const viewW = Math.max(w*1.15, h*1.15*imageWidth/imageHeight);
      const viewH = viewW*imageHeight/imageWidth;
      camera.left=(minX+maxX-viewW)/2; camera.right=camera.left+viewW;
      camera.bottom=(minY+maxY-viewH)/2; camera.top=camera.bottom+viewH;
      camera.updateProjectionMatrix();
      const clipping = 'section' in view ? [new THREE.Plane(
        view.section === 'z' ? new THREE.Vector3(0,0,1) : new THREE.Vector3(1,0,0), 0)] : [];
      for (const resource of owned) if (resource instanceof THREE.Material) { resource.clippingPlanes=clipping; resource.needsUpdate=true; }
      gl.render(scene,camera);
      const paper = document.createElement('canvas');
      paper.width=imageWidth;paper.height=imageHeight;
      const ctx=paper.getContext('2d')!;
      ctx.drawImage(canvas,0,0);
      const left=(minX-camera.left)/viewW*imageWidth;
      const right=(maxX-camera.left)/viewW*imageWidth;
      const bottom=(camera.top-minY)/viewH*imageHeight;
      const top=(camera.top-maxY)/viewH*imageHeight;
      ctx.strokeStyle='#64748b';ctx.fillStyle='#17202a';ctx.lineWidth=1;
      ctx.font='20px Arial';ctx.textAlign='center';
      ctx.beginPath();ctx.moveTo(left,bottom+22);ctx.lineTo(right,bottom+22);
      ctx.moveTo(left,bottom+15);ctx.lineTo(left,bottom+29);
      ctx.moveTo(right,bottom+15);ctx.lineTo(right,bottom+29);ctx.stroke();
      ctx.fillText(String(Math.round(w*1000)),(left+right)/2,bottom+48);
      ctx.beginPath();ctx.moveTo(right+22,top);ctx.lineTo(right+22,bottom);ctx.stroke();
      ctx.save();ctx.translate(right+45,(top+bottom)/2);ctx.rotate(-Math.PI/2);
      ctx.fillText(String(Math.round(h*1000)),0,0);ctx.restore();
      pages.push({title:view.title,image:paper.toDataURL('image/png'),scale:viewW*1000/277,
        widthMm:Math.round(w*1000),heightMm:Math.round(h*1000)});
    }
    return pages;
  } finally {
    root.unmount();
    owned.forEach(resource => resource.dispose());
    gl.dispose();
    gl.forceContextLoss();
  }
}

export function saveProjectDrawingPdf(project: HallMaterialProject, pages: ProjectDrawingPage[]) {
  const pdf = new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});
  pdf.addFileToVFS('Roboto-Regular.ttf',ROBOTO_REGULAR_B64);
  pdf.addFont('Roboto-Regular.ttf','Roboto','normal');
  pdf.setFont('Roboto');
  pages.forEach((page,index) => {
    if (index) pdf.addPage();
    pdf.setFontSize(13);pdf.text(page.title,10,12);
    pdf.setFontSize(9);pdf.text(project.name ?? project.templateId,10,19);
    pdf.setFontSize(7);pdf.text(`Hala: ${project.params.width} × ${project.params.length} m | Svetlá výška: ${project.params.clearHeight} m | Sklon: ${project.params.roofPitchDeg}° | Polia: ${project.params.bayCount}`,287,19,{align:'right'});
    pdf.addImage(page.image,'PNG',10,24,277,176.27);
    pdf.setFontSize(7);
    pdf.text('Kóty obálky modelu v mm · Mierka 1:' + page.scale.toFixed(1) + ' pri tlači A4 na 100 %',10,205);
    pdf.text((index+1)+' / '+pages.length,287,205,{align:'right'});
  });
  pdf.save('Technicke_vykresy_' + project.params.width + 'x' + project.params.length + '.pdf');
}
