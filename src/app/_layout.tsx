import React, { useEffect } from 'react';
import { Stack, router, useSegments } from 'expo-router';
import { setSignedOutHandler } from '../lib/api';
import { StatusBar } from 'expo-status-bar';
import { useFonts, NotoSansKR_400Regular, NotoSansKR_500Medium, NotoSansKR_700Bold, NotoSansKR_900Black } from '@expo-google-fonts/noto-sans-kr';
import { BlackHanSans_400Regular } from '@expo-google-fonts/black-han-sans';
import { View, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StoreProvider, useStore } from '../lib/store';
import { C } from '../lib/theme';
import { RecordingBoundary } from '../components/screen-recording';

// 회원 토큰 갱신이 실패하면 처음 화면(로그인)으로
setSignedOutHandler(() => router.replace('/'));

export default function RootLayout() {
  const [loaded] = useFonts({ NotoSansKR_400Regular, NotoSansKR_500Medium, NotoSansKR_700Bold, NotoSansKR_900Black, BlackHanSans_400Regular });
  if (!loaded)
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg }}>
        <ActivityIndicator color={C.ink} />
      </View>
    );
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <StatusBar style="dark" />
        <PhoneFrame>
        <Hydrated>
        <LanguageGate />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg }, animation: 'slide_from_right' }}>
          <Stack.Screen name="scene/[id]" options={{ animation: 'fade', gestureEnabled: false }} />
          <Stack.Screen name="result" options={{ animation: 'fade', gestureEnabled: false }} />
        </Stack>
        <RecordingBoundary />
        </Hydrated>
        </PhoneFrame>
      </StoreProvider>
    </SafeAreaProvider>
  );
}

function LanguageGate() {
  const { languageSelected } = useStore();
  const segments = useSegments();
  const first = segments[0];
  useEffect(() => {
    if (!languageSelected && first && first !== 'index' && first !== 'auth' && first !== 'onboarding') router.replace('/');
  }, [languageSelected, first]);
  return null;
}

// 저장된 진행 상황을 다 불러온 뒤에 화면을 그려요 (처음 화면이 깜빡이지 않게)
function Hydrated({ children }: { children: React.ReactNode }) {
  const { hydrated } = useStore();
  if (!hydrated)
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg }}>
        <ActivityIndicator color={C.ink} />
      </View>
    );
  return <>{children}</>;
}

// 웹(PC)에서는 폰 크기로 가운데에 보여 줘요. 폰 브라우저에선 꽉 차게.
function PhoneFrame({ children }: { children: React.ReactNode }) {
  if (Platform.OS !== 'web') return <>{children}</>;
  return (
    <View style={{ flex: 1, alignItems: 'center', backgroundColor: '#E9E7E1' }}>
      <View nativeID="malo-recording-frame" style={{ flex: 1, width: '100%', maxWidth: 430, overflow: 'hidden', backgroundColor: C.bg, boxShadow: '0 0 40px rgba(0,0,0,0.08)' } as any}>{children}</View>
    </View>
  );
}
