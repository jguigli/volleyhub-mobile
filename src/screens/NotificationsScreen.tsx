import React, { useCallback, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  PanResponder,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { NotificationsStackParamList } from '../navigation/types';
import {
  useAcceptFollowRequest,
  useDeclineFollowRequest,
  useIncomingFollowRequests,
} from '../hooks/useUsers';
import { useDismissIncomingEventInvite, useIncomingEventInvites } from '../hooks/useMatches';
import { useNotificationsList, useDismissNotification } from '../hooks/useNotificationsList';
import { navigateToUserProfile } from '../navigation/navigateToUserProfile';
import { useAuthStore } from '../store/auth.store';
import { useTranslation } from '../i18n';
import { colors, spacing, borderRadius, typography } from '../theme';
import { useBottomInset } from '../hooks/useBottomInset';
import type { IncomingFollowRequestItem } from '../api/users.api';
import type { GeneralNotification, NotificationType } from '../types';
import { useUnreadNotifications } from '../hooks/useUnreadNotifications';

type Props = NativeStackScreenProps<NotificationsStackParamList, 'Notifications'>;
type InviteItem = NonNullable<ReturnType<typeof useIncomingEventInvites>['data']>[number];
type RowItem =
  | { kind: 'follow_request'; key: string; item: IncomingFollowRequestItem }
  | { kind: 'event_invite'; key: string; item: InviteItem }
  | { kind: 'general'; key: string; item: GeneralNotification };

const NOTIF_ICON: Record<NotificationType, string> = {
  player_joined: 'person-add',
  match_almost_full: 'alert-circle-outline',
  event_invite: 'mail-open-outline',
  match_renewed_invite: 'refresh-outline',
  event_settings_changed: 'settings-outline',
  event_started_early: 'play-circle-outline',
  event_deleted: 'trash-outline',
  player_removed: 'person-remove-outline',
  event_full: 'people',
  event_completed: 'trophy-outline',
  opponent_score_locked: 'lock-closed-outline',
  score_overridden: 'create-outline',
  connection_accepted: 'person-add-outline',
  player_left_event: 'exit-outline',
  event_reminder_30min: 'alarm-outline',
  chat_message: 'chatbubble-ellipses-outline',
};

const SWIPE_THRESHOLD = -80;
const DELETE_WIDTH = 72;

function SwipeableRow({
  onDelete,
  children,
  openRowRef,
}: {
  onDelete: () => void;
  children: React.ReactNode;
  openRowRef: React.MutableRefObject<{ close: () => void } | null>;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const selfRef = useRef<{ close: () => void }>({
    close: () => {
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        overshootClamping: true,
      }).start();
    },
  });

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > 10 && Math.abs(gs.dy) < 20,
      onPanResponderGrant: () => {
        if (openRowRef.current && openRowRef.current !== selfRef.current) {
          openRowRef.current.close();
        }
      },
      onPanResponderMove: (_, gs) => {
        if (gs.dx < 0) {
          translateX.setValue(Math.max(gs.dx, -DELETE_WIDTH - 20));
        }
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dx < SWIPE_THRESHOLD) {
          Animated.spring(translateX, {
            toValue: -DELETE_WIDTH,
            useNativeDriver: true,
            overshootClamping: true,
          }).start();
          openRowRef.current = selfRef.current;
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            overshootClamping: true,
          }).start();
          if (openRowRef.current === selfRef.current) {
            openRowRef.current = null;
          }
        }
      },
    }),
  ).current;

  return (
    <View style={styles.swipeContainer}>
      <View style={styles.deleteAction}>
        <Pressable style={styles.deleteBtn} onPress={onDelete}>
          <Ionicons name="trash-outline" size={20} color={colors.white} />
        </Pressable>
      </View>
      <Animated.View
        style={{ transform: [{ translateX }] }}
        {...panResponder.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  );
}

export function NotificationsScreen({ navigation }: Props) {
  const { t, locale } = useTranslation();
  const bottomInset = useBottomInset();
  const currentUser = useAuthStore((s) => s.user);
  const { data, isLoading, refetch, isFetching } = useIncomingFollowRequests();
  const invitesQ = useIncomingEventInvites({ enabled: !!currentUser });
  const notifsQ = useNotificationsList();
  const dismissNotifMut = useDismissNotification();
  const dismissInviteMut = useDismissIncomingEventInvite();
  const accept = useAcceptFollowRequest();
  const decline = useDeclineFollowRequest();
  const unread = useUnreadNotifications();
  const isFocused = useIsFocused();
  const openRowRef = useRef<{ close: () => void } | null>(null);

  const connectionRequests = data ?? [];
  const inviteItems = invitesQ.data ?? [];
  const generalNotifs = notifsQ.data ?? [];
  const merged: RowItem[] = [
    ...connectionRequests.map((item) => ({
      kind: 'follow_request' as const,
      key: `fr:${item.id}`,
      item,
    })),
    ...inviteItems.map((item) => ({
      kind: 'event_invite' as const,
      key: `ei:${item.id}`,
      item,
    })),
    ...generalNotifs.map((item) => ({
      kind: 'general' as const,
      key: `gn:${item.id}`,
      item,
    })),
  ];
  merged.sort((a, b) => {
    const da =
      a.kind === 'follow_request'
        ? a.item.createdAt
        : a.item.createdAt;
    const db =
      b.kind === 'follow_request'
        ? b.item.createdAt
        : b.item.createdAt;
    return da < db ? 1 : -1;
  });

  // Group by date
  const formatDateKey = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 86400000);
    const itemDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (itemDate.getTime() === today.getTime()) return locale === "fr" ? "Aujourd\u0027hui" : "Today";
    if (itemDate.getTime() === yesterday.getTime()) return locale === "fr" ? "Hier" : "Yesterday";
    return d.toLocaleDateString(locale === "fr" ? "fr-FR" : "en-US", { weekday: "long", day: "numeric", month: "long" });
  };

  const sections = React.useMemo(() => {
    const groups = new Map<string, RowItem[]>();
    for (const item of merged) {
      const dateStr =
        item.kind === "follow_request" ? item.item.createdAt
        : item.kind === "event_invite" ? item.item.createdAt
        : item.item.createdAt;
      const key = formatDateKey(dateStr);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(item);
    }
    return Array.from(groups.entries()).map(([title, data]) => ({ title, data }));
  }, [merged, locale]);

  React.useEffect(() => {
    if (!isFocused) return;
    void unread.markAllAsSeen();
  }, [isFocused, merged.length, unread.markAllAsSeen]);

  const handleAccept = async (requesterId: string) => {
    try {
      await accept.mutateAsync(requesterId);
    } catch {
      /* optional toast */
    }
  };

  const handleDecline = async (requesterId: string) => {
    try {
      await decline.mutateAsync(requesterId);
    } catch {
      /* optional */
    }
  };

  const getGeneralAction = useCallback(
    (n: GeneralNotification) => {
      switch (n.type) {
        case 'connection_accepted':
          return n.actorId
            ? () => navigateToUserProfile(navigation, n.actorId!, currentUser?.id)
            : null;
        case 'opponent_score_locked':
          return n.matchId
            ? () => (navigation as any).navigate('TournamentCourts', { matchId: n.matchId })
            : null;
        case 'score_overridden':
        case 'event_completed':
          return n.matchId
            ? () => (navigation as any).navigate('EventScore', { matchId: n.matchId })
            : null;
        case 'chat_message':
          return n.matchId
            ? () => (navigation as any).navigate('MatchChat', { matchId: n.matchId })
            : null;
        case 'event_deleted':
        case 'player_removed':
          return null;
        default:
          return n.matchId
            ? () => (navigation as any).navigate('MatchDetail', { matchId: n.matchId })
            : null;
      }
    },
    [navigation, currentUser?.id],
  );

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const renderRow = ({ item }: { item: RowItem }) => {
    if (item.kind === 'follow_request') {
      const u = item.item.requester;
      const connectionBody =
        locale === 'fr'
          ? `${u.username} t'a envoy\u00e9 une invitation de connexion.`
          : `${u.username} sent you a connection request.`;
      return (
        <SwipeableRow onDelete={() => handleDecline(u.id)} openRowRef={openRowRef}>
          <Pressable
            style={styles.row}
            onPress={() => navigateToUserProfile(navigation, u.id, currentUser?.id)}
          >
            <View style={styles.rowMain}>
              <View style={styles.avatar}>
                {u.profilePicture ? (
                  <Image source={{ uri: u.profilePicture }} style={styles.avatarImg} />
                ) : (
                  <Text style={styles.avatarLetter}>{u.username[0]?.toUpperCase() ?? '?'}</Text>
                )}
              </View>
              <View style={[styles.rowText, styles.inviteRowText]}>
                <Text style={styles.sectionLabel}>{t('notifications.connectionRequest')}</Text>
                <Text style={styles.inviteBodyText} numberOfLines={2}>
                  {connectionBody}
                </Text>
              </View>
            </View>
            <View style={styles.actions}>
              <Pressable
                style={[styles.btn, styles.btnAccept]}
                onPress={() => handleAccept(u.id)}
                disabled={decline.isPending || accept.isPending}
              >
                <Ionicons name="checkmark" size={20} color={colors.white} />
              </Pressable>
            </View>
          </Pressable>
        </SwipeableRow>
      );
    }

    if (item.kind === "event_invite") {
      const inv = item.item;
      const inviteTitle =
        locale === "fr" ? "Invitation \u00e0 un \u00e9v\u00e9nement" : "Event invitation";
      const eventKind =
        inv.eventFormat === "tournament"
          ? locale === "fr" ? "tournoi" : "tournament"
          : "match";
      const inviteBody =
        locale === "fr"
          ? `${inv.inviterUsername} t\u0027a invit\u00e9 \u00e0 rejoindre un ${eventKind}.`
          : `${inv.inviterUsername} invited you to join a ${eventKind}.`;
      return (
        <SwipeableRow onDelete={() => dismissInviteMut.mutate(inv.id)} openRowRef={openRowRef}>
          <Pressable
            style={styles.row}
            onPress={() => navigation.navigate("MatchDetail" as any, { matchId: inv.matchId })}
          >
            <View style={styles.rowMain}>
              <View style={[styles.avatar, styles.inviteAvatar]}>
                <Ionicons name="mail-open-outline" size={18} color={colors.primary} />
              </View>
              <View style={[styles.rowText, styles.inviteRowText]}>
                <Text style={styles.sectionLabel}>{inviteTitle}</Text>
                <Text style={styles.inviteBodyText} numberOfLines={2}>
                  {inviteBody}
                </Text>
              </View>
            </View>
          </Pressable>
        </SwipeableRow>
      );
    }

    // General notifications
    const n = item.item;
    const iconName = NOTIF_ICON[n.type] ?? "notifications-outline";
    const bodyText = t(`notifications.type_${n.type}` as any, {
      actor: n.actorUsername ?? "",
      ...(n.extra ?? {}),
    });

    // Header label per category
    const headerLabel = (() => {
      switch (n.type) {
        case "event_settings_changed":
        case "event_started_early":
        case "event_deleted":
          return t("notifications.headerOrganizerAction");
        case "player_removed":
          return t("notifications.headerRemoved");
        case "player_joined":
        case "match_almost_full":
        case "event_full":
        case "player_left_event":
          return t("notifications.headerPlayers");
        case "event_completed":
          return t("notifications.headerResult");
        case "opponent_score_locked":
        case "score_overridden":
          return t("notifications.headerScore");
        case "connection_accepted":
          return t("notifications.headerSocial");
        case "event_invite":
        case "match_renewed_invite":
          return t("notifications.headerInvite");
        case "event_reminder_30min":
          return t("notifications.headerReminder");
        case "chat_message":
          return t("notifications.headerChat");
        default:
          return t("notifications.headerGeneral");
      }
    })();

    const onTap = getGeneralAction(n);

    return (
      <SwipeableRow onDelete={() => dismissNotifMut.mutate(n.id)} openRowRef={openRowRef}>
        <Pressable
          style={styles.row}
          onPress={onTap ?? undefined}
          disabled={!onTap}
        >
          <View style={styles.rowMain}>
            <View style={[styles.avatar, styles.generalAvatar]}>
              <Ionicons name={iconName as any} size={18} color={colors.primary} />
            </View>
            <View style={[styles.rowText, styles.inviteRowText]}>
              <Text style={styles.sectionLabel}>{headerLabel}</Text>
              <Text style={styles.inviteBodyText} numberOfLines={3}>
                {bodyText}
              </Text>
            </View>
          </View>
          {onTap ? (
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          ) : null}
        </Pressable>
      </SwipeableRow>
    );
  };

  return (
    <View style={styles.container}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.key}
        renderItem={renderRow}
        renderSectionHeader={({ section: { title } }) => (
          <View style={styles.sectionDateHeader}>
            <Text style={styles.sectionDateText}>{title}</Text>
          </View>
        )}
        stickySectionHeadersEnabled={false}
        refreshing={isFetching}
        onRefresh={() => {
          void refetch();
          void invitesQ.refetch();
          void notifsQ.refetch();
        }}
        contentContainerStyle={[styles.list, { paddingBottom: bottomInset, flexGrow: 1 }]}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="notifications-off-outline" size={56} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>{t('notifications.emptyTitle')}</Text>
            <Text style={styles.emptySubtitle}>{t('notifications.emptySubtitle')}</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: spacing.md,
  },
  swipeContainer: {
    marginBottom: spacing.sm,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  deleteAction: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.error,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: spacing.lg,
  },
  deleteBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minWidth: 0,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  sectionDateHeader: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.xs,
  },
  sectionDateText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 2,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarLetter: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
  },
  inviteAvatar: {
    backgroundColor: colors.primary + '18',
  },
  generalAvatar: {
    backgroundColor: colors.primary + '18',
  },
  inviteRowText: {
    marginLeft: spacing.xs,
  },
  username: {
    ...typography.body,
    fontWeight: '600',
  },
  inviteBodyText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  inviteActions: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginLeft: spacing.sm,
  },
  btn: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnDecline: {
    backgroundColor: colors.error + '18',
  },
  btnAccept: {
    backgroundColor: colors.primary,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
