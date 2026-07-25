import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";

const { width } = Dimensions.get("window");

interface Slide {
  label: string;
  title: string;
  body: string;
}

interface OnboardingStepProps {
  slide: Slide;
  artElement: React.ReactNode;
  colors: any;
}

export const OnboardingStep: React.FC<OnboardingStepProps> = ({
  slide,
  artElement,
  colors,
}) => {
  return (
    <View style={styles.page}>
      <View style={styles.illustrationArea}>
        {artElement}
      </View>

      <View style={styles.content}>
        <View style={[styles.labelPill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.labelText, { color: colors.primaryAccent }]}>{slide.label}</Text>
        </View>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{slide.title}</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>{slide.body}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  page: {
    width,
    flex: 1,
  },
  illustrationArea: {
    flex: 1.2,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    paddingHorizontal: 32,
    paddingBottom: 24,
    gap: 16,
  },
  labelPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 4,
  },
  labelText: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 36,
    fontWeight: "900",
    letterSpacing: -1,
    lineHeight: 42,
  },
  body: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: "500",
    maxWidth: 340,
    opacity: 0.9,
  },
});
