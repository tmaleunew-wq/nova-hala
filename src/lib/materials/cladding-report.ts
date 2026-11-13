import openingCatalog from '../../config/openingsCatalog.json' with { type: 'json' };
import { resolveColorName } from '../garage/types';
import { buildBays, splitBayPanels, type Opening, type Rect } from '../garage/openingSystem';
import { DEFAULT_MATERIAL_CATALOG, type MaterialCatalog } from './catalog';
import { calculateMaterialGeometry } from './geometry';
import type { MaterialGeometry, MaterialSurface } from './geometry';
import type { HallMaterialProject } from './project';

const faces = [
  ['front', 'Predný štít'], ['right', 'Pravá stena'], ['back', 'Zadný štít'], ['left', 'Ľavá stena'],
  ['roof-left', 'Ľavá strešná rovina'], ['roof-right', 'Pravá strešná rovina'],
] as const;

const sum = <T>(items: readonly T[], value: (item: T) => number) =>
  items.reduce((total, item) => total + value(item), 0);
const colorName = (value?: string) => {
  const name = resolveColorName(value);
  const code = name.match(/\bRAL\s*(\d{4})\b/i)?.[1];
  return code ? 'RAL ' + code : openingCatalog.palette.find(item => item.hex === value?.trim().toLowerCase())?.name ?? name;
};

export interface CladdingPanel {
  product: string;
  color: string;
  length: number;
  pieceArea: number;
  count: number;
  area: number;
  unitPrice: number | null;
  price: number | null;
}

export function buildCladdingReport(project: HallMaterialProject, model: MaterialGeometry, openings: Opening[], catalog: MaterialCatalog) {
  const { params } = project;
  const estimatedProducts = new Map<string, string>();
  const estimate = catalog.claddingEstimate ?? DEFAULT_MATERIAL_CATALOG.claddingEstimate;
  // An unselected manufacturer must not erase the configured cladding from the report.
  for (const kind of ['wall', 'roof'] as const) {
    const selected = kind === 'wall' ? project.materialSettings?.wallProductId : project.materialSettings?.roofProductId;
    const missing = model.surfaces.filter(surface => surface.kind === kind && !surface.strips.length && surface.netAreaM2 > 1e-8);
    if (selected || !estimate || !missing.length) continue;
    const productId = `estimate-${kind}`;
    const type = kind === 'wall' ? params.panelType : params.roofPanelType;
    const thickness = kind === 'wall' ? params.wallPanelThicknessMm : params.roofPanelThicknessMm;
    const names: Record<string, string> = { sandwich: 'Sendvičový panel', trapezoid: 'Trapézový plech', smooth: 'Hladké opláštenie', tile: 'Strešná krytina', wood_oak: 'Opláštenie dub', wood_walnut: 'Opláštenie orech' };
    const label = (names[type] ?? 'Opláštenie') + (type === 'sandwich' ? ` ${params.insulationCore ?? ''}${thickness ? ` ${thickness} mm` : ''}` : '');
    estimatedProducts.set(productId, label + ' · orientačný rozpis');
    const calculated = calculateMaterialGeometry(params, openings, { templateId: project.templateId,
      claddingReportEnvelope: true, [kind === 'wall' ? 'wallPanel' : 'roofPanel']: { ...estimate, productId } });
    const missingIds = new Set(missing.map(surface => surface.id));
    model = { ...model, surfaces: model.surfaces.map(surface => missingIds.has(surface.id)
      ? { ...surface, strips: calculated.surfaces.find(item => item.id === surface.id)?.strips ?? [] } : surface) };
  }

  const products = new Map(catalog.panels.map(panel => [panel.id, panel]));
  const bays = new Map((model.surfaces.length ? buildBays(params) : []).map(bay => [bay.id, bay]));
  const detailedOpenings = openings.flatMap(opening => {
    const bay = bays.get(opening.bayId);
    return bay ? [{ ...opening, faceId: bay.roof && params.roofType === 'shed' && !params.twinRoof && !params.hasAttic ? 'roof-left' : bay.surface, area: opening.width * opening.height }] : [];
  });

  function groupPanels(surfaces: MaterialSurface[]): CladdingPanel[] {
    const groups = new Map<string, CladdingPanel>();
    for (const surface of surfaces) {
      const color = colorName(surface.kind === 'wall' ? params.claddingColor : params.roofColor);
      for (const strip of surface.strips) {
        const product = products.get(strip.productId ?? '');
        const label = product ? `${product.manufacturer} · ${product.name} · ${product.core}${product.thicknessMm == null ? '' : ` ${product.thicknessMm} mm`}` : estimatedProducts.get(strip.productId ?? '') ?? strip.productId ?? 'Neurčený';
        const key = JSON.stringify([surface.kind, strip.productId, color, strip.orderLengthM.toFixed(6)]);
        const group = groups.get(key) ?? { product: label, color, length: strip.orderLengthM,
          pieceArea: strip.orderedAreaM2, count: 0, area: 0, unitPrice: product?.unitPricePerM2Eur ?? null, price: null };
        group.count += 1;
        group.area += strip.orderedAreaM2;
        group.price = group.unitPrice == null ? null : group.area * group.unitPrice;
        groups.set(key, group);
      }
    }
    return [...groups.values()].sort((a, b) => a.product.localeCompare(b.product, 'sk') ||
      a.color.localeCompare(b.color, 'sk') || a.length - b.length);
  }

  const singleRoof = model.surfaces.filter(surface => surface.kind === 'roof').length === 1;
  const sections = faces.flatMap(([id, name]) => {
    const surfaces = model.surfaces.filter(surface => surface.id.split(':')[0] === id);
    if (!surfaces.length) return [];
    const roof = surfaces[0].kind === 'roof';
    const width = id === 'left' || id === 'right' ? params.length : params.width;
    const base = roof ? 0 : Math.min(...surfaces.flatMap(surface => surface.polygon.map(([, y]) => y)));
    const openingsOnFace = detailedOpenings.filter(opening => opening.faceId === id);
    const holes: Rect[] = openingsOnFace.map(opening => {
      const bay = bays.get(opening.bayId)!;
      const [x, , z] = bay.position3D;
      const center = id === 'left' ? width / 2 + z : id === 'right' ? width / 2 - z :
        id === 'front' ? width / 2 - x : width / 2 + x;
      return { ...opening, x: center - bay.width / 2 + opening.x };
    });
    const stemPieces = base > 0 ? splitBayPanels(width, base, holes) : [];
    const stemArea = sum(stemPieces, piece => piece.width * piece.height);
    const thickness = params.stemWallThickness ?? 0.1;
    const volume = stemArea * thickness;
    const unitPrice = catalog.stemWallUnitPricePerM3Eur ?? null;
    const stem = base > 0 ? {
      length: sum(stemPieces.filter(piece => piece.y < 1e-6), piece => piece.width),
      height: base, thickness, area: stemArea, volume, pieces: stemPieces,
      color: colorName(params.stemWallColor ?? '#a5a5a5'), unitPrice,
      price: unitPrice == null ? null : volume * unitPrice,
    } : null;
    return [{ id, name: roof && singleRoof ? 'Strecha A' : name, roof, surfaces, stem, openings: openingsOnFace,
      gross: sum(surfaces, surface => surface.grossAreaM2),
      holes: sum(surfaces, surface => surface.openingAreaM2),
      net: sum(surfaces, surface => surface.netAreaM2),
      ordered: surfaces.every(surface => surface.strips.length || surface.netAreaM2 < 1e-8)
        ? sum(surfaces, surface => sum(surface.strips, strip => strip.orderedAreaM2)) : null,
      panels: groupPanels(surfaces),
    }];
  });

  return {
    title: project.name ?? project.templateId, projectId: project.id, params, faces: sections,
    panels: groupPanels(model.surfaces), openings: detailedOpenings,
    notes: [...model.limitations.filter(note => !note.startsWith('Oceľ:') &&
      !(estimatedProducts.has('estimate-wall') && note.startsWith('Výrobný rozpis stien chýba:')) &&
      !(estimatedProducts.has('estimate-roof') && note.startsWith('Výrobný rozpis strechy chýba:'))),
      ...(estimatedProducts.size ? [`Orientačný rozpis bez zvoleného výrobcu: krycia šírka ${estimate!.coverWidthM} m, dĺžky ${estimate!.minLengthM} až ${estimate!.maxLengthM} m podľa konfigurácie katalógu. Pred objednaním vyberte konkrétny výrobok; rozmery a počty sa prepočítajú podľa jeho výrobných limitov.`] : []), 'Výkaz vychádza z modelu opláštenia hlavnej lode. Objednávacie množstvá sú orientačné.',
      'Plocha otvorov v súhrne zohľadňuje prekrytie a orezanie podľa obálky. Rozpis uvádza rozmery jednotlivých otvorov.'],
  };
}

export type CladdingReport = ReturnType<typeof buildCladdingReport>;
