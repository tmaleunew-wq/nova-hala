import { useState, useEffect, useMemo } from "react";
import * as THREE from "three";
import { X, Smartphone, QrCode, CheckCircle2, Loader2, Sparkles, Wifi, Download } from "lucide-react";
import {
  exportToGlb,
  exportToUsdz,
  launchIosAr,
  downloadBlob,
  isIosDevice,
  isMobileDevice,
} from "@/lib/garage/arExporter";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": any;
    }
  }
}

interface ArModalProps {
  isOpen: boolean;
  onClose: () => void;
  exportRef: React.RefObject<THREE.Group | null>;
  hallName?: string;
}

export function ArModal({ isOpen, onClose, exportRef, hallName = "Garáž" }: ArModalProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [currentUrl, setCurrentUrl] = useState("");
  const [networkIp, setNetworkIp] = useState("192.168.8.111");

  const [glbUrl, setGlbUrl] = useState<string | null>(null);
  const [usdzUrl, setUsdzUrl] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsMobile(isMobileDevice());
      setIsIos(isIosDevice());
      setCurrentUrl(window.location.href);

      // Dynamically load Google model-viewer for native WebXR on Android & iOS Quick Look
      if (!customElements.get("model-viewer")) {
        const s = document.createElement("script");
        s.type = "module";
        s.src = "https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js";
        document.head.appendChild(s);
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !exportRef.current) return;
    let active = true;
    setPreparing(true);
    setExportError(null);

    const generateModels = async () => {
      try {
        if (!exportRef.current) return;
        const glb = await exportToGlb(exportRef.current);
        if (!active) return;
        const gUrl = URL.createObjectURL(glb);
        setGlbUrl(gUrl);

        try {
          const usdz = await exportToUsdz(exportRef.current);
          if (!active) return;
          const uUrl = URL.createObjectURL(usdz) + "#model.usdz";
          setUsdzUrl(uUrl);
        } catch (e) {
          console.warn("USDZ generation note:", e);
        }
      } catch (err: any) {
        console.error("Export error:", err);
        if (active) setExportError(err?.message || String(err));
      } finally {
        if (active) setPreparing(false);
      }
    };

    generateModels();

    return () => {
      active = false;
    };
  }, [isOpen]);

  const isLocalhost = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

  const effectiveUrl = useMemo(() => {
    if (!currentUrl) return "";
    try {
      const u = new URL(currentUrl);
      if (isLocalhost && networkIp.trim()) {
        u.hostname = networkIp.trim();
      }
      u.searchParams.set("ar", "1");
      return u.toString();
    } catch {
      return currentUrl;
    }
  }, [currentUrl, isLocalhost, networkIp]);

  if (!isOpen) return null;

  const sanitizeName = (hallName || "hala").replace(/\s+/g, "_").toLowerCase();

  const handleLaunchMobileAr = async () => {
    if (!exportRef.current) {
      alert("3D model ešte nie je pripravený.");
      return;
    }
    setLoading("Pripravujem AR model v reálnej mierke 1:1...");
    try {
      if (isIos) {
        const usdzBlob = await exportToUsdz(exportRef.current);
        launchIosAr(usdzBlob, `${sanitizeName}.usdz`);
        setSuccessMsg("AR zobrazenie spustené na vašom Apple zariadení!");
      } else {
        const glbBlob = await exportToGlb(exportRef.current);
        downloadBlob(glbBlob, `${sanitizeName}.glb`);
        setSuccessMsg("Model .GLB stiahnutý do zariadenia!");
      }
    } catch (err) {
      console.error("Chyba pri generovaní AR modelu:", err);
      alert("Nepodarilo sa vygenerovať AR model: " + String(err));
    } finally {
      setLoading(null);
    }
  };

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(effectiveUrl)}&margin=8`;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 p-3 md:p-6 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-emerald-500/30 bg-[#0e1116] p-5 md:p-7 shadow-2xl font-mono text-white">
        {/* Glow accent */}
        <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
                AR Rozšírená realita
                <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-300 ring-1 ring-emerald-500/30">
                  Mierka 1:1
                </span>
              </h2>
              <p className="text-[11px] text-white/50">
                Umiestnite halu {hallName} priamo na váš pozemok cez kameru
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg bg-white/10 p-2 text-white/70 hover:bg-white/20 hover:text-white transition cursor-pointer"
            title="Zavrieť"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mobile View: Native WebXR & Quick Look via model-viewer */}
        {isMobile ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
              <Smartphone className="h-10 w-10 mx-auto text-emerald-400 mb-2 animate-bounce" />
              <h3 className="text-sm font-bold text-white mb-1">
                Zobrazenie v kamere telefónu
              </h3>
              <p className="text-xs text-white/70 mb-3">
                Namierte kameru na rovnú zem. Systém umiestni halu priamo pred vás v skutočnej veľkosti.
              </p>

              {preparing ? (
                <div className="flex items-center justify-center gap-2 py-3.5 text-xs text-emerald-300">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Pripravujem 3D AR dáta...</span>
                </div>
              ) : glbUrl ? (
                <div className="space-y-3">
                  <div className="relative overflow-hidden rounded-xl border border-emerald-500/30 bg-[#0a0d12]">
                    <model-viewer
                      src={glbUrl}
                      ios-src={usdzUrl || undefined}
                      ar
                      ar-modes="webxr scene-viewer quick-look"
                      ar-scale="fixed"
                      camera-controls
                      touch-action="pan-y"
                      shadow-intensity="1"
                      style={{ width: "100%", height: "240px", backgroundColor: "#0a0d12" }}
                    >
                      <button
                        slot="ar-button"
                        className="w-[calc(100%-2rem)] mx-auto absolute bottom-3 left-0 right-0 flex items-center justify-center gap-2 rounded-xl bg-emerald-400 py-3.5 px-4 text-sm font-bold text-slate-900 shadow-xl hover:bg-emerald-300 active:scale-[0.98] transition cursor-pointer"
                      >
                        <Sparkles className="h-5 w-5" />
                        <span>Spustiť kameru (AR v priestore)</span>
                      </button>
                    </model-viewer>
                  </div>
                  <div className="text-[10px] text-white/50">
                    Dotykom v okne môžete modelom otáčať alebo kliknite na zelené tlačidlo pre umiestnenie na pozemok.
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleLaunchMobileAr}
                  disabled={!!loading}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-400 py-3.5 px-4 text-sm font-bold text-slate-900 shadow-lg hover:bg-emerald-300 active:scale-[0.98] transition cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>{loading}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5" />
                      <span>Spustiť AR v kamere</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Desktop View: QR Code + 3D Downloads */
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center rounded-xl border border-white/10 bg-black/40 p-4">
              <div className="flex flex-col items-center justify-center p-3 bg-white rounded-xl shadow-inner">
                <img
                  src={qrImageUrl}
                  alt="QR kód pre AR"
                  className="w-44 h-44 object-contain"
                  loading="lazy"
                />
                <span className="text-[11px] text-slate-800 font-bold mt-2 flex items-center gap-1.5">
                  <QrCode className="h-3.5 w-3.5 text-emerald-600" /> Naskenujte fotoaparátom mobilu
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                  <Smartphone className="h-4 w-4 shrink-0" />
                  <span>Okamžité spustenie na mobile:</span>
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-white/70 text-[11px] leading-relaxed">
                  <li>Namierte fotoaparát telefónu na QR kód vľavo.</li>
                  <li>Ťuknite na odkaz, ktorý sa zobrazí v hľadáčiku.</li>
                  <li>V mobile sa automaticky načíta tento model a spustí AR kamera v mierke 1:1.</li>
                </ol>

                {isLocalhost && (
                  <div className="mt-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2 text-[10px]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-emerald-300 font-bold flex items-center gap-1">
                        <Wifi className="h-3 w-3" /> Lokálna sieťová IP:
                      </span>
                      <span className="text-white/50">:8080</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={networkIp}
                        onChange={(e) => setNetworkIp(e.target.value)}
                        className="w-28 rounded bg-[#161b22] px-2 py-0.5 text-white border border-white/20 text-xs font-mono outline-none focus:border-emerald-400"
                        placeholder="192.168.8.111"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(effectiveUrl);
                          setSuccessMsg("Odkaz pre mobil bol skopírovaný!");
                          setTimeout(() => setSuccessMsg(null), 3000);
                        }}
                        className="rounded bg-white/10 hover:bg-white/20 px-2 py-1 text-[10px] font-bold text-white transition cursor-pointer"
                      >
                        Kopírovať
                      </button>
                    </div>
                  </div>
                )}

                {/* Direct 3D downloads on Desktop */}
                <div className="pt-2 border-t border-white/10 flex flex-col gap-1.5">
                  <button
                    onClick={async () => {
                      if (!exportRef.current) return;
                      setLoading("Pripravujem .GLB...");
                      try {
                        const b = await exportToGlb(exportRef.current);
                        downloadBlob(b, `${sanitizeName}.glb`);
                        setSuccessMsg("3D model .GLB bol stiahnutý!");
                        setTimeout(() => setSuccessMsg(null), 3000);
                      } finally {
                        setLoading(null);
                      }
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-white font-mono text-xs font-semibold transition cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Stiahnuť 3D model (.GLB)</span>
                  </button>
                  <button
                    onClick={async () => {
                      if (!exportRef.current) return;
                      setLoading("Pripravujem .USDZ...");
                      try {
                        const b = await exportToUsdz(exportRef.current);
                        downloadBlob(b, `${sanitizeName}.usdz`);
                        setSuccessMsg("Model pre Apple (.USDZ) bol stiahnutý!");
                        setTimeout(() => setSuccessMsg(null), 3000);
                      } finally {
                        setLoading(null);
                      }
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-white font-mono text-xs font-semibold transition cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5 text-cyan-400" />
                    <span>Stiahnuť pre Apple (.USDZ)</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Status / Feedback messages */}
        {loading && (
          <div className="mt-4 flex items-center gap-2 text-xs text-emerald-300 bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20">
            <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            <span>{loading}</span>
          </div>
        )}
        {successMsg && !loading && (
          <div className="mt-4 flex items-center gap-2 text-xs text-emerald-300 bg-emerald-500/15 p-2.5 rounded-lg border border-emerald-500/30">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}
      </div>
    </div>
  );
}

