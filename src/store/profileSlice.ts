import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface ProfileState {
  dietary: "halal" | "vegetarian" | "vegan" | "none";
  allergies: string[];
  culture: string;
  spicyLevel: number;
  budgetLevel: "low" | "med" | "high";
  cookingSkill: "beginner" | "intermediate" | "advanced";
  healthGoals: string[];
}

const initialState: ProfileState = {
  dietary: "none",
  allergies: [],
  culture: "none",
  spicyLevel: 3,
  budgetLevel: "med",
  cookingSkill: "intermediate",
  healthGoals: [],
};

export const profileSlice = createSlice({
  name: "profile",
  initialState,
  reducers: {
    setProfile: (state, action: PayloadAction<Partial<ProfileState>>) => {
      return { ...state, ...action.payload };
    },
    updateProfileField: <K extends keyof ProfileState>(
      state: ProfileState,
      action: PayloadAction<{ field: K; value: ProfileState[K] }>
    ) => {
      const { field, value } = action.payload;
      state[field] = value;
    },
    clearProfile: () => initialState,
  },
});

export const { setProfile, updateProfileField, clearProfile } = profileSlice.actions;
export default profileSlice.reducer;
