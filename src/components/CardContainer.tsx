import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useSelector } from 'react-redux';
import { LinearGradient } from 'expo-linear-gradient';

import { RootState } from '@/store';
import { ThemeColors } from '@/theme/colors';

interface CardContainerProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  gradient?: readonly [string, string, ...string[]];
}

export const CardContainer: React.FC<CardContainerProps> = ({ children, style, gradient }) => {
  const mode = useSelector((state: RootState) => state.theme.mode);
  const colors = ThemeColors[mode];

  const cardStyles = [
    styles.card,
    !gradient && { backgroundColor: colors.surface },
    { borderColor: colors.border },
    colors.cardShadow,
    style,
  ];

  if (gradient) {
    return (
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={cardStyles as any}
      >
        {children}
      </LinearGradient>
    );
  }

  return (
    <View style={cardStyles as any}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginVertical: 8,
  },
});
