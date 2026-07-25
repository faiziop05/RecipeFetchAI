import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface MealPlanItem {
  id?: string;
  title: string;
  prepTime: string;
  calories: string;
  ingredients: { name: string; amount: string }[];
  instructions: string[];
  totalProtein?: string;
  totalCarbs?: string;
  totalFats?: string;
}

export interface DailyPlan {
  date: string; // "YYYY-MM-DD"
  dayName: string; // "Monday", "Tuesday", etc.
  meals: {
    breakfast: MealPlanItem | null;
    lunch: MealPlanItem | null;
    dinner: MealPlanItem | null;
  };
}

export interface PlannerState {
  weeklyPlan: DailyPlan[];
  planGeneratedAt: string | null;
}

const initialState: PlannerState = {
  weeklyPlan: [],
  planGeneratedAt: null,
};

export const plannerSlice = createSlice({
  name: "planner",
  initialState,
  reducers: {
    setWeeklyPlan: (state, action: PayloadAction<DailyPlan[]>) => {
      state.weeklyPlan = action.payload;
      state.planGeneratedAt = new Date().toISOString();
    },
    updateSingleMeal: (
      state,
      action: PayloadAction<{
        date: string;
        mealType: "breakfast" | "lunch" | "dinner";
        meal: MealPlanItem | null;
      }>
    ) => {
      const { date, mealType, meal } = action.payload;
      const day = state.weeklyPlan.find((d) => d.date === date);
      if (day) {
        day.meals[mealType] = meal;
      }
    },
    clearPlan: (state) => {
      state.weeklyPlan = [];
      state.planGeneratedAt = null;
    },
  },
});

export const { setWeeklyPlan, updateSingleMeal, clearPlan } = plannerSlice.actions;
export default plannerSlice.reducer;
