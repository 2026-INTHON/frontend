import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Btn, Card, Coin, Screen, T } from '../components/ui';
import { C } from '../lib/theme';
import { TurnRec, useStore } from '../lib/store';
import { charById } from '../lib/data';
import { speak, stopSpeak } from '../lib/voice';
import { ReactionBadge } from '../components/scene-parts';
import type { Emotion } from '../lib/api';
import { ReportCard } from '../components/report-card';
import { ExportCard } from '../components/export-card';
import { RecordingResult } from '../components/screen-recording';
import { EndingDialogue, RecapCard } from '../components/ending-story';
import { api, ApiError } from '../lib/api';
import { Ending, normEnding } from '../lib/engine';
import { useLang, useT } from '../lib/i18n';

// 15 결과: 학습 먼저. 결과 → 원인 → 고치기 → 연습 순서 (저장돼 있어서 새로고침해도 그대로)
// 서버·대본이 준 값만 보여 주고, 없는 줄은 숨겨요 (지어내지 않아요).
export default function Result() {
  const st = useStore();
  const t = useT();
  const lang = useLang();
  const q = useLocalSearchParams<{ sessionId?: string }>();
  const r = st.lastResult;
  const [open, setOpen] = useState<number | null>(null);
  const [askOpen, setAskOpen] = useState(false);
  const [voice, setVoice] = useState<'idle' | 'playing' | 'error'>('idle');
  useEffect(() => () => stopSpeak(), []);
  // 완료 알림으로 열었는데 다른 세션이면 그 세션의 보고서만 보여 줘요
  if (q.sessionId && q.sessionId !== r?.sessionId) return <SessionResult id={String(q.sessionId)} />;
  if (!r) {
    return (
      <Screen>
        <View style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 12 }}>
          <T s="h2">{t('아직 끝낸 장면이 없어요')}</T>
          <Btn label={t('홈으로')} onPress={() => router.replace('/home')} />
        </View>
      </Screen>
    );
  }
  const next = r.nextSceneId;
  const char = r.char ?? st.lastPlayed?.char ?? st.char;
  const persona = r.persona ?? st.persona;
  const name = t(charById(char).name);
  const turns = r.turns ?? [];
  const why = (x: TurnRec) => (lang !== 'ko' && x.whySub ? x.whySub : x.why);
  // 2) 분위기가 바뀐 순간: 기분이 가장 크게 떨어진 X 턴, 없으면 첫 X 턴
  const xs = turns.map((x, i) => ({ x, i })).filter(({ x }) => x.mark === 'X');
  const drop = (i: number) => (i > 0 && turns[i].emotion && turns[i - 1].emotion ? MOOD[turns[i - 1].emotion!] - MOOD[turns[i].emotion!] : 0);
  const key = xs.length ? xs.reduce((a, b) => (drop(b.i) > drop(a.i) ? b : a)).x : null;
  // 4) 잘한 표현: O 받은 문장
  const good = turns.filter((x) => x.mark === 'O').map((x) => x.said);
  const goodList = good.length ? good : r.best && !turns.length ? [r.best] : [];
  // 5) 감각 포인트: 판정 때 받은 팁 1~2개, 상대 바꾸기 질문은 관점 전환 데이터가 있을 때만
  const tips = Array.from(new Set(turns.map((x) => x.tip).filter((x): x is string => !!x))).slice(0, 2);
  const ask = turns.flatMap((x) => x.views ?? []).find((v) => v.who && v.meaning);
  // 6) 메인 버튼: 틀린 문장 다시 말해 보기 (복습 노트 상세에서 듣고 다시 연습)
  const retryTarget = key?.mistakeId ?? turns.find((x) => x.mistakeId)?.mistakeId;
  const moods = turns.filter((x) => x.emotion).map((x) => MOOD[x.emotion!]);
  const live = !!r.sessionId && !st.demo;
  const ending = r.ending;

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 14 }}>
        <RecordingResult owner={r.recordingId} />
        {/* Keep the deployed full character / final dialogue, with PR #49's report below. */}
        <T s="small">{r.title || t('장면 완료')}</T>
        {ending?<EndingDialogue ending={ending} char={char} sessionId={live?r.sessionId:null} pack={st.pack}/>:null}
        {ending?<RecapCard ending={ending}/>:null}

        {/* 2) 분위기가 바뀐 순간 */}
        {key ? (
          <Card style={{ gap: 10, borderLeftWidth: 4, borderLeftColor: C.red }}>
            <T s="label">{t('분위기가 바뀐 순간')}</T>
            {key.npc ? <T s="small">{name}: "{key.npc}"</T> : null}
            <Row k={t('내가 한 말')} v={`"${key.said}"`} strike />
            {/* 내 의도: 서버가 아직 주지 않는 값이라 숨김 */}
            {why(key) ? <Row k={t('상대에게 들린 뜻')} v={why(key)} /> : null}
            {key.better ? (
              <View style={{ backgroundColor: C.bg, borderRadius: 14, padding: 12, gap: 6 }}>
                <T s="small">{t('이렇게 말했다면')}</T>
                <T s="body">"{key.better}"</T>
                <Pressable
                  onPress={() => {
                    if (voice === 'playing') { stopSpeak(); return setVoice('idle'); }
                    setVoice('playing');
                    speak(key.better, { char, persona, lang: st.pack === 'ko' ? 'ko-KR' : 'en-US', onDone: () => setVoice('idle'), onError: () => setVoice('error') });
                  }}
                  accessibilityRole="button"
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: C.white, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 }}
                >
                  <Feather name={voice === 'playing' ? 'pause' : 'volume-2'} size={14} color={C.ink} />
                  <T s="label" style={{ fontSize: 13 }}>{voice === 'playing' ? t('멈추기') : voice === 'error' ? t('음성을 못 불러왔어요 · 다시 듣기') : t('듣기')}</T>
                </Pressable>
              </View>
            ) : null}
          </Card>
        ) : null}

        {/* 3) 대화 다시 보기: 기분 변화 선 + 턴별 배지 */}
        {turns.length ? (
          <Card style={{ gap: 10 }}>
            <T s="label">{t('대화 다시 보기')}</T>
            {moods.length >= 2 ? <MoodLine values={moods} label={t('{name}의 기분', { name })} /> : null}
            {turns.map((x, i) => {
              const on = open === i;
              return (
                <Pressable key={i} onPress={() => setOpen(on ? null : i)} accessibilityRole="button" accessibilityState={{ expanded: on }} style={{ backgroundColor: on ? C.bg : C.white, borderRadius: 14, borderWidth: 1, borderColor: C.line, padding: 10, gap: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <ReactionBadge mark={x.mark} size={24} />
                    <T s="body" style={{ flex: 1 }} numberOfLines={on ? undefined : 1}>"{x.said}"</T>
                    <Feather name={on ? 'chevron-up' : 'chevron-down'} size={16} color={C.sub} />
                  </View>
                  {on ? (
                    <View style={{ gap: 6, paddingLeft: 34 }}>
                      {x.reply ? <T s="small">{name}: "{x.reply}"</T> : null}
                      {/* 의도: 서버 값이 없어서 숨김 */}
                      {why(x) ? <Row k={t('상대가 느낀 점')} v={why(x)} /> : null}
                      {x.mark !== 'O' && x.better ? <Row k={t('더 나은 표현')} v={`"${x.better}"`} /> : null}
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </Card>
        ) : null}

        {/* 4) 잘한 표현 */}
        {goodList.length ? (
          <Card style={{ gap: 6 }}>
            <T s="label">{t('잘한 표현')}</T>
            {goodList.map((g, i) => <T key={i} s="body">"{g}"</T>)}
          </Card>
        ) : null}

        {/* 5) 오늘의 감각 포인트 + 상대 바꾸기 질문 */}
        {tips.length || ask ? (
          <Card style={{ gap: 10 }}>
            <T s="label">{t('오늘의 감각 포인트')}</T>
            {tips.map((x, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 8 }}>
                <Feather name="zap" size={15} color={C.ink} style={{ marginTop: 3 }} />
                <T s="body" style={{ flex: 1 }}>{x}</T>
              </View>
            ))}
            {ask ? (
              <Pressable onPress={() => setAskOpen((o) => !o)} accessibilityRole="button" accessibilityState={{ expanded: askOpen }} style={{ borderWidth: 1.5, borderColor: C.ink, borderRadius: 14, padding: 12, gap: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Feather name="users" size={15} />
                  <T s="label" style={{ flex: 1 }}>{t('{who} 같은 말을 한다면?', { who: ask.who })}</T>
                  <Feather name={askOpen ? 'chevron-up' : 'chevron-down'} size={16} />
                </View>
                {askOpen ? (
                  <>
                    <T s="body">{ask.meaning}</T>
                    {ask.cue ? <T s="small">{ask.cue}</T> : null}
                  </>
                ) : null}
              </Pressable>
            ) : null}
          </Card>
        ) : null}

        {/* 예전 기록(턴 기록 없음): 저장된 고친 말만 */}
        {!turns.length && r.review?.length ? (
          <Card style={{ gap: 8 }}>
            <T s="label">{t('복습할 표현')}</T>
            {r.review.map((x, i) => (
              <View key={i} style={{ gap: 2 }}>
                <T s="body" style={{ color: C.sub, textDecorationLine: 'line-through' }}>"{x.said}"</T>
                <T s="body">"{x.better}"</T>
              </View>
            ))}
          </Card>
        ) : null}

        {live&&r.sessionId?<ExportCard sessionId={r.sessionId}/>:null}
        {(r.saved ?? 0) > 0 ? (
          <Pressable onPress={() => router.push('/mistakes')} accessibilityRole="button" style={{ alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Feather name="book" size={13} color={C.sub} />
            <T s="small">{t('복습 노트 {n}개 저장됨', { n: r.saved ?? 0 })}</T>
          </Pressable>
        ) : null}
        {r.coins ? (
          <View style={{ alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Coin size={11} />
            <T s="small">{t('+{n} 코인', { n: r.coins })}</T>
          </View>
        ) : null}
      </ScrollView>
      <View style={{ paddingHorizontal: 16, gap: 8 }}>
        {retryTarget ? <Btn label={t('틀린 문장 복습하기')} icon="book-open" onPress={() => router.push({ pathname: '/mistake/[id]', params: { id: retryTarget } })} /> : null}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {/* 버튼 이름 = 실제 이동 */}
          {next ? (
            <Btn label={t('다음 장면')} small={!!retryTarget} kind={retryTarget ? 'line' : 'dark'} icon="arrow-right" style={{ flex: 1 }} onPress={() => router.replace({ pathname: '/scene/[id]', params: { id: next } })} />
          ) : (
            <Btn label={t('다시 연습하기')} small={!!retryTarget} kind={retryTarget ? 'line' : 'dark'} icon="rotate-ccw" style={{ flex: 1 }} onPress={() => router.replace({ pathname: '/scene/[id]', params: live ? { id: r.sceneId, retryOf: r.sessionId! } : { id: r.sceneId } })} />
          )}
          <Btn label={t('홈으로')} small={!!retryTarget} kind="ghost" icon="home" style={{ flex: 0.8 }} onPress={() => router.replace('/home')} />
        </View>
      </View>
    </Screen>
  );
}

// 캐릭터 기분: 좋음 2 ~ 화남 -2
const MOOD: Record<Emotion, number> = { happy: 2, neutral: 1, confused: 0, sad: -1, angry: -2 };

function Row({ k, v, strike }: { k: string; v: string; strike?: boolean }) {
  return (
    <View style={{ gap: 2 }}>
      <T s="small">{k}</T>
      <T s="body" style={strike ? { color: C.sub, textDecorationLine: 'line-through' } : undefined}>{v}</T>
    </View>
  );
}

// 턴마다 캐릭터 기분을 점으로 잇는 선 (위 = 좋음)
function MoodLine({ values, label }: { values: number[]; label: string }) {
  const [w, setW] = useState(0);
  const H = 56;
  const pad = 8;
  const pts = values.map((v, i) => ({ x: pad + (values.length === 1 ? 0 : (i * (w - pad * 2)) / (values.length - 1)), y: pad + ((2 - v) / 4) * (H - pad * 2) }));
  return (
    <View style={{ gap: 4 }} accessible accessibilityLabel={label}>
      <T s="small">{label}</T>
      <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height: H, backgroundColor: C.bg, borderRadius: 12 }}>
        {w
          ? pts.slice(1).map((p, i) => {
              const a = pts[i];
              const len = Math.hypot(p.x - a.x, p.y - a.y);
              const ang = Math.atan2(p.y - a.y, p.x - a.x);
              return <View key={`l${i}`} style={{ position: 'absolute', left: (a.x + p.x) / 2 - len / 2, top: (a.y + p.y) / 2 - 1, width: len, height: 2, backgroundColor: C.ink, transform: [{ rotate: `${ang}rad` }] }} />;
            })
          : null}
        {w ? pts.map((p, i) => <View key={`d${i}`} style={{ position: 'absolute', left: p.x - 5, top: p.y - 5, width: 10, height: 10, borderRadius: 5, backgroundColor: values[i] >= 1 ? C.lime : values[i] <= -1 ? C.red : C.white, borderWidth: 2, borderColor: C.ink }} />) : null}
      </View>
    </View>
  );
}

// 알림·재접속으로 연 다른 세션: 저장된 엔딩을 GET 으로 다시 불러와요 (새로 생성하지 않음)
function SessionResult({ id }: { id: string }) {
  const st = useStore();
  const t = useT();
  const [res, setRes] = useState<{ id: string; ending: Ending | null; err: string | null } | null>(null);
  useEffect(() => {
    let alive = true;
    api
      .ending(id)
      .then((x) => alive && setRes({ id, ending: normEnding(x), err: null }))
      .catch((e) => alive && setRes({ id, ending: null, err: e instanceof ApiError && e.status === 409 ? t('아직 진행 중인 대화예요.') : e instanceof ApiError && e.status === 404 ? t('이 대화의 결과를 찾지 못했어요.') : t('결과를 불러오지 못했어요.') }));
    return () => {
      alive = false;
    };
  }, [id, t]);
  const cur = res?.id === id ? res : null;
  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 14 }}>
        <T s="h2">{t('대화 결과')}</T>
        {!cur ? <ActivityIndicator color={C.ink} /> : null}
        {cur?.err ? <T s="sub">{cur.err}</T> : null}
        {cur?.ending ? <EndingDialogue ending={cur.ending} char={st.char} sessionId={id} pack={st.pack} /> : null}
        {cur?.ending ? <RecapCard ending={cur.ending} /> : null}
        <ReportCard sessionId={id} />
        {cur&&!cur.err?<ExportCard sessionId={id}/>:null}
      </ScrollView>
      <View style={{ paddingHorizontal: 16 }}>
        <Btn label={t('홈으로')} icon="home" onPress={() => router.replace('/home')} />
      </View>
    </Screen>
  );
}
