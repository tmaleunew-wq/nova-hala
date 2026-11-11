import React, { useState } from "react";
import type { GarageParams } from "@/lib/garage/types";
import {
  X,
  Download,
  FileText,
  Compass,
  Maximize2,
  Layers,
  ChevronRight,
  Eye,
  CheckCircle2,
  Printer,
} from "lucide-react";
import {
  DRAWING_DEFINITIONS,
  DrawingViewType,
  generateDrawingSvg,
  downloadMultiPageDrawingsPdf,
} from "@/lib/garage/technicalDrawingsGenerator";
import { generateGarageDxf } from "@/lib/garage/dxfGenerator";
import { toast } from "sonner";

interface TechnicalDrawingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  params: GarageParams;
  hallName?: string;
  templateId?: string;
  openings?: Array<{
    id: string;
    bayId: string;
    category: string;
    subtype?: string;
    width: number;
    height: number;
    x: number;
    y: number;
  }>;
}

export function TechnicalDrawingsModal({
  isOpen,
  onClose,
  params,
  hallName = "VBAU Priemyselná hala",
  templateId,
  openings,
}: TechnicalDrawingsModalProps) {
  const [activeView, setActiveView] = useState<DrawingViewType>("plan");
  const [isExporting, setIsExporting] = useState(false);
  const [zoom, setZoom] = useState<number>(1);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  if (!isOpen) return null;

  const currentDef = DRAWING_DEFINITIONS.find((d) => d.id === activeView) || DRAWING_DEFINITIONS[0];
  const svgContent = generateDrawingSvg(activeView, params, { openings, templateId, theme });

  const handleDownloadPdf = () => {
    try {
      setIsExporting(true);
      toast.info("Generujem kompletnú technickú výkresovú dokumentáciu (8 listov PDF)...");
      downloadMultiPageDrawingsPdf(params, `VBAU_Technicke_Vykresy_${params.width}x${params.length}.pdf`);
      toast.success("Výkresy boli úspešne stiahnuté vo formáte PDF!");
    } catch (e: any) {
      toast.error(`Chyba pri generovaní PDF: ${e.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadDxf = () => {
    try {
      const dxfContent = generateGarageDxf(params, openings);
      const blob = new Blob([dxfContent], { type: "application/dxf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `VBAU_Hala_${params.width}x${params.length}_AutoCAD.dxf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("CAD výkres DXF (AutoCAD R12/2000) bol stiahnutý!");
    } catch (e: any) {
      toast.error(`Chyba pri generovaní DXF: ${e.message}`);
    }
  };

  const handleDownloadSvg = () => {
    const blob = new Blob([svgContent], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `VBAU_${activeView}_${params.width}x${params.length}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Vektorový výkres SVG (${currentDef.title}) bol stiahnutý!`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl h-[92vh] bg-slate-900 border border-sky-500/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
              <Compass className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Automatické 2D technické výkresy haly
                </h2>
                <span className="text-[10px] font-mono uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full font-bold">
                  Koncepčný CAD modul
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {hallName} · {params.width} × {params.length} × {params.clearHeight} m · Rozpon: {params.width}m · {params.bayCount} polí
              </p>
            </div>
          </div>

          {/* Export Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadSvg}
              title="Stiahnuť aktuálny pohľad ako vektorové SVG"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-200 transition cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 text-sky-400" />
              <span>SVG</span>
            </button>

            <button
              onClick={handleDownloadDxf}
              title="Stiahnuť výkres v CAD formáte DXF pre AutoCAD"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/15 hover:bg-amber-500/25 text-xs font-bold text-amber-200 transition cursor-pointer"
            >
              <Compass className="h-3.5 w-3.5 text-amber-400" />
              <span>Export CAD (DXF)</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isExporting}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-lg shadow-sky-600/30 transition cursor-pointer"
            >
              <FileText className="h-4 w-4" />
              <span>{isExporting ? "Generujem..." : "Stiahnuť PDF súpravu (8 listov)"}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer ml-1"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Layout: Left Sidebar List of Views + Right Interactive Drawing Canvas */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          {/* Left Navigation: 8 Drawing Views */}
          <div className="w-full md:w-72 border-r border-white/10 bg-slate-950/60 p-3 space-y-1 overflow-y-auto shrink-0">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 px-2 py-1 font-bold">
              Zoznam výkresov dokumentácie
            </div>

            {DRAWING_DEFINITIONS.map((def) => {
              const active = activeView === def.id;
              return (
                <button
                  key={def.id}
                  onClick={() => setActiveView(def.id)}
                  className={`w-full text-left p-2.5 rounded-xl transition flex items-start gap-2.5 cursor-pointer ${
                    active
                      ? "bg-sky-500/20 border border-sky-400/40 text-white shadow-sm"
                      : "hover:bg-white/5 border border-transparent text-slate-300"
                  }`}
                >
                  <div
                    className={`mt-0.5 p-1 rounded-md text-[10px] font-mono font-bold shrink-0 ${
                      active ? "bg-sky-500 text-slate-950" : "bg-white/10 text-slate-400"
                    }`}
                  >
                    {def.scale}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold truncate">{def.title}</div>
                    <div className="text-[11px] text-slate-400 truncate">{def.subtitle}</div>
                  </div>
                  {active && <ChevronRight className="h-4 w-4 text-sky-400 shrink-0 self-center" />}
                </button>
              );
            })}

            {/* Note block */}
            <div className="mt-4 p-3 rounded-xl bg-white/[0.03] border border-white/10 text-[11px] text-slate-400 space-y-1.5">
              <div className="flex items-center gap-1.5 text-sky-300 font-bold">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Priame 1:1 parametrické dáta</span>
              </div>
              <p className="leading-relaxed">
                Všetky kóty, osi a výšky sú počítané v reálnom čase z aktuálneho 3D modelu haly.
              </p>
            </div>
          </div>

          {/* Right Area: Large Vector Drawing Viewport */}
          <div className="flex-1 flex flex-col bg-slate-950 p-4 min-h-0 overflow-hidden">
            {/* View description bar + Zoom & Theme controls */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-2 border-b border-white/10 text-xs text-slate-300">
              <div>
                <span className="font-semibold text-white">
                  {currentDef.title} ({currentDef.scale})
                </span>
                <span className="text-slate-400 hidden lg:inline ml-2">· {currentDef.description}</span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
                  className="px-2.5 py-1 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-[11px] font-semibold text-slate-200 transition cursor-pointer"
                  title="Prepnúť farebný režim výkresu (Tmavý CAD / Biely papier)"
                >
                  {theme === "dark" ? "☀ Biely výkres" : "🌙 Tmavý CAD"}
                </button>
                <div className="flex items-center rounded-lg border border-white/15 bg-white/5 overflow-hidden text-[11px]">
                  <button
                    onClick={() => setZoom((z) => Math.max(0.75, +(z - 0.25).toFixed(2)))}
                    className="px-2 py-1 hover:bg-white/10 text-slate-300 font-bold cursor-pointer"
                    title="Oddialiť"
                  >
                    −
                  </button>
                  <button
                    onClick={() => setZoom(1)}
                    className="px-2 py-1 hover:bg-white/10 text-sky-400 font-mono font-bold cursor-pointer"
                    title="Resetovať mierku zobrazenia"
                  >
                    {Math.round(zoom * 100)}%
                  </button>
                  <button
                    onClick={() => setZoom((z) => Math.min(2.25, +(z + 0.25).toFixed(2)))}
                    className="px-2 py-1 hover:bg-white/10 text-slate-300 font-bold cursor-pointer"
                    title="Priblížiť"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* SVG Canvas wrapper */}
            <div
              className="flex-1 w-full rounded-xl border border-white/10 overflow-auto flex items-center justify-center p-2 shadow-inner"
              style={{ backgroundColor: theme === "light" ? "#f8fafc" : "#0b1120" }}
            >
              <div
                className="w-full h-full flex items-center justify-center transition-transform duration-150 origin-center"
                style={{ transform: `scale(${zoom})` }}
                dangerouslySetInnerHTML={{ __html: svgContent }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
