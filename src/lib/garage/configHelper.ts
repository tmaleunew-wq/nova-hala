import defaultConfig from "@/config/default.json";
import premiumConfig from "@/config/premium.json";

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
