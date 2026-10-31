import type { Turn } from './data';

export type Mark = 'O' | '△' | 'X';
export type Verdict = {
  mark: Mark;
  ok: boolean;
  native: boolean; // 한국어팩인데 모국어로 답함
  polite: boolean; // 존댓말·부드러운 말끝
  tone: string;
  speed: string;
  hesitation: string;
  hesitationCount: number;
  ending: string;
  tip: string;
};

const HANGUL = /[가-힣]/;

// AI(DeepSeek) 연결 전까지 쓰는 간단한 키워드 판정.
// O = 좋은 표현만, X = 나쁜 표현(또는 모국어), △ = 그 외
export function judge(turn: Turn, answer: string, pack: 'ko' | 'en' = 'ko'): Verdict {
  const a = answer.replace(/\s+/g, ' ').trim();
  const native = pack === 'ko' ? !HANGUL.test(a) : /[가-힣]/.test(a) && !/[a-z]/i.test(a);
  const bad = turn.bad.some((k) => a.includes(k));
  const good = turn.good.some((k) => a.includes(k));
  const mark: Mark = native || bad ? 'X' : good ? 'O' : '△';
  const hes = (a.match(/음|어\.\.\.|그\.\.\./g) || []).length;
  const polite = /(요|니다|까요|세요)[?.!]?$/.test(a) || /(래|어|자|까)\?$/.test(a);
  return {
    mark,
    ok: mark === 'O',
    native,
    polite,
    tone: mark === 'O' ? '공손하고 솔직해요' : mark === '△' ? '뜻이 조금 흐려요' : '변명처럼 들려요',
    speed: '적당해요',
    hesitation: hes ? `"음…" ${hes}번` : '없어요',
    hesitationCount: hes,
    ending: /[?.요다]$/.test(a) ? '또렷하게 끝냈어요' : '말끝이 흐려요',
    tip: mark === 'O' ? '"내일 오전 10시"처럼 시간을 콕 집으면 더 믿음직해요.' : turn.tip,
  };
}
