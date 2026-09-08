/**
 * The arithmetic behind cropping a headshot, kept out of the component so
 * it can be tested without a browser.
 *
 * The model is deliberately small: a square viewport, an image scaled by
 * some factor and offset by some amount, and a rule that the image may
 * never be dragged far enough to expose a gap. Everything the component
 * does is one of these three functions.
 */

export interface Size {
  readonly width: number;
  readonly height: number;
}

export interface CropState {
  /** Multiplier on the image's natural size. */
  readonly scale: number;
  /** Where the image's top-left sits relative to the viewport's, in pixels. */
  readonly offsetX: number;
  readonly offsetY: number;
}

/** The output is square and fixed: a headshot, not a photograph. */
export const OUTPUT_PX = 512;

/** Anything larger is a photograph nobody needs at this size. */
export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;

export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];

/**
 * The smallest scale that still fills the viewport.
 *
 * Below this a corner of the frame would be empty, and an identification
 * photograph with a white wedge across it is not one.
 */
export function minimumScale(image: Size, viewport: number): number {
  if (image.width <= 0 || image.height <= 0) return 1;
  return Math.max(viewport / image.width, viewport / image.height);
}

/**
 * Keep the image covering the viewport.
 *
 * Clamping rather than refusing: a drag that would expose a gap stops at
 * the edge, which feels like the image is held rather than like the
 * control is broken.
 */
export function clamp(state: CropState, image: Size, viewport: number): CropState {
  const scale = Math.max(state.scale, minimumScale(image, viewport));
  const scaledWidth = image.width * scale;
  const scaledHeight = image.height * scale;

  // The most the image may be moved left/up before its right/bottom edge
  // enters the frame. Negative, because the offsets themselves are.
  const minX = viewport - scaledWidth;
  const minY = viewport - scaledHeight;

  return {
    scale,
    offsetX: Math.min(0, Math.max(minX, state.offsetX)),
    offsetY: Math.min(0, Math.max(minY, state.offsetY)),
  };
}

/**
 * Zoom about the centre of the frame rather than the image's corner.
 *
 * Zooming from the corner walks the subject out of shot, which is the
 * single most annoying thing a naive cropper does.
 */
export function zoomTo(
  state: CropState,
  nextScale: number,
  image: Size,
  viewport: number,
): CropState {
  const scale = Math.max(nextScale, minimumScale(image, viewport));
  const ratio = scale / state.scale;
  const centre = viewport / 2;

  return clamp(
    {
      scale,
      offsetX: centre - (centre - state.offsetX) * ratio,
      offsetY: centre - (centre - state.offsetY) * ratio,
    },
    image,
    viewport,
  );
}

/** The state that centres an image at the smallest scale that fills the frame. */
export function initialCrop(image: Size, viewport: number): CropState {
  const scale = minimumScale(image, viewport);
  return {
    scale,
    offsetX: (viewport - image.width * scale) / 2,
    offsetY: (viewport - image.height * scale) / 2,
  };
}

/**
 * Where to draw the image on the output canvas.
 *
 * The viewport is a preview at whatever size fits the screen; the output is
 * always {@link OUTPUT_PX}. One ratio converts between them, and getting it
 * wrong is how a preview and a saved image disagree.
 */
export function outputPlacement(
  state: CropState,
  image: Size,
  viewport: number,
): { readonly x: number; readonly y: number; readonly width: number; readonly height: number } {
  const ratio = OUTPUT_PX / viewport;
  return {
    x: state.offsetX * ratio,
    y: state.offsetY * ratio,
    width: image.width * state.scale * ratio,
    height: image.height * state.scale * ratio,
  };
}

export function fileProblem(file: { readonly type: string; readonly size: number }): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return 'Choose an image — a JPEG, PNG or WebP.';
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return 'That image is larger than 12 MB. A photograph from a phone is usually well under that.';
  }
  return null;
}
