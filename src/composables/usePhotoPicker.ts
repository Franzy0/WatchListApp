import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { encodePoster } from '../utils/image';

/**
 * Pick a movie poster from the gallery or the camera and hand it back as a JPEG data
 * URL, which is the exact string that ends up in `posterUrl`. The same value serves as
 * the preview, so what is shown before saving is what the database gets.
 *
 * `CameraSource.Prompt` renders the native chooser with both options, which is a single
 * call and gets real runtime permission handling for free. In the browser the same call
 * is served by the Ionic PWA elements registered in `main.ts`.
 */
export const usePhotoPicker = () => {
  const pickPhoto = async (): Promise<string | null> => {
    let webPath: string | undefined;

    try {
      const photo = await Camera.getPhoto({
        source: CameraSource.Prompt,
        // Uri rather than Base64 keeps a multi-megabyte string out of memory. The
        // picture is shrunk first and only then turned into a (much smaller) string.
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
    return encodePoster(original);
  };

  return { pickPhoto };
};
