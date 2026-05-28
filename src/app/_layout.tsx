import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { Slot, useRouter, useSegments, Stack, DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useNetInfo } from '@react-native-community/netinfo';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { onAuthStateChanged } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { store, persistor, RootState } from '@/store';
import { PersistGate } from 'redux-persist/integration/react';
import { auth } from '@/services/firebase';
import { login, logout } from '@/store/authSlice';
import { completeOnboarding } from '@/store/onboardingSlice';
import { ThemeColors } from '@/theme/colors';
import * as SplashScreen from 'expo-splash-screen';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import { Platform } from 'react-native';

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const dispatch = useDispatch();
  const router = useRouter();
  const segments = useSegments();
  const isLoggedIn = useSelector((state: RootState) => state.auth.isLoggedIn);
  const hasCompletedOnboarding = useSelector((state: RootState) => state.onboarding.hasCompletedOnboarding);
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
        const val = await AsyncStorage.getItem('hasCompletedOnboarding');
        if (val === 'true') {
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
        console.warn("[Auth] Firebase Auth state listener timed out after 2.5s. Proceeding to app...");
        setInitializing(false);
      }
    }, 2500);

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      resolved = true;
      clearTimeout(timer);
      console.log("[Auth] Firebase Auth state resolved. user =", user ? user.email : "none");
      
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

  // RevenueCat SDK Initialization
  useEffect(() => {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    // TODO: Replace with real API keys before production release
    const apiKey = Platform.select({
      ios: "appl_api_key_placeholder",
      android: "goog_api_key_placeholder",
    });
    
    if (apiKey) {
      Purchases.configure({ apiKey });
    }
  }, []);

  const isReady = !initializing && onboardingLoaded;

  // Handle Route Guard Navigation
  useEffect(() => {
    if (!isReady) return;

    const currentSegment = segments[0];

    // 1. Force onboarding if not completed
    if (!hasCompletedOnboarding) {
      if (currentSegment !== 'onboarding') {
        router.replace('/onboarding');
      }
      return;
    }

    // 2. Prevent visiting onboarding if already completed
    if (hasCompletedOnboarding && currentSegment === 'onboarding') {
      router.replace(isLoggedIn ? '/(tabs)/capture' : '/login');
      return;
    }

    // 3. Authenticated route guarding
    const inAuthGroup = currentSegment === '(tabs)' || currentSegment === 'recipe-display';

    if (!isLoggedIn && inAuthGroup) {
      // Redirect unauthenticated user to login screen
      router.replace('/login');
    } else if (isLoggedIn && (currentSegment === 'login' || currentSegment === undefined)) {
      // Redirect logged in user to capture engine
      router.replace('/(tabs)/capture');
    }

    // Hide splash screen smoothly now that routing is resolved
    setTimeout(() => {
      SplashScreen.hideAsync();
    }, 100);

  }, [isLoggedIn, hasCompletedOnboarding, segments, isReady, router]);

  if (!isReady) {
    return null; // Return null to keep native splash screen visible
  }

  const navTheme = {
    dark: mode === 'dark',
    fonts: mode === 'dark' ? DarkTheme.fonts : DefaultTheme.fonts,
    colors: {
      ...(mode === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
      background: colors.background,
      card: colors.surface,
      text: colors.textPrimary,
      border: colors.border,
      primary: colors.primaryAccent,
    },
  };

  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      {netInfo.isConnected === false && (
        <View style={[styles.offlineWrapper, { top: Math.max(insets.top, 20) + 10 }]}>
          <View style={styles.offlineBannerPill}>
            <Text style={styles.offlineText}>Offline Mode</Text>
          </View>
        </View>
      )}
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen 
          name="recipe-display" 
          options={{ 
            headerShown: false,
          }} 
        />
      </Stack>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  appName: {
    fontSize: 42,
    fontWeight: "900",
    letterSpacing: -1.5,
  },
  offlineWrapper: {
    position: 'absolute',
    width: '100%',
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offlineBannerPill: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  offlineText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
