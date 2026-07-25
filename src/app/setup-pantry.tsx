import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useSelector, useDispatch } from "react-redux";
import { LinearGradient } from "expo-linear-gradient";

import { RootState } from "@/store";
import { ThemeColors, ThemeGradients } from "@/theme/colors";
import { completePostLoginSetup } from "@/store/authSlice";

const STAPLES = [
  "Eggs",
  "Rice",
  "Chicken",
  "Pasta",
  "Onions",
  "Garlic",
  "Tomatoes",
  "Potatoes",
  "Bread",
  "Milk",
  "Cheese",
  "Beans",
];

export default function SetupPantryScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const mode = useSelector((state: RootState) => state.theme.mode);
  const colors = ThemeColors[mode];

  const [selected, setSelected] = useState<string[]>([]);

  const toggleItem = (item: string) => {
    if (selected.includes(item)) {
      setSelected(selected.filter((i) => i !== item));
    } else {
      if (selected.length < 3) {
        setSelected([...selected, item]);
      }
    }
  };

  const handleFinish = () => {
    dispatch(completePostLoginSetup());
    router.replace("/(tabs)/home");
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: "transparent" }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          What is always in your kitchen?
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Pick up to 3 things you usually have (like eggs, rice, or chicken).
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        <View style={styles.grid}>
          {STAPLES.map((item) => {
            const isSelected = selected.includes(item);
            return (
              <TouchableOpacity
                key={item}
                activeOpacity={0.7}
                onPress={() => toggleItem(item)}
                style={[
                  styles.pill,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  isSelected && { borderColor: colors.primaryAccent, backgroundColor: "rgba(45, 212, 191, 0.1)" },
                ]}
              >
                <Text
                  style={[
                    styles.pillText,
                    { color: isSelected ? colors.primaryAccent : colors.textPrimary },
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity activeOpacity={0.9} onPress={handleFinish}>
          <LinearGradient
            colors={ThemeGradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.nextBtn}
          >
            <Text style={styles.nextBtnLabel}>Finish</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.6} onPress={handleFinish} style={styles.skipBtn}>
          <Text style={[styles.skipBtnLabel, { color: colors.textSecondary }]}>Skip for now</Text>
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
    paddingBottom: 40,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  pill: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 16,
    fontWeight: "600",
  },
  footer: {
    padding: 24,
    paddingBottom: 32,
    gap: 16,
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
  skipBtn: {
    alignItems: "center",
    paddingVertical: 10,
  },
  skipBtnLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
});
