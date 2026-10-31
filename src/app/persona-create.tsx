import { useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Btn, Chip, Screen, T, Tag, TopBar } from '../components/ui';
import { C, F } from '../lib/theme';
import { useStore } from '../lib/store';

// 13 페르소나 만들기 (구독 주 1회 · 무료는 생성권)
export default function PersonaCreate() {
  const { subscribed } = useStore();
  const [rel, setRel] = useState('직장 상사');
  const [lv, setLv] = useState('보통');
  const [desc, setDesc] = useState('말이 짧고 숫자에 예민해요. 돌려 말하면 싫어해요.');
  const [name, setName] = useState('우리 팀 최 팀장님');
  return (
    <Screen>
      <TopBar title="페르소나 만들기" right={<Tag label={subscribed ? '이번 주 1회 남음' : '생성권 0장'} tone="lime" />} />
      <ScrollView contentContainerStyle={{ padding: 24, gap: 10 }}>
        <T s="label">어떤 관계예요?</T>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {['직장 상사', '교수님', '친구', '연인'].map((x) => (
            <Chip key={x} label={x} on={rel === x} onPress={() => setRel(x)} />
          ))}
        </View>
        <T s="label" style={{ marginTop: 10 }}>성격 · 말투</T>
        <TextInput value={desc} onChangeText={setDesc} multiline style={inp} />
        <T s="label" style={{ marginTop: 10 }}>부르는 이름</T>
        <TextInput value={name} onChangeText={setName} style={inp} />
        <T s="label" style={{ marginTop: 10 }}>난이도</T>
        <View style={{ flexDirection: 'row', backgroundColor: C.white, borderRadius: 16, padding: 4 }}>
          {['쉬움', '보통', '어려움'].map((x) => (
            <Chip key={x} label={x} on={lv === x} onPress={() => setLv(x)} style={{ flex: 1, alignItems: 'center', borderWidth: 0 }} />
          ))}
        </View>
        <T s="small" style={{ marginTop: 14 }}>✦ 구독하면 주 1회 무료, 아니면 생성권 1장으로 만들어요</T>
      </ScrollView>
      <View style={{ paddingHorizontal: 16 }}>
        <Btn label="페르소나 만들기" icon="star" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}
const inp = { backgroundColor: C.white, borderRadius: 16, padding: 16, fontFamily: F.r, fontSize: 15, color: C.ink, minHeight: 52 };
