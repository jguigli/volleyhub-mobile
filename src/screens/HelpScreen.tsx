import React from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../i18n';
import { colors, spacing, borderRadius, typography } from '../theme';
import { useBottomInset } from '../hooks/useBottomInset';

const FAQ_ITEMS = [
  { titleKey: 'settings.helpFaqJoin', bodyKey: 'settings.helpFaqJoinBody', icon: 'enter-outline' },
  { titleKey: 'settings.helpFaqTeams', bodyKey: 'settings.helpFaqTeamsBody', icon: 'people-outline' },
  { titleKey: 'settings.helpFaqScore', bodyKey: 'settings.helpFaqScoreBody', icon: 'trophy-outline' },
  { titleKey: 'settings.helpFaqNotif', bodyKey: 'settings.helpFaqNotifBody', icon: 'notifications-outline' },
  { titleKey: 'settings.helpFaqRenew', bodyKey: 'settings.helpFaqRenewBody', icon: 'refresh-outline' },
] as const;

export function HelpScreen() {
  const { t } = useTranslation();
  const bottomInset = useBottomInset();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: bottomInset }]}
    >
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.helpFaqTitle')}</Text>
        {FAQ_ITEMS.map((item, i) => (
          <View key={i} style={styles.faqCard}>
            <View style={styles.faqHeader}>
              <Ionicons name={item.icon as any} size={18} color={colors.primary} />
              <Text style={styles.faqTitle}>{t(item.titleKey as any)}</Text>
            </View>
            <Text style={styles.faqBody}>{t(item.bodyKey as any)}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.helpContactTitle')}</Text>
        <TouchableOpacity
          style={styles.contactCard}
          onPress={() => Linking.openURL('mailto:support@volleyhub.app')}
          activeOpacity={0.7}
        >
          <Ionicons name="mail-outline" size={20} color={colors.primary} />
          <View style={styles.contactText}>
            <Text style={styles.contactLabel}>{t('settings.helpEmail')}</Text>
            <Text style={styles.contactValue}>support@volleyhub.app</Text>
          </View>
          <Ionicons name="open-outline" size={16} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <Text style={styles.versionText}>VolleyHub v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.lg },
  section: { gap: spacing.sm },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  faqCard: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  faqTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  faqBody: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
    marginLeft: 24,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  contactText: { flex: 1 },
  contactLabel: { ...typography.body, fontWeight: '600' },
  contactValue: { ...typography.bodySmall, color: colors.textMuted },
  versionText: {
    ...typography.bodySmall,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
