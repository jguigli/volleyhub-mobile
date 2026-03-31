import axios from 'axios';
import { useAuthStore } from '../store/auth.store';

const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401
    ) {
      useAuthStore.getState().clearAuth();
    }

    const message =
      axios.isAxiosError(error) && error.response?.data
        ? (
            error.response.data as {
              message?: string;
              error?: string;
            }
          ).message ?? 'Something went wrong'
        : 'Network error. Check your connection.';

    return Promise.reject(new Error(message));
  },
);
