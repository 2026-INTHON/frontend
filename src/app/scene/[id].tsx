import { useEffect, useRef, useState } from 'react';
import { Image, ImageBackground, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as haptic from '../../lib/haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Btn, Hearts, IconBtn, Sheet, T, Tag, FRAME } from '../../components/ui';
import { Dots, LineCard, ReactionBadge, Stat, Wave } from '../../components/scene-parts';
import { C, F } from '../../lib/theme';
import { IMG, Line, PERSONAS, PLACE_OF, charById } from '../../lib/data';
import { createEngine, Engine, Hint, Mark, Out, SceneError } from '../../lib/engine';
import { speak, stopSpeak } from '../../lib/voice';
import { createAudioPlayer } from 'expo-audio';
import { useRec } from '../../lib/useRec';
import { useStore } from '../../lib/store';

type Phase = 'brief' | 'talk' | 'typing' | 'listening' | 'recognizing' | 'recognized' | 'reaction' | 'mistake' | 'feedback';
type Log = { who: 'char' | 'me'; text: string; mark?: Mark };

const TONE: Record<string, string> = { office: 'rgba(220,224,229,0.35)', cafe: 'rgba(238,230,219,0.35)', street: 'rgba(217,222,232,0.35)' };

export default function SceneScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const sceneId = String(id ?? 'today');
  const st = useStore();
  const ins = useSafeAreaInsets();
  const rec = useRec();

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
  const [render, setRender] = useState<string | null>(null); // 서버가 고른 표정 이미지
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [sendErr, setSendErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [waitSec, setWaitSec] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [hint, setHint] = useState<Hint | null>(null);
  const [hintStep, setHintStep] = useState<1 | 2>(1);
  const [hintErr, setHintErr] = useState<string | null>(null);
  const [views, setViews] = useState(false);
  const [pause, setPause] = useState(false);
  const [history, setHistory] = useState(false);
  const [fail, setFail] = useState(false);
  const [judging, setJudging] = useState(false);
  const [hintNudge, setHintNudge] = useState(false);
  const [log, setLog] = useState<Log[]>([]);
  const holdAt = useRef(0);
  const player = useRef<ReturnType<typeof createAudioPlayer> | null>(null);

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
    let alive = true;
    createEngine(sceneId, { demo: st.demo, pack: st.pack, lang: st.lang, char: st.char, persona: st.persona })
      .then((e) => {
        if (!alive) return;
        eng.current = e;
        setHearts(e.lives);
        setLine(e.line);
        setRender(e.render);
        setReady(true);
        st.set({ lastPlayed: { sceneId: e.sceneId, title: e.title, char: e.char, persona: e.persona, status: 'playing', progress: e.progress(), at: new Date().toISOString() } });
      })
      .catch((err) => alive && setLoadErr(err instanceof SceneError ? err.message : '장면을 불러오지 못했어요.'));
    return () => {
      alive = false;
    };
  }
  useEffect(() => {
    const off = start();
    return () => {
      off();
      stopSpeak();
      player.current?.remove();
    };
  }, []);

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
    setRender(eng.current?.render ?? null);
    setLog((g) => [...g, { who: 'char', text: l.line }]);
    play(l);
  }

  // 서버 음성: 대사에 같이 온 audioUrl 우선, 없으면 다시 발급 (반응은 그 턴 음성만). 데모 모드는 기기 TTS.
  async function play(ln: Line, refetch = false) {
    const l = ln.line;
    stopSpeak();
    player.current?.remove();
    player.current = null;
    setPlaying(true);
    const live = eng.current?.mode === 'live';
    const url = live ? (!refetch && ln.audio ? ln.audio : await eng.current!.voiceUrl(ln)) : null;
    if (live && !url) {
      setPlaying(false); // 음성이 없으면 대사는 그대로 두고 다시 듣기 제공
      return;
    }
    if (url) {
      try {
        const pl = createAudioPlayer({ uri: url });
        player.current = pl;
        pl.addListener('playbackStatusUpdate', (s: any) => s.didJustFinish && setPlaying(false));
        pl.play();
        return;
      } catch {}
    }
    speak(l, { lang: st.pack === 'ko' ? 'ko-KR' : 'en-US', onDone: () => setPlaying(false) });
  }
  function stopPlay() {
    stopSpeak();
    player.current?.pause();
    setPlaying(false);
  }

  // ----- 말하기 -----
  async function micDown() {
    if (phase === 'listening') return micStop();
    holdAt.current = Date.now();
    stopPlay();
    haptic.tap();
    setNotice(null);
    const ok = await rec.start();
    if (!ok) {
      setNotice('마이크를 켜지 못했어요. 직접 입력해 주세요.');
      setPhase('typing');
      return;
    }
    setPhase('listening');
  }
  function micUp() {
    // 길게 눌렀다 떼면 끝, 짧게 탭했으면 다시 탭할 때 끝
    if (Date.now() - holdAt.current > 450) micStop();
  }
  async function micStop() {
    const uri = await rec.stop();
    setPhase('recognizing');
    const e = eng.current!;
    let r: { text: string; transcriptId?: string };
    try {
      r = await e.transcribe(uri);
    } catch (err) {
      // 가짜 문장으로 채우지 않고 다시 말하기·직접 입력으로
      setNotice(err instanceof SceneError ? `${err.message} 다시 말하거나 직접 입력해 주세요.` : '잘 못 들었어요. 다시 말하거나 직접 입력해 주세요.');
      setPhase('talk');
      return;
    }
    setHeard(r.text);
    setTid(r.transcriptId);
    setEditHeard(false);
    setPhase('recognized');
  }

  // ----- 보내기 → 판정 -----
  async function send(a: string, voice?: boolean) {
    const ans = a.trim();
    if (!ans || judging) return;
    setAnswer(ans);
    setSendErr(null);
    setWaitSec(0);
    setJudging(true);
    let o: Out;
    try {
      o = await eng.current!.submit(ans, voice ? { transcriptId: tid } : undefined);
    } catch (err) {
      // AI 오류: 체력 그대로, 같은 답을 다시 보낼 수 있게 (가짜 판정 없음)
      setJudging(false);
      setSendErr(err instanceof SceneError ? err.message : '판정을 받지 못했어요.');
      return;
    }
    setText('');
    setJudging(false);
    setOut(o);
    setHearts(eng.current!.lives);
    setLog((g) => [...g, { who: 'me', text: ans }, { who: 'char', text: o.reply, mark: o.mark }]);
    // F안: 캐릭터 반응 말풍선 + 모서리 배지를 먼저 보여 주고, 잠시 뒤 이유 시트
    setLine(o.replyLine);
    setLineMark(o.mark);
    play(o.replyLine);
    if (o.render) setRender(o.render);
    setPhase('reaction');
    if (o.ok) haptic.good();
    else {
      haptic.bad();
      if (o.mark === 'X' && !o.native) {
        const E2 = eng.current!;
        st.addMistake({ id: `${E2.sceneId}-${Date.now()}`, scene: E2.sceneId, title: E2.title, who: `${ch.name} · ${persona.name}`, when: '오늘', said: ans, better: o.better, why: o.why, fixed: false, line: E2.line.line });
      }
    }
  }

  // 반응 말풍선을 1.4초 보여 준 뒤 이유 시트 (배지를 누르면 바로)
  useEffect(() => {
    if (phase !== 'reaction') return;
    const t = setTimeout(openReason, 1400);
    return () => clearTimeout(t);
  }, [phase]);
  function openReason() {
    if (!out) return;
    if (out.failed) return setFail(true);
    setPhase(out.ok ? 'feedback' : 'mistake');
  }

  function retry() {
    setLine(eng.current!.line);
    setLineMark(null);
    setRender(eng.current!.render);
    setHintNudge(true);
    setPhase('talk');
  }

  function cont() {
    // △ 진행: 서버가 advance 라고 했으면 다음 대사, 데모 모드면 대본에서 건너뛰기
    if (out?.done) return finish();
    if (eng.current!.mode === 'live') eng.current!.next();
    else if (eng.current!.skip()) return finish();
    setPhase('talk');
    showLine(eng.current!.line);
    saveProgress();
  }

  function next() {
    if (out?.done) return finish();
    eng.current!.next();
    setPhase('talk');
    showLine(eng.current!.line);
    saveProgress();
  }

  function saveProgress(status: 'playing' | 'paused' = 'playing') {
    const e = eng.current;
    if (!e) return;
    st.set({ lastPlayed: { sceneId: e.sceneId, title: e.title, char: e.char, persona: e.persona, status, progress: e.progress(), at: new Date().toISOString() } });
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
      setHintErr('힌트를 불러오지 못했어요.');
    }
  }
  async function revealThought() {
    setHintErr(null);
    try {
      const h = await eng.current!.hint(2);
      setHint((o) => ({ clue: h.clue.length ? h.clue : (o?.clue ?? []), thought: h.thought, tip: h.tip }));
      setHintStep(2);
    } catch {
      setHintErr('속마음을 불러오지 못했어요. 다시 눌러 주세요.');
    }
  }

  async function finish() {
    stopPlay();
    const e = eng.current!;
    let f;
    try {
      f = await e.final();
    } catch {
      // 결과를 못 받아도 점수를 지어내지 않아요
      f = { sessionId: null, passed: null, grade: null, score: null, best: '', worst: '', coins: 0, mistakes: 0, fixed: [], reach: null, infer: null, self: null, ending: null, nextSceneId: null };
    }
    // 오늘 첫 장면이면 연속 출석 +1, 보상 코인도 여기서 한 번만
    st.completeScene({ sessionId: f.sessionId, sceneId: e.sceneId, title: e.title, goal: e.brief.goal, passed: f.passed, grade: f.grade, score: f.score, coins: f.coins, mistakes: f.mistakes, fixed: f.fixed, best: f.best, worst: f.worst, reach: f.reach, infer: f.infer, self: f.self, ending: f.ending, nextSceneId: f.nextSceneId });
    router.replace('/result');
  }

  function restart() {
    setFail(false);
    setLog([]);
    setOut(null);
    setPhase('brief');
    load();
  }

  const listening = phase === 'listening';
  const busy = phase === 'recognizing';
  const showDock = (phase === 'talk' || listening || busy) && !judging && ready;
  const sec = Math.floor(rec.ms / 1000);
  const scene = { no: E?.no ?? '', title: E?.title ?? '', situation: E?.brief.situation ?? '', goal: E?.brief.goal ?? '', partner: E?.brief.partner };

  return (
    <ImageBackground source={E?.bg ? { uri: E.bg } : IMG.bg[place]} style={{ flex: 1, width: '100%', backgroundColor: C.bg }} imageStyle={{ width: '100%', height: '100%' }} resizeMode="cover">
      <View style={{ ...absFill, backgroundColor: TONE[place] }} />
      {/* 캐릭터: 서버가 고른 표정 이미지가 있으면 그걸로 */}
      <Image source={render ? { uri: render } : IMG.char[charId]} style={{ position: 'absolute', top: ins.top + 64, alignSelf: 'center', width: '62%', height: '72%' }} resizeMode="contain" accessibilityLabel={`${ch.name} 캐릭터`} />
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '42%', backgroundColor: 'rgba(243,242,238,0.72)' }} />

      {/* 상단 단축바 */}
      <View style={{ position: 'absolute', top: ins.top + 8, left: 16, right: 16, flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', gap: 4, backgroundColor: C.white, borderRadius: 999, padding: 4 }}>
          <IconBtn name="pause" size={36} bg={C.white} label="일시정지" onPress={() => setPause(true)} />
          <IconBtn name="message-square" size={36} bg={C.white} label="대화 내역" onPress={() => setHistory(true)} />
        </View>
        <View style={{ flex: 1 }} />
        <Hearts n={hearts} max={E?.maxLives ?? 3} />
      </View>

      {/* 속마음 돋보기 */}
      {phase !== 'brief' && ready ? (
        <Pressable onPress={openHint} accessibilityRole="button" accessibilityLabel="속마음 힌트 보기" style={{ position: 'absolute', right: 24, top: ins.top + 200, alignItems: 'center', gap: 4 }}>
          <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center', borderWidth: hintNudge ? 3 : 0, borderColor: C.lime }}>
            <Feather name="search" size={22} color={C.lime} />
          </View>
          <View style={{ backgroundColor: hintNudge ? C.lime : C.white, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 }}>
            <T s="label" style={{ fontSize: 11 }}>속마음</T>
          </View>
        </Pressable>
      ) : null}

      <KeyboardAvoidingView pointerEvents="box-none" behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
        <View pointerEvents="box-none" style={{ paddingHorizontal: 16, paddingBottom: ins.bottom + 12, gap: 12 }}>
          {phase !== 'brief' ? (
            <LineCard
              name={ch.name}
              line={line.line}
              action={lineMark ? undefined : line.action}
              cues={lineMark ? undefined : line.cues}
              playing={playing}
              sub={line.sub}
              onPlay={() => (playing ? stopPlay() : play(line, true))}
              mark={lineMark}
              onMarkPress={phase === 'reaction' ? openReason : undefined}
            />
          ) : null}

          {/* 판정 기다리는 중 / 오류 / 안내 */}
          {judging ? (
            <View style={{ backgroundColor: C.white, borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Dots />
              <T s="label">{waitSec >= 5 ? `${ch.name}의 반응을 기다리는 중…` : waitSec >= 3 ? `${ch.name}${josa(ch.name)} 생각 중…` : '보내는 중…'}</T>
            </View>
          ) : null}
          {sendErr && !judging ? (
            <View style={{ backgroundColor: C.white, borderRadius: 16, padding: 12, gap: 8 }}>
              <T s="label">{sendErr} 체력은 그대로예요.</T>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Btn label="다시 보내기" small icon="rotate-cw" style={{ flex: 1 }} onPress={() => send(answer, phase === 'recognized')} />
                <Btn label="고쳐서 말하기" small kind="line" style={{ flex: 1 }} onPress={() => { setSendErr(null); setText(answer); setPhase('typing'); }} />
              </View>
            </View>
          ) : null}
          {notice && !judging && !sendErr ? (
            <View style={{ backgroundColor: C.white, borderRadius: 16, padding: 12 }}>
              <T s="label">{notice}</T>
            </View>
          ) : null}

          {/* 듣는 중 / 인식 중 */}
          {listening ? (
            <View style={{ backgroundColor: C.lime, borderRadius: 20, borderWidth: 2, borderColor: C.ink, padding: 14, alignItems: 'center', gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.red }} />
                <T s="label">듣는 중… 0:{String(sec).padStart(2, '0')}</T>
                <Wave level={rec.level} />
              </View>
              <T s="small" style={{ color: C.ink }}>말을 끝내면 한 번에 글자로 바꿔요</T>
            </View>
          ) : null}
          {busy ? (
            <View style={{ backgroundColor: C.white, borderRadius: 20, borderWidth: 2, borderColor: C.ink, padding: 16, alignItems: 'center', gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <T s="label">알아듣는 중…</T>
                <Dots />
              </View>
              <T s="small">잠깐만요, 정리하고 있어요</T>
            </View>
          ) : null}

          {/* 인식 완료 */}
          {phase === 'recognized' && !judging ? (
            <View style={{ backgroundColor: C.white, borderRadius: 20, padding: 16, gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Feather name="check-circle" size={16} color={C.ink} />
                <T s="label">인식 완료 · 이렇게 들었어요</T>
              </View>
              {editHeard ? (
                <TextInput value={heard} onChangeText={setHeard} autoFocus multiline style={{ fontFamily: F.m, fontSize: 16, color: C.ink, borderWidth: 1.5, borderColor: C.ink, borderRadius: 12, padding: 10 }} />
              ) : (
                <Pressable onPress={() => setEditHeard(true)}>
                  <T s="h3" style={{ fontSize: 16 }}>"{heard}"</T>
                  <T s="small" style={{ marginTop: 4 }}>틀렸다면 눌러서 직접 고치기</T>
                </Pressable>
              )}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Btn label="다시 말하기" kind="line" small style={{ flex: 1 }} onPress={() => setPhase('talk')} />
                <Btn label={judging ? '판정 중…' : '이대로 보내기'} kind="dark" small icon="send" style={{ flex: 1.3 }} disabled={judging} onPress={() => send(heard, true)} />
              </View>
            </View>
          ) : null}

          {/* 직접 입력 */}
          {phase === 'typing' && !judging ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, borderRadius: 28, borderWidth: 1.5, borderColor: C.ink, paddingLeft: 18, paddingRight: 6, minHeight: 56 }}>
              <TextInput
                value={text}
                onChangeText={setText}
                autoFocus
                placeholder="직접 입력하기…"
                placeholderTextColor={C.sub}
                onSubmitEditing={() => send(text)}
                returnKeyType="send"
                style={{ flex: 1, fontFamily: F.r, fontSize: 15, color: C.ink, paddingVertical: 12, outlineStyle: 'none' } as any}
              />
              <IconBtn name="mic" size={40} bg={C.bg} label="음성으로 말하기" onPress={() => setPhase('talk')} />
              <View style={{ width: 6 }} />
              <IconBtn name="send" size={40} bg={text.trim() ? C.lime : C.bg} label="보내기" onPress={() => send(text)} />
            </View>
          ) : null}

          {/* 입력 도크: 텍스트 입력 / 음성 */}
          {showDock ? (
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 44, marginTop: 4 }}>
              <Pressable disabled={busy} onPress={() => { setNotice(null); setPhase('typing'); }} accessibilityRole="button" accessibilityLabel="텍스트로 입력" style={{ alignItems: 'center', gap: 6, opacity: busy ? 0.4 : 1 }}>
                <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="keypad-outline" size={22} color={C.ink} />
                </View>
                <T s="small" style={{ color: C.ink }}>텍스트 입력</T>
              </Pressable>
              <Pressable disabled={busy} onPressIn={micDown} onPressOut={micUp} accessibilityRole="button" accessibilityLabel={listening ? '말하기 끝내기' : '말하기 시작'} style={{ alignItems: 'center', gap: 6 }}>
                <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: busy ? C.line : listening ? C.lime : C.ink, borderWidth: listening ? 3 : 0, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' }}>
                  {listening ? <View style={{ width: 22, height: 22, borderRadius: 5, backgroundColor: C.ink }} /> : <Feather name="mic" size={28} color={busy ? C.sub : C.lime} />}
                </View>
                <T s="small" style={{ color: C.ink }}>{busy ? '인식 중' : listening ? '탭하면 끝' : '눌러서 말하기'}</T>
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
                <T s="h2">장면을 열지 못했어요</T>
                <T s="sub">{loadErr} 잠시 뒤 다시 시도해 주세요.</T>
                <Btn label="다시 시도" icon="rotate-cw" onPress={() => { load(); }} />
                {!st.demo ? <Btn label="데모 대본으로 해 보기" kind="line" onPress={() => { st.setDemo(true); router.replace({ pathname: '/scene/[id]', params: { id: 'today' } }); }} /> : null}
                <Btn label="홈으로" kind="ghost" onPress={() => router.replace('/home')} />
              </>
            ) : !ready ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 }}>
                <Dots />
                <T s="label">장면을 준비하고 있어요</T>
              </View>
            ) : (
              <>
                <Tag label={[scene.no, scene.title].filter(Boolean).join(' · ') || '오늘의 장면'} tone="lime" />
                <Brief k="상대" v={scene.partner || `${ch.call} · ${persona.name} · ${persona.short}`} />
                <Brief k="상황" v={scene.situation} sub={E?.brief.translation?.situation} />
                <Brief k="이번 목표" v={scene.goal} sub={E?.brief.translation?.goal} />
                {st.demo ? <T s="small">데모 모드 · 앱 안 대본으로 진행해요</T> : null}
                <Btn label="대화 시작" icon="play" onPress={begin} />
              </>
            )}
          </View>
        </View>
      ) : null}

      {/* 말실수: △ / X / 모국어 */}
      <Sheet visible={phase === 'mistake'} onClose={retry}>
        {out ? (
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ReactionBadge mark={out.mark} size={28} />
              <T s="label">{out.label}</T>
              <View style={{ flex: 1 }} />
              {out.lifeDelta < 0 ? <T s="small" style={{ color: C.red, fontFamily: F.b }}>체력 -1</T> : <T s="small">체력은 그대로예요</T>}
            </View>
            <T s="h2">{out.native ? '한국어로는 이렇게 말해요' : out.mark === '?' ? '무슨 뜻인지 잘 모르겠대요' : out.mark === '△' ? `${ch.name}${josa(ch.name)} 고개를 갸웃해요` : `${ch.name} 표정이 굳었어요`}</T>
            <View style={{ backgroundColor: C.bg, borderRadius: 14, padding: 12 }}>
              <T s="small">내 답</T>
              <T s="body" style={{ marginTop: 2 }}>"{answer}"</T>
            </View>
            {!out.native && out.why ? (
              <>
                <T s="label">왜 {out.mark === '△' ? '아쉬웠을까?' : out.mark === '?' ? '헷갈렸을까?' : '문제였을까?'}</T>
                <T s="sub">{out.why}</T>
                {out.whySub ? <T s="small">{out.whySub}</T> : null}
              </>
            ) : null}
            {out.mark === '?' && !out.native ? <T s="small">음성으로 답했다면 인식된 문장이 맞는지도 확인해 보세요.</T> : null}
            {out.better ? (
              <View style={{ borderLeftWidth: 3, borderLeftColor: C.lime, paddingLeft: 10 }}>
                <T s="small">{out.native ? '따라 말해 보세요' : '이렇게 말하면 좋아요'}</T>
                <T s="body" style={{ marginTop: 2 }}>"{out.better}"</T>
              </View>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              {out.mark === '△' && !out.native && (out.advance || E?.canSkip) ? <Btn label="다음 대화" kind="line" style={{ flex: 1 }} onPress={cont} /> : null}
              <Btn label={out.native ? '한국어로 다시 말하기' : out.mark === 'X' ? '정정하기' : out.mark === '?' ? '다시 말하기' : '보완해서 다시'} icon="rotate-ccw" style={{ flex: 1.3 }} onPress={retry} />
            </View>
            {out.mark === 'X' && out.tries >= 3 && E?.canSkip ? (
              <Pressable onPress={cont} style={{ alignSelf: 'center', padding: 6 }}>
                <T s="label" style={{ textDecorationLine: 'underline', color: C.sub }}>정답 보고 넘어가기</T>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </Sheet>

      {/* 턴 피드백 (O) */}
      <Sheet visible={phase === 'feedback' && !views} onClose={next}>
        {out ? (
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ReactionBadge mark="O" size={28} />
              <T s="label">{out.label}</T>
              {out.first ? <Tag label="정정 성공" tone="lime" /> : null}
            </View>
            <T s="h3">의도 전달 성공 · {ch.name} 표정이 누그러졌어요</T>
            {out.first ? (
              <View style={{ gap: 6 }}>
                <View style={{ backgroundColor: C.bg, borderRadius: 14, padding: 12 }}>
                  <T s="small">처음 답</T>
                  <T s="body" style={{ marginTop: 2, color: C.sub, textDecorationLine: 'line-through' }}>"{out.first}"</T>
                </View>
                <View style={{ backgroundColor: C.bg, borderRadius: 14, padding: 12, borderLeftWidth: 3, borderLeftColor: C.lime }}>
                  <T s="small">고친 답</T>
                  <T s="body" style={{ marginTop: 2 }}>"{answer}"</T>
                </View>
              </View>
            ) : (
              <T s="sub">"{answer}"</T>
            )}
            {/* 속도·망설임·말끝은 음성으로 답했을 때만 (텍스트 답엔 숨김) */}
            {out.tone || out.voice ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {out.tone ? <Stat k="톤" v={out.tone} /> : null}
                {out.voice && out.speed ? <Stat k="속도" v={out.speed} /> : null}
                {out.voice && out.hesitation ? <Stat k="망설임" v={out.hesitation} /> : null}
                {out.voice && out.ending ? <Stat k="말끝" v={out.ending} /> : null}
              </View>
            ) : null}
            {out.tip ? (
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                <Feather name="zap" size={16} color={C.ink} style={{ marginTop: 2 }} />
                <T s="sub" style={{ flex: 1, color: C.ink }}>{out.tip}</T>
              </View>
            ) : null}
            {out.views.length ? (
              <Pressable onPress={() => setViews(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: C.ink, borderRadius: 14, padding: 12 }}>
                <Feather name="users" size={16} />
                <T s="label" style={{ flex: 1 }}>다른 사람이 이 말을 하면?</T>
                <Feather name="chevron-right" size={18} />
              </Pressable>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              <Btn label="다시 해보기" kind="line" style={{ flex: 1 }} onPress={retry} />
              <Btn label={out.done ? '결과 보기' : '다음 대화'} icon="arrow-right" style={{ flex: 1.3 }} onPress={next} />
            </View>
          </View>
        ) : null}
      </Sheet>

      {/* 관점 전환: 같은 말, 다른 관계 */}
      <Sheet visible={views} onClose={() => setViews(false)}>
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Feather name="users" size={18} />
            <T s="h3">다른 사람이 이 말을 하면?</T>
          </View>
          <View style={{ backgroundColor: C.bg, borderRadius: 14, padding: 12 }}>
            <T s="small">내가 한 말</T>
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
          <Btn label="돌아가기" kind="line" onPress={() => setViews(false)} />
        </View>
      </Sheet>

      {/* 속마음 힌트: 1단계 단서 → 2단계 속마음 */}
      <Sheet visible={!!hint} dim={false} onClose={() => setHint(null)}>
        <View style={{ gap: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Feather name="search" size={18} />
            <T s="h3">{ch.name}의 속마음</T>
            <View style={{ flex: 1 }} />
            <Tag label={`${hintStep}/2 단계`} tone={hintStep === 2 ? 'lime' : 'grey'} />
          </View>
          <T s="label">1단계 · 단서부터 읽어 봐요</T>
          {/* 시트에 가려진 대사를 한 줄 다시 보여 줘요 */}
          {line.line ? <T s="sub" numberOfLines={2}>{ch.name}: "{line.line}"</T> : null}
          {hintErr ? <T s="label">{hintErr}</T> : null}
          <View style={{ backgroundColor: C.bg, borderRadius: 18, padding: 14, gap: 8 }}>
            {!hint?.clue.length && !hintErr ? <Dots /> : null}
            {hint?.clue.map((c, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 8 }}>
                <T s="small" style={{ width: 64 }}>{c.k}</T>
                <T s="body" style={{ flex: 1, fontSize: 14 }}>{c.v}</T>
              </View>
            ))}
          </View>
          {hintStep === 2 ? (
            <>
              <T s="label">2단계 · 진짜 속마음</T>
              <View style={{ backgroundColor: C.bg, borderRadius: 18, padding: 16, borderLeftWidth: 4, borderLeftColor: C.lime }}>
                <T s="body" style={{ fontFamily: F.m }}>{hint?.thought}</T>
              </View>
              {hint?.tip ? (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Feather name="zap" size={16} style={{ marginTop: 3 }} />
                  <T s="body" style={{ flex: 1 }}>{hint.tip}</T>
                </View>
              ) : null}
              <Btn label="돌아가서 말하기" icon="mic" onPress={() => { setHint(null); setPhase('talk'); }} />
            </>
          ) : (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Btn label="추측해서 말하기" kind="line" style={{ flex: 1 }} onPress={() => { setHint(null); setPhase('talk'); }} />
              <Btn label="속마음 보기" icon="eye" style={{ flex: 1.3 }} onPress={revealThought} />
            </View>
          )}
        </View>
      </Sheet>

      {/* 일시정지 */}
      <Modal visible={pause} transparent animationType="fade" onRequestClose={() => setPause(false)}>
        <View style={{ ...FRAME, backgroundColor: C.dim, justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: C.white, borderRadius: 24, padding: 24, gap: 10, width: '100%', maxWidth: 382, alignSelf: 'center' }}>
            <IconBtn name="pause" bg={C.lime} />
            <T s="h2">잠깐 멈췄어요</T>
            <T s="sub">지금 나가도 여기까지 저장돼요.{'\n'}다음에 이어서 할 수 있어요.</T>
            <Btn label="계속하기" icon="play" onPress={() => setPause(false)} style={{ marginTop: 8 }} />
            <Btn label="설정" kind="ghost" onPress={() => { setPause(false); router.push('/settings'); }} />
            <Btn label="나가기" kind="line" onPress={() => { setPause(false); stopSpeak(); eng.current?.pause(); saveProgress('paused'); router.replace('/home'); }} />
          </View>
        </View>
      </Modal>

      {/* 장면 실패 */}
      <Modal visible={fail} transparent animationType="fade">
        <View style={{ ...FRAME, backgroundColor: C.dim, justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: C.white, borderRadius: 24, padding: 24, gap: 10, width: '100%', maxWidth: 382, alignSelf: 'center' }}>
            <Ionicons name="heart-dislike" size={36} color={C.red} />
            <T s="h2">체력이 다 떨어졌어요</T>
            <T s="sub">이번엔 {ch.call}을 설득하지 못했어요.{'\n'}괜찮아요, 실수는 연습이니까요.</T>
            {out?.tip ? (
              <View style={{ backgroundColor: C.bg, borderRadius: 14, padding: 12 }}>
                <T s="body">{out.tip}</T>
              </View>
            ) : null}
            <Btn label="힌트 보고 다시 하기" icon="search" onPress={() => { setFail(false); restart(); }} />
            <Btn label="처음부터 다시" kind="line" onPress={restart} />
            {E?.mode === 'mock' ? (
            <Pressable
              onPress={() => {
                if (st.coins >= 50) { st.addCoins(-50); if (eng.current) eng.current.lives = eng.current.maxLives; setHearts(eng.current?.maxLives ?? 3); setFail(false); retry(); }
              }}
              style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 4 }}
            >
              <T s="small">체력은 30분마다 1개씩 차요 ·</T>
              <T s="label" style={{ textDecorationLine: 'underline' }}>50 코인으로 채우기</T>
            </Pressable>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* 대화 내역 */}
      <Sheet visible={history} onClose={() => setHistory(false)}>
        <T s="h2">대화 내역</T>
        <T s="small" style={{ marginBottom: 12 }}>{[scene.no, scene.title, ch.name].filter(Boolean).join(' · ')}</T>
        <ScrollView style={{ maxHeight: 380 }} contentContainerStyle={{ gap: 10 }}>
          {log.map((m, i) => (
            <View key={i} style={{ alignSelf: m.who === 'me' ? 'flex-end' : 'flex-start', maxWidth: '82%' }}>
              <View style={{ backgroundColor: m.who === 'me' ? C.ink : C.bg, borderRadius: 16, padding: 12, paddingRight: m.mark ? 22 : 12 }}>
                <T style={{ color: m.who === 'me' ? C.white : C.ink }}>{m.text}</T>
              </View>
              {/* F안: 반응 말풍선마다 배지가 남아서 어디서 실수했는지 보여요 */}
              {m.mark ? (
                <View style={{ position: 'absolute', top: -8, right: -8 }}>
                  <ReactionBadge mark={m.mark} size={24} />
                </View>
              ) : null}
            </View>
          ))}
          {!log.length ? <T s="sub">아직 주고받은 말이 없어요.</T> : null}
        </ScrollView>
      </Sheet>
    </ImageBackground>
  );
}

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

const josa = (w: string) => ((w.charCodeAt(w.length - 1) - 0xac00) % 28 ? '이' : '가');
