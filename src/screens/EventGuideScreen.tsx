import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { MatchesStackParamList } from "../navigation/types";
import { useMatch } from "../hooks/useMatches";
import { useTranslation } from "../i18n";
import { isTournamentMatch } from "../utils/matchDisplay";
import { colors, spacing, borderRadius, typography } from "../theme";
import { useBottomInset } from "../hooks/useBottomInset";

type Props = NativeStackScreenProps<MatchesStackParamList, "EventGuide">;

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

export function EventGuideScreen({ route }: Props) {
  const { matchId } = route.params;
  const { t } = useTranslation();
  const bottomInset = useBottomInset();
  const { data: match } = useMatch(matchId);
  const tournament = match ? isTournamentMatch(match) : false;

  const sections = tournament
    ? [
        {
          icon: "information-circle-outline",
          title: t("match.guideOverviewTitle"),
          body: t("match.guideTournamentOverview"),
        },
        {
          icon: "people-outline",
          title: t("match.guideTeamsTitle"),
          body: t("match.guideTournamentTeams"),
        },
        {
          icon: "trophy-outline",
          title: t("match.guideScoreTitle"),
          body: t("match.guideTournamentScore"),
        },
        {
          icon: "grid-outline",
          title: t("match.guideCourtsTitle"),
          body: t("match.guideTournamentCourts"),
        },
        {
          icon: "lock-closed-outline",
          title: t("match.guideLockTitle"),
          body: t("match.guideTournamentLock"),
        },
        {
          icon: "alert-circle-outline",
          title: t("match.guideEdgeCasesTitle"),
          body: t("match.guideTournamentEdgeCases"),
        },
        {
          icon: "shield-outline",
          title: t("match.guideOrganizerTitle"),
          body: t("match.guideTournamentOrganizer"),
        },
      ]
    : [
        {
          icon: "information-circle-outline",
          title: t("match.guideOverviewTitle"),
          body: t("match.guideMatchOverview"),
        },
        {
          icon: "people-outline",
          title: t("match.guideTeamsTitle"),
          body: t("match.guideMatchTeams"),
        },
        {
          icon: "trophy-outline",
          title: t("match.guideScoreTitle"),
          body: t("match.guideMatchScore"),
        },
        {
          icon: "alert-circle-outline",
          title: t("match.guideEdgeCasesTitle"),
          body: t("match.guideMatchEdgeCases"),
        },
        {
          icon: "shield-outline",
          title: t("match.guideOrganizerTitle"),
          body: t("match.guideMatchOrganizer"),
        },
      ];

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
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  sectionBody: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
    marginLeft: 24,
  },
});
