import Ionicons from "@expo/vector-icons/Ionicons";
import * as Clipboard from "expo-clipboard";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { addDoc, collection } from "firebase/firestore";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
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
import { CustomAlert } from "@/components/CustomAlert";
import { db } from "@/services/firebase";
import { extractRecipe } from "@/services/gemini";
import { RootState } from "@/store";
import { setActiveRecipe } from "@/store/recipeSlice";
import { TabHeader } from "@/components/TabHeader";
import {
  checkMonthRollover,
  incrementFreeScan,
} from "@/store/subscriptionSlice";
import { ThemeColors, ThemeGradients } from "@/theme/colors";
import { useNetInfo } from "@react-native-community/netinfo";
import { LinearGradient } from "expo-linear-gradient";

export default function CaptureScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const mode = useSelector((state: RootState) => state.theme.mode);
  const colors = ThemeColors[mode];
  const userId = useSelector((state: RootState) => state.auth.uid);
  const isPremium = useSelector(
    (state: RootState) => state.subscription.isPremium,
  );
  const freeScansUsed = useSelector(
    (state: RootState) => state.subscription.freeScansUsed,
  );
  const currentMonth = useSelector(
    (state: RootState) => state.subscription.currentMonth,
  );
  const netInfo = useNetInfo();

  const [recipeLink, setRecipeLink] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [isInputFocused, setIsInputFocused] = useState(false);

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

  // Handle single-tap paste from Clipboard
  const handlePasteLink = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      setRecipeLink(text);
      if (text) handleClearImage(); // Clear image if link is pasted
    } catch (err) {
      showAlert("Clipboard Error", "Failed to read from clipboard.", "error");
    }
  };

  // Select photo from Gallery
  const triggerGallery = async () => {
    if (netInfo.isConnected === false) {
      showAlert(
        "No Internet Connection",
        "You need an active internet connection to scan and extract new recipes. Your saved recipes are available offline.",
        "error",
      );
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      showAlert(
        "Permission Denied",
        "Gallery access is required to choose a recipe photo from your library.",
        "error",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      quality: 0.6,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
      setImageBase64(result.assets[0].base64 || null);
      setRecipeLink(""); // Clear URL if image selected
    }
  };

  // Capture photo from Camera
  const triggerCamera = async () => {
    if (netInfo.isConnected === false) {
      showAlert(
        "No Internet Connection",
        "You need an active internet connection to scan and extract new recipes. Your saved recipes are available offline.",
        "error",
      );
      return;
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      showAlert(
        "Permission Denied",
        "Camera access is required to photograph your physical cookbook or recipe page.",
        "error",
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.6,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
      setImageBase64(result.assets[0].base64 || null);
      setRecipeLink(""); // Clear URL if image selected
    }
  };

  // Prompts user to select between Camera and Gallery inside a single scanner viewport trigger
  const handleScannerPress = () => {
    showAlert(
      "Scan Recipe Page",
      "Choose a capture source to extract structured ingredients and chronological steps instantly:",
      "confirm",
      [
        {
          text: "Camera (Take Photo)",
          onPress: triggerCamera,
          style: "default",
        },
        {
          text: "Photo Library (Gallery)",
          onPress: triggerGallery,
          style: "default",
        },
        { text: "Cancel", style: "cancel" },
      ],
    );
  };

  // Submit trigger to AI core
  const handleExtractRecipe = async () => {
    if (netInfo.isConnected === false) {
      showAlert(
        "No Internet Connection",
        "You need an active internet connection to scan and extract new recipes. Your saved recipes are available offline.",
        "error",
      );
      return;
    }

    if (!recipeLink.trim() && !imageBase64) {
      showAlert(
        "Input Required",
        "Please paste a valid cooking web link or scan a recipe photo to initiate AI extraction.",
        "info",
      );
      return;
    }

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
    setLoadingStep("Uploading context data...");

    setTimeout(() => {
      setLoadingStep("Analyzing culinary structure...");
    }, 1000);

    setTimeout(() => {
      setLoadingStep("Generating nutrition profiles...");
    }, 2000);

    try {
      const dataInput = recipeLink.trim() || "Multimodal Image Scanner";
      const parsedRecipe = await extractRecipe(
        dataInput,
        imageBase64 || undefined,
      );

      let savedRecipeId: string | undefined = undefined;

      // Auto-save to scanned_recipes collection in Firestore if logged in
      if (userId) {
        try {
          const scannedRef = collection(db, `users/${userId}/scanned_recipes`);
          const docRef = await addDoc(scannedRef, {
            ...parsedRecipe,
            isPinned: false,
            scannedAt: new Date().toISOString(),
          });
          savedRecipeId = docRef.id;
          console.log(
            "[Capture] Successfully auto-saved scanned recipe to scanned_recipes collection. ID:",
            savedRecipeId,
          );
        } catch (saveErr) {
          console.warn(
            "[Capture] Failed to auto-save scanned recipe to Firestore scanned_recipes:",
            saveErr,
          );
        }
      }

      dispatch(
        setActiveRecipe({
          ...parsedRecipe,
          id: savedRecipeId,
          isPinned: false,
        }),
      );

      // Cleanup inputs
      setRecipeLink("");
      setSelectedImage(null);
      setImageBase64(null);

      // Increment free tier counter if not premium
      if (!isPremium) {
        dispatch(incrementFreeScan());
      }

      router.push("/recipe-display");
    } catch (error: any) {
      console.warn(
        "[Capture] Recipe extraction failed:",
        error?.message || error,
      );
      const userMessage =
        error?.message ||
        "Could not extract a valid recipe. Please verify the URL link or select a clearer image of your recipe.";
      showAlert("Extraction Failed", userMessage, "error");
    } finally {
      setLoading(false);
      setLoadingStep("");
    }
  };

  const handleClearImage = () => {
    setSelectedImage(null);
    setImageBase64(null);
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "transparent" }}
      edges={["top"]}
    >
      <TabHeader title="Scan & Import" subtitle="ADD RECIPE" />

      <ScrollView
        style={[styles.container, { backgroundColor: "transparent" }]}
        contentContainerStyle={[styles.scrollContent]}
      >
        {/* Description/Instruction text at the top of content */}
        <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>
          Transform any cooking website link or cookbook photo into a clean,
          beautifully formatted recipe page instantly.
        </Text>

        {/* Modern Minimal Link Field */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Web Link
          </Text>
          <View style={styles.inputWrapper}>
            <TextInput
              placeholder="Paste recipe link..."
              placeholderTextColor={colors.textSecondary}
              value={recipeLink}
              onChangeText={(txt) => {
                setRecipeLink(txt);
                if (txt) handleClearImage(); // Clear image if typing link
              }}
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => setIsInputFocused(false)}
              style={[
                styles.linkInput,
                {
                  backgroundColor: colors.surface,
                  borderColor: isInputFocused
                    ? colors.primaryAccent
                    : colors.border,
                  color: colors.textPrimary,
                },
              ]}
              autoCapitalize="none"
              autoCorrect={false}
              multiline={false}
              numberOfLines={1}
            />
            <TouchableOpacity
              style={[
                styles.pasteBtn,
                {
                  backgroundColor:
                    mode === "light"
                      ? "rgba(0,0,0,0.05)"
                      : "rgba(255,255,255,0.08)",
                },
              ]}
              onPress={handlePasteLink}
            >
              <Text style={[styles.pasteText, { color: colors.primaryAccent }]}>
                Paste
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.inputHint, { color: colors.textSecondary }]}>
            Paste any recipe link from the web, or extract directly from cooking
            videos on:
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.supportedPlatformsRow}
            style={styles.platformsScroll}
          >
            <View
              style={[
                styles.platformChip,
                {
                  backgroundColor:
                    mode === "light"
                      ? "rgba(255, 0, 0, 0.08)"
                      : "rgba(255, 0, 0, 0.15)",
                },
              ]}
            >
              <Ionicons name="logo-youtube" size={14} color="#FF0000" />
              <Text style={[styles.platformText, { color: "#FF0000" }]}>
                YouTube
              </Text>
            </View>
            <View
              style={[
                styles.platformChip,
                {
                  backgroundColor:
                    mode === "light"
                      ? "rgba(225, 48, 108, 0.08)"
                      : "rgba(225, 48, 108, 0.15)",
                },
              ]}
            >
              <Ionicons name="logo-instagram" size={14} color="#E1306C" />
              <Text style={[styles.platformText, { color: "#E1306C" }]}>
                Instagram
              </Text>
            </View>
            <View
              style={[
                styles.platformChip,
                {
                  backgroundColor:
                    mode === "light"
                      ? "rgba(0, 0, 0, 0.05)"
                      : "rgba(255, 255, 255, 0.1)",
                },
              ]}
            >
              <Ionicons
                name="logo-tiktok"
                size={14}
                color={mode === "light" ? "#000000" : "#FFFFFF"}
              />
              <Text
                style={[
                  styles.platformText,
                  { color: mode === "light" ? "#000000" : "#FFFFFF" },
                ]}
              >
                TikTok
              </Text>
            </View>
            <View
              style={[
                styles.platformChip,
                {
                  backgroundColor:
                    mode === "light"
                      ? "rgba(66, 133, 244, 0.08)"
                      : "rgba(66, 133, 244, 0.15)",
                },
              ]}
            >
              <Ionicons name="logo-google" size={14} color="#4285F4" />
              <Text style={[styles.platformText, { color: "#4285F4" }]}>
                Google
              </Text>
            </View>
          </ScrollView>
        </View>

        {/* Unified Camera/Gallery Viewport Scanner */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Visual Scan
          </Text>

          {selectedImage ? (
            <View
              style={[
                styles.imagePreviewContainer,
                { borderColor: colors.border },
              ]}
            >
              <Image
                source={{ uri: selectedImage }}
                style={styles.imagePreview}
              />
              <TouchableOpacity
                style={styles.clearImageBtn}
                onPress={handleClearImage}
              >
                <Ionicons
                  name="close-circle"
                  size={36}
                  color={colors.textPrimary}
                />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.scannerRow}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={triggerCamera}
                style={{ flex: 1 }}
              >
                <LinearGradient
                  colors={ThemeGradients.cardOrange}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={[styles.scannerHalfCard, { borderColor: colors.border }]}
                >
                  <View style={[styles.scannerIconWrapper, { backgroundColor: 'rgba(0,0,0,0.05)', borderColor: colors.border }]}>
                    <Ionicons name="camera-outline" size={22} color="#1C1917" />
                  </View>
                  <Text style={[styles.scannerLabel, { color: "#1C1917" }]}>Camera</Text>
                  <Text style={[styles.scannerSublabel, { color: "rgba(28, 25, 23, 0.7)" }]}>Scan cookbook page</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={triggerGallery}
                style={{ flex: 1 }}
              >
                <LinearGradient
                  colors={ThemeGradients.cardBlue}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={[styles.scannerHalfCard, { borderColor: colors.border }]}
                >
                  <View style={[styles.scannerIconWrapper, { backgroundColor: 'rgba(0,0,0,0.05)', borderColor: colors.border }]}>
                    <Ionicons name="images-outline" size={22} color="#1C1917" />
                  </View>
                  <Text style={[styles.scannerLabel, { color: "#1C1917" }]}>Gallery</Text>
                  <Text style={[styles.scannerSublabel, { color: "rgba(28, 25, 23, 0.7)" }]}>Upload from library</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

          )}

          {/* Manual Creation Card */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push("/manual-recipe")}
            style={{ marginTop: 12 }}
          >
            <LinearGradient
              colors={ThemeGradients.cardPink}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={[styles.manualInputCard, { borderColor: colors.border }]}
            >
              <View style={styles.manualRow}>
                <View style={[styles.scannerIconWrapper, { backgroundColor: 'rgba(0,0,0,0.05)', borderColor: colors.border, marginRight: 14 }]}>
                  <Ionicons name="create-outline" size={20} color="#1C1917" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.scannerLabel, { color: "#1C1917" }]}>Manual Creation</Text>
                  <Text style={[styles.scannerSublabel, { color: "rgba(28, 25, 23, 0.7)" }]}>Type raw recipe details</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="rgba(28, 25, 23, 0.5)" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Premium Submit Button */}
        <ActionButton
          title="Extract Recipe"
          onPress={handleExtractRecipe}
          style={styles.submitBtn}
        />

        {/* Minimal Loading Overlay Modal */}
        <Modal visible={loading} transparent animationType="fade">
          <View style={styles.overlayBackground}>
            <View
              style={[
                styles.overlayContent,
                { backgroundColor: colors.background, borderColor: colors.border },
              ]}
            >
              <ActivityIndicator size="small" color={colors.primaryAccent} />
              <Text
                style={[styles.overlayTitle, { color: colors.textPrimary }]}
              >
                RecipeFetch AI
              </Text>
              <Text
                style={[styles.overlayStep, { color: colors.textSecondary }]}
              >
                {loadingStep}
              </Text>
            </View>
          </View>
        </Modal>
        <View style={{ height: 150 }} />
      </ScrollView>

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
    paddingTop: 20,
    paddingBottom: 60,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  sectionContainer: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
    width: "100%",
    justifyContent: "center",
  },
  linkInput: {
    height: 52,
    borderWidth: 1,
    borderRadius: 12,
    paddingLeft: 16,
    paddingRight: 75,
    fontSize: 15,
    flex: 1,
  },
  pasteBtn: {
    position: "absolute",
    right: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  pasteText: {
    fontSize: 12,
    fontWeight: "700",
  },
  inputHint: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 12,
    paddingHorizontal: 4,
    lineHeight: 18,
  },
  platformsScroll: {
    marginTop: 8,
    marginHorizontal: -20,
  },
  supportedPlatformsRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingBottom: 4,
    gap: 8,
  },
  platformChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  platformText: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  scannerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    gap: 12,
  },
  scannerHalfCard: {
    flex: 1,
    height: 175,
    borderWidth: 1,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    paddingHorizontal: 12,
    paddingVertical: 20,
  },
  scannerIconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  cardArrow: {
    position: "absolute",
    top: 14,
    right: 14,
    opacity: 0.6,
  },
  cropCornerHalf: {
    position: "absolute",
    width: 12,
    height: 12,
  },
  cropTopLeftHalf: {
    top: 8,
    left: 8,
    borderTopWidth: 2,
    borderLeftWidth: 2,
  },
  cropTopRightHalf: {
    top: 8,
    right: 8,
    borderTopWidth: 2,
    borderRightWidth: 2,
  },
  cropBottomLeftHalf: {
    bottom: 8,
    left: 8,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
  },
  cropBottomRightHalf: {
    bottom: 8,
    right: 8,
    borderBottomWidth: 2,
    borderRightWidth: 2,
  },
  cropCorner: {
    position: "absolute",
    width: 16,
    height: 16,
  },
  cropTopLeft: {
    top: 12,
    left: 12,
    borderTopWidth: 2,
    borderLeftWidth: 2,
  },
  cropTopRight: {
    top: 12,
    right: 12,
    borderTopWidth: 2,
    borderRightWidth: 2,
  },
  cropBottomLeft: {
    bottom: 12,
    left: 12,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
  },
  cropBottomRight: {
    bottom: 12,
    right: 12,
    borderBottomWidth: 2,
    borderRightWidth: 2,
  },
  scannerLabel: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.2,
    marginTop: 2,
  },
  scannerSublabel: {
    fontSize: 10,
    textAlign: "center",
    marginTop: 3,
    lineHeight: 13,
    paddingHorizontal: 4,
  },
  imagePreviewContainer: {
    height: 200,
    borderRadius: 16,
    borderWidth: 1,
    position: "relative",
    overflow: "hidden",
  },
  imagePreview: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  clearImageBtn: {
    position: "absolute",
    top: 12,
    right: 12,
  },
  submitBtn: {
    marginTop: 10,
    height: 56,
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
    marginTop: 12,
    letterSpacing: -0.5,
  },
  overlayStep: {
    fontSize: 13,
    marginTop: 6,
    textAlign: "center",
  },
  manualInputCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginTop: 16,
    width: "100%",
  },
  manualRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});
