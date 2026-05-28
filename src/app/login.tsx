import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Animated,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import Ionicons from "@expo/vector-icons/Ionicons";

import { auth } from "@/services/firebase";
import { login } from "@/store/authSlice";
import { RootState } from "@/store";
import { ThemeColors } from "@/theme/colors";
import { CustomAlert } from "@/components/CustomAlert";

type AuthView = "login" | "signup" | "forgot";

// ─── Password Input ─────────────────────────────────────────────────────────
interface PwdInputProps {
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  error?: string;
  colors: any;
  returnKeyType?: "done" | "next";
  onSubmitEditing?: () => void;
}
function PwdInput({ placeholder, value, onChangeText, error, colors, returnKeyType, onSubmitEditing }: PwdInputProps) {
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ marginBottom: 4 }}>
      <View
        style={[
          authStyles.inputRow,
          {
            borderColor: error ? "#EF4444" : focused ? colors.primaryAccent : colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        <Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} style={{ marginRight: 10 }} />
        <TextInput
          style={[authStyles.textInput, { color: colors.textPrimary }]}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        <TouchableOpacity onPress={() => setVisible(!visible)} activeOpacity={0.7} style={{ padding: 4 }}>
          <Ionicons name={visible ? "eye-outline" : "eye-off-outline"} size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
      {!!error && <Text style={authStyles.fieldError}>{error}</Text>}
    </View>
  );
}

// ─── Email Input ─────────────────────────────────────────────────────────────
interface EmailInputProps {
  value: string;
  onChangeText: (t: string) => void;
  error?: string;
  colors: any;
  returnKeyType?: "done" | "next";
  onSubmitEditing?: () => void;
}
function EmailInput({ value, onChangeText, error, colors, returnKeyType, onSubmitEditing }: EmailInputProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ marginBottom: 4 }}>
      <View
        style={[
          authStyles.inputRow,
          {
            borderColor: error ? "#EF4444" : focused ? colors.primaryAccent : colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        <Ionicons name="mail-outline" size={18} color={colors.textSecondary} style={{ marginRight: 10 }} />
        <TextInput
          style={[authStyles.textInput, { color: colors.textPrimary }]}
          placeholder="your@email.com"
          placeholderTextColor={colors.textSecondary}
          value={value}
          onChangeText={onChangeText}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </View>
      {!!error && <Text style={authStyles.fieldError}>{error}</Text>}
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function LoginScreen() {
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const mode = useSelector((state: RootState) => state.theme.mode);
  const colors = ThemeColors[mode];
  const isDark = mode === "dark";

  const [view, setView] = useState<AuthView>("login");

  // Fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Errors
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmError, setConfirmError] = useState("");

  const [loading, setLoading] = useState(false);

  // Animation
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

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

  const clearErrors = () => {
    setEmailError("");
    setPasswordError("");
    setConfirmError("");
  };

  const navigateTo = (next: AuthView) => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -20, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      setView(next);
      clearErrors();
      slideAnim.setValue(20);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 240, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 8, useNativeDriver: true }),
      ]).start();
    });
  };

  // ── Login ──
  const handleLogin = async () => {
    clearErrors();
    let valid = true;
    if (!email.trim()) { setEmailError("Email is required"); valid = false; }
    else if (!/\S+@\S+\.\S+/.test(email)) { setEmailError("Enter a valid email address"); valid = false; }
    if (!password) { setPasswordError("Password is required"); valid = false; }
    if (!valid) return;

    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
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
  const handleSignup = async () => {
    clearErrors();
    let valid = true;
    if (!email.trim()) { setEmailError("Email is required"); valid = false; }
    else if (!/\S+@\S+\.\S+/.test(email)) { setEmailError("Enter a valid email address"); valid = false; }
    if (!password) { setPasswordError("Password is required"); valid = false; }
    else if (password.length < 6) { setPasswordError("Password must be at least 6 characters"); valid = false; }
    if (!confirmPassword) { setConfirmError("Please confirm your password"); valid = false; }
    else if (confirmPassword !== password) { setConfirmError("Passwords do not match"); valid = false; }
    if (!valid) return;

    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
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
  const handleForgotPassword = async () => {
    clearErrors();
    if (!email.trim()) { setEmailError("Enter your email address above"); return; }
    if (!/\S+@\S+\.\S+/.test(email)) { setEmailError("Enter a valid email address"); return; }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
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

  // ─── Render ───────────────────────────────────────────────────────────────
  const canGoBack = view === "signup" || view === "forgot";

  const viewMeta: Record<AuthView, { title: string; sub: string }> = {
    login: { title: "Welcome back", sub: "Sign in to your recipe vault" },
    signup: { title: "Create account", sub: "Start building your cookbook" },
    forgot: { title: "Reset password", sub: "We'll send a secure link to your inbox" },
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[authStyles.root, { backgroundColor: colors.background }]}
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
          <Text style={[authStyles.appName, { color: colors.textPrimary }]}>
            Recipe<Text style={{ color: colors.primaryAccent }}>Fetch</Text>
          </Text>
        </View>

        {/* Card */}
        <Animated.View
          style={[
            authStyles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
              ...colors.cardShadow,
            },
          ]}
        >
          {/* Card header */}
          <View style={authStyles.cardHeader}>
            {canGoBack && (
              <TouchableOpacity
                onPress={() => navigateTo("login")}
                activeOpacity={0.7}
                style={[
                  authStyles.backBtn,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    position: "absolute",
                    left: 20,
                    top: 24,
                  },
                ]}
              >
                <Ionicons name="arrow-back" size={18} color={colors.textPrimary} />
              </TouchableOpacity>
            )}
            {/* Titles — centered */}
            <Text style={[authStyles.cardTitle, { color: colors.textPrimary }]}>
              {viewMeta[view].title}
            </Text>
            <Text style={[authStyles.cardSub, { color: colors.textSecondary }]}>
              {viewMeta[view].sub}
            </Text>
          </View>

          <View style={authStyles.formBody}>
            {/* ── LOGIN ── */}
            {view === "login" && (
              <>
                <InputLabel label="Email" colors={colors} />
                <EmailInput
                  value={email}
                  onChangeText={setEmail}
                  error={emailError}
                  colors={colors}
                  returnKeyType="next"
                />

                <View style={{ height: 12 }} />
                <InputLabel label="Password" colors={colors} />
                <PwdInput
                  placeholder="Enter password"
                  value={password}
                  onChangeText={setPassword}
                  error={passwordError}
                  colors={colors}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />

                <TouchableOpacity
                  onPress={() => navigateTo("forgot")}
                  activeOpacity={0.7}
                  style={authStyles.forgotLink}
                >
                  <Text style={[authStyles.forgotText, { color: colors.textSecondary }]}>
                    Forgot password?
                  </Text>
                </TouchableOpacity>

                <AuthBtn
                  label="Sign In"
                  loading={loading}
                  onPress={handleLogin}
                  colors={colors}
                />

                <Divider colors={colors} />

                <SwitchViewRow
                  prompt="Don't have an account?"
                  linkText="Sign up free"
                  onPress={() => navigateTo("signup")}
                  colors={colors}
                />
              </>
            )}

            {/* ── SIGNUP ── */}
            {view === "signup" && (
              <>
                <InputLabel label="Email" colors={colors} />
                <EmailInput
                  value={email}
                  onChangeText={setEmail}
                  error={emailError}
                  colors={colors}
                  returnKeyType="next"
                />

                <View style={{ height: 12 }} />
                <InputLabel label="Password" colors={colors} />
                <PwdInput
                  placeholder="Min. 6 characters"
                  value={password}
                  onChangeText={setPassword}
                  error={passwordError}
                  colors={colors}
                  returnKeyType="next"
                />

                <View style={{ height: 12 }} />
                <InputLabel label="Confirm Password" colors={colors} />
                <PwdInput
                  placeholder="Repeat password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  error={confirmError}
                  colors={colors}
                  returnKeyType="done"
                  onSubmitEditing={handleSignup}
                />

                <View style={{ height: 20 }} />
                <AuthBtn
                  label="Create Account"
                  loading={loading}
                  onPress={handleSignup}
                  colors={colors}
                />

                <Divider colors={colors} />

                <SwitchViewRow
                  prompt="Already have an account?"
                  linkText="Sign in"
                  onPress={() => navigateTo("login")}
                  colors={colors}
                />
              </>
            )}

            {/* ── FORGOT ── */}
            {view === "forgot" && (
              <>
                <View style={[authStyles.forgotHint, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
                  <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} style={{ marginRight: 8, marginTop: 1 }} />
                  <Text style={[authStyles.forgotHintText, { color: colors.textSecondary }]}>
                    Enter the email linked to your account and we'll send you a secure reset link.
                  </Text>
                </View>

                <View style={{ height: 16 }} />
                <InputLabel label="Email Address" colors={colors} />
                <EmailInput
                  value={email}
                  onChangeText={setEmail}
                  error={emailError}
                  colors={colors}
                  returnKeyType="done"
                  onSubmitEditing={handleForgotPassword}
                />

                <View style={{ height: 20 }} />
                <AuthBtn
                  label="Send Reset Link"
                  loading={loading}
                  onPress={handleForgotPassword}
                  colors={colors}
                />

                <Divider colors={colors} />

                <SwitchViewRow
                  prompt="Remembered it?"
                  linkText="Back to Sign In"
                  onPress={() => navigateTo("login")}
                  colors={colors}
                />
              </>
            )}
          </View>
        </Animated.View>

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

// ─── Sub-components ───────────────────────────────────────────────────────────

function InputLabel({ label, colors }: { label: string; colors: any }) {
  return (
    <Text style={[authStyles.inputLabel, { color: colors.textSecondary }]}>
      {label}
    </Text>
  );
}

function AuthBtn({ label, loading, onPress, colors }: { label: string; loading: boolean; onPress: () => void; colors: any }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.8}
      style={[authStyles.authBtn, { backgroundColor: colors.primaryAccent, opacity: loading ? 0.7 : 1 }]}
    >
      {loading ? (
        <ActivityIndicator color={colors.background} />
      ) : (
        <Text style={[authStyles.authBtnText, { color: colors.background }]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

function Divider({ colors }: { colors: any }) {
  return (
    <View style={authStyles.dividerRow}>
      <View style={[authStyles.dividerLine, { backgroundColor: colors.border }]} />
      <Text style={[authStyles.dividerText, { color: colors.textSecondary }]}>or</Text>
      <View style={[authStyles.dividerLine, { backgroundColor: colors.border }]} />
    </View>
  );
}

function SwitchViewRow({ prompt, linkText, onPress, colors }: { prompt: string; linkText: string; onPress: () => void; colors: any }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={authStyles.switchRow}>
      <Text style={[authStyles.switchPrompt, { color: colors.textSecondary }]}>
        {prompt}{" "}
      </Text>
      <Text style={[authStyles.switchLink, { color: colors.primaryAccent }]}>
        {linkText}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
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
  appName: {
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.5,
    textAlign: "center",
  },
  card: {
    borderRadius: 32,
    borderWidth: 1,
    overflow: "hidden",
  },
  cardHeader: {
    paddingHorizontal: 24,
    paddingTop: 36,
    paddingBottom: 20,
    gap: 8,
    alignItems: "center",
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.8,
    textAlign: "center",
  },
  cardSub: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    fontWeight: "500",
  },
  formBody: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 60,
    borderWidth: 1.5,
    borderRadius: 18,
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  textInput: {
    flex: 1,
    fontSize: 17,
    fontWeight: "500",
    height: "100%",
  },
  fieldError: {
    color: "#EF4444",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 4,
    paddingLeft: 4,
  },
  forgotLink: {
    alignSelf: "flex-end",
    marginTop: 10,
    marginBottom: 28,
    paddingVertical: 4,
  },
  forgotText: {
    fontSize: 14,
    fontWeight: "700",
  },
  forgotHint: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 18,
    padding: 16,
  },
  forgotHintText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
  },
  authBtn: {
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  authBtnText: {
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
    gap: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    opacity: 0.8,
  },
  dividerText: {
    fontSize: 13,
    fontWeight: "500",
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  switchPrompt: {
    fontSize: 14,
  },
  switchLink: {
    fontSize: 14,
    fontWeight: "700",
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

