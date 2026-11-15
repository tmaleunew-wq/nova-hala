import { useState } from 'react';
import { MaterialReport } from './MaterialReport';
import { DEFAULT_PARAMS, type GarageParams } from '@/lib/garage/types';
import { createMaterialProject, type HallMaterialProject, type ProjectMaterialSettings } from '@/lib/materials/project';
import { getOrderReportOpenings } from '@/lib/materials/order-report-openings';

type SavedProject = Pick<HallMaterialProject, 'templateId' | 'openings' | 'replacedWindowIds' | 'materialSettings' | 'buildingObjects'>;
const settingsPrefix = 'vbau_admin_material_report_v1:';

export function OrderMaterialReports({ id, name, params, savedProject }: {
  id?: string;
  name: string;
  params: GarageParams;
  savedProject?: SavedProject;
}) {
  const [settings, setSettings] = useState<ProjectMaterialSettings | undefined>(() => {
    if (!id) return undefined;
    try {
      return JSON.parse(localStorage.getItem(settingsPrefix + id) ?? 'null') ?? undefined;
    } catch {
      return undefined;
    }
  });
  const [error, setError] = useState('');
  const normalized = { ...DEFAULT_PARAMS, ...params };
  const project = createMaterialProject({
    id, name, params: normalized, templateId: savedProject?.templateId ?? 'prazdna_hala',
    openings: savedProject?.openings,
    replacedWindowIds: savedProject?.replacedWindowIds,
    buildingObjects: savedProject?.buildingObjects,
    materialSettings: settings ?? savedProject?.materialSettings,
  });

  return <details className="mt-4 rounded-lg border border-white/10 bg-[#0e1218]" open>
    <summary className="cursor-pointer p-3 font-semibold">Výkazy vybranej haly</summary>
    <div className="p-3 pt-0">
      {error && <p role="alert" className="mb-2 text-red-300">{error}</p>}
      {!savedProject && <p className="mb-2 text-xs text-slate-300">Otvory staršej objednávky sa odvodzujú z rozmerov a polôh v konfigurácii.</p>}
      <MaterialReport project={project} orderOpenings={savedProject ? undefined : getOrderReportOpenings(normalized)} onChange={updated => {
        try {
          if (id) localStorage.setItem(settingsPrefix + id, JSON.stringify(updated.materialSettings ?? {}));
          setSettings(updated.materialSettings);
          setError('');
        } catch {
          setError('Nastavenia výkazu sa nepodarilo uložiť.');
        }
      }} />
    </div>
  </details>;
}
