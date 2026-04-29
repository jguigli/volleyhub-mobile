import { apiClient } from './client';
import { User, SkillLevel, Position, League } from '../types';

export interface PublicUser {
  id: string;
  username: string;
  skillLevel: SkillLevel;
  position: Position;
  club?: string | null;
  competition?: string | null;
  league?: League | null;
  profilePicture?: string | null;
  bio?: string | null;
  createdAt: string;
  followersCount: number;
  followingCount: number;
  isFollowing?: boolean;
  outgoingFollowRequestPending?: boolean;
  incomingFollowRequestPending?: boolean;
}

export interface IncomingFollowRequestItem {
  id: string;
  createdAt: string;
  requester: PublicUser;
}

export const usersApi = {
  findById: async (id: string): Promise<User> => {
    const res = await apiClient.get<User>(`/users/${id}`);
    return res.data;
  },

  getPublicProfile: async (id: string): Promise<PublicUser> => {
    const res = await apiClient.get<PublicUser>(`/users/${id}`);
    return res.data;
  },

  searchUsers: async (query: string): Promise<PublicUser[]> => {
    const res = await apiClient.get<PublicUser[]>('/users/search', {
      params: { q: query },
    });
    return res.data;
  },

  getFollowers: async (id: string): Promise<PublicUser[]> => {
    const res = await apiClient.get<PublicUser[]>(`/users/${id}/followers`);
    return res.data;
  },

  getFollowing: async (id: string): Promise<PublicUser[]> => {
    const res = await apiClient.get<PublicUser[]>(`/users/${id}/following`);
    return res.data;
  },

  follow: async (id: string): Promise<void> => {
    await apiClient.post(`/users/${id}/follow`);
  },

  unfollow: async (id: string): Promise<void> => {
    await apiClient.delete(`/users/${id}/follow`);
  },

  sendFollowRequest: async (targetId: string): Promise<void> => {
    await apiClient.post(`/users/${targetId}/follow-requests`);
  },

  cancelFollowRequest: async (targetId: string): Promise<void> => {
    await apiClient.delete(`/users/${targetId}/follow-requests`);
  },

  acceptFollowRequest: async (requesterId: string): Promise<void> => {
    await apiClient.post(`/users/${requesterId}/follow-requests/accept`);
  },

  declineFollowRequest: async (requesterId: string): Promise<void> => {
    await apiClient.post(`/users/${requesterId}/follow-requests/decline`);
  },

  getIncomingFollowRequests: async (): Promise<IncomingFollowRequestItem[]> => {
    const res = await apiClient.get<IncomingFollowRequestItem[]>(
      '/users/me/incoming-follow-requests',
    );
    return res.data;
  },

  updateMe: async (data: {
    username?: string;
    skillLevel?: SkillLevel;
    position?: Position;
    club?: string;
    competition?: string;
    league?: League | null;
    profilePicture?: string;
    bio?: string;
    fcmToken?: string;
    locale?: string;
    lat?: number;
    lng?: number;
  }): Promise<User> => {
    const res = await apiClient.patch<User>('/users/me', data, {
      timeout: data.profilePicture && data.profilePicture.length > 50_000 ? 120_000 : 10_000,
    });
    return res.data;
  },
};
