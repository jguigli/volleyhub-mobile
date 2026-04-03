import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import {
  FindStackParamList,
  MapStackParamList,
  MyStackParamList,
  ProfileStackParamList,
} from '../navigation/types';
import {
  useConfirmFixtureScore,
  useMatch,
  useOverrideFixtureScore,
  useSubmitFixtureScore,
} from '../hooks/useMatches';
import { useSocket } from '../hooks/useSocket';
import { useTranslation } from '../i18n';
import { useAuthStore } from '../store/auth.store';
import { colors, spacing, borderRadius, typography, shadows } from '../theme';
import { normalizeTournamentGames } from '../utils/tournamentBracket';
import type { TournamentGame } from '../types';

type Props = NativeStackScreenProps<
  FindStackParamList | MapStackParamList | MyStackParamList | ProfileStackParamList,
  'TournamentCourts'
>;

function formatTeamLabel(
  t: ReturnType<typeof useTranslation>['t'],
  idx: number,
  teamCount: number,
): string {
  if (idx < 0 || idx >= teamCount) return t('match.teamTbd');
  return t('match.teamN', { n: String(idx + 1) });
}

function getUserFixtureSide(
  game: TournamentGame,
  myTeamIndex: number | null | undefined,
): 'A' | 'B' | null {
  if (myTeamIndex == null || myTeamIndex < 0) return null;
  if (game.teamAIndex >= 0 && myTeamIndex === game.teamAIndex) return 'A';
  if (game.teamBIndex >= 0 && myTeamIndex === game.teamBIndex) return 'B';
  return null;
}


function extractErrorMsg(e: unknown, fallback: string): string {
  if (e && typeof e === 'object' && 'response' in e) {
    const msg = (e as { response?: { data?: { message?: string } } }).response
      ?.data?.message;
    if (msg) return String(msg);
  }
  return fallback;
}

export function TournamentCourtsScreen({ route, navigation }: Props) {
  const { matchId } = route.params;
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const { subscribeToMatch } = useSocket();
  const { data: match, isLoading, error, refetch } = useMatch(matchId);
  const [showInfo, setShowInfo] = useState(false);

  const submitMut = useSubmitFixtureScore();
  const confirmMut = useConfirmFixtureScore();
  const overrideMut = useOverrideFixtureScore();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={() => setShowInfo(true)}
          hitSlop={10}
          style={{ padding: 8, marginRight: 4 }}
        >
          <View style={{
            width: 26,
            height: 26,
            borderRadius: 13,
            borderWidth: 1.5,
            borderColor: colors.textMuted,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: colors.textSecondary }}>i</Text>
          </View>
        </Pressable>
      ),
    });
  }, [navigation]);

  useEffect(() => {
    return subscribeToMatch(matchId, () => {
      refetch();
    });
  }, [matchId, subscribeToMatch, refetch]);

  const games = useMemo(() => {
    if (!match?.tournamentGames?.length) return [];
    return normalizeTournamentGames(match.tournamentGames).sort((a, b) => {
      if ((a.round ?? 0) !== (b.round ?? 0)) return (a.round ?? 0) - (b.round ?? 0);
      return (a.order ?? 0) - (b.order ?? 0);
    });
  }, [match?.tournamentGames]);

  const courtCount = Math.max(1, match?.tournamentCourtCount ?? 1);
  const teamCount = Math.max(0, match?.teamCount ?? 0);
  const targetPts = match?.tournamentPointsPerMatch ?? 21;
  const eventNotStarted = match
    ? match.status !== 'completed' &&
      match.status !== 'cancelled' &&
      new Date(match.scheduledAt).getTime() > Date.now()
    : false;

  const myTeamIndex = useMemo(() => {
    if (!user?.id || !match?.participants) return null;
    const p = match.participants.find((x) => x.userId === user.id);
    return p?.teamIndex ?? null;
  }, [user?.id, match?.participants]);

  const isCreator = user?.id != null && match?.creatorId === user.id;

  const readyWaiting = useMemo(() => {
    const out: TournamentGame[] = [];
    for (const g of games) {
      if (g.status !== 'ready') continue;
      if (g.courtIndex == null || g.courtIndex < 0) out.push(g);
    }
    return out;
  }, [games]);

  const hasServerFixtures = useMemo(
    () => games.some((g) => Boolean(g.fixtureId)),
    [games],
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

  const showLegacyHint = games.length > 0 && !hasServerFixtures;
  const noGames = games.length === 0;
  const isMatchCompleted = match.status === 'completed';

  if (noGames && isMatchCompleted) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={32} color={colors.error} />
        <Text style={styles.notEnoughText}>
          {t('match.tournamentNotEnoughTeams')}
        </Text>
      </View>
    );
  }

  return (
    <>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Info bar */}
      <View style={styles.infoBar}>
        <View style={styles.infoItem}>
          <Ionicons name="scan-outline" size={14} color={colors.primary} />
          <Text style={styles.infoText}>
            {t('match.tournamentPointsTargetShort', { n: String(targetPts) })}
          </Text>
        </View>
      </View>

      {showLegacyHint ? (
        <View style={styles.warningCard}>
          <Text style={styles.warningText}>{t('match.tournamentCourtsLegacyHint')}</Text>
        </View>
      ) : null}

      {readyWaiting.length > 0 ? (
        <View style={styles.queueBanner}>
          <Ionicons name="hourglass-outline" size={16} color={colors.warning} />
          <Text style={styles.queueBannerText}>
            {t('match.tournamentQueueWaiting', { n: String(readyWaiting.length) })}
          </Text>
        </View>
      ) : null}

      {eventNotStarted ? (
        <View style={styles.emptyCard}>
          <Ionicons name="time-outline" size={32} color={colors.primary} />
          <Text style={styles.emptyText}>{t('match.tournamentNotStartedYet')}</Text>
          <Text style={styles.emptySubtext}>{t('match.tournamentNotStartedHint')}</Text>
        </View>
      ) : games.length === 0 ? (
        <View style={styles.emptyCard}>
          <MaterialCommunityIcons name="volleyball" size={32} color={colors.textMuted} />
          <Text style={styles.emptyText}>{t('match.tournamentCourtsEmpty')}</Text>
        </View>
      ) : (
        <View style={styles.courtSections}>
          {Array.from({ length: courtCount }, (_, c) => {
            const live = games.find(
              (g) => g.status === 'live' && (g.courtIndex ?? 0) === c,
            );
            return (
              <CourtCard
                key={`court-${c}`}
                courtIndex={c}
                liveGame={live}
                teamCount={teamCount}
                myTeamIndex={myTeamIndex}
                isCreator={isCreator}
                matchId={matchId}
                hasFixtures={hasServerFixtures}
                submitMut={submitMut}
                confirmMut={confirmMut}
                overrideMut={overrideMut}
                t={t}
              />
            );
          })}
        </View>
      )}
    </ScrollView>

    {showInfo ? (
      <Modal visible animationType="slide" onRequestClose={() => setShowInfo(false)}>
        <View style={styles.infoModalRoot}>
          <View style={styles.infoModalHeader}>
            <Pressable onPress={() => setShowInfo(false)} hitSlop={10}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
            <Text style={styles.infoModalTitle}>{t('match.courtsInfoTitle')}</Text>
            <View style={{ width: 24 }} />
          </View>
          <ScrollView contentContainerStyle={styles.infoModalContent}>
            <View style={styles.infoModalBlock}>
              <View style={styles.infoModalBlockHeader}>
                <Ionicons name="person-outline" size={16} color={colors.primary} />
                <Text style={styles.infoModalBlockTitle}>{t('match.courtsInfoPlayer').split('\n')[0]}</Text>
              </View>
              <Text style={styles.infoModalBlockBody}>{t('match.courtsInfoPlayer').split('\n\n')[1]}</Text>
            </View>
            <View style={styles.infoModalBlock}>
              <View style={styles.infoModalBlockHeader}>
                <Ionicons name="shield-outline" size={16} color={colors.primary} />
                <Text style={styles.infoModalBlockTitle}>{t('match.courtsInfoOrganizer').split('\n')[0]}</Text>
              </View>
              <Text style={styles.infoModalBlockBody}>{t('match.courtsInfoOrganizer').split('\n\n')[1]}</Text>
            </View>
            <View style={styles.infoModalBlock}>
              <View style={styles.infoModalBlockHeader}>
                <Ionicons name="checkmark-circle-outline" size={16} color={colors.primary} />
                <Text style={styles.infoModalBlockTitle}>{t('match.courtsInfoRules').split('\n')[0]}</Text>
              </View>
              <Text style={styles.infoModalBlockBody}>{t('match.courtsInfoRules').split('\n\n')[1]}</Text>
            </View>
          </ScrollView>
        </View>
      </Modal>
    ) : null}
    </>
  );
}

/* ──────────────────────────────────────────────
   Court card with team score rows
   ────────────────────────────────────────────── */

function CourtCard({
  courtIndex,
  liveGame,
  teamCount,
  myTeamIndex,
  isCreator,
  matchId,
  hasFixtures,
  submitMut,
  confirmMut,
  overrideMut,
  t,
}: {
  courtIndex: number;
  liveGame: TournamentGame | undefined;
  teamCount: number;
  myTeamIndex: number | null;
  isCreator: boolean;
  matchId: string;
  hasFixtures: boolean;
  submitMut: ReturnType<typeof useSubmitFixtureScore>;
  confirmMut: ReturnType<typeof useConfirmFixtureScore>;
  overrideMut: ReturnType<typeof useOverrideFixtureScore>;
  t: ReturnType<typeof useTranslation>['t'];
}) {
  const side = liveGame ? getUserFixtureSide(liveGame, myTeamIndex) : null;

  // Draft scores for the user's own team
  const [draftScore, setDraftScore] = useState('');

  // Override scores for creator editing other teams
  const [ovA, setOvA] = useState('');
  const [ovB, setOvB] = useState('');

  useEffect(() => {
    if (!liveGame || !side) {
      setDraftScore('');
      return;
    }
    const v = side === 'A' ? liveGame.scoreA : liveGame.scoreB;
    setDraftScore(String(v));
  }, [liveGame?.fixtureId, liveGame?.scoreA, liveGame?.scoreB, side]);

  useEffect(() => {
    if (liveGame) {
      setOvA(String(liveGame.scoreA));
      setOvB(String(liveGame.scoreB));
    } else {
      setOvA('');
      setOvB('');
    }
  }, [liveGame?.fixtureId, liveGame?.scoreA, liveGame?.scoreB]);

  const busy =
    submitMut.isPending || confirmMut.isPending || overrideMut.isPending;

  const aConfirmed = Boolean(liveGame?.scoreAConfirmed);
  const bConfirmed = Boolean(liveGame?.scoreBConfirmed);
  const bothLocked = aConfirmed && bConfirmed;

  const canOverride =
    isCreator &&
    liveGame &&
    hasFixtures &&
    liveGame.fixtureId &&
    !bothLocked &&
    liveGame.status === 'live';

  const onSubmitMyScore = async () => {
    if (!liveGame?.fixtureId || !side) return;
    const n = parseInt(draftScore.replace(/\D/g, ''), 10);
    if (Number.isNaN(n) || n < 0) {
      Alert.alert(t('common.error'), t('match.invalidScore'));
      return;
    }
    try {
      await submitMut.mutateAsync({
        fixtureId: liveGame.fixtureId,
        score: n,
        matchId,
      });
    } catch (e: unknown) {
      Alert.alert(t('common.error'), extractErrorMsg(e, t('match.loadFailed')));
    }
  };

  const doConfirmMySide = async () => {
    if (!liveGame?.fixtureId || !side) return;
    const n = parseInt(draftScore.replace(/\D/g, ''), 10);
    if (Number.isNaN(n) || n < 0) {
      Alert.alert(t('common.error'), t('match.invalidScore'));
      return;
    }
    try {
      await submitMut.mutateAsync({
        fixtureId: liveGame.fixtureId,
        score: n,
        matchId,
      });
      await confirmMut.mutateAsync({ fixtureId: liveGame.fixtureId, matchId });
    } catch (e: unknown) {
      Alert.alert(t('common.error'), extractErrorMsg(e, t('match.loadFailed')));
    }
  };

  const onConfirmMySide = () => {
    Alert.alert(
      t('match.confirmLockTitle'),
      t('match.confirmLockMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.confirm'), style: 'destructive', onPress: doConfirmMySide },
      ],
    );
  };

  const onOverride = async () => {
    if (!liveGame?.fixtureId) return;
    const sa = parseInt(ovA.replace(/\D/g, ''), 10);
    const sb = parseInt(ovB.replace(/\D/g, ''), 10);
    if (Number.isNaN(sa) || Number.isNaN(sb) || sa < 0 || sb < 0) {
      Alert.alert(t('common.error'), t('match.invalidScore'));
      return;
    }
    try {
      await overrideMut.mutateAsync({
        fixtureId: liveGame.fixtureId,
        matchId,
        scoreA: sa,
        scoreB: sb,
      });
    } catch (e: unknown) {
      Alert.alert(t('common.error'), extractErrorMsg(e, t('match.loadFailed')));
    }
  };

  const dimmed = !liveGame;
  const isLive = Boolean(liveGame);

  const showMyBtns = Boolean(
    side && !(side === 'A' ? aConfirmed : bConfirmed),
  );
  const hasActions = showMyBtns || Boolean(canOverride);

  return (
    <View style={[styles.courtCard, dimmed && styles.courtCardDimmed]}>
      {/* Court header */}
      <View style={styles.courtHeader}>
        <View style={styles.courtHeaderLeft}>
          <View style={[styles.courtDot, isLive && styles.courtDotLive]} />
          <Text style={styles.courtName}>
            {t('match.courtN', { n: String(courtIndex + 1) })}
          </Text>
        </View>
        <Text style={styles.tourLabel}>
          Points
        </Text>
      </View>

      {!liveGame ? (
        <View style={styles.idleBody}>
          <Ionicons name="close-circle-outline" size={20} color={colors.textMuted} />
          <Text style={styles.idleText}>{t('match.courtUnused')}</Text>
        </View>
      ) : !hasFixtures || !liveGame.fixtureId ? (
        <View style={styles.idleBody}>
          <Text style={styles.idleText}>{t('match.tournamentCourtsLegacyHint')}</Text>
        </View>
      ) : (
        <>
          {/* Team A row */}
          <TeamScoreRow
            teamLabel={formatTeamLabel(t, liveGame.teamAIndex, teamCount)}
            score={liveGame.scoreA}
            confirmed={aConfirmed}
            isMySide={side === 'A'}
            isMyTeam={myTeamIndex != null && liveGame.teamAIndex === myTeamIndex}
            canCreatorEdit={Boolean(canOverride) && !aConfirmed}
            draftScore={side === 'A' ? draftScore : ovA}
            onDraftChange={side === 'A' ? setDraftScore : setOvA}
            busy={busy}
            isLast={false}
            t={t}
          />

          {/* Team B row */}
          <TeamScoreRow
            teamLabel={formatTeamLabel(t, liveGame.teamBIndex, teamCount)}
            score={liveGame.scoreB}
            confirmed={bConfirmed}
            isMySide={side === 'B'}
            isMyTeam={myTeamIndex != null && liveGame.teamBIndex === myTeamIndex}
            canCreatorEdit={Boolean(canOverride) && !bConfirmed}
            draftScore={side === 'B' ? draftScore : ovB}
            onDraftChange={side === 'B' ? setDraftScore : setOvB}
            busy={busy}
            isLast={!hasActions}
            t={t}
          />

          {/* Action buttons */}
          {bothLocked ? (
            <View style={styles.statusBanner}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={styles.statusBannerText}>{t('match.bothTeamsConfirmed')}</Text>
            </View>
          ) : hasActions ? (
            <View style={styles.actionsRow}>
              {canOverride ? (
                <Pressable
                  style={[styles.btnOverride, busy && styles.btnDisabled]}
                  onPress={onOverride}
                  disabled={busy}
                >
                  <Ionicons name="create-outline" size={15} color={colors.warning} />
                  <Text style={styles.btnOverrideText}>{t('match.applyScores')}</Text>
                </Pressable>
              ) : null}

              {showMyBtns ? (
                <Pressable
                  style={[styles.btnPrimary, busy && styles.btnDisabled]}
                  onPress={onConfirmMySide}
                  disabled={busy}
                >
                  <Ionicons name="lock-closed-outline" size={15} color="#fff" />
                  <Text style={styles.btnPrimaryText}>{t('match.confirmScore')}</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}

/* ──────────────────────────────────────────────
   Single team score row
   ────────────────────────────────────────────── */

function TeamScoreRow({
  teamLabel,
  score,
  confirmed,
  isMySide,
  isMyTeam,
  canCreatorEdit,
  draftScore,
  onDraftChange,
  busy,
  isLast,
  t,
}: {
  teamLabel: string;
  score: number;
  confirmed: boolean;
  isMySide: boolean;
  isMyTeam: boolean;
  canCreatorEdit: boolean;
  draftScore: string;
  onDraftChange: (v: string) => void;
  busy: boolean;
  isLast: boolean;
  t: ReturnType<typeof useTranslation>['t'];
}) {
  const canEdit = (isMySide && !confirmed) || canCreatorEdit;

  return (
    <View style={[styles.teamRow, confirmed && styles.teamRowLocked, isLast && styles.teamRowLast]}>
      <View style={styles.teamInfo}>
        <Text style={[styles.teamName, isMyTeam && styles.teamNameMine]} numberOfLines={1}>
          {teamLabel}
        </Text>
        {confirmed ? (
          <View style={styles.lockBadge}>
            <Ionicons name="lock-closed" size={10} color={colors.success} />
          </View>
        ) : null}
      </View>

      {canEdit ? (
        <TextInput
          style={styles.scoreInput}
          keyboardType="number-pad"
          value={draftScore}
          onChangeText={onDraftChange}
          editable={!busy}
          placeholder="0"
          placeholderTextColor={colors.textMuted}
        />
      ) : (
        <Text style={styles.scoreDisplay}>{score}</Text>
      )}
    </View>
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
  notEnoughText: {
    ...typography.body,
    color: colors.error,
    textAlign: 'center',
    fontWeight: '600',
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
  },

  /* ── Info bar ── */
  infoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  infoText: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  infoSep: {
    width: 1,
    height: 16,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },

  /* ── Warning / queue / empty ── */
  warningCard: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.matchTournament + '22',
    borderWidth: 1,
    borderColor: colors.matchTournament + '55',
    marginBottom: spacing.md,
  },
  warningText: { ...typography.bodySmall, color: colors.text },
  queueBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.warning + '14',
    borderWidth: 1,
    borderColor: colors.warning + '33',
    marginBottom: spacing.md,
  },
  queueBannerText: {
    ...typography.bodySmall,
    color: colors.text,
    flex: 1,
    fontWeight: '600',
  },
  emptyCard: {
    paddingVertical: spacing.xl * 2,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyText: { ...typography.bodySmall, color: colors.textMuted, textAlign: 'center' },
  emptySubtext: { ...typography.bodySmall, color: colors.textSecondary, textAlign: 'center', fontSize: 13 },

  /* ── Court cards ── */
  courtSections: { gap: spacing.md },
  courtCard: {
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  courtCardDimmed: { opacity: 0.6 },

  courtHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.primary + '14',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  courtHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  courtDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textMuted,
  },
  courtDotLive: {
    backgroundColor: colors.success,
  },
  courtName: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  tourLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  /* ── Idle state ── */
  idleBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  idleText: {
    ...typography.bodySmall,
    color: colors.textMuted,
    flex: 1,
  },

  /* ── Team rows ── */
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  teamRowLast: {
    borderBottomWidth: 0,
  },
  teamRowLocked: {
    backgroundColor: colors.success + '08',
  },
  teamInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginRight: spacing.sm,
  },
  teamName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  teamNameMine: {
    color: colors.primary,
  },
  lockBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.success + '22',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreDisplay: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primary,
    fontVariant: ['tabular-nums'],
    minWidth: 36,
    textAlign: 'center',
  },
  scoreInput: {
    width: 56,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    color: colors.text,
    backgroundColor: colors.surface,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },

  /* ── Actions ── */
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    padding: spacing.md,
  },
  btnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  btnOutlineText: { fontSize: 13, fontWeight: '700', color: colors.text },
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
  },
  btnPrimaryText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  btnOverride: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.warning + '55',
    backgroundColor: colors.warning + '14',
  },
  btnOverrideText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.warning,
  },
  btnDisabled: { opacity: 0.5 },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    backgroundColor: colors.success + '10',
  },
  statusBannerText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.success,
  },
  infoModalRoot: {
    flex: 1,
    backgroundColor: colors.background,
  },
  infoModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl + spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    flex: 1,
  },
  infoModalContent: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  infoModalBlock: {
    gap: spacing.sm,
  },
  infoModalBlockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoModalBlockTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  infoModalBlockBody: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
});
