import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from '../i18n';
import { colors, spacing, borderRadius, typography, shadows } from '../theme';

interface Props {
  visible: boolean;
  isSaving?: boolean;
  onCancel: () => void;
  onSave: () => void;
}

/**
 * Floating bar that appears at the bottom of the screen when a form has
 * unsaved changes. Lets the user cancel (revert) or save explicitly.
 *
 * Used in EditProfileScreen and any other screen with a "dirty form" pattern.
 */
export function DirtyFormBar({ visible, isSaving = false, onCancel, onSave }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(120)).current;

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: visible ? 0 : 120,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [visible, translateY]);

  return (
    <Animated.View
      pointerEvents={visible ? 'box-none' : 'none'}
      style={[
        styles.container,
        { paddingBottom: Math.max(insets.bottom, spacing.md) },
        { transform: [{ translateY }] },
      ]}
    >
      <View style={styles.actions}>
        <Pressable
          style={[styles.btn, styles.btnCancel, isSaving && styles.btnDisabled]}
          onPress={onCancel}
          disabled={isSaving}
        >
          <Text style={styles.btnCancelText}>{t('common.cancel')}</Text>
        </Pressable>
        <Pressable
          style={[styles.btn, styles.btnSave, isSaving && styles.btnDisabled]}
          onPress={onSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <Text style={styles.btnSaveText}>{t('common.save')}</Text>
          )}
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  btn: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  btnCancel: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnCancelText: {
    ...typography.button,
    color: colors.text,
    fontSize: 14,
  },
  btnSave: {
    backgroundColor: colors.primary,
  },
  btnSaveText: {
    ...typography.button,
    color: colors.white,
    fontSize: 14,
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
