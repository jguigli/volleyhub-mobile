import React, { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Pressable,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { MatchesStackParamList } from '../navigation/types';
import { useMatch, useJoinMatch, useLeaveMatch } from '../hooks/useMatches';
import { useUnreadMatchChat } from '../hooks/useUnreadMatchChat';
import { useAuthStore } from '../store/auth.store';
import { PlayerCountBadge } from '../components/PlayerCountBadge';
import { SkillBadge } from '../components/SkillBadge';
import { localeToBcp47, useTranslation } from '../i18n';
import {
  formatMatchCoords,
  isTournamentMatch,
  matchDetailVenuePlaceFromCourt,
  parsePinAddressForDetails,
  tournamentSystemTitle,
  userWrittenDescription,
} from '../utils/matchDisplay';
import { navigateToMapAtCoordinate } from '../navigation/navigateToMapCoordinate';
import { navigateToUserProfile } from '../navigation/navigateToUserProfile';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import { colors, spacing, borderRadius, typography, shadows } from '../theme';

type Props = NativeStackScreenProps<MatchesStackParamList, 'MatchDetail'>;

export function MatchDetailScreen({ route, navigation }: Props) {
  const { t, locale } = useTranslation();
  const localeTag = localeToBcp47(locale);
  const { matchId } = route.params;
  const currentUser = useAuthStore((s) => s.user);

  const navigateToProfile = (userId: string) => {
    navigateToUserProfile(navigation, userId, currentUser?.id);
  };
  const user = useAuthStore((s) => s.user);
  const { data: match, isLoading, error } = useMatch(matchId);
  const unreadChat = useUnreadMatchChat(matchId, user?.id);

  useFocusEffect(
    useCallback(() => {
      void unreadChat.refresh();
    }, [unreadChat.refresh]),
  );

  const joinMutation = useJoinMatch();
  const leaveMutation = useLeaveMatch();

  const handleLeave = useCallback(() => {
    Alert.alert(t('match.leaveTitle'), t('match.leaveMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('match.leave'),
        style: 'destructive',
        onPress: async () => {
          try {
            await leaveMutation.mutateAsync(matchId);
          } catch (err: unknown) {
            const msg =
              err instanceof Error ? err.message : t('match.leaveFailed');
            Alert.alert(t('common.error'), msg);
          }
        },
      },
    ]);
  }, [leaveMutation, matchId, t]);

  const handleOpenPinOnMap = useCallback(() => {
    if (!match) {
      return;
    }
    const pinCourt =
      match.court.isRegistry === false ||
      match.court.name === 'Map pin location';
    if (!pinCourt) {
      return;
    }
    const lat = Number(match.court.lat);
    const lng = Number(match.court.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return;
    }
    navigateToMapAtCoordinate(navigation as NavigationProp<ParamListBase>, lat, lng);
  }, [match, navigation]);

  useLayoutEffect(() => {
    if (isLoading || error) {
      navigation.setOptions({ headerRight: undefined });
      return;
    }
    if (!match) {
      navigation.setOptions({ headerRight: undefined });
      return;
    }
    const showSettings = user?.id === match.creatorId;
    const participant =
      user &&
      (match.creatorId === user.id ||
        match.participants.some((p) => p.userId === user.id));
    const showChat = Boolean(participant);
    const detailsTitle = isTournamentMatch(match)
      ? t('nav.tournamentDetails')
      : t('nav.matchDetails');
    navigation.setOptions({
      title: detailsTitle,
      headerRight:
        showChat || showSettings
          ? () => (
              <View style={styles.headerActions}>
                {showSettings ? (
                  <Pressable
                    onPress={() =>
                      navigation.navigate('MatchSettings', { matchId: match.id })
                    }
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={styles.headerSettingsBtn}
                    accessibilityRole="button"
                    accessibilityLabel={t('nav.matchSettings')}
                  >
                    <Ionicons name="settings-outline" size={24} color={colors.primary} />
                  </Pressable>
                ) : null}
                {showChat ? (
                  <Pressable
                    onPress={() =>
                      navigation.navigate('MatchChat', { matchId: match.id })
                    }
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={styles.headerChatBtn}
                    accessibilityRole="button"
                    accessibilityLabel={t('nav.matchGroupChat')}
                  >
                    <View style={styles.chatIconWrap}>
                      <Ionicons
                        name="chatbubble-ellipses-outline"
                        size={24}
                        color={colors.primary}
                      />
                      {unreadChat.hasUnread ? <View style={styles.chatUnreadDot} /> : null}
                    </View>
                  </Pressable>
                ) : null}
              </View>
            )
          : undefined,
    });
  }, [error, isLoading, match, navigation, t, unreadChat.hasUnread, user?.id]);

  const livePulse = useRef(new Animated.Value(1)).current;
  const timingBadgeForPulse: 'upcoming' | 'live' | 'past' = match
    ? match.status === 'completed' || match.status === 'cancelled'
      ? 'past'
      : Date.now() >= new Date(match.scheduledAt).getTime()
        ? 'live'
        : 'upcoming'
    : 'upcoming';

  useEffect(() => {
    if (timingBadgeForPulse !== 'live') {
      livePulse.stopAnimation();
      livePulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(livePulse, {
          toValue: 0.42,
          duration: 560,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(livePulse, {
          toValue: 1,
          duration: 560,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
      livePulse.setValue(1);
    };
  }, [livePulse, timingBadgeForPulse]);

  const courtsPulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!match || !isTournamentMatch(match)) return;
    const isLive =
      match.status !== 'completed' &&
      match.status !== 'cancelled' &&
      Date.now() >= new Date(match.scheduledAt).getTime();
    if (!isLive) return;

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(courtsPulse, {
          toValue: 0.3,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(courtsPulse, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [match?.id, match?.status, match?.scheduledAt, courtsPulse]);

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

  const isParticipant = user
    ? match.participants.some((p) => p.userId === user.id)
    : false;
  const isCreator = user?.id === match.creatorId;
  const isFull = match.status === 'full' || match.currentPlayers >= match.maxPlayers;
  const isJoinClosed = match.status === 'completed' || match.status === 'cancelled';
  const tournament = isTournamentMatch(match);
  const isPinCourt =
    match.court.isRegistry === false ||
    match.court.name === 'Map pin location';

  const scheduledDate = new Date(match.scheduledAt);
  const nowMs = Date.now();
  const startMs = scheduledDate.getTime();
  const timingBadge: 'upcoming' | 'live' | 'past' =
    match.status === 'completed' || match.status === 'cancelled'
      ? 'past'
      : nowMs >= startMs
        ? 'live'
        : 'upcoming';
  const liveMinutes = Math.max(1, Math.floor((nowMs - startMs) / 60000));
  const dateStr = scheduledDate.toLocaleDateString(localeTag, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const timeStr = scheduledDate.toLocaleTimeString(localeTag, {
    hour: '2-digit',
    minute: '2-digit',
  });

  const userDescriptionText = userWrittenDescription(match.description);
  const venueLine = matchDetailVenuePlaceFromCourt(match.court);
  const pinAddressParts = isPinCourt
    ? parsePinAddressForDetails(match.court.address)
    : null;
  const pinCityForTitle =
    pinAddressParts?.city?.trim() ||
    match.court.address?.split(',')[0]?.trim() ||
    '';
  const pinCoordsStr = formatMatchCoords(
    match.court.lat,
    match.court.lng,
    5,
  );
  const pinCountryLine = pinAddressParts?.country || null;
  const pinDepartmentLine = pinAddressParts?.department || null;
  const pinStreetLine = pinAddressParts?.streetLine || null;
  const pinVenueTitle = isPinCourt
    ? pinCityForTitle || pinCoordsStr || '—'
    : venueLine;

  const volleyLabel =
    match.volleyType === 'beach'
      ? t('createMatch.beachVolley')
      : match.volleyType === 'green'
        ? t('createMatch.greenVolley')
        : t('createMatch.classicVolley');

  const tournamentSystemLabel = tournamentSystemTitle(t, match.tournamentSystem);

  const handleJoin = async () => {
    if (!user) {
      Alert.alert('Sign in required', 'Please sign in to join matches');
      return;
    }
    try {
      await joinMutation.mutateAsync(matchId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to join match';
      Alert.alert('Error', msg);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Type + quand + organisateur + lieu */}
      <View style={[styles.section, styles.sectionPrimary]}>
        <View style={styles.detailHeaderRow}>
          <View
            style={[
              styles.eventPill,
              tournament ? styles.eventPillTournament : styles.eventPillMatch,
            ]}
          >
            <Text
              style={[
                styles.eventPillText,
                tournament
                  ? styles.eventPillTextTournament
                  : styles.eventPillTextMatch,
              ]}
            >
              {tournament
                ? t('match.eventTournament')
                : t('match.eventMatch')}
            </Text>
          </View>
          <View style={styles.headerStatusRail}>
            <Animated.View
              style={[
                styles.headerStatusIconWrap,
                timingBadge === 'upcoming'
                  ? styles.headerStatusIconWrapUpcoming
                  : timingBadge === 'live'
                    ? styles.headerStatusIconWrapLive
                    : styles.headerStatusIconWrapPast,
                timingBadge === 'live' ? { opacity: livePulse } : null,
              ]}
            >
              <Ionicons
                name={
                  timingBadge === 'upcoming'
                    ? 'time-outline'
                    : timingBadge === 'live'
                      ? 'play-circle-outline'
                      : 'checkmark-circle-outline'
                }
                size={13}
                color={
                  timingBadge === 'upcoming'
                    ? colors.primary
                    : timingBadge === 'live'
                      ? colors.success
                      : colors.textMuted
                }
              />
            </Animated.View>
            <View style={styles.headerStatusTextWrap}>
              <Text style={styles.headerStatusTitle} numberOfLines={1}>
                {timingBadge === 'upcoming'
                  ? t('match.statusUpcoming')
                  : timingBadge === 'live'
                    ? t('match.statusLive')
                    : t('match.statusPast')}
              </Text>
              {timingBadge === 'live' ? (
                <Text style={styles.headerStatusSubtitle}>{`${liveMinutes} min`}</Text>
              ) : null}
            </View>
          </View>
        </View>

        {isPinCourt ? (
          <Pressable
            style={styles.venueCardPressable}
            onPress={handleOpenPinOnMap}
            accessibilityRole="button"
            accessibilityLabel={t('match.openPinOnMap')}
          >
            <View style={styles.venueBlock}>
              <View style={styles.venueIconWrap}>
                <Ionicons name="pin-outline" size={22} color={colors.primary} />
              </View>
              <View style={styles.venueTextWrap}>
                <Text style={styles.venueName}>{pinVenueTitle}</Text>
                {pinStreetLine ? (
                  <Text style={styles.venueCoordsPin}>
                    <Text style={styles.mapPinDetailLabel}>
                      {t('createMatch.pinnedStreetLine')} :{' '}
                    </Text>
                    <Text style={styles.pinCoordsValue}>{pinStreetLine}</Text>
                  </Text>
                ) : null}
                {pinDepartmentLine ? (
                  <Text style={styles.venueCoordsPin}>
                    <Text style={styles.mapPinDetailLabel}>
                      {t('createMatch.pinnedDepartment')} :{' '}
                    </Text>
                    <Text style={styles.pinCoordsValue}>{pinDepartmentLine}</Text>
                  </Text>
                ) : null}
                {pinCountryLine ? (
                  <Text style={styles.venueCoordsPin}>
                    <Text style={styles.mapPinDetailLabel}>
                      {t('createMatch.pinnedCountry')} :{' '}
                    </Text>
                    <Text style={styles.pinCoordsValue}>{pinCountryLine}</Text>
                  </Text>
                ) : null}
                {pinCityForTitle && pinCoordsStr ? (
                  <Text style={styles.venueCoordsPin}>
                    <Text style={styles.mapPinDetailLabel}>
                      {t('match.pinCoordsCaption')} ·{' '}
                    </Text>
                    <Text style={styles.pinCoordsValue}>{pinCoordsStr}</Text>
                  </Text>
                ) : null}
              </View>
            </View>
          </Pressable>
        ) : (
          <View style={styles.venueCard}>
            <View style={styles.venueBlock}>
              <View style={styles.venueIconWrap}>
                {match.court.type === 'indoor' ? (
                  <Ionicons name="business" size={22} color={colors.textSecondary} />
                ) : (
                  <Ionicons name="sunny" size={22} color={colors.warning} />
                )}
              </View>
              <View style={styles.venueTextWrap}>
                <Text style={styles.venueName}>{venueLine}</Text>
                {match.court.address?.includes(',') ? (
                  <Text style={styles.venueAddress}>{match.court.address}</Text>
                ) : null}
              </View>
            </View>
          </View>
        )}

        <View style={styles.playerBarBelowVenue}>
          <PlayerCountBadge
            matchId={matchId}
            currentPlayers={match.currentPlayers}
            maxPlayers={match.maxPlayers}
            large
            onPress={() =>
              navigation.navigate('MatchParticipants', { matchId })
            }
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={18} color={colors.primary} />
          <Text style={styles.detailText}>{dateStr}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="time-outline" size={18} color={colors.primary} />
          <Text style={styles.detailText}>{timeStr}</Text>
        </View>
        <View style={[styles.detailRow, styles.skillDetailRow]}>
          <Ionicons
            name="flash-outline"
            size={18}
            color={colors.primary}
          />
          <SkillBadge level={match.skillLevel} small />
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="person-outline" size={18} color={colors.primary} />
          <View style={styles.organizerRow}>
            <Text style={styles.detailText}>{t('match.organizedBy')} </Text>
            {match.creatorId !== user?.id ? (
              <Pressable
                onPress={() => navigateToProfile(match.creatorId)}
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
              >
                <Text style={[styles.detailBold, styles.detailLink]}>
                  {match.creator.username}
                </Text>
              </Pressable>
            ) : (
              <Text style={styles.detailBold}>{match.creator.username}</Text>
            )}
          </View>
        </View>

        <View style={[styles.detailRow, styles.detailRowTopAligned]}>
          <Ionicons
            name="information-circle-outline"
            size={18}
            color={colors.primary}
            style={styles.descriptionIconTop}
          />
          <Text
            style={
              userDescriptionText
                ? styles.descriptionInlineBody
                : styles.descriptionInlineEmpty
            }
          >
            {userDescriptionText || t('match.noDescription')}
          </Text>
        </View>
      </View>

      {/* Format match / tournoi */}
      <View style={styles.descriptionSection}>
        <View style={styles.descriptionCardHeader}>
          <View style={styles.descriptionIconCircle}>
            <Ionicons name="people" size={22} color={colors.primary} />
          </View>
          <Text style={styles.descriptionCardTitle}>
            {tournament
              ? t('createMatch.tournamentFormatTitle')
              : t('createMatch.matchFormatTitle')}
          </Text>
        </View>

        <View style={styles.formatFactsColumn}>
          <View style={styles.formatFactStackRow}>
            <Text style={styles.formatFactLabel}>{t('match.factVolleyType')}</Text>
            <Text style={styles.formatFactValuePlain}>{volleyLabel}</Text>
          </View>
          {tournament ? (
            <>
              {tournamentSystemLabel ? (
                <View style={styles.formatFactStackRow}>
                  <Text style={styles.formatFactLabel}>
                    {t('match.factTournamentSystem')}
                  </Text>
                  <Text style={styles.formatFactValuePlain}>{tournamentSystemLabel}</Text>
                </View>
              ) : null}
              {match.teamCount != null ? (
                <View style={styles.formatFactStackRow}>
                  <Text style={styles.formatFactLabel}>{t('match.factTeams')}</Text>
                  <Text style={styles.formatFactValuePlain}>{String(match.teamCount)}</Text>
                </View>
              ) : null}
              {match.teamSize != null ? (
                <View style={styles.formatFactStackRow}>
                  <Text style={styles.formatFactLabel}>{t('match.factTeamSize')}</Text>
                  <Text style={styles.formatFactValuePlain}>{String(match.teamSize)}</Text>
                </View>
              ) : null}
              {match.tournamentPointsPerMatch != null ? (
                <View style={styles.formatFactStackRow}>
                  <Text style={styles.formatFactLabel}>
                    {t('match.factPointsPerMatch')}
                  </Text>
                  <Text style={styles.formatFactValuePlain}>
                    {String(match.tournamentPointsPerMatch)}
                  </Text>
                </View>
              ) : null}
              {match.tournamentCourtCount != null && match.tournamentCourtCount > 0 ? (
                <View style={styles.formatFactStackRow}>
                  <Text style={styles.formatFactLabel}>
                    {t('match.factCourtCount')}
                  </Text>
                  <Text style={styles.formatFactValuePlain}>
                    {String(match.tournamentCourtCount)}
                  </Text>
                </View>
              ) : null}
            </>
          ) : (
            <>
              {match.matchSets != null ? (
                <View style={styles.formatFactStackRow}>
                  <Text style={styles.formatFactLabel}>{t('match.factSets')}</Text>
                  <Text style={styles.formatFactValuePlain}>{String(match.matchSets)}</Text>
                </View>
              ) : null}
              {match.pointsToWin != null ? (
                <View style={styles.formatFactStackRow}>
                  <Text style={styles.formatFactLabel}>
                    {t('match.factPointsToWin')}
                  </Text>
                  <Text style={styles.formatFactValuePlain}>
                    {String(match.pointsToWin)}
                  </Text>
                </View>
              ) : null}
            </>
          )}
        </View>
      </View>

      {tournament && (timingBadge === 'live' || isCreator) ? (
        <View style={styles.tournamentActionsRow}>
          <TouchableOpacity
            style={styles.tournamentActionBtn}
            onPress={() => navigation.navigate('TournamentCourts', { matchId })}
            activeOpacity={0.8}
          >
            <Animated.View style={{ opacity: timingBadge === 'live' ? courtsPulse : 1 }}>
              <Ionicons name="grid-outline" size={20} color={colors.primary} />
            </Animated.View>
            <Text style={styles.tournamentActionBtnText}>
              {t('match.viewTournamentCourts')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.tournamentActionBtn}
            onPress={() => navigation.navigate('EventScore', { matchId })}
            activeOpacity={0.8}
          >
            <Ionicons name="trophy-outline" size={20} color={colors.primary} />
            <Text style={styles.tournamentActionBtnText}>
              {t('match.viewScoreDetail')}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {tournament && timingBadge === 'past' && !isCreator ? (
        <View style={styles.tournamentActionsRow}>
          <TouchableOpacity
            style={styles.tournamentActionBtn}
            onPress={() => navigation.navigate('EventScore', { matchId })}
            activeOpacity={0.8}
          >
            <Ionicons name="trophy-outline" size={20} color={colors.primary} />
            <Text style={styles.tournamentActionBtnText}>
              {t('match.viewScoreDetail')}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {user && !isCreator && !isJoinClosed && !isParticipant ? (
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[
              styles.joinButton,
              (isFull || joinMutation.isPending) && styles.buttonDisabled,
            ]}
            onPress={handleJoin}
            disabled={isFull || joinMutation.isPending}
            activeOpacity={0.8}
          >
            <Text style={styles.joinButtonText}>
              {isFull
                ? t('match.matchFull')
                : joinMutation.isPending
                  ? t('match.joining')
                  : t('match.joinMatch')}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {user && isParticipant && !isJoinClosed && !isFull ? (
        <View style={styles.actionContainerCompact}>
          <TouchableOpacity
            style={styles.inviteButton}
            onPress={() => navigation.navigate('InvitePlayer', { matchId })}
            activeOpacity={0.8}
          >
            <Text style={styles.inviteButtonText}>{t('match.invitePlayer')}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {user && isParticipant && !isCreator && !isJoinClosed ? (
        <View
          style={[
            styles.actionContainer,
            user && isParticipant && !isJoinClosed && !isFull
              ? styles.actionContainerTightTop
              : null,
          ]}
        >
          <TouchableOpacity
            style={[
              styles.leaveButton,
              leaveMutation.isPending && styles.buttonDisabled,
            ]}
            onPress={handleLeave}
            disabled={leaveMutation.isPending}
            activeOpacity={0.8}
          >
            <Text style={styles.leaveButtonText}>{t('match.leaveEvent')}</Text>
          </TouchableOpacity>
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
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    ...typography.body,
    color: colors.error,
  },
  section: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
    marginBottom: 0,
    marginLeft: spacing.xs,
    marginRight: spacing.xs,
    // marginBottom déjà défini plus haut
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
    ...shadows.card,
  },
  sectionPrimary: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  tournamentActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    marginHorizontal: spacing.xs,
  },
  tournamentActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary + '44',
  },
  tournamentActionBtnText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
  },
  detailHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  eventPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  eventPillMatch: {
    backgroundColor: colors.matchBadge + '22',
    borderColor: colors.matchBadge + '55',
  },
  eventPillTournament: {
    backgroundColor: colors.matchTournament + '22',
    borderColor: colors.matchTournament + '55',
  },
  eventPillText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  eventPillTextMatch: {
    color: colors.matchBadge,
  },
  eventPillTextTournament: {
    color: colors.matchTournament,
  },
  venueBlock: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  playerBarBelowVenue: {
    alignSelf: 'stretch',
    marginTop: spacing.xs,
  },
  venueCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignSelf: 'stretch',
    width: '100%',
  },
  venueCardPressable: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignSelf: 'stretch',
    width: '100%',
  },
  pinDetailBlock: {
    marginTop: spacing.sm,
    gap: 4,
  },
  mapPinDetailLine: {
    ...typography.bodySmall,
    color: colors.text,
    fontSize: 13,
  },
  mapPinDetailLabel: {
    color: colors.textMuted,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerScoresBtn: {
    marginRight: spacing.sm,
    padding: spacing.xs,
  },
  headerChatBtn: {
    marginRight: spacing.sm,
    padding: spacing.xs,
  },
  headerSettingsBtn: {
    marginRight: spacing.sm,
    padding: spacing.xs,
  },
  chatIconWrap: {
    position: 'relative',
  },
  chatUnreadDot: {
    position: 'absolute',
    top: -1,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.error,
  },
  venueCoordsPin: {
    ...typography.bodySmall,
    marginTop: 6,
    fontSize: 13,
  },
  pinCoordsValue: {
    color: colors.text,
    fontSize: 13,
  },
  venueIconWrap: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  venueTextWrap: {
    flex: 1,
  },
  venueName: {
    ...typography.h3,
    fontSize: 17,
  },
  venueAddress: {
    ...typography.bodySmall,
    marginTop: 4,
    color: colors.textSecondary,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  descriptionInlineBody: {
    ...typography.body,
    flex: 1,
    color: colors.text,
    lineHeight: 22,
  },
  descriptionInlineEmpty: {
    ...typography.body,
    flex: 1,
    color: colors.textMuted,
    fontStyle: 'italic',
    lineHeight: 22,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  skillDetailRow: {
    marginTop: spacing.xs,
  },
  detailRowTopAligned: {
    alignItems: 'flex-start',
  },
  descriptionIconTop: {
    marginTop: 2,
  },
  organizerRow: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  detailText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  detailBold: {
    color: colors.text,
    fontWeight: '600',
  },
  detailLink: {
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  headerStatusRail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '55%',
  },
  headerStatusIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  headerStatusIconWrapUpcoming: {
    backgroundColor: colors.primary + '1A',
    borderColor: colors.primary + '55',
  },
  headerStatusIconWrapLive: {
    backgroundColor: colors.success + '1A',
    borderColor: colors.success + '55',
  },
  headerStatusIconWrapPast: {
    backgroundColor: colors.textMuted + '1A',
    borderColor: colors.textMuted + '55',
  },
  headerStatusTextWrap: {
    minWidth: 0,
    flexShrink: 1,
  },
  headerStatusTitle: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  headerStatusSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    lineHeight: 14,
  },
  descriptionSection: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
    marginBottom: 0,
    marginLeft: spacing.xs,
    marginRight: spacing.xs,
    // marginBottom déjà défini plus haut
    borderWidth: 1,
    borderColor: colors.primary + '33',
    gap: spacing.md,
    ...shadows.card,
  },
  descriptionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    alignSelf: 'stretch',
  },
  descriptionIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '18',
    justifyContent: 'center',
    alignItems: 'center',
  },
  descriptionCardTitle: {
    ...typography.h3,
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
    flexShrink: 1,
  },
  formatFactsColumn: {
    gap: spacing.md,
    paddingTop: spacing.xs,
  },
  formatFactStackRow: {
    gap: 4,
    alignItems: 'flex-start',
  },
  formatFactLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.45,
  },
  formatFactValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  formatSectionDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  formatFactValuePlain: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
  },
  formatChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  formatChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary + '14',
    borderWidth: 1,
    borderColor: colors.primary + '2A',
    borderRadius: borderRadius.full,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  formatChipText: {
    ...typography.bodySmall,
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  actionContainer: {
    padding: spacing.md,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  actionContainerTightTop: {
    marginTop: 2,
  },
  actionContainerCompact: {
    padding: spacing.md,
    marginTop: spacing.xs,
    paddingBottom: 0,
  },
  joinButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  joinButtonText: {
    ...typography.button,
    color: colors.white,
    fontSize: 16,
  },
  leaveButton: {
    backgroundColor: 'transparent',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.error,
  },
  inviteButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  inviteButtonText: {
    ...typography.button,
    color: colors.white,
    fontSize: 16,
  },
  leaveButtonText: {
    ...typography.button,
    color: colors.error,
    fontSize: 16,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
