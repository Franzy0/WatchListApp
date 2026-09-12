/**
 * Canvas-based poster encoding.
 *
 * A poster is stored on the movie record itself, as a JPEG data URL in `posterUrl`.
 * That makes size matter twice over: every listener on `movies` downloads every poster,
 * and Realtime Database meters that bandwidth. A phone photo is routinely 3-8 MB, so
 * everything is re-encoded to a small JPEG before it is written.
 */

export interface EncodeOptions {
  maxWidth?: number;
  maxHeight?: number;
  /** JPEG quality, 0 to 1, tried first. Lower steps are used only if `maxLength` is missed. */
  quality?: number;
  /** Upper bound on the encoded data URL, in characters. */
  maxLength?: number;
}

const DEFAULTS = {
  // 480x720 fills a ~240px card at 2x pixel density and lands around 40-90 KB as JPEG.
  // base64 then inflates that by a third, which is what the cap below is measured on.
  maxWidth: 480,
  maxHeight: 720,
  quality: 0.8,
  maxLength: 200_000
};

/** Quality steps to fall back through when the first encode is over the cap. */
const QUALITY_STEPS = [0.7, 0.6, 0.5];

const MAX_SOURCE_BYTES = 20 * 1024 * 1024;

/**
 * Contain-fit scale for a source of the given size.
 *
 * Capped at 1 so a small source is never blown up into a larger, worse file. Exported
 * separately because it is the only part of this module testable under jsdom, which
 * implements neither `createImageBitmap` nor `canvas.toDataURL`.
 */
export const computeTargetSize = (
  width: number,
  height: number,
  maxWidth = DEFAULTS.maxWidth,
  maxHeight = DEFAULTS.maxHeight
): { width: number; height: number } => {
  const scale = Math.min(maxWidth / width, maxHeight / height, 1);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale))
  };
};

/** Decode to a bitmap, honouring EXIF rotation so phone photos are not sideways. */
const decode = async (source: Blob): Promise<ImageBitmap | HTMLImageElement> => {
  try {
    return await createImageBitmap(source, { imageOrientation: 'from-image' });
  } catch {
    // Older WebViews lack the orientation option. Fall back to a plain image element.
    return new Promise<HTMLImageElement>((resolve, reject) => {
      const url = URL.createObjectURL(source);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(
          new Error("That image format isn't supported. Try a JPEG or PNG.")
        );
      };
      img.src = url;
    });
  }
};

const sizeOf = (img: ImageBitmap | HTMLImageElement) =>
  img instanceof HTMLImageElement
    ? { width: img.naturalWidth, height: img.naturalHeight }
    : { width: img.width, height: img.height };

/** Read a blob as a data URL as-is, without re-encoding it. */
const readAsDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('That image could not be read.'));
    reader.readAsDataURL(blob);
  });

/**
 * Encode an image as a JPEG data URL that fits within the given bounds and length cap,
 * ready to be written straight into `posterUrl`.
 */
export const encodePoster = async (
  source: Blob,
  options: EncodeOptions = {}
): Promise<string> => {
  const { maxWidth, maxHeight, quality, maxLength } = { ...DEFAULTS, ...options };

  if (source.type && !source.type.startsWith('image/')) {
    throw new Error('That file is not an image.');
  }
  if (source.size > MAX_SOURCE_BYTES) {
    throw new Error('That image is too large. Pick one under 20 MB.');
  }

  const img = await decode(source);
  const { width: srcWidth, height: srcHeight } = sizeOf(img);
  const target = computeTargetSize(srcWidth, srcHeight, maxWidth, maxHeight);

  // A JPEG already within bounds and under the cap is passed through as it is.
  // Re-encoding it would only lose quality for no gain. base64 is 4/3 of the bytes.
  const alreadyFine =
    source.type === 'image/jpeg' &&
    Math.ceil(source.size / 3) * 4 <= maxLength &&
    target.width === srcWidth &&
    target.height === srcHeight;

  if (alreadyFine) {
    if (!(img instanceof HTMLImageElement)) img.close();
    return readAsDataUrl(source);
  }

  const canvas = document.createElement('canvas');
  canvas.width = target.width;
  canvas.height = target.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('This device could not process the image.');

  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, target.width, target.height);
  if (!(img instanceof HTMLImageElement)) img.close();

  // Step the quality down until the result fits. The last step is accepted as it is:
  // at 480x720 and quality 0.5 a JPEG is around 20 KB, so the cap is never really hit.
  let encoded = '';
  for (const step of [quality, ...QUALITY_STEPS.filter(q => q < quality)]) {
    encoded = canvas.toDataURL('image/jpeg', step);
    if (encoded.length <= maxLength) break;
  }

  // A tainted or over-sized canvas answers with the empty "data:," instead of throwing.
  if (!encoded.startsWith('data:image/jpeg;base64,')) {
    throw new Error('The image could not be compressed.');
  }
  return encoded;
};
