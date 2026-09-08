'use client';

import { useActionState, useCallback, useEffect, useRef, useState, useTransition } from 'react';

import { IDLE_FORM } from '../../../../web/form-result.ts';
import {
  ACCEPTED_TYPES,
  OUTPUT_PX,
  clamp,
  fileProblem,
  initialCrop,
  minimumScale,
  outputPlacement,
  type CropState,
  type Size,
} from '../../../../web/photo-crop.ts';
import { FormNotice } from '../../_components/FormNotice.tsx';
import { removePhotographAction, uploadPhotographAction } from './photo-actions.ts';

const VIEWPORT = 280;

/**
 * Choose a photograph, frame it, save it.
 *
 * Hand-drawn on a canvas rather than pulled from a cropping library, for
 * two reasons. A square headshot with drag-to-pan and a zoom slider is a
 * few dozen lines of arithmetic, all of which lives in `src/web/photo-crop`
 * and is unit-tested without a browser. And the canvas step is not
 * incidental: re-encoding is what removes the camera metadata — very often
 * including GPS coordinates — that a phone attaches to every photograph.
 * The file the user chose never leaves their machine.
 */
export function PhotoCropper({
  registrationId,
  personId,
  currentUrl,
  currentPath,
  playerName,
}: {
  readonly registrationId: string;
  readonly personId: string;
  readonly currentUrl: string | null;
  readonly currentPath: string | null;
  readonly playerName: string;
}) {
  const [state, formAction] = useActionState(uploadPhotographAction, IDLE_FORM);
  const [removeState, removeAction] = useActionState(removePhotographAction, IDLE_FORM);
  const [pending, startTransition] = useTransition();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<{ x: number; y: number } | null>(null);

  const [natural, setNatural] = useState<Size | null>(null);
  const [crop, setCrop] = useState<CropState | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  // Revoking the object URL matters here: these are photographs of
  // children, and leaving them reachable in the tab for the session is
  // avoidable.
  useEffect(() => {
    return () => {
      if (objectUrl !== null) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (canvas === null || image === null || crop === null || natural === null) return;

    const ctx = canvas.getContext('2d');
    if (ctx === null) return;

    ctx.clearRect(0, 0, VIEWPORT, VIEWPORT);
    ctx.drawImage(
      image,
      crop.offsetX,
      crop.offsetY,
      natural.width * crop.scale,
      natural.height * crop.scale,
    );
  }, [crop, natural]);

  useEffect(draw, [draw]);

  function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file === undefined) return;

    const bad = fileProblem(file);
    if (bad !== null) {
      setProblem(bad);
      return;
    }
    setProblem(null);

    const url = URL.createObjectURL(file);
    setObjectUrl(url);

    const image = new Image();
    image.onload = () => {
      imageRef.current = image;
      const size = { width: image.naturalWidth, height: image.naturalHeight };
      setNatural(size);
      setCrop(initialCrop(size, VIEWPORT));
    };
    image.onerror = () => setProblem('That file could not be read as an image.');
    image.src = url;
  }

  function nudge(dx: number, dy: number) {
    if (crop === null || natural === null) return;
    setCrop(clamp({ ...crop, offsetX: crop.offsetX + dx, offsetY: crop.offsetY + dy }, natural, VIEWPORT));
  }

  function onPointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    if (crop === null) return;
    dragRef.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    const start = dragRef.current;
    if (start === null || crop === null || natural === null) return;
    setCrop(
      clamp(
        {
          ...crop,
          offsetX: crop.offsetX + (event.clientX - start.x),
          offsetY: crop.offsetY + (event.clientY - start.y),
        },
        natural,
        VIEWPORT,
      ),
    );
    dragRef.current = { x: event.clientX, y: event.clientY };
  }

  function onPointerUp(event: React.PointerEvent<HTMLCanvasElement>) {
    dragRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function save() {
    const image = imageRef.current;
    if (image === null || crop === null || natural === null) return;

    const out = document.createElement('canvas');
    out.width = OUTPUT_PX;
    out.height = OUTPUT_PX;
    const ctx = out.getContext('2d');
    if (ctx === null) return;

    // White behind, so a transparent PNG does not become a black square
    // once it is flattened into JPEG.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, OUTPUT_PX, OUTPUT_PX);

    const placed = outputPlacement(crop, natural, VIEWPORT);
    ctx.drawImage(image, placed.x, placed.y, placed.width, placed.height);

    out.toBlob(
      (blob) => {
        if (blob === null) {
          setProblem('The image could not be prepared. Try a different photo.');
          return;
        }
        const data = new FormData();
        data.set('registrationId', registrationId);
        data.set('personId', personId);
        data.set('photo', new File([blob], 'headshot.jpg', { type: 'image/jpeg' }));
        startTransition(() => formAction(data));
      },
      'image/jpeg',
      0.85,
    );
  }

  const zoomMin = natural === null ? 1 : minimumScale(natural, VIEWPORT);

  return (
    <details className="process-detail">
      <summary>{currentUrl === null ? 'Add a photograph' : 'Replace the photograph'}</summary>

      <div className="stack" style={{ marginTop: '0.75rem' }}>
        <FormNotice result={state} />
        <FormNotice result={removeState} />
        {problem !== null && (
          <div className="errors" role="alert">
            <strong>{problem}</strong>
          </div>
        )}

        <p className="hint" style={{ margin: 0 }}>
          Held only for <strong>identification</strong>, and only where the family has consented
          to one (BR56). The picture is cropped in your browser and re-saved before it is
          uploaded, so the original file &mdash; and the location data a phone attaches to it
          &mdash; never leaves this device.
        </p>

        <div className="field">
          <label htmlFor="photoFile">Choose a photo</label>
          <input
            id="photoFile"
            type="file"
            accept={ACCEPTED_TYPES.join(',')}
            onChange={onFile}
          />
        </div>

        {crop !== null && natural !== null && (
          <>
            <div className="crop-stage">
              <canvas
                ref={canvasRef}
                width={VIEWPORT}
                height={VIEWPORT}
                className="crop-canvas"
                role="img"
                aria-label={`Framing the photograph of ${playerName}. Drag to move, or use the arrow keys.`}
                tabIndex={0}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onKeyDown={(e) => {
                  const step = e.shiftKey ? 20 : 5;
                  if (e.key === 'ArrowLeft') { e.preventDefault(); nudge(step, 0); }
                  if (e.key === 'ArrowRight') { e.preventDefault(); nudge(-step, 0); }
                  if (e.key === 'ArrowUp') { e.preventDefault(); nudge(0, step); }
                  if (e.key === 'ArrowDown') { e.preventDefault(); nudge(0, -step); }
                }}
              />
            </div>

            <div className="field">
              <label htmlFor="zoom">Zoom</label>
              <input
                id="zoom"
                type="range"
                min={zoomMin}
                max={zoomMin * 4}
                step={zoomMin / 100}
                value={crop.scale}
                onChange={(e) =>
                  setCrop(
                    clamp(
                      { ...crop, scale: Number(e.target.value) },
                      natural,
                      VIEWPORT,
                    ),
                  )
                }
              />
              <p className="hint" style={{ margin: '0.2rem 0 0' }}>
                Drag the picture to move it, or focus it and use the arrow keys. Saved as a
                square, {OUTPUT_PX}&thinsp;&times;&thinsp;{OUTPUT_PX}.
              </p>
            </div>

            <div>
              <button type="button" onClick={save} disabled={pending}>
                {pending ? 'Saving…' : 'Save photograph'}
              </button>
            </div>
          </>
        )}

        {currentPath !== null && (
          <form action={removeAction}>
            <input type="hidden" name="registrationId" value={registrationId} />
            <input type="hidden" name="personId" value={personId} />
            <input type="hidden" name="path" value={currentPath} />
            <button type="submit" className="secondary">
              Remove the photograph
            </button>
            <p className="hint" style={{ margin: '0.3rem 0 0' }}>
              Always available. A consent withdrawn, or an erasure honoured, must never be
              blocked by the record it applies to.
            </p>
          </form>
        )}
      </div>
    </details>
  );
}
