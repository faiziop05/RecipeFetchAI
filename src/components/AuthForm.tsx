import React, { useState, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
  TextInput,
  ActivityIndicator,
  Platform,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

// ─── Input Types ─────────────────────────────────────────────────────────────
interface PwdInputProps {
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  error?: string;
  colors: any;
  returnKeyType?: "done" | "next";
  onSubmitEditing?: () => void;
}

const PwdInput: React.FC<PwdInputProps> = ({
  placeholder,
  value,
  onChangeText,
  error,
  colors,
  returnKeyType,
  onSubmitEditing,
}) => {
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ marginBottom: 4 }}>
      <View
        style={[
          styles.inputRow,
          {
            borderColor: error ? "#EF4444" : focused ? colors.primaryAccent : colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        <Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} style={{ marginRight: 10 }} />
        <TextInput
          style={[styles.textInput, { color: colors.textPrimary }]}
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
      {!!error && <Text style={styles.fieldError}>{error}</Text>}
    </View>
  );
};

interface EmailInputProps {
  value: string;
  onChangeText: (t: string) => void;
  error?: string;
  colors: any;
  returnKeyType?: "done" | "next";
  onSubmitEditing?: () => void;
}

const EmailInput: React.FC<EmailInputProps> = ({
  value,
  onChangeText,
  error,
  colors,
  returnKeyType,
  onSubmitEditing,
}) => {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ marginBottom: 4 }}>
      <View
        style={[
          styles.inputRow,
          {
            borderColor: error ? "#EF4444" : focused ? colors.primaryAccent : colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        <Ionicons name="mail-outline" size={18} color={colors.textSecondary} style={{ marginRight: 10 }} />
        <TextInput
          style={[styles.textInput, { color: colors.textPrimary }]}
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
      {!!error && <Text style={styles.fieldError}>{error}</Text>}
    </View>
  );
};

interface InputLabelProps {
  label: string;
  colors: any;
}

const InputLabel: React.FC<InputLabelProps> = ({ label, colors }) => (
  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
    {label}
  </Text>
);

interface AuthBtnProps {
  label: string;
  loading: boolean;
  onPress: () => void;
  colors: any;
}

const AuthBtn: React.FC<AuthBtnProps> = ({ label, loading, onPress, colors }) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={loading}
    activeOpacity={0.8}
    style={[styles.authBtn, { backgroundColor: colors.primaryAccent, opacity: loading ? 0.7 : 1 }]}
  >
    {loading ? (
      <ActivityIndicator color={colors.background} />
    ) : (
      <Text style={[styles.authBtnText, { color: colors.background }]}>
        {label}
      </Text>
    )}
  </TouchableOpacity>
);

const Divider: React.FC<{ colors: any }> = ({ colors }) => (
  <View style={styles.dividerRow}>
    <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
    <Text style={[styles.dividerText, { color: colors.textSecondary }]}>or</Text>
    <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
  </View>
);

interface SwitchViewRowProps {
  prompt: string;
  linkText: string;
  onPress: () => void;
  colors: any;
}

const SwitchViewRow: React.FC<SwitchViewRowProps> = ({ prompt, linkText, onPress, colors }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.switchRow}>
    <Text style={[styles.switchPrompt, { color: colors.textSecondary }]}>
      {prompt}{" "}
    </Text>
    <Text style={[styles.switchLink, { color: colors.primaryAccent }]}>
      {linkText}
    </Text>
  </TouchableOpacity>
);

// ─── Main Form Component ──────────────────────────────────────────────────────
type AuthView = "login" | "signup" | "forgot";

interface AuthFormProps {
  onLogin: (email: string, pass: string) => Promise<void> | void;
  onSignup: (email: string, pass: string) => Promise<void> | void;
  onForgotPassword: (email: string) => Promise<void> | void;
  loading: boolean;
  colors: any;
  mode: string;
}

export const AuthForm: React.FC<AuthFormProps> = ({
  onLogin,
  onSignup,
  onForgotPassword,
  loading,
  colors,
  mode,
}) => {
  const [view, setView] = useState<AuthView>("login");

  // Fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Errors
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmError, setConfirmError] = useState("");

  // Animations
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

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

  const handlePressLogin = () => {
    clearErrors();
    let valid = true;
    if (!email.trim()) {
      setEmailError("Email is required");
      valid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError("Enter a valid email address");
      valid = false;
    }
    if (!password) {
      setPasswordError("Password is required");
      valid = false;
    }
    if (valid) {
      onLogin(email.trim(), password);
    }
  };

  const handlePressSignup = () => {
    clearErrors();
    let valid = true;
    if (!email.trim()) {
      setEmailError("Email is required");
      valid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError("Enter a valid email address");
      valid = false;
    }
    if (!password) {
      setPasswordError("Password is required");
      valid = false;
    } else if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      valid = false;
    }
    if (!confirmPassword) {
      setConfirmError("Please confirm your password");
      valid = false;
    } else if (confirmPassword !== password) {
      setConfirmError("Passwords do not match");
      valid = false;
    }
    if (valid) {
      onSignup(email.trim(), password);
    }
  };

  const handlePressForgot = () => {
    clearErrors();
    if (!email.trim()) {
      setEmailError("Enter your email address above");
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError("Enter a valid email address");
      return;
    }
    onForgotPassword(email.trim());
  };

  const canGoBack = view === "signup" || view === "forgot";

  const viewMeta: Record<AuthView, { title: string; sub: string }> = {
    login: { title: "Welcome back", sub: "Sign in to your recipe vault" },
    signup: { title: "Create account", sub: "Start building your cookbook" },
    forgot: { title: "Reset password", sub: "We'll send a secure link to your inbox" },
  };

  return (
    <Animated.View
      style={[
        styles.card,
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
      <View style={styles.cardHeader}>
        {canGoBack && (
          <TouchableOpacity
            onPress={() => navigateTo("login")}
            activeOpacity={0.7}
            style={[
              styles.backBtn,
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
        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
          {viewMeta[view].title}
        </Text>
        <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
          {viewMeta[view].sub}
        </Text>
      </View>

      <View style={styles.formBody}>
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
              onSubmitEditing={handlePressLogin}
            />

            <TouchableOpacity
              onPress={() => navigateTo("forgot")}
              activeOpacity={0.7}
              style={styles.forgotLink}
            >
              <Text style={[styles.forgotText, { color: colors.textSecondary }]}>
                Forgot password?
              </Text>
            </TouchableOpacity>

            <AuthBtn
              label="Sign In"
              loading={loading}
              onPress={handlePressLogin}
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
              onSubmitEditing={handlePressSignup}
            />

            <View style={{ height: 20 }} />
            <AuthBtn
              label="Create Account"
              loading={loading}
              onPress={handlePressSignup}
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
            <View style={[styles.forgotHint, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
              <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} style={{ marginRight: 8, marginTop: 1 }} />
              <Text style={[styles.forgotHintText, { color: colors.textSecondary }]}>
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
              onSubmitEditing={handlePressForgot}
            />

            <View style={{ height: 20 }} />
            <AuthBtn
              label="Send Reset Link"
              loading={loading}
              onPress={handlePressForgot}
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
  );
};

const styles = StyleSheet.create({
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
});
