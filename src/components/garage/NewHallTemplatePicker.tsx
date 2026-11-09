import React, { useState } from "react";
import { Search, X, Check } from "lucide-react";
import templatesData from "@/config/new_hall_templates.json";

export interface HallTemplateItem {
  id: string;
  footprint?: string;
  nameFcc?: string;
  title: string;
  subtitle: string;
  category: string;
  width: number;
  length: number;
  clearHeight: number;
  roofPitchDeg: number;
  bayCount?: number;
  framework?: string;
  claddingColor?: string;
  roofColor?: string;
  trimmingColor?: string;
  structuralSystem: string;
  leanWidth?: number;
  leanHeight?: number;
  leanBays?: number;
  mezzanineBays?: number;
  canopyWidth?: number;
  hasRidgeSkylight?: boolean;
  hasCenterColumns?: boolean;
  description?: string;
}

interface NewHallTemplatePickerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTemplateId?: string;
  onSelectTemplate: (template: HallTemplateItem) => void;
}

const CATEGORIES = [
  { id: "all", label: "Všetky" },
  { id: "vyrobne", label: "Výrobné" },
  { id: "obchodne", label: "Obchodné" },
  { id: "viacucelove", label: "Viacúčelové" },
  { id: "prazdne", label: "Prázdné" },
];

export const NewHallTemplatePicker: React.FC<NewHallTemplatePickerProps> = ({
  isOpen,
  onClose,
  selectedTemplateId = "prazdna_hala",
  onSelectTemplate,
}) => {
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  if (!isOpen) return null;

  const templates = templatesData as HallTemplateItem[];

  const filteredTemplates = templates.filter((item) => {
    const matchesCategory = activeCategory === "all" || item.category === activeCategory;
    const matchesSearch =
      !searchQuery.trim() ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-6 animate-in fade-in duration-150">
      <div className="relative w-full max-w-7xl max-h-[92vh] bg-[#f8f9fa] text-slate-800 rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="px-6 sm:px-8 pt-6 pb-4 bg-white border-b border-slate-200 flex flex-col gap-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-normal text-slate-800 tracking-tight">Šablóny</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Táto stránka obsahuje dostupné samostatné šablóny oceľových hál. Každá šablóna má vlastnú špecifickú nosnú konštrukciu.
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              title="Zavrieť"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Filter Tabs & Search Bar (exact HiStruct layout) */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="inline-flex rounded-md shadow-xs border border-slate-300 bg-white overflow-hidden">
              {CATEGORIES.map((cat) => {
                const active = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`px-4 py-1.5 text-xs sm:text-sm font-medium border-r last:border-r-0 border-slate-300 transition cursor-pointer ${
                      active
                        ? "bg-slate-800 text-white"
                        : "bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>

            <div className="relative w-full sm:w-64">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Hľadať šablónu haly..."
                className="w-full rounded-md border border-slate-300 bg-white pl-3 pr-9 py-1.5 text-sm text-slate-800 placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              />
              <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            </div>
          </div>
        </div>

        {/* Templates Grid */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-white">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {filteredTemplates.map((tpl) => {
              const isSelected = tpl.id === selectedTemplateId;
              return (
                <button
                  key={tpl.id}
                  onClick={() => {
                    onSelectTemplate(tpl);
                    onClose();
                  }}
                  className={`group relative flex flex-col items-center text-center p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? "border-sky-600 bg-sky-50/40 ring-2 ring-sky-500/30 shadow-md"
                      : "border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-lg"
                  }`}
                >
                  {isSelected && (
                    <span className="absolute top-2.5 right-2.5 h-6 w-6 rounded-full bg-sky-600 text-white flex items-center justify-center shadow">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                  )}

                  {/* Title & Subtitle */}
                  <h3 className="text-xs sm:text-sm font-semibold text-slate-700 uppercase tracking-wide group-hover:text-sky-700 transition-colors">
                    {tpl.title}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">
                    {tpl.subtitle}
                  </p>

                  {/* Technical Specs Footer */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 w-full flex items-center justify-between text-[10px] font-mono text-slate-500">
                    <span>{tpl.width}×{tpl.length}×{tpl.clearHeight}m</span>
                    <span className="font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                      {tpl.framework || "IPE"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>VBAU s.r.o. · Konfigurátor oceľových hál</span>
          <span>Vyberte samostatný typ haly pre načítanie jej špecifickej 3D konštrukcie</span>
        </div>
      </div>
    </div>
  );
};
