import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Malo 앱 토큰 보관 (앱: SecureStore, 웹: localStorage). 토큰은 로그에 남기지 않아요.
export type MaloUser = { id: string; displayName?: string; email?: string | null; isMock?: boolean; isGuest?: boolean };
export type Tokens = { accessToken: string; refreshToken?: string; user?: MaloUser | null };

const KEY = 'malo.tokens';
let mem: Tokens | null = null;
let loaded = false;

const web = Platform.OS === 'web';
async function read(): Promise<string | null> {
  if (web) return typeof localStorage === 'undefined' ? null : localStorage.getItem(KEY);
  return SecureStore.getItemAsync(KEY);
}
async function write(v: string | null) {
  if (web) {
    if (typeof localStorage === 'undefined') return;
    v ? localStorage.setItem(KEY, v) : localStorage.removeItem(KEY);
    return;
  }
  v ? await SecureStore.setItemAsync(KEY, v) : await SecureStore.deleteItemAsync(KEY);
}

export async function getTokens(): Promise<Tokens | null> {
  if (!loaded) {
    loaded = true;
    try {
      const raw = await read();
      mem = raw ? JSON.parse(raw) : null;
    } catch {
      mem = null;
    }
  }
  return mem;
}
export async function setTokens(t: Tokens | null) {
  mem = t;
  loaded = true;
  try {
    await write(t ? JSON.stringify(t) : null);
  } catch {}
}
