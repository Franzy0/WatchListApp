import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { downscaleImage } from '../utils/image';

export interface PickedPhoto {
  /** Compressed JPEG ready to upload. */
  blob: Blob;
  /** Object URL for previewing it. Release with `releasePreview` when finished. */
  previewUrl: string;
}

/**
 * Pick a movie poster from the gallery or the camera.
 *
 * `CameraSource.Prompt` renders the native chooser with both options, which is a single
 * call and gets real runtime permission handling for free. In the browser the same call
 * is served by the Ionic PWA elements registered in `main.ts`.
 */
export const usePhotoPicker = () => {
  const pickPhoto = async (): Promise<PickedPhoto | null> => {
    let webPath: string | undefined;

    try {
      const photo = await Camera.getPhoto({
        source: CameraSource.Prompt,
        // Uri rather than Base64 keeps a multi-megabyte string out of memory.
        resultType: CameraResultType.Uri,
        quality: 90,
        width: 1200,
        correctOrientation: true,
        promptLabelHeader: 'Movie poster',
        promptLabelPhoto: 'Choose from gallery',
        promptLabelPicture: 'Take a photo'
      });
      webPath = photo.webPath;
    } catch (error) {
      // Cancelling is a normal thing to do, and the plugin reports it by throwing.
      // Treating it as a failure is the classic bug here, so it is swallowed.
      const message = String((error as Error)?.message ?? error).toLowerCase();
      if (message.includes('cancel') || message.includes('no image')) return null;
      throw error;
    }

    if (!webPath) return null;

    const original = await fetch(webPath).then(response => response.blob());
    const blob = await downscaleImage(original);

    return { blob, previewUrl: URL.createObjectURL(blob) };
  };

  const releasePreview = (url?: string | null): void => {
    if (url && url.startsWith('blob:')) URL.revokeObjectURL(url);
  };

  return { pickPhoto, releasePreview };
};
