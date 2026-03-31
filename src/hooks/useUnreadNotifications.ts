import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIncomingEventInvites } from './useMatches';
import { useIncomingFollowRequests } from './useUsers';
import { useAuthStore } from '../store/auth.store';

const SEEN_NOTIFICATIONS_KEY = 'notifications_seen_ids_v1';
let seenCache: Set<string> | null = null;
const listeners = new Set<(next: Set<string>) => void>();

function broadcastSeen(next: Set<string>) {
  seenCache = new Set(next);
  for (const l of listeners) {
    l(new Set(next));
  }
}

function toFollowKey(id: string): string {
  return `follow:${id}`;
}

function toInviteKey(id: string): string {
  return `invite:${id}`;
}

export function useUnreadNotifications() {
  const user = useAuthStore((s) => s.user);
  const followQ = useIncomingFollowRequests();
  const invitesQ = useIncomingEventInvites({ enabled: !!user });
  const [seenKeys, setSeenKeys] = useState<Set<string>>(new Set());
  const [seenLoaded, setSeenLoaded] = useState(false);
  const allKeysRef = useRef<string[]>([]);
  const seenKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const onSync = (next: Set<string>) => setSeenKeys(new Set(next));
    listeners.add(onSync);
    let cancelled = false;
    (async () => {
      if (seenCache) {
        if (!cancelled) {
          setSeenKeys(new Set(seenCache));
          setSeenLoaded(true);
        }
        return;
      }
      try {
        const raw = await AsyncStorage.getItem(SEEN_NOTIFICATIONS_KEY);
        if (cancelled) return;
        const parsed = raw ? (JSON.parse(raw) as string[]) : [];
        const next = Array.isArray(parsed) ? new Set(parsed) : new Set<string>();
        setSeenKeys(next);
        seenCache = new Set(next);
      } catch {
        if (!cancelled) {
          setSeenKeys(new Set());
          seenCache = new Set();
        }
      } finally {
        if (!cancelled) {
          setSeenLoaded(true);
        }
      }
    })();
    return () => {
      cancelled = true;
      listeners.delete(onSync);
    };
  }, []);

  const allKeys = useMemo(() => {
    const follow = (followQ.data ?? []).map((r) => toFollowKey(r.id));
    const invites = (invitesQ.data ?? []).map((r) => toInviteKey(r.id));
    return [...follow, ...invites];
  }, [followQ.data, invitesQ.data]);
  useEffect(() => {
    allKeysRef.current = allKeys;
  }, [allKeys]);
  useEffect(() => {
    seenKeysRef.current = seenKeys;
  }, [seenKeys]);

  const unreadCount = useMemo(() => {
    if (!seenLoaded) return 0;
    let count = 0;
    for (const key of allKeys) {
      if (!seenKeys.has(key)) count += 1;
    }
    return count;
  }, [allKeys, seenKeys, seenLoaded]);

  const markAllAsSeen = useCallback(async () => {
    const keys = allKeysRef.current;
    if (keys.length === 0) return;
    const merged = new Set(seenKeysRef.current);
    let didChange = false;
    for (const k of keys) {
      if (!merged.has(k)) {
        merged.add(k);
        didChange = true;
      }
    }
    if (didChange) {
      seenKeysRef.current = merged;
      setSeenKeys(merged);
      broadcastSeen(merged);
      await AsyncStorage.setItem(SEEN_NOTIFICATIONS_KEY, JSON.stringify([...merged]));
    }
  }, []);

  return {
    unreadCount,
    hasUnread: unreadCount > 0,
    markAllAsSeen,
    refetchAll: async () => {
      await Promise.all([followQ.refetch(), invitesQ.refetch()]);
    },
  };
}

