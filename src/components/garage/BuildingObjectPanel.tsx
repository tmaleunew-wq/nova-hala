import { useEffect, useState } from 'react';
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

export function BuildingObjectPanel({ objects, selectedId, params, openings, catalog, onSelect, onUpdate, onAdd }: {
  objects: BuildingObject[]; selectedId: string; params: GarageParams; openings: Opening[]; catalog: MaterialCatalog;
  onSelect: (id: string) => void; onUpdate: (id: string, patch: BuildingObjectPatch) => void;
  onAdd: (object: BuildingObject) => void;
}) {
  const object = objects.find(item => item.id === selectedId);
  const [positions, setPositions] = useState('');
  const [positionError, setPositionError] = useState('');
  const [newType, setNewType] = useState<'canopy' | 'office_annex' | 'storage_annex'>('canopy');
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
    <div className="space-y-1" role="list" aria-label="Objekty projektu">
      {objects.map(item => <button key={item.id} type="button" data-object-id={item.id}
        aria-pressed={selectedId === item.id} onClick={() => onSelect(selectedId === item.id ? '' : item.id)}
        className={`block w-full text-left rounded px-3 py-2 ${selectedId === item.id ? 'bg-sky-500/25 border border-sky-400 text-sky-100' : 'bg-white/5 border border-transparent hover:bg-white/10'}`}>
        {item.parentId ? '↳ ' : ''}{item.name}{warnings.some(warning => warning.objectId === item.id) ? ' ⚠' : ''}
      </button>)}
    </div>
    <div className="flex gap-2">
      <select aria-label="Typ nového objektu" className={control} value={newType} onChange={event => setNewType(event.target.value as typeof newType)}>
        <option value="canopy">Prístrešok</option><option value="office_annex">Kancelárska prístavba</option><option value="storage_annex">Skladová prístavba</option>
      </select>
      <button type="button" className="rounded bg-sky-600 px-3 hover:bg-sky-500" onClick={() => {
        const main = objects.find(item => item.type === 'main_hall');
        if (main) onAdd(createBuildingObject(newType, main.id));
      }}>Pridať</button>
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
