// apps/mobile/src/lib/supabase.ts
// The app's Supabase client. Uses the ANON key (safe to ship; RLS protects data).
// Persists the session with AsyncStorage so users stay logged in.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createSupabaseClient } from '@kapitpondo/shared';

if (typeof window !== 'undefined') {
  require('react-native-url-polyfill/auto');
}

// AsyncStorage on web reads window.localStorage, which doesn't exist during
// Expo Router's SSR pass. This adapter short-circuits all storage calls on the server.
const ssrSafeStorage = {
  getItem: (key: string): Promise<string | null> => {
    if (typeof window === 'undefined') return Promise.resolve(null);
    return AsyncStorage.getItem(key);
  },
  setItem: (key: string, value: string): Promise<void> => {
    if (typeof window === 'undefined') return Promise.resolve();
    return AsyncStorage.setItem(key, value);
  },
  removeItem: (key: string): Promise<void> => {
    if (typeof window === 'undefined') return Promise.resolve();
    return AsyncStorage.removeItem(key);
  },
};

const url = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string;

export const supabase = createSupabaseClient(url, anonKey, {
  auth: {
    storage: ssrSafeStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});