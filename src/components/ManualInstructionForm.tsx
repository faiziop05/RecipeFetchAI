import React from 'react';
import { StyleSheet } from 'react-native';
import { ManualInputField } from '@/components/ManualInputField';

interface ManualInstructionFormProps {
  value: string;
  onChangeText: (t: string) => void;
  colors: any;
}

export const ManualInstructionForm: React.FC<ManualInstructionFormProps> = ({
  value,
  onChangeText,
  colors,
}) => {
  return (
    <ManualInputField
      label="Raw Cooking Steps *"
      colors={colors}
      style={styles.instructionsArea}
      placeholder={"Enter cooking steps (any format):\ne.g.\n1. Mix flour and salt in a bowl.\n2. Beat the eggs and whisk them in.\n3. Bake in a preheated oven at 350F for 30 minutes."}
      value={value}
      onChangeText={onChangeText}
      multiline
      textAlignVertical="top"
    />
  );
};

const styles = StyleSheet.create({
  instructionsArea: {
    height: 220,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 14,
    lineHeight: 20,
  },
});
