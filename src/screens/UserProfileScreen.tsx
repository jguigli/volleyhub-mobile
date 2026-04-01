import React, { useState } from 'react';
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
import {
  usePublicProfile,
  useFollow,
  useSendFollowRequest,
  useCancelFollowRequest,
  useAcceptFollowRequest,
  useDeclineFollowRequest,
} from '../hooks/useUsers';
import { useUserMatchStats } from '../hooks/useMatches';
import { useAuthStore } from '../store/auth.store';
import { SkillBadge } from '../components/SkillBadge';
import { localeToBcp47, useTranslation } from '../i18n';
import { colors, spacing, borderRadius, typography, shadows } from '../theme';
import type { League, Position } from '../types';

type UserProfileNav = {
  UserProfile: { userId: string };
};
type Props = NativeStackScreenProps<UserProfileNav, 'UserProfile'>;

const LEAGUE_KEYS: League[] = [
  'departmental',
  'regional',
  'pre_national',
  'national',
  'professional',
];

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

export function UserProfileScreen({ route, navigation }: Props) {
  const [statsFormat, setStatsFormat] = useState<'match' | 'tournament'>('match');
  const { t, locale } = useTranslation();
  const localeTag = localeToBcp47(locale);
  const { userId } = route.params;
  const currentUser = useAuthStore((s) => s.user);
  const { data: profile, isLoading, error } = usePublicProfile(userId);
  const { data: stats, isLoading: statsLoading } = useUserMatchStats(userId, statsFormat);
  const { unfollow } = useFollow(userId);
  const sendRequest = useSendFollowRequest(userId);
  const cancelRequest = useCancelFollowRequest(userId);
  const acceptIncoming = useAcceptFollowRequest();
  const declineIncoming = useDeclineFollowRequest();

  const isOwnProfile = currentUser?.id === userId;

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={styles.centered}>
        <Ionicons name="person-outline" size={48} color={colors.textMuted} />
        <Text style={styles.errorText}>{t('profile.notFound')}</Text>
      </View>
    );
  }

  const relationsTotal =
    (profile.followersCount ?? 0) + (profile.followingCount ?? 0);
  const relationsText =
    relationsTotal === 0
      ? t('profile.relationsOnlyZero')
      : relationsTotal === 1
        ? t('profile.relationsOnlyOne')
        : t('profile.relationsOnlyMany', { n: relationsTotal });

  const memberSince = new Date(profile.createdAt).toLocaleDateString(localeTag, {
    month: 'long',
    year: 'numeric',
  });

  const bioText = (profile.bio ?? '').trim();
  const clubRaw = (profile.club ?? '').trim();
  const leagueVal = profile.league ?? null;
  const competitionLegacy = (profile.competition ?? '').trim();
  const competitionLabelText =
    leagueVal && LEAGUE_KEYS.includes(leagueVal)
      ? t(
          `profile.leagues.${leagueVal}` as
            | 'profile.leagues.departmental'
            | 'profile.leagues.regional'
            | 'profile.leagues.pre_national'
            | 'profile.leagues.national'
            | 'profile.leagues.professional',
        )
      : competitionLegacy;
  const showCompetition = competitionLabelText.length > 0;
  const showClubCompetition = Boolean(clubRaw || showCompetition);

  const isFollowing = profile.isFollowing === true;
  const outgoing = profile.outgoingFollowRequestPending === true;
  const incoming = profile.incomingFollowRequestPending === true;

  const wins = stats?.wins ?? 0;
  const losses = stats?.losses ?? 0;
  const winRate = stats?.winRate ?? 0;
  const streak = stats?.streak ?? 0;

  const openUnfollow = () => {
    Alert.alert(
      t('profile.unfollowTitle'),
      t('profile.unfollowMessage', { name: profile.username }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('profile.unfollowConfirm'),
          style: 'destructive',
          onPress: () => unfollow.mutate(),
        },
      ],
    );
  };

  const handleAddConnection = async () => {
    try {
      await sendRequest.mutateAsync();
    } catch {
      Alert.alert(t('common.error'), t('profile.connectionRequestFailed'));
    }
  };

  const handleCancelRequest = async () => {
    try {
      await cancelRequest.mutateAsync();
    } catch {
      Alert.alert(t('common.error'), t('profile.connectionRequestFailed'));
    }
  };

  const canShowAddButton = currentUser && !isFollowing && !outgoing && !incoming;

  const handleAcceptIncoming = async () => {
    try {
      await acceptIncoming.mutateAsync(profile.id);
    } catch {
      Alert.alert(t('common.error'), t('profile.connectionRequestFailed'));
    }
  };

  const handleDeclineIncoming = async () => {
    try {
      await declineIncoming.mutateAsync(profile.id);
    } catch {
      Alert.alert(t('common.error'), t('profile.connectionRequestFailed'));
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatar}>
            {profile.profilePicture ? (
              <Image
                source={{ uri: profile.profilePicture }}
                style={styles.avatarImage}
              />
            ) : (
              <Text style={styles.avatarInitial}>
                {profile.username[0]?.toUpperCase() ?? '?'}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.username}>{profile.username}</Text>

          <View style={styles.inlineFollowRow}>
            <Pressable
              style={styles.inlineFollowRelationsWrap}
              onPress={() => (navigation as any).navigate('Connections', { userId })}
            >
              <Text style={styles.inlineFollowRelations}>{relationsText}</Text>
            </Pressable>
            {isFollowing ? (
              <Pressable
                style={styles.inlineFollowAddBtn}
                onPress={openUnfollow}
                hitSlop={10}
                disabled={unfollow.isPending}
                accessibilityRole="button"
                accessibilityLabel={t('profile.unfollowTitle')}
              >
                {unfollow.isPending ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Ionicons name="person-remove-outline" size={24} color={colors.primary} />
                )}
              </Pressable>
            ) : null}
            {canShowAddButton ? (
              <Pressable
                style={styles.inlineFollowAddBtn}
                onPress={handleAddConnection}
                hitSlop={10}
                disabled={sendRequest.isPending}
                accessibilityRole="button"
                accessibilityLabel={t('profile.sendConnectionRequest')}
              >
                {sendRequest.isPending ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Ionicons name="person-add-outline" size={24} color={colors.primary} />
                )}
              </Pressable>
            ) : outgoing ? (
              <Pressable
                style={styles.inlineFollowAddBtn}
                onPress={handleCancelRequest}
                hitSlop={10}
                disabled={cancelRequest.isPending}
                accessibilityRole="button"
                accessibilityLabel={t('profile.cancelConnectionRequest')}
              >
                {cancelRequest.isPending ? (
                  <ActivityIndicator size="small" color={colors.textMuted} />
                ) : (
                  <Ionicons name="hourglass-outline" size={22} color={colors.textMuted} />
                )}
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>

      {bioText.length > 0 ? (
        <View style={styles.bioAfterHeader}>
          <Text style={styles.bioTextAfterHeader}>{bioText}</Text>
          <View style={styles.bioBelowDivider} />
        </View>
      ) : null}

      {incoming && currentUser ? (
        <View style={styles.incomingBanner}>
          <Text style={styles.incomingText}>
            {t('profile.incomingRequestBanner', { name: profile.username })}
          </Text>
          <View style={styles.incomingActions}>
            <TouchableOpacity
              style={[styles.incomingBtn, styles.incomingSecondary]}
              onPress={handleDeclineIncoming}
              disabled={declineIncoming.isPending || acceptIncoming.isPending}
            >
              <Text style={styles.incomingSecondaryText}>{t('profile.decline')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.incomingBtn, styles.incomingPrimary]}
              onPress={handleAcceptIncoming}
              disabled={declineIncoming.isPending || acceptIncoming.isPending}
            >
              <Text style={styles.incomingPrimaryText}>{t('profile.accept')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      <View style={styles.skillPositionRow}>
        <View style={[styles.skillPositionCol, styles.skillPositionColSkill]}>
          <View style={styles.skillPositionLabelRow}>
            <Ionicons name="trophy-outline" size={16} color={colors.primary} />
            <Text style={styles.sectionTitle}>{t('profile.skillLevel')}</Text>
          </View>
          <SkillBadge level={profile.skillLevel} centered />
        </View>
        <View style={[styles.skillPositionCol, styles.skillPositionColPosition]}>
          <View style={[styles.skillPositionLabelRow, styles.skillPositionLabelRowPoste]}>
            <Ionicons name="body-outline" size={16} color={colors.primary} />
            <Text style={styles.sectionTitle}>{t('profile.position')}</Text>
          </View>
          <View
            style={[styles.attributeCardInner, styles.attributeCardInnerPosition, styles.attributeCardPoste]}
          >
            <Text
              style={[styles.attributeValue, styles.attributeValueCentered, styles.attributeValuePosition]}
              numberOfLines={2}
            >
              {t(POSITION_KEYS[profile.position])}
            </Text>
          </View>
        </View>
      </View>

      {showClubCompetition && (
        <View style={styles.clubBlock}>
          <View style={styles.skillPositionLabelRow}>
            <Ionicons name="people-outline" size={16} color={colors.primary} />
            <Text style={styles.sectionTitle}>{t('profile.club')}</Text>
          </View>
          <View style={styles.clubBlockCard}>
            <View>
              <Text style={styles.clubSubsectionLabel}>{t('profile.clubSubsectionName')}</Text>
              <Text style={styles.clubSubsectionValue} numberOfLines={4}>
                {clubRaw || t('profile.clubNotSpecified')}
              </Text>
            </View>
            <View style={styles.clubBlockSubsectionDivider} />
            <View>
              <Text style={styles.clubSubsectionLabel}>{t('profile.competition')}</Text>
              <Text style={styles.clubSubsectionValue} numberOfLines={4}>
                {showCompetition ? competitionLabelText : t('profile.competitionsNone')}
              </Text>
            </View>
          </View>
        </View>
      )}

      <View style={styles.sectionHeader}>
        <Ionicons name="calendar-outline" size={16} color={colors.primary} />
        <Text style={styles.sectionTitle}>{t('profile.parties')}</Text>
      </View>
      <View style={styles.statsModeSwitchWrap}>
        <Pressable
          style={[
            styles.statsModeChip,
            statsFormat === 'match' ? styles.statsModeChipActive : null,
          ]}
          onPress={() => setStatsFormat('match')}
        >
          <Text
            style={[
              styles.statsModeChipText,
              statsFormat === 'match' ? styles.statsModeChipTextActive : null,
            ]}
          >
            {t('match.eventMatch')}
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.statsModeChip,
            statsFormat === 'tournament' ? styles.statsModeChipActive : null,
          ]}
          onPress={() => setStatsFormat('tournament')}
        >
          <Text
            style={[
              styles.statsModeChipText,
              statsFormat === 'tournament' ? styles.statsModeChipTextActive : null,
            ]}
          >
            {t('match.eventTournament')}
          </Text>
        </Pressable>
      </View>
      <View style={styles.statsCard}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {statsLoading ? '–' : stats?.played ?? 0}
          </Text>
          <Text style={styles.statLabel}>{t('profile.played')}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {statsLoading ? '–' : stats?.created ?? 0}
          </Text>
          <Text style={styles.statLabel}>{t('profile.created')}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {statsLoading ? '–' : stats?.upcoming ?? 0}
          </Text>
          <Text style={styles.statLabel}>{t('profile.upcoming')}</Text>
        </View>
      </View>

      <View style={styles.statisticsCard}>
        <View style={styles.statisticsRow}>
          <View style={styles.statisticsItem}>
            <Text style={styles.statisticsValue}>{wins}</Text>
            <Text style={styles.statisticsLabel}>{t('profile.wins')}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statisticsItem}>
            <Text style={styles.statisticsValue}>{losses}</Text>
            <Text style={styles.statisticsLabel}>{t('profile.losses')}</Text>
          </View>
        </View>
        <View style={styles.statisticsInnerDivider} />
        <View style={styles.statisticsRow}>
          <View style={styles.statisticsItem}>
            <Text style={styles.statisticsValue}>{winRate}%</Text>
            <Text style={styles.statisticsLabel}>{t('profile.winRate')}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statisticsItem}>
            <Text style={styles.statisticsValue}>{streak}</Text>
            <Text style={styles.statisticsLabel}>{t('profile.currentStreak')}</Text>
          </View>
        </View>
      </View>
      <Text style={styles.memberSinceBottom}>
        {t('profile.memberSince', { date: memberSince })}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: spacing.xl,
    paddingTop: spacing.sm,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  errorText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  hintText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  headerLeft: {
    paddingTop: 6,
    alignItems: 'center',
  },
  headerRight: {
    flex: 1,
    paddingLeft: spacing.md,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarInitial: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.white,
  },
  username: {
    ...typography.h2,
    fontSize: 24,
  },
  memberSinceBottom: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  inlineFollowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    gap: 4,
  },
  inlineFollowRelationsWrap: {
    flexShrink: 1,
    minWidth: 0,
  },
  inlineFollowAddBtn: {
    padding: 4,
    flexShrink: 0,
  },
  inlineFollowRelations: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  incomingBanner: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.primary + '18',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.primary + '44',
  },
  incomingText: {
    ...typography.bodySmall,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  incomingActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  incomingBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
  },
  incomingSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  incomingSecondaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  incomingPrimary: {
    backgroundColor: colors.primary,
  },
  incomingPrimaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },
  skillPositionRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  clubBlock: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  clubBlockCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
    alignSelf: 'stretch',
  },
  clubSubsectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  clubSubsectionValue: {
    ...typography.body,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  clubBlockSubsectionDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  bioAfterHeader: {
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  bioTextAfterHeader: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  bioBelowDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginTop: spacing.sm,
  },
  skillPositionCol: {
    flex: 1,
    minWidth: 0,
  },
  skillPositionColSkill: {
    flex: 1.05,
    alignItems: 'flex-start',
    marginRight: spacing.sm,
  },
  skillPositionColPosition: {
    flex: 0.95,
    minWidth: 0,
    transform: [{ translateX: -(spacing.md + spacing.sm) }],
  },
  skillPositionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.sm,
  },
  skillPositionLabelRowPoste: {
    alignSelf: 'flex-start',
  },
  attributeCardInner: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  attributeCardInnerPosition: {
    padding: spacing.sm + spacing.xs,
  },
  attributeCardPoste: {
    alignSelf: 'stretch',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  attributeValue: {
    ...typography.body,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    flexShrink: 1,
  },
  attributeValuePosition: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 20,
  },
  attributeValueCentered: {
    textAlign: 'center',
    alignSelf: 'stretch',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  statsModeSwitchWrap: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  statsModeChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm + 4,
    backgroundColor: colors.surface,
  },
  statsModeChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '22',
  },
  statsModeChipText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  statsModeChipTextActive: {
    color: colors.primary,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  statisticsCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  statisticsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  statisticsItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statisticsInnerDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  statisticsValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  statisticsLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});
