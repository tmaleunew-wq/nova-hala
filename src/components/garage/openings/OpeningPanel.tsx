import { useEffect, useRef } from 'react';
import { ArrowLeft, Trash2, X } from 'lucide-react';
import catalog from '@/config/openingsCatalog.json';
import { fitOpening, type ActiveModalState, type Bay, type Opening } from '@/lib/garage/openingSystem';

export function OpeningIcon({ type }: { type: string }) {
  return <svg viewBox="0 0 80 60" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M8 52V8h64v44M4 52h72" />
    {type !== 'frame' && <path d="M14 51V14h52v37" />}
    {['sectional', 'roller', 'dock'].includes(type) && [22, 30, 38, 46].map(y => <path key={y} d={`M15 ${y}h50`} />)}
    {['window', 'skylight', 'sliding'].includes(type) && <path d="M40 14v37M14 32h52" />}
    {type === 'door' && <path d="M52 14v37M46 34h4" />}
    {type === 'sliding' && <path d="M30 37H19l4-4m-4 4 4 4m27-4h11l-4-4m4 4-4 4" />}
    {type === 'dock' && <path d="M17 52l-5 6h56l-5-6" />}
  </svg>;
}

export function OpeningPanel({ state, bay, error, onState, onSave, onDelete, onClose, suggestedPosition, onSnapToValid }: {
  state: NonNullable<ActiveModalState>; bay: Bay; error?: string;
  onState: (state: NonNullable<ActiveModalState>) => void; onSave: () => void; onDelete: () => void; onClose: () => void;
  suggestedPosition?: { x: number; y: number }; onSnapToValid?: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    root.current?.focus();
    return () => previous?.focus();
  }, []);
  const category = catalog.categories.find(c => c.id === state.draft?.category);
  const validCategory = (c: typeof catalog.categories[number]) => c.roof === bay.roof && c.minWidth <= bay.width - .2 && c.minHeight <= bay.height - .2;
  const selectCategory = (c: typeof catalog.categories[number]) => {
    const isReplacing = state.mode === 'REPLACE' || !!state.targetId || !!state.editingId;
    const targetId = state.targetId ?? state.editingId;
    const initialWidth = Math.min(c.width, bay.width - 0.2);
    const initialHeight = Math.min(c.height, bay.height - 0.2);
    let initialX = (bay.width - initialWidth) / 2;
    if (isReplacing && state.draft) {
      initialX = Math.max(0.15, Math.min(bay.width - initialWidth - 0.15, state.draft.x));
    }
    const initialY = bay.roof
      ? c.sill
      : ['door', 'sectional', 'roller', 'dock'].includes(c.id)
      ? 0
      : c.sill;

    const draft = fitOpening({
      id: crypto.randomUUID(),
      bayId: bay.id,
      category: c.id,
      subtype: c.subtypes[0].id,
      width: initialWidth,
      height: initialHeight,
      x: initialX,
      y: initialY,
      frameColor: '#2b2f36',
      fillColor: ['window', 'skylight'].includes(c.id) ? '#9bb7c7' : '#374151'
    }, bay);

    onState({
      ...state,
      step: 'SUBTYPE',
      mode: isReplacing ? 'REPLACE' : 'ADD',
      draft,
      targetId,
      editingId: targetId
    });
  };
  const update = (partial: Partial<Opening>) => state.draft && onState({ ...state, draft: fitOpening({ ...state.draft, ...partial }, bay) });
  const fields = state.draft && category ? [
    { key: 'width' as const, label: 'Šírka', min: category.minWidth, max: bay.width - .2 },
    { key: 'height' as const, label: bay.roof ? 'Dĺžka' : 'Výška', min: category.minHeight, max: bay.height - .2 },
    { key: 'x' as const, label: 'Odsadenie zľava', min: .1, max: bay.width - state.draft.width - .1 },
    { key: 'y' as const, label: bay.roof ? 'Pozdĺžny posun' : 'Výškový posun / parapet', min: bay.roof ? .1 : 0, max: bay.height - state.draft.height - .1 },
  ] : [];
  return <div ref={root} role="dialog" aria-modal="false" aria-labelledby="opening-panel-title" tabIndex={-1}
    onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } }}
    className="absolute left-3 top-20 z-50 w-[min(360px,calc(100vw-24px))] max-h-[calc(100vh-100px)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 text-slate-900 shadow-2xl select-text">
    <div className="flex items-center justify-between gap-2 mb-3">
      {state.step !== 'CATEGORY' && <button aria-label="Späť" onClick={() => onState({ ...state, step: state.step === 'PARAMETERS' ? 'SUBTYPE' : 'CATEGORY', draft: state.step === 'SUBTYPE' ? undefined : state.draft })}><ArrowLeft size={20} /></button>}
      <h2 id="opening-panel-title" className="font-bold flex-1">Názov: Bay {bay.id}</h2>
      <button aria-label="Zavrieť bez uloženia" onClick={onClose}><X size={20} /></button>
    </div>
    <p className="text-xs text-slate-500 mb-4">{bay.width.toFixed(2)} × {bay.height.toFixed(2)} m · {state.step === 'CATEGORY' ? '1. Kategória' : state.step === 'SUBTYPE' ? '2. Podtyp' : '3. Parametre'}</p>
    {state.step === 'CATEGORY' && <div className="grid grid-cols-2 gap-3">{catalog.categories.filter(c => c.roof === bay.roof).map(c => <button key={c.id} disabled={!validCategory(c)} title={!validCategory(c) ? (c.roof !== bay.roof ? 'Tento typ patrí na inú plochu haly.' : `Vyžaduje aspoň ${c.minWidth} × ${c.minHeight} m a okraj 0,1 m.`) : c.label}
      onClick={() => selectCategory(c)} className="text-xs disabled:opacity-35 disabled:cursor-not-allowed">
      <span className="block rounded-lg bg-sky-700 p-3 text-white mb-1"><OpeningIcon type={c.id} /></span>{c.label}
    </button>)}</div>}
    {state.step === 'SUBTYPE' && category && <div className="grid grid-cols-2 gap-3">{category.subtypes.map(s => <button key={s.id} disabled={!validCategory(category)} title={!validCategory(category) ? 'Prvok sa nezmestí do poľa.' : s.label}
      onClick={() => onState({ ...state, step: 'PARAMETERS', draft: { ...state.draft!, subtype: s.id } })} className="text-xs disabled:opacity-35">
      <span className="block rounded-lg bg-sky-700 p-3 text-white mb-1"><OpeningIcon type={category.id} /></span>{s.label}
    </button>)}</div>}
    {state.step === 'PARAMETERS' && state.draft && <div className="space-y-4">
      {fields.map(f => <label key={f.key} className="block text-sm">{f.label} (m)<div className="flex gap-3 mt-1">
        <input aria-label={`${f.label} posuvník`} type="range" className="min-w-0 flex-1" min={f.min} max={f.max} step={.01} value={state.draft![f.key]} onChange={e => update({ [f.key]: Number(e.target.value) })} />
        <input aria-label={f.label} type="number" className="w-24 border rounded p-1" min={f.min} max={f.max} step={.01} value={Number(state.draft![f.key].toFixed(2))} onChange={e => { const value = e.target.valueAsNumber; if (Number.isFinite(value)) update({ [f.key]: Math.max(f.min, Math.min(f.max, value)) }); }} />
      </div></label>)}
      {(['frameColor', 'fillColor'] as const).map(key => <fieldset key={key}><legend className="text-sm mb-2">{key === 'frameColor' ? 'Farba rámu' : 'Farba výplne'}</legend><div className="grid grid-cols-4 gap-1">{catalog.palette.map(color => <button key={color.name} aria-pressed={state.draft![key] === color.hex} onClick={() => update({ [key]: color.hex })} className={`text-[10px] rounded border p-1 ${state.draft![key] === color.hex ? 'border-sky-600 ring-1 ring-sky-600' : 'border-slate-200'}`}><span className="block h-6 rounded mb-1" style={{ background: color.hex }} />{color.name}</button>)}</div></fieldset>)}
      <button
        type="button"
        className="text-sky-700 hover:text-sky-600 text-sm font-medium flex items-center gap-1 cursor-pointer"
        onClick={() => onState({
          ...state,
          step: 'CATEGORY',
          mode: 'REPLACE',
          targetId: state.targetId ?? state.editingId,
          editingId: state.targetId ?? state.editingId
        })}
      >
        <span>🔄 Zmeniť kategóriu / typ prvku</span>
      </button>
      {error ? (
        <div className="space-y-2 p-3 bg-red-50 border border-red-200 rounded-xl">
          <p role="alert" className="text-xs font-semibold text-red-800 flex items-center gap-1.5">
            <span className="text-sm">⚠️</span> {error}
          </p>
          {onSnapToValid && suggestedPosition && (
            <button
              type="button"
              onClick={onSnapToValid}
              className="w-full text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white py-1.5 px-3 rounded-lg flex items-center justify-center gap-1 transition shadow-sm cursor-pointer"
            >
              ✨ Odporúčaná pozícia bez kolízie ({suggestedPosition.x.toFixed(2)} m, {suggestedPosition.y.toFixed(2)} m)
            </button>
          )}
        </div>
      ) : (
        <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 flex items-center gap-1.5 font-medium">
          <span className="text-emerald-600 font-bold">✓</span> Pozícia je platná (bez kolízie)
        </div>
      )}
      <div className="flex justify-between gap-3">
        <button
          className="bg-sky-700 hover:bg-sky-600 text-white font-semibold rounded-lg px-4 py-2 disabled:opacity-40 transition cursor-pointer"
          disabled={!!error}
          onClick={onSave}
        >
          {state.mode === 'REPLACE' ? 'Nahradiť prvok' : 'Uložiť prvok'}
        </button>
        <button
          className="text-red-700 hover:text-red-600 flex items-center gap-1 font-medium transition cursor-pointer"
          onClick={onDelete}
        >
          <Trash2 size={16} />
          Odstrániť prvok
        </button>
      </div>
    </div>}
  </div>;
}
