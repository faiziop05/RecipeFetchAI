import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  StyleProp,
  StyleSheet,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { useSelector } from "react-redux";

import { RootState } from "@/store";
import { Radius, ThemeColors } from "@/theme/colors";

interface CardContainerProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  gradient?: readonly [string, string, ...string[]];
  variant?: "elevated" | "outlined" | "filled" | "ghost";
  onPress?: () => void;
  activeOpacity?: number;
  disabled?: boolean;
}

export const CardContainer: React.FC<CardContainerProps> = ({
  children,
  style,
  gradient,
  variant = "elevated",
  onPress,
  activeOpacity = 0.7,
  disabled = false,
}) => {
  const mode = useSelector((state: RootState) => state.theme.mode);
  const colors = ThemeColors[mode];

  const variantStyles: ViewStyle = (() => {
    switch (variant) {
      case "outlined":
        return {
          backgroundColor: "transparent",
          borderWidth: 1,
          borderColor: colors.border,
        };
      case "filled":
        return {
          backgroundColor: colors.surfaceSecondary,
          borderWidth: 0,
        };
      case "ghost":
        return {
          backgroundColor: "transparent",
          borderWidth: 0,
        };
      case "elevated":
      default:
        return {
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          ...colors.cardShadow,
        };
    }
  })();

  const cardStyles = [styles.card, variantStyles, style];

  if (gradient) {
    const content = (
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={cardStyles as any}
      >
        {children}
      </LinearGradient>
    );

    if (onPress) {
      return (
        <TouchableOpacity
          activeOpacity={activeOpacity}
          onPress={onPress}
          disabled={disabled}
        >
          {content}
        </TouchableOpacity>
      );
    }
    return content;
  }

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={activeOpacity}
        onPress={onPress}
        disabled={disabled}
        style={cardStyles as any}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyles as any}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    padding: 16,
  },
});
