import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { MatchesStackParamList } from '../navigation/types';
import { useQueryClient } from '@tanstack/react-query';
import { MATCHES_KEY, useMatch } from '../hooks/useMatches';
import { useAuthStore } from '../store/auth.store';
import { matchesApi } from '../api/matches.api';
import { useSocket } from '../hooks/useSocket';
import { usersApi } from '../api/users.api';
import { ReportSheet } from '../components/ReportSheet';
import { useTranslation } from '../i18n';
import { colors, spacing, borderRadius, typography } from '../theme';
import type { MatchChatMessage } from '../types';
import { useUnreadMatchChat } from '../hooks/useUnreadMatchChat';

type Props = NativeStackScreenProps<MatchesStackParamList, 'MatchChat'>;

export function MatchChatScreen({ route, navigation }: Props) {
  const { matchId } = route.params;
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const { data: match, isLoading } = useMatch(matchId);
  const queryClient = useQueryClient();
  const { subscribeToMatchChat } = useSocket();
  const unreadChat = useUnreadMatchChat(matchId, user?.id);

  const [messages, setMessages] = useState<MatchChatMessage[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState('');
  const [reportTarget, setReportTarget] = useState<
    { type: 'user' | 'chat_message'; id: string } | null
  >(null);
  const seenIds = useRef(new Set<string>());

  const isParticipant = Boolean(
    user &&
      match &&
      (match.creatorId === user.id ||
        match.participants.some((p) => p.userId === user.id)),
  );
  const isCreator = Boolean(user && match && match.creatorId === user.id);
  const isEnded = match?.status === 'completed' || match?.status === 'cancelled';

  const mergeMessage = useCallback((msg: MatchChatMessage) => {
    if (seenIds.current.has(msg.id)) return;
    seenIds.current.add(msg.id);
    setMessages((prev) => {
      const next = [...prev, msg];
      next.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
      return next;
    });
  }, []);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    try {
      const res = await matchesApi.getChatMessages(matchId);
      seenIds.current = new Set(res.messages.map((m) => m.id));
      setMessages(res.messages);
      setHasMore(res.hasMore);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t('match.chatLoadFailed');
      Alert.alert(t('common.error'), msg);
    } finally {
      setLoading(false);
    }
  }, [matchId, t]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || messages.length === 0) return;
    const oldest = messages[0];
    setLoadingMore(true);
    try {
      const res = await matchesApi.getChatMessages(matchId, oldest.id);
      const incoming = res.messages.filter((m) => !seenIds.current.has(m.id));
      for (const m of incoming) {
        seenIds.current.add(m.id);
      }
      setMessages((prev) => {
        const merged = [...incoming, ...prev];
        merged.sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );
        return merged;
      });
      setHasMore(res.hasMore);
    } catch {
      /* ignore */
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, matchId, messages]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  useEffect(() => {
    void unreadChat.markSeen();
  }, [unreadChat.markSeen]);

  useEffect(() => {
    if (!isParticipant) return;
    const unsub = subscribeToMatchChat(matchId, mergeMessage);
    return unsub;
  }, [isParticipant, matchId, mergeMessage, subscribeToMatchChat]);

  useEffect(() => {
    if (!match || !user) return;
    if (!isParticipant) {
      navigation.goBack();
    }
  }, [isParticipant, match, navigation, user]);

  const onMessageLongPress = (messageId: string, authorId: string, authorName: string) => {
    Alert.alert(t('chat.actionsTitle'), undefined, [
      {
        text: t('report.actionMessage'),
        onPress: () => setReportTarget({ type: 'chat_message', id: messageId }),
      },
      {
        text: t('block.action'),
        style: 'destructive',
        onPress: () => {
          Alert.alert(
            t('block.confirmTitle'),
            t('block.confirmMessage', { name: authorName }),
            [
              { text: t('common.cancel'), style: 'cancel' },
              {
                text: t('block.action'),
                style: 'destructive',
                onPress: async () => {
                  try {
                    await usersApi.block(authorId);
                    Alert.alert(
                      t('block.successTitle'),
                      t('block.successMessage', { name: authorName }),
                    );
                    // Hide messages from blocked user locally. Mute panel still shows
                    // them so the organizer can keep moderating for other participants.
                    setMessages((prev) => prev.filter((m) => m.userId !== authorId));
                    // Refresh match (participants list) so any stale state stays consistent.
                    queryClient.invalidateQueries({ queryKey: [MATCHES_KEY, matchId] });
                  } catch (err: unknown) {
                    Alert.alert(
                      t('common.error'),
                      err instanceof Error ? err.message : t('block.error'),
                    );
                  }
                },
              },
            ],
          );
        },
      },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  const send = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const msg = await matchesApi.postChatMessage(matchId, text);
      mergeMessage(msg);
      setDraft('');
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : '';
      if (/mute/i.test(raw)) {
        Alert.alert(t('common.error'), t('match.chatYouAreMuted'));
      } else {
        Alert.alert(t('common.error'), t('match.chatSendFailed'));
      }
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    navigation.setOptions({
      headerRight:
        isCreator && match
          ? () => (
              <Pressable
                onPress={() =>
                  (navigation as any).navigate('ChatModeration', { matchId })
                }
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.headerIconBtn}
                accessibilityRole="button"
                accessibilityLabel={t('match.chatModerationA11y')}
              >
                <Ionicons name="volume-mute-outline" size={22} color={colors.primary} />
              </Pressable>
            )
          : undefined,
    });
  }, [isCreator, match, navigation, t, matchId]);

  if (isLoading || !match) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            hasMore ? (
              <TouchableOpacity
                style={styles.loadOlder}
                onPress={loadMore}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <Text style={styles.loadOlderText}>{t('match.chatLoadOlder')}</Text>
                )}
              </TouchableOpacity>
            ) : null
          }
          renderItem={({ item }) => {
            const mine = item.userId === user?.id;
            const timeLabel = new Date(item.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });
            const onLongPress = mine
              ? undefined
              : () => onMessageLongPress(item.id, item.userId, item.user.username);
            return (
              <View
                style={[
                  styles.bubbleRow,
                  mine ? styles.bubbleRowMine : styles.bubbleRowOther,
                ]}
              >
                <Pressable
                  onLongPress={onLongPress}
                  delayLongPress={350}
                  style={[
                    styles.bubble,
                    mine ? styles.bubbleMine : styles.bubbleOther,
                  ]}
                >
                  {!mine ? (
                    <Text style={styles.bubbleAuthor}>{item.user.username}</Text>
                  ) : null}
                  <Text
                    style={[
                      styles.bubbleText,
                      mine ? styles.bubbleTextMine : styles.bubbleTextOther,
                    ]}
                  >
                    {item.body}
                  </Text>
                  <Text
                    style={[
                      styles.bubbleTime,
                      mine ? styles.bubbleTimeMine : styles.bubbleTimeOther,
                    ]}
                  >
                    {timeLabel}
                  </Text>
                </Pressable>
              </View>
            );
          }}
        />
      )}

      {isEnded ? (
        <View style={styles.composerClosed}>
          <Ionicons name="lock-closed-outline" size={16} color={colors.textMuted} />
          <Text style={styles.composerClosedText}>{t('match.chatClosed')}</Text>
        </View>
      ) : (
        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder={t('match.chatPlaceholder')}
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={2000}
            editable={!sending}
          />
          <TouchableOpacity
            style={[styles.sendBtn, sending && styles.sendBtnDisabled]}
            onPress={send}
            disabled={sending || !draft.trim()}
          >
            {sending ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Ionicons name="send" size={20} color={colors.white} />
            )}
          </TouchableOpacity>
        </View>
      )}

      <ReportSheet
        visible={reportTarget !== null}
        targetType={reportTarget?.type ?? 'chat_message'}
        targetId={reportTarget?.id ?? ''}
        onClose={() => setReportTarget(null)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
  },
  loadOlder: {
    alignSelf: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  loadOlderText: { color: colors.primary, fontWeight: '600' },
  bubbleRow: {
    marginBottom: spacing.sm,
    maxWidth: '88%',
  },
  bubbleRowMine: { alignSelf: 'flex-end' },
  bubbleRowOther: { alignSelf: 'flex-start' },
  bubble: {
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  bubbleMine: {
    backgroundColor: colors.primary,
  },
  bubbleOther: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bubbleAuthor: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  bubbleText: {
    ...typography.body,
  },
  bubbleTextMine: { color: colors.white },
  bubbleTextOther: { color: colors.text },
  bubbleTime: {
    fontSize: 10,
    fontWeight: '500',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  bubbleTimeMine: { color: 'rgba(255,255,255,0.55)' },
  bubbleTimeOther: { color: colors.textMuted },
  composerClosed: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  composerClosedText: {
    ...typography.bodySmall,
    color: colors.textMuted,
    fontWeight: '600',
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.md,
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    ...typography.body,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.card,
    color: colors.text,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: { opacity: 0.5 },
  headerIconBtn: { marginRight: spacing.sm, padding: spacing.xs },
  modalBackdrop: {
    flex: 1,
    backgroundColor: '#0008',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.card,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    padding: spacing.md,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  modalTitle: { ...typography.h3, fontSize: 18 },
  modalHint: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  muteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  muteName: { ...typography.body, flex: 1, marginRight: spacing.md },
});
