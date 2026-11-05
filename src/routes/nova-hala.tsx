import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, lazy, Suspense } from "react";

const NewHallConfigurator = lazy(() => import("@/components/garage/NewHallConfigurator"));

export const Route = createFileRoute("/nova-hala")({
  component: NovaHalaRoute,
  head: () => ({
    meta: [
      { title: "Nová Oceľová Hala — Samostatný Konfigurátor" },
      { name: "description", content: "Samostatný vývojový 3D konfigurátor novej modulárnej oceľovej haly." },
    ],
  }),
});

function NovaHalaRoute() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#0e1116] font-mono text-sm text-white/60">
        Spúšťam 3D CAD prostredie novej haly…
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-screen items-center justify-center bg-[#0e1116] font-mono text-sm text-cyan-300/80">
          Načítavam 3D model novej haly…
        </div>
      }
    >
      <NewHallConfigurator />
    </Suspense>
  );
}
