import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  ActivityIndicator,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSelector, useDispatch } from "react-redux";
import { useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";

import { RootState } from "@/store";
import { ThemeColors, ThemeGradients } from "@/theme/colors";
import { CardContainer } from "@/components/CardContainer";
import { ActionButton } from "@/components/ActionButton";
import { CustomAlert } from "@/components/CustomAlert";
import { setRecentMatches } from "@/store/pantrySlice";
import { generatePantryMeals } from "@/services/gemini";
import { setActiveRecipe } from "@/store/recipeSlice";
import { checkMonthRollover, incrementFreeScan } from "@/store/subscriptionSlice";
import { useNetInfo } from "@react-native-community/netinfo";
import { TabHeader } from "@/components/TabHeader";

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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "transparent" }} edges={["top"]}>
      <TabHeader title="What can I cook?" subtitle="MATCH INGREDIENTS" />
      <ScrollView
        style={[styles.container, { backgroundColor: "transparent" }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>
          Input whatever ingredients you currently own, and our culinary AI will output tailored recipe matches.
        </Text>

        {/* Input area */}
        <CardContainer gradient={ThemeGradients.cardCyan} style={styles.inputCard}>
          <Text style={[styles.label, { color: "rgba(28, 25, 23, 0.7)" }]}>Add Ingredient</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={[
                styles.textInput,
                { backgroundColor: "rgba(255,255,255,0.2)", borderColor: "rgba(28, 25, 23, 0.1)", color: "#1C1917" },
              ]}
              placeholder="e.g. Chicken 1kg, 3 Eggs, Lemon"
              placeholderTextColor="rgba(28, 25, 23, 0.5)"
              value={inputVal}
              onChangeText={setInputVal}
              onSubmitEditing={() => handleAddIngredient(inputVal)}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: "#1C1917" }]}
              onPress={() => handleAddIngredient(inputVal)}
            >
              <Ionicons name="add" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Quick recommendations */}
          <Text style={[styles.hintLabel, { color: "rgba(28, 25, 23, 0.7)" }]}>POPULAR QUICK ADD</Text>
          <View style={styles.suggestionRow}>
            {POPULAR_SUGGESTIONS.map((item) => {
              const alreadyHas = pantryList.includes(item);
              if (alreadyHas) return null;
              return (
                <TouchableOpacity
                  key={item}
                  style={[styles.suggestionChip, { borderColor: "rgba(28, 25, 23, 0.1)", backgroundColor: "rgba(255,255,255,0.2)" }]}
                  onPress={() => handleAddIngredient(item)}
                >
                  <Text style={[styles.suggestionText, { color: "#1C1917" }]}>+ {item}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </CardContainer>

        {/* Tags display */}
        {pantryList.length > 0 && (
          <CardContainer style={styles.tagsCard}>
            <View style={styles.tagsHeader}>
              <Text style={[styles.tagsCount, { color: colors.textPrimary }]}>
                My Ingredients ({pantryList.length} items)
              </Text>
              <TouchableOpacity onPress={handleClearPantry}>
                <Text style={{ color: "#EA4335", fontWeight: "bold" }}>Clear All</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.tagsGrid}>
              {pantryList.map((item) => (
                <View key={item} style={[styles.tagPill, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Text style={[styles.tagText, { color: colors.textPrimary }]}>{item}</Text>
                  <TouchableOpacity onPress={() => handleRemoveIngredient(item)}>
                    <Ionicons name="close-circle" size={18} color={colors.textSecondary} style={{ marginLeft: 6 }} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </CardContainer>
        )}

        {/* Extra constraints selectors */}
        <CardContainer style={styles.filtersCard}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Matching Filters</Text>

          <View style={styles.filterGroup}>
            <Text style={[styles.filterLabel, { color: colors.textPrimary }]}>Prep Time Limit</Text>
            <View style={styles.filterOptions}>
              {["any", "15 mins", "30 mins", "60 mins"].map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: timeLimit === t ? colors.primaryAccent : colors.background,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => setTimeLimit(t)}
                >
                  <Text style={{ color: timeLimit === t ? colors.background : colors.textPrimary, fontSize: 12 }}>
                    {t === "any" ? "Any" : t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={[styles.filterGroup, { marginTop: 12 }]}>
            <Text style={[styles.filterLabel, { color: colors.textPrimary }]}>Chef Skill Level</Text>
            <View style={styles.filterOptions}>
              {["any", "beginner", "intermediate", "advanced"].map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: skillLevel === s ? colors.primaryAccent : colors.background,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => setSkillLevel(s)}
                >
                  <Text
                    style={{
                      color: skillLevel === s ? colors.background : colors.textPrimary,
                      fontSize: 12,
                      textTransform: "capitalize",
                    }}
                  >
                    {s === "any" ? "Any" : s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </CardContainer>

        {/* Action Button */}
        <ActionButton title="What can I cook?" onPress={handleTriggerAI} style={styles.actionBtn} />

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Loading overlay modal */}
      <Modal visible={loading} transparent animationType="fade">
        <View style={styles.overlayBackground}>
          <View style={[styles.overlayContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <ActivityIndicator size="large" color={colors.primaryAccent} />
            <Text style={[styles.overlayTitle, { color: colors.textPrimary }]}>Culinary matching engine...</Text>
            <Text style={[styles.overlayStep, { color: colors.textSecondary }]}>{loadingStep}</Text>
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
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  inputCard: {
    padding: 16,
    borderRadius: 24,
  },
  label: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: "row",
    gap: 8,
  },
  textInput: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
  },
  addBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  hintLabel: {
    fontSize: 9,
    fontWeight: "800",
    marginTop: 16,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  suggestionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  suggestionChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  suggestionText: {
    fontSize: 12,
    fontWeight: "600",
  },
  tagsCard: {
    padding: 16,
    borderRadius: 24,
    marginTop: 16,
  },
  tagsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  tagsCount: {
    fontSize: 14,
    fontWeight: "700",
  },
  tagsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tagPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 13,
    fontWeight: "600",
  },
  filtersCard: {
    padding: 16,
    borderRadius: 24,
    marginTop: 16,
  },
  filterGroup: {},
  filterLabel: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 6,
  },
  filterOptions: {
    flexDirection: "row",
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  actionBtn: {
    marginTop: 20,
    height: 54,
  },
  resultsWrapper: {
    marginTop: 24,
  },
  tierSection: {
    marginBottom: 20,
  },
  tierSectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 12,
  },
  recipeCard: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  recipeTitle: {
    fontSize: 16,
    fontWeight: "800",
    flex: 1,
  },
  matchScoreBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  matchScoreVal: {
    fontSize: 11,
    fontWeight: "800",
  },
  metaRow: {
    flexDirection: "row",
    gap: 16,
    marginTop: 8,
  },
  metaCol: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    fontWeight: "500",
  },
  missingContainer: {
    flexDirection: "row",
    marginTop: 10,
    flexWrap: "wrap",
  },
  missingLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  missingItems: {
    fontSize: 13,
    fontWeight: "600",
  },
  substitutionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  subtextText: {
    fontSize: 12,
    fontWeight: "500",
  },
  overlayBackground: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  overlayContent: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    width: "75%",
  },
  overlayTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginTop: 16,
  },
  overlayStep: {
    fontSize: 13,
    marginTop: 6,
    textAlign: "center",
  },
});
