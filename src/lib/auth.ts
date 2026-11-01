import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { authApi } from './api';
import { getTokens, setTokens, MaloUser } from './tokens';

// Google 로그인: Supabase(PKCE)로 Google 인증 → Supabase access token 을 Malo BE 에 넘겨 Malo 토큰으로 교환.
// Google Client ID/Secret 은 앱에 없어요. 토큰·code·콜백 URL 은 로그에 남기지 않아요.

WebBrowser.maybeCompleteAuthSession();

const web = Platform.OS === 'web';
export const CALLBACK_PATH = 'auth/callback';

// 웹은 페이지를 떠났다 돌아오므로 PKCE verifier 를 localStorage 에, 앱은 같은 실행 안에서 끝나므로 메모리에 둬요.
const memStore = new Map<string, string>();
const storage = web
  ? undefined // supabase-js 기본값 = localStorage
  : {
      getItem: async (k: string) => memStore.get(k) ?? null,
      setItem: async (k: string, v: string) => void memStore.set(k, v),
      removeItem: async (k: string) => void memStore.delete(k),
    };

let cfg: { enabled: boolean; client: SupabaseClient | null } | null = null;

export async function googleConfig() {
  if (cfg) return cfg;
  try {
    const c = await authApi.config();
    const enabled = !!c.google?.enabled && !!c.supabaseUrl && !!c.publishableKey;
    cfg = {
      enabled,
      client: enabled
        ? createClient(c.supabaseUrl!, c.publishableKey!, { auth: { flowType: 'pkce', detectSessionInUrl: false, persistSession: true, autoRefreshToken: false, storage } })
        : null,
    };
  } catch {
    // A transient failure must not disable login until the next full reload.
    return { enabled: false, client: null };
  }
  return cfg;
}

export function redirectUrl() {
  if (web) return `${window.location.origin}/${CALLBACK_PATH}`;
  return makeRedirectUri({ scheme: 'malo', path: CALLBACK_PATH }); // malo://auth/callback
}

export type LoginResult = { ok: true; user: MaloUser } | { ok: false; reason: 'disabled' | 'cancel' | 'error' | 'redirect'; message?: string };

let inFlight = false; // 콜백을 한 번만 처리

export async function signInWithGoogle(): Promise<LoginResult> {
  const c = await googleConfig();
  if (!c.enabled || !c.client) return { ok: false, reason: 'disabled' };
  const redirectTo = redirectUrl();
  const { data, error } = await c.client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo, skipBrowserRedirect: true, scopes: 'openid email profile' } });
  if (error || !data?.url) return { ok: false, reason: 'error', message: '로그인을 시작하지 못했어요' };
  if (web) {
    // 웹: Google 로 이동 → /auth/callback 화면에서 finishGoogle 처리
    window.location.assign(data.url);
    return { ok: false, reason: 'redirect' };
  }
  const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (res.type !== 'success') return { ok: false, reason: 'cancel' }; // 취소해도 게스트 기록은 그대로
  return finishGoogle(res.url);
}

// 콜백 URL 의 code → Supabase 세션 → Malo 토큰. 실패하면 기존 게스트 토큰을 건드리지 않아요.
export async function finishGoogle(url: string): Promise<LoginResult> {
  if (inFlight) return { ok: false, reason: 'error', message: '이미 처리 중이에요' };
  inFlight = true;
  try {
    const q = new URL(url);
    const p = new URLSearchParams(q.search || q.hash.replace(/^#/, ''));
    if (p.get('error')) return { ok: false, reason: 'cancel', message: p.get('error_description') ?? undefined };
    const code = p.get('code');
    if (!code) return { ok: false, reason: 'error', message: '로그인 응답이 비어 있어요' };
    const c = await googleConfig();
    if (!c.client) return { ok: false, reason: 'disabled' };
    const { data, error } = await c.client.auth.exchangeCodeForSession(code);
    const sbToken = data?.session?.access_token;
    if (error || !sbToken) return { ok: false, reason: 'error', message: 'Google 인증을 확인하지 못했어요' };
    const old = await getTokens();
    const guestToken = old?.user?.isGuest ? old.accessToken : null; // 게스트 기록 이관
    const r = await authApi.googleExchange(sbToken, guestToken);
    if (!r?.accessToken || !r.user || r.user.isMock) return { ok: false, reason: 'error', message: '회원 정보를 받지 못했어요' };
    const user = { ...r.user, isGuest: false };
    await setTokens({ accessToken: r.accessToken, refreshToken: r.refreshToken, user });
    return { ok: true, user };
  } catch (e: any) {
    return { ok: false, reason: 'error', message: e?.status === 401 ? 'Google 토큰이 거절됐어요. 다시 로그인해 주세요' : '네트워크를 확인해 주세요' };
  } finally {
    inFlight = false;
  }
}

export async function signOut() {
  await authApi.logout();
  try {
    await (await googleConfig()).client?.auth.signOut();
  } catch {}
  await setTokens(null);
}

export async function currentUser(): Promise<MaloUser | null> {
  const t = await getTokens();
  return t?.user && !t.user.isGuest ? t.user : null;
}
