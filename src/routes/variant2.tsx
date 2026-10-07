import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, lazy, Suspense } from "react";

const Configurator = lazy(() => import("@/components/garage/Configurator"));

export const Route = createFileRoute("/variant2")({
  component: Variant2,
  head: () => ({
    meta: [
      { title: "Steel Garage Configurator — Variant 2" },
      { name: "description", content: "Parametrický 3D konfigurátor oceľovej garáže — variant 2 s vlastnou fotogalériou." },
    ],
  }),
});

function Variant2() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#0e1116] font-mono text-sm text-white/60">
        Spúšťam 3D CAD prostredie…
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-screen items-center justify-center bg-[#0e1116] font-mono text-sm text-emerald-300/80">
          Načítavam 3D model haly…
        </div>
      }
    >
      <Configurator variant="variant2" />
    </Suspense>
  );
}
