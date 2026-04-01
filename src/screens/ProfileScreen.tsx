import React, { useLayoutEffect, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { ProfileStackParamList } from '../navigation/types';
import { useAuthStore } from '../store/auth.store';
import { useUserMatchStats } from '../hooks/useMatches';
import { usePublicProfile } from '../hooks/useUsers';
import { useUnreadNotifications } from '../hooks/useUnreadNotifications';
import { SkillBadge } from '../components/SkillBadge';
import { localeToBcp47, useTranslation } from '../i18n';
import { colors, spacing, borderRadius, typography, shadows } from '../theme';
import type { League, Position } from '../types';

const LEAGUE_KEYS: League[] = [
  'departmental',
  'regional',
  'pre_national',
  'national',
  'professional',
];

type Props = NativeStackScreenProps<ProfileStackParamList, 'Profile'>;

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

export function ProfileScreen({ navigation }: Props) {
  const { t, locale } = useTranslation();
  const localeTag = localeToBcp47(locale);
  const [statsFormat, setStatsFormat] = useState<'match' | 'tournament'>('match');
  const { user } = useAuthStore();
  const { data: profile } = usePublicProfile(user?.id ?? '');
  const { hasUnread } = useUnreadNotifications();
  const { data: matchStats, isLoading: statsLoading } = useUserMatchStats(
    user?.id ?? '',
    statsFormat,
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Pressable
          onPress={() => navigation.navigate('Notifications')}
          style={styles.profileHeaderIcon}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel={t('nav.notifications')}
          android_ripple={null}
        >
          <View style={styles.notifIconWrap}>
            <Ionicons name="notifications-outline" size={24} color={colors.text} />
            {hasUnread ? <View style={styles.notifBadge} /> : null}
          </View>
        </Pressable>
      ),
      headerRight: () => (
        <Pressable
          onPress={() => navigation.navigate('Settings')}
          style={styles.profileHeaderIcon}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel={t('settings.accessibilitySettings')}
          android_ripple={null}
        >
          <Ionicons name="settings-outline" size={24} color={colors.text} />
        </Pressable>
      ),
    });
  }, [navigation, hasUnread, t]);

  if (!user) return null;

  const played = matchStats?.played ?? 0;
  const created = matchStats?.created ?? 0;
  const upcoming = matchStats?.upcoming ?? 0;
  const showStatsLoading = statsLoading;

  const wins = matchStats?.wins ?? 0;
  const losses = matchStats?.losses ?? 0;
  const winRate = matchStats?.winRate ?? 0;
  const streak = matchStats?.streak ?? 0;
  const bioText = (user.bio ?? profile?.bio ?? '').trim();

  const clubRaw = (profile?.club ?? user.club ?? '').trim();
  const leagueVal = profile?.league ?? user.league ?? null;
  const competitionLegacy = (profile?.competition ?? user.competition ?? '').trim();
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

  const relationsTotal =
    profile != null
      ? (profile.followersCount ?? 0) + (profile.followingCount ?? 0)
      : null;
  const relationsText =
    relationsTotal === null
      ? '–'
      : relationsTotal === 0
        ? t('profile.relationsOnlyZero')
        : relationsTotal === 1
          ? t('profile.relationsOnlyOne')
          : t('profile.relationsOnlyMany', { n: relationsTotal });
  const memberSinceText = (() => {
    const d = new Date(user.createdAt);
    if (Number.isNaN(d.getTime())) {
      return '—';
    }
    return d.toLocaleDateString(localeTag, { month: 'long', year: 'numeric' });
  })();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatar}>
            {user.profilePicture ? (
              <Image source={{ uri: user.profilePicture }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarInitial}>
                {user.username[0]?.toUpperCase() ?? '?'}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.username}>{user.username}</Text>
          <Text style={styles.email}>{user.email}</Text>

          <View style={styles.inlineFollowRow}>
            <Pressable
              style={styles.inlineFollowRelationsWrap}
              onPress={() => navigation.navigate('Connections', { userId: user.id })}
            >
              <Text style={styles.inlineFollowRelations}>{relationsText}</Text>
            </Pressable>
            <Pressable
              style={styles.inlineFollowAddBtn}
              onPress={() => navigation.navigate('SearchUsers')}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={t('userList.searchPlayersTitle')}
            >
              <Ionicons name="search-outline" size={24} color={colors.primary} />
            </Pressable>
          </View>
        </View>
      </View>

      {bioText.length > 0 ? (
        <View style={styles.bioAfterHeader}>
          <Text style={styles.bioTextAfterHeader}>{bioText}</Text>
          <View style={styles.bioBelowDivider} />
        </View>
      ) : null}

      <View style={styles.skillPositionRow}>
        <View style={[styles.skillPositionCol, styles.skillPositionColSkill]}>
          <View style={styles.skillPositionLabelRow}>
            <Ionicons name="trophy-outline" size={16} color={colors.primary} />
            <Text style={styles.sectionTitle}>{t('profile.skillLevel')}</Text>
          </View>
          <SkillBadge level={user.skillLevel} centered />
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
              {t(POSITION_KEYS[user.position])}
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
          <Text style={styles.statValue}>{showStatsLoading ? '–' : played}</Text>
          <Text style={styles.statLabel}>{t('profile.played')}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{showStatsLoading ? '–' : created}</Text>
          <Text style={styles.statLabel}>{t('profile.created')}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{showStatsLoading ? '–' : upcoming}</Text>
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
      <Text style={styles.memberSinceText}>
        {t('profile.memberSince', { date: memberSinceText })}
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
  profileHeaderIcon: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: spacing.xs,
  },
  notifIconWrap: {
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.error,
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
  email: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
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
  skillPositionRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    overflow: 'visible',
  },
  skillPositionRowBelow: {
    marginTop: spacing.sm,
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
  skillPositionCol: {
    flex: 1,
    minWidth: 0,
  },
  skillPositionColSkill: {
    flex: 0.85,
    alignItems: 'flex-start',
    marginLeft: spacing.sm,
  },
  skillPositionColPosition: {
    flex: 1.15,
    minWidth: 0,
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
    backgroundColor: colors.card,
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
  memberSinceText: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
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
