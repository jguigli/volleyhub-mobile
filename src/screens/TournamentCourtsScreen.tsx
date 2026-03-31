import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { FindStackParamList } from '../navigation/types';
import { useMatch } from '../hooks/useMatches';
import { useTranslation } from '../i18n';
import { colors, spacing, borderRadius, typography, shadows } from '../theme';
import { normalizeTournamentGames } from '../utils/tournamentBracket';
import { formatTournamentPhase } from '../utils/tournamentPhaseLabel';
import type { TournamentGame } from '../types';

type Props = NativeStackScreenProps<FindStackParamList, 'TournamentCourts'>;

function formatTeamLabel(
  t: ReturnType<typeof useTranslation>['t'],
  idx: number,
  teamCount: number,
): string {
  if (idx < 0 || idx >= teamCount) return t('match.teamTbd');
  return t('match.teamN', { n: String(idx + 1) });
}

function statusLabel(
  t: ReturnType<typeof useTranslation>['t'],
  s: TournamentGame['status'] | undefined,
): string {
  switch (s) {
    case 'pending':
      return t('match.fixtureStatusPending');
    case 'ready':
      return t('match.fixtureStatusReady');
    case 'live':
      return t('match.fixtureStatusLive');
    case 'finished':
      return t('match.fixtureStatusFinished');
    default:
      return t('match.fixtureStatusUnknown');
  }
}

function statusPillStyle(s: TournamentGame['status'] | undefined) {
  switch (s) {
    case 'live':
      return styles.pillLive;
    case 'ready':
      return styles.pillReady;
    case 'finished':
      return styles.pillDone;
    case 'pending':
      return styles.pillPending;
    default:
      return styles.pillUnknown;
  }
}

function GameRow({
  game,
  teamCount,
  courtCount,
  t,
}: {
  game: TournamentGame;
  teamCount: number;
  courtCount: number;
  t: ReturnType<typeof useTranslation>['t'];
}) {
  const a = formatTeamLabel(t, game.teamAIndex, teamCount);
  const b = formatTeamLabel(t, game.teamBIndex, teamCount);
  const ci = game.courtIndex;
  const court =
    ci != null && ci >= 0 && ci < courtCount
      ? t('match.courtN', { n: String(ci + 1) })
      : t('match.tournamentCourtUnassigned');
  const phaseLabel = formatTournamentPhase(t, game.phase);

  return (
    <View style={styles.gameCard}>
      <View style={styles.gameCardTop}>
        <View style={[styles.statusPill, statusPillStyle(game.status)]}>
          <Text style={styles.statusPillText}>{statusLabel(t, game.status)}</Text>
        </View>
        <Text style={styles.courtBadge}>{court}</Text>
      </View>
      {phaseLabel ? (
        <View style={styles.phaseChip}>
          <Text style={styles.phaseChipText}>{phaseLabel}</Text>
        </View>
      ) : null}
      <View style={styles.matchupBlock}>
        <View style={styles.matchupRow}>
          <View style={styles.teamCol}>
            <Text style={styles.teamLabel} numberOfLines={2}>
              {a}
            </Text>
          </View>
          <View style={styles.scoreBundle}>
            <Text style={styles.gameScore}>{game.scoreA}</Text>
            <Text style={styles.gameDash}>—</Text>
            <Text style={styles.gameScore}>{game.scoreB}</Text>
          </View>
          <View style={styles.teamColEnd}>
            <Text style={[styles.teamLabel, styles.teamLabelEnd]} numberOfLines={2}>
              {b}
            </Text>
          </View>
        </View>
      </View>
      <Text style={styles.roundOrderLine}>
        {t('match.tournamentRoundTitle', { n: String((game.round ?? 0) + 1) })}
        {game.order != null
          ? ` · ${t('match.tournamentMatchOrderN', { n: String((game.order ?? 0) + 1) })}`
          : ''}
      </Text>
    </View>
  );
}

function statusRank(s: TournamentGame['status'] | undefined): number {
  if (s === 'live') return 0;
  if (s === 'ready') return 1;
  if (s === 'finished') return 2;
  return 3;
}

export function TournamentCourtsScreen({ route }: Props) {
  const { matchId } = route.params;
  const { t } = useTranslation();
  const { data: match, isLoading, error } = useMatch(matchId);

  const games = useMemo(() => {
    if (!match?.tournamentGames?.length) return [];
    return normalizeTournamentGames(match.tournamentGames).sort((a, b) => {
      if ((a.round ?? 0) !== (b.round ?? 0)) return (a.round ?? 0) - (b.round ?? 0);
      return (a.order ?? 0) - (b.order ?? 0);
    });
  }, [match?.tournamentGames]);

  const courtCount = Math.max(1, match?.tournamentCourtCount ?? 1);
  const teamCount = Math.max(0, match?.teamCount ?? 0);

  const { readyWaiting, pending, byCourt } = useMemo(() => {
    const readyWaiting: TournamentGame[] = [];
    const pending: TournamentGame[] = [];
    for (const g of games) {
      const st = g.status ?? 'pending';
      if (st === 'ready') {
        const ci = g.courtIndex;
        if (ci == null || ci < 0) readyWaiting.push(g);
      } else if (st === 'pending') {
        pending.push(g);
      }
    }
    const byCourt: TournamentGame[][] = Array.from({ length: courtCount }, () => []);
    for (const g of games) {
      const c = g.courtIndex ?? 0;
      if (c < 0 || c >= courtCount) continue;
      const st = g.status ?? 'pending';
      if (st === 'pending') continue;
      byCourt[c].push(g);
    }
    for (const bucket of byCourt) {
      bucket.sort(
        (a, b) =>
          statusRank(a.status) - statusRank(b.status) ||
          (a.round ?? 0) - (b.round ?? 0) ||
          (a.order ?? 0) - (b.order ?? 0),
      );
    }
    return { readyWaiting, pending, byCourt };
  }, [games, courtCount]);

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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons name="grid-outline" size={26} color={colors.primary} />
        </View>
        <View style={styles.heroText}>
          <Text style={styles.heroTitle}>{t('match.viewTournamentCourts')}</Text>
          <Text style={styles.heroSubtitle}>{t('match.tournamentCourtsHeroHint')}</Text>
          <View style={styles.heroMetaBar}>
            <View style={styles.heroMetaItem}>
              <Ionicons name="basketball-outline" size={15} color={colors.courtBlue} />
              <Text style={styles.heroMetaText}>
                {t('match.tournamentCourtsMeta', { n: String(courtCount) })}
              </Text>
            </View>
            <View style={styles.heroMetaDot} />
            <View style={styles.heroMetaItem}>
              <Ionicons name="swap-vertical-outline" size={15} color={colors.textSecondary} />
              <Text style={styles.heroMetaText}>{t('match.tournamentQueueShortLabel')}</Text>
              {readyWaiting.length > 0 ? (
                <View style={styles.heroMetaBadge}>
                  <Text style={styles.heroMetaBadgeText}>{String(readyWaiting.length)}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>
      </View>

      {games.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyAll}>{t('match.tournamentCourtsEmpty')}</Text>
        </View>
      ) : null}

      {readyWaiting.length > 0 ? (
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="swap-vertical-outline" size={18} color={colors.primary} />
            <Text style={styles.sectionTitle}>{t('match.tournamentQueueSection')}</Text>
          </View>
          <Text style={styles.sectionHint}>{t('match.tournamentQueueHint')}</Text>
          <View style={styles.gameList}>
            {readyWaiting.map((g, i) => (
              <GameRow
                key={g.fixtureId ?? `qw-${i}`}
                game={g}
                teamCount={teamCount}
                courtCount={courtCount}
                t={t}
              />
            ))}
          </View>
        </View>
      ) : null}

      {pending.length > 0 ? (
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="hourglass-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.sectionTitle}>{t('match.tournamentPendingSection')}</Text>
          </View>
          <Text style={styles.sectionHint}>{t('match.tournamentPendingHint')}</Text>
          <View style={styles.gameList}>
            {pending.map((g, i) => (
              <GameRow
                key={g.fixtureId ?? `p-${i}`}
                game={g}
                teamCount={teamCount}
                courtCount={courtCount}
                t={t}
              />
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="flag-outline" size={18} color={colors.courtBlue} />
          <Text style={styles.sectionTitle}>{t('match.tournamentCourtsByCourtSection')}</Text>
        </View>
        <Text style={styles.sectionHint}>{t('match.tournamentCourtsByCourtHint')}</Text>
        <View style={styles.courtSections}>
        {byCourt.map((rows, c) =>
          rows.length === 0 ? (
            <View key={`empty-${c}`} style={styles.courtIdleCard}>
              <Text style={styles.courtIdleTitle}>
                {t('match.courtN', { n: String(c + 1) })}
              </Text>
              <Text style={styles.courtIdleText}>{t('match.tournamentCourtIdle')}</Text>
            </View>
          ) : (
            <View key={`court-${c}`} style={styles.courtBlock}>
              <View style={styles.courtBlockHeader}>
                <Ionicons name="flag-outline" size={18} color={colors.courtBlue} />
                <Text style={styles.courtTitle}>
                  {t('match.courtN', { n: String(c + 1) })}
                </Text>
              </View>
              <View style={styles.gameList}>
                {rows.map((g, i) => (
                  <GameRow
                    key={g.fixtureId ?? `c${c}-${i}`}
                    game={g}
                    teamCount={teamCount}
                    courtCount={courtCount}
                    t={t}
                  />
                ))}
              </View>
            </View>
          ),
        )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  error: { ...typography.body, color: colors.error },
  hero: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.xl,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroText: { flex: 1, gap: 6 },
  heroTitle: { ...typography.h3, fontSize: 18, color: colors.text },
  heroSubtitle: { ...typography.bodySmall, color: colors.textSecondary, lineHeight: 18 },
  heroMetaBar: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  heroMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroMetaText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  heroMetaDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.textMuted,
    opacity: 0.6,
  },
  heroMetaBadge: {
    marginLeft: 2,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary + '28',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroMetaBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
    fontVariant: ['tabular-nums'],
  },
  emptyCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  emptyAll: { ...typography.bodySmall, color: colors.textMuted, textAlign: 'center' },
  sectionCard: {
    marginBottom: spacing.xl,
    padding: spacing.md,
    paddingBottom: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    flex: 1,
  },
  sectionHint: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  gameList: { gap: spacing.md },
  courtSections: { gap: spacing.lg },
  courtBlock: { marginBottom: 0 },
  courtBlockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  courtTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.courtBlue,
  },
  courtIdleCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  courtIdleTitle: { fontSize: 14, fontWeight: '800', color: colors.text, marginBottom: 4 },
  courtIdleText: { ...typography.bodySmall, color: colors.textMuted },
  gameCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  gameCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  statusPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: borderRadius.sm,
  },
  statusPillText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.2 },
  pillPending: { backgroundColor: colors.textMuted + '40' },
  pillReady: { backgroundColor: colors.primary + '30' },
  pillLive: { backgroundColor: colors.success + '35' },
  pillDone: { backgroundColor: colors.textSecondary + '35' },
  pillUnknown: { backgroundColor: colors.border },
  courtBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  phaseChip: {
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.matchTournament + '30',
  },
  phaseChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.matchTournament,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  matchupBlock: {
    marginTop: 2,
  },
  matchupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  teamCol: {
    flex: 1,
    minWidth: 0,
    paddingRight: spacing.xs,
    justifyContent: 'center',
  },
  teamColEnd: {
    flex: 1,
    minWidth: 0,
    paddingLeft: spacing.xs,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  teamLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 18,
  },
  teamLabelEnd: {
    textAlign: 'right',
  },
  scoreBundle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    minWidth: 108,
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  gameScore: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
    fontVariant: ['tabular-nums'],
  },
  gameDash: {
    fontSize: 15,
    color: colors.textMuted,
    fontWeight: '700',
    opacity: 0.85,
  },
  roundOrderLine: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '600',
  },
});
