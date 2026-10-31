import { ScrollView, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Btn, Card, Coin, Screen, T, Tag } from '../components/ui';
import { C, F } from '../lib/theme';
import { useStore } from '../lib/store';
import { ReportCard } from '../components/report-card';

// 15 결과: 방금 끝낸 장면의 결과 (저장돼 있어서 새로고침해도 그대로)
export default function Result() {
  const st = useStore();
  const r = st.lastResult;
  if (!r) {
    return (
      <Screen>
        <View style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 12 }}>
          <T s="h2">아직 끝낸 장면이 없어요</T>
          <Btn label="홈으로" onPress={() => router.replace('/home')} />
        </View>
      </Screen>
    );
  }
  const next = r.nextSceneId;
  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 14 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Tag label="장면 완료" tone="white" />
          {r.coins ? (
            <View style={{ backgroundColor: C.lime, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, flexDirection: 'row', gap: 4, alignItems: 'center' }}>
              <Coin size={13} />
              <T s="label">+{r.coins} 코인</T>
            </View>
          ) : null}
        </View>
        <Card style={{ alignItems: 'center', paddingVertical: 28 }}>
          <T s="small">{r.title}</T>
          {r.grade ? <T style={{ fontFamily: F.k, fontSize: 72, lineHeight: 84 }}>{r.grade}</T> : <T s="h1" style={{ marginVertical: 12 }}>장면 완료</T>}
          {r.goal ? <T s="h3" style={{ textAlign: 'center' }}>목표 · {r.goal}</T> : null}
          <T s="sub" style={{ marginTop: 4 }}>{r.mistakes ? `말실수 ${r.mistakes}번 · ${r.fixed.length ? `${r.fixed.length}번 고쳐 말했어요` : '다음엔 힌트를 먼저 봐요'}` : '말실수 없이 끝냈어요'}</T>
        </Card>

        {/* 결말 (서버): 학습 점수와 별개로 이야기가 어떻게 끝났는지 */}
        {r.ending ? (
          <Card style={{ gap: 4 }}>
            <T s="small">이야기의 결말</T>
            <T s="h3">{r.ending.title}</T>
            <T s="sub">{r.ending.text}</T>
          </Card>
        ) : null}

        {/* 연속 출석: 오늘 첫 장면일 때만 */}
        {r.newDay ? (
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.lime, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="zap" size={20} color={C.ink} />
            </View>
            <View style={{ flex: 1 }}>
              <T s="h3">연속 {r.streakDays}일째!</T>
              <T s="sub">{r.streakDays >= 7 ? '일주일 넘게 매일 말로 했어요' : '내일도 한 장면이면 이어져요'}</T>
            </View>
          </Card>
        ) : null}

        {/* 오늘 고친 말 */}
        {r.fixed.length ? (
          <Card style={{ gap: 10 }}>
            <T s="label">오늘 고친 말</T>
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
          <T s="label">이번 장면 성취도</T>
          <Meter k="달성률" d="대사마다 의도를 전달했는지" v={r.reach} />
          <Meter k="추론" d="힌트 없이 속마음을 읽었는지" v={r.infer} />
          <Meter k="자립 표현" d="모국어 없이 존댓말·간접 표현을 썼는지" v={r.self} />
        </Card>
        {r.best ? (
          <Card>
            <T s="small">잘한 말</T>
            <T s="body" style={{ marginTop: 4 }}>"{r.best}"</T>
          </Card>
        ) : null}
        {r.worst ? (
          <Card onPress={() => router.push('/mistakes')}>
            <T s="small" style={{ color: C.red }}>아쉬운 말</T>
            <T s="body" style={{ marginTop: 4 }}>"{r.worst}"</T>
            <T s="small" style={{ marginTop: 8 }}>오답 도감에 저장했어요 · 보러 가기</T>
          </Card>
        ) : null}
        {/* 서버 상세 보고서 (데모 모드엔 없음) */}
        {r.sessionId && !st.demo ? <ReportCard sessionId={r.sessionId} /> : null}
        {st.coins >= 150 ? <Btn label="코인으로 꾸미러 가기" kind="line" icon="shopping-bag" onPress={() => router.push('/dress')} /> : null}
      </ScrollView>
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16 }}>
        {next ? (
          <>
            <Btn label="홈으로" kind="line" style={{ flex: 1 }} onPress={() => router.replace('/home')} />
            <Btn label="다음 장면" icon="arrow-right" style={{ flex: 1.3 }} onPress={() => router.replace({ pathname: '/scene/[id]', params: { id: next } })} />
          </>
        ) : (
          <>
            <Btn label="다시 하기" kind="line" style={{ flex: 1 }} onPress={() => router.replace({ pathname: '/scene/[id]', params: { id: r.sceneId } })} />
            <Btn label="홈으로" icon="home" style={{ flex: 1.3 }} onPress={() => router.replace('/home')} />
          </>
        )}
      </View>
    </Screen>
  );
}

function Meter({ k, d, v }: { k: string; d: string; v: number | null }) {
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
        <T s="label" style={{ flex: 1 }}>{k}</T>
        {v == null ? <T s="small">측정값 없음</T> : <T s="h3">{v}%</T>}
      </View>
      <View style={{ height: 8, borderRadius: 4, backgroundColor: C.bg, overflow: 'hidden' }}>
        {v != null ? <View style={{ width: `${v}%`, height: 8, borderRadius: 4, backgroundColor: C.ink }} /> : null}
      </View>
      <T s="small">{d}</T>
    </View>
  );
}
