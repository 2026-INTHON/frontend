import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { Avatar, Btn, Card, CoinPill, Screen, T, TopBar } from '../components/ui';
import { C } from '../lib/theme';
import { IMG } from '../lib/data';
import { useStore } from '../lib/store';

const SLIDERS = [
  ['직설적', '돌려 말함', 0.3],
  ['금방 서운함', '너그러움', 0.4],
  ['농담 적음', '농담 많음', 0.85],
  ['어색함', '편함', 0.7],
] as const;

// 23 성격 커스텀 (코인)
export default function PersonaCustom() {
  const st = useStore();
  const [v, setV] = useState<number[]>(SLIDERS.map((s) => s[2]));
  return (
    <Screen>
      <TopBar title="성격 커스텀" right={<CoinPill />} />
      <ScrollView contentContainerStyle={{ padding: 24, gap: 10 }}>
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, alignSelf: 'flex-start' }}>
          <Avatar src={IMG.card.seoyun} size={56} />
          <View>
            <T s="h3">서윤</T>
            <T s="small">기본 성격 · 장난</T>
          </View>
        </Card>
        {SLIDERS.map(([a, b], i) => (
          <Card key={a} style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row' }}>
              <T s="label" style={{ flex: 1 }}>{a}</T>
              <T s="label">{b}</T>
            </View>
            {/* 5칸 눌러서 고르는 간단 슬라이더 */}
            <View style={{ flexDirection: 'row', alignItems: 'center', height: 24 }}>
              <View style={{ position: 'absolute', left: 0, right: 0, height: 6, borderRadius: 3, backgroundColor: C.bg }} />
              <View style={{ position: 'absolute', left: 0, width: `${v[i] * 100}%` as any, height: 6, borderRadius: 3, backgroundColor: C.ink }} />
              {[0, 0.25, 0.5, 0.75, 1].map((p) => (
                <Pressable key={p} onPress={() => setV(v.map((x, j) => (j === i ? p : x)))} style={{ flex: 1, height: 24 }} />
              ))}
              <View pointerEvents="none" style={{ position: 'absolute', left: `${v[i] * 100}%` as any, marginLeft: -12, width: 24, height: 24, borderRadius: 12, backgroundColor: C.lime, borderWidth: 2, borderColor: C.ink }} />
            </View>
          </Card>
        ))}
        <T s="small" style={{ marginTop: 8 }}>이렇게 말해요</T>
        <T s="body">"야 30분 늦었잖아~ 오늘 커피는 네가 사는 걸로!"</T>
      </ScrollView>
      <View style={{ paddingHorizontal: 16 }}>
        <Btn label="200 코인으로 저장" onPress={() => { if (st.coins >= 200) st.addCoins(-200); router.back(); }} />
      </View>
    </Screen>
  );
}
