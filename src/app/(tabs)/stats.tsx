import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, T } from '../../components/ui';
import { C, F } from '../../lib/theme';

const WEEK = [62, 70, 68, 78, 84, 80, 88];

// 19 내 기록
export default function Stats() {
  const ins = useSafeAreaInsets();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ paddingTop: ins.top + 8, padding: 24, gap: 14 }}>
      <T s="h1">내 기록</T>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {[['18', '완료한 장면'], ['5일', '연속 출석'], ['82', '평균 톤 점수']].map(([v, k]) => (
          <Card key={k} style={{ flex: 1, padding: 14 }}>
            <T style={{ fontFamily: F.k, fontSize: 24 }}>{v}</T>
            <T s="small">{k}</T>
          </Card>
        ))}
      </View>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <T s="h3" style={{ flex: 1 }}>이번 주 톤 점수</T>
          <T s="label">지난주보다 +9</T>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 140, gap: 10, marginTop: 16 }}>
          {WEEK.map((v, i) => (
            <View key={i} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
              <View style={{ width: '100%', height: v * 1.3, borderRadius: 8, backgroundColor: i === 6 ? C.lime : C.ink }} />
              <T s="small">{'월화수목금토일'[i]}</T>
            </View>
          ))}
        </View>
      </Card>
      <Card style={{ gap: 12 }}>
        <T s="h3">자주 하는 실수</T>
        {[['변명부터 해요', 42], ['반말·존댓말이 섞여요', 31], ['"음…" 하고 망설여요', 18]].map(([k, v]) => (
          <View key={k as string} style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row' }}>
              <T style={{ flex: 1 }}>{k}</T>
              <T s="label">{v}%</T>
            </View>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: C.bg }}>
              <View style={{ width: `${v}%` as any, height: 8, borderRadius: 4, backgroundColor: C.ink }} />
            </View>
          </View>
        ))}
      </Card>
    </ScrollView>
  );
}
