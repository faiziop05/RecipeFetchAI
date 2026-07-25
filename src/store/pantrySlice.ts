import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface PantryState {
  ingredients: string[];
  recentMatches: any[];
}

const initialState: PantryState = {
  ingredients: [],
  recentMatches: [],
};

export const pantrySlice = createSlice({
  name: "pantry",
  initialState,
  reducers: {
    setPantry: (state, action: PayloadAction<string[]>) => {
      state.ingredients = action.payload;
    },
    addIngredient: (state, action: PayloadAction<string>) => {
      const ingredient = action.payload.trim().toLowerCase();
      if (ingredient && !state.ingredients.includes(ingredient)) {
        state.ingredients.push(ingredient);
      }
    },
    removeIngredient: (state, action: PayloadAction<string>) => {
      const target = action.payload.toLowerCase();
      state.ingredients = state.ingredients.filter((i) => i.toLowerCase() !== target);
    },
    clearPantry: (state) => {
      state.ingredients = [];
    },
    setRecentMatches: (state, action: PayloadAction<any[]>) => {
      state.recentMatches = action.payload;
    },
    clearRecentMatches: (state) => {
      state.recentMatches = [];
    },
  },
});

export const {
  setPantry,
  addIngredient,
  removeIngredient,
  clearPantry,
  setRecentMatches,
  clearRecentMatches,
} = pantrySlice.actions;

export default pantrySlice.reducer;
