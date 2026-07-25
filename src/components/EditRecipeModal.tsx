import React from "react";
import { Modal, View, Text, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform, StyleSheet } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { ActionButton } from "@/components/ActionButton";

interface Ingredient {
  name: string;
  amount: string;
  description?: string;
}

interface EditRecipeModalProps {
  isVisible: boolean;
  onClose: () => void;
  editedIngredients: Ingredient[];
  editedInstructions: string[];
  setEditedIngredients: React.Dispatch<React.SetStateAction<Ingredient[]>>;
  setEditedInstructions: React.Dispatch<React.SetStateAction<string[]>>;
  onSave: () => void;
  isSaveLoading: boolean;
  colors: any;
  mode: string;
}

export const EditRecipeModal: React.FC<EditRecipeModalProps> = ({
  isVisible,
  onClose,
  editedIngredients,
  editedInstructions,
  setEditedIngredients,
  setEditedInstructions,
  onSave,
  isSaveLoading,
  colors,
  mode,
}) => {
  const handleAddIngredientRow = () => {
    setEditedIngredients((prev) => [...prev, { name: "", amount: "", description: "" }]);
  };

  const handleRemoveIngredientRow = (index: number) => {
    setEditedIngredients((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleIngredientFieldChange = (index: number, field: keyof Ingredient, value: string) => {
    setEditedIngredients((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleAddInstructionRow = () => {
    setEditedInstructions((prev) => [...prev, ""]);
  };

  const handleRemoveInstructionRow = (index: number) => {
    setEditedInstructions((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleInstructionFieldChange = (index: number, value: string) => {
    setEditedInstructions((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  return (
    <Modal visible={isVisible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={[
            styles.modalContent, 
            { backgroundColor: colors.background, height: "85%", paddingBottom: 40 }
          ]}
        >
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <View>
              <Text style={[styles.modalHeaderTitle, { color: colors.textPrimary }]}>Edit Recipe</Text>
              <Text style={[styles.modalSubHeaderTitle, { color: colors.textSecondary }]}>
                Modify ingredients and cooking steps manually
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeModalBtn}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Scrollable Form */}
          <ScrollView
            style={styles.editorScrollView}
            contentContainerStyle={styles.editorScrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Ingredients section title */}
            <View style={{ marginBottom: 12 }}>
              <Text style={[styles.editorSectionTitle, { color: colors.textPrimary }]}>Ingredients</Text>
            </View>

            {editedIngredients.map((item, index) => (
              <View
                key={index}
                style={[
                  styles.editorRowCard,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.background,
                  },
                ]}
              >
                {/* Inputs Section */}
                <View style={styles.editorInputsContainer}>
                  {/* Ingredient Name */}
                  <View style={styles.editorInputGroup}>
                    <Text style={[styles.editorLabel, { color: colors.textSecondary }]}>Name</Text>
                    <TextInput
                      style={[
                        styles.editorInput,
                        {
                          color: colors.textPrimary,
                          borderColor: colors.border,
                          backgroundColor: colors.surface,
                        },
                      ]}
                      placeholder="e.g. Boneless Chicken Breast"
                      placeholderTextColor={colors.textSecondary}
                      value={item.name}
                      onChangeText={(val) => handleIngredientFieldChange(index, "name", val)}
                    />
                  </View>

                  {/* Flex Row for Amount & Description */}
                  <View style={styles.editorFlexRow}>
                    {/* Amount */}
                    <View style={[styles.editorInputGroup, { flex: 1 }]}>
                      <Text style={[styles.editorLabel, { color: colors.textSecondary }]}>Amount</Text>
                      <TextInput
                        style={[
                          styles.editorInput,
                          {
                            color: colors.textPrimary,
                            borderColor: colors.border,
                            backgroundColor: colors.surface,
                          },
                        ]}
                        placeholder="e.g. 500g"
                        placeholderTextColor={colors.textSecondary}
                        value={item.amount}
                        onChangeText={(val) => handleIngredientFieldChange(index, "amount", val)}
                      />
                    </View>

                    {/* Notes/Description */}
                    <View style={[styles.editorInputGroup, { flex: 2 }]}>
                      <Text style={[styles.editorLabel, { color: colors.textSecondary }]}>Notes</Text>
                      <TextInput
                        style={[
                          styles.editorInput,
                          {
                            color: colors.textPrimary,
                            borderColor: colors.border,
                            backgroundColor: colors.surface,
                          },
                        ]}
                        placeholder="e.g. cubed, skinless"
                        placeholderTextColor={colors.textSecondary}
                        value={item.description || ""}
                        onChangeText={(val) => handleIngredientFieldChange(index, "description", val)}
                      />
                    </View>
                  </View>
                </View>

                {/* Remove Button */}
                <TouchableOpacity
                  style={[styles.editorDeleteBtn, { borderColor: colors.border }]}
                  onPress={() => handleRemoveIngredientRow(index)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))}

            {/* Add Row Button */}
            <TouchableOpacity
              style={[styles.editorAddBtn, { borderColor: colors.primaryAccent }]}
              onPress={handleAddIngredientRow}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={20} color={colors.primaryAccent} />
              <Text style={[styles.editorAddBtnText, { color: colors.primaryAccent }]}>Add Ingredient</Text>
            </TouchableOpacity>

            {/* Instructions Section Header */}
            <View style={[styles.editorSectionHeader, { borderTopColor: colors.border }]}>
              <Text style={[styles.editorSectionTitle, { color: colors.textPrimary }]}>Instructions / Steps</Text>
            </View>

            {/* Instructions List */}
            {editedInstructions.map((item, index) => (
              <View
                key={index}
                style={[
                  styles.editorInstructionCard,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.background,
                  },
                ]}
              >
                <View style={styles.editorInstructionHeader}>
                  <Text style={[styles.editorInstructionNumber, { color: colors.primaryAccent }]}>Step {index + 1}</Text>
                  <TouchableOpacity
                    onPress={() => handleRemoveInstructionRow(index)}
                    activeOpacity={0.7}
                    style={styles.editorInstructionDeleteBtn}
                  >
                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={[
                    styles.editorInstructionInput,
                    {
                      color: colors.textPrimary,
                      borderColor: colors.border,
                      backgroundColor: colors.surface,
                    },
                  ]}
                  placeholder={`e.g. Cook for 5 minutes...`}
                  placeholderTextColor={colors.textSecondary}
                  value={item}
                  onChangeText={(val) => handleInstructionFieldChange(index, val)}
                  multiline
                  numberOfLines={3}
                />
              </View>
            ))}

            {/* Add Instruction Step Row Button */}
            <TouchableOpacity
              style={[styles.editorAddBtn, { borderColor: colors.primaryAccent }]}
              onPress={handleAddInstructionRow}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={20} color={colors.primaryAccent} />
              <Text style={[styles.editorAddBtnText, { color: colors.primaryAccent }]}>Add Instruction Step</Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Footer Buttons */}
          <View style={[styles.editorFooter, { borderTopColor: colors.border }]}>
            <ActionButton title="Cancel" variant="outline" onPress={onClose} style={styles.editorFooterBtn} />
            <ActionButton
              title={isSaveLoading ? "Saving..." : "Save Changes"}
              onPress={onSave}
              style={styles.editorFooterBtn}
              disabled={isSaveLoading}
            />
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 18,
    borderBottomWidth: 1,
  },
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  modalSubHeaderTitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeModalBtn: {
    padding: 4,
  },
  editorScrollView: {
    flex: 1,
  },
  editorScrollContent: {
    paddingVertical: 14,
  },
  editorSectionTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  editorRowCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    gap: 10,
  },
  editorInputsContainer: {
    flex: 1,
    gap: 8,
  },
  editorInputGroup: {
    gap: 4,
  },
  editorFlexRow: {
    flexDirection: "row",
    gap: 8,
  },
  editorLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  editorInput: {
    height: 38,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 14,
  },
  editorDeleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  editorAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 8,
    marginBottom: 20,
    gap: 6,
  },
  editorAddBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },
  editorSectionHeader: {
    borderTopWidth: 1,
    marginTop: 20,
    paddingTop: 16,
    marginBottom: 12,
  },
  editorInstructionCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  editorInstructionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  editorInstructionNumber: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  editorInstructionDeleteBtn: {
    padding: 4,
  },
  editorInstructionInput: {
    minHeight: 60,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    textAlignVertical: "top",
  },
  editorFooter: {
    flexDirection: "row",
    borderTopWidth: 1,
    paddingTop: 16,
    gap: 10,
  },
  editorFooterBtn: {
    flex: 1,
    height: 48,
    marginVertical: 0,
  },
});
