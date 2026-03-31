import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { ProfileStackParamList } from '../navigation/types';
import { useAuthStore } from '../store/auth.store';
import { navigateToUserProfile } from '../navigation/navigateToUserProfile';
import { SkillBadge } from '../components/SkillBadge';
import { useTranslation } from '../i18n';
import { colors, spacing, borderRadius, typography } from '../theme';
import type { PublicUser } from '../api/users.api';

type Props = NativeStackScreenProps<ProfileStackParamList, 'SearchUsers'>;

/** Données factices — remplacer par un appel API quand le back sera prêt */
const MOCK_SEARCH_USERS: PublicUser[] = [
  {
    id: 'mock-search-1',
    username: 'beach_volley_alex',
    skillLevel: 'intermediate',
    position: 'outside_hitter',
    club: null,
    competition: null,
    league: null,
    profilePicture: null,
    bio: null,
    createdAt: '2024-01-01T00:00:00.000Z',
    followersCount: 3,
    followingCount: 5,
  },
  {
    id: 'mock-search-2',
    username: 'setter_marie',
    skillLevel: 'advanced',
    position: 'setter',
    club: null,
    competition: null,
    league: null,
    profilePicture: null,
    bio: null,
    createdAt: '2024-02-15T00:00:00.000Z',
    followersCount: 12,
    followingCount: 4,
  },
  {
    id: 'mock-search-3',
    username: 'libero_tom',
    skillLevel: 'beginner',
    position: 'libero',
    club: null,
    competition: null,
    league: null,
    profilePicture: null,
    bio: null,
    createdAt: '2024-03-20T00:00:00.000Z',
    followersCount: 1,
    followingCount: 2,
  },
];

export function SearchUsersScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const currentUser = useAuthStore((s) => s.user);
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return MOCK_SEARCH_USERS.filter((u) => u.username.toLowerCase().includes(q));
  }, [query]);

  const hasQuery = query.trim().length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={20} color={colors.textMuted} />
        <TextInput
          style={styles.input}
          placeholder={t('userList.searchPlaceholder')}
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          {...(Platform.OS === 'ios'
            ? ({ clearButtonMode: 'while-editing' } as const)
            : {})}
        />
      </View>

      {!hasQuery ? (
        <View style={styles.centered}>
          <Ionicons name="person-outline" size={48} color={colors.textMuted} />
          <Text style={styles.hint}>{t('userList.searchHint')}</Text>
        </View>
      ) : results.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.noResults}>{t('userList.noResults')}</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(u) => u.id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              onPress={() =>
                navigateToUserProfile(navigation, item.id, currentUser?.id)
              }
              activeOpacity={0.7}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarInitial}>
                  {item.username[0]?.toUpperCase() ?? '?'}
                </Text>
              </View>
              <View style={styles.rowInfo}>
                <Text style={styles.username}>{item.username}</Text>
                <SkillBadge level={item.skillLevel} small />
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    paddingVertical: 0,
  },
  list: {
    marginTop: spacing.md,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '700',
  },
  rowInfo: {
    flex: 1,
    gap: 4,
  },
  username: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: spacing.md + 44 + spacing.md,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.xl,
  },
  hint: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  noResults: {
    ...typography.h3,
    color: colors.textSecondary,
  },
});
