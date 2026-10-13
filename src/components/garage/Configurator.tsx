import "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Grid, GizmoHelper, GizmoViewport } from "@react-three/drei";
import { toast } from "sonner";
import { useControls, folder, button } from "leva";
import { SlidersHorizontal, X } from "lucide-react";
import * as THREE from "three";
import { DEFAULT_PARAMS, CUSTOM_HALL, type GarageParams } from "@/lib/garage/types";
import { PriceCalculator } from "./PriceCalculator";
import { PremiumSpecPanel } from "./PremiumSpecPanel";
import { ProductPicker } from "./ProductPicker";
import { ArModal } from "./ArModal";
import { VariantComparisonModal } from "./VariantComparisonModal";
import { HallCatalogModal } from "./HallCatalogModal";
import { CatalogInfoCard } from "./CatalogInfoCard";
import { TopNavigation } from "./TopNavigation";
import { CustomGarageMenu } from "./CustomGarageMenu";
import { StandardHallMenu } from "./StandardHallMenu";
import { getHallsConfig, getImageCatalog, getCatalogWithCladding, getPickerLayout } from "@/lib/garage/configHelper";
import { Scene, CameraRig, type ViewPreset } from "./GarageScene";

function getParamsFromURL(): Partial<GarageParams> {
  if (typeof window === "undefined") return {};
  const searchParams = new URLSearchParams(window.location.search);
  const parsed: Partial<GarageParams> = {};
  let hallType = searchParams.get("hallType") || searchParams.get("type") || searchParams.get("product") || searchParams.get("hall") || searchParams.get("model");
  if (hallType) {
    if (hallType === "hala" || hallType === "ocelova_hala" || hallType === "ocelove_haly" || hallType === "haly" || hallType === "KD10") {
      hallType = "Hala S-10";
    } else if (hallType === "garaz" || hallType === "vlastna_garaz" || hallType === "vlastna") {
      hallType = "Vlastný";
    }
    parsed.hallType = hallType;
  }

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
      if ((key === "claddingColor" || key === "roofColor" || key === "steelColor" || key === "doorColor" || key === "sectionalDoorColor" || key === "sectionalDoor2Color" || key === "trimmingColor") && !val.startsWith("#")) {
        val = "#" + val;
      }
      parsed[key] = val as any;
    }
  }
  if (parsed.hallType && parsed.hallType !== "Vlastný" && parsed.hallType !== "vlastna_garaz") {
    const halls = getHallsConfig();
    const h = halls[parsed.hallType] || halls["Hala S-10"] || Object.values(halls)[0];
    if (h) {
      parsed.hallType = h.name || parsed.hallType;
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
  const [gateCountState, setGateCountState] = useState<number>(() => Number(initialUrlParams.gateCount) || 1);
  const [gateTypeState, setGateTypeState] = useState<string>(() => initialUrlParams.gateType ?? "sectional");
  const [hasBackDoorState, setHasBackDoorState] = useState<boolean>(() => !!initialUrlParams.hasBackDoor);
  const [gateDecorState, setGateDecorState] = useState<string>(() => initialUrlParams.gateDecor ?? "none");
  const [gate2DecorState, setGate2DecorState] = useState<string>(() => initialUrlParams.gate2Decor ?? "none");
  const [isSummaryOpen, setIsSummaryOpen] = useState(true);
  const [showControls, setShowControls] = useState(() => (typeof window !== "undefined" ? window.innerWidth >= 768 : true));
  const [showHallSpecs, setShowHallSpecs] = useState(false);
  const [showComparisonModal, setShowComparisonModal] = useState(false);

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
  const activeVariant = variant || (urlVariant === "2" ? "variant2" : urlVariant === "3" ? "variant3" : urlVariant === "4" ? "variant4" : urlVariant) || "default";
  const imageCatalog = getImageCatalog(activeVariant);
  const pickerLayout = getPickerLayout(activeVariant);
  const hallOptions = [CUSTOM_HALL, ...Object.keys(hallsConfig)];
  const [selectedHall, setSelectedHall] = useState(initialUrlParams.hallType ?? CUSTOM_HALL);
  const isCustom = selectedHall === CUSTOM_HALL || selectedHall === "vlastna_garaz";
  const [customParams, setCustomParams] = useState<Partial<GarageParams>>({});
  const [customActiveTab, setCustomActiveTab] = useState<string>("dimensions");

  const safeSetParams = (newP: Record<string, any>) => {
    try {
      const validKeys = new Set(Object.keys(paramsRef.current || {}));
      const safeP: Record<string, any> = {};
      for (const [k, v] of Object.entries(newP)) {
        if (validKeys.size === 0 || validKeys.has(k)) {
          safeP[k] = v;
        }
      }
      (setParams as any)(safeP);
    } catch (e) {
      console.warn("safeSetParams error:", e);
    }
  };

  const handleCustomSetParams = (newP: Partial<GarageParams>) => {
    setCustomParams((prev) => ({ ...prev, ...newP }));
    if (newP.gateCount !== undefined) {
      setGateCountState(Number(newP.gateCount) as 1 | 2);
    }
    if (newP.gateType !== undefined) {
      setGateTypeState(newP.gateType);
    }
    safeSetParams(newP);
  };
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [showPicker, setShowPicker] = useState(() => {
    if (typeof window === "undefined") return false;
    const sp = new URLSearchParams(window.location.search);
    return !sp.has("hallType") && !sp.has("type") && !sp.has("hall") && !sp.has("model");
  });
  const [showEnvironment, setShowEnvironment] = useState(true);
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

  const isCatalog = selectedHall !== CUSTOM_HALL && selectedHall !== "vlastna_garaz" && !!hallsConfig[selectedHall];
  const activeHall = isCatalog ? hallsConfig[selectedHall] : (initialUrlParams.hallType && initialUrlParams.hallType !== CUSTOM_HALL ? hallsConfig[initialUrlParams.hallType] : null);
  const [selectedPoleHeight, setSelectedPoleHeight] = useState<string>(() => activeHall?.versions?.[0] ? `${activeHall.versions[0].poleHeight}m` : "4m");
  const initBays = activeHall ? (activeHall.defaultBays ?? 5) : DEFAULT_PARAMS.bayCount;
  const initLength = activeHall ? (activeHall.defaultLength ?? (initBays * activeHall.moduleLength)) : DEFAULT_PARAMS.length;
  const [selectedLength, setSelectedLength] = useState<number>(() => activeHall ? (activeHall.defaultLength ?? (initBays * activeHall.moduleLength)) : (initialUrlParams.length ?? DEFAULT_PARAMS.length));
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
    for (let b = 2; b <= 10; b++) {
      hallLengthOptions.push(`${b * 3}m`);
    }
  }

  // Refy proti zastaraným hodnotám v Leva onChange callbackoch
  const paramsRef = useRef<any>({});
  const gateCountRef = useRef<number>(gateCountState);
  gateCountRef.current = gateCountState;

  const [params, setParams] = useControls(() => ({
    "Zobrazenie": folder({
      showStructure: { value: initialUrlParams.showStructure ?? true, label: "Konštrukcia" },
      showCladding: { value: initialUrlParams.showCladding ?? (isCatalog ? configWithCladding : DEFAULT_PARAMS.showCladding), label: "Opláštenie" },
      showAccessories: { value: initialUrlParams.showAccessories ?? (isCatalog ? configWithCladding : DEFAULT_PARAMS.showAccessories), label: "Príslušenstvo" },
      showFoundation: { value: initialUrlParams.showFoundation ?? DEFAULT_PARAMS.showFoundation, label: "Základová doska" },
      showCatalogDimensions: { value: initialUrlParams.showCatalogDimensions ?? (isCatalog ? !configWithCladding : false), label: "Kóty A-B-C" },
      wireframe: { value: initialUrlParams.wireframe ?? DEFAULT_PARAMS.wireframe, label: "Wireframe" },
      explode: { value: initialUrlParams.explode ?? DEFAULT_PARAMS.explode, min: 0, max: 1, step: 0.01, label: "Exploded view" },
    }, { collapsed: false }),
    "Geometria": folder({
      hallType: {
        value: selectedHall,
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
          if (selectedHall !== CUSTOM_HALL && hallsConfig[selectedHall]) {
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
              safeSetParams({
                clearHeight: foundVer.H,
                doorWidth: gateW,
                doorHeight: gateH,
              });
            }
          }
        },
      },
      width: {
        value: isCatalog && activeHall ? activeHall.width : (paramsRef.current?.width ?? initialUrlParams.width ?? DEFAULT_PARAMS.width),
        min: 2.5,
        max: 20,
        step: 0.1,
        label: "Šírka X [m]",
        disabled: !isCustom,
        transient: false,
        onChange: (wVal) => {
          if (isCustom) {
            const w = Number(wVal);
            if (w > 0) {
              const maxW = gateCountRef.current === 2 ? Math.max(1.2, (w - 0.85) / 2) : Math.max(1.5, w - 0.6);
              if (paramsRef.current?.doorWidth && paramsRef.current.doorWidth > maxW) {
                (setParams as any)({ doorWidth: Math.round(maxW * 10) / 10 });
              }
            }
          }
        },
      },
      length: {
        value: isCatalog ? `${selectedLength}m` : (paramsRef.current?.length ?? initialUrlParams.length ?? initLength),
        ...(isCatalog ? { options: hallLengthOptions } : { min: 3, max: 20, step: 0.5 }),
        label: "Dĺžka Y",
        disabled: false,
        transient: false,
        onChange: (val: any) => {
          const num = typeof val === "number" ? val : parseFloat(String(val).replace("m", ""));
          if (!Number.isNaN(num) && num > 0) {
            setSelectedLength(num);
            if (selectedHall !== CUSTOM_HALL && hallsConfig[selectedHall]) {
              const h = hallsConfig[selectedHall];
              const bays = Math.round(num / h.moduleLength);
              safeSetParams({ bayCount: bays });
            }
          }
        }
      } as any,
      clearHeight: {
        value: isCatalog && activeHall ? (activeHall.versions?.[0]?.H ?? activeHall.heights[0]) : (paramsRef.current?.clearHeight ?? initialUrlParams.clearHeight ?? DEFAULT_PARAMS.clearHeight),
        min: 2.0,
        max: 7.0,
        step: 0.001,
        label: "Svetlá výška Z [m]",
        disabled: !isCustom,
        transient: false,
        onChange: (hVal) => {
          if (isCustom) {
            const h = Number(hVal);
            if (h > 0) {
              const maxH = Math.max(1.8, h - 0.15);
              if (paramsRef.current?.doorHeight && paramsRef.current.doorHeight > maxH) {
                (setParams as any)({ doorHeight: Math.round(maxH * 10) / 10 });
              }
            }
          }
        },
      },
      roofType: {
        value: isCatalog && activeHall ? (activeHall.type as any) : (paramsRef.current?.roofType ?? initialUrlParams.roofType ?? DEFAULT_PARAMS.roofType),
        options: { "Sedlová": "gable", "Pultová": "shed", "Kubická s atikou": "cubic" },
        label: "Strecha",
        disabled: !isCustom,
      },
      roofPitchDeg: {
        value: isCatalog && activeHall ? activeHall.roofPitchDeg : (paramsRef.current?.roofPitchDeg ?? initialUrlParams.roofPitchDeg ?? DEFAULT_PARAMS.roofPitchDeg),
        min: 5,
        max: 35,
        step: 1,
        label: "Spád strechy [°]",
        disabled: !isCustom,
      },
      hasAttic: {
        value: initialUrlParams.hasAttic ?? (DEFAULT_PARAMS.hasAttic ?? false),
        label: "Atika",
        disabled: !isCustom,
      },
      atticHeight: {
        value: initialUrlParams.atticHeight ?? (DEFAULT_PARAMS.atticHeight ?? 0.35),
        min: 0.2,
        max: 0.8,
        step: 0.05,
        label: "Výška atiky [m]",
        disabled: !isCustom,
      },
    }, { collapsed: false }),
    "Konštrukcia": folder({
      bayCount: {
        value: isCatalog && activeHall ? Math.round(selectedLength / activeHall.moduleLength) : (paramsRef.current?.bayCount ?? initialUrlParams.bayCount ?? initBays),
        min: isCatalog && activeHall ? Math.round(activeHall.minLength / activeHall.moduleLength) : 2,
        max: isCatalog ? 15 : 10,
        step: 1,
        label: "Počet polí",
        transient: false,
        onChange: (val) => {
          const b = Number(val);
          if (selectedHall !== CUSTOM_HALL && hallsConfig[selectedHall]) {
            const h = hallsConfig[selectedHall];
            const newL = b * h.moduleLength;
            setSelectedLength(newL);
            safeSetParams({ length: isCatalog ? `${newL}m` : newL });
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
      panelType: { value: initialUrlParams.panelType ?? DEFAULT_PARAMS.panelType, options: { "Trapézový plech": "trapezoid", "Sendvičové panely": "sandwich", "Hladký panel": "smooth", "Zlatý dub (drevodekor)": "wood_oak", "Tmavý orech (drevodekor)": "wood_walnut" }, label: "Typ stien" },
      claddingOrientation: { value: initialUrlParams.claddingOrientation ?? DEFAULT_PARAMS.claddingOrientation, options: { "Vertikálne": "vertical", "Pozdĺžne": "horizontal" }, label: "Smer stien" },
      roofColor: { value: initialUrlParams.roofColor ?? DEFAULT_PARAMS.roofColor, label: "Strecha RAL" },
      roofPanelType: { value: initialUrlParams.roofPanelType ?? DEFAULT_PARAMS.roofPanelType, options: { "Trapézový plech": "trapezoid", "Hladký panel": "smooth", "Škridla": "tile" }, label: "Typ strechy" },
      roofCladdingOrientation: { value: initialUrlParams.roofCladdingOrientation ?? DEFAULT_PARAMS.roofCladdingOrientation, options: { "Vertikálne": "vertical", "Pozdĺžne": "horizontal" }, label: "Smer strechy" },
      sectionalDoorColor: { value: initialUrlParams.sectionalDoorColor ?? DEFAULT_PARAMS.sectionalDoorColor, label: "Brána 1 RAL" },
      sectionalDoor2Color: { value: initialUrlParams.sectionalDoor2Color ?? DEFAULT_PARAMS.sectionalDoor2Color ?? "#3a3f47", label: "Brána 2 RAL" },
      doorColor: { value: initialUrlParams.doorColor ?? DEFAULT_PARAMS.doorColor, label: "Personálne dvere RAL" },
      trimmingColor: { value: initialUrlParams.trimmingColor ?? DEFAULT_PARAMS.trimmingColor, label: "Rohy & Odkvapy RAL" },
    }, { collapsed: true }),
    "Dvere a okná": folder({
      gateCount: {
        value: isCatalog ? 1 : gateCountState,
        options: { "1 brána": 1, "2 brány (dvojgaráž)": 2 },
        label: "Počet brán",
        disabled: !isCustom,
        transient: false,
        onChange: (val) => {
          const num = Number(val);
          setGateCountState(num);
          if (num === 2 && isCustom) {
            const curW = paramsRef.current?.width ?? 4;
            const curDoorW = paramsRef.current?.doorWidth ?? 2.5;
            const requiredW = Math.max(6.0, curDoorW * 2 + 1.0);
            if (curW < requiredW) {
              (setParams as any)({
                width: requiredW,
                doorWidth: Math.min(curDoorW, Math.round(((requiredW - 1.0) / 2) * 10) / 10),
              });
            }
          }
        },
      },
      gateType: {
        value: isCatalog ? "sectional" : gateTypeState,
        options: { "Sekčná s pohonom": "sectional", "Výklopná": "upAndOver", "Dvojkrídlová": "doubleLeaf" },
        label: "Typ brány",
        disabled: !isCustom,
        transient: false,
        onChange: (val) => setGateTypeState(String(val)),
      },
      gateDecor: {
        value: isCatalog ? "none" : gateDecorState,
        options: { "Podľa RAL farby": "none", "Zlatý dub (drevodekor)": "wood_oak", "Tmavý orech (drevodekor)": "wood_walnut" },
        label: "Brána 1 drevodekor",
        disabled: !isCustom,
        transient: false,
        onChange: (val) => setGateDecorState(String(val)),
      },
      gate2Decor: {
        value: isCatalog ? "none" : gate2DecorState,
        options: { "Podľa RAL farby": "none", "Zlatý dub (drevodekor)": "wood_oak", "Tmavý orech (drevodekor)": "wood_walnut" },
        label: "Brána 2 drevodekor",
        disabled: !isCustom,
        transient: false,
        onChange: (val) => setGate2DecorState(String(val)),
      },
      doorOpen: { value: isCatalog ? false : (initialUrlParams.doorOpen ?? DEFAULT_PARAMS.doorOpen), label: "Otvoriť bránu 🔓" },
      doorWidth: {
        value: isCatalog && activeHall ? (activeHall.type === "shed" ? Math.min(3.0, activeHall.width * 0.5) : (activeHall.versions?.[0]?.E ?? 4.8)) : (paramsRef.current?.doorWidth ?? initialUrlParams.doorWidth ?? DEFAULT_PARAMS.doorWidth),
        min: 1.5,
        max: 6.0,
        step: 0.1,
        label: "Brána Š [m]",
        transient: false,
        onChange: (val) => {
          if (isCustom && paramsRef.current?.width) {
            const num = Number(val);
            const maxW = gateCountRef.current === 2 ? Math.max(1.2, (paramsRef.current.width - 0.85) / 2) : Math.max(1.5, paramsRef.current.width - 0.6);
            if (num > maxW) {
              (setParams as any)({ doorWidth: Math.round(maxW * 10) / 10 });
            }
          }
        }
      },
      doorHeight: {
        value: isCatalog && activeHall ? (activeHall.type === "shed" ? (activeHall.versions?.[0]?.H4 ? Math.min(activeHall.versions[0].H4 - 0.15, 3.2) : 2.5) : (activeHall.versions?.[0]?.H2 ? Math.min(activeHall.versions[0].H2 - 0.15, 4.8) : Math.min(3.8, (activeHall.versions?.[0]?.H ?? activeHall.heights[0]) - 0.2))) : (paramsRef.current?.doorHeight ?? initialUrlParams.doorHeight ?? DEFAULT_PARAMS.doorHeight),
        min: 1.8,
        max: 6.0,
        step: 0.1,
        label: "Brána V [m]",
        transient: false,
        onChange: (val) => {
          if (isCustom && paramsRef.current?.clearHeight) {
            const num = Number(val);
            const maxH = Math.max(1.8, paramsRef.current.clearHeight - 0.15);
            if (num > maxH) {
              (setParams as any)({ doorHeight: Math.round(maxH * 10) / 10 });
            }
          }
        }
      },
      hasBackDoor: {
        value: isCatalog ? false : hasBackDoorState,
        label: "Zadná brána (prejazd)",
        disabled: !isCustom,
        transient: false,
        onChange: (val) => setHasBackDoorState(!!val),
      },
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
    "Modulárne prepojenie": folder({
      hasExtension: { value: initialUrlParams.hasExtension ?? (DEFAULT_PARAMS.hasExtension ?? false), label: "Pripojiť modul" },
      extensionSide: { value: initialUrlParams.extensionSide ?? (DEFAULT_PARAMS.extensionSide ?? "right"), options: { "Vpravo": "right", "Vľavo": "left" }, label: "Strana pripojenia" },
      extensionWidth: { value: initialUrlParams.extensionWidth ?? (DEFAULT_PARAMS.extensionWidth ?? 3.5), min: 2.5, max: 6.0, step: 0.1, label: "Šírka modulu [m]" },
      extensionType: { value: initialUrlParams.extensionType ?? (DEFAULT_PARAMS.extensionType ?? "garage"), options: { "Druhá garáž s bránou": "garage", "Krytý prístrešok (Carport)": "carport", "Sklad / Dielňa": "storage" }, label: "Využitie modulu" },
    }, { collapsed: true }),
  }), [selectedHall]);
  paramsRef.current = params;

  const applyHallType = (v: string, withCladding?: boolean) => {
    if (isApplyingRef.current) return;
    isApplyingRef.current = true;
    const isCustomHall = v === CUSTOM_HALL || v === "Vlastný" || v === "vlastna_garaz";
    const useCladding = isCustomHall ? true : (withCladding !== undefined ? withCladding : (catalogWithCladdingRef.current || configWithCladding));
    catalogWithCladdingRef.current = useCladding;
    setCatalogWithCladding(useCladding);
    setSelectedHall(isCustomHall ? CUSTOM_HALL : v);
    setShowPicker(false);
    try {
      if (!isCustomHall && hallsConfig[v]) {
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
      const isCubic = h.type === "cubic";
      const gateW = isCubic ? Math.min(2.5, h.width - 0.8) : (isShed ? Math.min(3.0, h.width * 0.5) : (defaultVer?.E ?? 4.8));
      const gateH = isCubic ? Math.min(2.2, defaultH - 0.15) : (isShed
        ? (defaultVer?.H4 ? defaultVer.H4 - 0.15 : 2.5)
        : (defaultVer?.H2 ?? Math.min(3.8, defaultH - 0.2)));

      safeSetParams({
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
        ...(h.claddingVersion === "ZU" ? { claddingOrientation: "vertical" } : {}),
        ...(isCubic ? {
          panelType: "smooth",
          claddingColor: "#f4f5f7",
          sectionalDoorColor: "#2b2f36",
          trimmingColor: "#2b2f36",
          roofColor: "#2b2f36",
          hasAttic: true,
          atticHeight: 0.35,
        } : {})
      });
      setCustomParams({});
    } else if (isCustomHall) {
      setCustomParams({
        width: DEFAULT_PARAMS.width,
        length: DEFAULT_PARAMS.length,
        clearHeight: DEFAULT_PARAMS.clearHeight,
        roofType: DEFAULT_PARAMS.roofType,
        roofPitchDeg: DEFAULT_PARAMS.roofPitchDeg,
        bayCount: DEFAULT_PARAMS.bayCount,
        profileSize: DEFAULT_PARAMS.profileSize,
        profileThickness: DEFAULT_PARAMS.profileThickness,
        steelColor: DEFAULT_PARAMS.steelColor,
        claddingColor: DEFAULT_PARAMS.claddingColor,
        roofColor: DEFAULT_PARAMS.roofColor,
        panelType: DEFAULT_PARAMS.panelType,
        roofPanelType: DEFAULT_PARAMS.roofPanelType,
        sectionalDoorColor: DEFAULT_PARAMS.sectionalDoorColor,
        sectionalDoor2Color: DEFAULT_PARAMS.sectionalDoor2Color,
        doorColor: DEFAULT_PARAMS.doorColor,
        trimmingColor: DEFAULT_PARAMS.trimmingColor,
        gateCount: DEFAULT_PARAMS.gateCount ?? 1,
        gateType: DEFAULT_PARAMS.gateType ?? "sectional",
        gateDecor: DEFAULT_PARAMS.gateDecor ?? "none",
        gate2Decor: DEFAULT_PARAMS.gate2Decor ?? "none",
        doorWidth: DEFAULT_PARAMS.doorWidth,
        doorHeight: DEFAULT_PARAMS.doorHeight,
        doorOpen: false,
        hasBackDoor: DEFAULT_PARAMS.hasBackDoor ?? false,
        hasPersonalDoor: DEFAULT_PARAMS.hasPersonalDoor,
        hasWindows: DEFAULT_PARAMS.hasWindows,
        hasSkylights: DEFAULT_PARAMS.hasSkylights,
        hasAttic: DEFAULT_PARAMS.hasAttic ?? false,
        atticHeight: DEFAULT_PARAMS.atticHeight ?? 0.35,
        hasExtension: DEFAULT_PARAMS.hasExtension ?? false,
        extensionSide: DEFAULT_PARAMS.extensionSide ?? "right",
        extensionWidth: DEFAULT_PARAMS.extensionWidth ?? 3.5,
        extensionType: DEFAULT_PARAMS.extensionType ?? "garage",
        showStructure: true,
        showCladding: true,
        showAccessories: true,
        showCatalogDimensions: false,
      });
      setSelectedLength(DEFAULT_PARAMS.length);
      setGateCountState(DEFAULT_PARAMS.gateCount ?? 1);
      setGateTypeState(DEFAULT_PARAMS.gateType ?? "sectional");
      setGateDecorState(DEFAULT_PARAMS.gateDecor ?? "none");
      setGate2DecorState(DEFAULT_PARAMS.gate2Decor ?? "none");
      setHasBackDoorState(DEFAULT_PARAMS.hasBackDoor ?? false);
      safeSetParams({
        hallType: CUSTOM_HALL,
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
        claddingColor: DEFAULT_PARAMS.claddingColor,
        roofColor: DEFAULT_PARAMS.roofColor,
        panelType: DEFAULT_PARAMS.panelType,
        roofPanelType: DEFAULT_PARAMS.roofPanelType,
        sectionalDoorColor: DEFAULT_PARAMS.sectionalDoorColor,
        sectionalDoor2Color: DEFAULT_PARAMS.sectionalDoor2Color,
        doorColor: DEFAULT_PARAMS.doorColor,
        trimmingColor: DEFAULT_PARAMS.trimmingColor,
        gateCount: DEFAULT_PARAMS.gateCount ?? 1,
        gateType: DEFAULT_PARAMS.gateType ?? "sectional",
        gateDecor: DEFAULT_PARAMS.gateDecor ?? "none",
        gate2Decor: DEFAULT_PARAMS.gate2Decor ?? "none",
        doorWidth: DEFAULT_PARAMS.doorWidth,
        doorHeight: DEFAULT_PARAMS.doorHeight,
        doorOpen: false,
        hasBackDoor: DEFAULT_PARAMS.hasBackDoor ?? false,
        hasPersonalDoor: DEFAULT_PARAMS.hasPersonalDoor,
        hasWindows: DEFAULT_PARAMS.hasWindows,
        hasSkylights: DEFAULT_PARAMS.hasSkylights,
        hasAttic: DEFAULT_PARAMS.hasAttic ?? false,
        atticHeight: DEFAULT_PARAMS.atticHeight ?? 0.35,
        hasExtension: DEFAULT_PARAMS.hasExtension ?? false,
        extensionSide: DEFAULT_PARAMS.extensionSide ?? "right",
        extensionWidth: DEFAULT_PARAMS.extensionWidth ?? 3.5,
        extensionType: DEFAULT_PARAMS.extensionType ?? "garage",
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
  if (cleanParams.gateCount !== undefined) {
    cleanParams.gateCount = Number(cleanParams.gateCount) as 1 | 2;
  }

  const isCurrentCatalog = selectedHall !== CUSTOM_HALL && selectedHall !== "vlastna_garaz" && !!hallsConfig[selectedHall];

  let typedParams: GarageParams = {
    ...DEFAULT_PARAMS,
    ...cleanParams,
    notes,
    gateCount: (isCurrentCatalog ? 1 : gateCountState) as 1 | 2,
    gateType: (isCurrentCatalog ? "sectional" : gateTypeState) as any,
    gateDecor: (isCurrentCatalog ? "none" : gateDecorState) as any,
    gate2Decor: (isCurrentCatalog ? "none" : gate2DecorState) as any,
    sectionalDoor2Color: (cleanParams as any).sectionalDoor2Color ?? DEFAULT_PARAMS.sectionalDoor2Color,
    hasBackDoor: isCurrentCatalog ? false : hasBackDoorState,
  };

  if (isCustom) {
    typedParams = {
      ...typedParams,
      ...customParams,
      hallType: CUSTOM_HALL,
      showCatalogDimensions: false,
      showCladding: customParams.showCladding ?? (cleanParams.showCladding !== undefined ? cleanParams.showCladding : true),
      showAccessories: customParams.showAccessories ?? (cleanParams.showAccessories !== undefined ? cleanParams.showAccessories : true),
      showStructure: customParams.showStructure ?? (cleanParams.showStructure !== undefined ? cleanParams.showStructure : true),
      gateCount: gateCountState as 1 | 2,
      gateType: gateTypeState as any,
      gateDecor: gateDecorState as any,
      gate2Decor: gate2DecorState as any,
      hasBackDoor: hasBackDoorState,
    };
  }

  const numL = typeof typedParams.length === "number" ? typedParams.length : parseFloat(String(typedParams.length).replace("m", ""));
  typedParams.length = Number.isFinite(numL) && numL > 0 ? numL : DEFAULT_PARAMS.length;
  typedParams.width = Number(typedParams.width) || DEFAULT_PARAMS.width;
  typedParams.clearHeight = Number(typedParams.clearHeight) || DEFAULT_PARAMS.clearHeight;
  typedParams.bayCount = isCustom
    ? Math.max(2, Math.round(typedParams.length / 3))
    : Math.max(2, Math.round(cleanParams.bayCount || (typedParams.length / 3)));

  if (selectedHall && selectedHall !== CUSTOM_HALL && hallsConfig[selectedHall]) {
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
      ...customParams,
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

  // Fyzikálne limity: šírka a výška brány nesmú presiahnuť rozmery samotnej garáže
  const maxSafeGateHeight = Math.max(1.8, (typedParams.clearHeight ?? 2.6) - 0.15);
  const isDoubleGates = (typedParams.gateCount ?? 1) === 2;
  const maxSafeGateWidth = isDoubleGates
    ? Math.max(1.2, ((typedParams.width ?? 4) - 0.85) / 2)
    : Math.max(1.5, (typedParams.width ?? 4) - 0.6);

  typedParams.doorHeight = Math.min(typedParams.doorHeight, maxSafeGateHeight);
  typedParams.doorWidth = Math.min(typedParams.doorWidth, maxSafeGateWidth);

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
    if (showPicker) return;
    const currentParams = new URLSearchParams(window.location.search);
    const client = currentParams.get("client");
    const variantParam = currentParams.get("variant");
    const cadParam = currentParams.get("cad");
    const adminParam = currentParams.get("admin");
    if (cadParam === "1" || adminParam === "1") {
      sessionStorage.setItem("ssf_cad_export", "true");
    } else {
      sessionStorage.removeItem("ssf_cad_export");
    }

    const searchParams = new URLSearchParams();
    if (selectedHall) {
      searchParams.set("hallType", selectedHall);
    }
    const keys = Object.keys(DEFAULT_PARAMS) as (keyof GarageParams)[];
    for (const key of keys) {
      const rawVal = typedParams[key];
      if (rawVal === undefined || rawVal === null || Number.isNaN(rawVal as any)) continue;
      let val = String(rawVal);
      if (val === "undefined" || val === "NaN" || (key === "notes" && !val.trim())) continue;
      if ((key === "claddingColor" || key === "roofColor" || key === "steelColor" || key === "doorColor" || key === "sectionalDoorColor" || key === "sectionalDoor2Color" || key === "trimmingColor") && val.startsWith("#")) {
        val = val.substring(1);
      }
      searchParams.set(key, val);
    }
    if (client) {
      searchParams.set("client", client);
    }
    if (variantParam) {
      searchParams.set("variant", variantParam);
    }
    if (cadParam) {
      searchParams.set("cad", cadParam);
    }
    if (adminParam) {
      searchParams.set("admin", adminParam);
    }
    const newRelativePathQuery = window.location.pathname + "?" + searchParams.toString();
    window.history.replaceState(null, "", newRelativePathQuery);
  }, [typedParams, selectedHall, showPicker]);

  const handleShare = () => {
    if (typeof window === "undefined") return;
    navigator.clipboard.writeText(window.location.href);
    toast.success("Odkaz na konfiguráciu bol skopírovaný do schránky!");
  };

  return (
    <div className="relative h-screen w-screen bg-[oklch(0.16_0.01_240)] select-none overflow-hidden">
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [10, 8, -10], fov: 35, near: 0.4, far: 350 }}
        gl={{ antialias: true, preserveDrawingBuffer: true, powerPreference: "high-performance" }}
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
          isCustom={isCustom}
        />
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.08}
          target={[0, typedParams.clearHeight / 2, 0]}
          maxPolarAngle={Math.PI / 2 - 0.02}
        />
        <CameraRig preset={preset} params={typedParams} focusTab={customActiveTab} />
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
          pickerLayout={pickerLayout}
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
      {!showPicker && (
        <button
          onClick={() => setShowControls(v => !v)}
          className={`absolute right-2 md:right-3 top-16 md:top-14 z-30 flex items-center gap-1 md:gap-1.5 rounded-full px-2.5 py-1.5 md:px-3 md:py-2 text-[11px] md:text-xs font-mono font-bold shadow-lg transition-all active:scale-95 cursor-pointer ${
            isCustom
              ? "bg-emerald-400 text-slate-900 hover:bg-emerald-300 shadow-emerald-500/20"
              : "bg-cyan-400 text-slate-950 hover:bg-cyan-300 shadow-cyan-500/20"
          }`}
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
      )}

      {/* Dynamic Main Menu / Sidebar based on selected product type */}
      {isCustom || selectedHall === "vlastna_garaz" ? (
        <CustomGarageMenu
          showControls={!showPicker && showControls}
          typedParams={typedParams}
          setParams={handleCustomSetParams}
          selectedHall={selectedHall}
          notes={notes}
          setNotes={setNotes}
          isSummaryOpen={isSummaryOpen}
          setIsSummaryOpen={setIsSummaryOpen}
          setQuoteRequestSignal={setQuoteRequestSignal}
          activeTab={customActiveTab}
          onTabChange={setCustomActiveTab}
          onOpenComparison={() => setShowComparisonModal(true)}
        />
      ) : (
        <StandardHallMenu
          showControls={!showPicker && showControls}
          typedParams={typedParams}
          setParams={handleCustomSetParams}
          selectedHall={selectedHall}
          notes={notes}
          setNotes={setNotes}
          isSummaryOpen={isSummaryOpen}
          setIsSummaryOpen={setIsSummaryOpen}
          setQuoteRequestSignal={setQuoteRequestSignal}
          onToggleCladding={() => (setParams as any)({ showCladding: !typedParams.showCladding })}
          activeTab={customActiveTab}
          onTabChange={setCustomActiveTab}
          onOpenComparison={() => setShowComparisonModal(true)}
          hallsConfig={hallsConfig}
          selectedPoleHeight={selectedPoleHeight}
          setSelectedPoleHeight={setSelectedPoleHeight}
          selectedLength={selectedLength}
          setSelectedLength={setSelectedLength}
        />
      )}

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
      {/* Variant Comparison Modal */}
      <VariantComparisonModal
        isOpen={showComparisonModal}
        onClose={() => setShowComparisonModal(false)}
        currentParams={typedParams}
        currentHall={selectedHall}
        onApplyVariant={(params) => (setParams as any)(params)}
      />
    </div>
  );
}
