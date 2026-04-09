import React from 'react';
import {
  Alert,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../i18n';
import { colors, spacing, borderRadius, typography } from '../theme';
import { useBottomInset } from '../hooks/useBottomInset';

export function NotificationSettingsScreen() {
  const { t } = useTranslation();
  const bottomInset = useBottomInset();

  const openSystemSettings = () => {
    if (Platform.OS === 'ios') {
      Linking.openSettings();
    } else {
      Linking.openSettings();
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: bottomInset }]}
    >
      <View style={styles.infoCard}>
        <Ionicons name="notifications-outline" size={28} color={colors.primary} />
        <Text style={styles.infoText}>{t('settings.notifDescription')}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.notifTypes')}</Text>
        <View style={styles.card}>
          <NotifRow icon="people-outline" label={t('settings.notifPlayers')} />
          <View style={styles.divider} />
          <NotifRow icon="chatbubble-ellipses-outline" label={t('settings.notifChat')} />
          <View style={styles.divider} />
          <NotifRow icon="trophy-outline" label={t('settings.notifScores')} />
          <View style={styles.divider} />
          <NotifRow icon="alarm-outline" label={t('settings.notifReminders')} />
          <View style={styles.divider} />
          <NotifRow icon="person-add-outline" label={t('settings.notifConnections')} />
          <View style={styles.divider} />
          <NotifRow icon="settings-outline" label={t('settings.notifOrganizerActions')} />
        </View>
      </View>

      <TouchableOpacity style={styles.systemBtn} onPress={openSystemSettings} activeOpacity={0.7}>
        <Ionicons name="phone-portrait-outline" size={20} color={colors.primary} />
        <Text style={styles.systemBtnText}>{t('settings.notifOpenSystem')}</Text>
        <Ionicons name="open-outline" size={16} color={colors.textMuted} />
      </TouchableOpacity>

      <Text style={styles.hint}>{t('settings.notifHint')}</Text>
    </ScrollView>
  );
}

function NotifRow({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={styles.notifRow}>
      <Ionicons name={icon as any} size={18} color={colors.textSecondary} />
      <Text style={styles.notifLabel}>{label}</Text>
      <Ionicons name="checkmark-circle" size={18} color={colors.success} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.lg },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary + '12',
    borderWidth: 1,
    borderColor: colors.primary + '33',
  },
  infoText: {
    ...typography.body,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 22,
  },
  section: { gap: spacing.sm },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  notifLabel: { ...typography.body, flex: 1 },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: spacing.md + 18 + spacing.md,
  },
  systemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.primary + '44',
    backgroundColor: colors.surface,
  },
  systemBtnText: { ...typography.body, color: colors.primary, fontWeight: '600', flex: 1 },
  hint: {
    ...typography.bodySmall,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
