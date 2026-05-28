import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  TextInput,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { collection, addDoc, doc, updateDoc } from "firebase/firestore";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { RootState } from "@/store";
import { ThemeColors } from "@/theme/colors";
import { CardContainer } from "@/components/CardContainer";
import { ActionButton } from "@/components/ActionButton";
import { mutateRecipe, recalculateNutrition } from "@/services/gemini";
import { setActiveRecipe, Ingredient } from "@/store/recipeSlice";
import { db } from "@/services/firebase";
import { CustomAlert } from "@/components/CustomAlert";

// Map recipe title keywords to fun emojis
function getRecipeEmoji(title: string): string {
  const t = title.toLowerCase();
  if (t.includes("pasta") || t.includes("noodle") || t.includes("spaghetti"))
    return "🍝";
  if (t.includes("pizza")) return "🍕";
  if (t.includes("burger") || t.includes("sandwich")) return "🍔";
  if (t.includes("salad")) return "🥗";
  if (t.includes("soup") || t.includes("stew") || t.includes("broth"))
    return "🍲";
  if (
    t.includes("cake") ||
    t.includes("dessert") ||
    t.includes("cookie") ||
    t.includes("brownie")
  )
    return "🎂";
  if (t.includes("chicken") || t.includes("poultry") || t.includes("turkey"))
    return "🍗";
  if (
    t.includes("fish") ||
    t.includes("salmon") ||
    t.includes("tuna") ||
    t.includes("shrimp")
  )
    return "🐟";
  if (t.includes("taco") || t.includes("burrito") || t.includes("mexican"))
    return "🌮";
  if (t.includes("sushi") || t.includes("rice") || t.includes("japanese"))
    return "🍱";
  if (t.includes("curry") || t.includes("indian") || t.includes("masala"))
    return "🍛";
  if (t.includes("bread") || t.includes("toast") || t.includes("muffin"))
    return "🍞";
  if (t.includes("egg") || t.includes("omelette") || t.includes("scramble"))
    return "🍳";
  if (t.includes("smoothie") || t.includes("juice") || t.includes("drink"))
    return "🥤";
  if (t.includes("steak") || t.includes("beef") || t.includes("meat"))
    return "🥩";
  if (t.includes("vegetable") || t.includes("vegan") || t.includes("veggie"))
    return "🥦";
  return "🍽️";
}

function getIngredientEmoji(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("chicken") || n.includes("turkey") || n.includes("poultry"))
    return "🍗";
  if (n.includes("beef") || n.includes("steak") || n.includes("meat"))
    return "🥩";
  if (n.includes("egg")) return "🥚";
  if (n.includes("milk") || n.includes("cream") || n.includes("butter"))
    return "🧈";
  if (n.includes("tomato")) return "🍅";
  if (n.includes("onion") || n.includes("garlic")) return "🧅";
  if (n.includes("lemon") || n.includes("lime")) return "🍋";
  if (n.includes("carrot")) return "🥕";
  if (n.includes("pepper") || n.includes("chili")) return "🌶️";
  if (n.includes("mushroom")) return "🍄";
  if (n.includes("cheese")) return "🧀";
  if (n.includes("flour") || n.includes("bread") || n.includes("wheat"))
    return "🌾";
  if (n.includes("salt") || n.includes("sugar") || n.includes("spice"))
    return "🧂";
  if (n.includes("oil") || n.includes("vinegar")) return "🫙";
  if (n.includes("fish") || n.includes("salmon") || n.includes("tuna"))
    return "🐟";
  return "🌿";
}

export default function RecipeDisplayScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const mode = useSelector((state: RootState) => state.theme.mode);
  const colors = ThemeColors[mode];

  const activeRecipe = useSelector(
    (state: RootState) => state.recipe.activeRecipe,
  );
  const userId = useSelector((state: RootState) => state.auth.uid);

  // Custom Alert Modal State Config
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type?: "info" | "success" | "error" | "confirm";
    buttons?: Array<{
      text: string;
      onPress?: () => void;
      style?: "default" | "cancel" | "destructive";
    }>;
  }>({ visible: false, title: "", message: "" });

  const showAlert = (
    title: string,
    message: string,
    type: "info" | "success" | "error" | "confirm" = "info",
    buttons?: Array<{
      text: string;
      onPress?: () => void;
      style?: "default" | "cancel" | "destructive";
    }>,
  ) => {
    setAlertConfig({ visible: true, title, message, type, buttons });
  };

  // States
  const [checkedIngredients, setCheckedIngredients] = useState<
    Record<string, boolean>
  >({});
  const [selectedIngredient, setSelectedIngredient] =
    useState<Ingredient | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isSaveLoading, setIsSaveLoading] = useState(false);
  const [editedIngredients, setEditedIngredients] = useState<Ingredient[]>([]);
  const [editedInstructions, setEditedInstructions] = useState<string[]>([]);

  // AI mutation states
  const [isMutating, setIsMutating] = useState(false);
  const [mutationStep, setMutationStep] = useState("");
  const [isEditPromptVisible, setIsEditPromptVisible] = useState(false);
  const [customEditInstructions, setCustomEditInstructions] = useState("");

  if (!activeRecipe) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>
          No active recipe parsed.
        </Text>
        <ActionButton
          title="Go Back to Capture"
          onPress={() => router.back()}
        />
      </View>
    );
  }

  // Manual Edit Handlers
  const handleAddIngredientRow = () => {
    setEditedIngredients((prev) => [
      ...prev,
      { name: "", amount: "", description: "" },
    ]);
  };

  const handleRemoveIngredientRow = (index: number) => {
    setEditedIngredients((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleIngredientFieldChange = (
    index: number,
    field: keyof Ingredient,
    value: string,
  ) => {
    setEditedIngredients((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleAddInstructionRow = () => {
    setEditedInstructions((prev) => [...prev, ""]);
  };

  const handleRemoveInstructionRow = (index: number) => {
    setEditedInstructions((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleInstructionFieldChange = (index: number, value: string) => {
    setEditedInstructions((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleSaveManualRecipe = async () => {
    const cleanIngredients = editedIngredients.filter(
      (i) => i.name.trim() !== "",
    );
    const cleanInstructions = editedInstructions.filter(
      (step) => step.trim() !== "",
    );

    if (cleanIngredients.length === 0) {
      showAlert(
        "Ingredients Required",
        "Please specify at least one valid ingredient with a name.",
        "error",
      );
      return;
    }
    if (cleanInstructions.length === 0) {
      showAlert(
        "Instructions Required",
        "Please specify at least one valid instruction step.",
        "error",
      );
      return;
    }

    setIsSaveLoading(true);
    try {
      if (userId && activeRecipe.id) {
        const docRef = doc(
          db,
          `users/${userId}/scanned_recipes`,
          activeRecipe.id,
        );
        await updateDoc(docRef, {
          ingredients: cleanIngredients,
          instructions: cleanInstructions,
          isManuallyEdited: true,
        });
      }

      dispatch(
        setActiveRecipe({
          ...activeRecipe,
          ingredients: cleanIngredients,
          instructions: cleanInstructions,
          isManuallyEdited: true,
        }),
      );
      setIsEditPromptVisible(false);
      showAlert(
        "Success",
        "Recipe ingredients and cooking steps updated successfully!",
        "success",
      );
    } catch (err) {
      console.error("Manual save error:", err);
      showAlert(
        "Save Failed",
        "Could not save modified recipe. Please try again.",
        "error",
      );
    } finally {
      setIsSaveLoading(false);
    }
  };

  // Recalculate Nutrition/Calories using Gemini AI
  const handleRecalculateNutrition = async () => {
    setIsMutating(true);
    setMutationStep(
      "Culinary AI is recalculating precise macros & calories...",
    );

    try {
      const updatedRecipe = await recalculateNutrition(activeRecipe);

      if (userId && activeRecipe.id) {
        const docRef = doc(
          db,
          `users/${userId}/scanned_recipes`,
          activeRecipe.id,
        );
        await updateDoc(docRef, {
          calories: updatedRecipe.calories,
          totalProtein: updatedRecipe.totalProtein,
          totalCarbs: updatedRecipe.totalCarbs,
          totalFats: updatedRecipe.totalFats,
          ingredients: updatedRecipe.ingredients,
        });
      }

      dispatch(
        setActiveRecipe({
          ...activeRecipe,
          calories: updatedRecipe.calories,
          totalProtein: updatedRecipe.totalProtein,
          totalCarbs: updatedRecipe.totalCarbs,
          totalFats: updatedRecipe.totalFats,
          ingredients: updatedRecipe.ingredients,
        }),
      );

      showAlert(
        "Success",
        "Culinary AI has successfully recalculated precise calories and nutritional macros for your custom recipe!",
        "success",
      );
    } catch (error) {
      console.error("Recalculate Nutrition Error:", error);
      showAlert(
        "AI Error",
        "Could not recalculate nutrition metrics. Please check your internet connection and try again.",
        "error",
      );
    } finally {
      setIsMutating(false);
      setMutationStep("");
    }
  };

  // Toggle ingredient checkboxes
  const toggleIngredientCheck = (name: string) => {
    setCheckedIngredients((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  // Open Screen 4: Ingredient Deep-Dive
  const handleOpenIngredientDeepDive = (ingredient: Ingredient) => {
    setSelectedIngredient(ingredient);
    setIsModalVisible(true);
  };

  // Firestore bookmark toggling (Pinning / Unpinning)
  const handleToggleBookmark = async () => {
    if (!userId) {
      showAlert(
        "Auth Required",
        "You must be signed in to bookmark recipes in your private vault.",
        "info",
      );
      return;
    }

    setIsSaveLoading(true);
    try {
      const currentlyPinned = activeRecipe.isPinned || false;

      if (activeRecipe.id) {
        // We have the document ID, so toggle isPinned flag in Firestore scanned_recipes
        const docRef = doc(
          db,
          `users/${userId}/scanned_recipes`,
          activeRecipe.id,
        );
        await updateDoc(docRef, {
          isPinned: !currentlyPinned,
          pinnedAt: !currentlyPinned ? new Date().toISOString() : null,
        });

        dispatch(
          setActiveRecipe({
            ...activeRecipe,
            isPinned: !currentlyPinned,
            pinnedAt: !currentlyPinned ? new Date().toISOString() : undefined,
          }),
        );

        showAlert(
          "Success",
          !currentlyPinned
            ? "Recipe pinned to your My Recipes library!"
            : "Recipe unpinned from your My Recipes library.",
          "success",
        );
      } else {
        // No ID yet (e.g. offline fallback scanned), save to scanned_recipes with isPinned: true
        const scannedRef = collection(db, `users/${userId}/scanned_recipes`);
        const newDocRef = await addDoc(scannedRef, {
          ...activeRecipe,
          isPinned: true,
          scannedAt: new Date().toISOString(),
          pinnedAt: new Date().toISOString(),
        });

        dispatch(
          setActiveRecipe({
            ...activeRecipe,
            id: newDocRef.id,
            isPinned: true,
            pinnedAt: new Date().toISOString(),
          }),
        );

        showAlert(
          "Success",
          "Recipe saved and pinned to your private library!",
          "success",
        );
      }
    } catch (error) {
      console.error("Firestore Bookmark Error:", error);
      showAlert(
        "Error",
        "Could not update bookmark status. Please check your internet connection and try again.",
        "error",
      );
    } finally {
      setIsSaveLoading(false);
    }
  };

  // Trigger AI mutation
  const handleMutateRecipe = async (
    type: "healthier" | "tastier" | "custom",
    customInstructions?: string,
  ) => {
    setIsMutating(true);
    setMutationStep(
      type === "healthier"
        ? "Optimizing low-calorie alternatives..."
        : type === "tastier"
          ? "Elevating gourmet flavors..."
          : "Applying custom culinary edits...",
    );

    try {
      const mutated = await mutateRecipe(
        activeRecipe,
        type,
        customInstructions,
      );

      let savedRecipeId: string | undefined = undefined;
      if (userId) {
        try {
          const scannedRef = collection(db, `users/${userId}/scanned_recipes`);
          const docRef = await addDoc(scannedRef, {
            ...mutated,
            isPinned: false,
            scannedAt: new Date().toISOString(),
          });
          savedRecipeId = docRef.id;
          console.log(
            "[Mutator] Auto-saved mutated recipe as new scan. ID:",
            savedRecipeId,
          );
        } catch (saveErr) {
          console.warn(
            "[Mutator] Failed to auto-save mutated recipe scan:",
            saveErr,
          );
        }
      }

      dispatch(
        setActiveRecipe({
          ...mutated,
          id: savedRecipeId,
          isPinned: false,
        }),
      );
      setCheckedIngredients({}); // Reset checkboxes for new version
      showAlert(
        "AI Success",
        `Recipe updated successfully and archived in your scanned history vault!`,
        "success",
      );
    } catch (error) {
      console.error("AI Mutation Error:", error);
      showAlert(
        "Mutation Failed",
        "Could not mutate the recipe. Please verify inputs or try again.",
        "error",
      );
    } finally {
      setIsMutating(false);
      setMutationStep("");
      setIsEditPromptVisible(false);
      setCustomEditInstructions("");
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      {/* Sticky Top Header Bar */}
      <View
        style={[
          styles.headerBar,
          {
            borderBottomColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons
            name="chevron-back"
            size={20}
            color={colors.primaryAccent}
          />
          <Text style={[styles.backText, { color: colors.textPrimary }]}>
            Back
          </Text>
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.textSecondary }]}>
          RECIPE WORKSPACE
        </Text>

        <TouchableOpacity
          onPress={handleToggleBookmark}
          disabled={isSaveLoading}
          style={styles.bookmarkBtn}
          activeOpacity={0.7}
        >
          {isSaveLoading ? (
            <ActivityIndicator size="small" color={colors.primaryAccent} />
          ) : (
            <Ionicons
              name={activeRecipe.isPinned ? "bookmark" : "bookmark-outline"}
              size={22}
              color={colors.primaryAccent}
            />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 90 + insets.bottom },
        ]}
      >
        {/* Hero Top Card */}
        <View
          style={[
            styles.heroCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          {/* Emoji Badge */}
          <View
            style={[
              styles.emojiContainer,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={styles.heroEmoji}>
              {getRecipeEmoji(activeRecipe.title)}
            </Text>
          </View>

          {/* Recipe Title & Badge Row */}
          <View style={styles.heroTitleArea}>
            <View
              style={[
                styles.recipeBadge,
                { backgroundColor: colors.primaryAccent },
              ]}
            >
              <Text
                style={[
                  styles.recipeBadgeText,
                  { color: mode === "light" ? "#FFFFFF" : "#000000" },
                ]}
              >
                ✨ AI Scanned
              </Text>
            </View>
            <Text style={[styles.recipeTitle, { color: colors.textPrimary }]}>
              {activeRecipe.title}
            </Text>
          </View>

          {/* Quick Metrics Columns */}
          <View style={styles.metricsContainer}>
            {/* Row 1: Core Info (Prep Time & Calories) */}
            <View style={styles.metricsRow}>
              <View
                style={[
                  styles.coreMetricPill,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Ionicons
                  name="time-outline"
                  size={16}
                  color={colors.primaryAccent}
                  style={{ marginRight: 8 }}
                />
                <View style={styles.coreMetricTextContainer}>
                  <Text
                    style={[
                      styles.coreMetricValue,
                      { color: colors.textPrimary },
                    ]}
                  >
                    {activeRecipe.prepTime}
                  </Text>
                  <Text
                    style={[
                      styles.coreMetricLabel,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Prep Time
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.coreMetricPill,
                  styles.highlightedPill,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.primaryAccent,
                  },
                ]}
              >
                <Ionicons
                  name="flame"
                  size={16}
                  color={colors.primaryAccent}
                  style={{ marginRight: 8 }}
                />
                <View style={styles.coreMetricTextContainer}>
                  <Text
                    style={[
                      styles.coreMetricValue,
                      { color: colors.textPrimary },
                    ]}
                  >
                    {activeRecipe.calories}
                  </Text>
                  <Text
                    style={[
                      styles.coreMetricLabel,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Calories
                  </Text>
                </View>
              </View>
            </View>

            {/* Row 2: Macros (Protein, Carbs, Fats) */}
            <View style={styles.metricsRow}>
              <View
                style={[
                  styles.macroMetricPill,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Ionicons
                  name="barbell-outline"
                  size={14}
                  color={colors.textSecondary}
                  style={{ marginBottom: 4 }}
                />
                <Text
                  style={[styles.macroValue, { color: colors.textPrimary }]}
                >
                  {activeRecipe.totalProtein || "—"}
                </Text>
                <Text
                  style={[styles.macroLabel, { color: colors.textSecondary }]}
                >
                  Protein
                </Text>
              </View>

              <View
                style={[
                  styles.macroMetricPill,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Ionicons
                  name="nutrition-outline"
                  size={14}
                  color={colors.textSecondary}
                  style={{ marginBottom: 4 }}
                />
                <Text
                  style={[styles.macroValue, { color: colors.textPrimary }]}
                >
                  {activeRecipe.totalCarbs || "—"}
                </Text>
                <Text
                  style={[styles.macroLabel, { color: colors.textSecondary }]}
                >
                  Carbs
                </Text>
              </View>

              <View
                style={[
                  styles.macroMetricPill,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Ionicons
                  name="water-outline"
                  size={14}
                  color={colors.textSecondary}
                  style={{ marginBottom: 4 }}
                />
                <Text
                  style={[styles.macroValue, { color: colors.textPrimary }]}
                >
                  {activeRecipe.totalFats}
                </Text>
                <Text
                  style={[styles.macroLabel, { color: colors.textSecondary }]}
                >
                  Fats
                </Text>
              </View>
            </View>
          </View>
        </View>

        {activeRecipe.isManuallyEdited && (
          <View
            style={[
              styles.recalcBanner,
              {
                backgroundColor: colors.surface,
                borderColor: colors.primaryAccent,
              },
            ]}
          >
            <View style={styles.recalcBannerTextContainer}>
              <Ionicons
                name="sparkles"
                size={16}
                color={colors.primaryAccent}
                style={{ marginRight: 8, marginTop: 1 }}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.recalcBannerTitle,
                    { color: colors.textPrimary },
                  ]}
                >
                  Recipe Modified Manually
                </Text>
                <Text
                  style={[
                    styles.recalcBannerSubtitle,
                    { color: colors.textSecondary },
                  ]}
                >
                  Calorie counts and macronutrient goals might be out of sync.
                  Use AI to recalculate metrics.
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[
                styles.recalcBtn,
                { backgroundColor: colors.primaryAccent },
              ]}
              onPress={handleRecalculateNutrition}
              activeOpacity={0.85}
            >
              <Ionicons
                name="calculator-outline"
                size={16}
                color={mode === "light" ? "#FFFFFF" : "#000000"}
              />
              <Text
                style={[
                  styles.recalcBtnText,
                  { color: mode === "light" ? "#FFFFFF" : "#000000" },
                ]}
              >
                Recalculate Nutrition
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Interactive Ingredients Checklist */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Ionicons
              name="list-outline"
              size={18}
              color={colors.textSecondary}
            />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Ingredients
            </Text>
            <View
              style={[
                styles.sectionHintBadge,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Ionicons
                name="information-circle-outline"
                size={11}
                color={colors.textSecondary}
              />
              <Text
                style={[
                  styles.sectionHintText,
                  { color: colors.textSecondary },
                ]}
              >
                tap name for nutrition
              </Text>
            </View>
          </View>
        </View>

        {activeRecipe.ingredients.map((item, index) => {
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
              <TouchableOpacity
                onPress={() => toggleIngredientCheck(item.name)}
                style={styles.checkboxContainer}
              >
                <Ionicons
                  name={isChecked ? "checkmark-circle" : "ellipse-outline"}
                  size={22}
                  color={
                    isChecked ? colors.primaryAccent : colors.textSecondary
                  }
                />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleOpenIngredientDeepDive(item)}
                style={styles.ingredientTextContainer}
                activeOpacity={0.7}
              >
                <View style={styles.ingredientNameRow}>
                  <Text
                    style={[
                      styles.ingredientName,
                      { color: colors.textPrimary },
                      isChecked && styles.strikethrough,
                    ]}
                  >
                    {item.name}
                  </Text>
                  {/* Visible affordance: small info icon shows it's tappable for nutrition */}
                  <Ionicons
                    name="chevron-forward"
                    size={12}
                    color={colors.primaryAccent}
                    style={{ marginLeft: 4, marginTop: 2 }}
                  />
                </View>
                <Text
                  style={[
                    styles.ingredientAmount,
                    { color: colors.textSecondary },
                  ]}
                >
                  {item.amount}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}

        {/* Numbered Cooking Instructions Timeline */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Ionicons
              name="restaurant-outline"
              size={18}
              color={colors.textSecondary}
            />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Instructions
            </Text>
          </View>
        </View>

        {activeRecipe.instructions.map((step, index) => {
          const isLastStep = index === activeRecipe.instructions.length - 1;

          // Highlight ingredient names that appear in this step
          const highlightedSegments = (() => {
            // Build a list of {text, isIngredient, isChecked} segments
            const allIngredients = activeRecipe.ingredients.map((i) => i.name);
            let remaining = step;
            const segments: Array<{
              text: string;
              isIngredient: boolean;
              isChecked: boolean;
            }> = [];
            while (remaining.length > 0) {
              let earliestIdx = -1;
              let earliestName = "";
              for (const name of allIngredients) {
                const idx = remaining.toLowerCase().indexOf(name.toLowerCase());
                if (idx !== -1 && (earliestIdx === -1 || idx < earliestIdx)) {
                  earliestIdx = idx;
                  earliestName = name;
                }
              }
              if (earliestIdx === -1) {
                segments.push({
                  text: remaining,
                  isIngredient: false,
                  isChecked: false,
                });
                break;
              }
              if (earliestIdx > 0) {
                segments.push({
                  text: remaining.slice(0, earliestIdx),
                  isIngredient: false,
                  isChecked: false,
                });
              }
              const checked = checkedIngredients[earliestName] || false;
              segments.push({
                text: remaining.slice(
                  earliestIdx,
                  earliestIdx + earliestName.length,
                ),
                isIngredient: true,
                isChecked: checked,
              });
              remaining = remaining.slice(earliestIdx + earliestName.length);
            }
            return segments;
          })();

          return (
            <View key={index} style={styles.instructionStepContainer}>
              {/* Timeline Connector Line */}
              {!isLastStep && (
                <View
                  style={[
                    styles.timelineLine,
                    { backgroundColor: colors.border },
                  ]}
                />
              )}

              <View
                style={[
                  styles.stepNumberBadge,
                  { backgroundColor: colors.primaryAccent },
                ]}
              >
                <Text
                  style={[
                    styles.stepNumberText,
                    { color: mode === "light" ? "#FFFFFF" : "#000000" },
                  ]}
                >
                  {index + 1}
                </Text>
              </View>
              <View style={styles.stepContentContainer}>
                <Text
                  style={[
                    styles.instructionStepText,
                    { color: colors.textPrimary },
                  ]}
                >
                  {highlightedSegments.map((seg, si) =>
                    seg.isIngredient ? (
                      <Text
                        key={si}
                        style={[
                          styles.instructionIngredientHighlight,
                          { color: colors.primaryAccent },
                          seg.isChecked && styles.strikethrough,
                        ]}
                      >
                        {seg.text}
                      </Text>
                    ) : (
                      <Text key={si}>{seg.text}</Text>
                    ),
                  )}
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Sticky Bottom Actions Toolbar */}
      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            paddingBottom: insets.bottom || 12,
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.toolbarBtnLarge,
            { backgroundColor: colors.primaryAccent },
          ]}
          onPress={() => handleMutateRecipe("healthier")}
          activeOpacity={0.85}
        >
          <Ionicons
            name="leaf-outline"
            size={16}
            color={mode === "light" ? "#FFFFFF" : "#000000"}
          />
          <View>
            <Text
              style={[
                styles.toolbarBtnLargeText,
                { color: mode === "light" ? "#FFFFFF" : "#000000" },
              ]}
            >
              Healthier
            </Text>
            <Text
              style={[
                styles.toolbarBtnSub,
                {
                  color:
                    mode === "light"
                      ? "rgba(255,255,255,0.7)"
                      : "rgba(0,0,0,0.5)",
                },
              ]}
            >
              reduce calories
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.toolbarBtnLarge,
            {
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
            },
          ]}
          onPress={() => handleMutateRecipe("tastier")}
          activeOpacity={0.85}
        >
          <Ionicons
            name="restaurant-outline"
            size={16}
            color={colors.textPrimary}
          />
          <View>
            <Text
              style={[
                styles.toolbarBtnLargeText,
                { color: colors.textPrimary },
              ]}
            >
              Tastier
            </Text>
            <Text
              style={[styles.toolbarBtnSub, { color: colors.textSecondary }]}
            >
              enhance flavour
            </Text>
          </View>
        </TouchableOpacity>

        {/* Separator */}
        <View
          style={[styles.toolbarDivider, { backgroundColor: colors.border }]}
        />

        {/* Secondary action — compact icon button */}
        <TouchableOpacity
          style={[
            styles.toolbarBtnIcon,
            {
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
            },
          ]}
          onPress={() => {
            setEditedIngredients(
              JSON.parse(JSON.stringify(activeRecipe.ingredients)),
            );
            setEditedInstructions(
              JSON.parse(JSON.stringify(activeRecipe.instructions)),
            );
            setIsEditPromptVisible(true);
          }}
          activeOpacity={0.85}
        >
          <Ionicons
            name="create-outline"
            size={18}
            color={colors.textSecondary}
          />
          <Text
            style={[styles.toolbarBtnIconText, { color: colors.textSecondary }]}
          >
            Edit
          </Text>
        </TouchableOpacity>
      </View>

      {/* Screen 4: Ingredient Deep-Dive Bottom Sheet Overlay Modal */}
      <Modal visible={isModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalContent, { backgroundColor: colors.surface }]}
          >
            {/* Header */}
            <View
              style={[styles.modalHeader, { borderBottomColor: colors.border }]}
            >
              <Text
                style={[styles.modalHeaderTitle, { color: colors.textPrimary }]}
              >
                Ingredient Details
              </Text>
              <TouchableOpacity
                onPress={() => setIsModalVisible(false)}
                style={styles.closeModalBtn}
              >
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {selectedIngredient && (
              <ScrollView contentContainerStyle={styles.modalScroll}>
                {/* Bold Ingredient Name */}
                <Text
                  style={[
                    styles.selectedIngredientName,
                    { color: colors.primaryAccent },
                  ]}
                >
                  {selectedIngredient.name}
                </Text>
                <Text
                  style={[
                    styles.selectedIngredientAmount,
                    { color: colors.textSecondary },
                  ]}
                >
                  Standard parsed portion: {selectedIngredient.amount}
                </Text>

                {selectedIngredient.description && (
                  <View
                    style={[
                      styles.descriptionCard,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name="information-circle-outline"
                      size={16}
                      color={colors.primaryAccent}
                      style={{ marginRight: 8, marginTop: 1 }}
                    />
                    <Text
                      style={[
                        styles.descriptionText,
                        { color: colors.textPrimary },
                      ]}
                    >
                      {selectedIngredient.description}
                    </Text>
                  </View>
                )}

                {/* Nutritional Facts Grid */}
                <Text
                  style={[
                    styles.modalSectionTitle,
                    { color: colors.textPrimary },
                  ]}
                >
                  Nutritional Facts
                </Text>
                <View
                  style={[styles.nutritionCard, { borderColor: colors.border }]}
                >
                  <View style={styles.nutritionRow}>
                    <Text
                      style={[
                        styles.nutritionLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Calories
                    </Text>
                    <Text
                      style={[
                        styles.nutritionVal,
                        { color: colors.textPrimary },
                      ]}
                    >
                      {selectedIngredient.nutrition?.calories || "N/A"}
                    </Text>
                  </View>
                  <View style={styles.nutritionRow}>
                    <Text
                      style={[
                        styles.nutritionLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Protein
                    </Text>
                    <Text
                      style={[
                        styles.nutritionVal,
                        { color: colors.textPrimary },
                      ]}
                    >
                      {selectedIngredient.nutrition?.protein || "N/A"}
                    </Text>
                  </View>
                  <View style={styles.nutritionRow}>
                    <Text
                      style={[
                        styles.nutritionLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Carbohydrates
                    </Text>
                    <Text
                      style={[
                        styles.nutritionVal,
                        { color: colors.textPrimary },
                      ]}
                    >
                      {selectedIngredient.nutrition?.carbs || "N/A"}
                    </Text>
                  </View>
                  <View style={styles.nutritionRow}>
                    <Text
                      style={[
                        styles.nutritionLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Total Fats
                    </Text>
                    <Text
                      style={[
                        styles.nutritionVal,
                        { color: colors.textPrimary },
                      ]}
                    >
                      {selectedIngredient.nutrition?.fat || "N/A"}
                    </Text>
                  </View>
                </View>

                {/* Sourcing & Health Benefits */}
                <Text
                  style={[
                    styles.modalSectionTitle,
                    { color: colors.textPrimary },
                  ]}
                >
                  Health & Sourcing Benefits
                </Text>
                <CardContainer style={styles.benefitCard}>
                  <Text
                    style={[styles.benefitText, { color: colors.textPrimary }]}
                  >
                    {selectedIngredient.sourcingAdvantage ||
                      "This premium culinary ingredient is rich in natural vitamins and complex compounds that boost daily vitality and support optimal metabolism."}
                  </Text>
                </CardContainer>

                <ActionButton
                  title="Close Details"
                  onPress={() => setIsModalVisible(false)}
                  style={styles.modalCloseBtn}
                />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Edit Recipe Ingredients & Instructions Manual Modal */}
      <Modal visible={isEditPromptVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={[
              styles.modalContent,
              { backgroundColor: colors.surface, height: "85%" },
            ]}
          >
            {/* Header */}
            <View
              style={[styles.modalHeader, { borderBottomColor: colors.border }]}
            >
              <View>
                <Text
                  style={[
                    styles.modalHeaderTitle,
                    { color: colors.textPrimary },
                  ]}
                >
                  Edit Recipe
                </Text>
                <Text
                  style={[
                    styles.modalSubHeaderTitle,
                    { color: colors.textSecondary },
                  ]}
                >
                  Modify ingredients and cooking steps manually
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsEditPromptVisible(false)}
                style={styles.closeModalBtn}
              >
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Scrollable Form */}
            <ScrollView
              style={styles.editorScrollView}
              contentContainerStyle={styles.editorScrollContent}
              keyboardShouldPersistTaps="handled"
            >
              {/* Ingredients section title */}
              <View style={{ marginBottom: 12 }}>
                <Text
                  style={[
                    styles.editorSectionTitle,
                    { color: colors.textPrimary },
                  ]}
                >
                  Ingredients
                </Text>
              </View>

              {editedIngredients.map((item, index) => (
                <View
                  key={index}
                  style={[
                    styles.editorRowCard,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.background,
                    },
                  ]}
                >
                  {/* Inputs Section */}
                  <View style={styles.editorInputsContainer}>
                    {/* Ingredient Name */}
                    <View style={styles.editorInputGroup}>
                      <Text
                        style={[
                          styles.editorLabel,
                          { color: colors.textSecondary },
                        ]}
                      >
                        Name
                      </Text>
                      <TextInput
                        style={[
                          styles.editorInput,
                          {
                            color: colors.textPrimary,
                            borderColor: colors.border,
                            backgroundColor: colors.surface,
                          },
                        ]}
                        placeholder="e.g. Boneless Chicken Breast"
                        placeholderTextColor={colors.textSecondary}
                        value={item.name}
                        onChangeText={(val) =>
                          handleIngredientFieldChange(index, "name", val)
                        }
                      />
                    </View>

                    {/* Flex Row for Amount & Description */}
                    <View style={styles.editorFlexRow}>
                      {/* Amount */}
                      <View style={[styles.editorInputGroup, { flex: 1 }]}>
                        <Text
                          style={[
                            styles.editorLabel,
                            { color: colors.textSecondary },
                          ]}
                        >
                          Amount
                        </Text>
                        <TextInput
                          style={[
                            styles.editorInput,
                            {
                              color: colors.textPrimary,
                              borderColor: colors.border,
                              backgroundColor: colors.surface,
                            },
                          ]}
                          placeholder="e.g. 500g"
                          placeholderTextColor={colors.textSecondary}
                          value={item.amount}
                          onChangeText={(val) =>
                            handleIngredientFieldChange(index, "amount", val)
                          }
                        />
                      </View>

                      {/* Notes/Description */}
                      <View style={[styles.editorInputGroup, { flex: 2 }]}>
                        <Text
                          style={[
                            styles.editorLabel,
                            { color: colors.textSecondary },
                          ]}
                        >
                          Notes
                        </Text>
                        <TextInput
                          style={[
                            styles.editorInput,
                            {
                              color: colors.textPrimary,
                              borderColor: colors.border,
                              backgroundColor: colors.surface,
                            },
                          ]}
                          placeholder="e.g. cubed, skinless"
                          placeholderTextColor={colors.textSecondary}
                          value={item.description || ""}
                          onChangeText={(val) =>
                            handleIngredientFieldChange(
                              index,
                              "description",
                              val,
                            )
                          }
                        />
                      </View>
                    </View>
                  </View>

                  {/* Remove Button */}
                  <TouchableOpacity
                    style={[
                      styles.editorDeleteBtn,
                      { borderColor: colors.border },
                    ]}
                    onPress={() => handleRemoveIngredientRow(index)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}

              {/* Add Row Button */}
              <TouchableOpacity
                style={[
                  styles.editorAddBtn,
                  { borderColor: colors.primaryAccent },
                ]}
                onPress={handleAddIngredientRow}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={20} color={colors.primaryAccent} />
                <Text
                  style={[
                    styles.editorAddBtnText,
                    { color: colors.primaryAccent },
                  ]}
                >
                  Add Ingredient
                </Text>
              </TouchableOpacity>

              {/* Instructions Section Header */}
              <View
                style={[
                  styles.editorSectionHeader,
                  { borderTopColor: colors.border },
                ]}
              >
                <Text
                  style={[
                    styles.editorSectionTitle,
                    { color: colors.textPrimary },
                  ]}
                >
                  Instructions / Steps
                </Text>
              </View>

              {/* Instructions List */}
              {editedInstructions.map((item, index) => (
                <View
                  key={index}
                  style={[
                    styles.editorInstructionCard,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.background,
                    },
                  ]}
                >
                  <View style={styles.editorInstructionHeader}>
                    <Text
                      style={[
                        styles.editorInstructionNumber,
                        { color: colors.primaryAccent },
                      ]}
                    >
                      Step {index + 1}
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleRemoveInstructionRow(index)}
                      activeOpacity={0.7}
                      style={styles.editorInstructionDeleteBtn}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={16}
                        color="#EF4444"
                      />
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    style={[
                      styles.editorInstructionInput,
                      {
                        color: colors.textPrimary,
                        borderColor: colors.border,
                        backgroundColor: colors.surface,
                      },
                    ]}
                    placeholder={`e.g. Cook for 5 minutes...`}
                    placeholderTextColor={colors.textSecondary}
                    value={item}
                    onChangeText={(val) =>
                      handleInstructionFieldChange(index, val)
                    }
                    multiline
                    numberOfLines={3}
                  />
                </View>
              ))}

              {/* Add Instruction Step Row Button */}
              <TouchableOpacity
                style={[
                  styles.editorAddBtn,
                  { borderColor: colors.primaryAccent },
                ]}
                onPress={handleAddInstructionRow}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={20} color={colors.primaryAccent} />
                <Text
                  style={[
                    styles.editorAddBtnText,
                    { color: colors.primaryAccent },
                  ]}
                >
                  Add Instruction Step
                </Text>
              </TouchableOpacity>
            </ScrollView>

            {/* Footer Buttons */}
            <View
              style={[styles.editorFooter, { borderTopColor: colors.border }]}
            >
              <ActionButton
                title="Cancel"
                variant="outline"
                onPress={() => setIsEditPromptVisible(false)}
                style={styles.editorFooterBtn}
              />
              <ActionButton
                title={isSaveLoading ? "Saving..." : "Save Changes"}
                onPress={handleSaveManualRecipe}
                style={styles.editorFooterBtn}
                disabled={isSaveLoading}
              />
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Background AI Mutating Overlay */}
      <Modal visible={isMutating} transparent>
        <View style={styles.overlayBackground}>
          <View
            style={[styles.overlayContent, { backgroundColor: colors.surface }]}
          >
            <ActivityIndicator size="large" color={colors.primaryAccent} />
            <Text style={[styles.overlayTitle, { color: colors.textPrimary }]}>
              Culinary AI
            </Text>
            <Text style={[styles.overlayStep, { color: colors.textSecondary }]}>
              {mutationStep}
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
  container: {
    flex: 1,
  },
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
  scrollContent: {
    padding: 16,
    paddingTop: 20,
    paddingBottom: 110,
  },
  timelineLine: {
    position: "absolute",
    left: 13,
    top: 28,
    bottom: -16,
    width: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    marginBottom: 16,
  },
  heroCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginBottom: 20,
    alignItems: "center",
  },
  emojiContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  heroEmoji: {
    fontSize: 40,
  },
  heroTitleArea: {
    alignItems: "center",
    marginBottom: 18,
    gap: 8,
  },
  recipeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  recipeBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  recipeTitle: {
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 28,
  },
  metricsContainer: {
    width: "100%",
    gap: 8,
    marginTop: 4,
  },
  metricsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    gap: 8,
  },
  coreMetricPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  highlightedPill: {
    borderWidth: 1.5,
  },
  coreMetricTextContainer: {
    flex: 1,
    justifyContent: "center",
  },
  coreMetricValue: {
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 18,
  },
  coreMetricLabel: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginTop: 2,
  },
  macroMetricPill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  macroValue: {
    fontSize: 14,
    fontWeight: "800",
    marginTop: 2,
  },
  macroLabel: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginTop: 1,
  },
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
  instructionStepContainer: {
    flexDirection: "row",
    marginBottom: 16,
    gap: 12,
  },
  stepNumberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  stepNumberText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  stepContentContainer: {
    flex: 1,
    paddingTop: 3,
  },
  instructionStepText: {
    fontSize: 15,
    lineHeight: 24,
  },
  instructionIngredientHighlight: {
    fontWeight: "700",
  },

  bottomBar: {
    flexDirection: "row",
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingTop: 10,
    gap: 8,
    alignItems: "center",
  },
  toolbarBtnLarge: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  toolbarBtnLargeText: {
    fontSize: 13,
    fontWeight: "800",
  },
  toolbarBtnSub: {
    fontSize: 9,
    fontWeight: "500",
    marginTop: 1,
  },
  toolbarDivider: {
    width: 1,
    height: 36,
    borderRadius: 1,
  },
  toolbarBtnIcon: {
    width: 52,
    height: 56,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    gap: 3,
  },
  toolbarBtnIconText: {
    fontSize: 9,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 30,
    height: "75%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 18,
    borderBottomWidth: 1,
  },
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  closeModalBtn: {
    padding: 4,
  },
  modalScroll: {
    paddingVertical: 20,
  },
  selectedIngredientName: {
    fontSize: 22,
    fontWeight: "800",
  },
  selectedIngredientAmount: {
    fontSize: 15,
    marginTop: 4,
    marginBottom: 20,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 10,
    marginBottom: 10,
  },
  nutritionCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  nutritionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  nutritionLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  nutritionVal: {
    fontSize: 14,
    fontWeight: "700",
  },
  benefitCard: {
    padding: 16,
    marginBottom: 20,
  },
  benefitText: {
    fontSize: 14,
    lineHeight: 20,
  },
  descriptionCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 20,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 18,
    flex: 1,
  },
  modalCloseBtn: {
    marginTop: 10,
  },
  promptBody: {
    paddingVertical: 14,
    flex: 1,
  },
  promptLabel: {
    fontSize: 13,
    marginBottom: 10,
  },
  promptInput: {
    height: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    marginBottom: 16,
  },
  promptActions: {
    flexDirection: "row",
    gap: 10,
  },
  promptBtn: {
    flex: 1,
    height: 44,
    marginVertical: 0,
  },
  overlayBackground: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  overlayContent: {
    padding: 30,
    borderRadius: 20,
    alignItems: "center",
    width: "80%",
  },
  overlayTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginTop: 16,
  },
  overlayStep: {
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },
  modalSubHeaderTitle: {
    fontSize: 12,
    marginTop: 2,
  },
  editorScrollContent: {
    paddingVertical: 14,
  },
  editorScrollView: {
    flex: 1,
  },
  editorRowCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    gap: 10,
  },
  editorInputsContainer: {
    flex: 1,
    gap: 8,
  },
  editorInputGroup: {
    gap: 4,
  },
  editorFlexRow: {
    flexDirection: "row",
    gap: 8,
  },
  editorLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  editorInput: {
    height: 38,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 14,
  },
  editorDeleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  editorAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 8,
    marginBottom: 20,
    gap: 6,
  },
  editorAddBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },
  editorFooter: {
    flexDirection: "row",
    borderTopWidth: 1,
    paddingTop: 16,
    gap: 10,
  },
  editorFooterBtn: {
    flex: 1,
    height: 48,
    marginVertical: 0,
  },
  editorSectionHeader: {
    borderTopWidth: 1,
    marginTop: 20,
    paddingTop: 16,
    marginBottom: 12,
  },
  editorSectionTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  editorInstructionCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  editorInstructionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  editorInstructionNumber: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  editorInstructionDeleteBtn: {
    padding: 4,
  },
  editorInstructionInput: {
    minHeight: 60,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    textAlignVertical: "top",
  },
  recalcBanner: {
    borderWidth: 1.5,
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  recalcBannerTextContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  recalcBannerTitle: {
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 4,
  },
  recalcBannerSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  recalcBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  recalcBtnText: {
    fontSize: 13,
    fontWeight: "800",
  },
});
