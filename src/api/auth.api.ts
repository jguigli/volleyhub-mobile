import { apiClient } from './client';
import { AuthResponse, SkillLevel, Position } from '../types';

export const authApi = {
  register: async (data: {
    username: string;
    email: string;
    password: string;
    skillLevel?: SkillLevel;
    position?: Position;
  }): Promise<AuthResponse> => {
    const res = await apiClient.post<AuthResponse>('/auth/register', data);
    return res.data;
  },

  login: async (data: {
    email: string;
    password: string;
  }): Promise<AuthResponse> => {
    const res = await apiClient.post<AuthResponse>('/auth/login', data);
    return res.data;
  },
};
