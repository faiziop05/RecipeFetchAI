import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface SubscriptionState {
  isPremium: boolean;
  freeScansUsed: number;
  currentMonth: string; // "YYYY-MM"
}

const initialState: SubscriptionState = {
  isPremium: false,
  freeScansUsed: 0,
  currentMonth: '',
};

export const subscriptionSlice = createSlice({
  name: 'subscription',
  initialState,
  reducers: {
    setPremiumStatus: (state, action: PayloadAction<boolean>) => {
      state.isPremium = action.payload;
    },
    incrementFreeScan: (state) => {
      const today = new Date();
      const currentMonthStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}`;
      
      // Reset if we've rolled over to a new month
      if (state.currentMonth !== currentMonthStr) {
        state.currentMonth = currentMonthStr;
        state.freeScansUsed = 0;
      }
      
      state.freeScansUsed += 1;
    },
    resetFreeScans: (state) => {
      state.freeScansUsed = 0;
    },
    checkMonthRollover: (state) => {
      const today = new Date();
      const currentMonthStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}`;
      if (state.currentMonth !== currentMonthStr) {
        state.currentMonth = currentMonthStr;
        state.freeScansUsed = 0;
      }
    }
  },
});

export const { setPremiumStatus, incrementFreeScan, resetFreeScans, checkMonthRollover } = subscriptionSlice.actions;
export default subscriptionSlice.reducer;
