import React, { useState, useMemo } from "react";
import {
  Search,
  X,
  Check,
  ArrowRight,
  Compass,
  Building2,
  Factory,
  Warehouse,
  Briefcase,
  Layers,
  Sparkles,
  Maximize2,
  RotateCcw,
} from "lucide-react";
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
  { id: "all", label: "Všetky", icon: Layers },
  { id: "vyrobne", label: "Výrobné", icon: Factory },
  { id: "skladovacie", label: "Skladovacie", icon: Warehouse },
  { id: "obchodne", label: "Obchodné", icon: Briefcase },
  { id: "viacucelove", label: "Viacúčelové", icon: Building2 },
  { id: "prazdne", label: "Prázdne", icon: Sparkles },
];

export const NewHallTemplatePicker: React.FC<NewHallTemplatePickerProps> = ({
  isOpen,
  onClose,
  selectedTemplateId = "vyrobna_hala",
  onSelectTemplate,
}) => {
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  const templates = templatesData as HallTemplateItem[];

  // Helper matching categories based on template definitions & semantic purpose
  const matchesCategory = (item: HallTemplateItem, cat: string) => {
    if (cat === "all") return true;
    if (cat === "vyrobne") {
      return (
        item.category === "vyrobne" &&
        !item.title.toLowerCase().includes("sklad") &&
        !item.subtitle.toLowerCase().includes("sklad")
      ) || item.id === "vyrobna_hala" || item.id === "jednolodna_hala";
    }
    if (cat === "skladovacie") {
      return (
        item.id.includes("sklad") ||
        item.title.toLowerCase().includes("sklad") ||
        item.subtitle.toLowerCase().includes("sklad") ||
        item.category === "skladovacie"
      );
    }
    if (cat === "obchodne") {
      return (
        item.category === "obchodne" ||
        item.id === "kancelarska_budova" ||
        item.title.toLowerCase().includes("kancelár")
      );
    }
    if (cat === "viacucelove") {
      return (
        item.category === "viacucelove" ||
        item.id === "budova_pristresok" ||
        item.id === "budova_pristavky"
      );
    }
    if (cat === "prazdne") {
      return (
        item.category === "prazdne" ||
        item.id === "prazdna_hala" ||
        item.id === "dvojlodna_hala" ||
        item.id === "nakreslit_pudorys"
      );
    }
    return item.category === cat;
  };

  const filteredTemplates = useMemo(() => {
    return templates.filter((item) => {
      const catMatch = matchesCategory(item, activeCategory);
      const q = searchQuery.trim().toLowerCase();
      if (!q) return catMatch;

      const titleMatch = item.title.toLowerCase().includes(q);
      const subMatch = item.subtitle.toLowerCase().includes(q);
      const descMatch = (item.description || "").toLowerCase().includes(q);
      const dimMatch = `${item.width}x${item.length}`.includes(q) || `${item.width} x ${item.length}`.includes(q);
      const frameMatch = (item.framework || "").toLowerCase().includes(q);

      return catMatch && (titleMatch || subMatch || descMatch || dimMatch || frameMatch);
    });
  }, [templates, activeCategory, searchQuery]);

  if (!isOpen) return null;

  const customTemplate = templates.find((t) => t.id === "nakreslit_pudorys") || templates[templates.length - 1];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="template-catalog-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950 flex flex-col justify-start items-center p-0 sm:p-4 md:p-8 animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-7xl bg-white sm:rounded-2xl shadow-2xl border-0 sm:border border-slate-200/80 flex flex-col overflow-hidden min-h-screen sm:min-h-[85vh] my-0 sm:my-auto">
        
        {/* Top Header Section (Phase 3.1) */}
        <header className="relative bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white px-4 sm:px-10 pt-6 sm:pt-8 pb-5 sm:pb-7 border-b border-slate-700/60 shadow-lg">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/15 border border-sky-400/30 text-sky-300 text-xs font-semibold mb-3">
                <Building2 className="h-3.5 w-3.5" />
                <span>Katalóg oceľových konštrukcií VBAU</span>
              </div>
              <h1
                id="template-catalog-title"
                className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white"
              >
                Vyberte si svoju oceľovú halu
              </h1>
              <p className="text-slate-300 text-sm sm:text-base mt-2 leading-relaxed">
                Vyberte si z pripravených typov hál alebo začnite vlastným návrhom. Každú halu môžete následne prispôsobiť svojim požiadavkám v 3D konfigurátore.
              </p>
            </div>

            {/* Quick Actions / Close */}
            <div className="flex items-center gap-3 self-start md:self-center">
              <button
                type="button"
                onClick={() => {
                  onSelectTemplate(customTemplate);
                  onClose();
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs sm:text-sm font-bold shadow-md shadow-sky-950/30 transition hover:translate-y-[-1px] cursor-pointer"
              >
                <Compass className="h-4 w-4" />
                <span>Navrhnúť vlastnú halu</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition cursor-pointer border border-white/10"
                title="Zavrieť výber a pokračovať v konfigurátore"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Filter Bar: Categories, Search and Count */}
          <div className="mt-8 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 pt-4 border-t border-white/10">
            {/* Category Tabs */}
            <nav
              aria-label="Kategórie hál"
              className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none"
            >
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const active = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategory(cat.id)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                      active
                        ? "bg-sky-500 text-slate-950 shadow-md font-bold"
                        : "bg-white/10 text-slate-300 hover:bg-white/15 hover:text-white"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Search Input & Counter */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1 sm:w-80">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Hľadať podľa typu, rozmerov..."
                  className="w-full rounded-xl bg-slate-900/90 border border-slate-700 pl-9 pr-9 py-2 text-xs sm:text-sm text-white placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
                    title="Vymazať hľadanie"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div className="px-3 py-2 rounded-xl bg-white/10 text-xs font-mono font-medium text-slate-300 whitespace-nowrap border border-white/10">
                {filteredTemplates.length} {filteredTemplates.length === 1 ? "hala" : filteredTemplates.length < 5 ? "haly" : "hál"}
              </div>
            </div>
          </div>
        </header>

        {/* Catalog Body (Phase 3.2, 3.3, 3.4) */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 bg-slate-50/70 overflow-y-auto">
          {filteredTemplates.length === 0 ? (
            <div className="py-16 text-center flex flex-col items-center justify-center">
              <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
                <Search className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-700">Nenašli sa žiadne šablóny</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-md">
                Pre zadaný filter alebo hľadaný výraz sa nenašla žiadna zodpovedajúca hala.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setActiveCategory("all");
                }}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold hover:bg-slate-700 transition cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Resetovať filter</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
              
              {/* Standalone Distinct Card: "Navrhnúť vlastnú halu" (Phase 3.4) */}
              {(activeCategory === "all" || activeCategory === "prazdne") && !searchQuery && (
                <div
                  onClick={() => {
                    onSelectTemplate(customTemplate);
                    onClose();
                  }}
                  className="group relative flex flex-col rounded-2xl border-2 border-dashed border-sky-400 bg-gradient-to-br from-sky-50 via-white to-blue-50/50 hover:border-sky-600 hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden p-6 sm:p-7 justify-between min-h-[380px]"
                >
                  <div className="space-y-4">
                    <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-sky-600 text-white shadow-md shadow-sky-600/30 group-hover:scale-110 transition-transform">
                      <Compass className="h-7 w-7" />
                    </div>

                    <div>
                      <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-sky-700 bg-sky-100 px-2.5 py-1 rounded-md">
                        Voľný návrh
                      </span>
                      <h2 className="text-xl font-extrabold text-slate-900 mt-2.5 tracking-tight group-hover:text-sky-700 transition-colors">
                        Navrhnúť vlastnú halu
                      </h2>
                      <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                        Začnite od prázdneho pôdorysu a vytvorte si konštrukciu podľa vlastných rozmerov.
                      </p>
                    </div>

                    {/* Blueprint tech drawing grid background decoration */}
                    <div className="p-4 rounded-xl bg-sky-100/60 border border-sky-200/80 text-xs text-slate-700 space-y-1.5 font-mono">
                      <div className="flex items-center justify-between">
                        <span>Pôdorys:</span>
                        <strong className="text-slate-900">Vlastné rozmery (L-tvar / obdĺžnik)</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Rozpony:</span>
                        <strong className="text-slate-900">Modulovateľné polia</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Konštrukcia:</span>
                        <strong className="text-sky-800">Parametrický 3D CAD</strong>
                      </div>
                    </div>
                  </div>

                  <div className="pt-5 mt-4 border-t border-sky-200/70 flex items-center justify-between">
                    <span className="text-xs font-bold text-sky-800 group-hover:underline">
                      Začať vlastný návrh
                    </span>
                    <span className="h-8 w-8 rounded-full bg-sky-600 text-white flex items-center justify-center group-hover:translate-x-1 transition-transform">
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </div>
              )}

              {/* Standard Template Cards (Phase 3.2) */}
              {filteredTemplates.map((tpl) => {
                const isSelected = tpl.id === selectedTemplateId;
                const previewImg = `/templates/${tpl.id}.webp`;
                const areaM2 = Math.round(tpl.width * tpl.length);

                return (
                  <article
                    key={tpl.id}
                    onClick={() => {
                      onSelectTemplate(tpl);
                      onClose();
                    }}
                    className={`group relative flex flex-col rounded-2xl bg-white border transition-all duration-300 cursor-pointer overflow-hidden shadow-sm hover:shadow-xl ${
                      isSelected
                        ? "border-sky-600 ring-2 ring-sky-500/40 shadow-lg"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {/* Upper Image Section (60-70% visual focus) */}
                    <div className="relative aspect-[16/10] w-full overflow-hidden bg-gradient-to-b from-slate-100 via-slate-50 to-slate-200 flex items-center justify-center border-b border-slate-100">
                      {!imgErrors[tpl.id] ? (
                        <img
                          src={previewImg}
                          alt={`${tpl.title} — ${tpl.subtitle}`}
                          loading="lazy"
                          onError={() => setImgErrors((prev) => ({ ...prev, [tpl.id]: true }))}
                          className="h-full w-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="h-full w-full flex flex-col items-center justify-center p-6 text-slate-400 bg-slate-100">
                          <Building2 className="h-10 w-10 text-slate-300 mb-2" />
                          <span className="text-xs font-mono font-medium">{tpl.title}</span>
                          <span className="text-[10px] text-slate-400">3D model pripravený</span>
                        </div>
                      )}

                      {/* Active Selection Badge */}
                      {isSelected && (
                        <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-sky-600 text-white text-[11px] font-bold flex items-center gap-1 shadow-md">
                          <Check className="h-3.5 w-3.5" />
                          <span>Vybraná</span>
                        </div>
                      )}

                      {/* Top Corner Technical Badges */}
                      <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                        <span className="px-2 py-0.5 rounded-md bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-mono font-bold shadow-sm">
                          {tpl.width} × {tpl.length} m
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-white/90 backdrop-blur-md text-slate-800 text-[10px] font-mono font-bold shadow-sm border border-slate-200">
                          {areaM2} m²
                        </span>
                      </div>
                    </div>

                    {/* Lower Info Section */}
                    <div className="flex flex-col flex-1 p-5 justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight group-hover:text-sky-600 transition-colors uppercase">
                            {tpl.title}
                          </h2>
                          <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 whitespace-nowrap">
                            {tpl.framework || "IPE"}
                          </span>
                        </div>

                        <p className="text-xs font-semibold text-sky-700">
                          {tpl.subtitle}
                        </p>

                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                          {tpl.description || "Samostatná modulárna priemyselná oceľová hala s kompletným stenovým a strešným opláštením."}
                        </p>
                      </div>

                      {/* Technical Specs & Call To Action */}
                      <div className="pt-3 border-t border-slate-100 space-y-3">
                        <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-mono text-slate-600 bg-slate-50/80 p-2 rounded-lg border border-slate-100">
                          <div>
                            <span className="text-slate-400 block text-[9px] uppercase">Výška</span>
                            <span className="font-bold text-slate-800">{tpl.clearHeight} m</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[9px] uppercase">Sklon</span>
                            <span className="font-bold text-slate-800">{tpl.roofPitchDeg}°</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[9px] uppercase">Polia</span>
                            <span className="font-bold text-slate-800">{tpl.bayCount || Math.round(tpl.length / 6)}×</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectTemplate(tpl);
                            onClose();
                          }}
                          className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer shadow-sm ${
                            isSelected
                              ? "bg-slate-900 text-white hover:bg-slate-800"
                              : "bg-sky-600 hover:bg-sky-500 text-white shadow-sky-600/20 hover:shadow-md"
                          }`}
                        >
                          <span>Vybrať halu</span>
                          <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </main>

        {/* Footer info */}
        <footer className="px-6 py-3.5 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">VBAU s.r.o.</span>
            <span>·</span>
            <span>Profesionálny 3D konfigurátor priemyselných budov</span>
          </div>
          <div className="text-slate-400 text-[11px]">
            Každá šablóna vychádza z reálnych konštrukčných a statických parametrov systému
          </div>
        </footer>

      </div>
    </div>
  );
};
