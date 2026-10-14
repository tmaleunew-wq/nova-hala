import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Sparkles, Smartphone, QrCode, Loader2, ExternalLink } from 'lucide-react';

interface ARViewerProps {
  open: boolean;
  onClose: () => void;
  glbUrl: string | null;
  isGenerating: boolean;
  primaryColor?: string;
  title?: string;
  description?: string;
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': any;
    }
  }
}

export const ARViewer: React.FC<ARViewerProps> = ({
  open,
  onClose,
  glbUrl,
  isGenerating,
  primaryColor = '#10b981',
  title = 'Zobraziť v AR (Rozšírená realita)',
  description = 'Vizualizujte halu priamo vo vašom priestore',
}) => {
  const [modelViewerLoaded, setModelViewerLoaded] = useState(false);
  const isMobile = typeof window !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const [targetWebUrl, setTargetWebUrl] = useState('https://steel-shed-forge-mu.vercel.app/?ar=1');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const sourceUrl = new URL(window.location.href);
      const cleanParams = new URLSearchParams();

      // 1. AR flag so mobile triggers AR on open
      cleanParams.set('ar', '1');

      // 2. Hall type (pure ASCII)
      const rawHall = sourceUrl.searchParams.get('hallType');
      if (rawHall) {
        if (rawHall === 'Vlastný' || rawHall.toLowerCase().includes('vlastn')) {
          cleanParams.set('hallType', 'vlastna');
        } else {
          cleanParams.set('hallType', rawHall.normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
        }
      }

      // 3. Keep only essential dimensions for clean, low-density QR code (scans instantly)
      const essentialKeys = ['width', 'length', 'clearHeight', 'roofType', 'client'];
      for (const k of essentialKeys) {
        const val = sourceUrl.searchParams.get(k);
        if (val) cleanParams.set(k, val);
      }

      const host = (sourceUrl.hostname === 'localhost' || sourceUrl.hostname === '127.0.0.1' || sourceUrl.hostname.startsWith('192.168.'))
        ? 'steel-shed-forge-mu.vercel.app'
        : sourceUrl.host;

      const cleanUrl = `https://${host}/?${cleanParams.toString()}`;
      setTargetWebUrl(cleanUrl);
    } catch {
      setTargetWebUrl('https://steel-shed-forge-mu.vercel.app/?ar=1');
    }
  }, [open]);

  // size=320x320 and margin=4 provides standard quiet zone for instant camera detection
  const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=4&data=${encodeURIComponent(targetWebUrl)}`;

  useEffect(() => {
    if (open) {
      if (customElements.get('model-viewer')) {
        setModelViewerLoaded(true);
        return;
      }
      import('@google/model-viewer')
        .then(() => setModelViewerLoaded(true))
        .catch((err) => {
          if (customElements.get('model-viewer')) {
            setModelViewerLoaded(true);
          } else {
            console.error('Failed to load @google/model-viewer:', err);
            customElements.whenDefined('model-viewer').then(() => setModelViewerLoaded(true));
          }
        });
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl sm:max-w-4xl rounded-3xl p-0 overflow-hidden bg-background border border-border shadow-2xl z-[9999]">
        <DialogHeader className="p-6 pb-4 border-b border-border flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md"
              style={{ backgroundColor: primaryColor }}
            >
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black tracking-tight">
                {title}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 flex flex-col items-center justify-center min-h-[380px] bg-slate-50/50 dark:bg-slate-900/50">
          {isGenerating ? (
            <div className="flex flex-col items-center gap-4 py-12">
              <div className="relative flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-accent/20 rounded-full" />
                <div
                  className="absolute w-16 h-16 border-4 border-t-transparent rounded-full animate-spin"
                  style={{ borderColor: `${primaryColor} transparent ${primaryColor} ${primaryColor}` }}
                />
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground absolute" />
              </div>
              <div className="flex flex-col items-center gap-1 text-center">
                <span className="text-sm font-extrabold uppercase tracking-wider">
                  Generujem 3D AR Model...
                </span>
                <span className="text-xs text-muted-foreground">
                  Prevádzam aktuálnu konfiguráciu do AR formátu
                </span>
              </div>
            </div>
          ) : glbUrl ? (
            <div className="w-full flex flex-col items-center gap-4">
              <div className="w-full flex flex-col md:flex-row gap-4 items-stretch">
                <div className={`${isMobile ? 'w-full' : 'flex-1'} h-[320px] sm:h-[400px] rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-gradient-to-b from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 relative shadow-inner`}>
                  {modelViewerLoaded ? (
                    <model-viewer
                      src={glbUrl}
                      ar
                      ar-modes="webxr scene-viewer quick-look"
                      camera-controls
                      auto-rotate
                      shadow-intensity="1"
                      touch-action="pan-y"
                      alt="3D Model"
                      style={{ width: '100%', height: '100%' }}
                    >
                      <button
                        slot="ar-button"
                        className="absolute bottom-4 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full text-white font-extrabold text-xs uppercase tracking-wider shadow-xl flex items-center gap-2.5 transition-transform active:scale-95 border border-white/20"
                        style={{ backgroundColor: primaryColor }}
                      >
                        <Smartphone className="w-4 h-4" />
                        Otvoriť AR v priestore
                      </button>
                    </model-viewer>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* QR Code Container (shown only on Desktop) */}
                {!isMobile && (
                  <div className="w-full md:w-64 flex flex-col items-center justify-center p-4 bg-background border border-border rounded-2xl shadow-sm gap-3 shrink-0">
                    <div className="flex items-center gap-2 font-bold text-xs text-foreground">
                      <QrCode className="w-4 h-4" style={{ color: primaryColor }} />
                      <span>QR kód pre mobil</span>
                    </div>
                    <div className="p-3 bg-white rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-center">
                      <img
                        src={qrCodeImageUrl}
                        alt="QR kód vizualizácie"
                        className="w-44 h-44 object-contain"
                        loading="eager"
                      />
                    </div>
                    <p className="text-[11px] text-center text-muted-foreground leading-tight">
                      Naskenujte fotoaparátom mobilu pre okamžité zobrazenie tejto vizualizácie v AR.
                    </p>
                    <a
                      href={targetWebUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-bold flex items-center gap-1.5 text-emerald-500 hover:text-emerald-400 hover:underline transition mt-1"
                    >
                      <span>Priamy odkaz</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>

              {/* Instructions / Mobile vs Desktop Notice */}
              <div className="w-full flex items-center gap-3 p-4 rounded-2xl bg-background border border-border text-xs">
                <Smartphone className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                <div>
                  <span className="font-bold block">
                    {isMobile
                      ? 'Klepnutím na tlačidlo vyššie spustíte AR fotoaparát.'
                      : 'Pre natívny AR zážitok otvorte túto stránku na mobilnom telefóne (iOS / Android).'}
                  </span>
                  <span className="text-muted-foreground text-[11px]">
                    Model sa automaticky zobrazí v reálnej veľkosti v priestore.
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">
              Model nebol vygenerovaný.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
