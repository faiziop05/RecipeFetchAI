import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TextInputProps } from 'react-native';

interface ManualInputFieldProps extends TextInputProps {
  label: string;
  colors: any;
  error?: string;
}

export const ManualInputField: React.FC<ManualInputFieldProps> = ({
  label,
  colors,
  error,
  style,
  onFocus,
  onBlur,
  ...rest
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <TextInput
        style={[
          styles.textInput,
          {
            backgroundColor: colors.surface,
            borderColor: error ? '#EF4444' : isFocused ? colors.primaryAccent : colors.border,
            color: colors.textPrimary,
          },
          style,
        ]}
        placeholderTextColor={colors.textSecondary}
        onFocus={(e) => {
          setIsFocused(true);
          if (onFocus) onFocus(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          if (onBlur) onBlur(e);
        }}
        {...rest}
      />
      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 7,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 16,
  },
  textInput: {
    width: '100%',
    height: 52,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    fontWeight: '600',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
    paddingLeft: 4,
    fontWeight: '500',
  },
});
