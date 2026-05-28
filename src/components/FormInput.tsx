import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps, TouchableOpacity } from 'react-native';
import { useSelector } from 'react-redux';
import Ionicons from '@expo/vector-icons/Ionicons';
import { RootState } from '@/store';
import { ThemeColors } from '@/theme/colors';

interface FormInputProps extends TextInputProps {
  label?: string;
  error?: string;
  showPasswordToggle?: boolean;
}

export const FormInput: React.FC<FormInputProps> = ({
  label,
  error,
  style,
  onFocus,
  onBlur,
  secureTextEntry,
  showPasswordToggle,
  ...rest
}) => {
  const mode = useSelector((state: RootState) => state.theme.mode);
  const colors = ThemeColors[mode];
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const handleFocus = (e: any) => {
    setIsFocused(true);
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    if (onBlur) onBlur(e);
  };

  const isSecure = secureTextEntry && !isPasswordVisible;

  return (
    <View style={styles.container}>
      {label && (
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          {label}
        </Text>
      )}
      <View style={[
        styles.inputWrapper,
        {
          backgroundColor: colors.surface,
          borderColor: error
            ? '#EF4444'
            : isFocused
            ? colors.primaryAccent
            : colors.border,
        },
      ]}>
        <TextInput
          style={[
            styles.input,
            { color: colors.textPrimary },
            style,
          ]}
          placeholderTextColor={colors.textSecondary}
          onFocus={handleFocus}
          onBlur={handleBlur}
          secureTextEntry={isSecure}
          {...rest}
        />
        {secureTextEntry && (
          <TouchableOpacity
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            style={styles.eyeBtn}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isPasswordVisible ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        )}
      </View>
      {error ? (
        <Text style={styles.errorText}>
          {error}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    width: '100%',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 7,
    paddingLeft: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 54,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  eyeBtn: {
    padding: 4,
    marginLeft: 8,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 5,
    paddingLeft: 4,
    fontWeight: '500',
  },
});
