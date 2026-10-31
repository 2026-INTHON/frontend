import { ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Btn, Card, Coin, Screen, T, Tag } from '../components/ui';
import { C, F } from '../lib/theme';
import { sceneById } from '../lib/data';

// 15 결과
export default function Result() {
  const p = useLocalSearchParams<{ id: string; title?: string; no?: string; goal?: string; coins?: string; grade: string; m: string; fixed: string; best: string; worst: string; reach?: string; infer?: string; self?: string }>();
  const scene = sceneById(String(p.id));
  const m = Number(p.m || 0);
  const title = p.title || scene.title;
  const goal = p.goal || scene.goal;
  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 14 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Tag label={`장면 완료 · ${p.no || scene.no}`} tone="white" />
          <View style={{ backgroundColor: C.lime, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, flexDirection: 'row', gap: 4, alignItems: 'center' }}>
            <Coin size={13} />
            <T s="label">+{p.coins || 30} 코인</T>
          </View>
        </View>
        <Card style={{ alignItems: 'center', paddingVertical: 28 }}>
          <T s="small">{title}</T>
          <T style={{ fontFamily: F.k, fontSize: 72, lineHeight: 84 }}>{p.grade || 'A'}</T>
          <T s="h3" style={{ textAlign: 'center' }}>{goal.replace('받기', '받아냈어요').replace('정하기', '정했어요')}</T>
          <T s="sub" style={{ marginTop: 4 }}>{m ? `사건 ${m}번 · ${Number(p.fixed) ? '다시 해보기로 수습 성공' : '다음엔 힌트를 먼저 봐요'}` : '실수 없이 끝냈어요'}</T>
        </Card>
        {/* 학습 성취도 3가지 */}
        <Card style={{ gap: 14 }}>
          <T s="label">이번 장면 성취도</T>
          <Meter k="달성률" d="대사마다 의도를 전달했는지" v={Number(p.reach ?? 100)} />
          <Meter k="추론" d="힌트 없이 속마음을 읽었는지" v={Number(p.infer ?? 80)} />
          <Meter k="자립 표현" d="모국어 없이 존댓말·간접 표현을 썼는지" v={Number(p.self ?? 80)} />
        </Card>
        {p.best ? (
          <Card>
            <T s="small">잘한 말</T>
            <T s="body" style={{ marginTop: 4 }}>"{p.best}"</T>
          </Card>
        ) : null}
        {p.worst ? (
          <Card>
            <T s="small" style={{ color: C.red }}>아쉬운 말</T>
            <T s="body" style={{ marginTop: 4 }}>"{p.worst}"</T>
            <T s="small" style={{ marginTop: 8 }}>오답 도감에 저장했어요</T>
          </Card>
        ) : null}
      </ScrollView>
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16 }}>
        <Btn label="다른 캐릭터" kind="line" style={{ flex: 1 }} onPress={() => router.replace('/onboarding/character')} />
        <Btn label="다음 장면" icon="arrow-right" style={{ flex: 1.3 }} onPress={() => router.replace('/home')} />
      </View>
    </Screen>
  );
}

function Meter({ k, d, v }: { k: string; d: string; v: number }) {
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
        <T s="label" style={{ flex: 1 }}>{k}</T>
        <T s="h3">{v}%</T>
      </View>
      <View style={{ height: 8, borderRadius: 4, backgroundColor: C.bg, overflow: 'hidden' }}>
        <View style={{ width: `${v}%`, height: 8, borderRadius: 4, backgroundColor: v >= 80 ? C.lime : C.ink }} />
      </View>
      <T s="small">{d}</T>
    </View>
  );
}
