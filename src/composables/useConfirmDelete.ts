import { alertController } from '@ionic/vue';

export interface ConfirmDeleteOptions {
  header?: string;
  subHeader?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
}

/**
 * Ask for confirmation before a destructive action.
 *
 * The answer is read from `onDidDismiss` rather than from a button handler. Ionic does
 * not await an async handler, so the old inline version dismissed the alert while the
 * delete was still in flight and the error toast raced the navigation. Reading the
 * dismissal role also covers the case where the alert is dismissed by tapping the
 * backdrop, which never reaches a handler at all.
 */
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
