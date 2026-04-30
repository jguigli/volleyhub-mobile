import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/auth.store';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL;
if (!BASE_URL) {
  throw new Error('EXPO_PUBLIC_API_URL is not configured');
}

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

let isRefreshing = false;
let pendingQueue: {
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}[] = [];

function processPendingQueue(token: string | null, error: unknown) {
  for (const p of pendingQueue) {
    if (token) p.resolve(token);
    else p.reject(error);
  }
  pendingQueue = [];
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    const axiosErr = error as AxiosError;
    const originalRequest = axiosErr.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Auto-refresh on 401
    if (axiosErr.response?.status === 401 && !originalRequest._retry) {
      const { refreshToken } = useAuthStore.getState();

      if (refreshToken) {
        if (isRefreshing) {
          // Queue requests while refreshing
          return new Promise((resolve, reject) => {
            pendingQueue.push({
              resolve: (newToken: string) => {
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                resolve(apiClient(originalRequest));
              },
              reject,
            });
          });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const res = await axios.post(`${BASE_URL}/auth/refresh`, {
            refreshToken,
          });
          const { accessToken, refreshToken: newRefresh } = res.data;
          await useAuthStore.getState().updateTokens(accessToken, newRefresh);
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          processPendingQueue(accessToken, null);
          return apiClient(originalRequest);
        } catch (refreshErr) {
          processPendingQueue(null, refreshErr);
          await useAuthStore.getState().clearAuth();
          return Promise.reject(refreshErr);
        } finally {
          isRefreshing = false;
        }
      }

      // No refresh token — logout
      await useAuthStore.getState().clearAuth();
    }

    const message =
      axios.isAxiosError(error) && (error as AxiosError).response?.data
        ? (
            (error as AxiosError).response?.data as {
              message?: string;
            }
          ).message ?? 'Something went wrong'
        : 'Network error. Check your connection.';

    return Promise.reject(new Error(message));
  },
);
