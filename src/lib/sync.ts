import { useEffect } from 'react';
import { AppState } from 'react-native';
import { api } from './api';
import { today, useStore, type DayRecord, type Mistake } from './store';

// 서버 기록 → 앱 화면 (FE_INTEGRATION 「데이터 원본 교체」: /home, /records, /wallet, /mistakes)
// 서버에 닿으면 서버 값이 원본이에요. 못 닿으면 기기에 저장된 값을 그대로 보여 줘요.
// 응답 형식이 조금 달라도 받도록 이름 후보를 여러 개 봐요.

type Any = Record<string, any>;
const arr = (d: any): Any[] => (Array.isArray(d) ? d : Array.isArray(d?.items) ? d.items : Array.isArray(d?.records) ? d.records : Array.isArray(d?.mistakes) ? d.mistakes : []);
const dateOf = (v: any) => (typeof v === 'string' && v.length >= 10 ? (v.length === 10 ? v : today(new Date(v))) : null);
const whenOf = (v: any) => {
  const d = dateOf(v);
  if (!d) return '';
  if (d === today()) return '오늘';
  const [, m, day] = d.split('-');
  return `${Number(m)}.${Number(day)}`;
};

export function mapMistake(m: Any): Mistake {
  return {
    id: String(m.id ?? m.mistakeId),
    scene: String(m.sceneId ?? m.scene ?? ''),
    title: m.sceneTitle ?? m.title ?? '장면',
    said: m.learnerText ?? m.said ?? m.text ?? '',
    better: m.betterExpression ?? m.better ?? m.alternativeExpression ?? '',
    why: m.reason ?? m.why ?? m.feedback ?? '',
    when: whenOf(m.createdAt ?? m.at),
    fixed: !!(m.fixed ?? m.resolved ?? m.corrected),
    line: m.npcText ?? m.line ?? '',
    who: m.characterName ?? m.who ?? '',
  };
}

export async function fetchRecords() {
  const [wallet, mistakes, records, home] = await Promise.allSettled([api.get<Any>('/wallet'), api.get<any>('/mistakes'), api.get<any>('/records'), api.get<Any>('/home')]);
  const out: { coins?: number; mistakes?: Mistake[]; history?: DayRecord[]; studyDays?: string[]; serverStreak?: number | null } = {};
  if (wallet.status === 'fulfilled') {
    const w = wallet.value ?? {};
    const c = w.coins ?? w.balance ?? w.coin ?? w.wallet?.coins;
    if (typeof c === 'number') out.coins = c;
  }
  if (mistakes.status === 'fulfilled') out.mistakes = arr(mistakes.value).map(mapMistake).filter((m) => m.id && m.said);
  if (records.status === 'fulfilled') {
    const rows = arr(records.value);
    out.history = rows
      .map((r) => ({ date: dateOf(r.completedAt ?? r.date ?? r.createdAt) ?? today(), sceneId: String(r.sceneId ?? ''), title: r.sceneTitle ?? r.title ?? '장면', score: typeof r.score === 'number' ? r.score : null }))
      .filter((r) => r.sceneId || r.title);
    out.studyDays = [...new Set(out.history.map((h) => h.date))];
  }
  if (home.status === 'fulfilled') {
    const h = home.value ?? {};
    const s = h.streak?.days ?? h.streakDays ?? (typeof h.streak === 'number' ? h.streak : undefined);
    if (typeof s === 'number') out.serverStreak = s;
    const c = h.coins ?? h.wallet?.coins;
    if (out.coins == null && typeof c === 'number') out.coins = c;
  }
  return out;
}

// 탭 화면이 보일 때·앱으로 돌아올 때 서버 기록을 다시 읽어요 (데모 모드는 건너뜀)
export function useServerRecords() {
  const st = useStore();
  const { demo, set } = st;
  useEffect(() => {
    if (demo) return;
    let alive = true;
    const run = () =>
      fetchRecords()
        .then((r) => alive && Object.keys(r).length && set(r))
        .catch(() => null);
    run();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && run());
    return () => {
      alive = false;
      sub.remove();
    };
  }, [demo, set]);
}
