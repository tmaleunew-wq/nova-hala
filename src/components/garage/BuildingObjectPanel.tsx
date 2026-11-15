import { useEffect, useState } from 'react';
import { Copy, Trash2 } from 'lucide-react';
import type { GarageParams } from '@/lib/garage/types';
import type { Opening } from '@/lib/garage/openingSystem';
import { createBuildingObject, getBuildingObjectGeometry, validateBuildingObjects, type BuildingObject, type BuildingObjectPatch } from '@/lib/garage/buildingObjects';
import type { MaterialCatalog } from '@/lib/materials/catalog';

const control = 'w-full rounded border border-white/20 bg-slate-950 px-2 py-1.5 text-white';

function NumberField({ label, value, onChange, min, max, step = 0.1 }: {
  label: string; value: number; onChange: (value: number) => void; min?: number; max?: number; step?: number;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(Math.round(value * 10000) / 10000)), [value]);
  const commit = () => {
    const number = Number(draft.replace(',', '.'));
    if (!draft.trim() || !Number.isFinite(number) || (min !== undefined && number < min) || (max !== undefined && number > max)) {
      setDraft(String(value));
      return;
    }
    if (number !== value) onChange(number);
  };
  return <label className="block space-y-1"><span>{label}</span>
    <input className={control} aria-label={label} type="number" min={min} max={max} step={step} value={draft}
      onChange={event => setDraft(event.target.value)} onBlur={commit}
      onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); }} />
  </label>;
}

export function BuildingObjectPanel({ objects, selectedId, params, openings, catalog, onSelect, onUpdate, onAdd, onDelete, onDuplicate }: {
  objects: BuildingObject[]; selectedId: string; params: GarageParams; openings: Opening[]; catalog: MaterialCatalog;
  onSelect: (id: string) => void; onUpdate: (id: string, patch: BuildingObjectPatch) => void;
  onAdd: (object: BuildingObject) => void;
  onDelete?: (id: string) => void;
  onDuplicate?: (id: string) => void;
}) {
  const object = objects.find(item => item.id === selectedId);
  const [positions, setPositions] = useState('');
  const [positionError, setPositionError] = useState('');
  const [newType, setNewType] = useState<'canopy' | 'office_annex' | 'storage_annex'>('canopy');
  const [deletingObject, setDeletingObject] = useState<BuildingObject | null>(null);

  useEffect(() => {
    setPositions(object?.parameters.columnPositions?.join('; ') ?? '');
    setPositionError('');
  }, [object?.id, object?.parameters.columnPositions]);
  const warnings = validateBuildingObjects(objects, params, openings);
  const selectedWarnings = warnings.filter(warning => warning.objectId === selectedId);
  const attached = object && object.type !== 'main_hall' ? object : undefined;
  const geometry = attached ? getBuildingObjectGeometry(attached, objects, params) : undefined;
  const update = (patch: BuildingObjectPatch) => attached && onUpdate(attached.id, patch);
  const applyPositions = () => {
    if (!positions.trim()) {
      update({ parameters: { columnPositions: undefined } });
      setPositionError('');
      return;
    }
    const values = positions.split(/[;\s]+/).filter(Boolean).map(value => Number(value.replace(',', '.')));
    if (values.length < 2 || values.length > 100 || values.some((value, index) => !Number.isFinite(value) || value < 0 || value > (attached?.parameters.length ?? 0) || (index > 0 && value <= values[index - 1]))) {
      setPositionError('Zadajte 2 až 100 rastúcich polôh v rozsahu dĺžky objektu.');
      return;
    }
    update({ parameters: { columnPositions: values, columnCount: values.length } });
    setPositionError('');
  };
  return <section data-testid="building-object-panel" className="space-y-3 border-b border-white/15 pb-4">
    <h2 className="font-semibold text-sm text-sky-300">Objekty projektu</h2>
    <div className="space-y-1.5" role="list" aria-label="Objekty projektu">
      {objects.map(item => {
        const isMain = item.type === 'main_hall';
        const isSelected = selectedId === item.id;
        const hasWarning = warnings.some(w => w.objectId === item.id);
        return (
          <div
            key={item.id}
            data-object-id={item.id}
            className={`flex items-center justify-between gap-1 rounded-lg px-2.5 py-1.5 transition ${
              isSelected
                ? 'bg-sky-500/20 border border-sky-400 text-sky-100 shadow-[0_0_10px_rgba(14,165,233,0.15)]'
                : 'bg-white/5 border border-white/10 hover:bg-white/10 text-slate-200'
            }`}
          >
            <button
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSelect(isSelected ? '' : item.id)}
              className="flex-1 text-left truncate flex items-center gap-1.5 cursor-pointer text-xs font-medium py-0.5"
            >
              {item.parentId ? <span className="text-slate-400">↳</span> : null}
              <span className="truncate">{item.name}</span>
              {hasWarning && <span title="Objekt má varovania geometrie alebo kolízie" className="text-amber-400">⚠</span>}
            </button>
            <div className="flex items-center gap-1 shrink-0">
              {isMain ? (
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-400/20">
                  Hlavná
                </span>
              ) : (
                <>
                  <button
                    type="button"
                    title={`Duplikovať objekt ${item.name}`}
                    aria-label={`Duplikovať ${item.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onDuplicate) onDuplicate(item.id);
                    }}
                    className="p-1 rounded text-slate-400 hover:text-sky-300 hover:bg-sky-500/20 transition cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    title={`Odstrániť objekt ${item.name}`}
                    aria-label={`Odstrániť ${item.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeletingObject(item);
                    }}
                    className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>

    {deletingObject && (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-object-title"
      >
        <div className="w-full max-w-sm rounded-xl border border-white/20 bg-slate-900 p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center gap-2 text-rose-400">
            <Trash2 className="w-5 h-5 shrink-0" />
            <h3 id="delete-object-title" className="font-bold text-sm text-white">
              Odstrániť objekt
            </h3>
          </div>
          <p className="text-xs text-slate-200">
            Naozaj chcete odstrániť objekt <strong>{deletingObject.name}</strong>?
          </p>
          {objects.some(o => o.parentId === deletingObject.id) && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-[11px] text-amber-200">
              <span className="font-semibold block mb-0.5">Upozornenie:</span>
              Tento objekt má závislé stavebné časti ({objects.filter(o => o.parentId === deletingObject.id).map(o => o.name).join(', ')}), ktoré budú taktiež odstránené.
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setDeletingObject(null)}
              className="rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/10 cursor-pointer"
            >
              Zrušiť
            </button>
            <button
              type="button"
              onClick={() => {
                const id = deletingObject.id;
                setDeletingObject(null);
                if (onDelete) onDelete(id);
              }}
              className="rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-500 cursor-pointer shadow-lg shadow-rose-600/30"
            >
              Odstrániť
            </button>
          </div>
        </div>
      </div>
    )}

    <div className="flex gap-2">
      <select aria-label="Typ nového objektu" className={control} value={newType} onChange={event => setNewType(event.target.value as typeof newType)}>
        <option value="canopy">Prístrešok</option><option value="office_annex">Kancelárska prístavba</option><option value="storage_annex">Skladová prístavba</option>
      </select>
      <button
        type="button"
        className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-sky-500 cursor-pointer transition shrink-0"
        onClick={() => {
          const main = objects.find(item => item.type === 'main_hall');
          if (main) {
            const sameTypeCount = objects.filter(item => item.type === newType).length;
            const baseNames: Record<typeof newType, string> = {
              canopy: 'Prístrešok',
              office_annex: 'Kancelárska prístavba',
              storage_annex: 'Skladová prístavba',
            };
            const defaultSide: BuildingObject['attachment']['side'] = newType === 'canopy' ? 'left' : 'right';
            const name = sameTypeCount > 0 ? `${baseNames[newType]} ${sameTypeCount + 1}` : `${baseNames[newType]} 1`;

            const testSides: BuildingObject['attachment']['side'][] = [defaultSide, defaultSide === 'left' ? 'right' : 'left', 'front', 'back'];
            let bestSide = defaultSide;
            let bestOffset = 0;

            for (const s of testSides) {
              const maxL = ['left', 'right'].includes(s) ? params.length : params.width;
              const existingOnSide = objects.filter(o => o.type !== 'main_hall' && o.attachment.side === s);
              if (existingOnSide.length === 0) {
                bestSide = s;
                bestOffset = 0;
                break;
              }
              const maxEnd = Math.max(...existingOnSide.map(o => o.attachment.offset + o.parameters.length));
              if (maxEnd + 5 <= maxL) {
                bestSide = s;
                bestOffset = maxEnd + 0.5;
                break;
              }
            }

            const newObj = createBuildingObject(newType, main.id, {
              name,
              attachment: { side: bestSide, offset: bestOffset },
            });
            onAdd(newObj);
          }
        }}
      >
        Pridať
      </button>
    </div>
    {attached && geometry && <div className="space-y-3" data-testid="attachment-editor">
      <h3 className="font-semibold text-sm">{attached.name}</h3>
      <label className="block space-y-1">Názov objektu<input aria-label="Názov objektu" className={control} value={attached.name} onChange={event => update({ name: event.target.value })} /></label>
      <div className="grid grid-cols-2 gap-2">
        <NumberField label="Šírka prístavby (m)" value={attached.parameters.width} min={0.2} max={100} onChange={width => update({ parameters: { width } })} />
        <NumberField label="Dĺžka prístavby (m)" value={attached.parameters.length} min={0.2} max={500} onChange={length => update({ parameters: { length } })} />
        <NumberField label="Výška napojenia (m)" value={geometry.innerHeight} min={0.2} max={100} onChange={innerHeight => update({ parameters: { innerHeight }, attachment: { heightMode: 'fixed' } })} />
        <NumberField label="Vonkajšia výška (m)" value={geometry.outerHeight} min={0.2} max={100} onChange={outerHeight => update({ parameters: { outerHeight } })} />
        <NumberField label="Sklon strechy (°)" value={attached.parameters.roofPitchDeg} min={0} max={60} onChange={roofPitchDeg => update({ parameters: { roofPitchDeg } })} />
        <NumberField label="Odsadenie od rohu (m)" value={attached.attachment.offset} min={0} max={500} onChange={offset => update({ attachment: { offset } })} />
      </div>
      <label className="block space-y-1">Strana pripojenia<select aria-label="Strana pripojenia" className={control} value={attached.attachment.side} onChange={event => update({ attachment: { side: event.target.value as BuildingObject['attachment']['side'] } })}>
        <option value="left">Ľavá</option><option value="right">Pravá</option><option value="front">Predná</option><option value="back">Zadná</option>
      </select></label>
      <p className="text-slate-400">Odsadenie sa meria po obvode budovy od začiatku zvolenej steny.</p>
      <label className="flex items-start gap-2"><input type="checkbox" checked={attached.attachment.heightMode === 'follow_parent'} onChange={event => update({ attachment: {
        heightMode: event.target.checked ? 'follow_parent' : 'fixed', heightOffset: geometry.innerHeight - params.clearHeight,
      }, parameters: { innerHeight: geometry.innerHeight, outerHeight: geometry.outerHeight } })} />Prispôsobovať výšku napojenia výške haly</label>
      {attached.attachment.heightMode === 'follow_parent' && <NumberField label="Výškový rozdiel voči hale (m)" value={attached.attachment.heightOffset} min={-100} max={100} onChange={heightOffset => update({ attachment: { heightOffset } })} />}
      <label className="block space-y-1">Strešná krytina<select aria-label="Strešná krytina prístavby" className={control} value={attached.parameters.roofProductId ?? ''} onChange={event => update({ parameters: { roofProductId: event.target.value || undefined } })}>
        <option value="">Neurčený výrobok</option>{catalog.panels.filter(panel => panel.usage === 'roof').map(panel => <option key={panel.id} value={panel.id}>{panel.name}</option>)}
      </select></label>
      <div className="grid grid-cols-2 gap-2">
        <label>Farba strechy<input aria-label="Farba strechy prístavby" type="color" className="block w-full h-8" value={attached.parameters.roofColor} onChange={event => update({ parameters: { roofColor: event.target.value } })} /></label>
        <label>Farba stien<input aria-label="Farba stien prístavby" type="color" className="block w-full h-8" value={attached.parameters.wallColor} onChange={event => update({ parameters: { wallColor: event.target.value } })} /></label>
      </div>
      <NumberField label="Počet stĺpov" value={attached.parameters.columnCount} min={2} max={100} step={1} onChange={columnCount => update({ parameters: { columnCount: Math.round(columnCount), columnPositions: undefined } })} />
      <label className="block space-y-1">Vlastné polohy stĺpov (m)<input aria-label="Vlastné polohy stĺpov (m)" className={control} value={positions} placeholder="0; 6; 12" onChange={event => setPositions(event.target.value)} onBlur={applyPositions} onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); }} /></label>
      <p className="text-slate-400">Prázdne pole použije rovnomerné rozostupy. Polohy sú od začiatku prístavby.</p>
      {positionError && <p role="alert" className="text-amber-300">{positionError}</p>}
      {(['column', 'rafter', 'purlin'] as const).map(role => <label key={role} className="block space-y-1">
        {({ column: 'Profil stĺpov', rafter: 'Profil priečlí', purlin: 'Profil väzníc' })[role]}
        <select aria-label={`Profil ${role}`} className={control} value={attached.profileAssignments[role] ?? ''} onChange={event => update({ profileAssignments: { [role]: event.target.value || undefined } })}>
          <option value="">Vyžaduje návrh</option>{catalog.steelProfiles.map(profile => <option key={profile.id} value={profile.id}>{profile.designation}</option>)}
        </select>
      </label>)}
      <fieldset className="space-y-1"><legend className="font-semibold mb-1">Bočné uzatvorenie</legend>
        {(['outer', 'front', 'back'] as const).map(side => <label key={side} className="flex items-center gap-2"><input type="checkbox" aria-label={`Uzatvorenie ${side}`} checked={attached.closures[side]} onChange={event => update({ closures: { [side]: event.target.checked } })} />{({ outer: 'Vonkajšia stena', front: 'Začiatok prístavby', back: 'Koniec prístavby' })[side]}</label>)}
      </fieldset>
      <fieldset className="space-y-1"><legend className="font-semibold mb-1">Doplnky</legend>
        {(['gutter', 'downpipe'] as const).map(key => <label key={key} className="flex items-center gap-2"><input type="checkbox" aria-label={`Doplnok ${key}`} checked={attached.accessories[key]} onChange={event => update({ accessories: { [key]: event.target.checked } })} />{key === 'gutter' ? 'Žľab vonkajšej hrany' : 'Zvod'}</label>)}
      </fieldset>
      <p className="text-slate-400">Geometrická kontrola nenahrádza statické posúdenie.</p>
    </div>}
    {selectedWarnings.length > 0 && <ul className="space-y-1 text-amber-300" role="status">{selectedWarnings.map((warning, index) => <li key={`${warning.code}-${index}`}>{warning.message}</li>)}</ul>}
  </section>;
}
