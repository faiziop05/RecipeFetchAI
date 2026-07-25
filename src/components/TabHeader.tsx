import React from "react";
import { StyleSheet, View, Text } from "react-native";
import { useSelector } from "react-redux";

import { RootState } from "@/store";
import { ThemeColors, Typography, Spacing } from "@/theme/colors";

interface TabHeaderProps {
  title: string;
  subtitle?: string;
  rightElement?: React.ReactNode;
}

export function TabHeader({ title, subtitle, rightElement }: TabHeaderProps) {
  const mode = useSelector((state: RootState) => state.theme.mode);
  const colors = ThemeColors[mode];

  return (
    <View style={[styles.header, { backgroundColor: colors.background }]}>
      <View style={styles.titleContainer}>
        {subtitle ? (
          <Text style={[Typography.overline, styles.subtitle, { color: colors.textTertiary }]}>
            {subtitle}
          </Text>
        ) : null}
        <Text style={[Typography.screenTitle, { color: colors.textPrimary }]}>
          {title}
        </Text>
      </View>
      {rightElement ? <View style={styles.rightContainer}>{rightElement}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    minHeight: 72,
  },
  titleContainer: {
    flexDirection: "column",
    justifyContent: "flex-end",
    flex: 1,
  },
  subtitle: {
    marginBottom: 2,
  },
  rightContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginLeft: Spacing.md,
  },
});
