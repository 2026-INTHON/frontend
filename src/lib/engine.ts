import { api, absUrl, PlaySession, SubmitTurnResult } from './api';
import { judge, Mark } from './judge';
import { CharId, Line, PersonaId, Place, Scene, lineFor } from './data';

// 장면 진행 엔진. 서버(live)가 되면 서버로, 안 되면 앱 안의 고정 대본(mock)으로 돌아가요.
export type View3 = { who: string; meaning: string; cue: string };
export type Out = {
  mark: Mark; // 캐릭터 반응 O △ X
  ok: boolean;
  native: boolean; // 모국어로 답함 → 한국어 표현 보여 주고 다시
  reply: string;
  lifeDelta: number;
  tone: string;
  speed: string;
  hesitation: string;
  ending: string;
  tip: string;
  better: string;
  why: string;
  first?: string; // 다시 해서 맞혔을 때, 이 대사에 처음 했던 답
  tries: number; // 이 대사에서 연속으로 틀린 횟수
  views: View3[]; // 관점 전환
  done: boolean; // 장면이 끝났는지
  failed: boolean;
};
export type Final = { grade: string; best: string; worst: string; coins: number; mistakes: number; fixed: number; reach: number; infer: number; self: number };
export type Hint = { clue: { k: string; v: string }[]; thought: string; tip: string };

export interface Engine {
  mode: 'live' | 'mock';
  char: CharId;
  place: Place;
  title: string;
  no: string;
  brief: { partner: string; situation: string; goal: string };
  line: Line;
  lives: number;
  maxLives: number;
  hint(step: 1 | 2): Promise<Hint>;
  submit(text: string, voice?: { transcriptId?: string }): Promise<Out>;
  next(): void; // 다음 대사로 (mock 은 다음 턴, live 는 서버가 넘겨준 대사)
  skip(): boolean; // △ 그대로 진행 / 정답 보고 넘어가기 (true 면 장면 끝)
  canSkip: boolean;
  transcribe(uri: string | null, fallback: string): Promise<{ text: string; transcriptId?: string }>;
  voiceUrl(): Promise<string | null>;
  sample: string;
  final(): Promise<Final>;
}

const gradeOf = (score: number) => (score >= 95 ? 'A+' : score >= 85 ? 'A' : score >= 75 ? 'A-' : score >= 65 ? 'B' : 'C');
const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Math.round(n)));

// 성취도 3가지: 달성률 · 추론(힌트 덜 볼수록) · 자립 표현(모국어·반말 실수 적을수록)
type Track = { pass: number; total: number; h1: number; h2: number; native: number; impolite: number; mistakes: number; fixed: number; best: string; worst: string };
const newTrack = (total: number): Track => ({ pass: 0, total, h1: 0, h2: 0, native: 0, impolite: 0, mistakes: 0, fixed: 0, best: '', worst: '' });
const scoreOf = (t: Track) => {
  const reach = clamp((t.pass / Math.max(1, t.total)) * 100);
  const infer = clamp(100 - t.h1 * 15 - t.h2 * 25, 30);
  const self = clamp(100 - t.native * 25 - t.impolite * 15, 30);
  return { reach, infer, self, score: reach * 0.5 + infer * 0.25 + self * 0.25 - t.mistakes * 5 };
};

export function mockEngine(scene: Scene, persona: PersonaId = 'picky', pack: 'ko' | 'en' = 'ko'): Engine {
  let i = 0;
  let wrong = 0;
  let first: string | undefined;
  const st = newTrack(scene.turns.length);
  let lives = 3;
  const polite = scene.char === 'boss' || scene.char === 'prof';
  const e: Engine = {
    mode: 'mock',
    char: scene.char,
    place: scene.place,
    title: scene.title,
    no: scene.no,
    brief: { partner: '', situation: scene.situation, goal: scene.goal },
    line: lineFor(scene.turns[0], persona),
    lives: 3,
    maxLives: 3,
    canSkip: true,
    get sample() {
      // 첫 시도는 일부러 말실수 문장(데모용), 그다음은 좋은 문장
      return scene.id === 'boss-report' && i === 0 && st.mistakes === 0 ? '아직 못 했는데요. 일이 너무 많아서요.' : scene.turns[i].sample;
    },
    async hint(step) {
      const t = scene.turns[i];
      if (step === 1) st.h1++;
      else st.h2++;
      return { clue: [{ k: '주목 표현', v: t.clue.focus }, { k: '행동', v: t.clue.act }, { k: '상황 단서', v: t.clue.ctx }], thought: t.thought, tip: t.tip };
    },
    async submit(text) {
      const turn = scene.turns[i];
      const v = judge(turn, text, pack);
      if (first === undefined) first = text;
      const prevFirst = first;
      const retried = wrong > 0;
      if (v.native) st.native++;
      else if (polite && !v.polite) st.impolite++;
      if (v.ok) {
        if (retried) st.fixed++;
        st.best = text;
        st.pass++;
      } else {
        wrong++;
        if (v.mark === 'X') {
          st.worst = text;
          if (!v.native) {
            st.mistakes++;
            lives--;
            e.lives = lives;
          }
        }
      }
      return {
        ...v,
        reply: v.native ? '…응? 한국어로 다시 말해 줄래?' : v.mark === 'O' ? turn.goodReply : v.mark === '△' ? turn.midReply : turn.badReply,
        lifeDelta: v.mark === 'X' && !v.native ? -1 : 0,
        better: turn.better,
        why: v.native ? '한국어로 답하면 서윤·부장님이 바로 알아들어요. 아래 표현을 따라 말해 보세요.' : v.mark === '△' ? '틀린 말은 아니지만, 상대가 원하는 답이 조금 빠졌어요.' : turn.badWhy,
        first: v.ok && retried ? prevFirst : undefined,
        tries: v.ok ? 0 : wrong,
        views: turn.views,
        done: v.ok && i + 1 >= scene.turns.length,
        failed: lives <= 0,
      };
    },
    next() {
      if (i + 1 < scene.turns.length) i++;
      wrong = 0;
      first = undefined;
      e.line = lineFor(scene.turns[i], persona);
    },
    skip() {
      if (i + 1 >= scene.turns.length) return true;
      e.next();
      return false;
    },
    async transcribe(_uri, fallback) {
      await new Promise((r) => setTimeout(r, 1400));
      return { text: fallback };
    },
    async voiceUrl() {
      return null;
    },
    async final() {
      const s = scoreOf(st);
      return { grade: gradeOf(s.score), best: st.best, worst: st.worst, coins: 30, mistakes: st.mistakes, fixed: st.fixed, reach: s.reach, infer: s.infer, self: s.self };
    },
  };
  return e;
}

const guessChar = (id: string, fb: CharId): CharId => {
  const s = id.toLowerCase();
  if (/boss|manager|부장|team/.test(s)) return 'boss';
  if (/girl|gf|lover|seoyun|여자/.test(s)) return 'seoyun';
  if (/prof|교수/.test(s)) return 'prof';
  if (/friend|junho|친구/.test(s)) return 'junho';
  return fb;
};
const PLACE: Record<CharId, Place> = { boss: 'office', seoyun: 'cafe', prof: 'street', junho: 'street' };

export async function liveEngine(local: Scene, pack: 'ko' | 'en', persona: string): Promise<Engine> {
  await api.health();
  const list = await api.scenes({ pack });
  const pick = list.find((s) => guessChar(s.characterId, 'seoyun') === local.char && s.personalityId === persona) ?? list.find((s) => guessChar(s.characterId, 'seoyun') === local.char) ?? list[0];
  if (!pick) throw new Error('no scenes');
  let ses: PlaySession = await api.start(pick.id);
  let pendingLine: string | null = null;
  let last: SubmitTurnResult | null = null;
  const st = newTrack(Math.max(1, local.turns.length));
  let wrong = 0;
  let first: string | undefined;
  const char = guessChar(ses.characterId, local.char);
  const e: Engine = {
    mode: 'live',
    char,
    place: PLACE[char],
    title: pick.title,
    no: `SCENE ${String(1).padStart(2, '0')}`,
    brief: ses.briefing,
    line: { line: ses.npc.text },
    lives: ses.lives,
    maxLives: ses.initialLives || 3,
    sample: local.turns[0].sample,
    canSkip: false,
    async hint(step) {
      // 서버엔 아직 단계별 단서가 없어서 1단계 = tip, 2단계 = hiddenThought
      if (step === 1) st.h1++;
      else st.h2++;
      const h = await api.hint(ses.id);
      return { clue: [{ k: '단서', v: h.tip }], thought: h.hiddenThought, tip: h.tip };
    },
    async submit(text, voice) {
      const r = await api.turn(ses.id, { clientTurnId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, inputType: voice ? 'voice' : 'text', text, transcriptId: voice?.transcriptId });
      last = r;
      ses = r.session;
      e.lives = ses.lives;
      const mark: Mark = r.turn.outcome === 'correct' ? 'O' : r.turn.outcome === 'clarify' ? '△' : 'X';
      const ok = mark === 'O';
      const native = pack === 'ko' && !/[\uac00-\ud7a3]/.test(text);
      if (native) st.native++;
      if (first === undefined) first = text;
      const prevFirst = first;
      const retried = wrong > 0;
      if (ok) {
        if (retried) st.fixed++;
        st.best = text;
        st.pass++;
        wrong = 0;
        first = undefined;
      } else {
        wrong++;
        if (mark === 'X') {
          st.mistakes++;
          st.worst = text;
        }
      }
      pendingLine = ses.npc.text;
      const f = r.turn.feedback;
      return {
        mark,
        ok,
        native,
        first: ok && retried ? prevFirst : undefined,
        tries: ok ? 0 : wrong,
        views: [],
        reply: r.turn.npcReply,
        lifeDelta: r.turn.lifeDelta,
        tone: f.tone?.label ?? '—',
        speed: f.speed ? `${f.speed.value} ${f.speed.unit}` : '적당해요',
        hesitation: f.hesitation ? `"음…" ${f.hesitation.fillerCount}번` : '없어요',
        ending: '또렷하게 끝냈어요',
        tip: f.message,
        better: f.betterExpression,
        why: f.reason,
        done: ses.status === 'succeeded' || !!r.result,
        failed: ses.status === 'failed' || ses.lives <= 0,
      };
    },
    next() {
      wrong = 0;
      first = undefined;
      if (pendingLine) e.line = { line: pendingLine };
      pendingLine = null;
    },
    skip() {
      return false; // 서버 모드에선 같은 대사에 다시 답해요
    },
    async transcribe(uri, fallback) {
      if (!uri) return { text: fallback };
      const d = await api.transcribe(uri, pack);
      return { text: d.text, transcriptId: d.transcriptId };
    },
    async voiceUrl() {
      try {
        const a = await api.speech(ses.id);
        return absUrl(a.audioUrl);
      } catch {
        return null;
      }
    },
    async final() {
      const r = last?.result ?? (await api.result(ses.id));
      const s = scoreOf(st);
      return {
        reach: s.reach,
        infer: s.infer,
        self: s.self,
        grade: gradeOf(r.score),
        best: r.goodUtterances[0]?.text ?? st.best,
        worst: r.improvableUtterances[0]?.text ?? st.worst,
        coins: r.rewardCoins,
        mistakes: st.mistakes,
        fixed: st.fixed,
      };
    },
  };
  return e;
}

export async function createEngine(local: Scene, pack: 'ko' | 'en', persona: string): Promise<Engine> {
  try {
    return await liveEngine(local, pack, persona);
  } catch {
    return mockEngine(local, persona as PersonaId, pack);
  }
}
