import { apiClient } from './client';
import { Court, CourtType } from '../types';

export const courtsApi = {
  findById: async (id: string): Promise<Court> => {
    const res = await apiClient.get<Court>(`/courts/${id}`);
    return res.data;
  },

  create: async (data: {
    name: string;
    type: CourtType;
    lat: number;
    lng: number;
    address?: string;
  }): Promise<Court> => {
    const res = await apiClient.post<Court>('/courts', data);
    return res.data;
  },
};
