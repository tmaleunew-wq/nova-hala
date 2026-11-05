import { useEffect, useMemo, useState } from 'react';
import { buildBays, fitOpening, overlaps, type ActiveModalState, type Bay, type Opening } from '@/lib/garage/openingSystem';
import type { GarageParams } from '@/lib/garage/types';
import catalog from '@/config/openingsCatalog.json';

export function useHallOpenings(params: GarageParams, templateId: string) {
  const bays = useMemo(() => buildBays(params), [params.width, params.length, params.clearHeight, params.bayCount, params.roofPitchDeg]);
  const [byTemplate, setByTemplate] = useState<Record<string, Opening[]>>({});
  const [activeModalState, setModal] = useState<ActiveModalState>(null);
  useEffect(() => setModal(null), [templateId, bays]);
  const openings = useMemo(() => (byTemplate[templateId] ?? []).flatMap(o => {
    const bay = bays.find(b => b.id === o.bayId);
    return bay ? [fitOpening(o, bay)] : [];
  }), [byTemplate, templateId, bays]);
  const activeBay = bays.find(b => b.id === activeModalState?.bayId);
  const draft = activeModalState?.draft;
  const category = catalog.categories.find(c => c.id === draft?.category);
  const error = draft && activeBay ? (
    category && (draft.width < category.minWidth || draft.height < category.minHeight) ? 'Prvok je menší ako povolený rozmer.' :
    openings.some(o => o.id !== draft.id && o.bayId === draft.bayId && overlaps(o, draft)) ? 'Prvok sa prekrýva s iným otvorom. Upravte rozmery alebo pozíciu.' : undefined
  ) : undefined;
  const preview = draft && !error ? [...openings.filter(o => o.id !== draft.id), draft] : openings;
  const surfaces = [...new Set(preview.map(o => bays.find(b => b.id === o.bayId)!.surface))];
  const save = () => {
    if (!draft || error) return;
    setByTemplate(previous => ({ ...previous, [templateId]: [...openings.filter(o => o.id !== draft.id), draft] }));
    setModal(null);
  };
  const remove = () => {
    if (activeModalState?.editingId) setByTemplate(previous => ({ ...previous, [templateId]: openings.filter(o => o.id !== activeModalState.editingId) }));
    setModal(null);
  };
  return { bays, openings, preview, surfaces, activeBay, activeModalState, setModal, error, save, remove,
    add: (bay: Bay) => setModal({ bayId: bay.id, step: 'CATEGORY' }),
    edit: (opening: Opening) => setModal({ bayId: opening.bayId, step: 'PARAMETERS', draft: { ...opening }, editingId: opening.id }),
  };
}
