import { alertController } from '@ionic/vue';

export interface ConfirmDeleteOptions {
  header?: string;
  subHeader?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
}


export const useConfirmDelete = () => {
  const confirmDelete = async (options: ConfirmDeleteOptions = {}): Promise<boolean> => {
    const alert = await alertController.create({
      header: options.header ?? 'Delete Movie?',
      subHeader:
        options.subHeader ?? 'Are you sure you want to remove this movie from your watchlist?',
      message: options.message,
      buttons: [
        { text: options.cancelText ?? 'Cancel', role: 'cancel' },
        { text: options.confirmText ?? 'Delete', role: 'destructive' }
      ]
    });

    await alert.present();
    const { role } = await alert.onDidDismiss();
    return role === 'destructive';
  };

  return { confirmDelete };
};
