import "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Grid, GizmoHelper, GizmoViewport } from "@react-three/drei";
import { useControls, folder, button, Leva } from "leva";
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { DEFAULT_PARAMS, type GarageParams } from "@/lib/garage/types";
import { Structure } from "./Structure";
import { Cladding } from "./Cladding";
import { Accessories } from "./Accessories";
import { Foundation } from "./Foundation";

type ViewPreset = "iso" | "plan" | "front" | "side";

function Scene({ params, exportRef }: { params: GarageParams; exportRef: React.MutableRefObject<THREE.Group | null> }) {
  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight
        position={[8, 12, 6]}
        intensity={1.4}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
      />
      <directionalLight position={[-6, 8, -4]} intensity={0.35} />
      <hemisphereLight args={["#cbd5e1", "#1f2937", 0.5]} />

      <group ref={exportRef}>
        {params.showFoundation && <Foundation p={params} />}
        {params.showStructure && <Structure p={params} explodeY={params.explode} />}
        {params.showCladding && <Cladding p={params} explodeY={params.explode} />}
        {params.showAccessories && <Accessories p={params} explodeY={params.explode} />}
      </group>

      <Grid
        args={[40, 40]}
        cellSize={0.5}
        cellThickness={0.5}
        cellColor="#2a2f37"
        sectionSize={2}
        sectionThickness={1}
        sectionColor="#4a525c"
        fadeDistance={30}
        fadeStrength={1.2}
        infiniteGrid
        position={[0, -0.149, 0]}
      />
    </>
  );
}

function CameraRig({ preset, params }: { preset: ViewPreset; params: GarageParams }) {
  const { camera, controls } = useThree() as { camera: THREE.PerspectiveCamera; controls: { target: THREE.Vector3; update: () => void } | null };
  useEffect(() => {
    if (!camera) return;
    const W = params.width;
    const L = params.length;
    const H = params.clearHeight;
    const center = new THREE.Vector3(0, H / 2, 0);
    const d = Math.max(W, L) * 1.6;
    let pos: THREE.Vector3;
    switch (preset) {
      case "plan":
        pos = new THREE.Vector3(0.001, Math.max(W, L) * 1.8, 0);
        break;
      case "front":
        pos = new THREE.Vector3(0, H / 2, -Math.max(W, L) * 1.4);
        break;
      case "side":
        pos = new THREE.Vector3(Math.max(W, L) * 1.4, H / 2, 0);
        break;
      case "iso":
      default:
        pos = new THREE.Vector3(d, d * 0.7, d);
    }
    camera.position.copy(pos);
    camera.lookAt(center);
    camera.updateProjectionMatrix();
    if (controls) {
      controls.target.copy(center);
      controls.update();
    }
  }, [preset, params.width, params.length, params.clearHeight, camera, controls]);
  return null;
}

function downloadGLB(group: THREE.Group, filename = "garage.glb") {
  const exporter = new GLTFExporter();
  exporter.parse(
    group,
    (result) => {
      const blob = result instanceof ArrayBuffer ? new Blob([result], { type: "model/gltf-binary" }) : new Blob([JSON.stringify(result)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    },
    (err) => console.error(err),
    { binary: true },
  );
}

export default function Configurator() {
  const exportRef = useRef<THREE.Group | null>(null);
  const [preset, setPreset] = useState<ViewPreset>("iso");

  const params = useControls({
    "Geometria": folder({
      width: { value: DEFAULT_PARAMS.width, min: 2.5, max: 8, step: 0.1, label: "Šírka X [m]" },
      length: { value: DEFAULT_PARAMS.length, min: 3, max: 12, step: 0.1, label: "Dĺžka Y [m]" },
      clearHeight: { value: DEFAULT_PARAMS.clearHeight, min: 2.0, max: 4.0, step: 0.1, label: "Svetlá výška Z [m]" },
      roofType: { value: DEFAULT_PARAMS.roofType, options: { "Sedlová": "gable", "Pultová": "shed" }, label: "Strecha" },
      roofPitchDeg: { value: DEFAULT_PARAMS.roofPitchDeg, min: 5, max: 35, step: 1, label: "Spád strechy [°]" },
    }),
    "Konštrukcia": folder({
      bayCount: { value: DEFAULT_PARAMS.bayCount, min: 2, max: 8, step: 1, label: "Počet polí" },
      profileSize: { value: DEFAULT_PARAMS.profileSize, min: 0.06, max: 0.16, step: 0.01, label: "Jakl strana [m]" },
      profileThickness: { value: DEFAULT_PARAMS.profileThickness, min: 0.002, max: 0.008, step: 0.001, label: "Hrúbka steny [m]" },
      steelColor: { value: DEFAULT_PARAMS.steelColor, label: "Farba ocele" },
    }),
    "Opláštenie": folder({
      claddingColor: { value: DEFAULT_PARAMS.claddingColor, label: "Steny RAL" },
      roofColor: { value: DEFAULT_PARAMS.roofColor, label: "Strecha RAL" },
      panelType: { value: DEFAULT_PARAMS.panelType, options: { "Trapézový plech": "trapezoid", "Sendvičové panely": "sandwich" }, label: "Typ" },
    }),
    "Otvory": folder({
      doorWidth: { value: DEFAULT_PARAMS.doorWidth, min: 2, max: 4, step: 0.1, label: "Brána Š [m]" },
      doorHeight: { value: DEFAULT_PARAMS.doorHeight, min: 1.8, max: 3, step: 0.1, label: "Brána V [m]" },
      hasPersonalDoor: { value: DEFAULT_PARAMS.hasPersonalDoor, label: "Personálne dvere" },
      personalDoorSide: { value: DEFAULT_PARAMS.personalDoorSide, options: ["left", "right", "back"], label: "Strana dverí" },
      windowCount: { value: DEFAULT_PARAMS.windowCount, min: 0, max: 4, step: 1, label: "Počet okien" },
      windowWidth: { value: DEFAULT_PARAMS.windowWidth, min: 0.3, max: 1.5, step: 0.1, label: "Okno Š [m]" },
      windowHeight: { value: DEFAULT_PARAMS.windowHeight, min: 0.3, max: 1.2, step: 0.1, label: "Okno V [m]" },
    }),
    "Zobrazenie": folder({
      showStructure: { value: DEFAULT_PARAMS.showStructure, label: "Konštrukcia" },
      showCladding: { value: DEFAULT_PARAMS.showCladding, label: "Opláštenie" },
      showAccessories: { value: DEFAULT_PARAMS.showAccessories, label: "Príslušenstvo" },
      showFoundation: { value: DEFAULT_PARAMS.showFoundation, label: "Základová doska" },
      wireframe: { value: DEFAULT_PARAMS.wireframe, label: "Wireframe" },
      explode: { value: DEFAULT_PARAMS.explode, min: 0, max: 1, step: 0.01, label: "Exploded view" },
    }),
    "Export": folder({
      "Stiahnuť .glb": button(() => {
        if (exportRef.current) downloadGLB(exportRef.current);
      }),
    }),
  });

  const typedParams: GarageParams = params as GarageParams;

  return (
    <div className="relative h-screen w-screen bg-[oklch(0.16_0.01_240)]">
      {/* Top bar */}
      <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between border-b border-white/5 bg-black/40 px-4 py-2 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
          <h1 className="font-mono text-sm tracking-widest text-white/90">
            STEEL GARAGE — PARAMETRIC CAD
          </h1>
          <span className="rounded border border-white/10 px-2 py-0.5 font-mono text-[10px] text-white/50">
            v1.0
          </span>
        </div>
        <div className="flex items-center gap-1">
          {(["iso", "plan", "front", "side"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setPreset(v)}
              className={`rounded px-3 py-1 font-mono text-xs uppercase tracking-wider transition ${
                preset === v
                  ? "bg-emerald-400/20 text-emerald-300 ring-1 ring-emerald-400/40"
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              }`}
            >
              {v === "iso" ? "Axonometria" : v === "plan" ? "Pôdorys" : v === "front" ? "Čelo" : "Bok"}
            </button>
          ))}
        </div>
        <div className="font-mono text-[10px] text-white/40">
          {typedParams.width.toFixed(1)} × {typedParams.length.toFixed(1)} × {typedParams.clearHeight.toFixed(1)} m
        </div>
      </div>

      {/* Dimensions strip */}
      <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded border border-white/10 bg-black/50 px-3 py-1.5 font-mono text-[10px] text-white/60 backdrop-blur">
        Drag = orbit · Scroll = zoom · Right-drag = pan · Profily {(typedParams.profileSize * 1000).toFixed(0)}×{(typedParams.profileSize * 1000).toFixed(0)}×{(typedParams.profileThickness * 1000).toFixed(0)} mm
      </div>

      <Canvas
        shadows
        camera={{ position: [10, 8, 10], fov: 35, near: 0.1, far: 200 }}
        gl={{ antialias: true, preserveDrawingBuffer: true }}
      >
        <color attach="background" args={["#f5f5f5"]} />
        <fog attach="fog" args={["#f5f5f5", 30, 90]} />
        <Scene params={typedParams} exportRef={exportRef} />
        <OrbitControls makeDefault enableDamping dampingFactor={0.08} target={[0, typedParams.clearHeight / 2, 0]} />
        <CameraRig preset={preset} params={typedParams} />
        <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
          <GizmoViewport axisColors={["#ef4444", "#22c55e", "#3b82f6"]} labelColor="white" />
        </GizmoHelper>
      </Canvas>

      <Leva
        titleBar={{ title: "Parametre", drag: true, filter: false }}
        theme={{
          colors: {
            elevation1: "#0e1116",
            elevation2: "#161b22",
            elevation3: "#1f2630",
            accent1: "#34d399",
            accent2: "#10b981",
            accent3: "#059669",
            highlight1: "#9ca3af",
            highlight2: "#e5e7eb",
            highlight3: "#ffffff",
          },
          sizes: { rootWidth: "320px", controlWidth: "150px" },
          fonts: { mono: "ui-monospace, SFMono-Regular, Menlo, monospace" },
        }}
      />
    </div>
  );
}
