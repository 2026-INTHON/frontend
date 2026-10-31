import { ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Btn, Card, Coin, Screen, T, Tag } from '../components/ui';
import { Stat } from '../components/scene-parts';
import { C, F } from '../lib/theme';
import { sceneById } from '../lib/data';

// 15 결과
export default function Result() {
  const p = useLocalSearchParams<{ id: string; title?: string; no?: string; goal?: string; coins?: string; grade: string; m: string; fixed: string; best: string; worst: string }>();
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
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Stat w="28%" k="톤" v={m ? '공손해요' : '아주 좋아요'} />
          <Stat w="28%" k="속도" v="적당해요" />
          <Stat w="28%" k="망설임" v={'"음…" 1번'} />
        </View>
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
