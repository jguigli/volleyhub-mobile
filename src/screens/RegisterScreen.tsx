import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/types';
import { useAuthStore } from '../store/auth.store';
import { authApi } from '../api/auth.api';
import { useTranslation } from '../i18n';
import { colors, spacing, borderRadius, typography } from '../theme';
import { SkillLevel, Position } from '../types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

const SKILL_LEVELS: SkillLevel[] = ['beginner', 'intermediate', 'advanced'];
const POSITIONS: Position[] = [
  'setter',
  'libero',
  'outside_hitter',
  'opposite_hitter',
  'middle_blocker',
  'any',
];

export function RegisterScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [skillLevel, setSkillLevel] = useState<SkillLevel>('beginner');
  const [position, setPosition] = useState<Position>('any');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);

  const handleRegister = async () => {
    if (!username.trim() || !email.trim() || !password.trim()) {
      Alert.alert(t('common.error'), t('auth.fillRequired'));
      return;
    }

    if (password.length < 8) {
      Alert.alert(t('common.error'), t('auth.passwordMinError'));
      return;
    }

    setLoading(true);
    try {
      const { accessToken, user } = await authApi.register({
        username,
        email,
        password,
        skillLevel,
        position,
      });
      await setAuth(accessToken, user);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : t('auth.registrationFailedGeneric');
      Alert.alert(t('auth.registrationFailed'), message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.logo}>🏐</Text>
          <Text style={styles.title}>{t('auth.createAccountTitle')}</Text>
          <Text style={styles.subtitle}>{t('auth.joinCommunity')}</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>{t('auth.username')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('auth.usernamePlaceholder')}
            placeholderTextColor={colors.textMuted}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />

          <Text style={styles.label}>{t('auth.email')} *</Text>
          <TextInput
            style={styles.input}
            placeholder={t('auth.emailPlaceholder')}
            placeholderTextColor={colors.textMuted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>{t('auth.password')} *</Text>
          <TextInput
            style={styles.input}
            placeholder={t('auth.passwordHint')}
            placeholderTextColor={colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Text style={styles.label}>{t('auth.skillLevel')}</Text>
          <View style={styles.chips}>
            {SKILL_LEVELS.map((level) => (
              <TouchableOpacity
                key={level}
                style={[
                  styles.chip,
                  skillLevel === level && styles.chipSelected,
                ]}
                onPress={() => setSkillLevel(level)}
              >
                <Text
                  style={[
                    styles.chipText,
                    skillLevel === level && styles.chipTextSelected,
                  ]}
                >
                  {t(`auth.skills.${level}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>{t('auth.position')}</Text>
          <View style={styles.chips}>
            {POSITIONS.map((pos) => (
              <TouchableOpacity
                key={pos}
                style={[styles.chip, position === pos && styles.chipSelected]}
                onPress={() => setPosition(pos)}
              >
                <Text
                  style={[
                    styles.chipText,
                    position === pos && styles.chipTextSelected,
                  ]}
                >
                  {t(`auth.positions.${pos}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.buttonText}>{t('auth.createAccount')}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('Login')}
            style={styles.link}
          >
            <Text style={styles.linkText}>
              {t('auth.haveAccount')}{' '}
              <Text style={styles.linkBold}>{t('auth.logIn')}</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logo: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.h1,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  form: {
    gap: 2,
  },
  label: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: 4,
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.text,
    fontSize: 16,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: colors.white,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    ...typography.button,
    color: colors.white,
    fontSize: 16,
  },
  link: {
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  linkText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  linkBold: {
    color: colors.primary,
    fontWeight: '600',
  },
});
