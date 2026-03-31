import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/auth.store';
import { useFollowers, useFollowing } from '../hooks/useUsers';
import { useInvitePlayerToMatch, useMatch, useSentInviteUserIds } from '../hooks/useMatches';
import { useTranslation } from '../i18n';
import { colors, spacing, borderRadius, typography } from '../theme';
import type { PublicUser } from '../api/users.api';
import { SkillBadge } from '../components/SkillBadge';
import type { Position } from '../types';

type InvitePlayerRoute = {
  InvitePlayer: { matchId: string };
};

type Props = NativeStackScreenProps<InvitePlayerRoute, 'InvitePlayer'>;

const POSITION_KEYS: Record<
  Position,
  | 'auth.positions.setter'
  | 'auth.positions.libero'
  | 'auth.positions.outside_hitter'
  | 'auth.positions.opposite_hitter'
  | 'auth.positions.middle_blocker'
  | 'auth.positions.any'
> = {
  setter: 'auth.positions.setter',
  libero: 'auth.positions.libero',
  outside_hitter: 'auth.positions.outside_hitter',
  opposite_hitter: 'auth.positions.opposite_hitter',
  middle_blocker: 'auth.positions.middle_blocker',
  any: 'auth.positions.any',
};

export function InvitePlayerScreen({ route }: Props) {
  const { t } = useTranslation();
  const me = useAuthStore((s) => s.user);
  const { matchId } = route.params;
  const [query, setQuery] = useState('');
  const [invitedById, setInvitedById] = useState<Record<string, boolean>>({});
  const [pendingInviteUserId, setPendingInviteUserId] = useState<string | null>(null);
  const inviteMut = useInvitePlayerToMatch();
  const matchQ = useMatch(matchId);
  const sentInvitesQ = useSentInviteUserIds(matchId, { enabled: !!me });
  const followersQ = useFollowers(me?.id ?? '');
  const followingQ = useFollowing(me?.id ?? '');

  const candidates = useMemo(() => {
    const byId = new Map<string, PublicUser>();
    for (const u of followersQ.data ?? []) byId.set(u.id, u);
    for (const u of followingQ.data ?? []) byId.set(u.id, u);
    const already = new Set((matchQ.data?.participants ?? []).map((p) => p.userId));
    if (me?.id) already.add(me.id);
    const q = query.trim().toLowerCase();
    return Array.from(byId.values()).filter((u) => {
      if (already.has(u.id)) return false;
      if (!q) return true;
      return u.username.toLowerCase().includes(q);
    });
  }, [followersQ.data, followingQ.data, matchQ.data?.participants, me?.id, query]);

  const loading = matchQ.isLoading || followersQ.isLoading || followingQ.isLoading;

  const invitedSentSet = useMemo(
    () => new Set(sentInvitesQ.data ?? []),
    [sentInvitesQ.data],
  );

  const invite = async (userId: string, username: string) => {
    if (invitedById[userId] || invitedSentSet.has(userId) || pendingInviteUserId === userId) {
      return;
    }
    setInvitedById((prev) => ({ ...prev, [userId]: true }));
    setPendingInviteUserId(userId);
    try {
      await inviteMut.mutateAsync({ matchId, userId });
      setInvitedById((prev) => ({ ...prev, [userId]: true }));
      Alert.alert('', t('match.inviteSentTo', { name: username }));
    } catch (e: unknown) {
      setInvitedById((prev) => ({ ...prev, [userId]: false }));
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('match.inviteFailed'));
    } finally {
      setPendingInviteUserId(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('match.searchPlayerToInvite')}
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
      {candidates.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>{t('match.noInvitablePlayers')}</Text>
        </View>
      ) : (
        <FlatList
          data={candidates}
          keyExtractor={(u) => u.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={styles.avatar}>
                {item.profilePicture ? (
                  <Image source={{ uri: item.profilePicture }} style={styles.avatarImg} />
                ) : (
                  <Text style={styles.avatarInitial}>
                    {item.username[0]?.toUpperCase() ?? '?'}
                  </Text>
                )}
              </View>
              <View style={styles.userMeta}>
                <Text style={styles.username} numberOfLines={1}>
                  {item.username}
                </Text>
                <View style={styles.rowBadges}>
                  <SkillBadge level={item.skillLevel} small />
                </View>
                <Text style={styles.positionTextInline}>
                  {t(POSITION_KEYS[item.position ?? 'any'])}
                </Text>
              </View>
              <Pressable
                onPress={() => invite(item.id, item.username)}
                style={[
                  styles.inviteBtn,
                  (invitedById[item.id] || invitedSentSet.has(item.id)) && styles.inviteBtnSent,
                ]}
                disabled={Boolean(invitedById[item.id]) || invitedSentSet.has(item.id) || inviteMut.isPending}
              >
                {pendingInviteUserId === item.id ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : invitedById[item.id] || invitedSentSet.has(item.id) ? (
                  <Ionicons name="send" size={16} color={colors.white} />
                ) : (
                  <Text style={styles.inviteBtnText}>{t('match.invitePlayer')}</Text>
                )}
              </Pressable>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.md },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    marginBottom: spacing.md,
  },
  input: { flex: 1, ...typography.body, color: colors.text, paddingVertical: 0 },
  list: { gap: spacing.sm },
  row: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    overflow: 'hidden',
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarInitial: { color: colors.white, fontSize: 17, fontWeight: '700' },
  userMeta: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  username: { ...typography.body, color: colors.text, fontWeight: '600' },
  rowBadges: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  positionText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  positionTextInline: {
    ...typography.bodySmall,
    color: colors.textMuted,
    fontWeight: '500',
  },
  inviteBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    minWidth: 52,
    alignItems: 'center',
  },
  inviteBtnSent: {
    backgroundColor: colors.success,
  },
  inviteBtnText: { ...typography.caption, color: colors.white, fontWeight: '700' },
  emptyText: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
});

