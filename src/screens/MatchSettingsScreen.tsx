import React, { useLayoutEffect } from 'react';
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
  useManageMatch,
  useMatch,
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
  const deleteMut = useDeleteMatch();
  const manageMut = useManageMatch();

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

  const isCreator = user?.id === match.creatorId;
  const cancelled = match.status === 'cancelled';
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

  useLayoutEffect(() => {
    navigation.setOptions({
      title: tournament
        ? t('nav.tournamentSettings')
        : t('nav.matchSettings'),
    });
  }, [navigation, tournament, t]);

  const isUpcoming =
    !cancelled &&
    match.status !== 'completed' &&
    new Date(match.scheduledAt).getTime() > Date.now();
  const canEditTournament = tournament && isUpcoming;
  const canEditMatch = !tournament && isUpcoming;

  const handleStartNow = () => {
    Alert.alert(
      t('match.startNowConfirmTitle'),
      t('match.startNowConfirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('match.startNowConfirmAction'),
          style: 'destructive',
          onPress: async () => {
            try {
              await manageMut.mutateAsync({ matchId, startNow: true } as any);
              navigation.goBack();
            } catch (e: unknown) {
              const msg = e instanceof Error ? e.message : t('match.manageFailed');
              Alert.alert(t('common.error'), msg);
            }
          },
        },
      ],
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: bottomInset }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Section info — visible par tous */}
      <TouchableOpacity
        style={styles.card}
        onPress={() => (navigation as any).navigate('EventGuide', { matchId })}
        activeOpacity={0.75}
      >
        <View style={styles.cardIconWrap}>
          <Ionicons name="information-circle-outline" size={24} color={colors.white} />
        </View>
        <View style={styles.cardTextWrap}>
          <Text style={styles.cardTitle}>{t('match.eventGuideTitle')}</Text>
          <Text style={styles.cardSubtitle}>{t('match.eventGuideSubtitle')}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </TouchableOpacity>

      {/* Sections organisateur uniquement */}
      {isCreator ? (
        <>
          {canEditTournament ? (
            <TouchableOpacity
              style={styles.card}
              onPress={() => (navigation as any).navigate('EditTournamentSettings', { matchId })}
              activeOpacity={0.75}
            >
              <View style={styles.cardIconWrap}>
                <Ionicons name="options-outline" size={24} color={colors.white} />
              </View>
              <View style={styles.cardTextWrap}>
                <Text style={styles.cardTitle}>{t('match.editTournamentSettingsTitle')}</Text>
                <Text style={styles.cardSubtitle}>{t('match.editTournamentSettingsSubtitle')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}

          {canEditMatch ? (
            <TouchableOpacity
              style={styles.card}
              onPress={() => (navigation as any).navigate('EditMatchSettings', { matchId })}
              activeOpacity={0.75}
            >
              <View style={styles.cardIconWrap}>
                <Ionicons name="options-outline" size={24} color={colors.white} />
              </View>
              <View style={styles.cardTextWrap}>
                <Text style={styles.cardTitle}>{t('match.editMatchSettingsTitle')}</Text>
                <Text style={styles.cardSubtitle}>{t('match.editMatchSettingsSubtitle')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}

          {isUpcoming ? (
            <TouchableOpacity
              style={styles.card}
              onPress={handleStartNow}
              disabled={manageMut.isPending}
              activeOpacity={0.75}
            >
              <View style={styles.cardIconWrap}>
                <Ionicons name="play-circle-outline" size={24} color={colors.white} />
              </View>
              <View style={styles.cardTextWrap}>
                <Text style={styles.cardTitle}>{t('match.startNowTitle')}</Text>
                <Text style={styles.cardSubtitle}>{t('match.startNowSubtitle')}</Text>
              </View>
              {manageMut.isPending ? (
                <ActivityIndicator color={colors.success} />
              ) : (
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              )}
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={[styles.card, styles.cardDanger]}
            onPress={handleDelete}
            disabled={deleteMut.isPending}
            activeOpacity={0.75}
          >
            <View style={[styles.cardIconWrap, styles.cardIconDanger]}>
              <Ionicons name="trash-outline" size={24} color={colors.white} />
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
        </>
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
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardIconSuccess: {
    backgroundColor: colors.success,
  },
  cardIconDanger: {
    backgroundColor: colors.error,
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
