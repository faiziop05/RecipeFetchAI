import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
import { RootState } from "@/store";
import { RecipePayload, setActiveRecipe } from "@/store/recipeSlice";
import { ThemeColors, ThemeGradients } from "@/theme/colors";

const CATEGORY_EMOJIS: Record<string, string> = {
  All: "🍽️",
  Breakfast: "🍳",
  Lunch: "🥗",
  Dinner: "🥩",
  Desserts: "🍰",
  Snacks: "🍿",
};

const CATEGORIES = [
  "All",
  "Breakfast",
  "Lunch",
  "Dinner",
  "Desserts",
  "Snacks",
];

interface CookedLog {
  id: string;
  cookedAt: string;
  rating: number;
  notes: string;
  recipe: {
    title: string;
    prepTime: string;
    calories: string;
    totalProtein?: string;
    totalCarbs?: string;
    totalFats?: string;
    ingredients: any[];
    instructions: any[];
    id?: string;
  };
}

export default function VaultScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const mode = useSelector((state: RootState) => state.theme.mode);
  const colors = ThemeColors[mode];

  const userId = useSelector((state: RootState) => state.auth.uid);
  const [scannedRecipes, setScannedRecipes] = useState<RecipePayload[]>([]);
  const [cookedLogs, setCookedLogs] = useState<CookedLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Layout & Navigation States
  const [activeSubTab, setActiveSubTab] = useState<
    "scans" | "cooked" | "favorites"
  >("scans");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [layoutMode, setLayoutMode] = useState<"list" | "grid">("grid");
  const [visibleLimit, setVisibleLimit] = useState(6);
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);

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

  // Reset page size whenever active subtab changes
  useEffect(() => {
    setVisibleLimit(6);
  }, [activeSubTab]);

  // Real-time listener for user-specific scanned recipes library in Firestore
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const scannedRef = collection(db, `users/${userId}/scanned_recipes`);
    const q = query(scannedRef, orderBy("scannedAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const parsed: RecipePayload[] = [];
        snapshot.forEach((doc) => {
          parsed.push({
            id: doc.id,
            ...doc.data(),
          } as RecipePayload);
        });
        setScannedRecipes(parsed);
        setLoading(false);
      },
      (error) => {
        console.warn("[Vault] Firestore Snapshot Error:", error);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [userId]);

  // Real-time listener for user-specific cooked logs library in Firestore
  useEffect(() => {
    if (!userId) return;

    const cookedRef = collection(db, `users/${userId}/cooked_memory`);
    const q = query(cookedRef, orderBy("cookedAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const parsed: CookedLog[] = [];
        snapshot.forEach((doc) => {
          parsed.push({ id: doc.id, ...doc.data() } as CookedLog);
        });
        setCookedLogs(parsed);
      },
      (error) => {
        console.warn("[Vault] Cooked logs fetch error:", error);
      },
    );

    return unsubscribe;
  }, [userId]);

  // Dynamic classifier to group scanned recipes by category
  const getRecipeCategory = (recipe: RecipePayload): string => {
    const title = (recipe.title || "").toLowerCase();
    const ingredients = (recipe.ingredients || [])
      .map((i) => (i.name || "").toLowerCase())
      .join(" ");

    const isDessert =
      title.match(
        /sweet|cake|cookie|chocolate|dessert|sugar|pie|ice cream|pudding|muffin|fruit/,
      ) || ingredients.match(/cocoa|sugar|chocolate|maple syrup|honey|vanilla/);
    if (isDessert) return "Desserts";

    const isBreakfast =
      title.match(
        /egg|toast|morning|oat|pancake|waffle|avocado|smoothie|bowl|berry|breakfast/,
      ) || ingredients.match(/oats|chia|egg|granola|bacon|avocado/);
    if (isBreakfast) return "Breakfast";

    const isLunch =
      title.match(/salad|wrap|sandwich|bowl|soup|quinoa/) ||
      ingredients.match(/spinach|kale|lettuce|cucumber|tomato/);
    if (isLunch) return "Lunch";

    const isDinner =
      title.match(
        /chicken|beef|steak|salmon|fish|dinner|pasta|rice|curry|stew|taco|burger|roast/,
      ) ||
      ingredients.match(
        /garlic|onion|chicken|beef|pork|shrimp|salmon|noodle|rice/,
      );
    if (isDinner) return "Dinner";

    const isSnack = title.match(
      /snack|bar|energy|chip|dip|nut|bite|cracker|popcorn/,
    );
    if (isSnack) return "Snacks";

    return "Lunch"; // Default sensible categorization fallback
  };

  // Handle hard deleting from Scanned history
  const handleDeleteRecipe = async (id: string, title: string) => {
    if (!userId || !id) return;

    const isScanOrFavorite =
      activeSubTab === "scans" || activeSubTab === "favorites";
    const deleteCollection = isScanOrFavorite
      ? "scanned_recipes"
      : "cooked_memory";
    const alertTitle = isScanOrFavorite
      ? "Delete Saved Recipe"
      : "Delete Cooking Log";
    const alertMsg = isScanOrFavorite
      ? `Are you sure you want to permanently delete "${title}" from your saved recipes? (This will also unpin it if pinned)`
      : `Are you sure you want to permanently delete "${title}" from your cooking history?`;

    showAlert(alertTitle, alertMsg, "confirm", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const docRef = doc(db, `users/${userId}/${deleteCollection}`, id);
            await deleteDoc(docRef);
          } catch (err) {
            console.error("Firestore Delete Recipe Error:", err);
            showAlert(
              "Error",
              "Could not delete scanned recipe. Please check your network connection and try again.",
              "error",
            );
          }
        },
      },
    ]);
  };

  // Load recipe into global state & navigate
  const handleSelectRecipe = (recipe: RecipePayload) => {
    dispatch(setActiveRecipe(recipe));
    router.push("/recipe-display");
  };

  // Favorites matches (pinned scanned recipes)
  const favoriteItems = scannedRecipes.filter((r) => r.isPinned);

  // Map active subtab selection into a unified RecipePayload format
  let rawList: RecipePayload[] = [];
  if (activeSubTab === "scans") {
    rawList = scannedRecipes;
  } else if (activeSubTab === "cooked") {
    rawList = cookedLogs.map((l) => ({
      id: l.id,
      title: l.recipe?.title || "",
      prepTime: l.recipe?.prepTime || "N/A",
      calories: l.recipe?.calories || "N/A",
      ingredients: l.recipe?.ingredients || [],
      instructions: l.recipe?.instructions || [],
      totalProtein: l.recipe?.totalProtein,
      totalCarbs: l.recipe?.totalCarbs,
      totalFats: l.recipe?.totalFats || "0g",
    }));
  } else if (activeSubTab === "favorites") {
    rawList = favoriteItems;
  }

  // Filter recipes dynamically based on Search Query & Category Select
  const filteredRecipes = rawList.filter((recipe) => {
    const titleMatch = (recipe.title || "")
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const ingredientsMatch = (recipe.ingredients || []).some((ing) =>
      (ing.name || "").toLowerCase().includes(searchQuery.toLowerCase()),
    );

    const category = getRecipeCategory(recipe);
    const categoryMatch =
      selectedCategory === "All" || category === selectedCategory;

    return (titleMatch || ingredientsMatch) && categoryMatch;
  });

  // Slice paginated items
  const paginatedRecipes = filteredRecipes.slice(0, visibleLimit);

  // Reset page size whenever filters change to prevent offset anomalies
  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setVisibleLimit(6);
  };

  const handleSearchChange = (txt: string) => {
    setSearchQuery(txt);
    setVisibleLimit(6);
  };

  const renderItem = ({
    item,
    index,
  }: {
    item: RecipePayload;
    index: number;
  }) => {
    const itemCategory = getRecipeCategory(item);
    const itemEmoji = CATEGORY_EMOJIS[itemCategory] || "🍲";
    const GRADIENT_OPTIONS = [
      ThemeGradients.cardYellow,
      ThemeGradients.cardGreen,
      ThemeGradients.cardPurple,
      ThemeGradients.cardBlue,
      ThemeGradients.cardPink,
      ThemeGradients.cardOrange,
      ThemeGradients.cardCyan,
    ];
    const gradient = GRADIENT_OPTIONS[index % GRADIENT_OPTIONS.length];

    if (layoutMode === "grid") {
      return (
        <CardContainer gradient={gradient} style={[styles.gridCard]}>
          {item.isPinned && (
            <View style={styles.gridPinBadge}>
              <Ionicons name="bookmark" size={12} color="#1C1917" />
            </View>
          )}
          <TouchableOpacity
            onPress={() => handleSelectRecipe(item)}
            style={styles.gridCardContent}
          >
            <View
              style={[
                styles.gridIconContainer,
                {
                  backgroundColor: "rgba(0,0,0,0.05)",
                  borderColor: "rgba(0,0,0,0.1)",
                },
              ]}
            >
              <Text style={styles.gridEmoji}>{itemEmoji}</Text>
            </View>
            <Text
              numberOfLines={2}
              style={[styles.gridTitle, { color: "#1C1917" }]}
            >
              {item.title}
            </Text>
            <View style={styles.gridMetaRow}>
              <View style={styles.metaItem}>
                <Ionicons
                  name="time-outline"
                  size={12}
                  color="rgba(28, 25, 23, 0.7)"
                />
                <Text
                  numberOfLines={1}
                  style={[
                    styles.metaTextGrid,
                    { color: "rgba(28, 25, 23, 0.7)" },
                  ]}
                >
                  {item.prepTime}
                </Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons
                  name="flame-outline"
                  size={12}
                  color="rgba(28, 25, 23, 0.7)"
                />
                <Text
                  numberOfLines={1}
                  style={[
                    styles.metaTextGrid,
                    { color: "rgba(28, 25, 23, 0.7)" },
                  ]}
                >
                  {item.calories}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleDeleteRecipe(item.id || "", item.title)}
            style={styles.gridDeleteBtn}
          >
            <Ionicons name="trash-outline" size={16} color="#EA4335" />
          </TouchableOpacity>
        </CardContainer>
      );
    }

    // List mode card styling
    return (
      <CardContainer gradient={gradient} style={[styles.recipeCard]}>
        <View
          style={[
            styles.listIconContainer,
            {
              backgroundColor: "rgba(0,0,0,0.05)",
              borderColor: "rgba(0,0,0,0.1)",
            },
          ]}
        >
          <Text style={styles.listEmoji}>{itemEmoji}</Text>
        </View>

        <TouchableOpacity
          onPress={() => handleSelectRecipe(item)}
          style={styles.cardInfoContainer}
        >
          <Text style={[styles.recipeTitle, { color: "#1C1917" }]}>
            {item.title}
          </Text>
          <View style={styles.metadataRow}>
            <View style={styles.metaItem}>
              <Ionicons
                name="time-outline"
                size={14}
                color="rgba(28, 25, 23, 0.7)"
              />
              <Text
                style={[styles.metaText, { color: "rgba(28, 25, 23, 0.7)" }]}
              >
                {item.prepTime}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons
                name="flame-outline"
                size={14}
                color="rgba(28, 25, 23, 0.7)"
              />
              <Text
                style={[styles.metaText, { color: "rgba(28, 25, 23, 0.7)" }]}
              >
                {item.calories}
              </Text>
            </View>
            <View
              style={[styles.tagBadge, { backgroundColor: "rgba(0,0,0,0.05)" }]}
            >
              <Text
                style={[styles.tagText, { color: "rgba(28, 25, 23, 0.7)" }]}
              >
                {itemCategory}
              </Text>
            </View>
            {item.isPinned && (
              <View style={[styles.tagBadge, { backgroundColor: "#1C1917" }]}>
                <Text style={[styles.tagText, { color: "#FFFFFF" }]}>
                  Pinned
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleDeleteRecipe(item.id || "", item.title)}
          style={styles.deleteBtn}
        >
          <Ionicons name="trash-outline" size={20} color="#EA4335" />
        </TouchableOpacity>
      </CardContainer>
    );
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "transparent" }}
      edges={["top"]}
    >
      <TabHeader title="Saved Recipes" subtitle="MY LIBRARY" />

      {/* Search Console directly on Screen */}
      <View style={styles.searchContainer}>
        <View
          style={[
            styles.searchWrapper,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Ionicons
            name="search-outline"
            size={18}
            color={colors.textSecondary}
            style={styles.searchIcon}
          />
          <TextInput
            placeholder="Search scans or ingredients..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={handleSearchChange}
            style={[styles.searchInput, { color: colors.textPrimary }]}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => handleSearchChange("")}>
              <Ionicons
                name="close-circle"
                size={18}
                color={colors.textSecondary}
                style={styles.clearIcon}
              />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <View style={[styles.container, { backgroundColor: "transparent" }]}>
        <View style={styles.controlsRowOutside}>
          <TouchableOpacity
            activeOpacity={0.7}
            style={[
              styles.controlBtn,
              { borderColor: colors.border, backgroundColor: colors.surface },
            ]}
            onPress={() =>
              setLayoutMode((prev) => (prev === "grid" ? "list" : "grid"))
            }
          >
            <Ionicons
              name={layoutMode === "grid" ? "list-outline" : "grid-outline"}
              size={16}
              color={colors.primaryAccent}
            />
            <Text
              style={[styles.controlBtnText, { color: colors.textPrimary }]}
            >
              {layoutMode === "grid" ? "List" : "Grid"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            style={[
              styles.controlBtn,
              { borderColor: colors.border, backgroundColor: colors.surface },
              (searchQuery || selectedCategory !== "All") && {
                borderColor: colors.primaryAccent,
              },
            ]}
            onPress={() => setIsFilterModalVisible(true)}
          >
            <Ionicons
              name="funnel-outline"
              size={16}
              color={
                searchQuery || selectedCategory !== "All"
                  ? colors.primaryAccent
                  : colors.textSecondary
              }
            />
            <Text
              style={[
                styles.controlBtnText,
                {
                  color:
                    searchQuery || selectedCategory !== "All"
                      ? colors.primaryAccent
                      : colors.textPrimary,
                },
              ]}
            >
              Filter {searchQuery || selectedCategory !== "All" ? "•" : ""}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Sub-tabs row switcher */}
        <View style={styles.subTabRow}>
          {[
            { id: "scans" as const, label: "Scans" },
            { id: "cooked" as const, label: "Cooked" },
            { id: "favorites" as const, label: "Favorites" },
          ].map((tab) => {
            const active = activeSubTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.subTabBtn,
                  active && {
                    borderBottomColor: colors.primaryAccent,
                    borderBottomWidth: 2,
                  },
                ]}
                onPress={() => setActiveSubTab(tab.id)}
              >
                <Text
                  style={[
                    styles.subTabLabel,
                    {
                      color: active ? colors.textPrimary : colors.textSecondary,
                    },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Recipe Display */}
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primaryAccent} />
          </View>
        ) : rawList.length === 0 ? (
          <View style={styles.centerContainer}>
            <CardContainer style={styles.emptyCard}>
              <Text style={styles.emptyStateEmoji}>🥑 📷 🍲 🍰</Text>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                {activeSubTab === "scans"
                  ? "No Scans Yet"
                  : activeSubTab === "cooked"
                    ? "No Cooked Meals"
                    : "No Favorites"}
              </Text>
              <Text
                style={[styles.emptySubtitle, { color: colors.textSecondary }]}
              >
                {activeSubTab === "scans"
                  ? "You haven't scanned any recipes yet. Take a picture of a recipe or paste a URL link in the capture screen to get started!"
                  : activeSubTab === "cooked"
                    ? "You haven't cooked any recipes yet. Start cooking from detail screens!"
                    : "Cooked recipes with high ratings will automatically show up here."}
              </Text>
              {activeSubTab === "scans" && (
                <ActionButton
                  title="Scan a Recipe"
                  onPress={() => router.push("/(tabs)/capture")}
                  style={styles.emptyBtn}
                />
              )}
            </CardContainer>
          </View>
        ) : filteredRecipes.length === 0 ? (
          <View style={styles.centerContainer}>
            <CardContainer style={styles.emptyCard}>
              <Text style={styles.emptyStateEmoji}>🔍 🥗 🍕</Text>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                No Matches Found
              </Text>
              <Text
                style={[styles.emptySubtitle, { color: colors.textSecondary }]}
              >
                Try adjusting your search query or selecting a different
                category.
              </Text>
              <TouchableOpacity
                onPress={() => {
                  handleSearchChange("");
                  handleCategorySelect("All");
                }}
                style={[styles.resetFiltersBtn, { borderColor: colors.border }]}
              >
                <Text
                  style={[
                    styles.resetFiltersBtnText,
                    { color: colors.textPrimary },
                  ]}
                >
                  Reset All Filters
                </Text>
              </TouchableOpacity>
            </CardContainer>
          </View>
        ) : (
          <FlatList
            key={layoutMode}
            numColumns={layoutMode === "grid" ? 2 : 1}
            data={paginatedRecipes}
            keyExtractor={(item, index) =>
              item.id
                ? `${activeSubTab}-${item.id}-${index}`
                : `${activeSubTab}-${index}`
            }
            contentContainerStyle={[
              styles.listContent,
              layoutMode === "grid" && styles.gridListContent,
            ]}
            columnWrapperStyle={
              layoutMode === "grid" ? styles.gridRowWrapper : undefined
            }
            renderItem={renderItem}
            ListFooterComponent={() => {
              const totalFiltered = filteredRecipes.length;
              const currentlyShowing = paginatedRecipes.length;

              return (
                <View style={styles.footerContainer}>
                  <Text
                    style={[styles.footerText, { color: colors.textSecondary }]}
                  >
                    Showing {currentlyShowing} of {totalFiltered} items
                  </Text>
                  {totalFiltered > visibleLimit ? (
                    <ActionButton
                      title="Load More"
                      onPress={() => setVisibleLimit((prev) => prev + 6)}
                      style={styles.loadMoreBtn}
                    />
                  ) : null}
                  <View style={{ height: 150 }} />
                </View>
              );
            }}
          />
        )}
      </View>

      {/* Slide-Up Custom Filter Bottom Sheet Modal */}
      <Modal visible={isFilterModalVisible} animationType="slide" transparent>
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
            {/* Modal Header */}
            <View
              style={[styles.modalHeader, { borderBottomColor: colors.border }]}
            >
              <Text
                style={[styles.modalHeaderTitle, { color: colors.textPrimary }]}
              >
                Filter Recipes
              </Text>
              <TouchableOpacity
                onPress={() => setIsFilterModalVisible(false)}
                style={styles.closeModalBtn}
              >
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={styles.filterModalBody}
              showsVerticalScrollIndicator={false}
            >
              {/* Category Section */}
              <Text
                style={[
                  styles.filterSectionTitle,
                  { color: colors.textPrimary },
                ]}
              >
                Dish Type Category
              </Text>
              <View style={styles.categoryGrid}>
                {CATEGORIES.map((category) => {
                  const isActive = selectedCategory === category;
                  return (
                    <TouchableOpacity
                      key={category}
                      activeOpacity={0.8}
                      onPress={() => handleCategorySelect(category)}
                      style={[
                        styles.modalCategoryChip,
                        {
                          backgroundColor: isActive
                            ? colors.primaryAccent
                            : colors.background,
                          borderColor: isActive
                            ? colors.primaryAccent
                            : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.categoryChipText,
                          {
                            color: isActive
                              ? colors.background
                              : colors.textSecondary,
                            fontWeight: isActive ? "700" : "500",
                          },
                        ]}
                      >
                        {CATEGORY_EMOJIS[category]} {category}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Actions */}
              <View style={styles.filterActionsRow}>
                <ActionButton
                  title="Reset All"
                  variant="outline"
                  onPress={() => {
                    handleSearchChange("");
                    handleCategorySelect("All");
                  }}
                  style={styles.filterActionBtn}
                />
                <ActionButton
                  title="Apply Filters"
                  onPress={() => setIsFilterModalVisible(false)}
                  style={styles.filterActionBtn}
                />
              </View>
            </ScrollView>
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
  controlsRowOutside: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 14,
    marginBottom: 10,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 0,
  },
  controlBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  controlBtnText: {
    fontSize: 12,
    fontWeight: "600",
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
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  closeModalBtn: {
    padding: 4,
  },
  filterModalBody: {
    paddingBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    height: "100%",
    padding: 0,
  },
  clearIcon: {
    marginLeft: 6,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  modalCategoryChip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryChipText: {
    fontSize: 13,
  },
  filterActionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 20,
  },
  filterActionBtn: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyCard: {
    alignItems: "center",
    paddingVertical: 48,
    paddingHorizontal: 24,
    width: "100%",
    borderRadius: 32,
    borderWidth: 1.5,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.5,
    marginTop: 20,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 15,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 22,
    marginTop: 12,
    marginBottom: 32,
    opacity: 0.8,
  },
  emptyBtn: {
    width: "100%",
  },
  resetFiltersBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  resetFiltersBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  gridListContent: {
    paddingHorizontal: 20,
  },
  gridRowWrapper: {
    justifyContent: "space-between",
    // marginBottom: 12,
  },
  recipeCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderRadius: 24,
  },
  cardInfoContainer: {
    flex: 1,
    paddingRight: 12,
  },
  recipeTitle: {
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 24,
    letterSpacing: -0.3,
  },
  metadataRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 12,
    flexWrap: "wrap",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    fontWeight: "600",
  },
  tagBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tagText: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  deleteBtn: {
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  gridCard: {
    width: "48%",
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    position: "relative",
    justifyContent: "space-between",
  },
  gridPinBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    zIndex: 10,
  },
  gridCardContent: {
    flex: 1,
  },
  gridIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  gridTitle: {
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 22,
    height: 44,
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  gridMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
    gap: 4,
  },
  metaTextGrid: {
    fontSize: 12,
    fontWeight: "600",
    maxWidth: 55,
  },
  gridDeleteBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    padding: 4,
  },
  footerContainer: {
    alignItems: "center",
    marginTop: 20,
    marginBottom: 20,
    gap: 12,
  },
  gridEmoji: {
    fontSize: 20,
  },
  listIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  listEmoji: {
    fontSize: 18,
  },
  emptyStateEmoji: {
    fontSize: 42,
    marginBottom: 16,
    letterSpacing: 12,
    textAlign: "center",
  },
  footerText: {
    fontSize: 12,
  },
  loadMoreBtn: {
    width: "100%",
    height: 48,
  },
  subTabRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#E5E5EA",
    marginBottom: 6,
    marginHorizontal: 20,
  },
  subTabBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
  },
  subTabLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
});
