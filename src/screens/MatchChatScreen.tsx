import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { MatchesStackParamList } from '../navigation/types';
import { useMatch } from '../hooks/useMatches';
import { useAuthStore } from '../store/auth.store';
import { matchesApi } from '../api/matches.api';
import { useSocket } from '../hooks/useSocket';
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
  const { subscribeToMatchChat } = useSocket();
  const unreadChat = useUnreadMatchChat(matchId, user?.id);

  const [messages, setMessages] = useState<MatchChatMessage[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState('');
  const [muteModal, setMuteModal] = useState(false);
  const [mutedIds, setMutedIds] = useState<Set<string>>(new Set());
  const [muteLoading, setMuteLoading] = useState(false);
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

  const refreshMuted = useCallback(async () => {
    if (!isCreator) return;
    try {
      const ids = await matchesApi.getChatMutedUserIds(matchId);
      setMutedIds(new Set(ids));
    } catch {
      /* ignore */
    }
  }, [isCreator, matchId]);

  useEffect(() => {
    if (isCreator) {
      refreshMuted();
    }
  }, [isCreator, refreshMuted]);

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

  useEffect(() => {
    navigation.setOptions({
      headerRight:
        isCreator && match
          ? () => (
              <Pressable
                onPress={() => setMuteModal(true)}
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
  }, [isCreator, match, navigation, t]);

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
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
            return (
              <View
                style={[
                  styles.bubbleRow,
                  mine ? styles.bubbleRowMine : styles.bubbleRowOther,
                ]}
              >
                <View
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
                </View>
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

      <Modal visible={muteModal} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('match.chatModerationTitle')}</Text>
              <Pressable onPress={() => setMuteModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>
            <Text style={styles.modalHint}>{t('match.chatModerationHint')}</Text>
            <FlatList
              data={match.participants.filter((p) => p.userId !== match.creatorId)}
              keyExtractor={(p) => p.userId}
              renderItem={({ item: p }) => (
                <View style={styles.muteRow}>
                  <Text style={styles.muteName} numberOfLines={1}>
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
          </View>
        </View>
      </Modal>
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
