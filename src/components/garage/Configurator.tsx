import "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Grid, GizmoHelper, GizmoViewport } from "@react-three/drei";
import { toast } from "sonner";
import { useControls, folder, button, Leva } from "leva";
import { SlidersHorizontal, X } from "lucide-react";
import * as THREE from "three";
import { DEFAULT_PARAMS, type GarageParams } from "@/lib/garage/types";
import { Structure } from "./Structure";
import { Cladding } from "./Cladding";
import { Accessories } from "./Accessories";
import { Foundation } from "./Foundation";
import { setupProceduralEnvMap } from "@/lib/garage/pbrMaterialHelper";
import { PriceCalculator } from "./PriceCalculator";
import { PremiumSpecPanel } from "./PremiumSpecPanel";
import { CatalogDimensions } from "./CatalogDimensions";
import { ProductPicker } from "./ProductPicker";
import { getHallsConfig } from "@/lib/garage/configHelper";

type ViewPreset = "iso" | "plan" | "front" | "side";

function Scene({
  params,
  exportRef,
  removedPanels,
  onTogglePanel,
  hideDimensions,
}: {
  params: GarageParams;
  exportRef: React.MutableRefObject<THREE.Group | null>;
  removedPanels: Record<string, boolean>;
  onTogglePanel: (id: string) => void;
  hideDimensions?: boolean;
}) {
  const { gl, scene } = useThree();

  useEffect(() => {
    const envMap = setupProceduralEnvMap(scene, gl);
    return () => {
      if (scene.environment === envMap) {
        scene.environment = null;
      }
      envMap.dispose();
    };
  }, [gl, scene]);

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
      <hemisphereLight args={["#ffffff", "#9ca3af", 0.55]} />

      <group ref={exportRef}>
        {params.showFoundation && <Foundation p={params} />}
        {params.showStructure && <Structure p={params} explodeY={params.explode} />}
        {params.showCladding && (
          <Cladding
            p={params}
            explodeY={params.explode}
            removedPanels={removedPanels}
            onTogglePanel={onTogglePanel}
          />
        )}
        {params.showAccessories && <Accessories p={params} explodeY={params.explode} />}
      </group>

      {!hideDimensions && params.showCatalogDimensions !== false && params.hallType && params.hallType !== "Vlastný" && (
        <CatalogDimensions p={params} />
      )}

      <Grid
        args={[100, 100]}
        cellSize={0.5}
        cellThickness={0.5}
        cellColor="#c0c4ca"
        sectionSize={2}
        sectionThickness={1}
        sectionColor="#8a8f97"
        fadeDistance={80}
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

    const isMobileViewport = typeof window !== "undefined" && window.innerWidth < 768;
    const aspect = typeof window !== "undefined" && window.innerHeight > 0 ? window.innerWidth / window.innerHeight : 1;

    // Calculate bounding dimensions
    const diag = Math.hypot(W, L);
    const maxDimension = Math.max(diag, H * 1.5);

    // Three.js perspective camera uses vertical FOV (35 deg)
    const vFovRad = ((camera.fov || 35) * Math.PI) / 180;
    const vertFactor = 2 * Math.tan(vFovRad / 2); // ≈ 0.63
    // On portrait mobile (aspect < 1), horizontal aperture is narrower:
    const horizFactor = vertFactor * Math.max(0.3, aspect);
    const effectiveFactor = aspect < 1 ? horizFactor : vertFactor;

    // Comfortable margin: 1.30 on mobile, 1.18 on desktop
    const margin = isMobileViewport ? 1.30 : 1.18;
    const dist = (maxDimension / effectiveFactor) * margin;

    let pos: THREE.Vector3;
    switch (preset) {
      case "plan":
        pos = new THREE.Vector3(0.001, center.y + (Math.max(W, L) / effectiveFactor) * margin, 0);
        break;
      case "front":
        pos = new THREE.Vector3(0, center.y, center.z - (Math.max(W, H) / effectiveFactor) * margin);
        break;
      case "side":
        pos = new THREE.Vector3(center.x + (Math.max(L, H) / effectiveFactor) * margin, center.y, 0);
        break;
      case "iso":
      default: {
        const isoDir = new THREE.Vector3(-1.15, 0.70, -1.0).normalize();
        pos = center.clone().add(isoDir.multiplyScalar(dist));
        break;
      }
    }

    camera.position.copy(pos);
    camera.lookAt(center);
    camera.updateProjectionMatrix();
    if (controls) {
      controls.target.copy(center);
      controls.update();
    }
  }, [preset, params.width, params.length, params.clearHeight, params.hallType, camera, controls]);
  return null;
}

function getParamsFromURL(): Partial<GarageParams> {
  if (typeof window === "undefined") return {};
  const searchParams = new URLSearchParams(window.location.search);
  const parsed: Partial<GarageParams> = {};
  const hallType = searchParams.get("hallType");
  if (hallType) parsed.hallType = hallType;

  const keys = Object.keys(DEFAULT_PARAMS) as (keyof GarageParams)[];
  for (const key of keys) {
    let val = searchParams.get(key);
    if (val === null || val === "" || val === "undefined" || val === "NaN") continue;
    if (typeof DEFAULT_PARAMS[key] === "number") {
      const n = parseFloat(val);
      if (Number.isFinite(n)) parsed[key] = n as any;
    } else if (typeof DEFAULT_PARAMS[key] === "boolean") {
      parsed[key] = (val === "true") as any;
    } else {
      // Add # prefix back to hex color strings if they are raw hex
      if ((key === "claddingColor" || key === "roofColor" || key === "steelColor" || key === "doorColor" || key === "sectionalDoorColor" || key === "trimmingColor") && !val.startsWith("#")) {
        val = "#" + val;
      }
      parsed[key] = val as any;
    }
  }
  if (parsed.hallType && parsed.hallType !== "Vlastný") {
    const halls = getHallsConfig();
    const h = halls[parsed.hallType];
    if (h) {
      parsed.width = h.width;
      const bCount = h.defaultBays ?? 5;
      parsed.bayCount = bCount;
      parsed.length = h.defaultLength ?? (bCount * h.moduleLength);
      parsed.clearHeight = h.versions?.[0]?.H ?? h.heights[0];
      parsed.roofType = h.type as any;
      parsed.roofPitchDeg = h.roofPitchDeg;
    }
    parsed.showStructure = true;
    parsed.showCladding = false;
    parsed.showAccessories = false;
    parsed.showCatalogDimensions = true;
  }
  return parsed;
}

export default function Configurator() {
  const exportRef = useRef<THREE.Group | null>(null);
  const [preset, setPreset] = useState<ViewPreset>("iso");
  const [removedPanels, setRemovedPanels] = useState<Record<string, boolean>>({});
  const [quoteRequestSignal, setQuoteRequestSignal] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [showHallSpecs, setShowHallSpecs] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
    };
    handleResize();
    setShowHallSpecs(window.innerWidth >= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const [initialUrlParams] = useState(() => getParamsFromURL());
  const hallsConfig = getHallsConfig();
  const hallOptions = ["Vlastný", ...Object.keys(hallsConfig)];
  const [selectedHall, setSelectedHall] = useState(initialUrlParams.hallType ?? "Vlastný");
  const isCustom = selectedHall === "Vlastný";
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const applyHallTypeRef = useRef<(v: string) => void>(() => {});
  useEffect(() => {
    if (typeof window !== "undefined" && (!initialUrlParams.hallType || window.location.search === "")) {
      setShowPicker(true);
    }
  }, [initialUrlParams.hallType]);

  const initHall = initialUrlParams.hallType && initialUrlParams.hallType !== "Vlastný" ? hallsConfig[initialUrlParams.hallType] : null;
  const isCatalog = !!initHall;
  const initBays = initHall ? (initHall.defaultBays ?? 5) : DEFAULT_PARAMS.bayCount;
  const initLength = initHall ? (initHall.defaultLength ?? (initBays * initHall.moduleLength)) : DEFAULT_PARAMS.length;

  const [params, setParams] = useControls(() => ({
    "Zobrazenie": folder({
      showStructure: { value: isCatalog ? true : (initialUrlParams.showStructure ?? true), label: "Konštrukcia" },
      showCladding: { value: isCatalog ? false : (initialUrlParams.showCladding ?? DEFAULT_PARAMS.showCladding), label: "Opláštenie" },
      showAccessories: { value: isCatalog ? false : (initialUrlParams.showAccessories ?? DEFAULT_PARAMS.showAccessories), label: "Príslušenstvo" },
      showFoundation: { value: initialUrlParams.showFoundation ?? DEFAULT_PARAMS.showFoundation, label: "Základová doska" },
      showCatalogDimensions: { value: isCatalog ? (initialUrlParams.showCatalogDimensions ?? true) : false, label: "Kóty A-B-C" },
      wireframe: { value: initialUrlParams.wireframe ?? DEFAULT_PARAMS.wireframe, label: "Wireframe" },
      explode: { value: initialUrlParams.explode ?? DEFAULT_PARAMS.explode, min: 0, max: 1, step: 0.01, label: "Exploded view" },
    }, { collapsed: true }),
    "Geometria": folder({
      hallType: {
        value: initialUrlParams.hallType ?? "Vlastný",
        options: hallOptions,
        label: "Typ z PDF",
        onChange: (v) => {
          applyHallTypeRef.current(v);
        },
      },
      hallHeight: {
        value: "4m",
        options: ["4m", "5m", "6m", "7m"],
        label: "Výška stĺpa",
        disabled: isCustom,
        onChange: (val) => {
          if (selectedHall !== "Vlastný" && hallsConfig[selectedHall]) {
            const h = hallsConfig[selectedHall];
            const poleNum = parseInt(val, 10);
            let foundVer = h.versions?.find((ver) => ver.poleHeight === poleNum);
            if (!foundVer && h.versions && h.versions.length > 0) {
              foundVer = h.versions[0];
            }
            if (foundVer) {
              const isShed = h.type === "shed";
              const gateW = isShed ? Math.min(3.0, h.width * 0.5) : (foundVer.E ?? (h.width * 0.6));
              const gateH = isShed
                ? (foundVer.H4 ? Math.min(foundVer.H4 - 0.15, 3.5) : 2.5)
                : (foundVer.H2 ? Math.min(foundVer.H2 - 0.15, 5.0) : Math.min(3.8, foundVer.H - 0.2));
              setParams({
                clearHeight: foundVer.H,
                doorWidth: gateW,
                doorHeight: gateH,
              });
            }
          }
        },
      },
      width: { value: isCatalog ? initHall.width : (initialUrlParams.width ?? DEFAULT_PARAMS.width), min: 2.5, max: 20, step: 0.1, label: "Šírka X [m]" },
      length: {
        value: isCatalog ? initLength : (initialUrlParams.length ?? initLength),
        min: 3,
        max: 50,
        step: 0.1,
        label: "Dĺžka Y [m]",
        onChange: (val) => {
          if (selectedHall !== "Vlastný" && hallsConfig[selectedHall]) {
            const h = hallsConfig[selectedHall];
            const bays = Math.max(2, Math.round(val / h.moduleLength));
            setParams({ bayCount: bays });
          }
        }
      },
      clearHeight: { value: isCatalog ? (initHall.versions?.[0]?.H ?? initHall.heights[0]) : (initialUrlParams.clearHeight ?? DEFAULT_PARAMS.clearHeight), min: 2.0, max: 7.0, step: 0.001, label: "Svetlá výška Z [m]" },
      roofType: { value: isCatalog ? (initHall.type as any) : (initialUrlParams.roofType ?? DEFAULT_PARAMS.roofType), options: { "Sedlová": "gable", "Pultová": "shed" }, label: "Strecha" },
      roofPitchDeg: { value: isCatalog ? initHall.roofPitchDeg : (initialUrlParams.roofPitchDeg ?? DEFAULT_PARAMS.roofPitchDeg), min: 5, max: 35, step: 1, label: "Spád strechy [°]" },
    }, { collapsed: true }),
    "Konštrukcia": folder({
      bayCount: { value: isCatalog ? initBays : (initialUrlParams.bayCount ?? initBays), min: 2, max: 15, step: 1, label: "Počet polí" },
      profileSize: { value: initialUrlParams.profileSize ?? DEFAULT_PARAMS.profileSize, min: 0.06, max: 0.20, step: 0.01, label: "Jakl strana [m]" },
      profileThickness: { value: initialUrlParams.profileThickness ?? DEFAULT_PARAMS.profileThickness, min: 0.002, max: 0.010, step: 0.001, label: "Hrúbka steny [m]" },
      steelColor: { value: initialUrlParams.steelColor ?? DEFAULT_PARAMS.steelColor, label: "Farba ocele" },
    }, { collapsed: true }),
    "Opláštenie": folder({
      claddingColor: { value: initialUrlParams.claddingColor ?? DEFAULT_PARAMS.claddingColor, label: "Steny RAL" },
      panelType: { value: initialUrlParams.panelType ?? DEFAULT_PARAMS.panelType, options: { "Trapézový plech": "trapezoid", "Sendvičové panely": "sandwich", "Hladký panel": "smooth" }, label: "Typ stien" },
      claddingOrientation: { value: initialUrlParams.claddingOrientation ?? DEFAULT_PARAMS.claddingOrientation, options: { "Vertikálne": "vertical", "Pozdĺžne": "horizontal" }, label: "Smer stien" },
      roofColor: { value: initialUrlParams.roofColor ?? DEFAULT_PARAMS.roofColor, label: "Strecha RAL" },
      roofPanelType: { value: initialUrlParams.roofPanelType ?? DEFAULT_PARAMS.roofPanelType, options: { "Trapézový plech": "trapezoid", "Hladký panel": "smooth", "Škridla": "tile" }, label: "Typ strechy" },
      roofCladdingOrientation: { value: initialUrlParams.roofCladdingOrientation ?? DEFAULT_PARAMS.roofCladdingOrientation, options: { "Vertikálne": "vertical", "Pozdĺžne": "horizontal" }, label: "Smer strechy" },
      sectionalDoorColor: { value: initialUrlParams.sectionalDoorColor ?? DEFAULT_PARAMS.sectionalDoorColor, label: "Garážová brána RAL" },
      doorColor: { value: initialUrlParams.doorColor ?? DEFAULT_PARAMS.doorColor, label: "Personálne dvere RAL" },
      trimmingColor: { value: initialUrlParams.trimmingColor ?? DEFAULT_PARAMS.trimmingColor, label: "Rohy & Odkvapy RAL" },
    }, { collapsed: true }),
    "Dvere a okná": folder({
      doorOpen: { value: isCatalog ? false : (initialUrlParams.doorOpen ?? DEFAULT_PARAMS.doorOpen), label: "Otvoriť bránu 🔓" },
      doorWidth: { value: isCatalog ? (initHall.type === "shed" ? Math.min(3.0, initHall.width * 0.5) : (initHall.versions?.[0]?.E ?? 4.8)) : (initialUrlParams.doorWidth ?? DEFAULT_PARAMS.doorWidth), min: 1.0, max: 6.0, step: 0.1, label: "Brána Š [m]" },
      doorHeight: { value: isCatalog ? (initHall.type === "shed" ? (initHall.versions?.[0]?.H4 ? Math.min(initHall.versions[0].H4 - 0.15, 3.2) : 2.5) : (initHall.versions?.[0]?.H2 ? Math.min(initHall.versions[0].H2 - 0.15, 4.8) : Math.min(3.8, (initHall.versions?.[0]?.H ?? initHall.heights[0]) - 0.2))) : (initialUrlParams.doorHeight ?? DEFAULT_PARAMS.doorHeight), min: 1.8, max: 6.5, step: 0.1, label: "Brána V [m]" },
      hasPersonalDoor: { value: isCatalog ? false : (initialUrlParams.hasPersonalDoor ?? DEFAULT_PARAMS.hasPersonalDoor), label: "Personálne dvere" },
      personalDoorSide: { value: initialUrlParams.personalDoorSide ?? DEFAULT_PARAMS.personalDoorSide, options: ["left", "right", "back"], label: "Strana dverí" },
      hasWindows: { value: isCatalog ? false : (initialUrlParams.hasWindows ?? DEFAULT_PARAMS.hasWindows), label: "Okná" },
      hasSkylights: { value: isCatalog ? false : (initialUrlParams.hasSkylights ?? DEFAULT_PARAMS.hasSkylights), label: "Strešné svetlíky ☀️" },
      windowSide: { value: initialUrlParams.windowSide ?? DEFAULT_PARAMS.windowSide, options: ["left", "right", "back"], label: "Strana okien" },
      windowCount: { value: initialUrlParams.windowCount ?? DEFAULT_PARAMS.windowCount, min: 0, max: 4, step: 1, label: "Počet okien" },
      windowWidth: { value: initialUrlParams.windowWidth ?? DEFAULT_PARAMS.windowWidth, min: 0.3, max: 1.5, step: 0.1, label: "Okno Š [m]" },
      windowHeight: { value: initialUrlParams.windowHeight ?? DEFAULT_PARAMS.windowHeight, min: 0.3, max: 1.2, step: 0.1, label: "Okno V [m]" },
    }, { collapsed: true }),
    "Prémiový sendvič": folder({
      insulationCore: {
        value: initialUrlParams.insulationCore ?? DEFAULT_PARAMS.insulationCore,
        options: { "PIR (odporúčané)": "PIR", "PUR": "PUR", "EPS": "EPS", "Minerálna vlna": "mineral" },
        label: "Jadro",
      },
      wallPanelThicknessMm: { value: initialUrlParams.wallPanelThicknessMm ?? DEFAULT_PARAMS.wallPanelThicknessMm, min: 60, max: 200, step: 10, label: "Stena [mm]" },
      roofPanelThicknessMm: { value: initialUrlParams.roofPanelThicknessMm ?? DEFAULT_PARAMS.roofPanelThicknessMm, min: 80, max: 240, step: 10, label: "Strecha [mm]" },
      outerSheetMm: { value: initialUrlParams.outerSheetMm ?? DEFAULT_PARAMS.outerSheetMm, min: 0.4, max: 1.0, step: 0.05, label: "Vonk. plech [mm]" },
      innerSheetMm: { value: initialUrlParams.innerSheetMm ?? DEFAULT_PARAMS.innerSheetMm, min: 0.4, max: 0.8, step: 0.05, label: "Vnút. plech [mm]" },
      coatingType: {
        value: initialUrlParams.coatingType ?? DEFAULT_PARAMS.coatingType,
        options: { "HDX (PU 50µm)": "HDX", "Pural (PU 50µm)": "Pural", "PVDF": "PVDF", "Polyester": "Polyester" },
        label: "Povrch",
      },
      coatingThicknessUm: { value: initialUrlParams.coatingThicknessUm ?? DEFAULT_PARAMS.coatingThicknessUm, min: 25, max: 100, step: 5, label: "Lak [µm]" },
      zincCoatingGsm: { value: initialUrlParams.zincCoatingGsm ?? DEFAULT_PARAMS.zincCoatingGsm, min: 100, max: 450, step: 25, label: "Zinok [g/m²]" },
      hiddenFastening: { value: initialUrlParams.hiddenFastening ?? DEFAULT_PARAMS.hiddenFastening, label: "Skryté kotvenie" },
      fastenerGrade: {
        value: initialUrlParams.fastenerGrade ?? DEFAULT_PARAMS.fastenerGrade,
        options: { "Nerez A2": "A2", "Nerez A4 (prímorské)": "A4", "Pozinkovaná oceľ": "carbon" },
        label: "Skrutky",
      },
      sealingSystem: { value: initialUrlParams.sealingSystem ?? DEFAULT_PARAMS.sealingSystem, label: "Tesnenia a tmely" },
      flashingMatchesPanels: { value: initialUrlParams.flashingMatchesPanels ?? DEFAULT_PARAMS.flashingMatchesPanels, label: "Systémové klampiarstvo" },
    }, { collapsed: true }),
    "Export": folder({
      "Dopytovať cenovú ponuku": button(() => {
        setQuoteRequestSignal((v) => v + 1);
      }),
    }, { collapsed: true }),
  }));

  const applyHallType = (v: string) => {
    setSelectedHall(v);
    if (v !== "Vlastný" && hallsConfig[v]) {
      const h = hallsConfig[v];
      let profSize = 0.10;
      let profThick = 0.004;
      if (h.gablePillars?.includes("140")) {
        profSize = 0.14;
        profThick = 0.005;
      } else if (h.gablePillars?.includes("120x120x5")) {
        profSize = 0.12;
        profThick = 0.005;
      } else if (h.gablePillars?.includes("120")) {
        profSize = 0.12;
        profThick = 0.004;
      } else if (h.gablePillars?.includes("100")) {
        profSize = 0.10;
        profThick = 0.004;
      }

      const defaultBays = h.defaultBays ?? (v === "KD8" ? 5 : Math.max(3, Math.round(h.minLength / h.moduleLength)));
      const defaultLen = h.defaultLength ?? (defaultBays * h.moduleLength);
      const defaultVer = h.versions?.[0];
      const defaultH = defaultVer ? defaultVer.H : h.heights[0];
      const defaultPole = defaultVer ? `${defaultVer.poleHeight}m` : "4m";
      const isShed = h.type === "shed";
      const gateW = isShed ? Math.min(3.0, h.width * 0.5) : (defaultVer?.E ?? 4.8);
      const gateH = isShed
        ? (defaultVer?.H4 ? Math.min(defaultVer.H4 - 0.15, 3.2) : 2.5)
        : (defaultVer?.H2 ? Math.min(defaultVer.H2 - 0.15, 4.8) : Math.min(3.8, defaultH - 0.2));

      (setParams as any)({
        hallType: v,
        showStructure: true,
        showCladding: false,
        showAccessories: false,
        showCatalogDimensions: true,
        width: h.width,
        roofType: h.type as any,
        roofPitchDeg: h.roofPitchDeg,
        clearHeight: defaultH,
        hallHeight: defaultPole,
        length: defaultLen,
        bayCount: defaultBays,
        profileSize: profSize,
        profileThickness: profThick,
        hasPersonalDoor: false,
        hasWindows: false,
        doorWidth: gateW,
        doorHeight: gateH,
        doorOpen: false,
        steelColor: "#9aa1ab",
        ...(h.claddingVersion === "ZU" ? { claddingOrientation: "vertical" } : {})
      });
    } else if (v === "Vlastný") {
      (setParams as any)({
        hallType: "Vlastný",
        showStructure: true,
        showCladding: true,
        showAccessories: true,
        showCatalogDimensions: false,
        width: DEFAULT_PARAMS.width,
        length: DEFAULT_PARAMS.length,
        clearHeight: DEFAULT_PARAMS.clearHeight,
        roofType: DEFAULT_PARAMS.roofType,
        roofPitchDeg: DEFAULT_PARAMS.roofPitchDeg,
        bayCount: DEFAULT_PARAMS.bayCount,
        profileSize: DEFAULT_PARAMS.profileSize,
        profileThickness: DEFAULT_PARAMS.profileThickness,
        steelColor: DEFAULT_PARAMS.steelColor,
        doorWidth: DEFAULT_PARAMS.doorWidth,
        doorHeight: DEFAULT_PARAMS.doorHeight,
        hasPersonalDoor: DEFAULT_PARAMS.hasPersonalDoor,
        hasWindows: DEFAULT_PARAMS.hasWindows,
      });
    }
  };
  applyHallTypeRef.current = applyHallType;

  const cleanParams: Partial<GarageParams> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && !Number.isNaN(v)) {
      (cleanParams as any)[k] = v;
    }
  }

  let typedParams: GarageParams = { ...DEFAULT_PARAMS, ...cleanParams };

  if (selectedHall && selectedHall !== "Vlastný" && hallsConfig[selectedHall]) {
    const h = hallsConfig[selectedHall];
    const activeVer =
      h.versions?.find((v) => Math.abs(v.H - (cleanParams.clearHeight ?? 0)) < 0.05) ||
      h.versions?.[0];
    const bCount = cleanParams.bayCount && cleanParams.bayCount >= 2 ? cleanParams.bayCount : (h.defaultBays ?? 5);
    const hallLen = (cleanParams.length && cleanParams.length >= h.minLength) ? cleanParams.length : (h.defaultLength ?? (bCount * h.moduleLength));
    typedParams = {
      ...typedParams,
      hallType: selectedHall,
      width: h.width,
      roofType: h.type as any,
      roofPitchDeg: h.roofPitchDeg,
      clearHeight: cleanParams.clearHeight ?? activeVer?.H ?? h.heights[0],
      length: hallLen,
      bayCount: bCount,
      showStructure: cleanParams.showStructure ?? true,
      showCladding: cleanParams.showCladding ?? false,
      showAccessories: cleanParams.showAccessories ?? false,
    };
  }

  const togglePanel = (id: string) => {
    setRemovedPanels((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const currentParams = new URLSearchParams(window.location.search);
    const client = currentParams.get("client");

    const searchParams = new URLSearchParams();
    if (selectedHall && selectedHall !== "Vlastný") {
      searchParams.set("hallType", selectedHall);
    }
    const keys = Object.keys(DEFAULT_PARAMS) as (keyof GarageParams)[];
    for (const key of keys) {
      const rawVal = typedParams[key];
      if (rawVal === undefined || rawVal === null || Number.isNaN(rawVal as any)) continue;
      let val = String(rawVal);
      if (val === "undefined" || val === "NaN") continue;
      if ((key === "claddingColor" || key === "roofColor" || key === "steelColor" || key === "doorColor" || key === "sectionalDoorColor" || key === "trimmingColor") && val.startsWith("#")) {
        val = val.substring(1);
      }
      searchParams.set(key, val);
    }
    if (client) {
      searchParams.set("client", client);
    }
    const newRelativePathQuery = window.location.pathname + "?" + searchParams.toString();
    window.history.replaceState(null, "", newRelativePathQuery);
  }, [typedParams, selectedHall]);

  const handleShare = () => {
    if (typeof window === "undefined") return;
    navigator.clipboard.writeText(window.location.href);
    toast.success("Odkaz na konfiguráciu bol skopírovaný do schránky!");
  };

  return (
    <div className="relative h-screen w-screen bg-[oklch(0.16_0.01_240)] select-none overflow-hidden">
      <Canvas
        shadows
        camera={{ position: [10, 8, -10], fov: 35, near: 0.1, far: 500 }}
        gl={{ antialias: true, preserveDrawingBuffer: true }}
      >
        <color attach="background" args={["#f5f5f5"]} />
        <fog attach="fog" args={["#f5f5f5", 80, 450]} />
        <Scene
          params={typedParams}
          exportRef={exportRef}
          removedPanels={removedPanels}
          onTogglePanel={togglePanel}
          hideDimensions={showCatalogModal || showPicker}
        />
        <OrbitControls makeDefault enableDamping dampingFactor={0.08} target={[0, typedParams.clearHeight / 2, 0]} />
        <CameraRig preset={preset} params={typedParams} />
        {!isMobile && (
          <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
            <GizmoViewport axisColors={["#ef4444", "#22c55e", "#3b82f6"]} labelColor="white" />
          </GizmoHelper>
        )}
      </Canvas>

      {showPicker && (
        <ProductPicker
          halls={hallsConfig}
          selectedHall={selectedHall}
          onSelect={(v) => {
            applyHallType(v);
            setShowPicker(false);
          }}
          onClose={() => setShowPicker(false)}
        />
      )}

      {/* Top bar */}
      <div className="absolute left-0 right-0 top-0 z-20 flex flex-col md:flex-row md:items-center md:justify-between border-b border-white/5 bg-black/60 px-4 py-1.5 md:py-2 backdrop-blur gap-1.5">
        <div className="flex items-center justify-between w-full md:w-auto gap-2">
          <div className="flex items-center gap-2 shrink-0">
            <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
            <h1 className="font-mono text-xs md:text-sm tracking-widest text-white/90 font-bold whitespace-nowrap">
              {isMobile ? "STEEL GARAGE" : "STEEL GARAGE — PARAMETRIC CAD"}
            </h1>
            {!isMobile && (
              <span className="rounded border border-white/10 px-2 py-0.5 font-mono text-[10px] text-white/50">
                v1.0
              </span>
            )}
          </div>
          {/* Quick Product Switcher */}
          <div className="flex items-center gap-1 rounded border border-white/10 bg-black/40 px-1.5 py-0.5 max-w-[58%] sm:max-w-none">
            <span className="text-[10px] font-mono text-white/50 uppercase hidden md:inline">Produkt:</span>
            <select
              value={selectedHall}
              onChange={(e) => {
                applyHallType(e.target.value);
              }}
              className="min-w-0 max-w-[125px] sm:max-w-none rounded bg-[#161b22] px-1.5 py-0.5 font-mono text-[11px] font-bold text-emerald-400 border border-emerald-500/30 outline-none cursor-pointer hover:border-emerald-400 transition truncate"
            >
              <option value="Vlastný">Vlastná garáž</option>
              <optgroup label="Oceľové haly GTG">
                {Object.keys(hallsConfig).map((name) => (
                  <option key={name} value={name}>{name} (Katalóg)</option>
                ))}
              </optgroup>
            </select>
            <button
              onClick={() => setShowPicker(true)}
              className="flex items-center gap-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.5 font-mono text-[10px] font-bold transition cursor-pointer shrink-0"
              title="Otvoriť vizuálny výber produktov z katalógu"
            >
              <span>⊞</span>
              <span className="hidden sm:inline">Katalóg</span>
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between md:justify-end gap-1 w-full md:w-auto">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {(["iso", "plan", "front", "side"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setPreset(v)}
                className={`rounded px-2 md:px-3 py-1 font-mono text-[10px] md:text-xs uppercase tracking-wider transition ${
                  preset === v
                    ? "bg-emerald-400/20 text-emerald-300 ring-1 ring-emerald-400/40"
                    : "text-white/60 hover:bg-white/5 hover:text-white"
                }`}
              >
                {v === "iso" ? (isMobile ? "ISO" : "Axonometria") : v === "plan" ? (isMobile ? "PÔD" : "Pôdorys") : v === "front" ? (isMobile ? "Čelo" : "Čelo") : (isMobile ? "Bok" : "Bok")}
              </button>
            ))}
          </div>
          <button
            onClick={handleShare}
            className="ml-1 md:ml-2 flex items-center gap-1 rounded bg-emerald-400/20 px-2 md:px-3 py-1 font-mono text-[10px] md:text-xs uppercase tracking-wider text-emerald-300 ring-1 ring-emerald-400/40 transition hover:bg-emerald-400/30 shrink-0"
          >
            Zdieľať
          </button>
        </div>
        {!isMobile && (
          <div className="font-mono text-[10px] text-white/40">
            {(typedParams.width ?? DEFAULT_PARAMS.width).toFixed(1)} × {(typedParams.length ?? DEFAULT_PARAMS.length).toFixed(1)} × {(typedParams.clearHeight ?? DEFAULT_PARAMS.clearHeight).toFixed(1)} m
          </div>
        )}
      </div>

      <PriceCalculator p={typedParams} quoteRequestSignal={quoteRequestSignal} />

      {/* Left stacked panels container (prevents any overlapping) */}
      <div className="pointer-events-none absolute left-3.5 top-20 md:top-14 z-20 flex flex-col gap-2 w-[calc(100vw-140px)] max-w-[340px] md:w-[340px]">
        <PremiumSpecPanel
          p={typedParams}
          className="pointer-events-auto w-full rounded border border-white/10 bg-black/70 font-mono text-[11px] text-white/80 backdrop-blur shadow-lg"
        />

        {/* Hall PDF specs badge if selected */}
        {selectedHall !== "Vlastný" && hallsConfig[selectedHall] && (() => {
          const curHall = hallsConfig[selectedHall];
          const activeVer = curHall.versions?.find((v) => Math.abs(v.H - (typedParams.clearHeight ?? 0)) < 0.05) || curHall.versions?.[0];
          return (
            <div className="pointer-events-auto w-full rounded border border-emerald-500/30 bg-[#0e1116]/85 p-2.5 font-mono text-[10px] text-white/90 backdrop-blur shadow-xl">
              <div
                onClick={() => setShowHallSpecs(v => !v)}
                className="flex items-center justify-between border-b border-white/10 pb-1 mb-1.5 cursor-pointer select-none"
              >
                <span className="font-bold text-emerald-400">KATALÓG GTG: {selectedHall}</span>
                <span className="text-white/50 text-[9px] flex items-center gap-1">
                  <span>{curHall.framework || "EN 1090"}</span>
                  <span className="text-emerald-400 font-bold">{showHallSpecs ? "▴" : "▾"}</span>
                </span>
              </div>
              {showHallSpecs && (
                <>
                  {activeVer && (
                    <div className="text-[9px] text-emerald-300 font-semibold mb-1 truncate">
                      {activeVer.label}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-white/70">
                    <div>Šírka A: <span className="text-white">{curHall.width} m</span></div>
                    <div>Modul C: <span className="text-white">{curHall.moduleLength} m</span></div>
                    <div>Výška H: <span className="text-white">{activeVer ? `${activeVer.H.toFixed(3)} m` : `${curHall.heights[0]} m`}</span></div>
                    <div>Hrebeň H1: <span className="text-white">{activeVer ? `${activeVer.H1.toFixed(3)} m` : "-"}</span></div>
                    <div>Prejazd H2: <span className="text-white">{activeVer ? `${activeVer.H2.toFixed(3)} m` : "-"}</span></div>
                    {curHall.type === "shed" && activeVer?.H3 && (
                      <div>Vzadu H3/H4: <span className="text-white">{activeVer.H3}m / {activeVer.H4}m</span></div>
                    )}
                    <div>Rozteč D / E: <span className="text-white">{activeVer ? `${activeVer.D}m / ${activeVer.E}m` : "-"}</span></div>
                    <div>Stĺpy: <span className="text-white">{curHall.gablePillars || "RK"}</span></div>
                    <div>Sklon: <span className="text-white">{curHall.roofPitchDeg}°</span></div>
                    <div>Oceľ: <span className="text-white">{curHall.steelGrade || "S355"}</span></div>
                    {curHall.snowZone && (
                      <div>Zóna: <span className="text-white">Sneh {curHall.snowZone} / Vietor {curHall.windZone}</span></div>
                    )}
                    {curHall.claddingVersion && (
                      <div>Opláštenie: <span className="text-white">{curHall.claddingVersion}</span></div>
                    )}
                  </div>
                  <button
                    onClick={() => setShowCatalogModal(true)}
                    className="mt-2 w-full flex items-center justify-center gap-1.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 py-1 text-[10px] font-bold cursor-pointer transition-colors"
                  >
                    <span>📷 Zobraziť predlohu z katalógu</span>
                  </button>
                </>
              )}
            </div>
          );
        })()}
      </div>

      {/* Dimensions strip */}
      <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2 max-w-[92vw] truncate rounded border border-white/10 bg-black/50 px-2 py-1 md:px-3 md:py-1.5 font-mono text-[9px] md:text-[10px] text-white/60 backdrop-blur text-center">
        {isMobile ? "Ťahanie = rotácia · Profily " + ((typedParams.profileSize ?? DEFAULT_PARAMS.profileSize) * 1000).toFixed(0) + " mm" : "Drag = orbit · Scroll = zoom · Right-drag = pan · Profily " + ((typedParams.profileSize ?? DEFAULT_PARAMS.profileSize) * 1000).toFixed(0) + "×" + ((typedParams.profileSize ?? DEFAULT_PARAMS.profileSize) * 1000).toFixed(0) + "×" + ((typedParams.profileThickness ?? DEFAULT_PARAMS.profileThickness) * 1000).toFixed(0) + " mm"}
      </div>

      {/* Controls Toggle Button */}
      <button
        onClick={() => setShowControls(v => !v)}
        className="absolute right-3 top-20 md:top-14 z-30 flex items-center gap-1.5 rounded-full bg-emerald-400 text-slate-900 px-3 py-2 text-xs font-mono font-bold shadow-lg hover:bg-emerald-300 transition-all active:scale-95 cursor-pointer"
      >
        {showControls ? (
          <>
            <X className="h-4 w-4" />
            <span>Zavrieť</span>
          </>
        ) : (
          <>
            <SlidersHorizontal className="h-4 w-4" />
            <span>Parametre</span>
          </>
        )}
      </button>

      {/* Leva Controls container */}
      <div className={`quote-export-panel absolute right-3 top-[132px] md:top-28 z-30 max-h-[calc(100vh-150px)] md:max-h-[72vh] overflow-y-auto rounded-lg bg-[#0e1116]/95 shadow-2xl border border-white/10 transition-all duration-300 ${
        showControls ? "opacity-100 translate-x-0 pointer-events-auto" : "opacity-0 translate-x-12 pointer-events-none"
      } md:w-[320px] w-[calc(100vw-32px)] max-w-[360px]`}>
        <Leva
          fill
          flat
          titleBar={{ title: "Parametre", drag: false, filter: false }}
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
            sizes: { rootWidth: "100%", controlWidth: "45%" },
            fonts: { mono: "ui-monospace, SFMono-Regular, Menlo, monospace" },
          }}
        />
      </div>
      <style>{`
        .quote-export-panel > div > div:last-child > div > div:last-child button {
          height: 48px;
          min-height: 48px;
          font-size: 14px;
          font-weight: 700;
          padding: 0 16px;
        }
      `}</style>

      {/* Catalog 1:1 Reference Modal */}
      {showCatalogModal && selectedHall !== "Vlastný" && hallsConfig[selectedHall] && (() => {
        const curHall = hallsConfig[selectedHall];
        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-3 md:p-6 backdrop-blur-md">
            <div className="relative max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-xl border border-white/20 bg-[#0e1116] p-4 md:p-6 shadow-2xl font-mono text-white">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                <div>
                  <h3 className="text-base font-bold text-emerald-400">
                    Katalógová predloha GTG 2025: {selectedHall}
                  </h3>
                  <p className="text-xs text-white/50">
                    Typ: {curHall.type === "gable" ? "Sedlová hala" : "Pultová hala"} · Norma EN 1090 EXC2 · Zinkovanie PN-EN ISO 1461
                  </p>
                </div>
                <button
                  onClick={() => setShowCatalogModal(false)}
                  className="rounded-full bg-white/10 p-1.5 hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
                  title="Zavrieť"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Gallery of catalog images */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="rounded-lg border border-white/10 bg-black/40 p-2.5 overflow-hidden flex flex-col">
                  <div className="text-[11px] font-bold text-emerald-300 mb-1.5 flex items-center justify-between">
                    <span>1. Vizualizácia z katalógu</span>
                    <span className="text-[9px] text-white/40">3D RENDER</span>
                  </div>
                  <div className="overflow-hidden rounded border border-white/5 bg-black/60 flex items-center justify-center min-h-[170px]">
                    <img
                      src={`/catalog/${selectedHall}_render.png`}
                      alt={`Vizualizácia ${selectedHall}`}
                      className="w-full h-auto max-h-[260px] object-contain"
                    />
                  </div>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/40 p-2.5 overflow-hidden flex flex-col">
                  <div className="text-[11px] font-bold text-emerald-300 mb-1.5 flex items-center justify-between">
                    <span>2. Výkres rámu a kót</span>
                    <span className="text-[9px] text-white/40">CAD SCHEMA</span>
                  </div>
                  <div className="overflow-hidden rounded border border-white/10 bg-white p-2 flex items-center justify-center min-h-[170px] shadow-inner">
                    <img
                      src={`/catalog/${selectedHall}_cad_diagram.png`}
                      alt={`Výkres ${selectedHall}`}
                      className="w-full h-auto max-h-[260px] object-contain"
                    />
                  </div>
                  <a
                    href={`/catalog/${selectedHall}_page_main.png`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 text-center text-[10px] text-emerald-300 hover:text-emerald-200 bg-emerald-500/15 border border-emerald-500/30 rounded py-1 px-2 font-mono flex items-center justify-center gap-1.5 transition"
                  >
                    <span>🔍 Zobraziť originálny katalógový list v plnom HD rozlíšení ↗</span>
                  </a>
                </div>
              </div>

              {/* Specification table */}
              <div className="rounded-lg border border-white/10 bg-white/5 p-4 mb-4 text-xs">
                <div className="font-bold text-emerald-300 mb-2.5">Presné parametre 1:1 z katalógu GTG:</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 text-white/80">
                  <div className="flex items-center justify-between sm:justify-start sm:gap-2 bg-black/30 sm:bg-transparent px-2 py-1 sm:p-0 rounded">
                    <span className="text-white/60">Šírka A:</span>
                    <span className="font-bold text-white">{curHall.width} m ({(curHall.width * 1000).toFixed(0)} mm)</span>
                  </div>
                  <div className="flex items-center justify-between sm:justify-start sm:gap-2 bg-black/30 sm:bg-transparent px-2 py-1 sm:p-0 rounded">
                    <span className="text-white/60">Modul C:</span>
                    <span className="font-bold text-white">{curHall.moduleLength} m</span>
                  </div>
                  <div className="flex items-center justify-between sm:justify-start sm:gap-2 bg-black/30 sm:bg-transparent px-2 py-1 sm:p-0 rounded">
                    <span className="text-white/60">Min. dĺžka B:</span>
                    <span className="font-bold text-white">&gt; {curHall.minLength} m</span>
                  </div>
                  <div className="flex items-center justify-between sm:justify-start sm:gap-2 bg-black/30 sm:bg-transparent px-2 py-1 sm:p-0 rounded">
                    <span className="text-white/60">Hlavný rám:</span>
                    <span className="font-bold text-white">{curHall.framework}</span>
                  </div>
                  <div className="flex items-center justify-between sm:justify-start sm:gap-2 bg-black/30 sm:bg-transparent px-2 py-1 sm:p-0 rounded">
                    <span className="text-white/60">Štítové stĺpy:</span>
                    <span className="font-bold text-white">{curHall.gablePillars}</span>
                  </div>
                  <div className="flex items-center justify-between sm:justify-start sm:gap-2 bg-black/30 sm:bg-transparent px-2 py-1 sm:p-0 rounded">
                    <span className="text-white/60">Sklon:</span>
                    <span className="font-bold text-white">{curHall.roofPitchDeg}°</span>
                  </div>
                  <div className="flex items-center justify-between sm:justify-start sm:gap-2 bg-black/30 sm:bg-transparent px-2 py-1 sm:p-0 rounded">
                    <span className="text-white/60">Zavetrovanie:</span>
                    <span className="font-bold text-white">{curHall.bracing || "ø10.7"}</span>
                  </div>
                  <div className="flex items-center justify-between sm:justify-start sm:gap-2 bg-black/30 sm:bg-transparent px-2 py-1 sm:p-0 rounded">
                    <span className="text-white/60">Ťahadlá:</span>
                    <span className="font-bold text-white">{curHall.tieRods || "ø16"}</span>
                  </div>
                  <div className="flex items-center justify-between sm:justify-start sm:gap-2 bg-black/30 sm:bg-transparent px-2 py-1 sm:p-0 rounded">
                    <span className="text-white/60">Zóny:</span>
                    <span className="font-bold text-white">Sneh {curHall.snowZone} / Vietor {curHall.windZone}</span>
                  </div>
                </div>

                {curHall.versions && curHall.versions.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <div className="font-semibold text-white/60 mb-2">Dostupné výškové verzie:</div>
                    <div className="flex flex-wrap gap-2">
                      {curHall.versions.map((ver) => {
                        const isCur = Math.abs(ver.H - (typedParams.clearHeight ?? 0)) < 0.05;
                        return (
                          <button
                            key={ver.label}
                            onClick={() => {
                              const isShed = curHall.type === "shed";
                              const gateW = isShed ? Math.min(3.0, curHall.width * 0.5) : (ver.E ?? 4.8);
                              const gateH = isShed
                                ? (ver.H4 ? Math.min(ver.H4 - 0.15, 3.2) : 2.5)
                                : (ver.H2 ? Math.min(ver.H2 - 0.15, 4.8) : Math.min(3.8, ver.H - 0.2));
                              const bays = curHall.defaultBays ?? (curHall.name === "KD8" ? 5 : 4);
                              const len = curHall.defaultLength ?? (bays * curHall.moduleLength);
                              (setParams as any)({
                                showStructure: true,
                                showCladding: false,
                                showAccessories: false,
                                clearHeight: ver.H,
                                hallHeight: `${ver.poleHeight}m`,
                                doorWidth: gateW,
                                doorHeight: gateH,
                                bayCount: bays,
                                length: len,
                              });
                            }}
                            className={`rounded px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                              isCur
                                ? "bg-emerald-400 text-slate-900 shadow-md ring-2 ring-emerald-300"
                                : "bg-white/10 text-white hover:bg-white/20 border border-white/10"
                            }`}
                          >
                            ✓ Nastaviť 1:1: {ver.label} (H={ver.H}m, H1={ver.H1}m, H2={ver.H2}m)
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Close Button */}
              <div className="flex justify-end">
                <button
                  onClick={() => setShowCatalogModal(false)}
                  className="rounded bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-900 hover:bg-emerald-400 transition-colors cursor-pointer"
                >
                  Hotovo, pokračovať v konfigurácii
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
