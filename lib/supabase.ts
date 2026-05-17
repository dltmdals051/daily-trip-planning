import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// SSR에서 process.env.EXPO_PUBLIC_*가 비-string으로 들어오는 케이스가 있어서 string 가드.
function asString(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

const FALLBACK_URL = 'https://placeholder.supabase.co';
const FALLBACK_ANON = 'placeholder-anon-key';

const url =
  asString(process.env.EXPO_PUBLIC_SUPABASE_URL) ||
  asString(Constants.expoConfig?.extra?.supabaseUrl) ||
  FALLBACK_URL;
const anon =
  asString(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) ||
  asString(Constants.expoConfig?.extra?.supabaseAnonKey) ||
  FALLBACK_ANON;

if (url === FALLBACK_URL && typeof window !== 'undefined') {
  console.warn(
    '[supabase] EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY not set. ' +
    '.env에 추가하거나 EAS/Pages secret으로 주입하세요.',
  );
}

const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
const isServerRender = !isBrowser && Platform.OS === 'web';

export const supabase = createClient(url, anon, {
  auth: isServerRender
    ? {
        // SSR/build-time: storage 호출 안 하도록 모두 끔
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      }
    : {
        // Web 런타임: localStorage 자동 사용 (storage 미지정). RN: AsyncStorage 사용
        storage: Platform.OS === 'web' ? undefined : AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: Platform.OS === 'web',
      },
});
