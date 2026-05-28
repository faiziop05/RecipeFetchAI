import AsyncStorage from '@react-native-async-storage/async-storage';

// Memory fallback store for session persistence when native modules are unavailable
const memoryStore: Record<string, string> = {};

export const safeGetItem = async (key: string): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(key);
  } catch (err: any) {
    console.warn(`[Storage Warning] AsyncStorage is unavailable. Falling back to memory. Key: ${key}`, err.message);
    return memoryStore[key] || null;
  }
};

export const safeSetItem = async (key: string, value: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(key, value);
  } catch (err: any) {
    console.warn(`[Storage Warning] AsyncStorage is unavailable. Saving in memory. Key: ${key}`, err.message);
    memoryStore[key] = value;
  }
};
