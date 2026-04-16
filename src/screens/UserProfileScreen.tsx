import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
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
  const { data: profile, isLoading, error, refetch: refetchProfile, isFetching: profileFetching } = usePublicProfile(userId);
  const { data: stats, isLoading: statsLoading, refetch: refetchStats, isFetching: statsFetching } = useUserMatchStats(userId, statsFormat);
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

  const relationsTotal = profile.followersCount ?? 0;
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

  const canShowAddButton = currentUser && !isOwnProfile && !isFollowing && !outgoing && !incoming;

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
      refreshControl={<RefreshControl refreshing={profileFetching || statsFetching} onRefresh={() => { refetchProfile(); refetchStats(); }} />}
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
            {isFollowing && !isOwnProfile ? (
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
            ) : outgoing && !isOwnProfile ? (
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

      {incoming && currentUser && !isOwnProfile ? (
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
            <View style={styles.clubLine}>
              <Text style={styles.clubLineLabel}>{t('profile.clubSubsectionName')} :</Text>
              <Text style={styles.clubLineValue} numberOfLines={2}>
                {clubRaw || t('profile.clubNotSpecified')}
              </Text>
            </View>
            <View style={styles.clubLine}>
              <Text style={styles.clubLineLabel}>{t('profile.competition')} :</Text>
              <Text style={styles.clubLineValue} numberOfLines={2}>
                {showCompetition ? competitionLabelText : t('profile.competitionsNone')}
              </Text>
            </View>
          </View>
        </View>
      )}

      <View style={styles.tabBlock}>
        <View style={styles.tabBlockHeaderTinted}>
          <Pressable style={styles.tabBlockHeaderHalf} onPress={() => setStatsFormat('match')}>
            <Text style={[
              styles.tabBlockHeaderTitle,
              statsFormat === 'match' ? styles.tabBlockHeaderActive : styles.tabBlockHeaderInactive,
            ]}>{t('match.eventMatch')}</Text>
          </Pressable>
          <View style={styles.tabBlockHeaderDivider} />
          <Pressable style={styles.tabBlockHeaderHalf} onPress={() => setStatsFormat('tournament')}>
            <Text style={[
              styles.tabBlockHeaderTitle,
              statsFormat === 'tournament' ? styles.tabBlockHeaderActive : styles.tabBlockHeaderInactive,
            ]}>{t('match.eventTournament')}</Text>
          </Pressable>
        </View>

        <View style={styles.statsGrid}>
          {/* Ligne 1 : Jou\u00e9s, Cr\u00e9\u00e9s, \u00c0 venir */}
          <View style={styles.statsGridRow}>
            <View style={styles.statsGridCell}>
              <Text style={styles.statsGridValue}>{statsLoading ? '\u2013' : stats?.played ?? 0}</Text>
              <Text style={styles.statsGridLabel}>{t('profile.played')}</Text>
            </View>
            <View style={styles.statsGridCell}>
              <Text style={styles.statsGridValue}>{statsLoading ? '\u2013' : stats?.created ?? 0}</Text>
              <Text style={styles.statsGridLabel}>{t('profile.created')}</Text>
            </View>
            <View style={styles.statsGridCell}>
              <Text style={styles.statsGridValue}>{statsLoading ? '\u2013' : stats?.upcoming ?? 0}</Text>
              <Text style={styles.statsGridLabel}>{t('profile.upcoming')}</Text>
            </View>
          </View>

          <View style={styles.statsGridDivider} />

          {/* Ligne 2 : Victoires, D\u00e9faites */}
          <View style={styles.statsGridRow}>
            <View style={styles.statsGridCell}>
              <Text style={styles.statsGridValue}>{wins}</Text>
              <Text style={styles.statsGridLabel}>{t('profile.wins')}</Text>
            </View>
            <View style={styles.statsGridCell}>
              <Text style={styles.statsGridValue}>{losses}</Text>
              <Text style={styles.statsGridLabel}>{t('profile.losses')}</Text>
            </View>
          </View>

          {/* Ligne 3 : Ratio, S\u00e9rie */}
          <View style={styles.statsGridRow}>
            <View style={styles.statsGridCell}>
              <Text style={styles.statsGridValue}>{winRate}%</Text>
              <Text style={styles.statsGridLabel}>{t('profile.winRate')}</Text>
            </View>
            <View style={styles.statsGridCell}>
              <Text style={styles.statsGridValue}>{streak}</Text>
              <Text style={styles.statsGridLabel}>{t('profile.currentStreak')}</Text>
            </View>
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
    marginTop: spacing.md,
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
  clubLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  clubLineLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  clubLineValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    flexShrink: 1,
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
  tabBlock: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    overflow: 'hidden',
    ...shadows.card,
  },
  tabBlockHeaderTinted: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '12',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabBlockHeaderHalf: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm + 2,
  },
  tabBlockHeaderDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: colors.border,
  },
  tabBlockHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  tabBlockHeaderActive: {
    color: colors.white,
  },
  tabBlockHeaderInactive: {
    color: colors.textMuted,
  },
  statsGrid: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  statsGridRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statsGridCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    gap: 2,
  },
  statsGridValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  statsGridLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  statsGridDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
});
