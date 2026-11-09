import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import {
  DEFAULT_PARAMS,
  type GarageParams,
  resolveColorName,
} from "@/lib/garage/types";
import { ridgeHeight, highEave } from "@/components/garage/Structure";
import { Scene, CameraRig } from "@/components/garage/GarageScene";
import {
  exportToGlb,
  exportToUsdz,
  launchIosAr,
  downloadBlob,
  isIosDevice,
  isMobileDevice,
} from "@/lib/garage/arExporter";
import { generateGarageQuotePDF } from "@/lib/garage/pdfGenerator";
import { downloadGarageFloorPlanPdf } from "@/lib/garage/floorPlanPdfGenerator";
import {
  FileText,
  Smartphone,
  Download,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  Box,
  Layers,
  Shield,
  Loader2,
  ExternalLink,
  Share2,
  Maximize2,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dokumentacia")({
  component: BuildingDocumentationPage,
  head: () => ({
    meta: [
      { title: "Dokumentácia Stavby — VBAU" },
      { name: "description", content: "Kompletná technická dokumentácia stavby, PDF výkresy a AR zobrazenie v priestore." },
    ],
  }),
});

function BuildingDocumentationPage() {
  const exportRef = useRef<THREE.Group | null>(null);
  const [params, setParams] = useState<GarageParams>(DEFAULT_PARAMS);
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [orderId, setOrderId] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [arLoading, setArLoading] = useState<string | null>(null);
  const [isGeneratingQuotePdf, setIsGeneratingQuotePdf] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsMobile(isMobileDevice());
    setIsIos(isIosDevice());

    const searchParams = new URLSearchParams(window.location.search);
    const parsed: Partial<GarageParams> = {};
    const keys = Object.keys(DEFAULT_PARAMS) as (keyof GarageParams)[];

    for (const key of keys) {
      let val = searchParams.get(key);
      if (val === null || val === "" || val === "undefined" || val === "NaN") continue;
      if (typeof DEFAULT_PARAMS[key] === "number") {
        const n = parseFloat(val);
        if (Number.isFinite(n)) parsed[key] = n as any;
      } else if (typeof DEFAULT_PARAMS[key] === "boolean") {
        parsed[key] = (val === "true") as any;
      } else {
        if ((key.includes("Color") || key.includes("color")) && !val.startsWith("#")) {
          val = "#" + val;
        }
        parsed[key] = val as any;
      }
    }

    setParams({ ...DEFAULT_PARAMS, ...parsed });
    setClientName(searchParams.get("client") || searchParams.get("name") || "Vážený zákazník");
    setClientEmail(searchParams.get("email") || "");
    setClientPhone(searchParams.get("phone") || "");
    setOrderId(searchParams.get("id") || `STAVBA-${new Date().getFullYear()}`);
  }, []);

  const W = params.width;
  const L = params.length;
  const Heave = params.clearHeight;
  const Hridge = ridgeHeight(params);
  const floorArea = (W * L).toFixed(1);

  // AR Launch handler
  const handleLaunchAr = async () => {
    if (!exportRef.current) {
      toast.error("3D model sa ešte načítava, skúste o chvíľu.");
      return;
    }
    setArLoading("Pripravujem AR model v reálnej mierke 1:1...");
    try {
      const sanitized = `stavba_${W}x${L}m`.replace(/\s+/g, "_").toLowerCase();
      if (isIos) {
        const usdzBlob = await exportToUsdz(exportRef.current);
        launchIosAr(usdzBlob, `${sanitized}.usdz`);
        toast.success("AR zobrazenie spustené na vašom Apple zariadení!");
      } else {
        const glbBlob = await exportToGlb(exportRef.current);
        downloadBlob(glbBlob, `${sanitized}.glb`);
        toast.success("Model .GLB stiahnutý. Otvorte ho vo vašom prehliadači 3D/AR!");
      }
    } catch (err) {
      console.error("Chyba pri AR:", err);
      toast.error("Nepodarilo sa spustiť AR model: " + String(err));
    } finally {
      setArLoading(null);
    }
  };

  // PDF Quote handler
  const handleDownloadQuotePdf = () => {
    setIsGeneratingQuotePdf(true);
    try {
      const blob = generateGarageQuotePDF({
        params,
        customer: {
          name: clientName,
          email: clientEmail,
          phone: clientPhone,
        },
        quoteId: orderId,
        pricing: {
          steelCost: 0,
          claddingCost: 0,
          componentsSubtotal: 0,
          laborAndTransport: 0,
          subtotalBeforeVat: 0,
          vatAmount: 0,
          totalWithVat: 0,
          hidePrices: true,
        },
        evaluationUrl: typeof window !== "undefined" ? window.location.href : "",
      });

      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `Dokumentacia_${orderId || "Stavba"}_${W}x${L}m.pdf`;
      a.click();
      URL.revokeObjectURL(blobUrl);
      toast.success("PDF ponuka bola stiahnutá!");
    } catch (e) {
      console.error(e);
      toast.error("Nepodarilo sa vygenerovať PDF ponuku.");
    } finally {
      setIsGeneratingQuotePdf(false);
    }
  };

  // PDF Floor Plan handler
  const handleDownloadFloorPlan = () => {
    try {
      downloadGarageFloorPlanPdf(params, `Podorys_${orderId || "Stavba"}`);
      toast.success("Technický pôdorys (PDF) bol vygenerovaný!");
    } catch (e) {
      console.error(e);
      toast.error("Nepodarilo sa vygenerovať pôdorys.");
    }
  };

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Odkaz na dokumentáciu bol skopírovaný do schránky!");
    }
  };

  return (
    <div className="min-h-screen bg-[#070a0e] text-slate-100 font-sans select-text pb-16">
      {/* Top Bar */}
      <header className="border-b border-white/10 bg-black/60 px-4 md:px-8 py-3.5 flex items-center justify-between sticky top-0 z-30 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/80 transition hover:bg-white/10"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Konfigurátor
          </Link>
          <div className="h-4 w-px bg-white/10" />
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-mono font-bold tracking-widest text-emerald-300 uppercase">
              DOKUMENTÁCIA STAVBY
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-1.5 text-xs font-mono transition text-white"
          >
            <Share2 className="h-3.5 w-3.5" />
            Zdieľať
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 md:px-8 pt-6 space-y-6">
        {/* Header Hero Box */}
        <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-[#0c1219] via-[#0f1722] to-[#0c1219] p-5 md:p-7 shadow-2xl relative overflow-hidden">
          <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-[10px] font-mono font-bold text-emerald-300">
                  KÓD: {orderId}
                </span>
                <span className="text-xs text-white/50 font-mono">
                  Zákazník: <strong className="text-white">{clientName}</strong>
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                Oceľová Hala {W}m × {L}m
              </h1>
              <p className="text-xs text-white/60 font-mono mt-1">
                Svetlá výška: {Heave}m · Hrebeň: {Hridge.toFixed(2)}m · Úžitková plocha: {floorArea} m²
              </p>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              <button
                onClick={handleLaunchAr}
                disabled={!!arLoading}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-900 font-bold px-4 py-2.5 text-xs shadow-lg shadow-emerald-400/20 transition cursor-pointer disabled:opacity-50"
              >
                {arLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Pripravujem AR...</span>
                  </>
                ) : (
                  <>
                    <Smartphone className="h-4 w-4" />
                    <span>Spustiť AR v priestore (1:1)</span>
                  </>
                )}
              </button>

              <button
                onClick={handleDownloadQuotePdf}
                disabled={isGeneratingQuotePdf}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 text-white font-bold px-3.5 py-2.5 text-xs transition cursor-pointer"
              >
                <FileText className="h-4 w-4 text-emerald-400" />
                <span>{isGeneratingQuotePdf ? "Pripravujem..." : "PDF Ponuka"}</span>
              </button>

              <button
                onClick={handleDownloadFloorPlan}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 text-white font-bold px-3.5 py-2.5 text-xs transition cursor-pointer"
              >
                <Download className="h-4 w-4 text-sky-400" />
                <span>Pôdorys (PDF)</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3D Model Interactive View */}
        <div className="rounded-2xl border border-white/10 bg-[#0a0d13] overflow-hidden shadow-2xl relative">
          <div className="absolute top-3 left-3 z-10 flex items-center gap-2 pointer-events-none">
            <span className="rounded-full bg-black/60 backdrop-blur-md px-3 py-1 text-[10px] font-mono font-bold text-white/80 border border-white/10 flex items-center gap-1.5">
              <Box className="h-3.5 w-3.5 text-emerald-400" />
              3D Model Stavby
            </span>
            <span className="hidden sm:inline rounded-full bg-black/60 backdrop-blur-md px-3 py-1 text-[10px] font-mono text-white/50 border border-white/10">
              Ťahaním myšou / prstom rotujete
            </span>
          </div>

          <div className="h-[380px] md:h-[480px] w-full">
            <Canvas
              shadows
              dpr={[1, 2]}
              camera={{ position: [10, 8, -10], fov: 35, near: 0.4, far: 350 }}
              gl={{ antialias: true, preserveDrawingBuffer: true, powerPreference: "high-performance" }}
            >
              <color attach="background" args={["#0c1017"]} />
              <fog attach="fog" args={["#0c1017", 50, 300]} />
              <Scene
                params={params}
                exportRef={exportRef}
                removedPanels={{}}
                onTogglePanel={() => {}}
                hideDimensions={false}
                showEnvironment={true}
                isCustom={true}
              />
              <OrbitControls
                makeDefault
                enableDamping
                dampingFactor={0.08}
                target={[0, params.clearHeight / 2, 0]}
                maxPolarAngle={Math.PI / 2 - 0.02}
              />
              <CameraRig preset="iso" params={params} />
            </Canvas>
          </div>
        </div>

        {/* AR Banner Callout */}
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-5 md:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/40">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm md:text-base font-bold text-white">
                Rozšírená Realita (AR) v reálnej mierke 1:1
              </h3>
              <p className="text-xs text-white/60 mt-0.5">
                Namierte telefón na parcelu alebo pripravenú základovú dosku a hala sa vám zobrazí v životnej veľkosti.
              </p>
            </div>
          </div>
          <button
            onClick={handleLaunchAr}
            disabled={!!arLoading}
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-900 font-bold px-5 py-3 text-xs shadow-lg shadow-emerald-400/20 transition cursor-pointer disabled:opacity-50"
          >
            {arLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Smartphone className="h-4 w-4" />
            )}
            <span>{isIos ? "Spustiť AR (Apple QuickLook)" : "Spustiť AR v mobile"}</span>
          </button>
        </div>

        {/* Specification Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Geometria */}
          <div className="rounded-xl border border-white/10 bg-[#0e1218] p-5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">
              <Box className="h-4 w-4" />
              Rozmery & Geometria
            </div>
            <div className="space-y-2 text-xs divide-y divide-white/5">
              <div className="flex justify-between py-1">
                <span className="text-white/50">Šírka (X):</span>
                <span className="font-mono font-bold text-white">{W} m</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-white/50">Dĺžka (Y):</span>
                <span className="font-mono font-bold text-white">{L} m</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-white/50">Svetlá výška:</span>
                <span className="font-mono font-bold text-white">{Heave} m</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-white/50">Výška v hrebeni:</span>
                <span className="font-mono font-bold text-white">{Hridge.toFixed(2)} m</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-white/50">Pôdorysná plocha:</span>
                <span className="font-mono font-bold text-emerald-300">{floorArea} m²</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-white/50">Typ strechy:</span>
                <span className="font-bold text-white">
                  {params.roofType === "gable" ? "Sedlová (štítová)" : "Pultová (jednosmerná)"}
                </span>
              </div>
            </div>
          </div>

          {/* Opláštenie & Farby */}
          <div className="rounded-xl border border-white/10 bg-[#0e1218] p-5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">
              <Layers className="h-4 w-4" />
              Opláštenie & Farby
            </div>
            <div className="space-y-2 text-xs divide-y divide-white/5">
              <div className="flex justify-between py-1">
                <span className="text-white/50">Typ panelu:</span>
                <span className="font-bold text-white uppercase">{params.panelType}</span>
              </div>
              <div className="flex justify-between py-1 items-center">
                <span className="text-white/50">Farba stien:</span>
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded border border-white/20" style={{ backgroundColor: params.claddingColor }} />
                  <span className="font-mono font-bold text-white">{resolveColorName(params.claddingColor)}</span>
                </div>
              </div>
              <div className="flex justify-between py-1 items-center">
                <span className="text-white/50">Farba strechy:</span>
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded border border-white/20" style={{ backgroundColor: params.roofColor }} />
                  <span className="font-mono font-bold text-white">{resolveColorName(params.roofColor)}</span>
                </div>
              </div>
              <div className="flex justify-between py-1 items-center">
                <span className="text-white/50">Oceľová konštrukcia:</span>
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded border border-white/20" style={{ backgroundColor: params.steelColor }} />
                  <span className="font-mono font-bold text-white">{resolveColorName(params.steelColor)}</span>
                </div>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-white/50">Hrúbka profilov:</span>
                <span className="font-mono font-bold text-white">
                  {((params.profileSize ?? DEFAULT_PARAMS.profileSize) * 1000).toFixed(0)} mm
                </span>
              </div>
            </div>
          </div>

          {/* Otvory & Výbava */}
          <div className="rounded-xl border border-white/10 bg-[#0e1218] p-5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">
              <Shield className="h-4 w-4" />
              Výplne Otvorov & Výbava
            </div>
            <div className="space-y-2 text-xs divide-y divide-white/5">
              <div className="flex justify-between py-1">
                <span className="text-white/50">Hlavná brána:</span>
                <span className="font-bold text-white">{params.doorWidth} × {params.doorHeight} m</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-white/50">Typ brány:</span>
                <span className="font-bold text-white">Sekčná priemyselná</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-white/50">Personálne dvere:</span>
                <span className="font-bold text-white">
                  {params.hasPersonalDoor ? `Áno (${params.personalDoorSide})` : "Nie"}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-white/50">Okná:</span>
                <span className="font-bold text-white">
                  {params.hasWindows ? `${params.windowCount}x (${params.windowWidth}×${params.windowHeight}m)` : "Bez okien"}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-white/50">Klampiarske prvky a lemovanie:</span>
                <span className="font-bold text-white">{params.showAccessories ? "Kompletné" : "Základné"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* PDF Download Section */}
        <div className="rounded-2xl border border-white/10 bg-[#0e1218] p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2.5">
              <FileText className="h-5 w-5 text-emerald-400" />
              <h3 className="text-base font-bold text-white">Dokumenty na stiahnutie</h3>
            </div>
            <span className="text-[11px] text-white/50 font-mono">Formát A4 PDF</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-white/10 bg-black/40 p-4 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white">Oficiálna Cenová Ponuka a Špecifikácia</h4>
                <p className="text-xs text-white/50 mt-0.5">Kompletný rozpis komponentov a parametrov stavby</p>
              </div>
              <button
                onClick={handleDownloadQuotePdf}
                disabled={isGeneratingQuotePdf}
                className="rounded-lg bg-emerald-400 hover:bg-emerald-300 text-slate-900 font-bold px-3.5 py-2 text-xs flex items-center gap-1.5 transition cursor-pointer shrink-0 ml-3"
              >
                <Download className="h-4 w-4" />
                Stiahnuť
              </button>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/40 p-4 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white">Technický Pôdorys a Dispozícia</h4>
                <p className="text-xs text-white/50 mt-0.5">Vektorový architektonický výkres s kótami 1:1</p>
              </div>
              <button
                onClick={handleDownloadFloorPlan}
                className="rounded-lg bg-sky-400 hover:bg-sky-300 text-slate-900 font-bold px-3.5 py-2 text-xs flex items-center gap-1.5 transition cursor-pointer shrink-0 ml-3"
              >
                <Download className="h-4 w-4" />
                Stiahnuť
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
