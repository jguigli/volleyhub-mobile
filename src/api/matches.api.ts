import { apiClient } from './client';
import {
  EventFormat,
  Match,
  MatchChatMessage,
  NearbyMatch,
  SkillLevel,
  TournamentFixture,
  TournamentGame,
  TournamentSystem,
  VolleyType,
} from '../types';

export const matchesApi = {
  getIncomingInvites: async (): Promise<
    {
      id: string;
      matchId: string;
      inviterId: string;
      inviterUsername: string;
      eventFormat?: EventFormat;
      title: string;
      body: string;
      createdAt: string;
    }[]
  > => {
    const res = await apiClient.get<
      {
        id: string;
        matchId: string;
        inviterId: string;
        inviterUsername: string;
        eventFormat?: EventFormat;
        title: string;
        body: string;
        createdAt: string;
      }[]
    >('/matches/incoming-invites');
    return res.data;
  },

  dismissIncomingInvite: async (inviteId: string): Promise<{ ok: true }> => {
    const res = await apiClient.delete<{ ok: true }>(
      `/matches/incoming-invites/${inviteId}`,
    );
    return res.data;
  },

  getSentInvites: async (matchId: string): Promise<string[]> => {
    const res = await apiClient.get<string[]>(`/matches/${matchId}/sent-invites`);
    return res.data;
  },

  findNearby: async (params: {
    lat?: number;
    lng?: number;
    radius?: number;
    skillLevel?: SkillLevel;
  }): Promise<NearbyMatch[]> => {
    const res = await apiClient.get<NearbyMatch[]>('/matches', { params });
    return res.data;
  },

  getSuggestions: async (params: {
    lat?: number;
    lng?: number;
    radius?: number;
  }): Promise<NearbyMatch[]> => {
    const res = await apiClient.get<NearbyMatch[]>('/matches/suggestions', {
      params,
    });
    return res.data;
  },

  findById: async (id: string): Promise<Match> => {
    const res = await apiClient.get<Match>(`/matches/${id}`);
    return res.data;
  },

  create: async (data: {
    courtId: string;
    scheduledAt: string;
    skillLevel: SkillLevel;
    volleyType: VolleyType;
    description?: string;
    maxPlayers?: number;
    eventFormat?: EventFormat;
    teamCount?: number;
    teamSize?: number;
    matchSets?: number;
    pointsToWin?: number;
    tournamentPointsPerMatch?: number;
    tournamentCourtCount?: number;
    tournamentSystem?: TournamentSystem;
  }): Promise<Match> => {
    const res = await apiClient.post<Match>('/matches', data);
    return res.data;
  },

  join: async (id: string): Promise<Match> => {
    const res = await apiClient.post<Match>(`/matches/${id}/join`);
    return res.data;
  },

  invite: async (matchId: string, userId: string): Promise<{ ok: true }> => {
    const res = await apiClient.post<{ ok: true }>(`/matches/${matchId}/invite`, {
      userId,
    });
    return res.data;
  },

  leave: async (id: string): Promise<Match> => {
    const res = await apiClient.post<Match>(`/matches/${id}/leave`);
    return res.data;
  },

  manage: async (
    id: string,
    body: {
      teamAssignments?: Record<string, number | null>;
      setScores?: { teamA: number; teamB: number }[] | null;
      tournamentGames?: TournamentGame[] | null;
    },
  ): Promise<Match> => {
    const res = await apiClient.patch<Match>(`/matches/${id}/manage`, body);
    return res.data;
  },

  submitFixtureScore: async (
    fixtureId: string,
    score: number,
  ): Promise<TournamentFixture> => {
    const res = await apiClient.post<TournamentFixture>(
      `/matches/fixtures/${fixtureId}/score`,
      { score },
    );
    return res.data;
  },

  confirmFixtureScore: async (fixtureId: string): Promise<TournamentFixture> => {
    const res = await apiClient.post<TournamentFixture>(
      `/matches/fixtures/${fixtureId}/confirm`,
    );
    return res.data;
  },

  overrideFixtureScore: async (
    fixtureId: string,
    scoreA: number,
    scoreB: number,
  ): Promise<TournamentFixture> => {
    const res = await apiClient.patch<TournamentFixture>(
      `/matches/fixtures/${fixtureId}/override`,
      { scoreA, scoreB },
    );
    return res.data;
  },

  removeParticipant: async (
    matchId: string,
    userId: string,
  ): Promise<Match> => {
    const res = await apiClient.post<Match>(
      `/matches/${matchId}/remove-participant`,
      { userId },
    );
    return res.data;
  },

  getChatMessages: async (
    matchId: string,
    before?: string,
  ): Promise<{ messages: MatchChatMessage[]; hasMore: boolean }> => {
    const res = await apiClient.get<{ messages: MatchChatMessage[]; hasMore: boolean }>(
      `/matches/${matchId}/chat/messages`,
      { params: before ? { before } : undefined },
    );
    return res.data;
  },

  postChatMessage: async (
    matchId: string,
    body: string,
  ): Promise<MatchChatMessage> => {
    const res = await apiClient.post<MatchChatMessage>(
      `/matches/${matchId}/chat/messages`,
      { body },
    );
    return res.data;
  },

  getChatMutedUserIds: async (matchId: string): Promise<string[]> => {
    const res = await apiClient.get<string[]>(
      `/matches/${matchId}/chat/muted-user-ids`,
    );
    return res.data;
  },

  muteChatUser: async (matchId: string, userId: string): Promise<void> => {
    await apiClient.post(`/matches/${matchId}/chat/mute`, { userId });
  },

  unmuteChatUser: async (matchId: string, userId: string): Promise<void> => {
    await apiClient.delete(`/matches/${matchId}/chat/mute/${userId}`);
  },

  setMyTeam: async (
    id: string,
    teamIndex: number | null,
    slotIndex?: number | null,
  ): Promise<Match> => {
    const res = await apiClient.patch<Match>(`/matches/${id}/my-team`, {
      teamIndex,
      slotIndex: slotIndex !== undefined ? slotIndex : null,
    });
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/matches/${id}`);
  },

  renew: async (id: string): Promise<Match> => {
    const res = await apiClient.post<Match>(`/matches/${id}/renew`);
    return res.data;
  },

  getMyMatches: async (): Promise<NearbyMatch[]> => {
    const res = await apiClient.get<NearbyMatch[]>('/matches/my');
    return res.data;
  },

  getUserMatchStats: async (
    userId: string,
    eventFormat?: EventFormat,
  ): Promise<{
    played: number;
    created: number;
    upcoming: number;
    wins: number;
    losses: number;
    winRate: number;
    streak: number;
  }> => {
    const res = await apiClient.get<{
      played: number;
      created: number;
      upcoming: number;
      wins: number;
      losses: number;
      winRate: number;
      streak: number;
    }>(`/matches/user/${userId}/stats`, {
      params: eventFormat ? { eventFormat } : undefined,
    });
    return res.data;
  },
};
