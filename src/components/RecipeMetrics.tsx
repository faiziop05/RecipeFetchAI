import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

interface RecipeMetricsProps {
  prepTime: string;
  calories: string | number;
  totalProtein?: string;
  totalCarbs?: string;
  totalFats?: string;
  colors: any;
}

export const RecipeMetrics: React.FC<RecipeMetricsProps> = ({
  prepTime,
  calories,
  totalProtein,
  totalCarbs,
  totalFats,
  colors,
}) => {
  return (
    <View style={styles.metricsContainer}>
      {/* Row 1: Core Info (Prep Time & Calories) */}
      <View style={styles.metricsRow}>
        <View style={[styles.coreMetricPill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="time-outline" size={16} color={colors.primaryAccent} style={{ marginRight: 8 }} />
          <View style={styles.coreMetricTextContainer}>
            <Text style={[styles.coreMetricValue, { color: colors.textPrimary }]}>{prepTime}</Text>
            <Text style={[styles.coreMetricLabel, { color: colors.textSecondary }]}>Prep Time</Text>
          </View>
        </View>

        <View
          style={[
            styles.coreMetricPill,
            styles.highlightedPill,
            { backgroundColor: colors.surface, borderColor: colors.primaryAccent },
          ]}
        >
          <Ionicons name="flame" size={16} color={colors.primaryAccent} style={{ marginRight: 8 }} />
          <View style={styles.coreMetricTextContainer}>
            <Text style={[styles.coreMetricValue, { color: colors.textPrimary }]}>{calories}</Text>
            <Text style={[styles.coreMetricLabel, { color: colors.textSecondary }]}>Calories</Text>
          </View>
        </View>
      </View>

      {/* Row 2: Macros (Protein, Carbs, Fats) */}
      <View style={styles.metricsRow}>
        <View style={[styles.macroMetricPill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="barbell-outline" size={14} color={colors.textSecondary} style={{ marginBottom: 4 }} />
          <Text style={[styles.macroValue, { color: colors.textPrimary }]}>{totalProtein || "—"}</Text>
          <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>Protein</Text>
        </View>

        <View style={[styles.macroMetricPill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="nutrition-outline" size={14} color={colors.textSecondary} style={{ marginBottom: 4 }} />
          <Text style={[styles.macroValue, { color: colors.textPrimary }]}>{totalCarbs || "—"}</Text>
          <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>Carbs</Text>
        </View>

        <View style={[styles.macroMetricPill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="water-outline" size={14} color={colors.textSecondary} style={{ marginBottom: 4 }} />
          <Text style={[styles.macroValue, { color: colors.textPrimary }]}>{totalFats || "—"}</Text>
          <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>Fats</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  metricsContainer: {
    width: "100%",
    gap: 8,
    marginTop: 4,
  },
  metricsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    gap: 8,
  },
  coreMetricPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  highlightedPill: {
    borderWidth: 1.5,
  },
  coreMetricTextContainer: {
    flex: 1,
    justifyContent: "center",
  },
  coreMetricValue: {
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 18,
  },
  coreMetricLabel: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginTop: 2,
  },
  macroMetricPill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  macroValue: {
    fontSize: 14,
    fontWeight: "800",
    marginTop: 2,
  },
  macroLabel: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginTop: 1,
  },
});
