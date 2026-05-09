import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useManageMatch, useMatch, useSetMyTeam } from '../hooks/useMatches';
import { useAuthStore } from '../store/auth.store';
import { SkillBadge } from '../components/SkillBadge';
import { useTranslation } from '../i18n';
import { isTournamentMatch } from '../utils/matchDisplay';
import { colors, spacing, borderRadius, typography, shadows } from '../theme';
import { useBottomInset } from '../hooks/useBottomInset';
import { useSocket } from '../hooks/useSocket';
import type { FindStackParamList } from '../navigation/types';
import type { MatchParticipant, Position, SkillLevel } from '../types';

type Props = NativeStackScreenProps<FindStackParamList, 'MatchTeamsBoard'>;

const POSITION_KEYS: Record<
  Position,
  | 'auth.positions.setter'
  | 'auth.positions.libero'
  | 'auth.positions.outside_hitter'
  | 'auth.positions.opposite_hitter'
  | 'auth.positions.middle_blocker'
  | 'auth.positions.any'
> = {
  setter: 'auth.positions.setter',
  libero: 'auth.positions.libero',
  outside_hitter: 'auth.positions.outside_hitter',
  opposite_hitter: 'auth.positions.opposite_hitter',
  middle_blocker: 'auth.positions.middle_blocker',
  any: 'auth.positions.any',
};

function padTeamSlots(
  players: MatchParticipant[],
  size: number,
): (MatchParticipant | null)[] {
  const out: (MatchParticipant | null)[] = Array.from({ length: size }, () => null);
  if (players.length === 0) return out;

  // Place players with a valid slotIndex first
  const remaining: MatchParticipant[] = [];
  for (const p of players) {
    if (p.slotIndex != null && p.slotIndex >= 0 && p.slotIndex < size && out[p.slotIndex] === null) {
      out[p.slotIndex] = p;
    } else {
      remaining.push(p);
    }
  }

  // Place remaining players (no slotIndex) in first available slots
  const sorted = [...remaining].sort(
    (a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime(),
  );
  for (const p of sorted) {
    const idx = out.indexOf(null);
    if (idx >= 0) out[idx] = p;
  }

  return out;
}

const SKILL_NUM: Record<SkillLevel, number> = { beginner: 1, intermediate: 2, advanced: 3 };
const NUM_SKILL: Record<number, SkillLevel> = { 1: 'beginner', 2: 'intermediate', 3: 'advanced' };

function averageSkillLevel(players: MatchParticipant[]): SkillLevel | null {
  const withSkill = players.filter((p) => p.user?.skillLevel);
  if (withSkill.length === 0) return null;
  const sum = withSkill.reduce((acc, p) => acc + (SKILL_NUM[p.user.skillLevel] ?? 2), 0);
  return NUM_SKILL[Math.round(sum / withSkill.length)] ?? 'intermediate';
}

export function MatchTeamsBoardScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const bottomInset = useBottomInset();
  const { matchId } = route.params;
  const user = useAuthStore((s) => s.user);
  const { data: match, isLoading, error, refetch } = useMatch(matchId);
  const setTeamMut = useSetMyTeam();
  const manageMut = useManageMatch();
  const { subscribeToMatch } = useSocket();

  useEffect(() => {
    return subscribeToMatch(matchId, () => refetch());
  }, [matchId, refetch, subscribeToMatch]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={() => navigation.navigate('TeamsGuide', { tournament: match ? isTournamentMatch(match) : false })}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={{ padding: spacing.xs, marginRight: spacing.sm }}
        >
          <Ionicons name="information-circle-outline" size={24} color={colors.primary} />
        </Pressable>
      ),
    });
  }, [navigation, match]);

  const isTournament = match ? isTournamentMatch(match) : false;
  // Bracket is "launched" only when the engine has activated it (assigned courts
  // and moved a fixture to LIVE/FINISHED). Pre-seeded fixtures sit in PENDING/READY.
  const bracketLaunched = isTournament &&
    Array.isArray(match?.tournamentGames) &&
    match!.tournamentGames!.some(
      (g) => g.status === 'live' || g.status === 'finished',
    );
  // Teams stay open until the match is fully completed (final score locked).
  // For tournaments, they lock as soon as the bracket is launched.
  const teamsLocked = match?.status === 'completed' ||
    (isTournament ? bracketLaunched : false);
  const isOrganizer = Boolean(user && match && user.id === match.creatorId);

  const kickFromTeam = useCallback(async (targetUserId: string) => {
    if (!match || teamsLocked) return;
    try {
      await manageMut.mutateAsync({
        matchId: match.id,
        teamAssignments: { [targetUserId]: null },
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t('match.manageFailed');
      Alert.alert(t('common.error'), msg);
    }
  }, [manageMut, match, t, teamsLocked]);

  const unassignSelfFromTeam = useCallback(async () => {
    if (!user || teamsLocked) return;
    try {
      await setTeamMut.mutateAsync({ matchId, teamIndex: null });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t('match.teamsBoardAssignFailed');
      Alert.alert(t('common.error'), msg);
    }
  }, [matchId, setTeamMut, t, user, teamsLocked]);

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
        <Text style={styles.errorText}>{t('match.loadFailed')}</Text>
      </View>
    );
  }

  const cancelledNoPlayers =
    match.status === 'completed' &&
    !isTournamentMatch(match) &&
    (!match.setScores || match.setScores.length === 0);

  if (cancelledNoPlayers) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
        <Text style={styles.cancelledTitle}>{t('match.notEnoughPlayers')}</Text>
        <Text style={styles.cancelledSubtitle}>{t('match.cancelledNotEnoughDesc')}</Text>
      </View>
    );
  }

  if (isTournamentMatch(match)) {
    const hasPlayedGames = match.tournamentGames?.some(
      (g: any) => g.status === 'finished' && (g.scoreA > 0 || g.scoreB > 0),
    );
    const tournamentCancelledNoPlayers =
      match.status === 'completed' && !hasPlayedGames;

    if (tournamentCancelledNoPlayers) {
      return (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={styles.cancelledTitle}>{t('match.notEnoughPlayers')}</Text>
          <Text style={styles.cancelledSubtitle}>{t('match.tournamentNotEnoughTeams')}</Text>
        </View>
      );
    }

    const n = match.teamCount ?? 0;
    const size = match.teamSize ?? 0;
    const teamOptions: { idx: number | null; label: string }[] = [
      { idx: null, label: t('match.teamNone') },
      ...Array.from({ length: n }, (_, i) => ({
        idx: i,
        label: t('match.teamN', { n: String(i + 1) }),
      })),
    ];

    const isParticipant = user
      ? match.participants.some((p) => p.userId === user.id)
      : false;

    const myP = user
      ? match.participants.find((p) => p.userId === user.id)
      : undefined;
    let myTournamentTeam: number | null = null;
    if (
      myP?.teamIndex != null &&
      Number.isInteger(myP.teamIndex) &&
      myP.teamIndex >= 0 &&
      myP.teamIndex < n
    ) {
      myTournamentTeam = myP.teamIndex;
    }

    const benchPlayers = match.participants.filter((p) => {
      const ti = p.teamIndex;
      return (
        ti === null ||
        ti === undefined ||
        !Number.isInteger(ti) ||
        ti < 0 ||
        ti >= n
      );
    });

    const roomOnTeam = (teamIdx: number) =>
      match.participants.filter(
        (p) => p.teamIndex === teamIdx && p.userId !== user?.id,
      ).length < size;

    const assignToTournamentTeam = async (teamIdx: number, slotIdx?: number) => {
      if (!user) {
        Alert.alert(t('match.signInRequiredTitle'), t('match.signInRequiredMessage'));
        return;
      }
      if (!isParticipant) {
        Alert.alert(t('common.error'), t('match.teamsBoardJoinFirst'));
        return;
      }
      if (teamsLocked) {
        return;
      }
      if (!roomOnTeam(teamIdx)) {
        Alert.alert(t('common.error'), t('match.teamsBoardTeamFull'));
        return;
      }
      try {
        await setTeamMut.mutateAsync({ matchId, teamIndex: teamIdx, slotIndex: slotIdx ?? null });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : t('match.teamsBoardAssignFailed');
        Alert.alert(t('common.error'), msg);
      }
    };

    const renderTournamentFilled = (slot: MatchParticipant) => {
      const isMe = user?.id === slot.userId;
      const body = (
        <>
          {slot.user.profilePicture ? (
            <Image
              source={{ uri: slot.user.profilePicture }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatar, styles.avatarPh]}>
              <Text style={styles.avatarInitial}>
                {slot.user.username[0]?.toUpperCase() ?? '?'}
              </Text>
            </View>
          )}
          <View style={styles.slotInfo}>
            <Text style={styles.slotName} numberOfLines={1}>
              {slot.user.username}
            </Text>
            <View style={styles.slotMeta}>
              <SkillBadge level={slot.user.skillLevel} small />
              <Text style={styles.positionText}>
                {t(POSITION_KEYS[slot.user.position ?? 'any'])}
              </Text>
              {slot.userId === match.creatorId ? (
                <Ionicons name="star" size={12} color={colors.warning} />
              ) : null}
            </View>
          </View>
        </>
      );
      const showKick = !isMe && isOrganizer && !teamsLocked;
      return (
        <View key={slot.userId} style={styles.slotFilled}>
          {body}
          {isMe && !teamsLocked ? (
            <Pressable
              style={styles.slotRemoveBtn}
              onPress={unassignSelfFromTeam}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              disabled={setTeamMut.isPending}
            >
              <Ionicons name="close" size={16} color={colors.error} />
            </Pressable>
          ) : showKick ? (
            <Pressable
              style={styles.slotRemoveBtn}
              onPress={() => kickFromTeam(slot.userId)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              disabled={manageMut.isPending}
            >
              <Ionicons name="close" size={16} color={colors.error} />
            </Pressable>
          ) : null}
        </View>
      );
    };

    const renderTournamentColumn = (teamIdx: number) => {
      const teamPlayers = match.participants.filter((p) => p.teamIndex === teamIdx);
      const slots = padTeamSlots(teamPlayers, size);
      const hasRoom = roomOnTeam(teamIdx);

      const isMyTeam = myTournamentTeam === teamIdx;
      return (
        <View style={[styles.tournamentGridCellInner, isMyTeam && styles.colMine]}>
          <View style={[styles.tournamentColHead, isMyTeam && styles.colHeadMine]}>
            <Text style={styles.colHeadText}>
              {t('match.teamN', { n: String(teamIdx + 1) })}
            </Text>
            {averageSkillLevel(teamPlayers) != null ? (
              <SkillBadge level={averageSkillLevel(teamPlayers)!} small />
            ) : null}
            <Text style={styles.colCount}>
              {teamPlayers.length}/{size}
            </Text>
          </View>
          <View style={styles.colBody}>
            {slots.map((slot, i) =>
              slot ? (
                renderTournamentFilled(slot)
              ) : (
                <TouchableOpacity
                  key={`e-${teamIdx}-${i}`}
                  style={[
                    styles.slotEmpty,
                    (!isParticipant || !hasRoom || setTeamMut.isPending) &&
                      styles.slotEmptyDisabled,
                    teamsLocked &&
                      styles.slotEmptyDisabled,
                  ]}
                  onPress={() => assignToTournamentTeam(teamIdx, i)}
                  disabled={!isParticipant || !hasRoom || setTeamMut.isPending || teamsLocked}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name="person-outline"
                    size={18}
                    color={isParticipant && hasRoom ? colors.primary : colors.textMuted}
                  />
                  <Text style={styles.slotEmptyText}>{t('match.emptyTeamSlot')}</Text>
                </TouchableOpacity>
              ),
            )}
          </View>
        </View>
      );
    };

    const noGames = !match.tournamentGames?.length;
    const isCompleted = match.status === 'completed';

    if (noGames && isCompleted) {
      return (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={32} color={colors.error} />
          <Text style={styles.notEnoughText}>{t('match.tournamentNotEnoughTeams')}</Text>
        </View>
      );
    }

    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: bottomInset }]}
        showsVerticalScrollIndicator={false}
      >
        {Array.from({ length: n }, (_, teamIdx) => (
          <View key={teamIdx} style={styles.tournamentGridCell}>
            {renderTournamentColumn(teamIdx)}
          </View>
        ))}

        {benchPlayers.length > 0 ? (
          <View style={styles.bench}>
            <Text style={styles.benchTitle}>{t('match.playersUnassigned')}</Text>
            {benchPlayers.map((p) => (
              <View key={p.userId} style={styles.slotFilled}>
                {p.user.profilePicture ? (
                  <Image
                    source={{ uri: p.user.profilePicture }}
                    style={styles.avatar}
                  />
                ) : (
                  <View style={[styles.avatar, styles.avatarPh]}>
                    <Text style={styles.avatarInitial}>
                      {p.user.username[0]?.toUpperCase() ?? '?'}
                    </Text>
                  </View>
                )}
                <View style={styles.slotInfo}>
                  <Text style={styles.slotName} numberOfLines={1}>
                    {p.user.username}
                  </Text>
                  <View style={styles.slotMeta}>
                    <SkillBadge level={p.user.skillLevel} small />
                    <Text style={styles.positionText}>
                      {t(POSITION_KEYS[p.user.position ?? 'any'])}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : null}

      </ScrollView>
    );
  }

  const slotsPerTeam = Math.floor(match.maxPlayers / 2);
  const teamAPlayers = match.participants.filter((p) => p.teamIndex === 0);
  const teamBPlayers = match.participants.filter((p) => p.teamIndex === 1);
  const benchPlayers = match.participants.filter(
    (p) => p.teamIndex !== 0 && p.teamIndex !== 1,
  );

  const slotsA = padTeamSlots(teamAPlayers, slotsPerTeam);
  const slotsB = padTeamSlots(teamBPlayers, slotsPerTeam);

  const isParticipant = user
    ? match.participants.some((p) => p.userId === user.id)
    : false;
  const myP = user
    ? match.participants.find((p) => p.userId === user.id)
    : undefined;
  const myTeam =
    myP?.teamIndex === 0 || myP?.teamIndex === 1 ? myP.teamIndex : null;

  const assignTo = async (teamIdx: 0 | 1, slotIdx?: number) => {
    if (!user) {
      Alert.alert(t('match.signInRequiredTitle'), t('match.signInRequiredMessage'));
      return;
    }
    if (!isParticipant) {
      Alert.alert(t('common.error'), t('match.teamsBoardJoinFirst'));
      return;
    }
    if (teamsLocked) {
      return;
    }
    try {
      await setTeamMut.mutateAsync({ matchId, teamIndex: teamIdx, slotIndex: slotIdx ?? null });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t('match.teamsBoardAssignFailed');
      Alert.alert(t('common.error'), msg);
    }
  };

  const renderSlot = (
    slot: MatchParticipant | null,
    teamIdx: 0 | 1,
    slotIndex: number,
  ) => {
    const key = slot ? slot.userId : `empty-${teamIdx}-${slotIndex}`;
    if (slot) {
      const isMe = user?.id === slot.userId;
      const body = (
        <>
          {slot.user.profilePicture ? (
            <Image
              source={{ uri: slot.user.profilePicture }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatar, styles.avatarPh]}>
              <Text style={styles.avatarInitial}>
                {slot.user.username[0]?.toUpperCase() ?? '?'}
              </Text>
            </View>
          )}
          <View style={styles.slotInfo}>
            <Text style={styles.slotName} numberOfLines={1}>
              {slot.user.username}
            </Text>
            <View style={styles.slotMeta}>
              <SkillBadge level={slot.user.skillLevel} small />
              <Text style={styles.positionText}>
                {t(POSITION_KEYS[slot.user.position ?? 'any'])}
              </Text>
              {slot.userId === match.creatorId ? (
                <Ionicons name="star" size={12} color={colors.warning} />
              ) : null}
            </View>
          </View>
        </>
      );
      const showKick = !isMe && isOrganizer && !teamsLocked;
      return (
        <View key={key} style={styles.slotFilled}>
          {body}
          {isMe && !teamsLocked ? (
            <Pressable
              style={styles.slotRemoveBtn}
              onPress={unassignSelfFromTeam}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              disabled={setTeamMut.isPending}
            >
              <Ionicons name="close" size={16} color={colors.error} />
            </Pressable>
          ) : showKick ? (
            <Pressable
              style={styles.slotRemoveBtn}
              onPress={() => kickFromTeam(slot.userId)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              disabled={manageMut.isPending}
            >
              <Ionicons name="close" size={16} color={colors.error} />
            </Pressable>
          ) : null}
        </View>
      );
    }

    const canTap =
      !teamsLocked && isParticipant;
    return (
      <TouchableOpacity
        key={key}
        style={[styles.slotEmpty, !canTap && styles.slotEmptyDisabled]}
        onPress={() => assignTo(teamIdx, slotIndex)}
        disabled={!canTap || setTeamMut.isPending}
        activeOpacity={0.75}
      >
        <Ionicons
          name="person-outline"
          size={18}
          color={colors.primary}
        />
        <Text style={styles.slotEmptyText}>{t('match.emptyTeamSlot')}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: bottomInset }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.board}>
        <View style={[styles.col, myTeam === 0 ? styles.colMine : styles.colA]}>
          <View style={[styles.colHead, myTeam === 0 ? styles.colHeadMine : styles.colHeadA]}>
            <Text style={styles.colHeadText}>{t('match.teamA')}</Text>
            {averageSkillLevel(teamAPlayers) != null ? (
              <SkillBadge level={averageSkillLevel(teamAPlayers)!} small />
            ) : null}
            <Text style={styles.colCount}>
              {teamAPlayers.length}/{slotsPerTeam}
            </Text>
          </View>
          <View style={styles.colBody}>
            {slotsA.map((slot, i) => renderSlot(slot, 0, i))}
          </View>
        </View>
        <View style={[styles.col, myTeam === 1 ? styles.colMine : styles.colB]}>
          <View style={[styles.colHead, myTeam === 1 ? styles.colHeadMine : styles.colHeadB]}>
            <Text style={styles.colHeadText}>{t('match.teamB')}</Text>
            {averageSkillLevel(teamBPlayers) != null ? (
              <SkillBadge level={averageSkillLevel(teamBPlayers)!} small />
            ) : null}
            <Text style={styles.colCount}>
              {teamBPlayers.length}/{slotsPerTeam}
            </Text>
          </View>
          <View style={styles.colBody}>
            {slotsB.map((slot, i) => renderSlot(slot, 1, i))}
          </View>
        </View>
      </View>

      {benchPlayers.length > 0 ? (
        <View style={styles.bench}>
          <Text style={styles.benchTitle}>{t('match.playersUnassigned')}</Text>
          {benchPlayers.map((p) => (
            <View key={p.userId} style={styles.slotFilled}>
              {p.user.profilePicture ? (
                <Image
                  source={{ uri: p.user.profilePicture }}
                  style={styles.avatar}
                />
              ) : (
                <View style={[styles.avatar, styles.avatarPh]}>
                  <Text style={styles.avatarInitial}>
                    {p.user.username[0]?.toUpperCase() ?? '?'}
                  </Text>
                </View>
              )}
              <View style={styles.slotInfo}>
                <Text style={styles.slotName} numberOfLines={1}>
                  {p.user.username}
                </Text>
                <View style={styles.slotMeta}>
                  <SkillBadge level={p.user.skillLevel} small />
                  <Text style={styles.positionText}>
                    {t(POSITION_KEYS[p.user.position ?? 'any'])}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      ) : null}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  cancelledTitle: {
    ...typography.h3,
    color: colors.error,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  cancelledSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  errorText: {
    ...typography.body,
    color: colors.error,
    textAlign: 'center',
  },
  notEnoughText: {
    ...typography.body,
    color: colors.error,
    textAlign: 'center',
    fontWeight: '600',
    marginTop: spacing.md,
  },
  board: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  col: {
    flex: 1,
    minWidth: 0,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  colA: {
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  colB: {
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  colMine: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  colHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.xs,
  },
  colHeadA: {
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
  },
  colHeadB: {
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
  },
  colHeadMine: {
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
  },
  colHeadText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.text,
  },
  colCount: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
  },
  colBody: {
    padding: spacing.sm,
    gap: spacing.sm,
  },
  slotFilled: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  slotRemoveBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.error + '18',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 'auto',
  },
  slotEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.surface,
    minHeight: 52,
  },
  slotEmptyDisabled: {
    opacity: 0.55,
  },
  slotEmptyText: {
    ...typography.bodySmall,
    color: colors.textMuted,
    flex: 1,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarPh: {
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarInitial: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  slotInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  slotName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  slotMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  positionText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  bench: {
    gap: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  benchTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.45,
    marginBottom: spacing.xs,
  },
  tournamentGridCell: {
    width: '100%',
    marginBottom: spacing.sm,
  },
  tournamentGridCellInner: {
    flex: 1,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    backgroundColor: colors.card,
  },
  tournamentRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  tournamentRowScroll: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  tournamentColFlex: {
    flex: 1,
    minWidth: 0,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  tournamentColNarrow: {
    width: 168,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  tournamentColHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.xs,
  },
  slotEmptyReadonly: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.background,
    minHeight: 52,
    opacity: 0.75,
  },
  btnDisabled: { opacity: 0.6 },
});
