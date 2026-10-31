import { useEffect, useRef, useState } from 'react';
import { Image, ImageBackground, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Btn, Hearts, IconBtn, Sheet, T, Tag } from '../../components/ui';
import { Dots, LineCard, Stat, Wave } from '../../components/scene-parts';
import { C, F } from '../../lib/theme';
import { IMG, PERSONAS, charById, sceneById } from '../../lib/data';
import { createEngine, mockEngine, Engine, Out } from '../../lib/engine';
import { speak, stopSpeak } from '../../lib/voice';
import { createAudioPlayer } from 'expo-audio';
import { useRec } from '../../lib/useRec';
import { useStore } from '../../lib/store';

type Phase = 'brief' | 'talk' | 'typing' | 'listening' | 'recognizing' | 'recognized' | 'mistake' | 'feedback';
type Log = { who: 'char' | 'me'; text: string; tag?: 'bad' | 'good' };

const TONE: Record<string, string> = { office: 'rgba(220,224,229,0.35)', cafe: 'rgba(238,230,219,0.35)', street: 'rgba(217,222,232,0.35)' };

export default function SceneScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const local = sceneById(String(id));
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
  const [line, setLine] = useState<{ line: string; action?: string }>({ line: local.turns[0].line, action: local.turns[0].action });
  const [playing, setPlaying] = useState(false);
  const [hint, setHint] = useState<{ thought: string; tip: string } | null>(null);
  const [pause, setPause] = useState(false);
  const [history, setHistory] = useState(false);
  const [fail, setFail] = useState(false);
  const [judging, setJudging] = useState(false);
  const [hintNudge, setHintNudge] = useState(false);
  const [log, setLog] = useState<Log[]>([]);
  const holdAt = useRef(0);
  const player = useRef<ReturnType<typeof createAudioPlayer> | null>(null);

  const E = eng.current;
  const charId = E?.char ?? local.char;
  const ch = charById(charId);
  const persona = PERSONAS[charId].find((p) => p.id === st.persona) ?? PERSONAS[charId][1];
  const place = E?.place ?? local.place;

  // 서버 연결 시도 → 안 되면 앱 안 대본으로
  useEffect(() => {
    let alive = true;
    createEngine(local, st.pack, st.persona).then((e) => {
      if (!alive) return;
      eng.current = e;
      setHearts(e.lives);
      setLine(e.line);
      setReady(true);
    });
    return () => {
      alive = false;
      stopSpeak();
      player.current?.remove();
    };
  }, []);

  // 브리핑 → 대화
  useEffect(() => {
    if (phase !== 'brief' || !ready) return;
    const t = setTimeout(begin, 2600);
    return () => clearTimeout(t);
  }, [phase, ready]);

  function begin() {
    if (!eng.current) return;
    setPhase('talk');
    showLine(eng.current.line);
  }

  function showLine(l: { line: string; action?: string }) {
    setLine(l);
    setLog((g) => [...g, { who: 'char', text: l.line }]);
    play(l.line);
  }

  async function play(l: string) {
    stopSpeak();
    player.current?.remove();
    player.current = null;
    setPlaying(true);
    const url = eng.current?.mode === 'live' ? await eng.current.voiceUrl() : null;
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const ok = await rec.start();
    if (!ok) {
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
      r = await e.transcribe(uri, e.sample);
    } catch {
      r = { text: e.sample };
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
    setText('');
    setJudging(true);
    let o: Out;
    try {
      o = await eng.current!.submit(ans, voice ? { transcriptId: tid } : undefined);
    } catch {
      // 서버 오류면 앱 안 대본으로 바꿔서 계속
      eng.current = mockEngine(local);
      o = await eng.current.submit(ans);
    }
    setJudging(false);
    setOut(o);
    setHearts(eng.current!.lives);
    setLog((g) => [...g, { who: 'me', text: ans, tag: o.ok ? (g.some((x) => x.tag === 'bad') ? 'good' : undefined) : 'bad' }, { who: 'char', text: o.reply }]);
    setLine({ line: o.reply });
    if (o.ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setPhase('feedback');
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      st.addMistake({ id: `${local.id}-${Date.now()}`, scene: eng.current!.title, title: eng.current!.title, who: `${ch.name} · ${persona.name}`, when: '오늘', said: ans, better: o.better, why: o.why, fixed: false, line: eng.current!.line.line });
      if (o.failed) return setFail(true);
      setPhase('mistake');
    }
  }

  function retry() {
    setLine(eng.current!.line);
    setHintNudge(true);
    setPhase('talk');
  }

  function cont() {
    // 말실수 후 계속하기
    if (eng.current!.skip()) return finish();
    setPhase('talk');
    showLine(eng.current!.line);
  }

  function next() {
    if (out?.done) return finish();
    eng.current!.next();
    setPhase('talk');
    showLine(eng.current!.line);
  }

  async function openHint() {
    setHintNudge(false);
    try {
      setHint(await eng.current!.hint());
    } catch {
      const t = local.turns[0];
      setHint({ thought: t.thought, tip: t.tip });
    }
  }

  async function finish() {
    stopPlay();
    let f;
    try {
      f = await eng.current!.final();
    } catch {
      f = { grade: 'A-', best: '', worst: '', coins: 30, mistakes: 0, fixed: 0 };
    }
    st.addCoins(f.coins);
    st.set({ lastScene: local.id });
    router.replace({ pathname: '/result', params: { id: local.id, title: eng.current!.title, no: eng.current!.no, goal: eng.current!.brief.goal, coins: String(f.coins), grade: f.grade, m: String(f.mistakes), fixed: String(f.fixed), best: f.best, worst: f.worst } });
  }

  function restart() {
    setFail(false);
    setLog([]);
    setReady(false);
    setPhase('brief');
    createEngine(local, st.pack, st.persona).then((e) => {
      eng.current = e;
      setHearts(e.lives);
      setLine(e.line);
      setReady(true);
    });
  }

  const listening = phase === 'listening';
  const busy = phase === 'recognizing';
  const showDock = phase === 'talk' || listening || busy;
  const sec = Math.floor(rec.ms / 1000);
  const scene = { no: E?.no ?? local.no, title: E?.title ?? local.title, situation: E?.brief.situation || local.situation, goal: E?.brief.goal || local.goal, partner: E?.brief.partner };

  return (
    <ImageBackground source={IMG.bg[place]} style={{ flex: 1, backgroundColor: C.bg }} resizeMode="cover">
      <View style={{ ...absFill, backgroundColor: TONE[place] }} />
      {/* 캐릭터 */}
      <Image source={IMG.char[charId]} style={{ position: 'absolute', top: ins.top + 64, alignSelf: 'center', width: '62%', height: '72%' }} resizeMode="contain" />
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '42%', backgroundColor: 'rgba(243,242,238,0.72)' }} />

      {/* 상단 단축바 */}
      <View style={{ position: 'absolute', top: ins.top + 8, left: 16, right: 16, flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', gap: 4, backgroundColor: C.white, borderRadius: 999, padding: 4 }}>
          <IconBtn name="settings" size={36} bg={C.white} onPress={() => router.push('/settings')} />
          <IconBtn name="clock" size={36} bg={C.white} onPress={() => setHistory(true)} />
          <IconBtn name="log-out" size={36} bg={C.white} onPress={() => setPause(true)} />
        </View>
        <View style={{ flex: 1 }} />
        <Hearts n={hearts} max={E?.maxLives ?? 3} />
      </View>

      {/* 속마음 돋보기 */}
      {phase !== 'brief' ? (
        <Pressable onPress={openHint} style={{ position: 'absolute', right: 24, top: ins.top + 200, alignItems: 'center', gap: 4 }}>
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
          {phase !== 'brief' ? <LineCard name={ch.name} line={line.line} action={line.action} playing={playing} onPlay={() => (playing ? stopPlay() : play(line.line))} /> : null}

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
          {phase === 'recognized' ? (
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
          {phase === 'typing' ? (
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
              <IconBtn name="mic" size={40} bg={C.bg} onPress={() => setPhase('talk')} />
              <View style={{ width: 6 }} />
              <IconBtn name="send" size={40} bg={text.trim() ? C.lime : C.bg} onPress={() => send(text)} />
            </View>
          ) : null}

          {/* 입력 도크: 텍스트 입력 / 음성 */}
          {showDock ? (
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 44, marginTop: 4 }}>
              <Pressable disabled={busy} onPress={() => setPhase('typing')} style={{ alignItems: 'center', gap: 6, opacity: busy ? 0.4 : 1 }}>
                <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="keypad-outline" size={22} color={C.ink} />
                </View>
                <T s="small" style={{ color: C.ink }}>텍스트 입력</T>
              </Pressable>
              <Pressable disabled={busy} onPressIn={micDown} onPressOut={micUp} style={{ alignItems: 'center', gap: 6 }}>
                <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: busy ? C.line : listening ? C.lime : C.ink, borderWidth: listening ? 3 : 0, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' }}>
                  {listening ? <View style={{ width: 22, height: 22, borderRadius: 5, backgroundColor: C.ink }} /> : <Feather name="mic" size={28} color={busy ? C.sub : C.lime} />}
                </View>
                <T s="small" style={{ color: C.ink }}>{busy ? '인식 중' : listening ? '탭하면 끝' : '길게 눌러 말하기'}</T>
              </Pressable>
              <View style={{ width: 52 }} />
            </View>
          ) : null}
        </View>
      </KeyboardAvoidingView>

      {/* 브리핑 */}
      {phase === 'brief' ? (
        <Pressable onPress={() => ready && begin()} style={{ ...absFill, backgroundColor: 'rgba(17,17,17,0.35)', justifyContent: 'flex-end', padding: 16, paddingBottom: ins.bottom + 16 }}>
          <View style={{ backgroundColor: C.white, borderRadius: 24, padding: 22, gap: 14 }}>
            <Tag label={`${scene.no} · ${scene.title}`} tone="lime" />
            <Brief k="상대" v={scene.partner || `${ch.call} · ${persona.name} · ${persona.short}`} />
            <Brief k="상황" v={scene.situation} />
            <Brief k="이번 목표" v={scene.goal} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Dots />
              <T s="small">{ready ? '곧 대화가 시작돼요 · 눌러서 바로 시작' : '장면을 준비하고 있어요'}</T>
            </View>
          </View>
        </Pressable>
      ) : null}

      {/* 말실수 */}
      <Sheet visible={phase === 'mistake'} onClose={retry}>
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Tag label="사건 발생" tone="red" />
            <T s="small" style={{ color: C.red, fontFamily: F.b }}>체력 -1</T>
          </View>
          <T s="h2">{ch.name} 표정이 굳었어요</T>
          <View style={{ backgroundColor: C.bg, borderRadius: 14, padding: 12 }}>
            <T s="small">내 답</T>
            <T s="body" style={{ marginTop: 2 }}>"{answer}"</T>
          </View>
          <T s="label">왜 문제였을까?</T>
          <T s="sub">{out?.why}</T>
          <View style={{ borderLeftWidth: 3, borderLeftColor: C.lime, paddingLeft: 10 }}>
            <T s="body">"{out?.better}"</T>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
            <Btn label="계속하기" kind="line" style={{ flex: 1 }} onPress={cont} />
            <Btn label="다시 해보기" icon="rotate-ccw" style={{ flex: 1.3 }} onPress={retry} />
          </View>
        </View>
      </Sheet>

      {/* 턴 피드백 */}
      <Sheet visible={phase === 'feedback'} onClose={next}>
        {out ? (
          <View style={{ gap: 12 }}>
            <Tag label="말투 피드백" tone="lime" />
            <T s="h3">의도 전달 성공 · {ch.name} 표정이 누그러졌어요</T>
            <T s="sub">"{answer}"</T>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Stat k="톤" v={out.tone} />
              <Stat k="속도" v={out.speed} />
              <Stat k="망설임" v={out.hesitation} />
              <Stat k="말끝" v={out.ending} />
            </View>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
              <Feather name="zap" size={16} color={C.ink} style={{ marginTop: 2 }} />
              <T s="sub" style={{ flex: 1, color: C.ink }}>{out.tip}</T>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              <Btn label="다시 해보기" kind="line" style={{ flex: 1 }} onPress={retry} />
              <Btn label={out.done ? '결과 보기' : '다음 대화'} icon="arrow-right" style={{ flex: 1.3 }} onPress={next} />
            </View>
          </View>
        ) : null}
      </Sheet>

      {/* 속마음 힌트 */}
      <Sheet visible={!!hint} onClose={() => setHint(null)}>
        <View style={{ gap: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Feather name="search" size={18} />
            <T s="h3">{ch.name}의 속마음</T>
          </View>
          <View style={{ backgroundColor: C.bg, borderRadius: 18, padding: 16 }}>
            <T s="body" style={{ fontFamily: F.m }}>{hint?.thought}</T>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Feather name="zap" size={16} style={{ marginTop: 3 }} />
            <T s="body" style={{ flex: 1 }}>{hint?.tip}</T>
          </View>
          <Btn label="돌아가서 말하기" icon="mic" onPress={() => { setHint(null); setPhase('talk'); }} />
        </View>
      </Sheet>

      {/* 일시정지 */}
      <Modal visible={pause} transparent animationType="fade" onRequestClose={() => setPause(false)}>
        <View style={{ flex: 1, backgroundColor: C.dim, justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: C.white, borderRadius: 24, padding: 24, gap: 10 }}>
            <IconBtn name="pause" bg={C.lime} />
            <T s="h2">잠깐 멈췄어요</T>
            <T s="sub">지금 나가도 여기까지 저장돼요.{'\n'}다음에 이어서 할 수 있어요.</T>
            <Btn label="계속하기" icon="play" onPress={() => setPause(false)} style={{ marginTop: 8 }} />
            <Btn label="나가기" kind="line" onPress={() => { setPause(false); stopSpeak(); st.set({ lastScene: local.id }); router.replace('/home'); }} />
          </View>
        </View>
      </Modal>

      {/* 장면 실패 */}
      <Modal visible={fail} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: C.dim, justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: C.white, borderRadius: 24, padding: 24, gap: 10 }}>
            <Ionicons name="heart-dislike" size={36} color={C.red} />
            <T s="h2">체력이 다 떨어졌어요</T>
            <T s="sub">이번엔 {ch.call}을 설득하지 못했어요.{'\n'}괜찮아요, 실수는 연습이니까요.</T>
            <View style={{ backgroundColor: C.bg, borderRadius: 14, padding: 12 }}>
              <T s="body">{out?.tip}</T>
            </View>
            <Btn label="힌트 보고 다시 하기" icon="search" onPress={() => { setFail(false); restart(); }} />
            <Btn label="처음부터 다시" kind="line" onPress={restart} />
            <Pressable
              onPress={() => {
                if (st.coins >= 50) { st.addCoins(-50); if (eng.current) eng.current.lives = eng.current.maxLives; setHearts(eng.current?.maxLives ?? 3); setFail(false); retry(); }
              }}
              style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 4 }}
            >
              <T s="small">체력은 30분마다 1개씩 차요 ·</T>
              <T s="label" style={{ textDecorationLine: 'underline' }}>50 코인으로 채우기</T>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* 대화 내역 */}
      <Sheet visible={history} onClose={() => setHistory(false)}>
        <T s="h2">대화 내역</T>
        <T s="small" style={{ marginBottom: 12 }}>{scene.no} · {scene.title} · {ch.name}</T>
        <ScrollView style={{ maxHeight: 380 }} contentContainerStyle={{ gap: 10 }}>
          {log.map((m, i) => (
            <View key={i} style={{ alignSelf: m.who === 'me' ? 'flex-end' : 'flex-start', maxWidth: '82%', gap: 4 }}>
              {m.tag ? <Tag label={m.tag === 'bad' ? '말실수' : '수습 성공'} tone={m.tag === 'bad' ? 'red' : 'lime'} /> : null}
              <View style={{ backgroundColor: m.who === 'me' ? C.ink : C.bg, borderRadius: 16, padding: 12 }}>
                <T style={{ color: m.who === 'me' ? C.white : C.ink }}>{m.text}</T>
              </View>
            </View>
          ))}
          {!log.length ? <T s="sub">아직 주고받은 말이 없어요.</T> : null}
        </ScrollView>
      </Sheet>
    </ImageBackground>
  );
}

const absFill = { position: 'absolute' as const, left: 0, right: 0, top: 0, bottom: 0 };

function Brief({ k, v }: { k: string; v: string }) {
  return (
    <View style={{ gap: 2 }}>
      <T s="small">{k}</T>
      <T s="h3" style={{ fontSize: 16 }}>{v}</T>
    </View>
  );
}
