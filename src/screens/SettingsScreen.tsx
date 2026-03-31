import React from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/auth.store';
import { useMapAppearanceStore } from '../store/mapAppearance.store';
import { useTranslation } from '../i18n';
import { colors, spacing, borderRadius, typography } from '../theme';
import type { ProfileStackParamList } from '../navigation/types';

export function SettingsScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();
  const { clearAuth } = useAuthStore();
  const { t, locale, setLocale } = useTranslation();
  const mapAppearance = useMapAppearanceStore((s) => s.mapAppearance);
  const setMapAppearance = useMapAppearanceStore((s) => s.setMapAppearance);

  const languageDisplay =
    locale === 'fr' ? t('settings.languageFrench') : t('settings.languageEnglish');

  const mapAppearanceDisplay =
    mapAppearance === 'system'
      ? t('settings.mapAppearanceSystem')
      : mapAppearance === 'dark'
        ? t('settings.mapAppearanceDark')
        : t('settings.mapAppearanceLight');

  const pickLanguage = () => {
    Alert.alert(
      t('settings.language'),
      undefined,
      [
        {
          text: t('settings.languageEnglish'),
          onPress: () => setLocale('en'),
        },
        {
          text: t('settings.languageFrench'),
          onPress: () => setLocale('fr'),
        },
        { text: t('common.cancel'), style: 'cancel' },
      ],
      { cancelable: true },
    );
  };

  const pickMapAppearance = () => {
    Alert.alert(
      t('settings.mapAppearance'),
      undefined,
      [
        {
          text: t('settings.mapAppearanceSystem'),
          onPress: () => setMapAppearance('system'),
        },
        {
          text: t('settings.mapAppearanceDark'),
          onPress: () => setMapAppearance('dark'),
        },
        {
          text: t('settings.mapAppearanceLight'),
          onPress: () => setMapAppearance('light'),
        },
        { text: t('common.cancel'), style: 'cancel' },
      ],
      { cancelable: true },
    );
  };

  const handleLogout = () => {
    Alert.alert(t('settings.signOutTitle'), t('settings.signOutMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.signOut'),
        style: 'destructive',
        onPress: clearAuth,
      },
    ]);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.settingsItem}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('EditProfile')}
        >
          <Ionicons name="person-outline" size={20} color={colors.textSecondary} />
          <Text style={styles.settingsLabel}>{t('settings.editProfile')}</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity
          style={styles.settingsItem}
          activeOpacity={0.7}
          onPress={pickLanguage}
        >
          <Ionicons name="language-outline" size={20} color={colors.textSecondary} />
          <Text style={styles.settingsLabel}>{t('settings.language')}</Text>
          <Text style={styles.settingsValue}>{languageDisplay}</Text>
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity
          style={styles.settingsItem}
          activeOpacity={0.7}
          onPress={pickMapAppearance}
        >
          <Ionicons name="map-outline" size={20} color={colors.textSecondary} />
          <Text style={styles.settingsLabel}>{t('settings.mapAppearance')}</Text>
          <Text style={styles.settingsValue}>{mapAppearanceDisplay}</Text>
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity style={styles.settingsItem} activeOpacity={0.7}>
          <Ionicons name="notifications-outline" size={20} color={colors.textSecondary} />
          <Text style={styles.settingsLabel}>{t('settings.notifications')}</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity style={styles.settingsItem} activeOpacity={0.7}>
          <Ionicons name="help-circle-outline" size={20} color={colors.textSecondary} />
          <Text style={styles.settingsLabel}>{t('settings.help')}</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.logoutButton}
        onPress={handleLogout}
        activeOpacity={0.8}
      >
        <Ionicons name="log-out-outline" size={20} color={colors.error} />
        <Text style={styles.logoutText}>{t('settings.signOut')}</Text>
      </TouchableOpacity>
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
    paddingBottom: 40,
    gap: spacing.lg,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
    backgroundColor: colors.surface,
  },
  settingsLabel: {
    ...typography.body,
    flex: 1,
  },
  settingsValue: {
    ...typography.bodySmall,
    color: colors.textMuted,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: spacing.md + 20 + spacing.md,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.error + '44',
    backgroundColor: colors.error + '11',
  },
  logoutText: {
    color: colors.error,
    fontSize: 15,
    fontWeight: '600',
  },
});
