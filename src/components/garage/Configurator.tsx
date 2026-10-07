import "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Grid, GizmoHelper, GizmoViewport } from "@react-three/drei";
import { toast } from "sonner";
import { useControls, folder, button, Leva } from "leva";
import { SlidersHorizontal, X } from "lucide-react";
import * as THREE from "three";
import { DEFAULT_PARAMS, type GarageParams } from "@/lib/garage/types";
import { PriceCalculator } from "./PriceCalculator";
import { PremiumSpecPanel } from "./PremiumSpecPanel";
import { ProductPicker } from "./ProductPicker";
import { ArModal } from "./ArModal";
import { HallCatalogModal } from "./HallCatalogModal";
import { CatalogInfoCard } from "./CatalogInfoCard";
import { TopNavigation } from "./TopNavigation";
import { getHallsConfig, getImageCatalog, getCatalogWithCladding } from "@/lib/garage/configHelper";
import { Scene, CameraRig, type ViewPreset } from "./GarageScene";

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
    parsed.showStructure = searchParams.get("showStructure") !== null ? searchParams.get("showStructure") === "true" : true;
    parsed.showCladding = searchParams.get("showCladding") !== null ? searchParams.get("showCladding") === "true" : false;
    parsed.showAccessories = searchParams.get("showAccessories") !== null ? searchParams.get("showAccessories") === "true" : false;
    parsed.showCatalogDimensions = searchParams.get("showCatalogDimensions") !== null ? searchParams.get("showCatalogDimensions") === "true" : true;
  }
  return parsed;
}

export default function Configurator({ variant }: { variant?: string } = {}) {
  const exportRef = useRef<THREE.Group | null>(null);
  const [initialUrlParams] = useState(() => getParamsFromURL());
  const [preset, setPreset] = useState<ViewPreset>("iso");
  const [removedPanels, setRemovedPanels] = useState<Record<string, boolean>>({});
  const [quoteRequestSignal, setQuoteRequestSignal] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [notes, setNotes] = useState(initialUrlParams.notes ?? "");
  const [isSummaryOpen, setIsSummaryOpen] = useState(true);
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

  const hallsConfig = getHallsConfig();
  const urlVariant = typeof window !== "undefined" ? (new URLSearchParams(window.location.search).get("variant") || new URLSearchParams(window.location.search).get("client")) : null;
  const activeVariant = variant || (urlVariant === "2" ? "variant2" : urlVariant === "3" ? "variant3" : urlVariant) || "default";
  const imageCatalog = getImageCatalog(activeVariant);
  const hallOptions = ["Vlastný", ...Object.keys(hallsConfig)];
  const [selectedHall, setSelectedHall] = useState(initialUrlParams.hallType ?? "Vlastný");
  const isCustom = selectedHall === "Vlastný";
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [showEnvironment, setShowEnvironment] = useState(false);
  const [showArModal, setShowArModal] = useState(false);
  const configWithCladding = getCatalogWithCladding(activeVariant);
  const [catalogWithCladding, setCatalogWithCladding] = useState(() => initialUrlParams.showCladding ?? configWithCladding);
  const catalogWithCladdingRef = useRef(initialUrlParams.showCladding ?? configWithCladding);
  const isApplyingRef = useRef(false);
  const applyHallTypeRef = useRef<(v: string, withCladding?: boolean) => void>(() => {});
  useEffect(() => {
    if (typeof window !== "undefined" && (!initialUrlParams.hallType || window.location.search === "")) {
      setShowPicker(true);
    }
  }, [initialUrlParams.hallType]);

  const initHall = initialUrlParams.hallType && initialUrlParams.hallType !== "Vlastný" ? hallsConfig[initialUrlParams.hallType] : null;
  const isCatalog = !!initHall;
  const [selectedPoleHeight, setSelectedPoleHeight] = useState<string>(() => initHall?.versions?.[0] ? `${initHall.versions[0].poleHeight}m` : "4m");
  const initBays = initHall ? (initHall.defaultBays ?? 5) : DEFAULT_PARAMS.bayCount;
  const initLength = initHall ? (initHall.defaultLength ?? (initBays * initHall.moduleLength)) : DEFAULT_PARAMS.length;
  const [selectedLength, setSelectedLength] = useState<number>(() => initHall ? (initHall.defaultLength ?? (initBays * initHall.moduleLength)) : (initialUrlParams.length ?? DEFAULT_PARAMS.length));
  const activeHall = selectedHall !== "Vlastný" ? hallsConfig[selectedHall] : initHall;
  const hallVersions = (activeHall?.versions ?? []) as Array<{ poleHeight: number }>;
  const hallHeightOptions = hallVersions.length > 0
    ? hallVersions.map((ver) => `${ver.poleHeight}m`)
    : ["4m", "5m", "6m", "7m"];

  const hallLengthOptions: string[] = [];
  if (activeHall) {
    const minB = Math.max(2, Math.round(activeHall.minLength / activeHall.moduleLength));
    for (let b = minB; b <= 12; b++) {
      hallLengthOptions.push(`${b * activeHall.moduleLength}m`);
    }
  } else {
    for (let b = 2; b <= 12; b++) {
      hallLengthOptions.push(`${b * 3}m`);
    }
  }

  const [params, setParams] = useControls(() => ({
    "Zobrazenie": folder({
      showStructure: { value: initialUrlParams.showStructure ?? true, label: "Konštrukcia" },
      showCladding: { value: initialUrlParams.showCladding ?? (isCatalog ? configWithCladding : DEFAULT_PARAMS.showCladding), label: "Opláštenie" },
      showAccessories: { value: initialUrlParams.showAccessories ?? (isCatalog ? configWithCladding : DEFAULT_PARAMS.showAccessories), label: "Príslušenstvo" },
      showFoundation: { value: initialUrlParams.showFoundation ?? DEFAULT_PARAMS.showFoundation, label: "Základová doska" },
      showCatalogDimensions: { value: initialUrlParams.showCatalogDimensions ?? (isCatalog ? !configWithCladding : false), label: "Kóty A-B-C" },
      wireframe: { value: initialUrlParams.wireframe ?? DEFAULT_PARAMS.wireframe, label: "Wireframe" },
      explode: { value: initialUrlParams.explode ?? DEFAULT_PARAMS.explode, min: 0, max: 1, step: 0.01, label: "Exploded view" },
    }, { collapsed: true }),
    "Geometria": folder({
      hallType: {
        value: initialUrlParams.hallType ?? "Vlastný",
        options: hallOptions,
        label: "Typ z PDF",
        onChange: (v) => {
          if (v !== selectedHall) {
            applyHallTypeRef.current(v);
          }
        },
      },
      hallHeight: {
        value: selectedPoleHeight,
        options: hallHeightOptions,
        label: "Výška stĺpa",
        disabled: isCustom,
        transient: false,
        onChange: (val) => {
          setSelectedPoleHeight(val);
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
                ? (foundVer.H4 ? foundVer.H4 - 0.15 : 2.5)
                : (foundVer.H2 ?? Math.min(3.8, foundVer.H - 0.2));
              (setParams as any)({
                clearHeight: foundVer.H,
                doorWidth: gateW,
                doorHeight: gateH,
              });
            }
          }
        },
      },
      width: {
        value: isCatalog ? initHall.width : (initialUrlParams.width ?? DEFAULT_PARAMS.width),
        min: 2.5,
        max: 20,
        step: 0.1,
        label: "Šírka X [m]",
        disabled: !isCustom,
      },
      length: {
        value: `${isCatalog ? (activeHall?.defaultLength ?? initLength) : (initialUrlParams.length ?? initLength)}m`,
        options: hallLengthOptions,
        label: "Dĺžka Y",
        disabled: false,
        onChange: (val) => {
          const num = typeof val === "number" ? val : parseFloat(String(val).replace("m", ""));
          if (!Number.isNaN(num) && selectedHall !== "Vlastný" && hallsConfig[selectedHall]) {
            const h = hallsConfig[selectedHall];
            const bays = Math.round(num / h.moduleLength);
            (setParams as any)({ bayCount: bays });
          }
        }
      },
      clearHeight: {
        value: isCatalog ? (initHall.versions?.[0]?.H ?? initHall.heights[0]) : (initialUrlParams.clearHeight ?? DEFAULT_PARAMS.clearHeight),
        min: 2.0,
        max: 7.0,
        step: 0.001,
        label: "Svetlá výška Z [m]",
        disabled: !isCustom,
      },
      roofType: {
        value: isCatalog ? (initHall.type as any) : (initialUrlParams.roofType ?? DEFAULT_PARAMS.roofType),
        options: { "Sedlová": "gable", "Pultová": "shed" },
        label: "Strecha",
        disabled: !isCustom,
      },
      roofPitchDeg: {
        value: isCatalog ? initHall.roofPitchDeg : (initialUrlParams.roofPitchDeg ?? DEFAULT_PARAMS.roofPitchDeg),
        min: 5,
        max: 35,
        step: 1,
        label: "Spád strechy [°]",
        disabled: !isCustom,
      },
    }, { collapsed: false }),
    "Konštrukcia": folder({
      bayCount: {
        value: isCatalog ? initBays : (initialUrlParams.bayCount ?? initBays),
        min: isCatalog ? Math.round(initHall.minLength / initHall.moduleLength) : 2,
        max: 15,
        step: 1,
        label: "Počet polí",
        onChange: (val) => {
          if (selectedHall !== "Vlastný" && hallsConfig[selectedHall]) {
            const h = hallsConfig[selectedHall];
            (setParams as any)({ length: val * h.moduleLength });
          }
        }
      },
      profileSize: {
        value: initialUrlParams.profileSize ?? DEFAULT_PARAMS.profileSize,
        min: 0.06,
        max: 0.20,
        step: 0.01,
        label: "Jakl strana [m]",
        disabled: !isCustom,
      },
      profileThickness: {
        value: initialUrlParams.profileThickness ?? DEFAULT_PARAMS.profileThickness,
        min: 0.002,
        max: 0.010,
        step: 0.001,
        label: "Hrúbka steny [m]",
        disabled: !isCustom,
      },
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
      personalDoorSide: { value: initialUrlParams.personalDoorSide ?? DEFAULT_PARAMS.personalDoorSide, options: { "Vľavo": "left", "Vpravo": "right", "Vzadu": "back" }, label: "Strana dverí" },
      hasWindows: { value: isCatalog ? false : (initialUrlParams.hasWindows ?? DEFAULT_PARAMS.hasWindows), label: "Okná" },
      hasSkylights: { value: isCatalog ? false : (initialUrlParams.hasSkylights ?? DEFAULT_PARAMS.hasSkylights), label: "Strešné svetlíky ☀️" },
      windowSide: { value: initialUrlParams.windowSide ?? DEFAULT_PARAMS.windowSide, options: { "Vľavo": "left", "Vpravo": "right", "Vzadu": "back" }, label: "Strana okien" },
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
  }), [selectedHall]);

  const applyHallType = (v: string, withCladding?: boolean) => {
    if (isApplyingRef.current) return;
    isApplyingRef.current = true;
    const useCladding = withCladding !== undefined ? withCladding : (catalogWithCladdingRef.current || configWithCladding);
    catalogWithCladdingRef.current = useCladding;
    setCatalogWithCladding(useCladding);
    setSelectedHall(v);
    if (useCladding) setShowPicker(false);
    try {
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

      const defaultBays = h.defaultBays ?? Math.max(2, Math.round(h.minLength / h.moduleLength));
      const defaultLen = h.defaultLength ?? (defaultBays * h.moduleLength);
      const defaultVer = h.versions?.[0];
      const defaultH = defaultVer ? defaultVer.H : h.heights[0];
      const defaultPole = defaultVer ? `${defaultVer.poleHeight}m` : "4m";
      setSelectedPoleHeight(defaultPole);
      setSelectedLength(defaultLen);
      const isShed = h.type === "shed";
      const gateW = isShed ? Math.min(3.0, h.width * 0.5) : (defaultVer?.E ?? 4.8);
      const gateH = isShed
        ? (defaultVer?.H4 ? defaultVer.H4 - 0.15 : 2.5)
        : (defaultVer?.H2 ?? Math.min(3.8, defaultH - 0.2));

      (setParams as any)({
        hallType: v,
        showStructure: true,
        showCladding: useCladding,
        showAccessories: useCladding,
        showCatalogDimensions: !useCladding,
        width: h.width,
        roofType: h.type as any,
        roofPitchDeg: h.roofPitchDeg,
        clearHeight: defaultH,
        hallHeight: defaultPole,
        length: `${defaultLen}m`,
        bayCount: defaultBays,
        profileSize: profSize,
        profileThickness: profThick,
        hasPersonalDoor: useCladding,
        hasWindows: useCladding,
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
      });
    }
  } finally {
    setTimeout(() => {
      isApplyingRef.current = false;
    }, 100);
  }
};
  applyHallTypeRef.current = applyHallType;
  if (typeof window !== "undefined") {
    (window as any).__applyHallType = applyHallType;
    (window as any).__setParams = setParams;
  }

  const cleanParams: Partial<GarageParams> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && !Number.isNaN(v)) {
      (cleanParams as any)[k] = v;
    }
  }

  let typedParams: GarageParams = { ...DEFAULT_PARAMS, ...cleanParams, notes };

  if (selectedHall && selectedHall !== "Vlastný" && hallsConfig[selectedHall]) {
    const h = hallsConfig[selectedHall];
    const poleNum = parseInt(selectedPoleHeight, 10);
    const activeVer =
      (poleNum ? h.versions?.find((v) => v.poleHeight === poleNum) : undefined) ||
      h.versions?.[0];
    const minBays = Math.max(2, Math.round(h.minLength / h.moduleLength));
    const currentLen = selectedLength > 0 ? selectedLength : (h.defaultLength ?? (h.defaultBays ? h.defaultBays * h.moduleLength : 20));
    const rawBays = Math.round(currentLen / h.moduleLength);
    const exactBays = Math.max(minBays, rawBays);
    const exactLen = exactBays * h.moduleLength;
    typedParams = {
      ...typedParams,
      hallType: selectedHall,
      width: h.width,
      roofType: h.type as any,
      roofPitchDeg: h.roofPitchDeg,
      clearHeight: activeVer ? activeVer.H : (cleanParams.clearHeight ?? h.heights[0]),
      length: exactLen,
      bayCount: exactBays,
      showStructure: cleanParams.showStructure ?? (initialUrlParams.showStructure ?? true),
      showCladding: cleanParams.showCladding !== undefined ? cleanParams.showCladding : (configWithCladding || (initialUrlParams.showCladding ?? false)),
      showAccessories: cleanParams.showAccessories !== undefined ? cleanParams.showAccessories : (configWithCladding || (initialUrlParams.showAccessories ?? false)),
      showCatalogDimensions: cleanParams.showCatalogDimensions !== undefined ? cleanParams.showCatalogDimensions : (!configWithCladding && (initialUrlParams.showCatalogDimensions ?? true)),
      hasPersonalDoor: cleanParams.hasPersonalDoor !== undefined ? cleanParams.hasPersonalDoor : configWithCladding,
      hasWindows: cleanParams.hasWindows !== undefined ? cleanParams.hasWindows : configWithCladding,
    };
  }

  if (typeof window !== "undefined") {
    (window as any).__currentTypedParams = typedParams;
    (window as any).__exportRef = exportRef;
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
      if (val === "undefined" || val === "NaN" || (key === "notes" && !val.trim())) continue;
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
          showEnvironment={showEnvironment}
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
          imageCatalog={imageCatalog}
          onSelect={(v) => {
            applyHallType(v);
            setShowPicker(false);
          }}
          onClose={() => setShowPicker(false)}
        />
      )}

      {/* Top bar */}
      <TopNavigation
        isMobile={isMobile}
        selectedHall={selectedHall}
        applyHallType={applyHallType}
        hallsConfig={hallsConfig}
        setShowPicker={setShowPicker}
        preset={preset}
        setPreset={setPreset}
        showEnvironment={showEnvironment}
        setShowEnvironment={setShowEnvironment}
        setShowArModal={setShowArModal}
        handleShare={handleShare}
        typedParams={typedParams}
      />

      <PriceCalculator p={typedParams} quoteRequestSignal={quoteRequestSignal} />

      {/* Left stacked panels container (prevents any overlapping) */}
      <div className="pointer-events-none absolute left-3.5 top-20 md:top-14 z-20 flex flex-col gap-2 w-[calc(100vw-140px)] max-w-[340px] md:w-[340px]">
        <PremiumSpecPanel
          p={typedParams}
          className="pointer-events-auto w-full rounded border border-white/10 bg-black/70 font-mono text-[11px] text-white/80 backdrop-blur shadow-lg"
        />

        {/* Hall PDF specs badge if selected */}
        {selectedHall !== "Vlastný" && hallsConfig[selectedHall] && (
          <CatalogInfoCard
            selectedHall={selectedHall}
            curHall={hallsConfig[selectedHall]}
            showHallSpecs={showHallSpecs}
            setShowHallSpecs={setShowHallSpecs}
            selectedPoleHeight={selectedPoleHeight}
            setSelectedPoleHeight={setSelectedPoleHeight}
            selectedLength={selectedLength}
            setSelectedLength={setSelectedLength}
            onSetParams={(p) => (setParams as any)(p)}
            onOpenCatalogModal={() => setShowCatalogModal(true)}
          />
        )}
      </div>

      {/* Dimensions strip */}
      <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2 max-w-[92vw] truncate rounded border border-white/10 bg-black/50 px-2 py-1 md:px-3 md:py-1.5 font-mono text-[9px] md:text-[10px] text-white/60 backdrop-blur text-center">
        {isMobile ? "Ťahanie = rotácia · Profily " + ((typedParams.profileSize ?? DEFAULT_PARAMS.profileSize) * 1000).toFixed(0) + " mm" : "Ťahanie = rotácia · Koliesko = priblíženie · Pravé tlačidlo = posun · Profily " + ((typedParams.profileSize ?? DEFAULT_PARAMS.profileSize) * 1000).toFixed(0) + "×" + ((typedParams.profileSize ?? DEFAULT_PARAMS.profileSize) * 1000).toFixed(0) + "×" + ((typedParams.profileThickness ?? DEFAULT_PARAMS.profileThickness) * 1000).toFixed(0) + " mm"}
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

        {/* Súhrn konfigurácie */}
        <div className="border-t border-white/10 bg-[#161b22]">
          <button
            type="button"
            onClick={() => setIsSummaryOpen((v) => !v)}
            className="flex w-full items-center justify-between px-3.5 py-2.5 text-xs font-mono font-bold uppercase tracking-wider text-white/90 hover:bg-white/5 transition cursor-pointer select-none"
          >
            <span className="flex items-center gap-2">
              <span className="text-[10px] text-emerald-400">{isSummaryOpen ? "▾" : "▸"}</span>
              Súhrn konfigurácie
            </span>
            <span className="text-[10px] font-normal text-emerald-400 font-mono">
              {(typedParams.width * typedParams.length).toFixed(1)} m²
            </span>
          </button>

          {isSummaryOpen && (
            <div className="p-3 pt-1 space-y-2.5 text-[11px] font-mono border-t border-white/5">
              <div className="rounded bg-black/40 p-2.5 border border-white/5 space-y-1.5 text-white/80">
                <div className="flex justify-between">
                  <span className="text-white/50">Model:</span>
                  <span className="font-bold text-emerald-400">{selectedHall !== "Vlastný" ? selectedHall : "Vlastná garáž"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Rozmery:</span>
                  <span className="text-white font-medium">{typedParams.width} × {typedParams.length} m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Svetlá výška:</span>
                  <span className="text-white font-medium">{typedParams.clearHeight} m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Strecha:</span>
                  <span className="text-white font-medium">{typedParams.roofType === "gable" ? "Sedlová" : "Pultová"} ({typedParams.roofPitchDeg}°)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Opláštenie:</span>
                  <span className="text-white font-medium">
                    {typedParams.panelType === "sandwich" ? `Sendvič ${typedParams.wallPanelThicknessMm}mm` : "Trapéz"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Brána:</span>
                  <span className="text-white font-medium">{typedParams.doorWidth} × {typedParams.doorHeight} m</span>
                </div>
                {(typedParams.hasPersonalDoor || typedParams.windowCount > 0) && (
                  <div className="flex justify-between">
                    <span className="text-white/50">Výplne:</span>
                    <span className="text-white font-medium">
                      {typedParams.hasPersonalDoor ? "Dvere" : ""}{typedParams.hasPersonalDoor && typedParams.windowCount > 0 ? " + " : ""}{typedParams.windowCount > 0 ? `${typedParams.windowCount}x okno` : ""}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block mb-1 text-[10px] text-white/60 uppercase tracking-wider font-semibold">
                  Poznámka:
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full rounded border border-white/10 bg-black/50 px-2.5 py-1.5 text-white/90 focus:border-emerald-400 focus:outline-none resize-none text-[11px]"
                  placeholder="Špecifikácia, požiadavky..."
                />
              </div>

              <button
                type="button"
                onClick={() => setQuoteRequestSignal((v) => v + 1)}
                className="w-full h-11 rounded bg-emerald-400 text-center font-bold text-black transition hover:bg-emerald-300 active:scale-[0.99] shadow-lg shadow-emerald-500/20 text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
              >
                Dopytovať cenovú ponuku
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Catalog 1:1 Reference Modal */}
      <HallCatalogModal
        isOpen={showCatalogModal}
        onClose={() => setShowCatalogModal(false)}
        selectedHall={selectedHall}
        hallsConfig={hallsConfig}
        typedParams={typedParams}
        onApplyVersion={(params) => (setParams as any)(params)}
      />
      {/* AR Modal */}
      <ArModal
        isOpen={showArModal}
        onClose={() => setShowArModal(false)}
        exportRef={exportRef}
        hallName={selectedHall}
      />
    </div>
  );
}
