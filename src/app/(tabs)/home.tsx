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
import { RootState } from "@/store";
import { setActiveRecipe } from "@/store/recipeSlice";
import { ThemeColors, ThemeGradients, Typography, Spacing, Radius } from "@/theme/colors";

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

  // Greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const userName = userEmail ? userEmail.split("@")[0] : "Chef";

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

  const quickActions = [
    {
      icon: "scan-outline" as const,
      label: "Scan Recipe",
      desc: "From link or photo",
      route: "/(tabs)/capture" as const,
    },
    {
      icon: "restaurant-outline" as const,
      label: "What to Cook",
      desc: "Match ingredients",
      route: "/(tabs)/pantry" as const,
    },
    {
      icon: "create-outline" as const,
      label: "Create Recipe",
      desc: "Manual entry",
      route: "/manual-recipe" as const,
    },
    {
      icon: "calendar-outline" as const,
      label: "Meal Planner",
      desc: "Plan your week",
      route: "/(tabs)/planner" as const,
    },
  ];

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "transparent" }}
      edges={["top"]}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <View style={styles.greetingContainer}>
          <Text style={[Typography.overline, { color: colors.textTertiary }]}>
            {getGreeting()}
          </Text>
          <Text style={[Typography.screenTitle, { color: colors.textPrimary }]}>
            {userName}
          </Text>
        </View>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.push("/preferences")}
          style={[
            styles.avatarBtn,
            { backgroundColor: colors.primaryAccentMuted, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.avatarText, { color: colors.primaryAccent }]}>
            {userEmail ? userEmail.substring(0, 2).toUpperCase() : "US"}
          </Text>
          {isPremium && (
            <View style={[styles.premiumBadge, { backgroundColor: colors.primaryAccent }]}>
              <Ionicons name="sparkles" size={8} color="#FFFFFF" />
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: "transparent" }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Today's Plan Card */}
        <CardContainer style={styles.todayCard}>
          <View style={styles.todayHeader}>
            <View style={[styles.todayIconWrap, { backgroundColor: colors.primaryAccentMuted }]}>
              <Ionicons name="sunny-outline" size={18} color={colors.primaryAccent} />
            </View>
            <View>
              <Text style={[Typography.cardTitle, { color: colors.textPrimary }]}>
                Today's Plan
              </Text>
              <Text style={[Typography.caption, { color: colors.textSecondary, marginTop: 1 }]}>
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </Text>
            </View>
          </View>

          {todayPlan ? (
            <View style={styles.mealsList}>
              {/* Breakfast */}
              <TouchableOpacity
                activeOpacity={0.6}
                onPress={() => handleSelectMeal(todayPlan.meals.breakfast)}
                style={[styles.mealRow, { borderBottomColor: colors.borderLight }]}
              >
                <View style={styles.mealLeft}>
                  <Text style={styles.mealEmoji}>🍳</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[Typography.labelSmall, { color: colors.textTertiary }]}>
                      BREAKFAST
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={[Typography.bodyMedium, { color: colors.textPrimary, marginTop: 2 }]}
                    >
                      {todayPlan.meals.breakfast?.title || "No meal scheduled"}
                    </Text>
                  </View>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={colors.textTertiary}
                />
              </TouchableOpacity>

              {/* Lunch */}
              <TouchableOpacity
                activeOpacity={0.6}
                onPress={() => handleSelectMeal(todayPlan.meals.lunch)}
                style={[styles.mealRow, { borderBottomColor: colors.borderLight }]}
              >
                <View style={styles.mealLeft}>
                  <Text style={styles.mealEmoji}>🥗</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[Typography.labelSmall, { color: colors.textTertiary }]}>
                      LUNCH
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={[Typography.bodyMedium, { color: colors.textPrimary, marginTop: 2 }]}
                    >
                      {todayPlan.meals.lunch?.title || "No meal scheduled"}
                    </Text>
                  </View>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={colors.textTertiary}
                />
              </TouchableOpacity>

              {/* Dinner */}
              <TouchableOpacity
                activeOpacity={0.6}
                onPress={() => handleSelectMeal(todayPlan.meals.dinner)}
                style={styles.mealRow}
              >
                <View style={styles.mealLeft}>
                  <Text style={styles.mealEmoji}>🍛</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[Typography.labelSmall, { color: colors.textTertiary }]}>
                      DINNER
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={[Typography.bodyMedium, { color: colors.textPrimary, marginTop: 2 }]}
                    >
                      {todayPlan.meals.dinner?.title || "No meal scheduled"}
                    </Text>
                  </View>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={colors.textTertiary}
                />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.emptyPlanContainer}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.surfaceSecondary }]}>
                <Ionicons name="restaurant-outline" size={28} color={colors.textTertiary} />
              </View>
              <Text
                style={[Typography.body, { color: colors.textSecondary, textAlign: "center", marginTop: Spacing.md }]}
              >
                No meals planned for today
              </Text>
              <TouchableOpacity
                style={[styles.planBtn, { backgroundColor: colors.primaryAccent }]}
                onPress={() => router.push("/(tabs)/planner")}
              >
                <Text style={[Typography.buttonMedium, { color: "#FFFFFF" }]}>
                  Plan Your Week
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </CardContainer>

        {/* Quick Actions Grid */}
        <Text style={[Typography.sectionTitle, { color: colors.textPrimary, marginTop: Spacing.xxl, marginBottom: Spacing.md }]}>
          Quick Actions
        </Text>
        <View style={styles.actionsGrid}>
          {quickActions.map((action, idx) => (
            <CardContainer
              key={idx}
              style={styles.actionCard}
              onPress={() => router.push(action.route)}
            >
              <View style={[styles.actionIconWrap, { backgroundColor: colors.primaryAccentMuted }]}>
                <Ionicons name={action.icon} size={22} color={colors.primaryAccent} />
              </View>
              <Text style={[Typography.label, { color: colors.textPrimary, marginTop: Spacing.sm }]}>
                {action.label}
              </Text>
              <Text style={[Typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                {action.desc}
              </Text>
            </CardContainer>
          ))}
        </View>

        {/* Cooking Memory Banner */}
        <CardContainer
          style={styles.memoryCard}
          onPress={() => router.push("/(tabs)/vault")}
        >
          <View style={styles.memoryLeft}>
            <View style={[styles.memoryIconWrap, { backgroundColor: colors.primaryAccentMuted }]}>
              <Ionicons name="book-outline" size={20} color={colors.primaryAccent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[Typography.cardTitle, { color: colors.textPrimary }]}>
                Cooking Memory
              </Text>
              <Text style={[Typography.caption, { color: colors.textSecondary }]}>
                Review your timeline and history
              </Text>
            </View>
          </View>
          <Ionicons
            name="arrow-forward"
            size={18}
            color={colors.textTertiary}
          />
        </CardContainer>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  greetingContainer: {
    flex: 1,
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
  premiumBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    borderRadius: 8,
    padding: 3,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 40,
  },

  // Today's Plan
  todayCard: {
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.xl,
  },
  todayHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  todayIconWrap: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  mealsList: {
    width: "100%",
  },
  mealRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  mealLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    flex: 1,
  },
  mealEmoji: {
    fontSize: 24,
  },
  emptyPlanContainer: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  planBtn: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.md,
    marginTop: Spacing.lg,
  },

  // Quick Actions
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  actionCard: {
    width: "47%",
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    flexGrow: 1,
  },
  actionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
  },

  // Memory Card
  memoryCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
  },
  memoryLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    flex: 1,
  },
  memoryIconWrap: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
});
