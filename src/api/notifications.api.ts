import { apiClient } from './client';
import type { GeneralNotification } from '../types';

export const notificationsApi = {
  getAll: async (): Promise<GeneralNotification[]> => {
    const res = await apiClient.get<GeneralNotification[]>('/notifications');
    return res.data;
  },

  dismiss: async (id: string): Promise<void> => {
    await apiClient.delete(`/notifications/${id}`);
  },
};
