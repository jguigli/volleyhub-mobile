import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { MatchesStackParamList } from "../navigation/types";
import { useManageMatch, useMatch } from "../hooks/useMatches";
import { useTranslation } from "../i18n";
import { colors, spacing, borderRadius, typography } from "../theme";
import { useBottomInset } from "../hooks/useBottomInset";

type Props = NativeStackScreenProps<MatchesStackParamList, "EditMatchSettings">;

const SETS_OPTIONS = [3, 5];
const POINTS_OPTIONS = [15, 21, 25];
const VOLLEY_TYPES = ["classic", "beach", "green"] as const;

export function EditMatchSettingsScreen({ route, navigation }: Props) {
  const { matchId } = route.params;
  const { t } = useTranslation();
  const bottomInset = useBottomInset();
  const { data: match, isLoading } = useMatch(matchId);
  const manageMut = useManageMatch();

  const [matchSets, setMatchSets] = useState<number | null>(null);
  const [pointsToWin, setPointsToWin] = useState<number | null>(null);
  const [volleyType, setVolleyType] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  if (isLoading || !match) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!initialized) {
    setMatchSets(match.matchSets ?? 5);
    setPointsToWin(match.pointsToWin ?? 25);
    setVolleyType((match as any).volleyType ?? "classic");
    setInitialized(true);
  }

  const currentSets = matchSets ?? 5;
  const currentPoints = pointsToWin ?? 25;
  const currentVolleyType = volleyType ?? "classic";

  const volleyTypeLabel = (v: string) => {
    switch (v) {
      case "beach": return t("createMatch.beachVolley");
      case "green": return t("createMatch.greenVolley");
      default: return t("createMatch.classicVolley");
    }
  };

  const hasChanges =
    matchSets !== match.matchSets ||
    pointsToWin !== match.pointsToWin ||
    volleyType !== (match as any).volleyType;

  const handleSave = async () => {
    try {
      await manageMut.mutateAsync({
        matchId,
        ...(matchSets !== match.matchSets ? { matchSets } : {}),
        ...(pointsToWin !== match.pointsToWin ? { pointsToWin } : {}),
        ...(volleyType !== (match as any).volleyType ? { volleyType } : {}),
      } as any);
      Alert.alert("", t("match.manageSaved"));
      navigation.goBack();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t("match.manageFailed");
      Alert.alert(t("common.error"), msg);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: bottomInset }]}
    >
      {/* Volley type */}
      <Text style={styles.sectionTitle}>{t("match.factVolleyType")}</Text>
      <View style={styles.chipRow}>
        {VOLLEY_TYPES.map((v) => (
          <TouchableOpacity
            key={v}
            style={[styles.chip, currentVolleyType === v && styles.chipActive]}
            onPress={() => setVolleyType(v)}
          >
            <Text style={[styles.chipText, currentVolleyType === v && styles.chipTextActive]}>
              {volleyTypeLabel(v)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Sets */}
      <Text style={styles.sectionTitle}>{t("match.factSets")}</Text>
      <View style={styles.chipRow}>
        {SETS_OPTIONS.map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.chip, currentSets === s && styles.chipActive]}
            onPress={() => setMatchSets(s)}
          >
            <Text style={[styles.chipText, currentSets === s && styles.chipTextActive]}>
              {String(s)} sets
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Points to win */}
      <Text style={styles.sectionTitle}>{t("match.factPointsToWin")}</Text>
      <View style={styles.chipRow}>
        {POINTS_OPTIONS.map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.chip, currentPoints === p && styles.chipActive]}
            onPress={() => setPointsToWin(p)}
          >
            <Text style={[styles.chipText, currentPoints === p && styles.chipTextActive]}>
              {String(p)} pts
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Save */}
      <TouchableOpacity
        style={[styles.saveBtn, (!hasChanges || manageMut.isPending) && styles.saveBtnDisabled]}
        onPress={handleSave}
        disabled={!hasChanges || manageMut.isPending}
      >
        {manageMut.isPending ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text style={styles.saveBtnText}>{t("match.saveManage")}</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.white,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: "center",
    marginTop: spacing.md,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { ...typography.button, color: colors.white, fontSize: 16 },
});
