import { useState } from 'react';
import { Pressable, ScrollView, Switch, View } from 'react-native';
import { router } from 'expo-router';
import { Btn, Card, Chip, Coin, Screen, T, TopBar } from '../components/ui';
import type { SwitchProps } from 'react-native';
import { C } from '../lib/theme';
import { useStore } from '../lib/store';
import { useAccount } from '../lib/useAccount';
import { GoogleButton } from '../components/google-button';
import { PushRow } from '../components/push-row';
import { disablePush } from '../lib/push';
import { normLang, UI_LANGS, useT } from '../lib/i18n';
import { reactionCopy } from '../lib/learning-copy';

// 21 설정
export default function Settings() {
  const st = useStore();
  const acc = useAccount();
  const t = useT();
  const ui = normLang(st.lang);
  const [speed, setSpeed] = useState('1.0x');
  const [sub, setSub] = useState(true);
  const [auto, setAuto] = useState(false);
  const [noti, setNoti] = useState(true);
  return (
    <Screen>
      <TopBar title={t('설정')} />
      <ScrollView contentContainerStyle={{ padding: 24, gap: 10 }}>
        <T s="small">{t('학습')}</T>
        <Card style={{ gap: 14 }}>
          {/* 표시 언어를 바꿔도 학습 기록·복습 노트는 그대로예요 */}
          <Row k={t('학습 팩')} right={<T s="label">{t('한국어팩')}</T>} />
          <Row k={t('앱 표시 언어')} right={<Chip label={UI_LANGS.find((l) => l.id === ui)?.name ?? 'English'} dark onPress={() => router.push({ pathname: '/onboarding/lang', params: { returnTo: 'settings' } })} />} />
          <Row k={t('음성 속도')} right={<View style={{ flexDirection: 'row', gap: 4 }}>{['0.8x', '1.0x', '1.2x'].map((x) => <Chip key={x} label={x} on={speed === x} dark onPress={() => setSpeed(x)} />)}</View>} />
          <Row k={t('자막 보기')} right={<Toggle value={sub} onValueChange={setSub} />} />
          <Row k={reactionCopy(st.lang).effects} right={<Toggle value={st.soundEffects} onValueChange={(soundEffects) => st.set({ soundEffects })} />} />
          <Row k={t('속마음 힌트 자동 표시')} right={<Toggle value={auto} onValueChange={setAuto} />} />
        </Card>
        <T s="small" style={{ marginTop: 8 }}>{t('발표·체험')}</T>
        <Card style={{ gap: 8 }}>
          <Row k={t('예시 모드')} right={<Toggle value={st.demo} onValueChange={(v) => st.setDemo(v)} />} />
          <T s="small">{t('발표용 예시 대화 사용')}</T>
        </Card>
        <T s="small" style={{ marginTop: 8 }}>{t('알림')}</T>
        <Card style={{ gap: 14 }}>
          <Row k={t('매일 연습 알림')} right={<Toggle value={noti} onValueChange={setNoti} />} />
          <Row k={t('알림 시간')} right={<T s="label">{t('오후 9:00')}</T>} />
          <PushRow />
        </Card>
        <T s="small" style={{ marginTop: 8 }}>{t('계정')}</T>
        <Card style={{ gap: 14 }}>
          {acc.user ? (
            <Row k={t('Google 계정')} right={<T s="label">{acc.user.email ?? acc.user.displayName ?? t('로그인됨')}</T>} />
          ) : (
            <View style={{ gap: 8 }}>
              <T s="sub">{t('지금은 게스트예요. 로그인하면 학습 기록이 계정에 옮겨져요.')}</T>
              <GoogleButton onPress={acc.login} busy={acc.busy} />
              {acc.msg ? <T s="small">{t(acc.msg)}</T> : null}
            </View>
          )}
          <Row k={t('요금제')} right={<T s="label">{st.subscribed ? 'PRO' : t('무료 · PRO 보기')}</T>} />
          <Row k={t('코인')} right={<Coin n={st.coins} />} />
          <Btn label={t('초기 화면으로 이동')} kind="line" icon="arrow-left" onPress={() => {
            st.set({ onboarded: false, languageSelected: false });
            router.replace('/onboarding/lang');
          }} />
          <T s="small">{t('학습 기록은 유지하고 언어 선택부터 다시 시작해요.')}</T>
          {acc.user && !acc.user.isGuest ? (
            <Pressable onPress={async () => { await disablePush(); await acc.logout(); st.set({ onboarded: false }); router.replace('/'); }} accessibilityRole="button">
              <T s="label" style={{ color: C.sub }}>{t('로그아웃')}</T>
            </Pressable>
          ) : null}
        </Card>
        <Card style={{ gap: 6 }}>
          <T s="small">{t('일부 AI 음성은 Typecast 가상 성우 서비스로 제작했습니다. 사용 보이스: 아린, 예은, 나윤, 재선, 라연, 승연.')}</T>
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
