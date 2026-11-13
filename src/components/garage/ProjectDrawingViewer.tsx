import React, { useEffect, useState } from 'react';
import type { HallMaterialProject } from '@/lib/materials/project';
import { generateProjectDrawings, saveProjectDrawingPdf, type ProjectDrawingPage } from '@/lib/garage/project-scene-drawings';

export function ProjectDrawingViewer({ project, onClose }: { project: HallMaterialProject; onClose: () => void }) {
  const [pages,setPages]=useState<ProjectDrawingPage[]>([]);
  const [error,setError]=useState('');
  const [active,setActive]=useState(2);
  const [zoom,setZoom]=useState(1);
  const signature=JSON.stringify(project);
  useEffect(() => {
    let cancelled=false;
    setPages([]);setError('');
    generateProjectDrawings(JSON.parse(signature)).then(result => { if (!cancelled) setPages(result); })
      .catch(error => { if (!cancelled) setError(error instanceof Error ? error.message : 'Výkresy sa nepodarilo načítať.'); });
    return () => { cancelled=true; };
  },[signature]);
  return <div role="dialog" aria-modal="true" aria-label="Technické výkresy haly" className="fixed inset-0 z-50 bg-slate-950/95 p-4 text-white">
    <div className="flex h-full flex-col gap-3">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="font-bold">{project.name ?? 'Technické výkresy haly'}</h2>
          <p className="text-sm">{project.params.width} × {project.params.length} × {project.params.clearHeight} m</p></div>
        <div className="flex gap-3">
          <button disabled={!pages.length} onClick={() => saveProjectDrawingPdf(project,pages)} className="rounded bg-emerald-600 px-4 py-2 disabled:opacity-40">Stiahnuť PDF</button>
          <button onClick={onClose} className="rounded border px-4 py-2">Zavrieť</button>
        </div>
      </header>
      {error && <p role="alert">{error}</p>}
      {!pages.length && !error && <p role="status">Generujem pohľady z modelu haly…</p>}
      {pages.length > 0 && <>
        <nav className="flex flex-wrap gap-2">{pages.map((page,index) =>
          <button key={page.title} onClick={() => setActive(index)} className={'rounded px-3 py-2 '+(active===index?'bg-emerald-600':'bg-slate-800')}>{page.title}</button>)}</nav>
        <label className="flex gap-3 text-sm">Priblíženie
          <input type="range" min="0.5" max="3" step="0.1" value={zoom} onChange={event => setZoom(Number(event.target.value))} />
          {Math.round(zoom*100)} %
        </label>
        <div className="flex-1 overflow-auto rounded bg-white">
          <img alt={pages[active]?.title} src={pages[active]?.image} style={{width:zoom*100+'%',maxWidth:'none'}} />
        </div>
        <p className="text-xs text-slate-300">Kóty označujú vonkajšiu obálku modelu v mm. Rezy A–A a B–B prechádzajú stredom hlavnej lode.</p>
      </>}
    </div>
  </div>;
}
