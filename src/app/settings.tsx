import { useState } from 'react';
import { Pressable, ScrollView, Switch, View } from 'react-native';
import { router } from 'expo-router';
import { Card, Chip, Coin, Screen, T, TopBar } from '../components/ui';
import { C } from '../lib/theme';
import { LANGS } from '../lib/data';
import { useStore } from '../lib/store';

// 21 설정
export default function Settings() {
  const st = useStore();
  const [speed, setSpeed] = useState('1.0x');
  const [sub, setSub] = useState(true);
  const [auto, setAuto] = useState(false);
  const [noti, setNoti] = useState(true);
  return (
    <Screen>
      <TopBar title="설정" />
      <ScrollView contentContainerStyle={{ padding: 24, gap: 10 }}>
        <T s="small">학습</T>
        <Card style={{ gap: 14 }}>
          <Row k="학습 팩" right={<Chip label={st.pack === 'ko' ? '한국어팩' : '영어팩'} dark onPress={() => st.set({ pack: st.pack === 'ko' ? 'en' : 'ko' })} />} />
          <Row k="모국어" right={<Chip label={LANGS.find((l) => l.id === st.lang)?.name ?? 'English'} dark onPress={() => router.push('/onboarding/lang')} />} />
          <Row k="음성 속도" right={<View style={{ flexDirection: 'row', gap: 4 }}>{['0.8x', '1.0x', '1.2x'].map((x) => <Chip key={x} label={x} on={speed === x} dark onPress={() => setSpeed(x)} />)}</View>} />
          <Row k="자막 보기" right={<Switch value={sub} onValueChange={setSub} trackColor={{ true: C.ink }} />} />
          <Row k="속마음 힌트 자동 표시" right={<Switch value={auto} onValueChange={setAuto} trackColor={{ true: C.ink }} />} />
        </Card>
        <T s="small" style={{ marginTop: 8 }}>알림</T>
        <Card style={{ gap: 14 }}>
          <Row k="매일 연습 알림" right={<Switch value={noti} onValueChange={setNoti} trackColor={{ true: C.ink }} />} />
          <Row k="알림 시간" right={<T s="label">오후 9:00</T>} />
        </Card>
        <T s="small" style={{ marginTop: 8 }}>계정</T>
        <Card style={{ gap: 14 }}>
          <Row k="요금제" right={<T s="label">{st.subscribed ? 'PRO' : '무료 · PRO 보기'}</T>} />
          <Row k="코인" right={<Coin n={st.coins} />} />
          <Pressable onPress={() => { st.set({ onboarded: false }); router.replace('/'); }}>
            <T s="label" style={{ color: C.red }}>로그아웃</T>
          </Pressable>
        </Card>
      </ScrollView>
    </Screen>
  );
}
function Row({ k, right }: { k: string; right: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 32 }}>
      <T style={{ flex: 1, fontSize: 15 }}>{k}</T>
      {right}
    </View>
  );
}
