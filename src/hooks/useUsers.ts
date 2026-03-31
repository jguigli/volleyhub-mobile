import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '../api/users.api';
import { useAuthStore } from '../store/auth.store';

export const USERS_KEY = 'users';

const INCOMING_FR_KEY = [USERS_KEY, 'incoming-follow-requests'] as const;

function invalidateUserAndIncoming(
  qc: ReturnType<typeof useQueryClient>,
  userId?: string,
) {
  // Invalidate all user-related queries so relation counters/cards refresh everywhere.
  qc.invalidateQueries({ queryKey: [USERS_KEY] });
  if (userId) {
    qc.invalidateQueries({ queryKey: [USERS_KEY, userId] });
  }
  qc.invalidateQueries({ queryKey: [...INCOMING_FR_KEY] });
}

export function usePublicProfile(userId: string) {
  return useQuery({
    queryKey: [USERS_KEY, userId],
    queryFn: () => usersApi.getPublicProfile(userId),
    enabled: !!userId,
    staleTime: 60_000,
  });
}

export function useFollowers(userId: string) {
  return useQuery({
    queryKey: [USERS_KEY, userId, 'followers'],
    queryFn: () => usersApi.getFollowers(userId),
    enabled: !!userId,
    staleTime: 30_000,
  });
}

export function useFollowing(userId: string) {
  return useQuery({
    queryKey: [USERS_KEY, userId, 'following'],
    queryFn: () => usersApi.getFollowing(userId),
    enabled: !!userId,
    staleTime: 30_000,
  });
}

export function useFollow(userId: string) {
  const queryClient = useQueryClient();

  const invalidate = () => {
    invalidateUserAndIncoming(queryClient, userId);
  };

  const follow = useMutation({
    mutationFn: () => usersApi.follow(userId),
    onSuccess: invalidate,
  });

  const unfollow = useMutation({
    mutationFn: () => usersApi.unfollow(userId),
    onSuccess: invalidate,
  });

  return { follow, unfollow };
}

export function useIncomingFollowRequests() {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: [...INCOMING_FR_KEY],
    queryFn: () => usersApi.getIncomingFollowRequests(),
    enabled: !!user,
    staleTime: 15_000,
  });
}

export function useSendFollowRequest(targetUserId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => usersApi.sendFollowRequest(targetUserId),
    onSuccess: () => invalidateUserAndIncoming(qc, targetUserId),
  });
}

export function useCancelFollowRequest(targetUserId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => usersApi.cancelFollowRequest(targetUserId),
    onSuccess: () => invalidateUserAndIncoming(qc, targetUserId),
  });
}

export function useAcceptFollowRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (requesterId: string) => usersApi.acceptFollowRequest(requesterId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [USERS_KEY] });
      qc.invalidateQueries({ queryKey: [...INCOMING_FR_KEY] });
    },
  });
}

export function useDeclineFollowRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (requesterId: string) => usersApi.declineFollowRequest(requesterId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [USERS_KEY] });
      qc.invalidateQueries({ queryKey: [...INCOMING_FR_KEY] });
    },
  });
}
