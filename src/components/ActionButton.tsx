import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle, View } from 'react-native';
import { useSelector } from 'react-redux';
import Ionicons from '@expo/vector-icons/Ionicons';
import { RootState } from '@/store';
import { ThemeColors, Typography, Radius, Spacing } from '@/theme/colors';

interface ActionButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'large' | 'medium' | 'small';
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
  style?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
  fullWidth?: boolean;
}

export const ActionButton: React.FC<ActionButtonProps> = ({
  title,
  onPress,
  loading = false,
  variant = 'primary',
  size = 'large',
  icon,
  iconPosition = 'right',
  style,
  textStyle,
  disabled = false,
  fullWidth = true,
}) => {
  const mode = useSelector((state: RootState) => state.theme.mode);
  const colors = ThemeColors[mode];

  const getButtonStyles = (): ViewStyle => {
    switch (variant) {
      case 'secondary':
        return {
          backgroundColor: colors.surfaceSecondary,
          borderWidth: 0,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          borderColor: colors.border,
        };
      case 'danger':
        return {
          backgroundColor: colors.errorRed,
          borderWidth: 0,
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
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

  const getTextColor = (): string => {
    switch (variant) {
      case 'secondary':
        return colors.textPrimary;
      case 'outline':
        return colors.textPrimary;
      case 'danger':
        return '#FFFFFF';
      case 'ghost':
        return colors.primaryAccent;
      case 'primary':
      default:
        return '#FFFFFF';
    }
  };

  const sizeStyles: Record<string, ViewStyle> = {
    large: { height: 52, paddingHorizontal: Spacing.xxl, borderRadius: Radius.lg },
    medium: { height: 44, paddingHorizontal: Spacing.xl, borderRadius: Radius.md },
    small: { height: 36, paddingHorizontal: Spacing.lg, borderRadius: Radius.sm },
  };

  const textColor = getTextColor();
  const iconSize = size === 'small' ? 14 : size === 'medium' ? 16 : 18;
  const typo = size === 'small' ? Typography.chipText : Typography.buttonLarge;

  return (
    <TouchableOpacity
      activeOpacity={disabled || loading ? 0.7 : 0.6}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        sizeStyles[size],
        getButtonStyles(),
        !fullWidth && { alignSelf: 'flex-start' },
        disabled && { opacity: 0.5 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'outline' ? colors.primaryAccent : '#FFFFFF'}
          size="small"
        />
      ) : (
        <View style={styles.content}>
          {icon && iconPosition === 'left' && (
            <Ionicons name={icon} size={iconSize} color={textColor} style={{ marginRight: Spacing.sm }} />
          )}
          <Text style={[typo, { color: textColor }, textStyle]}>{title}</Text>
          {icon && iconPosition === 'right' && (
            <Ionicons name={icon} size={iconSize} color={textColor} style={{ marginLeft: Spacing.sm }} />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
