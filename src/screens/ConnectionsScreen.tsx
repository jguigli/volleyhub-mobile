import React, { useMemo } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { ProfileStackParamList } from '../navigation/types';
import { useFollowers, useFollowing } from '../hooks/useUsers';
import { useAuthStore } from '../store/auth.store';
import { navigateToUserProfile } from '../navigation/navigateToUserProfile';
import { SkillBadge } from '../components/SkillBadge';
import { useTranslation } from '../i18n';
import { borderRadius, colors, spacing, typography } from '../theme';
import type { PublicUser } from '../api/users.api';
import type { Position } from '../types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'Connections'>;

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

export function ConnectionsScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const currentUser = useAuthStore((s) => s.user);
  const { userId } = route.params;
  const followersQ = useFollowers(userId);
  const followingQ = useFollowing(userId);

  const isLoading = followersQ.isLoading || followingQ.isLoading;
  const rows = useMemo(() => {
    const map = new Map<string, PublicUser>();
    for (const u of followersQ.data ?? []) map.set(u.id, u);
    for (const u of followingQ.data ?? []) map.set(u.id, u);
    return [...map.values()].sort((a, b) => a.username.localeCompare(b.username));
  }, [followersQ.data, followingQ.data]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={rows}
      keyExtractor={(u) => u.id}
      contentContainerStyle={styles.list}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListEmptyComponent={
        <View style={styles.centered}>
          <Ionicons name="people-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>{t('profile.relationsOnlyZero')}</Text>
        </View>
      }
      renderItem={({ item }) => (
        <Pressable
          style={styles.row}
          onPress={() => navigateToUserProfile(navigation, item.id, currentUser?.id)}
        >
          <View style={styles.avatar}>
            {item.profilePicture ? (
              <Image source={{ uri: item.profilePicture }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarInitial}>{item.username[0]?.toUpperCase() ?? '?'}</Text>
            )}
          </View>
          <View style={styles.rowInfo}>
            <Text style={styles.username}>{item.username}</Text>
            <View style={styles.rowBadges}>
              <SkillBadge level={item.skillLevel} small />
              <View style={styles.positionPill}>
                <Text style={styles.positionText}>{t(POSITION_KEYS[item.position ?? 'any'])}</Text>
              </View>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { paddingTop: spacing.md, paddingBottom: 40 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  emptyTitle: { ...typography.h3, color: colors.textSecondary, textAlign: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarInitial: { color: colors.white, fontSize: 18, fontWeight: '700' },
  rowInfo: { flex: 1, gap: 4 },
  username: { ...typography.body, fontWeight: '600' },
  rowBadges: { flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap' },
  positionPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  positionText: { ...typography.caption, color: colors.textSecondary, fontWeight: '600' },
  separator: { height: spacing.sm },
});

