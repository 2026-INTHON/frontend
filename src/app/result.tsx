import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Btn, Card, Coin, Screen, T, Tag } from '../components/ui';
import { C, F } from '../lib/theme';
import { useStore } from '../lib/store';
import { ReportCard } from '../components/report-card';
import { EndingDialogue, RecapCard } from '../components/ending-story';
import { api, ApiError } from '../lib/api';
import { Ending, normEnding } from '../lib/engine';
import { resultCopy } from '../lib/result-copy';

// 15 결과: 방금 끝낸 장면의 결과 (저장돼 있어서 새로고침해도 그대로)
export default function Result() {
  const st = useStore();
  const copy = resultCopy(st.lang);
  const q = useLocalSearchParams<{ sessionId?: string }>();
  const r = st.lastResult;
  // 완료 알림으로 열었는데 다른 세션이면 그 세션의 보고서만 보여 줘요
  if (q.sessionId && q.sessionId !== r?.sessionId) return <SessionResult id={String(q.sessionId)} />;
  if (!r) {
    return (
      <Screen>
        <View style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 12 }}>
          <T s="h2">{copy.empty}</T>
          <Btn label={copy.home} onPress={() => router.replace('/home')} />
        </View>
      </Screen>
    );
  }
  const next = r.nextSceneId;
  const char = st.lastPlayed?.char ?? st.char;
  const live = !!r.sessionId && !st.demo;
  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 14 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Tag label={copy.done} tone="white" />
          {r.coins ? (
            <View style={{ backgroundColor: C.lime, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, flexDirection: 'row', gap: 4, alignItems: 'center' }}>
              <Coin size={13} />
              <T s="label">+{r.coins} {copy.coins}</T>
            </View>
          ) : null}
        </View>
        {/* 1) 마지막 반응 대사 (표정·자막·음성) → 2) 정리 카드 */}
        {r.ending ? <EndingDialogue ending={r.ending} char={char} sessionId={st.demo ? null : r.sessionId} pack={st.pack} /> : null}
        {r.ending ? <RecapCard ending={r.ending} /> : null}

        {/* 학습 성과 (결말과 별개) */}
        <Card style={{ alignItems: 'center', paddingVertical: 28 }}>
          <T s="small">{r.title}</T>
          {r.grade ? <T style={{ fontFamily: F.k, fontSize: 72, lineHeight: 84 }}>{r.grade}</T> : <T s="h1" style={{ marginVertical: 12 }}>{copy.done}</T>}
          <T s="sub" style={{ marginTop: 4 }}>{r.mistakes ? `${copy.mistakes(r.mistakes)} · ${r.fixed.length ? copy.fixed(r.fixed.length) : copy.hint}` : copy.clean}</T>
        </Card>

        {/* 연속 출석: 오늘 첫 장면일 때만 */}
        {r.newDay ? (
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.lime, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="zap" size={20} color={C.ink} />
            </View>
            <View style={{ flex: 1 }}>
              <T s="h3">{copy.streak(r.streakDays)}</T>
              <T s="sub">{copy.keep}</T>
            </View>
          </Card>
        ) : null}

        {/* 오늘 고친 말 */}
        {r.fixed.length ? (
          <Card style={{ gap: 10 }}>
            <T s="label">{copy.corrections}</T>
            {r.fixed.map((f, i) => (
              <View key={i} style={{ gap: 2 }}>
                <T s="body" style={{ color: C.sub, textDecorationLine: 'line-through' }}>"{f.said}"</T>
                <T s="body">"{f.better}"</T>
              </View>
            ))}
          </Card>
        ) : null}

        {/* 학습 성취도 3가지 (서버 값이 없으면 측정값 없음) */}
        <Card style={{ gap: 14 }}>
          <T s="label">{copy.metrics}</T>
          <Meter k={copy.reach} d={copy.reachHint} v={r.reach} noData={copy.noData} />
          <Meter k={copy.infer} v={r.infer} noData={copy.noData} />
          <Meter k={copy.self} v={r.self} noData={copy.noData} />
        </Card>
        {r.best ? (
          <Card>
            <T s="small">{copy.best}</T>
            <T s="body" style={{ marginTop: 4 }}>"{r.best}"</T>
          </Card>
        ) : null}
        {r.worst ? (
          <Card onPress={() => router.push('/mistakes')}>
            <T s="small" style={{ color: C.red }}>{copy.review}</T>
            <T s="body" style={{ marginTop: 4 }}>"{r.worst}"</T>
            <T s="small" style={{ marginTop: 8 }}>{copy.saved}</T>
          </Card>
        ) : null}
        {/* 서버 상세 보고서 (데모 모드엔 없음) */}
        {r.sessionId && !st.demo ? <ReportCard sessionId={r.sessionId} /> : null}
        {st.coins >= 150 ? <Btn label={copy.dress} kind="line" icon="shopping-bag" onPress={() => router.push('/dress')} /> : null}
        {next ? <Btn label={copy.home} kind="ghost" small icon="home" onPress={() => router.replace('/home')} /> : null}
      </ScrollView>
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16 }}>
        {/* 다시 도전: 서버는 retry 로 새 세션 (기존 결과는 그대로) */}
        <Btn label={copy.retry} kind="line" icon="rotate-ccw" style={{ flex: 1 }} onPress={() => router.replace({ pathname: '/scene/[id]', params: live ? { id: r.sceneId, retryOf: r.sessionId! } : { id: r.sceneId } })} />
        {/* 버튼 이름 = 실제 이동: 다음 장면이 있으면 '다음 장면', 없으면 '홈으로' */}
        {next ? <Btn label={copy.next} icon="arrow-right" style={{ flex: 1.3 }} onPress={() => router.replace({ pathname: '/scene/[id]', params: { id: next } })} /> : <Btn label={copy.home} icon="home" style={{ flex: 1.3 }} onPress={() => router.replace('/home')} />}
      </View>
    </Screen>
  );
}

function Meter({ k, d, v, noData }: { k: string; d?: string; v: number | null; noData: string }) {
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
        <T s="label" style={{ flex: 1 }}>{k}</T>
        {v == null ? <T s="small">{noData}</T> : <T s="h3">{v}%</T>}
      </View>
      <View style={{ height: 8, borderRadius: 4, backgroundColor: C.bg, overflow: 'hidden' }}>
        {v != null ? <View style={{ width: `${v}%`, height: 8, borderRadius: 4, backgroundColor: C.ink }} /> : null}
      </View>
      {d ? <T s="small">{d}</T> : null}
    </View>
  );
}

// 알림·재접속으로 연 다른 세션: 저장된 엔딩을 GET 으로 다시 불러와요 (새로 생성하지 않음)
function SessionResult({ id }: { id: string }) {
  const st = useStore();
  const copy = resultCopy(st.lang);
  const [res, setRes] = useState<{ id: string; ending: Ending | null; err: string | null } | null>(null);
  useEffect(() => {
    let alive = true;
    api
      .ending(id)
      .then((x) => alive && setRes({ id, ending: normEnding(x), err: null }))
      .catch((e) => alive && setRes({ id, ending: null, err: e instanceof ApiError && e.status === 409 ? copy.active : e instanceof ApiError && e.status === 404 ? copy.missing : copy.error }));
    return () => {
      alive = false;
    };
  }, [id, copy]);
  const cur = res?.id === id ? res : null;
  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 14 }}>
        <T s="h2">{copy.result}</T>
        {!cur ? <ActivityIndicator color={C.ink} /> : null}
        {cur?.err ? <T s="sub">{cur.err}</T> : null}
        {cur?.ending ? <EndingDialogue ending={cur.ending} char={st.char} sessionId={id} pack={st.pack} /> : null}
        {cur?.ending ? <RecapCard ending={cur.ending} /> : null}
        <ReportCard sessionId={id} />
      </ScrollView>
      <View style={{ paddingHorizontal: 16 }}>
        <Btn label={copy.home} icon="home" onPress={() => router.replace('/home')} />
      </View>
    </Screen>
  );
}
