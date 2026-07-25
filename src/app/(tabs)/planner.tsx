import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";

import { ActionButton } from "@/components/ActionButton";
import { CardContainer } from "@/components/CardContainer";
import { CustomAlert } from "@/components/CustomAlert";
import { TabHeader } from "@/components/TabHeader";
import { db } from "@/services/firebase";
import { generateMealPlan, regenerateMealItem } from "@/services/gemini";
import { RootState } from "@/store";
import { clearPlan, updateSingleMeal } from "@/store/plannerSlice";
import { setActiveRecipe } from "@/store/recipeSlice";
import { ThemeColors, ThemeGradients } from "@/theme/colors";
import { useNetInfo } from "@react-native-community/netinfo";

export default function PlannerScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const netInfo = useNetInfo();

  const mode = useSelector((state: RootState) => state.theme.mode);
  const colors = ThemeColors[mode];

  const userId = useSelector((state: RootState) => state.auth.uid);
  const pantryList = useSelector(
    (state: RootState) => state.pantry.ingredients,
  );
  const profile = useSelector((state: RootState) => state.profile);
  const plannerState = useSelector((state: RootState) => state.planner);

  const [viewMode, setViewMode] = useState<"today" | "week">("today");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [activeRegenKey, setActiveRegenKey] = useState<{
    date: string;
    mealType: "breakfast" | "lunch" | "dinner";
  } | null>(null);

  // Generate Plan modal settings
  const [configModalVisible, setConfigModalVisible] = useState(false);
  const [daysCount, setDaysCount] = useState<1 | 3 | 7>(7);
  const [autoPlanEnabled, setAutoPlanEnabled] = useState(false);

  interface SavedPlan {
    id: string;
    createdAt: string;
    daysCount: number;
    label: string;
    weeklyPlan: any[];
  }
  const [savedPlans, setSavedPlans] = useState<SavedPlan[]>([]);

  useEffect(() => {
    if (!userId) {
      setSavedPlans([]);
      return;
    }

    const plansRef = collection(db, `users/${userId}/meal_plans`);
    const q = query(plansRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const plans: SavedPlan[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          plans.push({
            id: docSnap.id,
            createdAt: data.createdAt?.seconds
              ? new Date(data.createdAt.seconds * 1000).toISOString()
              : data.createdAt || "",
            daysCount: data.daysCount || 7,
            label: data.label || "",
            weeklyPlan: data.weeklyPlan || [],
          });
        });
        setSavedPlans(plans);
      },
      (err) => {
        console.warn("[PlannerScreen] Fetch saved plans error:", err);
      },
    );

    return () => unsubscribe();
  }, [userId]);

  const formatPlanDate = (isoString: string) => {
    try {
      if (!isoString) return "Unknown Date";
      const date = new Date(isoString);
      return `Generated on ${date.toLocaleDateString()} at ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    } catch {
      return "Unknown Date";
    }
  };

  const handleDeletePlan = async (id: string, label: string) => {
    showAlert(
      "Delete Plan",
      `Are you sure you want to delete "${label || "this plan"}"?`,
      "confirm",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, `users/${userId}/meal_plans`, id));
            } catch (err) {
              console.warn("Error deleting plan:", err);
              showAlert("Error", "Failed to delete meal plan.", "error");
            }
          },
        },
      ],
    );
  };

  const handleClearActivePlan = () => {
    showAlert(
      "Clear Current Plan",
      "Are you sure you want to deactivate and remove your current active plan? This will not delete it from your saved history.",
      "confirm",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear Plan",
          style: "destructive",
          onPress: async () => {
            try {
              if (userId) {
                await deleteDoc(doc(db, `users/${userId}/active_plan/data`));
                dispatch(clearPlan());
              }
            } catch (err) {
              console.warn("Failed to clear active plan:", err);
            }
          },
        },
      ],
    );
  };

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

  const getCookedHistoryTitles = async (): Promise<string[]> => {
    if (!userId) return [];
    try {
      const q = query(
        collection(db, `users/${userId}/cooked_memory`),
        limit(10),
      );
      const snapshot = await getDocs(q);
      const list: string[] = [];
      snapshot.forEach((doc) => {
        const title = doc.data().recipe?.title;
        if (title) list.push(title);
      });
      return list;
    } catch {
      return [];
    }
  };

  const handleGeneratePlan = async () => {
    if (netInfo.isConnected === false) {
      showAlert(
        "No Connection",
        "An active internet connection is required to generate plans.",
        "error",
      );
      return;
    }

    setConfigModalVisible(false);
    setLoading(true);
    setLoadingStep("Querying profile settings...");

    setTimeout(() => {
      setLoadingStep("Reading ingredients list...");
    }, 1000);

    setTimeout(() => {
      setLoadingStep("Mapping macro calorie profiles...");
    }, 2000);

    if (!userId) {
      showAlert(
        "Authentication Error",
        "You must be logged in to generate meal plans.",
        "error",
      );
      return;
    }

    try {
      const pastMeals = await getCookedHistoryTitles();
      const plan = await generateMealPlan(daysCount, {
        pantryEnabled: false,
        pantryList: [],
        profile,
        pastMeals,
      });

      const dateLabel = new Date().toLocaleDateString();
      const label = `${daysCount}-Day Plan (${dateLabel})`;

      const docRef = await addDoc(
        collection(db, `users/${userId}/meal_plans`),
        {
          weeklyPlan: plan,
          daysCount,
          createdAt: new Date().toISOString(),
          label,
        },
      );

      router.push(`/meal-plan-detail?id=${docRef.id}`);
    } catch (err: any) {
      console.warn("Planner generation error:", err);
      showAlert(
        "Generation Failed",
        err.message || "Failed to generate plan. Please try again.",
        "error",
      );
    } finally {
      setLoading(false);
      setLoadingStep("");
    }
  };

  const handleRegenerateMeal = async (
    date: string,
    dayName: string,
    mealType: "breakfast" | "lunch" | "dinner",
  ) => {
    if (netInfo.isConnected === false) {
      showAlert(
        "No Connection",
        "An active internet connection is required to refresh meals.",
        "error",
      );
      return;
    }

    setActiveRegenKey({ date, mealType });
    try {
      const pastMeals = await getCookedHistoryTitles();
      const newMeal = await regenerateMealItem(date, dayName, mealType, {
        pantryList,
        profile,
        pastMeals,
      });

      dispatch(updateSingleMeal({ date, mealType, meal: newMeal }));
    } catch (err: any) {
      console.warn("Meal item refresh fail:", err);
      showAlert(
        "Swap Failed",
        "Failed to swap meal. Please try again.",
        "error",
      );
    } finally {
      setActiveRegenKey(null);
    }
  };

  const handleStartCook = (meal: any) => {
    if (!meal) return;
    dispatch(
      setActiveRecipe({
        title: meal.title,
        prepTime: meal.prepTime,
        calories: meal.calories,
        totalProtein: meal.totalProtein || "—",
        totalCarbs: meal.totalCarbs || "—",
        totalFats: meal.totalFats || "—",
        ingredients: meal.ingredients || [],
        instructions: meal.instructions || [],
      }),
    );
    router.push("/recipe-display");
  };

  // Get date strings
  const todayStr = new Date().toISOString().split("T")[0];
  const todayPlan = plannerState.weeklyPlan?.find((d) => d.date === todayStr);

  const renderMealCard = (
    date: string,
    dayName: string,
    mealType: "breakfast" | "lunch" | "dinner",
    meal: any,
    emoji: string,
  ) => {
    const isRegenLoading =
      activeRegenKey?.date === date && activeRegenKey?.mealType === mealType;
    let gradient: readonly [string, string, ...string[]] | undefined;
    if (mealType === "breakfast") gradient = ThemeGradients.cardYellow;
    else if (mealType === "lunch") gradient = ThemeGradients.cardGreen;
    else gradient = ThemeGradients.cardPurple;

    return (
      <CardContainer key={mealType} gradient={gradient} style={styles.mealCard}>
        <View style={styles.mealHeader}>
          <View style={styles.mealTypeRow}>
            <Text style={styles.mealEmoji}>{emoji}</Text>
            <Text
              style={[styles.mealTypeName, { color: "rgba(28, 25, 23, 0.7)" }]}
            >
              {mealType}
            </Text>
          </View>
          <View style={styles.actions}>
            {isRegenLoading ? (
              <ActivityIndicator size="small" color="#1C1917" />
            ) : (
              <TouchableOpacity
                onPress={() => handleRegenerateMeal(date, dayName, mealType)}
                style={styles.actionIcon}
              >
                <Ionicons
                  name="refresh"
                  size={16}
                  color="rgba(28, 25, 23, 0.7)"
                />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {meal ? (
          <View style={styles.mealContent}>
            <Text style={[styles.mealTitle, { color: "#1C1917" }]}>
              {meal.title}
            </Text>
            <View style={styles.mealMeta}>
              <Text
                style={[styles.metaText, { color: "rgba(28, 25, 23, 0.7)" }]}
              >
                {meal.prepTime}
              </Text>
              <Text
                style={[styles.metaDot, { color: "rgba(28, 25, 23, 0.7)" }]}
              >
                •
              </Text>
              <Text
                style={[styles.metaText, { color: "rgba(28, 25, 23, 0.7)" }]}
              >
                {meal.calories}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.cookBtn, { backgroundColor: "#1C1917" }]}
              onPress={() => handleStartCook(meal)}
            >
              <Text style={[styles.cookBtnText, { color: "#FFFFFF" }]}>
                Cook Recipe
              </Text>
              <Ionicons name="restaurant-outline" size={14} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={[styles.noMealText, { color: "rgba(28, 25, 23, 0.7)" }]}>
            No meal scheduled
          </Text>
        )}
      </CardContainer>
    );
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "transparent" }}
      edges={["top"]}
    >
      <TabHeader
        title="Meal Planner"
        subtitle="WEEKLY PLAN"
        rightElement={
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setConfigModalVisible(true)}
            style={[
              styles.genPlanBtn,
              { borderColor: colors.border, backgroundColor: colors.surface },
            ]}
          >
            <Ionicons name="sparkles" size={14} color={colors.primaryAccent} />
            <Text
              style={[styles.genPlanBtnText, { color: colors.textPrimary }]}
            >
              Generate
            </Text>
          </TouchableOpacity>
        }
      />

      {/* Auto Plan Mode Switch Row */}
      <View style={[styles.autoPlanRow, { borderBottomColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.autoPlanTitle, { color: colors.textPrimary }]}>
            Auto Plan Mode
          </Text>
          <Text style={[styles.autoPlanSub, { color: colors.textSecondary }]}>
            Auto-generate new plans every Sunday morning
          </Text>
        </View>
        <Switch
          value={autoPlanEnabled}
          onValueChange={setAutoPlanEnabled}
          trackColor={{ false: colors.border, true: "#34C759" }}
        />
      </View>

      {plannerState.weeklyPlan?.length > 0 && (
        <View
          style={[
            styles.segmentedRow,
            {
              justifyContent: "space-between",
              alignItems: "center",
              paddingRight: 16,
            },
          ]}
        >
          <View style={{ flexDirection: "row", flex: 1 }}>
            <TouchableOpacity
              style={[
                styles.segmentBtn,
                viewMode === "today" && {
                  borderBottomColor: colors.primaryAccent,
                  borderBottomWidth: 2,
                },
              ]}
              onPress={() => setViewMode("today")}
            >
              <Text
                style={[
                  styles.segmentLabel,
                  {
                    color:
                      viewMode === "today"
                        ? colors.textPrimary
                        : colors.textSecondary,
                  },
                ]}
              >
                Today
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.segmentBtn,
                viewMode === "week" && {
                  borderBottomColor: colors.primaryAccent,
                  borderBottomWidth: 2,
                },
              ]}
              onPress={() => setViewMode("week")}
            >
              <Text
                style={[
                  styles.segmentLabel,
                  {
                    color:
                      viewMode === "week"
                        ? colors.textPrimary
                        : colors.textSecondary,
                  },
                ]}
              >
                This Week
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleClearActivePlan}
            style={styles.clearActiveBtn}
          >
            <Ionicons
              name="trash-outline"
              size={15}
              color="#FF3B30"
              style={{ marginRight: 4 }}
            />
            <Text style={styles.clearActiveText}>Clear Active</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        style={[styles.container, { backgroundColor: "transparent" }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {plannerState.weeklyPlan?.length === 0 ? (
          <View style={styles.centerContainer}>
            <CardContainer style={styles.emptyCard}>
              <Text style={styles.emptyEmoji}>📅 🥗 🍗</Text>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                Plan Your Meals
              </Text>
              <Text
                style={[styles.emptySubtitle, { color: colors.textSecondary }]}
              >
                No active meal plans found. Generate a weekly plan matching your
                diet, allergies, budget, and ingredients you already own.
              </Text>
              <ActionButton
                title="Generate Meal Plan"
                onPress={() => setConfigModalVisible(true)}
                style={styles.emptyBtn}
              />
            </CardContainer>
          </View>
        ) : viewMode === "today" ? (
          <View style={styles.todayWrapper}>
            <Text style={[styles.dateHeader, { color: colors.textPrimary }]}>
              {todayPlan
                ? `Today's Schedule (${todayPlan.dayName})`
                : "No Schedule For Today"}
            </Text>
            {todayPlan ? (
              <View style={styles.todayMeals}>
                {renderMealCard(
                  todayPlan.date,
                  todayPlan.dayName,
                  "breakfast",
                  todayPlan.meals.breakfast,
                  "🍳",
                )}
                {renderMealCard(
                  todayPlan.date,
                  todayPlan.dayName,
                  "lunch",
                  todayPlan.meals.lunch,
                  "🥗",
                )}
                {renderMealCard(
                  todayPlan.date,
                  todayPlan.dayName,
                  "dinner",
                  todayPlan.meals.dinner,
                  "🍛",
                )}
              </View>
            ) : (
              <Text
                style={[
                  styles.noPlanTodayText,
                  { color: colors.textSecondary },
                ]}
              >
                Today is not scheduled in the active plan. Switch to 'This Week'
                to view scheduled days.
              </Text>
            )}
          </View>
        ) : (
          <View style={styles.weekWrapper}>
            {plannerState.weeklyPlan.map((day) => (
              <View key={day.date} style={styles.dayGroup}>
                <Text
                  style={[styles.dayGroupName, { color: colors.textPrimary }]}
                >
                  {day.dayName} ({day.date})
                </Text>
                <View style={styles.dayMealsList}>
                  {[
                    {
                      type: "breakfast" as const,
                      meal: day.meals.breakfast,
                      emoji: "🍳",
                    },
                    {
                      type: "lunch" as const,
                      meal: day.meals.lunch,
                      emoji: "🥗",
                    },
                    {
                      type: "dinner" as const,
                      meal: day.meals.dinner,
                      emoji: "🍛",
                    },
                  ].map(({ type, meal, emoji }) => (
                    <TouchableOpacity
                      key={type}
                      activeOpacity={0.7}
                      onPress={() => handleStartCook(meal)}
                      style={[
                        styles.smallMealRow,
                        { borderBottomColor: colors.border },
                      ]}
                    >
                      <View style={styles.smallMealLeft}>
                        <Text style={styles.smallMealEmoji}>{emoji}</Text>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              styles.smallMealType,
                              { color: colors.textSecondary },
                            ]}
                          >
                            {type}
                          </Text>
                          <Text
                            numberOfLines={1}
                            style={[
                              styles.smallMealTitle,
                              { color: colors.textPrimary },
                            ]}
                          >
                            {meal?.title || "No meal scheduled"}
                          </Text>
                        </View>
                      </View>
                      <Ionicons
                        name="chevron-forward"
                        size={18}
                        color={colors.textSecondary}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Saved Meal Plans Section */}
        {savedPlans.length > 0 && (
          <View style={styles.historySection}>
            <Text style={[styles.historyTitle, { color: colors.textPrimary }]}>
              Saved Meal Plans
            </Text>
            {savedPlans.map((plan) => (
              <CardContainer
                key={plan.id}
                style={[
                  styles.historyCard,
                  { backgroundColor: colors.surface, padding: 0 },
                ]}
              >
                <View style={styles.historyCardInner}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() =>
                      router.push(`/meal-plan-detail?id=${plan.id}`)
                    }
                    style={styles.historyLeftArea}
                  >
                    <View
                      style={[
                        styles.historyIconWrapper,
                        { backgroundColor: `${colors.primaryAccent}1A` },
                      ]}
                    >
                      <Ionicons
                        name="calendar-outline"
                        size={20}
                        color={colors.primaryAccent}
                      />
                    </View>
                    <View style={styles.historyMeta}>
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.historyCardTitle,
                          { color: colors.textPrimary },
                        ]}
                      >
                        {plan.label || `${plan.daysCount}-Day Plan`}
                      </Text>
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.historyCardSub,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {formatPlanDate(plan.createdAt)}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <View style={styles.historyRightArea}>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => handleDeletePlan(plan.id, plan.label)}
                      style={styles.deleteBtn}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={18}
                        color="#FF3B30"
                      />
                    </TouchableOpacity>
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={colors.textSecondary}
                    />
                  </View>
                </View>
              </CardContainer>
            ))}
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Generate plan setup modal */}
      <Modal visible={configModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: colors.background,
                height: "85%",
                paddingBottom: 40,
              },
            ]}
          >
            <View
              style={[styles.modalHeader, { borderBottomColor: colors.border }]}
            >
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                Generate Meal Plan
              </Text>
              <TouchableOpacity
                onPress={() => setConfigModalVisible(false)}
                style={styles.closeModalBtn}
              >
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody}>
              {/* Day count picker */}
              <Text
                style={[styles.modalLabel, { color: colors.textSecondary }]}
              >
                Days Count
              </Text>
              <View style={styles.choiceRow}>
                {([1, 3, 7] as const).map((num) => (
                  <TouchableOpacity
                    key={num}
                    style={[
                      styles.choiceChip,
                      {
                        backgroundColor:
                          daysCount === num
                            ? colors.primaryAccent
                            : colors.background,
                        borderColor: colors.border,
                      },
                    ]}
                    onPress={() => setDaysCount(num)}
                  >
                    <Text
                      style={{
                        color:
                          daysCount === num
                            ? colors.background
                            : colors.textPrimary,
                        fontSize: 13,
                      }}
                    >
                      {num} Day{num > 1 ? "s" : ""}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Active Preferences Section */}
              <View
                style={{
                  height: 1,
                  backgroundColor: colors.border,
                  marginVertical: 18,
                }}
              />
              <View style={styles.preferencesSection}>
                <View style={styles.preferencesHeader}>
                  <Text
                    style={[
                      styles.modalLabel,
                      { color: colors.textSecondary, marginBottom: 0 },
                    ]}
                  >
                    Applied Preferences
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setConfigModalVisible(false);
                      router.push("/preferences");
                    }}
                    style={styles.editPrefsLink}
                  >
                    <Text
                      style={[
                        styles.editPrefsText,
                        { color: colors.primaryAccent },
                      ]}
                    >
                      ✏️ Edit Settings
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.prefsSummaryGrid}>
                  {/* Dietary chip */}
                  <View
                    style={[
                      styles.prefSummaryItem,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.prefSummaryLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Dietary
                    </Text>
                    <Text
                      style={[
                        styles.prefSummaryValue,
                        { color: colors.textPrimary },
                      ]}
                    >
                      {profile.dietary === "none"
                        ? "No constraints"
                        : profile.dietary.charAt(0).toUpperCase() +
                          profile.dietary.slice(1)}
                    </Text>
                  </View>

                  {/* Culture chip */}
                  <View
                    style={[
                      styles.prefSummaryItem,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.prefSummaryLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Cuisine Region
                    </Text>
                    <Text
                      style={[
                        styles.prefSummaryValue,
                        { color: colors.textPrimary },
                      ]}
                    >
                      {profile.culture === "none"
                        ? "Any / All"
                        : profile.culture}
                    </Text>
                  </View>

                  {/* Spicy and Budget info */}
                  <View
                    style={[
                      styles.prefSummaryItem,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.prefSummaryLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Spicy Level
                    </Text>
                    <Text
                      style={[
                        styles.prefSummaryValue,
                        { color: colors.textPrimary },
                      ]}
                    >
                      {"🌶️".repeat(profile.spicyLevel || 3)} (
                      {profile.spicyLevel || 3}/5)
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.prefSummaryItem,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.prefSummaryLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Budget
                    </Text>
                    <Text
                      style={[
                        styles.prefSummaryValue,
                        {
                          color: colors.textPrimary,
                          textTransform: "capitalize",
                        },
                      ]}
                    >
                      {profile.budgetLevel || "med"}
                    </Text>
                  </View>

                  {/* Allergies list */}
                  {profile.allergies && profile.allergies.length > 0 && (
                    <View
                      style={[
                        styles.prefSummaryItem,
                        {
                          backgroundColor: colors.background,
                          borderColor: colors.border,
                          width: "100%",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.prefSummaryLabel,
                          { color: colors.textSecondary },
                        ]}
                      >
                        Avoid (Allergies)
                      </Text>
                      <Text
                        style={[
                          styles.prefSummaryValue,
                          { color: colors.textPrimary },
                        ]}
                        numberOfLines={1}
                      >
                        {profile.allergies
                          .map(
                            (a: string) =>
                              a.charAt(0).toUpperCase() + a.slice(1),
                          )
                          .join(", ")}
                      </Text>
                    </View>
                  )}

                  {/* Health Goals list */}
                  {profile.healthGoals && profile.healthGoals.length > 0 && (
                    <View
                      style={[
                        styles.prefSummaryItem,
                        {
                          backgroundColor: colors.background,
                          borderColor: colors.border,
                          width: "100%",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.prefSummaryLabel,
                          { color: colors.textSecondary },
                        ]}
                      >
                        Health Goals
                      </Text>
                      <Text
                        style={[
                          styles.prefSummaryValue,
                          { color: colors.textPrimary },
                        ]}
                        numberOfLines={1}
                      >
                        {profile.healthGoals
                          .map((g: string) => {
                            if (g === "weightLoss") return "Weight Loss";
                            if (g === "highProtein") return "High Protein";
                            if (g === "balancedDiet") return "Balanced";
                            if (g === "lowCarb") return "Low Carb";
                            return g;
                          })
                          .join(", ")}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <ActionButton
                title="Build My Plan"
                onPress={handleGeneratePlan}
                style={styles.modalBtn}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Loading Modal overlay */}
      <Modal visible={loading} transparent animationType="fade">
        <View style={styles.overlayBackground}>
          <View
            style={[
              styles.overlayContent,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
              },
            ]}
          >
            <ActivityIndicator size="large" color={colors.primaryAccent} />
            <Text style={[styles.overlayTitle, { color: colors.textPrimary }]}>
              Planner Engine mapping...
            </Text>
            <Text style={[styles.overlayStep, { color: colors.textSecondary }]}>
              {loadingStep}
            </Text>
            <Text style={[styles.overlayStep, { color: colors.textSecondary }]}>
              It can take up to 1 minute...
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
  scrollContent: {
    padding: 20,
  },

  genPlanBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  genPlanBtnText: {
    fontSize: 12,
    fontWeight: "600",
  },
  autoPlanRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  autoPlanTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  autoPlanSub: {
    fontSize: 11,
    marginTop: 2,
  },
  segmentedRow: {
    flexDirection: "row",
    width: "100%",
    borderBottomWidth: 1,
    borderColor: "#E5E5EA",
  },
  segmentBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
  },
  segmentLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 40,
  },
  emptyCard: {
    padding: 24,
    borderRadius: 24,
    alignItems: "center",
  },
  emptyEmoji: {
    fontSize: 36,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 20,
  },
  emptyBtn: {
    marginTop: 20,
    // width: "100%",
  },
  todayWrapper: {
    marginTop: 10,
  },
  dateHeader: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 14,
  },
  todayMeals: {
    gap: 16,
  },
  mealCard: {
    padding: 16,
    borderRadius: 20,
  },
  mealHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  mealTypeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  mealEmoji: {
    fontSize: 18,
  },
  mealTypeName: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  actions: {},
  actionIcon: {
    padding: 4,
  },
  mealContent: {},
  mealTitle: {
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  mealMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
    marginBottom: 12,
  },
  metaText: {
    fontSize: 13,
    fontWeight: "500",
  },
  metaDot: {
    fontSize: 12,
  },
  cookBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 40,
    borderRadius: 14,
  },
  cookBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },
  noMealText: {
    fontSize: 14,
    fontStyle: "italic",
    paddingVertical: 10,
  },
  noPlanTodayText: {
    fontSize: 14,
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 20,
  },
  weekWrapper: {
    marginTop: 10,
  },
  dayGroup: {
    marginBottom: 20,
  },
  dayGroupName: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 10,
  },
  dayMealsList: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "#E5E5EA",
  },
  smallMealRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  smallMealLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  smallMealEmoji: {
    fontSize: 18,
  },
  smallMealType: {
    fontSize: 8,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  smallMealTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 16,
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  closeModalBtn: {
    padding: 4,
  },
  modalBody: {
    paddingBottom: 20,
  },
  modalLabel: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  choiceRow: {
    flexDirection: "row",
    gap: 8,
  },
  choiceChip: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  switchTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  switchSubtitle: {
    fontSize: 12,
    marginTop: 2,
    maxWidth: "90%",
  },
  modalBtn: {
    marginTop: 10,
    height: 52,
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
  preferencesSection: {
    marginBottom: 20,
  },
  preferencesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  editPrefsLink: {
    paddingVertical: 2,
  },
  editPrefsText: {
    fontSize: 12,
    fontWeight: "700",
  },
  prefsSummaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  prefSummaryItem: {
    flex: 1,
    minWidth: "45%",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  prefSummaryLabel: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  prefSummaryValue: {
    fontSize: 13,
    fontWeight: "600",
  },
  historySection: {
    marginTop: 24,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 12,
  },
  historyCard: {
    marginBottom: 12,
    borderRadius: 20,
    overflow: "hidden",
  },
  historyCardInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  historyLeftArea: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  historyIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  historyMeta: {
    flex: 1,
  },
  historyCardTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  historyCardSub: {
    fontSize: 11,
    marginTop: 2,
  },
  historyRightArea: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  deleteBtn: {
    padding: 6,
  },
  clearActiveBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FF3B30",
  },
  clearActiveText: {
    color: "#FF3B30",
    fontSize: 11,
    fontWeight: "700",
  },
});
