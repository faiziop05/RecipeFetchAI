import React from "react";
import { View, ActivityIndicator, StyleSheet, Text } from "react-native";
import { useSelector } from "react-redux";
import Ionicons from "@expo/vector-icons/Ionicons";

import { RootState } from "@/store";
import { ThemeColors } from "@/theme/colors";

export default function Index() {
  const mode = useSelector((state: RootState) => state.theme.mode);
  const colors = ThemeColors[mode];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Brand Icon Circle */}
      <View
        style={[
          styles.logoWrapper,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Ionicons name="sparkles" size={32} color={colors.primaryAccent} />
      </View>

      {/* Typography Block */}
      <View style={styles.brandingBlock}>
        <Text style={[styles.brandTitle, { color: colors.textPrimary }]}>
          RecipeFetch
        </Text>
        <Text style={[styles.brandSubTitle, { color: colors.textSecondary }]}>
          CULINARY KITCHEN ENGINE
        </Text>
      </View>

      {/* Delicate Spinner */}
      <ActivityIndicator
        size="small"
        color={colors.primaryAccent}
        style={styles.loader}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  logoWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  brandingBlock: {
    alignItems: "center",
    marginBottom: 36,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  brandSubTitle: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 2,
    marginTop: 6,
  },
  loader: {
    marginTop: 8,
  },
});
