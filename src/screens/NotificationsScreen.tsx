import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ProfileStackParamList } from '../navigation/types';
import {
  useAcceptFollowRequest,
  useDeclineFollowRequest,
  useIncomingFollowRequests,
} from '../hooks/useUsers';
import { useDismissIncomingEventInvite, useIncomingEventInvites } from '../hooks/useMatches';
import { navigateToUserProfile } from '../navigation/navigateToUserProfile';
import { useAuthStore } from '../store/auth.store';
import { useTranslation } from '../i18n';
import { colors, spacing, borderRadius, typography } from '../theme';
import { useBottomInset } from '../hooks/useBottomInset';
import type { IncomingFollowRequestItem } from '../api/users.api';
import { useUnreadNotifications } from '../hooks/useUnreadNotifications';

type Props = NativeStackScreenProps<ProfileStackParamList, 'Notifications'>;
type InviteItem = NonNullable<ReturnType<typeof useIncomingEventInvites>['data']>[number];
type RowItem =
  | { kind: 'follow_request'; key: string; item: IncomingFollowRequestItem }
  | { kind: 'event_invite'; key: string; item: InviteItem };

export function NotificationsScreen({ navigation }: Props) {
  const { t, locale } = useTranslation();
  const bottomInset = useBottomInset();
  const currentUser = useAuthStore((s) => s.user);
  const { data, isLoading, refetch, isFetching } = useIncomingFollowRequests();
  const invitesQ = useIncomingEventInvites({ enabled: !!currentUser });
  const dismissInviteMut = useDismissIncomingEventInvite();
  const accept = useAcceptFollowRequest();
  const decline = useDeclineFollowRequest();
  const unread = useUnreadNotifications();
  const isFocused = useIsFocused();

  const connectionRequests = data ?? [];
  const inviteItems = invitesQ.data ?? [];
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
          ? `${u.username} t’a envoyé une invitation de connexion.`
          : `${u.username} sent you a connection request.`;
      return (
        <View style={styles.row}>
          <Pressable
            style={styles.rowMain}
            onPress={() => navigateToUserProfile(navigation, u.id, currentUser?.id)}
          >
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
          </Pressable>
          <View style={styles.actions}>
            <Pressable
              style={[styles.btn, styles.btnDecline]}
              onPress={() => handleDecline(u.id)}
              disabled={decline.isPending || accept.isPending}
            >
              <Ionicons name="close" size={20} color={colors.error} />
            </Pressable>
            <Pressable
              style={[styles.btn, styles.btnAccept]}
              onPress={() => handleAccept(u.id)}
              disabled={decline.isPending || accept.isPending}
            >
              <Ionicons name="checkmark" size={20} color={colors.white} />
            </Pressable>
          </View>
        </View>
      );
    }

    const n = item.item;
    const inviteTitle =
      locale === 'fr' ? 'Invitation à un événement' : 'Event invitation';
    const eventKind =
      n.eventFormat === 'tournament'
        ? locale === 'fr'
          ? 'tournoi'
          : 'tournament'
        : locale === 'fr'
          ? 'match'
          : 'match';
    const inviteBody =
      locale === 'fr'
        ? `${n.inviterUsername} t’a invité à rejoindre un ${eventKind}.`
        : `${n.inviterUsername} invited you to join a ${eventKind}.`;
    return (
      <View style={styles.row}>
        <View style={[styles.avatar, styles.inviteAvatar]}>
          <Ionicons name="mail-open-outline" size={18} color={colors.primary} />
        </View>
        <View style={[styles.rowText, styles.inviteRowText]}>
          <Text style={styles.sectionLabel}>{inviteTitle}</Text>
          <Text style={styles.inviteBodyText} numberOfLines={2}>
            {inviteBody}
          </Text>
        </View>
        <View style={styles.inviteActions}>
          <Pressable
            style={[styles.btn, styles.btnDecline]}
            onPress={() => dismissInviteMut.mutate(n.id)}
            disabled={dismissInviteMut.isPending}
            accessibilityRole="button"
            accessibilityLabel={t('common.cancel')}
          >
            <Ionicons name="close" size={18} color={colors.error} />
          </Pressable>
          <Pressable
            style={[styles.btn, styles.btnAccept]}
            onPress={() => navigation.navigate('MatchDetail', { matchId: n.matchId })}
            accessibilityRole="button"
            accessibilityLabel={locale === 'fr' ? 'Voir' : 'View'}
          >
            <Ionicons name="eye-outline" size={18} color={colors.white} />
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={merged}
        keyExtractor={(item) => item.key}
        renderItem={renderRow}
        refreshing={isFetching}
        onRefresh={() => {
          void refetch();
          void invitesQ.refetch();
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
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
