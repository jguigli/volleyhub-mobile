import AsyncStorage from '@react-native-async-storage/async-storage';

const INVITE_NOTIFS_KEY = 'invite_notifications_v1';
const MAX_INVITES = 50;

export type InviteNotificationItem = {
  id: string;
  matchId: string;
  title: string;
  body: string;
  createdAt: string;
};

export async function listInviteNotifications(): Promise<InviteNotificationItem[]> {
  try {
    const raw = await AsyncStorage.getItem(INVITE_NOTIFS_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as InviteNotificationItem[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  } catch {
    return [];
  }
}

export async function saveInviteNotification(args: {
  matchId: string;
  title: string;
  body: string;
}): Promise<void> {
  const next: InviteNotificationItem = {
    id: `${args.matchId}:${Date.now()}`,
    matchId: args.matchId,
    title: args.title,
    body: args.body,
    createdAt: new Date().toISOString(),
  };
  const current = await listInviteNotifications();
  const merged = [next, ...current].slice(0, MAX_INVITES);
  await AsyncStorage.setItem(INVITE_NOTIFS_KEY, JSON.stringify(merged));
}

