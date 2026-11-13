import "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls, GizmoHelper, GizmoViewport, ContactShadows, Environment, Lightformer, Line, Html, Text } from "@react-three/drei";
import {
  ArrowLeft,
  Share2,
  LayoutTemplate,
  Layers,
  Eye,
  Ruler,
  Grid,
  Paintbrush,
  DoorOpen,
  Wrench,
  Send,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import * as THREE from "three";

import templatesData from "@/config/new_hall_templates.json";
import { DEFAULT_PARAMS, type GarageParams } from "@/lib/garage/types";
import { CameraRig, type ViewPreset } from "./GarageScene";
import { PriceCalculator } from "./PriceCalculator";
import { NewHallTemplatePicker, type HallTemplateItem } from "./NewHallTemplatePicker";
import { NewHallBOMModal } from "./NewHallBOMModal";
import { NewHallStandalone3D, type HiStructLayerToggles } from "./NewHallStandalone3D";
import { NewHallSheetingModal } from "./NewHallSheetingModal";
import { TechnicalDrawingsModal } from "./TechnicalDrawingsModal";
import { ProjectsCrmModal, type HallProjectRecord } from "./ProjectsCrmModal";
import { createMaterialProject, MATERIAL_PROJECT_STORAGE_KEY, readMaterialProject, writeMaterialProject, type HallMaterialProject } from "@/lib/materials/project";
import { Compass, FolderKanban, FileText, CheckCircle2, ShieldCheck } from "lucide-react";
import { useHallOpenings } from './openings/useHallOpenings';
import { OpeningHotspots } from './openings/OpeningHotspots';
import { OpeningPanel } from './openings/OpeningPanel';
import { BayOpeningMeshes } from './openings/BayOpeningMeshes';

type HiStructStep = "Geometry" | "Bays" | "Sheeting" | "Openings" | "Structure" | "GetQuote";

const HISTRUCT_STEPS: { id: HiStructStep; label: string; desc: string; icon: any }[] = [
  { id: "Geometry", label: "Parametre budovy", desc: "Základné rozmery samostatnej haly", icon: Ruler },
  { id: "Bays", label: "Polia", desc: "Modulové rozdelenie polí pozdĺž haly", icon: Grid },
  { id: "Sheeting", label: "Opláštenie", desc: "Sendvičové panely, strecha a farby RAL", icon: Paintbrush },
  { id: "Openings", label: "Otvory", desc: "Sekcionálne brány, dvere, okná a svetlíky", icon: DoorOpen },
  { id: "Structure", label: "Konštrukcia", desc: "Špeciálna nosná oceľová konštrukcia haly", icon: Wrench },
  { id: "GetQuote", label: "Odoslať dopyt", desc: "Kusovník, pohľady a cenová ponuka", icon: Send },
];

function Label3DSprite({
  position,
  text,
  circle = false,
  bg = "#0f172a",
  fg = "#38bdf8",
  border = "#38bdf8",
  scale = [2.2, 0.7, 1],
}: {
  position: [number, number, number];
  text: string;
  circle?: boolean;
  bg?: string;
  fg?: string;
  border?: string;
  scale?: [number, number, number];
}) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = circle ? 128 : 384;
    canvas.height = 128;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = bg;
    ctx.strokeStyle = border;
    ctx.lineWidth = 6;
    if (circle) {
      ctx.beginPath();
      ctx.arc(64, 64, 54, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.roundRect(8, 20, canvas.width - 16, 88, 18);
      ctx.fill();
      ctx.stroke();
    }
    ctx.fillStyle = fg;
    ctx.font = circle ? "bold 54px monospace" : "bold 40px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, canvas.width / 2, 66);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [text, circle, bg, fg, border]);

  return (
    <sprite position={position} scale={circle ? [0.75, 0.75, 1] : scale}>
      <spriteMaterial map={texture} transparent depthTest={true} />
    </sprite>
  );
}

function OpeningDimensionLabel({ position, text }: {
  position: [number, number, number];
  text: string;
}) {
  const anchor = useRef<THREE.Group>(null);
  const cameraPosition = useMemo(() => new THREE.Vector3(), []);
  const [side, setSide] = useState(1);
  useFrame(({ camera }) => {
    if (!anchor.current) return;
    camera.getWorldPosition(cameraPosition);
    anchor.current.worldToLocal(cameraPosition);
    const nextSide = cameraPosition.z >= 0 ? 1 : -1;
    if (nextSide !== side) setSide(nextSide);
  });
  return <group ref={anchor} position={position}>
    <Suspense fallback={null}>
      <Text
        position={[0, 0, side * .18]}
        rotation={[0, side < 0 ? Math.PI : 0, 0]}
        fontSize={.32}
        anchorX="center"
        anchorY="middle"
        color="#111827"
        outlineWidth={.004}
        outlineColor="#ffffff"
        raycast={() => null}
      >{text}</Text>
    </Suspense>
  </group>;
}

function Hall3DOverlays({
  params,
  showDims,
  sectionCutPct,
}: {
  params: GarageParams;
  showDims: boolean;
  sectionCutPct: number;
}) {
  const { gl } = useThree();
  const W = params.width ?? 12;
  const L = params.length ?? 24;
  const H = params.clearHeight ?? 4.5;
  const halfW = W / 2;
  const halfL = L / 2;
  const pitchRad = ((params.roofPitchDeg ?? 10) * Math.PI) / 180;
  const Hridge = H + halfW * Math.tan(pitchRad);
  const bayCount = Math.max(2, params.bayCount ?? Math.round(L / 6));
  const bayLen = L / bayCount;

  // Apply real-time 3D section cut plane
  useEffect(() => {
    if (sectionCutPct < 100) {
      const cutZ = -halfL + (sectionCutPct / 100) * L;
      gl.localClippingEnabled = true;
      gl.clippingPlanes = [new THREE.Plane(new THREE.Vector3(0, 0, -1), cutZ)];
    } else {
      gl.clippingPlanes = [];
    }
    return () => {
      gl.clippingPlanes = [];
    };
  }, [gl, sectionCutPct, halfL, L]);

  const yG = 0.02;
  const zFrontDim = -halfL - 2.4;
  const xLeftBay = -halfW - 1.8;
  const xLeftDim = -halfW - 3.4;
  const cutZ = -halfL + (sectionCutPct / 100) * L;

  return (
    <group name="hall-3d-overlays">
      {/* Live 3D Section Cut Plane Indicator */}
      {sectionCutPct < 100 && (
        <group position={[0, Hridge / 2, cutZ]}>
          <mesh>
            <planeGeometry args={[W + 2.5, Hridge + 1.2]} />
            <meshBasicMaterial color="#0ea5e9" transparent opacity={0.12} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
          <Line
            points={[
              [-halfW - 1.25, -Hridge / 2, 0],
              [halfW + 1.25, -Hridge / 2, 0],
              [halfW + 1.25, Hridge / 2 + 0.6, 0],
              [-halfW - 1.25, Hridge / 2 + 0.6, 0],
              [-halfW - 1.25, -Hridge / 2, 0],
            ]}
            color="#0284c7"
            lineWidth={1.8}
            dashed
            dashScale={4}
          />
        </group>
      )}

      {showDims && (
        <>
          {/* 1. Width Dimension Line (W) in front (-Z) */}
          <Line points={[[-halfW, yG, -halfL - 0.3], [-halfW, yG, zFrontDim - 0.3]]} color="#64748b" lineWidth={1} />
          <Line points={[[halfW, yG, -halfL - 0.3], [halfW, yG, zFrontDim - 0.3]]} color="#64748b" lineWidth={1} />
          <Line points={[[-halfW, yG, zFrontDim], [halfW, yG, zFrontDim]]} color="#0f172a" lineWidth={1.8} />
          <Line points={[[-halfW - 0.25, yG, zFrontDim - 0.25], [-halfW + 0.25, yG, zFrontDim + 0.25]]} color="#0284c7" lineWidth={2.2} />
          <Line points={[[halfW - 0.25, yG, zFrontDim - 0.25], [halfW + 0.25, yG, zFrontDim + 0.25]]} color="#0284c7" lineWidth={2.2} />
          <Label3DSprite position={[0, 0.45, zFrontDim]} text={`W = ${W.toFixed(2)} m`} scale={[2.6, 0.85, 1]} />

          {/* 2. Overall Length Dimension Line (L) on foreground left side (-X) */}
          <Line points={[[-halfW - 0.3, yG, -halfL], [xLeftDim - 0.3, yG, -halfL]]} color="#64748b" lineWidth={1} />
          <Line points={[[-halfW - 0.3, yG, halfL], [xLeftDim - 0.3, yG, halfL]]} color="#64748b" lineWidth={1} />
          <Line points={[[xLeftDim, yG, -halfL], [xLeftDim, yG, halfL]]} color="#0f172a" lineWidth={1.8} />
          <Line points={[[xLeftDim - 0.25, yG, -halfL - 0.25], [xLeftDim + 0.25, yG, -halfL + 0.25]]} color="#0284c7" lineWidth={2.2} />
          <Line points={[[xLeftDim - 0.25, yG, halfL - 0.25], [xLeftDim + 0.25, yG, halfL + 0.25]]} color="#0284c7" lineWidth={2.2} />
          <Label3DSprite position={[xLeftDim - 0.4, 0.45, 0]} text={`L = ${L.toFixed(2)} m`} scale={[2.6, 0.85, 1]} />

          {/* 3. Bay Dimension Chain + Grid Axes (1..N) on foreground (-X) */}
          <Line points={[[xLeftBay, yG, -halfL], [xLeftBay, yG, halfL]]} color="#64748b" lineWidth={1.2} />
          {Array.from({ length: bayCount + 1 }).map((_, b) => {
            const z = -halfL + b * bayLen;
            return (
              <group key={`axis-3d-${b}`}>
                <Line points={[[xLeftDim - 0.8, yG, z], [-halfW - 0.25, yG, z]]} color="#64748b" lineWidth={1} dashed dashScale={3} />
                <Line points={[[xLeftBay - 0.18, yG, z - 0.18], [xLeftBay + 0.18, yG, z + 0.18]]} color="#0284c7" lineWidth={1.8} />
                <Label3DSprite position={[xLeftDim - 1.25, 0.42, z]} text={`${b + 1}`} circle />
                {b < bayCount && (
                  <Label3DSprite
                    position={[xLeftBay, 0.35, z + bayLen / 2]}
                    text={`${bayLen.toFixed(1)}m`}
                    bg="#ffffff"
                    fg="#0f172a"
                    border="#64748b"
                    scale={[1.55, 0.52, 1]}
                  />
                )}
              </group>
            );
          })}

          {/* 4. Longitudinal Axes A & B at front (-Z) */}
          {[-halfW, halfW].map((xPos, idx) => (
            <group key={`axis-ab-${idx}`}>
              <Line points={[[xPos, yG, -halfL - 0.25], [xPos, yG, zFrontDim - 0.9]]} color="#64748b" lineWidth={1} dashed dashScale={3} />
              <Label3DSprite position={[xPos, 0.42, zFrontDim - 1.35]} text={idx === 0 ? "A" : "B"} circle />
            </group>
          ))}

          {/* 5. Vertical Eave Height (H) & Ridge Height (H_hr) */}
          <Line points={[[-halfW - 1.1, 0, -halfL], [-halfW - 1.1, H, -halfL]]} color="#0284c7" lineWidth={1.8} />
          <Line points={[[-halfW - 1.4, 0, -halfL], [-halfW - 0.3, 0, -halfL]]} color="#64748b" lineWidth={1} />
          <Line points={[[-halfW - 1.4, H, -halfL], [-halfW - 0.3, H, -halfL]]} color="#64748b" lineWidth={1} />
          <Label3DSprite
            position={[-halfW - 1.65, H / 2, -halfL]}
            text={`H = ${H.toFixed(2)}m`}
            bg="#064e3b"
            fg="#6ee7b7"
            border="#10b981"
            scale={[2.2, 0.72, 1]}
          />
          <Label3DSprite
            position={[0, Hridge + 0.65, -halfL]}
            text={`+${Hridge.toFixed(2)}m`}
            bg="#451a03"
            fg="#fcd34d"
            border="#f59e0b"
            scale={[2.0, 0.68, 1]}
          />
        </>
      )}
    </group>
  );
}

export default function NewHallConfigurator() {
  const exportRef = useRef<THREE.Group | null>(null);
  const [preset, setPreset] = useState<ViewPreset>("iso");
  const [isMobile, setIsMobile] = useState(false);
  const [quoteRequestSignal, setQuoteRequestSignal] = useState(0);

  // Template selector for standalone halls.
  const [showTemplatePicker, setShowTemplatePicker] = useState<boolean>(() => typeof window !== "undefined" ? !new URLSearchParams(window.location.search).get("template") : false);
  const [showBOM, setShowBOM] = useState<boolean>(false);
  const [showSheetingModal, setShowSheetingModal] = useState<boolean>(false);
  const [showDrawingsModal, setShowDrawingsModal] = useState<boolean>(false);
  const [showCrmModal, setShowCrmModal] = useState<boolean>(false);
  const [showLayerMenu, setShowLayerMenu] = useState<boolean>(false);
  const [show3DDims, setShow3DDims] = useState<boolean>(true);
  const [sectionCutPct, setSectionCutPct] = useState<number>(100);
  const [activeStep, setActiveStep] = useState<HiStructStep>("Geometry");
  const [viewMode, setViewMode] = useState<"both" | "xray" | "structure">("both");

  const [layerToggles, setLayerToggles] = useState<HiStructLayerToggles>({
    panels: true,
    openings: true,
    frames: true,
    purlins: true,
    girts: true,
    flashings: true,
    structuralComponents: true,
    basePlate: true,
  });

  const [restoredMaterialProject] = useState(() => readMaterialProject());
  const allTemplates = templatesData as HallTemplateItem[];
  const queryTplId = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("template") : null;
  const initialTpl = allTemplates.find((t) => t.id === (queryTplId || restoredMaterialProject?.templateId || "vyrobna_hala")) || allTemplates[0];
  const initialMaterialProject = restoredMaterialProject?.templateId === initialTpl.id ? restoredMaterialProject : null;
  const [activeTemplate, setActiveTemplate] = useState<HallTemplateItem>(initialTpl);
  const [projectMetadata, setProjectMetadata] = useState<Pick<HallMaterialProject, "id" | "name" | "materialSettings">>(() => ({
    id: initialMaterialProject?.id, name: initialMaterialProject?.name, materialSettings: initialMaterialProject?.materialSettings,
  }));

  const [params, setParams] = useState<GarageParams>(() => ({
    ...DEFAULT_PARAMS,
    hallType: `${initialTpl.title} (${initialTpl.subtitle})`,
    width: initialTpl.width,
    length: initialTpl.length,
    clearHeight: initialTpl.clearHeight,
    bayCount: initialTpl.bayCount ?? Math.max(3, Math.round(initialTpl.length / 6)),
    roofType: "gable",
    roofPitchDeg: initialTpl.roofPitchDeg,
    profileSize: 0.24,
    profileThickness: 0.008,
    showStructure: true,
    showCladding: true,
    showFoundation: true,
    steelColor: "#7c8594",
    claddingColor: initialTpl.claddingColor || "#6b7280",
    roofColor: initialTpl.roofColor || "#4b5563",
    trimmingColor: initialTpl.trimmingColor || "#1f2937",
    sectionalDoorColor: initialTpl.trimmingColor || "#1f2937",
    doorWidth: 4.0,
    doorHeight: 4.25,
    hasRidgeSkylight: !!initialTpl.hasRidgeSkylight,
    hasCenterColumns: !!initialTpl.hasCenterColumns,
    canopyWidth: initialTpl.canopyWidth ?? 4.5,
    ...initialMaterialProject?.params,
  }));

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleSetParams = (partial: Partial<GarageParams>) => {
    setParams((prev) => ({ ...prev, ...partial }));
  };

  const openingEditor = useHallOpenings(params, activeTemplate.id, initialMaterialProject);
  const materialProject = useMemo(() => createMaterialProject({
    ...projectMetadata,
    name: projectMetadata.name ?? `${activeTemplate.title} (${params.width}×${params.length}m)`,
    templateId: activeTemplate.id,
    params,
    openings: openingEditor.openings,
    replacedWindowIds: openingEditor.confirmedReplacedWindowIds,
  }), [projectMetadata, activeTemplate.id, activeTemplate.title, params, openingEditor.openings, openingEditor.confirmedReplacedWindowIds]);
  useEffect(() => { writeMaterialProject(materialProject); }, [materialProject]);
  useEffect(() => {
    function receiveMaterialSettings(event: StorageEvent) {
      if (event.key !== MATERIAL_PROJECT_STORAGE_KEY) return;
      const latest = readMaterialProject();
      if (latest && latest.id === projectMetadata.id && latest.templateId === activeTemplate.id) {
        setProjectMetadata(previous => {
          if (JSON.stringify(previous.materialSettings) === JSON.stringify(latest.materialSettings)) return previous;
          return { ...previous, materialSettings: latest.materialSettings };
        });
      }
    }
    window.addEventListener('storage', receiveMaterialSettings);
    return () => window.removeEventListener('storage', receiveMaterialSettings);
  }, [projectMetadata.id, activeTemplate.id]);
  const [showOpeningButtons, setShowOpeningButtons] = useState(true);
  useEffect(() => { if (activeStep !== 'Openings') openingEditor.setModal(null); }, [activeStep]);

  const handleLoadProject = (newParams: GarageParams, templateId?: string, project?: HallProjectRecord) => {
    const resolvedTemplateId = allTemplates.some(t => t.id === templateId) ? templateId! : activeTemplate.id;
    openingEditor.restoreProject({
      templateId: resolvedTemplateId, params: newParams, openings: project?.openings, replacedWindowIds: project?.replacedWindowIds,
    });
    setProjectMetadata({ id: project?.id, name: project?.name, materialSettings: project?.materialSettings });
    if (templateId) {
      const found = allTemplates.find((t) => t.id === templateId);
      if (found) setActiveTemplate(found);
    }
    setParams(newParams);
  };

  const handleSelectTemplate = (tpl: HallTemplateItem) => {
    setProjectMetadata({});
    setActiveTemplate(tpl);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("template", tpl.id);
      window.history.replaceState({}, "", url.toString());
    }
    handleSetParams({
      hallType: `${tpl.title} (${tpl.subtitle})`,
      width: tpl.width,
      length: tpl.length,
      clearHeight: tpl.clearHeight,
      bayCount: tpl.bayCount ?? Math.max(3, Math.round(tpl.length / 6)),
      roofPitchDeg: tpl.roofPitchDeg || 10,
      claddingColor: tpl.claddingColor || "#d1d5db",
      roofColor: tpl.roofColor || "#6b7280",
      trimmingColor: tpl.trimmingColor || "#1f2937",
      hasRidgeSkylight: !!tpl.hasRidgeSkylight,
      hasCenterColumns: !!tpl.hasCenterColumns,
      canopyWidth: tpl.canopyWidth ?? 4.5,
    });
    toast.success(`Načítaná samostatná hala: ${tpl.title} — ${tpl.subtitle}`);
  };

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Odkaz na konfiguráciu haly bol skopírovaný!");
    }
  };

  const [showRightPanel, setShowRightPanel] = useState(true);

  const handleSaveDesign = () => {
    try {
      const code = `HALA-${Date.now().toString().slice(-6)}`;
      const newProject = {
        id: crypto.randomUUID(),
        code,
        name: `${activeTemplate.title} (${params.width}×${params.length}m)`,
        customerName: "Zákazník z 3D konfigurátora",
        email: "",
        phone: "",
        city: "",
        status: "new",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: "1.0",
        params: { ...params },
        templateId: activeTemplate.id,
        openings: openingEditor.openings,
        replacedWindowIds: openingEditor.confirmedReplacedWindowIds,
        materialSettings: materialProject.materialSettings,
        notes: `Uložený návrh. Rozmery: ${params.width}×${params.length}×${params.clearHeight}m (${params.bayCount} polí).`,
      };

      const existingStr = localStorage.getItem("vbau_hall_projects_crm_v1");
      const existing = existingStr ? JSON.parse(existingStr) : [];
      localStorage.setItem("vbau_hall_projects_crm_v1", JSON.stringify([newProject, ...existing]));
      setProjectMetadata({ id: newProject.id, name: newProject.name, materialSettings: materialProject.materialSettings });

      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.set("template", activeTemplate.id);
        url.searchParams.set("width", String(params.width));
        url.searchParams.set("length", String(params.length));
        url.searchParams.set("clearHeight", String(params.clearHeight));
        navigator.clipboard.writeText(url.toString());
      }

      toast.success(`Návrh bol úspešne uložený (kód: ${code})! Odkaz na pokračovanie bol skopírovaný do schránky.`);
    } catch (err) {
      toast.error("Nepodarilo sa uložiť návrh.");
    }
  };

  const handleSendInquiry = () => {
    setQuoteRequestSignal((s) => s + 1);
  };

  const claddingOpacity = viewMode === "xray" ? 0.35 : 1.0;
  const effectiveParams: GarageParams = {
    ...params,
    showCladding: viewMode !== "structure",
    showStructure: true,
  };

  return (
    <div className="relative h-screen w-screen bg-[#eef2f6] select-none overflow-hidden font-sans">
      {/* 3D Canvas */}
      <Canvas
        shadows={{ type: THREE.PCFSoftShadowMap }}
        frameloop="always"
        dpr={[1, isMobile ? 1.5 : 2]}
        camera={{ position: [-22, 12, -26], fov: 35, near: 0.5, far: 600 }}
        gl={{
          antialias: true,
          preserveDrawingBuffer: true,
          powerPreference: "high-performance",
          logarithmicDepthBuffer: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.05,
        }}
      >
        <color attach="background" args={["#eef2f6"]} />
        <fog attach="fog" args={["#eef2f6", 90, 420]} />

        {/* IBL Procedural Environment for realistic metal/cladding reflections */}
        <Environment resolution={256} environmentIntensity={0.65}>
          <group rotation={[-Math.PI / 4, -0.6, 0]}>
            <Lightformer form="ring" color="#ffffff" intensity={2} scale={15} position={[15, 25, -20]} target={[0, 0, 0]} />
            <Lightformer form="rect" color="#dbeafe" intensity={1.5} scale={[30, 20, 1]} position={[-25, 20, 20]} />
            <Lightformer form="rect" color="#f8fafc" intensity={0.8} scale={[50, 50, 1]} position={[0, 40, 0]} rotation={[Math.PI / 2, 0, 0]} />
            <Lightformer form="rect" color="#94a3b8" intensity={0.5} scale={[50, 50, 1]} position={[0, -20, 0]} rotation={[-Math.PI / 2, 0, 0]} />
          </group>
        </Environment>

        <ambientLight intensity={0.45} />
        <directionalLight
          position={[25, 35, -20]}
          intensity={1.4}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-40}
          shadow-camera-right={40}
          shadow-camera-top={40}
          shadow-camera-bottom={-40}
          shadow-camera-near={0.5}
          shadow-camera-far={150}
          shadow-bias={-0.0003}
          shadow-normalBias={0.06}
        />
        <directionalLight position={[-20, 18, 25]} intensity={0.4} color="#e2e8f0" />

        <group ref={exportRef}>
          <NewHallStandalone3D
            p={effectiveParams}
            templateId={activeTemplate.id}
            claddingOpacity={claddingOpacity}
            layerToggles={layerToggles}
            editedSurfaces={openingEditor.surfaces}
            replacedWindowIds={openingEditor.replacedWindowIds}
          />
          {effectiveParams.showCladding && layerToggles.panels && (
            <BayOpeningMeshes bays={openingEditor.bays} openings={openingEditor.preview} surfaces={openingEditor.surfaces}
              selected={openingEditor.activeBay?.id} color={params.claddingColor} roofColor={params.roofColor}
              stemHeight={params.hasStemWall !== false ? (params.stemWallHeight ?? .27) : 0}
              stemColor={params.stemWallColor ?? '#a5a5a5'} stemThickness={(params.stemWallThickness ?? .1) + .04}
              opacity={claddingOpacity} showOpenings={layerToggles.openings}
              replacedWindowIds={openingEditor.replacedWindowIds} />
          )}
        </group>
        <OpeningHotspots onMove={openingEditor.activeModalState ? undefined : openingEditor.moveOpening} bays={openingEditor.bays} openings={openingEditor.openings} enabled={activeStep === 'Openings' && showOpeningButtons && layerToggles.openings && viewMode !== 'structure'}
          modelRef={exportRef} templateId={activeTemplate.id}
          replacedWindowIds={openingEditor.replacedWindowIds}
          onAdd={(bay, coords) => { setActiveStep('Openings'); openingEditor.add(bay, coords); }}
          onEdit={opening => { setActiveStep('Openings'); openingEditor.edit(opening); }}
          onReplace={opening => { setActiveStep('Openings'); openingEditor.replace(opening); }}
          onAddAtCoords={(bay, categoryId, coords) => {
            setActiveStep('Openings');
            openingEditor.addAtCoords(bay, categoryId, coords);
          }}
          onDuplicate={opening => {
            openingEditor.duplicateOpening(opening);
          }}
          onDelete={opening => {
            openingEditor.removeOpening(opening);
          }} />

        {(viewMode === 'structure' || activeStep === 'Structure') && (
          <group name="opening-clearance-dimensions">
            {openingEditor.openings.map(opening => {
              const bay = openingEditor.bays.find(item => item.id === opening.bayId);
              if (!bay) return null;
              const left = opening.x - bay.width / 2;
              const bottom = opening.y - bay.height / 2;
              const right = left + opening.width;
              const top = bottom + opening.height;
              const dimension = new Intl.NumberFormat('sk-SK', {
                minimumFractionDigits: 2, maximumFractionDigits: 3,
              });
              return (
                <group key={opening.id} position={bay.position3D} rotation={bay.rotation}>
                  <Line
                    points={[[left, bottom, .16], [right, bottom, .16], [right, top, .16], [left, top, .16], [left, bottom, .16]]}
                    color="#334155" lineWidth={1} raycast={() => null}
                  />
                  <OpeningDimensionLabel
                    position={[(left + right) / 2, (bottom + top) / 2, 0]}
                    text={dimension.format(opening.width) + ' × ' + dimension.format(opening.height) + ' m'}
                  />
                </group>
              );
            })}
          </group>
        )}

        <Hall3DOverlays params={params} showDims={show3DDims} sectionCutPct={sectionCutPct} />

        <ContactShadows
          position={[0, -0.160, 0]}
          opacity={0.35}
          scale={80}
          blur={2.2}
          far={25}
        />

        <gridHelper args={[100, 50, "#cbd5e1", "#e2e8f0"]} position={[0, -0.161, 0]} />

        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.08}
          target={[0, params.clearHeight * 0.45, 0]}
          maxPolarAngle={Math.PI / 2 - 0.02}
        />
        <CameraRig
          preset={preset}
          params={params}
          focusTab="dimensions"
          onUserInteract={() => setPreset("iso")}
        />
        {!isMobile && (
          <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
            <GizmoViewport axisColors={["#ef4444", "#22c55e", "#3b82f6"]} labelColor="white" />
          </GizmoHelper>
        )}
      </Canvas>
      {openingEditor.activeModalState && openingEditor.activeBay && <OpeningPanel
        state={openingEditor.activeModalState} bay={openingEditor.activeBay} error={openingEditor.error}
        suggestedPosition={openingEditor.suggestedPosition} onSnapToValid={openingEditor.snapToValid}
        onState={openingEditor.setModal} onSave={openingEditor.save} onDelete={openingEditor.remove}
        onClose={() => openingEditor.setModal(null)} />}

      {/* Top HiStruct Style Navigation Header */}
      <header className="absolute top-0 left-0 right-0 z-30 bg-slate-900/95 text-white border-b border-white/10 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 backdrop-blur-md shadow-xl">
        <div className="flex items-center gap-2.5">
          <button type="button" onClick={() => setShowTemplatePicker(true)} title="Späť na výber šablóny"

            className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs font-mono font-bold text-white hover:bg-white/10 transition"
          >
            <ArrowLeft className="h-3.5 w-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Späť</span>
          </button>

          {/* Button to open Standalone Hall Templates */}
          <button
            onClick={() => setShowTemplatePicker(true)}
            className="flex items-center gap-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white px-3.5 py-1.5 text-xs font-bold shadow transition cursor-pointer"
          >
            <LayoutTemplate className="h-4 w-4" />
            <span>Šablóny hál ({activeTemplate.title})</span>
          </button>
          <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono text-[10px] font-bold tracking-wider" title="Vývojový identifikátor verzie">
            VERZIA: 2026-11-11-HOTFIX-v3
          </span>
        </div>

        {/* HiStruct 6 Main Configurator Steps */}
        <nav className="hidden lg:flex items-center gap-1 bg-slate-800/90 p-1 rounded-xl border border-white/10">
          {HISTRUCT_STEPS.map((st) => {
            const Icon = st.icon;
            const active = activeStep === st.id;
            return (
              <button
                key={st.id}
                onClick={() => {
                  setActiveStep(st.id);
                  if (st.id === "Structure") setViewMode("xray");
                  else if (viewMode === "xray") setViewMode("both");
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  active
                    ? "bg-sky-500 text-slate-950 font-bold shadow"
                    : "text-slate-300 hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{st.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right View Toggles & BOM */}
        <div className="flex items-center gap-1.5">
          {/* 3D Visualization Mode Toggle (Plášť / Röntgen / Iba konštrukcia) */}
          <div className="flex items-center rounded-lg bg-slate-800 p-0.5 border border-white/10 text-[11px]">
            {[
              { id: "both", label: "Hala" },
              { id: "xray", label: "Röntgen" },
              { id: "structure", label: "Konštrukcia" },
            ].map((vm) => (
              <button
                key={vm.id}
                onClick={() => setViewMode(vm.id as any)}
                className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
                  viewMode === vm.id
                    ? "bg-emerald-500 text-slate-950 font-bold"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                {vm.label}
              </button>
            ))}
          </div>

          {/* HiStruct "Hlavné prvky" Layer Toggles Dropdown */}
          <button type="button" aria-pressed={showOpeningButtons} onClick={() => setShowOpeningButtons(value => !value)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-bold cursor-pointer ${showOpeningButtons ? 'border-sky-400 bg-sky-500/30 text-sky-100' : 'border-white/15 bg-white/5 text-slate-300'}`}>
            Tlačidlá
          </button>
          <div className="relative">
            <button
              onClick={() => setShowLayerMenu((v) => !v)}
              className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/15 transition cursor-pointer"
              title="Prepínače viditeľnosti vrstiev (Hlavné prvky)"
            >
              <Eye className="h-3.5 w-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Hlavné prvky</span>
            </button>

            {showLayerMenu && (
              <div className="absolute right-0 mt-2 w-60 rounded-xl bg-slate-900/98 border border-white/15 shadow-2xl p-3 z-50 space-y-1.5 text-xs">
                <div className="text-[10px] font-mono uppercase tracking-wider text-sky-400 pb-1 border-b border-white/10 flex justify-between items-center">
                  <span>Hlavné prvky (Vrstvy 3D)</span>
                  <button
                    onClick={() => setShowLayerMenu(false)}
                    className="text-slate-400 hover:text-white cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
                {(
                  [
                    { key: "panels", label: "Panely (Opláštenie)" },
                    { key: "openings", label: "Otvory (Okná, dvere, brány)" },
                    { key: "frames", label: "Rámy (Hlavná konštrukcia)" },
                    { key: "purlins", label: "Väznice (Strešné profily)" },
                    { key: "girts", label: "Paždíky (Stenové profily)" },
                    { key: "flashings", label: "Lemovanie (Klampiarske prvky)" },
                    { key: "structuralComponents", label: "Štrukturálne komponenty (Vstavba)" },
                    { key: "basePlate", label: "Základná plocha a sokel" },
                  ] as { key: keyof HiStructLayerToggles; label: string }[]
                ).map((item) => (
                  <label
                    key={item.key}
                    className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-white/5 cursor-pointer"
                  >
                    <span className="text-slate-200">{item.label}</span>
                    <input
                      type="checkbox"
                      checked={layerToggles[item.key]}
                      onChange={(e) =>
                        setLayerToggles((prev) => ({
                          ...prev,
                          [item.key]: e.target.checked,
                        }))
                      }
                      className="accent-emerald-500 h-3.5 w-3.5 cursor-pointer"
                    />
                  </label>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => setShow3DDims((v) => !v)}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition cursor-pointer ${
              show3DDims
                ? "border-sky-400/50 bg-sky-500/20 text-sky-200"
                : "border-white/15 bg-white/5 text-slate-300 hover:bg-white/10"
            }`}
            title="Zobraziť / skryť 3D kóty a modulové osi rastra (1..N, A, B)"
          >
            <Ruler className="h-3.5 w-3.5 text-sky-400" />
            <span className="hidden lg:inline">Kóty & Osi 3D</span>
          </button>

          <div
            className="hidden md:flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-xs text-slate-200"
            title="Plynulý 3D rez halou (100% = celá hala)"
          >
            <span className="text-[10px] font-mono text-sky-400 font-bold">REZ:</span>
            <input
              type="range"
              min={15}
              max={100}
              step={1}
              value={sectionCutPct}
              onChange={(e) => setSectionCutPct(Number(e.target.value))}
              className="w-16 accent-sky-400 cursor-pointer h-1.5"
            />
            {sectionCutPct < 100 && (
              <button
                onClick={() => setSectionCutPct(100)}
                className="text-[10px] font-mono text-amber-300 hover:text-white cursor-pointer"
                title="Zrušiť rez"
              >
                {sectionCutPct}% ✕
              </button>
            )}
          </div>

          {/* Uložiť návrh Button */}
          <button
            onClick={handleSaveDesign}
            className="flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20 transition cursor-pointer"
            title="Uložiť aktuálny návrh a vygenerovať odkaz"
          >
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            <span className="hidden md:inline">Uložiť návrh</span>
          </button>

          {/* Odoslať dopyt Button */}
          <button
            onClick={handleSendInquiry}
            className="flex items-center gap-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 px-3.5 py-1.5 text-xs font-bold text-slate-950 transition shadow-md shadow-sky-500/20 cursor-pointer"
            title="Nezáväzne odoslať dopyt na cenovú ponuku"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Odoslať dopyt</span>
          </button>

          {/* Discreet Admin Link */}
          <a
            href="/admin#material-report"
            className="flex items-center gap-1 rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-xs text-slate-400 hover:text-white hover:border-white/25 transition"
            title="Administrácia (VBAU)"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
            <span className="hidden lg:inline text-[11px] font-mono">Admin</span>
          </a>

          <button
            onClick={handleShare}
            className="p-1.5 rounded-lg border border-white/15 bg-white/5 text-white hover:bg-white/10 transition cursor-pointer"
            title="Kopírovať odkaz"
          >
            <Share2 className="h-4 w-4 text-sky-400" />
          </button>
        </div>
      </header>

      {/* Left HiStruct Step Inspector Panel */}
      <aside className="absolute left-3.5 top-16 z-20 w-[340px] max-w-[calc(100vw-28px)] max-h-[calc(100vh-110px)] overflow-y-auto rounded-2xl bg-slate-900/92 text-white border border-white/15 backdrop-blur-md shadow-2xl p-4 space-y-4">
        {/* Active Standalone Hall Header */}
        <div className="flex items-center gap-3 pb-3 border-b border-white/10">
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-sky-400 block">
              Samostatná šablóna haly
            </span>
            <h2 className="text-sm font-bold text-white truncate">{activeTemplate.title}</h2>
            <p className="text-xs text-slate-400 truncate">{activeTemplate.subtitle}</p>
          </div>
          <button
            onClick={() => setShowTemplatePicker(true)}
            className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-semibold text-sky-300 shrink-0 cursor-pointer"
          >
            Zmeniť
          </button>
        </div>

        {/* Mobile Step Selector */}
        <div className="grid grid-cols-3 gap-1 lg:hidden">
          {HISTRUCT_STEPS.map((st) => (
            <button
              key={st.id}
              onClick={() => setActiveStep(st.id)}
              className={`py-1.5 px-2 rounded text-[10px] font-bold border text-center cursor-pointer ${
                activeStep === st.id
                  ? "bg-sky-500 text-slate-950 border-sky-400"
                  : "bg-white/5 text-slate-300 border-white/10"
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>

        {/* STEP 1: GEOMETRY (Parametre budovy) */}
        {activeStep === "Geometry" && (
          <div className="space-y-3 text-xs">
            <div className="text-[11px] text-slate-400">
              {activeTemplate.description}
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-300">Šírka haly (rozpon W):</span>
                <span className="font-mono font-bold text-sky-400">{params.width.toFixed(1)} m</span>
              </div>
              <input
                type="range"
                min={8}
                max={30}
                step={1}
                value={params.width}
                onChange={(e) => handleSetParams({ width: Number(e.target.value) })}
                className="w-full accent-sky-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-300">Dĺžka haly (L):</span>
                <span className="font-mono font-bold text-sky-400">{params.length.toFixed(1)} m</span>
              </div>
              <input
                type="range"
                min={12}
                max={80}
                step={1}
                value={params.length}
                onChange={(e) => {
                  const newL = Number(e.target.value);
                  handleSetParams({ length: newL, bayCount: Math.max(2, Math.round(newL / 6)) });
                }}
                className="w-full accent-sky-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-300">Výška v odkvape (H):</span>
                <span className="font-mono font-bold text-sky-400">{params.clearHeight.toFixed(2)} m</span>
              </div>
              <input
                type="range"
                min={3.5}
                max={12.0}
                step={0.05}
                value={params.clearHeight}
                onChange={(e) => handleSetParams({ clearHeight: Number(e.target.value) })}
                className="w-full accent-sky-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-300">Sklon strechy:</span>
                <span className="font-mono font-bold text-sky-400">{params.roofPitchDeg}°</span>
              </div>
              <input
                type="range"
                min={2}
                max={18}
                step={1}
                value={params.roofPitchDeg}
                onChange={(e) => handleSetParams({ roofPitchDeg: Number(e.target.value) })}
                className="w-full accent-sky-500 cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* STEP 2: BAYS (Polia) */}
        {activeStep === "Bays" && (
          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-300">Počet modulových polí:</span>
              <span className="font-mono font-bold text-sky-400">{params.bayCount} polí</span>
            </div>
            <input
              type="range"
              min={2}
              max={15}
              step={1}
              value={params.bayCount}
              onChange={(e) => handleSetParams({ bayCount: Number(e.target.value) })}
              className="w-full accent-sky-500 cursor-pointer"
            />
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1.5 font-mono text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Počet nosných rámov:</span>
                <span className="text-white font-bold">{(params.bayCount ?? 4) + 1} ks</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Osová vzdialenosť rámov:</span>
                <span className="text-sky-300 font-bold">
                  {(params.length / (params.bayCount ?? 4)).toFixed(2)} m
                </span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: SHEETING (Opláštenie) */}
        {activeStep === "Sheeting" && (
          <div className="space-y-3 text-xs">
            {/* HiStruct Modal Open Button */}
            <button
              onClick={() => setShowSheetingModal(true)}
              className="w-full py-2 px-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold flex items-center justify-center gap-2 shadow transition cursor-pointer"
            >
              <Paintbrush className="h-4 w-4" />
              <span>Otvoriť kompletné okno Opláštenie</span>
            </button>

            {/* 1. Nastavenie geometrie steny & sokla */}
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
              <span className="text-[10px] font-mono uppercase text-sky-400 font-bold block">
                1. Geometria steny a sokel
              </span>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Typ produkcie:</span>
                <select
                  value={params.wallProduction ?? "Plechová stena so soklom"}
                  onChange={(e) => handleSetParams({ wallProduction: e.target.value })}
                  className="rounded bg-slate-800 border border-white/15 px-2 py-1 text-white text-[11px]"
                >
                  <option value="Plechová stena so soklom">Plechová stena so soklom</option>
                  <option value="Plechová stena bez sokla">Plechová stena bez sokla</option>
                  <option value="Pevná stena">Pevná stena</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-300">Výška sokla:</span>
                <div className="flex items-center gap-1.5 font-mono text-sky-400 font-bold">
                  <span>{(params.stemWallHeight ?? 0.27).toFixed(2)} m</span>
                  <input
                    type="range"
                    min={0.1}
                    max={1.2}
                    step={0.01}
                    value={params.stemWallHeight ?? 0.27}
                    onChange={(e) => handleSetParams({ stemWallHeight: parseFloat(e.target.value) })}
                    className="w-24 accent-sky-500 cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-300">Hrúbka sokla:</span>
                <span className="font-mono text-slate-300 font-bold">{(params.stemWallThickness ?? 0.1).toFixed(2)} m</span>
              </div>
            </div>

            {/* 2. Predvolené hodnoty obloženia stien */}
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
              <span className="text-[10px] font-mono uppercase text-sky-400 font-bold block">
                2. Stenové panely
              </span>

              <div className="flex items-center justify-between">
                <span className="text-slate-300">Orientácia obkladania:</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleSetParams({ claddingOrientation: "horizontal" })}
                    className={`px-2 py-1 rounded text-[10px] font-bold border cursor-pointer ${
                      params.claddingOrientation !== "vertical"
                        ? "bg-sky-500 text-slate-950 border-sky-400"
                        : "bg-white/5 text-slate-300 border-white/10"
                    }`}
                  >
                    Vodorovné +X
                  </button>
                  <button
                    onClick={() => handleSetParams({ claddingOrientation: "vertical" })}
                    className={`px-2 py-1 rounded text-[10px] font-bold border cursor-pointer ${
                      params.claddingOrientation === "vertical"
                        ? "bg-sky-500 text-slate-950 border-sky-400"
                        : "bg-white/5 text-slate-300 border-white/10"
                    }`}
                  >
                    Zvislé
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-300">Šírka modulu panelu:</span>
                <div className="flex items-center gap-1.5 font-mono text-sky-400 font-bold">
                  <span>{(params.wallPanelWidth ?? 1.0).toFixed(2)} m</span>
                  <input
                    type="range"
                    min={0.5}
                    max={1.2}
                    step={0.05}
                    value={params.wallPanelWidth ?? 1.0}
                    onChange={(e) => handleSetParams({ wallPanelWidth: parseFloat(e.target.value) })}
                    className="w-24 accent-sky-500 cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-300">Hrúbka jadra (PIR):</span>
                <span className="font-mono text-white font-bold">{params.wallPanelThicknessMm ?? 150} mm</span>
              </div>

              <div>
                <span className="text-slate-300 block mb-1.5">Farba vonkajšieho povrchu (RAL):</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { hex: "#9e9764", name: "RAL 1019" },
                    { hex: "#d7d5ca", name: "RAL 9002" },
                    { hex: "#a5a5a5", name: "RAL 9006" },
                    { hex: "#374151", name: "RAL 7016" },
                    { hex: "#ed760e", name: "RAL 2000" },
                    { hex: "#7f1d1d", name: "RAL 3009" },
                  ].map((c) => (
                    <button
                      key={c.hex}
                      onClick={() => handleSetParams({ claddingColor: c.hex })}
                      className={`px-2 py-1 rounded-md border text-[10px] font-mono flex items-center gap-1 cursor-pointer ${
                        params.claddingColor === c.hex
                          ? "border-sky-400 bg-sky-500/30 text-white font-bold"
                          : "border-white/10 bg-white/5 text-slate-300"
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full border border-white/30" style={{ backgroundColor: c.hex }} />
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-400">Paždíky:</span>
                <span className="font-mono text-slate-200">{params.girtProfile ?? "Z 142 13"}</span>
              </div>
            </div>

            {/* 3. Strešný plášť */}
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
              <span className="text-[10px] font-mono uppercase text-sky-400 font-bold block">
                3. Strešný plášť
              </span>

              <div className="flex items-center justify-between">
                <span className="text-slate-300">Opláštenie strechy:</span>
                <span className="font-mono text-white font-bold">{params.roofProduction ?? "R3 PUR 120"}</span>
              </div>

              <div>
                <span className="text-slate-300 block mb-1.5">Farba strechy (RAL):</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { hex: "#a5a5a5", name: "RAL 9006" },
                    { hex: "#4b5563", name: "RAL 7016" },
                    { hex: "#7f1d1d", name: "RAL 3009" },
                    { hex: "#d7d5ca", name: "RAL 9002" },
                  ].map((c) => (
                    <button
                      key={c.hex}
                      onClick={() => handleSetParams({ roofColor: c.hex })}
                      className={`px-2 py-1 rounded-md border text-[10px] font-mono flex items-center gap-1 cursor-pointer ${
                        params.roofColor === c.hex
                          ? "border-sky-400 bg-sky-500/30 text-white font-bold"
                          : "border-white/10 bg-white/5 text-slate-300"
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full border border-white/30" style={{ backgroundColor: c.hex }} />
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-400">Väznice:</span>
                <span className="font-mono text-slate-200">
                  {params.purlinProfile ?? "Z 142 13"} (max. {params.purlinMaxSpan ?? 1.5} m)
                </span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: OPENINGS (Otvory) */}
        {activeStep === "Openings" && (
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-300">Hrebeňový strešný svetlík:</span>
              <button
                onClick={() => handleSetParams({ hasRidgeSkylight: !params.hasRidgeSkylight })}
                className={`px-3 py-1 rounded-lg font-bold text-[11px] border cursor-pointer ${
                  params.hasRidgeSkylight
                    ? "bg-sky-500/30 border-sky-400 text-sky-200"
                    : "bg-white/5 border-white/10 text-slate-400"
                }`}
              >
                {params.hasRidgeSkylight ? "Zapnutý" : "Vypnutý"}
              </button>
            </div>

            {/* Zoznam stavebných otvorov v hale s možnosťou priamej výmeny a úpravy */}
            <div className="pt-2 border-t border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-semibold">Otvory v hale ({openingEditor.openings.length} ks):</span>
              </div>
              <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                {openingEditor.openings.map((op) => {
                  const bay = openingEditor.bays.find(b => b.id === op.bayId);
                  const wallName = bay?.surface === 'front' ? 'Predný štít' : bay?.surface === 'back' ? 'Zadný štít' : bay?.surface === 'left' ? 'Ľavá stena' : bay?.surface === 'right' ? 'Pravá stena' : 'Strecha';
                  const label = op.category === 'door' ? '🚪 Vstupné dvere' : op.category === 'sectional' ? '🏭 Sekčná brána' : op.category === 'sliding' ? '↔️ Posuvná brána' : op.category === 'roller' ? '🔄 Rolovacia brána' : op.category === 'skylight' ? '☀️ Svetlík' : op.category === 'dock' ? '🚛 Rampa' : '🪟 Okno';
                  return (
                    <div key={op.id} className="p-2 rounded-lg bg-slate-800/80 border border-white/10 flex items-center justify-between gap-1.5">
                      <div className="min-w-0">
                        <div className="font-semibold text-white truncate text-[11px]">{label}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{wallName} ({op.bayId}) · {op.width.toFixed(2)}×{op.height.toFixed(2)}m</div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => openingEditor.replace(op)}
                          className="px-2 py-0.5 rounded bg-amber-600 hover:bg-amber-500 text-white font-semibold text-[10px] cursor-pointer"
                          title="Nahradiť typ z katalógu"
                        >
                          Nahradiť typ
                        </button>
                        <button
                          type="button"
                          onClick={() => openingEditor.edit(op)}
                          className="px-1.5 py-0.5 rounded bg-sky-600 hover:bg-sky-500 text-white font-semibold text-[10px] cursor-pointer"
                          title="Upraviť rozmery"
                        >
                          Upraviť
                        </button>
                        <button
                          type="button"
                          onClick={() => openingEditor.removeOpening(op)}
                          className="px-1.5 py-0.5 rounded bg-red-600/70 hover:bg-red-600 text-white text-[10px] cursor-pointer"
                          title="Odstrániť"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {activeTemplate.id === "prazdna_hala" && (
              <>
                <div className="pt-2 border-t border-white/10 space-y-1.5">
                  <span className="text-slate-300 block">Okenné pásy v poliach:</span>
                  <div className="grid grid-cols-5 gap-1">
                    {Array.from({ length: params.bayCount ?? 4 }).map((_, idx) => {
                      const sel = (params.windowBays || []).includes(idx);
                      return (
                        <button
                          key={idx}
                          onClick={() => {
                            const cur = params.windowBays || [];
                            const next = cur.includes(idx) ? cur.filter((x) => x !== idx) : [...cur, idx];
                            handleSetParams({ windowBays: next, windowCount: next.length });
                          }}
                          className={`py-1 rounded text-[10px] font-bold border cursor-pointer ${
                            sel
                              ? "bg-sky-400 text-slate-950 border-sky-300"
                              : "bg-white/5 text-slate-400 border-white/10"
                          }`}
                        >
                          P{idx + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* STEP 5: STRUCTURE (Konštrukcia) */}
        {activeStep === "Structure" && (
          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/30 space-y-1.5">
              <span className="text-[10px] font-mono uppercase text-sky-400 block">
                Nosný systém tejto šablóny
              </span>
              <div className="font-bold text-white text-sm">{activeTemplate.framework || "IPE 220"}</div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                {activeTemplate.description}
              </p>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-slate-300">Zobrazenie v 3D:</span>
              <div className="flex gap-1">
                <button
                  onClick={() => setViewMode("structure")}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold border cursor-pointer ${
                    viewMode === "structure"
                      ? "bg-emerald-500 text-slate-950 border-emerald-400"
                      : "bg-white/5 text-slate-300 border-white/10"
                  }`}
                >
                  Len oceľový skelet
                </button>
                <button
                  onClick={() => setViewMode("xray")}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold border cursor-pointer ${
                    viewMode === "xray"
                      ? "bg-emerald-500 text-slate-950 border-emerald-400"
                      : "bg-white/5 text-slate-300 border-white/10"
                  }`}
                >
                  Röntgen
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 6: GET QUOTE (Odoslať dopyt) */}
        {activeStep === "GetQuote" && (
          <div className="space-y-3 text-xs">
            <p className="text-slate-300 leading-relaxed">
              Váš 3D návrh je pripravený. Odošlite nezáväzný dopyt a náš tím pre Vás spracuje presnú technickú ponuku a výrobnú dokumentáciu.
            </p>
            <button
              onClick={handleSendInquiry}
              className="w-full py-3 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold flex items-center justify-center gap-2 shadow-lg shadow-sky-500/25 transition cursor-pointer text-sm"
            >
              <Send className="h-4 w-4" />
              Odoslať nezáväzný dopyt
            </button>
            <button
              onClick={handleSaveDesign}
              className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              Uložiť návrh
            </button>
          </div>
        )}

        {/* Camera Quick Views */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-between">
          <span className="text-[10px] font-mono text-slate-400 uppercase">Pohľady kamery:</span>
          <div className="flex gap-1">
            {(["iso", "front", "side", "top"] as ViewPreset[]).map((p) => (
              <button
                key={p}
                onClick={() => setPreset(p)}
                className={`px-2 py-1 rounded text-[10px] font-mono uppercase font-bold cursor-pointer ${
                  preset === p
                    ? "bg-sky-500 text-slate-950"
                    : "bg-white/5 text-slate-300 hover:bg-white/10"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Right Spec Summary Panel (Desktop clean building parameters) */}
      {showRightPanel ? (
        <aside className="hidden xl:flex flex-col absolute right-3.5 top-16 z-20 w-[300px] max-h-[calc(100vh-110px)] overflow-y-auto rounded-2xl bg-slate-900/92 text-white border border-white/15 backdrop-blur-md shadow-2xl p-4 space-y-4 font-sans text-xs">
          <div>
            <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
              <span className="text-[10px] font-mono uppercase tracking-wider text-sky-400 font-bold">
                Parametre budovy
              </span>
              <button
                onClick={() => setShowRightPanel(false)}
                className="text-[10px] text-slate-400 hover:text-white font-mono px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 cursor-pointer"
                title="Skryť panel pre maximálny priestor na 3D model"
              >
                Skryť ✕
              </button>
            </div>
            <h3 className="text-sm font-bold text-white mt-2 truncate">{activeTemplate.title}</h3>
            <p className="text-[11px] text-slate-400">{activeTemplate.framework} · {activeTemplate.subtitle}</p>
          </div>

          {/* Live Geometry Calculations */}
          <div className="space-y-2 p-3 rounded-xl bg-white/[0.03] border border-white/10 font-mono text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-400">Pôdorysné rozmery:</span>
              <span className="text-white font-bold">{params.width} × {params.length} m</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Zastavaná plocha:</span>
              <span className="text-sky-300 font-bold">{(params.width * params.length).toFixed(0)} m²</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Výška v odkvape (H):</span>
              <span className="text-white font-bold">{params.clearHeight.toFixed(2)} m</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Výška v hrebeni:</span>
              <span className="text-white font-bold">{(params.clearHeight + (params.width / 2) * Math.tan(((params.roofPitchDeg ?? 10) * Math.PI) / 180)).toFixed(2)} m</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Obostavaný priestor:</span>
              <span className="text-slate-200">~{Math.round(params.width * params.length * (params.clearHeight + (params.width / 4) * Math.tan(((params.roofPitchDeg ?? 10) * Math.PI) / 180))).toLocaleString()} m³</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Počet nosných rámov:</span>
              <span className="text-slate-200">{params.bayCount + 1} ks (raster {(params.length / params.bayCount).toFixed(1)}m)</span>
            </div>
          </div>

          {/* Customer Action Buttons */}
          <div className="space-y-2 pt-2 border-t border-white/10">
            <button
              onClick={handleSendInquiry}
              className="w-full py-3 px-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold flex items-center justify-center gap-2 shadow-lg shadow-sky-500/25 transition cursor-pointer text-sm"
            >
              <Send className="h-4 w-4" />
              <span>Odoslať dopyt</span>
            </button>

            <button
              onClick={handleSaveDesign}
              className="w-full py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>Uložiť návrh</span>
            </button>
          </div>
        </aside>
      ) : (
        <button
          onClick={() => setShowRightPanel(true)}
          className="hidden xl:flex items-center gap-1.5 absolute right-3.5 top-16 z-20 rounded-xl bg-slate-900/90 text-white border border-white/15 px-3 py-2 text-xs font-mono hover:bg-slate-800 transition shadow-xl cursor-pointer"
          title="Zobraziť parametre budovy"
        >
          <span>Parametre budovy</span>
          <span className="text-sky-400">◀</span>
        </button>
      )}

      {/* Bottom Status Bar */}
      <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2 max-w-[92vw] truncate rounded-full border border-slate-300 bg-white/90 px-4 py-1.5 font-mono text-[11px] text-slate-800 backdrop-blur-md shadow-lg flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-sky-600" />
        <span>
          <strong>{activeTemplate.title}</strong> ({activeTemplate.subtitle}) · Konštrukcia{" "}
          <strong className="text-sky-700">{activeTemplate.framework}</strong> · Rozmery:{" "}
          <strong>
            {params.width} × {params.length} × {params.clearHeight} m
          </strong>{" "}
          ({params.bayCount} polí)
        </span>
      </div>

      {/* Price Calculator & Quote Dialog */}
      <PriceCalculator p={params} quoteRequestSignal={quoteRequestSignal} />

      {/* Templates Selector Dialog */}
      <NewHallTemplatePicker
        isOpen={showTemplatePicker}
        onClose={() => setShowTemplatePicker(false)}
        selectedTemplateId={activeTemplate.id}
        onSelectTemplate={handleSelectTemplate}
      />

      {/* Bill of Materials (BOM) Modal */}
      <NewHallBOMModal
        isOpen={showBOM}
        onClose={() => setShowBOM(false)}
        params={params}
        hallName={`${activeTemplate.title} (${activeTemplate.subtitle})`}
      />

      {/* Sheeting Detail Modal (Podľa HiStruct okna Opláštenie) */}
      <NewHallSheetingModal
        isOpen={showSheetingModal}
        onClose={() => setShowSheetingModal(false)}
        p={params}
        onChange={handleSetParams}
      />

      {/* Technical 2D Drawings Modal (8 výkresov, SVG, CAD DXF, Multi-page PDF) */}
      <TechnicalDrawingsModal
        isOpen={showDrawingsModal}
        onClose={() => setShowDrawingsModal(false)}
        params={params}
        hallName={`${activeTemplate.title} (${activeTemplate.subtitle})`}
        templateId={activeTemplate.id}
        materialProject={materialProject}
        openings={openingEditor.openings}
      />

      {/* Projects & Customer CRM Modal */}
      <ProjectsCrmModal
        isOpen={showCrmModal}
        onClose={() => setShowCrmModal(false)}
        currentParams={params}
        currentProject={materialProject}
        activeTemplateId={activeTemplate.id}
        onLoadProject={handleLoadProject}
      />
    </div>
  );
}
