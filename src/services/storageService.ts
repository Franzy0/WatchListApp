import {
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject
} from 'firebase/storage';
import { storage, isStorageConfigured } from '../firebase/config';

export interface UploadResult {
  /** Public download URL, stored on the movie for display. */
  url: string;
  /** Storage object path, stored on the movie so the file can be removed later. */
  path: string;
}

export type ProgressFn = (percent: number) => void;

/** An upload failure that already carries a message fit to show the user. */
export class PosterUploadError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'PosterUploadError';
    this.code = code;
  }
}

/** Give up rather than spin: the SDK otherwise retries a dead bucket for ~2 minutes. */
const UPLOAD_TIMEOUT_MS = 30_000;

/**
 * Each upload gets a unique object name.
 *
 * A fixed name like `poster.jpg` would keep the same download URL after a replacement,
 * so browsers and the CDN would go on serving the old image. A unique name makes
 * replacement correct by construction and makes deleting the previous file an explicit
 * step rather than a cache-busting workaround.
 */
export const posterPathFor = (movieId: number): string =>
  `posters/${movieId}/${Date.now()}.jpg`;

/**
 * Turn a Firebase Storage error into something worth showing a person.
 *
 * The code is read duck-typed rather than through `instanceof`, which is unreliable when
 * more than one copy of the SDK ends up in the bundle.
 */
const toPosterUploadError = (error: unknown): PosterUploadError => {
  const code = (error as { code?: string })?.code ?? '';
  const serverResponse = (error as { serverResponse?: string })?.serverResponse;
  if (serverResponse) console.error('Storage server response:', serverResponse);

  switch (code) {
    case 'storage/unauthorized':
      return new PosterUploadError(
        'Your Firebase Storage rules blocked this upload.',
        code
      );
    case 'storage/bucket-not-found':
    case 'storage/project-not-found':
    case 'storage/no-default-bucket':
      return new PosterUploadError(
        "Firebase Storage isn't set up for this project yet.",
        code
      );
    case 'storage/quota-exceeded':
      return new PosterUploadError('Your Firebase Storage quota is used up.', code);
    case 'storage/retry-limit-exceeded':
    case 'storage/timeout':
      return new PosterUploadError('The upload timed out. Check your connection.', code);
    case 'storage/canceled':
      return new PosterUploadError('Upload cancelled.', code);
    default:
      return new PosterUploadError(
        'The poster could not be uploaded.',
        code || 'storage/unknown'
      );
  }
};

/**
 * Upload a poster and return its public URL plus the path it was written to.
 *
 * Uses a resumable upload because it is the only variant that reports progress.
 */
export const uploadPoster = (
  file: Blob,
  movieId: number,
  onProgress?: ProgressFn
): Promise<UploadResult> => {
  if (!isStorageConfigured) {
    return Promise.reject(
      new PosterUploadError(
        "Firebase Storage isn't configured, so pictures can't be uploaded.",
        'storage/no-default-bucket'
      )
    );
  }

  const path = posterPathFor(movieId);

  return new Promise<UploadResult>((resolve, reject) => {
    const task = uploadBytesResumable(storageRef(storage, path), file, {
      contentType: 'image/jpeg',
      // Safe to cache hard because every object name is unique.
      cacheControl: 'public, max-age=31536000, immutable'
    });

    const timeout = setTimeout(() => {
      task.cancel();
      reject(
        new PosterUploadError('The upload timed out. Check your connection.', 'storage/timeout')
      );
    }, UPLOAD_TIMEOUT_MS);

    task.on(
      'state_changed',
      snapshot => {
        if (!onProgress || !snapshot.totalBytes) return;
        onProgress(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100));
      },
      error => {
        clearTimeout(timeout);
        reject(toPosterUploadError(error));
      },
      async () => {
        clearTimeout(timeout);
        try {
          // Reading the URL is a separate authorization from writing the file. Rules that
          // allow writes but not reads fail here, after a perfectly successful upload.
          const url = await getDownloadURL(task.snapshot.ref);
          resolve({ url, path });
        } catch (error) {
          reject(toPosterUploadError(error));
        }
      }
    );
  });
};

/**
 * Remove a poster object. Always best effort and never throws: a leftover image costs
 * a fraction of a cent, while failing a save because cleanup failed is not acceptable.
 */
export const deletePoster = async (path?: string | null): Promise<void> => {
  if (!path || !isStorageConfigured) return;
  try {
    await deleteObject(storageRef(storage, path));
  } catch (error) {
    const code = (error as { code?: string })?.code ?? '';
    if (code !== 'storage/object-not-found') {
      console.warn('Could not delete old poster:', code || error);
    }
  }
};
