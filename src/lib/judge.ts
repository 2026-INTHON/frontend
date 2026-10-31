import type { Turn } from './data';

export type Verdict = {
  ok: boolean;
  tone: string;
  speed: string;
  hesitation: string;
  ending: string;
  tip: string;
};

// AI(DeepSeek) 연결 전까지 쓰는 간단한 키워드 판정.
// 나중에 src/lib/api.ts 에서 서버 판정으로 바꾸면 돼요.
export function judge(turn: Turn, answer: string): Verdict {
  const a = answer.replace(/\s+/g, ' ');
  const bad = turn.bad.some((k) => a.includes(k));
  const good = turn.good.some((k) => a.includes(k));
  const ok = good && !bad;
  const hes = (a.match(/음|어\.\.\.|그\.\.\./g) || []).length;
  return {
    ok,
    tone: ok ? '공손하고 솔직해요' : '변명처럼 들려요',
    speed: '적당해요',
    hesitation: hes ? `"음…" ${hes}번` : '없어요',
    ending: /[?.요다]$/.test(a.trim()) ? '또렷하게 끝냈어요' : '말끝이 흐려요',
    tip: ok ? '"내일 오전 10시"처럼 시간을 콕 집으면 더 믿음직해요.' : turn.tip,
  };
}
