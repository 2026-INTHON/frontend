import { api, absUrl, ApiError, Briefing, HintRes, PlaySession, RawCue, Render, SubmitTurnResult } from './api';
import { judge } from './judge';
import { CharId, Cue, Line, PersonaId, Place, PLACE_OF, SERVER_CHAR, SERVER_PERSONA, Scene, charFromServer, lineFor, personaFromServer, sceneById, sceneForChar } from './data';

// 장면 진행 엔진.
// - live: 서버가 대화를 진행하고 판정해요. 오류가 나도 앱 안 대본으로 몰래 바꾸지 않아요.
// - mock: 사용자가 설정에서 '데모 모드'를 켰을 때만 쓰는 앱 안 대본.

export type Mark = 'O' | '△' | 'X' | '?';
export const MARK_LABEL: Record<Mark, string> = { O: '통했어', '△': '더 말해 줘', X: '말실수', '?': '다시 말해 줘' };

export type View3 = { who: string; meaning: string; cue: string };
export type Out = {
  mark: Mark; // 캐릭터 반응 O △ X ?
  label: string; // 판정 한 단어
  ok: boolean;
  native: boolean; // 모국어로 답함 → 한국어 표현 보여 주고 다시
  voice: boolean; // 음성으로 답했는지 (텍스트면 속도·망설임·말끝을 안 보여 줘요)
  reply: string;
  replyLine: Line; // 반응 대사 (자막·음성 포함)
  render: string | null; // 반응 표정 이미지 URL
  lifeDelta: number;
  tone: string | null;
  speed: string | null;
  hesitation: string | null;
  ending: string | null;
  tip: string;
  better: string;
  why: string;
  whySub: string | null; // 사유 번역 (모국어)
  first?: string; // 다시 해서 맞혔을 때, 이 대사에 처음 했던 답
  tries: number; // 이 대사에서 연속으로 틀린 횟수
  views: View3[]; // 관점 전환
  advance: boolean; // △라도 서버가 다음으로 넘어가도 된다고 했는지
  done: boolean; // 장면이 끝났는지
  failed: boolean;
};
export type Final = {
  sessionId: string | null; // 서버 세션 (상세 보고서용)
  passed: boolean | null;
  grade: string | null;
  score: number | null;
  coins: number;
  mistakes: number;
  fixed: { said: string; better: string }[];
  best: string;
  worst: string;
  reach: number | null;
  infer: number | null;
  self: number | null;
  ending: { kind: string; title: string; text: string } | null;
  nextSceneId: string | null;
};
export type Hint = { clue: { k: string; v: string }[]; thought: string | null; tip: string | null };
export type Brief = { partner: string; situation: string; goal: string; translation?: Briefing['translation'] };

export interface Engine {
  mode: 'live' | 'mock';
  sceneId: string;
  char: CharId;
  persona: PersonaId;
  place: Place;
  bg: string | null; // 서버 배경 URL (없으면 앱 배경)
  title: string;
  no: string;
  brief: Brief;
  line: Line;
  render: string | null; // 지금 대사의 표정 이미지 URL
  lives: number;
  maxLives: number;
  progress(): string | undefined;
  hint(step: 1 | 2): Promise<Hint>;
  submit(text: string, voice?: { transcriptId?: string }): Promise<Out>;
  next(): void; // 다음 대사로
  skip(): boolean; // 데모 모드에서만: △ 그대로 진행 / 정답 보고 넘어가기 (true 면 장면 끝)
  canSkip: boolean;
  transcribe(uri: string | null): Promise<{ text: string; transcriptId?: string }>;
  voiceUrl(l?: Line): Promise<string | null>; // 대사 음성 (반응이면 그 턴, 아니면 지금 노드)
  final(): Promise<Final>;
  pause(): void;
}

export class SceneError extends Error {
  constructor(
    public kind: 'not_found' | 'network' | 'server' | 'unavailable',
    msg: string,
  ) {
    super(msg);
  }
}

const gradeOf = (score: number) => (score >= 95 ? 'A+' : score >= 85 ? 'A' : score >= 75 ? 'A-' : score >= 65 ? 'B' : 'C');
const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Math.round(n)));
const turnId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

// ---- 서버 단서 정리 ----
const CUE_KO: Record<string, Cue['k']> = { expression: '표정', face: '표정', intonation: '억양', tone: '억양', hesitation: '망설임', silence: '침묵', pause: '침묵', action: '행동', gesture: '행동' };
export function normCues(list?: RawCue[] | null): { k: string; v: string }[] {
  return (list ?? [])
    .map((c) => {
      if (typeof c === 'string') return { k: '단서', v: c };
      const k = c.k ?? c.kind ?? c.type ?? c.label ?? '단서';
      return { k: CUE_KO[k] ?? k, v: c.v ?? c.text ?? c.value ?? c.description ?? '' };
    })
    .filter((c) => c.v);
}
const img = (r?: Render | null) => (r?.imageUrl ? absUrl(r.imageUrl) : null);

// ================= 데모 모드 (앱 안 대본) =================
type Track = { pass: number; total: number; h1: number; h2: number; native: number; impolite: number; mistakes: number; best: string; worst: string; fixed: { said: string; better: string }[] };
const newTrack = (total: number): Track => ({ pass: 0, total, h1: 0, h2: 0, native: 0, impolite: 0, mistakes: 0, best: '', worst: '', fixed: [] });
const scoreOf = (t: Track) => {
  const reach = clamp((t.pass / Math.max(1, t.total)) * 100);
  const infer = clamp(100 - t.h1 * 15 - t.h2 * 25, 30);
  const self = clamp(100 - t.native * 25 - t.impolite * 15, 30);
  return { reach, infer, self, score: reach * 0.5 + infer * 0.25 + self * 0.25 - t.mistakes * 5 };
};

export function mockEngine(scene: Scene, persona: PersonaId = 'calm', pack: 'ko' | 'en' = 'ko'): Engine {
  let i = 0;
  let wrong = 0;
  let first: string | undefined;
  const st = newTrack(scene.turns.length);
  const polite = scene.char === 'boss' || scene.char === 'prof';
  // 데모 음성 인식: 첫 시도는 일부러 말실수 문장, 그다음은 좋은 문장
  const sample = () => (scene.id === 'boss-report' && i === 0 && st.mistakes === 0 ? '아직 못 했는데요. 일이 너무 많아서요.' : scene.turns[i].sample);
  const e: Engine = {
    mode: 'mock',
    sceneId: scene.id,
    char: scene.char,
    persona,
    place: scene.place,
    bg: null,
    title: scene.title,
    no: scene.no,
    brief: { partner: '', situation: scene.situation, goal: scene.goal },
    line: lineFor(scene.turns[0], persona),
    render: null,
    lives: 3,
    maxLives: 3,
    canSkip: true,
    progress: () => `${i + 1}/${scene.turns.length} 대사`,
    async hint(step) {
      const t = scene.turns[i];
      if (step === 1) st.h1++;
      else st.h2++;
      return { clue: [{ k: '주목 표현', v: t.clue.focus }, { k: '행동', v: t.clue.act }, { k: '상황 단서', v: t.clue.ctx }], thought: step === 2 ? t.thought : null, tip: step === 2 ? t.tip : null };
    },
    async submit(text, voice) {
      const turn = scene.turns[i];
      const v = judge(turn, text, pack);
      if (first === undefined) first = text;
      const prevFirst = first;
      const retried = wrong > 0;
      if (v.native) st.native++;
      else if (polite && !v.polite) st.impolite++;
      if (v.ok) {
        if (retried && prevFirst) st.fixed.push({ said: prevFirst, better: text });
        st.best = text;
        st.pass++;
      } else {
        wrong++;
        if (v.mark === 'X' && !v.native) {
          st.worst = text;
          st.mistakes++;
          e.lives--;
        }
      }
      const mark: Mark = v.native ? '?' : v.mark;
      const reply = v.native ? '…응? 한국어로 다시 말해 줄래?' : v.mark === 'O' ? turn.goodReply : v.mark === '△' ? turn.midReply : turn.badReply;
      return {
        mark,
        label: v.native ? '모국어로 답했어요' : MARK_LABEL[mark],
        ok: v.ok,
        native: v.native,
        voice: !!voice,
        reply,
        replyLine: { line: reply },
        render: null,
        lifeDelta: v.mark === 'X' && !v.native ? -1 : 0,
        tone: v.tone,
        speed: v.speed,
        hesitation: v.hesitation,
        ending: v.ending,
        tip: v.tip,
        better: turn.better,
        why: v.native ? '한국어로 답하면 상대가 바로 알아들어요. 아래 표현을 따라 말해 보세요.' : v.mark === '△' ? '틀린 말은 아니지만, 상대가 원하는 답이 조금 빠졌어요.' : turn.badWhy,
        whySub: null,
        first: v.ok && retried ? prevFirst : undefined,
        tries: v.ok ? 0 : wrong,
        views: turn.views,
        advance: false,
        done: v.ok && i + 1 >= scene.turns.length,
        failed: e.lives <= 0,
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
    async transcribe() {
      await new Promise((r) => setTimeout(r, 1400));
      return { text: sample() };
    },
    async voiceUrl() {
      return null;
    },
    async final() {
      const s = scoreOf(st);
      return { sessionId: null, passed: true, grade: gradeOf(s.score), score: Math.round(s.score), best: st.best, worst: st.worst, coins: 30, mistakes: st.mistakes, fixed: st.fixed, reach: s.reach, infer: s.infer, self: s.self, ending: null, nextSceneId: null };
    },
    pause() {},
  };
  return e;
}

// ================= 서버 모드 =================
const wrapErr = (err: unknown): SceneError => {
  if (err instanceof SceneError) return err;
  if (err instanceof ApiError) return err.status === 404 ? new SceneError('not_found', '장면을 찾지 못했어요.') : new SceneError('server', err.message || '서버에서 오류가 났어요.');
  return new SceneError('network', '서버에 연결하지 못했어요.');
};

// 홈 '오늘의 장면': 내 캐릭터의 진행 중/열린 장면을 서버 챕터에서 찾아요
export async function resolveTodayScene(char: CharId, persona: PersonaId, pack: 'ko' | 'en'): Promise<{ sceneId: string; title: string } | null> {
  const chapters = await api.chapters({ pack, characterId: SERVER_CHAR[char] });
  const subs = chapters.filter((c) => !c.locked && c.generationStatus !== 'generating').flatMap((c) => c.subs ?? []);
  const ok = (s: (typeof subs)[number]) => !!s.sceneId && (s.availability ?? 'ready') === 'ready' && s.state !== 'locked';
  const pick = subs.find((s) => ok(s) && s.state === 'now') ?? subs.find((s) => ok(s) && s.state === 'open') ?? subs.find(ok);
  if (pick?.sceneId) return { sceneId: pick.sceneId, title: pick.title };
  // 챕터가 비어 있으면 공개 장면 목록에서 같은 캐릭터·성격
  // 짧은 예시보다 8회 교육과정(gf-1-1, prof-1-1 등)을 먼저
  const list = await api.scenes({ pack, characterId: SERVER_CHAR[char] });
  const best = list.find((x) => x.source === 'curriculum') ?? list.find((x) => x.personalityId === SERVER_PERSONA[persona]) ?? list[0];
  return best ? { sceneId: best.id, title: best.title } : null;
}

export async function liveEngine(sceneId: string, o: { pack: 'ko' | 'en'; lang: string; char: CharId; persona: PersonaId }): Promise<Engine> {
  let ses: PlaySession;
  try {
    let id = sceneId;
    if (id === 'today') {
      const t = await resolveTodayScene(o.char, o.persona, o.pack);
      if (!t) throw new SceneError('unavailable', '지금 할 수 있는 장면이 없어요.');
      id = t.sceneId;
    }
    ses = await api.start(id, { personalityId: SERVER_PERSONA[o.persona], subtitleLanguage: o.lang });
  } catch (err) {
    throw wrapErr(err);
  }
  let last: SubmitTurnResult | null = null;
  let pending: PlaySession | null = null;
  let wrong = 0;
  let first: string | undefined;
  let clientTurn: { id: string; text: string } | null = null;
  const t = { mistakes: 0, best: '', worst: '', fixed: [] as { said: string; better: string }[] };
  const char = charFromServer(ses.characterId, o.char);
  const lineOf = (s: PlaySession): Line => ({ line: s.npc.text, action: s.npc.action ?? undefined, cues: normCues(s.npc.cues) as Cue[], sub: s.npc.subtitle?.text ?? null, audio: s.npc.audioUrl ? absUrl(s.npc.audioUrl) : null });

  const e: Engine = {
    mode: 'live',
    sceneId: ses.sceneId,
    char,
    persona: personaFromServer(ses.personalityId, o.persona),
    place: PLACE_OF[char],
    bg: ses.backgroundUrl ? absUrl(ses.backgroundUrl) : null,
    title: ses.briefing?.title ?? '',
    no: '',
    brief: { partner: ses.briefing?.partner ?? '', situation: ses.briefing?.situation ?? '', goal: ses.briefing?.goal ?? '', translation: ses.briefing?.translation ?? null },
    line: lineOf(ses),
    render: img(ses.npc.render),
    lives: ses.lives,
    maxLives: ses.initialLives || 3,
    canSkip: false,
    progress: () => (ses.nodeCount ? `${Math.min(ses.nodeIndex + 1, ses.nodeCount)}/${ses.nodeCount} 대사` : undefined),
    async hint(step) {
      // 1단계는 단서만, 2단계에서 속마음·팁. 빈 body 는 보내지 않아요.
      const h: HintRes = await api.hint(ses.id, step);
      return { clue: normCues(h.clue), thought: h.hiddenThought ?? null, tip: h.tip ?? null };
    },
    async submit(text, voice) {
      // 같은 답을 다시 보낼 땐 같은 clientTurnId, 답을 고치면 새 ID
      if (!clientTurn || clientTurn.text !== text) clientTurn = { id: turnId(), text };
      let r: SubmitTurnResult;
      try {
        r = await api.turn(ses.id, { clientTurnId: clientTurn.id, inputType: voice ? 'voice' : 'text', text, transcriptId: voice?.transcriptId });
      } catch (err) {
        throw wrapErr(err); // clientTurn 은 그대로 둬서 다시 보내면 같은 ID
      }
      clientTurn = null;
      last = r;
      pending = r.session;
      e.lives = r.session.lives; // 체력은 서버 값 그대로
      const ev = r.turn.evaluation;
      const mark: Mark = ev?.mark ?? (r.turn.outcome === 'correct' ? 'O' : r.turn.outcome === 'clarify' ? '△' : r.turn.outcome ? 'X' : '?');
      const ok = mark === 'O';
      const native = !!r.turn.native;
      if (first === undefined) first = text;
      const prevFirst = r.turn.comparison?.firstAnswer ?? first;
      const retried = wrong > 0 || !!r.turn.comparison;
      if (ok) {
        if (retried && prevFirst && prevFirst !== text) t.fixed.push({ said: prevFirst, better: text });
        t.best = text;
        wrong = 0;
        first = undefined;
      } else {
        wrong++;
        if (mark === 'X') {
          t.mistakes++;
          t.worst = text;
        }
      }
      const f = r.turn.feedback ?? ({} as SubmitTurnResult['turn']['feedback']);
      const isVoice = !!voice;
      return {
        mark,
        label: native ? '모국어로 답했어요' : ev?.label || MARK_LABEL[mark],
        ok,
        native,
        voice: isVoice,
        reply: r.turn.npcReply,
        replyLine: { line: r.turn.npcReply, sub: r.turn.npcReplySubtitle?.text ?? null, audio: r.turn.audioUrl ? absUrl(r.turn.audioUrl) : null, turnId: r.turn.id },
        render: img(r.turn.render),
        lifeDelta: r.turn.lifeDelta ?? 0,
        tone: f.tone?.label ?? null,
        // 서버가 측정하지 않은 값은 지어내지 않아요
        speed: isVoice ? (f.speed ? `${f.speed.value} ${f.speed.unit}` : '측정 안 함') : null,
        hesitation: isVoice ? (f.hesitation ? `"음…" ${f.hesitation.fillerCount}번 · 멈춤 ${f.hesitation.pauseCount}번` : '측정 안 함') : null,
        ending: isVoice ? (typeof f.ending === 'string' ? f.ending : (f.ending?.label ?? '측정 안 함')) : null,
        tip: f.message ?? '',
        better: f.betterExpression ?? '',
        why: ev?.reason ?? f.reason ?? '',
        whySub: ev?.reasonSubtitle?.text ?? null,
        first: ok && retried ? prevFirst : undefined,
        tries: ok ? 0 : wrong,
        views: (f.views ?? []).map((v) => ({ who: v.who, meaning: v.meaning, cue: v.cue ?? '' })),
        advance: ok || (mark === '△' && ev?.progression === 'advance'),
        done: !!r.result || r.session.status === 'succeeded',
        failed: r.session.status === 'failed' || r.session.lives <= 0,
      };
    },
    next() {
      // 피드백을 닫은 다음 서버가 넘겨준 다음 대사를 보여 줘요
      wrong = 0;
      first = undefined;
      if (pending) {
        ses = pending;
        e.line = lineOf(ses);
        e.render = img(ses.npc.render) ?? e.render;
      }
      pending = null;
    },
    skip() {
      return false; // 서버 모드엔 건너뛰기가 없어요. 힌트 보고 다시 말해요.
    },
    async transcribe(uri) {
      if (!uri) throw new SceneError('unavailable', '녹음이 되지 않았어요.');
      const d = await api.transcribe(uri, o.pack);
      if (!d.text?.trim()) throw new SceneError('unavailable', '말소리를 듣지 못했어요.');
      return { text: d.text, transcriptId: d.transcriptId };
    },
    async voiceUrl(l) {
      // 다시 듣기·만료 시 재발급. 반응 대사는 그 턴의 음성만 (다음 노드 음성이 섞이지 않게)
      try {
        const a = await api.speech(ses.id, l?.turnId);
        return absUrl(a.audioUrl);
      } catch {
        return null;
      }
    },
    async final() {
      const r = last?.result ?? (await api.result(ses.id));
      const a = r.achievement ?? null;
      return {
        sessionId: ses.id,
        passed: r.passed,
        grade: r.grade ?? (r.score != null ? gradeOf(r.score) : null),
        score: r.score ?? null,
        reach: a?.reach ?? null,
        infer: a?.infer ?? null,
        self: a?.self ?? null,
        best: r.goodUtterances?.[0]?.text ?? t.best,
        worst: r.improvableUtterances?.[0]?.text ?? t.worst,
        fixed: t.fixed.length ? t.fixed : (r.improvableUtterances ?? []).slice(0, 2).map((u) => ({ said: u.text, better: u.betterExpression })),
        coins: r.rewardCoins ?? 0,
        mistakes: t.mistakes,
        ending: r.ending ? { kind: r.ending.kind, title: r.ending.title, text: r.ending.text } : null,
        nextSceneId: r.nextSceneId ?? null,
      };
    },
    pause() {
      api.pause(ses.id).catch(() => null);
    },
  };
  return e;
}

// 데모 모드는 사용자가 직접 켰을 때만. 서버 오류 때 자동으로 바꾸지 않아요.
export async function createEngine(sceneId: string, o: { demo: boolean; pack: 'ko' | 'en'; lang: string; char: CharId; persona: PersonaId }): Promise<Engine> {
  if (o.demo) {
    const local = sceneId === 'today' ? sceneForChar(o.char) : sceneById(sceneId);
    if (!local) throw new SceneError('not_found', '데모 대본에 없는 장면이에요.');
    return mockEngine(local, o.persona, o.pack);
  }
  return liveEngine(sceneId, o);
}
