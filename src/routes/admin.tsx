import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DEFAULT_PARAMS, type GarageParams } from "@/lib/garage/types";
import { ridgeHeight, highEave } from "@/components/garage/Structure";
import { getCladdingConfig } from "@/lib/garage/configHelper";
import { 
  ArrowLeft, Printer, Link as LinkIcon, DollarSign, RefreshCw, 
  Calculator, FileText, FileSpreadsheet, Search, User, Phone, 
  Mail, Calendar, ShieldCheck, CheckCircle, Trash2, Plus, Eye,
  Layers, Package, ChevronRight, Sliders
} from "lucide-react";
import { toast } from "sonner";
import { generateOrderExcelXml } from "@/lib/garage/excelGenerator";
import { fetchInquiriesFromSupabase, supabase } from "@/lib/supabase";

export const Route = createFileRoute("/admin")({
  component: AdminDashboard,
  head: () => ({
    meta: [
      { title: "Admin Dashboard — BAUBOX Steel Shed Forge" },
      { name: "description", content: "Administrátorský systém pre spravovanie a nacenenie dopytov garáží." },
    ],
  }),
});

interface OrderItem {
  id: string;
  order_id: string;
  created_at?: string;
  date?: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  params: GarageParams;
  total_price?: number;
  totalWithVat?: number;
  evaluation_url?: string;
  status?: string;
}

function AdminDashboard() {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Active selected order params & pricing
  const [params, setParams] = useState<GarageParams>(DEFAULT_PARAMS);
  const [clientName, setClientName] = useState<string>("");
  const [clientEmail, setClientEmail] = useState<string>("");
  const [clientPhone, setClientPhone] = useState<string>("");
  const [clientNote, setClientNote] = useState<string>("");

  // Editable unit pricing states
  const [steelPricePerKg, setSteelPricePerKg] = useState<number>(1.85);
  const [steelWeightPerMeter, setSteelWeightPerMeter] = useState<number>(6.2);
  const [sandwichPricePerSqM, setSandwichPricePerSqM] = useState<number>(32.50);
  const [trapezoidPricePerSqM, setTrapezoidPricePerSqM] = useState<number>(16.80);
  const [basePlateCost, setBasePlateCost] = useState<number>(12.00);
  const [garageDoorCost, setGarageDoorCost] = useState<number>(550.00);
  const [personalDoorCost, setPersonalDoorCost] = useState<number>(220.00);
  const [windowCost, setWindowCost] = useState<number>(140.00);
  const [foundationPricePerSqM, setFoundationPricePerSqM] = useState<number>(65.00);
  const [transportCost, setTransportCost] = useState<number>(150.00);
  const [laborCost, setLaborCost] = useState<number>(850.00);
  const [marginPercent, setMarginPercent] = useState<number>(15);

  // Fetch orders on mount
  const loadOrders = async () => {
    setIsLoading(true);
    let loaded: OrderItem[] = [];

    // Try Supabase first
    const supaData = await fetchInquiriesFromSupabase();
    if (supaData && supaData.length > 0) {
      loaded = supaData.map((o) => ({
        id: o.id || o.order_id,
        order_id: o.order_id,
        date: o.created_at ? new Date(o.created_at).toLocaleString("sk-SK") : new Date().toLocaleString("sk-SK"),
        name: o.name || "Neznámy klient",
        email: o.email || "",
        phone: o.phone || "",
        message: o.message || "",
        params: o.params || DEFAULT_PARAMS,
        total_price: o.total_price || 0,
        evaluation_url: o.evaluation_url || "",
      }));
    } else {
      // Fallback to localStorage
      try {
        const local = JSON.parse(localStorage.getItem("ssf_orders") || "[]");
        loaded = local.map((o: any) => ({
          id: o.id,
          order_id: o.id,
          date: o.date || new Date().toLocaleString("sk-SK"),
          name: o.name || "Neznámy klient",
          email: o.email || "",
          phone: o.phone || "",
          message: o.message || "",
          params: o.params || DEFAULT_PARAMS,
          total_price: o.totalWithVat || 0,
          evaluation_url: o.evaluationUrl || "",
        }));
      } catch (e) {}
    }

    setOrders(loaded);
    setIsLoading(false);

    if (loaded.length > 0) {
      selectOrder(loaded[0]);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const selectOrder = (ord: OrderItem) => {
    setSelectedOrderId(ord.id);
    const p = ord.params || DEFAULT_PARAMS;
    setParams(p);
    setClientName(ord.name || "");
    setClientEmail(ord.email || "");
    setClientPhone(ord.phone || "");
    setClientNote(ord.message || "");

    const config = getCladdingConfig(ord.name);
    setSandwichPricePerSqM(config.sandwichPricePerSqM);
    setTrapezoidPricePerSqM(config.trapezoidPricePerSqM);
  };

  const handleDeleteOrder = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Naozaj chcete vymazať tento dopyt?")) return;

    if (supabase) {
      try {
        await supabase.from("inquiries").delete().eq("order_id", id);
      } catch (err) {}
    }

    try {
      const local = JSON.parse(localStorage.getItem("ssf_orders") || "[]");
      const updated = local.filter((o: any) => o.id !== id && o.order_id !== id);
      localStorage.setItem("ssf_orders", JSON.stringify(updated));
    } catch (err) {}

    const remaining = orders.filter((o) => o.id !== id);
    setOrders(remaining);
    if (selectedOrderId === id && remaining.length > 0) {
      selectOrder(remaining[0]);
    }
    toast.success("Dopyt bol vymazaný.");
  };

  // Filtered orders list
  const filteredOrders = orders.filter((o) => {
    const q = searchQuery.toLowerCase();
    return (
      o.name.toLowerCase().includes(q) ||
      o.email.toLowerCase().includes(q) ||
      o.phone.toLowerCase().includes(q) ||
      o.order_id.toLowerCase().includes(q)
    );
  });

  // Calculations for active selected order
  const W = params.width;
  const L = params.length;
  const Heave = params.clearHeight;
  const Hridge = ridgeHeight(params);
  const Hhi = highEave(params);
  const frames = params.bayCount + 1;

  const leftColH = params.roofType === "shed" ? Heave : Heave;
  const rightColH = params.roofType === "shed" ? Hhi : Heave;
  const totalColLength = frames * leftColH + frames * rightColH;

  let totalRafterLength = 0;
  if (params.roofType === "gable") {
    const halfW = W / 2;
    const slopeLen = Math.hypot(halfW, Hridge - Heave);
    totalRafterLength = frames * 2 * slopeLen;
  } else {
    const slopeLen = Math.hypot(W, Hhi - Heave);
    totalRafterLength = frames * slopeLen;
  }

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

  const basePlatesCount = frames * 2;
  const calculatedBasePlateCost = basePlatesCount * basePlateCost;
  const calculatedGarageDoorCost = garageDoorCost;
  const calculatedPersonalDoorCost = params.hasPersonalDoor ? personalDoorCost : 0;
  const calculatedWindowsCost = params.hasWindows ? params.windowCount * windowCost : 0;
  const calculatedFoundationCost = params.showFoundation ? (W * L * foundationPricePerSqM) : 0;

  const rawSubtotal = calculatedSteelCost + calculatedCladdingCost + calculatedBasePlateCost + calculatedGarageDoorCost + calculatedPersonalDoorCost + calculatedWindowsCost + calculatedFoundationCost;
  const rawTotalWithExtras = rawSubtotal + transportCost + laborCost;
  const marginAmount = (rawTotalWithExtras * marginPercent) / 100;
  const finalSubtotalBeforeVat = rawTotalWithExtras + marginAmount;
  const vatAmount = finalSubtotalBeforeVat * 0.20;
  const finalTotalWithVat = finalSubtotalBeforeVat + vatAmount;

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
    a.download = `garaz_${W}x${L}_${clientName ? clientName.replace(/\s+/g, "_") : "ponuka"}_${date.replace(/\./g, "-")}.xls`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Excel súbor bol stiahnutý!");
  };

  const handleCopyShareLink = () => {
    const currentParams = new URLSearchParams();
    const keys = Object.keys(params) as (keyof GarageParams)[];
    for (const key of keys) {
      let val = String(params[key]);
      if (val.startsWith("#")) val = val.substring(1);
      currentParams.set(key, val);
    }
    currentParams.set("client", clientName);
    currentParams.set("p_steel", steelPricePerKg.toString());
    currentParams.set("p_steel_w", steelWeightPerMeter.toString());
    currentParams.set("p_sandwich", sandwichPricePerSqM.toString());
    currentParams.set("p_trapezoid", trapezoidPricePerSqM.toString());
    currentParams.set("p_gdoor", garageDoorCost.toString());
    currentParams.set("p_pdoor", personalDoorCost.toString());
    currentParams.set("p_window", windowCost.toString());
    currentParams.set("p_transport", transportCost.toString());
    currentParams.set("p_labor", laborCost.toString());
    currentParams.set("p_margin", marginPercent.toString());

    const shareUrl = `${window.location.origin}/vyhodnotenie?${currentParams.toString()}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success("Odkaz na cenovú ponuku bol skopírovaný!");
  };

  return (
    <div className="min-h-screen bg-[#070a0e] text-slate-100 font-mono select-text">
      {/* Header bar */}
      <header className="border-b border-white/10 bg-black/60 px-6 py-3.5 flex items-center justify-between sticky top-0 z-30 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-1.5 rounded border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/80 transition hover:bg-white/10"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Konfigurátor
          </Link>
          <div className="h-4 w-px bg-white/10" />
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <h1 className="text-sm font-bold tracking-widest text-white">
              BAUBOX ADMIN DASHBOARD
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadOrders}
            className="flex items-center gap-1.5 rounded bg-white/5 border border-white/10 px-3 py-1.5 text-xs hover:bg-white/10 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Obnoviť dáta
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3.5 py-1.5 text-xs font-bold hover:bg-emerald-500/30 transition"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Export do Excelu (.xls)
          </button>
        </div>
      </header>

      {/* Main Container - Dual Pane Layout */}
      <div className="max-w-[1600px] mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT PANE: Orders List & Search (5 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* KPI Stats Bar */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-white/10 bg-[#0e1218] p-3.5">
              <div className="text-[10px] text-white/50 uppercase tracking-wider">Celkom dopytov</div>
              <div className="text-xl font-bold text-white mt-1">{orders.length}</div>
            </div>
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-950/20 p-3.5">
              <div className="text-[10px] text-emerald-400 uppercase tracking-wider">Očakávaný obrat</div>
              <div className="text-xl font-bold text-emerald-300 mt-1">
                {orders.reduce((sum, o) => sum + (o.total_price || o.totalWithVat || 0), 0).toFixed(0)} €
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-white/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Hľadať podľa mena, e-mailu, telefónu..."
              className="w-full rounded-lg border border-white/10 bg-[#0e1218] pl-9 pr-3 py-2 text-xs text-white placeholder-white/40 focus:border-emerald-400 focus:outline-none"
            />
          </div>

          {/* Orders List */}
          <div className="rounded-lg border border-white/10 bg-[#0e1218] p-3 space-y-2 max-h-[calc(100vh-250px)] overflow-y-auto pr-1">
            <div className="text-[10px] uppercase font-bold text-white/40 px-2 py-1 flex justify-between">
              <span>Zoznam objednávok ({filteredOrders.length})</span>
              <span>Stav / Dátum</span>
            </div>

            {filteredOrders.length === 0 ? (
              <div className="p-8 text-center text-xs text-white/40">
                {isLoading ? "Načítavam dopyty..." : "Žiadne dopyty neboli nájdené."}
              </div>
            ) : (
              filteredOrders.map((ord) => {
                const isSelected = ord.id === selectedOrderId;
                const price = ord.total_price || ord.totalWithVat || 0;
                return (
                  <div
                    key={ord.id}
                    onClick={() => selectOrder(ord)}
                    className={`rounded-md p-3 text-xs cursor-pointer transition border ${
                      isSelected
                        ? "bg-emerald-950/40 border-emerald-500/60 text-white shadow-lg"
                        : "bg-black/40 border-white/5 hover:border-white/20 text-white/80"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1.5">
                      <div className="font-bold text-sm text-white flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-emerald-400" />
                        {ord.name}
                      </div>
                      <span className="text-[10px] text-white/40 font-mono">{ord.date}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-1 text-[11px] text-white/60 mb-2">
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3 text-white/40" />
                        <span className="truncate">{ord.email}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3 text-white/40" />
                        <span>{ord.phone}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                      <span className="text-[11px] font-bold text-emerald-300">
                        {ord.params?.width} × {ord.params?.length} × {ord.params?.clearHeight}m
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-white">
                          {price > 0 ? `${price.toFixed(0)} €` : "Na nacenenie"}
                        </span>
                        <button
                          onClick={(e) => handleDeleteOrder(ord.id, e)}
                          className="text-white/30 hover:text-red-400 p-1 transition"
                          title="Vymazať dopyt"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT PANE: Selected Order Editor & Calculator (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Customer Header Info */}
          <div className="rounded-lg border border-white/10 bg-[#0e1218] p-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Detail Zákazníka</span>
                <h2 className="text-lg font-bold text-white">{clientName || "Vyberte dopyt zo zoznamu"}</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyShareLink}
                  className="flex items-center gap-1.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1.5 text-xs hover:bg-emerald-500/30 transition"
                >
                  <LinkIcon className="h-3.5 w-3.5" />
                  Kopírovať odkaz pre klienta
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 rounded bg-white/10 text-white px-3 py-1.5 text-xs hover:bg-white/20 transition"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Tlačiť
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-white/40 block mb-0.5">E-mail zákazníka:</span>
                <span className="text-white font-bold">{clientEmail || "—"}</span>
              </div>
              <div>
                <span className="text-white/40 block mb-0.5">Telefón:</span>
                <span className="text-white font-bold">{clientPhone || "—"}</span>
              </div>
              <div>
                <span className="text-white/40 block mb-0.5">Poznámka z dopytu:</span>
                <span className="text-amber-200/90 italic">{clientNote || "Bez poznámky"}</span>
              </div>
            </div>
          </div>

          {/* Unit Price Adjustment Grid */}
          <div className="rounded-lg border border-white/10 bg-[#0e1218] p-5">
            <div className="flex items-center gap-2 mb-4 text-emerald-400 border-b border-white/5 pb-2">
              <Sliders className="h-4 w-4" />
              <h3 className="text-xs uppercase font-bold tracking-widest">Nastavenie Jednotkových Cien Pre Kalkulačku (€)</h3>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-white/50 mb-1">Cena ocele (€/kg)</label>
                <input
                  type="number"
                  step="0.05"
                  value={steelPricePerKg}
                  onChange={(e) => setSteelPricePerKg(parseFloat(e.target.value) || 0)}
                  className="w-full bg-black/40 border border-white/10 rounded px-2 py-1.5 text-white focus:border-emerald-400 focus:outline-none font-bold text-emerald-300"
                />
              </div>

              <div>
                <label className="block text-white/50 mb-1">Sendvič (€/m²)</label>
                <input
                  type="number"
                  step="0.5"
                  value={sandwichPricePerSqM}
                  onChange={(e) => setSandwichPricePerSqM(parseFloat(e.target.value) || 0)}
                  className="w-full bg-black/40 border border-white/10 rounded px-2 py-1.5 text-white focus:border-emerald-400 focus:outline-none font-bold text-emerald-300"
                />
              </div>

              <div>
                <label className="block text-white/50 mb-1">Trapéz (€/m²)</label>
                <input
                  type="number"
                  step="0.5"
                  value={trapezoidPricePerSqM}
                  onChange={(e) => setTrapezoidPricePerSqM(parseFloat(e.target.value) || 0)}
                  className="w-full bg-black/40 border border-white/10 rounded px-2 py-1.5 text-white focus:border-emerald-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-white/50 mb-1">Garážová brána (€)</label>
                <input
                  type="number"
                  step="10"
                  value={garageDoorCost}
                  onChange={(e) => setGarageDoorCost(parseFloat(e.target.value) || 0)}
                  className="w-full bg-black/40 border border-white/10 rounded px-2 py-1.5 text-white focus:border-emerald-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-white/50 mb-1">Vstupné dvere (€)</label>
                <input
                  type="number"
                  step="10"
                  value={personalDoorCost}
                  onChange={(e) => setPersonalDoorCost(parseFloat(e.target.value) || 0)}
                  className="w-full bg-black/40 border border-white/10 rounded px-2 py-1.5 text-white focus:border-emerald-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-white/50 mb-1">Okno (€/ks)</label>
                <input
                  type="number"
                  step="5"
                  value={windowCost}
                  onChange={(e) => setWindowCost(parseFloat(e.target.value) || 0)}
                  className="w-full bg-black/40 border border-white/10 rounded px-2 py-1.5 text-white focus:border-emerald-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-white/50 mb-1">Montáž a práca (€)</label>
                <input
                  type="number"
                  step="50"
                  value={laborCost}
                  onChange={(e) => setLaborCost(parseFloat(e.target.value) || 0)}
                  className="w-full bg-black/40 border border-white/10 rounded px-2 py-1.5 text-white focus:border-emerald-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-white/50 mb-1">Marža / Zisk (%)</label>
                <input
                  type="number"
                  step="1"
                  value={marginPercent}
                  onChange={(e) => setMarginPercent(parseFloat(e.target.value) || 0)}
                  className="w-full bg-black/40 border border-white/10 rounded px-2 py-1.5 text-white focus:border-emerald-400 focus:outline-none font-bold text-emerald-300"
                />
              </div>
            </div>
          </div>

          {/* Pricing Table Summary */}
          <div className="rounded-lg border border-white/10 bg-[#0e1218] p-5">
            <div className="flex items-center gap-2 mb-4 text-emerald-400 border-b border-white/5 pb-2">
              <Calculator className="h-4 w-4" />
              <h3 className="text-xs uppercase font-bold tracking-widest">Podrobný Rozpis Kalkulácie pre {clientName}</h3>
            </div>

            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-white/40">
                  <th className="py-2 font-normal">Položka špecifikácie</th>
                  <th className="py-2 text-right font-normal">Množstvo</th>
                  <th className="py-2 text-right font-normal">Jedn. cena</th>
                  <th className="py-2 text-right font-normal">Cena bez DPH</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <tr>
                  <td className="py-2 pr-2">
                    <div className="font-bold text-slate-200">Oceľová nosná konštrukcia (jakl)</div>
                    <div className="text-[10px] text-white/40">Celková dĺžka profilov: {totalSteelLength.toFixed(1)} m</div>
                  </td>
                  <td className="py-2 text-right font-mono">{totalSteelWeight.toFixed(0)} kg</td>
                  <td className="py-2 text-right font-mono">{steelPricePerKg.toFixed(2)} €</td>
                  <td className="py-2 text-right font-mono font-bold text-slate-100">{calculatedSteelCost.toFixed(2)} €</td>
                </tr>

                <tr>
                  <td className="py-2 pr-2">
                    <div className="font-bold text-slate-200">Opláštenie ({params.panelType === "sandwich" ? "Sendvič" : "Trapéz"})</div>
                    <div className="text-[10px] text-white/40">Steny ({params.claddingColor}) + Strecha ({params.roofColor})</div>
                  </td>
                  <td className="py-2 text-right font-mono">{totalCladdingArea.toFixed(1)} m²</td>
                  <td className="py-2 text-right font-mono">{activeCladdingUnitPrice.toFixed(2)} €</td>
                  <td className="py-2 text-right font-mono font-bold text-slate-100">{calculatedCladdingCost.toFixed(2)} €</td>
                </tr>

                <tr>
                  <td className="py-2 pr-2">
                    <div className="font-bold text-slate-200">Sekcionálna garážová brána</div>
                    <div className="text-[10px] text-white/40">Rozmer: {params.doorWidth} × {params.doorHeight} m</div>
                  </td>
                  <td className="py-2 text-right font-mono">1 ks</td>
                  <td className="py-2 text-right font-mono">{garageDoorCost.toFixed(2)} €</td>
                  <td className="py-2 text-right font-mono font-bold text-slate-100">{calculatedGarageDoorCost.toFixed(2)} €</td>
                </tr>

                {params.hasPersonalDoor && (
                  <tr>
                    <td className="py-2 pr-2">
                      <div className="font-bold text-slate-200">Personálne dvere</div>
                      <div className="text-[10px] text-white/40">Umiestnenie: {params.personalDoorSide} strana</div>
                    </td>
                    <td className="py-2 text-right font-mono">1 ks</td>
                    <td className="py-2 text-right font-mono">{personalDoorCost.toFixed(2)} €</td>
                    <td className="py-2 text-right font-mono font-bold text-slate-100">{calculatedPersonalDoorCost.toFixed(2)} €</td>
                  </tr>
                )}

                {params.hasWindows && params.windowCount > 0 && (
                  <tr>
                    <td className="py-2 pr-2">
                      <div className="font-bold text-slate-200">Svetlíkové okná</div>
                      <div className="text-[10px] text-white/40">{params.windowCount}x ({params.windowWidth}×{params.windowHeight}m)</div>
                    </td>
                    <td className="py-2 text-right font-mono">{params.windowCount} ks</td>
                    <td className="py-2 text-right font-mono">{windowCost.toFixed(2)} €</td>
                    <td className="py-2 text-right font-mono font-bold text-slate-100">{calculatedWindowsCost.toFixed(2)} €</td>
                  </tr>
                )}

                <tr>
                  <td className="py-2 pr-2">
                    <div className="font-bold text-slate-200">Montáž, prácnosť a doprava</div>
                  </td>
                  <td className="py-2 text-right font-mono">Komplet</td>
                  <td className="py-2 text-right font-mono">{(laborCost + transportCost).toFixed(2)} €</td>
                  <td className="py-2 text-right font-mono font-bold text-slate-100">{(laborCost + transportCost).toFixed(2)} €</td>
                </tr>

                {marginPercent > 0 && (
                  <tr>
                    <td className="py-2 pr-2">
                      <div className="font-bold text-slate-200">Marža / Zisk ({marginPercent}%)</div>
                    </td>
                    <td className="py-2 text-right font-mono">{marginPercent} %</td>
                    <td className="py-2 text-right font-mono">—</td>
                    <td className="py-2 text-right font-mono font-bold text-slate-100">{marginAmount.toFixed(2)} €</td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Totals Summary */}
            <div className="mt-4 border-t border-white/20 pt-3 flex items-center justify-between text-sm">
              <div className="text-white/60">
                Spolu bez DPH: <span className="font-bold text-white font-mono">{finalSubtotalBeforeVat.toFixed(2)} €</span>
              </div>
              <div className="text-lg font-bold text-emerald-400 font-mono">
                CELKOVÁ CENA S DPH: {finalTotalWithVat.toFixed(2)} €
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
