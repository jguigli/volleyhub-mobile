import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../i18n';
import { colors, spacing, borderRadius, typography } from '../theme';
import { reportsApi, ReportReason, ReportTargetType } from '../api/reports.api';

interface Props {
  visible: boolean;
  targetType: ReportTargetType;
  targetId: string;
  onClose: () => void;
  onSubmitted?: () => void;
}

const REASONS: ReportReason[] = [
  'spam',
  'harassment',
  'inappropriate',
  'impersonation',
  'other',
];

export function ReportSheet({
  visible,
  targetType,
  targetId,
  onClose,
  onSubmitted,
}: Props) {
  const { t } = useTranslation();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setReason(null);
    setDetails('');
    setLoading(false);
  };

  const close = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!reason) {
      Alert.alert(t('common.error'), t('report.pickReasonError'));
      return;
    }
    setLoading(true);
    try {
      await reportsApi.report(targetType, targetId, reason, details.trim() || undefined);
      Alert.alert(t('report.submittedTitle'), t('report.submittedMessage'));
      reset();
      onSubmitted?.();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('report.submitError');
      Alert.alert(t('common.error'), message);
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={close}
    >
      <Pressable style={styles.backdrop} onPress={close}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('report.title')}</Text>
            <TouchableOpacity onPress={close} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>{t('report.subtitle')}</Text>

          <View style={styles.reasons}>
            {REASONS.map((r) => (
              <TouchableOpacity
                key={r}
                style={[
                  styles.reason,
                  reason === r && styles.reasonSelected,
                ]}
                onPress={() => setReason(r)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.reasonText,
                    reason === r && styles.reasonTextSelected,
                  ]}
                >
                  {t(`report.reasons.${r}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>{t('report.detailsLabel')}</Text>
          <TextInput
            style={styles.textarea}
            placeholder={t('report.detailsPlaceholder')}
            placeholderTextColor={colors.textMuted}
            value={details}
            onChangeText={setDetails}
            multiline
            maxLength={1000}
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.submitText}>{t('report.submit')}</Text>
            )}
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { ...typography.h3, color: colors.text },
  subtitle: { ...typography.bodySmall, color: colors.textSecondary },
  reasons: { gap: spacing.xs },
  reason: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  reasonSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '22',
  },
  reasonText: { ...typography.body, color: colors.text },
  reasonTextSelected: { color: colors.primary, fontWeight: '600' },
  label: { ...typography.bodySmall, color: colors.textSecondary, marginTop: spacing.sm },
  textarea: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.text,
    minHeight: 80,
    fontSize: 14,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { ...typography.button, color: colors.white },
});
