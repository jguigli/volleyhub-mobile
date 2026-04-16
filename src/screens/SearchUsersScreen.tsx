import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { ProfileStackParamList } from '../navigation/types';
import { useAuthStore } from '../store/auth.store';
import { navigateToUserProfile } from '../navigation/navigateToUserProfile';
import { SkillBadge } from '../components/SkillBadge';
import { useTranslation } from '../i18n';
import { colors, spacing, borderRadius, typography } from '../theme';
import { usersApi, type PublicUser } from '../api/users.api';

type Props = NativeStackScreenProps<ProfileStackParamList, 'SearchUsers'>;

export function SearchUsersScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const currentUser = useAuthStore((s) => s.user);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce the query by 300ms to avoid spamming the API on each keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const enabled = debouncedQuery.length >= 2;
  const { data: results = [], isFetching } = useQuery<PublicUser[]>({
    queryKey: ['users', 'search', debouncedQuery],
    queryFn: () => usersApi.searchUsers(debouncedQuery),
    enabled,
    staleTime: 30_000,
  });

  const hasQuery = query.trim().length > 0;
  const tooShort = hasQuery && debouncedQuery.length < 2;

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
        {isFetching && enabled ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : null}
      </View>

      {!hasQuery ? (
        <View style={styles.centered}>
          <Ionicons name="person-outline" size={48} color={colors.textMuted} />
          <Text style={styles.hint}>{t('userList.searchHint')}</Text>
        </View>
      ) : tooShort ? (
        <View style={styles.centered}>
          <Text style={styles.hint}>{t('userList.searchTooShort')}</Text>
        </View>
      ) : results.length === 0 && !isFetching ? (
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
                {item.profilePicture ? (
                  <Image
                    source={{ uri: item.profilePicture }}
                    style={styles.avatarImg}
                  />
                ) : (
                  <Text style={styles.avatarInitial}>
                    {item.username[0]?.toUpperCase() ?? '?'}
                  </Text>
                )}
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
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
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
