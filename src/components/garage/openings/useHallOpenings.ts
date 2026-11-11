import { useEffect, useMemo, useState } from 'react';
import { buildBays, fitOpening, overlaps, type ActiveModalState, type Bay, type Opening } from '@/lib/garage/openingSystem';
import { validateOpening, findNearestValidPosition, calculateStructuralObstacles, type CollisionOpening } from '@/lib/garage/collisionEngine';
import { getTemplateDefaultOpenings, isTemplateDefaultOpening } from '@/lib/garage/templateDefaults';
import type { GarageParams } from '@/lib/garage/types';
import catalog from '@/config/openingsCatalog.json';

export function useHallOpenings(params: GarageParams, templateId: string) {
  const bays = useMemo(() => buildBays(params), [params.width, params.length, params.clearHeight, params.bayCount, params.roofPitchDeg]);
  const defaultOpenings = useMemo(() => getTemplateDefaultOpenings(templateId, params, bays), [templateId, params, bays]);
  const [byTemplate, setByTemplate] = useState<Record<string, Opening[]>>({});
  const [removedByTemplate, setRemovedByTemplate] = useState<Record<string, string[]>>({});
  const [activeModalState, setModal] = useState<ActiveModalState>(null);
  useEffect(() => setModal(null), [templateId, bays]);
  const openings = useMemo(() => {
    const userOpenings = byTemplate[templateId];
    const currentList = userOpenings !== undefined ? userOpenings : defaultOpenings;
    const removedIds = removedByTemplate[templateId] ?? [];
    return currentList
      .filter(o => !removedIds.includes(o.id))
      .flatMap(o => {
        const bay = bays.find(b => b.id === o.bayId);
        return bay ? [fitOpening(o, bay)] : [];
      });
  }, [byTemplate, removedByTemplate, templateId, bays, defaultOpenings]);
  const activeBay = bays.find(b => b.id === activeModalState?.bayId);
  const draft = activeModalState?.draft;
  const category = catalog.categories.find(c => c.id === draft?.category);

  // Central Collision Validation for Draft Opening
  const validation = useMemo(() => {
    if (!draft || !activeBay) return { valid: true, issues: [], nearestValidPosition: undefined };

    // Map other openings in same surface/bay to CollisionOpening
    const sameBayOpenings: CollisionOpening[] = openings
      .filter(o => o.id !== draft.id && o.bayId === draft.bayId)
      .map(o => ({
        id: o.id,
        category: o.category,
        surface: activeBay.surface as any,
        x: o.x,
        y: o.y,
        width: o.width,
        height: o.height,
        label: o.subtype,
      }));

    const candidateCollision: CollisionOpening = {
      id: draft.id,
      category: draft.category,
      subtype: draft.subtype,
      surface: activeBay.surface as any,
      x: draft.x,
      y: draft.y,
      width: draft.width,
      height: draft.height,
      label: draft.subtype,
    };

    const surfaceBounds = { width: activeBay.width, height: activeBay.height };
    // Bay-local column margins at bay edges
    const obstacles = [
      {
        id: `bay-col-left-${activeBay.id}`,
        name: `Oceľový stĺp / okraj poľa (vľavo)`,
        surface: activeBay.surface as any,
        x: 0,
        y: 0,
        width: 0.12,
        height: activeBay.height,
        type: 'COLUMN' as const,
      },
      {
        id: `bay-col-right-${activeBay.id}`,
        name: `Oceľový stĺp / okraj poľa (vpravo)`,
        surface: activeBay.surface as any,
        x: activeBay.width - 0.12,
        y: 0,
        width: 0.12,
        height: activeBay.height,
        type: 'COLUMN' as const,
      },
    ];

    const res = validateOpening(candidateCollision, sameBayOpenings, obstacles, surfaceBounds);
    return res;
  }, [draft, activeBay, openings]);

  const error = draft && activeBay ? (
    category && (draft.width < category.minWidth || draft.height < category.minHeight)
      ? `Prvok je menší ako povolený rozmer (min. ${category.minWidth} × ${category.minHeight} m).`
      : !validation.valid && validation.issues.length > 0
      ? validation.issues[0].message
      : undefined
  ) : undefined;

  const suggestedPosition = validation.nearestValidPosition;

  const snapToValid = () => {
    if (!draft || !suggestedPosition) return;
    setModal(prev => prev ? { ...prev, draft: { ...prev.draft!, x: suggestedPosition.x, y: suggestedPosition.y } } : null);
  };

  const preview = draft && !error ? [...openings.filter(o => o.id !== draft.id), draft] : openings;
  const replacedWindowIds = useMemo(() => {
    const removed = removedByTemplate[templateId] ?? [];
    const modifiedTemplateIds = (byTemplate[templateId] ?? [])
      .filter(o => isTemplateDefaultOpening(o.id))
      .map(o => o.id);
    return [...new Set([...removed, ...modifiedTemplateIds])];
  }, [removedByTemplate, byTemplate, templateId]);

  const surfaces = useMemo(() => {
    const currentList = byTemplate[templateId];
    const removedIds = removedByTemplate[templateId] ?? [];
    const modified = new Set<string>();

    if (currentList) {
      for (const o of currentList) {
        const bay = bays.find(b => b.id === o.bayId);
        if (bay && (!isTemplateDefaultOpening(o.id) || replacedWindowIds.includes(o.id))) {
          modified.add(bay.surface);
        }
      }
    }
    for (const remId of removedIds) {
      const orig = defaultOpenings.find(o => o.id === remId);
      if (orig) {
        const bay = bays.find(b => b.id === orig.bayId);
        if (bay) modified.add(bay.surface);
      }
    }
    if (draft && activeBay) {
      modified.add(activeBay.surface);
    }
    return [...modified];
  }, [byTemplate, defaultOpenings, removedByTemplate, replacedWindowIds, bays, draft, activeBay, templateId]);

  const save = () => {
    if (!draft || error) return;
    const currentList = byTemplate[templateId] ?? defaultOpenings;
    setByTemplate(previous => ({
      ...previous,
      [templateId]: [...currentList.filter(o => o.id !== draft.id), draft]
    }));
    if (isTemplateDefaultOpening(draft.id)) {
      setRemovedByTemplate(previous => ({
        ...previous,
        [templateId]: [...new Set([...(previous[templateId] ?? []), draft.id])]
      }));
    }
    setModal(null);
  };

  const remove = () => {
    const editingId = activeModalState?.editingId;
    if (editingId) {
      if (isTemplateDefaultOpening(editingId)) {
        setRemovedByTemplate(previous => ({
          ...previous,
          [templateId]: [...new Set([...(previous[templateId] ?? []), editingId])]
        }));
      }
      const currentList = byTemplate[templateId] ?? defaultOpenings;
      setByTemplate(previous => ({
        ...previous,
        [templateId]: currentList.filter(o => o.id !== editingId)
      }));
    }
    setModal(null);
  };

  const removeOpening = (opening: Opening) => {
    if (isTemplateDefaultOpening(opening.id)) {
      setRemovedByTemplate(previous => ({
        ...previous,
        [templateId]: [...new Set([...(previous[templateId] ?? []), opening.id])]
      }));
    }
    const currentList = byTemplate[templateId] ?? defaultOpenings;
    setByTemplate(previous => ({
      ...previous,
      [templateId]: currentList.filter(o => o.id !== opening.id)
    }));
    if (activeModalState?.editingId === opening.id) {
      setModal(null);
    }
  };

  const duplicateOpening = (opening: Opening) => {
    const bay = bays.find(b => b.id === opening.bayId);
    if (!bay) return;
    const currentList = byTemplate[templateId] ?? defaultOpenings;
    const currentOpenings = currentList.filter(o => !(removedByTemplate[templateId] ?? []).includes(o.id));

    let newX = opening.x + opening.width + 0.35;
    if (newX + opening.width > bay.width - 0.15) {
      newX = Math.max(0.15, opening.x - opening.width - 0.35);
    }
    const duplicated: Opening = fitOpening({
      ...opening,
      id: crypto.randomUUID(),
      x: newX,
    }, bay);

    // Collision check before committing duplicate
    const sameBay = currentOpenings.filter(o => o.bayId === bay.id).map(o => ({
      id: o.id,
      category: o.category,
      surface: bay.surface as any,
      x: o.x,
      y: o.y,
      width: o.width,
      height: o.height,
      label: o.subtype,
    }));
    const surfaceBounds = { width: bay.width, height: bay.height };
    const obstacles = [
      { id: `bay-col-left-${bay.id}`, name: 'Stĺp vľavo', surface: bay.surface as any, x: 0, y: 0, width: 0.12, height: bay.height, type: 'COLUMN' as const },
      { id: `bay-col-right-${bay.id}`, name: 'Stĺp vpravo', surface: bay.surface as any, x: bay.width - 0.12, y: 0, width: 0.12, height: bay.height, type: 'COLUMN' as const },
    ];
    const val = validateOpening({ ...duplicated, surface: bay.surface as any }, sameBay, obstacles, surfaceBounds);
    const finalPlaced = val.valid
      ? duplicated
      : val.nearestValidPosition
      ? fitOpening({ ...duplicated, x: val.nearestValidPosition.x, y: val.nearestValidPosition.y }, bay)
      : null;

    if (finalPlaced) {
      setByTemplate(previous => ({
        ...previous,
        [templateId]: [...currentOpenings, finalPlaced]
      }));
    }
  };

  const addAtCoords = (bay: Bay, categoryId: string, coords?: { x: number; y: number }) => {
    const c = catalog.categories.find(item => item.id === categoryId) || catalog.categories[0];
    const initialWidth = c.width;
    const initialHeight = c.height;
    let initialX = coords ? coords.x - initialWidth / 2 : (bay.width - initialWidth) / 2;
    let initialY = bay.roof
      ? (coords ? coords.y - initialHeight / 2 : c.sill)
      : (['door', 'sectional', 'roller', 'dock'].includes(c.id) ? 0 : (coords ? coords.y - initialHeight / 2 : c.sill));
    initialX = Math.max(0.15, Math.min(bay.width - initialWidth - 0.15, initialX));
    initialY = Math.max(bay.roof ? 0.1 : 0, Math.min(bay.height - initialHeight - 0.1, initialY));

    const newDraft: Opening = fitOpening({
      id: crypto.randomUUID(),
      bayId: bay.id,
      category: c.id,
      subtype: c.subtypes[0].id,
      width: initialWidth,
      height: initialHeight,
      x: initialX,
      y: initialY,
      frameColor: '#2b2f36',
      fillColor: ['window', 'skylight'].includes(c.id) ? '#9bb7c7' : '#9da3a6'
    }, bay);
    setModal({ bayId: bay.id, step: 'PARAMETERS', draft: newDraft });
  };

  return { bays, openings, preview, surfaces, replacedWindowIds, activeBay, activeModalState, setModal, error, save, remove,
    suggestedPosition, snapToValid, validation,
    add: (bay: Bay) => setModal({ bayId: bay.id, step: 'CATEGORY' }),
    edit: (opening: Opening) => setModal({ bayId: opening.bayId, step: 'PARAMETERS', draft: { ...opening }, editingId: opening.id }),
    addAtCoords, duplicateOpening, removeOpening,
  };
}
