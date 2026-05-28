import { StyleSheet } from 'react-native';

export const ThemeColors = {
  light: {
    background: '#F2F2F7',      // Soft Apple System Background (eliminates blinding white)
    surface: '#FFFFFF',         // Pure White Cards for elevated contrast
    textPrimary: '#000000',     // Pure Black
    textSecondary: '#6E6E73',   // Sleek iOS Slate Gray for subheadings
    primaryAccent: '#000000',   // High-contrast Pure Black buttons/accents
    successGreen: '#000000',    // Minimal Black checkboxes
    border: '#E5E5EA',          // Apple Light Gray borders
    cardShadow: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 1,
    }
  },
  dark: {
    background: '#0B1120',      // Deep Midnight Navy Background (Revolut/Monzo style)
    surface: '#151E32',         // Elevated Rich Navy Surface
    textPrimary: '#FFFFFF',     // Pure White
    textSecondary: '#94A3B8',   // Crisp Blue-Gray for secondary text
    primaryAccent: '#FFFFFF',   // High-contrast Pure White buttons/accents
    successGreen: '#FFFFFF',    // Minimal White checkboxes
    border: '#233253',          // Soft Navy borders
    cardShadow: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 4,
    }
  }
};
