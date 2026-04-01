import React from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { MatchesStackParamList } from '../navigation/types';
import {
  useDeleteMatch,
  useMatch,
  useRenewMatch,
} from '../hooks/useMatches';
import { useAuthStore } from '../store/auth.store';
import { useTranslation } from '../i18n';
import { isTournamentMatch } from '../utils/matchDisplay';
import { colors, spacing, borderRadius, typography, shadows } from '../theme';
import { useBottomInset } from '../hooks/useBottomInset';

type Props = NativeStackScreenProps<MatchesStackParamList, 'MatchSettings'>;

export function MatchSettingsScreen({ route, navigation }: Props) {
  const { matchId } = route.params;
  const bottomInset = useBottomInset();
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const { data: match, isLoading, error } = useMatch(matchId);
  const renewMut = useRenewMatch();
  const deleteMut = useDeleteMatch();

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

  if (user?.id !== match.creatorId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{t('match.manageUnauthorized')}</Text>
      </View>
    );
  }

  const cancelled = match.status === 'cancelled';
  const canRenew = !cancelled;

  const handleRenew = () => {
    if (!canRenew) {
      return;
    }
    Alert.alert(
      t('match.renewMatchConfirmTitle'),
      t('match.renewMatchConfirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('match.renewMatchConfirmAction'),
          onPress: async () => {
            try {
              const m = await renewMut.mutateAsync(matchId);
              navigation.pop();
              navigation.replace('MatchDetail', { matchId: m.id });
            } catch (e: unknown) {
              const msg =
                e instanceof Error ? e.message : t('match.renewMatchFailed');
              Alert.alert(t('common.error'), msg);
            }
          },
        },
      ],
    );
  };

  const handleDelete = () => {
    Alert.alert(t('match.deleteEventTitle'), t('match.deleteEventMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('match.deleteEventConfirm'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMut.mutateAsync(matchId);
            navigation.pop(2);
          } catch (e: unknown) {
            const msg =
              e instanceof Error ? e.message : t('match.deleteEventFailed');
            Alert.alert(t('common.error'), msg);
          }
        },
      },
    ]);
  };

  const tournament = isTournamentMatch(match);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: bottomInset }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.intro}>{t('match.matchSettingsIntro')}</Text>

      <TouchableOpacity
        style={[styles.card, !canRenew && styles.cardDisabled]}
        onPress={handleRenew}
        disabled={!canRenew || renewMut.isPending}
        activeOpacity={0.75}
      >
        <View style={styles.cardIconWrap}>
          <Ionicons
            name="refresh-outline"
            size={24}
            color={canRenew ? colors.primary : colors.textMuted}
          />
        </View>
        <View style={styles.cardTextWrap}>
          <Text style={styles.cardTitle}>{t('match.renewMatchSectionTitle')}</Text>
          <Text style={styles.cardSubtitle}>
            {tournament
              ? t('match.renewMatchSectionSubtitleTournament')
              : t('match.renewMatchSectionSubtitle')}
          </Text>
          {!canRenew ? (
            <Text style={styles.cardHint}>{t('match.renewMatchDisabledHint')}</Text>
          ) : null}
        </View>
        {renewMut.isPending ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.card, styles.cardDanger]}
        onPress={handleDelete}
        disabled={deleteMut.isPending}
        activeOpacity={0.75}
      >
        <View style={[styles.cardIconWrap, styles.cardIconDanger]}>
          <Ionicons name="trash-outline" size={24} color={colors.error} />
        </View>
        <View style={styles.cardTextWrap}>
          <Text style={[styles.cardTitle, styles.cardTitleDanger]}>
            {t('match.deleteMatchSectionTitle')}
          </Text>
          <Text style={styles.cardSubtitle}>{t('match.deleteMatchSectionSubtitle')}</Text>
        </View>
        {deleteMut.isPending ? (
          <ActivityIndicator color={colors.error} />
        ) : (
          <Ionicons name="chevron-forward" size={20} color={colors.error} />
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  errorText: {
    ...typography.body,
    color: colors.error,
    textAlign: 'center',
  },
  intro: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    ...shadows.card,
  },
  cardDisabled: {
    opacity: 0.65,
  },
  cardDanger: {
    borderColor: colors.error + '44',
  },
  cardIconWrap: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary + '18',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardIconDanger: {
    backgroundColor: colors.error + '18',
  },
  cardTextWrap: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  cardTitle: {
    ...typography.body,
    fontWeight: '700',
    color: colors.text,
  },
  cardTitleDanger: {
    color: colors.error,
  },
  cardSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  cardHint: {
    ...typography.bodySmall,
    color: colors.warning,
    marginTop: 4,
    fontWeight: '600',
  },
});
