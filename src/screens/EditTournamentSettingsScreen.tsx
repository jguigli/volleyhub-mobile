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
import { colors, spacing, borderRadius, typography, shadows } from "../theme";
import { useBottomInset } from "../hooks/useBottomInset";
import type { TournamentSystem } from "../types";

type Props = NativeStackScreenProps<MatchesStackParamList, "EditTournamentSettings">;

const SYSTEMS: TournamentSystem[] = ["single_elimination", "pools_finals", "round_robin"];
const VOLLEY_TYPES = ["classic", "beach", "green"] as const;

const TEAM_COUNTS: Record<TournamentSystem, number[]> = {
  single_elimination: [4, 8, 16],
  pools_finals: [6, 8, 10, 12, 14, 16],
  round_robin: [3, 4, 5, 6],
};

const POINTS_OPTIONS = [15, 21, 25];

export function EditTournamentSettingsScreen({ route, navigation }: Props) {
  const { matchId } = route.params;
  const { t } = useTranslation();
  const bottomInset = useBottomInset();
  const { data: match, isLoading } = useMatch(matchId);
  const manageMut = useManageMatch();

  const [system, setSystem] = useState<TournamentSystem | null>(null);
  const [teamCount, setTeamCount] = useState<number | null>(null);
  const [points, setPoints] = useState<number | null>(null);
  const [courts, setCourts] = useState<number | null>(null);
  const [volleyType, setVolleyType] = useState<string | null>(null);
  const [removedTeams, setRemovedTeams] = useState<number[]>([]);
  const [initialized, setInitialized] = useState(false);

  if (isLoading || !match) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!initialized) {
    setSystem(match.tournamentSystem ?? "single_elimination");
    setTeamCount(match.teamCount ?? 4);
    setPoints(match.tournamentPointsPerMatch ?? 21);
    setCourts(match.tournamentCourtCount ?? 1);
    setVolleyType((match as any).volleyType ?? "classic");
    setInitialized(true);
  }

  const currentSystem = system ?? "single_elimination";
  const currentTeamCount = teamCount ?? 4;
  const currentPoints = points ?? 21;
  const currentCourts = courts ?? 1;
  const currentVolleyType = volleyType ?? "classic";

  const volleyTypeLabel = (v: string) => {
    switch (v) {
      case "beach": return t("createMatch.beachVolley");
      case "green": return t("createMatch.greenVolley");
      default: return t("createMatch.classicVolley");
    }
  };

  const validTeamCounts = TEAM_COUNTS[currentSystem];
  const needsTeamCountAdjust = !validTeamCounts.includes(currentTeamCount);

  const systemLabel = (s: TournamentSystem) => {
    switch (s) {
      case "single_elimination": return t("createMatch.tournamentSystemSingleElimTitle");
      case "pools_finals": return t("createMatch.tournamentSystemPoolsTitle");
      case "round_robin": return t("createMatch.tournamentSystemRoundRobinTitle");
    }
  };

  const handleSystemChange = (s: TournamentSystem) => {
    setSystem(s);
    const valid = TEAM_COUNTS[s];
    if (!valid.includes(currentTeamCount)) {
      setTeamCount(valid[0]);
      setRemovedTeams([]);
    }
  };

  const handleTeamCountChange = (newCount: number) => {
    const oldCount = match.teamCount ?? 0;
    if (newCount < oldCount) {
      // Let user pick which teams to remove
      const teamsToRemove: number[] = [];
      for (let i = oldCount - 1; i >= newCount && teamsToRemove.length < oldCount - newCount; i--) {
        teamsToRemove.push(i);
      }
      setRemovedTeams(teamsToRemove);
    } else {
      setRemovedTeams([]);
    }
    setTeamCount(newCount);
  };

  const toggleRemovedTeam = (idx: number) => {
    const oldCount = match.teamCount ?? 0;
    const needed = oldCount - currentTeamCount;
    if (needed <= 0) return;
    setRemovedTeams((prev) => {
      if (prev.includes(idx)) {
        return prev.filter((i) => i !== idx);
      }
      if (prev.length >= needed) {
        return [...prev.slice(1), idx];
      }
      return [...prev, idx];
    });
  };

  const hasChanges =
    system !== match.tournamentSystem ||
    teamCount !== match.teamCount ||
    points !== match.tournamentPointsPerMatch ||
    courts !== match.tournamentCourtCount ||
    volleyType !== (match as any).volleyType;

  const canSave =
    hasChanges &&
    !needsTeamCountAdjust &&
    (currentTeamCount >= (match.teamCount ?? 0) ||
      removedTeams.length === (match.teamCount ?? 0) - currentTeamCount);

  const handleSave = async () => {
    try {
      await manageMut.mutateAsync({
        matchId,
        ...(system !== match.tournamentSystem ? { tournamentSystem: system } : {}),
        ...(teamCount !== match.teamCount ? { teamCount, removedTeamIndices: removedTeams } : {}),
        ...(points !== match.tournamentPointsPerMatch ? { tournamentPointsPerMatch: points } : {}),
        ...(courts !== match.tournamentCourtCount ? { tournamentCourtCount: courts } : {}),
        ...(volleyType !== (match as any).volleyType ? { volleyType } : {}),
      } as any);
      Alert.alert("", t("match.manageSaved"));
      navigation.goBack();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t("match.manageFailed");
      Alert.alert(t("common.error"), msg);
    }
  };

  const showRemoveTeamPicker =
    currentTeamCount < (match.teamCount ?? 0) &&
    (match.teamCount ?? 0) - currentTeamCount > 0;

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

      {/* System */}
      <Text style={styles.sectionTitle}>{t("match.factTournamentSystem")}</Text>
      <View style={styles.chipRow}>
        {SYSTEMS.map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.chip, currentSystem === s && styles.chipActive]}
            onPress={() => handleSystemChange(s)}
          >
            <Text style={[styles.chipText, currentSystem === s && styles.chipTextActive]}>
              {systemLabel(s)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Team count */}
      <Text style={styles.sectionTitle}>{t("match.factTeams")}</Text>
      <View style={styles.chipRow}>
        {validTeamCounts.map((n) => (
          <TouchableOpacity
            key={n}
            style={[styles.chip, currentTeamCount === n && styles.chipActive]}
            onPress={() => handleTeamCountChange(n)}
          >
            <Text style={[styles.chipText, currentTeamCount === n && styles.chipTextActive]}>
              {String(n)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Remove team picker */}
      {showRemoveTeamPicker ? (
        <View style={styles.removeSection}>
          <Text style={styles.removeSectionTitle}>
            {t("match.editTournamentRemoveTeams", {
              count: String((match.teamCount ?? 0) - currentTeamCount),
            })}
          </Text>
          <View style={styles.chipRow}>
            {Array.from({ length: match.teamCount ?? 0 }, (_, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  styles.chip,
                  removedTeams.includes(i) && styles.chipDanger,
                ]}
                onPress={() => toggleRemovedTeam(i)}
              >
                <Text
                  style={[
                    styles.chipText,
                    removedTeams.includes(i) && styles.chipTextDanger,
                  ]}
                >
                  {t("match.teamN", { n: String(i + 1) })}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : null}

      {/* Points */}
      <Text style={styles.sectionTitle}>{t("match.factPointsPerMatch")}</Text>
      <View style={styles.chipRow}>
        {POINTS_OPTIONS.map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.chip, currentPoints === p && styles.chipActive]}
            onPress={() => setPoints(p)}
          >
            <Text style={[styles.chipText, currentPoints === p && styles.chipTextActive]}>
              {String(p)} pts
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Courts */}
      <Text style={styles.sectionTitle}>{t("match.factCourtCount")}</Text>
      <View style={styles.stepperRow}>
        <TouchableOpacity
          style={[styles.stepperBtn, currentCourts <= 1 && styles.stepperBtnDisabled]}
          onPress={() => setCourts(Math.max(1, currentCourts - 1))}
          disabled={currentCourts <= 1}
        >
          <Ionicons name="remove" size={22} color={currentCourts <= 1 ? colors.textMuted : colors.primary} />
        </TouchableOpacity>
        <Text style={styles.stepperValue}>{currentCourts}</Text>
        <TouchableOpacity
          style={[styles.stepperBtn, currentCourts >= 20 && styles.stepperBtnDisabled]}
          onPress={() => setCourts(Math.min(20, currentCourts + 1))}
          disabled={currentCourts >= 20}
        >
          <Ionicons name="add" size={22} color={currentCourts >= 20 ? colors.textMuted : colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Save */}
      <TouchableOpacity
        style={[styles.saveBtn, (!canSave || manageMut.isPending) && styles.saveBtnDisabled]}
        onPress={handleSave}
        disabled={!canSave || manageMut.isPending}
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
  chipDanger: {
    borderColor: colors.error,
    backgroundColor: colors.error + "18",
  },
  chipTextDanger: {
    color: colors.error,
    fontWeight: "700",
  },
  removeSection: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.error + "44",
    backgroundColor: colors.error + "08",
  },
  removeSectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.error,
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  stepperBtnDisabled: {
    borderColor: colors.border,
  },
  stepperValue: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text,
    minWidth: 36,
    textAlign: "center",
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
