import { test } from "node:test";
import assert from "node:assert/strict";
import { getSkylightLimits, getSkylightRect, getSkylightPanelSection } from "./skylights.ts";

test("a skylight crossing a roof seam has no panel strip or extra cross frame", () => {
  const first = getSkylightPanelSection({ cx: 0, cy: 5, w: 1.2, h: 3 }, 5, 5)!;
  const next = getSkylightPanelSection({ cx: 0, cy: 0, w: 1.2, h: 3 }, 5, 5)!;
  assert.equal(first.hole.cy + first.hole.h / 2, 5);
  assert.equal(next.hole.cy - next.hole.h / 2, 0);
  assert.equal(first.edges.top, false);
  assert.equal(next.edges.bottom, false);
  assert.equal(first.edges.bottom, true);
  assert.equal(next.edges.top, true);
  const area = first.remainder.reduce((sum, r) => sum + r.w * r.h, 0);
  assert.ok(Math.abs(area + first.hole.w * first.hole.h - 25) < 1e-9);
});

test("cubic roof module seams do not add longitudinal skylight frames", () => {
  const section = getSkylightPanelSection({ cx: 0, cy: 4, w: 2, h: 3 }, 1, 8)!;
  assert.equal(section.hole.w, 1);
  assert.equal(section.edges.left, false);
  assert.equal(section.edges.right, false);
  assert.equal(section.remainder.length, 2);
  assert.equal(getSkylightPanelSection({ cx: 9, cy: 4, w: 1, h: 1 }, 1, 8), null);
});

test("skylight moves between safe roof edges and clamps oversized dimensions", () => {
  const roof = { width: 5, length: 10, cx: 0, cy: 5 };
  const start = getSkylightRect(roof, { width: 1, length: 2, x: 0, y: 0 });
  const end = getSkylightRect(roof, { width: 1, length: 2, x: 100, y: 100 });
  assert.ok(start.cx - start.w / 2 >= -2.3 - 1e-9);
  assert.ok(start.cy - start.h / 2 >= 0.2 - 1e-9);
  assert.ok(end.cx + end.w / 2 <= 2.3 + 1e-9);
  assert.ok(end.cy + end.h / 2 <= 9.8 + 1e-9);
  assert.ok(end.cx > start.cx && end.cy > start.cy);
  const large = getSkylightRect(roof, { width: 50, length: 50, x: 500, y: -100 });
  assert.equal(large.w, 4.6);
  assert.equal(large.h, 9.6);
});

test("roof panel offsets preserve a single continuous opening across bays", () => {
  const options = { width: 1.2, length: 6, x: 50, y: 50 };
  const first = getSkylightRect({ width: 5, length: 10, cx: 0, cy: 5 }, options);
  const next = getSkylightRect({ width: 5, length: 10, cx: 0, cy: 0 }, options);
  assert.equal(first.cy - next.cy, 5);
  assert.equal(first.h, next.h);
});

test("dimension limits follow roof type and shrinking hall dimensions", () => {
  const hall = { width: 10, length: 20, roofType: "gable", roofPitchDeg: 15 };
  const gable = getSkylightLimits(hall);
  const shed = getSkylightLimits({ ...hall, roofType: "shed" });
  const cubic = getSkylightLimits({ ...hall, roofType: "cubic" });
  assert.ok(shed.maxWidth > gable.maxWidth);
  assert.equal(cubic.maxWidth, 9.6);
  assert.equal(gable.maxLength, 19.6);
  const small = getSkylightLimits({ ...hall, width: 3, length: 4 });
  assert.ok(small.maxWidth < gable.maxWidth);
  assert.equal(small.maxLength, 3.6);
});
