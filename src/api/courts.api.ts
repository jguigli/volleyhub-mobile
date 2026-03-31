import { apiClient } from './client';
import { Court, CourtType } from '../types';

export const courtsApi = {
  findNearby: async (params: {
    lat?: number;
    lng?: number;
    radius?: number;
    /** true = uniquement complexes / terrains du référentiel (liste déroulante, points bleus) */
    registryOnly?: boolean;
  }): Promise<Court[]> => {
    const res = await apiClient.get<Court[]>('/courts', { params });
    return res.data;
  },

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
