import { Platform } from 'react-native';
import { getTokens, setTokens, MaloUser, Tokens } from './tokens';

// 백엔드 API (Next.js) 연결. 문서: <API_BASE>/api/v1/docs
// 주소는 .env 의 EXPO_PUBLIC_API_URL 로 바꿀 수 있어요.
export const API_BASE = (process.env.EXPO_PUBLIC_API_URL || 'https://inthon-demo-20261031-dh.koreacentral.cloudapp.azure.com').replace(/\/$/, '') + '/api/v1';

export type Emotion = 'neutral' | 'happy' | 'confused' | 'sad' | 'angry';
export type SpeechLevel = 'polite' | 'casual';
export type Mark4 = 'O' | '△' | 'X' | '?';

// 캐릭터 표정·몸짓 이미지 (서버가 고른 것을 그대로 써요)
export type Render = { characterId?: string; emotion?: Emotion; gesture?: string; assetKey?: string; imageUrl?: string | null };
// 비언어 단서: 서버 형식이 조금 달라도 받아요 ({k,v} / {kind,text} / 문자열)
export type RawCue = string | { k?: string; v?: string; kind?: string; type?: string; label?: string; text?: string; value?: string; description?: string };

export type Briefing = {
  title?: string;
  partner: string;
  situation: string;
  goal: string;
  translation?: { language: string; title?: string; partner?: string; situation?: string; goal?: string } | null;
};

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
  briefing: Briefing;
  npc: { text: string; speechLevel?: SpeechLevel; emotion?: Emotion; assetKey?: string; action?: string | null; cues?: RawCue[]; render?: Render | null; subtitle?: { language: string; text: string } | null; audioUrl?: string | null };
  hintsUsed: number;
  backgroundUrl?: string | null;
};

export type Evaluation = {
  mark: Mark4;
  category?: 'excellent' | 'acceptable' | 'inappropriate' | 'off_topic';
  label?: string;
  reason?: string;
  reasonSubtitle?: { language: string; text: string } | null;
  goalAchieved?: boolean;
  progression?: 'advance' | 'retry';
  provisional?: boolean;
};

export type TurnFeedback = {
  tone: { score: number; label: string } | null;
  speed: { value: number; unit: string } | null;
  hesitation: { pauseCount: number; fillerCount: number; note?: string } | null;
  ending?: { label: string } | string | null;
  message: string;
  betterExpression: string;
  reason: string;
  views?: { who: string; meaning: string; cue?: string }[];
};
export type ApiTurn = {
  id: string;
  nodeId?: string;
  attempt?: number;
  text: string;
  outcome?: 'correct' | 'misunderstanding' | 'clarify';
  evaluation?: Evaluation | null;
  native?: boolean;
  comparison?: { firstAnswer: string; currentAnswer: string } | null;
  feedback: TurnFeedback;
  npcReply: string;
  npcSpeechLevel?: SpeechLevel;
  action?: string;
  cues?: RawCue[];
  npcReplySubtitle?: { language: string; text: string } | null;
  audioUrl?: string | null;
  emotion?: Emotion;
  render?: Render | null;
  lifeDelta: number;
};
// 엔딩 (FE_MIGRATION_V2): 마지막 반응 대사 + 표정 + 정리 카드
export type ApiEnding = {
  id: string;
  kind: 'happy' | 'bad' | string;
  title: string;
  text: string;
  emotion?: Emotion;
  render?: Render | null;
  dialogue?: { turnId: string; text: string; subtitle: { language: string; text: string } | null; audioUrl: string | null } | null;
  recap?: {
    title: string;
    story: string;
    comment: string;
    prompt: string;
    translation: { language: string; title: string; story: string; comment: string; prompt: string } | null;
  } | null;
};
export type SessionResult = {
  sessionId: string;
  passed: boolean;
  score: number | null;
  grade?: string | null;
  achievement?: { reach: number | null; infer: number | null; self: number | null } | null;
  ending?: ApiEnding | null;
  goodUtterances: { text: string; reason: string }[];
  improvableUtterances: { text: string; betterExpression: string; reason: string; mistakeId: string | null }[];
  rewardCoins: number;
  nextSceneId: string | null;
  report?: { reportId: string; status: string } | null;
};
export type SubmitTurnResult = { turn: ApiTurn; session: PlaySession; result: SessionResult | null; oopsMoment?: { triggered: boolean; lifeDelta: number }; mistakeId?: string | null };
export type ApiScene = { id: string; title: string; situation: string; goal: string; pack: 'ko' | 'en'; characterId: string; personalityId: string; nodeCount: number; source?: string };
export type HintRes = { step?: 1 | 2; clue?: RawCue[] | null; hiddenThought?: string | null; tip?: string | null };

export type CharacterCardProfile = {name:string;occupation:string;age:string;hobbies:string[];favoriteFoods:string[];dislikes:string[];currentInterests:string[]};
export type CharacterCard = {characterId:string;personalityId:string;personalityName:string;language:string;revision:string;profile:CharacterCardProfile};
export type CharacterProfile = {
  age: string; role: string; occupation: string; introduction: string; relationship: string;
  values: string[]; traits: string[]; likes: string[]; dislikes: string[]; hobbies: string[];
  speakingStyle: string; sampleLines: string[];
};
export type CharacterImage = {
  assetKey: string; characterId: string; emotion: Emotion; imageUrl: string;
  reaction?: string | null; endingPreferred?: boolean;
};
export type ApiCharacter = { id: string; clientKey?: string; name: string; role?: string; free?: boolean; locked?: boolean; imageUrl?: string | null; cardUrl?: string | null; personalities?: { id: string; clientKey?: string; name: string; short?: string; long?: string; description?: string; level?: string; profile?: CharacterProfile; cardProfile?: CharacterCardProfile; profileRevision?: string }[] };
export type ApiSub = { id: string; title: string; translation?: {language: string; title: string}; sceneId?: string | null; state?: 'done' | 'now' | 'open' | 'locked'; score?: number | null; grade?: string | null; availability?: 'ready' | 'unavailable' | 'generating' | string };
export type ApiChapter = { id: string; no?: number; title: string; translation?: {language: string; title: string; desc: string}; description?: string; desc?: string; source?: 'curriculum' | 'examples' | 'personal'; locked?: boolean; generationStatus?: 'ready' | 'generating' | 'failed' | null; characterId?: string; subs: ApiSub[] };

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
    const current = await getTokens();
    let next = current && current.accessToken !== tk.accessToken ? current : await refresh().catch(error => {
      if (error instanceof ApiError && error.status === 401) return null;
      throw error; // A temporary network/server error must not erase a real login.
    });
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

let guestPending: Promise<Tokens> | null = null;
export function guest(name = '게스트'): Promise<Tokens> {
  return guestPending ??= createGuest(name).finally(() => { guestPending = null; });
}
async function createGuest(name: string): Promise<Tokens> {
  const s = await raw<AuthRes>('/auth/guest', { method: 'POST', body: JSON.stringify({ displayName: name }) }, null);
  const t = { accessToken: s.accessToken, refreshToken: s.refreshToken, user: s.user ? { ...s.user, isGuest: true } : { id: 'guest', isGuest: true } };
  await setTokens(t);
  return t;
}

// refresh token 은 회전돼요 → 응답 토큰으로 함께 교체
let refreshPending: Promise<Tokens | null> | null = null;
export function refresh(): Promise<Tokens | null> {
  return refreshPending ??= refreshTokens().finally(() => { refreshPending = null; });
}
async function refreshTokens(): Promise<Tokens | null> {
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

export type ReportDetail = {
  coaching?: { strengths: string[]; improvements: string[]; shortcomings: string[] };
  turnId: string; nodeId?: string; attempt?: number; npcText?: string; learnerText?: string; native?: boolean;
  evaluation?: Evaluation | null; originalIntent?: string | null; implicitIntent?: string | null; culturalContext?: string | null;
  feedback?: string | null; feedbackTranslation?: {language:string;text:string} | string | null; praise?: string | null; alternativeExpression?: string | null; practiceTip?: string | null;
  comparison?: { firstAnswer: string; currentAnswer: string } | null;
};
export type SessionReport = {
  reportId: string;
  status: 'queued' | 'running' | 'ready' | 'failed';
  error: { code: string; message: string; retryable: boolean } | null;
  report: null | {
    id: string; title?: string; provisional?: boolean; language?: string;
    summary?: { headline?: string; overallFeedback?: string; strengths?: string[]; improvements?: string[]; shortcomings?: string[]; culturalTakeaways?: string[]; nextPractice?: string | string[] };
    details?: ReportDetail[];
  };
};

export type GenerationJob = {
  id: string; label: string; characterId: string; personalityId: string;
  status: 'queued' | 'running' | 'ready' | 'failed';
  stage: string; chapterId: string | null;
  error: { code: string; message: string; retryable: boolean } | null;
  createdAt: string; updatedAt: string;
};

const qs = (q: Record<string, string | undefined>) => new URLSearchParams(Object.entries(q).filter(([, v]) => v) as [string, string][]).toString();
const isNetErr = (e: unknown) => !(e instanceof ApiError) || e.status >= 500;
const starting = new Map<string, Promise<PlaySession>>();
async function startSession(sceneId: string, o: { personalityId?: string; subtitleLanguage?: string }) {
  const tk = await getTokens() ?? await guest();
  const key = JSON.stringify([tk.accessToken, sceneId, o]);
  if (!starting.has(key)) starting.set(key, call<PlaySession>('/sessions', { method: 'POST', body: JSON.stringify({ sceneId, aiMode: 'live', ...o }) }, true, 120000).finally(() => starting.delete(key)));
  return starting.get(key)!;
}

export const api = {
  get: <T>(path: string) => call<T>(path, {}, true, 10000),
  health: () => call<{ status?: string }>('/health', {}, false, 5000),
  scenes: (q: { pack?: string; characterId?: string; personalityId?: string }) => call<ApiScene[]>('/scenes?' + qs(q), {}, false),
  characters: () => call<ApiCharacter[]>('/characters', {}, false, 10000),
  characterProfile: (characterId:string,personalityId:string,language:string) => call<CharacterCard>(`/characters/${encodeURIComponent(characterId)}/personalities/${encodeURIComponent(personalityId)}/profile?language=${encodeURIComponent(language)}`,{},false,30000),
  characterImages: () => call<{ items: CharacterImage[] }>('/assets/characters', {}, false, 10000),
  chapters: (q: { pack: string; characterId: string; language?: string }) => call<ApiChapter[]>('/chapters?' + qs(q), {}, true, q.language && q.language !== 'ko' ? 120000 : 15000),
  // aiMode 를 빼면 옛 예시는 mock 채점이라 꼭 live 로 보내요
  start: startSession,
  // AI 응답은 5초를 넘을 수 있어요. 네트워크 오류는 같은 clientTurnId 로 두 번까지 다시 보내요.
  turn: async (id: string, b: { clientTurnId: string; inputType: 'text' | 'voice'; text: string; transcriptId?: string; realtime?: boolean }) => {
    let last: unknown;
    for (let i = 0; i < 3; i++) {
      try {
        return await call<SubmitTurnResult>(`/sessions/${id}/turns`, { method: 'POST', body: JSON.stringify(b) }, true, 60000);
      } catch (e) {
        last = e;
        if (!isNetErr(e)) throw e;
      }
    }
    throw last;
  },
  hint: (id: string, step: 1 | 2) => call<HintRes>(`/sessions/${id}/hint`, { method: 'POST', body: JSON.stringify({ step }) }, true, 120000),
  retry: (id: string, subtitleLanguage?: string) => call<PlaySession>(`/sessions/${id}/retry`, { method: 'POST', body: JSON.stringify({subtitleLanguage}) }, true, 120000),
  correct: (id: string, turnId: string) => call<PlaySession>(`/sessions/${id}/correction`, { method: 'POST', body: JSON.stringify({turnId}) }),
  pause: (id: string) => call<PlaySession>(`/sessions/${id}/pause`, { method: 'POST', body: '{}' }),
  report: (id: string, language?: string) => call<SessionReport>(`/sessions/${id}/report?${qs({language})}`),
  makeReport: (id: string, language?: string) => call<SessionReport>(`/sessions/${id}/report?${qs({language})}`, { method: 'POST', body: '{}' }),
  retryReport: (id: string, language?: string) => call<SessionReport>(`/sessions/${id}/report/retry?${qs({language})}`, { method: 'POST', body: '{}' }),
  // 나만의 챕터 생성: 200 은 '작업 접수'일 뿐 완성이 아니에요
  generate: (b: { clientRequestId: string; prompt: string; characterId: string; personalityId: string; pack: string; lessonCount: number }) =>
    call<GenerationJob>('/chapter-generations', { method: 'POST', body: JSON.stringify(b) }, true, 30000),
  generations: () => call<GenerationJob[] | { items: GenerationJob[] }>('/chapter-generations', {}, true, 10000).then((d) => (Array.isArray(d) ? d : (d?.items ?? []))),
  retryGeneration: (id: string) => call<GenerationJob>(`/chapter-generations/${id}/retry`, { method: 'POST', body: '{}' }),
  // 녹음 중 전사용 60초 임시 자격증명 (value 는 메모리에만, 로그·저장 금지)
  realtimeSession: (pack: string) => call<{ value: string; websocketUrl: string; expiresAt?: string | number }>('/speech/realtime-session', { method: 'POST', body: JSON.stringify({ pack }) }, true, 10000),
  pushConfig: () => call<{ enabled: boolean; publicKey: string | null }>('/notifications/push/config', {}, true, 10000),
  pushSubscribe: (sub: { endpoint: string; keys: { p256dh: string; auth: string } }) => call<{ id: string }>('/notifications/push/subscriptions', { method: 'POST', body: JSON.stringify(sub) }, true, 10000),
  pushUnsubscribe: (id: string) => call<void>(`/notifications/push/subscriptions/${id}`, { method: 'DELETE' }, true, 10000),
  result: (id: string) => call<SessionResult>(`/sessions/${id}/result`),
  // 끝난 세션의 엔딩 다시 불러오기 (진행 중이면 409 ENDING_NOT_READY)
  ending: (id: string) => call<ApiEnding>(`/sessions/${id}/ending`),
  // 반응 대사는 {turnId}, 지금 노드 대사는 {} (서명 URL은 10분 유효)
  speech: (id: string, turnId?: string) => call<{ audioUrl: string }>(`/sessions/${id}/speech`, { method: 'POST', body: JSON.stringify(turnId ? { turnId } : {}) }, true, 20000),
  previewSpeech: (b: { text: string; pack: 'ko'|'en'; characterId: string; personalityId: string; emotion?: Emotion; speed?: number }) => call<{ audioUrl: string; voice: string; cached: boolean }>('/speech/preview', { method: 'POST', body: JSON.stringify(b) }, true, 30000),
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

export const absUrl = (u: string) => (/^(https?:|data:|blob:)/.test(u) ? u : API_BASE.replace(/\/api\/v1$/, '') + u);
