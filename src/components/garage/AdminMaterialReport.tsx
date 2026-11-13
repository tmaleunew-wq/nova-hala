import { useEffect, useState } from 'react';
import { MaterialReport } from './MaterialReport';
import { createMaterialProject, MATERIAL_PROJECT_STORAGE_KEY, readMaterialProject, writeMaterialProject, type HallMaterialProject, type MaterialProjectInput } from '@/lib/materials/project';

const projectsKey = 'vbau_hall_projects_crm_v1';

function readSavedProjects(): MaterialProjectInput[] {
  const value: unknown = JSON.parse(localStorage.getItem(projectsKey) ?? '[]');
  return Array.isArray(value) ? value : [];
}

export function AdminMaterialReport() {
  const [current, setCurrent] = useState<HallMaterialProject | null>(null);
  const [saved, setSaved] = useState<HallMaterialProject[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [error, setError] = useState('');
  const project = selectedId ? saved.find(item => item.id === selectedId) : current;

  useEffect(() => {
    function refresh(event?: StorageEvent) {
      if (event?.key && event.key !== projectsKey && event.key !== MATERIAL_PROJECT_STORAGE_KEY) return;
      setCurrent(readMaterialProject());
      try {
        setSaved(readSavedProjects().filter(item => item?.id && item.params).map(item => createMaterialProject({ ...item, templateId: item.templateId ?? 'prazdna_hala' })));
      } catch {
        setSaved([]);
        setError('Uložené projekty sa nepodarilo načítať.');
      }
    }
    refresh();
    window.addEventListener('storage', refresh);
    return () => window.removeEventListener('storage', refresh);
  }, []);

  function save(updated: HallMaterialProject) {
    try {
      const records = readSavedProjects();
      const live = readMaterialProject();
      const matchesLive = !selectedId || (updated.id !== undefined && updated.id === live?.id);
      const materialSettings = updated.materialSettings;
      if (updated.id && records.some(item => item.id === updated.id)) {
        localStorage.setItem(projectsKey, JSON.stringify(records.map(item => item.id === updated.id ? { ...item, materialSettings } : item)));
        setSaved(previous => previous.map(item => item.id === updated.id ? { ...item, materialSettings } : item));
      }
      if (matchesLive) {
        const next = { ...(live ?? updated), materialSettings };
        if (!writeMaterialProject(next)) throw new Error('Uloženie sa nepodarilo.');
        setCurrent(next);
      }
      setError('');
    } catch {
      setError('Nastavenia výkazu sa nepodarilo uložiť.');
    }
  }

  return <details id="material-report" className="mb-5 rounded-lg border border-white/10 bg-[#0e1218]" open>
    <summary className="cursor-pointer p-4 text-sm font-bold text-white">Materiálový výkaz</summary>
    <div className="space-y-4 px-4 pb-4">
      <label className="flex flex-wrap items-center gap-2 text-sm">Projekt
        <select className="max-w-full rounded border border-white/15 bg-slate-950 px-2 py-1.5 text-white" value={selectedId} onChange={event => setSelectedId(event.target.value)}>
          <option value="">Aktuálny návrh konfigurátora</option>
          {saved.map(item => <option key={item.id} value={item.id}>{item.name ?? item.templateId}</option>)}
        </select>
      </label>
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      {project ? <MaterialReport key={selectedId} project={project} onChange={save} /> : <p className="text-sm text-slate-300">Otvorte konfigurátor haly alebo vyberte uložený projekt.</p>}
    </div>
  </details>;
}
