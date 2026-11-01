export interface SkylightOptions {
  width: number;
  length: number;
  x: number;
  y: number;
}

type SkylightRect = { cx: number; cy: number; w: number; h: number };

export function getSkylightPanelSection(opening: SkylightRect, width: number, height: number) {
  const x0 = Math.max(-width / 2, opening.cx - opening.w / 2);
  const x1 = Math.min(width / 2, opening.cx + opening.w / 2);
  const y0 = Math.max(0, opening.cy - opening.h / 2);
  const y1 = Math.min(height, opening.cy + opening.h / 2);
  if (x1 - x0 < 0.0001 || y1 - y0 < 0.0001) return null;
  const remainder: SkylightRect[] = [];
  for (const [left, right, bottom, top] of [
    [-width / 2, x0, 0, height], [x1, width / 2, 0, height],
    [x0, x1, 0, y0], [x0, x1, y1, height],
  ]) {
    if (right - left > 0.0001 && top - bottom > 0.0001) {
      remainder.push({ cx: (left + right) / 2, cy: (bottom + top) / 2, w: right - left, h: top - bottom });
    }
  }
  const close = (a: number, b: number) => Math.abs(a - b) < 0.0001;
  return {
    hole: { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0 },
    edges: {
      left: close(x0, opening.cx - opening.w / 2),
      right: close(x1, opening.cx + opening.w / 2),
      bottom: close(y0, opening.cy - opening.h / 2),
      top: close(y1, opening.cy + opening.h / 2),
    },
    remainder,
  };
}

export function getSkylightLimits(p: { width: number; length: number; roofType: string; roofPitchDeg: number }) {
  const span = p.roofType === "gable" ? p.width / 2 : p.width;
  const angle = p.roofType === "cubic" ? 0 : (p.roofPitchDeg * Math.PI) / 180;
  return {
    maxWidth: Math.max(0.3, Math.floor((span / Math.cos(angle) - 0.4) * 10) / 10),
    maxLength: Math.max(0.3, Math.floor((p.length - 0.4) * 10) / 10),
  };
}

export function getSkylightRect(
  roof: { width: number; length: number; cx: number; cy: number },
  options: SkylightOptions,
) {
  const availableW = Math.max(0.1, roof.width - 0.4);
  const availableH = Math.max(0.1, roof.length - 0.4);
  const w = Math.min(availableW, Math.max(0.1, options.width));
  const h = Math.min(availableH, Math.max(0.1, options.length));
  const fraction = (value: number) => Math.max(0, Math.min(100, value)) / 100 - 0.5;
  return {
    cx: roof.cx + fraction(options.x) * (availableW - w),
    cy: roof.cy + fraction(options.y) * (availableH - h),
    w,
    h,
  };
}
