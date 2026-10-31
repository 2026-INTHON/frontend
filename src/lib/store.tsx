import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CharId, PersonaId } from './data';
import type { Ending } from './engine';

// 앱 상태. 기기에 저장해서 새로고침·재실행해도 이어져요 (웹은 localStorage, 앱은 AsyncStorage).
// 서버에 연결되면 기록·코인은 서버 값(/home, /records, /wallet, /mistakes)이 우선이에요.

export type Mistake = { id: string; scene: string; title: string; said: string; better: string; why: string; when: string; fixed: boolean; line: string; who: string };

// 마지막으로 한 장면 (홈 '이어하기' 카드에 그대로 보여 줘요)
export type LastPlayed = {
  sceneId: string;
  title: string;
  char: CharId;
  persona: PersonaId;
  status: 'playing' | 'paused' | 'done';
  progress?: string; // 예: "2/5 대사"
  nextSceneId?: string | null;
  at: string; // ISO 시간
};

// 결과 화면에 보여 줄 마지막 결과
export type LastResult = {
  sessionId?: string | null; // 서버 세션 (상세 보고서 조회)
  sceneId: string;
  title: string;
  goal: string;
  passed: boolean | null;
  grade: string | null;
  coins: number;
  mistakes: number;
  fixed: { said: string; better: string }[];
  best: string;
  worst: string;
  reach: number | null;
  infer: number | null;
  self: number | null;
  ending: Ending | null; // 마지막 반응 대사·표정·정리 카드 (예전 기록은 제목·문장만)
  nextSceneId: string | null;
  streakDays: number;
  newDay: boolean; // 오늘 처음 끝낸 장면이면 연속 출석이 하루 늘어요
};

export type DayRecord = { date: string; sceneId: string; title: string; score: number | null };

type State = {
  soundEffects: boolean;
  pack: 'ko' | 'en';
  lang: string;
  languageSelected: boolean;
  char: CharId;
  persona: PersonaId;
  coins: number;
  subscribed: boolean;
  owned: string[];
  wearing: Record<string, string>;
  mistakes: Mistake[];
  onboarded: boolean;
  lastPlayed: LastPlayed | null;
  lastResult: LastResult | null;
  history: DayRecord[]; // 끝낸 장면 기록 (내 기록 화면)
  studyDays: string[]; // 장면을 끝낸 날짜(YYYY-MM-DD)
  demo: boolean; // 사용자가 직접 켠 데모 모드: 앱 안 대본·예시 기록 사용
  serverStreak?: number | null; // 서버 /home 의 연속 출석 (있으면 이 값)
};

const initial: State = {
  soundEffects: true,
  pack: 'ko',
  lang: 'en',
  languageSelected: false,
  char: 'seoyun',
  persona: 'calm',
  coins: 0,
  subscribed: false,
  owned: ['long', 'cafe'],
  wearing: { 옷: 'knit', 머리: 'long', 배경: 'cafe' },
  mistakes: [],
  onboarded: false,
  lastPlayed: null,
  lastResult: null,
  history: [],
  studyDays: [],
  demo: false,
};

const KEY = 'malo.store.v1';

export const today = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dayBefore = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return today(new Date(y, m - 1, d - 1));
};

// 오늘(또는 어제)까지 끊기지 않고 이어진 날 수
export function streakOf(days: string[], now = today()): number {
  const set = new Set(days);
  let cur = set.has(now) ? now : dayBefore(now);
  let n = 0;
  while (set.has(cur)) {
    n++;
    cur = dayBefore(cur);
  }
  return n;
}

// 데모 모드를 켜면 넣는 예시 기록 (발표용)
function demoSeed(): Partial<State> {
  const days: string[] = [];
  let d = today();
  for (let i = 0; i < 6; i++) {
    d = dayBefore(d);
    days.push(d);
  }
  return {
    coins: 1240,
    owned: ['dress', 'long', 'cafe'],
    studyDays: days,
    history: days.map((x, i) => ({ date: x, sceneId: 'seoyun-weekend', title: '주말 약속 정하기', score: [84, 80, 78, 68, 70, 62][i] })),
    mistakes: [
      { id: 'demo-m2', scene: 'seoyun-weekend', title: '주말 약속 정하기', who: '서윤 · 장난', when: '어제', said: '아무거나.', better: '토요일 점심에 전시 보러 갈래? 너는 뭐 하고 싶어?', why: '"아무거나"는 관심 없다는 말처럼 들려요.', fixed: false, line: '주말에 뭐 해?' },
      { id: 'demo-m3', scene: 'prof-question', title: '수업 질문하기', who: '윤 교수 · 차분', when: '10.28', said: '그거 시험에 나와요?', better: '이 부분 더 공부해 보고 싶은데, 참고할 자료가 있을까요?', why: '시험에만 관심 있는 것처럼 들려요.', fixed: true, line: '네, 무슨 질문 있어요?' },
    ],
  };
}

type Ctx = State & {
  hydrated: boolean;
  streak: number;
  set: (p: Partial<State>) => void;
  addCoins: (n: number) => void;
  addMistake: (m: Mistake) => void;
  completeScene: (r: Omit<LastResult, 'streakDays' | 'newDay'> & { score: number | null }) => LastResult;
  setDemo: (on: boolean) => void;
};
const Store = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [s, setS] = useState<State>(initial);
  const [hydrated, setHydrated] = useState(false);
  // Record sync depends on this callback. A new function after every response restarts the fetch effect.
  const set = useCallback((p: Partial<State>) => setS(o => ({ ...o, ...p, pack: 'ko' })), []);
  const ref = useRef(s);
  useEffect(() => {
    ref.current = s;
  }, [s]);

  // 시작할 때 저장된 상태 불러오기
  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (raw) {
          const saved = JSON.parse(raw);
          setS({ ...initial, ...saved, pack: 'ko', lang: ['ko', 'ja', 'en', 'zh'].includes(saved.lang) ? saved.lang : 'en' });
        }
      })
      .catch(() => null)
      .finally(() => setHydrated(true));
  }, []);

  // 바뀔 때마다 저장 (불러오기 전에는 덮어쓰지 않아요)
  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(KEY, JSON.stringify(s)).catch(() => null);
  }, [s, hydrated]);

  const value = useMemo<Ctx>(
    () => ({
      ...s,
      hydrated,
      streak: !s.demo && s.serverStreak != null ? s.serverStreak : streakOf(s.studyDays),
      set,
      addCoins: (n) => setS((o) => ({ ...o, coins: Math.max(0, o.coins + n) })),
      addMistake: (m) => setS((o) => ({ ...o, mistakes: [m, ...o.mistakes.filter((x) => x.id !== m.id)] })),
      completeScene: ({ score, ...r }) => {
        const o = ref.current;
        const t = today();
        const newDay = !o.studyDays.includes(t);
        const studyDays = newDay ? [...o.studyDays, t] : o.studyDays;
        const res: LastResult = { ...r, newDay, streakDays: streakOf(studyDays) };
        setS((p) => ({
          ...p,
          studyDays,
          coins: p.coins + r.coins,
          history: [...p.history, { date: t, sceneId: r.sceneId, title: r.title, score }],
          lastResult: res,
          lastPlayed: p.lastPlayed ? { ...p.lastPlayed, status: 'done', nextSceneId: r.nextSceneId, progress: undefined, at: new Date().toISOString() } : p.lastPlayed,
        }));
        return res;
      },
      setDemo: (on) => setS((o) => (on ? { ...o, demo: true, ...(o.history.length || o.mistakes.length ? {} : demoSeed()) } : { ...o, demo: false })),
    }),
    [s, hydrated, set],
  );
  return <Store.Provider value={value}>{children}</Store.Provider>;
}

export function useStore() {
  const c = useContext(Store);
  if (!c) throw new Error('StoreProvider missing');
  return c;
}
