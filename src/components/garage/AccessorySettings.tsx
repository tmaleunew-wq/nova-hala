import { useEffect, useState } from 'react';
import { resolveAccessoryConfig } from '@/lib/materials/accessories';

const control='rounded border border-white/15 bg-slate-950 px-2 py-1.5 text-white';
export function AccessorySettings({value,onChange}:{value:unknown;onChange?:(value:unknown)=>void}) {
  const [text,setText]=useState('');
  const [message,setMessage]=useState('');
  useEffect(()=>{setText(JSON.stringify(value??resolveAccessoryConfig(),null,2));},[value]);
  if(!onChange)return null;
  return <details className="rounded-lg border border-white/10 p-3">
    <summary className="cursor-pointer font-semibold">Lišty a rebrík · nastavenie projektu</summary>
    <p className="my-2 text-xs text-slate-300">Predpoklad líšt: skladová dĺžka 3 m a presah 0,1 m. V JSON možno meniť každý typ osobitne: ridge = hrebeň, eave = odkvap, verge = štítový okraj, corner = roh, base = sokel, opening = otvor. stockLengthM je dĺžka kusu, overlapM presah a kgPerM hmotnosť. Neznáma hmotnosť zostáva null.</p>
    <p className="my-2 text-xs text-slate-300">Rebrík zapnete cez ladder.count (počet) a heightM (výška výstupu v metroch). kgPerUnit je hmotnosť jedného výrobku, product jeho označenie. includesAccessories nastavte na true iba ak hmotnosť zahŕňa kôš, madlá a konzoly. Chýbajúce polia preberú hodnoty z default.json.</p>
    <textarea aria-label="Lišty a rebrík JSON" className={`${control} h-72 w-full font-mono text-xs`} value={text} onChange={e=>{setText(e.target.value);setMessage('');}} spellCheck={false}/>
    <button type="button" className={`${control} mt-2`} onClick={()=>{
      try { const parsed=JSON.parse(text);resolveAccessoryConfig(parsed);onChange(parsed);setMessage('Nastavenie doplnkov bolo uložené do projektu.'); }
      catch(error){setMessage(error instanceof Error?error.message:'Neplatná konfigurácia.');}
    }}>Uložiť lišty a rebrík</button>
    <p role="status" className="mt-2 whitespace-pre-wrap text-xs">{message}</p>
  </details>;
}
