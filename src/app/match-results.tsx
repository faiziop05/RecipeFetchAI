import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";

import { CardContainer } from "@/components/CardContainer";
import { generatePantryMeals } from "@/services/gemini";
import { RootState } from "@/store";
import { setRecentMatches } from "@/store/pantrySlice";
import { setActiveRecipe } from "@/store/recipeSlice";
import { ThemeColors } from "@/theme/colors";

export default function MatchResultsScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { refresh } = useLocalSearchParams<{ refresh?: string }>();

  const mode = useSelector((state: RootState) => state.theme.mode);
  const colors = ThemeColors[mode];

  const results = useSelector(
    (state: RootState) => state.pantry.recentMatches || [],
  );
  const pantryList = useSelector(
    (state: RootState) => state.pantry.ingredients,
  );
  const profile = useSelector((state: RootState) => state.profile);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (refresh === "true" && pantryList.length > 0) {
      const runMatching = async () => {
        setLoading(true);
        try {
          const suggestions = await generatePantryMeals(pantryList, {
            profile,
          });
          dispatch(setRecentMatches(suggestions));
        } catch (err) {
          console.warn("[MatchResults] Dynamic match error:", err);
        } finally {
          setLoading(false);
        }
      };
      runMatching();
    }
  }, [refresh, pantryList, profile, dispatch]);

  const handleSelectRecipe = (item: any) => {
    dispatch(
      setActiveRecipe({
        title: item.title,
        prepTime: item.prepTime,
        calories: item.calories,
        totalProtein: item.totalProtein || "0g",
        totalCarbs: item.totalCarbs || "0g",
        totalFats: item.totalFats || "0g",
        ingredients: item.ingredients || [],
        instructions: item.instructions || [],
      }),
    );
    router.push("/recipe-display");
  };

  const renderTier = (
    tierName: string,
    titleLabel: string,
    borderHex: string,
  ) => {
    const list = results.filter((r) =>
      r.tier?.toLowerCase().includes(tierName),
    );
    if (list.length === 0) return null;

    return (
      <View style={styles.tierSection}>
        <Text style={[styles.tierSectionTitle, { color: colors.textPrimary }]}>
          {titleLabel}
        </Text>
        {list.map((item, idx) => (
          <TouchableOpacity
            key={idx}
            activeOpacity={0.8}
            onPress={() => handleSelectRecipe(item)}
            style={{ marginBottom: 12 }}
          >
            <CardContainer
              style={[styles.recipeCard, { borderColor: borderHex }]}
            >
              <View style={styles.cardHeaderRow}>
                <Text
                  style={[styles.recipeTitle, { color: colors.textPrimary }]}
                >
                  {item.title}
                </Text>
                <View
                  style={[
                    styles.matchScoreBadge,
                    { backgroundColor: `${borderHex}22` },
                  ]}
                >
                  <Text style={[styles.matchScoreVal, { color: borderHex }]}>
                    {item.matchScore}% Match
                  </Text>
                </View>
              </View>

              <View style={styles.metaRow}>
                <View style={styles.metaCol}>
                  <Ionicons
                    name="time-outline"
                    size={14}
                    color={colors.textSecondary}
                  />
                  <Text
                    style={[styles.metaText, { color: colors.textSecondary }]}
                  >
                    {item.prepTime}
                  </Text>
                </View>
                <View style={styles.metaCol}>
                  <Ionicons
                    name="fitness-outline"
                    size={14}
                    color={colors.textSecondary}
                  />
                  <Text
                    style={[styles.metaText, { color: colors.textSecondary }]}
                  >
                    {item.difficulty || "Easy"}
                  </Text>
                </View>
              </View>

              {item.missingIngredients?.length > 0 && (
                <View style={styles.missingContainer}>
                  <Text
                    style={[
                      styles.missingLabel,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Missing:{" "}
                  </Text>
                  <Text style={[styles.missingItems, { color: "#EA4335" }]}>
                    {item.missingIngredients.join(", ")}
                  </Text>
                </View>
              )}

              {item.substitutions &&
                Object.keys(item.substitutions).length > 0 && (
                  <View style={styles.substitutionsRow}>
                    <Ionicons
                      name="bulb-outline"
                      size={14}
                      color={colors.primaryAccent}
                    />
                    <Text
                      style={[
                        styles.subtextText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Try:{" "}
                      {Object.entries(item.substitutions)
                        .map(([k, v]) => `${k} ➜ ${v}`)
                        .join(", ")}
                    </Text>
                  </View>
                )}
            </CardContainer>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

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
            MATCHED RECIPES
          </Text>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            What Can I Cook Now?
          </Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primaryAccent} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Matching ingredients...
          </Text>
        </View>
      ) : (
        <ScrollView
          style={[styles.container, { backgroundColor: "transparent" }]}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {results.length > 0 ? (
            <View style={styles.resultsWrapper}>
              {renderTier("exact", "🟢 Exact Matches", "#2C7A5F")}
              {renderTier("near", "🟡 Near Matches", "#F59E0B")}
              {renderTier("creative", "🔵 Creative Matches", "#E57C62")}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>🍽️ 🔍</Text>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                No Matches Found
              </Text>
              <Text
                style={[styles.emptySubtitle, { color: colors.textSecondary }]}
              >
                We couldn't find any recipe matches. Try adding more ingredients
                to your list or adjust filters.
              </Text>
            </View>
          )}
          <View style={{ height: 60 }} />
        </ScrollView>
      )}
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
  resultsWrapper: {},
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
});
