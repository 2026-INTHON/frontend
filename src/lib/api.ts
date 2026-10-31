import { Platform } from 'react-native';
import { getTokens, setTokens, MaloUser, Tokens } from './tokens';

// 백엔드 API (Next.js) 연결. 문서: <API_BASE>/api/v1/docs
// 주소는 .env 의 EXPO_PUBLIC_API_URL 로 바꿀 수 있어요.
export const API_BASE = (process.env.EXPO_PUBLIC_API_URL || 'https://inthon-demo-20261031-dh.koreacentral.cloudapp.azure.com').replace(/\/$/, '') + '/api/v1';

export type Emotion = 'neutral' | 'happy' | 'confused' | 'sad' | 'angry';
export type PlaySession = {
  id: string;
  sceneId: string;
  characterId: string;
  personalityId: string;
  pack: 'ko' | 'en';
  status: 'active' | 'paused' | 'succeeded' | 'failed' | 'abandoned';
  lives: number;
  initialLives: number;
  nodeIndex: number;
  nodeCount: number;
  briefing: { partner: string; situation: string; goal: string };
  npc: { text: string; emotion: Emotion; assetKey?: string };
  hintsUsed: number;
};
export type TurnFeedback = {
  tone: { score: number; label: string } | null;
  speed: { value: number; unit: string } | null;
  hesitation: { pauseCount: number; fillerCount: number; note?: string } | null;
  message: string;
  betterExpression: string;
  reason: string;
};
export type ApiTurn = { id: string; text: string; outcome: 'correct' | 'misunderstanding' | 'clarify'; feedback: TurnFeedback; npcReply: string; emotion: Emotion; lifeDelta: number };
export type SessionResult = {
  sessionId: string;
  passed: boolean;
  score: number;
  goodUtterances: { text: string; reason: string }[];
  improvableUtterances: { text: string; betterExpression: string; reason: string; mistakeId: string | null }[];
  rewardCoins: number;
  nextSceneId: string | null;
};
export type SubmitTurnResult = { turn: ApiTurn; session: PlaySession; result: SessionResult | null; oopsMoment: { triggered: boolean; lifeDelta: number }; mistakeId: string | null };
export type ApiScene = { id: string; title: string; situation: string; goal: string; pack: 'ko' | 'en'; characterId: string; personalityId: string; nodeCount: number };

// 공통 응답 {data, meta} 면 data 만 꺼내요
const unwrap = (j: any) => (j && typeof j === 'object' && 'data' in j && ('meta' in j || Object.keys(j).length <= 2) ? j.data : j);

export class ApiError extends Error {
  constructor(public status: number, public code: string | undefined, msg: string) {
    super(msg);
  }
}

async function raw<T>(path: string, init: RequestInit = {}, bearer: string | null, timeoutMs = 15000): Promise<T> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const headers: Record<string, string> = { Accept: 'application/json', ...(init.headers as any) };
    if (init.body && !(init.body instanceof FormData)) headers['Content-Type'] = 'application/json';
    if (bearer) headers.Authorization = `Bearer ${bearer}`;
    const res = await fetch(API_BASE + path, { ...init, headers, signal: ctl.signal });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new ApiError(res.status, body?.error?.code, body?.error?.message || `HTTP ${res.status}`);
    }
    if (res.status === 204) return undefined as T;
    return unwrap(await res.json()) as T;
  } finally {
    clearTimeout(t);
  }
}

// 로그인 토큰이 없으면 게스트로 시작. 401 이면 refresh 한 번 → 실패하면 게스트로 다시.
async function call<T>(path: string, init: RequestInit = {}, auth = true, timeoutMs = 15000): Promise<T> {
  if (!auth) return raw<T>(path, init, null, timeoutMs);
  let tk = await getTokens();
  if (!tk) tk = await guest();
  try {
    return await raw<T>(path, init, tk.accessToken, timeoutMs);
  } catch (e) {
    if (!(e instanceof ApiError) || e.status !== 401) throw e;
    let next = await refresh().catch(() => null);
    if (!next) {
      await setTokens(null);
      if (!tk.user?.isGuest) {
        onSignedOut?.(); // 회원이면 로그인 화면으로
        throw e;
      }
      next = await guest(); // 게스트면 새 게스트로 계속
    }
    return raw<T>(path, init, next.accessToken, timeoutMs);
  }
}

let onSignedOut: (() => void) | null = null;
export const setSignedOutHandler = (f: (() => void) | null) => (onSignedOut = f);

type AuthRes = { accessToken: string; refreshToken?: string; expiresIn?: number; user?: MaloUser; migrated?: unknown };

export async function guest(name = '게스트'): Promise<Tokens> {
  const s = await raw<AuthRes>('/auth/guest', { method: 'POST', body: JSON.stringify({ displayName: name }) }, null);
  const t = { accessToken: s.accessToken, refreshToken: s.refreshToken, user: s.user ? { ...s.user, isGuest: true } : { id: 'guest', isGuest: true } };
  await setTokens(t);
  return t;
}

// refresh token 은 회전돼요 → 응답 토큰으로 함께 교체
export async function refresh(): Promise<Tokens | null> {
  const tk = await getTokens();
  if (!tk?.refreshToken) return null;
  const s = await raw<AuthRes>('/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken: tk.refreshToken }) }, null);
  const t = { accessToken: s.accessToken, refreshToken: s.refreshToken ?? tk.refreshToken, user: s.user ?? tk.user };
  await setTokens(t);
  return t;
}

export const authApi = {
  config: () => raw<{ google?: { enabled: boolean }; supabaseUrl?: string; publishableKey?: string }>('/auth/config', {}, null, 6000),
  // 기존 게스트 토큰을 같이 보내면 게스트 기록이 회원으로 옮겨져요
  googleExchange: (supabaseAccessToken: string, guestToken: string | null) =>
    raw<AuthRes>('/auth/google/exchange', { method: 'POST', body: JSON.stringify({ supabaseAccessToken }) }, guestToken, 20000),
  logout: async () => {
    const tk = await getTokens();
    if (tk) await raw('/auth/logout', { method: 'POST', body: '{}' }, tk.accessToken).catch(() => null);
  },
};

export const api = {
  health: () => call<{ status?: string }>('/health', {}, false, 5000),
  scenes: (q: { pack?: string; characterId?: string; personalityId?: string }) =>
    call<ApiScene[]>('/scenes?' + new URLSearchParams(Object.entries(q).filter(([, v]) => v) as any).toString(), {}, false),
  start: (sceneId: string) => call<PlaySession>('/sessions', { method: 'POST', body: JSON.stringify({ sceneId }) }),
  turn: (id: string, b: { clientTurnId: string; inputType: 'text' | 'voice'; text: string; transcriptId?: string }) =>
    call<SubmitTurnResult>(`/sessions/${id}/turns`, { method: 'POST', body: JSON.stringify(b) }, true, 30000),
  hint: (id: string) => call<{ hiddenThought: string; tip: string }>(`/sessions/${id}/hint`, { method: 'POST' }),
  retry: (id: string) => call<PlaySession>(`/sessions/${id}/retry`, { method: 'POST' }),
  pause: (id: string) => call<PlaySession>(`/sessions/${id}/pause`, { method: 'POST' }),
  result: (id: string) => call<SessionResult>(`/sessions/${id}/result`),
  speech: (id: string) => call<{ audioUrl: string }>(`/sessions/${id}/speech`, { method: 'POST' }, true, 20000),
  transcribe: async (uri: string, pack: string) => {
    const fd = new FormData();
    if (Platform.OS === 'web') {
      // 웹 녹음은 blob: 주소라서 실제 파일(Blob)로 바꿔서 보내요
      const blob = await (await fetch(uri)).blob();
      fd.append('file', blob, blob.type.includes('webm') ? 'answer.webm' : 'answer.m4a');
    } else {
      // 앱은 {uri, name, type} 형태로 파일을 보내요
      fd.append('file', { uri, name: 'answer.m4a', type: 'audio/m4a' } as any);
    }
    fd.append('pack', pack);
    return call<{ transcriptId: string; text: string; audioMetrics?: { fillerCount?: number; pauseCount?: number } }>('/speech/transcriptions', { method: 'POST', body: fd }, true, 30000);
  },
};

export const absUrl = (u: string) => (u.startsWith('http') ? u : API_BASE.replace(/\/api\/v1$/, '') + u);
