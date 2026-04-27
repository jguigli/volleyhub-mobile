import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
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
import { CalendarPicker } from '../components/CalendarPicker';
import { useTranslation } from '../i18n';
import { colors, spacing } from '../theme';
import type { NearbyMatch } from '../types';
import { navigateToUserProfile } from '../navigation/navigateToUserProfile';

type Props = NativeStackScreenProps<MyStackParamList, 'MyMatchesCalendar'>;

function toDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function MyMatchesCalendarScreen({ navigation }: Props) {
  const { t, locale } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const { data: allMatches, isLoading, refetch, isFetching } = useMyMatches();
  const [displayMonth, setDisplayMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  const selectedDayKey = toDayKey(selectedDate);
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

  const eventDays = useMemo(
    () => new Set(matchesByDay.keys()),
    [matchesByDay],
  );

  const selectedDayMatches = matchesByDay.get(selectedDayKey) ?? [];

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
        <View style={styles.calendarWrap}>
          <CalendarPicker
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            displayMonth={displayMonth}
            onDisplayMonthChange={setDisplayMonth}
            locale={locale}
            eventDays={eventDays}
          />
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
  calendarWrap: {
    margin: spacing.md,
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
    fontSize: 15,
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
