import AsyncStorage from "@react-native-async-storage/async-storage";
import { combineReducers, configureStore } from "@reduxjs/toolkit";
import {
  FLUSH,
  PAUSE,
  PERSIST,
  persistReducer,
  persistStore,
  PURGE,
  REGISTER,
  REHYDRATE,
} from "redux-persist";

import authReducer from "./authSlice";
import onboardingReducer from "./onboardingSlice";
import recipeReducer from "./recipeSlice";
import subscriptionReducer from "./subscriptionSlice";
import themeReducer from "./themeSlice";
import profileReducer from "./profileSlice";
import pantryReducer from "./pantrySlice";
import plannerReducer from "./plannerSlice";

const persistConfig = {
  key: "root",
  version: 1,
  storage: AsyncStorage,
};

const rootReducer = combineReducers({
  auth: authReducer,
  theme: themeReducer,
  recipe: recipeReducer,
  onboarding: onboardingReducer,
  subscription: subscriptionReducer,
  profile: profileReducer,
  pantry: pantryReducer,
  planner: plannerReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
