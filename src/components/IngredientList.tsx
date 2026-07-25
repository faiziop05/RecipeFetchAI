import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Ingredient } from "@/store/recipeSlice";

interface IngredientListProps {
  ingredients: Ingredient[];
  checkedIngredients: Record<string, boolean>;
  onToggleCheck: (name: string) => void;
  onOpenDeepDive: (ingredient: Ingredient) => void;
  colors: any;
}

export const IngredientList: React.FC<IngredientListProps> = ({
  ingredients,
  checkedIngredients,
  onToggleCheck,
  onOpenDeepDive,
  colors,
}) => {
  return (
    <>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="list-outline" size={18} color={colors.textSecondary} />
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Ingredients</Text>
          <View style={[styles.sectionHintBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="information-circle-outline" size={11} color={colors.textSecondary} />
            <Text style={[styles.sectionHintText, { color: colors.textSecondary }]}>tap name for nutrition</Text>
          </View>
        </View>
      </View>

      {ingredients.map((item, index) => {
        const isChecked = checkedIngredients[item.name] || false;
        return (
          <View
            key={index}
            style={[
              styles.ingredientRow,
              { backgroundColor: colors.surface, borderColor: colors.border },
              isChecked && { opacity: 0.45 },
            ]}
          >
            <TouchableOpacity onPress={() => onToggleCheck(item.name)} style={styles.checkboxContainer}>
              <Ionicons
                name={isChecked ? "checkmark-circle" : "ellipse-outline"}
                size={22}
                color={isChecked ? colors.primaryAccent : colors.textSecondary}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => onOpenDeepDive(item)}
              style={styles.ingredientTextContainer}
              activeOpacity={0.7}
            >
              <View style={styles.ingredientNameRow}>
                <Text style={[styles.ingredientName, { color: colors.textPrimary }, isChecked && styles.strikethrough]}>
                  {item.name}
                </Text>
                <Ionicons name="chevron-forward" size={12} color={colors.primaryAccent} style={{ marginLeft: 4, marginTop: 2 }} />
              </View>
              <Text style={[styles.ingredientAmount, { color: colors.textSecondary }]}>{item.amount}</Text>
            </TouchableOpacity>
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
  sectionHintBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    marginLeft: "auto",
  },
  sectionHintText: {
    fontSize: 10,
    fontWeight: "500",
  },
  ingredientRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  checkboxContainer: {
    marginRight: 10,
  },
  ingredientTextContainer: {
    flex: 1,
  },
  ingredientNameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  ingredientName: {
    fontSize: 15,
    fontWeight: "600",
  },
  ingredientAmount: {
    fontSize: 13,
    marginTop: 2,
  },
  strikethrough: {
    textDecorationLine: "line-through",
  },
});
