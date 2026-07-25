import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AuthState {
  isLoggedIn: boolean;
  uid: string | null;
  email: string | null;
  hasCompletedPostLoginSetup: boolean;
}

const initialState: AuthState = {
  isLoggedIn: false,
  uid: null,
  email: null,
  hasCompletedPostLoginSetup: false,
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    login: (state, action: PayloadAction<{ uid: string; email: string | null }>) => {
      state.isLoggedIn = true;
      state.uid = action.payload.uid;
      state.email = action.payload.email;
    },
    logout: (state) => {
      state.isLoggedIn = false;
      state.uid = null;
      state.email = null;
      state.hasCompletedPostLoginSetup = false;
    },
    completePostLoginSetup: (state) => {
      state.hasCompletedPostLoginSetup = true;
    }
  },
});

export const { login, logout, completePostLoginSetup } = authSlice.actions;
export default authSlice.reducer;
