import { useState } from 'react';
import { Pressable, ScrollView, Switch, View } from 'react-native';
import { router } from 'expo-router';
import { Card, Chip, Coin, Screen, T, TopBar } from '../components/ui';
import type { SwitchProps } from 'react-native';
import { C } from '../lib/theme';
import { LANGS } from '../lib/data';
import { useStore } from '../lib/store';
import { useAccount } from '../lib/useAccount';
import { GoogleButton } from '../components/google-button';
import { PushRow } from '../components/push-row';
import { disablePush } from '../lib/push';

// 21 설정
export default function Settings() {
  const st = useStore();
  const acc = useAccount();
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
          <Row k="자막 보기" right={<Toggle value={sub} onValueChange={setSub} />} />
          <Row k="속마음 힌트 자동 표시" right={<Toggle value={auto} onValueChange={setAuto} />} />
        </Card>
        <T s="small" style={{ marginTop: 8 }}>발표·체험</T>
        <Card style={{ gap: 8 }}>
          <Row k="데모 모드" right={<Toggle value={st.demo} onValueChange={(v) => st.setDemo(v)} />} />
          <T s="small">켜면 앱 안 대본과 예시 판정으로 진행해요. 캐릭터 음성에는 인터넷이 필요해요. 실시간 AI 판정을 쓰려면 꺼 주세요.</T>
        </Card>
        <T s="small" style={{ marginTop: 8 }}>알림</T>
        <Card style={{ gap: 14 }}>
          <Row k="매일 연습 알림" right={<Toggle value={noti} onValueChange={setNoti} />} />
          <Row k="알림 시간" right={<T s="label">오후 9:00</T>} />
          <PushRow />
        </Card>
        <T s="small" style={{ marginTop: 8 }}>계정</T>
        <Card style={{ gap: 14 }}>
          {acc.user ? (
            <Row k="Google 계정" right={<T s="label">{acc.user.email ?? acc.user.displayName ?? '로그인됨'}</T>} />
          ) : (
            <View style={{ gap: 8 }}>
              <T s="sub">지금은 게스트예요. 로그인하면 학습 기록이 계정에 옮겨져요.</T>
              <GoogleButton onPress={acc.login} busy={acc.busy} disabled={acc.enabled === false} />
              {acc.msg ? <T s="small">{acc.msg}</T> : null}
            </View>
          )}
          <Row k="요금제" right={<T s="label">{st.subscribed ? 'PRO' : '무료 · PRO 보기'}</T>} />
          <Row k="코인" right={<Coin n={st.coins} />} />
          {acc.user && !acc.user.isGuest ? (
            <Pressable onPress={async () => { await disablePush(); await acc.logout(); st.set({ onboarded: false }); router.replace('/'); }} accessibilityRole="button">
              <T s="label" style={{ color: C.sub }}>로그아웃</T>
            </Pressable>
          ) : null}
        </Card>
        <Card style={{ gap: 6 }}>
          <T s="small">일부 AI 음성은 Typecast 가상 성우 서비스로 제작했습니다. 사용 보이스: 아린, 예은, 나윤, 재선, 라연, 승연.</T>
          <T s="small">https://typecast.ai</T>
        </Card>
      </ScrollView>
    </Screen>
  );
}
// 켜짐 = 검정 트랙 + 라임 손잡이 (웹 기본 청록색 대신)
function Toggle(p: SwitchProps) {
  return <Switch {...p} trackColor={{ true: C.ink, false: C.line }} thumbColor={C.white} {...({ activeThumbColor: C.lime, activeTrackColor: C.ink } as any)} />;
}
function Row({ k, right }: { k: string; right: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 32 }}>
      <T style={{ flex: 1, fontSize: 15 }}>{k}</T>
      {right}
    </View>
  );
}
