import React, { useLayoutEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { MyStackParamList } from '../navigation/types';
import { useMyMatches } from '../hooks/useMatches';
import { useAuthStore } from '../store/auth.store';
import { MatchCard } from '../components/MatchCard';
import { useTranslation } from '../i18n';
import { colors, spacing, borderRadius, typography } from '../theme';
import type { NearbyMatch } from '../types';
import { navigateToUserProfile } from '../navigation/navigateToUserProfile';

type Props = NativeStackScreenProps<MyStackParamList, 'MyMatches'>;

type Tab = 'joined' | 'created';
type StatusFilter = 'all' | 'upcoming' | 'live' | 'finished';

export function MyMatchesScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const { data: allMatches, isLoading, refetch, isFetching } = useMyMatches();
  const [activeTab, setActiveTab] = useState<Tab>('joined');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const created = allMatches?.filter((m) => m.creator_id === user?.id) ?? [];
  const joined = allMatches?.filter((m) => m.creator_id !== user?.id) ?? [];

  const baseMatches = activeTab === 'joined' ? joined : created;
  const now = Date.now();
  const matches = baseMatches.filter((m) => {
    if (statusFilter === 'all') {
      return true;
    }
    const startMs = new Date(m.scheduled_at).getTime();
    const timing: Exclude<StatusFilter, 'all'> =
      m.status === 'completed' || m.status === 'cancelled'
        ? 'finished'
        : now >= startMs
          ? 'live'
          : 'upcoming';
    return timing === statusFilter;
  });

  const emptyTitle = (() => {
    if (activeTab === 'joined') {
      if (statusFilter === 'upcoming') return "Aucun match rejoint à venir pour l'instant";
      if (statusFilter === 'live') return "Aucun match rejoint en cours pour l'instant";
      if (statusFilter === 'finished') return "Aucun match rejoint terminé pour l'instant";
      return t('myMatches.noJoinedYet');
    }
    if (statusFilter === 'upcoming') return "Aucun match créé à venir pour l'instant";
    if (statusFilter === 'live') return "Aucun match créé en cours pour l'instant";
    if (statusFilter === 'finished') return "Aucun match créé terminé pour l'instant";
    return t('myMatches.noCreatedYet');
  })();

  const emptySubtitle = (() => {
    if (activeTab === 'joined') {
      return statusFilter === 'all'
        ? t('myMatches.emptyJoinedHint')
        : 'Essaie un autre filtre pour voir plus de résultats.';
    }
    return statusFilter === 'all'
      ? t('myMatches.emptyCreatedHint')
      : 'Essaie un autre filtre pour voir plus de résultats.';
  })();

  const handleMatchPress = (matchId: string) => {
    navigation.navigate('MatchDetail', { matchId });
  };

  const handleCreatorPress = (userId: string) => {
    navigateToUserProfile(navigation, userId, user?.id);
  };

  const renderCard = ({ item }: { item: NearbyMatch }) => (
    <MatchCard
      match={item}
      hideCreatorRow={activeTab === 'created'}
      onPress={(m) => handleMatchPress(m.id)}
      onCreatorPress={
        activeTab === 'joined'
          ? (userId) => handleCreatorPress(userId)
          : undefined
      }
      onTeamsPress={(m) =>
        navigation.navigate('MatchTeamsBoard', { matchId: m.id })
      }
      onScorePress={(m) => navigation.navigate('EventScore', { matchId: m.id })}
      onCourtsPress={(m) =>
        navigation.navigate('TournamentCourts', { matchId: m.id })
      }
    />
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate('MyMatchesCalendar')}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.headerCalendarBtn}
          accessibilityRole="button"
          accessibilityLabel={t('myMatches.calendarTitle')}
        >
          <Ionicons name="calendar-outline" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
      ),
      headerRight: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate('CreateMatch', {})}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.headerAddBtn}
          accessibilityRole="button"
          accessibilityLabel={t('createMatch.title')}
        >
          <Ionicons name="add" size={24} color={colors.primary} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, t]);

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'joined' && styles.tabActive]}
          onPress={() => setActiveTab('joined')}
        >
          <Ionicons
            name={activeTab === 'joined' ? 'enter' : 'enter-outline'}
            size={16}
            color={activeTab === 'joined' ? colors.primary : colors.textMuted}
          />
          <Text style={[styles.tabText, activeTab === 'joined' && styles.tabTextActive]}>
            {t('myMatches.joined')}
            {joined.length > 0 ? ` (${joined.length})` : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'created' && styles.tabActive]}
          onPress={() => setActiveTab('created')}
        >
          <Ionicons
            name={activeTab === 'created' ? 'add-circle' : 'add-circle-outline'}
            size={16}
            color={activeTab === 'created' ? colors.primary : colors.textMuted}
          />
          <Text style={[styles.tabText, activeTab === 'created' && styles.tabTextActive]}>
            {t('myMatches.created')}
            {created.length > 0 ? ` (${created.length})` : ''}
          </Text>
        </TouchableOpacity>
      </View>
      <View style={styles.statusFiltersWrap}>
        {(['all', 'upcoming', 'live', 'finished'] as StatusFilter[]).map((value) => (
          <TouchableOpacity
            key={value}
            style={[
              styles.statusChip,
              statusFilter === value && styles.statusChipActive,
            ]}
            onPress={() => setStatusFilter(value)}
          >
            <Text
              style={[
                styles.statusChipText,
                statusFilter === value && styles.statusChipTextActive,
              ]}
            >
              {value === 'all'
                ? t('find.all')
                : value === 'upcoming'
                  ? t('match.statusUpcoming')
                  : value === 'live'
                    ? t('match.statusLive')
                    : t('match.statusPast')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : matches.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="calendar-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>{emptyTitle}</Text>
          <Text style={styles.emptySubtitle}>{emptySubtitle}</Text>
        </View>
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(m) => m.id}
          renderItem={renderCard}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={isFetching}
        />
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  statusFiltersWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    justifyContent: 'center',
  },
  statusChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  statusChipText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 13,
  },
  statusChipTextActive: {
    color: colors.white,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    ...typography.body,
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '600',
  },
  tabTextActive: {
    color: colors.primary,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
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
  list: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  headerAddBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCalendarBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -4,
  },
});
