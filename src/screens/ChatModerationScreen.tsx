import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMatch } from '../hooks/useMatches';
import { matchesApi } from '../api/matches.api';
import { useTranslation } from '../i18n';
import { colors, spacing, borderRadius, typography } from '../theme';
import { useBottomInset } from '../hooks/useBottomInset';
import type {
  FindStackParamList,
  MapStackParamList,
  MyStackParamList,
  ProfileStackParamList,
} from '../navigation/types';

type Props = NativeStackScreenProps<
  FindStackParamList | MapStackParamList | MyStackParamList | ProfileStackParamList,
  'ChatModeration'
>;

export function ChatModerationScreen({ route }: Props) {
  const { matchId } = route.params;
  const { t } = useTranslation();
  const bottomInset = useBottomInset();
  const { data: match, isLoading } = useMatch(matchId);
  const [mutedIds, setMutedIds] = useState<Set<string>>(new Set());
  const [muteLoading, setMuteLoading] = useState(false);

  const refreshMuted = useCallback(async () => {
    try {
      const ids = await matchesApi.getChatMutedUserIds(matchId);
      setMutedIds(new Set(ids));
    } catch {
      // ignore
    }
  }, [matchId]);

  useEffect(() => {
    refreshMuted();
  }, [refreshMuted]);

  const toggleMute = async (targetId: string, nextMuted: boolean) => {
    setMuteLoading(true);
    try {
      if (nextMuted) {
        await matchesApi.muteChatUser(matchId, targetId);
      } else {
        await matchesApi.unmuteChatUser(matchId, targetId);
      }
      await refreshMuted();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t('match.chatMuteFailed');
      Alert.alert(t('common.error'), msg);
    } finally {
      setMuteLoading(false);
    }
  };

  if (isLoading || !match) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const participants = match.participants.filter(
    (p) => p.userId !== match.creatorId,
  );

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: bottomInset + spacing.lg },
      ]}
      data={participants}
      keyExtractor={(p) => p.userId}
      ListHeaderComponent={
        <Text style={styles.hint}>{t('match.chatModerationHint')}</Text>
      }
      ListEmptyComponent={
        <View style={styles.emptyCard}>
          <Ionicons
            name="people-outline"
            size={32}
            color={colors.textMuted}
          />
          <Text style={styles.emptyText}>{t('match.chatModerationEmpty')}</Text>
        </View>
      }
      renderItem={({ item: p }) => (
        <View style={styles.row}>
          <Text style={styles.name} numberOfLines={1}>
            {p.user.username}
          </Text>
          <Switch
            value={mutedIds.has(p.userId)}
            onValueChange={(v) => toggleMute(p.userId, v)}
            disabled={muteLoading}
          />
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.sm },
  centered: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hint: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
    gap: spacing.sm,
  },
  emptyText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    gap: spacing.md,
  },
  name: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
});
