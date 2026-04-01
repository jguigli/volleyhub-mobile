import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { FindStackParamList, MatchesStackParamList } from '../navigation/types';
import { useManageMatch, useMatch } from '../hooks/useMatches';
import { useAuthStore } from '../store/auth.store';
import { useTranslation } from '../i18n';
import { countSetsWonFromScores, isTournamentMatch } from '../utils/matchDisplay';
import { colors, spacing, borderRadius, typography, shadows } from '../theme';
import { MatchScoreSummary } from '../components/MatchScoreSummary';
import { TournamentScoreRecap } from '../components/tournament/TournamentScoreRecap';

type Props = NativeStackScreenProps<MatchesStackParamList, 'EventScore'>;

type SetRow = { teamA: string; teamB: string };

function parseScore(s: string): number {
  const n = Number.parseInt(s.trim(), 10);
  if (!Number.isFinite(n) || n < 0 || n > 999) {
    throw new Error('invalid');
  }
  return n;
}

function parseScoreWithMax(s: string, maxPoints: number): number {
  const n = Number.parseInt(s.trim(), 10);
  if (!Number.isFinite(n) || n < 0 || n > maxPoints) {
    throw new Error('invalid');
  }
  return n;
}

function parseSetRowPair(row: SetRow): { teamA: number; teamB: number } | null {
  try {
    return { teamA: parseScore(row.teamA), teamB: parseScore(row.teamB) };
  } catch {
    return null;
  }
}

export function EventScoreScreen({ route, navigation }: Props) {
  const { matchId } = route.params;
  const { t } = useTranslation();
  const currentUser = useAuthStore((s) => s.user);
  const { data: match, isLoading, error } = useMatch(matchId);
  const manageMut = useManageMatch();

  const [setRows, setSetRows] = useState<SetRow[]>([]);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    setInitialized(false);
  }, [matchId]);

  useEffect(() => {
    if (!match || initialized) {
      return;
    }
    if (isTournamentMatch(match)) {
      // Recap reads live from `match` via React Query.
    } else {
      const persisted = match.setScores ?? [];
      const minRows = Math.max(persisted.length, match.matchSets ?? 0, 1);
      const rows: SetRow[] = [];
      for (let i = 0; i < minRows; i += 1) {
        rows.push({
          teamA: persisted[i]?.teamA != null ? String(persisted[i].teamA) : '',
          teamB: persisted[i]?.teamB != null ? String(persisted[i].teamB) : '',
        });
      }
      setSetRows(rows);
    }
    setInitialized(true);
  }, [match, initialized]);

  const canManage = Boolean(match && currentUser?.id === match.creatorId);
  const tournament = match ? isTournamentMatch(match) : false;
  const courtCount = Math.max(1, match?.tournamentCourtCount ?? 1);
  const totalSets = Math.max(1, match?.matchSets ?? 3);
  const setsToWin = Math.floor(totalSets / 2) + 1;
  const maxSetPoints = Math.max(1, match?.pointsToWin ?? 21);

  const previewSetsWon = useMemo(
    () =>
      countSetsWonFromScores(
        setRows.map(parseSetRowPair).filter(
          (s): s is { teamA: number; teamB: number } => s != null,
        ),
      ),
    [setRows],
  );
  const savedWinner: 'teamA' | 'teamB' | null = useMemo(() => {
    if (tournament || !match || match.status !== 'completed') {
      return null;
    }
    if (previewSetsWon.teamA > previewSetsWon.teamB) return 'teamA';
    if (previewSetsWon.teamB > previewSetsWon.teamA) return 'teamB';
    return null;
  }, [match, previewSetsWon.teamA, previewSetsWon.teamB, tournament]);

  const lockRowsFromIndex = useMemo(() => {
    let winsA = 0;
    let winsB = 0;
    for (let i = 0; i < Math.min(setRows.length, totalSets); i += 1) {
      const parsed = parseSetRowPair(setRows[i]);
      if (!parsed) {
        continue;
      }
      if (parsed.teamA > parsed.teamB) winsA += 1;
      if (parsed.teamB > parsed.teamA) winsB += 1;
      if (winsA >= setsToWin || winsB >= setsToWin) {
        return i + 1;
      }
    }
    return -1;
  }, [setRows, setsToWin, totalSets]);

  useEffect(() => {
    if (lockRowsFromIndex < 0) {
      return;
    }
    // Quand une ligne devient grisée (match déjà gagné), on la remet explicitement à 0.
    setSetRows((prev) =>
      prev.map((r, i) =>
        i >= lockRowsFromIndex ? { teamA: '0', teamB: '0' } : r,
      ),
    );
  }, [lockRowsFromIndex]);

  useLayoutEffect(() => {
    if (!match) return;
    if (isTournamentMatch(match)) {
      navigation.setOptions({
        title: t('match.tournamentScoresScreenTitle'),
        headerRight: () => (
          <TouchableOpacity
            onPress={() => {
              (navigation as NativeStackNavigationProp<FindStackParamList>).navigate(
                'TournamentStandings',
                { matchId },
              );
            }}
            style={{ paddingRight: 16 }}
            accessibilityRole="button"
          >
            <Ionicons name="podium-outline" size={24} color={colors.primary} />
          </TouchableOpacity>
        ),
      });
    } else {
      navigation.setOptions({
        title: t('match.viewScoreDetail'),
        headerRight: undefined,
      });
    }
  }, [match, navigation, matchId, t]);

  const onSetChange = (index: number, side: 'teamA' | 'teamB', val: string) => {
    const onlyDigits = val.replace(/[^\d]/g, '');
    const clamped =
      onlyDigits === ''
        ? ''
        : String(Math.min(maxSetPoints, Number.parseInt(onlyDigits, 10) || 0));
    setSetRows((prev) =>
      prev.map((r, i) =>
        i === index ? { ...r, [side]: clamped } : r,
      ),
    );
  };

  const handleSave = async () => {
    if (!match) return;
    if (!canManage) {
      Alert.alert(t('common.error'), t('match.manageUnauthorized'));
      return;
    }

    const parsedSets: { teamA: number; teamB: number }[] = [];
    for (let i = 0; i < Math.min(setRows.length, totalSets); i += 1) {
      const row = setRows[i];
      const a = row.teamA.trim();
      const b = row.teamB.trim();
      if (a === '' && b === '') {
        continue;
      }
      if (a === '' || b === '') {
        Alert.alert(t('common.error'), t('match.invalidScores', { max: String(maxSetPoints) }));
        return;
      }
      try {
        parsedSets.push({
          teamA: parseScoreWithMax(a, maxSetPoints),
          teamB: parseScoreWithMax(b, maxSetPoints),
        });
      } catch {
        Alert.alert(t('common.error'), t('match.invalidScores', { max: String(maxSetPoints) }));
        return;
      }
    }

    let winsA = 0;
    let winsB = 0;
    let clinchAt = -1;
    for (let i = 0; i < parsedSets.length; i += 1) {
      if (parsedSets[i].teamA > parsedSets[i].teamB) winsA += 1;
      if (parsedSets[i].teamB > parsedSets[i].teamA) winsB += 1;
      if (winsA >= setsToWin || winsB >= setsToWin) {
        clinchAt = i;
        break;
      }
    }
    const payloadSets = clinchAt >= 0 ? parsedSets.slice(0, clinchAt + 1) : parsedSets;

    try {
      await manageMut.mutateAsync({
        matchId: match.id,
        setScores: payloadSets,
      });
      Alert.alert('', t('match.manageSaved'));
      navigation.goBack();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t('match.manageFailed');
      Alert.alert(t('common.error'), msg);
    }
  };

  if (isLoading || !initialized) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (error || !match) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{t('match.loadFailed')}</Text>
      </View>
    );
  }

  if (tournament) {
    const noGames = !match.tournamentGames?.length;
    const isCompleted = match.status === 'completed';

    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {noGames && isCompleted ? (
          <View style={styles.notEnoughTeamsCard}>
            <Ionicons name="alert-circle-outline" size={32} color={colors.error} />
            <Text style={styles.notEnoughTeamsText}>
              {t('match.tournamentNotEnoughTeams')}
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.tourneyInfoCard}>
              <View style={styles.tourneyInfoRow}>
                <View style={styles.tourneyInfoItem}>
                  <Ionicons name="scan-outline" size={16} color={colors.primary} />
                  <Text style={styles.tourneyInfoValue}>
                    {String(match.tournamentPointsPerMatch ?? '—')} pts
                  </Text>
                </View>
                <View style={styles.tourneyInfoSep} />
                <View style={styles.tourneyInfoItem}>
                  <Ionicons name="grid-outline" size={16} color={colors.primary} />
                  <Text style={styles.tourneyInfoValue}>
                    {t('match.tournamentCourtsMeta', { n: String(courtCount) })}
                  </Text>
                </View>
              </View>
            </View>
            <TournamentScoreRecap match={match} t={t} />
          </>
        )}
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <MatchScoreSummary match={match} embedded />
        <Text style={styles.sectionTitle}>{t('match.scoreBySet')}</Text>

        {!canManage ? (
          <Text style={styles.readOnlyHint}>{t('match.scoreReadOnlyHint')}</Text>
        ) : null}

        <View style={styles.columnHeaderRow}>
          <View style={styles.headerSpacer} />
          <Text style={styles.columnHeaderText}>{t('match.teamA')}</Text>
          <View style={styles.headerDashSpacer} />
          <Text style={styles.columnHeaderText}>{t('match.teamB')}</Text>
        </View>

        {setRows.map((row, i) => {
          const rowLocked = canManage && lockRowsFromIndex >= 0 && i >= lockRowsFromIndex;
          return (
          <View key={`set-${i}`} style={styles.setRow}>
            <Text style={[styles.setLabel, rowLocked && styles.setLabelLocked]}>
              {t('match.setN', { n: String(i + 1) })}
            </Text>
            <TextInput
              style={[
                styles.scoreInput,
                (!canManage || rowLocked) && styles.scoreInputReadOnly,
                rowLocked && styles.scoreInputLocked,
              ]}
              keyboardType="number-pad"
              editable={canManage && !rowLocked}
              value={row.teamA}
              onChangeText={(v) => onSetChange(i, 'teamA', v)}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
            />
            <Text style={styles.setDash}>—</Text>
            <TextInput
              style={[
                styles.scoreInput,
                (!canManage || rowLocked) && styles.scoreInputReadOnly,
                rowLocked && styles.scoreInputLocked,
              ]}
              keyboardType="number-pad"
              editable={canManage && !rowLocked}
              value={row.teamB}
              onChangeText={(v) => onSetChange(i, 'teamB', v)}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
            />
          </View>
        )})}

        <View style={styles.totalSetsRow}>
          <Text style={styles.totalSetsLabel}>{t('match.setsTotalLabel')}</Text>
          <Text style={styles.totalSetsValue}>{String(previewSetsWon.teamA)}</Text>
          <Text style={styles.setDash}>—</Text>
          <Text style={styles.totalSetsValue}>{String(previewSetsWon.teamB)}</Text>
        </View>

      </View>

      {canManage ? (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.primaryBtn, manageMut.isPending && styles.btnDisabled]}
            onPress={handleSave}
            disabled={manageMut.isPending}
          >
            {manageMut.isPending ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.primaryBtnText}>{t('match.saveManage')}</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 32 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  errorText: { ...typography.body, color: colors.error },
  section: {
    margin: spacing.md,
    marginBottom: 0,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    ...shadows.card,
  },
  sectionTitle: { ...typography.h3, fontSize: 17, marginBottom: spacing.md },
  notEnoughTeamsCard: {
    margin: spacing.md,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.error + '44',
  },
  notEnoughTeamsText: {
    ...typography.body,
    color: colors.error,
    textAlign: 'center',
    fontWeight: '600',
  },
  tourneyInfoCard: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tourneyInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tourneyInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  tourneyInfoValue: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  tourneyInfoSep: {
    width: 1,
    height: 16,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },
  tourneyMeta: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  tMatchList: { marginTop: spacing.md, gap: spacing.md },
  tMatchCard: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    gap: spacing.sm,
  },
  tMatchCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  tMatchIndex: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
    minWidth: 36,
  },
  tMatchBadges: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-end' },
  tPhasePill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.matchTournament + '33',
  },
  tPhasePillText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.matchTournament,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  tStatusPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  tStatusPillText: { fontSize: 11, fontWeight: '800', color: colors.text },
  tStatusPillPending: { backgroundColor: colors.textMuted + '33' },
  tStatusPillReady: { backgroundColor: colors.primary + '22' },
  tStatusPillLive: { backgroundColor: colors.success + '28' },
  tStatusPillDone: { backgroundColor: colors.textSecondary + '28' },
  tMatchSubline: {
    ...typography.bodySmall,
    color: colors.textMuted,
    fontWeight: '600',
  },
  tTeamsReadonly: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  tTeamName: { flex: 1, ...typography.body, fontWeight: '700', color: colors.text },
  tVs: { ...typography.bodySmall, color: colors.textMuted, fontWeight: '700' },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary + '55',
    backgroundColor: colors.primary + '10',
  },
  resetBtnText: { color: colors.primary, fontWeight: '700' },
  courtRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  courtRowLbl: { ...typography.bodySmall, fontWeight: '600', color: colors.textSecondary },
  courtInput: {
    width: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingVertical: 6,
    textAlign: 'center',
    fontWeight: '700',
    color: colors.text,
    backgroundColor: colors.card,
  },
  addRowBtns: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  secondaryBtnText: { color: colors.primary, fontWeight: '600', fontSize: 14 },
  readOnlyHint: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  columnHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
    paddingBottom: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerSpacer: { width: 46 },
  headerDashSpacer: { width: 20 },
  columnHeaderText: {
    flex: 1,
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  setRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  setLabel: { width: 46, ...typography.bodySmall, color: colors.textSecondary },
  setLabelLocked: { color: colors.textMuted },
  scoreInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    textAlign: 'center',
    color: colors.text,
    backgroundColor: colors.surface,
    fontWeight: '600',
  },
  scoreInputReadOnly: {
    opacity: 0.85,
    backgroundColor: colors.background,
  },
  scoreInputLocked: {
    borderColor: colors.border + '88',
  },
  setDash: { color: colors.textMuted, fontSize: 20 },
  totalSetsRow: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  totalSetsLabel: {
    width: 46,
    ...typography.bodySmall,
    fontWeight: '800',
    color: colors.text,
  },
  totalSetsValue: {
    flex: 1,
    ...typography.body,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  actions: { margin: spacing.md, marginBottom: 0 },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  primaryBtnText: { ...typography.button, color: colors.white, fontSize: 16 },
  btnDisabled: { opacity: 0.6 },
});
