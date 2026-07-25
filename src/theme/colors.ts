import { TextStyle } from 'react-native';

// ─── Color Palette ───────────────────────────────────────────────────────────
// A calm, premium palette inspired by companies like Apple, Notion, and Uber Eats.
// No rainbow gradients. Typography-driven hierarchy. Warm and confident.

export const ThemeColors = {
  light: {
    background: '#FAFAF8',          // Warm off-white
    surface: '#FFFFFF',              // Pure white cards
    surfaceSecondary: '#F5F3EF',    // Subtle warm gray for secondary surfaces
    textPrimary: '#1A1A1A',         // Near-black for titles
    textSecondary: '#6B6B6B',       // Medium gray for body/description
    textTertiary: '#9E9E9E',        // Light gray for hints/placeholders
    primaryAccent: '#E8723A',       // Warm amber/coral — the brand color
    primaryAccentLight: '#FFF0E8',  // Very light tint of accent
    primaryAccentMuted: 'rgba(232, 114, 58, 0.12)',
    successGreen: '#2AA05F',        // Muted professional green
    successGreenLight: '#E8F5E9',
    warningAmber: '#E8A317',        // Warm amber warning
    warningAmberLight: '#FFF8E1',
    errorRed: '#D44332',            // Professional red
    errorRedLight: '#FDEAEA',
    border: '#EBEBEB',              // Subtle warm gray border
    borderLight: '#F0F0F0',         // Very faint border for inner dividers
    overlay: 'rgba(0, 0, 0, 0.4)', // Modal overlay
    cardShadow: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
      elevation: 3,
    },
    cardShadowElevated: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 20,
      elevation: 6,
    },
  },
  dark: {
    background: '#0C0F1D',          // Deep navy, not pure black
    surface: '#161B2E',             // Elevated card surface
    surfaceSecondary: '#1C2238',    // Secondary surface
    textPrimary: '#F5F5F5',         // Off-white for titles
    textSecondary: '#8E95A9',       // Muted blue-gray for body
    textTertiary: '#555D73',        // Dim text for hints
    primaryAccent: '#F0905A',       // Slightly lighter coral for dark mode
    primaryAccentLight: 'rgba(240, 144, 90, 0.15)',
    primaryAccentMuted: 'rgba(240, 144, 90, 0.10)',
    successGreen: '#4ADE80',        // Brighter green for dark mode readability
    successGreenLight: 'rgba(74, 222, 128, 0.12)',
    warningAmber: '#FBBF24',
    warningAmberLight: 'rgba(251, 191, 36, 0.12)',
    errorRed: '#F87171',
    errorRedLight: 'rgba(248, 113, 113, 0.12)',
    border: 'rgba(255, 255, 255, 0.08)',   // Subtle white border
    borderLight: 'rgba(255, 255, 255, 0.05)',
    overlay: 'rgba(0, 0, 0, 0.6)',
    cardShadow: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 3,
    },
    cardShadowElevated: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.5,
      shadowRadius: 20,
      elevation: 6,
    },
  },
};

// ─── Gradients ───────────────────────────────────────────────────────────────
// Only subtle, purposeful gradients. No rainbow card packs.

export const ThemeGradients = {
  // Primary brand gradient (used for hero areas, CTAs)
  primary: ['#E8723A', '#D4562A'] as const,
  primarySoft: ['#F0905A', '#E8723A'] as const,

  // Dark mode animated background
  bgDarkShift1: ['#0C0F1D', '#111631', '#0C0F1D', '#080B16'] as const,
  bgDarkShift2: ['#080B16', '#0C0F1D', '#141A30', '#0C0F1D'] as const,

  // Subtle warm tints for feature cards (very muted, not saturated)
  cardWarm: ['#FFF7F2', '#FFF0E8'] as const,     // Warm peach tint (light mode)
  cardCool: ['#F0F4FF', '#E8EEFF'] as const,     // Cool blue tint (light mode)
  cardMint: ['#EDFCF5', '#E0F8EC'] as const,     // Fresh mint tint (light mode)

  // Dark mode card tints
  cardWarmDark: ['rgba(240, 144, 90, 0.08)', 'rgba(240, 144, 90, 0.04)'] as const,
  cardCoolDark: ['rgba(96, 165, 250, 0.08)', 'rgba(96, 165, 250, 0.04)'] as const,
  cardMintDark: ['rgba(74, 222, 128, 0.08)', 'rgba(74, 222, 128, 0.04)'] as const,
};

// ─── Typography Scale ────────────────────────────────────────────────────────
// Consistent type scale used across the app. Reference these instead of ad-hoc sizes.

export const Typography: Record<string, TextStyle> = {
  // Headlines
  heroTitle: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.8,
    lineHeight: 40,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
    lineHeight: 26,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
    lineHeight: 22,
  },

  // Body
  bodyLarge: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
  },
  body: {
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
  },
  bodyMedium: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  bodySmall: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
  },

  // Labels & Captions
  label: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
    lineHeight: 18,
  },
  labelSmall: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
    lineHeight: 14,
  },
  caption: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  overline: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    lineHeight: 14,
  },

  // Interactive
  buttonLarge: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
    lineHeight: 22,
  },
  buttonMedium: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
    lineHeight: 20,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
};

// ─── Spacing Scale ───────────────────────────────────────────────────────────
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  section: 40,
} as const;

// ─── Border Radius ───────────────────────────────────────────────────────────
export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  pill: 999,
} as const;
