import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeAuth, getAuth } from "firebase/auth";
// @ts-ignore
import { getReactNativePersistence } from "firebase/auth";
import { initializeFirestore, memoryLocalCache, getFirestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyAUoEsx9ruEn59QdhatXDb9sEOmRwidDIA",
  authDomain: "recipefetch-783bd.firebaseapp.com",
  projectId: "recipefetch-783bd",
  storageBucket: "recipefetch-783bd.firebasestorage.app",
  messagingSenderId: "474080017679",
  appId: "1:474080017679:web:63d05b351741a15e20d27a",
  measurementId: "G-29S4GWE0PL",
};

const isNewApp = getApps().length === 0;
const app = isNewApp ? initializeApp(firebaseConfig) : getApp();

let auth: any;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (e) {
  auth = getAuth(app);
}

let db: any;
if (isNewApp) {
  db = initializeFirestore(app, {
    localCache: memoryLocalCache(),
  });
} else {
  db = getFirestore(app);
}

export { app, auth, db };
