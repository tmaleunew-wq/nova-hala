import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DEFAULT_PARAMS, type GarageParams } from "@/lib/garage/types";
import { ridgeHeight, highEave } from "@/components/garage/Structure";
import { getCladdingConfig } from "@/lib/garage/configHelper";
import { ArrowLeft, Printer, Link as LinkIcon, DollarSign, RefreshCw, Calculator, FileText, CheckCircle, FileSpreadsheet, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { generateOrderExcelXml } from "@/lib/garage/excelGenerator";
import { fetchInquiriesFromSupabase } from "@/lib/supabase";

import { AdminAuthGate } from "@/components/garage/AdminAuthGate";
import { PriceQuoteModal } from "@/components/garage/PriceQuoteModal";

export const Route = createFileRoute("/vyhodnotenie")({
  component: () => (
    <AdminAuthGate>
      <OrderEvaluation />
    </AdminAuthGate>
  ),
  head: () => ({
    meta: [
      { title: "Vyhodnotenie Objednávky — Admin Panel" },
      { name: "description", content: "Administrátorský systém pre nacenenie a vyhodnotenie parametrov oceľovej garáže." },
    ],
  }),
});

function OrderEvaluation() {
  const [params, setParams] = useState<GarageParams>(DEFAULT_PARAMS);
  const [savedOrders, setSavedOrders] = useState<any[]>([]);
  const [clientName, setClientName] = useState<string | null>(null);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);

  // Editable prices states
  const [steelPricePerKg, setSteelPricePerKg] = useState<number>(1.85);
  const [steelWeightPerMeter, setSteelWeightPerMeter] = useState<number>(6.2);
  const [sandwichPricePerSqM, setSandwichPricePerSqM] = useState<number>(32.50);
  const [trapezoidPricePerSqM, setTrapezoidPricePerSqM] = useState<number>(16.80);
  const [basePlateCost, setBasePlateCost] = useState<number>(12.00);
  const [garageDoorCost, setGarageDoorCost] = useState<number>(550.00);
  const [personalDoorCost, setPersonalDoorCost] = useState<number>(220.00);
  const [windowCost, setWindowCost] = useState<number>(140.00);
  const [foundationPricePerSqM, setFoundationPricePerSqM] = useState<number>(65.00);

  // Extra costs
  const [transportCost, setTransportCost] = useState<number>(150.00);
  const [laborCost, setLaborCost] = useState<number>(850.00);
  const [marginPercent, setMarginPercent] = useState<number>(15);

  useEffect(() => {
    if (typeof window === "undefined") return;
    
    // Load from Supabase and fallback to localStorage
    fetchInquiriesFromSupabase().then((supaOrders) => {
      if (supaOrders && supaOrders.length > 0) {
        const formatted = supaOrders.map(o => ({
          id: o.order_id,
          date: o.created_at ? new Date(o.created_at).toLocaleString("sk-SK") : "",
          name: o.name,
          email: o.email,
          phone: o.phone,
          message: o.message,
          params: o.params,
          totalWithVat: o.total_price,
          evaluationUrl: o.evaluation_url,
        }));
        setSavedOrders(formatted);
      } else {
        try {
          const orders = JSON.parse(localStorage.getItem("ssf_orders") || "[]");
          setSavedOrders(orders);
        } catch (e) {}
      }
    });

    const searchParams = new URLSearchParams(window.location.search);
    const client = searchParams.get("client");
    setClientName(client);

    // Read garage params
    const parsed: Partial<GarageParams> = {};
    const keys = Object.keys(DEFAULT_PARAMS) as (keyof GarageParams)[];
    for (const key of keys) {
      const val = searchParams.get(key);
      if (val === null || val === "" || val === "undefined" || val === "NaN") continue;
      if (typeof DEFAULT_PARAMS[key] === "number") {
        const n = parseFloat(val);
        if (Number.isFinite(n)) parsed[key] = n as any;
      } else if (typeof DEFAULT_PARAMS[key] === "boolean") {
        parsed[key] = (val === "true") as any;
      } else {
        parsed[key] = val as any;
      }
    }

    const mergedParams = { ...DEFAULT_PARAMS, ...parsed } as GarageParams;
    setParams(mergedParams);

    // Load custom pricing values from URL if they exist
    const pSteel = searchParams.get("p_steel");
    const pSteelW = searchParams.get("p_steel_w");
    const pSandwich = searchParams.get("p_sandwich");
    const pTrapezoid = searchParams.get("p_trapezoid");
    const pBasePlate = searchParams.get("p_baseplate");
    const pGDoor = searchParams.get("p_gdoor");
    const pPDoor = searchParams.get("p_pdoor");
    const pWindow = searchParams.get("p_window");
    const pFoundation = searchParams.get("p_foundation");
    const pTransport = searchParams.get("p_transport");
    const pLabor = searchParams.get("p_labor");
    const pMargin = searchParams.get("p_margin");

    // Fallback load configuration from JSON
    const config = getCladdingConfig(client);
    setSandwichPricePerSqM(pSandwich ? parseFloat(pSandwich) : config.sandwichPricePerSqM);
    setTrapezoidPricePerSqM(pTrapezoid ? parseFloat(pTrapezoid) : config.trapezoidPricePerSqM);

    if (pSteel) setSteelPricePerKg(parseFloat(pSteel));
    if (pSteelW) setSteelWeightPerMeter(parseFloat(pSteelW));
    if (pBasePlate) setBasePlateCost(parseFloat(pBasePlate));
    if (pGDoor) setGarageDoorCost(parseFloat(pGDoor));
    if (pPDoor) setPersonalDoorCost(parseFloat(pPDoor));
    if (pWindow) setWindowCost(parseFloat(pWindow));
    if (pFoundation) setFoundationPricePerSqM(parseFloat(pFoundation));
    if (pTransport) setTransportCost(parseFloat(pTransport));
    if (pLabor) setLaborCost(parseFloat(pLabor));
    if (pMargin) setMarginPercent(parseFloat(pMargin));

  }, []);

  // Geometry details
  const W = params.width;
  const L = params.length;
  const Heave = params.clearHeight;
  const Hridge = ridgeHeight(params);
  const Hhi = highEave(params);
  const frames = params.bayCount + 1;

  // Frame columns length
  const leftColH = params.roofType === "shed" ? Heave : Heave;
  const rightColH = params.roofType === "shed" ? Hhi : Heave;
  const totalColLength = frames * leftColH + frames * rightColH;

  // Rafters
  let totalRafterLength = 0;
  if (params.roofType === "gable") {
    const halfW = W / 2;
    const slopeLen = Math.hypot(halfW, Hridge - Heave);
    totalRafterLength = frames * 2 * slopeLen;
  } else {
    const slopeLen = Math.hypot(W, Hhi - Heave);
    totalRafterLength = frames * slopeLen;
  }

  // Purlins
  let totalPurlinLength = 0;
  if (params.roofType === "gable") {
    const halfW = W / 2;
    const slopeLen = Math.hypot(halfW, Hridge - Heave);
    const purlinCount = Math.max(2, Math.round(slopeLen / 0.8));
    totalPurlinLength = 2 * (purlinCount + 1) * L;
  } else {
    const slopeLen = Math.hypot(W, Hhi - Heave);
    const purlinCount = Math.max(3, Math.round(slopeLen / 0.8));
    totalPurlinLength = (purlinCount + 1) * L;
  }

  // Girts
  const heights = [0.6, 1.4, 2.2];
  let totalGirtsLength = 0;
  for (const h of heights) {
    if (h >= Heave) continue;
    const frontLen = h < params.doorHeight ? Math.max(0, W - params.doorWidth) : W;
    const backLen = (params.personalDoorSide === "back" && params.hasPersonalDoor && h < 2.0) ? Math.max(0, W - 0.9) : W;
    let leftLen = L;
    if (params.personalDoorSide === "left" && params.hasPersonalDoor && h < 2.0) {
      leftLen -= 0.9;
    }
    const winBottom = 1.6 - params.windowHeight / 2;
    const winTop = 1.6 + params.windowHeight / 2;
    if (h > winBottom && h < winTop) {
      leftLen -= params.windowCount * params.windowWidth;
    }
    const rightLen = (params.personalDoorSide === "right" && params.hasPersonalDoor && h < 2.0) ? Math.max(0, L - 0.9) : L;
    totalGirtsLength += (frontLen + backLen + leftLen + rightLen);
  }

  const totalEaveRidgeLength = 2 * L + (params.roofType === "gable" ? L : 0);
  const totalSteelLength = totalColLength + totalRafterLength + totalPurlinLength + totalGirtsLength + totalEaveRidgeLength;
  const totalSteelWeight = totalSteelLength * steelWeightPerMeter;
  const calculatedSteelCost = totalSteelWeight * steelPricePerKg;

  // Cladding surface calculation
  const wallArea = 2 * W * Heave + 2 * L * Heave;
  const gableArea = params.roofType === "gable" ? W * (Hridge - Heave) : 0;
  let roofArea = 0;
  if (params.roofType === "gable") {
    roofArea = 2 * Math.hypot(W / 2, Hridge - Heave) * L;
  } else {
    roofArea = Math.hypot(W, Hhi - Heave) * L;
  }
  const totalCladdingArea = wallArea + gableArea + roofArea;
  const activeCladdingUnitPrice = (params.panelType === "sandwich" || params.panelType === "smooth") ? sandwichPricePerSqM : trapezoidPricePerSqM;
  const calculatedCladdingCost = totalCladdingArea * activeCladdingUnitPrice;

  // Subcomponents calculation
  const basePlatesCount = frames * 2;
  const calculatedBasePlateCost = basePlatesCount * basePlateCost;
  const calculatedGarageDoorCost = garageDoorCost;
  const calculatedPersonalDoorCost = params.hasPersonalDoor ? personalDoorCost : 0;
  const calculatedWindowsCost = params.hasWindows ? params.windowCount * windowCost : 0;
  const calculatedFoundationCost = params.showFoundation ? (W * L * foundationPricePerSqM) : 0;

  // Totals calculations
  const rawSubtotal = calculatedSteelCost + calculatedCladdingCost + calculatedBasePlateCost + calculatedGarageDoorCost + calculatedPersonalDoorCost + calculatedWindowsCost + calculatedFoundationCost;
  
  const rawTotalWithExtras = rawSubtotal + transportCost + laborCost;
  const marginAmount = (rawTotalWithExtras * marginPercent) / 100;
  
  const finalSubtotalBeforeVat = rawTotalWithExtras + marginAmount;
  const vatAmount = finalSubtotalBeforeVat * 0.20;
  const finalTotalWithVat = finalSubtotalBeforeVat + vatAmount;

  // Actions
  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = () => {
    if (typeof window === "undefined") return;
    const currentParams = new URLSearchParams(window.location.search);
    
    // Set custom pricing parameters
    currentParams.set("p_steel", steelPricePerKg.toString());
    currentParams.set("p_steel_w", steelWeightPerMeter.toString());
    currentParams.set("p_sandwich", sandwichPricePerSqM.toString());
    currentParams.set("p_trapezoid", trapezoidPricePerSqM.toString());
    currentParams.set("p_baseplate", basePlateCost.toString());
    currentParams.set("p_gdoor", garageDoorCost.toString());
    currentParams.set("p_pdoor", personalDoorCost.toString());
    currentParams.set("p_window", windowCost.toString());
    currentParams.set("p_foundation", foundationPricePerSqM.toString());
    currentParams.set("p_transport", transportCost.toString());
    currentParams.set("p_labor", laborCost.toString());
    currentParams.set("p_margin", marginPercent.toString());

    const newUrl = `${window.location.origin}${window.location.pathname}?${currentParams.toString()}`;
    navigator.clipboard.writeText(newUrl);
    toast.success("Odkaz s nacenenými položkami bol skopírovaný!");
  };

  const handleReset = () => {
    setSteelPricePerKg(1.85);
    setSteelWeightPerMeter(6.2);
    setBasePlateCost(12.00);
    setGarageDoorCost(550.00);
    setPersonalDoorCost(220.00);
    setWindowCost(140.00);
    setFoundationPricePerSqM(65.00);
    setTransportCost(150.00);
    setLaborCost(850.00);
    setMarginPercent(15);
    
    const config = getCladdingConfig(clientName);
    setSandwichPricePerSqM(config.sandwichPricePerSqM);
    setTrapezoidPricePerSqM(config.trapezoidPricePerSqM);

    toast.info("Ceny boli obnovené na predvolené hodnoty.");
  };

  const handleExportExcel = () => {
    const date = new Date().toLocaleDateString("sk-SK");
    const pricing = {
      steelPricePerKg,
      steelWeightPerMeter,
      sandwichPricePerSqM,
      trapezoidPricePerSqM,
      basePlateCost,
      garageDoorCost,
      personalDoorCost,
      windowCost,
      foundationPricePerSqM,
      transportCost,
      laborCost,
      marginPercent,
    };

    const xml = generateOrderExcelXml(params, pricing, clientName);

    const blob = new Blob([xml], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "garaz_" + W + "x" + L + "_kalkulacia_" + date.replace(/\./g, "-") + ".xls";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Excel súbor bol stiahnutý!");
  };

  return (
    <div className="min-h-screen bg-[#0b0f14] text-slate-100 font-mono select-text print:bg-white print:text-black">
      {/* Header bar */}
      <div className="border-b border-white/10 bg-black/40 px-6 py-4 flex items-center justify-between sticky top-0 z-20 backdrop-blur-md print:hidden">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            search={typeof window !== "undefined" && window.location.search ? Object.fromEntries(new URLSearchParams(window.location.search)) : undefined}
            className="flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/80 transition hover:bg-white/10"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Späť
          </Link>
          <Link
            to="/admin"
            className="flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/20 px-3 py-1.5 text-xs text-emerald-300 transition hover:bg-emerald-500/30"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Admin Dashboard
          </Link>
          <div className="h-4 w-px bg-white/10" />
          <h1 className="text-sm font-bold tracking-widest text-white">
            VYHODNOTENIE A NACENENIE OBJEDNÁVKY
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsQuoteModalOpen(true)}
            className="flex items-center gap-1.5 rounded bg-emerald-400 font-bold text-black border border-emerald-300 px-3.5 py-1.5 text-xs hover:bg-emerald-300 transition shadow-lg shadow-emerald-400/20"
          >
            <FileText className="h-3.5 w-3.5" />
            Cenová Ponuka (PDF/E-mail)
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-1 rounded bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10 transition"
            title="Obnoviť predvolené ceny"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reset
          </button>
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1.5 text-xs hover:bg-emerald-500/30 transition"
          >
            <LinkIcon className="h-3.5 w-3.5" />
            Zdieľať ponuku
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1.5 text-xs hover:bg-emerald-500/30 transition"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Exportovať do Excelu
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 rounded bg-emerald-400 text-black px-4 py-1.5 text-xs font-bold hover:bg-emerald-300 transition"
          >
            <Printer className="h-3.5 w-3.5" />
            Tlačiť ponuku
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 print:block print:max-w-full print:p-0">
        
        {/* Parametre - Left Column */}
        <div className="lg:col-span-5 space-y-6 print:hidden">
          {savedOrders.length > 0 && (
            <div className="rounded-lg border border-emerald-500/30 bg-[#0e1218] p-5 shadow-lg">
              <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
                <div className="flex items-center gap-2 text-emerald-400">
                  <FileSpreadsheet className="h-4 w-4" />
                  <h2 className="text-xs uppercase font-bold tracking-widest">Prijaté Dopyty ({savedOrders.length})</h2>
                </div>
                <button
                  onClick={() => {
                    localStorage.removeItem("ssf_orders");
                    setSavedOrders([]);
                    toast.info("História dopytov bola vymazaná.");
                  }}
                  className="text-[10px] text-white/40 hover:text-red-400 transition"
                >
                  Vymazať históriu
                </button>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {savedOrders.map((ord: any, idx: number) => (
                  <div key={ord.id || idx} className="rounded bg-black/40 p-2.5 text-xs flex items-center justify-between border border-white/5 hover:border-emerald-500/40 transition">
                    <div>
                      <div className="font-bold text-white">{ord.name} <span className="text-[10px] font-normal text-white/40">({ord.date})</span></div>
                      <div className="text-[10px] text-white/60">{ord.params?.width}x{ord.params?.length}m | {ord.email}</div>
                    </div>
                    <a
                      href={ord.evaluationUrl}
                      className="rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-1 text-[10px] font-bold hover:bg-emerald-500/30 transition"
                    >
                      Otvoriť
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-lg border border-white/10 bg-[#0e1218] p-5">
            <div className="flex items-center gap-2 mb-4 text-emerald-400 border-b border-white/5 pb-2">
              <Calculator className="h-4 w-4" />
              <h2 className="text-xs uppercase font-bold tracking-widest">Technická Špecifikácia</h2>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <h3 className="text-white/50 mb-1.5">Geometria</h3>
                <div className="grid grid-cols-2 gap-2 bg-black/30 p-2.5 rounded">
                  <div>Šírka: <span className="text-white font-bold">{W.toFixed(2)} m</span></div>
                  <div>Dĺžka: <span className="text-white font-bold">{L.toFixed(2)} m</span></div>
                  <div>Výška (eave): <span className="text-white font-bold">{Heave.toFixed(2)} m</span></div>
                  <div>Výška (ridge): <span className="text-white font-bold">{Hridge.toFixed(2)} m</span></div>
                  <div>Strecha: <span className="text-white font-bold uppercase">{params.roofType === "gable" ? "Sedlová" : "Pultová"}</span></div>
                  <div>Spád strechy: <span className="text-white font-bold">{params.roofPitchDeg}°</span></div>
                </div>
              </div>

              <div>
                <h3 className="text-white/50 mb-1.5">Konštrukcia</h3>
                <div className="grid grid-cols-2 gap-2 bg-black/30 p-2.5 rounded">
                  <div>Počet polí: <span className="text-white font-bold">{params.bayCount}</span></div>
                  <div>Rámov: <span className="text-white font-bold">{frames}</span></div>
                  <div>Rozmer jaklu: <span className="text-white font-bold">{(params.profileSize * 1000).toFixed(0)} mm</span></div>
                  <div>Hrúbka steny: <span className="text-white font-bold">{(params.profileThickness * 1000).toFixed(0)} mm</span></div>
                  <div className="col-span-2 flex items-center gap-1.5">
                    Farba ocele: 
                    <span className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: params.steelColor }} />
                    <span className="font-bold">{params.steelColor}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-white/50 mb-1.5">Opláštenie & Izolácia</h3>
                <div className="space-y-1.5 bg-black/30 p-2.5 rounded">
                  <div className="flex justify-between">
                    <span>Typ stien:</span>
                    <span className="text-white font-bold uppercase">{params.panelType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Typ strechy:</span>
                    <span className="text-white font-bold uppercase">{params.roofPanelType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Steny RAL:</span>
                    <span className="text-white font-bold" style={{ color: params.claddingColor }}>{params.claddingColor}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Strecha RAL:</span>
                    <span className="text-white font-bold" style={{ color: params.roofColor }}>{params.roofColor}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Izolačné jadro:</span>
                    <span className="text-white font-bold uppercase">{params.insulationCore}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Hrúbka panela (Stena / Strecha):</span>
                    <span className="text-white font-bold">{params.wallPanelThicknessMm}mm / {params.roofPanelThicknessMm}mm</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Plech (Vonkajší / Vnútorný):</span>
                    <span className="text-white font-bold">{params.outerSheetMm}mm / {params.innerSheetMm}mm</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-white/50 mb-1.5">Otvory a doplnky</h3>
                <div className="grid grid-cols-2 gap-2 bg-black/30 p-2.5 rounded">
                  <div>Rozmer brány: <span className="text-white font-bold">{params.doorWidth}×{params.doorHeight}m</span></div>
                  <div>Garážová brána RAL: <span className="text-white font-bold">{params.sectionalDoorColor}</span></div>
                  <div>Personálne dvere: <span className="text-white font-bold">{params.hasPersonalDoor ? `Áno (${params.personalDoorSide})` : "Nie"}</span></div>
                  {params.hasPersonalDoor && <div>Dvere RAL: <span className="text-white font-bold">{params.doorColor}</span></div>}
                  <div>Okná: <span className="text-white font-bold">{params.hasWindows ? `${params.windowCount}x (${params.windowSide})` : "Nie"}</span></div>
                  {params.hasWindows && <div>Rozmer okna: <span className="text-white font-bold">{params.windowWidth}×{params.windowHeight}m</span></div>}
                  <div>Základová doska: <span className="text-white font-bold">{params.showFoundation ? "Áno" : "Nie"}</span></div>
                  <div>Príslušenstvo: <span className="text-white font-bold">{params.showAccessories ? "Áno" : "Nie"}</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Naceňovací panel - Right Column */}
        <div className="lg:col-span-7 space-y-6 print:w-full print:block">
          
          {/* Print version header */}
          <div className="hidden print:block mb-8 text-black">
            <div className="flex justify-between items-start border-b-2 border-emerald-500 pb-4">
              <div>
                <h1 className="text-xl font-bold tracking-wider">CENOVÁ PONUKA</h1>
                <p className="text-xs text-slate-500 mt-1">Názov konfigurácie: Steel Garage Parametric</p>
              </div>
              <div className="text-right text-xs">
                <p className="font-bold">Dátum: {new Date().toLocaleDateString("sk-SK")}</p>
                <p>Mena: EUR (€)</p>
              </div>
            </div>
            
            <div className="mt-6 grid grid-cols-3 gap-4 text-xs border border-slate-200 p-4 rounded bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-500 uppercase mb-1">Základná geometria</h3>
                <p>Šírka: <b>{W.toFixed(2)} m</b></p>
                <p>Dĺžka: <b>{L.toFixed(2)} m</b></p>
                <p>Svetlá výška: <b>{Heave.toFixed(2)} m</b></p>
                <p>Strecha: <b>{params.roofType === "gable" ? "Sedlová" : "Pultová"} ({params.roofPitchDeg}°)</b></p>
              </div>
              <div>
                <h3 className="font-bold text-slate-500 uppercase mb-1">Opláštenie & Farby</h3>
                <p>Opláštenie: <b>{params.panelType === "sandwich" ? "Sendvičový panel" : "Trapézový plech"}</b></p>
                <p>Jadro izolácie: <b>{params.insulationCore} ({params.wallPanelThicknessMm}mm)</b></p>
                <p>Farba stien: <b style={{ color: params.claddingColor === "#f5f5f0" ? "#000" : params.claddingColor }}>{params.claddingColor}</b></p>
                <p>Farba strechy: <b style={{ color: params.roofColor }}>{params.roofColor}</b></p>
              </div>
              <div>
                <h3 className="font-bold text-slate-500 uppercase mb-1">Dvere a okná</h3>
                <p>Brána: <b>1x {params.doorWidth}×{params.doorHeight}m</b></p>
                <p>Dvere personálne: <b>{params.hasPersonalDoor ? "1x" : "Nie"}</b></p>
                <p>Okná: <b>{params.hasWindows ? `${params.windowCount}x` : "Nie"}</b></p>
                <p>Základová doska: <b>{params.showFoundation ? "Áno" : "Nie"}</b></p>
              </div>
            </div>
          </div>

          {/* Pricing settings panel (admin only) */}
          <div className="rounded-lg border border-white/10 bg-[#0e1218] p-5 print:hidden">
            <div className="flex items-center gap-2 mb-4 text-emerald-400 border-b border-white/5 pb-2">
              <DollarSign className="h-4 w-4" />
              <h2 className="text-xs uppercase font-bold tracking-widest">Nastavenie Jednotkových Cien (€)</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block text-white/50 mb-1">Cena ocele za kg</label>
                <input
                  type="number"
                  step="0.05"
                  value={steelPricePerKg}
                  onChange={(e) => setSteelPricePerKg(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full bg-black/40 border border-white/10 rounded px-2.5 py-1.5 text-white focus:border-emerald-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-white/50 mb-1">Hmotnosť ocele (kg/m)</label>
                <input
                  type="number"
                  step="0.1"
                  value={steelWeightPerMeter}
                  onChange={(e) => setSteelWeightPerMeter(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full bg-black/40 border border-white/10 rounded px-2.5 py-1.5 text-white focus:border-emerald-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-white/50 mb-1">Sendvič. panel (€/m²)</label>
                <input
                  type="number"
                  step="0.5"
                  value={sandwichPricePerSqM}
                  onChange={(e) => setSandwichPricePerSqM(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full bg-black/40 border border-white/10 rounded px-2.5 py-1.5 text-white focus:border-emerald-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-white/50 mb-1">Trapézový plech (€/m²)</label>
                <input
                  type="number"
                  step="0.5"
                  value={trapezoidPricePerSqM}
                  onChange={(e) => setTrapezoidPricePerSqM(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full bg-black/40 border border-white/10 rounded px-2.5 py-1.5 text-white focus:border-emerald-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-white/50 mb-1">Pätka / platňa (€/ks)</label>
                <input
                  type="number"
                  step="1"
                  value={basePlateCost}
                  onChange={(e) => setBasePlateCost(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full bg-black/40 border border-white/10 rounded px-2.5 py-1.5 text-white focus:border-emerald-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-white/50 mb-1">Garážová brána (€/ks)</label>
                <input
                  type="number"
                  step="10"
                  value={garageDoorCost}
                  onChange={(e) => setGarageDoorCost(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full bg-black/40 border border-white/10 rounded px-2.5 py-1.5 text-white focus:border-emerald-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-white/50 mb-1">Personálne dvere (€/ks)</label>
                <input
                  type="number"
                  step="10"
                  value={personalDoorCost}
                  onChange={(e) => setPersonalDoorCost(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full bg-black/40 border border-white/10 rounded px-2.5 py-1.5 text-white focus:border-emerald-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-white/50 mb-1">Okno (€/ks)</label>
                <input
                  type="number"
                  step="5"
                  value={windowCost}
                  onChange={(e) => setWindowCost(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full bg-black/40 border border-white/10 rounded px-2.5 py-1.5 text-white focus:border-emerald-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-white/50 mb-1">Základová doska (€/m²)</label>
                <input
                  type="number"
                  step="5"
                  value={foundationPricePerSqM}
                  onChange={(e) => setFoundationPricePerSqM(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full bg-black/40 border border-white/10 rounded px-2.5 py-1.5 text-white focus:border-emerald-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-white/50 mb-1">Montáž / Práca (€)</label>
                <input
                  type="number"
                  step="50"
                  value={laborCost}
                  onChange={(e) => setLaborCost(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full bg-black/40 border border-white/10 rounded px-2.5 py-1.5 text-white focus:border-emerald-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-white/50 mb-1">Doprava / Logistika (€)</label>
                <input
                  type="number"
                  step="10"
                  value={transportCost}
                  onChange={(e) => setTransportCost(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full bg-black/40 border border-white/10 rounded px-2.5 py-1.5 text-white focus:border-emerald-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-white/50 mb-1">Marža / Zisk (%)</label>
                <input
                  type="number"
                  step="1"
                  value={marginPercent}
                  onChange={(e) => setMarginPercent(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full bg-black/40 border border-white/10 rounded px-2.5 py-1.5 text-white focus:border-emerald-400 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Pricing detail & Calculation sheet */}
          <div className="rounded-lg border border-white/10 bg-[#0e1218] p-5 print:border-none print:bg-white print:p-0">
            <div className="flex items-center gap-2 mb-4 text-emerald-400 border-b border-white/5 pb-2 print:border-slate-300 print:text-black">
              <FileText className="h-4 w-4 print:hidden" />
              <h2 className="text-xs uppercase font-bold tracking-widest print:text-sm">Podrobný Rozpis Kalkulácie</h2>
            </div>

            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-white/40 print:border-slate-300 print:text-slate-500">
                  <th className="py-2 font-normal">Položka špecifikácie</th>
                  <th className="py-2 text-right font-normal">Množstvo</th>
                  <th className="py-2 text-right font-normal">Jedn. cena</th>
                  <th className="py-2 text-right font-normal">Cena bez DPH</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 print:divide-slate-200">
                {/* Steel Structure */}
                <tr>
                  <td className="py-2.5 pr-2">
                    <div className="font-bold text-slate-200 print:text-black">Oceľová nosná konštrukcia (jakl)</div>
                    <div className="text-[10px] text-white/40 print:text-slate-500">
                      Výpočet: stĺpy, krokvy, väznice, paždíky, väzníky (Celkovo {totalSteelLength.toFixed(1)} m)
                    </div>
                  </td>
                  <td className="py-2.5 text-right font-mono">{totalSteelWeight.toFixed(0)} kg</td>
                  <td className="py-2.5 text-right font-mono">{steelPricePerKg.toFixed(2)} €</td>
                  <td className="py-2.5 text-right font-mono font-bold text-slate-100 print:text-black">{calculatedSteelCost.toFixed(2)} €</td>
                </tr>

                {/* Cladding Panels */}
                <tr>
                  <td className="py-2.5 pr-2">
                    <div className="font-bold text-slate-200 print:text-black">
                      Opláštenie stien a strechy ({params.panelType === "sandwich" ? "Sendvič" : "Trapéz"})
                    </div>
                    <div className="text-[10px] text-white/40 print:text-slate-500">
                      Celková plocha stien, štítov a strechy
                    </div>
                  </td>
                  <td className="py-2.5 text-right font-mono">{totalCladdingArea.toFixed(1)} m²</td>
                  <td className="py-2.5 text-right font-mono">{activeCladdingUnitPrice.toFixed(2)} €</td>
                  <td className="py-2.5 text-right font-mono font-bold text-slate-100 print:text-black">{calculatedCladdingCost.toFixed(2)} €</td>
                </tr>

                {/* Base plates */}
                <tr>
                  <td className="py-2.5 pr-2">
                    <div className="font-bold text-slate-200 print:text-black">Kotviace platne / pätky</div>
                    <div className="text-[10px] text-white/40 print:text-slate-500">Vrátane spojovacieho materiálu</div>
                  </td>
                  <td className="py-2.5 text-right font-mono">{basePlatesCount} ks</td>
                  <td className="py-2.5 text-right font-mono">{basePlateCost.toFixed(2)} €</td>
                  <td className="py-2.5 text-right font-mono font-bold text-slate-100 print:text-black">{calculatedBasePlateCost.toFixed(2)} €</td>
                </tr>

                {/* Garage Door */}
                <tr>
                  <td className="py-2.5 pr-2">
                    <div className="font-bold text-slate-200 print:text-black">Sekcionálna garážová brána</div>
                    <div className="text-[10px] text-white/40 print:text-slate-500">Rozmer: {params.doorWidth} × {params.doorHeight} m</div>
                  </td>
                  <td className="py-2.5 text-right font-mono">1 ks</td>
                  <td className="py-2.5 text-right font-mono">{garageDoorCost.toFixed(2)} €</td>
                  <td className="py-2.5 text-right font-mono font-bold text-slate-100 print:text-black">{calculatedGarageDoorCost.toFixed(2)} €</td>
                </tr>

                {/* Personal Door */}
                {params.hasPersonalDoor && (
                  <tr>
                    <td className="py-2.5 pr-2">
                      <div className="font-bold text-slate-200 print:text-black">Personálne vstupné dvere</div>
                      <div className="text-[10px] text-white/40 print:text-slate-500">Kovové zateplené, umiestnenie: {params.personalDoorSide}</div>
                    </td>
                    <td className="py-2.5 text-right font-mono">1 ks</td>
                    <td className="py-2.5 text-right font-mono">{personalDoorCost.toFixed(2)} €</td>
                    <td className="py-2.5 text-right font-mono font-bold text-slate-100 print:text-black">{calculatedPersonalDoorCost.toFixed(2)} €</td>
                  </tr>
                )}

                {/* Windows */}
                {params.hasWindows && params.windowCount > 0 && (
                  <tr>
                    <td className="py-2.5 pr-2">
                      <div className="font-bold text-slate-200 print:text-black">Svetlíkové okná</div>
                      <div className="text-[10px] text-white/40 print:text-slate-500">Rozmer: {params.windowWidth} × {params.windowHeight} m</div>
                    </td>
                    <td className="py-2.5 text-right font-mono">{params.windowCount} ks</td>
                    <td className="py-2.5 text-right font-mono">{windowCost.toFixed(2)} €</td>
                    <td className="py-2.5 text-right font-mono font-bold text-slate-100 print:text-black">{calculatedWindowsCost.toFixed(2)} €</td>
                  </tr>
                )}

                {/* Foundation */}
                {params.showFoundation && (
                  <tr>
                    <td className="py-2.5 pr-2">
                      <div className="font-bold text-slate-200 print:text-black">Železobetónová základová platňa</div>
                      <div className="text-[10px] text-white/40 print:text-slate-500">Výpočet plochy: {W} × {L} m</div>
                    </td>
                    <td className="py-2.5 text-right font-mono">{(W * L).toFixed(1)} m²</td>
                    <td className="py-2.5 text-right font-mono">{foundationPricePerSqM.toFixed(2)} €</td>
                    <td className="py-2.5 text-right font-mono font-bold text-slate-100 print:text-black">{calculatedFoundationCost.toFixed(2)} €</td>
                  </tr>
                )}

                {/* Transport */}
                <tr>
                  <td className="py-2.5 pr-2">
                    <div className="font-bold text-slate-200 print:text-black">Doprava, logistika a vykládka materiálu</div>
                  </td>
                  <td className="py-2.5 text-right font-mono">Paušál</td>
                  <td className="py-2.5 text-right font-mono">{transportCost.toFixed(2)} €</td>
                  <td className="py-2.5 text-right font-mono font-bold text-slate-100 print:text-black">{transportCost.toFixed(2)} €</td>
                </tr>

                {/* Labor / Assembly */}
                <tr>
                  <td className="py-2.5 pr-2">
                    <div className="font-bold text-slate-200 print:text-black">Montážne a stavebné práce konštrukcie a opláštenia</div>
                  </td>
                  <td className="py-2.5 text-right font-mono">Práca</td>
                  <td className="py-2.5 text-right font-mono">{laborCost.toFixed(2)} €</td>
                  <td className="py-2.5 text-right font-mono font-bold text-slate-100 print:text-black">{laborCost.toFixed(2)} €</td>
                </tr>

                {/* Custom margin */}
                {marginPercent > 0 && (
                  <tr>
                    <td className="py-2.5 pr-2">
                      <div className="font-bold text-slate-200 print:text-black">Ostatné réžie, marža a poistenie rizík</div>
                    </td>
                    <td className="py-2.5 text-right font-mono">{marginPercent} %</td>
                    <td className="py-2.5 text-right font-mono">Z celku</td>
                    <td className="py-2.5 text-right font-mono font-bold text-slate-100 print:text-black">{marginAmount.toFixed(2)} €</td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Price calculation block summary */}
            <div className="mt-6 border-t-2 border-white/20 pt-4 space-y-2 text-xs print:border-slate-300">
              <div className="flex justify-between text-slate-400 print:text-slate-600">
                <span>Spolu bez DPH:</span>
                <span className="font-mono">{finalSubtotalBeforeVat.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between text-slate-400 print:text-slate-600">
                <span>DPH (20%):</span>
                <span className="font-mono">{vatAmount.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between text-base font-bold text-emerald-400 border-t border-white/5 pt-2 print:border-slate-200 print:text-black">
                <span>KONEČNÁ CENA S DPH:</span>
                <span className="font-mono text-lg">{finalTotalWithVat.toFixed(2)} €</span>
              </div>
            </div>

            {/* Fine print for invoice */}
            <div className="hidden print:block mt-12 text-[9px] text-slate-500 leading-normal border-t border-slate-200 pt-4">
              <p>Tento rozpis cien slúži ako nezáväzný dopytový odhad kalkulácie na základe hodnôt zvolených v konfigurátore.</p>
              <p>Konečná cena sa môže mierne líšiť na základe statického posúdenia a aktuálneho cenníka hutníckeho materiálu v čase reálneho objednania.</p>
              <p>Platnosť ponuky: 30 kalendárnych dní.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Price Quote Modal */}
      <PriceQuoteModal
        isOpen={isQuoteModalOpen}
        onClose={() => setIsQuoteModalOpen(false)}
        clientName={clientName || "Zákazník"}
        clientEmail=""
        clientPhone=""
        clientNote=""
        p={params}
        pricing={{
          steelPricePerKg,
          steelWeightPerMeter,
          sandwichPricePerSqM,
          trapezoidPricePerSqM,
          basePlateCost,
          garageDoorCost,
          personalDoorCost,
          windowCost,
          foundationPricePerSqM,
          transportCost,
          laborCost,
          marginPercent,
        }}
      />
    </div>
  );
}
