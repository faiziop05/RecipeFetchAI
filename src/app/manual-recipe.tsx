import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TextInput, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { addDoc, collection } from 'firebase/firestore';
import { useNetInfo } from '@react-native-community/netinfo';

import { RootState } from '@/store';
import { ThemeColors } from '@/theme/colors';
import { ActionButton } from '@/components/ActionButton';
import { CustomAlert } from '@/components/CustomAlert';
import { db } from '@/services/firebase';
import { extractRecipe } from '@/services/gemini';
import { setActiveRecipe } from '@/store/recipeSlice';
import { incrementFreeScan, checkMonthRollover } from '@/store/subscriptionSlice';

export default function ManualRecipeScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const netInfo = useNetInfo();

  const mode = useSelector((state: RootState) => state.theme.mode);
  const colors = ThemeColors[mode];
  const userId = useSelector((state: RootState) => state.auth.uid);
  const isPremium = useSelector((state: RootState) => state.subscription.isPremium);
  const freeScansUsed = useSelector((state: RootState) => state.subscription.freeScansUsed);
  const currentMonth = useSelector((state: RootState) => state.subscription.currentMonth);

  // Form State Fields Upfront
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [prepTime, setPrepTime] = useState('');
  const [cookTime, setCookTime] = useState('');
  const [servings, setServings] = useState('');
  const [category, setCategory] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [instructions, setInstructions] = useState('');

  // UI Processing State
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Custom Alert state config
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type?: 'info' | 'success' | 'error' | 'confirm';
    buttons?: Array<{ text: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive' }>;
  }>({ visible: false, title: '', message: '' });

  const showAlert = (
    title: string,
    message: string,
    type: 'info' | 'success' | 'error' | 'confirm' = 'info',
    buttons?: Array<{ text: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive' }>
  ) => {
    setAlertConfig({ visible: true, title, message, type, buttons });
  };

  const handleFormatRecipe = async () => {
    // 1. Validation Checks
    if (!title.trim()) {
      showAlert("Missing Details", "Please provide a recipe name/title upfront.", "info");
      return;
    }
    if (!ingredients.trim()) {
      showAlert("Missing Details", "Please enter the raw list of ingredients.", "info");
      return;
    }
    if (!instructions.trim()) {
      showAlert("Missing Details", "Please enter the cooking steps or instructions.", "info");
      return;
    }

    if (netInfo.isConnected === false) {
      showAlert(
        "No Connection",
        "You need an active internet connection to let AI format and analyze this recipe.",
        "error"
      );
      return;
    }

    // 2. Paywall check for non-premium users
    if (!isPremium) {
      const today = new Date();
      const currentMonthStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}`;
      let effectiveScans = freeScansUsed;
      if (currentMonth !== currentMonthStr) {
        effectiveScans = 0;
        dispatch(checkMonthRollover());
      }
      
      if (effectiveScans >= 3) {
        router.push('/paywall');
        return;
      }
    }

    // 3. Initiate AI Formatting Cascades
    setLoading(true);
    setLoadingStep("Sorting recipe details...");

    setTimeout(() => {
      setLoadingStep("Correcting formatting...");
    }, 1200);

    setTimeout(() => {
      setLoadingStep("Calculating USDA nutrition profiles...");
    }, 2400);

    try {
      // Assemble structured input to feed Gemini
      const rawPayload = 
        `[Manual Recipe Entry details entered by User]\n` +
        `Recipe Title: ${title.trim()}\n` +
        `Description/Notes: ${description.trim() || "A customized home-cooked recipe"}\n` +
        `Prep Time: ${prepTime.trim() || "N/A"}\n` +
        `Cook Time: ${cookTime.trim() || "N/A"}\n` +
        `Servings: ${servings.trim() || "N/A"}\n` +
        `Category/Tags: ${category.trim() || "Home Cooking"}\n\n` +
        `[Raw Ingredients List entered by User]:\n${ingredients.trim()}\n\n` +
        `[Raw Instructions/Cooking Steps entered by User]:\n${instructions.trim()}`;

      const parsedRecipe = await extractRecipe(rawPayload);

      let savedRecipeId: string | undefined = undefined;

      // 4. Auto-save formatted recipe to Firestore
      if (userId) {
        try {
          const scannedRef = collection(db, `users/${userId}/scanned_recipes`);
          const docRef = await addDoc(scannedRef, {
            ...parsedRecipe,
            isPinned: false,
            scannedAt: new Date().toISOString(),
            isManualEntry: true, // Flag manual entry
          });
          savedRecipeId = docRef.id;
        } catch (saveErr) {
          console.warn("[Manual] Failed to auto-save to Firestore scanned_recipes:", saveErr);
        }
      }

      // 5. Update state and route user to the recipe details view
      dispatch(
        setActiveRecipe({
          ...parsedRecipe,
          id: savedRecipeId,
          isPinned: false,
        })
      );

      // Reset Form fields
      setTitle('');
      setDescription('');
      setPrepTime('');
      setCookTime('');
      setServings('');
      setCategory('');
      setIngredients('');
      setInstructions('');

      // Increment free scans if free tier
      if (!isPremium) {
        dispatch(incrementFreeScan());
      }

      router.replace('/recipe-display');
    } catch (err: any) {
      console.warn("[Manual] Recipe formatting failed:", err);
      showAlert(
        "AI Formatting Failed", 
        err?.message || "Gemini was unable to parse and correct the formatting. Please check the wording and try again.", 
        "error"
      );
    } finally {
      setLoading(false);
      setLoadingStep("");
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Premium Top Navigation Bar */}
      <View style={[styles.headerBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Manual Creation</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={[styles.scroll, { backgroundColor: colors.background }]}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Copy */}
          <Text style={[styles.hintTitle, { color: colors.textSecondary }]}>
            ENTER DETAILS UPFRONT
          </Text>
          <Text style={[styles.hintSubtitle, { color: colors.textSecondary }]}>
            Type ingredients and instructions however you want. Gemini AI will sort them, correct spelling, format quantities, and calculate USDA nutrition metrics automatically.
          </Text>

          {/* Form Fields */}
          <View style={styles.form}>
            {/* Title */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>Recipe Title *</Text>
            <TextInput
              style={[
                styles.textInput,
                { 
                  backgroundColor: colors.surface,
                  borderColor: focusedField === 'title' ? colors.primaryAccent : colors.border,
                  color: colors.textPrimary 
                }
              ]}
              placeholder="e.g. Grandma's Famous Lasagna"
              placeholderTextColor={colors.textSecondary}
              value={title}
              onChangeText={setTitle}
              onFocus={() => setFocusedField('title')}
              onBlur={() => setFocusedField(null)}
            />

            {/* Description */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>Description / Notes</Text>
            <TextInput
              style={[
                styles.textInput,
                styles.textArea,
                { 
                  backgroundColor: colors.surface,
                  borderColor: focusedField === 'desc' ? colors.primaryAccent : colors.border,
                  color: colors.textPrimary 
                }
              ]}
              placeholder="A short note about the recipe..."
              placeholderTextColor={colors.textSecondary}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              onFocus={() => setFocusedField('desc')}
              onBlur={() => setFocusedField(null)}
            />

            {/* Row: Prep & Cook Time */}
            <View style={styles.row}>
              <View style={styles.flexItem}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Prep Time</Text>
                <TextInput
                  style={[
                    styles.textInput,
                    { 
                      backgroundColor: colors.surface,
                      borderColor: focusedField === 'prep' ? colors.primaryAccent : colors.border,
                      color: colors.textPrimary 
                    }
                  ]}
                  placeholder="e.g. 15 mins"
                  placeholderTextColor={colors.textSecondary}
                  value={prepTime}
                  onChangeText={setPrepTime}
                  onFocus={() => setFocusedField('prep')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
              <View style={styles.flexItem}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Cook Time</Text>
                <TextInput
                  style={[
                    styles.textInput,
                    { 
                      backgroundColor: colors.surface,
                      borderColor: focusedField === 'cook' ? colors.primaryAccent : colors.border,
                      color: colors.textPrimary 
                    }
                  ]}
                  placeholder="e.g. 45 mins"
                  placeholderTextColor={colors.textSecondary}
                  value={cookTime}
                  onChangeText={setCookTime}
                  onFocus={() => setFocusedField('cook')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>

            {/* Row: Servings & Category */}
            <View style={styles.row}>
              <View style={styles.flexItem}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Servings</Text>
                <TextInput
                  style={[
                    styles.textInput,
                    { 
                      backgroundColor: colors.surface,
                      borderColor: focusedField === 'servings' ? colors.primaryAccent : colors.border,
                      color: colors.textPrimary 
                    }
                  ]}
                  placeholder="e.g. 4 servings"
                  placeholderTextColor={colors.textSecondary}
                  value={servings}
                  onChangeText={setServings}
                  onFocus={() => setFocusedField('servings')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
              <View style={styles.flexItem}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Category</Text>
                <TextInput
                  style={[
                    styles.textInput,
                    { 
                      backgroundColor: colors.surface,
                      borderColor: focusedField === 'category' ? colors.primaryAccent : colors.border,
                      color: colors.textPrimary 
                    }
                  ]}
                  placeholder="e.g. Dinner, Italian"
                  placeholderTextColor={colors.textSecondary}
                  value={category}
                  onChangeText={setCategory}
                  onFocus={() => setFocusedField('category')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>

            {/* Ingredients multiline */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>Raw Ingredients List *</Text>
            <TextInput
              style={[
                styles.textInput,
                styles.ingredientsArea,
                { 
                  backgroundColor: colors.surface,
                  borderColor: focusedField === 'ingredients' ? colors.primaryAccent : colors.border,
                  color: colors.textPrimary 
                }
              ]}
              placeholder={"Enter ingredients (any format):\ne.g.\n- 2 cups white flour\n- 3 large eggs\n- a pinch of salt\n- 1/2 stick unsalted butter"}
              placeholderTextColor={colors.textSecondary}
              value={ingredients}
              onChangeText={setIngredients}
              multiline
              textAlignVertical="top"
              onFocus={() => setFocusedField('ingredients')}
              onBlur={() => setFocusedField(null)}
            />

            {/* Instructions multiline */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>Raw Cooking Steps *</Text>
            <TextInput
              style={[
                styles.textInput,
                styles.instructionsArea,
                { 
                  backgroundColor: colors.surface,
                  borderColor: focusedField === 'instructions' ? colors.primaryAccent : colors.border,
                  color: colors.textPrimary 
                }
              ]}
              placeholder={"Enter cooking steps (any format):\ne.g.\n1. Mix flour and salt in a bowl.\n2. Beat the eggs and whisk them in.\n3. Bake in a preheated oven at 350F for 30 minutes."}
              placeholderTextColor={colors.textSecondary}
              value={instructions}
              onChangeText={setInstructions}
              multiline
              textAlignVertical="top"
              onFocus={() => setFocusedField('instructions')}
              onBlur={() => setFocusedField(null)}
            />

            {/* AI Action Submit Button */}
            <ActionButton
              title="Format with AI"
              onPress={handleFormatRecipe}
              style={styles.submitBtn}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Loading Modal Overlay */}
      {loading && (
        <View style={styles.overlayBackground}>
          <View style={[styles.overlayContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <ActivityIndicator size="large" color={colors.primaryAccent} />
            <Text style={[styles.overlayTitle, { color: colors.textPrimary }]}>Culinary Genius at Work</Text>
            <Text style={[styles.overlayStep, { color: colors.textSecondary }]}>{loadingStep}</Text>
          </View>
        </View>
      )}

      {/* Custom Alerts */}
      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        buttons={alertConfig.buttons}
        onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  hintTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  hintSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    marginBottom: 24,
  },
  form: {
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
  textArea: {
    height: 80,
    paddingTop: 12,
    paddingBottom: 12,
    textAlignVertical: 'top',
  },
  ingredientsArea: {
    height: 160,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 14,
    lineHeight: 20,
  },
  instructionsArea: {
    height: 220,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 14,
    lineHeight: 20,
  },
  row: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
  },
  flexItem: {
    flex: 1,
  },
  submitBtn: {
    marginTop: 32,
    height: 56,
  },
  overlayBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  overlayContent: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    width: '75%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  overlayTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 16,
    letterSpacing: -0.5,
  },
  overlayStep: {
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
  },
});
