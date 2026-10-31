import { View, Image } from 'react-native';
import { Redirect, router } from 'expo-router';
import { Btn, Screen, T } from '../components/ui';
import { C, F } from '../lib/theme';
import { useStore } from '../lib/store';
import { Lineup } from '../components/lineup';
import { GoogleButton } from '../components/google-button';
import { useAccount } from '../lib/useAccount';
// 01 웰컴

export default function Welcome() {
  const { set, onboarded, setDemo } = useStore();
  const acc = useAccount();
  // 이미 시작한 사람은 바로 홈으로 (새로고침해도 처음부터 다시 하지 않아요)
  if (onboarded) return <Redirect href="/home" />;
  return (
    <Screen bg={C.white}>
      <View style={{ paddingHorizontal: 24, marginTop: 40 }}>
        <T s="h2">어서오세요!</T>
        <T style={{ fontFamily: F.logo, fontSize: 64, lineHeight: 76, marginTop: 4 }}>Malo</T>
        <T s="sub">말실수해도 괜찮은 대화 연습장</T>
      </View>
      <View style={{ flex: 1, paddingHorizontal: 8, marginVertical: 16 }}>
        <Lineup />
      </View>
      <View style={{ paddingHorizontal: 16, gap: 8 }}>
        <Btn label="시작하기" icon="arrow-right" onPress={() => router.push('/onboarding/pack')} />
        <GoogleButton
          label="Google로 로그인"
          busy={acc.busy}
          onPress={async () => {
            const r = await acc.login();
            // 성공하거나 로그인 서버가 꺼져 있으면(데모) 바로 홈으로
            if (r.ok || r.reason === 'disabled') {
              set({ onboarded: true });
              router.replace('/home');
            }
          }}
        />
        <Btn label="서버 없이 데모로 둘러보기" kind="ghost" small onPress={() => { setDemo(true); router.push('/onboarding/pack'); }} />
        {acc.msg && acc.enabled !== false ? <T s="small" style={{ textAlign: 'center' }}>{acc.msg}</T> : null}
      </View>
    </Screen>
  );
}
