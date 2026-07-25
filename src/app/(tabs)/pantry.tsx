import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSelector, useDispatch } from "react-redux";
import { useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";

import { RootState } from "@/store";
import { ThemeColors, Typography, Spacing, Radius } from "@/theme/colors";
import { CardContainer } from "@/components/CardContainer";
import { ActionButton } from "@/components/ActionButton";
import { CustomAlert } from "@/components/CustomAlert";
import { TabHeader } from "@/components/TabHeader";
import { setRecentMatches } from "@/store/pantrySlice";
import { generatePantryMeals } from "@/services/gemini";
import { setActiveRecipe } from "@/store/recipeSlice";
import { checkMonthRollover, incrementFreeScan } from "@/store/subscriptionSlice";
import { useNetInfo } from "@react-native-community/netinfo";

const POPULAR_SUGGESTIONS = ["chicken", "tomato", "eggs", "garlic", "onion", "cheese", "pasta", "milk", "butter", "beef"];

export default function PantryScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const netInfo = useNetInfo();

  const mode = useSelector((state: RootState) => state.theme.mode);
  const colors = ThemeColors[mode];

  const [pantryList, setPantryList] = useState<string[]>([]);
  const profile = useSelector((state: RootState) => state.profile);
  const isPremium = useSelector((state: RootState) => state.subscription.isPremium);
  const freeScansUsed = useSelector((state: RootState) => state.subscription.freeScansUsed);
  const currentMonth = useSelector((state: RootState) => state.subscription.currentMonth);
  const userId = useSelector((state: RootState) => state.auth.uid);

  const [inputVal, setInputVal] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const results = useSelector((state: RootState) => state.pantry.recentMatches || []);

  // Filtering criteria
  const [timeLimit, setTimeLimit] = useState<string>("any");
  const [skillLevel, setSkillLevel] = useState<string>("any");

  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type?: "info" | "success" | "error" | "confirm";
    buttons?: Array<{ text: string; onPress?: () => void; style?: "default" | "cancel" | "destructive" }>;
  }>({ visible: false, title: "", message: "" });

  const showAlert = (
    title: string,
    message: string,
    type: "info" | "success" | "error" | "confirm" = "info",
    buttons?: Array<{ text: string; onPress?: () => void; style?: "default" | "cancel" | "destructive" }>
  ) => {
    setAlertConfig({ visible: true, title, message, type, buttons });
  };

  const handleAddIngredient = (val: string) => {
    const clean = val.trim().toLowerCase();
    if (clean) {
      if (!pantryList.includes(clean)) {
        setPantryList((prev) => [...prev, clean]);
      }
      setInputVal("");
    }
  };

  const handleRemoveIngredient = (item: string) => {
    const clean = item.trim().toLowerCase();
    setPantryList((prev) => prev.filter((i) => i !== clean));
  };

  const handleClearPantry = () => {
    setPantryList([]);
  };

  const handleTriggerAI = async () => {
    if (pantryList.length === 0) {
      showAlert("Ingredients Empty", "Please add some ingredients first to fetch recipes.", "info");
      return;
    }

    if (netInfo.isConnected === false) {
      showAlert("No Internet", "An active internet connection is required to match ingredients.", "error");
      return;
    }

    // Paywall checks
    if (!isPremium) {
      const today = new Date();
      const currentMonthStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, "0")}`;
      let effectiveScans = freeScansUsed;
      if (currentMonth !== currentMonthStr) {
        effectiveScans = 0;
        dispatch(checkMonthRollover());
      }
      if (effectiveScans >= 3) {
        router.push("/paywall");
        return;
      }
    }

    setLoading(true);
    setLoadingStep("Sorting ingredients list...");

    setTimeout(() => {
      setLoadingStep("Generating matching flavor scores...");
    }, 1200);

    try {
      const suggestions = await generatePantryMeals(pantryList, {
        timeLimit: timeLimit === "any" ? undefined : timeLimit,
        skillLevel: skillLevel === "any" ? undefined : skillLevel,
        profile,
      });

      dispatch(setRecentMatches(suggestions));
      router.push("/match-results");
    } catch (err: any) {
      console.warn("AI match failure:", err);
      showAlert("Matching Failed", err.message || "Failed to match ingredients. Please verify inputs.", "error");
    } finally {
      setLoading(false);
      setLoadingStep("");
    }
  };

  const FilterChip = ({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) => (
    <TouchableOpacity
      style={[
        styles.filterChip,
        {
          backgroundColor: selected ? colors.primaryAccent : colors.surface,
          borderColor: selected ? colors.primaryAccent : colors.border,
        },
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          Typography.chipText,
          {
            color: selected ? "#FFFFFF" : colors.textPrimary,
            textTransform: "capitalize",
          },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "transparent" }} edges={["top"]}>
      <TabHeader title="What can I cook?" subtitle="MATCH INGREDIENTS" />
      <ScrollView
        style={{ flex: 1, backgroundColor: "transparent" }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[Typography.body, { color: colors.textSecondary, marginBottom: Spacing.xl }]}>
          Add your available ingredients and we'll find recipes you can make right now.
        </Text>

        {/* Input Area */}
        <CardContainer style={styles.inputCard}>
          <Text style={[Typography.overline, { color: colors.textTertiary, marginBottom: Spacing.sm }]}>
            ADD INGREDIENT
          </Text>
          <View style={styles.inputRow}>
            <View style={[
              styles.textInputWrap,
              { backgroundColor: colors.surfaceSecondary, borderColor: colors.borderLight },
            ]}>
              <TextInput
                style={[styles.textInput, { color: colors.textPrimary }]}
                placeholder="e.g. Chicken, Eggs, Lemon..."
                placeholderTextColor={colors.textTertiary}
                value={inputVal}
                onChangeText={setInputVal}
                onSubmitEditing={() => handleAddIngredient(inputVal)}
                autoCapitalize="none"
              />
            </View>
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: colors.primaryAccent }]}
              onPress={() => handleAddIngredient(inputVal)}
            >
              <Ionicons name="add" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Quick Suggestions */}
          <Text style={[Typography.overline, { color: colors.textTertiary, marginTop: Spacing.lg, marginBottom: Spacing.sm }]}>
            QUICK ADD
          </Text>
          <View style={styles.suggestionRow}>
            {POPULAR_SUGGESTIONS.map((item) => {
              const alreadyHas = pantryList.includes(item);
              if (alreadyHas) return null;
              return (
                <TouchableOpacity
                  key={item}
                  style={[styles.suggestionChip, { borderColor: colors.border, backgroundColor: colors.surface }]}
                  onPress={() => handleAddIngredient(item)}
                >
                  <Text style={[Typography.chipText, { color: colors.textPrimary }]}>+ {item}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </CardContainer>

        {/* Tags Display */}
        {pantryList.length > 0 && (
          <CardContainer style={{ marginTop: Spacing.md }}>
            <View style={styles.tagsHeader}>
              <Text style={[Typography.label, { color: colors.textPrimary }]}>
                My Ingredients ({pantryList.length})
              </Text>
              <TouchableOpacity onPress={handleClearPantry}>
                <Text style={[Typography.label, { color: colors.errorRed }]}>Clear All</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.tagsGrid}>
              {pantryList.map((item) => (
                <View key={item} style={[styles.tagPill, { backgroundColor: colors.surfaceSecondary, borderColor: colors.borderLight }]}>
                  <Text style={[Typography.chipText, { color: colors.textPrimary }]}>{item}</Text>
                  <TouchableOpacity onPress={() => handleRemoveIngredient(item)}>
                    <Ionicons name="close-circle" size={16} color={colors.textTertiary} style={{ marginLeft: 6 }} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </CardContainer>
        )}

        {/* Filters */}
        <CardContainer style={{ marginTop: Spacing.md }}>
          <Text style={[Typography.overline, { color: colors.textTertiary, marginBottom: Spacing.md }]}>
            MATCHING FILTERS
          </Text>

          <Text style={[Typography.label, { color: colors.textPrimary, marginBottom: Spacing.sm }]}>Prep Time</Text>
          <View style={styles.filterOptions}>
            {["any", "15 mins", "30 mins", "60 mins"].map((t) => (
              <FilterChip
                key={t}
                label={t === "any" ? "Any" : t}
                selected={timeLimit === t}
                onPress={() => setTimeLimit(t)}
              />
            ))}
          </View>

          <Text style={[Typography.label, { color: colors.textPrimary, marginTop: Spacing.lg, marginBottom: Spacing.sm }]}>
            Skill Level
          </Text>
          <View style={styles.filterOptions}>
            {["any", "beginner", "intermediate", "advanced"].map((s) => (
              <FilterChip
                key={s}
                label={s === "any" ? "Any" : s}
                selected={skillLevel === s}
                onPress={() => setSkillLevel(s)}
              />
            ))}
          </View>
        </CardContainer>

        {/* Action Button */}
        <ActionButton
          title="What can I cook?"
          icon="sparkles-outline"
          onPress={handleTriggerAI}
          style={{ marginTop: Spacing.xl }}
        />

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Loading Overlay */}
      <Modal visible={loading} transparent animationType="fade">
        <View style={styles.overlayBackground}>
          <View style={[styles.overlayContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <ActivityIndicator size="large" color={colors.primaryAccent} />
            <Text style={[Typography.cardTitle, { color: colors.textPrimary, marginTop: Spacing.lg }]}>
              Finding recipes...
            </Text>
            <Text style={[Typography.caption, { color: colors.textSecondary, marginTop: Spacing.xs }]}>
              {loadingStep}
            </Text>
          </View>
        </View>
      </Modal>

      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        buttons={alertConfig.buttons}
        onClose={() => setAlertConfig((prev) => ({ ...prev, visible: false }))}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
  },
  inputCard: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  inputRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  textInputWrap: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderRadius: Radius.md,
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
  },
  textInput: {
    fontSize: 15,
    height: "100%",
  },
  addBtn: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  suggestionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  suggestionChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  tagsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  tagsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  tagPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  filterOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  overlayBackground: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  overlayContent: {
    padding: Spacing.xxl,
    borderRadius: Radius.xl,
    borderWidth: 1,
    alignItems: "center",
    width: "75%",
  },
});
