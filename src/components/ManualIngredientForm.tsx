import React from 'react';
import { StyleSheet } from 'react-native';
import { ManualInputField } from '@/components/ManualInputField';

interface ManualIngredientFormProps {
  value: string;
  onChangeText: (t: string) => void;
  colors: any;
}

export const ManualIngredientForm: React.FC<ManualIngredientFormProps> = ({
  value,
  onChangeText,
  colors,
}) => {
  return (
    <ManualInputField
      label="Raw Ingredients List *"
      colors={colors}
      style={styles.ingredientsArea}
      placeholder={"Enter ingredients (any format):\ne.g.\n- 2 cups white flour\n- 3 large eggs\n- a pinch of salt\n- 1/2 stick unsalted butter"}
      value={value}
      onChangeText={onChangeText}
      multiline
      textAlignVertical="top"
    />
  );
};

const styles = StyleSheet.create({
  ingredientsArea: {
    height: 160,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 14,
    lineHeight: 20,
  },
});
