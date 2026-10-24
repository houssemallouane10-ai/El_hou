import { store } from '../../app/store.js';
import { api } from '../../shared/api.js';
import { toastError } from '../../shared/ui.js';

// Opens (or reuses) the conversation with a person, optionally about an offer, then shows it.
export const startConversation = async ({ userId, jobId = null, navigate }) => {
  if (!store.user) {
    navigate(`/login?next=${encodeURIComponent(location.pathname)}`);
    return;
  }
  try {
    const { conversation } = await api.post('/api/conversations', { userId, jobId });
    navigate(`/messages/${conversation.id}`);
  } catch (error) {
    toastError(error);
  }
};
