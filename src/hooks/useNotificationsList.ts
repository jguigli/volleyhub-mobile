import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '../api/notifications.api';

export const NOTIFICATIONS_KEY = 'general-notifications';

export function useNotificationsList() {
  return useQuery({
    queryKey: [NOTIFICATIONS_KEY],
    queryFn: () => notificationsApi.getAll(),
    staleTime: 15_000,
  });
}

export function useDismissNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationsApi.dismiss(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [NOTIFICATIONS_KEY] });
    },
  });
}
