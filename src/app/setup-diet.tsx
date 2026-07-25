import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useSelector } from "react-redux";
import { LinearGradient } from "expo-linear-gradient";

import { RootState } from "@/store";
import { ThemeColors, ThemeGradients } from "@/theme/colors";

const DIETS = [
  "No Restrictions",
  "Halal",
  "Vegan",
  "Vegetarian",
  "Pescatarian",
  "Gluten-Free",
  "Keto",
  "Paleo",
];

export default function SetupDietScreen() {
  const router = useRouter();
  const mode = useSelector((state: RootState) => state.theme.mode);
  const colors = ThemeColors[mode];

  const [selected, setSelected] = useState<string>("No Restrictions");

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: "transparent" }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>How do you eat?</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Select your primary diet to help us curate your meals.
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {DIETS.map((diet) => {
          const isSelected = selected === diet;
          return (
            <TouchableOpacity
              key={diet}
              activeOpacity={0.7}
              onPress={() => setSelected(diet)}
              style={[
                styles.card,
                { backgroundColor: colors.surface, borderColor: colors.border },
                isSelected && { borderColor: colors.primaryAccent },
              ]}
            >
              <Text
                style={[
                  styles.cardText,
                  { color: isSelected ? colors.primaryAccent : colors.textPrimary },
                ]}
              >
                {diet}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity activeOpacity={0.9} onPress={() => router.push("/setup-pantry")}>
          <LinearGradient
            colors={ThemeGradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.nextBtn}
          >
            <Text style={styles.nextBtnLabel}>Continue</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    padding: 24,
    paddingTop: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: -1,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
  },
  list: {
    paddingHorizontal: 24,
    gap: 12,
    paddingBottom: 40,
  },
  card: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
  },
  cardText: {
    fontSize: 18,
    fontWeight: "600",
  },
  footer: {
    padding: 24,
    paddingBottom: 32,
  },
  nextBtn: {
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  nextBtnLabel: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
});
