import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { matchesApi } from '../api/matches.api';

function keyFor(userId: string, matchId: string): string {
  return `chat_seen_ts_v1:${userId}:${matchId}`;
}

const seenTsCache = new Map<string, number>();
const listeners = new Map<string, Set<(ts: number) => void>>();

function subscribeSeen(key: string, cb: (ts: number) => void): () => void {
  const set = listeners.get(key) ?? new Set<(ts: number) => void>();
  set.add(cb);
  listeners.set(key, set);
  return () => {
    const current = listeners.get(key);
    if (!current) return;
    current.delete(cb);
    if (current.size === 0) listeners.delete(key);
  };
}

function publishSeen(key: string, ts: number) {
  seenTsCache.set(key, ts);
  const set = listeners.get(key);
  if (!set) return;
  for (const cb of set) cb(ts);
}

export function useUnreadMatchChat(matchId: string, userId?: string) {
  const [seenAt, setSeenAt] = useState<number>(0);
  const [hasUnread, setHasUnread] = useState(false);
  const seenAtRef = useRef(0);
  const storageKey = useMemo(
    () => (userId && matchId ? keyFor(userId, matchId) : null),
    [matchId, userId],
  );

  useEffect(() => {
    seenAtRef.current = seenAt;
  }, [seenAt]);

  useEffect(() => {
    let cancelled = false;
    if (!storageKey) {
      setSeenAt(0);
      setHasUnread(false);
      return;
    }
    const unsub = subscribeSeen(storageKey, (ts) => {
      setSeenAt(ts);
      setHasUnread(false);
    });
    (async () => {
      const cached = seenTsCache.get(storageKey);
      if (cached != null) {
        if (!cancelled) setSeenAt(cached);
        return;
      }
      try {
        const raw = await AsyncStorage.getItem(storageKey);
        if (cancelled) return;
        const ts = raw ? Number(raw) || 0 : 0;
        seenTsCache.set(storageKey, ts);
        setSeenAt(ts);
      } catch {
        if (!cancelled) setSeenAt(0);
      }
    })();
    return () => {
      cancelled = true;
      unsub();
    };
  }, [storageKey]);

  const refresh = useCallback(async () => {
    if (!userId || !matchId) {
      setHasUnread(false);
      return;
    }
    try {
      const res = await matchesApi.getChatMessages(matchId);
      const latestFromOthers = res.messages
        .filter((m) => m.userId !== userId)
        .reduce((max, m) => Math.max(max, new Date(m.createdAt).getTime()), 0);
      setHasUnread(latestFromOthers > seenAtRef.current);
    } catch {
      setHasUnread(false);
    }
  }, [matchId, userId]);

  const markSeen = useCallback(async () => {
    if (!storageKey) return;
    const now = Date.now();
    publishSeen(storageKey, now);
    setSeenAt(now);
    setHasUnread(false);
    await AsyncStorage.setItem(storageKey, String(now));
  }, [storageKey]);

  return { hasUnread, refresh, markSeen };
}

