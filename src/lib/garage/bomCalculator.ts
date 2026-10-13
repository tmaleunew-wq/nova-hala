import type { GarageParams } from "./types";
import { ridgeHeight, highEave } from "@/components/garage/Structure";

export interface BomItem {
  id: string;
  name: string;
  category: "Oceľová konštrukcia" | "Opláštenie & krytina" | "Klampiarske prvky" | "Kotvenie & spojovací materiál" | "Výplne otvorov";
  spec: string;
  quantity: number;
  unit: "ks" | "bm" | "m²" | "kg";
  weightKg?: number;
}

export interface BomSummary {
  items: BomItem[];
  totalSteelWeightKg: number;
  totalSteelLengthBm: number;
  totalWallAreaM2: number;
  totalRoofAreaM2: number;
  totalFlashingBm: number;
  totalFastenersCount: number;
}

export function calculateGarageBom(p: GarageParams): BomSummary {
  const W = p.width;
  const L = p.length;
  const Heave = p.clearHeight;
  const Hridge = ridgeHeight(p);
  const Hhi = highEave(p);
  const frames = (p.bayCount ?? 2) + 1;

  // 1. Columns (Stĺpy)
  const leftColH = Heave;
  const rightColH = p.roofType === "shed" ? Hhi : Heave;
  const colCount = frames * 2;
  const totalColLength = frames * leftColH + frames * rightColH;
  const steelWeightKgPerMeter = 6.2; // approx 100x100x4 tube
  const colWeight = totalColLength * steelWeightKgPerMeter;

  // 2. Rafters (Priečle / Väzníky)
  let rafterCount = frames;
  let totalRafterLength = 0;
  if (p.roofType === "gable") {
    const halfW = W / 2;
    const slopeLen = Math.hypot(halfW, Hridge - Heave);
    rafterCount = frames * 2;
    totalRafterLength = frames * 2 * slopeLen;
  } else {
    const slopeLen = Math.hypot(W, Hhi - Heave);
    totalRafterLength = frames * slopeLen;
  }
  const rafterWeight = totalRafterLength * steelWeightKgPerMeter;

  // 3. Purlins & Girts (Väznice & Paždíky)
  let purlinCount = 0;
  let totalPurlinLength = 0;
  if (p.roofType === "gable") {
    const halfW = W / 2;
    const slopeLen = Math.hypot(halfW, Hridge - Heave);
    const countPerSlope = Math.max(2, Math.round(slopeLen / 0.8));
    purlinCount = 2 * (countPerSlope + 1);
    totalPurlinLength = purlinCount * L;
  } else {
    const slopeLen = Math.hypot(W, Hhi - Heave);
    purlinCount = Math.max(3, Math.round(slopeLen / 0.8)) + 1;
    totalPurlinLength = purlinCount * L;
  }

  // Girts (Paždíky v stenách)
  const heights = [0.6, 1.4, 2.2];
  let totalGirtsLength = 0;
  for (const h of heights) {
    if (h >= Heave) continue;
    const frontLen = h < (p.doorHeight ?? 2.2) ? Math.max(0, W - (p.doorWidth ?? 2.5)) : W;
    const backLen = (p.personalDoorSide === "back" && p.hasPersonalDoor && h < 2.0) ? Math.max(0, W - 0.9) : W;
    let leftLen = L;
    if (p.personalDoorSide === "left" && p.hasPersonalDoor && h < 2.0) leftLen -= 0.9;
    const winBottom = 1.6 - (p.windowHeight ?? 1.0) / 2;
    const winTop = 1.6 + (p.windowHeight ?? 1.0) / 2;
    if (h > winBottom && h < winTop && p.hasWindows) leftLen -= (p.windowCount ?? 0) * (p.windowWidth ?? 1.2);
    const rightLen = (p.personalDoorSide === "right" && p.hasPersonalDoor && h < 2.0) ? Math.max(0, L - 0.9) : L;
    totalGirtsLength += (frontLen + backLen + leftLen + rightLen);
  }

  // Eave & Ridge beams
  const totalEaveRidgeLength = 2 * L + (p.roofType === "gable" ? L : 0);
  const secondarySteelLength = totalPurlinLength + totalGirtsLength + totalEaveRidgeLength;
  const secondaryWeightPerMeter = 4.2; // lighter Z/C purlin or 60x40 tube
  const secondarySteelWeight = secondarySteelLength * secondaryWeightPerMeter;

  const totalSteelLength = totalColLength + totalRafterLength + secondarySteelLength;
  const totalSteelWeight = colWeight + rafterWeight + secondarySteelWeight;

  // 4. Cladding Areas
  const wallGrossArea = 2 * W * Heave + 2 * L * Heave;
  const gableArea = p.roofType === "gable" ? W * (Hridge - Heave) : 0;
  let roofArea = 0;
  if (p.roofType === "gable") {
    roofArea = 2 * Math.hypot(W / 2, Hridge - Heave) * L;
  } else {
    roofArea = Math.hypot(W, Hhi - Heave) * L;
  }

  // Deductions for openings
  const gateArea = ((p.gateCount ?? 1) + (p.hasBackDoor ? 1 : 0)) * (p.doorWidth ?? 2.5) * (p.doorHeight ?? 2.2);
  const personalDoorArea = p.hasPersonalDoor ? 0.9 * 2.0 : 0;
  const windowArea = p.hasWindows ? (p.windowCount ?? 0) * (p.windowWidth ?? 1.2) * (p.windowHeight ?? 1.0) : 0;
  const netWallArea = Math.max(0, wallGrossArea + gableArea - gateArea - personalDoorArea - windowArea);

  // 5. Flashings (Klampiarske prvky v bm)
  const cornerFlashingBm = 4 * Heave;
  const eaveFlashingBm = 2 * L;
  const ridgeFlashingBm = p.roofType === "gable" ? L : 0;
  const bargeboardFlashingBm = p.roofType === "gable" ? 4 * Math.hypot(W / 2, Hridge - Heave) : 2 * Math.hypot(W, Hhi - Heave);
  const totalFlashingBm = cornerFlashingBm + eaveFlashingBm + ridgeFlashingBm + bargeboardFlashingBm;

  // 6. Fasteners (Kotvy a skrutky)
  const baseAnchorsCount = frames * 2 * 2; // 2 kotvy na pätku
  const panelScrewsCount = Math.round((netWallArea + roofArea) * 5.5); // cca 5.5 ks/m²
  const totalFastenersCount = baseAnchorsCount + panelScrewsCount;

  const items: BomItem[] = [
    {
      id: "col",
      name: "Nosné oceľové stĺpy",
      category: "Oceľová konštrukcia",
      spec: `Jakov 100×100×4 mm, S235JR (${colCount} ks)`,
      quantity: Math.round(totalColLength * 10) / 10,
      unit: "bm",
      weightKg: Math.round(colWeight),
    },
    {
      id: "rafter",
      name: "Strešné priečle / väzníky",
      category: "Oceľová konštrukcia",
      spec: `Jakov 100×100×4 mm, sklon ${p.roofPitchDeg}° (${rafterCount} ks)`,
      quantity: Math.round(totalRafterLength * 10) / 10,
      unit: "bm",
      weightKg: Math.round(rafterWeight),
    },
    {
      id: "purlins_girts",
      name: "Strešné väznice a stenové paždíky",
      category: "Oceľová konštrukcia",
      spec: `Z/C profily / tenkostenný jakov (${purlinCount} línií väzníc)`,
      quantity: Math.round(secondarySteelLength * 10) / 10,
      unit: "bm",
      weightKg: Math.round(secondarySteelWeight),
    },
    {
      id: "wall_panels",
      name: "Stenové opláštenie",
      category: "Opláštenie & krytina",
      spec: p.panelType === "sandwich"
        ? `Sendvičový panel PIR ${p.wallPanelThicknessMm ?? 100} mm`
        : "Trapézový plech T-18 / T-35",
      quantity: Math.round(netWallArea * 10) / 10,
      unit: "m²",
    },
    {
      id: "roof_panels",
      name: "Strešná krytina",
      category: "Opláštenie & krytina",
      spec: p.roofPanelType === "trapezoid"
        ? "Trapézový plech T-35 s antikondenzačnou fóliou"
        : `Sendvičový panel PIR ${p.roofPanelThicknessMm ?? 100} mm`,
      quantity: Math.round(roofArea * 10) / 10,
      unit: "m²",
    },
    {
      id: "flashings",
      name: "Klampiarske lemovanie & nárožia",
      category: "Klampiarske prvky",
      spec: `Nárožia, odkvapové lišty, ${p.roofType === "gable" ? "hrebenáč, " : ""}štítové lemovky`,
      quantity: Math.round(totalFlashingBm * 10) / 10,
      unit: "bm",
    },
    {
      id: "anchors",
      name: "Kotviaci materiál pätiek",
      category: "Kotvenie & spojovací materiál",
      spec: "Oceľové chemické kotvy M16 s podložkou",
      quantity: baseAnchorsCount,
      unit: "ks",
    },
    {
      id: "screws",
      name: "Samovrtné skrutky do panelov",
      category: "Kotvenie & spojovací materiál",
      spec: "Bimetalické skrutky s tesniacou EPDM podložkou",
      quantity: panelScrewsCount,
      unit: "ks",
    },
  ];

  // Add gates / doors / windows if present
  const gateCountTotal = (p.gateCount ?? 1) + (p.hasBackDoor ? 1 : 0);
  items.push({
    id: "gates",
    name: "Garážová sekčná brána",
    category: "Výplne otvorov",
    spec: `${p.doorWidth} × ${p.doorHeight} m (${p.gateType ?? "sekčná"})`,
    quantity: gateCountTotal,
    unit: "ks",
  });

  if (p.hasPersonalDoor) {
    items.push({
      id: "personal_door",
      name: "Personálne dvere",
      category: "Výplne otvorov",
      spec: "0.9 × 2.0 m, izolované s kovaním a zámkom",
      quantity: 1,
      unit: "ks",
    });
  }

  if (p.hasWindows && (p.windowCount ?? 0) > 0) {
    items.push({
      id: "windows",
      name: "Presklenie / Okná",
      category: "Výplne otvorov",
      spec: `${p.windowWidth} × ${p.windowHeight} m, plastové izolačné dvojsklo`,
      quantity: p.windowCount ?? 0,
      unit: "ks",
    });
  }

  return {
    items,
    totalSteelWeightKg: Math.round(totalSteelWeight),
    totalSteelLengthBm: Math.round(totalSteelLength * 10) / 10,
    totalWallAreaM2: Math.round(netWallArea * 10) / 10,
    totalRoofAreaM2: Math.round(roofArea * 10) / 10,
    totalFlashingBm: Math.round(totalFlashingBm * 10) / 10,
    totalFastenersCount,
  };
}
