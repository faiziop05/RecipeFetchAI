import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";

import { auth } from "@/services/firebase";
import { login, completePostLoginSetup } from "@/store/authSlice";
import { RootState } from "@/store";
import { ThemeColors } from "@/theme/colors";
import { CustomAlert } from "@/components/CustomAlert";
import { AuthForm } from "@/components/AuthForm";

export default function LoginScreen() {
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const mode = useSelector((state: RootState) => state.theme.mode);
  const colors = ThemeColors[mode];

  const [loading, setLoading] = useState(false);

  // Alert
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
    buttons?: Array<{ text: string; onPress?: () => void; style?: "default" | "cancel" | "destructive" }>,
  ) => {
    setAlertConfig({ visible: true, title, message, type, buttons });
  };

  // ── Login ──
  const handleLogin = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      // Skip setup flow for returning users
      dispatch(completePostLoginSetup());
      dispatch(login({ uid: cred.user.uid, email: cred.user.email }));
    } catch (err: any) {
      const msg =
        err.code === "auth/invalid-credential" ||
        err.code === "auth/wrong-password" ||
        err.code === "auth/user-not-found"
          ? "Invalid email or password. Please try again."
          : err.code === "auth/invalid-email"
          ? "The email address is badly formatted."
          : "An error occurred. Please try again.";
      showAlert("Sign In Failed", msg, "error");
    } finally {
      setLoading(false);
    }
  };

  // ── Signup ──
  const handleSignup = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      dispatch(login({ uid: cred.user.uid, email: cred.user.email }));
    } catch (err: any) {
      const msg =
        err.code === "auth/email-already-in-use"
          ? "This email address is already in use."
          : "Could not create account. Please try again.";
      showAlert("Sign Up Failed", msg, "error");
    } finally {
      setLoading(false);
    }
  };

  // ── Forgot ──
  const handleForgotPassword = async (email: string) => {
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      showAlert(
        "Reset Link Sent",
        "A secure password reset link has been sent to your inbox. Check your email and follow the instructions.",
        "success",
      );
    } catch (err: any) {
      showAlert(
        "Reset Failed",
        err.code === "auth/user-not-found"
          ? "No account found with this email address."
          : "Could not send reset email. Please try again.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[authStyles.root, { backgroundColor: 'transparent' }]}
    >
      <ScrollView
        contentContainerStyle={[
          authStyles.scroll,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Brand area */}
        <View style={authStyles.brandArea}>
          <Text style={[authStyles.title, { color: colors.textPrimary }]}>
            Save your kitchen.
          </Text>
          <Text style={[authStyles.subtitle, { color: colors.textSecondary }]}>
            Create an account to keep your recipes safe and sync your weekly plans.
          </Text>
        </View>

        {/* Card containing AuthForm */}
        <AuthForm
          onLogin={handleLogin}
          onSignup={handleSignup}
          onForgotPassword={handleForgotPassword}
          loading={loading}
          colors={colors}
          mode={mode}
        />

        {/* Legal notice */}
        <Text style={[authStyles.legal, { color: colors.textSecondary }]}>
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </Text>
      </ScrollView>

      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        buttons={alertConfig.buttons}
        onClose={() => setAlertConfig((prev) => ({ ...prev, visible: false }))}
      />
    </KeyboardAvoidingView>
  );
}

const authStyles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
  },
  brandArea: {
    marginBottom: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: -1,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    maxWidth: "80%",
  },
  legal: {
    textAlign: "center",
    fontSize: 12,
    fontWeight: "400",
    marginTop: 24,
    paddingHorizontal: 24,
    lineHeight: 18,
    opacity: 0.6,
  },
});
