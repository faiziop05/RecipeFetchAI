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
import { CardContainer } from "@/components/CardContainer";
import { CustomAlert } from "@/components/CustomAlert";
import { TabHeader } from "@/components/TabHeader";
import { db } from "@/services/firebase";
import { extractRecipe } from "@/services/gemini";
import { RootState } from "@/store";
import { setActiveRecipe } from "@/store/recipeSlice";
import {
  checkMonthRollover,
  incrementFreeScan,
} from "@/store/subscriptionSlice";
import { ThemeColors, Typography, Spacing, Radius } from "@/theme/colors";
import { useNetInfo } from "@react-native-community/netinfo";

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
        "Please paste a recipe link or scan a photo to extract a recipe.",
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

  const platforms = [
    { icon: "logo-youtube" as const, label: "YouTube", color: "#FF0000" },
    { icon: "logo-instagram" as const, label: "Instagram", color: "#E1306C" },
    { icon: "logo-tiktok" as const, label: "TikTok", color: mode === "light" ? "#000000" : "#FFFFFF" },
    { icon: "logo-google" as const, label: "Google", color: "#4285F4" },
  ];

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "transparent" }}
      edges={["top"]}
    >
      <TabHeader title="Scan & Import" subtitle="ADD RECIPE" />

      <ScrollView
        style={{ flex: 1, backgroundColor: "transparent" }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[Typography.body, { color: colors.textSecondary, marginBottom: Spacing.xl }]}>
          Transform any cooking link or cookbook photo into a structured recipe.
        </Text>

        {/* URL Input Section */}
        <Text style={[Typography.overline, { color: colors.textTertiary, marginBottom: Spacing.sm }]}>
          WEB LINK
        </Text>
        <View style={styles.inputWrapper}>
          <View style={[
            styles.inputContainer,
            {
              backgroundColor: colors.surface,
              borderColor: isInputFocused ? colors.primaryAccent : colors.border,
            },
          ]}>
            <Ionicons name="link-outline" size={18} color={colors.textTertiary} style={{ marginRight: Spacing.sm }} />
            <TextInput
              placeholder="Paste recipe link..."
              placeholderTextColor={colors.textTertiary}
              value={recipeLink}
              onChangeText={(txt) => {
                setRecipeLink(txt);
                if (txt) handleClearImage();
              }}
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => setIsInputFocused(false)}
              style={[styles.linkInput, { color: colors.textPrimary }]}
              autoCapitalize="none"
              autoCorrect={false}
              multiline={false}
              numberOfLines={1}
            />
            <TouchableOpacity
              style={[styles.pasteBtn, { backgroundColor: colors.primaryAccentMuted }]}
              onPress={handlePasteLink}
            >
              <Text style={[Typography.chipText, { color: colors.primaryAccent }]}>
                Paste
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Supported Platforms */}
        <View style={styles.platformsRow}>
          {platforms.map((p, i) => (
            <View
              key={i}
              style={[styles.platformChip, { backgroundColor: `${p.color}10` }]}
            >
              <Ionicons name={p.icon} size={12} color={p.color} />
              <Text style={[styles.platformText, { color: p.color }]}>
                {p.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Visual Scan Section */}
        <Text style={[Typography.overline, { color: colors.textTertiary, marginBottom: Spacing.sm, marginTop: Spacing.xxl }]}>
          VISUAL SCAN
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
              style={[styles.clearImageBtn, { backgroundColor: colors.overlay }]}
              onPress={handleClearImage}
            >
              <Ionicons name="close" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.scannerRow}>
            <CardContainer
              style={styles.scannerCard}
              onPress={triggerCamera}
            >
              <View style={[styles.scannerIconWrap, { backgroundColor: colors.primaryAccentMuted }]}>
                <Ionicons name="camera-outline" size={22} color={colors.primaryAccent} />
              </View>
              <Text style={[Typography.label, { color: colors.textPrimary, marginTop: Spacing.sm }]}>Camera</Text>
              <Text style={[Typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                Scan cookbook
              </Text>
            </CardContainer>

            <CardContainer
              style={styles.scannerCard}
              onPress={triggerGallery}
            >
              <View style={[styles.scannerIconWrap, { backgroundColor: colors.primaryAccentMuted }]}>
                <Ionicons name="images-outline" size={22} color={colors.primaryAccent} />
              </View>
              <Text style={[Typography.label, { color: colors.textPrimary, marginTop: Spacing.sm }]}>Gallery</Text>
              <Text style={[Typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                Upload photo
              </Text>
            </CardContainer>
          </View>
        )}

        {/* Manual Creation */}
        <CardContainer
          style={styles.manualCard}
          onPress={() => router.push("/manual-recipe")}
        >
          <View style={styles.manualRow}>
            <View style={[styles.scannerIconWrap, { backgroundColor: colors.primaryAccentMuted }]}>
              <Ionicons name="create-outline" size={20} color={colors.primaryAccent} />
            </View>
            <View style={{ flex: 1, marginLeft: Spacing.md }}>
              <Text style={[Typography.label, { color: colors.textPrimary }]}>Manual Creation</Text>
              <Text style={[Typography.caption, { color: colors.textSecondary }]}>
                Type recipe details by hand
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </View>
        </CardContainer>

        {/* Submit Button */}
        <ActionButton
          title="Extract Recipe"
          icon="sparkles-outline"
          onPress={handleExtractRecipe}
          style={{ marginTop: Spacing.xl }}
        />

        {/* Loading Overlay */}
        <Modal visible={loading} transparent animationType="fade">
          <View style={styles.overlayBackground}>
            <View
              style={[
                styles.overlayContent,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <ActivityIndicator size="small" color={colors.primaryAccent} />
              <Text
                style={[Typography.cardTitle, { color: colors.textPrimary, marginTop: Spacing.lg }]}
              >
                Extracting Recipe
              </Text>
              <Text
                style={[Typography.caption, { color: colors.textSecondary, marginTop: Spacing.xs }]}
              >
                {loadingStep}
              </Text>
            </View>
          </View>
        </Modal>

        <View style={{ height: 120 }} />
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
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
  },
  inputWrapper: {
    width: "100%",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: Radius.md,
    paddingLeft: Spacing.lg,
    paddingRight: Spacing.xs,
    height: 52,
  },
  linkInput: {
    flex: 1,
    fontSize: 15,
    height: "100%",
  },
  pasteBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
  },
  platformsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.md,
    flexWrap: "wrap",
  },
  platformChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    gap: 4,
  },
  platformText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  scannerRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  scannerCard: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xxl,
  },
  scannerIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
  },
  imagePreviewContainer: {
    height: 200,
    borderRadius: Radius.lg,
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
    top: Spacing.sm,
    right: Spacing.sm,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  manualCard: {
    marginTop: Spacing.md,
  },
  manualRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  overlayBackground: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  overlayContent: {
    padding: Spacing.xxl,
    borderRadius: Radius.xl,
    borderWidth: 1,
    alignItems: "center",
    width: "75%",
  },
});
