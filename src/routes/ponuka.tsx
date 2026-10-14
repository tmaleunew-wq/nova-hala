import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DEFAULT_PARAMS, type GarageParams, resolveColorName } from "@/lib/garage/types";
import { ridgeHeight, highEave } from "@/components/garage/Structure";
import { Download, ExternalLink, FileText, CheckCircle2, Mail, Phone, MapPin, Box, User, Info, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { generateGarageQuotePDF } from "@/lib/garage/pdfGenerator";

export const Route = createFileRoute("/ponuka")({
  component: CustomerPriceOffer,
  head: () => ({
    meta: [
      { title: "Oficiálna cenová ponuka — VBAU s.r.o." },
      { name: "description", content: "Oficiálna cenová ponuka a technická špecifikácia pre vašu oceľovú garáž." },
    ],
  }),
});

function CustomerPriceOffer() {
  const [params, setParams] = useState<GarageParams>(DEFAULT_PARAMS);
  const [clientName, setClientName] = useState<string>("");
  const [clientEmail, setClientEmail] = useState<string>("");
  const [clientPhone, setClientPhone] = useState<string>("");
  const [clientCity, setClientCity] = useState<string>("");
  const [clientNote, setClientNote] = useState<string>("");
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [quoteId, setQuoteId] = useState<string>("");
  const [imageDataUrl, setImageDataUrl] = useState<string>("");

  const accentColor = "#00c8ff";
  const companyName = "VBAU s.r.o.";
  const contactEmail = "tmal.eu.new@gmail.com";

  useEffect(() => {
    if (typeof window === "undefined") return;

    const searchParams = new URLSearchParams(window.location.search);
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

    setParams({ ...DEFAULT_PARAMS, ...parsed });
    setClientName(searchParams.get("client_name") || searchParams.get("name") || searchParams.get("client") || "Vážený zákazník");
    setClientEmail(searchParams.get("client_email") || searchParams.get("email") || "");
    setClientPhone(searchParams.get("client_phone") || searchParams.get("phone") || "");
    setClientCity(searchParams.get("client_city") || searchParams.get("city") || "Slovensko");
    setClientNote(searchParams.get("client_note") || searchParams.get("notes") || searchParams.get("message") || "");

    const idFromUrl = searchParams.get("id") || searchParams.get("order_id");
    const activeId = idFromUrl || `CP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    setQuoteId(activeId);

    // Retrieve 3D snapshot image (matches Pergola Pro scene.imageDataUrl)
    try {
      const fromSession = idFromUrl ? sessionStorage.getItem(`ssf_img_${idFromUrl}`) : null;
      if (fromSession) {
        setImageDataUrl(fromSession);
      } else {
        const localQuotes = JSON.parse(localStorage.getItem("ssf_quotes") || localStorage.getItem("ssf_orders") || "[]");
        const found = localQuotes.find((q: any) => q.id === activeId || (idFromUrl && (q.id === idFromUrl || idFromUrl.includes(q.id))));
        if (found?.imageDataUrl || found?.scene?.imageDataUrl) {
          setImageDataUrl(found.imageDataUrl || found.scene?.imageDataUrl);
        } else {
          const latest = localStorage.getItem("ssf_latest_img");
          if (latest) setImageDataUrl(latest);
        }
      }
    } catch (e) {
      console.warn("Failed to load snapshot from storage", e);
    }
  }, []);

  // Geometry & Pricing calculations matching Structure
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
    const backLen = params.personalDoorSide === "back" && params.hasPersonalDoor && h < 2.0 ? Math.max(0, W - 0.9) : W;
    let leftLen = L;
    if (params.personalDoorSide === "left" && params.hasPersonalDoor && h < 2.0) {
      leftLen -= 0.9;
    }
    const winBottom = 1.6 - params.windowHeight / 2;
    const winTop = 1.6 + params.windowHeight / 2;
    if (h > winBottom && h < winTop) {
      leftLen -= params.windowCount * params.windowWidth;
    }
    const rightLen = params.personalDoorSide === "right" && params.hasPersonalDoor && h < 2.0 ? Math.max(0, L - 0.9) : L;
    totalGirtsLength += frontLen + backLen + leftLen + rightLen;
  }

  const totalSteelLength = totalColLength + totalRafterLength + totalPurlinLength + totalGirtsLength + 2 * L;
  const steelWeight = totalSteelLength * 6.2;
  const steelCost = steelWeight * 1.85;

  const wallArea = 2 * W * Heave + 2 * L * Heave;
  const gableArea = params.roofType === "gable" ? W * (Hridge - Heave) : 0;
  const roofArea = params.roofType === "gable" ? 2 * Math.hypot(W / 2, Hridge - Heave) * L : Math.hypot(W, Hhi - Heave) * L;
  const totalCladdingArea = wallArea + gableArea + roofArea;
  const unitCladdingPrice = params.panelType === "sandwich" ? 32.5 : 16.8;
  const claddingCost = totalCladdingArea * unitCladdingPrice;

  const basePlatesCost = frames * 2 * 12.0;
  const garageDoorCost = 550.0;
  const personalDoorCost = params.hasPersonalDoor ? 220.0 : 0;
  const windowsCost = params.hasWindows ? params.windowCount * 140.0 : 0;
  const foundationCost = params.showFoundation ? W * L * 65.0 : 0;
  const componentsSubtotal = basePlatesCost + garageDoorCost + personalDoorCost + windowsCost + foundationCost;

  const laborCost = 850.0;
  const transportCost = 150.0;
  const rawSubtotal = steelCost + claddingCost + componentsSubtotal + laborCost + transportCost;
  const marginAmount = rawSubtotal * 0.15;
  const subtotalBeforeVat = rawSubtotal + marginAmount;
  const vatAmount = subtotalBeforeVat * 0.2;
  const totalWithVat = subtotalBeforeVat + vatAmount;

  const fmt = (val: number) => `${val.toFixed(2)} €`;

  // Matches Pergola Pro openPreviewWindow redirect logic
  const openPreviewWindow = () => {
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(`
        <!doctype html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Generujem PDF...</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; color: #475467; background: #f8fafc; }
              .box { padding: 24px 32px; border: 1px solid #e2e8f0; border-radius: 18px; background: #fff; box-shadow: 0 10px 30px rgba(15,23,42,.08); text-align: center; }
              .spinner { width: 32px; height: 32px; border: 3px solid #e2e8f0; border-top-color: #00c8ff; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 16px; }
              @keyframes spin { to { transform: rotate(360deg); } }
            </style>
          </head>
          <body>
            <div class="box">
              <div class="spinner"></div>
              <div style="font-weight: 700; color: #0f172a; margin-bottom: 4px;">Generujem PDF ponuku...</div>
              <div style="font-size: 13px; color: #64748b;">Po dokončení sa dokument automaticky otvorí.</div>
            </div>
          </body>
        </html>
      `);
      win.document.close();
    }
    return win;
  };

  const handleDownloadPDF = () => {
    setIsGeneratingPDF(true);
    const previewWin = openPreviewWindow();
    try {
      const blob = generateGarageQuotePDF({
        params,
        customer: {
          name: clientName,
          email: clientEmail,
          phone: clientPhone,
          city: clientCity,
          notes: clientNote,
        },
        quoteId,
        pricing: {
          steelCost,
          claddingCost,
          componentsSubtotal,
          laborAndTransport: laborCost + transportCost,
          subtotalBeforeVat,
          vatAmount,
          totalWithVat,
          hidePrices: false,
        },
        imageDataUrl,
        evaluationUrl: typeof window !== "undefined" ? window.location.href : "",
      });

      const blobUrl = URL.createObjectURL(blob);
      if (previewWin && !previewWin.closed) {
        previewWin.location.replace(blobUrl);
      } else {
        window.open(blobUrl, "_blank");
      }
      toast.success("PDF ponuka bola vygenerovaná");
    } catch (err) {
      console.error("PDF generation failed", err);
      if (previewWin && !previewWin.closed) previewWin.close();
      toast.error("Nepodarilo sa vygenerovať PDF");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const configuratorUrl = `/?${typeof window !== "undefined" ? window.location.search.replace(/^\?/, "") : ""}`;

  return (
    <div className="min-h-screen w-full flex flex-col pt-4 pb-12 transition-colors bg-[#f8fafc] text-slate-900 font-sans">
      <div className="container max-w-4xl mx-auto px-4">

        {/* Top Header matching Pergola Pro */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <div className="flex items-center gap-4">
              <div className="h-12 w-auto max-w-[120px] flex items-center justify-center bg-white rounded-lg p-1.5 border border-slate-200 shadow-sm overflow-hidden">
                <img src="/logo.png" alt={companyName} className="max-h-full max-w-full object-contain" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <FileText className="w-4 h-4" style={{ color: accentColor }} />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80" style={{ color: accentColor }}>
                    OFICIÁLNA CENOVÁ PONUKA
                  </span>
                </div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900">
                  {companyName}
                </h1>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                  <div className="flex items-center gap-1.5 opacity-50">
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      Platnosť do: {new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString("sk-SK")}
                    </span>
                  </div>
                  {contactEmail && (
                    <div className="flex items-center gap-1.5 opacity-60">
                      <Mail className="w-3 h-3" style={{ color: accentColor }} />
                      <a href={`mailto:${contactEmail}`} className="text-[10px] font-bold hover:underline text-slate-700">
                        {contactEmail}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 w-full md:w-auto">
            <button
              onClick={handleDownloadPDF}
              disabled={isGeneratingPDF}
              className="flex-1 md:flex-none h-12 rounded-xl bg-white border border-slate-200 text-slate-900 hover:bg-slate-50 font-bold px-5 flex items-center justify-center shadow-sm transition-all cursor-pointer"
            >
              <Download className="w-4 h-4 mr-2" />
              {isGeneratingPDF ? "Generujem..." : "PDF Ponuka"}
            </button>
            <a
              href={configuratorUrl}
              className="h-12 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 flex items-center justify-center transition cursor-pointer text-xs"
            >
              <ExternalLink className="w-4 h-4 mr-1.5 text-slate-400" />
              3D Konfigurátor
            </a>
          </div>
        </div>

        {/* Document Card matching Pergola Pro */}
        <div className="rounded-3xl border overflow-hidden shadow-2xl bg-white border-slate-200">

          {/* Hero Image Section matching Pergola Pro */}
          <div className="relative aspect-video w-full flex items-center justify-center p-4 md:p-8 bg-slate-100">
            {imageDataUrl ? (
              <img
                src={imageDataUrl}
                alt="Konfigurácia garáže"
                className="max-h-full object-contain rounded-2xl shadow-2xl transition-transform hover:scale-[1.02] duration-700"
              />
            ) : (
              <div className="text-slate-400 flex flex-col items-center gap-2">
                <Box className="w-12 h-12 animate-pulse text-slate-300" />
                <span className="text-xs uppercase font-bold tracking-widest text-slate-400">3D Náhľad sa pripravuje</span>
              </div>
            )}

            <div className="absolute bottom-6 left-6 right-6 flex flex-wrap gap-2 pointer-events-none">
              <span className="px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider border border-white/10">
                3D SNAPSHOT
              </span>
              <span
                className="px-3 py-1.5 rounded-full backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider border border-white/10"
                style={{ backgroundColor: `${accentColor}cc` }}
              >
                ULOŽENÁ VERZIA
              </span>
            </div>
          </div>

          {/* Document Content matching Pergola Pro */}
          <div className="p-6 md:p-10">
            <div className="grid md:grid-cols-2 gap-12">

              {/* Left Column: Details */}
              <div className="space-y-8">
                <div>
                  <h3 className="text-[11px] font-black uppercase tracking-[0.2em] mb-4 text-slate-400">
                    Zhrnutie konfigurácie
                  </h3>
                  <div className="grid gap-4">
                    <div className="flex items-center gap-4 p-4 rounded-2xl border bg-slate-50 border-slate-100">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${accentColor}1a` }}>
                        <Box className="w-5 h-5" style={{ color: accentColor }} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Model strechy</p>
                        <p className="text-sm font-bold text-slate-900">
                          {params.roofType === "gable" ? `Sedlová strecha (${params.roofPitchDeg}°)` : `Pultová strecha (${params.roofPitchDeg}°)`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 p-4 rounded-2xl border bg-slate-50 border-slate-100">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${accentColor}1a` }}>
                        <ArrowRight className="w-5 h-5" style={{ color: accentColor }} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Hlavné rozmery</p>
                        <p className="text-sm font-bold text-slate-900">
                          {params.width} x {params.length} x {params.clearHeight} m (Š x D x V)
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-[11px] font-black uppercase tracking-[0.2em] mb-4 text-slate-400">
                    Technické parametre
                  </h3>
                  <div className="p-6 rounded-2xl border space-y-4 bg-slate-50 border-slate-100 text-slate-800">
                    <div className="flex justify-between text-sm">
                      <span className="opacity-60">Typ opláštenia:</span>
                      <span className="font-bold">{params.panelType === "sandwich" ? "Sendvičový PUR/PIR panel" : "Trapézový plech"}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="opacity-60">Farba stien:</span>
                      <span className="font-bold">{resolveColorName(params.claddingColor)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="opacity-60">Farba strechy:</span>
                      <span className="font-bold">{resolveColorName(params.roofColor)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="opacity-60">Garážová brána:</span>
                      <span className="font-bold">1x ({params.doorWidth}x{params.doorHeight}m, {resolveColorName(params.sectionalDoorColor)})</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="opacity-60">Osobné dvere:</span>
                      <span className="font-bold">{params.hasPersonalDoor ? `Áno (${resolveColorName(params.doorColor)})` : "Nie"}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="opacity-60">Okná:</span>
                      <span className="font-bold">{params.hasWindows ? `${params.windowCount}x (${params.windowWidth}x${params.windowHeight}m)` : "Žiadne"}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="opacity-60">Základová doska:</span>
                      <span className="font-bold">{params.showFoundation ? "Áno (betón)" : "Nie"}</span>
                    </div>

                    {clientNote && (
                      <div className="pt-3 border-t border-slate-200">
                        <p className="text-[10px] font-bold uppercase tracking-wider mb-1 text-slate-400">Poznámka k dopytu</p>
                        <p className="text-xs italic text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200">
                          {clientNote}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Pricing & Contact */}
              <div className="space-y-8">
                <div
                  className="p-8 rounded-3xl border relative overflow-hidden transition-all hover:shadow-2xl"
                  style={{ backgroundColor: `${accentColor}0d`, borderColor: `${accentColor}33` }}
                >
                  <div className="relative z-10">
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] mb-1" style={{ color: accentColor }}>
                      Odhadovaná cena
                    </p>
                    <h2 className="text-4xl font-black tracking-tight mb-2 text-slate-900">
                      {fmt(totalWithVat)}
                    </h2>
                    <p className="text-xs opacity-60 text-slate-600">
                      Uvedená cena je vrátane DPH 20%
                    </p>

                    <div className="mt-8 pt-6 border-t" style={{ borderColor: `${accentColor}1a` }}>
                      <button
                        onClick={handleDownloadPDF}
                        disabled={isGeneratingPDF}
                        className="w-full h-14 rounded-2xl text-white font-black uppercase tracking-widest shadow-xl transition-all active:scale-[0.98] flex items-center justify-center cursor-pointer"
                        style={{ backgroundColor: accentColor }}
                      >
                        {isGeneratingPDF ? "Generujem PDF..." : (
                          <>
                            <Download className="w-5 h-5 mr-3" />
                            Stiahnuť PDF
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  {/* Decorative background element */}
                  <div className="absolute -bottom-10 -right-10 w-40 h-40 blur-3xl rounded-full" style={{ backgroundColor: `${accentColor}26` }} />
                </div>

                <div>
                  <h3 className="text-[11px] font-black uppercase tracking-[0.2em] mb-4 text-slate-400">
                    Informácie o dopyte
                  </h3>
                  <div className="p-6 rounded-2xl border space-y-5 bg-slate-50 border-slate-100 text-slate-800">
                    <div className="flex items-center gap-3">
                      <User className="w-4 h-4 opacity-50" style={{ color: accentColor }} />
                      <span className="text-sm font-semibold">{clientName || "Vážený zákazník"}</span>
                    </div>
                    {clientEmail && (
                      <div className="flex items-center gap-3">
                        <Mail className="w-4 h-4 opacity-50" style={{ color: accentColor }} />
                        <span className="text-sm font-semibold">{clientEmail}</span>
                      </div>
                    )}
                    {clientPhone && (
                      <div className="flex items-center gap-3">
                        <Phone className="w-4 h-4 opacity-50" style={{ color: accentColor }} />
                        <span className="text-sm font-semibold">{clientPhone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <MapPin className="w-4 h-4 opacity-50" style={{ color: accentColor }} />
                      <span className="text-sm font-semibold">{clientCity}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Info className="w-4 h-4 opacity-50" style={{ color: accentColor }} />
                      <span className="text-xs opacity-60">ID: {quoteId}</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Status Section matching Pergola Pro */}
            <div className="mt-12 p-6 rounded-2xl border flex items-center justify-between bg-green-50 border-green-100">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-600">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-green-900">Platná cenová ponuka</p>
                  <p className="text-xs text-green-700/80">
                    Tento dopyt bol úspešne doručený vášmu predajcovi {companyName}.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Footer matching Pergola Pro */}
        <div className="mt-8 text-center pb-8">
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 text-slate-500">
            Vytvorené cez {companyName} © {new Date().getFullYear()}
          </p>
        </div>

      </div>
    </div>
  );
}
