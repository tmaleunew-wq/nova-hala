import React from 'react';
import { CheckCircle2, RefreshCw, Edit3, MapPin, Mail, Phone, X, FileText, ExternalLink } from 'lucide-react';

interface Props {
  onReset: () => void;
  onClose: () => void;
  onOpenQuote?: () => void;
  quoteUrl?: string;
  dealer?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  primaryColor?: string;
}

export const SuccessModal: React.FC<Props> = ({
  onReset,
  onClose,
  onOpenQuote,
  quoteUrl,
  dealer = {
    name: 'VBAU s.r.o.',
    email: 'tmal.eu.new@gmail.com',
    phone: '+421 900 123 456',
    address: 'Bratislava, Slovensko',
  },
  primaryColor = '#10b981',
}) => {
  const contactEmail = dealer.email || 'tmal.eu.new@gmail.com';

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl transition-all scale-in-center relative bg-white text-slate-900 border border-slate-100 font-sans">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full transition-all hover:bg-slate-100 text-slate-400 cursor-pointer"
          aria-label="Zavrieť"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8">
          <div className="flex justify-center mb-6">
            <div 
              className="w-20 h-20 rounded-full flex items-center justify-center" 
              style={{ backgroundColor: `${primaryColor}20` }}
            >
              <CheckCircle2 className="w-10 h-10" style={{ color: primaryColor }} />
            </div>
          </div>
          
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black uppercase tracking-tight mb-3 text-slate-900">
              HOTOVO! PONUKA ODOSLANÁ
            </h2>
            <p className="text-sm leading-relaxed text-slate-500">
              Vaša ponuka vám bola zaslaná na e-mail aj predajcovi:
              <br />
              <strong className="font-bold text-slate-900">{dealer.name}</strong>
              {contactEmail && (
                <>
                  <br />
                  <span className="opacity-80">({contactEmail})</span>
                </>
              )}
            </p>
          </div>

          {/* Dealer Contact Info Box */}
          <div className="mb-8 p-5 rounded-2xl border bg-slate-50 border-slate-100 text-left">
            <div className="space-y-3">
              {dealer.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 mt-0.5 text-slate-400 flex-shrink-0" />
                  <span className="text-xs text-slate-600 leading-snug">{dealer.address}</span>
                </div>
              )}
              {dealer.email && (
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <a 
                    href={`mailto:${dealer.email}`} 
                    className="text-xs font-medium hover:underline" 
                    style={{ color: primaryColor }}
                  >
                    {dealer.email}
                  </a>
                </div>
              )}
              {dealer.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <a 
                    href={`tel:${dealer.phone}`} 
                    className="text-xs font-medium hover:underline" 
                    style={{ color: primaryColor }}
                  >
                    {dealer.phone}
                  </a>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex flex-col gap-3">
            {onOpenQuote && (
              <button 
                type="button"
                className="w-full h-14 rounded-2xl font-extrabold uppercase tracking-widest text-slate-950 bg-emerald-400 hover:bg-emerald-300 shadow-xl shadow-emerald-500/25 active:scale-[0.98] transition-all flex items-center justify-center cursor-pointer text-xs gap-2"
                onClick={onOpenQuote}
              >
                <FileText className="w-4 h-4" />
                ZOBRAZIŤ CENOVÚ PONUKU (PDF)
              </button>
            )}

            {quoteUrl && (
              <a
                href={quoteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline flex items-center justify-center gap-1.5 py-1 text-center"
              >
                <span>Otvoriť samostatnú webovú ponuku</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}

            <button 
              type="button"
              className="w-full h-12 rounded-xl font-bold uppercase tracking-widest text-white/90 bg-slate-900 hover:bg-slate-800 border border-slate-800 shadow-sm active:scale-[0.98] transition-all flex items-center justify-center cursor-pointer text-[11px]"
              onClick={onReset}
            >
              <RefreshCw className="w-3.5 h-3.5 mr-2" />
              NOVÁ KONFIGURÁCIA
            </button>
            
            <button 
              type="button"
              className="w-full h-10 rounded-xl font-bold uppercase tracking-widest text-[10px] text-slate-400 hover:text-slate-900 transition-all flex items-center justify-center cursor-pointer"
              onClick={onClose}
            >
              <Edit3 className="w-3 h-3 mr-2" />
              UPRAVIŤ SÚČASNÚ GARÁŽ
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
