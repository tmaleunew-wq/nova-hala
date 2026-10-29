import defaultConfig from "@/config/default.json";
import premiumConfig from "@/config/premium.json";
import variant2Config from "@/config/variant2.json";
import variant3Config from "@/config/variant3.json";
import variant4Config from "@/config/variant4.json";
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
  subtitle?: string;
  badge?: string;
  imageKey?: string;
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
  imageCatalog?: string;
  catalogWithCladding?: boolean;
  pickerLayout?: "grid" | "binary";
  gdprConsentText?: string;
  privacyPolicyUrl?: string;
  dealer?: {
    name?: string;
    address?: string;
    email?: string;
    phone?: string;
  };
}

export function getCladdingConfig(clientName?: string | null): CladdingConfig {
  const configs: Record<string, Partial<CladdingConfig>> = {
    default: defaultConfig as CladdingConfig,
    premium: premiumConfig as CladdingConfig,
    variant2: variant2Config as unknown as Partial<CladdingConfig>,
    variant3: variant3Config as unknown as Partial<CladdingConfig>,
    variant4: variant4Config as unknown as Partial<CladdingConfig>,
    "2": variant2Config as unknown as Partial<CladdingConfig>,
    "3": variant3Config as unknown as Partial<CladdingConfig>,
    "4": variant4Config as unknown as Partial<CladdingConfig>,
  };

  const client = clientName || "default";
  const selectedConfig = configs[client] || configs.default;

  return {
    ...defaultConfig,
    ...selectedConfig,
  } as CladdingConfig;
}

export function getImageCatalog(clientName?: string | null): string {
  const config = getCladdingConfig(clientName);
  return config.imageCatalog || "/catalog";
}

export function getCatalogWithCladding(clientName?: string | null): boolean {
  const config = getCladdingConfig(clientName);
  return config.catalogWithCladding ?? true;
}

export function getPickerLayout(clientName?: string | null): "grid" | "binary" {
  const config = getCladdingConfig(clientName);
  return (config.pickerLayout as any) || "grid";
}
