import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  Switch,
  ScrollView,
  TouchableOpacity,
  Modal,
  Linking,
  Platform,
} from "react-native";
import { useSelector, useDispatch } from "react-redux";
import Ionicons from "@expo/vector-icons/Ionicons";
import { signOut } from "firebase/auth";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Purchases from "react-native-purchases";

import { RootState } from "@/store";
import { ThemeColors } from "@/theme/colors";
import { CardContainer } from "@/components/CardContainer";
import { ActionButton } from "@/components/ActionButton";
import { auth } from "@/services/firebase";
import { toggleTheme } from "@/store/themeSlice";
import { logout } from "@/store/authSlice";
import { setPremiumStatus } from "@/store/subscriptionSlice";
import { setProfile, ProfileState } from "@/store/profileSlice";
import { CustomAlert } from "@/components/CustomAlert";
import { PreferenceToggle } from "@/components/PreferenceToggle";

const PRIVACY_POLICY = `Privacy Policy

Last Updated: June 2026

1. Information We Collect
We collect information you provide directly to us when you create an account, scan a recipe, or communicate with us. This includes your email address, preferences, scanned images, and cooking memory data.

2. How We Use Your Information
We use the information we collect to run RecipeFetch AI services, personalize AI suggestions (using your dietary constraints and flavor preferences), and save your cooking memories.

3. Data Storage & Security
Your recipes and preference data are stored securely on our cloud infrastructure (Firebase) and cached locally on-device.

4. Contact Us
For support, email us at support@recipefetch.ai.`;

const TERMS_OF_SERVICE = `Terms & Conditions

Last Updated: June 2026

1. Acceptance of Terms
By using RecipeFetch AI, you agree to these terms. If you disagree, do not use the service.

2. Use of Service
You grant us the right to process your uploaded images and texts via secure AI models to output structured recipes.

3. Subscription Services
Subscriptions are billed through Apple App Store or Google Play. Entitlements are synced via RevenueCat.`;

export default function PreferencesScreen() {
  const dispatch = useDispatch();
  const router = useRouter();

  const mode = useSelector((state: RootState) => state.theme.mode);
  const colors = ThemeColors[mode];

  const userEmail = useSelector((state: RootState) => state.auth.email);
  const userId = useSelector((state: RootState) => state.auth.uid);

  const isPremium = useSelector((state: RootState) => state.subscription.isPremium);
  const freeScansUsed = useSelector((state: RootState) => state.subscription.freeScansUsed);
  const profile = useSelector((state: RootState) => state.profile);

  const [restoring, setRestoring] = useState(false);
  const [legalModalVisible, setLegalModalVisible] = useState(false);
  const [legalContent, setLegalContent] = useState({ title: "", text: "" });

  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type?: "info" | "success" | "error" | "confirm";
    buttons?: Array<{ text: string; onPress?: () => void; style?: "default" | "cancel" | "destructive" }>;
  }>({ visible: false, title: "", message: "" });

  const showAlert = (
    title: string,
    message: string,
    type: "info" | "success" | "error" | "confirm" = "info",
    buttons?: Array<{ text: string; onPress?: () => void; style?: "default" | "cancel" | "destructive" }>
  ) => {
    setAlertConfig({ visible: true, title, message, type, buttons });
  };

  // Profile preferences helper updates
  const handleUpdateProfile = (updates: Partial<ProfileState>) => {
    dispatch(setProfile(updates));
  };

  const toggleAllergy = (allergy: string) => {
    const list = profile.allergies || [];
    const nextList = list.includes(allergy)
      ? list.filter((a) => a !== allergy)
      : [...list, allergy];
    handleUpdateProfile({ allergies: nextList });
  };

  const toggleHealthGoal = (goal: string) => {
    const list = profile.healthGoals || [];
    const nextList = list.includes(goal)
      ? list.filter((g) => g !== goal)
      : [...list, goal];
    handleUpdateProfile({ healthGoals: nextList });
  };

  const handleManageSubscription = () => {
    const url = Platform.select({
      ios: "https://apps.apple.com/account/subscriptions",
      android: "https://play.google.com/store/account/subscriptions",
    });
    if (url) {
      Linking.openURL(url).catch((err) => {
        console.error("Failed to open subscriptions URL:", err);
        showAlert(
          "Failed to Open Link",
          "Could not open store subscription settings. Please verify the storefront app is installed.",
          "error"
        );
      });
    }
  };

  const handleRestorePurchases = async () => {
    setRestoring(true);
    try {
      const customerInfo = await Purchases.restorePurchases();
      const hasPremium =
        customerInfo.entitlements.active["premium"] !== undefined ||
        customerInfo.entitlements.active["pro"] !== undefined;

      if (hasPremium) {
        dispatch(setPremiumStatus(true));
        showAlert("Premium Restored", "Your active Premium subscription has been successfully restored!", "success");
      } else {
        dispatch(setPremiumStatus(false));
        showAlert("No Active Subscription", "We couldn't find an active Premium subscription for this Google Play account.", "info");
      }
    } catch (e: any) {
      console.error(e);
      showAlert("Restoration Failed", e.message || "Failed to restore your purchases. Please try again later.", "error");
    } finally {
      setRestoring(false);
    }
  };

  const openLegalModal = (title: string, text: string) => {
    setLegalContent({ title, text });
    setLegalModalVisible(true);
  };

  const handleToggleTheme = () => {
    dispatch(toggleTheme());
  };

  const handleSignOut = () => {
    showAlert(
      "Confirm Logout",
      "Are you sure you want to sign out of RecipeFetch AI?",
      "confirm",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            try {
              await signOut(auth);
              dispatch(logout());
              router.replace("/login");
            } catch (err) {
              console.error(err);
              showAlert("Logout Failed", "Failed to sign out. Please check your network and try again.", "error");
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "transparent" }} edges={["top", "bottom"]}>
      {/* Top Header */}
      <View style={[styles.headerBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.primaryAccent} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Preferences & Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={[styles.container, { backgroundColor: "transparent" }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Account Profile Card */}
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Account Profile</Text>
          <CardContainer style={styles.accountCard}>
            <View style={styles.accountHeader}>
              <View style={[styles.avatarBadge, { backgroundColor: colors.primaryAccent }]}>
                <Text style={[styles.avatarText, { color: colors.background }]}>
                  {userEmail ? userEmail.substring(0, 2).toUpperCase() : "US"}
                </Text>
              </View>
              <View style={styles.accountTextContainer}>
                <Text style={[styles.emailVal, { color: colors.textPrimary }]}>{userEmail || "Active User"}</Text>
                <Text style={[styles.uidVal, { color: colors.textSecondary }]}>ID: {userId || "N/A"}</Text>
              </View>
            </View>
          </CardContainer>

          {/* Subscription Section */}
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Subscription</Text>
          {isPremium ? (
            <CardContainer style={styles.accountCard}>
              <View style={styles.accountHeader}>
                <View style={[styles.avatarBadge, { backgroundColor: "#FFCC00" }]}>
                  <Ionicons name="sparkles" size={24} color={colors.background} />
                </View>
                <View style={styles.accountTextContainer}>
                  <Text style={[styles.emailVal, { color: colors.textPrimary }]}>Premium Active</Text>
                  <Text style={[styles.uidVal, { color: "#FFCC00", fontWeight: "bold" }]}>
                    Unlimited Scans Enabled
                  </Text>
                </View>
              </View>
              <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 14 }} />
              <TouchableOpacity style={styles.subActionRow} onPress={handleManageSubscription}>
                <Text style={[styles.subActionLabel, { color: colors.textPrimary }]}>Manage Subscription</Text>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </CardContainer>
          ) : (
            <CardContainer style={styles.accountCard}>
              <View style={styles.accountHeader}>
                <View style={[styles.avatarBadge, { backgroundColor: colors.textSecondary }]}>
                  <Ionicons name="star-outline" size={24} color={colors.background} />
                </View>
                <View style={styles.accountTextContainer}>
                  <Text style={[styles.emailVal, { color: colors.textPrimary }]}>Free Account</Text>
                  <Text style={[styles.uidVal, { color: colors.textSecondary }]}>
                    {freeScansUsed} / 3 free scans used this month
                  </Text>
                </View>
              </View>
              <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 14 }} />
              <TouchableOpacity
                style={[styles.subActionRow, { marginBottom: 12 }]}
                onPress={() => router.push("/paywall")}
              >
                <Text style={[styles.subActionLabel, { color: colors.primaryAccent, fontWeight: "bold" }]}>
                  Upgrade to Premium
                </Text>
                <Ionicons name="chevron-forward" size={20} color={colors.primaryAccent} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.subActionRow} onPress={handleRestorePurchases} disabled={restoring}>
                <Text style={[styles.subActionLabel, { color: colors.textPrimary }]}>
                  {restoring ? "Restoring..." : "Restore Purchases"}
                </Text>
                <Ionicons name="refresh" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </CardContainer>
          )}

          {/* Identity & Profile Engine */}
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>DIETARY CONSTRAINTS (Hard rules)</Text>
          <CardContainer style={styles.preferenceCard}>
            <View style={styles.chipRow}>
              {(["none", "halal", "vegetarian", "vegan"] as const).map((diet) => {
                const selected = profile.dietary === diet;
                return (
                  <TouchableOpacity
                    key={diet}
                    style={[
                      styles.preferenceChip,
                      {
                        backgroundColor: selected ? colors.primaryAccent : colors.background,
                        borderColor: colors.border,
                      },
                    ]}
                    onPress={() => handleUpdateProfile({ dietary: diet })}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: selected ? colors.background : colors.textPrimary, textTransform: "capitalize" },
                      ]}
                    >
                      {diet}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 14 }} />

            <Text style={[styles.preferenceSubtitle, { color: colors.textSecondary }]}>Allergies</Text>
            <View style={styles.chipRow}>
              {["nuts", "gluten", "dairy", "seafood", "soy"].map((allergy) => {
                const selected = profile.allergies?.includes(allergy);
                return (
                  <TouchableOpacity
                    key={allergy}
                    style={[
                      styles.preferenceChip,
                      {
                        backgroundColor: selected ? colors.primaryAccent : colors.background,
                        borderColor: colors.border,
                      },
                    ]}
                    onPress={() => toggleAllergy(allergy)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: selected ? colors.background : colors.textPrimary, textTransform: "capitalize" },
                      ]}
                    >
                      {allergy}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </CardContainer>

          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>CUISINE PREFERENCE (Soft rules)</Text>
          <CardContainer style={styles.preferenceCard}>
            <View style={styles.chipRow}>
              {["none", "South Asian", "Middle Eastern", "Western", "East Asian"].map((culture) => {
                const selected = profile.culture === culture;
                return (
                  <TouchableOpacity
                    key={culture}
                    style={[
                      styles.preferenceChip,
                      {
                        backgroundColor: selected ? colors.primaryAccent : colors.background,
                        borderColor: colors.border,
                      },
                    ]}
                    onPress={() => handleUpdateProfile({ culture })}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: selected ? colors.background : colors.textPrimary },
                      ]}
                    >
                      {culture}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 14 }} />

            <Text style={[styles.preferenceSubtitle, { color: colors.textSecondary }]}>Personal Taste & Details</Text>
            {/* Spicy Selector */}
            <View style={styles.pickerRow}>
              <Text style={[styles.pickerLabel, { color: colors.textPrimary }]}>Spicy Level</Text>
              <View style={styles.numberRow}>
                {[1, 2, 3, 4, 5].map((lvl) => {
                  const selected = profile.spicyLevel === lvl;
                  return (
                    <TouchableOpacity
                      key={lvl}
                      style={[
                        styles.numCircle,
                        {
                          backgroundColor: selected ? colors.primaryAccent : colors.background,
                          borderColor: colors.border,
                        },
                      ]}
                      onPress={() => handleUpdateProfile({ spicyLevel: lvl })}
                    >
                      <Text style={{ color: selected ? colors.background : colors.textPrimary, fontWeight: "bold" }}>
                        {lvl}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Budget */}
            <View style={[styles.pickerRow, { marginTop: 12 }]}>
              <Text style={[styles.pickerLabel, { color: colors.textPrimary }]}>Budget</Text>
              <View style={styles.smallChipRow}>
                {(["low", "med", "high"] as const).map((b) => {
                  const selected = profile.budgetLevel === b;
                  return (
                    <TouchableOpacity
                      key={b}
                      style={[
                        styles.smallPreferenceChip,
                        {
                          backgroundColor: selected ? colors.primaryAccent : colors.background,
                          borderColor: colors.border,
                        },
                      ]}
                      onPress={() => handleUpdateProfile({ budgetLevel: b })}
                    >
                      <Text
                        style={[
                          styles.smallChipText,
                          { color: selected ? colors.background : colors.textPrimary, textTransform: "capitalize" },
                        ]}
                      >
                        {b}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Skill Level */}
            <View style={[styles.pickerRow, { marginTop: 12 }]}>
              <Text style={[styles.pickerLabel, { color: colors.textPrimary }]}>Cooking Skill</Text>
              <View style={styles.smallChipRow}>
                {(["beginner", "intermediate", "advanced"] as const).map((skill) => {
                  const selected = profile.cookingSkill === skill;
                  return (
                    <TouchableOpacity
                      key={skill}
                      style={[
                        styles.smallPreferenceChip,
                        {
                          backgroundColor: selected ? colors.primaryAccent : colors.background,
                          borderColor: colors.border,
                        },
                      ]}
                      onPress={() => handleUpdateProfile({ cookingSkill: skill })}
                    >
                      <Text
                        style={[
                          styles.smallChipText,
                          { color: selected ? colors.background : colors.textPrimary, textTransform: "capitalize" },
                        ]}
                      >
                        {skill}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </CardContainer>

          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>HEALTH GOALS</Text>
          <CardContainer style={styles.preferenceCard}>
            <View style={styles.chipRow}>
              {["weightLoss", "highProtein", "balancedDiet", "lowCarb"].map((goal) => {
                const selected = profile.healthGoals?.includes(goal);
                const formatGoal = (g: string) => {
                  if (g === "weightLoss") return "Weight Loss";
                  if (g === "highProtein") return "High Protein";
                  if (g === "balancedDiet") return "Balanced";
                  if (g === "lowCarb") return "Low Carb";
                  return g;
                };
                return (
                  <TouchableOpacity
                    key={goal}
                    style={[
                      styles.preferenceChip,
                      {
                        backgroundColor: selected ? colors.primaryAccent : colors.background,
                        borderColor: colors.border,
                      },
                    ]}
                    onPress={() => toggleHealthGoal(goal)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: selected ? colors.background : colors.textPrimary },
                      ]}
                    >
                      {formatGoal(goal)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </CardContainer>



          {/* Preferences */}
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>App Preferences</Text>
          <PreferenceToggle
            icon="moon-outline"
            label="Dark Mode"
            value={mode === "dark"}
            onValueChange={handleToggleTheme}
            colors={colors}
            mode={mode}
          />

          {/* Data & Support */}
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Data & Support</Text>
          <CardContainer style={styles.settingsCard}>
            <TouchableOpacity
              style={[styles.settingRow, { borderBottomColor: colors.border, borderBottomWidth: 1 }]}
              onPress={() =>
                showAlert(
                  "Cache Cleared",
                  "All temporary local files and offline thumbnails have been successfully cleared from the device.",
                  "success"
                )
              }
            >
              <View style={styles.settingInfo}>
                <View
                  style={[
                    styles.iconWrapper,
                    {
                      backgroundColor:
                        mode === "light" ? "rgba(239, 68, 68, 0.1)" : "rgba(239, 68, 68, 0.15)",
                    },
                  ]}
                >
                  <Ionicons name="trash-bin-outline" size={20} color="#EF4444" />
                </View>
                <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Clear Local Cache</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingRow}
              onPress={() =>
                showAlert(
                  "Help & Support",
                  "Our support agents are currently offline. Please email support@recipefetch.ai for assistance.",
                  "info"
                )
              }
            >
              <View style={styles.settingInfo}>
                <View
                  style={[
                    styles.iconWrapper,
                    {
                      backgroundColor:
                        mode === "light" ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.08)",
                    },
                  ]}
                >
                  <Ionicons name="help-buoy-outline" size={20} color={colors.primaryAccent} />
                </View>
                <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Help & Support</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </CardContainer>

          {/* Legal */}
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Legal</Text>
          <CardContainer style={styles.settingsCard}>
            <TouchableOpacity
              style={[styles.settingRow, { borderBottomColor: colors.border, borderBottomWidth: 1 }]}
              onPress={() => openLegalModal("Privacy Policy", PRIVACY_POLICY)}
            >
              <View style={styles.settingInfo}>
                <View
                  style={[
                    styles.iconWrapper,
                    {
                      backgroundColor:
                        mode === "light" ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.08)",
                    },
                  ]}
                >
                  <Ionicons name="lock-closed-outline" size={20} color={colors.textPrimary} />
                </View>
                <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Privacy Policy</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => openLegalModal("Terms & Conditions", TERMS_OF_SERVICE)}
            >
              <View style={styles.settingInfo}>
                <View
                  style={[
                    styles.iconWrapper,
                    {
                      backgroundColor:
                        mode === "light" ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.08)",
                    },
                  ]}
                >
                  <Ionicons name="document-text-outline" size={20} color={colors.textPrimary} />
                </View>
                <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Terms & Conditions</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </CardContainer>

          {/* Logout Section */}
          <View style={styles.logoutSection}>
            <ActionButton
              title="Sign Out"
              onPress={handleSignOut}
              variant="danger"
              style={styles.signOutBtn}
            />
            <Text style={[styles.versionText, { color: colors.textSecondary }]}>
              RecipeFetch AI Version 1.3.0 (Build 50)
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Legal Document Native Modal */}
      <Modal
        visible={legalModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setLegalModalVisible(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{legalContent.title}</Text>
            <TouchableOpacity onPress={() => setLegalModalVisible(false)} style={styles.modalCloseBtn}>
              <Ionicons name="close-circle" size={30} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            <Text style={[styles.legalText, { color: colors.textPrimary }]}>{legalContent.text}</Text>
            <View style={styles.modalFooterSpacer} />
          </ScrollView>
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
    paddingHorizontal: 16,
    height: 56,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  scrollContent: {
    paddingTop: 8,
    paddingBottom: 40,
  },
  content: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "800",
    marginTop: 20,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    paddingLeft: 8,
  },
  preferenceCard: {
    padding: 16,
    marginBottom: 8,
    borderRadius: 24,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  preferenceChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  preferenceSubtitle: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  numberRow: {
    flexDirection: "row",
    gap: 6,
  },
  numCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  smallChipRow: {
    flexDirection: "row",
    gap: 6,
  },
  smallPreferenceChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  smallChipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  accountCard: {
    padding: 16,
    marginBottom: 8,
    borderRadius: 24,
  },
  accountHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  avatarBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontWeight: "800",
    fontSize: 20,
  },
  accountTextContainer: {
    flex: 1,
  },
  emailVal: {
    fontSize: 17,
    fontWeight: "800",
  },
  uidVal: {
    fontSize: 13,
    marginTop: 4,
  },
  settingsCard: {
    padding: 0,
    overflow: "hidden",
    marginBottom: 8,
    borderRadius: 24,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  settingInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  logoutSection: {
    marginTop: 32,
    alignItems: "center",
  },
  signOutBtn: {
    width: "100%",
    height: 56,
    marginBottom: 20,
  },
  versionText: {
    fontSize: 13,
    fontWeight: "600",
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalScroll: {
    padding: 24,
  },
  legalText: {
    fontSize: 15,
    lineHeight: 24,
    fontWeight: "500",
  },
  modalFooterSpacer: {
    height: 60,
  },
  subActionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  subActionLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
});
