import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  MAX_UPLOAD_BYTES,
  OUTPUT_PX,
  clamp,
  fileProblem,
  initialCrop,
  minimumScale,
  outputPlacement,
  zoomTo,
} from './photo-crop.ts';

const VIEW = 280;
const landscape = { width: 1200, height: 800 };
const portrait = { width: 800, height: 1200 };

test('the smallest scale is the one that still fills the frame', () => {
  // A headshot with a white wedge across the corner is not one.
  assert.equal(minimumScale(landscape, VIEW), VIEW / 800);
  assert.equal(minimumScale(portrait, VIEW), VIEW / 800);
});

test('a degenerate image does not divide by zero', () => {
  assert.equal(minimumScale({ width: 0, height: 0 }, VIEW), 1);
});

test('an image opens centred and covering the frame', () => {
  const crop = initialCrop(landscape, VIEW);
  const scaledWidth = landscape.width * crop.scale;
  assert.ok(scaledWidth >= VIEW - 0.001);
  // Centred: the overhang is the same on both sides.
  assert.ok(Math.abs(crop.offsetX - (VIEW - scaledWidth) / 2) < 0.001);
  assert.equal(crop.offsetY, 0, 'the short edge exactly fills the frame');
});

test('dragging stops at the edge rather than exposing a gap', () => {
  const crop = initialCrop(landscape, VIEW);
  const dragged = clamp({ ...crop, offsetX: 500 }, landscape, VIEW);
  assert.equal(dragged.offsetX, 0, 'cannot pull the left edge into the frame');

  const far = clamp({ ...crop, offsetX: -99999 }, landscape, VIEW);
  const scaledWidth = landscape.width * crop.scale;
  assert.ok(Math.abs(far.offsetX - (VIEW - scaledWidth)) < 0.001);
});

test('scale can never fall below covering the frame', () => {
  const crop = clamp({ scale: 0.0001, offsetX: 0, offsetY: 0 }, landscape, VIEW);
  assert.equal(crop.scale, minimumScale(landscape, VIEW));
});

test('zooming holds the centre of the frame, not the corner', () => {
  // Zooming from the corner walks the subject out of shot, which is the
  // single most annoying thing a naive cropper does.
  const start = initialCrop(portrait, VIEW);
  const zoomed = zoomTo(start, start.scale * 2, portrait, VIEW);

  const centreBefore = (VIEW / 2 - start.offsetX) / start.scale;
  const centreAfter = (VIEW / 2 - zoomed.offsetX) / zoomed.scale;
  assert.ok(
    Math.abs(centreBefore - centreAfter) < 0.001,
    'the image point under the centre of the frame is unchanged',
  );
});

test('zooming out past the minimum is clamped, not refused', () => {
  const start = initialCrop(portrait, VIEW);
  const out = zoomTo(start, 0.01, portrait, VIEW);
  assert.equal(out.scale, minimumScale(portrait, VIEW));
});

test('the output placement scales the preview to 512 exactly', () => {
  const crop = initialCrop(landscape, VIEW);
  const placed = outputPlacement(crop, landscape, VIEW);
  const ratio = OUTPUT_PX / VIEW;

  assert.ok(Math.abs(placed.width - landscape.width * crop.scale * ratio) < 0.001);
  // The short edge fills the output exactly, as it does the preview.
  assert.ok(Math.abs(placed.height - OUTPUT_PX) < 0.001);
});

test('a preview and a saved image agree about what is in frame', () => {
  // The bug this guards: a preview at one size and an output at another,
  // with the ratio applied to one term and not the other.
  const crop = clamp(
    { ...initialCrop(landscape, VIEW), offsetX: -40, offsetY: 0 },
    landscape,
    VIEW,
  );
  const placed = outputPlacement(crop, landscape, VIEW);
  const ratio = OUTPUT_PX / VIEW;
  assert.ok(Math.abs(placed.x - crop.offsetX * ratio) < 0.001);
});

test('the file check refuses what is not an image, and what is too large', () => {
  assert.equal(fileProblem({ type: 'image/jpeg', size: 500_000 }), null);
  assert.match(fileProblem({ type: 'application/pdf', size: 10 }) ?? '', /Choose an image/);
  assert.match(
    fileProblem({ type: 'image/jpeg', size: MAX_UPLOAD_BYTES + 1 }) ?? '',
    /larger than 12 MB/,
  );
});
