import { toastController } from '@ionic/vue';

export type ToastColor = 'success' | 'danger' | 'warning' | 'primary' | 'medium';

export interface ShowToastOptions {
  duration?: number;
  position?: 'top' | 'bottom' | 'middle';
}

/**
 * One toast helper for the whole app.
 *
 * Every page used to carry its own copy that hardcoded a green success colour, so
 * failures were announced as successes. Colour is a real parameter here.
 */
export const useToast = () => {
  const showToast = async (
    message: string,
    color: ToastColor = 'success',
    options: ShowToastOptions = {}
  ): Promise<void> => {
    const toast = await toastController.create({
      message,
      color,
      // Failures carry more text and deserve longer on screen.
      duration: options.duration ?? (color === 'success' ? 2000 : 4000),
      position: options.position ?? 'bottom'
    });

    await toast.present();
  };

  return {
    showToast,
    showSuccess: (message: string) => showToast(message, 'success'),
    showWarning: (message: string) => showToast(message, 'warning'),
    showError: (message: string) => showToast(message, 'danger')
  };
};
