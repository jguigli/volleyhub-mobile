import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../i18n';
import { usersApi } from '../api/users.api';
import { colors, spacing, borderRadius, typography } from '../theme';
import { useBottomInset } from '../hooks/useBottomInset';

interface BlockedUser {
  id: string;
  username: string;
  profilePicture: string | null;
  createdAt: string;
}

export function BlockedUsersScreen() {
  const { t } = useTranslation();
  const bottomInset = useBottomInset();
  const [users, setUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await usersApi.getBlocks();
      setUsers(data);
    } catch (err: unknown) {
      Alert.alert(
        t('common.error'),
        err instanceof Error ? err.message : t('block.loadError'),
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const handleUnblock = (user: BlockedUser) => {
    Alert.alert(
      t('block.unblockTitle'),
      t('block.unblockMessage', { name: user.username }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('block.unblockConfirm'),
          onPress: async () => {
            try {
              await usersApi.unblock(user.id);
              setUsers((prev) => prev.filter((u) => u.id !== user.id));
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
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: bottomInset + spacing.lg },
      ]}
      data={users}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
          tintColor={colors.primary}
        />
      }
      ListEmptyComponent={
        <View style={styles.emptyCard}>
          <Ionicons
            name="shield-checkmark-outline"
            size={32}
            color={colors.textMuted}
          />
          <Text style={styles.emptyText}>{t('block.emptyText')}</Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.row}>
          <View style={styles.avatar}>
            {item.profilePicture ? (
              <Image
                source={{ uri: item.profilePicture }}
                style={styles.avatarImage}
              />
            ) : (
              <Text style={styles.avatarInitial}>
                {item.username[0]?.toUpperCase() ?? '?'}
              </Text>
            )}
          </View>
          <Text style={styles.username}>{item.username}</Text>
          <TouchableOpacity
            style={styles.unblockBtn}
            onPress={() => handleUnblock(item)}
            activeOpacity={0.8}
          >
            <Text style={styles.unblockBtnText}>{t('block.unblockConfirm')}</Text>
          </TouchableOpacity>
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
    padding: spacing.md,
    gap: spacing.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '33',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: 40, height: 40 },
  avatarInitial: {
    ...typography.h3,
    color: colors.primary,
  },
  username: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  unblockBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  unblockBtnText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
});
