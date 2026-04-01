import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Match, TournamentGame, TournamentSystem } from '../../types';
import { colors, spacing, borderRadius } from '../../theme';
import { normalizeTournamentGames, gamesInRound, uniqueSortedRounds } from '../../utils/tournamentBracket';
import { formatTournamentPhase } from '../../utils/tournamentPhaseLabel';
type TFunc = (key: string, opts?: Record<string, string>) => string;

function teamLabel(
  t: TFunc,
  idx: number,
  teamCount: number,
): string {
  if (idx < 0 || idx >= teamCount) return t('match.teamTbd');
  return t('match.teamN', { n: String(idx + 1) });
}

function statusIcon(s: TournamentGame['status'] | undefined) {
  switch (s) {
    case 'live':
      return { name: 'radio-button-on' as const, color: colors.success };
    case 'finished':
      return { name: 'checkmark-circle' as const, color: colors.textMuted };
    default:
      return null;
  }
}

function MatchMiniCard({
  g,
  teamCount,
  t,
  hidePhase,
}: {
  g: TournamentGame;
  teamCount: number;
  t: TFunc;
  hidePhase?: boolean;
}) {
  const phaseLabel = hidePhase ? null : formatTournamentPhase(t, g.phase);
  const isLive = g.status === 'live';
  const isDone = g.status === 'finished';
  const isPending = !isLive && !isDone;
  const icon = statusIcon(g.status);

  const winnerA = isDone && g.scoreA > g.scoreB;
  const winnerB = isDone && g.scoreB > g.scoreA;

  return (
    <View style={[styles.miniCard, isLive && styles.cardLive, isPending && styles.cardPending]}>
      {phaseLabel ? (
        <Text style={styles.phaseTag} numberOfLines={1}>
          {phaseLabel}
        </Text>
      ) : null}

      {/* Team A */}
      <View style={styles.miniRow}>
        <Text
          style={[styles.miniTeam, winnerA && styles.miniTeamWinner]}
          numberOfLines={1}
        >
          {teamLabel(t, g.teamAIndex, teamCount)}
        </Text>
        <View style={styles.miniScoreSide}>
          {g.scoreAConfirmed ? (
            <Ionicons name="lock-closed" size={10} color={colors.textMuted} />
          ) : null}
          <Text style={[styles.miniScoreVal, winnerA && styles.miniScoreWinner]}>
            {g.scoreA}
          </Text>
        </View>
      </View>

      {/* Team B */}
      <View style={styles.miniRow}>
        <Text
          style={[styles.miniTeam, winnerB && styles.miniTeamWinner]}
          numberOfLines={1}
        >
          {teamLabel(t, g.teamBIndex, teamCount)}
        </Text>
        <View style={styles.miniScoreSide}>
          {g.scoreBConfirmed ? (
            <Ionicons name="lock-closed" size={10} color={colors.textMuted} />
          ) : null}
          <Text style={[styles.miniScoreVal, winnerB && styles.miniScoreWinner]}>
            {g.scoreB}
          </Text>
        </View>
      </View>

      {/* Status indicator */}
      {icon ? (
        <View style={styles.statusRow}>
          <Ionicons name={icon.name} size={10} color={icon.color} />
          <Text style={[styles.statusLabel, { color: icon.color }]}>
            {isLive ? 'LIVE' : 'FIN'}
          </Text>
          {isLive && g.courtIndex != null && g.courtIndex >= 0 ? (
            <Text style={styles.courtTag}>
              {t('match.courtN', { n: String(g.courtIndex + 1) })}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function BracketColumns({
  games,
  teamCount,
  t,
  title,
}: {
  games: TournamentGame[];
  teamCount: number;
  t: TFunc;
  title?: string;
}) {
  const rounds = useMemo(
    () => uniqueSortedRounds(games.map((g) => ({ round: g.round ?? 0 }))),
    [games],
  );

  return (
    <View style={styles.bracketSection}>
      {title ? <Text style={styles.blockTitle}>{title}</Text> : null}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.bracketScroll}
      >
        {rounds.map((r) => {
          const inRound = gamesInRound(games, r);
          return (
            <View key={r} style={styles.bracketCol}>
              <Text style={styles.roundTitle}>
                {t('match.tournamentRoundTitle', { n: String(r + 1) })}
              </Text>
              <View style={styles.bracketColInner}>
                {inRound.map((g, i) => (
                  <MatchMiniCard
                    key={g.fixtureId ?? `r${r}-o${g.order}-${i}`}
                    g={g}
                    teamCount={teamCount}
                    t={t}
                  />
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

function PoolsFinalsColumns({
  poolA,
  poolB,
  finals,
  teamCount,
  t,
}: {
  poolA: TournamentGame[];
  poolB: TournamentGame[];
  finals: TournamentGame[];
  teamCount: number;
  t: TFunc;
}) {
  const poolARounds = useMemo(
    () => uniqueSortedRounds(poolA.map((g) => ({ round: g.round ?? 0 }))),
    [poolA],
  );
  const poolBRounds = useMemo(
    () => uniqueSortedRounds(poolB.map((g) => ({ round: g.round ?? 0 }))),
    [poolB],
  );
  const finalsRounds = useMemo(
    () => uniqueSortedRounds(finals.map((g) => ({ round: g.round ?? 0 }))),
    [finals],
  );

  return (
    <View style={styles.bracketSection}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.bracketScroll}
      >
        {/* Pool A columns */}
        {poolA.length > 0 ? (
          <>
            {poolARounds.map((r, i) => {
              const inRound = gamesInRound(poolA, r);
              return (
                <View key={`pa-${r}`} style={styles.bracketCol}>
                  <Text style={[styles.roundTitle, i === 0 && styles.phaseTitle]}>
                    {i === 0 ? t('match.poolA') : ' '}
                  </Text>
                  <Text style={styles.roundSubtitle}>
                    {t('match.tournamentRoundTitle', { n: String(r + 1) })}
                  </Text>
                  <View style={styles.bracketColInner}>
                    {inRound.map((g, j) => (
                      <MatchMiniCard
                        key={g.fixtureId ?? `pa-${r}-${j}`}
                        g={g}
                        teamCount={teamCount}
                        t={t}
                        hidePhase
                      />
                    ))}
                  </View>
                </View>
              );
            })}
          </>
        ) : null}

        {/* Pool B columns */}
        {poolB.length > 0 ? (
          <>
            {poolA.length > 0 ? <View style={styles.phaseSep} /> : null}
            {poolBRounds.map((r, i) => {
              const inRound = gamesInRound(poolB, r);
              return (
                <View key={`pb-${r}`} style={styles.bracketCol}>
                  <Text style={[styles.roundTitle, i === 0 && styles.phaseTitle]}>
                    {i === 0 ? t('match.poolB') : ' '}
                  </Text>
                  <Text style={styles.roundSubtitle}>
                    {t('match.tournamentRoundTitle', { n: String(r + 1) })}
                  </Text>
                  <View style={styles.bracketColInner}>
                    {inRound.map((g, j) => (
                      <MatchMiniCard
                        key={g.fixtureId ?? `pb-${r}-${j}`}
                        g={g}
                        teamCount={teamCount}
                        t={t}
                        hidePhase
                      />
                    ))}
                  </View>
                </View>
              );
            })}
          </>
        ) : null}

        {/* Finals columns */}
        {finals.length > 0 ? (
          <>
            {(poolA.length > 0 || poolB.length > 0) ? <View style={styles.phaseSep} /> : null}
            {finalsRounds.map((r, i) => {
              const inRound = gamesInRound(finals, r);
              return (
                <View key={`fi-${r}`} style={styles.bracketCol}>
                  <Text style={styles.roundTitle}>
                    {i === 0 ? t('match.finalsBracket') : ' '}
                  </Text>
                  <Text style={styles.roundSubtitle}>
                    {t('match.tournamentRoundTitle', { n: String(r + 1) })}
                  </Text>
                  <View style={styles.bracketColInner}>
                    {inRound.map((g, j) => (
                      <MatchMiniCard
                        key={g.fixtureId ?? `fi-${r}-${j}`}
                        g={g}
                        teamCount={teamCount}
                        t={t}
                      />
                    ))}
                  </View>
                </View>
              );
            })}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

export function TournamentScoreRecap({
  match,
  t,
}: {
  match: Match;
  t: TFunc;
}) {
  const games = useMemo(
    () => normalizeTournamentGames(match.tournamentGames ?? []),
    [match.tournamentGames],
  );
  const teamCount = Math.max(0, match.teamCount ?? 0);
  const system: TournamentSystem = match.tournamentSystem ?? 'single_elimination';

  const poolAGames = useMemo(
    () => games.filter((g) => g.phase === 'pool_a'),
    [games],
  );
  const poolBGames = useMemo(
    () => games.filter((g) => g.phase === 'pool_b'),
    [games],
  );
  const finalsGames = useMemo(
    () => games.filter((g) => g.phase === 'finals'),
    [games],
  );

  return (
    <View style={styles.wrap}>
      {system === 'round_robin' ? (
        <BracketColumns
          games={games}
          teamCount={teamCount}
          t={t}
          title={t('match.allMatches')}
        />
      ) : null}

      {system === 'single_elimination' ? (
        <BracketColumns games={games} teamCount={teamCount} t={t} />
      ) : null}

      {system === 'pools_finals' ? (
        <PoolsFinalsColumns
          poolA={poolAGames}
          poolB={poolBGames}
          finals={finalsGames}
          teamCount={teamCount}
          t={t}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.lg, paddingHorizontal: spacing.md },
  blockTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  /* ── Bracket ── */
  bracketSection: { marginBottom: spacing.xs },
  bracketScroll: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.xs },
  bracketCol: { width: 172 },
  roundTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textMuted,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bracketColInner: { gap: spacing.sm },

  /* ── Mini cards ── */
  miniCard: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  cardPending: { opacity: 0.45 },
  cardLive: {
    borderColor: colors.success + '88',
    backgroundColor: colors.success + '10',
  },
  phaseTag: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.matchTournament,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  miniRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  miniTeam: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  miniTeamWinner: {
    fontWeight: '800',
    color: colors.text,
  },
  miniScoreSide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  miniScoreVal: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
    minWidth: 18,
    textAlign: 'right',
  },
  miniScoreWinner: {
    color: colors.primary,
    fontWeight: '800',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  statusLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  confirmRow: { flexDirection: 'row', gap: 6, marginTop: 4 },
  phaseTitle: {
    color: colors.matchTournament,
    fontSize: 13,
    fontWeight: '800',
  },
  roundSubtitle: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  phaseSep: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.xs,
    alignSelf: 'stretch',
  },
  courtTag: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textMuted,
    marginLeft: 'auto',
  },
});
