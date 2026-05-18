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
  panelType: "trapezoid" | "sandwich";
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
  claddingColor: "#3a4048",
  roofColor: "#2b2f36",
  panelType: "trapezoid",
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
  showFoundation: true,
  showAccessories: true,
};
