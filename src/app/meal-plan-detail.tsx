import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, getDoc, setDoc, deleteDoc, limit, collection, getDocs, query } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TextInput,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";

import { CustomAlert } from "@/components/CustomAlert";
import { db } from "@/services/firebase";
import { RootState } from "@/store";
import { DailyPlan, setWeeklyPlan, clearPlan } from "@/store/plannerSlice";
import { setActiveRecipe } from "@/store/recipeSlice";
import { ThemeColors } from "@/theme/colors";
import { regenerateMealItem } from "@/services/gemini";
import { useNetInfo } from "@react-native-community/netinfo";

export default function MealPlanDetailScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { id } = useLocalSearchParams<{ id: string }>();

  const mode = useSelector((state: RootState) => state.theme.mode);
  const colors = ThemeColors[mode];

  const userId = useSelector((state: RootState) => state.auth.uid);
  const activePlan = useSelector(
    (state: RootState) => state.planner.weeklyPlan || [],
  );

  const profile = useSelector((state: RootState) => state.profile);
  const netInfo = useNetInfo();

  const [planDays, setPlanDays] = useState<DailyPlan[]>([]);
  const [planTitle, setPlanTitle] = useState("Meal Plan Details");
  const [loading, setLoading] = useState(false);
  const [activating, setActivating] = useState(false);
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [newLabelText, setNewLabelText] = useState("");
  const [activeRegenKey, setActiveRegenKey] = useState<{ date: string; mealType: "breakfast" | "lunch" | "dinner" } | null>(null);

  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type?: "info" | "success" | "error" | "confirm";
    buttons?: Array<{ text: string; onPress?: () => void; style?: "default" | "cancel" | "destructive" }>;
  }>({ visible: false, title: "", message: "" });

  const handleActivatePlan = async () => {
    if (!userId || planDays.length === 0) return;
    setActivating(true);
    try {
      await setDoc(doc(db, `users/${userId}/active_plan/data`), {
        weeklyPlan: planDays,
        planGeneratedAt: new Date().toISOString(),
      });

      dispatch(setWeeklyPlan(planDays));

      setAlertConfig({
        visible: true,
        title: "Plan Activated",
        message: "This meal plan is now set as your active plan!",
        type: "success",
      });
    } catch (err) {
      console.warn("[MealPlanDetail] Activation error:", err);
      setAlertConfig({
        visible: true,
        title: "Activation Failed",
        message: "Could not activate this plan. Please check your connection.",
        type: "error",
      });
    } finally {
      setActivating(false);
    }
  };

  const handleRenamePlan = () => {
    setNewLabelText(planTitle);
    setRenameModalVisible(true);
  };

  const saveNewPlanName = async () => {
    if (!newLabelText.trim() || !userId || !id || id === "active") return;
    try {
      const docRef = doc(db, `users/${userId}/meal_plans`, id);
      await setDoc(docRef, { label: newLabelText.trim() }, { merge: true });
      setPlanTitle(newLabelText.trim());
      setRenameModalVisible(false);
      setAlertConfig({
        visible: true,
        title: "Rename Successful",
        message: "The meal plan has been renamed.",
        type: "success",
      });
    } catch (err) {
      console.warn("Rename plan error:", err);
    }
  };

  const handleDeletePlan = () => {
    setAlertConfig({
      visible: true,
      title: "Delete Plan",
      message: `Are you sure you want to delete "${planTitle}"?`,
      type: "confirm",
      buttons: [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              if (userId && id && id !== "active") {
                await deleteDoc(doc(db, `users/${userId}/meal_plans`, id));
                router.back();
              }
            } catch (err) {
              console.warn("Delete plan error:", err);
            }
          },
        },
      ],
    });
  };

  const handleDeactivateActivePlan = () => {
    setAlertConfig({
      visible: true,
      title: "Clear Active Plan",
      message: "Are you sure you want to deactivate and remove your current active plan? This will not delete it from your saved history.",
      type: "confirm",
      buttons: [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear Plan",
          style: "destructive",
          onPress: async () => {
            try {
              if (userId) {
                await deleteDoc(doc(db, `users/${userId}/active_plan/data`));
                dispatch(clearPlan());
                router.back();
              }
            } catch (err) {
              console.warn("Clear active plan error:", err);
            }
          },
        },
      ],
    });
  };

  const getCookedHistoryTitles = async (): Promise<string[]> => {
    if (!userId) return [];
    try {
      const q = query(collection(db, `users/${userId}/cooked_memory`), limit(10));
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

  const handleRegenerateMeal = async (date: string, dayName: string, mealType: "breakfast" | "lunch" | "dinner") => {
    if (netInfo.isConnected === false) {
      setAlertConfig({
        visible: true,
        title: "No Connection",
        message: "An active internet connection is required to refresh meals.",
        type: "error",
      });
      return;
    }

    setActiveRegenKey({ date, mealType });
    try {
      const pastMeals = await getCookedHistoryTitles();
      const newMeal = await regenerateMealItem(date, dayName, mealType, {
        pantryList: [],
        profile,
        pastMeals,
      });

      const updatedPlanDays = planDays.map((day) => {
        if (day.date === date) {
          return {
            ...day,
            meals: {
              ...day.meals,
              [mealType]: newMeal,
            },
          };
        }
        return day;
      });

      if (id === "active") {
        await setDoc(doc(db, `users/${userId}/active_plan/data`), {
          weeklyPlan: updatedPlanDays,
          planGeneratedAt: new Date().toISOString(),
        });
        dispatch(setWeeklyPlan(updatedPlanDays));
      } else if (id && userId) {
        await setDoc(doc(db, `users/${userId}/meal_plans`, id), {
          weeklyPlan: updatedPlanDays,
        }, { merge: true });
      }

      setPlanDays(updatedPlanDays);
    } catch (err) {
      console.warn("Meal swap fail in details:", err);
      setAlertConfig({
        visible: true,
        title: "Swap Failed",
        message: "Failed to swap meal. Please try again.",
        type: "error",
      });
    } finally {
      setActiveRegenKey(null);
    }
  };

  useEffect(() => {
    if (!id) return;

    if (id === "active") {
      setPlanDays(activePlan);
      setPlanTitle("Active Meal Plan");
    } else if (userId) {
      const fetchPlan = async () => {
        setLoading(true);
        try {
          const docRef = doc(db, `users/${userId}/meal_plans`, id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data && Array.isArray(data.weeklyPlan)) {
              setPlanDays(data.weeklyPlan);
              if (data.label) {
                setPlanTitle(data.label);
              } else if (data.createdAt) {
                const dateLabel = new Date(data.createdAt).toLocaleDateString();
                setPlanTitle(`${data.daysCount || 7}-Day Plan (${dateLabel})`);
              }
            }
          }
        } catch (err) {
          console.warn("[MealPlanDetail] Fetch plan error:", err);
        } finally {
          setLoading(false);
        }
      };
      fetchPlan();
    }
  }, [id, activePlan, userId]);

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

  const isActive =
    id === "active" ||
    (planDays.length > 0 &&
      activePlan.length > 0 &&
      JSON.stringify(planDays) === JSON.stringify(activePlan));

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "transparent" }}
      edges={["top"]}
    >
      <View
        style={[
          styles.header,
          {
            borderBottomColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text
            style={[styles.headerSubtitle, { color: colors.textSecondary }]}
          >
            PLAN VIEW
          </Text>
          <Text
            numberOfLines={1}
            style={[styles.headerTitle, { color: colors.textPrimary }]}
          >
            {planTitle}
          </Text>
        </View>
        <View style={styles.headerActions}>
          {id !== "active" && (
            <TouchableOpacity onPress={handleRenamePlan} style={styles.headerActionBtn}>
              <Ionicons name="pencil-outline" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          )}
          {id !== "active" ? (
            <TouchableOpacity onPress={handleDeletePlan} style={styles.headerActionBtn}>
              <Ionicons name="trash-outline" size={20} color="#FF3B30" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={handleDeactivateActivePlan} style={styles.headerActionBtn}>
              <Ionicons name="close-circle-outline" size={20} color="#FF3B30" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primaryAccent} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading plan details...
          </Text>
        </View>
      ) : (
        <ScrollView
          style={[styles.container, { backgroundColor: "transparent" }]}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {planDays.length > 0 ? (
            <View style={styles.weekWrapper}>
              {planDays.map((day) => (
                <View key={day.date} style={styles.dayGroup}>
                  <Text
                    style={[styles.dayGroupName, { color: colors.textPrimary }]}
                  >
                    {day.dayName} ({day.date})
                  </Text>
                  <View
                    style={[
                      styles.dayMealsList,
                      { borderColor: colors.border },
                    ]}
                  >
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
                      <View
                        key={type}
                        style={[
                          styles.smallMealRow,
                          { borderBottomColor: colors.border },
                        ]}
                      >
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => handleStartCook(meal)}
                          style={styles.smallMealLeft}
                          disabled={!meal}
                        >
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
                        </TouchableOpacity>

                        {meal && (
                          <View style={styles.smallMealRightArea}>
                            {activeRegenKey?.date === day.date && activeRegenKey?.mealType === type ? (
                              <ActivityIndicator
                                size="small"
                                color={colors.primaryAccent}
                                style={{ marginRight: 8 }}
                              />
                            ) : (
                              <TouchableOpacity
                                onPress={() => handleRegenerateMeal(day.date, day.dayName, type)}
                                style={styles.mealActionBtn}
                              >
                                <Ionicons name="refresh" size={16} color={colors.textSecondary} />
                              </TouchableOpacity>
                            )}
                            <TouchableOpacity
                              activeOpacity={0.7}
                              onPress={() => handleStartCook(meal)}
                              style={{ paddingLeft: 8 }}
                            >
                              <Ionicons
                                name="chevron-forward"
                                size={18}
                                color={colors.textSecondary}
                              />
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>📅</Text>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                Plan Not Found
              </Text>
              <Text
                style={[styles.emptySubtitle, { color: colors.textSecondary }]}
              >
                This meal plan details could not be found. Please double check
                your internet connection.
              </Text>
            </View>
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {planDays.length > 0 && (
        <View
          style={[
            styles.bottomBar,
            { borderTopColor: colors.border, backgroundColor: colors.surface },
          ]}
        >
          {isActive ? (
            <View
              style={[
                styles.activePill,
                { backgroundColor: `${colors.primaryAccent}1A` },
              ]}
            >
              <Ionicons
                name="checkmark-circle"
                size={16}
                color="#34C759"
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.activeText, { color: colors.textPrimary }]}>
                Currently Active Plan
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleActivatePlan}
              style={[
                styles.activateBtn,
                { backgroundColor: colors.primaryAccent },
              ]}
              disabled={activating}
            >
              {activating ? (
                <ActivityIndicator size="small" color={colors.background} />
              ) : (
                <>
                  <Ionicons
                    name="flash-outline"
                    size={16}
                    color={colors.background}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.activateBtnText,
                      { color: colors.background },
                    ]}
                  >
                    Activate This Plan
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}

      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        buttons={alertConfig.buttons}
        onClose={() => setAlertConfig((prev) => ({ ...prev, visible: false }))}
      />

      {/* Rename Modal */}
      <Modal visible={renameModalVisible} animationType="fade" transparent onRequestClose={() => setRenameModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background, height: "85%", paddingBottom: 40 }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Rename Meal Plan</Text>
            <TextInput
              value={newLabelText}
              onChangeText={setNewLabelText}
              placeholder="e.g. My Custom Week Plan"
              placeholderTextColor={colors.textSecondary}
              style={[styles.renameInput, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.background }]}
              autoFocus
            />
            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                onPress={() => setRenameModalVisible(false)}
                style={[styles.modalBtnCancel, { borderColor: colors.border }]}
              >
                <Text style={[styles.modalBtnCancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={saveNewPlanName}
                style={[styles.modalBtnSave, { backgroundColor: colors.primaryAccent }]}
              >
                <Text style={[styles.modalBtnSaveText, { color: colors.background }]}>Rename</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    minHeight: 76,
  },
  backBtn: {
    padding: 4,
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 12,
  },
  headerSubtitle: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 14,
    marginTop: 12,
    fontWeight: "600",
  },
  weekWrapper: {},
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
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  bottomBar: {
    padding: 16,
    borderTopWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  activePill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
    width: "100%",
  },
  activeText: {
    fontSize: 14,
    fontWeight: "700",
  },
  activateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
    width: "100%",
    height: 48,
  },
  activateBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerActionBtn: {
    padding: 6,
    marginLeft: 4,
  },
  smallMealRightArea: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  mealActionBtn: {
    padding: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    width: "85%",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 16,
    textAlign: "center",
  },
  renameInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    fontSize: 15,
    marginBottom: 20,
  },
  modalButtonsRow: {
    flexDirection: "row",
    gap: 12,
  },
  modalBtnCancel: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBtnCancelText: {
    fontWeight: "600",
  },
  modalBtnSave: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBtnSaveText: {
    fontWeight: "700",
  },
});
