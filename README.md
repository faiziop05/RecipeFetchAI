# RecipeFetchAI

An AI-powered mobile app that turns a photo of your ingredients (or pantry) into a full recipe, meal plan, and shopping/pantry tracker.

## Overview

RecipeFetchAI is a React Native (Expo) app where a user photographs ingredients, a receipt, or a dish, and Google Gemini extracts a structured recipe (ingredients, instructions, metrics) from the image or text. Recipes can also be entered manually. The app then layers pantry tracking, a meal planner, a recipe vault, and a guided step-by-step "cook mode" on top of that core extraction feature, with Firebase for auth/data and RevenueCat for subscriptions.

## Problem it solves

Turning "a photo of what's in your fridge" or a messy recipe screenshot into something actually cookable normally requires manual transcription. RecipeFetchAI automates that extraction step with an LLM, then keeps the extracted recipe useful — tracked against what's actually in your pantry, plannable into a weekly meal plan, and walkable via a distraction-free cook mode — rather than just being a one-off AI chat answer.

## Key features

- **AI recipe extraction from photos** (`src/app/(tabs)/capture.tsx`, `src/services/gemini.ts`): capture or pick an image, extract a structured recipe (`extractRecipe`) via Gemini
- **Model cascade with fallback**: `gemini.ts` walks a list of Gemini model versions (`gemini-2.5-flash` → `gemini-2.0-flash-lite`, etc.) and retries on failure, plus a cloud-proxy fallback path, so a single model outage or rate limit doesn't break extraction
- **Manual recipe entry** (`manual-recipe.tsx`, `ManualIngredientForm.tsx`, `ManualInstructionForm.tsx`) as a fallback/alternative to AI extraction, with the same formatting/calculation pipeline
- **Pantry tracking** (`(tabs)/pantry.tsx`, `pantrySlice.ts`) and **ingredient matching** (`match-results.tsx`) against recipes
- **Meal planner** (`(tabs)/planner.tsx`, `plannerSlice.ts`, `meal-plan-detail.tsx`) and a **recipe vault** ((tabs)/vault.tsx`) for saved recipes
- **Guided cook mode** (`CookModeModal.tsx`) — step-by-step recipe walkthrough
- **Diet/preferences onboarding** (`onboarding.tsx`, `setup-diet.tsx`, `setup-pantry.tsx`, `preferences.tsx`) that personalizes recipe generation
- **Subscription paywall** via RevenueCat (`react-native-purchases`, `subscriptionSlice.ts`, `paywall.tsx`), including free-scan usage tracking with monthly rollover
- **Firebase-backed auth and storage** (`services/firebase.ts`, `services/storage.ts`)

## What's unique about it

- Recipe extraction isn't a single API call — `gemini.ts` implements a resilient multi-model cascade with retry/fallback logic (including a secondary cloud proxy path) specifically so image-to-recipe extraction stays reliable across Gemini model deprecations and rate limits.
- The AI output feeds directly into operational features (pantry match, meal planning, cook mode) rather than being the end product itself — extraction is the input to a broader kitchen workflow, not a standalone "ask AI" screen.

## Tech stack

- **Framework**: React Native + Expo (Expo Router, file-based routing), TypeScript
- **AI**: Google Gemini (`@google/generative-ai`), multi-model cascade with fallback
- **State**: Redux Toolkit + `redux-persist`
- **Backend-as-a-service**: Firebase (auth, Firestore)
- **Payments**: RevenueCat (`react-native-purchases`, `react-native-purchases-ui`)
- **UI**: `expo-image`, `expo-blur`/`expo-glass-effect`, `react-native-reanimated`, `react-native-gesture-handler`
- **Build/deploy**: EAS (`eas.json`, `eas-cli`)

## Setup / running instructions

```bash
npm install
```

Copy `.env.example` to `.env` and fill in:
- `EXPO_PUBLIC_GEMINI_API_KEY` — Google Gemini API key
- `EXPO_PUBLIC_FIREBASE_*` — Firebase client SDK config
- `EXPO_PUBLIC_REVENUECAT_*` — RevenueCat API keys (Android/iOS)

Start the app:
```bash
npm run start      # expo start
npm run android     # expo run:android
npm run ios          # expo run:ios
npm run web            # expo start --web
```

Other scripts: `npm run lint` (expo lint), `npm run reset-project` (moves starter code to `app-example` and resets `app/`).

Builds are managed via EAS (`eas.json` profiles: development/preview/production).
