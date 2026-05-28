import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { ThemeColors } from '@/theme/colors';

interface ActionButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  style?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
}

export const ActionButton: React.FC<ActionButtonProps> = ({
  title,
  onPress,
  loading = false,
  variant = 'primary',
  style,
  textStyle,
  disabled = false,
}) => {
  const mode = useSelector((state: RootState) => state.theme.mode);
  const colors = ThemeColors[mode];

  const getButtonStyles = (): ViewStyle => {
    switch (variant) {
      case 'secondary':
        return {
          backgroundColor: mode === 'light' ? '#F2F2F7' : '#1C1C1E',
          borderWidth: 0,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: colors.border,
        };
      case 'danger':
        return {
          backgroundColor: '#FF3B30', // Minimal system red warning
          borderWidth: 0,
        };
      case 'primary':
      default:
        return {
          backgroundColor: colors.primaryAccent,
          borderWidth: 0,
        };
    }
  };

  const getTextStyle = (): TextStyle => {
    switch (variant) {
      case 'secondary':
        return {
          color: colors.textPrimary,
        };
      case 'outline':
        return {
          color: colors.textPrimary,
        };
      case 'danger':
        return {
          color: '#FFFFFF',
        };
      case 'primary':
      default:
        return {
          color: mode === 'light' ? '#FFFFFF' : '#000000',
        };
    }
  };

  const activeOpacity = disabled || loading ? 0.7 : 0.2;

  return (
    <TouchableOpacity
      activeOpacity={activeOpacity}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        getButtonStyles(),
        disabled && { opacity: 0.5 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' && mode === 'light' ? colors.primaryAccent : '#FFFFFF'} size="small" />
      ) : (
        <Text style={[styles.text, getTextStyle(), textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    flexDirection: 'row',
    marginVertical: 8,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
