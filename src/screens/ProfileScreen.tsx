import React, { useCallback, useLayoutEffect, useState } from 'react';
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ProfileStackParamList } from '../navigation/types';
import { useAuthStore } from '../store/auth.store';
import { useUserMatchStats } from '../hooks/useMatches';
import { usePublicProfile } from '../hooks/useUsers';
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
  const { data: profile, refetch: refetchProfile, isFetching: profileFetching } = usePublicProfile(user?.id ?? '');
  const { data: matchStats, isLoading: statsLoading, refetch: refetchStats, isFetching: statsFetching } = useUserMatchStats(
    user?.id ?? '',
    statsFormat,
  );

  useFocusEffect(
    useCallback(() => {
      refetchProfile();
    }, [refetchProfile]),
  );

  useLayoutEffect(() => {
    navigation.setOptions({
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
  }, [navigation, t]);

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
      ? (profile.followersCount ?? 0)
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
      refreshControl={<RefreshControl refreshing={profileFetching || statsFetching} onRefresh={() => { refetchProfile(); refetchStats(); }} />}
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

      <View style={styles.sectionHeader}>
        <Ionicons name="calendar-outline" size={16} color={colors.primary} />
        <Text style={styles.sectionTitle}>{t('profile.parties')}</Text>
      </View>

      {/* Bloc Match / Tournoi */}
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
          {/* Ligne 1 : Joués, Créés, À venir */}
          <View style={styles.statsGridRow}>
            <View style={styles.statsGridCell}>
              <Text style={styles.statsGridValue}>{showStatsLoading ? '–' : played}</Text>
              <Text style={styles.statsGridLabel}>{t('profile.played')}</Text>
            </View>
            <View style={styles.statsGridCell}>
              <Text style={styles.statsGridValue}>{showStatsLoading ? '–' : created}</Text>
              <Text style={styles.statsGridLabel}>{t('profile.created')}</Text>
            </View>
            <View style={styles.statsGridCell}>
              <Text style={styles.statsGridValue}>{showStatsLoading ? '–' : upcoming}</Text>
              <Text style={styles.statsGridLabel}>{t('profile.upcoming')}</Text>
            </View>
          </View>

          <View style={styles.statsGridDivider} />

          {/* Ligne 2 : Victoires, Défaites */}
          <View style={styles.statsGridRow}>
            <View style={styles.statsGridCell}>
              <Text style={styles.statsGridValue}>{showStatsLoading ? '–' : wins}</Text>
              <Text style={styles.statsGridLabel}>{t('profile.wins')}</Text>
            </View>
            <View style={styles.statsGridCell}>
              <Text style={styles.statsGridValue}>{showStatsLoading ? '–' : losses}</Text>
              <Text style={styles.statsGridLabel}>{t('profile.losses')}</Text>
            </View>
          </View>

          {/* Ligne 3 : Ratio, Série */}
          <View style={styles.statsGridRow}>
            <View style={styles.statsGridCell}>
              <Text style={styles.statsGridValue}>{showStatsLoading ? '–' : `${winRate}%`}</Text>
              <Text style={styles.statsGridLabel}>{t('profile.winRate')}</Text>
            </View>
            <View style={styles.statsGridCell}>
              <Text style={styles.statsGridValue}>{showStatsLoading ? '–' : streak}</Text>
              <Text style={styles.statsGridLabel}>{t('profile.currentStreak')}</Text>
            </View>
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
  tabBlockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
  tabBlockHeaderTintedTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  tabBlockHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  tabBlockHeaderActive: {
    color: colors.primary,
  },
  tabBlockHeaderInactive: {
    color: colors.textMuted,
  },
  tabBlockHeaderSep: {
    fontSize: 14,
    color: colors.textMuted,
  },
  tabBlockContent: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  tabBlockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  tabBlockLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabBlockValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    flexShrink: 1,
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
  memberSinceText: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
});
