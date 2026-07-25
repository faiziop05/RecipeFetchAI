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
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useSelector, useDispatch } from "react-redux";
import { useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from 'expo-linear-gradient';

import { safeSetItem } from "@/services/storage";
import { RootState } from "@/store";
import { ThemeColors, ThemeGradients } from "@/theme/colors";
import { completeOnboarding } from "@/store/onboardingSlice";
import { OnboardingStep } from "@/components/OnboardingStep";

const { width } = Dimensions.get("window");

interface Slide {
  label: string;
  title: string;
  body: string;
}

const slides: Slide[] = [
  {
    label: "01 / 03",
    title: "Turn videos into real recipes.",
    body: "Paste a TikTok or YouTube link, and we will extract the exact ingredients and steps for you.",
  },
  {
    label: "02 / 03",
    title: "Cook with what you have.",
    body: "Tell us what is in your kitchen, and we will suggest meals you can make right now.",
  },
  {
    label: "03 / 03",
    title: "Your weekly food hub.",
    body: "Plan your week, save your favorite meals, and create your own recipes all in one place.",
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const mode = useSelector((state: RootState) => state.theme.mode);
  const colors = ThemeColors[mode];

  const [activeStep, setActiveStep] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const progressAnim = useRef(new Animated.Value(1 / slides.length)).current;

  // micro-animations
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
                  backgroundColor: mode === 'dark' ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.8)",
                  borderColor: colors.border,
                  transform: [{ translateY: floatY }],
                  overflow: 'hidden',
                },
              ]}
            >
              <Ionicons name="link" size={64} color={colors.textPrimary} />
              <View style={[premiumStyles.skeletonLine, { backgroundColor: colors.border, width: 80, marginTop: 16 }]} />
              <View style={[premiumStyles.skeletonLine, { backgroundColor: colors.border, width: 60 }]} />
            </Animated.View>

            {/* Scanner Glass */}
            <Animated.View
              style={[
                premiumStyles.scannerGlass,
                {
                  borderColor: colors.primaryAccent,
                  backgroundColor: "rgba(45, 212, 191, 0.1)",
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
                  backgroundColor: colors.successGreen,
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
                  backgroundColor: colors.surface,
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
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  transform: [{ translateY: Animated.multiply(floatY as any, 0.5) }, { rotate: "5deg" }, { translateX: 10 }],
                },
              ]}
            >
              <Ionicons name="nutrition-outline" size={40} color={colors.textSecondary} style={{ opacity: 0.5 }} />
            </Animated.View>

            {/* Front Card */}
            <Animated.View
              style={[
                premiumStyles.premiumCard,
                {
                  backgroundColor: mode === 'dark' ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.8)",
                  borderColor: colors.border,
                  padding: 24,
                  transform: [{ translateY: floatY }],
                  overflow: 'hidden',
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
                <View style={[premiumStyles.pill, { backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1 }]}>
                  <Text style={[premiumStyles.pillText, { color: colors.textPrimary }]}>Chicken</Text>
                </View>
                <View style={[premiumStyles.pill, { backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1 }]}>
                  <Text style={[premiumStyles.pillText, { color: colors.textPrimary }]}>Rice</Text>
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
                <Ionicons name="calendar-outline" size={54} color={colors.primaryAccent} />
              </Animated.View>
            </View>

            <Animated.View
              style={[
                premiumStyles.floatingElement,
                { borderColor: colors.border, top: 10, right: 30, transform: [{ translateY: floatY }], overflow: 'hidden' },
              ]}
            >
               <Ionicons name="bookmark" size={20} color={colors.textSecondary} />
            </Animated.View>

            <Animated.View
              style={[
                premiumStyles.floatingElement,
                { borderColor: colors.border, bottom: 20, left: 20, transform: [{ translateY: Animated.multiply(floatY as any, -1) }], overflow: 'hidden' },
              ]}
            >
               <Ionicons name="heart" size={20} color={colors.successGreen} />
            </Animated.View>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: "transparent" }]} edges={["top", "bottom"]}>
      {/* ── TOP NAV ─────────────────────────────────────── */}
      <View style={styles.nav}>
        <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
          <Animated.View
            style={[styles.progressFill, { width: progressWidth, backgroundColor: colors.textPrimary }]}
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
          <OnboardingStep
            key={index}
            slide={slide}
            artElement={renderOnboardingArt(index)}
            colors={colors}
          />
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
                    backgroundColor: i === activeStep ? colors.textPrimary : colors.border,
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
        >
          <LinearGradient
            colors={ThemeGradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.nextBtn}
          >
            <Text style={[styles.nextBtnLabel, { color: '#FFFFFF' }]}>
              {activeStep === slides.length - 1 ? "Get Started" : "Next"}
            </Text>
            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
          </LinearGradient>
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
    // Remove shadow for frosted glass, relies on BlurView
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
  },
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
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
  pager: {
    flex: 1,
  },
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
    width: '100%',
  },
  nextBtnLabel: {
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
});
