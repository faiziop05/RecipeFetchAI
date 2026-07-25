import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNetInfo } from "@react-native-community/netinfo";
import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider,
  useRouter,
  useSegments,
} from "expo-router";
import { StatusBar } from "expo-status-bar";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState, useRef } from "react";
import { StyleSheet, Text, View, Animated } from "react-native";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Provider, useDispatch, useSelector } from "react-redux";

import { auth, db } from "@/services/firebase";
import { persistor, RootState, store } from "@/store";
import { login, logout } from "@/store/authSlice";
import { completeOnboarding } from "@/store/onboardingSlice";
import { PersistGate } from "redux-persist/integration/react";

import { clearPlan, setWeeklyPlan } from "@/store/plannerSlice";
import { ThemeColors, ThemeGradients } from "@/theme/colors";
import { LinearGradient } from "expo-linear-gradient";
import * as SplashScreen from "expo-splash-screen";
import { doc, onSnapshot } from "firebase/firestore";
import { Platform } from "react-native";
import Purchases, { LOG_LEVEL } from "react-native-purchases";

SplashScreen.preventAutoHideAsync();

const AnimatedBackground = () => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 4000,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 4000,
          useNativeDriver: true,
        })
      ])
    ).start();
  }, [fadeAnim]);

  return (
    <View style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={ThemeGradients.bgDarkShift1 as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeAnim }]}>
        <LinearGradient
          colors={ThemeGradients.bgDarkShift2 as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
};

function RootLayoutNav() {
  const dispatch = useDispatch();
  const router = useRouter();
  const segments = useSegments();
  const isLoggedIn = useSelector((state: RootState) => state.auth.isLoggedIn);
  const hasCompletedOnboarding = useSelector(
    (state: RootState) => state.onboarding.hasCompletedOnboarding,
  );
  const hasCompletedPostLoginSetup = useSelector(
    (state: RootState) => state.auth.hasCompletedPostLoginSetup,
  );
  const mode = useSelector((state: RootState) => state.theme.mode);

  const [initializing, setInitializing] = useState(true);
  const [onboardingLoaded, setOnboardingLoaded] = useState(false);
  const colors = ThemeColors[mode];
  const netInfo = useNetInfo();
  const insets = useSafeAreaInsets();

  // Load persistent onboarding state from AsyncStorage
  useEffect(() => {
    const loadOnboardingState = async () => {
      try {
        const val = await AsyncStorage.getItem("hasCompletedOnboarding");
        if (val === "true") {
          dispatch(completeOnboarding());
        }
      } catch (e) {
        console.error("Failed to load onboarding persistence:", e);
      } finally {
        setOnboardingLoaded(true);
      }
    };
    loadOnboardingState();
  }, [dispatch]);

  // Monitor Firebase Auth State with safety fallback timeout
  useEffect(() => {
    let resolved = false;

    const timer = setTimeout(() => {
      if (!resolved) {
        console.warn(
          "[Auth] Firebase Auth state listener timed out after 2.5s. Proceeding to app...",
        );
        setInitializing(false);
      }
    }, 2500);

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      resolved = true;
      clearTimeout(timer);
      console.log(
        "[Auth] Firebase Auth state resolved. user =",
        user ? user.email : "none",
      );

      if (user) {
        dispatch(login({ uid: user.uid, email: user.email }));
      } else {
        dispatch(logout());
      }
      setInitializing(false);
    });

    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [dispatch]);

  // Synchronize active meal plan in real-time from Firestore
  useEffect(() => {
    if (!isLoggedIn || !auth.currentUser) return;
    const userId = auth.currentUser.uid;

    // Active meal plan listener
    const planDocRef = doc(db, `users/${userId}/active_plan/data`);
    const unsubscribePlan = onSnapshot(
      planDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data && Array.isArray(data.weeklyPlan)) {
            dispatch(setWeeklyPlan(data.weeklyPlan));
          } else {
            dispatch(clearPlan());
          }
        } else {
          dispatch(clearPlan());
        }
      },
      (err) => {
        console.warn("[Firestore Sync] Active plan listener error:", err);
      },
    );

    return () => {
      unsubscribePlan();
    };
  }, [isLoggedIn, dispatch]);

  // RevenueCat SDK Initialization
  useEffect(() => {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    const apiKey = Platform.select({
      ios:
        process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY ||
        "appl_api_key_placeholder",
      android:
        process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY ||
        "goog_api_key_placeholder",
    });

    if (
      apiKey &&
      apiKey !== "appl_api_key_placeholder" &&
      apiKey !== "goog_api_key_placeholder"
    ) {
      try {
        Purchases.configure({ apiKey });
      } catch (e) {
        console.warn("RevenueCat Purchases configure error:", e);
      }
    }
  }, []);

  const isReady = !initializing && onboardingLoaded;

  // Handle Route Guard Navigation
  useEffect(() => {
    if (!isReady) return;

    const currentSegment = segments[0];
    let isRedirecting = false;

    // 1. Force onboarding if not completed
    if (!hasCompletedOnboarding) {
      if (currentSegment !== "onboarding") {
        router.replace("/onboarding");
        isRedirecting = true;
      }
    }
    // 2. Prevent visiting onboarding if already completed
    else if (hasCompletedOnboarding && currentSegment === "onboarding") {
      router.replace(isLoggedIn ? "/(tabs)/home" : "/login");
      isRedirecting = true;
    }
    // 3. Authenticated route guarding
    else {
      const inAuthGroup =
        currentSegment === "(tabs)" ||
        currentSegment === "recipe-display" ||
        currentSegment === "preferences" ||
        currentSegment === "setup-diet" ||
        currentSegment === "setup-pantry";

      if (!isLoggedIn && inAuthGroup) {
        // Redirect unauthenticated user to login screen
        router.replace("/login");
        isRedirecting = true;
      } else if (isLoggedIn) {
        if (
          !hasCompletedPostLoginSetup &&
          currentSegment !== "setup-diet" &&
          currentSegment !== "setup-pantry"
        ) {
          router.replace("/setup-diet");
          isRedirecting = true;
        } else if (
          hasCompletedPostLoginSetup &&
          (currentSegment === "login" ||
            currentSegment === undefined ||
            currentSegment === "setup-diet" ||
            currentSegment === "setup-pantry")
        ) {
          router.replace("/(tabs)/home");
          isRedirecting = true;
        }
      }
    }

    // Hide splash screen smoothly now that routing is resolved
    if (!isRedirecting) {
      setTimeout(() => {
        SplashScreen.hideAsync().catch((err) => {
          console.warn("[Splash] Failed to hide splash screen:", err);
        });
      }, 100);
    }
  }, [isLoggedIn, hasCompletedOnboarding, segments, isReady, router]);

  if (!isReady) {
    return null; // Return null to keep native splash screen visible
  }

  const navTheme = {
    dark: mode === "dark",
    fonts: mode === "dark" ? DarkTheme.fonts : DefaultTheme.fonts,
    colors: {
      ...(mode === "dark" ? DarkTheme.colors : DefaultTheme.colors),
      background: colors.background,
      card: colors.surface,
      text: colors.textPrimary,
      border: colors.border,
      primary: colors.primaryAccent,
    },
  };

  return (
    <ThemeProvider value={navTheme}>
      <View style={{ flex: 1 }}>
        {mode === 'dark' ? (
          <AnimatedBackground />
        ) : (
          <View
            style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]}
          />
        )}
        <StatusBar style={mode === "dark" ? "light" : "dark"} />
        {netInfo.isConnected === false && (
          <View
            style={[
              styles.offlineWrapper,
              { top: Math.max(insets.top, 20) + 10 },
            ]}
          >
            <View style={styles.offlineBannerPill}>
              <Text style={styles.offlineText}>Offline Mode</Text>
            </View>
          </View>
        )}
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: "transparent" },
            animation: "fade", // Fix lag over animated backgrounds
          }}
        >
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="setup-diet" options={{ headerShown: false }} />
          <Stack.Screen name="setup-pantry" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="recipe-display"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen name="manual-recipe" options={{ headerShown: false }} />
          <Stack.Screen name="match-results" options={{ headerShown: false }} />
          <Stack.Screen
            name="meal-plan-detail"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="preferences"
            options={{
              headerShown: false,
              presentation: "modal",
            }}
          />
        </Stack>
      </View>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <SafeAreaProvider>
          <RootLayoutNav />
        </SafeAreaProvider>
      </PersistGate>
    </Provider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  brandContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  appName: {
    fontSize: 42,
    fontWeight: "900",
    letterSpacing: -1.5,
  },
  offlineWrapper: {
    position: "absolute",
    width: "100%",
    zIndex: 9999,
    alignItems: "center",
    justifyContent: "center",
  },
  offlineBannerPill: {
    backgroundColor: "#EF4444",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.3)",
  },
  offlineText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
});
