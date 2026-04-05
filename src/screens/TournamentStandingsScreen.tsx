import React, { useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import {
  FindStackParamList,
  MapStackParamList,
  MyStackParamList,
  ProfileStackParamList,
} from '../navigation/types';
import { useMatch } from '../hooks/useMatches';
import { useTranslation } from '../i18n';
import { colors, spacing, borderRadius, typography } from '../theme';
import { normalizeTournamentGames } from '../utils/tournamentBracket';
import { computeTeamStandings } from '../utils/tournamentStandings';

type Props = NativeStackScreenProps<
  FindStackParamList | MapStackParamList | MyStackParamList | ProfileStackParamList,
  'TournamentStandings'
>;

function teamLabel(
  t: ReturnType<typeof useTranslation>['t'],
  idx: number,
  teamCount: number,
): string {
  if (idx < 0 || idx >= teamCount) return t('match.teamTbd');
  return t('match.teamN', { n: String(idx + 1) });
}

const MEDAL_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'] as const;

export function TournamentStandingsScreen({ route }: Props) {
  const { matchId } = route.params;
  const { t } = useTranslation();
  const { data: match, isLoading, error } = useMatch(matchId);

  const games = useMemo(() => {
    if (!match?.tournamentGames?.length) return [];
    return normalizeTournamentGames(match.tournamentGames);
  }, [match?.tournamentGames]);

  const teamCount = Math.max(0, match?.teamCount ?? 0);

  const standings = useMemo(
    () => computeTeamStandings(games, teamCount),
    [games, teamCount],
  );

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
        <Text style={styles.error}>{t('match.loadFailed')}</Text>
      </View>
    );
  }

  const noGames = !match.tournamentGames?.length;
  const isCompleted = match.status === 'completed';
  if (noGames && isCompleted) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={32} color={colors.error} />
        <Text style={[styles.error, { marginTop: spacing.md }]}>{t('match.tournamentNotEnoughTeams')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.intro}>{t('match.standingsIntro')}</Text>

      <View style={styles.card}>
        {/* Header */}
        <View style={styles.tableHeader}>
          <Text style={[styles.headerCell, styles.colTeam]}>
            {t('match.team')}
          </Text>
          <Text style={[styles.headerCell, styles.colStat]}>
            {t('match.stPlayed')}
          </Text>
          <Text style={[styles.headerCell, styles.colStat]}>
            {t('match.stWins')}
          </Text>
          <Text style={[styles.headerCell, styles.colStat]}>
            {t('match.stLosses')}
          </Text>
          <Text style={[styles.headerCell, styles.colStat]}>
            {t('match.stPF')}
          </Text>
          <Text style={[styles.headerCell, styles.colStat]}>
            {t('match.stPA')}
          </Text>
          <Text style={[styles.headerCell, styles.colStat]}>
            {t('match.stDiff')}
          </Text>
        </View>

        {/* Rows */}
        {standings.map((row, i) => {
          const isLast = i === standings.length - 1;
          const hasMedal = i < 3 && standings.length > 3;
          const diff = row.pointsFor - row.pointsAgainst;
          return (
            <View
              key={row.teamIndex}
              style={[styles.row, isLast && styles.rowLast]}
            >
              <View style={styles.teamCell}>
                {hasMedal ? (
                  <Ionicons
                    name="trophy"
                    size={13}
                    color={MEDAL_COLORS[i]}
                    style={styles.medalIcon}
                  />
                ) : null}
                <Text style={styles.teamText} numberOfLines={1}>
                  {teamLabel(t, row.teamIndex, teamCount)}
                </Text>
              </View>
              <Text style={[styles.statVal, styles.colStat]}>
                {String(row.played)}
              </Text>
              <Text style={[styles.statVal, styles.colStat, styles.statWins]}>
                {String(row.wins)}
              </Text>
              <Text style={[styles.statVal, styles.colStat, styles.statLosses]}>
                {String(row.losses)}
              </Text>
              <Text style={[styles.statVal, styles.colStat]}>
                {String(row.pointsFor)}
              </Text>
              <Text style={[styles.statVal, styles.colStat]}>
                {String(row.pointsAgainst)}
              </Text>
              <Text
                style={[
                  styles.statVal,
                  styles.colStat,
                  diff > 0 && styles.diffPositive,
                  diff < 0 && styles.diffNegative,
                ]}
              >
                {diff > 0 ? `+${diff}` : String(diff)}
              </Text>
            </View>
          );
        })}

        {standings.length === 0 ? (
          <View style={styles.emptyRow}>
            <Text style={styles.emptyText}>{t('match.waitingNextMatch')}</Text>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl * 2 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  error: { ...typography.body, color: colors.error },
  intro: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.primary + '14',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerCell: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  colTeam: { flex: 1, textAlign: 'left' },
  colStat: { width: 32, textAlign: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  teamCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  medalIcon: {
    marginRight: 6,
  },
  teamText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  statVal: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  statWins: {
    color: colors.success,
  },
  statLosses: {
    color: colors.error,
  },
  diffPositive: {
    color: colors.success,
  },
  diffNegative: {
    color: colors.error,
  },
  emptyRow: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
});
