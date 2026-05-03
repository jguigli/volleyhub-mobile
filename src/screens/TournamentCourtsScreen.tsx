import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
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
  useManageMatch,
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
  const { data: match, isLoading, error, refetch, isFetching } = useMatch(matchId);
  const [showInfo, setShowInfo] = useState(false);

  const submitMut = useSubmitFixtureScore();
  const confirmMut = useConfirmFixtureScore();
  const overrideMut = useOverrideFixtureScore();
  const manageMut = useManageMatch();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={() => setShowInfo(true)}
          hitSlop={10}
          style={{ padding: 8, marginRight: 4 }}
        >
          <Ionicons name="information-circle-outline" size={24} color={colors.primary} />
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} />}>
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
          <Text style={styles.notStartedTitle}>{t('match.tournamentNotStartedYet')}</Text>
          <Text style={styles.notStartedSubtitle}>{t('match.tournamentNotStartedHint')}</Text>
        </View>
      ) : games.length === 0 ? (() => {
        // Compute team fill status
        const teamSz = match.teamSize ?? 1;
        const tCount = match.teamCount ?? 0;
        const teamCounts: number[] = Array.from({ length: tCount }, () => 0);
        for (const p of match.participants) {
          if (p.teamIndex != null && p.teamIndex >= 0 && p.teamIndex < tCount) {
            teamCounts[p.teamIndex]++;
          }
        }
        const emptyTeams = teamCounts.filter((c) => c === 0).length;
        const incompleteTeams = teamCounts.filter((c) => c > 0 && c < teamSz).length;
        const hasWarning = emptyTeams > 0 || incompleteTeams > 0;

        return (
          <View style={styles.emptyCard}>
            <Ionicons name="rocket-outline" size={32} color={isCreator ? colors.primary : colors.textMuted} />
            <Text style={styles.emptyText}>
              {isCreator ? t('match.tournamentReadyToLaunch') : t('match.tournamentWaitingForLaunch')}
            </Text>
            {isCreator && hasWarning ? (
              <View style={styles.launchWarning}>
                <Ionicons name="warning-outline" size={18} color={colors.warning} />
                <Text style={styles.launchWarningText}>
                  {emptyTeams > 0 && incompleteTeams > 0
                    ? t('match.tournamentWarningBoth', { empty: String(emptyTeams), incomplete: String(incompleteTeams) })
                    : emptyTeams > 0
                      ? t('match.tournamentWarningEmpty', { n: String(emptyTeams) })
                      : t('match.tournamentWarningIncomplete', { n: String(incompleteTeams) })}
                </Text>
              </View>
            ) : null}
            {isCreator ? (
              <Pressable
                style={[styles.launchBtn, manageMut.isPending && styles.btnDisabled]}
                onPress={async () => {
                  try {
                    await manageMut.mutateAsync({ matchId, launchBracket: true } as any);
                    refetch();
                  } catch (e: unknown) {
                    Alert.alert(t('common.error'), extractErrorMsg(e, t('match.loadFailed')));
                  }
                }}
                disabled={manageMut.isPending}
              >
                {manageMut.isPending ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <>
                    <Ionicons name="play" size={18} color={colors.white} />
                    <Text style={styles.launchBtnText}>{t('match.launchTournament')}</Text>
                  </>
                )}
              </Pressable>
            ) : null}
          </View>
        );
      })() : (
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
                targetPts={targetPts}
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
  targetPts,
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
  targetPts: number;
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
  const [editingSide, setEditingSide] = useState<'A' | 'B' | null>(null);

  useEffect(() => {
    if (!liveGame || !side) {
      setDraftScore('');
      return;
    }
    const v = side === 'A' ? liveGame.scoreA : liveGame.scoreB;
    setDraftScore(v > 0 ? String(v) : '');
  }, [liveGame?.fixtureId, liveGame?.scoreA, liveGame?.scoreB, side]);

  useEffect(() => {
    if (liveGame) {
      setOvA(liveGame.scoreA > 0 ? String(liveGame.scoreA) : '');
      setOvB(liveGame.scoreB > 0 ? String(liveGame.scoreB) : '');
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
    // Check for tie before confirming
    const otherScore = side === 'A' ? liveGame.scoreB : liveGame.scoreA;
    const otherConfirmed = side === 'A' ? bConfirmed : aConfirmed;
    if (otherConfirmed && n === otherScore) {
      Alert.alert(t('common.error'), t('match.scoresCannotBeTied'));
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

  const onOverrideSide = async (overrideSide: 'A' | 'B') => {
    if (!liveGame?.fixtureId) return;
    const val = overrideSide === 'A' ? ovA : ovB;
    const n = parseInt(val.replace(/\D/g, ''), 10);
    if (Number.isNaN(n) || n < 0) {
      Alert.alert(t('common.error'), t('match.invalidScore'));
      return;
    }
    // Use local draft values for both sides to avoid resetting the other side
    const localA = side === 'A' ? draftScore : ovA;
    const localB = side === 'B' ? draftScore : ovB;
    const sa = overrideSide === 'A' ? n : parseInt(localA.replace(/\D/g, ''), 10) || liveGame.scoreA;
    const sb = overrideSide === 'B' ? n : parseInt(localB.replace(/\D/g, ''), 10) || liveGame.scoreB;
    try {
      await overrideMut.mutateAsync({
        fixtureId: liveGame.fixtureId,
        matchId,
        scoreA: sa,
        scoreB: sb,
      });
      setEditingSide(null);
    } catch (e: unknown) {
      Alert.alert(t('common.error'), extractErrorMsg(e, t('match.loadFailed')));
    }
  };

  const onLockSide = (lockSide: 'A' | 'B') => {
    if (!liveGame?.fixtureId) return;
    // Check for tie before locking
    const otherConfirmed = lockSide === 'A' ? bConfirmed : aConfirmed;
    if (otherConfirmed && liveGame.scoreA === liveGame.scoreB) {
      Alert.alert(t('common.error'), t('match.scoresCannotBeTied'));
      return;
    }
    Alert.alert(
      t('match.confirmLockTitle'),
      t('match.confirmLockMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          style: 'destructive',
          onPress: async () => {
            try {
              await confirmMut.mutateAsync({ fixtureId: liveGame.fixtureId!, matchId, side: lockSide });
            } catch (e: unknown) {
              Alert.alert(t('common.error'), extractErrorMsg(e, t('match.loadFailed')));
            }
          },
        },
      ],
    );
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
            canCreatorEdit={Boolean(canOverride)}
            draftScore={side === 'A' ? draftScore : ovA}
            onDraftChange={side === 'A' ? setDraftScore : setOvA}
            busy={busy}
            isLast={false}
            isEditing={editingSide === 'A'}
            onEditPress={() => setEditingSide('A')}
            onSavePress={() => onOverrideSide('A')}
            onLockPress={Boolean(canOverride) && !aConfirmed ? () => onLockSide('A') : undefined}
            targetPts={targetPts}
            t={t}
          />

          {/* Team B row */}
          <TeamScoreRow
            teamLabel={formatTeamLabel(t, liveGame.teamBIndex, teamCount)}
            score={liveGame.scoreB}
            confirmed={bConfirmed}
            isMySide={side === 'B'}
            isMyTeam={myTeamIndex != null && liveGame.teamBIndex === myTeamIndex}
            canCreatorEdit={Boolean(canOverride)}
            draftScore={side === 'B' ? draftScore : ovB}
            onDraftChange={side === 'B' ? setDraftScore : setOvB}
            busy={busy}
            isLast={!showMyBtns && !bothLocked}
            isEditing={editingSide === 'B'}
            onEditPress={() => setEditingSide('B')}
            onSavePress={() => onOverrideSide('B')}
            onLockPress={Boolean(canOverride) && !bConfirmed ? () => onLockSide('B') : undefined}
            targetPts={targetPts}
            t={t}
          />

          {/* Action buttons */}
          {bothLocked ? (
            <View style={styles.statusBanner}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={styles.statusBannerText}>{t('match.bothTeamsConfirmed')}</Text>
            </View>
          ) : showMyBtns ? (
            <View style={styles.actionsRow}>
              <Pressable
                style={[styles.btnPrimary, busy && styles.btnDisabled]}
                onPress={onConfirmMySide}
                disabled={busy}
              >
                <Ionicons name="lock-closed-outline" size={15} color="#fff" />
                <Text style={styles.btnPrimaryText}>{t('match.confirmScore')}</Text>
              </Pressable>
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
  isEditing,
  onEditPress,
  onSavePress,
  onLockPress,
  targetPts,
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
  isEditing: boolean;
  onEditPress?: () => void;
  onSavePress?: () => void;
  onLockPress?: () => void;
  targetPts: number;
  t: ReturnType<typeof useTranslation>['t'];
}) {
  const playerCanEdit = isMySide && !confirmed;
  const creatorEditing = canCreatorEdit && isEditing;

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

      {playerCanEdit || creatorEditing ? (
        <View style={styles.scoreEditRow}>
          <TextInput
            style={styles.scoreInput}
            keyboardType="number-pad"
            value={draftScore}
            onChangeText={(v) => {
              const digits = v.replace(/[^\d]/g, '');
              if (digits === '') { onDraftChange(''); return; }
              const n = Math.min(targetPts, parseInt(digits, 10) || 0);
              onDraftChange(String(n));
            }}
            editable={!busy}
            placeholder="_"
            placeholderTextColor={colors.textMuted}
          />
          {creatorEditing && onSavePress ? (
            <Pressable
              style={[styles.btnSaveInline, busy && styles.btnDisabled]}
              onPress={onSavePress}
              disabled={busy}
            >
              <Ionicons name="checkmark" size={16} color={colors.white} />
            </Pressable>
          ) : null}
        </View>
      ) : (
        <View style={styles.scoreReadRow}>
          <Text style={[styles.scoreDisplay, !isMySide && !isMyTeam && styles.scoreDisplayDimmed]}>
            {score}
          </Text>
          {canCreatorEdit ? (
            <>
              {onEditPress ? (
                <Pressable
                  style={styles.btnEditInline}
                  onPress={onEditPress}
                  disabled={busy}
                >
                  <Ionicons name="create-outline" size={16} color={colors.warning} />
                </Pressable>
              ) : null}
              {onLockPress ? (
                <Pressable
                  style={styles.btnLockInline}
                  onPress={onLockPress}
                  disabled={busy}
                >
                  <Ionicons name="lock-closed-outline" size={14} color={colors.error} />
                </Pressable>
              ) : null}
            </>
          ) : null}
        </View>
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
  notStartedTitle: { ...typography.body, color: colors.text, textAlign: 'center' },
  notStartedSubtitle: { ...typography.bodySmall, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: spacing.lg },
  launchWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.warning + '18',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.warning + '44',
  },
  launchWarningText: {
    ...typography.bodySmall,
    color: colors.warning,
    flex: 1,
    fontWeight: '600',
  },
  launchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  launchBtnText: {
    ...typography.button,
    color: colors.white,
    fontSize: 16,
  },
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
  scoreDisplayDimmed: {
    color: colors.textMuted,
  },
  scoreEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  scoreReadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  scoreInput: {
    width: 56,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    color: colors.white,
    backgroundColor: colors.surface,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  btnEditInline: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.warning + '22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSaveInline: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnLockInline: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.error + '22',
    alignItems: 'center',
    justifyContent: 'center',
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
