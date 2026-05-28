import { createSlice } from '@reduxjs/toolkit';

interface OnboardingState {
  hasCompletedOnboarding: boolean;
}

const initialState: OnboardingState = {
  hasCompletedOnboarding: false,
};

export const onboardingSlice = createSlice({
  name: 'onboarding',
  initialState,
  reducers: {
    completeOnboarding: (state) => {
      state.hasCompletedOnboarding = true;
    },
    resetOnboarding: (state) => {
      state.hasCompletedOnboarding = false;
    },
  },
});

export const { completeOnboarding, resetOnboarding } = onboardingSlice.actions;
export default onboardingSlice.reducer;
