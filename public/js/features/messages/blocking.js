import { api } from '../../shared/api.js';
import { t } from '../../shared/i18n.js';
import { confirmDialog, toast, toastError } from '../../shared/ui.js';

// Blocking stops messages both ways and hides the conversation from the blocker's inbox.
// Both helpers resolve to true when the change was made.
export const blockUser = async ({ userId, name }) => {
  const confirmed = await confirmDialog({
    title: t('blocking.confirmTitle', { name }),
    message: t('blocking.confirmText'),
    confirmLabel: t('blocking.block'),
    danger: true,
  });
  if (!confirmed) return false;
  try {
    await api.put(`/api/blocks/${userId}`);
    toast(t('blocking.blocked', { name }), { type: 'success' });
    return true;
  } catch (error) {
    toastError(error);
    return false;
  }
};

export const unblockUser = async ({ userId, name }) => {
  try {
    await api.del(`/api/blocks/${userId}`);
    toast(t('blocking.unblocked', { name }), { type: 'success' });
    return true;
  } catch (error) {
    toastError(error);
    return false;
  }
};
