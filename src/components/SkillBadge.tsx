import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from '../i18n';
import { colors, borderRadius } from '../theme';
import type { SkillLevel } from '../types';

interface Props {
  level: SkillLevel;
  small?: boolean;
  /**
   * Profil : pilule un peu plus grande, alignée à gauche avec le titre « Niveau ».
   * Listes / fiches : taille par défaut ou `small`.
   */
  centered?: boolean;
}

const skillColors: Record<SkillLevel, string> = {
  beginner: colors.skillBeginner,
  intermediate: colors.skillIntermediate,
  advanced: colors.skillAdvanced,
};

const skillKeys: Record<
  SkillLevel,
  'auth.skills.beginner' | 'auth.skills.intermediate' | 'auth.skills.advanced'
> = {
  beginner: 'auth.skills.beginner',
  intermediate: 'auth.skills.intermediate',
  advanced: 'auth.skills.advanced',
};

export function SkillBadge({ level, small = false, centered = false }: Props) {
  const { t } = useTranslation();
  const label = t(skillKeys[level]);
  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: skillColors[level] + '22',
          borderColor: skillColors[level] + '66',
        },
        small && styles.badgeSmall,
        centered ? styles.badgeProfileCard : styles.badgeAlignStart,
      ]}
    >
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={
          small ? 0.68 : centered ? 0.82 : 0.72
        }
        style={[
          styles.text,
          { color: skillColors[level] },
          small && styles.textSmall,
          centered && styles.textProfileCard,
          centered && styles.textProfileCardAlign,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  /** Taille « liste / carte match » (comme avant les grossissements). */
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    maxWidth: '100%',
  },
  badgeAlignStart: {
    alignSelf: 'flex-start',
  },
  /** Profil : pilule alignée à gauche (avec la colonne `alignItems: 'flex-start'`). */
  badgeProfileCard: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
  textSmall: {
    fontSize: 10,
    fontWeight: '600',
  },
  textProfileCard: {
    fontSize: 14,
    fontWeight: '600',
  },
  textProfileCardAlign: {
    textAlign: 'center',
  },
});
