import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from '../i18n';
import { colors, borderRadius } from '../theme';
import { useSocket } from '../hooks/useSocket';

interface Props {
  matchId: string;
  currentPlayers: number;
  maxPlayers: number;
  large?: boolean;
  onPress?: () => void;
}

export function PlayerCountBadge({
  matchId,
  currentPlayers: initialCurrent,
  maxPlayers,
  large = false,
  onPress,
}: Props) {
  const { t } = useTranslation();
  const [currentPlayers, setCurrentPlayers] = useState(initialCurrent);
  const { subscribeToMatch } = useSocket();

  useEffect(() => {
    setCurrentPlayers(initialCurrent);
  }, [initialCurrent]);

  useEffect(() => {
    const unsubscribe = subscribeToMatch(matchId, (update) => {
      if (typeof update.currentPlayers === 'number') {
        setCurrentPlayers(update.currentPlayers);
      }
    });
    return unsubscribe;
  }, [matchId, subscribeToMatch]);

  const spotsLeft = maxPlayers - currentPlayers;
  const fillPercent = (currentPlayers / maxPlayers) * 100;

  const barColor =
    fillPercent >= 100
      ? colors.error
      : fillPercent >= 80
        ? colors.warning
        : colors.success;

  const compactBadgeTextColor =
    barColor === colors.success ? colors.black : colors.white;

  if (large) {
    const inner = (
      <>
        <View style={styles.largeHeader}>
          <Text style={styles.largeCount}>
            {currentPlayers}
            <Text style={styles.largeMax}>/{maxPlayers}</Text>
          </Text>
          <Text style={styles.spotsLabel}>
            {spotsLeft <= 0
              ? t('match.full')
              : spotsLeft === 1
                ? t('match.oneSpotLeft')
                : t('match.spotsLeft', { count: spotsLeft })}
          </Text>
        </View>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.min(fillPercent, 100)}%`, backgroundColor: barColor },
            ]}
          />
        </View>
      </>
    );
    if (onPress) {
      return (
        <Pressable
          style={styles.largeContainer}
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={t('match.openParticipantsListA11y')}
        >
          {inner}
        </Pressable>
      );
    }
    return <View style={styles.largeContainer}>{inner}</View>;
  }

  return (
    <View style={[styles.badge, { backgroundColor: barColor }]}>
      <Text style={[styles.badgeText, { color: compactBadgeTextColor }]}>
        {currentPlayers}/{maxPlayers}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  largeContainer: {
    gap: 8,
  },
  largeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  largeCount: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  largeMax: {
    fontSize: 18,
    color: colors.textSecondary,
    fontWeight: '400',
  },
  spotsLabel: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
});
