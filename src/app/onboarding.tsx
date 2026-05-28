import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Animated,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ActivityIndicator,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useSelector, useDispatch } from "react-redux";
import { useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";

import { safeSetItem } from "@/services/storage";
import { RootState } from "@/store";
import { ThemeColors } from "@/theme/colors";
import { completeOnboarding } from "@/store/onboardingSlice";

const { width } = Dimensions.get("window");

interface Slide {
  label: string;
  title: string;
  body: string;
}

const slides: Slide[] = [
  {
    label: "01 / 03",
    title: "Scan any recipe,\ninstantly.",
    body: "Photograph a cookbook page or paste a link. The AI pulls out every ingredient, step, and nutrition value. No typing required.",
  },
  {
    label: "02 / 03",
    title: "Tweak it exactly\nhow you want.",
    body: "Make it healthier, tastier, or edit ingredients and steps by hand. Recalculate calories with one tap when you're done.",
  },
  {
    label: "03 / 03",
    title: "Everything in\none private vault.",
    body: "Every recipe you scan or create is saved to your account. Pin your favourites and cook from anywhere.",
  },
];

const ILLUSTRATION_SIZE = width * 0.65;

export default function OnboardingScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const mode = useSelector((state: RootState) => state.theme.mode);
  const colors = ThemeColors[mode];
  const isDark = mode === "dark";

  const [activeStep, setActiveStep] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const progressAnim = useRef(new Animated.Value(1 / slides.length)).current;

  // New micro-animations
  const floatAnim = useRef(new Animated.Value(0)).current;
  const scanAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;

  const advanceProgress = (step: number) => {
    Animated.timing(progressAnim, {
      toValue: (step + 1) / slides.length,
      duration: 350,
      useNativeDriver: false,
    }).start();
  };

  useEffect(() => {
    advanceProgress(activeStep);
  }, [activeStep]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: 1, duration: 2500, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 2500, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(scanAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
  }, [floatAnim, scanAnim, pulseAnim]);

  const handleNext = () => {
    if (activeStep < slides.length - 1) {
      const next = activeStep + 1;
      scrollRef.current?.scrollTo({ x: next * width, animated: true });
      setActiveStep(next);
    } else {
      handleComplete();
    }
  };

  const jumpTo = (i: number) => {
    scrollRef.current?.scrollTo({ x: i * width, animated: true });
    setActiveStep(i);
  };

  const onMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const page = Math.round(e.nativeEvent.contentOffset.x / width);
    if (page !== activeStep) setActiveStep(page);
  };

  const handleComplete = async () => {
    try {
      await safeSetItem("hasCompletedOnboarding", "true");
    } catch {}
    dispatch(completeOnboarding());
    router.replace("/login");
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const renderOnboardingArt = (slideIndex: number) => {
    const floatY = floatAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -12],
    });

    const scanY = scanAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [-40, 40],
    });

    const pulseScale = pulseAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 1.15],
    });

    const pulseOpacity = pulseAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.6, 0.2],
    });

    return (
      <View style={premiumStyles.container}>
        {/* ───────────────── SCREEN 1: Scan Scene ───────────────── */}
        {slideIndex === 0 && (
          <View style={premiumStyles.scanScene}>
            <Animated.View
              style={[
                premiumStyles.glow,
                {
                  backgroundColor: colors.primaryAccent,
                  transform: [{ scale: pulseScale }],
                  opacity: pulseOpacity,
                },
              ]}
            />

            <Animated.View
              style={[
                premiumStyles.premiumCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  transform: [{ translateY: floatY }],
                },
              ]}
            >
              <Ionicons name="document-text" size={64} color={colors.primaryAccent} />
              <View style={[premiumStyles.skeletonLine, { backgroundColor: colors.border, width: 80, marginTop: 16 }]} />
              <View style={[premiumStyles.skeletonLine, { backgroundColor: colors.border, width: 60 }]} />
            </Animated.View>

            {/* Scanner Glass */}
            <Animated.View
              style={[
                premiumStyles.scannerGlass,
                {
                  borderColor: colors.primaryAccent,
                  backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
                  transform: [{ translateY: scanY }],
                },
              ]}
            >
              <View style={[premiumStyles.scannerLaser, { backgroundColor: colors.primaryAccent }]} />
            </Animated.View>
          </View>
        )}

        {/* ───────────────── SCREEN 2: Customize Scene ───────────────── */}
        {slideIndex === 1 && (
          <View style={premiumStyles.cardsScene}>
            <Animated.View
              style={[
                premiumStyles.glow,
                {
                  backgroundColor: colors.primaryAccent,
                  transform: [{ scale: pulseScale }],
                  opacity: pulseOpacity,
                },
              ]}
            />
            
            {/* Background Card */}
            <View
              style={[
                premiumStyles.stackCardBack,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  opacity: 0.5,
                },
              ]}
            />

            {/* Middle Card */}
            <Animated.View
              style={[
                premiumStyles.stackCardMiddle,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  transform: [{ translateY: Animated.multiply(floatY as any, 0.5) }, { rotate: "5deg" }, { translateX: 10 }],
                },
              ]}
            >
              <Ionicons name="options-outline" size={40} color={colors.textSecondary} style={{ opacity: 0.5 }} />
            </Animated.View>

            {/* Front Card */}
            <Animated.View
              style={[
                premiumStyles.premiumCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  padding: 24,
                  transform: [{ translateY: floatY }],
                },
              ]}
            >
              <View style={premiumStyles.flexRow}>
                <View style={[premiumStyles.iconCircle, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Ionicons name="restaurant" size={24} color={colors.primaryAccent} />
                </View>
                <View>
                  <View style={[premiumStyles.skeletonLine, { backgroundColor: colors.textPrimary, width: 60, height: 6 }]} />
                  <View style={[premiumStyles.skeletonLine, { backgroundColor: colors.textSecondary, width: 40, height: 4 }]} />
                </View>
              </View>

              <View style={[premiumStyles.flexRow, { marginTop: 24 }]}>
                <View style={[premiumStyles.pill, { backgroundColor: colors.primaryAccent }]}>
                  <Text style={[premiumStyles.pillText, { color: colors.background }]}>Keto</Text>
                </View>
                <View style={[premiumStyles.pill, { backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1 }]}>
                  <Text style={[premiumStyles.pillText, { color: colors.textPrimary }]}>Vegan</Text>
                </View>
              </View>
            </Animated.View>
          </View>
        )}

        {/* ───────────────── SCREEN 3: Vault Scene ───────────────── */}
        {slideIndex === 2 && (
          <View style={premiumStyles.vaultScene}>
            <Animated.View
              style={[
                premiumStyles.glow,
                {
                  backgroundColor: colors.primaryAccent,
                  transform: [{ scale: pulseScale }],
                  opacity: pulseOpacity,
                  width: 200,
                  height: 200,
                  borderRadius: 100,
                },
              ]}
            />

            <View
              style={[
                premiumStyles.vaultOuterRing,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                },
              ]}
            >
              <Animated.View
                style={[
                  premiumStyles.vaultInnerRing,
                  {
                    borderColor: colors.primaryAccent,
                    transform: [{ scale: pulseScale }],
                  },
                ]}
              >
                <Ionicons name="shield-checkmark" size={54} color={colors.primaryAccent} />
              </Animated.View>
            </View>

            <Animated.View
              style={[
                premiumStyles.floatingElement,
                { backgroundColor: colors.surface, borderColor: colors.border, top: 10, right: 30, transform: [{ translateY: floatY }] },
              ]}
            >
               <Ionicons name="bookmark" size={20} color={colors.textSecondary} />
            </Animated.View>

            <Animated.View
              style={[
                premiumStyles.floatingElement,
                { backgroundColor: colors.surface, borderColor: colors.border, bottom: 20, left: 20, transform: [{ translateY: Animated.multiply(floatY as any, -1) }] },
              ]}
            >
               <Ionicons name="heart" size={20} color={colors.primaryAccent} />
            </Animated.View>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={["top", "bottom"]}>
      {/* ── TOP NAV ─────────────────────────────────────── */}
      <View style={styles.nav}>
        <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
          <Animated.View
            style={[styles.progressFill, { width: progressWidth, backgroundColor: colors.primaryAccent }]}
          />
        </View>

        {activeStep < slides.length - 1 && (
          <TouchableOpacity
            onPress={handleComplete}
            activeOpacity={0.6}
            style={styles.skipBtn}
          >
            <Text style={[styles.skipLabel, { color: colors.textSecondary }]}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── SWIPEABLE SLIDES ───────────────────────────── */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumScrollEnd}
        scrollEventThrottle={16}
        style={styles.pager}
        decelerationRate="fast"
      >
        {slides.map((slide, index) => (
          <View key={index} style={styles.page}>
            <View style={styles.illustrationArea}>
              {renderOnboardingArt(index)}
            </View>

            <View style={styles.content}>
              <View style={[styles.labelPill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.labelText, { color: colors.primaryAccent }]}>{slide.label}</Text>
              </View>
              <Text style={[styles.title, { color: colors.textPrimary }]}>{slide.title}</Text>
              <Text style={[styles.body, { color: colors.textSecondary }]}>{slide.body}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* ── FOOTER ─────────────────────────────────────── */}
      <View
        style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}
      >
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => jumpTo(i)}
              activeOpacity={0.6}
            >
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: i === activeStep ? colors.primaryAccent : colors.border,
                    width: i === activeStep ? 32 : 8,
                    opacity: i === activeStep ? 1 : 0.2,
                  },
                ]}
              />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          onPress={handleNext}
          activeOpacity={0.9}
          style={[styles.nextBtn, { backgroundColor: colors.primaryAccent }]}
        >
          <Text style={[styles.nextBtnLabel, { color: colors.background }]}>
            {activeStep === slides.length - 1 ? "Get Started" : "Continue"}
          </Text>
          <Ionicons name="arrow-forward" size={16} color={colors.background} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const premiumStyles = StyleSheet.create({
  container: {
    width: 280,
    height: 280,
    justifyContent: "center",
    alignItems: "center",
  },
  glow: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
  },
  premiumCard: {
    width: 180,
    height: 220,
    borderRadius: 30,
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  skeletonLine: {
    height: 6,
    borderRadius: 3,
    marginBottom: 8,
  },
  flexRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    width: "100%",
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  pillText: {
    fontSize: 12,
    fontWeight: "600",
  },
  
  // SCAN SCENE
  scanScene: {
    width: 260,
    height: 260,
    justifyContent: "center",
    alignItems: "center",
  },
  scannerGlass: {
    position: "absolute",
    width: 200,
    height: 60,
    borderRadius: 20,
    borderWidth: 1.5,
    overflow: "hidden",
  },
  scannerLaser: {
    width: "100%",
    height: 2,
    position: "absolute",
    top: "50%",
  },

  // CARDS SCENE
  cardsScene: {
    width: 260,
    height: 260,
    justifyContent: "center",
    alignItems: "center",
  },
  stackCardBack: {
    position: "absolute",
    width: 160,
    height: 200,
    borderRadius: 28,
    borderWidth: 1,
    transform: [{ rotate: "-8deg" }, { translateX: -15 }],
  },
  stackCardMiddle: {
    position: "absolute",
    width: 170,
    height: 210,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  // VAULT SCENE
  vaultScene: {
    width: 260,
    height: 260,
    justifyContent: "center",
    alignItems: "center",
  },
  vaultOuterRing: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  vaultInnerRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  floatingElement: {
    position: "absolute",
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 6,
  },
});

const styles = StyleSheet.create({
  // Base Monochrome Foundation
  root: {
    flex: 1,
  },

  // Navigation Progress Track
  nav: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 12,
    gap: 16,
  },
  progressTrack: {
    flex: 1,
    height: 2,
    borderRadius: 1,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 1,
  },
  skipBtn: {
    paddingVertical: 4,
    paddingLeft: 8,
  },
  skipLabel: {
    fontSize: 15,
    fontWeight: "700",
  },

  // Scroller Layout
  pager: {
    flex: 1,
  },
  page: {
    width,
    flex: 1,
  },

  // Studio-Level Illustration Canvas Layouts
  illustrationArea: {
    flex: 1.2,
    justifyContent: "center",
    alignItems: "center",
  },

  // Typography Content Area
  content: {
    paddingHorizontal: 32,
    paddingBottom: 24,
    gap: 16,
  },
  labelPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 4,
  },
  labelText: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 36,
    fontWeight: "900",
    letterSpacing: -1,
    lineHeight: 42,
  },
  body: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: "500",
    maxWidth: 340,
    opacity: 0.9,
  },

  // Action Footer Elements
  footer: {
    paddingHorizontal: 32,
    paddingTop: 16,
    gap: 20,
  },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  nextBtn: {
    height: 60,
    borderRadius: 30,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  nextBtnLabel: {
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
});
