import { useMutation, useQueryClient } from '@tanstack/react-query';
import { courtsApi } from '../api/courts.api';

export const COURTS_KEY = 'courts';

export function useCreateCourt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: courtsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [COURTS_KEY] });
    },
  });
}
