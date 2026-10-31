import React, { createContext, useContext, useMemo, useState } from 'react';
import type { CharId, PersonaId } from './data';

export type Mistake = { id: string; scene: string; title: string; said: string; better: string; why: string; when: string; fixed: boolean; line: string; who: string };

type State = {
  pack: 'ko' | 'en';
  lang: string;
  char: CharId;
  persona: PersonaId;
  coins: number;
  subscribed: boolean;
  owned: string[];
  wearing: Record<string, string>;
  mistakes: Mistake[];
  onboarded: boolean;
  lastScene: string | null;
  streakClaimed: boolean; // 연속 출석 보상은 하루 한 번만
};

const initial: State = {
  pack: 'ko',
  lang: 'en',
  char: 'boss',
  persona: 'picky',
  coins: 1240,
  subscribed: false,
  owned: ['dress', 'long', 'cafe'],
  wearing: { 옷: 'knit', 머리: 'long', 배경: 'cafe' },
  mistakes: [
    { id: 'm2', scene: '첫 카페 데이트', title: '첫 카페 데이트', who: '서윤 · 장난', when: '어제', said: '아무거나.', better: '난 아이스 라떼! 너는 뭐 마실래?', why: '"아무거나"는 관심 없다는 말처럼 들려요.', fixed: false, line: '뭐 마실래?' },
    { id: 'm3', scene: '수업 질문하기', title: '수업 질문하기', who: '윤 교수 · 차분', when: '10.28', said: '그거 시험에 나와요?', better: '이 부분 더 공부해 보고 싶은데, 참고할 자료가 있을까요?', why: '시험에만 관심 있는 것처럼 들려요.', fixed: true, line: '네, 무슨 질문 있어요?' },
  ],
  onboarded: false,
  lastScene: null,
  streakClaimed: false,
};

type Ctx = State & { set: (p: Partial<State>) => void; addCoins: (n: number) => void; addMistake: (m: Mistake) => void };
const Store = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [s, setS] = useState<State>(initial);
  const value = useMemo<Ctx>(
    () => ({
      ...s,
      set: (p) => setS((o) => ({ ...o, ...p })),
      addCoins: (n) => setS((o) => ({ ...o, coins: o.coins + n })),
      addMistake: (m) => setS((o) => ({ ...o, mistakes: [m, ...o.mistakes.filter((x) => x.id !== m.id)] })),
    }),
    [s],
  );
  return <Store.Provider value={value}>{children}</Store.Provider>;
}

export function useStore() {
  const c = useContext(Store);
  if (!c) throw new Error('StoreProvider missing');
  return c;
}
