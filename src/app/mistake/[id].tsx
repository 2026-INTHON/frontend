import { ScrollView, View } from 'react-native';
import { useEffect, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Btn, Card, Screen, T, Tag, TopBar } from '../../components/ui';
import { C } from '../../lib/theme';
import { speak, stopSpeak } from '../../lib/voice';
import { useStore } from '../../lib/store';

// 18 오답 상세
export default function MistakeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { mistakes, char, persona, pack } = useStore();
  const [voiceError,setVoiceError] = useState(false);
  useEffect(()=>()=>stopSpeak(),[]);
  const m = mistakes.find((x) => x.id === id);
  if (!m) {
    return (
      <Screen>
        <TopBar title="오답 상세" />
        <View style={{ padding: 24, gap: 12 }}>
          <T s="sub">이 말실수를 찾지 못했어요.</T>
          <Btn label="오답 도감으로" onPress={() => router.replace('/mistakes')} />
        </View>
      </Screen>
    );
  }
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
          <Btn label="발음 듣기" small kind="line" icon="volume-2" style={{ alignSelf: 'flex-start', marginTop: 10 }} onPress={() => {setVoiceError(false);speak(m.better,{char,persona,lang:pack==='ko'?'ko-KR':'en-US',onError:()=>setVoiceError(true)});}} />
          {voiceError?<View accessibilityRole="alert"><T s="small">음성을 불러오지 못했어요. 발음 듣기를 다시 눌러 주세요.</T></View>:null}
        </Card>
        <T s="h3" style={{ marginTop: 6 }}>왜 문제였을까?</T>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Feather name="info" size={16} style={{ marginTop: 3 }} />
          <T s="body" style={{ flex: 1 }}>{m.why}</T>
        </View>
        {m.fixed ? <Tag label="고침" tone="lime" /> : null}
      </ScrollView>
      <View style={{ paddingHorizontal: 16 }}>
        <Btn label="이 부분만 다시 연습" icon="rotate-ccw" onPress={() => router.push({ pathname: '/scene/[id]', params: { id: m.scene || 'today' } })} />
      </View>
    </Screen>
  );
}
