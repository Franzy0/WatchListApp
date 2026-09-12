/**
 * Canvas-based image downscaling.
 *
 * A phone photo is routinely 3-8 MB, far more than a poster thumbnail needs and slow to
 * upload over mobile data. Everything is re-encoded to a small JPEG before it ever
 * reaches Firebase Storage.
 */

export interface DownscaleOptions {
  maxWidth?: number;
  maxHeight?: number;
  /** JPEG quality, 0 to 1. */
  quality?: number;
  /** A JPEG already within bounds and under this many bytes is passed through. */
  skipIfSmallerThan?: number;
}

/** Movie posters are conventionally 2:3, which is what the card and detail views expect. */
export const POSTER_ASPECT = 2 / 3;

const DEFAULTS = {
  // 600x900 covers a ~300px card at 2x pixel density and lands around 60-110 KB.
  maxWidth: 600,
  maxHeight: 900,
  quality: 0.82,
  skipIfSmallerThan: 150_000
};

const MAX_SOURCE_BYTES = 20 * 1024 * 1024;

/**
 * Contain-fit scale for a source of the given size.
 *
 * Capped at 1 so a small source is never blown up into a larger, worse file. Exported
 * separately because it is the only part of this module testable under jsdom, which
 * implements neither `createImageBitmap` nor `canvas.toBlob`.
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

/** Re-encode an image as a JPEG that fits within the given bounds. */
export const downscaleImage = async (
  source: Blob,
  options: DownscaleOptions = {}
): Promise<Blob> => {
  const { maxWidth, maxHeight, quality, skipIfSmallerThan } = { ...DEFAULTS, ...options };

  if (source.type && !source.type.startsWith('image/')) {
    throw new Error('That file is not an image.');
  }
  if (source.size > MAX_SOURCE_BYTES) {
    throw new Error('That image is too large. Pick one under 20 MB.');
  }

  const img = await decode(source);
  const { width: srcWidth, height: srcHeight } = sizeOf(img);
  const target = computeTargetSize(srcWidth, srcHeight, maxWidth, maxHeight);

  // Re-encoding a picture that is already small only loses quality for no gain.
  const alreadyFine =
    source.type === 'image/jpeg' &&
    source.size <= skipIfSmallerThan &&
    target.width === srcWidth &&
    target.height === srcHeight;

  if (alreadyFine) {
    if (!(img instanceof HTMLImageElement)) img.close();
    return source;
  }

  const canvas = document.createElement('canvas');
  canvas.width = target.width;
  canvas.height = target.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('This device could not process the image.');

  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, target.width, target.height);
  if (!(img instanceof HTMLImageElement)) img.close();

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      out => (out ? resolve(out) : reject(new Error('The image could not be compressed.'))),
      'image/jpeg',
      quality
    );
  });
};

/** Rough byte size as readable text, used in the upload progress copy. */
export const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
