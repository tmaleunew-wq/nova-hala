export interface RoofLoadAssumptions {
  roofKNPerM2: number;
  snowKNPerM2: number;
  skylightAreaM2: number;
  skylightNetKNPerM2: number;
  pvCoveragePercent: number;
  pvKNPerM2: number;
  ballastKNPerM2: number;
}

export function estimateRoofLoad(input: RoofLoadAssumptions & { widthM: number; lengthM: number }) {
  const { widthM, lengthM, roofKNPerM2, snowKNPerM2, skylightAreaM2, skylightNetKNPerM2, pvCoveragePercent, pvKNPerM2, ballastKNPerM2 } = input;
  const areaM2 = widthM * lengthM;
  const nonNegative = [roofKNPerM2, snowKNPerM2, skylightAreaM2, pvCoveragePercent, pvKNPerM2, ballastKNPerM2];
  if (![widthM, lengthM, areaM2].every(value => Number.isFinite(value) && value > 0)
    || !nonNegative.every(value => Number.isFinite(value) && value >= 0)
    || !Number.isFinite(skylightNetKNPerM2) || skylightNetKNPerM2 < -roofKNPerM2
    || skylightAreaM2 > areaM2 || pvCoveragePercent > 100) {
    throw new RangeError('Skontrolujte rozsahy zaťažení, plochu svetlíkov a pokrytie FV (0 až 100 %).');
  }

  const roofKN = areaM2 * roofKNPerM2;
  const snowKN = areaM2 * snowKNPerM2;
  const skylightAdditionalKN = skylightAreaM2 * skylightNetKNPerM2;
  const pvAreaM2 = areaM2 * pvCoveragePercent / 100;
  const pvAdditionalKN = pvAreaM2 * (pvKNPerM2 + ballastKNPerM2);
  const variants = [
    { id: 'roof', label: 'Samotná strecha', deadKN: roofKN },
    { id: 'skylights', label: 'Strecha + svetlíky', deadKN: roofKN + skylightAdditionalKN },
    { id: 'pv', label: 'Strecha + fotovoltika', deadKN: roofKN + pvAdditionalKN },
    { id: 'combined', label: 'Strecha + svetlíky + fotovoltika', deadKN: roofKN + skylightAdditionalKN + pvAdditionalKN },
  ].map(variant => ({ ...variant, totalKN: variant.deadKN + snowKN, meanKNPerM2: (variant.deadKN + snowKN) / areaM2 }));
  return { areaM2, snowKN, skylightAdditionalKN, pvAreaM2, pvAdditionalKN, combinedFits: pvAreaM2 + skylightAreaM2 <= areaM2, variants };
}
