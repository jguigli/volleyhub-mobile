import React, { useLayoutEffect, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
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

function PasswordRule({ ok, label }: { ok: boolean; label: string }) {
  return (
    <View style={ruleStyles.row}>
      <Ionicons
        name={ok ? 'checkmark-circle' : 'ellipse-outline'}
        size={14}
        color={ok ? colors.success : colors.textMuted}
      />
      <Text style={[ruleStyles.text, ok && ruleStyles.textOk]}>{label}</Text>
    </View>
  );
}

const ruleStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  text: {
    fontSize: 12,
    color: colors.textMuted,
  },
  textOk: {
    color: colors.success,
  },
});

const PASSWORD_RULES = {
  minLength: (p: string) => p.length >= 8,
  uppercase: (p: string) => /[A-Z]/.test(p),
  lowercase: (p: string) => /[a-z]/.test(p),
  digit: (p: string) => /\d/.test(p),
  special: (p: string) => /[^A-Za-z0-9]/.test(p),
};

export function RegisterScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [skillLevel, setSkillLevel] = useState<SkillLevel>('beginner');
  const [position, setPosition] = useState<Position>('any');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);

  const passwordChecks = {
    minLength: PASSWORD_RULES.minLength(password),
    uppercase: PASSWORD_RULES.uppercase(password),
    lowercase: PASSWORD_RULES.lowercase(password),
    digit: PASSWORD_RULES.digit(password),
    special: PASSWORD_RULES.special(password),
  };
  const passwordValid = Object.values(passwordChecks).every(Boolean);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Pressable
          onPress={() => navigation.navigate('Login')}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={{ padding: 4 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </Pressable>
      ),
    });
  }, [navigation]);

  const handleRegister = async () => {
    if (!username.trim() || !email.trim() || !password.trim()) {
      Alert.alert(t('common.error'), t('auth.fillRequired'));
      return;
    }

    if (!passwordValid) {
      Alert.alert(t('common.error'), t('auth.passwordRulesError'));
      return;
    }

    setLoading(true);
    try {
      const { accessToken, refreshToken, user } = await authApi.register({
        username,
        email,
        password,
        skillLevel,
        position,
      });
      await setAuth(accessToken, refreshToken, user);
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
          <View style={styles.logoWrap}>
            <Image
              source={require('../../assets/logo.png')}
              style={styles.logoImage}
              resizeMode="cover"
              accessible
              accessibilityLabel="VolleyHub Logo"
            />
          </View>
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
          {password.length > 0 ? (
            <View style={styles.passwordRules}>
              <PasswordRule ok={passwordChecks.minLength} label={t('auth.ruleMinLength')} />
              <PasswordRule ok={passwordChecks.uppercase} label={t('auth.ruleUppercase')} />
              <PasswordRule ok={passwordChecks.lowercase} label={t('auth.ruleLowercase')} />
              <PasswordRule ok={passwordChecks.digit} label={t('auth.ruleDigit')} />
              <PasswordRule ok={passwordChecks.special} label={t('auth.ruleSpecial')} />
            </View>
          ) : null}

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
          <View style={styles.pickerShell}>
            <Picker
              selectedValue={position}
              onValueChange={(v) => setPosition(v as Position)}
              style={styles.picker}
              itemStyle={Platform.OS === 'ios' ? styles.pickerItemIOS : undefined}
            >
              {POSITIONS.map((pos) => (
                <Picker.Item
                  key={pos}
                  label={t(`auth.positions.${pos}`)}
                  value={pos}
                />
              ))}
            </Picker>
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
    paddingTop: spacing.xl * 3,
    padding: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoWrap: {
    width: 130,
    height: 130,
    borderRadius: 28,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  logoImage: {
    width: '100%',
    height: '100%',
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
  passwordRules: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xs,
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
  pickerShell: {
    marginTop: spacing.xs,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  picker: {
    ...(Platform.OS === 'ios'
      ? { height: 160 }
      : { color: colors.text, backgroundColor: colors.surface }),
  },
  pickerItemIOS: {
    color: colors.text,
    fontSize: 17,
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
