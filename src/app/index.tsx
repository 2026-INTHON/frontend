import { View, ScrollView, useWindowDimensions } from 'react-native';
import { Redirect, router } from 'expo-router';
import { Btn, Screen, T } from '../components/ui';
import { C } from '../lib/theme';
import { useStore } from '../lib/store';
import { Lineup } from '../components/lineup';
import { Logo } from '../components/logo';
import { GoogleButton } from '../components/google-button';
import { useAccount } from '../lib/useAccount';
import { tr } from '../lib/i18n';
// 01 웰컴

export default function Welcome() {
  const { onboarded, languageSelected, setDemo } = useStore();
  const acc = useAccount();
  const { width } = useWindowDimensions();
  // 이미 시작한 사람은 바로 홈으로 (새로고침해도 처음부터 다시 하지 않아요)
  if (onboarded && languageSelected) return <Redirect href="/home" />;
  const start = () => { setDemo(false); router.push('/onboarding/lang'); };
  return (
    <Screen bg={C.white}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingTop: 56 }}>
        <View style={{ paddingHorizontal: 24 }}>
          <T s="h1">Welcome!</T>
          <View style={{ marginTop: 10, marginBottom: 8 }}><Logo height={68} /></View>
          <T s="sub" style={{ fontSize: 14, lineHeight: 21 }}>A place to practice talking where slip-ups are okay</T>
        </View>
        <View style={{ flex: 1, minHeight: Math.min(width, 430) * .78, paddingHorizontal: 8, marginTop: 32, marginBottom: 20 }}>
          <Lineup fill={1} />
        </View>
        <View style={{ paddingHorizontal: 16, gap: 10 }}>
          <Btn label="Get started" icon="arrow-right" style={{ height: 62, borderRadius: 999 }} disabled={acc.busy} onPress={start} />
          <GoogleButton
            label="Sign in with Google"
            large
            busy={acc.busy}
            onPress={async () => {
              const r = await acc.login();
              if (r.ok) {
                router.replace('/onboarding/lang');
              }
            }}
          />
          <Btn label="Start without signing in" kind="ghost" style={{ height: 44, marginTop: 6 }} disabled={acc.busy} onPress={start} />
          {acc.msg ? <T s="small" style={{ textAlign: 'center' }}>{tr('en', acc.msg)}</T> : null}
        </View>
      </ScrollView>
    </Screen>
  );
}
