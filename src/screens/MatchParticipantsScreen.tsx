import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { MatchesStackParamList } from '../navigation/types';
import { useMatch, useRemoveParticipant } from '../hooks/useMatches';
import { useAuthStore } from '../store/auth.store';
import { SkillBadge } from '../components/SkillBadge';
import { useTranslation } from '../i18n';
import { navigateToUserProfile } from '../navigation/navigateToUserProfile';
import { colors, spacing, borderRadius, typography, shadows } from '../theme';
import { useBottomInset } from '../hooks/useBottomInset';
import type { Position } from '../types';

type Props = NativeStackScreenProps<MatchesStackParamList, 'MatchParticipants'>;

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

export function MatchParticipantsScreen({ route, navigation }: Props) {
  const { matchId } = route.params;
  const bottomInset = useBottomInset();
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const { data: match, isLoading, error } = useMatch(matchId);
  const removeMut = useRemoveParticipant();

  const navigateToProfile = useCallback(
    (userId: string) => {
      navigateToUserProfile(navigation, userId, user?.id);
    },
    [navigation, user?.id],
  );

  const handleRemove = (targetId: string, username: string) => {
    Alert.alert(
      t('match.removeFromEventTitle'),
      t('match.removeFromEventMessage', { name: username }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('match.removeFromEventConfirm'),
          style: 'destructive',
          onPress: async () => {
            try {
              await removeMut.mutateAsync({ matchId, userId: targetId });
            } catch (e: unknown) {
              const msg =
                e instanceof Error ? e.message : t('match.removeFromEventFailed');
              Alert.alert(t('common.error'), msg);
            }
          },
        },
      ],
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (error || !match) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{t('match.loadFailed')}</Text>
      </View>
    );
  }

  const isCreator = user?.id === match.creatorId;
  const sorted = [...match.participants].sort(
    (a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime(),
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: bottomInset }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.subtitle}>
        {t('match.participants', { count: sorted.length })}
      </Text>
      {sorted.map((p) => {
        const canRemove =
          isCreator &&
          p.userId !== match.creatorId &&
          match.status !== 'cancelled';
        return (
          <View key={p.userId} style={styles.row}>
            <TouchableOpacity
              style={styles.rowMain}
              onPress={() => navigateToProfile(p.userId)}
              activeOpacity={0.75}
            >
              {p.user.profilePicture ? (
                <Image
                  source={{ uri: p.user.profilePicture }}
                  style={styles.avatar}
                />
              ) : (
                <View style={[styles.avatar, styles.avatarPh]}>
                  <Text style={styles.avatarInitial}>
                    {p.user.username[0]?.toUpperCase() ?? '?'}
                  </Text>
                </View>
              )}
              <View style={styles.rowInfo}>
                <Text style={styles.name} numberOfLines={1}>
                  {p.user.username}
                  {p.userId === user?.id ? ` (${t('match.youLabel')})` : ''}
                </Text>
                <View style={styles.meta}>
                  <SkillBadge level={p.user.skillLevel} small />
                  <Text style={styles.positionText}>
                    {t(POSITION_KEYS[p.user.position ?? 'any'])}
                  </Text>
                  {p.userId === match.creatorId ? (
                    <Ionicons name="star" size={12} color={colors.warning} />
                  ) : null}
                </View>
              </View>
            </TouchableOpacity>
            {canRemove ? (
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => handleRemove(p.userId, p.user.username)}
                disabled={removeMut.isPending}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="trash-outline" size={22} color={colors.error} />
              </TouchableOpacity>
            ) : null}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: { ...typography.body, color: colors.error },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
    overflow: 'hidden',
  },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    minWidth: 0,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarPh: {
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  rowInfo: { flex: 1, minWidth: 0, gap: 4 },
  name: { ...typography.body, fontWeight: '700', color: colors.text },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  positionText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  removeBtn: { padding: spacing.md },
});
