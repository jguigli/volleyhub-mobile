import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../i18n';
import { colors, spacing, typography } from '../theme';
import { useBottomInset } from '../hooks/useBottomInset';
import type { FindStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<FindStackParamList, 'TeamsGuide'>;

function Section({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon as any} size={18} color={colors.primary} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <Text style={styles.sectionBody}>{body}</Text>
    </View>
  );
}

export function TeamsGuideScreen({ route }: Props) {
  const { tournament } = route.params;
  const { t } = useTranslation();
  const bottomInset = useBottomInset();

  const sections: { icon: string; title: string; body: string }[] = [
    { icon: 'add-circle-outline', title: t('match.teamsGuideJoinTitle'), body: t('match.teamsInfoTap') },
    { icon: 'close-circle-outline', title: t('match.teamsGuideLeaveTitle'), body: t('match.teamsInfoRemove') },
    { icon: 'lock-closed-outline', title: t('match.teamsGuideLockTitle'), body: t('match.teamsInfoLock') },
  ];
  if (tournament) {
    sections.push({
      icon: 'person-outline',
      title: t('match.teamsGuideOrganizerTitle'),
      body: t('match.teamsInfoOrganizerTournament'),
    });
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: bottomInset }]}
    >
      {sections.map((s, i) => (
        <Section key={i} icon={s.icon} title={s.title} body={s.body} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg },
  section: {
    gap: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  sectionBody: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
    marginLeft: 24,
  },
});
