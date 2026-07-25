import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { getRecipeEmoji } from "@/utils/emoji";

interface RecipeHeroCardProps {
  title: string;
  colors: any;
  mode: string;
}

export const RecipeHeroCard: React.FC<RecipeHeroCardProps> = ({ title, colors, mode }) => {
  return (
    <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* Emoji Badge */}
      <View
        style={[
          styles.emojiContainer,
          {
            backgroundColor: colors.background,
            borderColor: colors.border,
          },
        ]}
      >
        <Text style={styles.heroEmoji}>{getRecipeEmoji(title)}</Text>
      </View>

      {/* Recipe Title & Badge Row */}
      <View style={styles.heroTitleArea}>
        <View style={[styles.recipeBadge, { backgroundColor: colors.primaryAccent }]}>
          <Text style={[styles.recipeBadgeText, { color: mode === "light" ? "#FFFFFF" : "#000000" }]}>
            ✨ AI Scanned
          </Text>
        </View>
        <Text style={[styles.recipeTitle, { color: colors.textPrimary }]}>{title}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  heroCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginBottom: 20,
    alignItems: "center",
  },
  emojiContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  heroEmoji: {
    fontSize: 40,
  },
  heroTitleArea: {
    alignItems: "center",
    marginBottom: 18,
    gap: 8,
  },
  recipeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  recipeBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  recipeTitle: {
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 28,
  },
});
