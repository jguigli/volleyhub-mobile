import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FindStackParamList } from '../navigation/types';
import { MatchCard } from '../components/MatchCard';
import { useMyMatches, useNearbyMatches } from '../hooks/useMatches';
import { useLocation } from '../hooks/useLocation';
import { colors, spacing, borderRadius, typography } from '../theme';
import type { NearbyMatch, SkillLevel } from '../types';
import { useTranslation } from '../i18n';
import { useAuthStore } from '../store/auth.store';
import { navigateToUserProfile } from '../navigation/navigateToUserProfile';

type Props = NativeStackScreenProps<FindStackParamList, 'MatchList'>;

type DistanceFilterKm = 'all' | 5 | 10 | 20 | 50;
type FormatFilter = 'all' | 'match' | 'tournament';
type DateFilter = 'all' | 'today' | 'week';
type TimingFilter = 'all' | 'upcoming' | 'live';
const SKILL_FILTERS: (SkillLevel | 'all')[] = [
  'all',
  'beginner',
  'intermediate',
  'advanced',
];
const DISTANCE_FILTERS_KM: DistanceFilterKm[] = ['all', 5, 10, 20, 50];

export function MatchListScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const currentUser = useAuthStore((s) => s.user);
  const { lat, lng } = useLocation();
  const [showFilters, setShowFilters] = useState(false);
  const [skillFilter, setSkillFilter] = useState<SkillLevel | 'all'>('all');
  const [distanceKm, setDistanceKm] = useState<DistanceFilterKm>('all');
  const [formatFilter, setFormatFilter] = useState<FormatFilter>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [timingFilter, setTimingFilter] = useState<TimingFilter>('all');
  const labels = {
    filters: 'Filtres',
    level: 'Niveau',
    beginner: 'Débutant',
    intermediate: 'Intermédiaire',
    advanced: 'Confirmé',
    distance: 'Distance',
    eventType: 'Type',
    match: 'Match',
    tournament: 'Tournoi',
    date: 'Date',
    today: "Aujourd'hui",
    thisWeek: 'Cette semaine',
    status: 'Statut',
    live: 'En cours',
    upcoming: 'À venir',
  };

  const nearbyQuery = useNearbyMatches({
    lat: lat ?? undefined,
    lng: lng ?? undefined,
    radius: distanceKm === 'all' ? 1000000 : distanceKm * 1000,
    skillLevel: skillFilter !== 'all' ? skillFilter : undefined,
  });
  const myMatchesQuery = useMyMatches();

  const rawMatches = nearbyQuery.data ?? [];
  const myMatchIds = new Set((myMatchesQuery.data ?? []).map((m) => m.id));
  const now = Date.now();
  const matches = rawMatches.filter((m) => {
    if (myMatchIds.has(m.id)) return false;

    if (formatFilter !== 'all') {
      const isTournament = m.event_format === 'tournament';
      if (formatFilter === 'tournament' && !isTournament) return false;
      if (formatFilter === 'match' && isTournament) return false;
    }

    const startMs = new Date(m.scheduled_at).getTime();
    const timing: TimingFilter | 'past' =
      m.status === 'completed' || m.status === 'cancelled'
        ? 'past'
        : now >= startMs
          ? 'live'
          : 'upcoming';
    if (timingFilter !== 'all' && timing !== timingFilter) return false;

    if (dateFilter === 'today') {
      const startDay = new Date(startMs).toDateString();
      const today = new Date(now).toDateString();
      if (startDay !== today) return false;
    }
    if (dateFilter === 'week') {
      const weekLimit = now + 7 * 24 * 60 * 60 * 1000;
      if (startMs < now || startMs > weekLimit) return false;
    }
    return true;
  });
  const isLoading = nearbyQuery.isLoading;

  const handleMatchPress = (match: NearbyMatch) => {
    navigation.navigate('MatchDetail', { matchId: match.id });
  };

  const handleCreatorPress = (userId: string) => {
    navigateToUserProfile(navigation, userId, currentUser?.id);
  };

  return (
    <View style={styles.container}>
      {/* Filter toggle + panel (Explorer) */}
      <View style={styles.filterToggleWrap}>
        <TouchableOpacity
          style={[styles.filterToggleBtn, showFilters && styles.filterToggleBtnActive]}
          onPress={() => setShowFilters((v) => !v)}
        >
          <Ionicons
            name="options-outline"
            size={18}
            color={showFilters ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[
              styles.filterToggleText,
              showFilters && styles.filterToggleTextActive,
            ]}
          >
            {labels.filters}
          </Text>
        </TouchableOpacity>
      </View>

      {showFilters && (
        <View style={styles.filtersPanel}>
          <View style={styles.filterRow}>
                <Text style={styles.filterLabel}>{labels.level}</Text>
                <View style={styles.filterChipsWrap}>
                  {SKILL_FILTERS.map((level) => (
                    <TouchableOpacity
                      key={level}
                      style={[
                        styles.filterChip,
                        skillFilter === level && styles.filterChipActive,
                        skillFilter === level &&
                          level === 'beginner' &&
                          styles.filterChipBeginnerActive,
                        skillFilter === level &&
                          level === 'intermediate' &&
                          styles.filterChipIntermediateActive,
                        skillFilter === level &&
                          level === 'advanced' &&
                          styles.filterChipAdvancedActive,
                      ]}
                      onPress={() => setSkillFilter(level)}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          skillFilter === level && styles.filterChipTextActive,
                        ]}
                      >
                        {level === 'all'
                          ? t('find.all')
                          : level === 'beginner'
                            ? labels.beginner
                            : level === 'intermediate'
                              ? labels.intermediate
                              : labels.advanced}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.filterRow}>
                <Text style={styles.filterLabel}>{labels.distance}</Text>
                <View style={styles.filterChipsWrap}>
                  {DISTANCE_FILTERS_KM.map((distance) => (
                    <TouchableOpacity
                      key={distance}
                      style={[
                        styles.filterChip,
                        distanceKm === distance && styles.filterChipActive,
                      ]}
                      onPress={() => setDistanceKm(distance)}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          distanceKm === distance && styles.filterChipTextActive,
                        ]}
                      >
                        {distance === 'all' ? t('find.all') : `${distance} km`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.filterRow}>
                <Text style={styles.filterLabel}>{labels.eventType}</Text>
                <View style={styles.filterChipsWrap}>
                  {(['all', 'match', 'tournament'] as FormatFilter[]).map((value) => (
                    <TouchableOpacity
                      key={value}
                      style={[
                        styles.filterChip,
                        formatFilter === value && styles.filterChipActive,
                        formatFilter === value &&
                          value === 'match' &&
                          styles.filterChipMatchActive,
                        formatFilter === value &&
                          value === 'tournament' &&
                          styles.filterChipTournamentActive,
                      ]}
                      onPress={() => setFormatFilter(value)}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          formatFilter === value && styles.filterChipTextActive,
                        ]}
                      >
                        {value === 'all'
                          ? t('find.all')
                          : value === 'match'
                            ? labels.match
                            : labels.tournament}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.filterRow}>
                <Text style={styles.filterLabel}>{labels.date}</Text>
                <View style={styles.filterChipsWrap}>
                  {(['all', 'today', 'week'] as DateFilter[]).map((value) => (
                    <TouchableOpacity
                      key={value}
                      style={[
                        styles.filterChip,
                        dateFilter === value && styles.filterChipActive,
                      ]}
                      onPress={() => setDateFilter(value)}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          dateFilter === value && styles.filterChipTextActive,
                        ]}
                      >
                        {value === 'all'
                          ? t('find.all')
                          : value === 'today'
                            ? labels.today
                            : labels.thisWeek}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.filterRow}>
                <Text style={styles.filterLabel}>{labels.status}</Text>
                <View style={styles.filterChipsWrap}>
                  {(['all', 'upcoming', 'live'] as TimingFilter[]).map((value) => (
                    <TouchableOpacity
                      key={value}
                      style={[
                        styles.filterChip,
                        timingFilter === value && styles.filterChipActive,
                      ]}
                      onPress={() => setTimingFilter(value)}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          timingFilter === value && styles.filterChipTextActive,
                        ]}
                      >
                        {value === 'all'
                          ? t('find.all')
                          : value === 'live'
                            ? labels.live
                            : labels.upcoming}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
        </View>
      )}

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.loadingText}>{t('find.findingMatches')}</Text>
        </View>
      ) : matches.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="search-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>{t('find.noMatchesFound')}</Text>
          <Text style={styles.emptySubtitle}>{t('find.noMatchesSubtitle')}</Text>
        </View>
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MatchCard
              match={item}
              onPress={handleMatchPress}
              onCreatorPress={handleCreatorPress}
              onTeamsPress={(m) =>
                navigation.navigate('MatchTeamsBoard', { matchId: m.id })
              }
              onScorePress={(m) =>
                navigation.navigate('EventScore', { matchId: m.id })
              }
              onCourtsPress={(m) =>
                navigation.navigate('TournamentCourts', { matchId: m.id })
              }
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onRefresh={nearbyQuery.refetch}
          refreshing={nearbyQuery.isFetching}
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
  filterChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  filterChipMatchActive: {
    borderColor: '#1D4ED8',
    backgroundColor: '#1D4ED8',
  },
  filterChipTournamentActive: {
    borderColor: '#7C3AED',
    backgroundColor: '#7C3AED',
  },
  filterChipBeginnerActive: {
    borderColor: '#16A34A',
    backgroundColor: '#16A34A',
  },
  filterChipIntermediateActive: {
    borderColor: '#EAB308',
    backgroundColor: '#EAB308',
  },
  filterChipAdvancedActive: {
    borderColor: '#DC2626',
    backgroundColor: '#DC2626',
  },
  filterChipText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: colors.white,
  },
  filterToggleWrap: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  filterToggleBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  filterToggleBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '16',
  },
  filterToggleText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  filterToggleTextActive: {
    color: colors.primary,
  },
  filtersPanel: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  filterRow: {
    gap: spacing.xs,
  },
  filterLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  filterChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  list: {
    paddingTop: spacing.sm,
    paddingBottom: 80,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
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
