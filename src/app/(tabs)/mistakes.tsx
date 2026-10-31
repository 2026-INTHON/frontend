import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Btn, Card, Chip, T, Tag } from '../../components/ui';
import { C } from '../../lib/theme';
import { useStore } from '../../lib/store';

// 17 오답 도감
export default function Mistakes() {
  const { mistakes } = useStore();
  const ins = useSafeAreaInsets();
  const [f, setF] = useState('전체');
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: ins.top + 8 }}>
      <View style={{ paddingHorizontal: 24 }}>
        <T s="h1">오답 도감</T>
        <T s="sub">말실수 {mistakes.length + 10}개 · 다시 연습해서 고친 것 {mistakes.filter((m) => m.fixed).length + 4}개</T>
      </View>
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 24, marginTop: 12 }}>
        {['전체', '존댓말', '톤', '눈치'].map((x) => (
          <Chip key={x} label={x} on={f === x} onPress={() => setF(x)} />
        ))}
      </View>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 12 }}>
        {mistakes.map((m) => (
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
