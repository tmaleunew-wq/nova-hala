import defaultConfig from "@/config/default.json";

export type RoofType = "gable" | "shed" | "cubic";
export const CUSTOM_HALL = "Vlastný";

export interface GarageParams {
  hallType?: string;    // napr. "KD10", "KJ6" - pre prepojenie s PDF modelmi
  // geometry [m]
  width: number;        // X
  length: number;       // Y
  clearHeight: number;  // Z (eave height)
  roofType: RoofType;
  roofPitchDeg: number; // °
  roofOverhangFront?: number; // [m] predný presah strechy
  roofOverhangBack?: number;  // [m] zadný presah strechy
  roofOverhangLeft?: number;  // [m] ľavý presah strechy
  roofOverhangRight?: number; // [m] pravý presah strechy
  // structure
  bayCount: number;          // number of portal frames along length
  profileSize: number;       // jakl side [m] e.g. 0.1
  profileThickness: number;  // wall thickness [m] e.g. 0.004
  steelColor: string;        // hex
  // cladding
  claddingColor: string;     // hex
  roofColor: string;         // hex
  doorColor: string;         // hex – personal door
  doorDecor?: "none" | "wood_oak" | "wood_walnut";
  sectionalDoorColor: string;// hex – garage door 1 (gate)
  sectionalDoor2Color?: string;// hex – garage door 2 (gate 2)
  trimmingColor: string;     // hex – corner flashings, joint flashings, gutters
  windowColor?: string;      // hex – window frame color
  panelType: "trapezoid" | "sandwich" | "smooth" | "wood_oak" | "wood_walnut";
  roofPanelType: "trapezoid" | "sandwich" | "smooth" | "tile";
  claddingOrientation: "vertical" | "horizontal";
  roofCladdingOrientation?: "vertical" | "horizontal";
  // premium sandwich spec
  insulationCore: "PIR" | "PUR" | "EPS" | "mineral";
  wallPanelThicknessMm: number;   // core thickness [mm]
  roofPanelThicknessMm: number;   // core thickness [mm]
  outerSheetMm: number;           // outer steel sheet [mm]
  innerSheetMm: number;           // inner steel sheet [mm]
  coatingType: "HDX" | "Pural" | "PVDF" | "Polyester";
  coatingThicknessUm: number;     // µm
  zincCoatingGsm: number;         // g/m²
  hiddenFastening: boolean;       // hidden joint for wall panels
  fastenerGrade: "A2" | "A4" | "carbon";
  sealingSystem: boolean;         // permanently flexible sealants + compression tapes
  flashingMatchesPanels: boolean; // system trims same finish
  // openings
  doorWidth: number;
  doorHeight: number;
  gateCount?: 1 | 2;
  gateType?: "sectional" | "upAndOver" | "doubleLeaf";
  gateDecor?: "none" | "wood_oak" | "wood_walnut";
  gate2Decor?: "none" | "wood_oak" | "wood_walnut";
  hasBackDoor?: boolean;
  hasPersonalDoor: boolean;
  personalDoorSide: "left" | "right" | "back" | "front_left" | "front_right";
  personalDoorPosition?: "front" | "back";
  personalDoorWidth?: number;
  personalDoorHeight?: number;
  personalDoorOffset?: number;
  personalDoorBay?: number;
  doorFocus?: "gate" | "personalDoor";
  hasWindows: boolean;
  hasSkylights: boolean;
  skylightWidth?: number;
  skylightLength?: number;
  skylightPositionX?: number;
  skylightPositionY?: number;
  windowSide: "left" | "right" | "back";
  windowCount: number;
  windowWidth: number;
  windowHeight: number;
  windowOffset?: number;
  windowElevation?: number;
  windowBays?: number[];
  // view
  showCladding: boolean;
  showStructure: boolean;
  wireframe: boolean;
  explode: number; // 0..1
  showFoundation: boolean;
  showAccessories: boolean;
  doorOpen: boolean;
  showCatalogDimensions?: boolean;
  notes?: string;
  slopeDirection?: "left" | "right" | "front" | "back" | "left-to-right" | "right-to-left" | string;
  hallHeight?: string | number;
  poleHeightSelect?: string;
  // cubic attic & modular extension
  hasAttic?: boolean;
  atticHeight?: number;
  hasExtension?: boolean;
  extensionSide?: "left" | "right";
  extensionWidth?: number;
  extensionType?: "garage" | "carport" | "storage";
  extensionGateOpen?: boolean;
  hasCenterColumns?: boolean;
  structureType?: "ipe" | "c_profile";
  wallMode?: "full" | "open" | "plinth";
  plinthHeight?: number;
  hasRidgeSkylight?: boolean;
  hasOfficeAnnex?: boolean;
  // HiStruct sheeting properties
  stemWallHeight?: number;
  stemWallThickness?: number;
  stemWallColor?: string;
  wallPanelWidth?: number;
  wallInnerColor?: string;
  roofInnerColor?: string;
  purlinProfile?: string;
  girtProfile?: string;
  roofPanelName?: string;
  wallPanelName?: string;
  hasStemWall?: boolean;
  wallProduction?: string;
  roofProduction?: string;
  purlinMaxSpan?: number;
  twinRoof?: boolean;
  hasCanopy?: boolean;
  canopySide?: "left" | "right";
  canopyWidth?: number;
  hasDualExtensions?: boolean;
  dualExtensionWidth?: number;
  officeAnnexFloors?: number;
  isLShape?: boolean;
}

const defaultG = (defaultConfig as any)?.defaultGarage || {};

export const DEFAULT_PARAMS: GarageParams = {
  showCatalogDimensions: false,
  width: defaultG.width ?? 4,
  length: defaultG.length ?? 6,
  clearHeight: defaultG.clearHeight ?? 2.6,
  roofType: "gable",
  roofPitchDeg: 15,
  roofOverhangFront: 0,
  roofOverhangBack: 0,
  roofOverhangLeft: 0,
  roofOverhangRight: 0,
  bayCount: defaultG.bayCount ?? 2,
  profileSize: 0.1,
  profileThickness: 0.004,
  steelColor: "#6e7681",
  claddingColor: "#ffffff",
  roofColor: "#2b2f36",
  doorColor: "#3a3f47",
  doorDecor: "none",
  sectionalDoorColor: "#3a3f47",
  sectionalDoor2Color: "#3a3f47",
  trimmingColor: "#030303",
  windowColor: "#2b2f36",
  panelType: "sandwich",
  roofPanelType: "sandwich",
  claddingOrientation: "horizontal",
  insulationCore: "PIR",
  wallPanelThicknessMm: 100,
  roofPanelThicknessMm: 120,
  outerSheetMm: 0.6,
  innerSheetMm: 0.5,
  coatingType: "HDX",
  coatingThicknessUm: 50,
  zincCoatingGsm: 275,
  hiddenFastening: true,
  fastenerGrade: "A2",
  sealingSystem: true,
  flashingMatchesPanels: true,
  doorWidth: defaultG.doorWidth ?? 2.5,
  doorHeight: defaultG.doorHeight ?? 2.2,
  gateCount: 1,
  gateType: "sectional",
  gateDecor: "none",
  gate2Decor: "none",
  hasBackDoor: false,
  hasPersonalDoor: true,
  personalDoorSide: "right",
  personalDoorPosition: "front",
  personalDoorWidth: 0.9,
  personalDoorHeight: 2.0,
  personalDoorOffset: 0,
  hasWindows: true,
  hasSkylights: false,
  skylightWidth: defaultConfig.skylightWidth,
  skylightLength: defaultConfig.skylightLength,
  skylightPositionX: defaultConfig.skylightPositionX,
  skylightPositionY: defaultConfig.skylightPositionY,
  windowSide: "left",
  windowCount: 1,
  windowWidth: 0.8,
  windowHeight: 0.6,
  windowOffset: 0,
  windowElevation: 1.7,
  showCladding: true,
  showStructure: true,
  wireframe: false,
  explode: 0,
  showFoundation: false,
  showAccessories: true,
  doorOpen: false,
  notes: "",
  hasAttic: false,
  atticHeight: 0.35,
  hasExtension: false,
  hasCenterColumns: false,
  structureType: "ipe",
  wallMode: "full",
  plinthHeight: 1.2,
  hasRidgeSkylight: false,
  hasOfficeAnnex: false,
  extensionSide: "right",
  extensionWidth: 3.5,
  extensionType: "garage",
  extensionGateOpen: false,
};

export const COLOR_MAP: Record<string, string> = {
  "#ffffff": "RAL 9010 Biela",
  "#f4f5f7": "RAL 9010 Biela",
  "#2b2f36": "RAL 7016 Antracit",
  "#3a3f47": "RAL 7016 Antracit",
  "#18181b": "RAL 9005 Čierna",
  "#030303": "RAL 9005 Čierna",
  "#000000": "RAL 9005 Čierna",
  "#9aa1ab": "RAL 9006 Strieborná",
  "#6e7681": "RAL 9006 Sivá oceľ",
  "#4a3728": "RAL 8017 Hnedá",
  "#6e2626": "RAL 3009 Tehlová",
  "#284a37": "RAL 6005 Zelená",
  "#708090": "RAL 7016 Bridlicová sivá",
  "#808080": "RAL 7004 Signálna sivá",
  "wood_oak": "Zlatý dub (drevodekor)",
  "wood_walnut": "Tmavý orech (drevodekor)",
};

export function resolveColorName(val?: string): string {
  if (!val) return "Štandardná";
  const clean = val.trim().toLowerCase();
  if (COLOR_MAP[clean]) return COLOR_MAP[clean];
  if (!clean.startsWith("#") && COLOR_MAP[`#${clean}`]) {
    return COLOR_MAP[`#${clean}`];
  }
  return val;
}
