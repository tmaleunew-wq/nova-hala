import type { HallConfig } from "@/lib/garage/configHelper";

export function ProductPicker({
  halls,
  selectedHall,
  onSelect,
  onClose,
  imageCatalog = "/catalog",
}: {
  halls: Record<string, HallConfig>;
  selectedHall?: string;
  onSelect: (name: string) => void;
  onClose?: () => void;
  imageCatalog?: string;
}) {
  const names = Object.keys(halls);
  return (
    <div
      id="product-picker"
      className="fixed inset-0 z-50 overflow-y-auto bg-[#0a0d12]/95 backdrop-blur-md"
    >
      <div className="relative mx-auto max-w-6xl px-4 py-8 md:py-14">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute right-4 top-6 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition cursor-pointer"
            title="Zavrieť"
          >
            ✕
          </button>
        )}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
          <h2 className="font-mono text-lg md:text-2xl tracking-widest text-white">
            VÝBER PRODUKTU
          </h2>
          <p className="mt-2 font-mono text-xs text-white/50">
            Vyberte si typ konštrukcie, s ktorým chcete začať
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Vlastná garáž */}
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
                    src={`${imageCatalog}/${name}_render.png?v=3`}
                    alt={`Katalóg ${name}`}
                    loading="lazy"
                    className="h-full w-full object-contain transition duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="border-t border-white/10 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono text-sm font-bold text-emerald-400">
                        {name} <span className="text-white/40 text-xs font-normal">(Katalóg)</span>
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
      </div>
    </div>
  );
}
