import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";

import { CardContainer } from "@/components/CardContainer";
import { TabHeader } from "@/components/TabHeader";
import { RootState } from "@/store";
import { setActiveRecipe } from "@/store/recipeSlice";
import { ThemeColors, ThemeGradients } from "@/theme/colors";

export default function HomeScreen() {
  const router = useRouter();
  const dispatch = useDispatch();

  const mode = useSelector((state: RootState) => state.theme.mode);
  const colors = ThemeColors[mode];

  const userEmail = useSelector((state: RootState) => state.auth.email);

  const weeklyPlan = useSelector(
    (state: RootState) => state.planner.weeklyPlan,
  );
  const isPremium = useSelector(
    (state: RootState) => state.subscription.isPremium,
  );

  // Get Today's Plan
  const todayStr = new Date().toISOString().split("T")[0];
  const todayPlan = weeklyPlan.find((day) => day.date === todayStr);

  const handleSelectMeal = (meal: any) => {
    if (!meal) return;
    dispatch(
      setActiveRecipe({
        title: meal.title,
        prepTime: meal.prepTime,
        calories: meal.calories,
        totalProtein: meal.totalProtein || "0g",
        totalCarbs: meal.totalCarbs || "0g",
        totalFats: meal.totalFats || "0g",
        ingredients: meal.ingredients || [],
        instructions: meal.instructions || [],
      }),
    );
    router.push("/recipe-display");
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "transparent" }}
      edges={["top"]}
    >
      <TabHeader
        title="Home"
        subtitle="MY KITCHEN"
        rightElement={
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push("/preferences")}
            style={[
              styles.avatarBtn,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.avatarText, { color: colors.primaryAccent }]}>
              {userEmail ? userEmail.substring(0, 2).toUpperCase() : "US"}
            </Text>
            {isPremium && (
              <View style={styles.premiumIndicator}>
                <Ionicons name="sparkles" size={10} color="#FFCC00" />
              </View>
            )}
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={[styles.scroll, { backgroundColor: "transparent" }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Bento Grid */}
        <View style={styles.grid}>
          {/* Today's Plan Card (Large Top Card) */}
          <CardContainer
            gradient={ThemeGradients.cardYellow}
            style={[styles.todayCard, colors.cardShadow]}
          >
            <View style={styles.cardHeader}>
              <Ionicons name="calendar-outline" size={20} color="#1C1917" />
              <Text style={[styles.cardTitle, { color: "#1C1917" }]}>
                Today's Plan
              </Text>
            </View>

            {todayPlan ? (
              <View style={styles.mealsList}>
                {/* Breakfast */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handleSelectMeal(todayPlan.meals.breakfast)}
                  style={[styles.mealRow, { borderBottomColor: colors.border }]}
                >
                  <View style={styles.mealLeft}>
                    <Text style={styles.mealEmoji}>🍳</Text>
                    <View>
                      <Text
                        style={[
                          styles.mealType,
                          { color: "rgba(28, 25, 23, 0.6)" },
                        ]}
                      >
                        Breakfast
                      </Text>
                      <Text
                        numberOfLines={1}
                        style={[styles.mealTitle, { color: "#1C1917" }]}
                      >
                        {todayPlan.meals.breakfast?.title ||
                          "No meal scheduled"}
                      </Text>
                    </View>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color="rgba(28, 25, 23, 0.4)"
                  />
                </TouchableOpacity>

                {/* Lunch */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handleSelectMeal(todayPlan.meals.lunch)}
                  style={[styles.mealRow, { borderBottomColor: colors.border }]}
                >
                  <View style={styles.mealLeft}>
                    <Text style={styles.mealEmoji}>🥗</Text>
                    <View>
                      <Text
                        style={[
                          styles.mealType,
                          { color: "rgba(28, 25, 23, 0.6)" },
                        ]}
                      >
                        Lunch
                      </Text>
                      <Text
                        numberOfLines={1}
                        style={[styles.mealTitle, { color: "#1C1917" }]}
                      >
                        {todayPlan.meals.lunch?.title || "No meal scheduled"}
                      </Text>
                    </View>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color="rgba(28, 25, 23, 0.4)"
                  />
                </TouchableOpacity>

                {/* Dinner */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handleSelectMeal(todayPlan.meals.dinner)}
                  style={styles.mealRow}
                >
                  <View style={styles.mealLeft}>
                    <Text style={styles.mealEmoji}>🍛</Text>
                    <View>
                      <Text
                        style={[
                          styles.mealType,
                          { color: "rgba(28, 25, 23, 0.6)" },
                        ]}
                      >
                        Dinner
                      </Text>
                      <Text
                        numberOfLines={1}
                        style={[styles.mealTitle, { color: "#1C1917" }]}
                      >
                        {todayPlan.meals.dinner?.title || "No meal scheduled"}
                      </Text>
                    </View>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color="rgba(28, 25, 23, 0.4)"
                  />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.emptyPlanContainer}>
                <Text
                  style={[
                    styles.emptyPlanText,
                    { color: "rgba(28, 25, 23, 0.6)" },
                  ]}
                >
                  Your culinary planner is empty today.
                </Text>
                <TouchableOpacity
                  style={[styles.planWeeklyBtn, { backgroundColor: "#1C1917" }]}
                  onPress={() => router.push("/(tabs)/planner")}
                >
                  <Text style={[styles.planWeeklyBtnText, { color: "white" }]}>
                    Plan Weekly Meals
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </CardContainer>

          {/* Row of 2 Medium/Small Cards */}
          <View style={styles.row}>
            {/* Ingredients Card */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push("/(tabs)/pantry")}
              style={{ flex: 1 }}
            >
              <CardContainer
                gradient={ThemeGradients.cardGreen}
                style={[styles.pantryCard, colors.cardShadow]}
              >
                <View
                  style={[
                    styles.iconWrapper,
                    { backgroundColor: `rgba(28, 25, 23, 0.1)` },
                  ]}
                >
                  <Ionicons
                    name="restaurant-outline"
                    size={24}
                    color="#1C1917"
                  />
                </View>
                <Text style={[styles.bentoLabel, { color: "#1C1917" }]}>
                  What to Cook
                </Text>
                <Text
                  style={[
                    styles.bentoValue,
                    { color: "rgba(28, 25, 23, 0.6)" },
                  ]}
                >
                  Search by ingredients
                </Text>
                <Text style={[styles.bentoSubtext, { color: "#1C1917" }]}>
                  What can I cook? →
                </Text>
              </CardContainer>
            </TouchableOpacity>

            {/* Scan Card */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push("/(tabs)/capture")}
              style={{ flex: 1 }}
            >
              <CardContainer
                gradient={ThemeGradients.cardPurple}
                style={[styles.scanCard, colors.cardShadow]}
              >
                <View
                  style={[
                    styles.iconWrapper,
                    { backgroundColor: `rgba(28, 25, 23, 0.1)` },
                  ]}
                >
                  <Ionicons name="scan-outline" size={24} color="#1C1917" />
                </View>
                <Text style={[styles.bentoLabel, { color: "#1C1917" }]}>
                  Scan Recipe
                </Text>
                <Text
                  style={[
                    styles.bentoValue,
                    { color: "rgba(28, 25, 23, 0.6)" },
                  ]}
                >
                  From link or image
                </Text>
                <Text style={[styles.bentoSubtext, { color: "#1C1917" }]}>
                  Extract with AI →
                </Text>
              </CardContainer>
            </TouchableOpacity>
          </View>

          {/* History/Cooking Memory Banner Card */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push("/(tabs)/vault")}
            style={{ width: "100%" }}
          >
            <CardContainer style={[styles.vaultCard, colors.cardShadow]}>
              <View style={styles.vaultLeft}>
                <View
                  style={[
                    styles.iconWrapper,
                    { backgroundColor: `${colors.primaryAccent}1A` },
                  ]}
                >
                  <Ionicons
                    name="book-outline"
                    size={22}
                    color={colors.primaryAccent}
                  />
                </View>
                <View>
                  <Text
                    style={[styles.bentoLabel, { color: colors.textPrimary }]}
                  >
                    Cooking Memory
                  </Text>
                  <Text
                    style={[styles.bentoValue, { color: colors.textSecondary }]}
                  >
                    Review your timeline and history
                  </Text>
                </View>
              </View>
              <Ionicons
                name="arrow-forward"
                size={20}
                color={colors.primaryAccent}
              />
            </CardContainer>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 120,
  },

  avatarBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  avatarText: {
    fontSize: 14,
    fontWeight: "800",
  },
  premiumIndicator: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: "#000",
    borderRadius: 8,
    padding: 2,
    borderWidth: 1,
    borderColor: "#FFCC00",
  },
  grid: {
    width: "100%",
    gap: 10,
  },
  todayCard: {
    padding: 20,
    borderRadius: 28,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  mealsList: {
    width: "100%",
  },
  mealRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  mealLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  mealEmoji: {
    fontSize: 22,
  },
  mealType: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  mealTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginTop: 2,
    maxWidth: "85%",
  },
  emptyPlanContainer: {
    alignItems: "center",
    paddingVertical: 16,
  },
  emptyPlanText: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 16,
  },
  planWeeklyBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  planWeeklyBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },
  row: {
    flexDirection: "row",
    gap: 16,
  },
  pantryCard: {
    padding: 16,
    borderRadius: 28,
    height: 180,
    justifyContent: "space-between",
  },
  scanCard: {
    padding: 16,
    borderRadius: 28,
    height: 180,
    justifyContent: "space-between",
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  bentoLabel: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.3,
    marginTop: 8,
  },
  bentoValue: {
    fontSize: 13,
    marginTop: 2,
  },
  bentoSubtext: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 6,
  },
  vaultCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 24,
  },
  vaultLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
});
