import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { ThemeColors } from '@/theme/colors';

interface CardContainerProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const CardContainer: React.FC<CardContainerProps> = ({ children, style }) => {
  const mode = useSelector((state: RootState) => state.theme.mode);
  const colors = ThemeColors[mode];

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
        colors.cardShadow,
        style,
      ]}
    >
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
