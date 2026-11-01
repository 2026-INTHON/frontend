import { useEffect, useRef, useState } from 'react';
import { ImageBackground, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as haptic from '../../lib/haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Btn, Hearts, IconBtn, Sheet, T, Tag, FRAME } from '../../components/ui';
import { Dots, LineCard, ReactionBadge, Stat, Wave } from '../../components/scene-parts';
import { C, F } from '../../lib/theme';
import { IMG, Line, PERSONAS, PLACE_OF, charById } from '../../lib/data';
import { createEngine, Engine, Hint, Mark, Out, SceneError } from '../../lib/engine';
import { stopSpeak } from '../../lib/voice';
import { createAudioPlayer } from 'expo-audio';
import { useRec } from '../../lib/useRec';
import { RealtimeTranscriber, realtimeSupported } from '../../lib/realtime';
import { TurnRec, useStore } from '../../lib/store';
import { shareConversation } from '../../lib/share-log';
import { useLang, useT } from '../../lib/i18n';
import { reactionCopy, speechErrorCopy } from '../../lib/learning-copy';
import { CharacterActor } from '../../components/character-actor';

type Phase = 'brief' | 'talk' | 'typing' | 'listening' | 'recognizing' | 'recognized';
type Log = { who: 'char' | 'me'; text: string; mark?: Mark; line?: Line; audio?: string | null }; // line·audio: 내보내기용 음성
// 대사를 넘긴 뒤 남겨 두는 직전 반응 (작은 말풍선 + 판정 배지)
type Reaction = { text: string; sub?: string | null; mark: Mark };

const TONE: Record<string, string> = { office: 'rgba(220,224,229,0.35)', cafe: 'rgba(238,230,219,0.35)', street: 'rgba(217,222,232,0.35)' };

export default function SceneScreen() {
  const { id, retryOf } = useLocalSearchParams<{ id: string; retryOf?: string }>();
  const sceneId = String(id ?? 'today');
  const st = useStore();
  const ins = useSafeAreaInsets();
  const rec = useRec();
  const t = useT();
  const lang = useLang();

  const eng = useRef<Engine | null>(null);
  const [ready, setReady] = useState(false);
  const [phase, setPhase] = useState<Phase>('brief');
  const [hearts, setHearts] = useState(3);
  const [text, setText] = useState('');
  const [heard, setHeard] = useState('');
  const [tid, setTid] = useState<string | undefined>();
  const [editHeard, setEditHeard] = useState(false);
  const [out, setOut] = useState<Out | null>(null);
  const [answer, setAnswer] = useState('');
  const [line, setLine] = useState<Line>({ line: '' });
  const [lineMark, setLineMark] = useState<Mark | null>(null); // F안: 반응 말풍선 배지
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [sendErr, setSendErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [waitSec, setWaitSec] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [hint, setHint] = useState<Hint | null>(null);
  const [hintStep, setHintStep] = useState<1 | 2>(1);
  const [hintErr, setHintErr] = useState<string | null>(null);
  const [views, setViews] = useState(false);
  const [detail, setDetail] = useState(false); // 피드백 자세히 (대화를 막지 않고, 원할 때만 열어요)
  const [pause, setPause] = useState(false);
  const [history, setHistory] = useState(false);
  const [ended, setEnded] = useState(false); // 마지막 대사까지 끝남 → '결과 보기'
  const [react, setReact] = useState<Reaction | null>(null);
  const [judging, setJudging] = useState(false);
  const [hintNudge, setHintNudge] = useState(false);
  const [log, setLog] = useState<Log[]>([]);
  const [sharing, setSharing] = useState(false);
  const myAudio = useRef<string | null>(null); // 방금 녹음한 내 목소리 (파일 녹음일 때만)
  const holdAt = useRef(0);
  const sending = useRef(false);
  const finishing = useRef(false);
  const review = useRef<{ said: string; better: string; why: string }[]>([]); // 결과 화면 '복습할 표현'
  const turns = useRef<TurnRec[]>([]); // 결과 화면 '대화 다시 보기'
  // 웹 + 서버 모드면 녹음 중 전사, 안 되면 파일 녹음 후 전사
  const rt = useRef<RealtimeTranscriber | null>(null);
  const recMode = useRef<'rt' | 'file'>('file');
  const [preview, setPreview] = useState('');
  const [rtHeard, setRtHeard] = useState(false);
  const [rtStat, setRtStat] = useState({ ms: 0, level: -60 });
  const player = useRef<ReturnType<typeof createAudioPlayer> | null>(null);
  const voiceRequest = useRef(0);
  const loadRequest = useRef(0);

  const E = eng.current;
  const charId = E?.char ?? st.char;
  const ch = charById(charId);
  const personaId = E?.persona ?? st.persona;
  const persona = PERSONAS[charId].find((p) => p.id === personaId) ?? PERSONAS[charId][2];
  const place = E?.place ?? PLACE_OF[charId];

  // 장면 불러오기. 서버 오류면 오류 화면 (앱 안 대본으로 몰래 바꾸지 않아요)
  function load() {
    setLoadErr(null);
    setReady(false);
    return start();
  }
  function start() {
    const request = ++loadRequest.current;
    setReady(false);
    setLoadErr(null);
    setPhase('brief');
    setOut(null);
    setReact(null);
    setLineMark(null);
    setEnded(false);
    setDetail(false);
    setLog([]);
    finishing.current = false;
    review.current.length = 0;
    turns.current.length = 0;
    eng.current = null;
    createEngine(sceneId, { demo: st.demo, pack: st.pack, lang: st.lang, char: st.char, persona: st.persona, retryOf: retryOf ? String(retryOf) : undefined })
      .then((e) => {
        if (request !== loadRequest.current) return;
        eng.current = e;
        setHearts(e.lives);
        setLine(e.line);
        setReady(true);
        st.set({ lastPlayed: { sceneId: e.sceneId, title: e.title, lang: st.lang, char: e.char, persona: e.persona, status: 'playing', progress: e.progress(), at: new Date().toISOString() } });
      })
      .catch((err) => request === loadRequest.current && setLoadErr(err instanceof SceneError ? err.message : t('장면을 불러오지 못했어요. 다시 시도해 주세요.')));
  }
  function invalidateLoad() { loadRequest.current++; }
  useEffect(() => {
    if (!st.hydrated) return;
    start();
    return () => {
      invalidateLoad();
      voiceRequest.current++;
      stopSpeak();
      player.current?.remove();
      player.current = null;
      rt.current?.close();
      rt.current = null;
    };
  }, [sceneId, st.hydrated, st.demo, st.pack, st.lang, st.char, st.persona, retryOf]);

  const canRealtime = () => eng.current?.mode === 'live' && realtimeSupported();
  // 전사 세션은 micDown에서만 발급. 텍스트 대화·결과 화면에는 필요하지 않아요.
  // 녹음 중 시간·소리 크기
  useEffect(() => {
    if (phase !== 'listening' || recMode.current !== 'rt') return;
    const t0 = Date.now();
    const iv = setInterval(() => setRtStat({ ms: Date.now() - t0, level: rt.current?.level ?? -60 }), 120);
    return () => clearInterval(iv);
  }, [phase]);

  // 판정 기다리는 시간 (3초 넘으면 '생각 중', 5초 넘으면 '기다리는 중')
  useEffect(() => {
    if (!judging) return;
    const t0 = Date.now();
    const iv = setInterval(() => setWaitSec(Math.floor((Date.now() - t0) / 1000)), 500);
    return () => clearInterval(iv);
  }, [judging]);

  // 브리핑은 다 읽고 '대화 시작'을 눌러야 시작해요 (자동으로 넘어가지 않아요)
  function begin() {
    if (!eng.current) return;
    setPhase('talk');
    showLine(eng.current.line);
  }

  function showLine(l: Line) {
    setLine(l);
    setLineMark(null);
    setLog((g) => [...g, { who: 'char', text: l.line, line: l }]);
    play([l]);
  }

  // 실학습과 데모 모두 캐릭터 서버 음성. 여러 대사(반응 → 다음 대사)는 차례로 재생해요.
  // 늦게 도착한 이전 대사는 재생하지 않고, 녹음을 시작하면 바로 멈춰요.
  async function play(lines: Line[], refetch = false) {
    const request = ++voiceRequest.current;
    stopSpeak();
    player.current?.remove();
    player.current = null;
    setNotice(null);
    for (const ln of lines) {
      if (request !== voiceRequest.current) return;
      setPlaying(true);
      try {
        const url = !refetch && ln.audio ? ln.audio : await eng.current!.voiceUrl(ln);
        if (request !== voiceRequest.current) return;
        if (!url) throw new Error('VOICE_UNAVAILABLE');
        await new Promise<void>((resolve, reject) => {
          const pl = createAudioPlayer({ uri: url });
          player.current = pl;
          pl.addListener('playbackStatusUpdate', (st: any) => {
            if (request !== voiceRequest.current) return resolve();
            if (st.error) reject(new Error('VOICE_ERROR'));
            else if (st.didJustFinish) resolve();
          });
          pl.play();
        });
      } catch (error) {
        // 음성 생성량 초과(DAILY_QUOTA_EXCEEDED)면 자막으로 계속하라고, 그 밖엔 다시 듣기 안내
        if (request !== voiceRequest.current) return;
        setPlaying(false);
        setNotice(speechErrorCopy(error, lang));
        return;
      }
    }
    if (request === voiceRequest.current) setPlaying(false);
  }
  function stopPlay() {
    voiceRequest.current++;
    stopSpeak();
    player.current?.pause();
    setPlaying(false);
  }

  // ----- 말하기 -----
  async function micDown() {
    if (phase === 'listening') return micStop();
    holdAt.current = now();
    stopPlay();
    haptic.tap();
    setNotice(null);
    setPreview('');
    if (canRealtime()) {
      try {
        if (!rt.current) rt.current = new RealtimeTranscriber(st.pack);
        rt.current.onPreview = setPreview;
        rt.current.onAutoStop = () => micStop();
        await rt.current.start();
        recMode.current = 'rt';
        setRtStat({ ms: 0, level: -60 });
        setPhase('listening');
        return;
      } catch {
        rt.current?.close(); // 실시간이 안 되면 파일 녹음으로
      }
    }
    recMode.current = 'file';
    const ok = await rec.start();
    if (!ok) {
      setNotice(t('마이크를 켜지 못했어요. 직접 입력해 주세요.'));
      setPhase('typing');
      return;
    }
    setPhase('listening');
  }
  function micUp() {
    // 길게 눌렀다 떼면 끝, 짧게 탭했으면 다시 탭할 때 끝
    if (now() - holdAt.current > 450) micStop();
  }
  async function micStop() {
    if (recMode.current === 'rt') {
      setPhase('recognizing');
      try {
        const t = await rt.current!.stop();
        if (!t) throw new Error('empty');
        setHeard(t);
        setTid(undefined);
        setRtHeard(true);
        setEditHeard(false);
        setPhase('recognized');
      } catch {
        rt.current?.close();
        setNotice(t('잘 못 들었어요. 다시 말하거나 직접 입력해 주세요.'));
        setPhase('talk');
      }
      return;
    }
    setRtHeard(false);
    const uri = await rec.stop();
    myAudio.current = uri || null;
    setPhase('recognizing');
    const e = eng.current!;
    let r: { text: string; transcriptId?: string };
    try {
      r = await e.transcribe(uri);
    } catch (err) {
      // 가짜 문장으로 채우지 않고 다시 말하기·직접 입력으로
      setNotice(err instanceof SceneError ? `${err.message} ${t('다시 말하거나 직접 입력해 주세요.')}` : t('잘 못 들었어요. 다시 말하거나 직접 입력해 주세요.'));
      setPhase('talk');
      return;
    }
    setHeard(r.text);
    setTid(r.transcriptId);
    setEditHeard(false);
    setPhase('recognized');
  }

  // ----- 보내기 → 판정 -----
  // 판정이 오면 캐릭터 반응을 바로 보여 주고 대화를 이어가요. 피드백 시트는 자동으로 뜨지 않아요 (배지를 눌렀을 때만).
  async function send(a: string, voice?: boolean) {
    const ans = a.trim();
    if (!ans || sending.current || ended || !eng.current) return;
    sending.current = true; // 연타·엔터 반복으로 두 번 보내지 않게
    setAnswer(ans);
    setSendErr(null);
    setWaitSec(0);
    setJudging(true);
    const e = eng.current;
    const said = line.line;
    let o: Out;
    try {
      o = await e.submit(ans, voice ? { transcriptId: tid, realtime: rtHeard } : undefined);
    } catch (err) {
      // AI 오류: 체력 그대로, 같은 답을 다시 보낼 수 있게 (가짜 판정 없음)
      sending.current = false;
      setJudging(false);
      setSendErr(err instanceof SceneError ? err.message : t('답변을 보내지 못했어요.'));
      return;
    }
    sending.current = false;
    setText('');
    setJudging(false);
    setOut(o);
    setDetail(false);
    setHearts(e.lives);
    const mine = voice && !rtHeard ? myAudio.current : null;
    myAudio.current = null;
    setLog((g) => [...g, { who: 'me', text: ans, audio: mine }, { who: 'char', text: o.reply, mark: o.mark, line: o.replyLine }]);
    let mistakeId: string | undefined;
    if (o.ok) haptic.good();
    else {
      haptic.bad();
      if (o.better && !o.native) review.current.push({ said: ans, better: o.better, why: o.why });
      if (o.mark === 'X' && !o.native) {
        mistakeId = `${e.sceneId}-${now()}`;
        st.addMistake({ id: mistakeId, scene: e.sceneId, title: e.title, who: `${t(ch.name)} · ${t(persona.name)}`, when: t('오늘'), said: ans, better: o.better, why: o.why, fixed: false, line: said });
      }
    }
    turns.current.push({ npc: said, said: ans, mark: o.mark, reply: o.reply, why: o.why, whySub: o.whySub, better: o.better, tip: o.tip, emotion: o.emotion, mistakeId, views: o.views });
    // 장면 끝 (서버가 세션을 끝낸 경우 포함): 마지막 반응 + '결과 보기'
    if (o.done || o.failed) {
      setReact(null);
      setLine(o.replyLine);
      setLineMark(o.mark);
      setEnded(true);
      setPhase('talk');
      play([o.replyLine]);
      return;
    }
    if (e.mode === 'live') {
      // 서버: 캐릭터 반응(npcReply)이 곧 다음 대사예요. 세션만 맞추고 그 대사에 배지를 달아 보여 줘요 (같은 대사 두 번 X)
      e.next();
      setReact(null);
      setLine({ ...e.line, ...o.replyLine, audio: o.replyLine.audio ?? e.line.audio });
      setLineMark(o.mark);
      setHintNudge(!o.ok && o.tries >= 2);
      play([o.replyLine]);
      saveProgress();
    } else if (o.ok || o.advance) {
      // 반응은 작은 말풍선으로 남기고, 다음 대사를 바로 보여 줘요
      e.next();
      const nl = e.line;
      setReact({ text: o.reply, sub: o.replyLine.sub, mark: o.mark });
      setLine(nl);
      setLineMark(null);
      setHintNudge(false);
      setLog((g) => [...g, { who: 'char', text: nl.line, line: nl }]);
      play([o.replyLine, nl]);
      saveProgress();
    } else {
      // 아쉬운 답: 캐릭터가 되묻는 말이 지금 대사가 돼요. 다시 시도를 강요하지 않고 그대로 이어서 답해요.
      setReact(null);
      setLine(o.replyLine);
      setLineMark(o.mark);
      setHintNudge(o.tries >= 2);
      play([o.replyLine]);
    }
    setPhase((p) => (p === 'typing' ? 'typing' : 'talk'));
  }

  // 다시 말하기 (선택): 직전 답을 고쳐 말해요. 서버는 POST /correction 으로 그 턴의 대사로 되돌려 줘요.
  async function correctLast() {
    const e = eng.current;
    if (!e || sending.current) return;
    sending.current = true;
    setDetail(false);
    stopPlay();
    try {
      await e.correct();
      setReact(null);
      setOut(null);
      setLineMark(null);
      setLine(e.line);
      setHintNudge(true);
      setPhase('talk');
      saveProgress();
    } catch {
      setNotice(t('다시 말하기를 준비하지 못했어요. 잠시 후 다시 눌러 주세요.'));
    } finally {
      sending.current = false;
    }
  }

  // 대화 + 음성 전체 내역 내보내기 (캐릭터 음성은 서버에서 다시 받아 파일에 넣어요)
  async function exportLog() {
    const e = eng.current;
    if (!e || sharing || !log.length) return;
    setSharing(true);
    try {
      const entries = [];
      for (const m of log) {
        let audio: string | null = m.audio ?? null;
        if (m.who === 'char' && m.line) audio = m.line.audio ?? (await e.voiceUrl(m.line).catch(() => null));
        entries.push({ who: m.who, name: t(ch.name), text: m.text, sub: lang !== 'ko' ? m.line?.sub ?? null : null, mark: m.mark ?? null, audio });
      }
      const r = await shareConversation({
        title: [scene.no, scene.title].filter(Boolean).join(' · ') || t('대화 내역'),
        subtitle: `${t(ch.name)} · ${t(persona.name)}`,
        date: new Date().toLocaleString(),
        entries,
        labels: { me: t('나'), audioMissing: t('음성을 불러오지 못했어요'), footer: 'Malo' },
      });
      if (r === 'downloaded') setNotice(t('대화 내역 파일을 저장했어요.'));
      else if (r === 'text') setNotice(t('음성 없이 글만 공유했어요.'));
    } catch {
      setNotice(t('내보내지 못했어요. 다시 눌러 주세요.'));
    } finally {
      setSharing(false);
    }
  }

  function saveProgress(status: 'playing' | 'paused' = 'playing') {
    const e = eng.current;
    if (!e) return;
    st.set({ lastPlayed: { sceneId: e.sceneId, title: e.title, lang: st.lang, char: e.char, persona: e.persona, status, progress: e.progress(), at: new Date().toISOString() } });
  }

  // 속마음 힌트: 1단계 단서 → 2단계 속마음
  async function openHint() {
    if (!eng.current) return;
    setHintNudge(false);
    setHintStep(1);
    setHintErr(null);
    setHint({ clue: [], thought: null, tip: null });
    try {
      setHint(await eng.current.hint(1));
    } catch {
      setHintErr(t('힌트를 불러오지 못했어요.'));
    }
  }
  async function revealThought() {
    setHintErr(null);
    try {
      const h = await eng.current!.hint(2);
      setHint((o) => ({ clue: h.clue.length ? h.clue : (o?.clue ?? []), thought: h.thought, tip: h.tip }));
      setHintStep(2);
    } catch {
      setHintErr(t('속마음을 불러오지 못했어요. 다시 눌러 주세요.'));
    }
  }

  async function finish() {
    if (finishing.current || !eng.current) return; // '결과 보기' 두 번 눌러도 한 번만
    finishing.current = true;
    stopPlay();
    const e = eng.current;
    let f;
    try {
      f = await e.final();
    } catch {
      // 결과를 못 받아도 점수를 지어내지 않아요
      f = { sessionId: null, passed: null, grade: null, score: null, best: '', worst: '', coins: 0, mistakes: 0, fixed: [], reach: null, infer: null, self: null, ending: null, nextSceneId: null };
    }
    // 오늘 첫 장면이면 연속 출석 +1, 보상 코인도 여기서 한 번만
    st.completeScene({ sessionId: f.sessionId, sceneId: e.sceneId, title: (lang !== 'ko' && e.brief.translation?.title) || e.title, goal: (lang !== 'ko' && e.brief.translation?.goal) || e.brief.goal, passed: f.passed, grade: f.grade, score: f.score, coins: f.coins, mistakes: f.mistakes, fixed: f.fixed, best: f.best, worst: f.worst, reach: f.reach, infer: f.infer, self: f.self, ending: f.ending, nextSceneId: f.nextSceneId, review: review.current.slice(-3), turns: [...turns.current], char: e.char, persona: e.persona, saved: turns.current.filter((x) => x.mistakeId).length });
    router.replace('/result');
  }

  const listening = phase === 'listening';
  const busy = phase === 'recognizing';
  const showDock = (phase === 'talk' || listening || busy) && !judging && ready && !ended;
  const sec = Math.floor((recMode.current === 'rt' ? rtStat.ms : rec.ms) / 1000);
  // 상황·목표: 서버 번역이 있으면 선택 언어로, 한국어 원문은 아래 작게
  const trn = lang !== 'ko' && (!E?.brief.translation?.language || E.brief.translation.language === lang) ? E?.brief.translation : null;
  const scene = { no: E?.no ?? '', title: trn?.title || E?.title || '', situation: trn?.situation || E?.brief.situation || '', goal: trn?.goal || E?.brief.goal || '', partner: trn?.partner || E?.brief.partner };
  const orig = { situation: trn?.situation ? E?.brief.situation : undefined, goal: trn?.goal ? E?.brief.goal : undefined };
  const openDetail = () => setDetail(true);
  // 아쉬운 답 뒤에만 '다시 말하기' (선택)
  const onSameLine = !!out && !out.ok && !ended;

  return (
    <ImageBackground source={E?.bg ? { uri: E.bg } : IMG.bg[place]} style={{ flex: 1, width: '100%', backgroundColor: C.bg }} imageStyle={{ width: '100%', height: '100%' }} resizeMode="cover">
      <View style={{ ...absFill, backgroundColor: TONE[place] }} />
      {/* 서버 표정 이미지(없거나 못 불러오면 앱 그림) + 감정 말풍선·효과음 */}
      <CharacterActor uri={out?.render ?? E?.render ?? null} fallback={IMG.char[charId]} emotion={line.emotion} eventKey={out ? (out.replyLine.turnId ?? String(log.length)) : ''}
        top={ins.top + 64} name={t(ch.name)} lang={st.lang} sound={st.soundEffects} active={ready && phase !== 'brief' && !pause && !listening && !busy} />
      {/* 아래로 갈수록 점점 흐려지는 그라데이션 (경계선 없이) */}
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '60%' }}>
        {FADE.map((a, i) => (
          <View key={i} style={{ flex: 1, backgroundColor: `rgba(243,242,238,${a})` }} />
        ))}
      </View>

      {/* 상단 단축바 */}
      <View style={{ position: 'absolute', top: ins.top + 8, left: 16, right: 16, flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', gap: 4, backgroundColor: C.white, borderRadius: 999, padding: 4 }}>
          <IconBtn name="pause" size={36} bg={C.white} label={t('일시정지')} onPress={() => setPause(true)} />
          <IconBtn name="message-square" size={36} bg={C.white} label={t('대화 내역')} onPress={() => setHistory(true)} />
        </View>
        <View style={{ flex: 1 }} />
        {/* 체력은 서버 장면에서만 (연습용 예시 대화는 체력으로 멈추지 않아요) */}
        {E?.mode === 'live' ? <Hearts n={hearts} max={E?.maxLives ?? 3} /> : null}
      </View>

      {/* 속마음 돋보기: 원할 때만. 아쉬운 답이 이어지면 살짝 강조만 해요 */}
      {phase !== 'brief' && ready && !ended ? (
        <Pressable onPress={openHint} accessibilityRole="button" accessibilityLabel={t('속마음 보기')} style={{ position: 'absolute', right: 24, top: ins.top + 200, alignItems: 'center', gap: 4 }}>
          <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center', borderWidth: hintNudge ? 3 : 0, borderColor: C.lime }}>
            <Feather name="search" size={22} color={C.lime} />
          </View>
          <View style={{ backgroundColor: hintNudge ? C.lime : C.white, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 }}>
            <T s="label" style={{ fontSize: 11 }}>{t('속마음')}</T>
          </View>
        </Pressable>
      ) : null}

      <KeyboardAvoidingView pointerEvents="box-none" behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
        <View pointerEvents="box-none" style={{ paddingHorizontal: 16, paddingBottom: ins.bottom + 12, gap: 12 }}>
          {/* 직전 반응: 작은 말풍선 + 판정 배지. 누르면 그때만 자세한 피드백 */}
          {react && phase !== 'brief' ? (
            <Pressable onPress={openDetail} accessibilityRole="button" accessibilityLabel={t('피드백 자세히: {label}', { label: out?.label ?? '' })} style={{ alignSelf: 'flex-start', maxWidth: '88%', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 16, paddingVertical: 8, paddingLeft: 8, paddingRight: 12 }}>
              <ReactionBadge mark={react.mark} size={26} />
              <View style={{ flexShrink: 1 }}>
                <T s="body" style={{ fontSize: 14 }} numberOfLines={2}>{react.text}</T>
                {react.sub ? <T s="small" numberOfLines={1}>{react.sub}</T> : null}
              </View>
            </Pressable>
          ) : null}

          {phase !== 'brief' ? (
            <LineCard
              name={t(ch.name)}
              line={line.line}
              action={lineMark ? undefined : line.action}
              cues={lineMark ? undefined : line.cues}
              playing={playing}
              sub={line.sub}
              onPlay={() => (playing ? stopPlay() : play([line], true))}
              mark={lineMark}
              onMarkPress={lineMark ? openDetail : undefined}
            />
          ) : null}

          {/* 판정 기다리는 중 / 오류 / 안내 */}
          {judging ? (
            <View style={{ backgroundColor: C.white, borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Dots />
              <T s="label">{waitSec >= 5 ? t('답변 확인 중… 조금 걸려요') : t('답변 확인 중…')}</T>
            </View>
          ) : null}
          {sendErr && !judging ? (
            <View style={{ backgroundColor: C.white, borderRadius: 16, padding: 12, gap: 8 }}>
              <T s="label">{sendErr}</T>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Btn label={t('다시 보내기')} small icon="rotate-cw" style={{ flex: 1 }} onPress={() => send(answer, phase === 'recognized')} />
                <Btn label={t('고쳐서 말하기')} small kind="line" style={{ flex: 1 }} onPress={() => { setSendErr(null); setText(answer); setPhase('typing'); }} />
              </View>
            </View>
          ) : null}
          {notice && !judging && !sendErr ? (
            <View style={{ backgroundColor: C.white, borderRadius: 16, padding: 12 }}>
              <T s="label">{notice}</T>
            </View>
          ) : null}

          {/* 마지막 대사까지 끝: 전체 평가는 결과 화면에서 */}
          {ended && !judging ? <Btn label={t('결과 보기')} icon="arrow-right" onPress={finish} /> : null}

          {/* 듣는 중 / 인식 중 */}
          {listening ? (
            <View style={{ backgroundColor: C.lime, borderRadius: 20, borderWidth: 2, borderColor: C.ink, padding: 14, alignItems: 'center', gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.red }} />
                <T s="label">{t('듣는 중…')} 0:{String(sec).padStart(2, '0')}</T>
                <Wave level={recMode.current === 'rt' ? rtStat.level : rec.level} />
              </View>
              {preview ? <T s="body" style={{ textAlign: 'center' }} numberOfLines={3}>{preview}</T> : <T s="small" style={{ color: C.ink }}>{t('듣는 중…')}</T>}
            </View>
          ) : null}
          {busy ? (
            <View style={{ backgroundColor: C.white, borderRadius: 20, borderWidth: 2, borderColor: C.ink, padding: 16, alignItems: 'center', gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <T s="label">{t('글자로 바꾸는 중…')}</T>
                <Dots />
              </View>
            </View>
          ) : null}

          {/* 인식 완료 */}
          {phase === 'recognized' && !judging && !ended ? (
            <View style={{ backgroundColor: C.white, borderRadius: 20, padding: 16, gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Feather name="check-circle" size={16} color={C.ink} />
                <T s="label">{t('이렇게 들었어요')}</T>
              </View>
              {editHeard ? (
                <TextInput value={heard} onChangeText={setHeard} autoFocus multiline style={{ fontFamily: F.m, fontSize: 16, color: C.ink, borderWidth: 1.5, borderColor: C.ink, borderRadius: 12, padding: 10 }} />
              ) : (
                <Pressable onPress={() => setEditHeard(true)}>
                  <T s="h3" style={{ fontSize: 16 }}>"{heard}"</T>
                  <T s="small" style={{ marginTop: 4 }}>{t('틀렸다면 눌러서 직접 고치기')}</T>
                </Pressable>
              )}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Btn label={t('다시 말하기')} kind="line" small style={{ flex: 1 }} onPress={() => setPhase('talk')} />
                <Btn label={t('이 답변 보내기')} kind="dark" small icon="send" style={{ flex: 1.3 }} disabled={judging} onPress={() => send(heard, true)} />
              </View>
            </View>
          ) : null}

          {/* 직접 입력: 캐릭터 음성이 나오는 중에도 쓸 수 있어요 */}
          {phase === 'typing' && !judging && !ended ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, borderRadius: 28, borderWidth: 1.5, borderColor: C.ink, paddingLeft: 18, paddingRight: 6, minHeight: 56 }}>
              <TextInput
                value={text}
                onChangeText={setText}
                autoFocus
                placeholder={t('직접 입력하기…')}
                placeholderTextColor={C.sub}
                onSubmitEditing={() => send(text)}
                returnKeyType="send"
                style={{ flex: 1, minWidth: 0, width: 0, fontFamily: F.r, fontSize: 15, color: C.ink, paddingVertical: 12, outlineStyle: 'none' } as any}
              />
              <IconBtn name="mic" size={40} bg={C.bg} label={t('음성으로 말하기')} onPress={() => setPhase('talk')} />
              <View style={{ width: 6 }} />
              <IconBtn name="send" size={40} bg={text.trim() ? C.lime : C.bg} label={t('보내기')} onPress={() => send(text)} />
            </View>
          ) : null}

          {/* 입력 도크: 텍스트 입력 / 음성 */}
          {showDock ? (
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 44, marginTop: 4 }}>
              <Pressable disabled={busy} onPress={() => { setNotice(null); setPhase('typing'); }} accessibilityRole="button" accessibilityLabel={t('텍스트로 입력')} style={{ alignItems: 'center', gap: 6, opacity: busy ? 0.4 : 1 }}>
                <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="keypad-outline" size={22} color={C.ink} />
                </View>
                <T s="small" style={{ color: C.ink }}>{t('텍스트 입력')}</T>
              </Pressable>
              <Pressable disabled={busy} onPressIn={micDown} onPressOut={micUp} accessibilityRole="button" accessibilityLabel={listening ? t('말하기 끝내기') : t('말하기 시작')} style={{ alignItems: 'center', gap: 6 }}>
                <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: busy ? C.line : listening ? C.lime : C.ink, borderWidth: listening ? 3 : 0, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' }}>
                  {listening ? <View style={{ width: 22, height: 22, borderRadius: 5, backgroundColor: C.ink }} /> : <Feather name="mic" size={28} color={busy ? C.sub : C.lime} />}
                </View>
                <T s="small" style={{ color: C.ink }}>{busy ? t('글자로 바꾸는 중…') : listening ? t('듣는 중…') : t('눌러서 말하기')}</T>
              </Pressable>
              <View style={{ width: 52 }} />
            </View>
          ) : null}
        </View>
      </KeyboardAvoidingView>

      {/* 브리핑 */}
      {phase === 'brief' ? (
        <View style={{ ...absFill, backgroundColor: 'rgba(17,17,17,0.35)', justifyContent: 'flex-end', padding: 16, paddingBottom: ins.bottom + 16 }}>
          <View style={{ backgroundColor: C.white, borderRadius: 24, padding: 22, gap: 14 }}>
            {loadErr ? (
              <>
                <T s="h2">{t('장면을 열지 못했어요')}</T>
                <T s="sub">{loadErr}</T>
                <Btn label={t('다시 시도')} icon="rotate-cw" onPress={() => { load(); }} />
                {!st.demo ? <Btn label={t('예시 대화로 해 보기')} kind="line" onPress={() => { st.setDemo(true); router.replace({ pathname: '/scene/[id]', params: { id: 'today' } }); }} /> : null}
                <Btn label={t('홈으로')} kind="ghost" onPress={() => router.replace('/home')} />
              </>
            ) : !ready ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 }}>
                <Dots />
                <T s="label">{t('장면을 준비하고 있어요')}</T>
              </View>
            ) : (
              <>
                <Tag label={[scene.no, scene.title].filter(Boolean).join(' · ') || t('오늘의 장면')} tone="lime" />
                <Brief k={t('상대')} v={scene.partner || `${t(ch.call)} · ${t(persona.name)} · ${t(persona.short)}`} />
                <Brief k={t('상황')} v={scene.situation} sub={orig.situation} />
                <Brief k={t('이번 목표')} v={scene.goal} sub={orig.goal} />
                {st.demo ? <T s="small">{t('체험 중')}</T> : null}
                <Btn label={t('대화 시작')} icon="play" onPress={begin} />
              </>
            )}
          </View>
        </View>
      ) : null}

      {/* 피드백 자세히: 배지를 눌렀을 때만. 닫아도 대화는 그대로 */}
      <Sheet visible={detail && !!out && !views} onClose={() => setDetail(false)}>
        {out ? (
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ReactionBadge mark={out.mark} size={28} />
              <T s="label" style={{ flex: 1 }}>{out.label}</T>
              {out.first ? <Tag label={t('수정 완료')} tone="lime" /> : null}
            </View>
            {out.first ? (
              <View style={{ gap: 6 }}>
                <View style={{ backgroundColor: C.bg, borderRadius: 14, padding: 12 }}>
                  <T s="small">{t('처음 답')}</T>
                  <T s="body" style={{ marginTop: 2, color: C.sub, textDecorationLine: 'line-through' }}>"{out.first}"</T>
                </View>
                <View style={{ backgroundColor: C.bg, borderRadius: 14, padding: 12, borderLeftWidth: 3, borderLeftColor: C.lime }}>
                  <T s="small">{t('고친 답')}</T>
                  <T s="body" style={{ marginTop: 2 }}>"{answer}"</T>
                </View>
              </View>
            ) : (
              <View style={{ backgroundColor: C.bg, borderRadius: 14, padding: 12 }}>
                <T s="small">{t('내 답')}</T>
                <T s="body" style={{ marginTop: 2 }}>"{answer}"</T>
              </View>
            )}
            {!out.ok && !out.native && out.why ? (
              <View style={{ gap: 2 }}>
                <T s="label">{t('이유')}</T>
                <T s="sub">{lang !== 'ko' && out.whySub ? out.whySub : out.why}</T>
                {lang !== 'ko' && out.whySub && out.whySub !== out.why ? <T s="small">{out.why}</T> : null}
              </View>
            ) : null}
            {!out.ok && out.better ? (
              <View style={{ borderLeftWidth: 3, borderLeftColor: C.lime, paddingLeft: 10 }}>
                <T s="small">{out.native ? t('따라 말해 보세요') : t('예시 답변')}</T>
                <T s="body" style={{ marginTop: 2 }}>"{out.better}"</T>
              </View>
            ) : null}
            {/* 속도·망설임·말끝은 음성으로 답했을 때만 (텍스트 답엔 숨김) */}
            {out.ok && (out.tone || out.voice) ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {out.tone ? <Stat k={t('톤')} v={out.tone} /> : null}
                {out.voice && out.speed ? <Stat k={t('속도')} v={out.speed} /> : null}
                {out.voice && out.hesitation ? <Stat k={t('망설임')} v={out.hesitation} /> : null}
                {out.voice && out.ending ? <Stat k={t('말끝')} v={out.ending} /> : null}
              </View>
            ) : null}
            {out.ok && out.tip ? (
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                <Feather name="zap" size={16} color={C.ink} style={{ marginTop: 2 }} />
                <T s="sub" style={{ flex: 1, color: C.ink }}>{out.tip}</T>
              </View>
            ) : null}
            {out.ok && out.views.length ? (
              <Pressable onPress={() => setViews(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: C.ink, borderRadius: 14, padding: 12 }}>
                <Feather name="users" size={16} />
                <T s="label" style={{ flex: 1 }}>{t('다른 사람이 이 말을 하면?')}</T>
                <Feather name="chevron-right" size={18} />
              </Pressable>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              {ended ? (
                <Btn label={t('결과 보기')} icon="arrow-right" style={{ flex: 1 }} onPress={() => { setDetail(false); finish(); }} />
              ) : onSameLine ? (
                <>
                  <Btn label={t('닫기')} kind="line" style={{ flex: 1 }} onPress={() => setDetail(false)} />
                  <Btn label={out.native ? t('한국어로 다시 말하기') : t('다시 말하기')} icon="rotate-ccw" style={{ flex: 1.3 }} onPress={correctLast} />
                </>
              ) : (
                <Btn label={t('닫고 이어서 말하기')} icon="mic" style={{ flex: 1 }} onPress={() => setDetail(false)} />
              )}
            </View>
          </View>
        ) : null}
      </Sheet>

      {/* 관점 전환: 같은 말, 다른 관계 */}
      <Sheet visible={views} onClose={() => setViews(false)}>
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Feather name="users" size={18} />
            <T s="h3">{t('다른 사람이 이 말을 하면?')}</T>
          </View>
          <View style={{ backgroundColor: C.bg, borderRadius: 14, padding: 12 }}>
            <T s="small">{t('내가 한 말')}</T>
            <T s="body" style={{ marginTop: 2 }}>"{answer}"</T>
          </View>
          {out?.views.map((v, i) => (
            <View key={i} style={{ borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 12, gap: 4 }}>
              <T s="label">{v.who}</T>
              <T s="body">{v.meaning}</T>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                <Feather name="eye" size={12} color={C.sub} />
                <T s="small">{v.cue}</T>
              </View>
            </View>
          ))}
          <Btn label={t('돌아가기')} kind="line" onPress={() => setViews(false)} />
        </View>
      </Sheet>

      {/* 속마음 힌트: 1단계 단서 → 2단계 속마음 */}
      <Sheet visible={!!hint} dim={false} onClose={() => setHint(null)}>
        <View style={{ gap: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Feather name="search" size={18} />
            <T s="h3">{t('{name}의 속마음', { name: t(ch.name) })}</T>
            <View style={{ flex: 1 }} />
            <Tag label={t('{n}/2 단계', { n: hintStep })} tone={hintStep === 2 ? 'lime' : 'grey'} />
          </View>
          <T s="label">{t('1단계 · 단서부터 읽어 봐요')}</T>
          {/* 시트에 가려진 대사를 한 줄 다시 보여 줘요 */}
          {line.line ? <T s="sub" numberOfLines={2}>{t(ch.name)}: "{line.line}"</T> : null}
          {hintErr ? <T s="label">{hintErr}</T> : null}
          <View style={{ backgroundColor: C.bg, borderRadius: 18, padding: 14, gap: 8 }}>
            {!hint?.clue.length && !hintErr ? <Dots /> : null}
            {hint?.clue.map((c, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 8 }}>
                <T s="small" style={{ width: 72 }}>{c.k}</T>
                <T s="body" style={{ flex: 1, fontSize: 14 }}>{c.v}</T>
              </View>
            ))}
          </View>
          {hintStep === 2 ? (
            <>
              <T s="label">{t('2단계 · 진짜 속마음')}</T>
              <View style={{ backgroundColor: C.bg, borderRadius: 18, padding: 16, borderLeftWidth: 4, borderLeftColor: C.lime }}>
                <T s="body" style={{ fontFamily: F.m }}>{hint?.thought}</T>
              </View>
              {hint?.tip ? (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Feather name="zap" size={16} style={{ marginTop: 3 }} />
                  <T s="body" style={{ flex: 1 }}>{hint.tip}</T>
                </View>
              ) : null}
              <Btn label={t('돌아가서 말하기')} icon="mic" onPress={() => setHint(null)} />
            </>
          ) : (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Btn label={t('추측해서 말하기')} kind="line" style={{ flex: 1 }} onPress={() => setHint(null)} />
              <Btn label={t('속마음 보기')} icon="eye" style={{ flex: 1.3 }} onPress={revealThought} />
            </View>
          )}
        </View>
      </Sheet>

      {/* 일시정지 */}
      <Modal visible={pause} transparent animationType="fade" onRequestClose={() => setPause(false)}>
        <View style={{ ...FRAME, backgroundColor: C.dim, justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: C.white, borderRadius: 24, padding: 24, gap: 10, width: '100%', maxWidth: 382, alignSelf: 'center' }}>
            <IconBtn name="pause" bg={C.lime} />
            <T s="h2">{t('잠깐 멈췄어요')}</T>
            <T s="sub">{t('지금 나가도 여기까지 저장돼요.\n다음에 이어서 할 수 있어요.')}</T>
            <Btn label={t('계속하기')} icon="play" onPress={() => setPause(false)} style={{ marginTop: 8 }} />
            <Btn label={st.soundEffects ? reactionCopy(st.lang).on : reactionCopy(st.lang).off} icon={st.soundEffects ? 'volume-2' : 'volume-x'} kind="ghost" onPress={() => st.set({ soundEffects: !st.soundEffects })} />
            <Btn label={t('설정')} kind="ghost" onPress={() => { setPause(false); router.push('/settings'); }} />
            <Btn label={t('나가기')} kind="line" onPress={() => { setPause(false); stopSpeak(); eng.current?.pause(); saveProgress('paused'); router.replace('/home'); }} />
          </View>
        </View>
      </Modal>

      {/* 대화 내역 */}
      <Sheet visible={history} onClose={() => setHistory(false)}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <T s="h2" style={{ flex: 1 }}>{t('대화 내역')}</T>
          <Btn label={sharing ? t('준비 중…') : t('공유')} small kind="line" icon="share-2" disabled={sharing || !log.length} onPress={exportLog} />
        </View>
        <T s="small" style={{ marginBottom: 12 }}>{[scene.no, scene.title, t(ch.name)].filter(Boolean).join(' · ')}</T>
        <ScrollView style={{ maxHeight: 380 }} contentContainerStyle={{ gap: 10 }}>
          {log.map((m, i) => (
            <View key={i} style={{ alignSelf: m.who === 'me' ? 'flex-end' : 'flex-start', maxWidth: '82%' }}>
              <View style={{ backgroundColor: m.who === 'me' ? C.ink : C.bg, borderRadius: 16, padding: 12, paddingRight: m.mark ? 22 : 12 }}>
                <T style={{ color: m.who === 'me' ? C.white : C.ink }}>{m.text}</T>
              </View>
              {/* 반응 말풍선마다 배지가 남아서 어디서 실수했는지 보여요 */}
              {m.mark ? (
                <View style={{ position: 'absolute', top: -8, right: -8 }}>
                  <ReactionBadge mark={m.mark} size={24} />
                </View>
              ) : null}
            </View>
          ))}
          {!log.length ? <T s="sub">{t('아직 주고받은 말이 없어요.')}</T> : null}
        </ScrollView>
      </Sheet>
    </ImageBackground>
  );
}

// 이벤트 처리에서만 쓰는 현재 시각
const now = () => Date.now();

const absFill = { position: 'absolute' as const, left: 0, right: 0, top: 0, bottom: 0 };

function Brief({ k, v, sub }: { k: string; v: string; sub?: string }) {
  return (
    <View style={{ gap: 2 }}>
      <T s="small">{k}</T>
      <T s="h3" style={{ fontSize: 16 }}>{v}</T>
      {sub ? <T s="small">{sub}</T> : null}
    </View>
  );
}

// 0 → 0.85 로 부드럽게 (위는 투명, 맨 아래는 거의 불투명)
const FADE = Array.from({ length: 32 }, (_, i) => +(0.85 * Math.pow((i + 1) / 32, 1.6)).toFixed(3));
