/**
 * Shrink photos in the BROWSER before upload, so the Worker never touches image
 * bytes and Storage stays small. Output is WebP where the browser can encode it
 * (Chrome, Android, Firefox), otherwise JPEG — or PNG when transparency matters.
 */

export interface CompressOptions {
  maxWidth: number;
  maxHeight: number;
  /** Pad the photo to this width/height ratio (0.8 = 4:5) so overlays line up. */
  aspect?: number;
  /** Keep transparency (badges). Otherwise the padding is filled with the photo's corner colour. */
  keepAlpha?: boolean;
  quality?: number;
}

export const PRODUCT_PHOTO: CompressOptions = { maxWidth: 1280, maxHeight: 1600, aspect: 4 / 5 };
export const BADGE_IMAGE: CompressOptions = { maxWidth: 400, maxHeight: 400, keepAlpha: true };

const MAX_INPUT_BYTES = 25 * 1024 * 1024;

export async function compressImage(file: File, opts: CompressOptions): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("That file isn't an image.");
  if (file.size > MAX_INPUT_BYTES) throw new Error("That photo is over 25 MB. Choose a smaller one.");

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("Couldn't read that image. Use a JPG, PNG or WebP photo.");
  }

  // 1. Canvas size before scaling: the photo, padded out to the target ratio.
  let w = bitmap.width;
  let h = bitmap.height;
  if (opts.aspect) {
    if (w / h > opts.aspect) h = Math.round(w / opts.aspect);
    else w = Math.round(h * opts.aspect);
  }
  // 2. Scale down (never up) to fit the max size.
  const scale = Math.min(1, opts.maxWidth / w, opts.maxHeight / h);
  const cw = Math.round(w * scale);
  const ch = Math.round(h * scale);

  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser couldn't process the image.");

  if (!opts.keepAlpha) {
    ctx.fillStyle = cornerColour(bitmap);
    ctx.fillRect(0, 0, cw, ch);
  }
  const dw = bitmap.width * scale;
  const dh = bitmap.height * scale;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
  bitmap.close();

  const quality = opts.quality ?? 0.82;
  const webp = await toBlob(canvas, "image/webp", quality);
  if (webp?.type === "image/webp") return webp;
  // Safari can't encode WebP and silently returns PNG — fall back explicitly.
  const fallback = await toBlob(canvas, opts.keepAlpha ? "image/png" : "image/jpeg", quality);
  if (!fallback) throw new Error("Your browser couldn't compress the image.");
  return fallback;
}

/** Colour of the top-left pixel, used to pad the photo so the padding blends in. */
function cornerColour(bitmap: ImageBitmap): string {
  const c = document.createElement("canvas");
  c.width = c.height = 1;
  const ctx = c.getContext("2d");
  if (!ctx) return "#ffffff";
  ctx.drawImage(bitmap, 0, 0, 1, 1, 0, 0, 1, 1);
  const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
  return a! < 128 ? "#ffffff" : `rgb(${r} ${g} ${b})`;
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

export function extensionFor(blob: Blob): string {
  return blob.type === "image/webp" ? "webp" : blob.type === "image/png" ? "png" : "jpg";
}
