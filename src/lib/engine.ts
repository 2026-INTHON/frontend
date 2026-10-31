import { api, absUrl, PlaySession, SubmitTurnResult } from './api';
import { judge } from './judge';
import { CharId, Place, Scene } from './data';

// 장면 진행 엔진. 서버(live)가 되면 서버로, 안 되면 앱 안의 고정 대본(mock)으로 돌아가요.
export type Out = {
  ok: boolean;
  reply: string;
  lifeDelta: number;
  tone: string;
  speed: string;
  hesitation: string;
  ending: string;
  tip: string;
  better: string;
  why: string;
  done: boolean; // 장면이 끝났는지
  failed: boolean;
};
export type Final = { grade: string; best: string; worst: string; coins: number; mistakes: number; fixed: number };

export interface Engine {
  mode: 'live' | 'mock';
  char: CharId;
  place: Place;
  title: string;
  no: string;
  brief: { partner: string; situation: string; goal: string };
  line: { line: string; action?: string };
  lives: number;
  maxLives: number;
  hint(): Promise<{ thought: string; tip: string }>;
  submit(text: string, voice?: { transcriptId?: string }): Promise<Out>;
  next(): void; // 다음 대사로 (mock 은 다음 턴, live 는 서버가 넘겨준 대사)
  skip(): boolean; // 말실수 후 '계속하기' (true 면 장면 끝)
  transcribe(uri: string | null, fallback: string): Promise<{ text: string; transcriptId?: string }>;
  voiceUrl(): Promise<string | null>;
  sample: string;
  final(): Promise<Final>;
}

const gradeOf = (score: number) => (score >= 95 ? 'A+' : score >= 85 ? 'A' : score >= 75 ? 'A-' : score >= 65 ? 'B' : 'C');

export function mockEngine(scene: Scene): Engine {
  let i = 0;
  const st = { mistakes: 0, fixed: 0, best: '', worst: '', lives: 3 };
  const e: Engine = {
    mode: 'mock',
    char: scene.char,
    place: scene.place,
    title: scene.title,
    no: scene.no,
    brief: { partner: '', situation: scene.situation, goal: scene.goal },
    line: { line: scene.turns[0].line, action: scene.turns[0].action },
    lives: 3,
    maxLives: 3,
    get sample() {
      // 첫 시도는 일부러 말실수 문장(데모용), 그다음은 좋은 문장
      return scene.id === 'boss-report' && i === 0 && st.mistakes === 0 ? '아직 못 했는데요. 일이 너무 많아서요.' : scene.turns[i].sample;
    },
    async hint() {
      return { thought: scene.turns[i].thought, tip: scene.turns[i].tip };
    },
    async submit(text) {
      const turn = scene.turns[i];
      const v = judge(turn, text);
      if (v.ok) {
        if (st.mistakes) st.fixed++;
        st.best = text;
      } else {
        st.mistakes++;
        st.worst = text;
        st.lives--;
        e.lives = st.lives;
      }
      return { ...v, reply: v.ok ? turn.goodReply : turn.badReply, lifeDelta: v.ok ? 0 : -1, better: turn.better, why: turn.badWhy, done: v.ok && i + 1 >= scene.turns.length, failed: st.lives <= 0 };
    },
    next() {
      if (i + 1 < scene.turns.length) i++;
      e.line = { line: scene.turns[i].line, action: scene.turns[i].action };
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
      const m = st.mistakes;
      return { grade: m === 0 ? 'A+' : m === 1 ? 'A-' : m === 2 ? 'B' : 'C', best: st.best, worst: st.worst, coins: 30, mistakes: m, fixed: st.fixed };
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
  const st = { mistakes: 0, fixed: 0, best: '', worst: '' };
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
    async hint() {
      const h = await api.hint(ses.id);
      return { thought: h.hiddenThought, tip: h.tip };
    },
    async submit(text, voice) {
      const r = await api.turn(ses.id, { clientTurnId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, inputType: voice ? 'voice' : 'text', text, transcriptId: voice?.transcriptId });
      last = r;
      ses = r.session;
      e.lives = ses.lives;
      const ok = r.turn.outcome === 'correct';
      if (ok) {
        if (st.mistakes) st.fixed++;
        st.best = text;
      } else {
        st.mistakes++;
        st.worst = text;
      }
      pendingLine = ses.npc.text;
      const f = r.turn.feedback;
      return {
        ok,
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
      return {
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
    return mockEngine(local);
  }
}
