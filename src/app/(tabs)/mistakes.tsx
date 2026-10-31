import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Btn, Card, Chip, T, Tag } from '../../components/ui';
import { C } from '../../lib/theme';
import { useStore } from '../../lib/store';

const FILTERS = ['전체', '아직 못 고침', '고침'] as const;

// 17 오답 도감: 저장된 말실수 그대로 (숫자 = 카드 수)
export default function Mistakes() {
  const { mistakes } = useStore();
  const ins = useSafeAreaInsets();
  const [f, setF] = useState<(typeof FILTERS)[number]>('전체');
  const fixed = mistakes.filter((m) => m.fixed).length;
  const list = mistakes.filter((m) => (f === '전체' ? true : f === '고침' ? m.fixed : !m.fixed));
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: ins.top + 8 }}>
      <View style={{ paddingHorizontal: 24 }}>
        <T s="h1">오답 도감</T>
        <T s="sub">말실수 {mistakes.length}개 · 다시 연습해서 고친 것 {fixed}개</T>
      </View>
      {mistakes.length ? (
        <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 24, marginTop: 12 }}>
          {FILTERS.map((x) => (
            <Chip key={x} label={x} on={f === x} onPress={() => setF(x)} />
          ))}
        </View>
      ) : null}
      <ScrollView contentContainerStyle={{ padding: 24, gap: 12 }}>
        {!mistakes.length ? (
          <Card style={{ gap: 8 }}>
            <T s="h3">아직 모은 말실수가 없어요</T>
            <T s="sub">대화하다 X를 받은 말이 여기에 모여요. 더 나은 말과 이유도 같이 저장돼요.</T>
          </Card>
        ) : null}
        {list.map((m) => (
          <Card key={m.id} onPress={() => router.push({ pathname: '/mistake/[id]', params: { id: m.id } })}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <T s="label" style={{ flex: 1 }}>{m.title}</T>
              {m.fixed ? <Tag label="고침" tone="lime" /> : null}
              <T s="small">{m.when}</T>
            </View>
            <T s="body" style={{ marginTop: 8, color: C.red, textDecorationLine: 'line-through' }}>"{m.said}"</T>
            <T s="body" style={{ marginTop: 4 }}>"{m.better}"</T>
            {!m.fixed ? <Btn label="다시 연습" small kind="line" style={{ alignSelf: 'flex-start', marginTop: 10 }} onPress={() => router.push({ pathname: '/mistake/[id]', params: { id: m.id } })} /> : null}
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}
