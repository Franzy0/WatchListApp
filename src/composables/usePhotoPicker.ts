import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { encodePoster } from '../utils/image';


export const usePhotoPicker = () => {
  const pickPhoto = async (): Promise<string | null> => {
    let webPath: string | undefined;

    try {
      const photo = await Camera.getPhoto({
        source: CameraSource.Prompt,

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
