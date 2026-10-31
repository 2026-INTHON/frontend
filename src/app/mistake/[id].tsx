import { ScrollView, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Btn, Card, Screen, T, Tag, TopBar } from '../../components/ui';
import { C } from '../../lib/theme';
import { speak } from '../../lib/voice';
import { SCENES } from '../../lib/data';
import { useStore } from '../../lib/store';

// 18 오답 상세
export default function MistakeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { mistakes } = useStore();
  const m = mistakes.find((x) => x.id === id) ?? mistakes[0];
  const scene = SCENES.find((s) => s.title === m.title);
  return (
    <Screen>
      <TopBar title="오답 상세" />
      <ScrollView contentContainerStyle={{ padding: 24, gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <T s="h2" style={{ flex: 1 }}>{m.title}</T>
          <T s="small">{m.when}</T>
        </View>
        <T s="sub">{m.who}</T>
        <Card>
          <T s="small">그때 상황</T>
          <T s="body" style={{ marginTop: 4 }}>"{m.line}"</T>
        </Card>
        <Card style={{ borderLeftWidth: 4, borderLeftColor: C.red }}>
          <T s="small" style={{ color: C.red }}>내가 한 말</T>
          <T s="body" style={{ marginTop: 4 }}>"{m.said}"</T>
        </Card>
        <Card style={{ borderLeftWidth: 4, borderLeftColor: C.lime }}>
          <T s="small">더 나은 말</T>
          <T s="body" style={{ marginTop: 4 }}>"{m.better}"</T>
          <Btn label="발음 듣기" small kind="line" icon="volume-2" style={{ alignSelf: 'flex-start', marginTop: 10 }} onPress={() => speak(m.better)} />
        </Card>
        <T s="h3" style={{ marginTop: 6 }}>왜 문제였을까?</T>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Feather name="info" size={16} style={{ marginTop: 3 }} />
          <T s="body" style={{ flex: 1 }}>{m.why}</T>
        </View>
        {m.fixed ? <Tag label="고침" tone="lime" /> : null}
      </ScrollView>
      <View style={{ paddingHorizontal: 16 }}>
        <Btn label="이 부분만 다시 연습" icon="rotate-ccw" onPress={() => router.push({ pathname: '/scene/[id]', params: { id: scene?.id ?? 'boss-report' } })} />
      </View>
    </Screen>
  );
}
