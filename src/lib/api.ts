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

let token: string | null = null;

async function call<T>(path: string, init: RequestInit = {}, auth = true, timeoutMs = 15000): Promise<T> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    if (auth && !token) await guest();
    const headers: Record<string, string> = { Accept: 'application/json', ...(init.headers as any) };
    if (init.body && !(init.body instanceof FormData)) headers['Content-Type'] = 'application/json';
    if (auth && token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(API_BASE + path, { ...init, headers, signal: ctl.signal });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error?.message || `HTTP ${res.status}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(t);
  }
}

export async function guest(name = '게스트') {
  const s = await call<{ accessToken: string }>('/auth/guest', { method: 'POST', body: JSON.stringify({ displayName: name }) }, false);
  token = s.accessToken;
  return s;
}

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
    // React Native 는 {uri, name, type} 형태로 파일을 보내요
    fd.append('file', { uri, name: 'answer.m4a', type: 'audio/m4a' } as any);
    fd.append('pack', pack);
    return call<{ transcriptId: string; text: string; audioMetrics?: { fillerCount?: number; pauseCount?: number } }>('/speech/transcriptions', { method: 'POST', body: fd }, true, 30000);
  },
};

export const absUrl = (u: string) => (u.startsWith('http') ? u : API_BASE.replace(/\/api\/v1$/, '') + u);
