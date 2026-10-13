import React, { useState, useEffect } from "react";
import type { GarageParams } from "@/lib/garage/types";
import { calculateGarageBom } from "@/lib/garage/bomCalculator";
import { X, Plus, Trash2, Check, ArrowRightLeft, Sparkles } from "lucide-react";

export interface SavedVariant {
  id: string;
  name: string;
  savedAt: string;
  hallName?: string;
  params: GarageParams;
}

interface VariantComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentParams: GarageParams;
  currentHall?: string;
  onApplyVariant: (params: Partial<GarageParams>, hallName?: string) => void;
}

const STORAGE_KEY = "ssf_saved_comparison_variants";

export function VariantComparisonModal({
  isOpen,
  onClose,
  currentParams,
  currentHall = "Hala / Garáž",
  onApplyVariant,
}: VariantComparisonModalProps) {
  const [variants, setVariants] = useState<SavedVariant[]>([]);
  const [variantNameInput, setVariantNameInput] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setVariants(JSON.parse(stored));
      }
    } catch (e) {
      console.warn("Failed to load saved variants:", e);
    }
  }, [isOpen]);

  const saveToStorage = (updated: SavedVariant[]) => {
    setVariants(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn("Failed to save variants:", e);
    }
  };

  const handleAddCurrent = () => {
    const area = Math.round(currentParams.width * currentParams.length);
    const defaultName = `${currentHall} (${currentParams.width}×${currentParams.length}m, ${area}m²)`;
    const newVariant: SavedVariant = {
      id: `var_${Date.now()}`,
      name: variantNameInput.trim() || defaultName,
      savedAt: new Date().toLocaleTimeString("sk-SK", { hour: "2-digit", minute: "2-digit" }),
      hallName: currentHall,
      params: JSON.parse(JSON.stringify(currentParams)),
    };
    const updated = [...variants, newVariant].slice(-4); // max 4 variants
    saveToStorage(updated);
    setVariantNameInput("");
  };

  const handleRemove = (id: string) => {
    const updated = variants.filter((v) => v.id !== id);
    saveToStorage(updated);
  };

  const handleClear = () => {
    saveToStorage([]);
  };

  if (!isOpen) return null;

  // We display the current live config as the first comparison column, plus saved variants
  const liveVariant: SavedVariant = {
    id: "live_current",
    name: "Aktuálna 3D konfigurácia",
    savedAt: "Teraz",
    hallName: currentHall,
    params: currentParams,
  };

  const displayList = [liveVariant, ...variants];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl max-h-[90vh] flex flex-col rounded-2xl border border-white/10 bg-[#0d131f] text-slate-100 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-5 border-b border-white/10 bg-black/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
                Porovnanie variantov vedľa seba
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono font-medium">
                  {variants.length} uložených
                </span>
              </h2>
              <p className="text-xs text-white/50">
                Porovnajte technické parametre, rozmery a odhad materiálu rôznych konfigurácií
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar: add current configuration */}
        <div className="p-3 md:px-5 md:py-3 border-b border-white/5 bg-white/[0.02] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <input
              type="text"
              value={variantNameInput}
              onChange={(e) => setVariantNameInput(e.target.value)}
              placeholder={`Názov variantu (napr. "${currentHall} s bránou navyše")...`}
              className="flex-1 rounded-lg border border-white/10 bg-black/50 px-3 py-1.5 text-xs text-white placeholder-white/30 focus:border-cyan-400 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleAddCurrent}
              disabled={variants.length >= 4}
              className="px-3 py-1.5 rounded-lg bg-cyan-400 hover:bg-cyan-300 active:scale-95 disabled:opacity-40 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-cyan-500/20 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Uložiť aktuálny</span>
            </button>
          </div>

          {variants.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="text-xs text-white/40 hover:text-red-400 flex items-center gap-1 transition cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span>Vymazať uložené</span>
            </button>
          )}
        </div>

        {/* Comparison Table */}
        <div className="flex-1 overflow-auto p-4 md:p-5">
          <div className="min-w-[680px]">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr>
                  <th className="p-3 text-left font-bold text-white/50 uppercase tracking-wider text-[11px] w-48 border-b border-white/10">
                    Parameter
                  </th>
                  {displayList.map((item, idx) => (
                    <th
                      key={item.id}
                      className={`p-3 text-left border-b border-white/10 min-w-[200px] ${
                        idx === 0
                          ? "bg-cyan-500/10 border-l border-r border-cyan-500/30 rounded-t-xl"
                          : "border-r border-white/5"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-white text-xs truncate max-w-[150px]">
                          {item.name}
                        </span>
                        {idx !== 0 && (
                          <button
                            type="button"
                            onClick={() => handleRemove(item.id)}
                            className="text-white/40 hover:text-red-400 p-1 transition cursor-pointer"
                            title="Odstrániť z porovnania"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {idx === 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-400 text-slate-950 font-bold uppercase">
                            Aktívne
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-white/50 mt-0.5 font-mono">
                        {item.hallName} · {item.savedAt}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-[11px]">
                {/* Rozmery */}
                <tr>
                  <td className="p-3 text-white/60 font-medium">Pôdorys (Š × D)</td>
                  {displayList.map((item, idx) => (
                    <td
                      key={item.id}
                      className={`p-3 font-mono font-bold text-white ${
                        idx === 0 ? "bg-cyan-500/5 border-l border-r border-cyan-500/30" : "border-r border-white/5"
                      }`}
                    >
                      {item.params.width} × {item.params.length} m
                    </td>
                  ))}
                </tr>

                {/* Zastavaná plocha */}
                <tr>
                  <td className="p-3 text-white/60 font-medium">Zastavaná plocha</td>
                  {displayList.map((item, idx) => (
                    <td
                      key={item.id}
                      className={`p-3 font-mono font-bold text-cyan-400 ${
                        idx === 0 ? "bg-cyan-500/5 border-l border-r border-cyan-500/30" : "border-r border-white/5"
                      }`}
                    >
                      {Math.round(item.params.width * item.params.length)} m²
                    </td>
                  ))}
                </tr>

                {/* Svetlá výška */}
                <tr>
                  <td className="p-3 text-white/60 font-medium">Svetlá výška</td>
                  {displayList.map((item, idx) => (
                    <td
                      key={item.id}
                      className={`p-3 font-mono text-white ${
                        idx === 0 ? "bg-cyan-500/5 border-l border-r border-cyan-500/30" : "border-r border-white/5"
                      }`}
                    >
                      {item.params.clearHeight} m
                    </td>
                  ))}
                </tr>

                {/* Strecha */}
                <tr>
                  <td className="p-3 text-white/60 font-medium">Typ strechy & sklon</td>
                  {displayList.map((item, idx) => (
                    <td
                      key={item.id}
                      className={`p-3 text-white ${
                        idx === 0 ? "bg-cyan-500/5 border-l border-r border-cyan-500/30" : "border-r border-white/5"
                      }`}
                    >
                      {item.params.roofType === "gable" ? "Sedlová" : item.params.roofType === "shed" ? "Pultová" : "Kubická"}{" "}
                      ({item.params.roofPitchDeg}°)
                    </td>
                  ))}
                </tr>

                {/* Opláštenie */}
                <tr>
                  <td className="p-3 text-white/60 font-medium">Opláštenie stien</td>
                  {displayList.map((item, idx) => (
                    <td
                      key={item.id}
                      className={`p-3 text-white ${
                        idx === 0 ? "bg-cyan-500/5 border-l border-r border-cyan-500/30" : "border-r border-white/5"
                      }`}
                    >
                      {item.params.panelType === "sandwich"
                        ? `Sendvič PIR ${item.params.wallPanelThicknessMm ?? 100}mm`
                        : "Trapézový plech"}
                    </td>
                  ))}
                </tr>

                {/* Farby */}
                <tr>
                  <td className="p-3 text-white/60 font-medium">Farba stien / strechy</td>
                  {displayList.map((item, idx) => (
                    <td
                      key={item.id}
                      className={`p-3 text-white ${
                        idx === 0 ? "bg-cyan-500/5 border-l border-r border-cyan-500/30" : "border-r border-white/5"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-white/30 inline-block"
                          style={{ backgroundColor: item.params.claddingColor }}
                          title="Fasáda"
                        />
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-white/30 inline-block"
                          style={{ backgroundColor: item.params.roofColor }}
                          title="Strecha"
                        />
                      </div>
                    </td>
                  ))}
                </tr>

                {/* Brána */}
                <tr>
                  <td className="p-3 text-white/60 font-medium">Garážová brána</td>
                  {displayList.map((item, idx) => (
                    <td
                      key={item.id}
                      className={`p-3 text-white ${
                        idx === 0 ? "bg-cyan-500/5 border-l border-r border-cyan-500/30" : "border-r border-white/5"
                      }`}
                    >
                      {(item.params.gateCount ?? 1) + (item.params.hasBackDoor ? 1 : 0)}x ({item.params.doorWidth}×{item.params.doorHeight}m)
                    </td>
                  ))}
                </tr>

                {/* Dvere a okná */}
                <tr>
                  <td className="p-3 text-white/60 font-medium">Dvere & Okná</td>
                  {displayList.map((item, idx) => (
                    <td
                      key={item.id}
                      className={`p-3 text-white ${
                        idx === 0 ? "bg-cyan-500/5 border-l border-r border-cyan-500/30" : "border-r border-white/5"
                      }`}
                    >
                      {item.params.hasPersonalDoor ? "1x dvere" : "bez dverí"}
                      {(item.params.windowCount ?? 0) > 0 ? `, ${item.params.windowCount}x okno` : ""}
                    </td>
                  ))}
                </tr>

                {/* BOM: Odhad ocele */}
                <tr>
                  <td className="p-3 text-white/60 font-medium">Odhad ocele (BOM)</td>
                  {displayList.map((item, idx) => {
                    const bom = calculateGarageBom(item.params);
                    return (
                      <td
                        key={item.id}
                        className={`p-3 font-mono font-semibold text-white ${
                          idx === 0 ? "bg-cyan-500/5 border-l border-r border-cyan-500/30" : "border-r border-white/5"
                        }`}
                      >
                        {bom.totalSteelWeightKg} kg ({bom.totalSteelLengthBm} bm)
                      </td>
                    );
                  })}
                </tr>

                {/* BOM: Plocha opláštenia */}
                <tr>
                  <td className="p-3 text-white/60 font-medium">Plocha krytiny & panelov</td>
                  {displayList.map((item, idx) => {
                    const bom = calculateGarageBom(item.params);
                    return (
                      <td
                        key={item.id}
                        className={`p-3 font-mono text-white ${
                          idx === 0 ? "bg-cyan-500/5 border-l border-r border-cyan-500/30" : "border-r border-white/5"
                        }`}
                      >
                        {(bom.totalWallAreaM2 + bom.totalRoofAreaM2).toFixed(1)} m²
                      </td>
                    );
                  })}
                </tr>

                {/* Akcie: Aktivácia */}
                <tr>
                  <td className="p-3 text-white/40"></td>
                  {displayList.map((item, idx) => (
                    <td
                      key={item.id}
                      className={`p-3 ${
                        idx === 0
                          ? "bg-cyan-500/5 border-l border-r border-cyan-500/30 rounded-b-xl"
                          : "border-r border-white/5"
                      }`}
                    >
                      {idx === 0 ? (
                        <div className="text-center py-1 text-[11px] text-cyan-300 font-medium">
                          ✓ Zobrazené v 3D
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            onApplyVariant(item.params, item.hallName);
                            onClose();
                          }}
                          className="w-full py-1.5 px-3 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 text-white font-semibold text-xs transition cursor-pointer border border-white/15"
                        >
                          Aktivovať tento variant
                        </button>
                      )}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 md:p-4 border-t border-white/10 bg-black/40 flex items-center justify-between text-xs text-white/50">
          <div>
            Tip: Môžete zmeniť parametre haly, kliknúť "Uložiť aktuálny" a sledovať rozdiely v materiáli a ploche.
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold transition cursor-pointer"
          >
            Zavrieť
          </button>
        </div>
      </div>
    </div>
  );
}
