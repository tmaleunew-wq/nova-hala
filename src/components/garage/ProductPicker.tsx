import type { HallConfig } from "@/lib/garage/configHelper";

export function ProductPicker({
  halls,
  selectedHall,
  onSelect,
  onClose,
  imageCatalog = "/catalog",
  pickerLayout = "grid",
  hallsOnly = false,
}: {
  halls: Record<string, HallConfig>;
  selectedHall?: string;
  onSelect: (name: string) => void;
  onClose?: () => void;
  imageCatalog?: string;
  pickerLayout?: "grid" | "binary";
  hallsOnly?: boolean;
}) {
  const names = Object.keys(halls);
  return (
    <div
      id="product-picker"
      className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-[#0a0d12]/95 backdrop-blur-md touch-pan-y"
    >
      <div className="relative mx-auto max-w-6xl px-3 sm:px-4 py-4 sm:py-8 md:py-14">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute right-3 sm:right-4 top-4 sm:top-6 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition cursor-pointer"
            title="Zavrieť"
          >
            ✕
          </button>
        )}
        <div className="mb-5 sm:mb-8 text-center flex flex-col items-center">
          <div className="mb-3 sm:mb-4 inline-flex items-center justify-center rounded-2xl bg-white/95 px-4 sm:px-5 py-2 sm:py-2.5 shadow-[0_0_30px_rgba(255,255,255,0.2)]">
            <img
              src="/logo.png"
              alt="VBAU"
              className="h-8 sm:h-10 md:h-12 w-auto object-contain"
            />
          </div>
          <div className="mx-auto mb-2 sm:mb-3 h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
          <h2 className="font-mono text-base sm:text-lg md:text-2xl tracking-widest text-white">
            VÝBER PRODUKTU
          </h2>
          <p className="mt-1 sm:mt-2 font-mono text-[11px] sm:text-xs text-white/50">
            Vyberte si typ konštrukcie, s ktorým chcete začať
          </p>
        </div>

        {pickerLayout === "binary" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 max-w-6xl mx-auto pb-8">
            {/* 1. Vlastná garáž */}
            <button
              id="pick-vlastny"
              onClick={() => onSelect("Vlastný")}
              className={`group cursor-pointer overflow-hidden rounded-2xl border text-left transition-all duration-300 hover:-translate-y-2 hover:border-emerald-300 hover:shadow-[0_0_45px_rgba(52,211,153,0.45)] border-emerald-400 bg-gradient-to-br from-emerald-500/20 via-[#0e141c] to-[#080b10] ring-2 ring-emerald-400/50 shadow-[0_0_30px_rgba(52,211,153,0.25)]`}
            >
              <div className="h-48 sm:h-64 md:h-80 overflow-hidden bg-[#ececec] flex items-center justify-center relative border-b border-white/10 shadow-[inset_0_2px_10px_rgba(0,0,0,0.08)]">
                <img
                  src={`${imageCatalog}/vlastna_garaz.png?v=3`}
                  alt="Vlastná garáž"
                  loading="lazy"
                  className="h-full w-full object-cover sm:object-contain transition duration-500 group-hover:scale-105"
                />
                <span className="absolute top-4 right-4 z-20 rounded-full bg-emerald-400 text-slate-950 font-mono text-xs font-bold px-3.5 py-1.5 shadow-lg shadow-emerald-500/30">
                  Na mieru
                </span>
              </div>
              <div className="border-t border-white/10 p-4 sm:p-6 md:p-8 space-y-3 md:space-y-4">
                <div>
                  <h3 className="font-mono text-lg sm:text-xl md:text-2xl font-bold text-white group-hover:text-emerald-400 transition flex items-center justify-between">
                    <span>Vlastná garáž</span>
                    <span className="text-emerald-400 text-lg font-normal transition-transform group-hover:translate-x-1">→</span>
                  </h3>
                  <p className="text-xs md:text-sm font-mono text-emerald-400/90 mt-1">
                    Individuálny návrh garáže podľa vašich rozmerov
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:gap-3 font-mono">
                  <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5 sm:p-3 transition-colors group-hover:border-emerald-500/30">
                    <div className="text-[10px] sm:text-[11px] text-white/50 uppercase tracking-wider">Rozmery</div>
                    <div className="text-xs sm:text-base font-bold text-white mt-0.5">Voliteľné na mieru</div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5 sm:p-3 transition-colors group-hover:border-emerald-500/30">
                    <div className="text-[10px] sm:text-[11px] text-white/50 uppercase tracking-wider">Opláštenie</div>
                    <div className="text-xs sm:text-base font-bold text-white mt-0.5">Sendvič / Trapéz</div>
                  </div>
                </div>
                <p className="text-xs md:text-sm text-white/70 leading-relaxed">
                  Navrhnite si vlastnú garáž s voliteľnou šírkou, dĺžkou a výškou, sedlovou či pultovou strechou, sekčnou bránou, dverami, oknami a prístreškom.
                </p>
                <div className="pt-1 sm:pt-2">
                  <div className="w-full py-2.5 sm:py-3.5 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 group-hover:from-emerald-300 group-hover:to-teal-300 text-slate-950 font-mono text-xs md:text-sm font-bold text-center transition shadow-lg shadow-emerald-500/25">
                    Konfigurovať vlastnú garáž
                  </div>
                </div>
              </div>
            </button>

            {/* 2. Hala */}
            <button
              id="pick-hala"
              onClick={() => onSelect(names.find((n) => n.includes("10")) || names[0] || "Hala S-10")}
              className={`group cursor-pointer overflow-hidden rounded-2xl border text-left transition-all duration-300 hover:-translate-y-2 hover:border-cyan-300 hover:shadow-[0_0_45px_rgba(34,211,238,0.45)] border-cyan-400 bg-gradient-to-br from-cyan-500/20 via-[#0e141c] to-[#080b10] ring-2 ring-cyan-400/50 shadow-[0_0_30px_rgba(34,211,238,0.25)]`}
            >
              <div className="h-48 sm:h-64 md:h-80 overflow-hidden bg-[#ececec] flex items-center justify-center relative border-b border-white/10 shadow-[inset_0_2px_10px_rgba(0,0,0,0.08)]">
                <img
                  src={`${imageCatalog}/${halls[names.find((n) => n.includes("10")) || names[0]]?.imageKey || names.find((n) => n.includes("10")) || names[0] || "Hala S-10"}_render.png?v=3`}
                  alt="Oceľová hala"
                  loading="lazy"
                  className="h-full w-full object-cover sm:object-contain transition duration-500 group-hover:scale-105"
                />
                <span className="absolute top-4 right-4 z-20 rounded-full bg-cyan-400 text-slate-950 font-mono text-xs font-bold px-3.5 py-1.5 shadow-lg shadow-cyan-500/30">
                  Typová hala
                </span>
              </div>
              <div className="border-t border-white/10 p-4 sm:p-6 md:p-8 space-y-3 md:space-y-4">
                <div>
                  <h3 className="font-mono text-lg sm:text-xl md:text-2xl font-bold text-white group-hover:text-cyan-400 transition flex items-center justify-between">
                    <span>Oceľová hala</span>
                    <span className="text-cyan-400 text-lg font-normal transition-transform group-hover:translate-x-1">→</span>
                  </h3>
                  <p className="text-xs md:text-sm font-mono text-cyan-400/90 mt-1">
                    Typové priemyselné, skladové a hospodárske haly
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:gap-3 font-mono">
                  <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5 sm:p-3 transition-colors group-hover:border-cyan-500/30">
                    <div className="text-[10px] sm:text-[11px] text-white/50 uppercase tracking-wider">Rozpon / Šírka</div>
                    <div className="text-xs sm:text-base font-bold text-white mt-0.5">8 m – 20 m</div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5 sm:p-3 transition-colors group-hover:border-cyan-500/30">
                    <div className="text-[10px] sm:text-[11px] text-white/50 uppercase tracking-wider">Konštrukcia</div>
                    <div className="text-xs sm:text-base font-bold text-white mt-0.5">Rámová oceľ S355</div>
                  </div>
                </div>
                <p className="text-xs md:text-sm text-white/70 leading-relaxed">
                  Vyberte si z certifikovaných typových oceľových hál s overenou statikou, modulovou dĺžkou a možnosťou opláštenia či kót A-B-C.
                </p>
                <div className="pt-1 sm:pt-2">
                  <div className="w-full py-2.5 sm:py-3.5 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-400 group-hover:from-cyan-300 group-hover:to-sky-300 text-slate-950 font-mono text-xs md:text-sm font-bold text-center transition shadow-lg shadow-cyan-500/25">
                    Konfigurovať halu
                  </div>
                </div>
              </div>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Vlastná garáž */}
            {!hallsOnly && (
              <button
                id="pick-vlastny"
                onClick={() => onSelect("Vlastný")}
                className={`group cursor-pointer overflow-hidden rounded-xl border text-left transition hover:-translate-y-1 hover:border-emerald-400 hover:shadow-[0_0_30px_rgba(52,211,153,0.25)] ${
                  selectedHall === "Vlastný"
                    ? "border-emerald-400 bg-gradient-to-br from-emerald-500/25 to-[#0e1116] ring-2 ring-emerald-400/50"
                    : "border-emerald-500/30 bg-gradient-to-br from-emerald-500/15 to-[#0e1116]"
                }`}
              >
                <div className="h-40 overflow-hidden bg-[#ececec] flex items-center justify-center">
                  <img
                    src={`${imageCatalog}/vlastna_garaz.png?v=3`}
                    alt="Vlastná garáž"
                    loading="lazy"
                    className="h-full w-full object-contain transition duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="border-t border-white/10 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono text-sm font-bold text-emerald-400">
                        Vlastná garáž
                      </span>
                      <div className="text-xs font-semibold text-white/90 mt-0.5">
                        Individuálna garáž na mieru
                      </div>
                    </div>
                    <span className="rounded bg-emerald-400/20 border border-emerald-400/30 px-2 py-0.5 font-mono text-[10px] text-emerald-300 whitespace-nowrap shrink-0">
                      {selectedHall === "Vlastný" ? "✓ Aktívne" : "Na mieru"}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 font-mono">
                    <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">Šírka</div>
                      <div className="text-sm font-bold text-white">Voliteľná</div>
                    </div>
                    <div className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1.5">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-cyan-400">Modul</div>
                      <div className="text-sm font-bold text-white">Na mieru</div>
                    </div>
                  </div>
                  <div className="mt-2 font-mono text-[10px] text-white/50">
                    Štandard · voliteľné rozmery, opláštenie, brána, okná
                  </div>
                  <p className="mt-2 text-[11px] leading-relaxed text-white/70 min-h-[36px]">
                    Individuálna garáž na mieru s voliteľnými rozmermi, sklonom strechy, opláštením sendvičovým panelom, bránou, dverami a oknami.
                  </p>
                </div>
              </button>
            )}

            {names.map((name) => {
              const h = halls[name];
              const isSelected = selectedHall === name;
              return (
                <button
                  key={name}
                  id={`pick-${name}`}
                  onClick={() => onSelect(name)}
                  className={`group cursor-pointer overflow-hidden rounded-xl border text-left transition hover:-translate-y-1 hover:border-emerald-400 hover:shadow-[0_0_30px_rgba(52,211,153,0.25)] ${
                    isSelected
                      ? "border-emerald-400 bg-[#0e1116] ring-2 ring-emerald-400/50 shadow-[0_0_20px_rgba(52,211,153,0.2)]"
                      : "border-white/10 bg-[#0e1116]"
                  }`}
                >
                  <div className="h-40 overflow-hidden bg-[#161b22]">
                    <img
                      src={`${imageCatalog}/${h.imageKey || name}_render.png?v=3`}
                      alt={h.name || name}
                      loading="lazy"
                      className="h-full w-full object-contain transition duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="border-t border-white/10 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono text-sm font-bold text-emerald-400">
                          {name}
                        </span>
                        {h.subtitle && (
                          <div className="text-xs font-semibold text-white/90 mt-0.5">
                            {h.subtitle}
                          </div>
                        )}
                      </div>
                      <span className="rounded bg-emerald-400/20 border border-emerald-400/30 px-2 py-0.5 font-mono text-[10px] text-emerald-300 whitespace-nowrap shrink-0">
                        {isSelected ? "✓ Aktívne" : (h.badge || (h.type === "shed" ? "Pultová" : "Sedlová"))}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 font-mono">
                      <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">Šírka</div>
                        <div className="text-sm font-bold text-white">{h.width} m</div>
                      </div>
                      <div className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1.5">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-cyan-400">Modul</div>
                        <div className="text-sm font-bold text-white">{h.moduleLength} m</div>
                      </div>
                    </div>
                    <div className="mt-2 font-mono text-[10px] text-white/50">
                      {h.framework}
                    </div>
                    <p className="mt-2 text-[11px] leading-relaxed text-white/70 min-h-[36px]">
                      {h.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
