import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { matchesApi } from '../api/matches.api';
import { EventFormat } from '../types';
import { Match, NearbyMatch, SkillLevel, TournamentGame } from '../types';

export const MATCHES_KEY = 'matches';

export function useNearbyMatches(params: {
  lat?: number;
  lng?: number;
  radius?: number;
  skillLevel?: SkillLevel;
}) {
  return useQuery({
    queryKey: [MATCHES_KEY, 'nearby', params],
    queryFn: () => matchesApi.findNearby(params),
    staleTime: 30_000,
    enabled: true,
  });
}

export function useIncomingEventInvites(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [MATCHES_KEY, 'incoming-invites'],
    queryFn: () => matchesApi.getIncomingInvites(),
    staleTime: 15_000,
    enabled: options?.enabled ?? true,
  });
}

export function useSentInviteUserIds(matchId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [MATCHES_KEY, matchId, 'sent-invites'],
    queryFn: () => matchesApi.getSentInvites(matchId),
    enabled: (options?.enabled ?? true) && !!matchId,
    staleTime: 15_000,
  });
}

export function useMatchSuggestions(params: {
  lat?: number;
  lng?: number;
  radius?: number;
}) {
  return useQuery({
    queryKey: [MATCHES_KEY, 'suggestions', params],
    queryFn: () => matchesApi.getSuggestions(params),
    staleTime: 30_000,
  });
}

export function useMatch(id: string) {
  return useQuery({
    queryKey: [MATCHES_KEY, id],
    queryFn: () => matchesApi.findById(id),
    enabled: !!id,
  });
}

export function useJoinMatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (matchId: string) => matchesApi.join(matchId),
    onSuccess: (updatedMatch) => {
      queryClient.setQueryData([MATCHES_KEY, updatedMatch.id], updatedMatch);
      queryClient.invalidateQueries({ queryKey: [MATCHES_KEY, 'nearby'] });
      queryClient.invalidateQueries({ queryKey: [MATCHES_KEY, 'suggestions'] });
      queryClient.invalidateQueries({ queryKey: [MATCHES_KEY, 'my'] });
    },
  });
}

export function useLeaveMatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (matchId: string) => matchesApi.leave(matchId),
    onSuccess: (updatedMatch) => {
      queryClient.setQueryData([MATCHES_KEY, updatedMatch.id], updatedMatch);
      queryClient.invalidateQueries({ queryKey: [MATCHES_KEY, 'nearby'] });
      queryClient.invalidateQueries({ queryKey: [MATCHES_KEY, 'suggestions'] });
      queryClient.invalidateQueries({ queryKey: [MATCHES_KEY, 'my'] });
    },
  });
}

export function useInvitePlayerToMatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { matchId: string; userId: string }) =>
      matchesApi.invite(args.matchId, args.userId),
    onSuccess: (_res, vars) => {
      qc.setQueryData<string[]>(
        [MATCHES_KEY, vars.matchId, 'sent-invites'],
        (prev) => {
          const arr = prev ?? [];
          return arr.includes(vars.userId) ? arr : [...arr, vars.userId];
        },
      );
      qc.invalidateQueries({ queryKey: [MATCHES_KEY, vars.matchId, 'sent-invites'] });
    },
  });
}

export function useDismissIncomingEventInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (inviteId: string) => matchesApi.dismissIncomingInvite(inviteId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [MATCHES_KEY, 'incoming-invites'] });
    },
  });
}

export function useMyMatches(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [MATCHES_KEY, 'my'],
    queryFn: () => matchesApi.getMyMatches(),
    staleTime: 30_000,
    enabled: options?.enabled ?? true,
  });
}

export function useCreateMatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: matchesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MATCHES_KEY] });
    },
  });
}

export function useManageMatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (args: {
      matchId: string;
      teamAssignments?: Record<string, number | null>;
      setScores?: { teamA: number; teamB: number }[] | null;
      tournamentGames?: TournamentGame[] | null;
    }) => {
      const { matchId, ...body } = args;
      return matchesApi.manage(matchId, body);
    },
    onSuccess: (m: Match) => {
      queryClient.setQueryData([MATCHES_KEY, m.id], m);
      queryClient.invalidateQueries({ queryKey: [MATCHES_KEY] });
    },
  });
}

export function useRemoveParticipant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      matchId,
      userId,
    }: {
      matchId: string;
      userId: string;
    }) => matchesApi.removeParticipant(matchId, userId),
    onSuccess: (m: Match) => {
      queryClient.setQueryData([MATCHES_KEY, m.id], m);
      queryClient.invalidateQueries({ queryKey: [MATCHES_KEY] });
    },
  });
}

export function useSetMyTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (args: { matchId: string; teamIndex: number | null }) =>
      matchesApi.setMyTeam(args.matchId, args.teamIndex),
    onSuccess: (m: Match) => {
      queryClient.setQueryData([MATCHES_KEY, m.id], m);
      queryClient.invalidateQueries({ queryKey: [MATCHES_KEY] });
    },
  });
}

export function useDeleteMatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (matchId: string) => matchesApi.delete(matchId),
    onSuccess: (_, matchId) => {
      queryClient.removeQueries({ queryKey: [MATCHES_KEY, matchId] });
      queryClient.invalidateQueries({ queryKey: [MATCHES_KEY] });
    },
  });
}

export function useRenewMatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (matchId: string) => matchesApi.renew(matchId),
    onSuccess: (m: Match) => {
      queryClient.setQueryData([MATCHES_KEY, m.id], m);
      queryClient.invalidateQueries({ queryKey: [MATCHES_KEY] });
    },
  });
}

export function useUserMatchStats(userId: string, eventFormat?: EventFormat) {
  return useQuery({
    queryKey: [MATCHES_KEY, 'user-stats', userId, eventFormat ?? 'all'],
    queryFn: () => matchesApi.getUserMatchStats(userId, eventFormat),
    enabled: !!userId,
    staleTime: 0,
    refetchOnMount: 'always',
  });
}

export function useUpdateMatchFromSocket(matchId: string) {
  const queryClient = useQueryClient();

  return (update: {
    currentPlayers: number;
    maxPlayers: number;
    status: string;
  }) => {
    queryClient.setQueryData<NearbyMatch[]>(
      [MATCHES_KEY, 'nearby'],
      (old) => {
        if (!old) return old;
        return old.map((m) =>
          m.id === matchId
            ? {
                ...m,
                current_players: update.currentPlayers,
                max_players: update.maxPlayers,
                status: update.status as NearbyMatch['status'],
              }
            : m,
        );
      },
    );
  };
}
