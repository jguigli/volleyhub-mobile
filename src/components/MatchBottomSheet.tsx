import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PlayerCountBadge } from './PlayerCountBadge';
import { SkillBadge } from './SkillBadge';
import { localeToBcp47, useTranslation } from '../i18n';
import { colors, spacing, borderRadius, typography } from '../theme';
import { isTournamentMatch, matchCardVenuePlace } from '../utils/matchDisplay';
import { useAuthStore } from '../store/auth.store';
import type { NearbyMatch } from '../types';

interface Props {
  match: NearbyMatch;
  onClose: () => void;
  /** Ouvre le détail du match (inscription uniquement depuis l’écran détail). */
  onViewMatch: () => void;
  onTeamsPress?: () => void;
  onScorePress?: () => void;
  onCourtsPress?: () => void;
}

export function MatchBottomSheet({
  match,
  onClose,
  onViewMatch,
  onTeamsPress,
  onScorePress,
  onCourtsPress,
}: Props) {
  const { t, locale } = useTranslation();
  const localeTag = localeToBcp47(locale);
  const venueLine = matchCardVenuePlace(match);
  const tournament = isTournamentMatch(match);
  const currentUser = useAuthStore((s) => s.user);
  const isCreator = currentUser?.id === match.creator_id;

  const scheduledMs = new Date(match.scheduled_at).getTime();
  const isPast =
    match.status === 'completed' || match.status === 'cancelled';
  const isLive = !isPast && Date.now() >= scheduledMs;
  const isUpcoming = !isPast && !isLive;

  const borderPulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!tournament || !isLive) {
      borderPulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(borderPulse, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(borderPulse, {
          toValue: 0,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [tournament, isLive, borderPulse]);

  const volleyLabel =
    match.volley_type === 'beach'
      ? t('createMatch.beachVolley')
      : match.volley_type === 'green'
        ? t('createMatch.greenVolley')
        : t('createMatch.classicVolley');

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

  return (
    <View style={styles.container}>
      <View style={styles.handle} />

      <TouchableOpacity style={styles.closeButton} onPress={onClose}>
        <Ionicons name="close" size={20} color={colors.textSecondary} />
      </TouchableOpacity>

      <View style={styles.eventPillRow}>
        <View style={styles.eventPillWrap}>
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
              numberOfLines={1}
            >
              {tournament
                ? t('match.eventTournament')
                : t('match.eventMatch')}
            </Text>
          </View>
        </View>
        <SkillBadge level={match.skill_level} />
      </View>

      <Text style={styles.volleyText}>{volleyLabel}</Text>

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.courtName}>{venueLine}</Text>
          {match.court_is_registry !== false ? (
            <View style={styles.courtTypeRow}>
              <Ionicons
                name={
                  match.court_type === 'indoor'
                    ? 'business-outline'
                    : 'sunny-outline'
                }
                size={14}
                color={colors.textSecondary}
              />
              <Text style={styles.courtType}>
                {match.court_type === 'indoor'
                  ? t('map.indoor')
                  : t('map.outdoor')}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.meta}>
        <View style={styles.metaItem}>
          <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.metaText}>{dateStr}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.metaText}>{timeStr}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="person-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.metaText}>by {match.creator_username}</Text>
        </View>
      </View>

      <PlayerCountBadge
        matchId={match.id}
        currentPlayers={match.current_players}
        maxPlayers={match.max_players}
        large
      />

      <View style={styles.actionsRow}>
        {onTeamsPress ? (
          <TouchableOpacity
            style={styles.actionIconBtn}
            onPress={onTeamsPress}
            activeOpacity={0.8}
          >
            <Ionicons name="people-outline" size={24} color={colors.primary} />
            <Text style={styles.actionIconText}>{t('match.viewTeamsBoard')}</Text>
          </TouchableOpacity>
        ) : null}
        {onScorePress && (!isUpcoming || isCreator) ? (
          <TouchableOpacity
            style={styles.actionIconBtn}
            onPress={onScorePress}
            activeOpacity={0.8}
          >
            <Ionicons name="trophy-outline" size={24} color={colors.primary} />
            <Text style={styles.actionIconText}>{t('match.scoreButton')}</Text>
          </TouchableOpacity>
        ) : null}
        {tournament && onCourtsPress && (isLive || isCreator) ? (
          <TouchableOpacity
            onPress={onCourtsPress}
            activeOpacity={0.8}
          >
            <Animated.View
              style={[
                styles.actionIconBtn,
                isLive && {
                  borderColor: borderPulse.interpolate({
                    inputRange: [0, 1],
                    outputRange: [colors.primary + '55', colors.primary],
                  }),
                  borderWidth: 2,
                },
              ]}
            >
              <Ionicons name="grid-outline" size={24} color={colors.primary} />
              <Text style={styles.actionIconText}>{t('match.viewTournamentCourts')}</Text>
            </Animated.View>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.viewButton}
          onPress={onViewMatch}
          activeOpacity={0.8}
        >
          <Text style={styles.viewButtonText}>{t('match.viewEvent')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
    paddingBottom: 40,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  closeButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    padding: 4,
    zIndex: 1,
  },
  eventPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    paddingRight: 36,
  },
  eventPillWrap: {
    flex: 1,
    minWidth: 0,
  },
  eventPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
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
  volleyText: {
    ...typography.bodySmall,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  header: {
    marginBottom: spacing.md,
  },
  headerLeft: {
    flex: 1,
  },
  courtName: {
    ...typography.h3,
    marginBottom: 2,
  },
  courtTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  courtType: {
    ...typography.bodySmall,
    flexShrink: 1,
  },
  meta: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  metaText: {
    ...typography.bodySmall,
    fontSize: 14,
  },
  footer: {
    marginTop: spacing.lg,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionIconBtn: {
    flex: 1,
    minHeight: 62,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary + '55',
    backgroundColor: colors.primary + '12',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
    gap: 6,
  },
  actionIconText: {
    ...typography.caption,
    color: colors.primary,
    textAlign: 'center',
    fontWeight: '700',
  },
  viewButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  viewButtonText: {
    ...typography.button,
    color: colors.white,
    fontSize: 16,
  },
});
