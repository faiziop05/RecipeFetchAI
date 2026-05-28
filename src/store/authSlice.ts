import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AuthState {
  isLoggedIn: boolean;
  uid: string | null;
  email: string | null;
}

const initialState: AuthState = {
  isLoggedIn: false,
  uid: null,
  email: null,
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
    },
  },
});

export const { login, logout } = authSlice.actions;
export default authSlice.reducer;
