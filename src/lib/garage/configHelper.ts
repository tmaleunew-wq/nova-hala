import defaultConfig from "@/config/default.json";
import premiumConfig from "@/config/premium.json";
import hallsConfig from "@/config/halls.json";

export interface HallVersion {
  label: string;
  poleHeight: number;
  H: number;
  H1: number;
  H2: number;
  D: number;
  E: number;
  H3?: number;
  H4?: number;
  Dp?: number;
  Ep?: number;
}

export interface HallConfig {
  name: string;
  type: string;
  width: number;
  minLength: number;
  moduleLength: number;
  heights: number[];
  roofPitchDeg: number;
  framework?: string;
  gablePillars?: string;
  bracing?: string;
  tieRods?: string;
  steelGrade?: string;
  gableSteelGrade?: string;
  snowZone?: string;
  windZone?: string;
  claddingVersion?: string;
  defaultBays?: number;
  defaultLength?: number;
  description?: string;
  versions?: HallVersion[];
}

export const getHallsConfig = (): Record<string, HallConfig> => {
  return hallsConfig as Record<string, HallConfig>;
};

export interface CladdingConfig {
  panelType: string;
  insulationMaterial: string;
  wallCoreThickness: number;
  roofCoreThickness: number;
  sheetThicknessOuter: number;
  sheetThicknessInner: number;
  surfaceCoating: string;
  galvanization: string;
  jointType: string;
  fasteners: string;
  flashingsAndSeals: string;
  staticWarning: string;
  sandwichPricePerSqM: number;
  trapezoidPricePerSqM: number;
}

export function getCladdingConfig(clientName?: string | null): CladdingConfig {
  const configs: Record<string, Partial<CladdingConfig>> = {
    default: defaultConfig as CladdingConfig,
    premium: premiumConfig as CladdingConfig,
  };

  const client = clientName || "default";
  const selectedConfig = configs[client] || configs.default;

  return {
    ...defaultConfig,
    ...selectedConfig,
  } as CladdingConfig;
}
