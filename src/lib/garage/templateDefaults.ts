import type { Bay, Opening } from './openingSystem';
import type { GarageParams } from './types';

/**
 * Deterministic Default Openings for Standalone Building Templates
 * Provides the single source of truth for architectural doors, windows, and gates.
 */
export function getTemplateDefaultOpenings(templateId: string, p: GarageParams, bays: Bay[]): Opening[] {
  const openings: Opening[] = [];

  if (templateId === 'kancelarska_budova') {
    const halfW = p.width / 2;
    const bayCount = Math.max(2, p.bayCount || 6);
    const winW = (p.length / bayCount) * 0.875;
    const frontWinW = halfW * 0.58;

    // 1. Front Gable Wall (bays D-1, D-2, D-3)
    const bayD1 = bays.find(b => b.id === 'D-1');
    if (bayD1) {
      const x = Math.max(0.15, (bayD1.width - frontWinW) / 2);
      openings.push(
        {
          id: 'kanc-f-l1',
          bayId: bayD1.id,
          category: 'window',
          subtype: 'fixed',
          width: frontWinW,
          height: 1.0,
          x,
          y: 2.2,
          frameColor: '#2b2f36',
          fillColor: '#9bb7c7',
        },
        {
          id: 'kanc-f-l2',
          bayId: bayD1.id,
          category: 'window',
          subtype: 'fixed',
          width: frontWinW,
          height: 1.0,
          x,
          y: 5.4,
          frameColor: '#2b2f36',
          fillColor: '#9bb7c7',
        }
      );
    }

    const bayD2 = bays.find(b => b.id === 'D-2');
    if (bayD2) {
      const doorW = 1.1;
      const x = Math.max(0.15, (bayD2.width - doorW) / 2);
      openings.push({
        id: 'kanc-f-door',
        bayId: bayD2.id,
        category: 'door',
        subtype: 'glazed',
        width: doorW,
        height: 2.1,
        x,
        y: 0,
        frameColor: '#2d3139',
        fillColor: '#3a3f47',
      });
    }

    const bayD3 = bays.find(b => b.id === 'D-3');
    if (bayD3) {
      const x = Math.max(0.15, (bayD3.width - frontWinW) / 2);
      openings.push(
        {
          id: 'kanc-f-r1',
          bayId: bayD3.id,
          category: 'window',
          subtype: 'fixed',
          width: frontWinW,
          height: 1.0,
          x,
          y: 2.2,
          frameColor: '#2b2f36',
          fillColor: '#9bb7c7',
        },
        {
          id: 'kanc-f-r2',
          bayId: bayD3.id,
          category: 'window',
          subtype: 'fixed',
          width: frontWinW,
          height: 1.0,
          x,
          y: 5.4,
          frameColor: '#2b2f36',
          fillColor: '#9bb7c7',
        }
      );
    }

    // 2. Side Walls Office Windows (Bays A-1, A-2 and C-1, C-2)
    for (let idx = 0; idx < 2; idx++) {
      const bayA = bays.find(b => b.id === `A-${idx + 1}`);
      if (bayA) {
        const x = Math.max(0.15, (bayA.width - winW) / 2);
        openings.push(
          {
            id: `kw-l1-${idx}`,
            bayId: bayA.id,
            category: 'window',
            subtype: 'fixed',
            width: winW,
            height: 1.0,
            x,
            y: 2.4,
            frameColor: '#2b2f36',
            fillColor: '#9bb7c7',
          },
          {
            id: `kw-l2-${idx}`,
            bayId: bayA.id,
            category: 'window',
            subtype: 'fixed',
            width: winW,
            height: 1.0,
            x,
            y: 5.4,
            frameColor: '#2b2f36',
            fillColor: '#9bb7c7',
          }
        );
      }

      const bayC = bays.find(b => b.id === `C-${idx + 1}`);
      if (bayC) {
        const x = Math.max(0.15, (bayC.width - winW) / 2);
        openings.push(
          {
            id: `kw-r1-${idx}`,
            bayId: bayC.id,
            category: 'window',
            subtype: 'fixed',
            width: winW,
            height: 1.0,
            x,
            y: 2.4,
            frameColor: '#2b2f36',
            fillColor: '#9bb7c7',
          },
          {
            id: `kw-r2-${idx}`,
            bayId: bayC.id,
            category: 'window',
            subtype: 'fixed',
            width: winW,
            height: 1.0,
            x,
            y: 5.4,
            frameColor: '#2b2f36',
            fillColor: '#9bb7c7',
          }
        );
      }
    }

    // 3. Storage Side Personnel Door (Bay A-4)
    const bayA4 = bays.find(b => b.id === 'A-4');
    if (bayA4) {
      const doorW = 1.0;
      const x = Math.max(0.15, (bayA4.width - doorW) / 2);
      openings.push({
        id: 'kanc-side-door-3',
        bayId: bayA4.id,
        category: 'door',
        subtype: 'solid',
        width: doorW,
        height: 2.1,
        x,
        y: 0,
        frameColor: '#2d3139',
        fillColor: '#3a3f47',
      });
    }

    // 4. Storage Sectional Gate 4x4m (Bay A-5)
    const bayA5 = bays.find(b => b.id === 'A-5');
    if (bayA5) {
      const gateW = 4.0;
      const x = Math.max(0.15, (bayA5.width - gateW) / 2);
      openings.push({
        id: 'ks-gate',
        bayId: bayA5.id,
        category: 'sectional',
        subtype: 'ribbed',
        width: gateW,
        height: 4.0,
        x,
        y: 0,
        frameColor: '#2d3139',
        fillColor: '#374151',
      });
    }
  } else if (templateId === 'skladovacia_hala') {
    // Skladovacia hala: Front & Back Sectional Gates
    const bayFront = bays.find(b => b.id === 'D-1' || b.id === 'D-2');
    if (bayFront) {
      const gateW = 4.5;
      const x = Math.max(0.15, (bayFront.width - gateW) / 2);
      openings.push({
        id: 'sklad-front-gate',
        bayId: bayFront.id,
        category: 'sectional',
        subtype: 'ribbed',
        width: gateW,
        height: 4.25,
        x,
        y: 0,
        frameColor: '#2d3139',
        fillColor: '#374151',
      });
    }
    const bayBack = bays.find(b => b.id === 'B-1' || b.id === 'B-2');
    if (bayBack) {
      const gateW = 4.5;
      const x = Math.max(0.15, (bayBack.width - gateW) / 2);
      openings.push({
        id: 'sklad-back-gate',
        bayId: bayBack.id,
        category: 'sectional',
        subtype: 'ribbed',
        width: gateW,
        height: 4.25,
        x,
        y: 0,
        frameColor: '#2d3139',
        fillColor: '#374151',
      });
    }
  } else if (templateId === 'vyrobna_hala') {
    // Výrobná hala: Gates on left wall
    const bayA2 = bays.find(b => b.id === 'A-2');
    if (bayA2) {
      const gateW = 4.0;
      const x = Math.max(0.15, (bayA2.width - gateW) / 2);
      openings.push({
        id: 'prod-gate-1',
        bayId: bayA2.id,
        category: 'sectional',
        subtype: 'ribbed',
        width: gateW,
        height: 4.2,
        x,
        y: 0,
        frameColor: '#2d3139',
        fillColor: '#374151',
      });
    }
    const bayA3 = bays.find(b => b.id === 'A-3');
    if (bayA3) {
      const gateW = 4.0;
      const x = Math.max(0.15, (bayA3.width - gateW) / 2);
      openings.push({
        id: 'prod-gate-2',
        bayId: bayA3.id,
        category: 'sectional',
        subtype: 'ribbed',
        width: gateW,
        height: 4.2,
        x,
        y: 0,
        frameColor: '#2d3139',
        fillColor: '#374151',
      });
    }
  }

  return openings;
}

/**
 * Checks whether an opening ID belongs to a pre-defined architectural template default.
 */
export function isTemplateDefaultOpening(id: string): boolean {
  return (
    id.startsWith('kanc-') ||
    id.startsWith('kw-') ||
    id.startsWith('ks-') ||
    id.startsWith('prod-') ||
    id.startsWith('sklad-') ||
    id.startsWith('double-') ||
    id.startsWith('can-') ||
    id.startsWith('leans-') ||
    id.startsWith('template-')
  );
}
