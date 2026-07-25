import React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

interface RecipeHeaderProps {
  onBack: () => void;
  onToggleBookmark: () => void;
  isPinned: boolean;
  isSaveLoading: boolean;
  colors: any;
  mode: string;
}

export const RecipeHeader: React.FC<RecipeHeaderProps> = ({
  onBack,
  onToggleBookmark,
  isPinned,
  isSaveLoading,
  colors,
  mode,
}) => {
  return (
    <View
      style={[
        styles.headerBar,
        {
          borderBottomColor: colors.border,
          backgroundColor: colors.background,
        },
      ]}
    >
      <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
        <Ionicons name="chevron-back" size={20} color={colors.primaryAccent} />
        <Text style={[styles.backText, { color: colors.textPrimary }]}>Back</Text>
      </TouchableOpacity>

      <Text style={[styles.headerTitle, { color: colors.textSecondary }]}>
        RECIPE WORKSPACE
      </Text>

      <TouchableOpacity
        onPress={onToggleBookmark}
        disabled={isSaveLoading}
        style={styles.bookmarkBtn}
        activeOpacity={0.7}
      >
        {isSaveLoading ? (
          <ActivityIndicator size="small" color={colors.primaryAccent} />
        ) : (
          <Ionicons
            name={isPinned ? "bookmark" : "bookmark-outline"}
            size={22}
            color={colors.primaryAccent}
          />
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 54,
    borderBottomWidth: 1,
    paddingHorizontal: 16,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minWidth: 70,
  },
  backText: {
    fontSize: 14,
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
    textAlign: "center",
  },
  bookmarkBtn: {
    minWidth: 70,
    alignItems: "flex-end",
  },
});
