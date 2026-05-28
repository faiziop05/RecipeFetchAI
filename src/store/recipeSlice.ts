import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Ingredient {
  name: string;
  amount: string;
  description?: string;
  nutrition?: {
    calories?: string;
    protein?: string;
    carbs?: string;
    fat?: string;
  };
  sourcingAdvantage?: string;
}

export interface RecipePayload {
  id?: string;
  title: string;
  prepTime: string;
  calories: string;
  totalFats: string;
  totalProtein?: string;
  totalCarbs?: string;
  ingredients: Ingredient[];
  instructions: string[];
  isPinned?: boolean;
  scannedAt?: string;
  pinnedAt?: string;
  isManuallyEdited?: boolean;
}

interface RecipeState {
  activeRecipe: RecipePayload | null;
}

const initialState: RecipeState = {
  activeRecipe: null,
};

export const recipeSlice = createSlice({
  name: 'recipe',
  initialState,
  reducers: {
    setActiveRecipe: (state, action: PayloadAction<RecipePayload>) => {
      state.activeRecipe = action.payload;
    },
    clearActiveRecipe: (state) => {
      state.activeRecipe = null;
    },
  },
});

export const { setActiveRecipe, clearActiveRecipe } = recipeSlice.actions;
export default recipeSlice.reducer;
