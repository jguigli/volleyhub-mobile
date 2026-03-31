import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
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
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { MatchesStackParamList } from '../navigation/types';
import { useManageMatch, useMatch } from '../hooks/useMatches';
import { useAuthStore } from '../store/auth.store';
import { useTranslation } from '../i18n';
import { countSetsWonFromScores, isTournamentMatch } from '../utils/matchDisplay';
import {
  buildDefaultTournamentFirstRound,
  normalizeTournamentGames,
} from '../utils/tournamentBracket';
import {
  formatTournamentPhase,
  tournamentPhaseSortKey,
} from '../utils/tournamentPhaseLabel';
import { colors, spacing, borderRadius, typography, shadows } from '../theme';
import type { TournamentGame } from '../types';
import { MatchScoreSummary } from '../components/MatchScoreSummary';

type Props = NativeStackScreenProps<MatchesStackParamList, 'EventScore'>;

type SetRow = { teamA: string; teamB: string };

type TourneyEditRow = {
  id: string;
  fixtureId?: string;
  phase?: string | null;
  status?: TournamentGame['status'];
  round: number;
  order: number;
  courtIndex: number;
  teamAIndex: string;
  teamBIndex: string;
  scoreA: string;
  scoreB: string;
};

function newRowId(): string {
  return `t-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

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

function parseScoreTournament(s: string): number {
  const t = s.trim();
  if (t === '') return 0;
  return parseScore(t);
}

function parseSetRowPair(row: SetRow): { teamA: number; teamB: number } | null {
  try {
    return { teamA: parseScore(row.teamA), teamB: parseScore(row.teamB) };
  } catch {
    return null;
  }
}

function gamesToEditRows(
  games: TournamentGame[],
  courtCap: number,
): TourneyEditRow[] {
  const cap = Math.max(1, courtCap);
  return games.map((g, i) => {
    const ta = g.teamAIndex ?? -1;
    const tb = g.teamBIndex ?? -1;
    return {
      id: g.fixtureId ?? newRowId(),
      fixtureId: g.fixtureId,
      phase: g.phase ?? null,
      status: g.status,
      round: g.round ?? 0,
      order: g.order ?? i,
      courtIndex: Math.min(Math.max(0, g.courtIndex ?? 0), cap - 1),
      teamAIndex: ta < 0 ? '' : String(ta + 1),
      teamBIndex: tb < 0 ? '' : String(tb + 1),
      scoreA: String(g.scoreA ?? 0),
      scoreB: String(g.scoreB ?? 0),
    };
  });
}

function parseEditRowToGame(
  row: TourneyEditRow,
  teamCount: number,
  maxCourts: number,
): TournamentGame | null {
  try {
    const parseTeamIdx = (s: string): number | null => {
      const t = s.trim();
      if (t === '') return -1;
      const n = Number.parseInt(t, 10);
      if (!Number.isFinite(n) || n < 1 || n > teamCount) return null;
      return n - 1;
    };
    const ai = parseTeamIdx(row.teamAIndex);
    const bi = parseTeamIdx(row.teamBIndex);
    if (ai === null || bi === null) return null;
    if (ai === -1 && bi === -1) return null;
    if (ai >= 0 && bi >= 0 && ai === bi) return null;

    let ci = Number(row.courtIndex);
    if (!Number.isFinite(ci)) ci = 0;
    ci = Math.max(0, Math.min(maxCourts - 1, Math.floor(ci)));

    const game: TournamentGame = {
      teamAIndex: ai,
      teamBIndex: bi,
      scoreA: parseScoreTournament(row.scoreA),
      scoreB: parseScoreTournament(row.scoreB),
      courtIndex: ci,
      round: row.round,
      order: row.order,
    };
    if (row.fixtureId) {
      game.fixtureId = row.fixtureId;
    }
    return game;
  } catch {
    return null;
  }
}

function tournamentStatusLabel(
  t: (key: string) => string,
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
      return '';
  }
}

export function EventScoreScreen({ route, navigation }: Props) {
  const { matchId } = route.params;
  const { t } = useTranslation();
  const currentUser = useAuthStore((s) => s.user);
  const { data: match, isLoading, error } = useMatch(matchId);
  const manageMut = useManageMatch();

  const [setRows, setSetRows] = useState<SetRow[]>([]);
  const [tourneyRows, setTourneyRows] = useState<TourneyEditRow[]>([]);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    setInitialized(false);
  }, [matchId]);

  useEffect(() => {
    if (!match || initialized) {
      return;
    }
    if (isTournamentMatch(match)) {
      const cc = match.tournamentCourtCount ?? 1;
      const tc = Math.max(2, match.teamCount ?? 2);
      const raw = match.tournamentGames ?? [];
      const normalized = normalizeTournamentGames(raw);
      if (normalized.length > 0) {
        setTourneyRows(gamesToEditRows(normalized, cc));
      } else {
        const def = buildDefaultTournamentFirstRound(tc, cc);
        setTourneyRows(gamesToEditRows(def, cc));
      }
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
  const teamCount = match?.teamCount ?? 0;
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

  const sortedTourneyRows = useMemo(() => {
    return [...tourneyRows].sort((a, b) => {
      const pa = tournamentPhaseSortKey(a.phase);
      const pb = tournamentPhaseSortKey(b.phase);
      if (pa !== pb) return pa - pb;
      if (a.round !== b.round) return a.round - b.round;
      if (a.order !== b.order) return a.order - b.order;
      return a.courtIndex - b.courtIndex;
    });
  }, [tourneyRows]);

  const hasServerFixtures = useMemo(
    () => tourneyRows.some((r) => Boolean(r.fixtureId)),
    [tourneyRows],
  );

  useLayoutEffect(() => {
    if (!match) return;
    if (isTournamentMatch(match)) {
      navigation.setOptions({ title: t('match.tournamentScoresScreenTitle') });
    } else {
      navigation.setOptions({ title: t('match.viewScoreDetail') });
    }
  }, [match, navigation, t]);

  const resetBracket = useCallback(() => {
    if (!match || !isTournamentMatch(match)) return;
    const cc = match.tournamentCourtCount ?? 1;
    const tc = Math.max(2, match.teamCount ?? 2);
    const def = buildDefaultTournamentFirstRound(tc, cc);
    setTourneyRows(gamesToEditRows(def, cc));
  }, [match]);

  const updateTourneyRow = useCallback((id: string, patch: Partial<TourneyEditRow>) => {
    setTourneyRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }, []);

  const onTourneyField = useCallback(
    (id: string, field: keyof TourneyEditRow, val: string) => {
      const cleaned =
        field === 'scoreA' || field === 'scoreB'
          ? val.replace(/[^\d]/g, '')
          : field === 'courtIndex'
            ? val.replace(/[^\d]/g, '')
            : val.replace(/[^\d]/g, '');
      setTourneyRows((prev) =>
        prev.map((r) => {
          if (r.id !== id) return r;
          if (field === 'courtIndex') {
            const n = Number.parseInt(cleaned, 10);
            const idx = Number.isFinite(n)
              ? Math.max(0, Math.min(courtCount - 1, n - 1))
              : r.courtIndex;
            return { ...r, courtIndex: idx };
          }
          return { ...r, [field]: cleaned };
        }),
      );
    },
    [courtCount],
  );

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

  const addSet = () => {
    setSetRows((prev) => [...prev, { teamA: '', teamB: '' }]);
  };

  const handleSave = async () => {
    if (!match) return;
    if (!canManage) {
      Alert.alert(t('common.error'), t('match.manageUnauthorized'));
      return;
    }

    if (tournament) {
      if (teamCount < 2) {
        Alert.alert(t('common.error'), t('match.loadFailed'));
        return;
      }
      const sorted = [...tourneyRows].sort((a, b) => {
        if (a.round !== b.round) return a.round - b.round;
        if (a.courtIndex !== b.courtIndex) return a.courtIndex - b.courtIndex;
        return a.order - b.order;
      });
      const games: TournamentGame[] = [];
      for (let i = 0; i < sorted.length; i += 1) {
        const g = parseEditRowToGame(sorted[i], teamCount, courtCount);
        if (!g) {
          Alert.alert(t('common.error'), t('match.invalidTournamentScores'));
          return;
        }
        games.push({ ...g, order: i });
      }
      try {
        await manageMut.mutateAsync({
          matchId: match.id,
          tournamentGames: games,
        });
        Alert.alert('', t('match.manageSaved'));
        navigation.goBack();
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : t('match.manageFailed');
        Alert.alert(t('common.error'), msg);
      }
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
    const structureLocked = hasServerFixtures;

    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <MatchScoreSummary match={match} embedded />
          <Text style={styles.sectionTitle}>{t('match.tournamentMatchListTitle')}</Text>
          <Text style={styles.tourneyMeta}>{t('match.tournamentMatchOrderHint')}</Text>
          <Text style={styles.tourneyMeta}>
            {t('match.tournamentPointsTarget', {
              pts: String(match.tournamentPointsPerMatch ?? '—'),
            })}
          </Text>
          <Text style={styles.tourneyMeta}>
            {t('match.tournamentCourtsMeta', { n: String(courtCount) })}
          </Text>

          {!canManage ? (
            <Text style={styles.readOnlyHint}>{t('match.scoreReadOnlyHint')}</Text>
          ) : null}
          {canManage && structureLocked ? (
            <Text style={styles.readOnlyHint}>{t('match.tournamentScoresManagedHint')}</Text>
          ) : null}

          {canManage && !hasServerFixtures ? (
            <TouchableOpacity style={styles.resetBtn} onPress={resetBracket}>
              <Ionicons name="refresh-outline" size={20} color={colors.primary} />
              <Text style={styles.resetBtnText}>{t('match.resetTournamentBracket')}</Text>
            </TouchableOpacity>
          ) : null}

          <View style={styles.tMatchList}>
            {sortedTourneyRows.map((row, idx) => {
              const phaseLabel = formatTournamentPhase(t, row.phase);
              const statusTxt = tournamentStatusLabel(t, row.status);
              const ta = row.teamAIndex.trim()
                ? t('match.teamN', { n: row.teamAIndex })
                : t('match.teamTbd');
              const tb = row.teamBIndex.trim()
                ? t('match.teamN', { n: row.teamBIndex })
                : t('match.teamTbd');
              const statusStyle =
                row.status === 'live'
                  ? styles.tStatusPillLive
                  : row.status === 'ready'
                    ? styles.tStatusPillReady
                    : row.status === 'finished'
                      ? styles.tStatusPillDone
                      : styles.tStatusPillPending;

              return (
                <View key={row.id} style={styles.tMatchCard}>
                  <View style={styles.tMatchCardHeader}>
                    <Text style={styles.tMatchIndex}>#{idx + 1}</Text>
                    <View style={styles.tMatchBadges}>
                      {phaseLabel ? (
                        <View style={styles.tPhasePill}>
                          <Text style={styles.tPhasePillText}>{phaseLabel}</Text>
                        </View>
                      ) : null}
                      {statusTxt ? (
                        <View style={[styles.tStatusPill, statusStyle]}>
                          <Text style={styles.tStatusPillText}>{statusTxt}</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                  <Text style={styles.tMatchSubline}>
                    {t('match.tournamentRoundTitle', { n: String(row.round + 1) })}
                    {' · '}
                    {t('match.courtN', { n: String(row.courtIndex + 1) })}
                  </Text>

                  {structureLocked ? (
                    <View style={styles.tTeamsReadonly}>
                      <Text style={styles.tTeamName} numberOfLines={1}>
                        {ta}
                      </Text>
                      <Text style={styles.tVs}>vs</Text>
                      <Text style={styles.tTeamName} numberOfLines={1}>
                        {tb}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.tourneyInputs}>
                      <View style={styles.tourneyPair}>
                        <Text style={styles.tourneyFieldLbl}>{t('match.teamA')}</Text>
                        <TextInput
                          style={[
                            styles.tourneyInput,
                            !canManage && styles.scoreInputReadOnly,
                          ]}
                          keyboardType="number-pad"
                          editable={canManage}
                          value={row.teamAIndex}
                          onChangeText={(v) => onTourneyField(row.id, 'teamAIndex', v)}
                          placeholder={t('match.teamTbdShort')}
                          placeholderTextColor={colors.textMuted}
                        />
                      </View>
                      <Text style={styles.tourneyVs}>vs</Text>
                      <View style={styles.tourneyPair}>
                        <Text style={styles.tourneyFieldLbl}>{t('match.teamB')}</Text>
                        <TextInput
                          style={[
                            styles.tourneyInput,
                            !canManage && styles.scoreInputReadOnly,
                          ]}
                          keyboardType="number-pad"
                          editable={canManage}
                          value={row.teamBIndex}
                          onChangeText={(v) => onTourneyField(row.id, 'teamBIndex', v)}
                          placeholder={t('match.teamTbdShort')}
                          placeholderTextColor={colors.textMuted}
                        />
                      </View>
                    </View>
                  )}

                  <View style={styles.tourneyScoreRow}>
                    <TextInput
                      style={[styles.scoreInput, !canManage && styles.scoreInputReadOnly]}
                      keyboardType="number-pad"
                      editable={canManage}
                      value={row.scoreA}
                      onChangeText={(v) => onTourneyField(row.id, 'scoreA', v)}
                      placeholder="0"
                      placeholderTextColor={colors.textMuted}
                    />
                    <Text style={styles.setDash}>—</Text>
                    <TextInput
                      style={[styles.scoreInput, !canManage && styles.scoreInputReadOnly]}
                      keyboardType="number-pad"
                      editable={canManage}
                      value={row.scoreB}
                      onChangeText={(v) => onTourneyField(row.id, 'scoreB', v)}
                      placeholder="0"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>

                  {!structureLocked ? (
                    <View style={styles.courtRow}>
                      <Text style={styles.courtRowLbl}>{t('match.courtNShort')}</Text>
                      <TextInput
                        style={[styles.courtInput, !canManage && styles.scoreInputReadOnly]}
                        keyboardType="number-pad"
                        editable={canManage}
                        value={String(row.courtIndex + 1)}
                        onChangeText={(v) => onTourneyField(row.id, 'courtIndex', v)}
                        placeholder="1"
                        placeholderTextColor={colors.textMuted}
                      />
                    </View>
                  ) : null}
                </View>
              );
            })}
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

        {canManage ? (
          <TouchableOpacity style={styles.addSetButton} onPress={addSet}>
            <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
            <Text style={styles.addSetText}>{t('match.addSet')}</Text>
          </TouchableOpacity>
        ) : null}
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
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
  courtBlock: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  courtBlockTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  courtSummaryRow: { paddingVertical: 4 },
  courtSummaryText: { ...typography.bodySmall, color: colors.text },
  tourneyInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  tourneyPair: { flex: 1, gap: 4 },
  tourneyFieldLbl: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  tourneyInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    textAlign: 'center',
    color: colors.text,
    backgroundColor: colors.card,
    fontWeight: '600',
  },
  tourneyVs: { ...typography.bodySmall, color: colors.textMuted, paddingTop: 18 },
  tourneyScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
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
  addSetButton: {
    marginTop: spacing.md,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  addSetText: { color: colors.primary, fontWeight: '600' },
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
