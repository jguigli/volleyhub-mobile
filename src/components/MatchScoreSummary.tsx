import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../i18n';
import {
  countSetsWonFromScores,
  countTournamentWinsFromGames,
  isTournamentMatch,
} from '../utils/matchDisplay';
import { colors, spacing, borderRadius, typography, shadows } from '../theme';
import type { Match } from '../types';

type Props = {
  match: Match;
  /** Affichage dans une section déjà encadrée (écran scores) : pas de double carte. */
  embedded?: boolean;
};

/** Résumé des scores comme sur l’ancienne fiche match (table tournoi ou sets gagnés). */
export function MatchScoreSummary({ match, embedded }: Props) {
  const { t } = useTranslation();
  const tournament = isTournamentMatch(match);

  return (
    <View style={embedded ? styles.wrapEmbedded : styles.wrap}>
      {tournament ? (
        (() => {
          const n = match.teamCount ?? 0;
          const tc = Math.max(n, 1);
          const wins = countTournamentWinsFromGames(match.tournamentGames, tc);
          return (
            <View style={styles.tournamentScoreTable}>
              <View style={styles.tournamentTableHeader}>
                <Text style={[styles.tournamentTableCellTeam, styles.tournamentTableHeaderText]}>
                  {t('match.scoreTableTeamCol')}
                </Text>
                <Text
                  style={[styles.tournamentTableCellWins, styles.tournamentTableHeaderText]}
                >
                  {t('match.scoreTableWinsCol')}
                </Text>
              </View>
              {Array.from({ length: tc }, (_, i) => (
                <View
                  key={`tw-${i}`}
                  style={[styles.tournamentTableRow, i === tc - 1 && styles.tournamentTableRowLast]}
                >
                  <Text style={styles.tournamentTableCellTeam}>
                    {t('match.teamN', { n: String(i + 1) })}
                  </Text>
                  <Text style={styles.tournamentTableCellWins}>{String(wins[i] ?? 0)}</Text>
                </View>
              ))}
            </View>
          );
        })()
      ) : (
        (() => {
          const { teamA: winsA, teamB: winsB } = countSetsWonFromScores(match.setScores);
          const hasWinner = match.status === 'completed' && winsA !== winsB;
          const winner: 'teamA' | 'teamB' | null = !hasWinner
            ? null
            : winsA > winsB
              ? 'teamA'
              : 'teamB';
          return (
            <View style={styles.scoreBigRow}>
              <View style={styles.scoreBigCol}>
                <Text
                  style={[
                    styles.scoreBigLabel,
                    winner === 'teamA'
                      ? styles.scoreBigLabelWinner
                      : winner === 'teamB'
                        ? styles.scoreBigLabelLoser
                        : null,
                  ]}
                >
                  {t('match.teamA')}
                </Text>
                <Text style={styles.scoreBigNumber}>{String(winsA)}</Text>
                <Text style={styles.scoreBigSub}>{t('match.setsWonLabel')}</Text>
              </View>
              <Text style={styles.scoreBigVs}>—</Text>
              <View style={styles.scoreBigCol}>
                <Text
                  style={[
                    styles.scoreBigLabel,
                    winner === 'teamB'
                      ? styles.scoreBigLabelWinner
                      : winner === 'teamA'
                        ? styles.scoreBigLabelLoser
                        : null,
                  ]}
                >
                  {t('match.teamB')}
                </Text>
                <Text style={styles.scoreBigNumber}>{String(winsB)}</Text>
                <Text style={styles.scoreBigSub}>{t('match.setsWonLabel')}</Text>
              </View>
            </View>
          );
        })()
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary + '33',
    gap: spacing.md,
    ...shadows.card,
  },
  wrapEmbedded: {
    marginBottom: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    alignSelf: 'stretch',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '18',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    ...typography.h3,
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
    flexShrink: 1,
  },
  tournamentScoreTable: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  tournamentTableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.primary + '14',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  tournamentTableHeaderText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.45,
  },
  tournamentTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  tournamentTableRowLast: {
    borderBottomWidth: 0,
  },
  tournamentTableCellTeam: {
    flex: 1,
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  tournamentTableCellWins: {
    minWidth: 56,
    ...typography.body,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'right',
  },
  scoreBigRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  scoreBigCol: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  scoreBigLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  scoreBigLabelWinner: {
    color: colors.success,
  },
  scoreBigLabelLoser: {
    color: colors.error,
  },
  scoreBigNumber: {
    fontSize: 40,
    fontWeight: '800',
    color: colors.text,
    lineHeight: 44,
  },
  scoreBigSub: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  scoreBigVs: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textMuted,
    paddingHorizontal: spacing.xs,
  },
});
