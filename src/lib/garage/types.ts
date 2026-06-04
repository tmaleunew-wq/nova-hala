export type RoofType = "gable" | "shed";

export interface GarageParams {
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
  doorColor: string;         // hex – garage door + personal door
  trimmingColor: string;     // hex – corner flashings, joint flashings, gutters
  panelType: "trapezoid" | "sandwich";
  claddingOrientation: "vertical" | "horizontal";
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
  hasPersonalDoor: boolean;
  personalDoorSide: "left" | "right" | "back";
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
}

export const DEFAULT_PARAMS: GarageParams = {
  width: 4,
  length: 6,
  clearHeight: 2.6,
  roofType: "gable",
  roofPitchDeg: 15,
  bayCount: 4,
  profileSize: 0.1,
  profileThickness: 0.004,
  steelColor: "#6e7681",
  claddingColor: "#f5f5f0",
  roofColor: "#2b2f36",
  doorColor: "#3a3f47",
  trimmingColor: "#ffffff",
  panelType: "smooth",
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
  doorWidth: 2.5,
  doorHeight: 2.2,
  hasPersonalDoor: true,
  personalDoorSide: "right",
  windowCount: 1,
  windowWidth: 0.6,
  windowHeight: 0.4,
  showCladding: true,
  showStructure: true,
  wireframe: false,
  explode: 0,
  showFoundation: false,
  showAccessories: true,
};
