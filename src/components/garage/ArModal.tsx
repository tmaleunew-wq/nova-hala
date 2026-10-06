import { useState, useEffect, useMemo } from "react";
import * as THREE from "three";
import { X, Smartphone, QrCode, CheckCircle2, Loader2, Sparkles, Wifi } from "lucide-react";
import {
  exportToGlb,
  exportToUsdz,
  launchIosAr,
  downloadBlob,
  isIosDevice,
  isMobileDevice,
} from "@/lib/garage/arExporter";

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

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsMobile(isMobileDevice());
      setIsIos(isIosDevice());
      setCurrentUrl(window.location.href);
    }
  }, [isOpen]);

  const isLocalhost = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

  // Ak bežíme na lokálnom počítači (localhost), mobil potrebuje sieťovú IP (192.168.8.111),
  // inak fotoaparát vyhodnotí "localhost" len ako surový text a nevie sa k PC pripojiť.
  const effectiveUrl = useMemo(() => {
    if (!currentUrl) return "";
    if (isLocalhost && networkIp.trim()) {
      try {
        const u = new URL(currentUrl);
        u.hostname = networkIp.trim();
        return u.toString();
      } catch {
        return currentUrl;
      }
    }
    return currentUrl;
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
        setSuccessMsg("Model .GLB stiahnutý. Otvorte ho vo vašom prehliadači 3D/AR!");
      }
    } catch (err) {
      console.error("Chyba pri generovaní AR modelu:", err);
      alert("Nepodarilo sa vygenerovať AR model: " + String(err));
    } finally {
      setLoading(null);
    }
  };



  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(effectiveUrl)}&margin=8`;

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
                Umiestnite nakonfigurovanú halu priamo na váš pozemok
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

        {/* Mobile View: Launch AR Button */}
        {isMobile ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
              <Smartphone className="h-10 w-10 mx-auto text-emerald-400 mb-2 animate-bounce" />
              <h3 className="text-sm font-bold text-white mb-1">
                Zobrazenie v kamere telefónu
              </h3>
              <p className="text-xs text-white/70 mb-4">
                Namierte kameru na rovnú zem. Systém umiestni halu {hallName} priamo pred vás v skutočnej veľkosti.
              </p>

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
                    <span>{isIos ? "Spustiť AR v priestore (Apple)" : "Pripraviť AR zobrazenie"}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Desktop View: QR Code + 3D Downloads */
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center rounded-xl border border-white/10 bg-black/40 p-4">
              <div className="flex flex-col items-center justify-center p-2 bg-white rounded-lg shadow-inner">
                <img
                  src={qrImageUrl}
                  alt="QR kód pre AR"
                  className="w-40 h-40 object-contain"
                  loading="lazy"
                />
                <span className="text-[10px] text-slate-700 font-bold mt-1.5 flex items-center gap-1">
                  <QrCode className="h-3 w-3" /> Naskenujte fotoaparátom
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                  <Smartphone className="h-4 w-4 shrink-0" />
                  <span>Ako otvoriť AR na mobile:</span>
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-white/70 text-[11px] leading-relaxed">
                  <li>Uistite sa, že telefón je pripojený na rovnakú Wi-Fi sieť.</li>
                  <li>Fotoaparátom naskenujte QR kód a ťuknite na odkaz (Safari / Chrome).</li>
                  <li>V mobile kliknite na tlačidlo <strong className="text-white">📱 AR</strong> a hala sa vám premietne do reálneho priestoru 1:1.</li>
                </ol>

                {isLocalhost && (
                  <div className="mt-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-[11px]">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-emerald-300 font-bold flex items-center gap-1">
                        <Wifi className="h-3 w-3" /> Sieťová IP pre mobil:
                      </span>
                      <span className="text-[10px] text-white/50">Port :8080</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={networkIp}
                        onChange={(e) => setNetworkIp(e.target.value)}
                        className="w-32 rounded bg-[#161b22] px-2 py-1 text-white border border-white/20 text-xs font-mono outline-none focus:border-emerald-400"
                        placeholder="192.168.8.111"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(effectiveUrl);
                          setSuccessMsg("Odkaz pre mobil bol skopírovaný do schránky!");
                        }}
                        className="rounded bg-white/10 hover:bg-white/20 px-2.5 py-1 text-[10px] font-bold text-white transition cursor-pointer"
                      >
                        Kopírovať odkaz
                      </button>
                    </div>
                    <p className="text-[9px] text-white/50 mt-1 leading-tight">
                      Fotoaparáty vnímajú „localhost“ iba ako text. Preto QR kód používa vašu sieťovú IP, ktorú mobil okamžite otvorí ako web.
                    </p>
                  </div>
                )}
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
