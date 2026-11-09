import React, { useState, useEffect, useMemo } from "react";
import type { GarageParams } from "@/lib/garage/types";
import { X, QrCode, Copy, ExternalLink, Printer, Smartphone, FileText, CheckCircle2, Wifi } from "lucide-react";
import { toast } from "sonner";

interface BuildingQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId?: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  params: GarageParams;
}

export function BuildingQrModal({
  isOpen,
  onClose,
  orderId = "",
  clientName = "",
  clientEmail = "",
  clientPhone = "",
  params,
}: BuildingQrModalProps) {
  const [networkIp, setNetworkIp] = useState("192.168.8.111");
  const [copied, setCopied] = useState(false);

  const isLocalhost = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

  const localDocUrl = useMemo(() => {
    if (typeof window === "undefined") return "";

    const url = new URL("/dokumentacia", window.location.origin);
    if (orderId) url.searchParams.set("id", orderId);
    if (clientName) url.searchParams.set("client", clientName);
    if (clientEmail) url.searchParams.set("email", clientEmail);
    if (clientPhone) url.searchParams.set("phone", clientPhone);

    const keys = Object.keys(params) as (keyof GarageParams)[];
    for (const key of keys) {
      let val = String(params[key]);
      if (val.startsWith("#")) val = val.substring(1);
      url.searchParams.set(key, val);
    }

    return url.toString();
  }, [params, orderId, clientName, clientEmail, clientPhone]);

  const qrDocUrl = useMemo(() => {
    if (!localDocUrl) return "";
    try {
      const url = new URL(localDocUrl);
      if (isLocalhost && networkIp.trim()) {
        url.hostname = networkIp.trim();
      }
      return url.toString();
    } catch {
      return localDocUrl;
    }
  }, [localDocUrl, isLocalhost, networkIp]);

  if (!isOpen) return null;

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(qrDocUrl)}&margin=8`;

  const handleCopy = () => {
    navigator.clipboard.writeText(localDocUrl);
    setCopied(true);
    toast.success("Odkaz na dokumentáciu bol skopírovaný!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrintLabel = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Štítok stavby - ${orderId || clientName}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 20px; color: #0f172a; }
            .label-card { width: 100mm; max-width: 400px; margin: 0 auto; border: 2px solid #0f172a; border-radius: 12px; padding: 16px; box-sizing: border-box; text-align: center; }
            .header { font-size: 16px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; }
            .qr-code { width: 180px; height: 180px; margin: 0 auto 12px; }
            .title { font-size: 14px; font-weight: 700; margin-bottom: 4px; }
            .dim { font-size: 18px; font-weight: 900; color: #0284c7; margin-bottom: 8px; }
            .meta { font-size: 11px; color: #475467; line-height: 1.4; text-align: left; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px; }
            .footer { font-size: 10px; color: #94a3b8; margin-top: 10px; text-transform: uppercase; font-weight: 600; }
          </style>
        </head>
        <body>
          <div class="label-card">
            <div class="header">VBAU — DOKUMENTÁCIA STAVBY</div>
            <img class="qr-code" src="${qrImageUrl}" alt="QR Kód" />
            <div class="title">${clientName || "Zákazka"}</div>
            <div class="dim">${params.width}m × ${params.length}m × ${params.clearHeight}m</div>
            <div class="meta">
              <div><strong>Kód zákazky:</strong> ${orderId || "CP-" + new Date().getFullYear()}</div>
              <div><strong>Typ strechy:</strong> ${params.roofType === "gable" ? "Sedlová strecha" : "Pultová strecha"}</div>
              <div><strong>Opláštenie:</strong> ${params.panelType}</div>
              <div><strong>Obsah QR:</strong> PDF ponuka + Technický výkres + AR (3D)</div>
            </div>
            <div class="footer">Naskenujte fotoaparátom telefónu</div>
          </div>
          <script>
            window.onload = () => { window.print(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in font-mono text-white select-none">
      <div className="relative w-full max-w-lg rounded-2xl border border-emerald-500/30 bg-[#0e1218] p-6 shadow-2xl">
        {/* Glow */}
        <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                QR Kód Stavby
                <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-300 ring-1 ring-emerald-500/30">
                  PDF + AR
                </span>
              </h2>
              <p className="text-[11px] text-white/50">
                Dokumentácia pre stavbu a klienta: {clientName || orderId || "Vybraná stavba"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg bg-white/5 p-2 text-white/60 hover:bg-white/10 hover:text-white transition cursor-pointer"
            title="Zavrieť"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* QR Code & Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center rounded-xl border border-white/10 bg-black/40 p-4 mb-4">
          <div className="flex flex-col items-center justify-center p-3 bg-white rounded-xl shadow-md">
            <img
              src={qrImageUrl}
              alt="QR Kód stavby"
              className="w-44 h-44 object-contain"
              loading="lazy"
            />
            <span className="text-[10px] text-slate-800 font-bold mt-1.5 flex items-center gap-1">
              <Smartphone className="h-3.5 w-3.5 text-emerald-600" />
              Naskenujte fotoaparátom
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-white/40 block">Stavba:</span>
              <span className="text-sm font-bold text-emerald-300">
                {params.width} × {params.length} × {params.clearHeight}m
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-white/40 block">Zákazník:</span>
              <span className="text-xs text-white/90 font-sans font-bold">{clientName || "—"}</span>
              {orderId && <div className="text-[10px] text-white/50 font-mono">ID: {orderId}</div>}
            </div>

            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2.5 space-y-1">
              <div className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                Čo sa otvorí v mobile:
              </div>
              <ul className="text-[10px] text-white/70 list-disc list-inside space-y-0.5">
                <li>Stiahnutie PDF ponuky</li>
                <li>Technický výkres / pôdorys</li>
                <li>AR zobrazenie v reálnej mierke 1:1</li>
                <li>Parametre a špecifikácie stavby</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Localhost IP helper */}
        {isLocalhost && (
          <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-[11px]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-emerald-300 font-bold flex items-center gap-1">
                <Wifi className="h-3 w-3" /> Sieťová IP pre mobil (rovnaká Wi-Fi):
              </span>
              <span className="text-[10px] text-white/50 font-mono">Port :8080</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={networkIp}
                onChange={(e) => setNetworkIp(e.target.value)}
                className="flex-1 rounded bg-[#161b22] px-2.5 py-1.5 text-white border border-white/20 text-xs font-mono outline-none focus:border-emerald-400"
                placeholder="192.168.8.111"
              />
              <span className="text-[10px] text-white/60">
                Mobil sa pripojí na PC cez túto IP
              </span>
            </div>
          </div>
        )}

        {/* Actions bar */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/10">
          <button
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/20 px-3 py-2 text-xs font-bold text-white transition cursor-pointer"
          >
            {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            {copied ? "Skopírované!" : "Kopírovať odkaz"}
          </button>

          <button
            onClick={handlePrintLabel}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 px-3.5 py-2 text-xs font-bold transition cursor-pointer"
          >
            <Printer className="h-4 w-4" />
            Tlačiť štítok
          </button>

          <a
            href={localDocUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-slate-900 px-3.5 py-2 text-xs font-bold transition cursor-pointer shadow-lg shadow-emerald-400/20"
          >
            <ExternalLink className="h-4 w-4" />
            Otvoriť dokumentáciu
          </a>
        </div>
      </div>
    </div>
  );
}
