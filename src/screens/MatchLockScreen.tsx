import React, { useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useManageMatch, useMatch } from '../hooks/useMatches';
import { useTranslation } from '../i18n';
import { colors, spacing, borderRadius, typography } from '../theme';
import { SkillBadge } from '../components/SkillBadge';
import { useBottomInset } from '../hooks/useBottomInset';
import type { FindStackParamList } from '../navigation/types';
import type { MatchParticipant, Position } from '../types';

type Props = NativeStackScreenProps<FindStackParamList, 'MatchLock'>;

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

export function MatchLockScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const bottomInset = useBottomInset(0);
  const { matchId, setScores } = route.params;
  const { data: match, isLoading, error } = useMatch(matchId);
  const manageMut = useManageMatch();

  const [overrides, setOverrides] = useState<Record<string, number | null>>({});
  const [pickerTeamIdx, setPickerTeamIdx] = useState<0 | 1 | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({ title: t('match.lockModalTitle') });
  }, [navigation, t]);

  const effectiveTeam = (p: MatchParticipant): number | null => {
    if (Object.prototype.hasOwnProperty.call(overrides, p.userId)) {
      return overrides[p.userId];
    }
    return p.teamIndex ?? null;
  };

  const { teamA, teamB, unassigned } = useMemo(() => {
    const a: MatchParticipant[] = [];
    const b: MatchParticipant[] = [];
    const u: MatchParticipant[] = [];
    if (match) {
      for (const p of match.participants) {
        const tx = effectiveTeam(p);
        if (tx === 0) a.push(p);
        else if (tx === 1) b.push(p);
        else u.push(p);
      }
    }
    return { teamA: a, teamB: b, unassigned: u };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match?.participants, overrides]);

  if (isLoading || !match) {
    return (
      <View style={styles.centered}>
        {error ? (
          <Text style={styles.errorText}>{t('match.loadFailed')}</Text>
        ) : (
          <ActivityIndicator color={colors.primary} size="large" />
        )}
      </View>
    );
  }

  const baseSize =
    match.teamSize ??
    Math.max(1, Math.floor((match.maxPlayers ?? 2) / 2));
  const slotCountFor = (filled: number): number => Math.max(filled, baseSize);

  const canLock = teamA.length + teamB.length >= 2;
  const teamAEmpty = teamA.length === 0;
  const teamBEmpty = teamB.length === 0;

  const setTeamFor = (userId: string, teamIndex: number | null) => {
    setOverrides((prev) => ({ ...prev, [userId]: teamIndex }));
  };

  const openPicker = (teamIdx: 0 | 1) => {
    if (unassigned.length === 0) return;
    setPickerTeamIdx(teamIdx);
  };

  const closePicker = () => setPickerTeamIdx(null);

  const handlePickPlayer = (userId: string) => {
    if (pickerTeamIdx == null) return;
    setTeamFor(userId, pickerTeamIdx);
    closePicker();
  };

  const handleConfirm = async () => {
    const diff: Record<string, number | null> = {};
    for (const p of match.participants) {
      if (Object.prototype.hasOwnProperty.call(overrides, p.userId)) {
        const original = p.teamIndex ?? null;
        const next = overrides[p.userId];
        if (original !== next) {
          diff[p.userId] = next;
        }
      }
    }
    try {
      await manageMut.mutateAsync({
        matchId: match.id,
        setScores,
        teamAssignments: Object.keys(diff).length > 0 ? diff : undefined,
      });
      Alert.alert('', t('match.manageSaved'));
      navigation.goBack();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t('match.manageFailed');
      Alert.alert(t('common.error'), msg);
    }
  };

  const renderPlayerCardBody = (p: MatchParticipant) => (
    <>
      {p.user.profilePicture ? (
        <Image source={{ uri: p.user.profilePicture }} style={styles.avatar} />
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
          {p.userId === match.creatorId ? (
            <Ionicons name="star" size={12} color={colors.warning} />
          ) : null}
        </View>
      </View>
    </>
  );

  const renderFilledSlot = (p: MatchParticipant) => (
    <View key={p.userId} style={styles.slotFilled}>
      {renderPlayerCardBody(p)}
      <Pressable
        style={styles.slotRemoveBtn}
        onPress={() => setTeamFor(p.userId, null)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="close" size={16} color={colors.error} />
      </Pressable>
    </View>
  );

  const renderEmptySlot = (teamIdx: 0 | 1, key: string) => {
    const enabled = unassigned.length > 0;
    return (
      <Pressable
        key={key}
        style={[styles.slotEmpty, !enabled && styles.slotEmptyDisabled]}
        onPress={() => openPicker(teamIdx)}
        disabled={!enabled}
        accessibilityRole="button"
      >
        <Ionicons
          name="person-outline"
          size={18}
          color={enabled ? colors.primary : colors.textMuted}
        />
        <Text
          style={[styles.slotEmptyText, enabled && styles.slotEmptyTextActive]}
          numberOfLines={1}
        >
          {t('match.emptyTeamSlot')}
        </Text>
        {enabled ? (
          <View style={styles.slotAddBtn}>
            <Ionicons name="add" size={18} color={colors.white} />
          </View>
        ) : null}
      </Pressable>
    );
  };

  const renderTeamColumn = (
    label: string,
    teamPlayers: MatchParticipant[],
    teamIdx: 0 | 1,
    isEmpty: boolean,
  ) => {
    const slotCount = slotCountFor(teamPlayers.length);
    const emptyCount = Math.max(0, slotCount - teamPlayers.length);
    return (
      <View style={[styles.col, isEmpty ? styles.colEmpty : null]}>
        <View style={styles.colHead}>
          <Text style={styles.colHeadText}>{label}</Text>
          <Text style={styles.colCount}>
            {teamPlayers.length}/{baseSize}
          </Text>
          {isEmpty ? (
            <View style={styles.warnPill}>
              <Ionicons name="warning-outline" size={12} color={colors.warning} />
              <Text style={styles.warnPillText}>
                {t('match.lockModalEmptyTeam')}
              </Text>
            </View>
          ) : null}
        </View>
        <View style={styles.colBody}>
          {teamPlayers.map(renderFilledSlot)}
          {Array.from({ length: emptyCount }).map((_, i) =>
            renderEmptySlot(teamIdx, `empty-${teamIdx}-${i}`),
          )}
        </View>
      </View>
    );
  };

  const pickerLabel =
    pickerTeamIdx === 0
      ? t('match.teamA')
      : pickerTeamIdx === 1
        ? t('match.teamB')
        : '';

  return (
    <View style={styles.container}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.subtitle}>{t('match.lockModalSubtitle')}</Text>

        {unassigned.length > 0 ? (
          <View style={styles.bench}>
            <View style={styles.benchHeader}>
              <Text style={styles.benchTitle}>
                {t('match.lockModalUnassigned')} ({unassigned.length})
              </Text>
              <View style={styles.warnPill}>
                <Ionicons name="warning-outline" size={12} color={colors.warning} />
                <Text style={styles.warnPillText}>
                  {t('match.lockModalAssignHint')}
                </Text>
              </View>
            </View>
            {unassigned.map((p) => (
              <View key={p.userId} style={styles.slotFilled}>
                {renderPlayerCardBody(p)}
              </View>
            ))}
            <View style={styles.separator} />
          </View>
        ) : null}

        <View style={styles.board}>
          {renderTeamColumn(t('match.teamA'), teamA, 0, teamAEmpty)}
          {renderTeamColumn(t('match.teamB'), teamB, 1, teamBEmpty)}
        </View>

      </ScrollView>

      <View style={[styles.actionBar, { paddingBottom: bottomInset + spacing.xs }]}>
        <View style={styles.actionRow}>
          <Pressable
            style={[styles.btn, styles.btnCancel]}
            onPress={() => navigation.goBack()}
            disabled={manageMut.isPending}
          >
            <Text style={styles.btnCancelText}>{t('common.cancel')}</Text>
          </Pressable>
          <Pressable
            style={[styles.btn, styles.btnConfirm, (!canLock || manageMut.isPending) && styles.btnDisabled]}
            onPress={handleConfirm}
            disabled={!canLock || manageMut.isPending}
          >
            {manageMut.isPending ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Text style={styles.btnConfirmText}>{t('match.lockModalConfirm')}</Text>
            )}
          </Pressable>
        </View>
        {!canLock ? (
          <Text style={styles.bottomHint}>{t('match.lockModalMinPlayers')}</Text>
        ) : null}
      </View>

      <Modal
        visible={pickerTeamIdx != null}
        transparent
        animationType="fade"
        onRequestClose={closePicker}
      >
        <Pressable style={styles.pickerBackdrop} onPress={closePicker}>
          <Pressable
            style={styles.pickerSheet}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>
                {t('match.lockModalPickerTitle', { team: pickerLabel })}
              </Text>
              <Pressable onPress={closePicker} hitSlop={8}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </Pressable>
            </View>
            {unassigned.length === 0 ? (
              <Text style={styles.pickerEmpty}>{t('match.lockModalPickerEmpty')}</Text>
            ) : (
              <ScrollView
                style={{ maxHeight: 420 }}
                contentContainerStyle={{ gap: spacing.sm }}
              >
                {unassigned.map((p) => (
                  <Pressable
                    key={p.userId}
                    style={styles.pickerRow}
                    onPress={() => handlePickPlayer(p.userId)}
                    accessibilityRole="button"
                  >
                    {renderPlayerCardBody(p)}
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={colors.primary}
                    />
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  errorText: { ...typography.body, color: colors.error },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  board: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: spacing.sm,
  },
  col: {
    flex: 1,
    minWidth: 0,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    overflow: 'hidden',
  },
  colEmpty: {
    borderColor: colors.warning + '55',
  },
  colHead: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: spacing.xs,
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
    marginLeft: 'auto',
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
    borderColor: colors.primary + '66',
    backgroundColor: colors.primary + '08',
    minHeight: 52,
  },
  slotEmptyDisabled: {
    borderColor: colors.border,
    backgroundColor: colors.surface,
    opacity: 0.65,
  },
  slotEmptyText: {
    ...typography.bodySmall,
    color: colors.textMuted,
    flex: 1,
  },
  slotEmptyTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  slotAddBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    marginLeft: 'auto',
  },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  avatarPh: {
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarInitial: { fontSize: 14, fontWeight: '700', color: colors.text },
  slotInfo: { flex: 1, minWidth: 0, gap: 2 },
  slotName: { fontSize: 13, fontWeight: '700', color: colors.text },
  slotMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  positionText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  bench: {
    gap: spacing.sm,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginTop: spacing.xs,
  },
  benchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  benchTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.45,
  },
  warnPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    backgroundColor: colors.warning + '22',
  },
  warnPillText: { fontSize: 11, color: colors.warning, fontWeight: '600' },
  bottomHint: {
    ...typography.bodySmall,
    color: colors.warning,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  actionBar: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.xs,
    justifyContent: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  btn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCancel: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnCancelText: { ...typography.button, color: colors.text, fontSize: 14 },
  btnConfirm: { backgroundColor: colors.primary },
  btnConfirmText: { ...typography.button, color: colors.white, fontSize: 14 },
  btnDisabled: { opacity: 0.5 },

  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  pickerSheet: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  pickerTitle: { ...typography.h3, color: colors.text },
  pickerEmpty: {
    ...typography.bodySmall,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
