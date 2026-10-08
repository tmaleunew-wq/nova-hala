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
  // structure
  bayCount: number;          // number of portal frames along length
  profileSize: number;       // jakl side [m] e.g. 0.1
  profileThickness: number;  // wall thickness [m] e.g. 0.004
  steelColor: string;        // hex
  // cladding
  claddingColor: string;     // hex
  roofColor: string;         // hex
  doorColor: string;         // hex – personal door
  sectionalDoorColor: string;// hex – garage door 1 (gate)
  sectionalDoor2Color?: string;// hex – garage door 2 (gate 2)
  trimmingColor: string;     // hex – corner flashings, joint flashings, gutters
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
  personalDoorSide: "left" | "right" | "back";
  hasWindows: boolean;
  hasSkylights: boolean;
  windowSide: "left" | "right" | "back";
  windowCount: number;
  windowWidth: number;
  windowHeight: number;
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
  // cubic attic & modular extension
  hasAttic?: boolean;
  atticHeight?: number;
  hasExtension?: boolean;
  extensionSide?: "left" | "right";
  extensionWidth?: number;
  extensionType?: "garage" | "carport" | "storage";
  extensionGateOpen?: boolean;
}

const defaultG = (defaultConfig as any)?.defaultGarage || {};

export const DEFAULT_PARAMS: GarageParams = {
  showCatalogDimensions: false,
  width: defaultG.width ?? 4,
  length: defaultG.length ?? 6,
  clearHeight: defaultG.clearHeight ?? 2.6,
  roofType: "gable",
  roofPitchDeg: 15,
  bayCount: defaultG.bayCount ?? 2,
  profileSize: 0.1,
  profileThickness: 0.004,
  steelColor: "#6e7681",
  claddingColor: "#ffffff",
  roofColor: "#2b2f36",
  doorColor: "#3a3f47",
  sectionalDoorColor: "#3a3f47",
  sectionalDoor2Color: "#3a3f47",
  trimmingColor: "#030303",
  panelType: "smooth",
  roofPanelType: "trapezoid",
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
  hasWindows: true,
  hasSkylights: false,
  windowSide: "left",
  windowCount: 1,
  windowWidth: 0.6,
  windowHeight: 0.4,
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
  extensionSide: "right",
  extensionWidth: 3.5,
  extensionType: "garage",
  extensionGateOpen: false,
};
