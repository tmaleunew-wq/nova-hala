import React, { useState } from "react";
import { X, ChevronDown, ChevronRight } from "lucide-react";
import { type GarageParams } from "@/lib/garage/types";
import { RoofOverhangControls } from "./RoofOverhangControls";

interface NewHallSheetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  p: GarageParams;
  onChange: (partial: Partial<GarageParams>) => void;
}

const RAL_COLORS = [
  { code: "RAL 1019", name: "Sivobéžová (Khaki)", hex: "#9e9764" },
  { code: "RAL 9002", name: "Sivobiela", hex: "#d7d5ca" },
  { code: "RAL 9006", name: "Biely hliník", hex: "#a5a5a5" },
  { code: "RAL 7016", name: "Antracit", hex: "#374151" },
  { code: "RAL 9007", name: "Tmavý hliník", hex: "#6b7280" },
  { code: "RAL 2000", name: "Žltooranžová", hex: "#ed760e" },
  { code: "RAL 3009", name: "Oxidovaná červená", hex: "#7f1d1d" },
  { code: "RAL 9010", name: "Čistá biela", hex: "#f3f4f6" },
];

export function NewHallSheetingModal({
  isOpen,
  onClose,
  p,
  onChange,
}: NewHallSheetingModalProps) {
  const [openSections, setOpenSections] = useState({
    wallGeo: true,
    wallStem: true,
    wallPanels: true,
    roofCover: true,
  });

  if (!isOpen) return null;

  const toggleSection = (key: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const stemH = p.stemWallHeight ?? 0.27;
  const stemThick = p.stemWallThickness ?? 0.1;
  const stemColor = p.stemWallColor ?? "#a5a5a5";
  const panelW = p.wallPanelWidth ?? 1.0;
  const panelThick = (p.wallPanelThicknessMm ?? 150) / 1000;
  const isHorizontal = p.claddingOrientation !== "vertical";
  const wallExtColor = p.claddingColor || "#9e9764";
  const wallIntColor = p.wallInnerColor || "#d7d5ca";
  const roofExtColor = p.roofColor || "#a5a5a5";
  const roofIntColor = p.roofInnerColor || "#d7d5ca";
  const wallProd = p.wallProduction ?? "Plechová stena so soklom";
  const wallName = p.wallPanelName ?? "Custom panel";
  const roofProd = p.roofProduction ?? "R3 PUR 120";
  const girtProf = p.girtProfile ?? "Z 142 13";
  const purlinProf = p.purlinProfile ?? "Z 142 13";
  const purlinSpan = p.purlinMaxSpan ?? 1.5;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-2 sm:p-4 select-none">
      <div className="relative w-full max-w-[440px] max-h-[92vh] flex flex-col rounded-md bg-[#f2f4f7] text-[#2b333e] shadow-2xl border border-[#cbd5e1] font-sans text-xs">
        {/* Header matching HiStruct modal */}
        <div className="flex items-center justify-between border-b border-[#d1d5db] bg-white px-4 py-2.5 rounded-t-md">
          <h2 className="text-sm font-semibold text-slate-800">Opláštenie</h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
            title="Zavrieť"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {/* 1. Nastavenie geometrie steny */}
          <div className="space-y-2">
            <button
              onClick={() => toggleSection("wallGeo")}
              className="flex items-center gap-1.5 font-bold text-slate-700 hover:text-sky-700 transition cursor-pointer w-full text-left"
            >
              {openSections.wallGeo ? (
                <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
              )}
              <span>Nastavenie geometrie steny</span>
            </button>

            {openSections.wallGeo && (
              <div className="pl-4 space-y-2 border-l border-slate-300">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-600">Produkcia</span>
                  <select
                    value={wallProd}
                    onChange={(e) => onChange({ wallProduction: e.target.value })}
                    className="w-48 rounded border border-slate-300 bg-white px-2 py-1 text-slate-800 shadow-xs"
                  >
                    <option value="Plechová stena so soklom">Plechová stena so soklom</option>
                    <option value="Plechová stena bez sokla">Plechová stena bez sokla</option>
                    <option value="Pevná stena">Pevná stena</option>
                  </select>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-600">Horná časť steny</span>
                  <select
                    value="Predvolené nastavenie"
                    onChange={() => {}}
                    className="w-48 rounded border border-slate-300 bg-white px-2 py-1 text-slate-800 shadow-xs"
                  >
                    <option value="Predvolené nastavenie">Predvolené nastavenie</option>
                    <option value="Podľa strechy">Podľa strechy</option>
                    <option value="Atika">Atika</option>
                  </select>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-600">Sokel</span>
                  <select
                    value={p.hasStemWall !== false ? "Nastavenie výšky" : "Vypnúť"}
                    onChange={(e) => onChange({ hasStemWall: e.target.value !== "Vypnúť" })}
                    className="w-48 rounded border border-slate-300 bg-white px-2 py-1 text-slate-800 shadow-xs"
                  >
                    <option value="Nastavenie výšky">Nastavenie výšky</option>
                    <option value="Vypnúť">Vypnúť</option>
                  </select>
                </div>

                {p.hasStemWall !== false && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-600">Výška sokla</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="0.01"
                        min="0.1"
                        max="1.5"
                        value={stemH}
                        onChange={(e) => onChange({ stemWallHeight: parseFloat(e.target.value) || 0.27 })}
                        className="w-24 rounded border border-slate-300 bg-white px-2 py-1 text-right text-slate-800 shadow-xs"
                      />
                      <span className="text-slate-500">m</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. Pevné nastavenie steny a sokla */}
          <div className="space-y-2">
            <button
              onClick={() => toggleSection("wallStem")}
              className="flex items-center gap-1.5 font-bold text-slate-700 hover:text-sky-700 transition cursor-pointer w-full text-left"
            >
              {openSections.wallStem ? (
                <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
              )}
              <span>Pevné nastavenie steny a sokla</span>
            </button>

            {openSections.wallStem && (
              <div className="pl-4 space-y-2 border-l border-slate-300">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-600">Materiál</span>
                  <select
                    value="Betón"
                    onChange={() => {}}
                    className="w-48 rounded border border-slate-300 bg-white px-2 py-1 text-slate-800 shadow-xs"
                  >
                    <option value="Betón">Betón</option>
                    <option value="Tehla">Tehla</option>
                    <option value="Tvárnice">Tvárnice</option>
                  </select>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-600">Hrúbka</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="0.01"
                      min="0.05"
                      max="0.4"
                      value={stemThick}
                      onChange={(e) => onChange({ stemWallThickness: parseFloat(e.target.value) || 0.1 })}
                      className="w-24 rounded border border-slate-300 bg-white px-2 py-1 text-right text-slate-800 shadow-xs"
                    />
                    <span className="text-slate-500">m</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-600">Výstrednosť sokla</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="0.01"
                      defaultValue="0.00"
                      className="w-24 rounded border border-slate-300 bg-white px-2 py-1 text-right text-slate-800 shadow-xs"
                    />
                    <span className="text-slate-500">m</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-600">Farba</span>
                  <select
                    value={stemColor}
                    onChange={(e) => onChange({ stemWallColor: e.target.value })}
                    className="w-48 rounded border border-slate-300 bg-white px-2 py-1 text-slate-800 shadow-xs"
                  >
                    {RAL_COLORS.map((c) => (
                      <option key={c.hex} value={c.hex}>
                        {c.code}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* 3. Predvolené hodnoty obloženia stien */}
          <div className="space-y-2">
            <button
              onClick={() => toggleSection("wallPanels")}
              className="flex items-center gap-1.5 font-bold text-slate-700 hover:text-sky-700 transition cursor-pointer w-full text-left"
            >
              {openSections.wallPanels ? (
                <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
              )}
              <span>Predvolené hodnoty obloženia stien</span>
            </button>

            {openSections.wallPanels && (
              <div className="pl-4 space-y-2 border-l border-slate-300">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-600">Izolácia</span>
                  <select
                    value={p.insulationCore !== "EPS" ? "Izolovaná" : "Neizolovaná"}
                    onChange={(e) => onChange({ insulationCore: e.target.value === "Izolovaná" ? "PIR" : "EPS" })}
                    className="w-48 rounded border border-slate-300 bg-white px-2 py-1 text-slate-800 shadow-xs"
                  >
                    <option value="Izolovaná">Izolovaná</option>
                    <option value="Neizolovaná">Neizolovaná</option>
                  </select>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-600">Produkcia</span>
                  <select
                    value="Všeobecne"
                    onChange={() => {}}
                    className="w-48 rounded border border-slate-300 bg-white px-2 py-1 text-slate-800 shadow-xs"
                  >
                    <option value="Všeobecne">Všeobecne</option>
                    <option value="Katalóg">Katalóg</option>
                  </select>
                </div>

                {/* Subgroup: Opláštenie panel */}
                <div className="pt-1 border-t border-slate-200">
                  <span className="font-semibold text-slate-700 block mb-1">Opláštenie</span>
                  <div className="space-y-1.5 pl-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-500">Názov</span>
                      <input
                        type="text"
                        value={wallName}
                        onChange={(e) => onChange({ wallPanelName: e.target.value })}
                        className="w-48 rounded border border-slate-300 bg-white px-2 py-1 text-slate-800 shadow-xs"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-500">Šírka (modul)</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="0.05"
                          min="0.5"
                          max="1.2"
                          value={panelW}
                          onChange={(e) => onChange({ wallPanelWidth: parseFloat(e.target.value) || 1.0 })}
                          className="w-24 rounded border border-slate-300 bg-white px-2 py-1 text-right text-slate-800 shadow-xs"
                        />
                        <span className="text-slate-500">m</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-500">Hrúbka</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="0.01"
                          min="0.04"
                          max="0.25"
                          value={panelThick}
                          onChange={(e) => onChange({ wallPanelThicknessMm: Math.round((parseFloat(e.target.value) || 0.15) * 1000) })}
                          className="w-24 rounded border border-slate-300 bg-white px-2 py-1 text-right text-slate-800 shadow-xs"
                        />
                        <span className="text-slate-500">m</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Subgroup: Obkladanie */}
                <div className="pt-1 border-t border-slate-200">
                  <span className="font-semibold text-slate-700 block mb-1">Obkladanie</span>
                  <div className="space-y-1.5 pl-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-500">Orientácia</span>
                      <select
                        value={isHorizontal ? "Vodorovné +X" : "Zvislé"}
                        onChange={(e) => onChange({ claddingOrientation: e.target.value === "Zvislé" ? "vertical" : "horizontal" })}
                        className="w-48 rounded border border-slate-300 bg-white px-2 py-1 text-slate-800 shadow-xs"
                      >
                        <option value="Vodorovné +X">Vodorovné +X</option>
                        <option value="Zvislé">Zvislé</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-500">Začiatok obkladania</span>
                      <select
                        value="Žiadny"
                        onChange={() => {}}
                        className="w-48 rounded border border-slate-300 bg-white px-2 py-1 text-slate-800 shadow-xs"
                      >
                        <option value="Žiadny">Žiadny</option>
                        <option value="Sokla">Sokla</option>
                        <option value="Odkvapu">Odkvapu</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Subgroup: Farebná schéma */}
                <div className="pt-1 border-t border-slate-200">
                  <span className="font-semibold text-slate-700 block mb-1">Farebná schéma stenových panelov</span>
                  <div className="space-y-1.5 pl-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-500">Farebná schéma</span>
                      <select
                        value="Jednofarebné"
                        onChange={() => {}}
                        className="w-48 rounded border border-slate-300 bg-white px-2 py-1 text-slate-800 shadow-xs"
                      >
                        <option value="Jednofarebné">Jednofarebné</option>
                        <option value="Dvojfarebné">Dvojfarebné</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-500">Farba vonkajšieho povrchu</span>
                      <select
                        value={wallExtColor}
                        onChange={(e) => onChange({ claddingColor: e.target.value })}
                        className="w-48 rounded border border-slate-300 bg-white px-2 py-1 text-slate-800 shadow-xs font-mono"
                      >
                        {RAL_COLORS.map((c) => (
                          <option key={c.hex} value={c.hex}>
                            {c.code} ({c.name})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-500">Farba vnútorného povrchu</span>
                      <select
                        value={wallIntColor}
                        onChange={(e) => onChange({ wallInnerColor: e.target.value })}
                        className="w-48 rounded border border-slate-300 bg-white px-2 py-1 text-slate-800 shadow-xs font-mono"
                      >
                        {RAL_COLORS.map((c) => (
                          <option key={c.hex} value={c.hex}>
                            {c.code}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Subgroup: Sekundárna konštrukcia */}
                <div className="pt-1 border-t border-slate-200">
                  <span className="font-semibold text-slate-700 block mb-1">Sekundárna konštrukcia</span>
                  <div className="space-y-1.5 pl-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-500">Umiestnenie</span>
                      <select
                        value="Rámovanie okolo..."
                        onChange={() => {}}
                        className="w-48 rounded border border-slate-300 bg-white px-2 py-1 text-slate-800 shadow-xs"
                      >
                        <option value="Rámovanie okolo...">Rámovanie okolo...</option>
                        <option value="Predvolené">Predvolené</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-500">Paždíky</span>
                      <select
                        value={girtProf}
                        onChange={(e) => onChange({ girtProfile: e.target.value })}
                        className="w-48 rounded border border-slate-300 bg-white px-2 py-1 text-slate-800 shadow-xs font-mono"
                      >
                        <option value="Z 142 13">Z 142 13</option>
                        <option value="Z 180 15">Z 180 15</option>
                        <option value="Z 200 20">Z 200 20</option>
                        <option value="C 140 15">C 140 15</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 4. Nastavenie strešného plášťa */}
          <div className="space-y-2">
            <button
              onClick={() => toggleSection("roofCover")}
              className="flex items-center gap-1.5 font-bold text-slate-700 hover:text-sky-700 transition cursor-pointer w-full text-left"
            >
              {openSections.roofCover ? (
                <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
              )}
              <span>Nastavenie strešného plášťa</span>
            </button>

            {openSections.roofCover && (
              <div className="pl-4 space-y-2 border-l border-slate-300">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-600">Izolácia</span>
                  <select
                    value="Izolovaná"
                    onChange={() => {}}
                    className="w-48 rounded border border-slate-300 bg-white px-2 py-1 text-slate-800 shadow-xs"
                  >
                    <option value="Izolovaná">Izolovaná</option>
                    <option value="Neizolovaná">Neizolovaná</option>
                  </select>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-600">Produkcia</span>
                  <select
                    value="Katalóg"
                    onChange={() => {}}
                    className="w-48 rounded border border-slate-300 bg-white px-2 py-1 text-slate-800 shadow-xs"
                  >
                    <option value="Katalóg">Katalóg</option>
                    <option value="Všeobecne">Všeobecne</option>
                  </select>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-600">Opláštenie</span>
                  <select
                    value={roofProd}
                    onChange={(e) => onChange({ roofProduction: e.target.value })}
                    className="w-48 rounded border border-slate-300 bg-white px-2 py-1 text-slate-800 shadow-xs font-mono"
                  >
                    <option value="R3 PUR 120">R3 PUR 120</option>
                    <option value="R3 PIR 100">R3 PIR 100</option>
                    <option value="Trapez T-35">Trapez T-35</option>
                  </select>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-600">Farba vonkajšieho povrchu</span>
                  <select
                    value={roofExtColor}
                    onChange={(e) => onChange({ roofColor: e.target.value })}
                    className="w-48 rounded border border-slate-300 bg-white px-2 py-1 text-slate-800 shadow-xs font-mono"
                  >
                    {RAL_COLORS.map((c) => (
                      <option key={c.hex} value={c.hex}>
                        {c.code} ({c.name})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-600">Farba vnútorného povrchu</span>
                  <select
                    value={roofIntColor}
                    onChange={(e) => onChange({ roofInnerColor: e.target.value })}
                    className="w-48 rounded border border-slate-300 bg-white px-2 py-1 text-slate-800 shadow-xs font-mono"
                  >
                    {RAL_COLORS.map((c) => (
                      <option key={c.hex} value={c.hex}>
                        {c.code}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-600">Väznice</span>
                  <select
                    value={purlinProf}
                    onChange={(e) => onChange({ purlinProfile: e.target.value })}
                    className="w-48 rounded border border-slate-300 bg-white px-2 py-1 text-slate-800 shadow-xs font-mono"
                  >
                    <option value="Z 142 13">Z 142 13</option>
                    <option value="Z 180 15">Z 180 15</option>
                    <option value="Z 200 20">Z 200 20</option>
                  </select>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-600">Max. vzdialenosť nosníkov</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="0.1"
                      min="1.0"
                      max="3.0"
                      value={purlinSpan}
                      onChange={(e) => onChange({ purlinMaxSpan: parseFloat(e.target.value) || 1.5 })}
                      className="w-24 rounded border border-slate-300 bg-white px-2 py-1 text-right text-slate-800 shadow-xs"
                    />
                    <span className="text-slate-500">m</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-600">Umiestnenie</span>
                  <select
                    value="Vonkajšie rámy"
                    onChange={() => {}}
                    className="w-48 rounded border border-slate-300 bg-white px-2 py-1 text-slate-800 shadow-xs"
                  >
                    <option value="Vonkajšie rámy">Vonkajšie rámy</option>
                    <option value="Medzi rámy">Medzi rámy</option>
                  </select>
                </div>

                <div className="pt-2">
                  <RoofOverhangControls params={p} onChange={onChange} compact />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="border-t border-[#d1d5db] bg-white px-4 py-2 flex justify-end gap-2 rounded-b-md">
          <button
            onClick={onClose}
            className="rounded bg-sky-600 hover:bg-sky-500 text-white font-semibold px-4 py-1.5 text-xs shadow-xs transition cursor-pointer"
          >
            Hotovo
          </button>
        </div>
      </div>
    </div>
  );
}
