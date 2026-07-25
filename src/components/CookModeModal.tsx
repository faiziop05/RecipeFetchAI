import React, { useState, useEffect } from "react";
import { Modal, View, Text, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { collection, addDoc } from "firebase/firestore";
import { db } from "@/services/firebase";
import { CardContainer } from "@/components/CardContainer";

interface CookModeModalProps {
  isVisible: boolean;
  onClose: () => void;
  recipe: any;
  colors: any;
  mode: string;
  userId: string | null;
  showAlert: (title: string, msg: string, type?: "info" | "success" | "error" | "confirm") => void;
}

export const CookModeModal: React.FC<CookModeModalProps> = ({
  isVisible,
  onClose,
  recipe,
  colors,
  mode,
  userId,
  showAlert,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [checkedPrepIngredients, setCheckedPrepIngredients] = useState<Record<string, boolean>>({});
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [isSaveLoading, setIsSaveLoading] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isVisible) {
      setCurrentStepIndex(0);
      setCheckedPrepIngredients({});
      setTimerSeconds(null);
      setIsTimerActive(false);
    }
  }, [isVisible]);

  // Timer logic
  useEffect(() => {
    let interval: any = null;
    if (isTimerActive && timerSeconds !== null && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => (prev !== null ? prev - 1 : null));
      }, 1000);
    } else if (timerSeconds === 0) {
      setIsTimerActive(false);
      showAlert("Timer Finished", "Your cooking step timer has completed!", "success");
      setTimerSeconds(null);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerActive, timerSeconds]);

  const parseMinutesFromText = (text: string): number | null => {
    const match = text.match(/(\d+)\s*(?:minute|min|hr|hour)s?/i);
    if (!match) return null;
    const num = parseInt(match[1], 10);
    if (text.toLowerCase().includes("hr") || text.toLowerCase().includes("hour")) {
      return num * 60;
    }
    return num;
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const handleStartTimer = (secs: number) => {
    setTimerSeconds(secs);
    setIsTimerActive(true);
  };

  const handleLogCooking = async () => {
    if (!userId) {
      showAlert("Auth Required", "You must be logged in to save cooking logs to your memory.", "info");
      return;
    }
    setIsSaveLoading(true);
    try {
      const memoryRef = collection(db, `users/${userId}/cooked_memory`);
      await addDoc(memoryRef, {
        recipe: {
          title: recipe.title,
          prepTime: recipe.prepTime,
          calories: recipe.calories,
          totalProtein: recipe.totalProtein || "",
          totalCarbs: recipe.totalCarbs || "",
          totalFats: recipe.totalFats || "",
          ingredients: recipe.ingredients || [],
          instructions: recipe.instructions || [],
          id: recipe.id || "",
        },
        cookedAt: new Date().toISOString(),
        rating: 5,
        notes: "Cooked via Cook Mode",
      });
      onClose();
      showAlert("Cooking Logged!", "We have added this meal to your Cooking Memory timeline.", "success");
    } catch (err) {
      console.error("Failed to log cooked memory:", err);
      showAlert("Log Failed", "Could not save log. Check your network connection and try again.", "error");
    } finally {
      setIsSaveLoading(false);
    }
  };

  if (!recipe) return null;

  return (
    <Modal visible={isVisible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView style={[styles.cookModeContainer, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={[styles.cookModeHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeCookBtn}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text numberOfLines={1} style={[styles.cookModeTitle, { color: colors.textPrimary }]}>
              {recipe.title}
            </Text>
            <Text style={[styles.stepIndicator, { color: colors.textSecondary }]}>
              {currentStepIndex === 0 ? "Checklist" : `Step ${currentStepIndex} of ${recipe.instructions.length}`}
            </Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Body */}
        <ScrollView
          style={[styles.cookModeScroll, { backgroundColor: colors.background }]}
          contentContainerStyle={styles.cookModeScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {currentStepIndex === 0 ? (
            // Step 0: Ingredient Checklist
            <View style={styles.stepCard}>
              <Text style={[styles.checklistTitle, { color: colors.textPrimary }]}>Prepare Ingredients</Text>
              <Text style={[styles.checklistSub, { color: colors.textSecondary }]}>
                Verify that you have all ingredients measured and ready before cooking:
              </Text>

              {recipe.ingredients.map((ing: any, idx: number) => {
                const isChecked = checkedPrepIngredients[ing.name] || false;
                return (
                  <TouchableOpacity
                    key={idx}
                    activeOpacity={0.7}
                    style={[styles.checklistItemRow, { borderBottomColor: colors.border }]}
                    onPress={() => setCheckedPrepIngredients((prev) => ({ ...prev, [ing.name]: !isChecked }))}
                  >
                    <Ionicons
                      name={isChecked ? "checkbox" : "square-outline"}
                      size={22}
                      color={isChecked ? colors.primaryAccent : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.checklistItemText,
                        { color: colors.textPrimary },
                        isChecked && styles.strikethroughText,
                      ]}
                    >
                      {ing.amount} {ing.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity
                style={[styles.beginCookingBtn, { backgroundColor: colors.primaryAccent }]}
                onPress={() => setCurrentStepIndex(1)}
              >
                <Text style={[styles.beginCookingBtnText, { color: colors.background }]}>Begin Cooking Steps</Text>
                <Ionicons name="arrow-forward" size={16} color={colors.background} />
              </TouchableOpacity>
            </View>
          ) : (
            // Step 1+: Cooking Steps
            <View style={styles.stepCard}>
              <Text style={[styles.stepNumHeader, { color: colors.primaryAccent }]}>STEP {currentStepIndex}</Text>
              <Text style={[styles.stepDescriptionText, { color: colors.textPrimary }]}>
                {recipe.instructions[currentStepIndex - 1]}
              </Text>

              {/* Step Timer block */}
              {(() => {
                const stepText = recipe.instructions[currentStepIndex - 1] || "";
                const mins = parseMinutesFromText(stepText);
                if (mins === null) return null;

                return (
                  <CardContainer style={[styles.timerCard, { borderColor: colors.border }]}>
                    <View style={styles.timerHeader}>
                      <Ionicons name="timer-outline" size={20} color={colors.primaryAccent} />
                      <Text style={[styles.timerTitle, { color: colors.textPrimary }]}>Step Timer</Text>
                    </View>

                    {timerSeconds !== null ? (
                      <View style={styles.timerContent}>
                        <Text style={[styles.timerDisplay, { color: colors.textPrimary }]}>
                          {formatTimer(timerSeconds)}
                        </Text>
                        <View style={styles.timerControlsRow}>
                          <TouchableOpacity
                            style={[styles.timerBtn, { backgroundColor: colors.primaryAccent }]}
                            onPress={() => setIsTimerActive(!isTimerActive)}
                          >
                            <Ionicons
                              name={isTimerActive ? "pause" : "play"}
                              size={18}
                              color={colors.background}
                            />
                            <Text style={[styles.timerBtnText, { color: colors.background }]}>
                              {isTimerActive ? "Pause" : "Resume"}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.timerBtn,
                              {
                                backgroundColor: colors.surface,
                                borderWidth: 1,
                                borderColor: colors.border,
                              },
                            ]}
                            onPress={() => {
                              setTimerSeconds(null);
                              setIsTimerActive(false);
                            }}
                          >
                            <Text style={[styles.timerBtnText, { color: colors.textPrimary }]}>Cancel</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={[
                          styles.startTimerBtn,
                          { backgroundColor: colors.surface, borderColor: colors.border },
                        ]}
                        onPress={() => handleStartTimer(mins * 60)}
                      >
                        <Text style={[styles.startTimerBtnText, { color: colors.textPrimary }]}>
                          Start {mins} Min Timer
                        </Text>
                        <Ionicons name="play" size={14} color={colors.textPrimary} />
                      </TouchableOpacity>
                    )}
                  </CardContainer>
                );
              })()}
            </View>
          )}
        </ScrollView>

        {/* Navigation footer */}
        <View style={[styles.cookModeFooter, { borderTopColor: colors.border }]}>
          {currentStepIndex > 0 ? (
            <TouchableOpacity
              style={[
                styles.navBtn,
                {
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => {
                setCurrentStepIndex((prev) => prev - 1);
                setTimerSeconds(null);
                setIsTimerActive(false);
              }}
            >
              <Ionicons name="arrow-back" size={16} color={colors.textPrimary} />
              <Text style={[styles.navBtnText, { color: colors.textPrimary }]}>Previous</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ flex: 1 }} />
          )}

          {currentStepIndex > 0 &&
            (currentStepIndex < recipe.instructions.length ? (
              <TouchableOpacity
                style={[styles.navBtn, { backgroundColor: colors.primaryAccent }]}
                onPress={() => {
                  setCurrentStepIndex((prev) => prev + 1);
                  setTimerSeconds(null);
                  setIsTimerActive(false);
                }}
              >
                <Text style={[styles.navBtnText, { color: colors.background }]}>Next Step</Text>
                <Ionicons name="arrow-forward" size={16} color={colors.background} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.navBtn, { backgroundColor: "#34C759" }]}
                onPress={handleLogCooking}
                disabled={isSaveLoading}
              >
                {isSaveLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={[styles.navBtnText, { color: "#FFFFFF" }]}>I Cooked This! 🎉</Text>
                  </>
                )}
              </TouchableOpacity>
            ))}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  cookModeContainer: {
    flex: 1,
  },
  cookModeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    height: 56,
    borderBottomWidth: 1,
  },
  closeCookBtn: {
    padding: 8,
    marginLeft: -8,
  },
  cookModeTitle: {
    fontSize: 16,
    fontWeight: "800",
    maxWidth: 200,
    textAlign: "center",
  },
  stepIndicator: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  cookModeScroll: {
    flex: 1,
  },
  cookModeScrollContent: {
    padding: 24,
  },
  stepCard: {
    padding: 12,
    borderRadius: 20,
  },
  checklistTitle: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  checklistSub: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  checklistItemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  checklistItemText: {
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
  },
  strikethroughText: {
    textDecorationLine: "line-through",
    opacity: 0.6,
  },
  beginCookingBtn: {
    marginTop: 30,
    height: 52,
    borderRadius: 26,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  beginCookingBtnText: {
    fontSize: 16,
    fontWeight: "800",
  },
  stepNumHeader: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 10,
  },
  stepDescriptionText: {
    fontSize: 20,
    lineHeight: 30,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  timerCard: {
    marginTop: 24,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  timerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  timerTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  timerContent: {
    alignItems: "center",
  },
  timerDisplay: {
    fontSize: 36,
    fontWeight: "900",
    marginBottom: 14,
    letterSpacing: 1,
  },
  timerControlsRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  timerBtn: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  timerBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },
  startTimerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
  },
  startTimerBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },
  cookModeFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    gap: 12,
  },
  navBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  navBtnText: {
    fontSize: 14,
    fontWeight: "800",
  },
});
