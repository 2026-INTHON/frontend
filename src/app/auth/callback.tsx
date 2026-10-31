import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { router } from 'expo-router';
import { Btn, Screen, T } from '../../components/ui';
import { Dots } from '../../components/scene-parts';
import { finishGoogle } from '../../lib/auth';
import { useStore } from '../../lib/store';

// Google 로그인 복귀 화면 (웹: localhost:8081/auth/callback, 앱: malo://auth/callback)
// 앱에서는 openAuthSessionAsync 가 이미 처리하므로 여기선 돌아가기만 해요.
export default function AuthCallback() {
  const st = useStore();
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (Platform.OS !== 'web') {
      router.replace(st.languageSelected ? '/settings' : '/onboarding/lang');
      return;
    }
    const url = window.location.href;
    // 주소창에서 code 를 바로 지워서 기록·스크린샷에 남지 않게
    window.history.replaceState(null, '', '/auth/callback');
    finishGoogle(url).then((r) => {
      if (r.ok) {
        router.replace(st.languageSelected && st.onboarded ? '/home' : '/onboarding/lang');
      } else setErr(r.reason === 'cancel' ? '로그인을 취소했어요. 게스트 기록은 그대로예요.' : r.message ?? '로그인하지 못했어요.');
    });
  }, []);
  return (
    <Screen>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 }}>
        {err ? (
          <>
            <T s="h2">로그인하지 못했어요</T>
            <T s="sub" style={{ textAlign: 'center' }}>{err}</T>
            <Btn label="돌아가기" style={{ alignSelf: 'stretch', marginTop: 8 }} onPress={() => router.replace('/')} />
          </>
        ) : (
          <>
            <T s="h2">Google 계정 확인 중</T>
            <Dots />
          </>
        )}
      </View>
    </Screen>
  );
}
