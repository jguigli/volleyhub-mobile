import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/auth.store';
import { useQueryClient } from '@tanstack/react-query';
import { MATCHES_KEY } from './useMatches';
import type { MatchChatMessage, NearbyMatch } from '../types';

const API_URL = process.env.EXPO_PUBLIC_API_URL;
if (!API_URL) {
  throw new Error('EXPO_PUBLIC_API_URL is not configured');
}

interface MatchUpdate {
  matchId: string;
  currentPlayers?: number;
  maxPlayers?: number;
  status?: string;
  courtId?: string;
  tournamentStateUpdated?: boolean;
}

let globalSocket: Socket | null = null;

export function useSocket() {
  const token = useAuthStore((s) => s.token);
  const socketRef = useRef<Socket | null>(null);
  const queryClient = useQueryClient();

  const handleMapMatchUpdated = useCallback(
    (update: MatchUpdate) => {
      queryClient.invalidateQueries({ queryKey: [MATCHES_KEY, 'nearby'] });
      queryClient.invalidateQueries({ queryKey: [MATCHES_KEY, 'suggestions'] });

      if (update.tournamentStateUpdated && update.matchId) {
        queryClient.invalidateQueries({ queryKey: [MATCHES_KEY, update.matchId] });
      }
      queryClient.setQueryData<NearbyMatch[]>(
        [MATCHES_KEY, 'nearby'],
        (old) => {
          if (!old) return old;
          return old.map((m) =>
            m.id === update.matchId
              ? {
                  ...m,
                  ...(typeof update.currentPlayers === 'number'
                    ? { current_players: update.currentPlayers }
                    : {}),
                  ...(typeof update.maxPlayers === 'number'
                    ? { max_players: update.maxPlayers }
                    : {}),
                  ...(update.status
                    ? { status: update.status as NearbyMatch['status'] }
                    : {}),
                }
              : m,
          );
        },
      );

      queryClient.setQueryData<NearbyMatch[]>(
        [MATCHES_KEY, 'suggestions'],
        (old) => {
          if (!old) return old;
          return old.map((m) =>
            m.id === update.matchId
              ? {
                  ...m,
                  ...(typeof update.currentPlayers === 'number'
                    ? { current_players: update.currentPlayers }
                    : {}),
                  ...(typeof update.maxPlayers === 'number'
                    ? { max_players: update.maxPlayers }
                    : {}),
                  ...(update.status
                    ? { status: update.status as NearbyMatch['status'] }
                    : {}),
                }
              : m,
          );
        },
      );
    },
    [queryClient],
  );

  useEffect(() => {
    if (!token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        globalSocket = null;
      }
      return;
    }

    if (globalSocket?.connected) {
      socketRef.current = globalSocket;
      return;
    }

    const socket = io(`${API_URL}/matches`, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected');
    });

    socket.on('disconnect', () => {
      console.log('[Socket] Disconnected');
    });

    const handleMatchUpdatedGlobal = (update: MatchUpdate) => {
      if (update.tournamentStateUpdated && update.matchId) {
        queryClient.invalidateQueries({ queryKey: [MATCHES_KEY, update.matchId] });
      }
    };

    socket.on('map_match_updated', handleMapMatchUpdated);
    socket.on('match_updated', handleMatchUpdatedGlobal);

    socketRef.current = socket;
    globalSocket = socket;

    return () => {
      socket.off('map_match_updated', handleMapMatchUpdated);
      socket.off('match_updated', handleMatchUpdatedGlobal);
    };
  }, [token, handleMapMatchUpdated, queryClient]);

  const subscribeToMatch = useCallback(
    (
      matchId: string,
      onUpdate: (update: MatchUpdate) => void,
    ) => {
      if (!socketRef.current) return () => {};

      socketRef.current.emit('subscribe_match', { matchId });

      const handler = (update: MatchUpdate) => {
        if (update.matchId === matchId) {
          if (update.tournamentStateUpdated) {
            queryClient.invalidateQueries({ queryKey: [MATCHES_KEY, matchId] });
          }
          onUpdate(update);
        }
      };

      socketRef.current.on('match_updated', handler);

      return () => {
        socketRef.current?.off('match_updated', handler);
      };
    },
    [queryClient],
  );

  const subscribeToMatchChat = useCallback(
    (matchId: string, onMessage: (msg: MatchChatMessage) => void) => {
      if (!socketRef.current) return () => {};

      socketRef.current.emit('subscribe_match', { matchId });

      const handler = (payload: MatchChatMessage) => {
        if (payload.matchId === matchId) {
          onMessage(payload);
        }
      };

      socketRef.current.on('match_chat_message', handler);

      return () => {
        socketRef.current?.off('match_chat_message', handler);
      };
    },
    [],
  );

  return { socket: socketRef.current, subscribeToMatch, subscribeToMatchChat };
}
