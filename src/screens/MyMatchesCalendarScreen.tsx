import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
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

type Props = NativeStackScreenProps<MyStackParamList, 'MyMatchesCalendar'>;

const WEEKDAY_KEYS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
const WEEKDAY_KEYS_EN = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function toDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function monthLabel(date: Date, localeTag: string): string {
  return new Intl.DateTimeFormat(localeTag, { month: 'long', year: 'numeric' }).format(date);
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function MyMatchesCalendarScreen({ navigation }: Props) {
  const { t, locale } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const { data: allMatches, isLoading, refetch, isFetching } = useMyMatches();
  const [displayMonth, setDisplayMonth] = useState(() => new Date());
  const [selectedDayKey, setSelectedDayKey] = useState(() => toDayKey(new Date()));

  const allMyMatches = allMatches ?? [];

  const matchesByDay = useMemo(() => {
    const map = new Map<string, NearbyMatch[]>();
    for (const m of allMyMatches) {
      const key = toDayKey(new Date(m.scheduled_at));
      const current = map.get(key);
      if (current) {
        current.push(m);
      } else {
        map.set(key, [m]);
      }
    }
    for (const list of map.values()) {
      list.sort((a, b) =>
        new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime(),
      );
    }
    return map;
  }, [allMyMatches]);

  const selectedDayMatches = matchesByDay.get(selectedDayKey) ?? [];

  const monthStart = startOfMonth(displayMonth);
  const monthEnd = endOfMonth(displayMonth);
  const firstDayOffset = monthStart.getDay();
  const totalDays = monthEnd.getDate();

  const cells: Array<{ key: string; day?: number }> = [];
  for (let i = 0; i < firstDayOffset; i += 1) {
    cells.push({ key: `empty-start-${i}` });
  }
  for (let day = 1; day <= totalDays; day += 1) {
    cells.push({ key: `day-${day}`, day });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ key: `empty-end-${cells.length}` });
  }

  const monthTitle = monthLabel(displayMonth, locale === 'fr' ? 'fr-FR' : 'en-US');
  const weekdayLabels = locale === 'fr' ? WEEKDAY_KEYS : WEEKDAY_KEYS_EN;

  const renderCalendarDay = (cell: { key: string; day?: number }) => {
    if (!cell.day) {
      return <View key={cell.key} style={styles.dayCell} />;
    }
    const date = new Date(displayMonth.getFullYear(), displayMonth.getMonth(), cell.day);
    const key = toDayKey(date);
    const hasEvent = (matchesByDay.get(key)?.length ?? 0) > 0;
    const isSelected = key === selectedDayKey;
    return (
      <Pressable
        key={cell.key}
        style={[
          styles.dayCell,
          hasEvent && styles.dayCellHighlighted,
          isSelected && styles.dayCellSelected,
        ]}
        onPress={() => setSelectedDayKey(key)}
      >
        <Text
          style={[
            styles.dayCellText,
            hasEvent && styles.dayCellTextHighlighted,
            isSelected && styles.dayCellTextSelected,
          ]}
        >
          {cell.day}
        </Text>
      </Pressable>
    );
  };

  const renderCard = ({ item }: { item: NearbyMatch }) => (
    <MatchCard
      match={item}
      onPress={(m) => navigation.navigate('MatchDetail', { matchId: m.id })}
      onCreatorPress={(userId) => navigateToUserProfile(navigation, userId, user?.id)}
      onTeamsPress={(m) => navigation.navigate('MatchTeamsBoard', { matchId: m.id })}
      onScorePress={(m) => navigation.navigate('EventScore', { matchId: m.id })}
      onCourtsPress={(m) => navigation.navigate('TournamentCourts', { matchId: m.id })}
    />
  );

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
      data={selectedDayMatches}
      keyExtractor={(m) => m.id}
      renderItem={renderCard}
      contentContainerStyle={styles.list}
      onRefresh={refetch}
      refreshing={isFetching}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        <View style={styles.calendarCard}>
          <View style={styles.calendarHeader}>
            <Pressable
              style={styles.monthArrow}
              onPress={() =>
                setDisplayMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
              }
            >
              <Ionicons name="chevron-back" size={18} color={colors.textSecondary} />
            </Pressable>
            <Text style={styles.monthLabel}>{monthTitle}</Text>
            <Pressable
              style={styles.monthArrow}
              onPress={() =>
                setDisplayMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
              }
            >
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.weekdaysRow}>
            {weekdayLabels.map((w, idx) => (
              <Text key={`${w}-${idx}`} style={styles.weekdayLabel}>
                {w}
              </Text>
            ))}
          </View>
          <View style={styles.daysGrid}>{cells.map(renderCalendarDay)}</View>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.emptyWrap}>
          <Ionicons name="calendar-outline" size={44} color={colors.textMuted} />
          <Text style={styles.emptyText}>{t('myMatches.calendarEmptyDay')}</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  calendarCard: {
    margin: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  monthArrow: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  monthLabel: {
    ...typography.h3,
    color: colors.text,
    textTransform: 'capitalize',
  },
  weekdaysRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  weekdayLabel: {
    flex: 1,
    textAlign: 'center',
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '700',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.2857%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
  },
  dayCellHighlighted: {
    backgroundColor: colors.primary + '22',
  },
  dayCellSelected: {
    backgroundColor: colors.primary,
  },
  dayCellText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  dayCellTextHighlighted: {
    color: colors.primary,
  },
  dayCellTextSelected: {
    color: colors.white,
  },
  list: {
    paddingBottom: spacing.sm,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  emptyText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
});
