import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Pressable,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { MatchesStackParamList } from '../navigation/types';
import type { TournamentSystem } from '../types';
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
import { useBottomInset } from '../hooks/useBottomInset';

type Props = NativeStackScreenProps<MatchesStackParamList, 'MatchDetail'>;
type TFunc = ReturnType<typeof useTranslation>['t'];

function tournamentSystemInfoBlocks(
  system: TournamentSystem,
): { section: string; body: string }[] {
  switch (system) {
    case 'single_elimination':
      return [
        { section: 'createMatch.tournamentSystemDetailSectionPrinciple', body: 'createMatch.tournamentSystemDetailSinglePrinciple' },
        { section: 'createMatch.tournamentSystemDetailSectionPros', body: 'createMatch.tournamentSystemDetailSinglePros' },
        { section: 'createMatch.tournamentSystemDetailSectionCons', body: 'createMatch.tournamentSystemDetailSingleCons' },
        { section: 'createMatch.tournamentSystemDetailSectionWhen', body: 'createMatch.tournamentSystemDetailSingleWhen' },
      ];
    case 'pools_finals':
      return [
        { section: 'createMatch.tournamentSystemDetailSectionPrinciple', body: 'createMatch.tournamentSystemDetailPoolsPrinciple' },
        { section: 'createMatch.tournamentSystemDetailSectionPros', body: 'createMatch.tournamentSystemDetailPoolsPros' },
        { section: 'createMatch.tournamentSystemDetailSectionCons', body: 'createMatch.tournamentSystemDetailPoolsCons' },
        { section: 'createMatch.tournamentSystemDetailSectionWhen', body: 'createMatch.tournamentSystemDetailPoolsWhen' },
      ];
    case 'round_robin':
      return [
        { section: 'createMatch.tournamentSystemDetailSectionPrinciple', body: 'createMatch.tournamentSystemDetailRRPrinciple' },
        { section: 'createMatch.tournamentSystemDetailSectionPros', body: 'createMatch.tournamentSystemDetailRRPros' },
        { section: 'createMatch.tournamentSystemDetailSectionCons', body: 'createMatch.tournamentSystemDetailRRCons' },
        { section: 'createMatch.tournamentSystemDetailSectionWhen', body: 'createMatch.tournamentSystemDetailRRWhen' },
      ];
    default:
      return [];
  }
}

function FormatLine({
  icon,
  label,
  value,
  extra,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  extra?: React.ReactNode;
}) {
  return (
    <View style={styles.formatLine}>
      {icon ?? null}
      <Text style={styles.formatLineLabel}>{label} :</Text>
      <Text style={styles.formatLineValue}>{value}</Text>
      {extra ?? null}
    </View>
  );
}

function FormatAccordion({
  match,
  tournament,
  volleyLabel,
  tournamentSystemLabel,
  tournamentSystem,
  t,
  inline,
}: {
  match: { teamCount?: number | null; teamSize?: number | null; tournamentPointsPerMatch?: number | null; tournamentCourtCount?: number | null; matchSets?: number | null; pointsToWin?: number | null };
  tournament: boolean;
  volleyLabel: string;
  tournamentSystemLabel: string | null;
  tournamentSystem?: TournamentSystem | null;
  t: TFunc;
  inline?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [infoModal, setInfoModal] = useState(false);

  return (
    <View style={inline ? styles.formatSectionInline : styles.formatSection}>
      <Pressable style={styles.formatHeader} onPress={() => setOpen(!open)}>
        <View style={styles.formatHeaderLeft}>
          <Ionicons name="options-outline" size={18} color={colors.primary} />
          <Text style={styles.formatHeaderTitle}>
            {tournament
              ? t('createMatch.tournamentFormatTitle')
              : t('createMatch.matchFormatTitle')}
          </Text>
        </View>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.textMuted}
        />
      </Pressable>

      {open ? (
        <View style={inline ? styles.formatBadgesWrapInline : styles.formatBadgesWrap}>
          <FormatLine
            icon={<MaterialCommunityIcons name="volleyball" size={15} color={colors.primary} />}
            label={t('match.factVolleyType')}
            value={volleyLabel}
          />
          {tournament ? (
            <>
              {tournamentSystemLabel ? (
                <FormatLine
                  icon={<Ionicons name="git-branch-outline" size={15} color={colors.primary} />}
                  label={t('match.factTournamentSystem')}
                  value={tournamentSystemLabel}
                  extra={tournamentSystem ? (
                    <Pressable
                      style={styles.formatInfoBtn}
                      onPress={() => setInfoModal(true)}
                      hitSlop={8}
                    >
                      <Text style={styles.formatInfoBtnText}>i</Text>
                    </Pressable>
                  ) : null}
                />
              ) : null}
              {match.teamCount != null ? (
                <FormatLine
                  icon={<Ionicons name="people-outline" size={15} color={colors.primary} />}
                  label={t('match.factTeams')}
                  value={String(match.teamCount)}
                />
              ) : null}
              {match.teamSize != null ? (
                <FormatLine
                  icon={<Ionicons name="person-outline" size={15} color={colors.primary} />}
                  label={t('match.factTeamSize')}
                  value={`${String(match.teamSize)}v${String(match.teamSize)}`}
                />
              ) : null}
              {match.tournamentPointsPerMatch != null ? (
                <FormatLine
                  icon={<Ionicons name="scan-outline" size={15} color={colors.primary} />}
                  label={t('match.factPointsPerMatch')}
                  value={`${String(match.tournamentPointsPerMatch)} pts`}
                />
              ) : null}
              {match.tournamentCourtCount != null && match.tournamentCourtCount > 0 ? (
                <FormatLine
                  icon={<Ionicons name="grid-outline" size={15} color={colors.primary} />}
                  label={t('match.factCourtCount')}
                  value={String(match.tournamentCourtCount)}
                />
              ) : null}
            </>
          ) : (
            <>
              {match.matchSets != null ? (
                <FormatLine
                  icon={<Ionicons name="layers-outline" size={15} color={colors.primary} />}
                  label={t('match.factSets')}
                  value={`${String(match.matchSets)} sets`}
                />
              ) : null}
              {match.pointsToWin != null ? (
                <FormatLine
                  icon={<Ionicons name="scan-outline" size={15} color={colors.primary} />}
                  label={t('match.factPointsToWin')}
                  value={`${String(match.pointsToWin)} pts`}
                />
              ) : null}
            </>
          )}
        </View>
      ) : null}

      {tournamentSystem && infoModal ? (
        <Modal visible animationType="slide" onRequestClose={() => setInfoModal(false)}>
          <View style={styles.systemInfoModalRoot}>
            <View style={styles.systemInfoModalHeader}>
              <Pressable onPress={() => setInfoModal(false)} hitSlop={10}>
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
              <Text style={styles.systemInfoModalTitle}>{tournamentSystemLabel}</Text>
              <View style={{ width: 24 }} />
            </View>
            <ScrollView contentContainerStyle={styles.systemInfoModalContent}>
              {tournamentSystemInfoBlocks(tournamentSystem).map((block, idx) => (
                <View key={idx} style={styles.systemInfoModalBlock}>
                  <Text style={styles.systemInfoModalSection}>{t(block.section as any)}</Text>
                  <Text style={styles.systemInfoModalBody}>{t(block.body as any)}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

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

  const bottomInset = useBottomInset();
  const courtsPulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!match || !isTournamentMatch(match)) return;
    const isLive =
      match.status !== 'completed' &&
      match.status !== 'cancelled' &&
      Date.now() >= new Date(match.scheduledAt).getTime();
    if (!isLive) {
      courtsPulse.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(courtsPulse, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(courtsPulse, {
          toValue: 0,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [match?.id, match?.status, match?.scheduledAt, courtsPulse]);

  const [nowTick, setNowTick] = useState(Date.now());
  useEffect(() => {
    if (!match) return;
    const sMs = new Date(match.scheduledAt).getTime();
    const isLiveNow =
      match.status !== 'completed' &&
      match.status !== 'cancelled' &&
      Date.now() >= sMs;
    if (!isLiveNow) return;
    const id = setInterval(() => setNowTick(Date.now()), 60_000);
    return () => clearInterval(id);
  }, [match?.id, match?.status, match?.scheduledAt]);

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
  const liveMinutes = Math.max(1, Math.floor((nowTick - startMs) / 60000));
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
      contentContainerStyle={[styles.content, { paddingBottom: bottomInset }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header: pill + status */}
      <View style={[styles.section, styles.sectionPrimary]}>
        <View style={styles.detailHeaderRow}>
          <View style={styles.detailPillRow}>
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
            <Text style={styles.detailPillDash}>—</Text>
            <View style={{ alignSelf: 'center' }}>
              <SkillBadge level={match.skillLevel} small />
            </View>
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

        {/* Venue */}
        <View style={[styles.detailInfoBlock, { marginTop: spacing.lg }]}>
          <View style={styles.detailInfoHeader}>
            <Ionicons name="pin-outline" size={16} color={colors.primary} />
            <Text style={styles.detailInfoTitle}>{t('match.venueLabel')}</Text>
          </View>
          <View style={styles.venueContentRow}>
            <View style={styles.detailInfoIndent}>
              <Text style={styles.detailInfoSub}>
                <Text style={styles.detailInfoSubLabel}>{t('match.cityLabel')} : </Text>
                {isPinCourt ? pinVenueTitle : venueLine}
              </Text>
              {isPinCourt ? (
                <>
                  {pinStreetLine ? (
                    <Text style={styles.detailInfoSub}>
                      <Text style={styles.detailInfoSubLabel}>{t('createMatch.pinnedStreetLine')} : </Text>
                      {pinStreetLine}
                    </Text>
                  ) : null}
                  {pinDepartmentLine ? (
                    <Text style={styles.detailInfoSub}>
                      <Text style={styles.detailInfoSubLabel}>{t('createMatch.pinnedDepartment')} : </Text>
                      {pinDepartmentLine}
                    </Text>
                  ) : null}
                  {pinCountryLine ? (
                    <Text style={styles.detailInfoSub}>
                      <Text style={styles.detailInfoSubLabel}>{t('createMatch.pinnedCountry')} : </Text>
                      {pinCountryLine}
                    </Text>
                  ) : null}
                  {pinCoordsStr ? (
                    <Text style={styles.detailInfoSub}>
                      <Text style={styles.detailInfoSubLabel}>{t('match.pinCoordsCaption')} : </Text>
                      {pinCoordsStr}
                    </Text>
                  ) : null}
                </>
              ) : match.court.address?.includes(',') ? (
                <Text style={styles.detailInfoSub} numberOfLines={1}>
                  {match.court.address}
                </Text>
              ) : null}
            </View>
            <Pressable
              style={styles.venueEyeBtn}
              onPress={handleOpenPinOnMap}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={t('match.openPinOnMap')}
            >
              <Ionicons name="eye-outline" size={20} color={colors.white} />
            </Pressable>
          </View>
        </View>

        {/* Date + Organizer */}
        <View style={styles.dateOrganizerGroup}>
          <View style={styles.detailInfoInlineRow}>
            <Ionicons name="calendar-outline" size={16} color={colors.primary} />
            <Text style={styles.detailInfoTitleMuted}>{t('match.dateTimeLabel')} :</Text>
            <Text style={styles.detailInfoInlineValue}>{dateStr} · {timeStr}</Text>
          </View>
          <Pressable
            style={styles.detailInfoInlineRow}
            onPress={match.creatorId !== user?.id ? () => navigateToProfile(match.creatorId) : undefined}
          >
            <Ionicons name="person-outline" size={16} color={colors.primary} />
            <Text style={styles.detailInfoTitleMuted}>{t('match.organizedBy')} :</Text>
            <Text
              style={[
                styles.detailInfoInlineValue,
                match.creatorId !== user?.id && styles.detailLink,
              ]}
              numberOfLines={1}
            >
              {match.creator.username}
            </Text>
          </Pressable>
        </View>

        {/* Description */}
        {userDescriptionText ? (
          <View style={styles.descriptionBlock}>
            <Text style={styles.descriptionInlineBody}>{userDescriptionText}</Text>
          </View>
        ) : null}

        {/* Player count — bottom of section */}
        <View style={styles.playerBarBottom}>
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

        {/* Format — inline */}
        <FormatAccordion match={match} tournament={tournament} volleyLabel={volleyLabel} tournamentSystemLabel={tournamentSystemLabel} tournamentSystem={match.tournamentSystem} t={t} inline />

        {/* Action buttons */}
        <View style={styles.tournamentActionsRow}>
          <TouchableOpacity
            style={styles.tournamentActionBtn}
            onPress={() => navigation.navigate('MatchTeamsBoard', { matchId })}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="account-group-outline" size={22} color={colors.primary} />
            <Text style={styles.tournamentActionBtnText}>
              {t('match.teamsButton')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tournamentActionBtn}
            onPress={() => navigation.navigate('EventScore', { matchId })}
            activeOpacity={0.8}
          >
            <Ionicons name="trophy-outline" size={20} color={colors.primary} />
            <Text style={styles.tournamentActionBtnText}>
              {t('match.scoreButton')}
            </Text>
          </TouchableOpacity>

          {tournament ? (
            <TouchableOpacity
              onPress={() => navigation.navigate('TournamentCourts', { matchId })}
              activeOpacity={0.8}
              style={{ flex: 1 }}
            >
              <Animated.View
                style={[
                  styles.tournamentActionBtn,
                  timingBadge === 'live' && {
                    borderColor: courtsPulse.interpolate({
                      inputRange: [0, 1],
                      outputRange: [colors.primary + '44', colors.primary],
                    }),
                  },
                ]}
              >
                <Ionicons name="grid-outline" size={20} color={colors.primary} />
                <Text style={styles.tournamentActionBtnText}>
                  {t('match.viewTournamentCourts')}
                </Text>
              </Animated.View>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

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
  content: {},
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
    gap: spacing.md,
  },
  tournamentActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  tournamentActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary,
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
  detailPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  detailPillDash: {
    fontSize: 12,
    color: colors.textMuted,
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
  detailInfoBlock: {
    gap: 4,
  },
  detailInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailInfoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  detailInfoTitleMuted: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
  },
  detailInfoIndent: {
    flex: 1,
    marginLeft: 22,
    gap: 3,
  },
  detailInfoSub: {
    ...typography.bodySmall,
    fontSize: 14,
    color: colors.text,
  },
  detailInfoSubLabel: {
    color: colors.textMuted,
    fontWeight: '600',
  },
  dateOrganizerGroup: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  detailInfoInlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailInfoInlineValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    flexShrink: 1,
  },
  venueContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  venueEyeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  infoLines: {
    gap: spacing.md,
  },
  infoLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  infoLineDateText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  infoLineText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  venueCard: {
    marginTop: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignSelf: 'stretch',
    width: '100%',
  },
  venueCardPressable: {
    marginTop: spacing.sm,
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
    color: colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  playerBarBottom: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  descriptionBlock: {
    paddingTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  formatSection: {
    marginTop: spacing.md,
    marginHorizontal: spacing.xs,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    overflow: 'hidden',
  },
  formatSectionInline: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  formatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  formatHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  formatHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  formatBadgesWrap: {
    gap: 2,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  formatBadgesWrapInline: {
    gap: 2,
    marginLeft: spacing.md,
    paddingBottom: spacing.xs,
  },
  formatLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  formatLineLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  formatLineValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  formatInfoBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  formatInfoBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  systemInfoModalRoot: {
    flex: 1,
    backgroundColor: colors.background,
  },
  systemInfoModalHeader: {
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
  systemInfoModalTitle: {
    ...typography.h3,
    fontSize: 16,
    textAlign: 'center',
    flex: 1,
  },
  systemInfoModalContent: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  systemInfoModalBlock: {
    gap: spacing.sm,
  },
  systemInfoModalSection: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  systemInfoModalBody: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  descriptionInlineBody: {
    ...typography.body,
    flex: 1,
    color: colors.text,
    lineHeight: 22,
  },
  detailLink: {
    color: colors.primary,
    fontWeight: '700',
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
  actionContainer: {
    padding: spacing.md,
    marginTop: spacing.sm,
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
