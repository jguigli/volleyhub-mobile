import React, { useCallback, useState } from 'react';
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
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';
import { ProfileStackParamList } from '../navigation/types';
import { useAuthStore } from '../store/auth.store';
import { usersApi } from '../api/users.api';
import { USERS_KEY } from '../hooks/useUsers';
import { SkillBadge } from '../components/SkillBadge';
import { useTranslation } from '../i18n';
import { colors, spacing, borderRadius, typography } from '../theme';
import { useBottomInset } from '../hooks/useBottomInset';
import type { League, SkillLevel, Position, User } from '../types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'EditProfile'>;

const SKILL_LEVELS: SkillLevel[] = ['beginner', 'intermediate', 'advanced'];
const POSITIONS: Position[] = [
  'setter',
  'libero',
  'outside_hitter',
  'opposite_hitter',
  'middle_blocker',
  'any',
];

const LEAGUE_NONE = 'none' as const;

const LEAGUE_VALUES: League[] = [
  'departmental',
  'regional',
  'pre_national',
  'national',
  'professional',
];

type AvatarEdit = 'unchanged' | 'new' | 'cleared';

function applyUserToForm(user: User) {
  return {
    username: user.username,
    skillLevel: user.skillLevel,
    position: user.position,
    club: user.club ?? '',
    bio: user.bio ?? '',
    leaguePicker: (user.league ?? LEAGUE_NONE) as League | typeof LEAGUE_NONE,
  };
}

export function EditProfileScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const bottomInset = useBottomInset();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);

  const [username, setUsername] = useState('');
  const [skillLevel, setSkillLevel] = useState<SkillLevel>('beginner');
  const [position, setPosition] = useState<Position>('any');
  const [club, setClub] = useState('');
  const [bio, setBio] = useState('');
  const [leaguePicker, setLeaguePicker] = useState<League | typeof LEAGUE_NONE>(
    LEAGUE_NONE,
  );
  const [avatarEdit, setAvatarEdit] = useState<AvatarEdit>('unchanged');
  const [newAvatarUri, setNewAvatarUri] = useState<string | null>(null);
  const [newAvatarDataUrl, setNewAvatarDataUrl] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (user) {
        const f = applyUserToForm(user);
        setUsername(f.username);
        setSkillLevel(f.skillLevel);
        setPosition(f.position);
        setClub(f.club);
        setBio(f.bio);
        setLeaguePicker(f.leaguePicker);
        setAvatarEdit('unchanged');
        setNewAvatarUri(null);
        setNewAvatarDataUrl(null);
      }
    }, [user]),
  );

  const pickProfilePhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t('common.error'), t('profile.photoPermissionDenied'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.65,
      base64: true,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    if (!asset.base64) {
      Alert.alert(t('common.error'), t('profile.photoLoadFailed'));
      return;
    }

    const mime = asset.mimeType ?? 'image/jpeg';
    setNewAvatarUri(asset.uri);
    setNewAvatarDataUrl(`data:${mime};base64,${asset.base64}`);
    setAvatarEdit('new');
  };

  const clearProfilePhoto = () => {
    setNewAvatarUri(null);
    setNewAvatarDataUrl(null);
    setAvatarEdit('cleared');
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload: Parameters<typeof usersApi.updateMe>[0] = {
        username: username.trim(),
        skillLevel,
        position,
        club: club.trim(),
        bio: bio.trim(),
        competition: '',
        league: leaguePicker === LEAGUE_NONE ? null : leaguePicker,
      };

      if (avatarEdit === 'new' && newAvatarDataUrl) {
        payload.profilePicture = newAvatarDataUrl;
      } else if (avatarEdit === 'cleared') {
        payload.profilePicture = '';
      }

      return usersApi.updateMe(payload);
    },
    onSuccess: (updated) => {
      const current = useAuthStore.getState().user;
      if (current) {
        updateUser({
          ...current,
          ...updated,
          email: updated.email ?? current.email,
          username: updated.username ?? current.username,
          skillLevel: updated.skillLevel ?? current.skillLevel,
          position: updated.position ?? current.position,
          club: updated.club ?? null,
          competition: updated.competition ?? null,
          league: updated.league ?? null,
          profilePicture: updated.profilePicture ?? null,
          bio: updated.bio ?? null,
        });
      }
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: [USERS_KEY, user.id] });
      }
      Alert.alert('', t('profile.updateSuccess'), [
        { text: t('common.done'), onPress: () => navigation.goBack() },
      ]);
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error ? err.message : t('profile.updateFailed');
      Alert.alert(t('common.error'), message);
    },
  });

  const handleSave = () => {
    if (!username.trim()) {
      Alert.alert(t('common.error'), t('auth.fillRequired'));
      return;
    }
    saveMutation.mutate();
  };

  if (!user) {
    return null;
  }

  const saving = saveMutation.isPending;

  const displayAvatarUri =
    avatarEdit === 'new' && newAvatarUri
      ? newAvatarUri
      : avatarEdit === 'cleared'
        ? null
        : user.profilePicture;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomInset }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.label, styles.labelFirst]}>{t('profile.profilePhoto')}</Text>
        <View style={styles.avatarRow}>
          <View style={styles.avatarWrap}>
            {displayAvatarUri ? (
              <Image source={{ uri: displayAvatarUri }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>
                  {username.trim()[0]?.toUpperCase() ?? user.username[0]?.toUpperCase() ?? '?'}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.avatarActions}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={pickProfilePhoto}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryButtonText}>{t('profile.changePhoto')}</Text>
            </TouchableOpacity>
            {(displayAvatarUri || avatarEdit === 'new') && (
              <TouchableOpacity
                style={styles.textLink}
                onPress={clearProfilePhoto}
                activeOpacity={0.7}
              >
                <Text style={styles.textLinkLabel}>{t('profile.removePhoto')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <Text style={styles.label}>{t('auth.username')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('auth.usernamePlaceholder')}
          placeholderTextColor={colors.textMuted}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={styles.label}>{t('auth.email')}</Text>
        <View style={styles.readonlyBox}>
          <Text style={styles.readonlyText}>{user.email}</Text>
        </View>
        <Text style={styles.hint}>{t('profile.emailReadOnly')}</Text>

        <Text style={styles.label}>{t('profile.bio')}</Text>
        <TextInput
          style={[styles.input, styles.bioInput]}
          placeholder={t('profile.bioPlaceholder')}
          placeholderTextColor={colors.textMuted}
          value={bio}
          onChangeText={setBio}
          multiline
          maxLength={2000}
          textAlignVertical="top"
        />

        <Text style={styles.label}>{t('auth.skillLevel')}</Text>
        <View style={styles.skillBadgeRow}>
          {SKILL_LEVELS.map((level) => (
            <Pressable
              key={level}
              style={[
                styles.skillBadgePressable,
                skillLevel !== level && styles.skillBadgePressableInactive,
              ]}
              onPress={() => setSkillLevel(level)}
              accessibilityRole="button"
              accessibilityState={{ selected: skillLevel === level }}
            >
              <SkillBadge level={level} />
            </Pressable>
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

        <Text style={styles.label}>{t('profile.club')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('profile.clubPlaceholder')}
          placeholderTextColor={colors.textMuted}
          value={club}
          onChangeText={setClub}
          maxLength={200}
        />

        <Text style={styles.label}>{t('profile.competition')}</Text>
        <View style={styles.pickerShell}>
          <Picker
            selectedValue={leaguePicker}
            onValueChange={(v) =>
              setLeaguePicker(v as League | typeof LEAGUE_NONE)
            }
            style={styles.picker}
            itemStyle={Platform.OS === 'ios' ? styles.pickerItemIOS : undefined}
          >
            <Picker.Item
              label={t('profile.competitionsNone')}
              value={LEAGUE_NONE}
            />
            {LEAGUE_VALUES.map((v) => (
              <Picker.Item
                key={v}
                label={t(`profile.leagues.${v}`)}
                value={v}
              />
            ))}
          </Picker>
        </View>

        <TouchableOpacity
          style={[styles.button, saving && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.buttonText}>{t('profile.saveChanges')}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const AVATAR = 88;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    padding: spacing.md,
  },
  label: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: 4,
    marginTop: spacing.md,
  },
  labelFirst: {
    marginTop: 0,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  avatarWrap: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    flex: 1,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.white,
  },
  avatarActions: {
    flex: 1,
    gap: spacing.sm,
  },
  secondaryButton: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  textLink: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  textLinkLabel: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
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
  bioInput: {
    minHeight: 100,
    paddingTop: spacing.md,
  },
  readonlyBox: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  readonlyText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  hint: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginTop: 4,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  skillBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  skillBadgePressable: {
    borderRadius: borderRadius.full,
  },
  skillBadgePressableInactive: {
    opacity: 0.65,
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
});
