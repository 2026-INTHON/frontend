import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Btn, Card, Coin, Screen, T, Tag } from '../components/ui';
import { C, F } from '../lib/theme';
import { useStore } from '../lib/store';
import { ReportCard } from '../components/report-card';
import { EndingDialogue, RecapCard } from '../components/ending-story';
import { api, ApiError } from '../lib/api';
import { Ending, normEnding } from '../lib/engine';
import { useT } from '../lib/i18n';

// 15 결과: 방금 끝낸 장면의 결과 (저장돼 있어서 새로고침해도 그대로)
export default function Result() {
  const st = useStore();
  const t = useT();
  const q = useLocalSearchParams<{ sessionId?: string }>();
  const r = st.lastResult;
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
  const char = st.lastPlayed?.char ?? st.char;
  const live = !!r.sessionId && !st.demo;
  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 14 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Tag label={t('장면 완료')} tone="white" />
          {r.coins ? (
            <View style={{ backgroundColor: C.lime, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, flexDirection: 'row', gap: 4, alignItems: 'center' }}>
              <Coin size={13} />
              <T s="label">{t('+{n} 코인', { n: r.coins })}</T>
            </View>
          ) : null}
        </View>
        {/* 1) 마지막 반응 대사 (표정·자막·음성) → 2) 정리 카드 */}
        {r.ending ? <EndingDialogue ending={r.ending} char={char} sessionId={st.demo ? null : r.sessionId} pack={st.pack} /> : null}
        {r.ending ? <RecapCard ending={r.ending} /> : null}

        {/* 학습 성과 (결말과 별개) */}
        <Card style={{ alignItems: 'center', paddingVertical: 28 }}>
          <T s="small">{r.title}</T>
          {r.grade ? <T style={{ fontFamily: F.k, fontSize: 72, lineHeight: 84 }}>{r.grade}</T> : <T s="h1" style={{ marginVertical: 12 }}>{t('장면 완료')}</T>}
          {r.goal ? <T s="h3" style={{ textAlign: 'center' }}>{t('목표')} · {r.goal}</T> : null}
          <T s="sub" style={{ marginTop: 4 }}>{r.mistakes ? `${t('말실수 {n}번', { n: r.mistakes })} · ${r.fixed.length ? t('{n}번 고쳐 말했어요', { n: r.fixed.length }) : t('다음엔 속마음을 먼저 봐요')}` : t('말실수 없이 끝냈어요')}</T>
        </Card>

        {/* 연속 출석: 오늘 첫 장면일 때만 */}
        {r.newDay ? (
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.lime, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="zap" size={20} color={C.ink} />
            </View>
            <View style={{ flex: 1 }}>
              <T s="h3">{t('연속 {n}일째!', { n: r.streakDays })}</T>
              <T s="sub">{r.streakDays >= 7 ? t('7일 연속 연습') : t('내일도 한 장면이면 이어져요')}</T>
            </View>
          </Card>
        ) : null}

        {/* 오늘 고친 말 */}
        {r.fixed.length ? (
          <Card style={{ gap: 10 }}>
            <T s="label">{t('오늘 고친 말')}</T>
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
          <T s="label">{t('이번 장면 성취도')}</T>
          <Meter k={t('달성률')} d={t('대사마다 의도를 전달한 비율')} v={r.reach} />
          <Meter k={t('힌트 없이 답하기')} v={r.infer} />
          <Meter k={t('도움 없이 말하기')} v={r.self} />
        </Card>
        {r.best ? (
          <Card>
            <T s="small">{t('잘한 표현')}</T>
            <T s="body" style={{ marginTop: 4 }}>"{r.best}"</T>
          </Card>
        ) : null}
        {/* 복습할 표현: 아쉬웠던 답 + 예시 답변 + 이유 (대화 중엔 강요하지 않고 여기서 정리) */}
        {r.review?.length ? (
          <Card style={{ gap: 12 }}>
            <T s="small" style={{ color: C.red }}>{t('복습할 표현')}</T>
            {r.review.map((x, i) => (
              <View key={i} style={{ gap: 4, borderTopWidth: i ? 1 : 0, borderTopColor: C.line, paddingTop: i ? 12 : 0 }}>
                <T s="body" style={{ color: C.sub, textDecorationLine: 'line-through' }}>"{x.said}"</T>
                <T s="small">{t('예시 답변')}</T>
                <T s="body">"{x.better}"</T>
                {x.why ? <T s="small">{x.why}</T> : null}
              </View>
            ))}
            {r.mistakes ? (
              <Pressable onPress={() => router.push('/mistakes')} accessibilityRole="button">
                <T s="label" style={{ textDecorationLine: 'underline' }}>{t('복습 노트에 저장했어요')}</T>
              </Pressable>
            ) : null}
          </Card>
        ) : r.worst ? (
          <Card onPress={() => router.push('/mistakes')}>
            <T s="small" style={{ color: C.red }}>{t('복습할 표현')}</T>
            <T s="body" style={{ marginTop: 4 }}>"{r.worst}"</T>
            <T s="small" style={{ marginTop: 8 }}>{t('복습 노트에 저장했어요')}</T>
          </Card>
        ) : null}
        {/* 서버 상세 보고서 (데모 모드엔 없음) */}
        {r.sessionId && !st.demo ? <ReportCard sessionId={r.sessionId} /> : null}
        {st.coins >= 150 ? <Btn label={t('코인으로 꾸미러 가기')} kind="line" icon="shopping-bag" onPress={() => router.push('/dress')} /> : null}
        {next ? <Btn label={t('홈으로')} kind="ghost" small icon="home" onPress={() => router.replace('/home')} /> : null}
      </ScrollView>
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16 }}>
        {/* 다시 도전: 서버는 retry 로 새 세션 (기존 결과는 그대로) */}
        <Btn label={t('다시 연습하기')} kind="line" icon="rotate-ccw" style={{ flex: 1 }} onPress={() => router.replace({ pathname: '/scene/[id]', params: live ? { id: r.sceneId, retryOf: r.sessionId! } : { id: r.sceneId } })} />
        {/* 버튼 이름 = 실제 이동: 다음 장면이 있으면 '다음 장면', 없으면 '홈으로' */}
        {next ? <Btn label={t('다음 장면')} icon="arrow-right" style={{ flex: 1.3 }} onPress={() => router.replace({ pathname: '/scene/[id]', params: { id: next } })} /> : <Btn label={t('홈으로')} icon="home" style={{ flex: 1.3 }} onPress={() => router.replace('/home')} />}
      </View>
    </Screen>
  );
}

function Meter({ k, d, v }: { k: string; d?: string; v: number | null }) {
  const t = useT();
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
        <T s="label" style={{ flex: 1 }}>{k}</T>
        {v == null ? <T s="small">{t('기록 없음')}</T> : <T s="h3">{v}%</T>}
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
      </ScrollView>
      <View style={{ paddingHorizontal: 16 }}>
        <Btn label={t('홈으로')} icon="home" onPress={() => router.replace('/home')} />
      </View>
    </Screen>
  );
}
