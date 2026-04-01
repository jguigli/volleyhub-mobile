import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import type { FindStackParamList } from '../navigation/types';
import type { MatchParticipant, Position } from '../types';

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
  const sorted = [...players].sort(
    (a, b) =>
      new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime(),
  );
  const out: (MatchParticipant | null)[] = [];
  for (let i = 0; i < size; i++) {
    out.push(sorted[i] ?? null);
  }
  return out;
}

export function MatchTeamsBoardScreen({ route }: Props) {
  const { t } = useTranslation();
  const { matchId } = route.params;
  const user = useAuthStore((s) => s.user);
  const { data: match, isLoading, error } = useMatch(matchId);
  const setTeamMut = useSetMyTeam();
  const manageMut = useManageMatch();

  const [teamByUser, setTeamByUser] = useState<Record<string, number | null>>({});

  const participantTeamSig = useMemo(() => {
    if (!match) {
      return '';
    }
    const prefix = isTournamentMatch(match) ? 't' : 'm';
    return (
      prefix +
      [...match.participants]
        .map((p) => `${p.userId}:${p.teamIndex ?? 'x'}`)
        .sort()
        .join('|')
    );
  }, [match]);

  useEffect(() => {
    if (!match) {
      return;
    }
    const next: Record<string, number | null> = {};
    if (isTournamentMatch(match)) {
      const n = match.teamCount ?? 0;
      for (const p of match.participants) {
        const ti = p.teamIndex;
        next[p.userId] =
          ti !== null &&
          ti !== undefined &&
          Number.isInteger(ti) &&
          ti >= 0 &&
          ti < n
            ? ti
            : null;
      }
    } else {
      for (const p of match.participants) {
        next[p.userId] =
          p.teamIndex === 0 || p.teamIndex === 1 ? p.teamIndex : null;
      }
    }
    setTeamByUser(next);
  }, [matchId, participantTeamSig, match]);

  const canManageTeams = Boolean(
    match &&
      user &&
      user.id === match.creatorId &&
      !isTournamentMatch(match) &&
      match.status !== 'completed' &&
      !isLive,
  );

  const canManageTournamentTeams = Boolean(
    match &&
      user &&
      user.id === match.creatorId &&
      isTournamentMatch(match) &&
      match.status !== 'completed' &&
      !isLive,
  );
  const isLive = Boolean(
    match &&
      match.status !== 'completed' &&
      match.status !== 'cancelled' &&
      Date.now() >= new Date(match.scheduledAt).getTime(),
  );
  const teamsLocked =
    match?.status === 'completed' || isLive;

  const setOrganizerTeam = useCallback((uid: string, idx: number | null) => {
    setTeamByUser((prev) => ({ ...prev, [uid]: idx }));
  }, []);

  const handleOrganizerSave = useCallback(async () => {
    if (!match || isTournamentMatch(match)) {
      return;
    }
    if (!user || user.id !== match.creatorId) {
      Alert.alert(t('common.error'), t('match.manageUnauthorized'));
      return;
    }
    const teamAssignments: Record<string, number | null> = {};
    for (const p of match.participants) {
      const v = teamByUser[p.userId] ?? null;
      teamAssignments[p.userId] =
        v === 0 || v === 1 ? v : null;
    }
    try {
      await manageMut.mutateAsync({
        matchId: match.id,
        teamAssignments,
      });
      Alert.alert('', t('match.manageSaved'));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t('match.manageFailed');
      Alert.alert(t('common.error'), msg);
    }
  }, [manageMut, match, t, teamByUser, user]);

  const handleOrganizerSaveTournament = useCallback(async () => {
    if (!match || !isTournamentMatch(match)) {
      return;
    }
    if (!user || user.id !== match.creatorId) {
      Alert.alert(t('common.error'), t('match.manageUnauthorized'));
      return;
    }
    const teamAssignments: Record<string, number | null> = {};
    for (const p of match.participants) {
      teamAssignments[p.userId] = teamByUser[p.userId] ?? null;
    }
    try {
      await manageMut.mutateAsync({
        matchId: match.id,
        teamAssignments,
      });
      Alert.alert('', t('match.manageSaved'));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t('match.manageFailed');
      Alert.alert(t('common.error'), msg);
    }
  }, [manageMut, match, t, teamByUser, user]);

  const lastSelfTeamTapRef = useRef(0);
  const DOUBLE_TAP_MS = 350;

  const unassignSelfFromTeam = useCallback(async () => {
    if (!user) {
      return;
    }
    if (teamsLocked) {
      return;
    }
    try {
      await setTeamMut.mutateAsync({ matchId, teamIndex: null });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t('match.teamsBoardAssignFailed');
      Alert.alert(t('common.error'), msg);
    }
  }, [matchId, setTeamMut, t, user, teamsLocked]);

  const onSelfTeamSlotPress = useCallback(() => {
    const now = Date.now();
    if (now - lastSelfTeamTapRef.current < DOUBLE_TAP_MS) {
      lastSelfTeamTapRef.current = 0;
      void unassignSelfFromTeam();
    } else {
      lastSelfTeamTapRef.current = now;
    }
  }, [unassignSelfFromTeam]);

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

  if (isTournamentMatch(match)) {
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

    const assignToTournamentTeam = async (teamIdx: number) => {
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
      if (myTournamentTeam === teamIdx) {
        return;
      }
      if (!roomOnTeam(teamIdx)) {
        Alert.alert(t('common.error'), t('match.teamsBoardTeamFull'));
        return;
      }
      try {
        await setTeamMut.mutateAsync({ matchId, teamIndex: teamIdx });
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
      if (isMe) {
        return (
          <Pressable
            key={slot.userId}
            style={styles.slotFilled}
            onPress={onSelfTeamSlotPress}
          >
            {body}
          </Pressable>
        );
      }
      return (
        <View key={slot.userId} style={styles.slotFilled}>
          {body}
        </View>
      );
    };

    const renderTournamentColumn = (teamIdx: number) => {
      const teamPlayers = match.participants.filter((p) => p.teamIndex === teamIdx);
      const slots = padTeamSlots(teamPlayers, size);
      const hasRoom = roomOnTeam(teamIdx);

      return (
        <View style={styles.tournamentGridCellInner}>
          <View style={styles.tournamentColHead}>
            <Text style={styles.colHeadText}>
              {t('match.teamN', { n: String(teamIdx + 1) })}
            </Text>
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
                  onPress={() => assignToTournamentTeam(teamIdx)}
                  disabled={!isParticipant || !hasRoom || setTeamMut.isPending || teamsLocked}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name="add-outline"
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

    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {Array.from({ length: n }, (_, teamIdx) => (
          <View key={teamIdx} style={styles.tournamentGridCell}>
            {renderTournamentColumn(teamIdx)}
          </View>
        ))}

        {canManageTournamentTeams && benchPlayers.length > 0 ? (
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

        {canManageTournamentTeams && match.participants.length > 0 ? (
          <TournamentOrganizerSection
            participants={match.participants}
            teamCount={n}
            teamByUser={teamByUser}
            setOrganizerTeam={setOrganizerTeam}
            onSave={handleOrganizerSaveTournament}
            saving={manageMut.isPending}
            t={t}
          />
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

  const assignTo = async (teamIdx: 0 | 1) => {
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
    if (myTeam === teamIdx) {
      return;
    }
    try {
      await setTeamMut.mutateAsync({ matchId, teamIndex: teamIdx });
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
      if (isMe) {
        return (
          <Pressable key={key} style={styles.slotFilled} onPress={onSelfTeamSlotPress}>
            {body}
          </Pressable>
        );
      }
      return (
        <View key={key} style={styles.slotFilled}>
          {body}
        </View>
      );
    }

    const canTap =
      !teamsLocked && isParticipant && (myTeam === null || myTeam !== teamIdx);
    return (
      <TouchableOpacity
        key={key}
        style={[styles.slotEmpty, !canTap && styles.slotEmptyDisabled]}
        onPress={() => assignTo(teamIdx)}
        disabled={!canTap || setTeamMut.isPending}
        activeOpacity={0.75}
      >
        <Ionicons
          name="person-outline"
          size={18}
          color={colors.textMuted}
        />
        <Text style={styles.slotEmptyText}>{t('match.emptyTeamSlot')}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.board}>
        <View style={[styles.col, styles.colA]}>
          <View style={[styles.colHead, styles.colHeadA]}>
            <Text style={styles.colHeadText}>{t('match.teamA')}</Text>
            <Text style={styles.colCount}>
              {teamAPlayers.length}/{slotsPerTeam}
            </Text>
          </View>
          <View style={styles.colBody}>
            {slotsA.map((slot, i) => renderSlot(slot, 0, i))}
          </View>
        </View>
        <View style={[styles.col, styles.colB]}>
          <View style={[styles.colHead, styles.colHeadB]}>
            <Text style={styles.colHeadText}>{t('match.teamB')}</Text>
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

      {canManageTeams && match.participants.length > 0 ? (
        <View style={styles.organizerSection}>
          <Text style={styles.organizerTitle}>{t('match.assignTeamsHint')}</Text>
          {match.participants.map((p) => {
            const cur = teamByUser[p.userId] ?? null;
            return (
              <View key={p.userId} style={styles.organizerRow}>
                <Text style={styles.organizerName} numberOfLines={1}>
                  {p.user.username}
                </Text>
                <View style={styles.teamPick}>
                  {(
                    [
                      { idx: null, label: t('match.teamNone') },
                      { idx: 0, label: 'A' },
                      { idx: 1, label: 'B' },
                    ] as { idx: number | null; label: string }[]
                  ).map(({ idx, label }) => (
                    <TouchableOpacity
                      key={String(idx)}
                      style={[
                        styles.teamChip,
                        cur === idx && styles.teamChipSelected,
                      ]}
                      onPress={() => setOrganizerTeam(p.userId, idx)}
                    >
                      <Text
                        style={[
                          styles.teamChipText,
                          cur === idx && styles.teamChipTextSelected,
                        ]}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            );
          })}
          <TouchableOpacity
            style={[styles.organizerSaveBtn, manageMut.isPending && styles.btnDisabled]}
            onPress={handleOrganizerSave}
            disabled={manageMut.isPending}
          >
            {manageMut.isPending ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.organizerSaveText}>{t('match.saveManage')}</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : null}
    </ScrollView>
  );
}

/* ──────────────────────────────────────────────
   Organizer section with dropdown per player
   ────────────────────────────────────────────── */

function TournamentOrganizerSection({
  participants,
  teamCount,
  teamByUser,
  setOrganizerTeam,
  onSave,
  saving,
  t,
}: {
  participants: MatchParticipant[];
  teamCount: number;
  teamByUser: Record<string, number | null>;
  setOrganizerTeam: (uid: string, idx: number | null) => void;
  onSave: () => void;
  saving: boolean;
  t: ReturnType<typeof useTranslation>['t'];
}) {
  const [openUid, setOpenUid] = useState<string | null>(null);

  const teamOptions: { idx: number | null; label: string }[] = useMemo(
    () => [
      { idx: null, label: t('match.teamNone') },
      ...Array.from({ length: teamCount }, (_, i) => ({
        idx: i,
        label: t('match.teamN', { n: String(i + 1) }),
      })),
    ],
    [teamCount, t],
  );

  return (
    <View style={orgStyles.section}>
      <View style={orgStyles.header}>
        <Ionicons name="people-outline" size={20} color={colors.primary} />
        <Text style={orgStyles.title}>{t('match.assignTeamsTournamentHint')}</Text>
      </View>

      {participants.map((p) => {
        const cur = teamByUser[p.userId] ?? null;
        const curLabel =
          cur !== null
            ? t('match.teamN', { n: String(cur + 1) })
            : t('match.teamNone');
        const isOpen = openUid === p.userId;

        return (
          <View key={p.userId} style={orgStyles.playerCard}>
            <Pressable
              style={orgStyles.playerRow}
              onPress={() => setOpenUid(isOpen ? null : p.userId)}
            >
              <View style={orgStyles.playerInfo}>
                {p.user.profilePicture ? (
                  <Image
                    source={{ uri: p.user.profilePicture }}
                    style={orgStyles.avatar}
                  />
                ) : (
                  <View style={[orgStyles.avatar, orgStyles.avatarPh]}>
                    <Text style={orgStyles.avatarInitial}>
                      {p.user.username[0]?.toUpperCase() ?? '?'}
                    </Text>
                  </View>
                )}
                <Text style={orgStyles.playerName} numberOfLines={1}>
                  {p.user.username}
                </Text>
              </View>
              <View style={orgStyles.currentTeam}>
                <Text
                  style={[
                    orgStyles.currentTeamText,
                    cur !== null && orgStyles.currentTeamAssigned,
                  ]}
                >
                  {curLabel}
                </Text>
                <Ionicons
                  name={isOpen ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={colors.textMuted}
                />
              </View>
            </Pressable>

            {isOpen ? (
              <View style={orgStyles.dropdown}>
                {teamOptions.map(({ idx, label }) => {
                  const selected = cur === idx;
                  return (
                    <Pressable
                      key={String(idx)}
                      style={[
                        orgStyles.dropdownItem,
                        selected && orgStyles.dropdownItemSelected,
                      ]}
                      onPress={() => {
                        setOrganizerTeam(p.userId, idx);
                        setOpenUid(null);
                      }}
                    >
                      <Text
                        style={[
                          orgStyles.dropdownItemText,
                          selected && orgStyles.dropdownItemTextSelected,
                        ]}
                      >
                        {label}
                      </Text>
                      {selected ? (
                        <Ionicons name="checkmark" size={16} color={colors.primary} />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </View>
        );
      })}

      <TouchableOpacity
        style={[orgStyles.saveBtn, saving && styles.btnDisabled]}
        onPress={onSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text style={orgStyles.saveBtnText}>{t('match.saveManage')}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const orgStyles = StyleSheet.create({
  section: {
    marginTop: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: spacing.md,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    flex: 1,
  },
  playerCard: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  playerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minWidth: 0,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  avatarPh: {
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarInitial: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  playerName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  currentTeam: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  currentTeamText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  currentTeamAssigned: {
    color: colors.primary,
    fontWeight: '800',
  },
  dropdown: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  dropdownItemSelected: {
    backgroundColor: colors.primary + '14',
  },
  dropdownItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  dropdownItemTextSelected: {
    color: colors.primary,
    fontWeight: '800',
  },
  saveBtn: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  errorText: {
    ...typography.body,
    color: colors.error,
    textAlign: 'center',
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
    borderColor: colors.primary + '66',
    backgroundColor: colors.primary + '08',
  },
  colB: {
    borderColor: colors.matchOrange + '88',
    backgroundColor: colors.matchOrange + '10',
  },
  colHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  colHeadA: {
    backgroundColor: colors.primary + '22',
    borderBottomColor: colors.primary + '44',
  },
  colHeadB: {
    backgroundColor: colors.matchOrange + '22',
    borderBottomColor: colors.matchOrange + '44',
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
  organizerSection: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    gap: spacing.sm,
    ...shadows.card,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  organizerTitle: {
    ...typography.h3,
    fontSize: 17,
    marginBottom: spacing.xs,
  },
  organizerRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  organizerName: {
    ...typography.body,
    fontWeight: '600',
    flex: 1,
    minWidth: 0,
  },
  teamPick: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
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
    backgroundColor: colors.surface,
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
    backgroundColor: colors.primary + '12',
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
  teamChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.surface,
  },
  teamChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '22',
  },
  teamChipText: { color: colors.textSecondary, fontWeight: '600' },
  teamChipTextSelected: { color: colors.primary },
  organizerSaveBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  organizerSaveText: { ...typography.button, color: colors.white, fontSize: 16 },
  btnDisabled: { opacity: 0.6 },
});
