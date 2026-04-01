import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { localeToBcp47, useTranslation } from '../i18n';
import { matchCardVenuePlace, isTournamentMatch } from '../utils/matchDisplay';
import { useAuthStore } from '../store/auth.store';
import { PlayerCountBadge } from './PlayerCountBadge';
import { SkillBadge } from './SkillBadge';
import { colors, spacing, borderRadius, shadows, typography } from '../theme';
import type { NearbyMatch } from '../types';

interface Props {
  match: NearbyMatch;
  onPress: (match: NearbyMatch) => void;
  onCreatorPress?: (userId: string) => void;
  /** Icône équipes → tableau d’équipes */
  onTeamsPress?: (match: NearbyMatch) => void;
  /** Icône score → scores */
  onScorePress?: (match: NearbyMatch) => void;
  /** Icône terrains (tournoi uniquement) */
  onCourtsPress?: (match: NearbyMatch) => void;
  /** Masque la ligne créateur (icône + nom), ex. quand l’utilisateur est déjà l’organisateur */
  hideCreatorRow?: boolean;
}

export function MatchCard({
  match,
  onPress,
  onCreatorPress,
  onTeamsPress,
  onScorePress,
  onCourtsPress,
  hideCreatorRow = false,
}: Props) {
  const { t, locale } = useTranslation();
  const localeTag = localeToBcp47(locale);
  const currentUser = useAuthStore((s) => s.user);
  const isCreator = currentUser?.id === match.creator_id;
  const scheduledDate = new Date(match.scheduled_at);
  const dateStr = scheduledDate.toLocaleDateString(localeTag, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const timeStr = scheduledDate.toLocaleTimeString(localeTag, {
    hour: '2-digit',
    minute: '2-digit',
  });

  const isToday =
    new Date().toDateString() === scheduledDate.toDateString();
  const tournament = isTournamentMatch(match);
  const volleyTypeLabel =
    match.volley_type === 'beach'
      ? t('createMatch.beachVolley')
      : match.volley_type === 'green'
        ? t('createMatch.greenVolley')
        : t('createMatch.classicVolley');
  const venuePlace = matchCardVenuePlace(match);
  const now = Date.now();
  const startMs = scheduledDate.getTime();
  const timingBadge: 'upcoming' | 'live' | 'past' =
    match.status === 'completed' || match.status === 'cancelled'
      ? 'past'
      : now >= startMs
        ? 'live'
        : 'upcoming';
  const liveMinutes = Math.max(1, Math.floor((now - startMs) / 60000));
  const timingSubtitle =
    timingBadge === 'upcoming'
      ? t('match.dateAtTime', { date: dateStr, time: timeStr })
      : timingBadge === 'live'
        ? `${liveMinutes} min`
        : t('match.statusPast');
  const livePulse = useRef(new Animated.Value(1)).current;
  const courtsBorderPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (timingBadge !== 'live') {
      livePulse.stopAnimation();
      livePulse.setValue(1);
      courtsBorderPulse.stopAnimation();
      courtsBorderPulse.setValue(0);
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

    const courtsLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(courtsBorderPulse, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(courtsBorderPulse, {
          toValue: 0,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ]),
    );
    courtsLoop.start();

    return () => {
      loop.stop();
      livePulse.setValue(1);
      courtsLoop.stop();
      courtsBorderPulse.setValue(0);
    };
  }, [livePulse, courtsBorderPulse, timingBadge]);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(match)}
      activeOpacity={0.7}
    >
      <View style={styles.topRow}>
        <View style={styles.eventMetaLeft}>
          <View
            style={[
              styles.eventPill,
              tournament ? styles.eventPillTournament : styles.eventPillMatch,
            ]}
          >
            <Text
              style={[
                styles.eventPillText,
                tournament ? styles.eventPillTextTournament : styles.eventPillTextMatch,
              ]}
            >
              {tournament
                ? t('match.eventTournament')
                : t('match.eventMatch')}
            </Text>
          </View>
          <Text style={styles.volleyTypeText}>{volleyTypeLabel}</Text>
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
              <Text style={styles.headerStatusSubtitle} numberOfLines={1}>
                {timingSubtitle}
              </Text>
            ) : null}
          </View>
        </View>
      </View>

      <View style={styles.locationRow}>
        <Ionicons
          name="location-outline"
          size={15}
          color={colors.textSecondary}
          style={styles.locationIcon}
        />
        <Text style={styles.locationText} numberOfLines={2}>
          {venuePlace}
        </Text>
      </View>

      <View style={styles.meta}>
        <View style={styles.metaItem}>
          <Ionicons
            name={isToday ? 'today-outline' : 'calendar-outline'}
            size={14}
            color={colors.textSecondary}
          />
          <Text
            style={[
              styles.metaText,
              isToday && { color: colors.primary, fontWeight: '600' },
            ]}
          >
            {isToday
              ? t('match.todayTime', { time: timeStr })
              : t('match.dateAtTime', { date: dateStr, time: timeStr })}
          </Text>
        </View>
        <View style={[styles.metaItem, styles.skillMetaItem]}>
          <Ionicons
            name="flash-outline"
            size={14}
            color={colors.textSecondary}
          />
          <SkillBadge level={match.skill_level} small />
        </View>
        {!hideCreatorRow ? (
          <View style={styles.metaItem}>
            <Ionicons
              name="person-outline"
              size={14}
              color={colors.textSecondary}
            />
            {onCreatorPress ? (
              <TouchableOpacity
                onPress={() => onCreatorPress(match.creator_id)}
                hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
              >
                <Text style={[styles.metaText, styles.creatorLink]}>
                  {match.creator_username ?? '—'}
                </Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.metaText}>
                {match.creator_username ?? '—'}
              </Text>
            )}
          </View>
        ) : null}
      </View>

      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          <Text style={styles.playerCountLabel} numberOfLines={1}>
            {t('match.listPlayerCountPrefix')}
          </Text>
          <PlayerCountBadge
            matchId={match.id}
            currentPlayers={match.current_players}
            maxPlayers={match.max_players}
          />
        </View>
        <View style={styles.footerMiddle}>
          {match.distance !== undefined ? (
            <Text style={styles.footerDistance} numberOfLines={1}>
              {match.distance < 1000
                ? `${Math.round(match.distance)}m`
                : `${(match.distance / 1000).toFixed(1)}km`}
            </Text>
          ) : null}
        </View>
        <View style={styles.footerIconRow}>
          {onTeamsPress ? (
            <Pressable
              style={styles.footerIconBtn}
              onPress={() => onTeamsPress(match)}
              hitSlop={{ top: 6, bottom: 6, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={t('match.viewTeamsBoard')}
            >
              <Ionicons name="people-outline" size={28} color={colors.primary} />
            </Pressable>
          ) : null}
          {onScorePress && (timingBadge !== 'upcoming' || isCreator) ? (
            <Pressable
              style={styles.footerIconBtn}
              onPress={() => onScorePress(match)}
              hitSlop={{ top: 6, bottom: 6, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={t('match.scoreButton')}
            >
              <Ionicons name="trophy-outline" size={28} color={colors.primary} />
            </Pressable>
          ) : null}
          {tournament && onCourtsPress && (timingBadge === 'live' || isCreator) ? (
            <Pressable
              onPress={() => onCourtsPress(match)}
              hitSlop={{ top: 6, bottom: 6, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={t('match.viewTournamentCourts')}
            >
              <Animated.View
                style={[
                  styles.footerIconBtn,
                  timingBadge === 'live' && {
                    borderColor: courtsBorderPulse.interpolate({
                      inputRange: [0, 1],
                      outputRange: [colors.border, colors.primary],
                    }),
                    borderWidth: 2,
                  },
                ]}
              >
                <Ionicons name="grid-outline" size={28} color={colors.primary} />
              </Animated.View>
            </Pressable>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
    ...shadows.card,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  eventPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
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
  eventMetaLeft: {
    gap: 6,
    marginBottom: spacing.sm,
  },
  volleyTypeText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: spacing.xs,
  },
  locationIcon: {
    marginTop: 2,
  },
  locationText: {
    ...typography.body,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  meta: {
    gap: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  skillMetaItem: {
    marginTop: spacing.xs,
  },
  metaText: {
    ...typography.bodySmall,
    fontSize: 15,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
    maxWidth: '46%',
  },
  playerCountLabel: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    flexShrink: 1,
  },
  footerMiddle: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-end',
    paddingHorizontal: spacing.xs,
  },
  footerDistance: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  footerIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flexShrink: 0,
  },
  footerIconBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerStatusRail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '52%',
    minWidth: 0,
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
  },
  headerStatusTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
    lineHeight: 14,
    textTransform: 'uppercase',
  },
  headerStatusSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    lineHeight: 14,
  },
  creatorLink: {
    color: colors.primary,
    fontWeight: '600',
  },
});
