import { StyleSheet } from 'react-native';

export const ThemeColors = {
  light: {
    background: '#FAF8F5',
    surface: '#FFFFFF',
    textPrimary: '#1C1917',
    textSecondary: '#6E6A66',
    primaryAccent: '#3B82F6', // Fresh Electric Blue
    successGreen: '#10B981',
    border: '#E2E8F0', // Light gray border
    cardShadow: {
      borderWidth: 0.5,
      borderColor: '#E2E8F0',
      shadowColor: 'transparent',
      elevation: 0,
    }
  },
  dark: {
    background: '#0F172A',      // Fresh slate/ocean dark
    surface: 'rgba(255, 255, 255, 0.08)',       // Glassy transparent card
    textPrimary: '#FFFFFF',     // Pure white main titles
    textSecondary: '#94A3B8',   // Soft light gray descriptions
    primaryAccent: '#60A5FA',   // Fresh light blue base
    successGreen: '#34D399',    // Emerald green
    border: 'rgba(96, 165, 250, 0.2)', // Electric blue tinted border
    cardShadow: {
      borderWidth: 0.5,
      borderColor: 'rgba(96, 165, 250, 0.3)',
      shadowColor: 'transparent',
      elevation: 0,
    }
  }
};

export const ThemeGradients = {
  primary: ['#60A5FA', '#2563EB'] as const, 
  bgDarkShift1: ['#0F172A', '#1E3A8A', '#0F172A', '#020617'] as const, // Fresh Ocean
  bgDarkShift2: ['#020617', '#0F172A', '#1D4ED8', '#0F172A'] as const,
  
  cardYellow: ['#FDE047', '#F59E0B'] as const,
  cardGreen: ['#86EFAC', '#10B981'] as const,
  cardPurple: ['#D8B4FE', '#8B5CF6'] as const,
  cardBlue: ['#93C5FD', '#3B82F6'] as const,
  cardPink: ['#F9A8D4', '#EC4899'] as const,
  cardOrange: ['#FDBA74', '#EA580C'] as const,
  cardCyan: ['#67E8F9', '#06B6D4'] as const,
};
