import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

interface InstructionListProps {
  instructions: string[];
  ingredients: Array<{ name: string }>;
  checkedIngredients: Record<string, boolean>;
  colors: any;
  mode: string;
}

export const InstructionList: React.FC<InstructionListProps> = ({
  instructions,
  ingredients,
  checkedIngredients,
  colors,
  mode,
}) => {
  return (
    <>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="restaurant-outline" size={18} color={colors.textSecondary} />
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Instructions</Text>
        </View>
      </View>

      {instructions.map((step, index) => {
        const isLastStep = index === instructions.length - 1;

        // Highlight ingredient names that appear in this step
        const highlightedSegments = (() => {
          const allIngredients = ingredients.map((i) => i.name);
          let remaining = step;
          const segments: Array<{ text: string; isIngredient: boolean; isChecked: boolean }> = [];
          while (remaining.length > 0) {
            let earliestIdx = -1;
            let earliestName = "";
            for (const name of allIngredients) {
              const idx = remaining.toLowerCase().indexOf(name.toLowerCase());
              if (idx !== -1 && (earliestIdx === -1 || idx < earliestIdx)) {
                earliestIdx = idx;
                earliestName = name;
              }
            }
            if (earliestIdx === -1) {
              segments.push({ text: remaining, isIngredient: false, isChecked: false });
              break;
            }
            if (earliestIdx > 0) {
              segments.push({ text: remaining.slice(0, earliestIdx), isIngredient: false, isChecked: false });
            }
            const checked = checkedIngredients[earliestName] || false;
            segments.push({
              text: remaining.slice(earliestIdx, earliestIdx + earliestName.length),
              isIngredient: true,
              isChecked: checked,
            });
            remaining = remaining.slice(earliestIdx + earliestName.length);
          }
          return segments;
        })();

        return (
          <View key={index} style={styles.instructionStepContainer}>
            {/* Timeline Connector Line */}
            {!isLastStep && <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />}

            <View style={[styles.stepNumberBadge, { backgroundColor: colors.primaryAccent }]}>
              <Text style={[styles.stepNumberText, { color: mode === "light" ? "#FFFFFF" : "#000000" }]}>
                {index + 1}
              </Text>
            </View>
            <View style={styles.stepContentContainer}>
              <Text style={[styles.instructionStepText, { color: colors.textPrimary }]}>
                {highlightedSegments.map((seg, si) =>
                  seg.isIngredient ? (
                    <Text
                      key={si}
                      style={[
                        styles.instructionIngredientHighlight,
                        { color: colors.primaryAccent },
                        seg.isChecked && styles.strikethrough,
                      ]}
                    >
                      {seg.text}
                    </Text>
                  ) : (
                    <Text key={si}>{seg.text}</Text>
                  )
                )}
              </Text>
            </View>
          </View>
        );
      })}
    </>
  );
};

const styles = StyleSheet.create({
  sectionHeader: {
    marginTop: 16,
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  instructionStepContainer: {
    flexDirection: "row",
    marginBottom: 16,
    gap: 12,
  },
  timelineLine: {
    position: "absolute",
    left: 13,
    top: 28,
    bottom: -16,
    width: 2,
  },
  stepNumberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  stepNumberText: {
    fontWeight: "700",
    fontSize: 14,
  },
  stepContentContainer: {
    flex: 1,
    paddingTop: 3,
  },
  instructionStepText: {
    fontSize: 15,
    lineHeight: 24,
  },
  instructionIngredientHighlight: {
    fontWeight: "700",
  },
  strikethrough: {
    textDecorationLine: "line-through",
  },
});
