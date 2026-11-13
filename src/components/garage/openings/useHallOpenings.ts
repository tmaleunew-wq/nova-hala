import { useEffect, useMemo, useState } from 'react';
import { buildBays, fitOpening, overlaps, type ActiveModalState, type Bay, type Opening } from '@/lib/garage/openingSystem';
import { validateOpening, findNearestValidPosition, calculateStructuralObstacles, type CollisionOpening } from '@/lib/garage/collisionEngine';
import { getTemplateDefaultOpenings, isTemplateDefaultOpening } from '@/lib/garage/templateDefaults';
import type { GarageParams } from '@/lib/garage/types';
import catalog from '@/config/openingsCatalog.json';
import { getProjectRemovedOpeningIds, type MaterialProjectInput } from '@/lib/materials/project';

export function useHallOpenings(params: GarageParams, templateId: string, initialProject?: MaterialProjectInput | null) {
  const bays = useMemo(() => buildBays(params), [params.width, params.length, params.clearHeight, params.bayCount, params.roofPitchDeg]);
  const defaultOpenings = useMemo(() => getTemplateDefaultOpenings(templateId, params, bays), [templateId, params, bays]);
  const [byTemplate, setByTemplate] = useState<Record<string, Opening[]>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const saved = localStorage.getItem('vbau_hall_openings_state_v1');
      const state = saved ? JSON.parse(saved) : {};
      if (initialProject) {
        if (initialProject.openings !== undefined) state[initialProject.templateId] = initialProject.openings.map(opening => ({ ...opening }));
        else delete state[initialProject.templateId];
      }
      return state;
    } catch {
      return {};
    }
  });
  const [removedByTemplate, setRemovedByTemplate] = useState<Record<string, string[]>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const saved = localStorage.getItem('vbau_hall_removed_openings_v1');
      const state = saved ? JSON.parse(saved) : {};
      if (initialProject) state[initialProject.templateId] = getProjectRemovedOpeningIds(initialProject);
      return state;
    } catch {
      return {};
    }
  });
  const [activeModalState, setModal] = useState<ActiveModalState>(null);
  const restoreProject = (project: MaterialProjectInput) => {
    setModal(null);
    setByTemplate(previous => {
      const next = { ...previous };
      if (project.openings !== undefined) next[project.templateId] = project.openings.map(opening => ({ ...opening }));
      else delete next[project.templateId];
      return next;
    });
    setRemovedByTemplate(previous => ({ ...previous, [project.templateId]: getProjectRemovedOpeningIds(project) }));
  };
  useEffect(() => setModal(null), [templateId, bays]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('vbau_hall_openings_state_v1', JSON.stringify(byTemplate));
    } catch {}
  }, [byTemplate]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('vbau_hall_removed_openings_v1', JSON.stringify(removedByTemplate));
    } catch {}
  }, [removedByTemplate]);
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

    const targetId = activeModalState?.targetId ?? activeModalState?.editingId;
    // Map other openings in same surface/bay to CollisionOpening.
    // When UPDATE or REPLACE, the element being updated or replaced (targetId) is NOT an obstacle!
    const sameBayOpenings: CollisionOpening[] = openings
      .filter(o => o.id !== draft.id && o.id !== targetId && o.bayId === draft.bayId)
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
  }, [draft, activeBay, openings, activeModalState?.targetId, activeModalState?.editingId]);

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
  // A replacement preview occupies the target's place.
  const previewTargetId = activeModalState?.targetId ?? activeModalState?.editingId;
  if (draft && !error && previewTargetId && previewTargetId !== draft.id) {
    const targetIndex = preview.findIndex(o => o.id === previewTargetId);
    if (targetIndex >= 0) preview.splice(targetIndex, 1);
  }
  const replacedWindowIds = useMemo(() => {
    const removed = removedByTemplate[templateId] ?? [];
    const modifiedTemplateIds = (byTemplate[templateId] ?? [])
      .filter(o => {
        if (!isTemplateDefaultOpening(o.id)) return false;
        const orig = defaultOpenings.find(d => d.id === o.id);
        if (!orig) return true;
        return (
          Math.abs(orig.x - o.x) > 0.001 ||
          Math.abs(orig.y - o.y) > 0.001 ||
          Math.abs(orig.width - o.width) > 0.001 ||
          Math.abs(orig.height - o.height) > 0.001 ||
          orig.category !== o.category ||
          orig.subtype !== o.subtype
        );
      })
      .map(o => o.id);
    return [...new Set([...removed, ...modifiedTemplateIds])];
  }, [removedByTemplate, byTemplate, templateId, defaultOpenings]);

  const logOperation = (actionType: 'ADD' | 'UPDATE' | 'REPLACE' | 'DELETE', payload: {
    elementId?: string;
    targetId?: string;
    bayId?: string;
    countBefore: number;
    countAfter: number;
    valid: boolean;
    confirmed: boolean;
    saved: boolean;
    issues?: any[];
  }) => {
    console.log(`[DIAGNOSTIKA-OTVORY] ${actionType}:`, {
      actionType,
      projectId: templateId,
      wallId: payload.bayId,
      elementId: payload.elementId,
      targetId: payload.targetId,
      countBefore: payload.countBefore,
      countAfter: payload.countAfter,
      validationResult: payload.valid ? 'VALID' : 'INVALID',
      confirmed: payload.confirmed,
      saved: payload.saved,
      issues: payload.issues || [],
      timestamp: new Date().toISOString(),
    });
  };

  const surfaces = useMemo(() => {
    const currentList = byTemplate[templateId];
    const removedIds = removedByTemplate[templateId] ?? [];
    const modified = new Set<string>();

    if (currentList) {
      for (const o of currentList) {
        const bay = bays.find(b => b.id === o.bayId);
        if (!bay) continue;
        if (!isTemplateDefaultOpening(o.id) || replacedWindowIds.includes(o.id)) {
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

  const replaceOpening = (existingId: string, replacement: Opening) => {
    const beforeCount = openings.length;
    // Updating the same ID must keep that ID visible.
    if (existingId === replacement.id) {
      setByTemplate(previous => ({
        ...previous,
        [templateId]: (previous[templateId] ?? defaultOpenings).map(o =>
          o.id === existingId ? replacement : o),
      }));
      setRemovedByTemplate(previous => ({
        ...previous,
        [templateId]: (previous[templateId] ?? []).filter(id => id !== existingId),
      }));
      return;
    }
    setRemovedByTemplate(previous => ({
      ...previous,
      [templateId]: [...new Set([...(previous[templateId] ?? []), existingId])]
    }));
    setByTemplate(previous => {
      const currentList = previous[templateId] ?? defaultOpenings;
      const filtered = currentList.filter(o => o.id !== existingId && o.id !== replacement.id);
      const nextList = [...filtered, replacement];
      logOperation('REPLACE', {
        elementId: replacement.id,
        targetId: existingId,
        bayId: replacement.bayId,
        countBefore: beforeCount,
        countAfter: nextList.length,
        valid: true,
        confirmed: true,
        saved: true,
      });
      return {
        ...previous,
        [templateId]: nextList
      };
    });
  };

  const save = () => {
    if (!draft || error) {
      logOperation(activeModalState?.mode ?? 'ADD', {
        elementId: draft?.id,
        targetId: activeModalState?.targetId,
        bayId: draft?.bayId,
        countBefore: openings.length,
        countAfter: openings.length,
        valid: false,
        confirmed: false,
        saved: false,
        issues: validation.issues,
      });
      return;
    }
    const targetId = activeModalState?.targetId ?? activeModalState?.editingId;
    const mode = activeModalState?.mode ?? 'ADD';
    const beforeCount = openings.length;

    if (targetId && (mode === 'REPLACE' || mode === 'UPDATE' || targetId !== draft.id)) {
      replaceOpening(targetId, draft);
    } else {
      setByTemplate(previous => {
        const currentList = previous[templateId] ?? defaultOpenings;
        const nextList = [...currentList.filter(o => o.id !== draft.id), draft];
        logOperation('ADD', {
          elementId: draft.id,
          bayId: draft.bayId,
          countBefore: beforeCount,
          countAfter: nextList.length,
          valid: true,
          confirmed: true,
          saved: true,
        });
        return {
          ...previous,
          [templateId]: nextList
        };
      });
      if (isTemplateDefaultOpening(draft.id)) {
        setRemovedByTemplate(previous => ({
          ...previous,
          [templateId]: [...new Set([...(previous[templateId] ?? []), draft.id])]
        }));
      }
    }
    setModal(null);
  };

  const remove = () => {
    const targetId = activeModalState?.targetId ?? activeModalState?.editingId;
    if (targetId) {
      const beforeCount = openings.length;
      setRemovedByTemplate(previous => ({
        ...previous,
        [templateId]: [...new Set([...(previous[templateId] ?? []), targetId])]
      }));
      setByTemplate(previous => {
        const currentList = previous[templateId] ?? defaultOpenings;
        const nextList = currentList.filter(o => o.id !== targetId);
        logOperation('DELETE', {
          elementId: targetId,
          bayId: activeModalState?.bayId,
          countBefore: beforeCount,
          countAfter: nextList.length,
          valid: true,
          confirmed: true,
          saved: true,
        });
        return {
          ...previous,
          [templateId]: nextList
        };
      });
    }
    setModal(null);
  };

  const removeOpening = (opening: Opening) => {
    const beforeCount = openings.length;
    setRemovedByTemplate(previous => ({
      ...previous,
      [templateId]: [...new Set([...(previous[templateId] ?? []), opening.id])]
    }));
    setByTemplate(previous => {
      const currentList = previous[templateId] ?? defaultOpenings;
      const nextList = currentList.filter(o => o.id !== opening.id);
      logOperation('DELETE', {
        elementId: opening.id,
        bayId: opening.bayId,
        countBefore: beforeCount,
        countAfter: nextList.length,
        valid: true,
        confirmed: true,
        saved: true,
      });
      return {
        ...previous,
        [templateId]: nextList
      };
    });
    if (activeModalState?.targetId === opening.id || activeModalState?.editingId === opening.id) {
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
    if (draft) {
      if (error) return;
      save();
    }
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
    setModal({ bayId: bay.id, step: 'PARAMETERS', mode: 'ADD', draft: newDraft });
  };

  const moveOpening = (id: string, coords: { x: number; y: number }) => {
    if (draft) return;
    const opening = openings.find(o => o.id === id);
    const bay = bays.find(b => b.id === opening?.bayId);
    if (!opening || !bay) return;
    const moved = fitOpening({ ...opening, ...coords }, bay);
    const others = openings.filter(o => o.id !== id && o.bayId === bay.id)
      .map(o => ({ ...o, surface: bay.surface as CollisionOpening['surface'] }));
    const surface = bay.surface as CollisionOpening['surface'];
    const obstacles = [
      { id: 'left-column', name: 'Ľavý stĺp', surface, x: 0, y: 0, width: .12, height: bay.height, type: 'COLUMN' as const },
      { id: 'right-column', name: 'Pravý stĺp', surface, x: bay.width - .12, y: 0, width: .12, height: bay.height, type: 'COLUMN' as const },
    ];
    if (!validateOpening({ ...moved, surface }, others, obstacles, { width: bay.width, height: bay.height }).valid) return;
    setByTemplate(previous => ({
      ...previous,
      [templateId]: (previous[templateId] ?? defaultOpenings).map(o => o.id === id ? moved : o),
    }));
  };

  const startAdd = (bay: Bay, coords?: { x: number; y: number }) => {
    if (draft) {
      if (error) return;
      save();
    }
    setModal({ bayId: bay.id, step: 'CATEGORY', mode: 'ADD', coords });
  };

  const previewReplacedIds = draft && !error
    ? [...new Set([...replacedWindowIds, ...[previewTargetId, draft.id].filter((id): id is string => !!id)])]
    : replacedWindowIds;

  return {
    bays,
    openings,
    preview,
    surfaces,
    replacedWindowIds: previewReplacedIds,
    confirmedReplacedWindowIds: replacedWindowIds,
    restoreProject,
    activeBay,
    activeModalState,
    setModal,
    error,
    save,
    remove,
    replaceOpening,
    suggestedPosition,
    snapToValid,
    validation,
    add: startAdd,
    edit: (opening: Opening) => setModal({
      bayId: opening.bayId,
      step: 'PARAMETERS',
      mode: 'UPDATE',
      draft: { ...opening },
      editingId: opening.id,
      targetId: opening.id,
      originalOpening: { ...opening }
    }),
    replace: (opening: Opening) => setModal({
      bayId: opening.bayId,
      step: 'CATEGORY',
      mode: 'REPLACE',
      draft: { ...opening },
      editingId: opening.id,
      targetId: opening.id,
      originalOpening: { ...opening }
    }),
    addAtCoords,
    duplicateOpening,
    moveOpening,
    removeOpening,
  };
}
