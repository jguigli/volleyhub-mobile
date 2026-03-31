import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { courtsApi } from '../api/courts.api';

export const COURTS_KEY = 'courts';

export function useNearbyCourts(params: {
  lat?: number;
  lng?: number;
  radius?: number;
  registryOnly?: boolean;
}) {
  return useQuery({
    queryKey: [COURTS_KEY, 'nearby', params],
    queryFn: () => courtsApi.findNearby(params),
    staleTime: 60_000,
  });
}

export function useCreateCourt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: courtsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [COURTS_KEY] });
    },
  });
}
